/**
 * usePersonalOS.ts — Central data hook for PACE.
 *
 * Integrates:
 *  - Dynamic Metric Registry (users/{uid}/metrics)
 *  - Unified Goal Calculations (computeGoalProgress)
 *  - Dynamic logs, tasks, reminders, and CSV export
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectIsSynced } from '@/store/slices/syncSlice';

import { Goal, GoalCalculatedProgress } from '@/types/goals';
import { Task, isTaskDueOn } from '@/types/tasks';
import { DailyLog, createEmptyLog } from '@/types/logs';
import { Reminder, QuietHours } from '@/types/reminders';
import { MetricDefinition, DEFAULT_METRICS } from '@/types/metrics';
import { WeeklyReview } from '@/types/goals';

import {
  subscribeGoals, upsertGoal, removeGoal,
  subscribeTasks, upsertTask, removeTask,
  subscribeLog, upsertLog,
  fetchLogs,
  fetchReminders, subscribeReminders, upsertReminder, removeReminder,
  fetchQuietHours, upsertQuietHours,
  fetchReviews, upsertReview,
  subscribeMetrics, upsertMetric, removeMetric,
} from '@/services/firebase/personalOS';

import { computeGoalProgress, formatIndianNumber } from '@/lib/goals/computeGoalProgress';
import { initReminderNotificationService, syncLocalScheduledReminders } from '@/services/notifications/reminderNotificationService';
import { StepTrackerService } from '@/services/steps/stepTrackerService';
import { toastService } from '@/services/toastService';

export function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface PersonalOSData {
  // Meta
  isSynced: boolean;
  loading: boolean;
  todayStr: string;

  // Collections
  metrics: MetricDefinition[];
  goals: Goal[];
  tasks: Task[];
  todayLog: DailyLog;
  allLogs: Record<string, DailyLog>;
  reminders: Reminder[];
  quietHours: QuietHours;
  reviews: WeeklyReview[];

  // Derived
  goalProgressList: { goal: Goal; progress: GoalCalculatedProgress; metric?: MetricDefinition }[];
  todayTasks: Task[]; // tasks due today

  // Metric mutations
  saveMetric: (m: MetricDefinition) => Promise<void>;
  deleteMetric: (id: string) => Promise<void>;

  // Goal & Task mutations
  saveGoal: (goal: Goal) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  saveTask: (task: Task) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTask: (taskId: string) => Promise<void>;

  // Log mutations
  updateTodayLog: (log: Partial<DailyLog>) => Promise<void>;
  updateLogForDate: (date: string, log: Partial<DailyLog>) => Promise<void>;

  // Reminders & Reviews
  saveReminder: (r: Reminder) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  saveQuietHours: (qh: QuietHours) => Promise<void>;
  saveReview: (r: WeeklyReview) => Promise<void>;

  // CSV export
  exportCSV: () => string;
}

export function usePersonalOS(): PersonalOSData {
  const isSynced = useSelector(selectIsSynced);
  const todayStr = getTodayStr();

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<MetricDefinition[]>(DEFAULT_METRICS);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [todayLog, setTodayLog] = useState<DailyLog>(createEmptyLog(todayStr));
  const [allLogs, setAllLogs] = useState<Record<string, DailyLog>>({});
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [quietHours, setQuietHours] = useState<QuietHours>({ enabled: true, startHour: 23, endHour: 6 });
  const [reviews, setReviews] = useState<WeeklyReview[]>([]);

  // Real-time subscriptions
  useEffect(() => {
    const unsubMetrics = subscribeMetrics(setMetrics);
    const unsubGoals = subscribeGoals(setGoals);
    const unsubTasks = subscribeTasks(setTasks);
    const unsubReminders = subscribeReminders(setReminders);
    const unsubLog = subscribeLog(todayStr, (log) => {
      setTodayLog(log);
      setAllLogs((prev) => ({ ...prev, [todayStr]: log }));
    });
    return () => {
      unsubMetrics();
      unsubGoals();
      unsubTasks();
      unsubReminders();
      unsubLog();
    };
  }, [todayStr]);

  // Initial fetch for background collections & notifications
  useEffect(() => {
    let mounted = true;
    (async () => {
      await initReminderNotificationService();

      const [logs, rems, qh, revs] = await Promise.all([
        fetchLogs(),
        fetchReminders(),
        fetchQuietHours(),
        fetchReviews(),
      ]);
      if (!mounted) return;
      setAllLogs((prev) => ({ ...logs, ...prev }));
      setReminders(rems);
      setQuietHours(qh);
      setReviews(revs);
      setLoading(false);

      // Start step tracking
      StepTrackerService.startStepTracking(todayLog);
    })();

    return () => {
      mounted = false;
      StepTrackerService.stopStepTracking();
    };
  }, []);

  // Sync scheduled push notifications whenever reminders, quiet hours, or today's log change
  useEffect(() => {
    if (!loading) {
      syncLocalScheduledReminders(reminders, todayLog, quietHours);
    }
  }, [reminders, todayLog, quietHours, loading]);

  // Map of metric ID -> MetricDefinition
  const metricMap = useMemo(() => {
    const map = new Map<string, MetricDefinition>();
    metrics.forEach((m) => map.set(m.id, m));
    return map;
  }, [metrics]);

  // Derived Goal progress list using pure computeGoalProgress
  const goalProgressList = useMemo(() => {
    return goals.map((goal) => {
      const metric = goal.metricId ? metricMap.get(goal.metricId) : undefined;
      const progress = computeGoalProgress(goal, metric, allLogs, todayStr);
      return { goal, progress, metric };
    });
  }, [goals, metricMap, allLogs, todayStr]);

  // Tasks due today using isTaskDueOn
  const today = useMemo(() => new Date(), [todayStr]);
  const todayTasks = useMemo(() => {
    return tasks.filter((t) => isTaskDueOn(t, today));
  }, [tasks, today]);

  // Metric Mutations
  const saveMetric = async (metric: MetricDefinition) => {
    await upsertMetric(metric);
    toastService.show(`Metric "${metric.name}" saved!`, 'success');
  };

  const deleteMetric = async (id: string) => {
    await removeMetric(id);
    toastService.show('Metric archived.', 'info');
  };

  // Goal Mutations
  const saveGoal = async (goal: Goal) => {
    await upsertGoal(goal);

    // If "create daily task" is enabled and no task exists yet for this goal, auto-create one
    if (goal.createDailyTask && goal.type !== 'habit') {
      const existing = tasks.find((t) => t.goalId === goal.id);
      if (!existing) {
        const newTask: Task = {
          id: `task-goal-${goal.id}-${Date.now()}`,
          title: `Daily progress on ${goal.title}`,
          goalId: goal.id,
          recurrence: 'daily',
          reminderTime: null,
          active: true,
          createdAt: new Date().toISOString(),
        };
        await upsertTask(newTask);
      }
    }

    toastService.show('Goal saved!', 'success');
  };

  const deleteGoal = async (id: string) => {
    await removeGoal(id);
    // Unlink tasks linked to this goal
    const linkedTasks = tasks.filter((t) => t.goalId === id);
    for (const t of linkedTasks) {
      await upsertTask({ ...t, goalId: null });
    }
    toastService.show('Goal deleted. Linked tasks unlinked.', 'info');
  };

  // Task Mutations
  const saveTask = async (task: Task) => {
    await upsertTask(task);
    toastService.show('Task saved!', 'success');
  };

  const deleteTask = async (id: string) => {
    await removeTask(id);
    // Unlink reminders linked to this task
    const linkedReminders = reminders.filter((r) => r.taskId === id);
    for (const r of linkedReminders) {
      await upsertReminder({ ...r, taskId: null });
    }
    toastService.show('Task deleted.', 'info');
  };

  // Task completion toggle (handles metric delta if task is metric-linked)
  const toggleTask = async (taskId: string) => {
    const isDone = (todayLog.completedTaskIds || []).includes(taskId);
    const updatedIds = isDone
      ? (todayLog.completedTaskIds || []).filter((id) => id !== taskId)
      : [...(todayLog.completedTaskIds || []), taskId];

    const task = tasks.find((t) => t.id === taskId);
    let updatedMetrics = { ...todayLog.metrics };

    // If task has bound metricId & amount, automatically update today's metric!
    if (task && task.metricId && typeof task.amount === 'number' && task.amount > 0) {
      const currentVal = Math.max(0, updatedMetrics[task.metricId] ?? 0);
      const delta = isDone ? -task.amount : task.amount; // unticking subtracts, ticking adds
      const nextVal = Math.max(0, currentVal + delta);
      updatedMetrics[task.metricId] = nextVal;
    }

    const updatedLog: DailyLog = {
      ...todayLog,
      completedTaskIds: updatedIds,
      metrics: updatedMetrics,
      updatedAt: new Date().toISOString(),
    };

    setTodayLog(updatedLog);
    setAllLogs((prev) => ({ ...prev, [todayStr]: updatedLog }));
    await upsertLog(updatedLog);
  };

  // Log Mutations
  const updateTodayLog = async (partial: Partial<DailyLog>) => {
    const updated: DailyLog = {
      ...todayLog,
      ...partial,
      metrics: {
        ...(todayLog.metrics || {}),
        ...(partial.metrics || {}),
      },
      updatedAt: new Date().toISOString(),
    };

    setTodayLog(updated);
    setAllLogs((prev) => ({ ...prev, [todayStr]: updated }));
    await upsertLog(updated);
  };

  const updateLogForDate = async (date: string, partial: Partial<DailyLog>) => {
    const current = allLogs[date] || createEmptyLog(date);
    const updated: DailyLog = {
      ...current,
      ...partial,
      metrics: {
        ...(current.metrics || {}),
        ...(partial.metrics || {}),
      },
      updatedAt: new Date().toISOString(),
    };

    if (date === todayStr) {
      setTodayLog(updated);
    }
    setAllLogs((prev) => ({ ...prev, [date]: updated }));
    await upsertLog(updated);
  };

  const saveReminder = async (r: Reminder) => {
    // Optimistically update local state immediately
    setReminders((prev) => {
      const idx = prev.findIndex((item) => item.id === r.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...r, updatedAt: new Date().toISOString() };
        return next;
      }
      return [...prev, { ...r, updatedAt: new Date().toISOString() }];
    });
    await upsertReminder(r);
  };

  const deleteReminder = async (id: string) => {
    // Optimistically remove from local state immediately
    setReminders((prev) => prev.filter((item) => item.id !== id));
    await removeReminder(id);
  };

  const saveQuietHours = async (qh: QuietHours) => {
    setQuietHours(qh);
    await upsertQuietHours(qh);
    toastService.show('Quiet hours updated.', 'success');
  };

  const saveReview = async (r: WeeklyReview) => {
    await upsertReview(r);
    setReviews((prev) => {
      const idx = prev.findIndex((item) => item.id === r.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = r;
        return next;
      }
      return [r, ...prev];
    });
    toastService.show('Weekly review saved!', 'success');
  };

  // Dynamic CSV Export across all registered metrics
  const exportCSV = useCallback((): string => {
    const dates = Object.keys(allLogs).sort((a, b) => b.localeCompare(a));
    const activeMetrics = metrics.filter((m) => !m.archived);

    const headers = [
      'Date',
      'Tasks Completed',
      'Total Tasks Due',
      ...activeMetrics.map((m) => `${m.name} (${m.unit})`),
      'Mood (1-5)',
      'Energy (1-5)',
      'Note',
    ];

    const rows = dates.map((d) => {
      const log = allLogs[d];
      const completedCount = log?.completedTaskIds?.length || 0;
      const metricValues = activeMetrics.map((m) => {
        const val = log?.metrics?.[m.id];
        return val !== undefined && val !== null ? val : '';
      });

      return [
        d,
        completedCount,
        tasks.length,
        ...metricValues,
        log?.mood || '',
        log?.energy || '',
        `"${(log?.note || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }, [allLogs, metrics, tasks]);

  return {
    isSynced,
    loading,
    todayStr,
    metrics,
    goals,
    tasks,
    todayLog,
    allLogs,
    reminders,
    quietHours,
    reviews,
    goalProgressList,
    todayTasks,
    saveMetric,
    deleteMetric,
    saveGoal,
    deleteGoal,
    saveTask,
    deleteTask,
    toggleTask,
    updateTodayLog,
    updateLogForDate,
    saveReminder,
    deleteReminder,
    saveQuietHours,
    saveReview,
    exportCSV,
  };
}
