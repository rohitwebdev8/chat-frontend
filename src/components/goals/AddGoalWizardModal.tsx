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
import { Goal, GoalCategory, GoalType } from '@/types/goals';
import { GoalTask, formatLocalDate } from '@/types/tasks';
import { formatIndianNumber } from '@/lib/goals/computeGoalProgress';
import { BottomSheet } from '@/components/ui/BottomSheet';
import theme from '@/constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (goal: Goal, tasks?: Partial<GoalTask>[]) => Promise<void>;
  latestLoggedWeight?: number;
}

interface TemplatePreset {
  id: string;
  category: GoalCategory;
  label: string;
  type: GoalType;
  unit: string;
  defaultTitle: string;
  defaultTarget: number;
  defaultStart?: number;
  presetTasks: Partial<GoalTask>[];
}

const TEMPLATES: TemplatePreset[] = [
  // Health
  {
    id: 'health-feel-good',
    category: 'Health',
    label: 'Daily feel-good check',
    type: 'habit',
    unit: 'days',
    defaultTitle: 'Daily Feel-Good Check',
    defaultTarget: 30,
    presetTasks: [{ title: 'Felt good today?', kind: 'check', repeat: { type: 'daily' } }],
  },
  // Fitness
  {
    id: 'fitness-weight',
    category: 'Fitness',
    label: 'Reduce weight',
    type: 'reach_number',
    unit: 'kg',
    defaultTitle: 'Reduce Weight',
    defaultStart: 70,
    defaultTarget: 65,
    presetTasks: [
      { title: '10,000 steps', kind: 'check', repeat: { type: 'daily' } },
      { title: 'Gym session', kind: 'check', repeat: { type: 'weekdays', days: [1, 2, 3, 4, 5] } },
    ],
  },
  {
    id: 'fitness-steps',
    category: 'Fitness',
    label: 'Walk X steps this month',
    type: 'total',
    unit: 'steps',
    defaultTitle: 'Walk 3,00,000 steps this month',
    defaultTarget: 300000,
    presetTasks: [{ title: '10,000 daily steps', kind: 'amount', plannedAmount: 10000, repeat: { type: 'daily' } }],
  },
  {
    id: 'fitness-gym-days',
    category: 'Fitness',
    label: 'Gym X days',
    type: 'habit',
    unit: 'days',
    defaultTitle: 'Gym 20 days',
    defaultTarget: 20,
    presetTasks: [{ title: 'Gym workout', kind: 'check', repeat: { type: 'timesPerWeek', count: 5 } }],
  },
  // Diet
  {
    id: 'diet-no-junk',
    category: 'Diet',
    label: 'No junk food / No sugar',
    type: 'habit',
    unit: 'days',
    defaultTitle: 'No Junk Food 30 Days',
    defaultTarget: 30,
    presetTasks: [{ title: 'No junk food', kind: 'check', avoidSuccess: true, repeat: { type: 'daily' } }],
  },
  {
    id: 'diet-protein',
    category: 'Diet',
    label: 'Protein per day',
    type: 'total',
    unit: 'g',
    defaultTitle: 'Protein target 120g daily',
    defaultTarget: 3600,
    presetTasks: [{ title: 'Protein intake (120g)', kind: 'amount', plannedAmount: 120, repeat: { type: 'daily' } }],
  },
  {
    id: 'diet-calories',
    category: 'Diet',
    label: 'Calories under X',
    type: 'limit',
    unit: 'kcal',
    defaultTitle: 'Calories under 2,000 kcal/day',
    defaultTarget: 2000,
    presetTasks: [{ title: 'Log daily calories', kind: 'amount', rule: 'atMost', plannedAmount: 2000, repeat: { type: 'daily' } }],
  },
  // Study
  {
    id: 'study-hours',
    category: 'Study',
    label: 'Study hours',
    type: 'total',
    unit: 'hours',
    defaultTitle: 'Study 100 hours',
    defaultTarget: 100,
    presetTasks: [{ title: 'DSA study 3.3 h', kind: 'amount', plannedAmount: 3.3, repeat: { type: 'daily' } }],
  },
  // Career
  {
    id: 'career-apps',
    category: 'Career',
    label: 'Job applications',
    type: 'total',
    unit: 'applications',
    defaultTitle: '500 Job Applications',
    defaultTarget: 500,
    presetTasks: [{ title: 'Apply 25 jobs daily', kind: 'amount', plannedAmount: 25, repeat: { type: 'daily' } }],
  },
  // Finance
  {
    id: 'finance-save',
    category: 'Finance',
    label: 'Save ₹X',
    type: 'total',
    unit: '₹',
    defaultTitle: 'Save ₹50,000',
    defaultTarget: 50000,
    presetTasks: [{ title: 'Daily savings contribution', kind: 'amount', plannedAmount: 1660, repeat: { type: 'daily' } }],
  },
  {
    id: 'finance-spend-limit',
    category: 'Finance',
    label: 'Spend under ₹X',
    type: 'limit',
    unit: '₹',
    defaultTitle: 'Spend under ₹30,000 this month',
    defaultTarget: 30000,
    presetTasks: [{ title: 'Daily expense log', kind: 'amount', rule: 'atMost', plannedAmount: 1000, repeat: { type: 'daily' } }],
  },
  // Personal
  {
    id: 'personal-wishlist',
    category: 'Personal',
    label: 'Wishlist / Trip fund',
    type: 'total',
    unit: '₹',
    defaultTitle: 'Goa Trip Savings',
    defaultTarget: 25000,
    presetTasks: [{ title: 'Weekly savings contribution', kind: 'amount', plannedAmount: 2000, repeat: { type: 'timesPerWeek', count: 1 } }],
  },
  // Custom
  {
    id: 'custom-goal',
    category: 'Custom',
    label: 'Custom Goal',
    type: 'total',
    unit: 'units',
    defaultTitle: 'My Custom Goal',
    defaultTarget: 100,
    presetTasks: [],
  },
];

const CATEGORIES: GoalCategory[] = ['Health', 'Fitness', 'Diet', 'Study', 'Career', 'Finance', 'Personal', 'Custom'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const AddGoalWizardModal: React.FC<Props> = ({ visible, onClose, onSave, latestLoggedWeight }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 State
  const [selectedCategory, setSelectedCategory] = useState<GoalCategory>('Fitness');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplatePreset>(TEMPLATES[1]);

  // Step 2 State
  const [title, setTitle] = useState(selectedTemplate.defaultTitle);
  const [goalType, setGoalType] = useState<GoalType>(selectedTemplate.type);
  const [unit, setUnit] = useState(selectedTemplate.unit);
  const [startValueStr, setStartValueStr] = useState(String(latestLoggedWeight || selectedTemplate.defaultStart || 70));
  const [targetValueStr, setTargetValueStr] = useState(String(selectedTemplate.defaultTarget));

  // Start Date Option: 'today' | 'tomorrow' | 'custom'
  const [startDateOption, setStartDateOption] = useState<'today' | 'tomorrow' | 'custom'>('today');
  const [customStartDateStr, setCustomStartDateStr] = useState(formatLocalDate(new Date()));

  // Off Days (0=Sun..6=Sat)
  const [offDays, setOffDays] = useState<number[]>([]);

  // Duration Chip
  const [durationOption, setDurationOption] = useState<'7d' | '30d' | 'this_month' | 'custom'>('30d');
  const [customDays, setCustomDays] = useState('30');

  // Step 3 State: Subtasks
  const [tasks, setTasks] = useState<Partial<GoalTask>[]>(selectedTemplate.presetTasks);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskKind, setNewTaskKind] = useState<'check' | 'amount'>('amount');
  const [newTaskAmount, setNewTaskAmount] = useState('1');
  const [newTaskWeekdays, setNewTaskWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);

  // Computed Start Date
  const computedStartDateStr = useMemo(() => {
    const today = new Date();
    if (startDateOption === 'today') return formatLocalDate(today);
    if (startDateOption === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return formatLocalDate(tomorrow);
    }
    return customStartDateStr || formatLocalDate(today);
  }, [startDateOption, customStartDateStr]);

  // Computed Duration Days
  const totalDaysCount = useMemo(() => {
    if (durationOption === '7d') return 7;
    if (durationOption === '30d') return 30;
    if (durationOption === 'this_month') {
      const start = new Date(computedStartDateStr);
      const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
      return Math.max(1, lastDay - start.getDate() + 1);
    }
    return Math.max(1, parseInt(customDays, 10) || 30);
  }, [durationOption, customDays, computedStartDateStr]);

  // Computed End Date = Start + Duration
  const computedEndDateStr = useMemo(() => {
    const [y, m, d] = computedStartDateStr.split('-').map(Number);
    const endDate = new Date(y, m - 1, d + totalDaysCount - 1);
    return formatLocalDate(endDate);
  }, [computedStartDateStr, totalDaysCount]);

  // Active Days count (excluding offDays)
  const activeDaysCount = useMemo(() => {
    const [sy, sm, sd] = computedStartDateStr.split('-').map(Number);
    const startDt = new Date(sy, sm - 1, sd);
    let count = 0;
    for (let i = 0; i < totalDaysCount; i++) {
      const cur = new Date(startDt.getTime() + i * 86400000);
      if (!offDays.includes(cur.getDay())) count++;
    }
    return Math.max(1, count);
  }, [computedStartDateStr, totalDaysCount, offDays]);

  // Live Suggestion based on active days
  const liveDailySuggestion = useMemo(() => {
    const target = parseFloat(targetValueStr) || 0;
    if (target <= 0 || activeDaysCount <= 0) return null;

    if (goalType === 'reach_number') {
      const start = parseFloat(startValueStr) || 0;
      const diff = Math.abs(start - target);
      const perDay = (diff / activeDaysCount).toFixed(2);
      return `${diff} ${unit} in ${activeDaysCount} active days = ${perDay} ${unit}/active day`;
    }

    const perDay = (target / activeDaysCount).toFixed(1);
    const suggestedTaskAmount = Math.ceil(target / activeDaysCount);
    return {
      text: `${target} ${unit} in ${activeDaysCount} active days = ${perDay} ${unit}/day`,
      suggestedTaskTitle: `${title.slice(0, 20)} ${suggestedTaskAmount} ${unit}`,
      suggestedAmount: suggestedTaskAmount,
    };
  }, [targetValueStr, startValueStr, activeDaysCount, goalType, unit, title]);

  const handleSelectCategory = (cat: GoalCategory) => {
    setSelectedCategory(cat);
    const match = TEMPLATES.find((t) => t.category === cat) || TEMPLATES[TEMPLATES.length - 1];
    handleSelectTemplate(match);
  };

  const handleSelectTemplate = (template: TemplatePreset) => {
    setSelectedTemplate(template);
    setTitle(template.defaultTitle);
    setGoalType(template.type);
    setUnit(template.unit);
    if (template.type === 'reach_number') {
      setStartValueStr(String(latestLoggedWeight || template.defaultStart || 70));
    }
    setTargetValueStr(String(template.defaultTarget));
    setTasks(template.presetTasks);
  };

  const toggleOffDay = (dayIndex: number) => {
    setOffDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex].sort((a, b) => a - b)
    );
  };

  const handleOneTapAcceptSuggestion = () => {
    if (!liveDailySuggestion || typeof liveDailySuggestion === 'string') return;
    const allowedDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => !offDays.includes(d));
    const newTask: Partial<GoalTask> = {
      title: liveDailySuggestion.suggestedTaskTitle,
      kind: 'amount',
      plannedAmount: liveDailySuggestion.suggestedAmount,
      unit,
      repeat: { type: 'weekdays', days: allowedDays },
      active: true,
    };
    setTasks((prev) => [...prev, newTask]);
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask: Partial<GoalTask> = {
      title: newTaskTitle.trim(),
      kind: newTaskKind,
      plannedAmount: newTaskKind === 'amount' ? (parseFloat(newTaskAmount) || 1) : undefined,
      unit: newTaskKind === 'amount' ? unit : undefined,
      repeat: { type: 'weekdays', days: newTaskWeekdays },
      active: true,
    };
    setTasks((prev) => [...prev, newTask]);
    setNewTaskTitle('');
  };

  const handleRemoveTask = (index: number) => {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveGoal = async () => {
    const targetVal = parseFloat(targetValueStr);
    const startVal = parseFloat(startValueStr);

    if (isNaN(targetVal) || targetVal <= 0) {
      Alert.alert('Validation Error', 'Target value must be greater than 0.');
      return;
    }

    if (goalType === 'reach_number') {
      if (isNaN(startVal)) {
        Alert.alert('Validation Error', 'Start value is required.');
        return;
      }
      if (startVal === targetVal) {
        Alert.alert('Validation Error', 'Target value must differ from start value.');
        return;
      }
    }

    const newGoal: Goal = {
      id: `goal-${Date.now()}`,
      category: selectedCategory,
      title: title.trim() || selectedTemplate.defaultTitle,
      type: goalType,
      unit,
      startValue: goalType === 'reach_number' ? startVal : undefined,
      targetValue: targetVal,
      startDate: computedStartDateStr,
      endDate: computedEndDateStr,
      offDays: offDays.length > 0 ? offDays : undefined,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    await onSave(newGoal, tasks);
    onClose();
  };

  const availableTemplates = TEMPLATES.filter((t) => t.category === selectedCategory);

  const footer = (
    <View style={styles.footerRow}>
      {step > 1 ? (
        <TouchableOpacity style={styles.backBtn} onPress={() => setStep((s) => (s - 1) as any)}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ flex: 1 }} />
      )}

      {step < 3 ? (
        <TouchableOpacity style={styles.nextBtn} onPress={() => setStep((s) => (s + 1) as any)}>
          <Text style={styles.nextBtnText}>Next Step →</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveGoal}>
          <Text style={styles.saveBtnText}>Save Goal 🎉</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={`Add Goal (Step ${step}/3)`}
      subtitle={step === 1 ? 'Pick category & preset' : step === 2 ? 'Goal schedule & numbers' : 'Daily subtasks'}
      footer={footer}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* STEP 1: CATEGORY & PRESETS */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            {/* Category Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, selectedCategory === cat && styles.catChipActive]}
                  onPress={() => handleSelectCategory(cat)}
                >
                  <Text style={[styles.catChipText, selectedCategory === cat && styles.catChipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Template Cards */}
            <View style={styles.templateList}>
              {availableTemplates.map((tmpl) => (
                <TouchableOpacity
                  key={tmpl.id}
                  style={[styles.templateCard, selectedTemplate.id === tmpl.id && styles.templateCardActive]}
                  onPress={() => handleSelectTemplate(tmpl)}
                >
                  <View style={styles.templateHeader}>
                    <Ionicons
                      name={selectedTemplate.id === tmpl.id ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={selectedTemplate.id === tmpl.id ? theme.colors.primary : theme.colors.textMuted}
                    />
                    <Text style={styles.templateTitle}>{tmpl.label}</Text>
                  </View>
                  <Text style={styles.templateDetails}>
                    Type: {tmpl.type.replace('_', ' ')} · Target: {formatIndianNumber(tmpl.defaultTarget)} {tmpl.unit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* STEP 2: GOAL QUESTIONS & SCHEDULE */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.label}>What do you want to achieve?</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. 500 Job Applications"
              placeholderTextColor={theme.colors.textMuted}
            />

            <View style={styles.row}>
              <View style={{ flex: 2 }}>
                <Text style={styles.label}>How much in total?</Text>
                <TextInput
                  style={styles.input}
                  value={targetValueStr}
                  onChangeText={setTargetValueStr}
                  keyboardType="numeric"
                  placeholder="e.g. 500"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.label}>Unit</Text>
                <TextInput
                  style={styles.input}
                  value={unit}
                  onChangeText={setUnit}
                  placeholder="e.g. apps"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </View>

            {goalType === 'reach_number' && (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.label}>Start Value</Text>
                <TextInput
                  style={styles.input}
                  value={startValueStr}
                  onChangeText={setStartValueStr}
                  keyboardType="numeric"
                  placeholder="e.g. 70"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            )}

            {/* START DATE CHIPS */}
            <Text style={[styles.label, { marginTop: 14 }]}>Start Date</Text>
            <View style={styles.chipRow}>
              {(['today', 'tomorrow', 'custom'] as const).map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, startDateOption === opt && styles.chipActive]}
                  onPress={() => setStartDateOption(opt)}
                >
                  <Text style={[styles.chipText, startDateOption === opt && styles.chipTextActive]}>
                    {opt === 'today' ? 'Today' : opt === 'tomorrow' ? 'Tomorrow' : 'Pick Date'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {startDateOption === 'custom' && (
              <TextInput
                style={[styles.input, { marginTop: 6 }]}
                value={customStartDateStr}
                onChangeText={setCustomStartDateStr}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.colors.textMuted}
              />
            )}

            {/* DURATION CHIPS */}
            <Text style={[styles.label, { marginTop: 14 }]}>By when?</Text>
            <View style={styles.chipRow}>
              {(['7d', '30d', 'this_month', 'custom'] as const).map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, durationOption === opt && styles.chipActive]}
                  onPress={() => setDurationOption(opt)}
                >
                  <Text style={[styles.chipText, durationOption === opt && styles.chipTextActive]}>
                    {opt === '7d' ? '7 Days' : opt === '30d' ? '30 Days' : opt === 'this_month' ? 'This Month' : 'Custom'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {durationOption === 'custom' && (
              <TextInput
                style={[styles.input, { marginTop: 6 }]}
                value={customDays}
                onChangeText={setCustomDays}
                keyboardType="numeric"
                placeholder="Number of days"
                placeholderTextColor={theme.colors.textMuted}
              />
            )}

            {/* OFF DAYS (OPTIONAL) */}
            <Text style={[styles.label, { marginTop: 14 }]}>Off Days (Optional)</Text>
            <Text style={styles.hintText}>No tasks due and pace is not penalised on off days.</Text>
            <View style={styles.weekdaysRow}>
              {WEEKDAYS.map((name, idx) => {
                const isOff = offDays.includes(idx);
                return (
                  <TouchableOpacity
                    key={name}
                    style={[styles.weekdayCircle, isOff && styles.weekdayCircleOff]}
                    onPress={() => toggleOffDay(idx)}
                  >
                    <Text style={[styles.weekdayCircleText, isOff && styles.weekdayCircleTextOff]}>{name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.scheduleSummaryBox}>
              <Text style={styles.scheduleSummaryText}>
                📅 {computedStartDateStr} → {computedEndDateStr} ({activeDaysCount} active days)
              </Text>
            </View>
          </View>
        )}

        {/* STEP 3: DAILY TASKS & SUGGESTIONS */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            {/* Live Suggestion Box */}
            {liveDailySuggestion && (
              <View style={styles.suggestionBox}>
                <Ionicons name="sparkles" size={20} color={theme.colors.primary} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.suggestionText}>
                    {typeof liveDailySuggestion === 'string' ? liveDailySuggestion : liveDailySuggestion.text}
                  </Text>
                  {typeof liveDailySuggestion !== 'string' && (
                    <TouchableOpacity style={styles.acceptChip} onPress={handleOneTapAcceptSuggestion}>
                      <Text style={styles.acceptChipText}>+ Add task "{liveDailySuggestion.suggestedTaskTitle}"</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            <Text style={[styles.label, { marginTop: 14 }]}>Goal Tasks</Text>

            {tasks.length === 0 ? (
              <Text style={styles.emptyTasksText}>No tasks added yet.</Text>
            ) : (
              tasks.map((t, idx) => (
                <View key={idx} style={styles.taskRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.taskTitleText}>{t.title}</Text>
                    <Text style={styles.taskMetaText}>
                      {t.kind} {t.plannedAmount ? `(${t.plannedAmount} ${unit || ''})` : ''} {t.avoidSuccess ? '· Avoid habit' : ''}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveTask(idx)}>
                    <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
                  </TouchableOpacity>
                </View>
              ))
            )}

            {/* Custom Task Form */}
            <View style={styles.addTaskBox}>
              <Text style={styles.addTaskHeader}>+ Add goal task</Text>
              <TextInput
                style={styles.input}
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
                placeholder="Task title (e.g. Apply 25 jobs)"
                placeholderTextColor={theme.colors.textMuted}
              />
              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.kindChip, newTaskKind === 'amount' && styles.kindChipActive]}
                  onPress={() => setNewTaskKind('amount')}
                >
                  <Text style={[styles.kindChipText, newTaskKind === 'amount' && styles.kindChipTextActive]}>Amount</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.kindChip, newTaskKind === 'check' && styles.kindChipActive]}
                  onPress={() => setNewTaskKind('check')}
                >
                  <Text style={[styles.kindChipText, newTaskKind === 'check' && styles.kindChipTextActive]}>Check</Text>
                </TouchableOpacity>
              </View>

              {newTaskKind === 'amount' && (
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  value={newTaskAmount}
                  onChangeText={setNewTaskAmount}
                  keyboardType="numeric"
                  placeholder="Planned daily amount"
                  placeholderTextColor={theme.colors.textMuted}
                />
              )}

              <TouchableOpacity style={styles.addBtn} onPress={handleAddTask}>
                <Text style={styles.addBtnText}>Add Subtask</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16 },
  stepContainer: { gap: 10 },
  catScroll: { flexDirection: 'row', marginBottom: 12 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.surfaceSecondary, marginRight: 8, borderWidth: 1, borderColor: theme.colors.border },
  catChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  catChipText: { ...theme.typography.bodySmall, color: theme.colors.textSecondary },
  catChipTextActive: { color: '#FFF', fontWeight: '600' },
  templateList: { gap: 10 },
  templateCard: { padding: 14, borderRadius: 12, backgroundColor: theme.colors.cardBackground, borderWidth: 1, borderColor: theme.colors.border },
  templateCardActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  templateHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  templateTitle: { ...theme.typography.titleSmall, color: theme.colors.text, fontWeight: '600' },
  templateDetails: { ...theme.typography.bodySmall, color: theme.colors.textSecondary, marginTop: 4, marginLeft: 28 },
  label: { ...theme.typography.bodySmall, color: theme.colors.text, fontWeight: '700', marginTop: 4 },
  input: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: theme.colors.text, ...theme.typography.bodySmall, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  hintText: { ...theme.typography.caption, color: theme.colors.textMuted, marginTop: 2 },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: theme.colors.surfaceSecondary, borderWidth: 1, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { ...theme.typography.bodySmall, color: theme.colors.textSecondary },
  chipTextActive: { color: '#FFF', fontWeight: '600' },
  weekdaysRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  weekdayCircle: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.surfaceSecondary, borderWidth: 1, borderColor: theme.colors.border },
  weekdayCircleOff: { backgroundColor: '#F97316', borderColor: '#EA580C' },
  weekdayCircleText: { ...theme.typography.caption, color: theme.colors.textSecondary, fontWeight: '600' },
  weekdayCircleTextOff: { color: '#FFF', fontWeight: '700' },
  scheduleSummaryBox: { marginTop: 12, padding: 12, backgroundColor: theme.colors.surfaceSecondary, borderRadius: 8 },
  scheduleSummaryText: { ...theme.typography.bodySmall, color: theme.colors.text, fontWeight: '600' },
  suggestionBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: theme.colors.primaryLight, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.primary },
  suggestionText: { ...theme.typography.bodySmall, color: theme.colors.text, fontWeight: '500' },
  acceptChip: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: theme.colors.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  acceptChipText: { ...theme.typography.caption, color: '#FFF', fontWeight: '600' },
  emptyTasksText: { ...theme.typography.bodySmall, color: theme.colors.textMuted, fontStyle: 'italic', marginVertical: 8 },
  taskRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: theme.colors.cardBackground, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, marginTop: 8 },
  taskTitleText: { ...theme.typography.bodyMedium, color: theme.colors.text, fontWeight: '600' },
  taskMetaText: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
  addTaskBox: { marginTop: 14, padding: 12, backgroundColor: theme.colors.surfaceSecondary, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border },
  addTaskHeader: { ...theme.typography.titleSmall, color: theme.colors.text, fontWeight: '600' },
  kindChip: { flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 6, marginRight: 6 },
  kindChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  kindChipText: { ...theme.typography.caption, color: theme.colors.textSecondary },
  kindChipTextActive: { color: '#FFF', fontWeight: '600' },
  addBtn: { backgroundColor: theme.colors.primary, paddingVertical: 10, borderRadius: 6, alignItems: 'center', marginTop: 10 },
  addBtnText: { ...theme.typography.button, color: '#FFF', fontWeight: '700' },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  backBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: theme.colors.surfaceSecondary, alignItems: 'center' },
  backBtnText: { ...theme.typography.button, color: theme.colors.text },
  nextBtn: { flex: 2, paddingVertical: 12, borderRadius: 10, backgroundColor: theme.colors.primary, alignItems: 'center' },
  nextBtnText: { ...theme.typography.button, color: '#FFF', fontWeight: '700' },
  saveBtn: { flex: 2, paddingVertical: 12, borderRadius: 10, backgroundColor: theme.colors.success, alignItems: 'center' },
  saveBtnText: { ...theme.typography.button, color: '#FFF', fontWeight: '700' },
});
