import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Goal, GoalCategory, GoalCalculatedProgress } from '@/types/goals';
import { Task, GoalTask, RepeatConfig, getRepeatLabel } from '@/types/tasks';
import { DailyLog } from '@/types/logs';
import { GoalCard } from '@/components/goals/GoalCard';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { toastService } from '@/services/toastService';
import theme from '@/constants/theme';

interface TodayViewProps {
  todayLog: DailyLog;
  todayStandaloneTasks: Task[];
  goalProgressList: { goal: Goal; progress: GoalCalculatedProgress; tasks: GoalTask[] }[];
  onSaveStandaloneTask: (task: Task) => Promise<void>;
  onDeleteStandaloneTask: (id: string) => Promise<void>;
  onToggleTask: (taskId: string, dateStr?: string, customAmount?: number) => Promise<void>;
  onLogGoalValue: (goalId: string, value: number) => Promise<void>;
  onApplyPaceSuggestion: (goalId: string, taskId: string, suggestedAmount: number) => Promise<void>;
  onUpdateLog: (partial: Partial<DailyLog>) => Promise<void>;
  onOpenAddGoal?: (category?: GoalCategory) => void;
  scrollPaddingBottom: number;
}

type CategoryTab = 'All' | 'Tasks' | GoalCategory;

export const TodayView: React.FC<TodayViewProps> = ({
  todayLog,
  todayStandaloneTasks,
  goalProgressList,
  onSaveStandaloneTask,
  onDeleteStandaloneTask,
  onToggleTask,
  onLogGoalValue,
  onApplyPaceSuggestion,
  onUpdateLog,
  onOpenAddGoal,
  scrollPaddingBottom,
}) => {
  // Sticky Category Tab State
  const [selectedTab, setSelectedTab] = useState<CategoryTab>('All');
  const [showDoneTodayGroup, setShowDoneTodayGroup] = useState(false);

  // Quick Add Standalone Task
  const [quickTitle, setQuickTitle] = useState('');
  const [quickRepeat, setQuickRepeat] = useState<RepeatConfig>({ type: 'daily' });

  // Log Goal Value BottomSheet
  const [logValueModalGoal, setLogValueModalGoal] = useState<Goal | null>(null);
  const [logValueInput, setLogValueInput] = useState('');

  // Amount Task Prompt BottomSheet
  const [amountTaskModal, setAmountTaskModal] = useState<{ taskId: string; title: string; defaultVal: number } | null>(null);
  const [amountInput, setAmountInput] = useState('');

  // Evening Note state
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState(todayLog.note || '');
  const [moodRating, setMoodRating] = useState<number | null>(typeof todayLog.mood === 'number' ? todayLog.mood : null);

  // Filter goals that are active today (not future, not paused)
  const activeTodayGoals = useMemo(() => {
    return goalProgressList.filter((g) => g.goal.status === 'active' && !g.progress.isFuture && !g.progress.isPausedToday);
  }, [goalProgressList]);

  // Overall Completion Calculation
  const totalTasksDueCount = useMemo(() => {
    let count = todayStandaloneTasks.length;
    activeTodayGoals.forEach(({ tasks }) => {
      count += tasks.length;
    });
    return count;
  }, [todayStandaloneTasks, activeTodayGoals]);

  const totalTasksDoneCount = useMemo(() => {
    let count = 0;
    todayStandaloneTasks.forEach((t) => {
      if (todayLog.done?.[t.id]) count++;
    });
    activeTodayGoals.forEach(({ tasks }) => {
      tasks.forEach((gt) => {
        if (todayLog.done?.[gt.id]) count++;
      });
    });
    return count;
  }, [todayStandaloneTasks, activeTodayGoals, todayLog]);

  const overallCompletionPct = totalTasksDueCount > 0 ? Math.round((totalTasksDoneCount / totalTasksDueCount) * 100) : 100;

  // Compute Categories with active goals due today + Counts for Tabs
  const availableTabs = useMemo(() => {
    const tabs: { key: CategoryTab; label: string; countStr?: string }[] = [];

    // All Tab
    tabs.push({
      key: 'All',
      label: 'All',
      countStr: `${totalTasksDoneCount}/${totalTasksDueCount}`,
    });

    // Standalone Tasks Tab
    if (todayStandaloneTasks.length > 0) {
      const standaloneDone = todayStandaloneTasks.filter((t) => todayLog.done?.[t.id]).length;
      tabs.push({
        key: 'Tasks',
        label: 'Tasks',
        countStr: `${standaloneDone}/${todayStandaloneTasks.length}`,
      });
    }

    // Category Tabs with counts
    const categoryMap: Record<string, { done: number; total: number }> = {};
    activeTodayGoals.forEach(({ goal, tasks }) => {
      if (!categoryMap[goal.category]) categoryMap[goal.category] = { done: 0, total: 0 };
      categoryMap[goal.category].total += tasks.length;
      tasks.forEach((t) => {
        if (todayLog.done?.[t.id]) categoryMap[goal.category].done++;
      });
    });

    Object.entries(categoryMap).forEach(([cat, { done, total }]) => {
      tabs.push({
        key: cat as GoalCategory,
        label: cat,
        countStr: `${done}/${total}`,
      });
    });

    return tabs;
  }, [totalTasksDoneCount, totalTasksDueCount, todayStandaloneTasks, activeTodayGoals, todayLog]);

  // Split Active Today Goals into Pending vs Done Today
  const { pendingGoals, doneTodayGoals } = useMemo(() => {
    const pending: typeof activeTodayGoals = [];
    const done: typeof activeTodayGoals = [];

    activeTodayGoals.forEach((item) => {
      // Filter by selected tab
      if (selectedTab !== 'All' && selectedTab !== 'Tasks' && item.goal.category !== selectedTab) {
        return;
      }
      if (selectedTab === 'Tasks') return; // Only standalone tasks in Tasks tab

      const isAllTasksDone = item.tasks.length > 0 && item.tasks.every((t) => Boolean(todayLog.done?.[t.id]) || Boolean(todayLog.skipped?.[t.id]));
      if (isAllTasksDone || item.progress.valuePct >= 100) {
        done.push(item);
      } else {
        pending.push(item);
      }
    });

    return { pendingGoals: pending, doneTodayGoals: done };
  }, [activeTodayGoals, selectedTab, todayLog]);

  const handleAddStandaloneTask = async () => {
    if (!quickTitle.trim()) return;
    const nowStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
    const newTask: Task = {
      id: `task-standalone-${Date.now()}`,
      title: quickTitle.trim(),
      repeat: quickRepeat,
      startDate: nowStr,
      active: true,
      createdAt: new Date().toISOString(),
    };
    await onSaveStandaloneTask(newTask);
    setQuickTitle('');
  };

  const handleDeleteTaskConfirm = (taskId: string) => {
    Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDeleteStandaloneTask(taskId) },
    ]);
  };

  const handleSkipTask = async (taskId: string) => {
    const isCurrentlySkipped = Boolean(todayLog.skipped?.[taskId]);
    const updatedSkipped = { ...(todayLog.skipped || {}), [taskId]: !isCurrentlySkipped };
    if (!isCurrentlySkipped) {
      toastService.show('Task skipped for today. (Undo)', 'info');
    } else {
      delete updatedSkipped[taskId];
      toastService.show('Task un-skipped.', 'info');
    }
    await onUpdateLog({ skipped: updatedSkipped });
  };

  const handleSaveLogValue = async () => {
    if (!logValueModalGoal) return;
    const val = parseFloat(logValueInput);
    if (isNaN(val)) {
      Alert.alert('Invalid Value', 'Please enter a valid number.');
      return;
    }
    await onLogGoalValue(logValueModalGoal.id, val);
    setLogValueModalGoal(null);
    setLogValueInput('');
  };

  const handleSaveAmountTaskActual = async () => {
    if (!amountTaskModal) return;
    const val = parseFloat(amountInput);
    if (isNaN(val)) return;
    await onToggleTask(amountTaskModal.taskId, undefined, val);
    setAmountTaskModal(null);
    setAmountInput('');
  };

  const handleSaveEveningNote = async () => {
    await onUpdateLog({ mood: moodRating, note: noteText });
  };

  const isStandaloneTasksVisible = selectedTab === 'All' || selectedTab === 'Tasks';

  return (
    <View style={styles.outerWrapper}>
      {/* ── STICKY CATEGORY TABS ── */}
      <View style={styles.stickyTabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
          {availableTabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabChip, selectedTab === tab.key && styles.tabChipActive]}
              onPress={() => setSelectedTab(tab.key)}
            >
              <Text style={[styles.tabChipText, selectedTab === tab.key && styles.tabChipTextActive]}>
                {tab.label} {tab.countStr ? `(${tab.countStr})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: scrollPaddingBottom }]}>
        {/* COMPACT TOP COMPLETION BAR */}
        <View style={styles.compactBarCard}>
          <View style={styles.compactBarInfo}>
            <Text style={styles.compactBarTitle}>Today's Pace</Text>
            <Text style={styles.compactBarSubtitle}>
              {totalTasksDoneCount}/{totalTasksDueCount} tasks ({overallCompletionPct}%)
            </Text>
          </View>
          <View style={styles.compactProgressTrack}>
            <View style={[styles.compactProgressFill, { width: `${overallCompletionPct}%` }]} />
          </View>
        </View>

        {/* SECTION: MY TASKS (STANDALONE) */}
        {isStandaloneTasksVisible && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>My Tasks</Text>

            {/* Quick Add Input */}
            <View style={styles.quickAddRow}>
              <TextInput
                style={styles.quickAddInput}
                placeholder="+ Add standalone task..."
                placeholderTextColor={theme.colors.textMuted}
                value={quickTitle}
                onChangeText={setQuickTitle}
                onSubmitEditing={handleAddStandaloneTask}
              />
              <TouchableOpacity style={styles.quickAddBtn} onPress={handleAddStandaloneTask}>
                <Ionicons name="add" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* Standalone Task List */}
            {todayStandaloneTasks.length === 0 ? (
              <Text style={styles.emptyText}>No standalone tasks due today.</Text>
            ) : (
              todayStandaloneTasks.map((t) => {
                const isDone = Boolean(todayLog.done?.[t.id]);
                const isSkipped = Boolean(todayLog.skipped?.[t.id]);

                return (
                  <View key={t.id} style={[styles.standaloneTaskItem, isSkipped && styles.standaloneTaskItemSkipped]}>
                    <TouchableOpacity
                      style={styles.taskTouchArea}
                      onPress={() => !isSkipped && onToggleTask(t.id)}
                      disabled={isSkipped}
                    >
                      <Ionicons
                        name={isSkipped ? 'remove-circle-outline' : isDone ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={isSkipped ? theme.colors.textMuted : isDone ? theme.colors.primary : theme.colors.textMuted}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.taskTitle,
                            isDone && styles.taskTitleDone,
                            isSkipped && styles.taskTitleSkipped,
                          ]}
                        >
                          {t.title} {isSkipped ? '(Skipped)' : ''}
                        </Text>
                        <Text style={styles.taskRepeatBadge}>{getRepeatLabel(t.repeat)}</Text>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.taskActionBtns}>
                      <TouchableOpacity onPress={() => handleSkipTask(t.id)} style={{ padding: 4 }}>
                        <Ionicons
                          name={isSkipped ? 'arrow-undo-outline' : 'play-skip-forward-outline'}
                          size={16}
                          color={theme.colors.textMuted}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity style={{ padding: 4 }} onPress={() => handleDeleteTaskConfirm(t.id)}>
                        <Ionicons name="trash-outline" size={16} color={theme.colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* SECTION: GOALS TODAY (COLLAPSED BY DEFAULT) */}
        {selectedTab !== 'Tasks' && (
          <View style={[styles.sectionContainer, { marginTop: isStandaloneTasksVisible ? 16 : 0 }]}>
            <Text style={styles.sectionTitle}>Goals Today</Text>

            {pendingGoals.length === 0 && doneTodayGoals.length === 0 ? (
              <View style={styles.emptyTabCard}>
                <Ionicons name="flag-outline" size={32} color={theme.colors.primary} />
                <Text style={styles.emptyTabTitle}>No goals active today in {selectedTab}</Text>
                {onOpenAddGoal && (
                  <TouchableOpacity
                    style={styles.emptyTabAddBtn}
                    onPress={() => onOpenAddGoal(selectedTab !== 'All' ? (selectedTab as GoalCategory) : undefined)}
                  >
                    <Text style={styles.emptyTabAddBtnText}>+ Add Goal in {selectedTab}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              pendingGoals.map(({ goal, progress, tasks }) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  progress={progress}
                  tasks={tasks}
                  compact={true}
                  initiallyCollapsed={true}
                  todayLogDone={todayLog.done}
                  todayLogSkipped={todayLog.skipped}
                  onLogValue={() => {
                    setLogValueModalGoal(goal);
                    setLogValueInput(String(progress.current || ''));
                  }}
                  onApplyPaceSuggestion={onApplyPaceSuggestion}
                  onSkipTask={handleSkipTask}
                  onToggleTask={(taskId, plannedAmt) => {
                    if (typeof plannedAmt === 'number') {
                      setAmountTaskModal({ taskId, title: 'Log Actual Amount', defaultVal: plannedAmt });
                      setAmountInput(String(plannedAmt));
                    } else {
                      onToggleTask(taskId);
                    }
                  }}
                />
              ))
            )}

            {/* DONE TODAY COLLAPSED GROUP */}
            {doneTodayGoals.length > 0 && (
              <View style={styles.doneGroupContainer}>
                <TouchableOpacity
                  style={styles.doneGroupHeader}
                  onPress={() => setShowDoneTodayGroup(!showDoneTodayGroup)}
                >
                  <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
                  <Text style={styles.doneGroupTitle}>Done today ({doneTodayGoals.length})</Text>
                  <Ionicons
                    name={showDoneTodayGroup ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>

                {showDoneTodayGroup &&
                  doneTodayGoals.map(({ goal, progress, tasks }) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      progress={progress}
                      tasks={tasks}
                      compact={true}
                      initiallyCollapsed={true}
                      todayLogDone={todayLog.done}
                      todayLogSkipped={todayLog.skipped}
                      onLogValue={() => {
                        setLogValueModalGoal(goal);
                        setLogValueInput(String(progress.current || ''));
                      }}
                      onApplyPaceSuggestion={onApplyPaceSuggestion}
                      onSkipTask={handleSkipTask}
                      onToggleTask={(taskId, plannedAmt) => onToggleTask(taskId, undefined, plannedAmt)}
                    />
                  ))}
              </View>
            )}
          </View>
        )}

        {/* COLLAPSED EVENING NOTE */}
        <TouchableOpacity style={styles.noteToggleHeader} onPress={() => setShowNote(!showNote)}>
          <Ionicons name="journal-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.noteToggleTitle}>Evening Note & Mood</Text>
          <Ionicons name={showNote ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.textMuted} />
        </TouchableOpacity>

        {showNote && (
          <View style={styles.noteCard}>
            <Text style={styles.noteLabel}>How was your day? (1-5)</Text>
            <View style={styles.moodRow}>
              {[1, 2, 3, 4, 5].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.moodBtn, moodRating === m && styles.moodBtnActive]}
                  onPress={() => setMoodRating(m)}
                >
                  <Text style={[styles.moodText, moodRating === m && styles.moodTextActive]}>
                    {m === 1 ? '😞' : m === 2 ? '😐' : m === 3 ? '🙂' : m === 4 ? '😊' : '🔥'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.noteInput}
              multiline
              numberOfLines={3}
              placeholder="Reflections, wins, or notes for today..."
              placeholderTextColor={theme.colors.textMuted}
              value={noteText}
              onChangeText={setNoteText}
              onBlur={handleSaveEveningNote}
            />
          </View>
        )}
      </ScrollView>

      {/* BOTTOM SHEET: Log Goal Value */}
      {Boolean(logValueModalGoal) && (
        <BottomSheet
          visible={Boolean(logValueModalGoal)}
          onClose={() => setLogValueModalGoal(null)}
          title={`Log ${logValueModalGoal?.title}`}
          subtitle={`Enter today's value in ${logValueModalGoal?.unit || 'units'}`}
          footer={
            <View style={styles.bottomSheetFooter}>
              <TouchableOpacity style={styles.saveSheetBtn} onPress={handleSaveLogValue}>
                <Text style={styles.saveSheetBtnText}>Save Value</Text>
              </TouchableOpacity>
            </View>
          }
        >
          <View style={{ padding: 18 }}>
            <TextInput
              style={styles.sheetInput}
              keyboardType="numeric"
              value={logValueInput}
              onChangeText={setLogValueInput}
              autoFocus
              placeholder="0.0"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
        </BottomSheet>
      )}

      {/* BOTTOM SHEET: Log Actual Amount Task */}
      {Boolean(amountTaskModal) && (
        <BottomSheet
          visible={Boolean(amountTaskModal)}
          onClose={() => setAmountTaskModal(null)}
          title={amountTaskModal?.title || 'Log Amount'}
          subtitle="Enter actual amount completed today"
          footer={
            <View style={styles.bottomSheetFooter}>
              <TouchableOpacity style={styles.saveSheetBtn} onPress={handleSaveAmountTaskActual}>
                <Text style={styles.saveSheetBtnText}>Log Amount</Text>
              </TouchableOpacity>
            </View>
          }
        >
          <View style={{ padding: 18 }}>
            <TextInput
              style={styles.sheetInput}
              keyboardType="numeric"
              value={amountInput}
              onChangeText={setAmountInput}
              autoFocus
              placeholder="0.0"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>
        </BottomSheet>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: { flex: 1, backgroundColor: theme.colors.background },
  stickyTabBar: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 8,
  },
  tabScrollContent: { paddingHorizontal: 16, gap: 8 },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  tabChipText: { ...theme.typography.caption, color: theme.colors.textSecondary, fontWeight: '600' },
  tabChipTextActive: { color: '#FFF', fontWeight: '700' },
  container: { padding: 16 },
  compactBarCard: {
    backgroundColor: theme.colors.cardBackground,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 14,
  },
  compactBarInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  compactBarTitle: { ...theme.typography.titleSmall, color: theme.colors.text, fontWeight: '700' },
  compactBarSubtitle: { ...theme.typography.caption, color: theme.colors.textSecondary, fontWeight: '600' },
  compactProgressTrack: { height: 6, backgroundColor: theme.colors.border, borderRadius: 3, overflow: 'hidden' },
  compactProgressFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 3 },
  sectionContainer: { marginBottom: 12 },
  sectionTitle: { ...theme.typography.titleSmall, color: theme.colors.text, fontWeight: '700', marginBottom: 8 },
  quickAddRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  quickAddInput: {
    flex: 1,
    backgroundColor: theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: theme.colors.text,
    ...theme.typography.bodySmall,
  },
  quickAddBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  standaloneTaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: theme.colors.cardBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 6,
  },
  standaloneTaskItemSkipped: { opacity: 0.5 },
  taskTouchArea: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  taskTitle: { ...theme.typography.bodySmall, color: theme.colors.text, fontWeight: '500' },
  taskTitleDone: { textDecorationLine: 'line-through', color: theme.colors.textMuted },
  taskTitleSkipped: { fontStyle: 'italic', color: theme.colors.textMuted },
  taskRepeatBadge: { ...theme.typography.caption, color: theme.colors.textSecondary },
  taskActionBtns: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  emptyText: { ...theme.typography.bodySmall, color: theme.colors.textMuted, fontStyle: 'italic', marginBottom: 8 },
  emptyTabCard: {
    backgroundColor: theme.colors.cardBackground,
    padding: 24,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  emptyTabTitle: { ...theme.typography.bodyMedium, color: theme.colors.textSecondary, fontWeight: '500' },
  emptyTabAddBtn: { backgroundColor: theme.colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  emptyTabAddBtnText: { ...theme.typography.caption, color: '#FFF', fontWeight: '700' },
  doneGroupContainer: { marginTop: 12 },
  doneGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surfaceSecondary,
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  doneGroupTitle: { ...theme.typography.caption, color: theme.colors.text, fontWeight: '700', flex: 1 },
  noteToggleHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingVertical: 10 },
  noteToggleTitle: { ...theme.typography.titleSmall, color: theme.colors.text, flex: 1, fontWeight: '600' },
  noteCard: { backgroundColor: theme.colors.cardBackground, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, marginTop: 6 },
  noteLabel: { ...theme.typography.bodySmall, color: theme.colors.textSecondary },
  moodRow: { flexDirection: 'row', gap: 12, marginVertical: 8 },
  moodBtn: { padding: 8, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background },
  moodBtnActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  moodText: { fontSize: 20 },
  moodTextActive: { transform: [{ scale: 1.1 }] },
  noteInput: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, padding: 10, color: theme.colors.text, ...theme.typography.bodySmall, textAlignVertical: 'top' },
  sheetInput: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, padding: 12, ...theme.typography.titleMedium, color: theme.colors.text },
  bottomSheetFooter: { flexDirection: 'row', justifyContent: 'flex-end' },
  saveSheetBtn: { backgroundColor: theme.colors.primary, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, width: '100%', alignItems: 'center' },
  saveSheetBtnText: { ...theme.typography.button, color: '#FFF', fontWeight: '700' },
});
