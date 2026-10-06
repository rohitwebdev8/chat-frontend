/**
 * RemindersView.tsx — PACE Nudges, Reminders & IST Time Scheduling.
 *
 * Features:
 *  1. Top Action Bar: Prominent "+ New Reminder" button and active nudges count.
 *  2. Indian Standard Time (IST) Support:
 *     - Interactive Time Picker modal (12-hour AM/PM with IST presets).
 *     - Times displayed in clean IST format (e.g. "07:30 AM IST").
 *  3. Quiet Hours: Configurable no-disturbance window in IST.
 *  4. Linked Tasks: Reminders linked to tasks for habit tracking.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Reminder, ScheduleType, QuietHours } from '@/types/reminders';
import { Task, GoalTask } from '@/types/tasks';
import { TimePickerModal, formatISTTime } from '@/components/ui/TimePickerModal';
import theme from '@/constants/theme';
import { toastService } from '@/services/toastService';

interface Props {
  reminders: Reminder[];
  tasks: (Task | GoalTask)[];
  quietHours: QuietHours;
  onSaveReminder: (reminder: Reminder) => Promise<void>;
  onDeleteReminder: (id: string) => Promise<void>;
  onSaveQuietHours: (qh: QuietHours) => Promise<void>;
  scrollPaddingBottom?: number;
}

const WEEKDAY_ABBRS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const RemindersView: React.FC<Props> = ({
  reminders,
  tasks,
  quietHours,
  onSaveReminder,
  onDeleteReminder,
  onSaveQuietHours,
  scrollPaddingBottom = 100,
}) => {
  const insets = useSafeAreaInsets();
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
  const [editingRem, setEditingRem] = useState<Reminder | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('daily-fixed');
  const [fixedTime, setFixedTime] = useState('07:30');
  const [intervalMinutes, setIntervalMinutes] = useState('120');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [linkedTaskId, setLinkedTaskId] = useState<string | null>(null);
  const [errorText, setErrorText] = useState('');

  const openAddForm = (existing?: Reminder) => {
    if (existing) {
      setEditingRem(existing);
      setTitle(existing.title);
      setBody(existing.body);
      setScheduleType(existing.scheduleType);
      setFixedTime(existing.fixedTimes ? existing.fixedTimes[0] : '07:30');
      setIntervalMinutes(String(existing.intervalMinutes || 120));
      setSelectedWeekdays(existing.selectedWeekdays || [1, 2, 3, 4, 5]);
      setLinkedTaskId(existing.taskId || null);
    } else {
      setEditingRem(null);
      setTitle('');
      setBody('');
      setScheduleType('daily-fixed');
      setFixedTime('07:30');
      setIntervalMinutes('120');
      setSelectedWeekdays([1, 2, 3, 4, 5]);
      setLinkedTaskId(null);
    }
    setErrorText('');
    setShowAddModal(true);
  };

  const [saving, setSaving] = useState(false);

  const handleSaveForm = async () => {
    if (!title.trim() || title.trim().length < 2) {
      setErrorText('Title must be at least 2 characters.');
      return;
    }

    setSaving(true);
    try {
      const newRem: Reminder = {
        id: editingRem ? editingRem.id : `rem-${Date.now()}`,
        title: title.trim(),
        body: body.trim() || title.trim(),
        taskId: linkedTaskId,
        scheduleType,
        // Only set fixedTimes for time-based types
        fixedTimes: scheduleType !== 'interval' ? [fixedTime] : (editingRem?.fixedTimes || ['09:00']),
        // Interval-specific fields
        intervalMinutes: parseInt(intervalMinutes, 10) || 120,
        intervalWindowStart: editingRem?.intervalWindowStart || '08:00',
        intervalWindowEnd: editingRem?.intervalWindowEnd || '22:00',
        selectedWeekdays,
        enabled: editingRem ? editingRem.enabled : true,
        snoozeDurationMinutes: editingRem?.snoozeDurationMinutes || 60,
        createdAt: editingRem ? editingRem.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await onSaveReminder(newRem);
      setShowAddModal(false);
      toastService.show(editingRem ? 'Reminder updated' : 'Reminder created', 'success');
    } catch (err) {
      setErrorText('Failed to save reminder. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleWeekday = (dayNum: number) => {
    if (selectedWeekdays.includes(dayNum)) {
      setSelectedWeekdays(selectedWeekdays.filter((d) => d !== dayNum));
    } else {
      setSelectedWeekdays([...selectedWeekdays, dayNum]);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── TOP ACTION BAR ── */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.topBarSub}>NOTIFICATIONS (IST)</Text>
            <Text style={styles.topBarTitle}>Nudges & Reminders</Text>
          </View>

          <TouchableOpacity style={styles.createReminderBtn} onPress={() => openAddForm()}>
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={styles.createReminderBtnText}>+ Add Reminder</Text>
          </TouchableOpacity>
        </View>

        {/* ── QUIET HOURS CARD ── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconRow}>
              <Ionicons name="moon-outline" size={20} color={theme.colors.primary} />
              <View>
                <Text style={styles.cardTitle}>Quiet Hours (No Disturb)</Text>
                <Text style={styles.cardSub}>
                  {quietHours.enabled
                    ? `Active: 11:00 PM to 06:00 AM IST`
                    : 'Quiet hours disabled'}
                </Text>
              </View>
            </View>
            <Switch
              value={quietHours.enabled}
              onValueChange={(val) => onSaveQuietHours({ ...quietHours, enabled: val })}
            />
          </View>
        </View>

        {/* ── REMINDERS LIST CARD ── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconRow}>
              <Ionicons name="notifications-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.cardTitle}>Active Nudges ({reminders.length})</Text>
            </View>
          </View>

          {reminders.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="time-outline" size={36} color={theme.colors.textSecondary} />
              <Text style={styles.emptyTitle}>No Scheduled Reminders</Text>
              <Text style={styles.emptyText}>Tap "+ Add Reminder" to schedule smart notifications in IST.</Text>
            </View>
          ) : (
            reminders.map((rem) => {
              const timeDisplay = rem.fixedTimes ? formatISTTime(rem.fixedTimes[0]) : '';
              const linkedTask = tasks.find((t) => t.id === rem.taskId);

              return (
                <View key={rem.id} style={styles.remItemCard}>
                  <View style={styles.remItemHeader}>
                    <View style={styles.remItemLeft}>
                      <View style={styles.timeBadge}>
                        <Ionicons name="alarm" size={14} color={theme.colors.primary} />
                        <Text style={styles.timeBadgeText}>
                          {rem.scheduleType === 'interval'
                            ? `Every ${rem.intervalMinutes || 120}m`
                            : timeDisplay}
                        </Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.remTitle}>{rem.title}</Text>
                        <Text style={styles.remMeta}>
                          {rem.scheduleType === 'weekly'
                            ? `Weekly on ${(rem.selectedWeekdays || []).map((d) => WEEKDAY_ABBRS[d]).join(', ')}`
                            : rem.scheduleType === 'interval'
                              ? `Repeats periodically during active hours`
                              : `Daily at ${timeDisplay} IST`}
                          {linkedTask ? ` • 🎯 ${linkedTask.title}` : ''}
                        </Text>
                      </View>
                    </View>

                    <Switch
                      value={rem.enabled}
                      onValueChange={(val) => onSaveReminder({ ...rem, enabled: val, updatedAt: new Date().toISOString() })}
                    />
                  </View>

                  <View style={styles.remActionsRow}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openAddForm(rem)}>
                      <Ionicons name="pencil-outline" size={14} color={theme.colors.textSecondary} />
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => {
                        Alert.alert('Delete Reminder', `Delete "${rem.title}"?`, [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: async () => {
                              await onDeleteReminder(rem.id);
                              toastService.show('Reminder deleted', 'info');
                            },
                          },
                        ]);
                      }}
                    >
                      <Ionicons name="trash-outline" size={14} color={theme.colors.error} />
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ── ADD / EDIT REMINDER MODAL ── */}
      {showAddModal && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingRem ? 'Edit Reminder' : 'Add Smart Reminder'}
                </Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Ionicons name="close-circle" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Title Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Reminder Title *</Text>
                <TextInput
                  style={[styles.inputField, !!errorText && styles.inputError]}
                  value={title}
                  onChangeText={(t) => { setTitle(t); setErrorText(''); }}
                  placeholder="e.g. Drink 1 Glass of Water, Evening Workout"
                  placeholderTextColor="#94A3B8"
                />
                {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
              </View>

              {/* Schedule Type Pills */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Frequency</Text>
                <View style={styles.pillsRow}>
                  {(['daily-fixed', 'weekly', 'interval'] as ScheduleType[]).map((st) => (
                    <TouchableOpacity
                      key={st}
                      style={[styles.pill, scheduleType === st && styles.pillActive]}
                      onPress={() => setScheduleType(st)}
                    >
                      <Text style={[styles.pillText, scheduleType === st && styles.pillTextActive]}>
                        {st === 'daily-fixed' ? '⏰ Daily at Time' : st === 'weekly' ? '📅 Specific Days' : '⏱️ Regular Interval'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* IST Time Picker Button */}
              {scheduleType !== 'interval' ? (
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Trigger Time (Indian Standard Time)</Text>
                  <TouchableOpacity
                    style={styles.timePickerButton}
                    onPress={() => setShowTimePicker(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.timePickerBtnLeft}>
                      <Ionicons name="time" size={18} color={theme.colors.primary} />
                      <Text style={styles.timePickerBtnVal}>{formatISTTime(fixedTime)}</Text>
                    </View>
                    <View style={styles.istBadge}>
                      <Text style={styles.istBadgeText}>IST</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Repeat Every</Text>
                  <View style={styles.pillsRow}>
                    {['30', '60', '120', '240'].map((mins) => (
                      <TouchableOpacity
                        key={mins}
                        style={[styles.pill, intervalMinutes === mins && styles.pillActive]}
                        onPress={() => setIntervalMinutes(mins)}
                      >
                        <Text style={[styles.pillText, intervalMinutes === mins && styles.pillTextActive]}>
                          {mins === '30' ? '30 Mins' : mins === '60' ? '1 Hour' : mins === '120' ? '2 Hours' : '4 Hours'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Weekday Selector for Weekly */}
              {scheduleType === 'weekly' && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Repeat on Days</Text>
                  <View style={styles.weekdayPickerRow}>
                    {WEEKDAY_ABBRS.map((abbr, idx) => {
                      const isSelected = selectedWeekdays.includes(idx);
                      return (
                        <TouchableOpacity
                          key={abbr}
                          style={[styles.weekdayCircle, isSelected && styles.weekdayCircleActive]}
                          onPress={() => toggleWeekday(idx)}
                        >
                          <Text style={[styles.weekdayText, isSelected && styles.weekdayTextActive]}>
                            {abbr}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Link to Task */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Link to Task (Optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow}>
                  <TouchableOpacity
                    style={[styles.pill, linkedTaskId === null && styles.pillActive]}
                    onPress={() => setLinkedTaskId(null)}
                  >
                    <Text style={[styles.pillText, linkedTaskId === null && styles.pillTextActive]}>
                      None
                    </Text>
                  </TouchableOpacity>
                  {tasks.map((t) => {
                    const prefix = 'goalId' in t ? '🎯 ' : '📝 ';
                    return (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.pill, linkedTaskId === t.id && styles.pillActive]}
                        onPress={() => setLinkedTaskId(t.id)}
                      >
                        <Text style={[styles.pillText, linkedTaskId === t.id && styles.pillTextActive]}>
                          {prefix}{t.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Modal Action Buttons */}
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setShowAddModal(false)}>
                  <Text style={styles.cancelModalText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveModalBtn, (saving || !title.trim() || title.trim().length < 2) && styles.btnDisabled]}
                  onPress={handleSaveForm}
                  disabled={saving || !title.trim() || title.trim().length < 2}
                >
                  <Text style={styles.saveModalText}>{saving ? 'Saving…' : 'Save Reminder'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* IST Time Picker Modal */}
      <TimePickerModal
        visible={showTimePicker}
        value={fixedTime}
        onConfirm={(time24) => setFixedTime(time24)}
        onClose={() => setShowTimePicker(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, gap: 14 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  topBarSub: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 1,
  },
  topBarTitle: {
    ...theme.typography.subtitle,
    fontWeight: '900',
    color: theme.colors.textPrimary,
  },
  createReminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  createReminderBtnText: { ...theme.typography.buttonSmall, color: '#FFFFFF', fontWeight: '700' },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.small,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { ...theme.typography.subtitle, fontWeight: '700', color: theme.colors.textPrimary },
  cardSub: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
  emptyBox: { paddingVertical: 24, alignItems: 'center', gap: 6 },
  emptyTitle: { ...theme.typography.bodySmall, fontWeight: '700', color: theme.colors.textPrimary },
  emptyText: { ...theme.typography.caption, color: theme.colors.textSecondary, textAlign: 'center' },

  remItemCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  remItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  remItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeBadgeText: { ...theme.typography.captionSmall, fontWeight: '800', color: theme.colors.primary },
  remTitle: { ...theme.typography.bodySmall, fontWeight: '700', color: theme.colors.textPrimary },
  remMeta: { ...theme.typography.captionSmall, color: theme.colors.textSecondary, marginTop: 2 },
  remActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 16,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border + '60',
  },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { ...theme.typography.captionSmall, color: theme.colors.textSecondary, fontWeight: '600' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deleteBtnText: { ...theme.typography.captionSmall, color: theme.colors.error, fontWeight: '600' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 14,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { ...theme.typography.subtitle, fontWeight: '800', color: theme.colors.textPrimary },
  fieldGroup: { gap: 6 },
  label: { ...theme.typography.captionSmall, fontWeight: '700', color: theme.colors.textSecondary },
  inputField: {
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
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pillText: { ...theme.typography.captionSmall, color: theme.colors.textSecondary, fontWeight: '600' },
  pillTextActive: { color: '#FFFFFF', fontWeight: '700' },

  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  timePickerBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timePickerBtnVal: { ...theme.typography.bodySmall, fontWeight: '800', color: theme.colors.textPrimary },
  istBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  istBadgeText: { fontSize: 10, fontWeight: '800', color: theme.colors.primary },

  weekdayPickerRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  weekdayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayCircleActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  weekdayText: { fontSize: 11, color: theme.colors.textSecondary, fontWeight: '700' },
  weekdayTextActive: { color: '#FFF' },

  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelModalBtn: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelModalText: { ...theme.typography.buttonSmall, color: theme.colors.textSecondary },
  saveModalBtn: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveModalText: { ...theme.typography.buttonSmall, color: '#FFFFFF', fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
});
