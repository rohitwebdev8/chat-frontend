import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Goal, GoalCategory, GoalType, GoalHorizon, LinkedMetric, GoalPriority } from '@/types/goals';
import { calculateCalorieTarget } from '@/lib/analytics/pace';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaveGoal: (goal: Goal) => void;
  initialGoal?: Goal | null;
  currentWeight?: number | null;
}

export const AddGoalWizardModal: React.FC<Props> = ({
  visible,
  onClose,
  onSaveGoal,
  initialGoal,
  currentWeight = 75,
}) => {
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState(initialGoal?.title || '');
  const [category, setCategory] = useState<GoalCategory>((initialGoal?.category as GoalCategory) || 'Health');
  const [type, setType] = useState<GoalType>((initialGoal?.type as GoalType) || 'target');
  const [horizon, setHorizon] = useState<GoalHorizon>((initialGoal?.horizon as GoalHorizon) || 'monthly');
  const [startValue, setStartValue] = useState(String(initialGoal?.startValue ?? currentWeight ?? 0));
  const [targetValue, setTargetValue] = useState(String(initialGoal?.targetValue ?? 70));
  const [unit, setUnit] = useState(initialGoal?.unit || 'kg');
  const [startDate, setStartDate] = useState(initialGoal?.startDate || new Date().toISOString().split('T')[0]);
  const [deadline, setDeadline] = useState(initialGoal?.deadline || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [linkedMetric, setLinkedMetric] = useState<LinkedMetric>((initialGoal?.linkedMetric as LinkedMetric) || 'weight');
  const [priority, setPriority] = useState<GoalPriority>((initialGoal?.priority as GoalPriority) || 'high');
  const [visionStatement, setVisionStatement] = useState(initialGoal?.visionStatement || '');
  const [whyItMatters, setWhyItMatters] = useState(initialGoal?.whyItMatters || '');

  // Template autofill helper
  const applyTemplate = (templateName: string) => {
    switch (templateName) {
      case 'weight':
        setTitle('Reach Target Weight Goal');
        setCategory('Health');
        setType('target');
        setHorizon('monthly');
        setStartValue(String(currentWeight || 75));
        setTargetValue('70');
        setUnit('kg');
        setLinkedMetric('weight');
        setPriority('high');
        break;
      case 'calories':
        setTitle('Daily Calorie Deficit Limit');
        setCategory('Diet');
        setType('recurring');
        setHorizon('daily');
        setStartValue('0');
        setTargetValue('1800');
        setUnit('kcal');
        setLinkedMetric('calories');
        setPriority('high');
        break;
      case 'protein':
        setTitle('Daily Protein Intake Goal');
        setCategory('Diet');
        setType('recurring');
        setHorizon('daily');
        setStartValue('0');
        setTargetValue('140');
        setUnit('g');
        setLinkedMetric('protein');
        setPriority('medium');
        break;
      case 'steps':
        setTitle('Daily 10,000 Step Goal');
        setCategory('Fitness');
        setType('recurring');
        setHorizon('daily');
        setStartValue('0');
        setTargetValue('10000');
        setUnit('steps');
        setLinkedMetric('steps');
        setPriority('high');
        break;
      case 'workouts':
        setTitle('5 Workouts Per Week Goal');
        setCategory('Fitness');
        setType('recurring');
        setHorizon('weekly');
        setStartValue('0');
        setTargetValue('5');
        setUnit('sessions');
        setLinkedMetric('workout');
        setPriority('high');
        break;
      case 'dsa':
        setTitle('Solve 100 DSA Questions');
        setCategory('Study');
        setType('cumulative');
        setHorizon('monthly');
        setStartValue('0');
        setTargetValue('100');
        setUnit('questions');
        setLinkedMetric('dsaQuestions');
        setPriority('high');
        break;
      case 'study':
        setTitle('Code 50 Hours React & Backend');
        setCategory('Study');
        setType('cumulative');
        setHorizon('monthly');
        setStartValue('0');
        setTargetValue('50');
        setUnit('hours');
        setLinkedMetric('reactHours');
        setPriority('high');
        break;
      case 'jobs':
        setTitle('Submit 50 Job Applications');
        setCategory('Career');
        setType('cumulative');
        setHorizon('monthly');
        setStartValue('0');
        setTargetValue('50');
        setUnit('applications');
        setLinkedMetric('jobApplications');
        setPriority('high');
        break;
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Required Field', 'Please enter a goal title.');
      return;
    }

    const sVal = parseFloat(startValue) || 0;
    const tVal = parseFloat(targetValue) || 0;

    // Run calorie & pace feasibility check if weight goal
    if (linkedMetric === 'weight' && tVal < sVal && deadline) {
      const paceRec = calculateCalorieTarget(sVal, tVal, deadline);
      if (!paceRec.isDeadlineFeasible && paceRec.warningMessage) {
        Alert.alert('Calorie Pace Notice', paceRec.warningMessage);
      }
    }

    const newGoal: Goal = {
      id: initialGoal?.id || `goal-${Date.now()}`,
      title: title.trim(),
      category,
      type,
      horizon,
      startValue: sVal,
      currentValue: initialGoal?.currentValue ?? sVal,
      targetValue: tVal,
      unit: unit.trim() || 'units',
      startDate,
      deadline: deadline || undefined,
      linkedMetric,
      priority,
      status: initialGoal?.status || 'active',
      visionStatement: visionStatement.trim() || undefined,
      whyItMatters: whyItMatters.trim() || undefined,
      createdAt: initialGoal?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveGoal(newGoal);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {initialGoal ? 'Edit Goal' : '🎯 Add Goal Wizard'}
            </Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
          {/* Quick Templates Bar */}
          {!initialGoal && (
            <View style={styles.templateBox}>
              <Text style={styles.templateTitle}>Quick Goal Templates</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templatePills}>
                <TouchableOpacity style={styles.templatePill} onPress={() => applyTemplate('weight')}>
                  <Text style={styles.templatePillText}>⚖️ Weight Loss</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.templatePill} onPress={() => applyTemplate('calories')}>
                  <Text style={styles.templatePillText}>🔥 Calorie Limit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.templatePill} onPress={() => applyTemplate('protein')}>
                  <Text style={styles.templatePillText}>🥩 Protein Target</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.templatePill} onPress={() => applyTemplate('steps')}>
                  <Text style={styles.templatePillText}>🏃 Steps / Day</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.templatePill} onPress={() => applyTemplate('dsa')}>
                  <Text style={styles.templatePillText}>💻 DSA Questions</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.templatePill} onPress={() => applyTemplate('jobs')}>
                  <Text style={styles.templatePillText}>💼 Job Applications</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}

          {/* Goal Title Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Goal Title *</Text>
            <TextInput
              style={styles.inputField}
              placeholder="e.g. Lose 5 kg by end of month"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Category Selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.pillsRow}>
              {(['Health', 'Fitness', 'Diet', 'Study', 'Career', 'Finance', 'Personal'] as GoalCategory[]).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.pill, category === cat && styles.pillActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.pillText, category === cat && styles.pillTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Horizon Selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Time Horizon</Text>
            <View style={styles.pillsRow}>
              {(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'long-term'] as GoalHorizon[]).map((hz) => (
                <TouchableOpacity
                  key={hz}
                  style={[styles.pill, horizon === hz && styles.pillActive]}
                  onPress={() => setHorizon(hz)}
                >
                  <Text style={[styles.pillText, horizon === hz && styles.pillTextActive]}>{hz}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Goal Type & Priority */}
          <View style={styles.rowTwo}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Goal Type</Text>
              <View style={styles.pillsRow}>
                {(['target', 'cumulative', 'recurring'] as GoalType[]).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.pill, type === t && styles.pillActive]}
                    onPress={() => setType(t)}
                  >
                    <Text style={[styles.pillText, type === t && styles.pillTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Priority</Text>
              <View style={styles.pillsRow}>
                {(['high', 'medium', 'low'] as GoalPriority[]).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.pill, priority === p && styles.pillActive]}
                    onPress={() => setPriority(p)}
                  >
                    <Text style={[styles.pillText, priority === p && styles.pillTextActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Numbers & Values */}
          <View style={styles.rowThree}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Start Value</Text>
              <TextInput
                style={styles.inputField}
                keyboardType="decimal-pad"
                value={startValue}
                onChangeText={setStartValue}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Target Value *</Text>
              <TextInput
                style={styles.inputField}
                keyboardType="decimal-pad"
                value={targetValue}
                onChangeText={setTargetValue}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Unit</Text>
              <TextInput
                style={styles.inputField}
                placeholder="kg, steps, hrs"
                value={unit}
                onChangeText={setUnit}
              />
            </View>
          </View>

          {/* Dates */}
          <View style={styles.rowTwo}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Start Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.inputField}
                value={startDate}
                onChangeText={setStartDate}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Deadline Date</Text>
              <TextInput
                style={styles.inputField}
                placeholder="YYYY-MM-DD"
                value={deadline}
                onChangeText={setDeadline}
              />
            </View>
          </View>

          {/* Linked Metric Selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Automated Tracker Metric</Text>
            <View style={styles.pillsRow}>
              {([
                'weight',
                'steps',
                'workout',
                'dsaQuestions',
                'reactHours',
                'backendHours',
                'jobApplications',
                'calories',
                'protein',
                'water',
                'none',
              ] as LinkedMetric[]).map((lm) => (
                <TouchableOpacity
                  key={lm}
                  style={[styles.pill, linkedMetric === lm && styles.pillActive]}
                  onPress={() => setLinkedMetric(lm)}
                >
                  <Text style={[styles.pillText, linkedMetric === lm && styles.pillTextActive]}>{lm}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Vision Statement & Why it matters */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Vision Statement (Optional)</Text>
            <TextInput
              style={styles.inputField}
              placeholder="What does achieving this goal unlock for you?"
              value={visionStatement}
              onChangeText={setVisionStatement}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Why It Matters Note (Optional)</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Your deeper motivation..."
              value={whyItMatters}
              onChangeText={setWhyItMatters}
            />
          </View>
        </ScrollView>

        {/* Footer Actions */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save Goal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212529',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F3F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  templateBox: {
    backgroundColor: '#E7F5FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  templateTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1864AB',
    marginBottom: 8,
  },
  templatePills: {
    gap: 6,
  },
  templatePill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 6,
  },
  templatePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 6,
  },
  inputField: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#212529',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#E9ECEF',
  },
  pillActive: {
    backgroundColor: '#007AFF',
  },
  pillText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  rowTwo: {
    flexDirection: 'row',
    gap: 10,
  },
  rowThree: {
    flexDirection: 'row',
    gap: 8,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F1F3F5',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#495057',
    fontWeight: '700',
    fontSize: 14,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
