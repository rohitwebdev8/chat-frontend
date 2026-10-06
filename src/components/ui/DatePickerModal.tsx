/**
 * DatePickerModal — Inline calendar picker, zero extra dependencies.
 * Shows a month grid; user taps a day to select.
 * Returns date as YYYY-MM-DD string.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '@/constants/theme';

interface Props {
  visible: boolean;
  value: string;          // YYYY-MM-DD or ''
  minDate?: string;       // YYYY-MM-DD — dates before this are disabled
  onConfirm: (date: string) => void;
  onClose: () => void;
}

const DAYS   = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/** Format YYYY-MM-DD → DD/MM/YYYY for display */
export function formatDisplayDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Parse YYYY-MM-DD → Date (noon, avoids timezone boundary shifts) */
function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

/** Format Date → YYYY-MM-DD */
function dateToIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const DatePickerModal: React.FC<Props> = ({
  visible, value, minDate, onConfirm, onClose,
}) => {
  const today = new Date();

  const initDate = value ? isoToDate(value) : today;
  const [viewYear,  setViewYear]  = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth()); // 0-indexed
  const [selected,  setSelected]  = useState<string>(value || '');

  const minD = minDate ? isoToDate(minDate) : null;

  // Reset when opened
  React.useEffect(() => {
    if (visible) {
      const d = value ? isoToDate(value) : today;
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setSelected(value || '');
    }
  }, [visible]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const isDisabled = (day: number): boolean => {
    if (!minD) return false;
    const d = new Date(viewYear, viewMonth, day, 12);
    return d < minD;
  };

  const isSelected = (day: number): boolean => {
    if (!selected) return false;
    const iso = dateToIso(new Date(viewYear, viewMonth, day));
    return iso === selected;
  };

  const isToday = (day: number): boolean => {
    return (
      day === today.getDate() &&
      viewMonth === today.getMonth() &&
      viewYear === today.getFullYear()
    );
  };

  const onDayPress = (day: number) => {
    if (isDisabled(day)) return;
    const iso = dateToIso(new Date(viewYear, viewMonth, day));
    setSelected(iso);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {MONTHS[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Day-of-week labels */}
          <View style={styles.weekRow}>
            {DAYS.map(d => (
              <Text key={d} style={styles.weekLabel}>{d}</Text>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.grid}>
            {cells.map((day, idx) => {
              if (!day) return <View key={`e-${idx}`} style={styles.cell} />;
              const disabled = isDisabled(day);
              const sel      = isSelected(day);
              const tod      = isToday(day);
              return (
                <TouchableOpacity
                  key={`d-${idx}`}
                  style={[
                    styles.cell,
                    sel      && styles.cellSelected,
                    tod && !sel && styles.cellToday,
                  ]}
                  onPress={() => onDayPress(day)}
                  disabled={disabled}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.cellText,
                    sel      && styles.cellTextSelected,
                    tod && !sel && styles.cellTextToday,
                    disabled && styles.cellTextDisabled,
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Selected date display */}
          <Text style={styles.selectedLabel}>
            {selected ? `Selected: ${formatDisplayDate(selected)}` : 'Tap a date to select'}
          </Text>

          {/* Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.clearBtn} onPress={() => { setSelected(''); onConfirm(''); onClose(); }}>
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, !selected && styles.confirmBtnDisabled]}
              onPress={() => { if (selected) { onConfirm(selected); onClose(); } }}
              disabled={!selected}
            >
              <Text style={styles.confirmBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>

        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 18,
    width: '100%',
    maxWidth: 360,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    paddingVertical: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  cellSelected: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
  },
  cellToday: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 10,
  },
  cellText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  cellTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  cellTextToday: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  cellTextDisabled: {
    color: theme.colors.border,
  },
  selectedLabel: {
    textAlign: 'center',
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  clearBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  clearBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.4,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
