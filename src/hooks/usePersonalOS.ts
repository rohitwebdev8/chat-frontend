/**
 * usePersonalOS.ts — Central data hook for PACE.
 * Manages state and realtime sync for Goals, Standalone Tasks, Goal Tasks, Daily Logs, Career Quick Links, and Reminders.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectIsSynced } from '@/store/slices/syncSlice';

import { Goal, GoalCalculatedProgress } from '@/types/goals';
import { Task, GoalTask, isTaskDueOn, countTaskCompletionsThisWeek, formatLocalDate } from '@/types/tasks';
import { DailyLog, createEmptyLog } from '@/types/logs';
import { QuickLink } from '@/types/links';
import { Reminder, QuietHours } from '@/types/reminders';
import { WeeklyReview } from '@/types/goals';

import {
  subscribeGoals, upsertGoal, removeGoal, autoCompleteGoal,
  subscribeStandaloneTasks, upsertStandaloneTask, removeStandaloneTask,
  fetchAllGoalTasks, upsertGoalTask, removeGoalTask,
  subscribeLog, upsertLog, fetchLogs,
  subscribeLinks, upsertLink, removeLink,
  fetchReminders, subscribeReminders, upsertReminder, removeReminder,
  fetchQuietHours, upsertQuietHours,
  fetchReviews, upsertReview,
} from '@/services/firebase/personalOS';

import { computeGoalProgress } from '@/lib/goals/computeGoalProgress';
import { initReminderNotificationService, syncLocalScheduledReminders } from '@/services/notifications/reminderNotificationService';
import { toastService } from '@/services/toastService';

export function getTodayStr(): string {
  return formatLocalDate(new Date());
}

export interface PersonalOSData {
  isSynced: boolean;
  loading: boolean;
  todayStr: string;

  goals: Goal[];
  standaloneTasks: Task[];
  goalTasksMap: Record<string, GoalTask[]>;
  allGoalTasks: GoalTask[];
  allUnifiedTasks: (Task | GoalTask)[];
  todayLog: DailyLog;
  allLogs: Record<string, DailyLog>;
  links: QuickLink[];
  reminders: Reminder[];
  quietHours: QuietHours;
  reviews: WeeklyReview[];

  goalProgressList: { goal: Goal; progress: GoalCalculatedProgress; tasks: GoalTask[] }[];
  todayStandaloneTasks: Task[];
  remainingTodayTasksCount: number;

  // Mutations
  saveGoal: (goal: Goal, tasksToSave?: Partial<GoalTask>[]) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;

  saveStandaloneTask: (task: Task) => Promise<void>;
  deleteStandaloneTask: (id: string) => Promise<void>;

  saveGoalTask: (task: GoalTask) => Promise<void>;
  deleteGoalTask: (goalId: string, taskId: string) => Promise<void>;

  toggleTask: (taskId: string, dateStr?: string, customAmount?: number) => Promise<void>;
  logGoalValue: (goalId: string, value: number, dateStr?: string) => Promise<void>;
  applyPaceSuggestion: (goalId: string, taskId: string, newPlannedAmount: number) => Promise<void>;

  saveLink: (link: QuickLink) => Promise<void>;
  deleteLink: (id: string) => Promise<void>;

  updateTodayLog: (log: Partial<DailyLog>) => Promise<void>;
  updateLogForDate: (date: string, log: Partial<DailyLog>) => Promise<void>;

  saveReminder: (r: Reminder) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  saveQuietHours: (qh: QuietHours) => Promise<void>;
  saveReview: (r: WeeklyReview) => Promise<void>;

  exportCSV: () => string;
}

export function usePersonalOS(): PersonalOSData {
  const isSynced = useSelector(selectIsSynced);
  const todayStr = getTodayStr();

  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [standaloneTasks, setStandaloneTasks] = useState<Task[]>([]);
  const [allGoalTasks, setAllGoalTasks] = useState<GoalTask[]>([]);
  const [todayLog, setTodayLog] = useState<DailyLog>(createEmptyLog(todayStr));
  const [allLogs, setAllLogs] = useState<Record<string, DailyLog>>({});
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [quietHours, setQuietHours] = useState<QuietHours>({ enabled: true, startHour: 23, endHour: 6 });
  const [reviews, setReviews] = useState<WeeklyReview[]>([]);

  // Subscriptions
  useEffect(() => {
    const unsubGoals = subscribeGoals(setGoals);
    const unsubTasks = subscribeStandaloneTasks(setStandaloneTasks);
    const unsubLinks = subscribeLinks(setLinks);
    const unsubReminders = subscribeReminders(setReminders);
    const unsubLog = subscribeLog(todayStr, (log) => {
      setTodayLog(log);
      setAllLogs((prev) => ({ ...prev, [todayStr]: log }));
    });

    return () => {
      unsubGoals();
      unsubTasks();
      unsubLinks();
      unsubReminders();
      unsubLog();
    };
  }, [todayStr]);

  // Fetch all goal tasks when goals change
  const reloadGoalTasks = useCallback(async (currentGoals: Goal[]) => {
    if (currentGoals.length === 0) {
      setAllGoalTasks([]);
      return;
    }
    const gTasks = await fetchAllGoalTasks(currentGoals);
    setAllGoalTasks(gTasks);
  }, []);

  useEffect(() => {
    reloadGoalTasks(goals);
  }, [goals, reloadGoalTasks]);

  // Initial loads
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
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Goal tasks map by goalId
  const goalTasksMap = useMemo(() => {
    const map: Record<string, GoalTask[]> = {};
    allGoalTasks.forEach((gt) => {
      if (!map[gt.goalId]) map[gt.goalId] = [];
      map[gt.goalId].push(gt);
    });
    return map;
  }, [allGoalTasks]);

  // Unified list of all tasks for dropdown linking
  const allUnifiedTasks = useMemo(() => {
    return [...standaloneTasks, ...allGoalTasks];
  }, [standaloneTasks, allGoalTasks]);

  // Goal Progress List (Pure derivation from logs)
  const goalProgressList = useMemo(() => {
    return goals.map((goal) => {
      const gTasks = goalTasksMap[goal.id] || [];
      const progress = computeGoalProgress(goal, gTasks, allLogs, todayStr);
      return { goal, progress, tasks: gTasks };
    });
  }, [goals, goalTasksMap, allLogs, todayStr]);

  // Idempotent Auto-Complete check using Firestore transaction
  useEffect(() => {
    goalProgressList.forEach(async ({ goal, progress }) => {
      if (goal.status === 'active' && progress.valuePct >= 100) {
        const completed = await autoCompleteGoal(goal.id);
        if (completed) {
          toastService.show(`🎉 Goal "${goal.title}" completed!`, 'success');
        }
      }
    });
  }, [goalProgressList]);

  // Today Standalone Tasks (accounting for Monday-based timesPerWeek resets)
  const todayObj = useMemo(() => new Date(), [todayStr]);
  const todayStandaloneTasks = useMemo(() => {
    return standaloneTasks.filter((t) => {
      const compCount = countTaskCompletionsThisWeek(t.id, allLogs, todayObj);
      return isTaskDueOn(t, todayObj, compCount);
    });
  }, [standaloneTasks, allLogs, todayObj]);

  // Remaining Today Tasks Count for 9:00 PM reminder
  const remainingTodayTasksCount = useMemo(() => {
    let dueCount = 0;
    let doneCount = 0;

    todayStandaloneTasks.forEach((t) => {
      dueCount++;
      if (todayLog.done?.[t.id]) doneCount++;
    });

    allGoalTasks.forEach((gt) => {
      const compCount = countTaskCompletionsThisWeek(gt.id, allLogs, todayObj);
      if (isTaskDueOn(gt, todayObj, compCount)) {
        dueCount++;
        if (todayLog.done?.[gt.id]) doneCount++;
      }
    });

    return Math.max(0, dueCount - doneCount);
  }, [todayStandaloneTasks, allGoalTasks, allLogs, todayObj, todayLog]);

  // Sync scheduled notifications when reminders, logs, quietHours change
  useEffect(() => {
    if (!loading) {
      syncLocalScheduledReminders(reminders, todayLog, quietHours, remainingTodayTasksCount);
    }
  }, [reminders, todayLog, quietHours, remainingTodayTasksCount, loading]);

  // Mutations: Goal
  const saveGoal = async (goal: Goal, tasksToSave?: Partial<GoalTask>[]) => {
    await upsertGoal(goal);

    if (tasksToSave && tasksToSave.length > 0) {
      for (const t of tasksToSave) {
        const fullTask: GoalTask = {
          id: t.id || `gtask-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          goalId: goal.id,
          title: t.title || 'Daily Task',
          kind: t.kind || 'check',
          unit: t.unit || goal.unit,
          plannedAmount: t.plannedAmount,
          rule: t.rule || 'atLeast',
          repeat: t.repeat || { type: 'daily' },
          active: t.active ?? true,
          avoidSuccess: t.avoidSuccess ?? false,
          createdAt: new Date().toISOString(),
        };
        await upsertGoalTask(fullTask);
      }
      await reloadGoalTasks(goals.concat(goal));
    }

    toastService.show('Goal saved!', 'success');
  };

  const deleteGoal = async (id: string) => {
    await removeGoal(id);
    setAllGoalTasks((prev) => prev.filter((t) => t.goalId !== id));
    // Update local reminders state to remove any deleted taskId links
    setReminders((prev) =>
      prev.map((r) => {
        const wasLinkedToGoal = allGoalTasks.some((t) => t.goalId === id && t.id === r.taskId);
        return wasLinkedToGoal ? { ...r, taskId: null } : r;
      })
    );
    toastService.show('Goal and tasks deleted.', 'info');
  };

  // Mutations: Standalone Tasks
  const saveStandaloneTask = async (task: Task) => {
    await upsertStandaloneTask(task);
    toastService.show('Task saved!', 'success');
  };

  const deleteStandaloneTask = async (id: string) => {
    await removeStandaloneTask(id);
    setReminders((prev) => prev.map((r) => (r.taskId === id ? { ...r, taskId: null } : r)));
    toastService.show('Task deleted.', 'info');
  };

  // Mutations: Goal Tasks
  const saveGoalTask = async (task: GoalTask) => {
    await upsertGoalTask(task);
    setAllGoalTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === task.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = task;
        return next;
      }
      return [...prev, task];
    });
    toastService.show('Goal task saved!', 'success');
  };

  const deleteGoalTask = async (goalId: string, taskId: string) => {
    await removeGoalTask(goalId, taskId);
    setAllGoalTasks((prev) => prev.filter((t) => t.id !== taskId));
    setReminders((prev) => prev.map((r) => (r.taskId === taskId ? { ...r, taskId: null } : r)));
    toastService.show('Task deleted.', 'info');
  };

  // Toggle Task Completion
  const toggleTask = async (taskId: string, dateStr: string = todayStr, customAmount?: number) => {
    const targetLog = allLogs[dateStr] || createEmptyLog(dateStr);
    const existingVal = targetLog.done?.[taskId];

    let newDoneMap = { ...targetLog.done };

    if (existingVal !== undefined && existingVal !== null && existingVal !== false) {
      delete newDoneMap[taskId];
      toastService.show('Task un-ticked. (Undo)', 'info');
    } else {
      if (typeof customAmount === 'number') {
        newDoneMap[taskId] = customAmount;
      } else {
        const gTask = allGoalTasks.find((t) => t.id === taskId);
        if (gTask && gTask.kind === 'amount') {
          newDoneMap[taskId] = gTask.plannedAmount || 1;
        } else {
          newDoneMap[taskId] = true;
        }
      }
    }

    const updatedLog: DailyLog = {
      ...targetLog,
      done: newDoneMap,
      updatedAt: new Date().toISOString(),
    };

    if (dateStr === todayStr) {
      setTodayLog(updatedLog);
    }
    setAllLogs((prev) => ({ ...prev, [dateStr]: updatedLog }));
    await upsertLog(updatedLog);
  };

  // Log Daily Goal Entry value
  const logGoalValue = async (goalId: string, value: number, dateStr: string = todayStr) => {
    const targetLog = allLogs[dateStr] || createEmptyLog(dateStr);
    const updatedEntries = { ...targetLog.entries, [goalId]: value };

    const updatedLog: DailyLog = {
      ...targetLog,
      entries: updatedEntries,
      updatedAt: new Date().toISOString(),
    };

    if (dateStr === todayStr) setTodayLog(updatedLog);
    setAllLogs((prev) => ({ ...prev, [dateStr]: updatedLog }));
    await upsertLog(updatedLog);
    toastService.show(`Logged value ${value}!`, 'success');
  };

  // Catch-up suggestion: only updates plannedAmount for future days (historical logs remain unchanged)
  const applyPaceSuggestion = async (goalId: string, taskId: string, newPlannedAmount: number) => {
    const targetTask = allGoalTasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    const updated = { ...targetTask, plannedAmount: newPlannedAmount, updatedAt: new Date().toISOString() };
    await saveGoalTask(updated);
    toastService.show(`Planned amount updated to ${newPlannedAmount} for future days!`, 'success');
  };

  // Mutations: Links
  const saveLink = async (link: QuickLink) => {
    await upsertLink(link);
    toastService.show('Quick link saved!', 'success');
  };

  const deleteLink = async (id: string) => {
    await removeLink(id);
    toastService.show('Quick link removed.', 'info');
  };

  // Mutations: Logs & Reminders
  const updateTodayLog = async (partial: Partial<DailyLog>) => {
    const updated: DailyLog = {
      ...todayLog,
      ...partial,
      done: { ...(todayLog.done || {}), ...(partial.done || {}) },
      entries: { ...(todayLog.entries || {}), ...(partial.entries || {}) },
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
      done: { ...(current.done || {}), ...(partial.done || {}) },
      entries: { ...(current.entries || {}), ...(partial.entries || {}) },
      updatedAt: new Date().toISOString(),
    };
    if (date === todayStr) setTodayLog(updated);
    setAllLogs((prev) => ({ ...prev, [date]: updated }));
    await upsertLog(updated);
  };

  const saveReminder = async (r: Reminder) => {
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

  // CSV Export across all days and active goals
  const exportCSV = useCallback((): string => {
    const dates = Object.keys(allLogs).sort((a, b) => b.localeCompare(a));
    const activeGoals = goals.filter((g) => g.status === 'active');
    const headers = ['Date', 'Tasks Done Count', ...activeGoals.map((g) => `Goal: ${g.title} (${g.unit || ''})`), 'Mood', 'Note'];

    const rows = dates.map((d) => {
      const log = allLogs[d];
      const doneCount = Object.keys(log?.done || {}).length;
      const goalVals = activeGoals.map((g) => {
        const directVal = log?.entries?.[g.id];
        if (directVal !== undefined && directVal !== null) return directVal;
        return '';
      });

      return [
        d,
        doneCount,
        ...goalVals,
        log?.mood || '',
        `"${(log?.note || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }, [allLogs, goals]);

  return {
    isSynced,
    loading,
    todayStr,

    goals,
    standaloneTasks,
    goalTasksMap,
    allGoalTasks,
    allUnifiedTasks,
    todayLog,
    allLogs,
    links,
    reminders,
    quietHours,
    reviews,

    goalProgressList,
    todayStandaloneTasks,
    remainingTodayTasksCount,

    saveGoal,
    deleteGoal,
    saveStandaloneTask,
    deleteStandaloneTask,
    saveGoalTask,
    deleteGoalTask,

    toggleTask,
    logGoalValue,
    applyPaceSuggestion,

    saveLink,
    deleteLink,

    updateTodayLog,
    updateLogForDate,

    saveReminder,
    deleteReminder,
    saveQuietHours,
    saveReview,

    exportCSV,
  };
}
