/**
 * ProgressView — PACE Progress Analytics & Reviews.
 *
 * Features:
 *  1. Top Summary Cards: Today %, Last-7-day Avg %, Current Streak, Best Day.
 *  2. Heatmap: Colored by completion % (legend: 0%, 1-49%, 50-79%, 80-100%), tap for Day Detail sheet.
 *  3. Weekly Table: With Done % column and CSV export.
 *  4. What's Behind Card: Only rendered when behindGoals.length > 0.
 *  5. Weekly Review: Collapsed by default with toggle.
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Share,
  Platform,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DailyLog } from '@/types/logs';
import { Goal, GoalCalculatedProgress, WeeklyReview } from '@/types/goals';
import { MetricDefinition } from '@/types/metrics';
import { formatIndianNumber } from '@/lib/goals/computeGoalProgress';
import theme from '@/constants/theme';
import { toastService } from '@/services/toastService';

interface Props {
  allLogs: Record<string, DailyLog>;
  goals: Goal[];
  goalProgressList: { goal: Goal; progress: GoalCalculatedProgress; metric?: MetricDefinition }[];
  metrics?: MetricDefinition[];
  reviews: WeeklyReview[];
  onSaveReview: (r: WeeklyReview) => Promise<void>;
  onExportCSV: () => string;
  scrollPaddingBottom?: number;
}

type DateRangeOption = '7' | '14' | '30';

export const ProgressView: React.FC<Props> = ({
  allLogs,
  goals,
  goalProgressList,
  metrics,
  reviews,
  onSaveReview,
  onExportCSV,
  scrollPaddingBottom = 100,
}) => {
  const insets = useSafeAreaInsets();
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => new Date());
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
  const [tableRange, setTableRange] = useState<DateRangeOption>('7');
  const [reviewCollapsed, setReviewCollapsed] = useState(true);

  const activeMetrics = useMemo(() => {
    return (metrics || []).filter((m: MetricDefinition) => !m.archived);
  }, [metrics]);

  // ── Summary Cards Calculations ──────────────────────────────────────────
  const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  const todayLog = allLogs[todayStr];
  const todayDoneCount = todayLog?.completedTaskIds?.length || 0;
  const todayPct = todayDoneCount > 0 ? Math.min(100, todayDoneCount * 25) : 0;

  const last7DaysAvgPct = useMemo(() => {
    let totalPct = 0;
    let count = 0;
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const log = allLogs[dateStr];
      const tasksDone = log?.completedTaskIds?.length || 0;
      totalPct += Math.min(100, tasksDone * 25);
      count++;
    }
    return count > 0 ? Math.round(totalPct / count) : 0;
  }, [allLogs]);

  // Streak & Best Day
  const { streak, bestDay } = useMemo<{ streak: number; bestDay: { date: string; pct: number } | null }>(() => {
    const dates = Object.keys(allLogs).sort();
    let currentStreak = 0;
    let best: { date: string; pct: number } | null = null;

    dates.forEach((d) => {
      const log = allLogs[d];
      const tasksDone = log?.completedTaskIds?.length || 0;
      const pct = Math.min(100, tasksDone * 25);
      if (pct >= 50) currentStreak++;
      else currentStreak = 0;

      if (!best || pct > best.pct) {
        best = { date: d, pct };
      }
    });

    return { streak: currentStreak, bestDay: best };
  }, [allLogs]);

  // ── Weekly Review Form State ─────────────────────────────────────────────
  const currentWeekKey = useMemo(() => getISOWeekKey(new Date()), []);
  const existingReview = useMemo(
    () => reviews.find((r) => r.weekKey === currentWeekKey),
    [reviews, currentWeekKey]
  );

  const [reviewWins, setReviewWins] = useState(existingReview?.wins?.join('\n') || '');
  const [reviewMisses, setReviewMisses] = useState(existingReview?.misses?.join('\n') || '');
  const [reviewReflections, setReviewReflections] = useState(existingReview?.reflections || '');
  const [reviewNextFocus, setReviewNextFocus] = useState(existingReview?.nextWeekFocus || '');
  const [reviewMood, setReviewMood] = useState<number>(existingReview?.moodRating || 3);
  const [reviewEnergy, setReviewEnergy] = useState<number>(existingReview?.energyRating || 3);
  const [isSavingReview, setIsSavingReview] = useState(false);

  // ── Heatmap Calculations ────────────────────────────────────────────────
  const monthData = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: { dateStr: string; dayNum: number; log?: DailyLog; pct: number }[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const log = allLogs[dateStr];
      const tasksDone = log?.completedTaskIds?.length || 0;
      const pct = Math.min(100, tasksDone * 25);
      days.push({ dateStr, dayNum: d, log, pct });
    }

    return { firstDayIndex, daysInMonth, days };
  }, [selectedMonth, allLogs]);

  // ── Table Calculations ──────────────────────────────────────────────────
  const tableRows = useMemo(() => {
    const daysCount = parseInt(tableRange, 10);
    const rows: { dateStr: string; log?: DailyLog; pct: number }[] = [];
    const today = new Date();

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const log = allLogs[dateStr];
      const tasksDone = log?.completedTaskIds?.length || 0;
      const pct = Math.min(100, tasksDone * 25);
      rows.push({ dateStr, log, pct });
    }

    return rows;
  }, [tableRange, allLogs]);

  // ── "What's Behind" List ────────────────────────────────────────────────
  const behindGoals = useMemo(() => {
    return goalProgressList.filter(({ progress }) =>
      ['Behind', 'Off track', 'Slightly behind'].includes(progress.statusLabel)
    );
  }, [goalProgressList]);

  // Handlers
  const handleExportCSV = async () => {
    try {
      const csvData = onExportCSV();
      if (Platform.OS === 'web') {
        toastService.show('CSV Exported!', 'success');
      } else {
        await Share.share({ message: csvData, title: 'PACE Logs Export' });
      }
    } catch {
      toastService.show('Failed to export CSV', 'error');
    }
  };

  const handleSaveReview = async () => {
    setIsSavingReview(true);
    try {
      const reviewToSave: WeeklyReview = {
        id: existingReview?.id || `weekly_${currentWeekKey}`,
        weekKey: currentWeekKey,
        wins: reviewWins.split('\n').filter((w) => w.trim().length > 0),
        misses: reviewMisses.split('\n').filter((m) => m.trim().length > 0),
        reflections: reviewReflections.trim(),
        nextWeekFocus: reviewNextFocus.trim(),
        moodRating: reviewMood,
        energyRating: reviewEnergy,
        createdAt: existingReview?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await onSaveReview(reviewToSave);
      toastService.show('Weekly review saved!', 'success');
    } catch {
      toastService.show('Failed to save review', 'error');
    } finally {
      setIsSavingReview(false);
    }
  };

  const selectedDayLog = selectedDayDate ? allLogs[selectedDayDate] : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── SECTION 1: TOP SUMMARY CARDS ─────────────────────────────── */}
      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryVal}>{todayPct}%</Text>
          <Text style={styles.summaryLabel}>Today's Done</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryVal}>{last7DaysAvgPct}%</Text>
          <Text style={styles.summaryLabel}>7-Day Avg</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryVal}>🔥 {streak}</Text>
          <Text style={styles.summaryLabel}>Day Streak</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryVal}>{bestDay ? `${bestDay.pct}%` : '--'}</Text>
          <Text style={styles.summaryLabel}>Best Day</Text>
        </View>
      </View>

      {/* ── SECTION 2: HEATMAP ────────────────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Completion Heatmap</Text>
          </View>
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1))}>
              <Ionicons name="chevron-back" size={18} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {selectedMonth.toLocaleString('default', { month: 'short', year: 'numeric' })}
            </Text>
            <TouchableOpacity onPress={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1))}>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legendRow}>
          <Text style={styles.legendTitle}>Legend:</Text>
          <View style={styles.legendItem}><View style={[styles.legendBox, { backgroundColor: '#F0F2F5' }]} /><Text style={styles.legendText}>0%</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendBox, { backgroundColor: '#C6F6D5' }]} /><Text style={styles.legendText}>1-49%</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendBox, { backgroundColor: '#48BB78' }]} /><Text style={styles.legendText}>50-79%</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendBox, { backgroundColor: '#2F855A' }]} /><Text style={styles.legendText}>80-100%</Text></View>
        </View>

        {/* Grid */}
        <View style={styles.calendarGridHeader}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <Text key={i} style={styles.dayHeaderCell}>{day}</Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {Array.from({ length: monthData.firstDayIndex }).map((_, i) => (
            <View key={`empty-${i}`} style={styles.calendarCellEmpty} />
          ))}

          {monthData.days.map(({ dateStr, dayNum, pct }) => {
            const isSelected = selectedDayDate === dateStr;
            const bgStyle = getHeatmapColor(pct);

            return (
              <TouchableOpacity
                key={dateStr}
                style={[styles.calendarCell, { backgroundColor: bgStyle }, isSelected && styles.cellSelected]}
                onPress={() => setSelectedDayDate(isSelected ? null : dateStr)}
              >
                <Text style={[styles.cellText, pct >= 50 && styles.cellTextLight]}>{dayNum}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── SECTION 3: WHAT'S BEHIND (ONLY SHOWN IF > 0) ───────────────── */}
      {behindGoals.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="alert-circle-outline" size={20} color={theme.colors.warning} />
              <Text style={styles.cardTitle}>What's Behind</Text>
            </View>
            <Text style={styles.badgeCount}>{behindGoals.length}</Text>
          </View>

          {behindGoals.map(({ goal, progress, metric }) => (
            <View key={goal.id} style={styles.behindRow}>
              <View style={styles.behindHeader}>
                <Text style={styles.behindGoalTitle}>{goal.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: progress.statusColor + '20' }]}>
                  <Text style={[styles.statusBadgeText, { color: progress.statusColor }]}>
                    {progress.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.behindSubtext}>
                {progress.message} · Current: {formatIndianNumber(progress.current, { unit: metric?.unit })} (Target: {formatIndianNumber(goal.targetValue, { unit: metric?.unit })})
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* ── SECTION 4: WEEKLY TABLE WITH DONE % ───────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="list-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Weekly Log Table</Text>
          </View>

          <View style={styles.tableActions}>
            <View style={styles.rangeSelector}>
              {(['7', '14', '30'] as DateRangeOption[]).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.rangeBtn, tableRange === r && styles.rangeBtnActive]}
                  onPress={() => setTableRange(r)}
                >
                  <Text style={[styles.rangeBtnText, tableRange === r && styles.rangeBtnTextActive]}>
                    {r}d
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={handleExportCSV} style={styles.exportBtn}>
              <Ionicons name="download-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.exportBtnText}>CSV</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableContainer}>
          <View>
            <View style={styles.trHeader}>
              <Text style={[styles.th, { width: 80 }]}>Date</Text>
              <Text style={[styles.th, { width: 70 }]}>Done %</Text>
              <Text style={[styles.th, { width: 70 }]}>Tasks</Text>
              {activeMetrics.map((m: MetricDefinition) => (
                <Text key={m.id} style={[styles.th, { width: 80 }]}>{m.name}</Text>
              ))}
            </View>

            {tableRows.map(({ dateStr, log, pct }) => (
              <View key={dateStr} style={styles.tr}>
                <Text style={[styles.td, styles.tdDate, { width: 80 }]}>{dateStr.slice(5)}</Text>
                <Text style={[styles.td, { width: 70, fontWeight: '700', color: theme.colors.primary }]}>
                  {pct}%
                </Text>
                <Text style={[styles.td, { width: 70 }]}>
                  {log && log.completedTaskIds?.length > 0 ? `✅ ${log.completedTaskIds.length}` : '--'}
                </Text>
                {activeMetrics.map((m: MetricDefinition) => {
                  const val = log?.metrics?.[m.id];
                  const hasVal = val !== undefined && val !== null && val > 0;
                  return (
                    <Text key={m.id} style={[styles.td, { width: 80 }]}>
                      {hasVal ? `${formatIndianNumber(val)} ${m.unit !== '₹' ? m.unit : ''}` : '--'}
                    </Text>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* ── SECTION 5: WEEKLY REVIEW (COLLAPSED BY DEFAULT) ───────────── */}
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => setReviewCollapsed(!reviewCollapsed)}
        >
          <View style={styles.cardTitleRow}>
            <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Weekly Review ({currentWeekKey})</Text>
          </View>
          <Ionicons
            name={reviewCollapsed ? 'chevron-down' : 'chevron-up'}
            size={20}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>

        {!reviewCollapsed && (
          <View style={styles.reviewForm}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>🏆 Wins & Highlights</Text>
              <TextInput
                style={styles.textArea}
                multiline
                placeholder="e.g. Completed 10k steps 5 days in a row..."
                value={reviewWins}
                onChangeText={setReviewWins}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>⚠️ Misses & Bottlenecks</Text>
              <TextInput
                style={styles.textArea}
                multiline
                placeholder="e.g. Skipped Thursday workout..."
                value={reviewMisses}
                onChangeText={setReviewMisses}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>💡 Reflections</Text>
              <TextInput
                style={styles.textArea}
                multiline
                placeholder="e.g. Prepare meals on Sunday..."
                value={reviewReflections}
                onChangeText={setReviewReflections}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, isSavingReview && styles.btnDisabled]}
              onPress={handleSaveReview}
              disabled={isSavingReview}
            >
              <Text style={styles.saveBtnText}>
                {isSavingReview ? 'Saving...' : 'Save Weekly Review'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Day Detail Sheet Modal */}
      {selectedDayDate && (
        <Modal visible transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>📅 Day Detail — {selectedDayDate}</Text>
                <TouchableOpacity onPress={() => setSelectedDayDate(null)}>
                  <Ionicons name="close-circle" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {selectedDayLog ? (
                <View style={styles.sheetContent}>
                  <Text style={styles.sheetText}>✅ Tasks Completed: {selectedDayLog.completedTaskIds?.length || 0}</Text>
                  <Text style={styles.sheetText}>👟 Steps: {selectedDayLog.metrics?.steps || 0}</Text>
                  <Text style={styles.sheetText}>💧 Water: {selectedDayLog.metrics?.water || 0}L</Text>
                  <Text style={styles.sheetText}>🔥 Calories: {selectedDayLog.metrics?.calories || 0} kcal</Text>
                  <Text style={styles.sheetText}>🥩 Protein: {selectedDayLog.metrics?.protein || 0}g</Text>
                  {selectedDayLog.note ? (
                    <Text style={styles.sheetNote}>Note: "{selectedDayLog.note}"</Text>
                  ) : null}
                </View>
              ) : (
                <Text style={styles.emptySheetText}>No logs recorded for this day.</Text>
              )}
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
};

function getISOWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function getHeatmapColor(pct: number): string {
  if (pct <= 0) return '#F0F2F5';
  if (pct < 50) return '#C6F6D5';
  if (pct < 80) return '#48BB78';
  return '#2F855A';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, gap: 16 },
  summaryGrid: { flexDirection: 'row', gap: 10 },
  summaryCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.small,
  },
  summaryVal: { fontSize: 18, fontWeight: '800', color: theme.colors.primary },
  summaryLabel: { ...theme.typography.captionSmall, color: theme.colors.textSecondary, fontWeight: '600' },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.small,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { ...theme.typography.subtitle, fontWeight: '700', color: theme.colors.textPrimary },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  monthLabel: { ...theme.typography.captionSmall, fontWeight: '700', color: theme.colors.textPrimary },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendTitle: { ...theme.typography.captionSmall, fontWeight: '600', color: theme.colors.textSecondary },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendBox: { width: 12, height: 12, borderRadius: 3 },
  legendText: { ...theme.typography.captionSmall, color: theme.colors.textSecondary },
  calendarGridHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  dayHeaderCell: { width: '13%', textAlign: 'center', ...theme.typography.captionSmall, color: theme.colors.textSecondary, fontWeight: '700' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  calendarCellEmpty: { width: '13%', aspectRatio: 1 },
  calendarCell: { width: '13%', aspectRatio: 1, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  cellSelected: { borderWidth: 2, borderColor: theme.colors.primary },
  cellText: { ...theme.typography.captionSmall, fontWeight: '700', color: theme.colors.textPrimary },
  cellTextLight: { color: '#FFF' },
  badgeCount: { ...theme.typography.captionSmall, fontWeight: '700', backgroundColor: theme.colors.warning + '20', color: theme.colors.warning, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  behindRow: { padding: 10, backgroundColor: theme.colors.background, borderRadius: 10, gap: 4 },
  behindHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  behindGoalTitle: { ...theme.typography.bodySmall, fontWeight: '700', color: theme.colors.textPrimary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusBadgeText: { ...theme.typography.captionSmall, fontWeight: '700' },
  behindSubtext: { ...theme.typography.captionSmall, color: theme.colors.textSecondary },
  tableActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rangeSelector: { flexDirection: 'row', backgroundColor: theme.colors.background, borderRadius: 8, padding: 2 },
  rangeBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  rangeBtnActive: { backgroundColor: theme.colors.surface },
  rangeBtnText: { ...theme.typography.captionSmall, color: theme.colors.textSecondary },
  rangeBtnTextActive: { fontWeight: '700', color: theme.colors.primary },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: theme.colors.primaryLight },
  exportBtnText: { ...theme.typography.captionSmall, fontWeight: '700', color: theme.colors.primary },
  tableContainer: { marginTop: 4 },
  trHeader: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  th: { ...theme.typography.captionSmall, fontWeight: '700', color: theme.colors.textSecondary },
  tr: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border + '50' },
  td: { ...theme.typography.captionSmall, color: theme.colors.textPrimary },
  tdDate: { fontWeight: '600' },
  reviewForm: { gap: 10, marginTop: 8 },
  formGroup: { gap: 4 },
  formLabel: { ...theme.typography.bodySmall, fontWeight: '600', color: theme.colors.textPrimary },
  textArea: { backgroundColor: theme.colors.background, borderRadius: 10, padding: 10, minHeight: 60, ...theme.typography.bodySmall, color: theme.colors.textPrimary, borderWidth: 1, borderColor: theme.colors.border, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: theme.colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 4 },
  saveBtnText: { ...theme.typography.buttonSmall, color: '#FFF', fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 10 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { ...theme.typography.subtitle, fontWeight: '700', color: theme.colors.textPrimary },
  sheetContent: { gap: 4 },
  sheetText: { ...theme.typography.bodySmall, color: theme.colors.textSecondary },
  sheetNote: { ...theme.typography.caption, fontStyle: 'italic', color: theme.colors.textPrimary, marginTop: 4 },
  emptySheetText: { ...theme.typography.bodySmall, color: theme.colors.textSecondary },
});
