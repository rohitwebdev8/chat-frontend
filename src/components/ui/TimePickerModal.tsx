/**
 * TimePickerModal.tsx — 12-Hour AM/PM & Indian Standard Time (IST) Selector.
 * Zero external native dependencies, supports quick presets and custom hh:mm.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '@/constants/theme';

interface Props {
  visible: boolean;
  value: string; // 24-hr format "HH:mm" (e.g. "07:30", "19:45")
  onConfirm: (time24: string) => void;
  onClose: () => void;
}

const HOURS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

const IST_PRESETS = [
  { label: '🌅 Early Morning', time: '06:30', display: '06:30 AM' },
  { label: '🏋️ Morning Workout', time: '07:30', display: '07:30 AM' },
  { label: '☀️ Noon / Lunch', time: '13:00', display: '01:00 PM' },
  { label: '☕ Evening Chai', time: '17:30', display: '05:30 PM' },
  { label: '🍽️ Dinner / Review', time: '20:30', display: '08:30 PM' },
  { label: '🌙 Bedtime', time: '22:30', display: '10:30 PM' },
];

/** Convert 24-hr "HH:mm" to 12-hr display "hh:mm AM/PM" in IST */
export function formatISTTime(time24: string): string {
  if (!time24 || !time24.includes(':')) return '07:00 AM';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  if (isNaN(h)) return time24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const hourFormatted = String(h).padStart(2, '0');
  return `${hourFormatted}:${m} ${ampm}`;
}

export const TimePickerModal: React.FC<Props> = ({
  visible,
  value,
  onConfirm,
  onClose,
}) => {
  // Parse initial 24-hr time into 12-hr state
  const parse24ToState = (t: string) => {
    const [hStr, mStr] = (t || '07:00').split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return {
      hour: String(h).padStart(2, '0'),
      minute: m,
      period: ampm as 'AM' | 'PM',
    };
  };

  const initial = parse24ToState(value);
  const [selectedHour, setSelectedHour] = useState<string>(initial.hour);
  const [selectedMinute, setSelectedMinute] = useState<string>(initial.minute);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>(initial.period);

  useEffect(() => {
    if (visible) {
      const s = parse24ToState(value);
      setSelectedHour(s.hour);
      setSelectedMinute(s.minute);
      setSelectedPeriod(s.period);
    }
  }, [visible, value]);

  const handleConfirm = () => {
    let h = parseInt(selectedHour, 10);
    if (selectedPeriod === 'PM' && h < 12) h += 12;
    if (selectedPeriod === 'AM' && h === 12) h = 0;
    const time24 = `${String(h).padStart(2, '0')}:${selectedMinute}`;
    onConfirm(time24);
    onClose();
  };

  const handleApplyPreset = (time24: string) => {
    onConfirm(time24);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="time" size={20} color={theme.colors.primary} />
              <Text style={styles.title}>Select Time (IST)</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Current Display Preview */}
          <View style={styles.previewBox}>
            <Text style={styles.previewTimeText}>
              {selectedHour}:{selectedMinute} {selectedPeriod}
            </Text>
            <Text style={styles.previewSub}>Indian Standard Time (IST)</Text>
          </View>

          {/* 12-Hour Selector Columns */}
          <View style={styles.selectorGrid}>
            {/* Hour Column */}
            <View style={styles.columnWrapper}>
              <Text style={styles.columnLabel}>HOUR</Text>
              <ScrollView style={styles.columnScroll} showsVerticalScrollIndicator={false}>
                {HOURS.map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[styles.timeCell, selectedHour === h && styles.timeCellActive]}
                    onPress={() => setSelectedHour(h)}
                  >
                    <Text style={[styles.timeCellText, selectedHour === h && styles.timeCellTextActive]}>
                      {h}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={styles.colonSeparator}>:</Text>

            {/* Minute Column */}
            <View style={styles.columnWrapper}>
              <Text style={styles.columnLabel}>MINUTE</Text>
              <ScrollView style={styles.columnScroll} showsVerticalScrollIndicator={false}>
                {MINUTES.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.timeCell, selectedMinute === m && styles.timeCellActive]}
                    onPress={() => setSelectedMinute(m)}
                  >
                    <Text style={[styles.timeCellText, selectedMinute === m && styles.timeCellTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* AM / PM Toggle Column */}
            <View style={styles.columnWrapper}>
              <Text style={styles.columnLabel}>PERIOD</Text>
              <View style={styles.ampmContainer}>
                <TouchableOpacity
                  style={[styles.ampmBtn, selectedPeriod === 'AM' && styles.ampmBtnActive]}
                  onPress={() => setSelectedPeriod('AM')}
                >
                  <Text style={[styles.ampmText, selectedPeriod === 'AM' && styles.ampmTextActive]}>AM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ampmBtn, selectedPeriod === 'PM' && styles.ampmBtnActive]}
                  onPress={() => setSelectedPeriod('PM')}
                >
                  <Text style={[styles.ampmText, selectedPeriod === 'PM' && styles.ampmTextActive]}>PM</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Quick IST Schedule Presets */}
          <View style={styles.presetSection}>
            <Text style={styles.presetHeading}>QUICK IST SCHEDULES</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetRow}>
              {IST_PRESETS.map((p) => (
                <TouchableOpacity
                  key={p.time}
                  style={styles.presetChip}
                  onPress={() => handleApplyPreset(p.time)}
                >
                  <Text style={styles.presetChipText}>{p.label}</Text>
                  <Text style={styles.presetChipTime}>{p.display}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmBtnText}>Set Time</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { ...theme.typography.subtitle, fontWeight: '800', color: theme.colors.textPrimary },
  previewBox: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  previewTimeText: { fontSize: 26, fontWeight: '900', color: theme.colors.primary, letterSpacing: 1 },
  previewSub: { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary, marginTop: 2 },
  selectorGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  columnWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  columnLabel: {
    ...theme.typography.captionSmall,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  columnScroll: {
    maxHeight: 140,
    width: '100%',
  },
  colonSeparator: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textSecondary,
    marginTop: 18,
  },
  timeCell: {
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 4,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timeCellActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  timeCellText: {
    ...theme.typography.bodySmall,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  timeCellTextActive: {
    color: '#FFF',
  },
  ampmContainer: {
    gap: 8,
    width: '100%',
  },
  ampmBtn: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ampmBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  ampmText: {
    ...theme.typography.bodySmall,
    fontWeight: '800',
    color: theme.colors.textSecondary,
  },
  ampmTextActive: {
    color: '#FFF',
  },
  presetSection: {
    gap: 6,
    marginTop: 4,
  },
  presetHeading: {
    ...theme.typography.captionSmall,
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetChip: {
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  presetChipText: { fontSize: 11, fontWeight: '700', color: theme.colors.textPrimary },
  presetChipTime: { fontSize: 10, fontWeight: '600', color: theme.colors.primary, marginTop: 1 },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelBtnText: { ...theme.typography.buttonSmall, color: theme.colors.textSecondary },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  confirmBtnText: { ...theme.typography.buttonSmall, color: '#FFF', fontWeight: '700' },
});
