/**
 * TodayView.tsx — PACE Daily Progress, Metrics & Dynamic Habit Actions.
 *
 * Connected Features:
 *  1. Top Daily Score & Holistic Completion Progress.
 *  2. Dynamic Metrics Card:
 *     - Renders pinned metrics + metrics used by active goals.
 *     - Daily target calculated from active goal's requiredPerDay (fallback metric.dailyTarget).
 *     - Direct typed numeric inputs (never negative) + quick positive add chips.
 *     - Live Goal Progress Line (e.g. "Steps goal: 1.2L / 3L · On track").
 *  3. Today's Action List:
 *     - Daily Goal Targets automatically checked when target reached or manually toggled.
 *     - Task repeat badge ("Repeats: Mon, Wed, Fri").
 *     - Automatic metric addition/subtraction on task check/uncheck (metricId + amount).
 *     - Repeat Picker in Add/Edit Task panel (Sliders/Options icon).
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DailyLog } from '@/types/logs';
import { Task, Recurrence, getTaskRepeatLabel } from '@/types/tasks';
import { Goal, GoalCalculatedProgress } from '@/types/goals';
import { MetricDefinition } from '@/types/metrics';
import { ProgressBar } from '@/components/ui/Primitives';
import { formatIndianNumber } from '@/lib/goals/computeGoalProgress';
import theme from '@/constants/theme';
import { toastService } from '@/services/toastService';

interface Props {
  todayLog: DailyLog;
  todayTasks: Task[];
  goals: Goal[];
  goalProgressList: { goal: Goal; progress: GoalCalculatedProgress; metric?: MetricDefinition }[];
  metrics: MetricDefinition[];
  onUpdateLog: (log: Partial<DailyLog>) => Promise<void>;
  onSaveTask: (task: Task) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onToggleTask?: (taskId: string) => Promise<void>;
  scrollPaddingBottom?: number;
}

const WEEKDAY_ABBRS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const TodayView: React.FC<Props> = ({
  todayLog,
  todayTasks,
  goals,
  goalProgressList,
  metrics,
  onUpdateLog,
  onSaveTask,
  onDeleteTask,
  onToggleTask,
  scrollPaddingBottom = 100,
}) => {
  const insets = useSafeAreaInsets();

  // Active Goals Map for quick lookup
  const activeGoalMap = useMemo(() => {
    const map = new Map<string, { goal: Goal; progress: GoalCalculatedProgress }>();
    goalProgressList.forEach((gp) => {
      if (gp.goal.metricId && gp.goal.status === 'active') {
        map.set(gp.goal.metricId, { goal: gp.goal, progress: gp.progress });
      }
    });
    return map;
  }, [goalProgressList]);

  // Determine which metrics to display on Today view:
  // Pinned metrics OR metrics used by active goals
  const displayMetrics = useMemo(() => {
    return metrics.filter((m) => !m.archived && (m.pinned || activeGoalMap.has(m.id)));
  }, [metrics, activeGoalMap]);

  // Local state for typed metric inputs
  const [metricInputs, setMetricInputs] = useState<Record<string, string>>({});

  // Sync inputs when todayLog changes
  useEffect(() => {
    const next: Record<string, string> = {};
    displayMetrics.forEach((m) => {
      const val = todayLog?.metrics?.[m.id];
      next[m.id] = val !== undefined && val !== null && val > 0 ? String(val) : '';
    });
    setMetricInputs(next);
  }, [todayLog?.metrics, displayMetrics]);

  // Task inline add state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showAddOptions, setShowAddOptions] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [selectedRecurrence, setSelectedRecurrence] = useState<Recurrence>('daily');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  const [taskMetricId, setTaskMetricId] = useState<string | null>(null);
  const [taskAmount, setTaskAmount] = useState<string>('');
  const [taskError, setTaskError] = useState('');

  // Task edit modal state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editGoalId, setEditGoalId] = useState<string | null>(null);
  const [editRecurrence, setEditRecurrence] = useState<Recurrence>('daily');
  const [editWeekdays, setEditWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [editMetricId, setEditMetricId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editError, setEditError] = useState('');

  // Task Completed Set
  const completedSet = useMemo(
    () => new Set(todayLog?.completedTaskIds || []),
    [todayLog?.completedTaskIds]
  );

  // Overall Daily Completion Count
  const totalTasksCount = todayTasks.length;
  const completedTasksCount = todayTasks.filter((t) => completedSet.has(t.id)).length;
  const todayProgressPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  // Metric Update Handler (always >= 0)
  const handleSetMetricValue = (mId: string, valStr: string) => {
    const cleanStr = valStr.replace(/[^0-9.]/g, '');
    const num = Math.max(0, parseFloat(cleanStr) || 0);

    setMetricInputs((prev) => ({ ...prev, [mId]: cleanStr }));

    const updated = {
      ...(todayLog.metrics || {}),
      [mId]: num,
    };
    onUpdateLog({ metrics: updated });
  };

  const handleQuickAddMetric = (mId: string, amount: number) => {
    const current = Math.max(0, todayLog.metrics?.[mId] ?? 0);
    const next = Math.max(0, current + amount);
    const cleanStr = String(next);

    setMetricInputs((prev) => ({ ...prev, [mId]: cleanStr }));

    const updated = {
      ...(todayLog.metrics || {}),
      [mId]: next,
    };
    onUpdateLog({ metrics: updated });
  };

  const handleResetMetric = (mId: string) => {
    setMetricInputs((prev) => ({ ...prev, [mId]: '' }));
    const updated = {
      ...(todayLog.metrics || {}),
      [mId]: 0,
    };
    onUpdateLog({ metrics: updated });
  };

  // Task Toggle Handler
  const handleToggleTask = useCallback(
    async (task: Task) => {
      if (onToggleTask) {
        await onToggleTask(task.id);
        return;
      }

      const isDone = completedSet.has(task.id);
      const updatedIds = isDone
        ? (todayLog.completedTaskIds || []).filter((id) => id !== task.id)
        : [...(todayLog.completedTaskIds || []), task.id];

      // Auto update bound metric if any
      let updatedMetrics = { ...todayLog.metrics };
      if (task.metricId && typeof task.amount === 'number' && task.amount > 0) {
        const current = Math.max(0, updatedMetrics[task.metricId] ?? 0);
        const delta = isDone ? -task.amount : task.amount;
        updatedMetrics[task.metricId] = Math.max(0, current + delta);
      }

      await onUpdateLog({ completedTaskIds: updatedIds, metrics: updatedMetrics });
    },
    [todayLog, completedSet, onUpdateLog, onToggleTask]
  );

  // Add Task Handler
  const handleAddTask = useCallback(() => {
    const title = newTaskTitle.trim();
    if (!title || title.length < 2) {
      setTaskError('Title must be at least 2 characters.');
      return;
    }

    const parsedAmount = parseFloat(taskAmount);

    const task: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      goalId: selectedGoalId,
      recurrence: selectedRecurrence,
      selectedWeekdays: selectedRecurrence === 'weekly' ? selectedWeekdays : undefined,
      metricId: taskMetricId || undefined,
      amount: !isNaN(parsedAmount) && parsedAmount > 0 ? parsedAmount : undefined,
      reminderTime: null,
      active: true,
      createdAt: new Date().toISOString(),
    };

    onSaveTask(task);
    setNewTaskTitle('');
    setSelectedGoalId(null);
    setSelectedRecurrence('daily');
    setTaskMetricId(null);
    setTaskAmount('');
    setShowAddOptions(false);
    setTaskError('');
  }, [newTaskTitle, selectedGoalId, selectedRecurrence, selectedWeekdays, taskMetricId, taskAmount, onSaveTask]);

  // Open Edit Task Modal
  const handleOpenEdit = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditGoalId(task.goalId || null);
    setEditRecurrence(task.recurrence || 'daily');
    setEditWeekdays(task.selectedWeekdays || [1, 2, 3, 4, 5]);
    setEditMetricId(task.metricId || null);
    setEditAmount(task.amount ? String(task.amount) : '');
    setEditError('');
  };

  // Save Edit Task
  const handleSaveEdit = () => {
    if (!editingTask) return;
    const title = editTitle.trim();
    if (!title || title.length < 2) {
      setEditError('Title must be at least 2 characters.');
      return;
    }

    const parsedAmount = parseFloat(editAmount);

    const updated: Task = {
      ...editingTask,
      title,
      goalId: editGoalId,
      recurrence: editRecurrence,
      selectedWeekdays: editRecurrence === 'weekly' ? editWeekdays : undefined,
      metricId: editMetricId || undefined,
      amount: !isNaN(parsedAmount) && parsedAmount > 0 ? parsedAmount : undefined,
      updatedAt: new Date().toISOString(),
    };

    onSaveTask(updated);
    setEditingTask(null);
  };

  // Delete Task
  const handleDeleteTaskConfirm = (task: Task) => {
    Alert.alert('Delete Task', `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          onDeleteTask(task.id);
          if (editingTask?.id === task.id) setEditingTask(null);
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── SECTION 1: TODAY DAILY SCORE CARD ──────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.progressHeader}>
          <View>
            <Text style={styles.progressSub}>TODAY'S PACE SCORE</Text>
            <Text style={styles.progressTitle}>
              {completedTasksCount} of {totalTasksCount} tasks done
            </Text>
          </View>
          <Text style={styles.progressPercent}>{todayProgressPercent}%</Text>
        </View>

        <ProgressBar progress={todayProgressPercent / 100} height={10} color={theme.colors.primary} />
      </View>

      {/* ── SECTION 2: DYNAMIC METRICS CARD (WITH LIVE GOAL TARGETS) ──── */}
      <View style={styles.card}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="stats-chart" size={20} color={theme.colors.primary} />
          <Text style={styles.cardTitle}>Daily Metric Inputs & Goals</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Values sync live across your active goals. Type exact numbers or tap quick-add chips.
        </Text>

        <View style={styles.metricsFormGrid}>
          {displayMetrics.map((m) => {
            const current = Math.max(0, todayLog?.metrics?.[m.id] ?? 0);
            const activeGoal = activeGoalMap.get(m.id);

            // Daily target from active goal requiredPerDay or fallback to metric default
            const target = activeGoal
              ? (activeGoal.progress.requiredPerDay > 0 ? activeGoal.progress.requiredPerDay : activeGoal.goal.targetValue)
              : (m.dailyTarget ?? 0);

            const isGoalActive = !!activeGoal;
            const unit = m.unit || '';
            const isCurrency = unit === '₹';

            // Quick add increment values
            let chip1 = 100, chip2 = 500;
            if (m.id === 'water') { chip1 = 0.25; chip2 = 0.5; }
            else if (m.id === 'steps') { chip1 = 1000; chip2 = 2500; }
            else if (m.id === 'protein') { chip1 = 10; chip2 = 25; }
            else if (m.id === 'savings') { chip1 = 500; chip2 = 2000; }

            return (
              <View key={m.id} style={styles.metricFieldBox}>
                <View style={styles.metricFieldHeader}>
                  <View style={styles.metricTitleLeft}>
                    <Text style={styles.metricIcon}>{m.icon || '🎯'}</Text>
                    <Text style={styles.metricFieldTitle}>{m.name}</Text>
                  </View>

                  {target > 0 && (
                    <Text style={styles.targetBadge}>
                      Target: {formatIndianNumber(target, { isCurrency, unit: !isCurrency ? unit : undefined })}
                    </Text>
                  )}
                </View>

                <View style={styles.metricInputRow}>
                  <TextInput
                    style={styles.numericInput}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    value={metricInputs[m.id] ?? ''}
                    onChangeText={(t) => handleSetMetricValue(m.id, t)}
                  />
                  <Text style={styles.unitText}>{m.unit}</Text>

                  {/* Quick Add Chips */}
                  <View style={styles.quickChipsRow}>
                    <TouchableOpacity style={styles.quickAddChip} onPress={() => handleQuickAddMetric(m.id, chip1)}>
                      <Text style={styles.quickAddChipText}>+{chip1}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickAddChip} onPress={() => handleQuickAddMetric(m.id, chip2)}>
                      <Text style={styles.quickAddChipText}>+{chip2}</Text>
                    </TouchableOpacity>
                    {current > 0 && (
                      <TouchableOpacity style={styles.resetChip} onPress={() => handleResetMetric(m.id)}>
                        <Ionicons name="refresh" size={12} color="#94A3B8" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Live Goal Progress Line */}
                {isGoalActive && (
                  <View style={styles.goalConnectionLine}>
                    <Ionicons name="flag" size={12} color={theme.colors.primary} />
                    <Text style={styles.goalConnectionText}>
                      {activeGoal.goal.title}: {formatIndianNumber(activeGoal.progress.current, { isCurrency, unit: !isCurrency ? unit : undefined })} / {formatIndianNumber(activeGoal.goal.targetValue, { isCurrency, unit: !isCurrency ? unit : undefined })} ({activeGoal.progress.valuePct}%) · {activeGoal.progress.status}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* ── SECTION 3: TODAY'S ACTION LIST ─────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="checkbox-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.cardTitle}>Today's Action List</Text>
        </View>

        {todayTasks.length === 0 ? (
          <Text style={styles.emptyText}>No tasks due today. Add a repeating or daily action below!</Text>
        ) : (
          todayTasks.map((task) => {
            const isDone = completedSet.has(task.id);
            const linkedGoal = goals.find((g) => g.id === task.goalId);
            const repeatLabel = getTaskRepeatLabel(task);

            return (
              <View key={task.id} style={[styles.taskRow, isDone && styles.taskRowDone]}>
                <TouchableOpacity
                  style={styles.taskLeft}
                  onPress={() => handleToggleTask(task)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={isDone ? theme.colors.success : theme.colors.textSecondary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]}>
                      {task.title}
                    </Text>
                    <View style={styles.taskMetaRow}>
                      <Text style={styles.repeatBadge}>{repeatLabel}</Text>
                      {linkedGoal && (
                        <Text style={styles.goalTag}>🎯 {linkedGoal.title}</Text>
                      )}
                      {task.metricId && task.amount && (
                        <Text style={styles.metricDeltaTag}>
                          +{task.amount} {task.metricId} on check
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.moreBtn}
                  onPress={() => handleOpenEdit(task)}
                >
                  <Ionicons name="ellipsis-horizontal" size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {/* Inline Add Task */}
        <View style={styles.addBox}>
          <View style={styles.addInputRow}>
            <TextInput
              style={[styles.addInput, !!taskError && styles.inputError]}
              placeholder="+ Add a task for today..."
              placeholderTextColor="#94A3B8"
              value={newTaskTitle}
              onChangeText={(t) => { setNewTaskTitle(t); setTaskError(''); }}
              onSubmitEditing={handleAddTask}
            />
            <TouchableOpacity
              style={styles.optionsToggleBtn}
              onPress={() => setShowAddOptions(!showAddOptions)}
            >
              <Ionicons name="options-outline" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addSubmitBtn, (!newTaskTitle.trim() || newTaskTitle.trim().length < 2) && styles.btnDisabled]}
              onPress={handleAddTask}
              disabled={!newTaskTitle.trim() || newTaskTitle.trim().length < 2}
            >
              <Text style={styles.addSubmitText}>Add</Text>
            </TouchableOpacity>
          </View>
          {taskError ? <Text style={styles.errorText}>{taskError}</Text> : null}

          {/* Collapsible Repeat, Goal & Metric Binding */}
          {showAddOptions && (
            <View style={styles.optionsBox}>
              <Text style={styles.optionLabel}>Repeat Frequency</Text>
              <View style={styles.pillsRow}>
                {(['daily', 'weekdays', 'weekly', 'monthly', 'once'] as Recurrence[]).map((rec) => (
                  <TouchableOpacity
                    key={rec}
                    style={[styles.pill, selectedRecurrence === rec && styles.pillActive]}
                    onPress={() => setSelectedRecurrence(rec)}
                  >
                    <Text style={[styles.pillText, selectedRecurrence === rec && styles.pillTextActive]}>
                      {rec}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Weekly Day Selector */}
              {selectedRecurrence === 'weekly' && (
                <View style={styles.weekdayPickerRow}>
                  {WEEKDAY_ABBRS.map((abbr, idx) => {
                    const isSelected = selectedWeekdays.includes(idx);
                    return (
                      <TouchableOpacity
                        key={abbr}
                        style={[styles.weekdayCircle, isSelected && styles.weekdayCircleActive]}
                        onPress={() => {
                          if (isSelected) setSelectedWeekdays(selectedWeekdays.filter((d) => d !== idx));
                          else setSelectedWeekdays([...selectedWeekdays, idx]);
                        }}
                      >
                        <Text style={[styles.weekdayText, isSelected && styles.weekdayTextActive]}>{abbr}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Link to Goal */}
              <Text style={[styles.optionLabel, { marginTop: 8 }]}>Link to Goal (Optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow}>
                <TouchableOpacity
                  style={[styles.pill, selectedGoalId === null && styles.pillActive]}
                  onPress={() => setSelectedGoalId(null)}
                >
                  <Text style={[styles.pillText, selectedGoalId === null && styles.pillTextActive]}>None</Text>
                </TouchableOpacity>
                {goals.map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.pill, selectedGoalId === g.id && styles.pillActive]}
                    onPress={() => setSelectedGoalId(g.id)}
                  >
                    <Text style={[styles.pillText, selectedGoalId === g.id && styles.pillTextActive]}>{g.title}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Optional Metric Auto-increment */}
              <Text style={[styles.optionLabel, { marginTop: 8 }]}>Auto-Log Metric On Completion</Text>
              <View style={styles.rowTwo}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow}>
                  <TouchableOpacity
                    style={[styles.pill, taskMetricId === null && styles.pillActive]}
                    onPress={() => setTaskMetricId(null)}
                  >
                    <Text style={[styles.pillText, taskMetricId === null && styles.pillTextActive]}>None</Text>
                  </TouchableOpacity>
                  {metrics.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.pill, taskMetricId === m.id && styles.pillActive]}
                      onPress={() => setTaskMetricId(m.id)}
                    >
                      <Text style={[styles.pillText, taskMetricId === m.id && styles.pillTextActive]}>
                        {m.icon} {m.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {taskMetricId && (
                  <TextInput
                    style={[styles.input, { width: 90 }]}
                    keyboardType="numeric"
                    placeholder="Amount"
                    placeholderTextColor="#94A3B8"
                    value={taskAmount}
                    onChangeText={setTaskAmount}
                  />
                )}
              </View>
            </View>
          )}
        </View>
      </View>

      {/* ── EDIT TASK MODAL ─────────────────────────────────────────────── */}
      {editingTask && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setEditingTask(null)}>
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Task & Repeat</Text>
                <TouchableOpacity onPress={() => setEditingTask(null)}>
                  <Ionicons name="close-circle" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Task Title *</Text>
                <TextInput
                  style={[styles.input, !!editError && styles.inputError]}
                  value={editTitle}
                  onChangeText={(t) => { setEditTitle(t); setEditError(''); }}
                  placeholder="e.g. Morning 5km Run"
                  placeholderTextColor="#94A3B8"
                />
                {editError ? <Text style={styles.errorText}>{editError}</Text> : null}
              </View>

              {/* Recurrence Selection */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Repeat Frequency</Text>
                <View style={styles.pillsRow}>
                  {(['daily', 'weekdays', 'weekly', 'monthly', 'once'] as Recurrence[]).map((rec) => (
                    <TouchableOpacity
                      key={rec}
                      style={[styles.pill, editRecurrence === rec && styles.pillActive]}
                      onPress={() => setEditRecurrence(rec)}
                    >
                      <Text style={[styles.pillText, editRecurrence === rec && styles.pillTextActive]}>
                        {rec}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {editRecurrence === 'weekly' && (
                  <View style={styles.weekdayPickerRow}>
                    {WEEKDAY_ABBRS.map((abbr, idx) => {
                      const isSelected = editWeekdays.includes(idx);
                      return (
                        <TouchableOpacity
                          key={abbr}
                          style={[styles.weekdayCircle, isSelected && styles.weekdayCircleActive]}
                          onPress={() => {
                            if (isSelected) setEditWeekdays(editWeekdays.filter((d) => d !== idx));
                            else setEditWeekdays([...editWeekdays, idx]);
                          }}
                        >
                          <Text style={[styles.weekdayText, isSelected && styles.weekdayTextActive]}>{abbr}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Goal Linking */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Link to Goal</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow}>
                  <TouchableOpacity
                    style={[styles.pill, editGoalId === null && styles.pillActive]}
                    onPress={() => setEditGoalId(null)}
                  >
                    <Text style={[styles.pillText, editGoalId === null && styles.pillTextActive]}>None</Text>
                  </TouchableOpacity>
                  {goals.map((g) => (
                    <TouchableOpacity
                      key={g.id}
                      style={[styles.pill, editGoalId === g.id && styles.pillActive]}
                      onPress={() => setEditGoalId(g.id)}
                    >
                      <Text style={[styles.pillText, editGoalId === g.id && styles.pillTextActive]}>{g.title}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Metric Auto Increment */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Auto-Log Metric On Completion</Text>
                <View style={styles.rowTwo}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow}>
                    <TouchableOpacity
                      style={[styles.pill, editMetricId === null && styles.pillActive]}
                      onPress={() => setEditMetricId(null)}
                    >
                      <Text style={[styles.pillText, editMetricId === null && styles.pillTextActive]}>None</Text>
                    </TouchableOpacity>
                    {metrics.map((m) => (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.pill, editMetricId === m.id && styles.pillActive]}
                        onPress={() => setEditMetricId(m.id)}
                      >
                        <Text style={[styles.pillText, editMetricId === m.id && styles.pillTextActive]}>
                          {m.icon} {m.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  {editMetricId && (
                    <TextInput
                      style={[styles.input, { width: 90 }]}
                      keyboardType="numeric"
                      placeholder="Amount"
                      placeholderTextColor="#94A3B8"
                      value={editAmount}
                      onChangeText={setEditAmount}
                    />
                  )}
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.deleteModalBtn}
                  onPress={() => handleDeleteTaskConfirm(editingTask)}
                >
                  <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                  <Text style={styles.deleteModalBtnText}>Delete</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveModalBtn, (!editTitle.trim() || editTitle.trim().length < 2) && styles.btnDisabled]}
                  onPress={handleSaveEdit}
                  disabled={!editTitle.trim() || editTitle.trim().length < 2}
                >
                  <Text style={styles.saveModalBtnText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, gap: 14 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.small,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressSub: { ...theme.typography.captionSmall, fontWeight: '700', color: theme.colors.primary, letterSpacing: 1 },
  progressTitle: { ...theme.typography.subtitle, fontWeight: '800', color: theme.colors.textPrimary },
  progressPercent: { fontSize: 24, fontWeight: '800', color: theme.colors.primary },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { ...theme.typography.subtitle, fontWeight: '800', color: theme.colors.textPrimary },
  sectionSubtitle: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: -4 },

  // Metrics Form Styles
  metricsFormGrid: { gap: 10, marginTop: 4 },
  metricFieldBox: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  metricFieldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricTitleLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metricIcon: { fontSize: 18 },
  metricFieldTitle: { ...theme.typography.bodySmall, fontWeight: '700', color: theme.colors.textPrimary },
  targetBadge: { ...theme.typography.captionSmall, color: theme.colors.textSecondary, fontWeight: '600' },
  metricInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  numericInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 70,
    ...theme.typography.bodySmall,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  unitText: { ...theme.typography.captionSmall, color: theme.colors.textSecondary, fontWeight: '600' },
  quickChipsRow: { flexDirection: 'row', gap: 6, marginLeft: 'auto', alignItems: 'center' },
  quickAddChip: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.primary + '25',
  },
  quickAddChipText: { ...theme.typography.captionSmall, fontWeight: '700', color: theme.colors.primary },
  resetChip: { padding: 5, backgroundColor: theme.colors.surfaceSecondary, borderRadius: 6 },
  goalConnectionLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border + '60',
  },
  goalConnectionText: { ...theme.typography.captionSmall, color: theme.colors.primary, fontWeight: '700' },

  // Tasks Checklist
  emptyText: { ...theme.typography.bodySmall, color: theme.colors.textSecondary, fontStyle: 'italic', paddingVertical: 4 },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  taskRowDone: {
    backgroundColor: theme.colors.surfaceSecondary + '50',
    borderColor: theme.colors.border,
  },
  taskLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  taskTitle: { ...theme.typography.bodySmall, color: theme.colors.textPrimary, fontWeight: '600' },
  taskTitleDone: { textDecorationLine: 'line-through', color: theme.colors.textSecondary },
  taskMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' },
  repeatBadge: {
    ...theme.typography.captionSmall,
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  goalTag: { ...theme.typography.captionSmall, color: theme.colors.primary, fontWeight: '600' },
  metricDeltaTag: { ...theme.typography.captionSmall, color: '#10B981', fontWeight: '600' },
  moreBtn: { padding: 6 },

  // Add Task Box
  addBox: { gap: 6, marginTop: 8 },
  addInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addInput: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    ...theme.typography.bodySmall,
    color: theme.colors.textPrimary,
  },
  optionsToggleBtn: { padding: 8, backgroundColor: theme.colors.primaryLight, borderRadius: 10 },
  addSubmitBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  addSubmitText: { ...theme.typography.buttonSmall, color: '#FFF', fontWeight: '700' },
  optionsBox: { backgroundColor: theme.colors.background, borderRadius: 10, padding: 10, gap: 4 },
  optionLabel: { ...theme.typography.captionSmall, fontWeight: '700', color: theme.colors.textSecondary },
  pillsRow: { flexDirection: 'row', gap: 6 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pillText: { ...theme.typography.captionSmall, color: theme.colors.textSecondary },
  pillTextActive: { color: '#FFF', fontWeight: '700' },
  weekdayPickerRow: { flexDirection: 'row', gap: 6, paddingVertical: 4 },
  weekdayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayCircleActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  weekdayText: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '700' },
  weekdayTextActive: { color: '#FFF' },
  rowTwo: { flexDirection: 'row', gap: 10, alignItems: 'center' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 12,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { ...theme.typography.subtitle, fontWeight: '700', color: theme.colors.textPrimary },
  fieldGroup: { gap: 4 },
  fieldLabel: { ...theme.typography.caption, fontWeight: '600', color: theme.colors.textSecondary },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...theme.typography.bodySmall,
    color: theme.colors.textPrimary,
  },
  inputError: { borderColor: theme.colors.error },
  errorText: { ...theme.typography.captionSmall, color: theme.colors.error },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  deleteModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: theme.colors.error + '15',
  },
  deleteModalBtnText: { ...theme.typography.buttonSmall, color: theme.colors.error, fontWeight: '700' },
  saveModalBtn: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  saveModalBtnText: { ...theme.typography.buttonSmall, color: '#FFF', fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
});
