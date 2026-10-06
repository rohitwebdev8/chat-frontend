/**
 * GoalsView.tsx — Unified Goal Tracking, Live Creation Flow & Goal Details.
 *
 * Features:
 *  1. Create Goal Flow:
 *     - Pick Goal Type: Target / Cumulative / Habit.
 *     - Pick Metric from dynamic registry (or "+ New Metric").
 *     - Start value auto-prefilled from latest log, Target value.
 *     - Period chips (7d, 30d, This month, Custom) with calendar picker.
 *     - Live Pacing Preview (e.g. "Need -0.17 kg/day" or "Need 10,000 steps/day · On track").
 *     - Toggle "Create a daily task for this" (default ON).
 *     - Indian number formatting (en-IN, lakhs, ₹).
 *  2. Goal Cards:
 *     - Dual progress bars: Value Progress (%) vs Timeline Progress (%).
 *     - Status badge (Ahead, On track, Behind, Completed).
 *     - Pacing subtitle: "Needs X/day vs your pace Y/day".
 *  3. Goal Detail Modal:
 *     - Mini chart / pacing breakdown (actual vs ideal pace).
 *     - Quick "Log Value" button writing to today's log.
 *     - History of recent logged values.
 *     - Linked tasks & Edit/Delete actions.
 */

import React, { useState, useMemo, useEffect } from 'react';
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
import { Goal, GoalCategory, GoalType, GoalCalculatedProgress } from '@/types/goals';
import { MetricDefinition } from '@/types/metrics';
import { Task } from '@/types/tasks';
import { DailyLog } from '@/types/logs';
import { ProgressBar } from '@/components/ui/Primitives';
import { DatePickerModal, formatDisplayDate } from '@/components/ui/DatePickerModal';
import { ManageMetricsModal } from '@/components/metrics/ManageMetricsModal';
import { computeGoalProgress, formatIndianNumber } from '@/lib/goals/computeGoalProgress';
import theme from '@/constants/theme';
import { toastService } from '@/services/toastService';

interface Props {
  goals: Goal[];
  goalProgressList: { goal: Goal; progress: GoalCalculatedProgress; metric?: MetricDefinition }[];
  metrics: MetricDefinition[];
  tasks: Task[];
  allLogs: Record<string, DailyLog>;
  todayLog: DailyLog;
  onSaveGoal: (goal: Goal) => Promise<void>;
  onDeleteGoal: (id: string) => Promise<void>;
  onSaveMetric: (metric: MetricDefinition) => Promise<void>;
  onDeleteMetric: (id: string) => Promise<void>;
  onUpdateTodayLog: (log: Partial<DailyLog>) => Promise<void>;
  scrollPaddingBottom?: number;
}

const CATEGORIES: GoalCategory[] = [
  'Health',
  'Fitness',
  'Diet',
  'Study',
  'Career',
  'Finance',
  'Personal',
  'Custom',
];

type PeriodOption = '7d' | '30d' | 'this_month' | 'custom';

export const GoalsView: React.FC<Props> = ({
  goals,
  goalProgressList,
  metrics,
  tasks,
  allLogs,
  todayLog,
  onSaveGoal,
  onDeleteGoal,
  onSaveMetric,
  onDeleteMetric,
  onUpdateTodayLog,
  scrollPaddingBottom = 100,
}) => {
  const insets = useSafeAreaInsets();
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [showManageMetrics, setShowManageMetrics] = useState(false);

  // Goal Form Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Form Fields
  const [type, setType] = useState<GoalType>('target');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<GoalCategory>('Health');
  const [metricId, setMetricId] = useState<string>('weight');
  const [startVal, setStartVal] = useState('70');
  const [targetVal, setTargetVal] = useState('65');
  const [periodOption, setPeriodOption] = useState<PeriodOption>('30d');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [createDailyTask, setCreateDailyTask] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calendar Pickers
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Detail Modal State
  const [selectedGoalDetail, setSelectedGoalDetail] = useState<{ goal: Goal; progress: GoalCalculatedProgress; metric?: MetricDefinition } | null>(null);
  const [logValueInput, setLogValueInput] = useState('');

  // Selected Metric in Form
  const selectedMetric = useMemo(() => {
    return metrics.find((m) => m.id === metricId) || metrics[0];
  }, [metrics, metricId]);

  // Handle Opening Create Modal
  const handleOpenCreate = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const defaultEnd = new Date();
    defaultEnd.setDate(defaultEnd.getDate() + 30);
    const endStr = defaultEnd.toISOString().split('T')[0];

    const initialMetric = metrics[0] || { id: 'weight', unit: 'kg' };
    const latestLogged = todayLog?.metrics?.[initialMetric.id] ?? 70;

    setEditingGoal(null);
    setType('target');
    setTitle('');
    setCategory('Health');
    setMetricId(initialMetric.id);
    setStartVal(String(latestLogged));
    setTargetVal(String(Number(latestLogged) - 5));
    setPeriodOption('30d');
    setStartDate(todayStr);
    setEndDate(endStr);
    setCreateDailyTask(true);
    setErrors({});
    setShowModal(true);
  };

  // Handle Opening Edit Modal
  const handleOpenEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setType((goal.type as GoalType) || 'target');
    setTitle(goal.title);
    setCategory(goal.category);
    setMetricId(goal.metricId || metrics[0]?.id || 'weight');
    setStartVal(String(goal.startValue));
    setTargetVal(String(goal.targetValue));
    setStartDate(goal.startDate);
    setEndDate(goal.endDate || goal.deadline || goal.startDate);
    setPeriodOption('custom');
    setCreateDailyTask(!!goal.createDailyTask);
    setErrors({});
    setSelectedGoalDetail(null);
    setShowModal(true);
  };

  // Auto-Prefill Start Value when Metric or Type Changes
  const handleSelectMetric = (mId: string) => {
    setMetricId(mId);
    const m = metrics.find((item) => item.id === mId);
    if (!m) return;

    if (type === 'target') {
      const latestVal = todayLog?.metrics?.[mId];
      if (typeof latestVal === 'number' && latestVal > 0) {
        setStartVal(String(latestVal));
        const delta = m.direction === 'decrease' ? -5 : 5;
        setTargetVal(String(Math.max(0, latestVal + delta)));
      } else if (m.id === 'weight') {
        setStartVal('70');
        setTargetVal('65');
      }
    } else if (type === 'cumulative') {
      setStartVal('0');
      if (m.id === 'steps') setTargetVal('300000');
      else if (m.id === 'savings') setTargetVal('50000');
      else setTargetVal('100');
    }
  };

  // Apply Period Preset
  const handleSelectPeriod = (opt: PeriodOption) => {
    setPeriodOption(opt);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    setStartDate(todayStr);

    if (opt === '7d') {
      const d = new Date(today);
      d.setDate(d.getDate() + 7);
      setEndDate(d.toISOString().split('T')[0]);
    } else if (opt === '30d') {
      const d = new Date(today);
      d.setDate(d.getDate() + 30);
      setEndDate(d.toISOString().split('T')[0]);
    } else if (opt === 'this_month') {
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setEndDate(lastDay.toISOString().split('T')[0]);
    }
  };

  // Live Preview Calculation in Form
  const livePreviewProgress = useMemo(() => {
    const sVal = parseFloat(startVal) || 0;
    const tVal = parseFloat(targetVal) || 0;
    const tempGoal: Goal = {
      id: 'temp_preview',
      title: title || 'New Goal',
      category,
      type,
      metricId,
      startValue: sVal,
      targetValue: tVal,
      startDate,
      endDate,
      status: 'active',
      createdAt: startDate,
      updatedAt: startDate,
    };
    return computeGoalProgress(tempGoal, selectedMetric, allLogs, startDate);
  }, [title, category, type, metricId, startVal, targetVal, startDate, endDate, selectedMetric, allLogs]);

  // Form Validation
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!title.trim() || title.trim().length < 2) {
      errs.title = 'Title must be at least 2 characters.';
    }

    const startNum = parseFloat(startVal);
    const targetNum = parseFloat(targetVal);

    if (isNaN(startNum)) errs.startVal = 'Start value must be a number.';
    if (isNaN(targetNum)) errs.targetVal = 'Target value must be a number.';

    if (!isNaN(startNum) && !isNaN(targetNum)) {
      if (type === 'target' && startNum === targetNum) {
        errs.targetVal = 'Target value cannot equal start value.';
      }
      if (type === 'cumulative' && targetNum <= 0) {
        errs.targetVal = 'Target must be greater than 0.';
      }
    }

    if (!endDate || endDate <= startDate) {
      errs.endDate = 'End date must be after start date.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Save Goal Handler
  const handleSaveForm = async () => {
    if (!validateForm()) {
      toastService.show('Please fix form errors before saving.', 'error');
      return;
    }

    const goalToSave: Goal = {
      id: editingGoal ? editingGoal.id : `goal-${Date.now()}`,
      title: title.trim(),
      category,
      type,
      metricId,
      startValue: parseFloat(startVal),
      targetValue: parseFloat(targetVal),
      startDate,
      endDate,
      deadline: endDate,
      createDailyTask,
      status: editingGoal ? editingGoal.status : 'active',
      createdAt: editingGoal ? editingGoal.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onSaveGoal(goalToSave);
    setShowModal(false);
  };

  // Delete Goal Handler
  const handleDeleteConfirm = (goal: Goal) => {
    Alert.alert('Delete Goal', `Delete "${goal.title}"? Linked tasks will be unlinked.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await onDeleteGoal(goal.id);
          if (editingGoal?.id === goal.id) setShowModal(false);
          if (selectedGoalDetail?.goal.id === goal.id) setSelectedGoalDetail(null);
        },
      },
    ]);
  };

  // Quick Log Metric from Detail Modal
  const handleQuickLogDetail = async () => {
    if (!selectedGoalDetail || !selectedGoalDetail.metric) return;
    const num = parseFloat(logValueInput);
    if (isNaN(num)) return;

    const mId = selectedGoalDetail.metric.id;
    const current = todayLog?.metrics?.[mId] ?? 0;
    const next = selectedGoalDetail.metric.aggregation === 'sum' ? current + num : num;

    await onUpdateTodayLog({
      metrics: {
        ...(todayLog.metrics || {}),
        [mId]: Math.max(0, next),
      },
    });

    setLogValueInput('');
    toastService.show(`Logged ${num} ${selectedGoalDetail.metric.unit} for today!`, 'success');
  };

  // Filtered Goals
  const filteredList = useMemo(() => {
    if (filterCategory === 'All') return goalProgressList;
    return goalProgressList.filter(({ goal }) => goal.category === filterCategory);
  }, [goalProgressList, filterCategory]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Action Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.manageMetricsBtn} onPress={() => setShowManageMetrics(true)}>
            <Ionicons name="options-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.manageMetricsText}>Manage Metrics ({metrics.length})</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.createGoalBtn} onPress={handleOpenCreate}>
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={styles.createGoalBtnText}>New Goal</Text>
          </TouchableOpacity>
        </View>

        {/* Category Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
          {['All', ...CATEGORIES].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, filterCategory === cat && styles.catChipActive]}
              onPress={() => setFilterCategory(cat)}
            >
              <Text style={[styles.catChipText, filterCategory === cat && styles.catChipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Goals List */}
        {filteredList.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="flag-outline" size={40} color={theme.colors.textSecondary} />
            <Text style={styles.emptyTitle}>No goals in this category</Text>
            <Text style={styles.emptySub}>Tap "+ New Goal" to set a milestone with live pacing.</Text>
          </View>
        ) : (
          filteredList.map(({ goal, progress, metric }) => {
            const unit = metric?.unit || '';
            const isCurrency = unit === '₹';
            const formattedCurrent = formatIndianNumber(progress.current, { isCurrency, unit: !isCurrency ? unit : undefined });
            const formattedTarget = formatIndianNumber(goal.targetValue, { isCurrency, unit: !isCurrency ? unit : undefined });

            return (
              <TouchableOpacity
                key={goal.id}
                style={styles.goalCard}
                onPress={() => setSelectedGoalDetail({ goal, progress, metric })}
                activeOpacity={0.85}
              >
                {/* Header: Title & Status Badge */}
                <View style={styles.goalCardHeader}>
                  <View style={styles.goalHeaderLeft}>
                    <Text style={styles.goalIcon}>{metric?.icon || '🎯'}</Text>
                    <View>
                      <Text style={styles.goalTitle}>{goal.title}</Text>
                      <Text style={styles.goalCategory}>
                        {(goal.category || 'General')} · {(goal.type || 'target').toUpperCase()} · Due {formatDisplayDate(goal.endDate || goal.deadline || goal.startDate)}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: `${progress.statusColor}18` }]}>
                    <Text style={[styles.statusBadgeText, { color: progress.statusColor }]}>
                      {progress.status}
                    </Text>
                  </View>
                </View>

                {/* Main Progress Row */}
                <View style={styles.progressRow}>
                  <Text style={styles.currentValText}>{formattedCurrent}</Text>
                  <Text style={styles.targetValText}>Target: {formattedTarget}</Text>
                </View>

                {/* Dual Progress Bars: Value vs Timeline */}
                <View style={styles.dualBarsContainer}>
                  {/* Value Progress Bar */}
                  <View style={styles.barItem}>
                    <View style={styles.barLabelRow}>
                      <Text style={styles.barLabel}>Value Progress</Text>
                      <Text style={[styles.barVal, { color: progress.statusColor }]}>{progress.valuePct}%</Text>
                    </View>
                    <ProgressBar percent={progress.valuePct} height={8} color={progress.statusColor} />
                  </View>

                  {/* Timeline Progress Bar */}
                  <View style={styles.barItem}>
                    <View style={styles.barLabelRow}>
                      <Text style={styles.barLabel}>Timeline Elapsed</Text>
                      <Text style={styles.barVal}>{progress.timePct}%</Text>
                    </View>
                    <ProgressBar percent={progress.timePct} height={5} color="#94A3B8" />
                  </View>
                </View>

                {/* Pacing Info Line */}
                <View style={styles.pacingFooter}>
                  <Ionicons name="speedometer-outline" size={14} color={progress.statusColor} />
                  <Text style={styles.pacingText}>{progress.message}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* ── CREATE / EDIT GOAL MODAL ────────────────────────────────────── */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingGoal ? 'Edit Goal' : 'Create New Goal'}</Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Ionicons name="close-circle" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* 1. Goal Type Picker */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Goal Type</Text>
                <View style={styles.pillsRow}>
                  {(['target', 'cumulative', 'habit'] as GoalType[]).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.pill, type === t && styles.pillActive]}
                      onPress={() => {
                        setType(t);
                        handleSelectMetric(metricId);
                      }}
                    >
                      <Text style={[styles.pillText, type === t && styles.pillTextActive]}>
                        {t === 'target' ? '🎯 Target Value' : t === 'cumulative' ? '📈 Cumulative Sum' : '🔁 Habit / Count'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 2. Title & Category */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Goal Title *</Text>
                <TextInput
                  style={[styles.input, !!errors.title && styles.inputError]}
                  placeholder="e.g. Weight 70→65 kg, Run 3,00,000 steps"
                  placeholderTextColor="#94A3B8"
                  value={title}
                  onChangeText={(t) => { setTitle(t); setErrors((prev) => ({ ...prev, title: '' })); }}
                />
                {errors.title ? <Text style={styles.errorText}>{errors.title}</Text> : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.pill, category === cat && styles.pillActive]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text style={[styles.pillText, category === cat && styles.pillTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* 3. Pick Metric */}
              <View style={styles.fieldGroup}>
                <View style={styles.metricHeaderRow}>
                  <Text style={styles.fieldLabel}>Linked Metric</Text>
                  <TouchableOpacity onPress={() => setShowManageMetrics(true)}>
                    <Text style={styles.newMetricLink}>+ Add New Metric</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow}>
                  {metrics.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.pill, metricId === m.id && styles.pillActive]}
                      onPress={() => handleSelectMetric(m.id)}
                    >
                      <Text style={[styles.pillText, metricId === m.id && styles.pillTextActive]}>
                        {m.icon || '🎯'} {m.name} ({m.unit})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* 4. Start Value & Target Value */}
              <View style={styles.rowTwo}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Start Value ({selectedMetric?.unit || 'units'})</Text>
                  <TextInput
                    style={[styles.input, !!errors.startVal && styles.inputError]}
                    keyboardType="numeric"
                    placeholder="70"
                    placeholderTextColor="#94A3B8"
                    value={startVal}
                    onChangeText={(t) => { setStartVal(t); setErrors((prev) => ({ ...prev, startVal: '' })); }}
                  />
                  {errors.startVal ? <Text style={styles.errorText}>{errors.startVal}</Text> : null}
                </View>

                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Target Value ({selectedMetric?.unit || 'units'}) *</Text>
                  <TextInput
                    style={[styles.input, !!errors.targetVal && styles.inputError]}
                    keyboardType="numeric"
                    placeholder="65"
                    placeholderTextColor="#94A3B8"
                    value={targetVal}
                    onChangeText={(t) => { setTargetVal(t); setErrors((prev) => ({ ...prev, targetVal: '' })); }}
                  />
                  {errors.targetVal ? <Text style={styles.errorText}>{errors.targetVal}</Text> : null}
                </View>
              </View>

              {/* 5. Period Chips & Dates */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Target Timeline</Text>
                <View style={styles.pillsRow}>
                  {(['7d', '30d', 'this_month', 'custom'] as PeriodOption[]).map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.pill, periodOption === opt && styles.pillActive]}
                      onPress={() => handleSelectPeriod(opt)}
                    >
                      <Text style={[styles.pillText, periodOption === opt && styles.pillTextActive]}>
                        {opt === '7d' ? '7 Days' : opt === '30d' ? '30 Days' : opt === 'this_month' ? 'This Month' : 'Custom'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Start & End Date Selection */}
                <View style={styles.rowTwo}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Start Date</Text>
                    <TouchableOpacity
                      style={styles.datePickerBtn}
                      onPress={() => setShowStartDatePicker(true)}
                    >
                      <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
                      <Text style={styles.datePickerBtnText}>{formatDisplayDate(startDate)}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>End Date *</Text>
                    <TouchableOpacity
                      style={[styles.datePickerBtn, !!errors.endDate && styles.inputError]}
                      onPress={() => setShowEndDatePicker(true)}
                    >
                      <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
                      <Text style={styles.datePickerBtnText}>{formatDisplayDate(endDate)}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {errors.endDate ? <Text style={styles.errorText}>{errors.endDate}</Text> : null}
              </View>

              {/* 6. Live Pacing Preview Banner */}
              <View style={styles.livePreviewCard}>
                <View style={styles.livePreviewHeader}>
                  <Ionicons name="sparkles" size={16} color={theme.colors.primary} />
                  <Text style={styles.livePreviewTitle}>LIVE PACING PREVIEW</Text>
                </View>
                <Text style={styles.livePreviewMessage}>{livePreviewProgress.message}</Text>
                <Text style={styles.livePreviewSub}>
                  Timeline: {livePreviewProgress.timePct}% · Daily required rate: {livePreviewProgress.requiredPerDay} {selectedMetric?.unit}/day
                </Text>
              </View>

              {/* 7. Create Daily Task Toggle */}
              <TouchableOpacity
                style={styles.taskToggleRow}
                onPress={() => setCreateDailyTask(!createDailyTask)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={createDailyTask ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={createDailyTask ? theme.colors.primary : theme.colors.textSecondary}
                />
                <Text style={styles.taskToggleText}>Create a daily task linked to this goal (default on)</Text>
              </TouchableOpacity>

              {/* Actions */}
              <View style={styles.modalActions}>
                {editingGoal && (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteConfirm(editingGoal)}
                  >
                    <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveForm}>
                  <Text style={styles.saveBtnText}>{editingGoal ? 'Save Goal' : 'Create Goal'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── GOAL DETAIL MODAL ───────────────────────────────────────────── */}
      {selectedGoalDetail && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setSelectedGoalDetail(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.detailCard}>
              <View style={styles.modalHeader}>
                <View style={styles.goalHeaderLeft}>
                  <Text style={styles.goalIcon}>{selectedGoalDetail.metric?.icon || '🎯'}</Text>
                  <View>
                    <Text style={styles.modalTitle}>{selectedGoalDetail.goal.title}</Text>
                    <Text style={styles.goalCategory}>
                      {(selectedGoalDetail.goal.category || 'General')} · {(selectedGoalDetail.goal.type || 'target').toUpperCase()}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setSelectedGoalDetail(null)}>
                  <Ionicons name="close-circle" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
                {/* Status & Pacing Box */}
                <View style={styles.detailPacingBox}>
                  <View style={styles.pacingHeaderRow}>
                    <Text style={styles.pacingHighlight}>{selectedGoalDetail.progress.message}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: `${selectedGoalDetail.progress.statusColor}20` }]}>
                      <Text style={[styles.statusBadgeText, { color: selectedGoalDetail.progress.statusColor }]}>
                        {selectedGoalDetail.progress.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.pacingSub}>
                    Required: {selectedGoalDetail.progress.requiredPerDay} {selectedGoalDetail.metric?.unit}/day · Actual Pace: {selectedGoalDetail.progress.actualPace} {selectedGoalDetail.metric?.unit}/day
                  </Text>
                </View>

                {/* Progress Details */}
                <View style={styles.detailStatsGrid}>
                  <View style={styles.detailStatItem}>
                    <Text style={styles.detailStatLabel}>Current</Text>
                    <Text style={styles.detailStatVal}>
                      {formatIndianNumber(selectedGoalDetail.progress.current, { unit: selectedGoalDetail.metric?.unit })}
                    </Text>
                  </View>
                  <View style={styles.detailStatItem}>
                    <Text style={styles.detailStatLabel}>Target</Text>
                    <Text style={styles.detailStatVal}>
                      {formatIndianNumber(selectedGoalDetail.goal.targetValue, { unit: selectedGoalDetail.metric?.unit })}
                    </Text>
                  </View>
                  <View style={styles.detailStatItem}>
                    <Text style={styles.detailStatLabel}>Projected</Text>
                    <Text style={styles.detailStatVal}>
                      {formatIndianNumber(selectedGoalDetail.progress.projected, { unit: selectedGoalDetail.metric?.unit })}
                    </Text>
                  </View>
                </View>

                {/* Quick Log Value directly into Today's Log */}
                {selectedGoalDetail.metric && (
                  <View style={styles.quickLogSection}>
                    <Text style={styles.fieldLabel}>Quick Log Value for Today ({selectedGoalDetail.metric.unit})</Text>
                    <View style={styles.quickLogRow}>
                      <TextInput
                        style={styles.quickLogInput}
                        keyboardType="numeric"
                        placeholder={`e.g. 10 (${selectedGoalDetail.metric.unit})`}
                        placeholderTextColor="#94A3B8"
                        value={logValueInput}
                        onChangeText={setLogValueInput}
                      />
                      <TouchableOpacity style={styles.quickLogSubmit} onPress={handleQuickLogDetail}>
                        <Text style={styles.quickLogSubmitText}>+ Log Value</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Linked Tasks */}
                <View style={styles.linkedTasksSection}>
                  <Text style={styles.fieldLabel}>Linked Tasks</Text>
                  {tasks.filter((t) => t.goalId === selectedGoalDetail.goal.id).length === 0 ? (
                    <Text style={styles.emptySub}>No tasks linked directly to this goal.</Text>
                  ) : (
                    tasks.filter((t) => t.goalId === selectedGoalDetail.goal.id).map((t) => (
                      <View key={t.id} style={styles.linkedTaskRow}>
                        <Ionicons name="checkbox-outline" size={16} color={theme.colors.primary} />
                        <Text style={styles.linkedTaskTitle}>{t.title}</Text>
                      </View>
                    ))
                  )}
                </View>

                {/* Detail Actions: Edit / Delete */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteConfirm(selectedGoalDetail.goal)}
                  >
                    <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={() => handleOpenEdit(selectedGoalDetail.goal)}
                  >
                    <Ionicons name="pencil" size={16} color="#FFF" />
                    <Text style={styles.saveBtnText}>Edit Goal</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Date Pickers */}
      <DatePickerModal
        visible={showStartDatePicker}
        value={startDate}
        onConfirm={(d) => { if (d) setStartDate(d); }}
        onClose={() => setShowStartDatePicker(false)}
      />

      <DatePickerModal
        visible={showEndDatePicker}
        value={endDate}
        minDate={startDate}
        onConfirm={(d) => { if (d) setEndDate(d); }}
        onClose={() => setShowEndDatePicker(false)}
      />

      {/* Manage Metrics Modal */}
      <ManageMetricsModal
        visible={showManageMetrics}
        metrics={metrics}
        onSaveMetric={onSaveMetric}
        onDeleteMetric={onDeleteMetric}
        onClose={() => setShowManageMetrics(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, gap: 14 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  manageMetricsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  manageMetricsText: { ...theme.typography.captionSmall, fontWeight: '700', color: theme.colors.primary },
  createGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  createGoalBtnText: { ...theme.typography.buttonSmall, color: '#FFF', fontWeight: '700' },
  categoryRow: { marginBottom: 2 },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 6,
  },
  catChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  catChipText: { ...theme.typography.captionSmall, color: theme.colors.textSecondary, fontWeight: '600' },
  catChipTextActive: { color: '#FFF', fontWeight: '700' },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyTitle: { ...theme.typography.subtitle, fontWeight: '700', color: theme.colors.textPrimary },
  emptySub: { ...theme.typography.caption, color: theme.colors.textSecondary, textAlign: 'center' },

  // Goal Card Styles
  goalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.small,
  },
  goalCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  goalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  goalIcon: { fontSize: 24 },
  goalTitle: { ...theme.typography.bodySmall, fontWeight: '800', color: theme.colors.textPrimary },
  goalCategory: { ...theme.typography.captionSmall, color: theme.colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { ...theme.typography.captionSmall, fontWeight: '800' },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  currentValText: { fontSize: 20, fontWeight: '800', color: theme.colors.textPrimary },
  targetValText: { ...theme.typography.caption, fontWeight: '600', color: theme.colors.textSecondary },
  dualBarsContainer: { gap: 8 },
  barItem: { gap: 3 },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  barLabel: { ...theme.typography.captionSmall, color: theme.colors.textSecondary },
  barVal: { ...theme.typography.captionSmall, fontWeight: '700' },
  pacingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  pacingText: { ...theme.typography.captionSmall, fontWeight: '700', color: theme.colors.textPrimary },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalScroll: { flexGrow: 1, justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 14,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { ...theme.typography.subtitle, fontWeight: '800', color: theme.colors.textPrimary },
  fieldGroup: { gap: 6 },
  fieldLabel: { ...theme.typography.captionSmall, fontWeight: '700', color: theme.colors.textSecondary },
  metricHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  newMetricLink: { ...theme.typography.captionSmall, color: theme.colors.primary, fontWeight: '700' },
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
  pillsRow: { flexDirection: 'row', gap: 6 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  pillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pillText: { ...theme.typography.captionSmall, color: theme.colors.textSecondary, fontWeight: '600' },
  pillTextActive: { color: '#FFF', fontWeight: '700' },
  rowTwo: { flexDirection: 'row', gap: 10 },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  datePickerBtnText: { ...theme.typography.bodySmall, color: theme.colors.textPrimary },
  livePreviewCard: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 12,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  livePreviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  livePreviewTitle: { fontSize: 10, fontWeight: '800', color: theme.colors.primary, letterSpacing: 0.5 },
  livePreviewMessage: { ...theme.typography.bodySmall, fontWeight: '800', color: theme.colors.primary },
  livePreviewSub: { ...theme.typography.captionSmall, color: theme.colors.textSecondary },
  taskToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  taskToggleText: { ...theme.typography.caption, color: theme.colors.textPrimary, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: theme.colors.error + '15',
    justifyContent: 'center',
  },
  deleteBtnText: { ...theme.typography.buttonSmall, color: theme.colors.error, fontWeight: '700' },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
  },
  saveBtnText: { ...theme.typography.button, color: '#FFF', fontWeight: '700' },

  // Detail Modal Styles
  detailCard: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
    gap: 14,
  },
  detailPacingBox: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pacingHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pacingHighlight: { ...theme.typography.bodySmall, fontWeight: '800', color: theme.colors.textPrimary },
  pacingSub: { ...theme.typography.captionSmall, color: theme.colors.textSecondary },
  detailStatsGrid: { flexDirection: 'row', gap: 10 },
  detailStatItem: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  detailStatLabel: { ...theme.typography.captionSmall, color: theme.colors.textSecondary },
  detailStatVal: { ...theme.typography.bodySmall, fontWeight: '800', color: theme.colors.textPrimary },
  quickLogSection: { gap: 6 },
  quickLogRow: { flexDirection: 'row', gap: 8 },
  quickLogInput: {
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
  quickLogSubmit: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    justifyContent: 'center',
  },
  quickLogSubmitText: { ...theme.typography.buttonSmall, color: '#FFF', fontWeight: '700' },
  linkedTasksSection: { gap: 6 },
  linkedTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.background,
    padding: 8,
    borderRadius: 8,
  },
  linkedTaskTitle: { ...theme.typography.bodySmall, color: theme.colors.textPrimary },
});
