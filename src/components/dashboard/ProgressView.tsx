import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Goal, GoalCalculatedProgress } from '@/types/goals';
import { DailyLog } from '@/types/logs';
import { WeeklyReview } from '@/types/goals';
import { formatLocalDate } from '@/types/tasks';
import { formatIndianNumber } from '@/lib/goals/computeGoalProgress';
import theme from '@/constants/theme';

interface ProgressViewProps {
  allLogs: Record<string, DailyLog>;
  goals: Goal[];
  goalProgressList: { goal: Goal; progress: GoalCalculatedProgress }[];
  reviews: WeeklyReview[];
  onSaveReview: (r: WeeklyReview) => Promise<void>;
  onExportCSV: () => string;
  scrollPaddingBottom: number;
}

export const ProgressView: React.FC<ProgressViewProps> = ({
  allLogs,
  goals,
  goalProgressList,
  reviews,
  onSaveReview,
  onExportCSV,
  scrollPaddingBottom,
}) => {
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);

  // Review editing state
  const [editingWins, setEditingWins] = useState('');
  const [editingMisses, setEditingMisses] = useState('');
  const [reflectionsText, setReflectionsText] = useState('');

  const todayStr = useMemo(() => formatLocalDate(new Date()), []);
  const activeGoals = useMemo(() => goals.filter((g) => g.status === 'active'), [goals]);

  // 1. Summary Cards: Today %, 7-day Average, Best Streak
  const last7DaysStats = useMemo(() => {
    let sumPct = 0;
    let daysWithLogs = 0;
    let bestStreak = 0;

    for (let i = 0; i < 7; i++) {
      const dt = new Date();
      dt.setDate(dt.getDate() - i);
      const dStr = formatLocalDate(dt);
      const log = allLogs[dStr];

      if (log) {
        const doneCount = Object.keys(log.done || {}).length;
        if (doneCount > 0) {
          sumPct += Math.min(100, doneCount * 25);
          daysWithLogs++;
        }
      }
    }

    goalProgressList.forEach((g) => {
      if (g.progress.streakBest > bestStreak) bestStreak = g.progress.streakBest;
    });

    const todayDone = Object.keys(allLogs[todayStr]?.done || {}).length;
    const todayPct = Math.min(100, todayDone * 25);
    const avg7dPct = daysWithLogs > 0 ? Math.round(sumPct / 7) : 0;

    return { todayPct, avg7dPct, bestStreak };
  }, [allLogs, goalProgressList, todayStr]);

  // 2. Heatmap Days Generation (last 28 days)
  const heatmapDays = useMemo(() => {
    const list = [];
    for (let i = 27; i >= 0; i--) {
      const dt = new Date();
      dt.setDate(dt.getDate() - i);
      const dateStr = formatLocalDate(dt);
      const log = allLogs[dateStr];
      const doneCount = Object.keys(log?.done || {}).length;

      let color = theme.colors.border;
      if (doneCount >= 4) color = '#10B981';
      else if (doneCount >= 2) color = '#34D399';
      else if (doneCount === 1) color = '#A7F3D0';

      list.push({ dateStr, dayNum: dt.getDate(), doneCount, color, log });
    }
    return list;
  }, [allLogs]);

  // 3. Weekly Table Data (Last 7 Days)
  const weeklyTableRows = useMemo(() => {
    const rows = [];
    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < 7; i++) {
      const dt = new Date();
      dt.setDate(dt.getDate() - i);
      const dateStr = formatLocalDate(dt);
      const log = allLogs[dateStr];

      const doneCount = Object.keys(log?.done || {}).length;
      const donePct = Math.min(100, doneCount * 25);
      const dayLabel = `${DAY_NAMES[dt.getDay()]} ${String(dt.getDate()).padStart(2, '0')}`;

      // Value for each active goal on this date
      const goalValues = activeGoals.map((g) => {
        let valText = '-';
        if (log?.entries?.[g.id] !== undefined && log?.entries?.[g.id] !== null) {
          valText = formatIndianNumber(log.entries[g.id], { unit: g.unit });
        } else if (log?.done) {
          // Check if any subtask done for this goal
          const subtaskDone = Object.keys(log.done).some((tid) => tid.includes(g.id));
          if (subtaskDone) valText = '✓ Done';
        }
        return { goalId: g.id, valText };
      });

      rows.push({
        dateStr,
        dayLabel,
        donePct,
        goalValues,
      });
    }
    return rows;
  }, [allLogs, activeGoals]);

  // Selected Day Detail Log
  const selectedDayLog = selectedDayDate ? allLogs[selectedDayDate] : null;

  // Auto-drafted Weekly Wins and Misses
  const currentWeekKey = `weekly_${todayStr.slice(0, 7)}`;
  const existingReview = reviews.find((r) => r.id === currentWeekKey);

  const autoDraft = useMemo(() => {
    const wins: string[] = [];
    const misses: string[] = [];

    goalProgressList.forEach(({ goal, progress }) => {
      if (progress.status === 'Completed' || progress.status === 'Ahead') {
        wins.push(`On track with ${goal.title} (${progress.valuePct}%)`);
      } else if (progress.status === 'Behind') {
        misses.push(`Behind pace on ${goal.title} (${progress.valuePct}%)`);
      }
    });

    return {
      wins: existingReview?.wins?.join('\n') || (wins.length > 0 ? wins.join('\n') : 'Completed daily consistency targets!'),
      misses: existingReview?.misses?.join('\n') || (misses.length > 0 ? misses.join('\n') : 'Need more focus on weekend habits.'),
      reflections: existingReview?.reflections || '',
    };
  }, [goalProgressList, existingReview]);

  const handleSaveWeeklyReview = async () => {
    const winsArr = (editingWins || autoDraft.wins).split('\n').filter(Boolean);
    const missesArr = (editingMisses || autoDraft.misses).split('\n').filter(Boolean);

    const reviewDoc: WeeklyReview = {
      id: currentWeekKey,
      wins: winsArr,
      misses: missesArr,
      reflections: reflectionsText || autoDraft.reflections,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onSaveReview(reviewDoc);
    Alert.alert('Success', 'Weekly review saved!');
  };

  const handleExportCSVPress = () => {
    const csvContent = onExportCSV();
    if (Platform.OS === 'web' && typeof (globalThis as any).Blob !== 'undefined') {
      const blob = new (globalThis as any).Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = (globalThis as any).document.createElement('a');
      a.href = url;
      a.download = `PACE_export_${todayStr}.csv`;
      a.click();
    } else {
      Alert.alert('CSV Exported', csvContent.slice(0, 300) + '...\n(CSV generated successfully)');
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingBottom: scrollPaddingBottom }]}>
      {/* Top Header & Export CSV */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.headerTitle}>Progress & Analytics</Text>
          <Text style={styles.headerSubtitle}>Pure derived performance insights</Text>
        </View>

        <TouchableOpacity style={styles.exportBtn} onPress={handleExportCSVPress}>
          <Ionicons name="download-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.exportBtnText}>CSV Export</Text>
        </TouchableOpacity>
      </View>

      {/* SUMMARY CARDS */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statVal}>{last7DaysStats.todayPct}%</Text>
          <Text style={styles.statLabel}>Today Done</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statVal}>{last7DaysStats.avg7dPct}%</Text>
          <Text style={styles.statLabel}>7-Day Average</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statVal}>🔥 {last7DaysStats.bestStreak}</Text>
          <Text style={styles.statLabel}>Best Streak</Text>
        </View>
      </View>

      {/* WEEKLY TABLE (Columns: Date, Done %, and Active Goals) */}
      <View style={styles.cardSection}>
        <Text style={styles.cardSectionTitle}>Weekly Overview Table</Text>
        <Text style={styles.cardSectionSubtitle}>Daily performance across active goals (last 7 days)</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ marginTop: 8 }}>
          <View style={styles.tableContainer}>
            {/* Table Header */}
            <View style={styles.tableRowHeader}>
              <Text style={[styles.tableHeaderCell, { width: 85 }]}>Date</Text>
              <Text style={[styles.tableHeaderCell, { width: 70 }]}>Done %</Text>
              {activeGoals.map((g) => (
                <Text key={g.id} style={[styles.tableHeaderCell, { width: 110 }]} numberOfLines={1}>
                  {g.title}
                </Text>
              ))}
            </View>

            {/* Table Rows */}
            {weeklyTableRows.map((row) => (
              <TouchableOpacity
                key={row.dateStr}
                style={styles.tableRow}
                onPress={() => setSelectedDayDate(row.dateStr)}
              >
                <Text style={[styles.tableCell, { width: 85, fontWeight: '600' }]}>{row.dayLabel}</Text>
                <Text style={[styles.tableCell, { width: 70, color: row.donePct > 0 ? theme.colors.success : theme.colors.textMuted }]}>
                  {row.donePct}%
                </Text>
                {row.goalValues.map((gv) => (
                  <Text key={gv.goalId} style={[styles.tableCell, { width: 110 }]} numberOfLines={1}>
                    {gv.valText}
                  </Text>
                ))}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* HEATMAP */}
      <View style={styles.cardSection}>
        <Text style={styles.cardSectionTitle}>Completion Heatmap (Last 28 Days)</Text>
        <Text style={styles.cardSectionSubtitle}>Tap a day to inspect completed tasks & entries</Text>

        <View style={styles.heatmapGrid}>
          {heatmapDays.map((item) => (
            <TouchableOpacity
              key={item.dateStr}
              style={[styles.heatmapSquare, { backgroundColor: item.color }]}
              onPress={() => setSelectedDayDate(item.dateStr)}
            >
              <Text style={styles.heatmapDayText}>{item.dayNum}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* PER-CATEGORY SUMMARY */}
      <View style={styles.cardSection}>
        <Text style={styles.cardSectionTitle}>Per-Category Summary</Text>
        {goals.length === 0 ? (
          <Text style={styles.emptyText}>No goals created yet.</Text>
        ) : (
          goalProgressList.map(({ goal, progress }) => (
            <View key={goal.id} style={styles.categoryRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.categoryGoalTitle}>{goal.title}</Text>
                <Text style={styles.categoryBadge}>{goal.category} · {goal.type.replace('_', ' ')}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.categoryPct, { color: progress.statusColor }]}>{progress.valuePct}%</Text>
                <Text style={styles.categoryStatus}>{progress.status}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* WEEKLY REVIEW AT BOTTOM */}
      <View style={styles.cardSection}>
        <Text style={styles.cardSectionTitle}>Weekly Review (Auto-Drafted)</Text>

        <Text style={styles.fieldLabel}>🏆 Wins</Text>
        <TextInput
          style={styles.reviewInput}
          multiline
          numberOfLines={3}
          value={editingWins !== '' ? editingWins : autoDraft.wins}
          onChangeText={setEditingWins}
        />

        <Text style={styles.fieldLabel}>⚠️ Misses & Focus</Text>
        <TextInput
          style={styles.reviewInput}
          multiline
          numberOfLines={3}
          value={editingMisses !== '' ? editingMisses : autoDraft.misses}
          onChangeText={setEditingMisses}
        />

        <Text style={styles.fieldLabel}>📝 Reflections & Next Week Plan</Text>
        <TextInput
          style={styles.reviewInput}
          multiline
          numberOfLines={2}
          placeholder="Reflect on your pace..."
          placeholderTextColor={theme.colors.textMuted}
          value={reflectionsText !== '' ? reflectionsText : autoDraft.reflections}
          onChangeText={setReflectionsText}
        />

        <TouchableOpacity style={styles.saveReviewBtn} onPress={handleSaveWeeklyReview}>
          <Text style={styles.saveReviewBtnText}>Save Weekly Review</Text>
        </TouchableOpacity>
      </View>

      {/* DAY DETAIL MODAL */}
      <Modal visible={Boolean(selectedDayDate)} transparent animationType="fade" onRequestClose={() => setSelectedDayDate(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Day Detail ({selectedDayDate})</Text>
              <TouchableOpacity onPress={() => setSelectedDayDate(null)}>
                <Ionicons name="close" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {selectedDayLog ? (
              <ScrollView style={{ maxHeight: 300, marginVertical: 12 }}>
                <Text style={styles.detailHeading}>Done Tasks:</Text>
                {Object.keys(selectedDayLog.done || {}).length === 0 ? (
                  <Text style={styles.emptyText}>No tasks completed on this date.</Text>
                ) : (
                  Object.entries(selectedDayLog.done || {}).map(([tId, val]) => (
                    <View key={tId} style={styles.logDetailItem}>
                      <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
                      <Text style={styles.logDetailText}>
                        Task: {tId.slice(0, 16)} {typeof val === 'number' ? `(Amount: ${val})` : ''}
                      </Text>
                    </View>
                  ))
                )}

                <Text style={[styles.detailHeading, { marginTop: 12 }]}>Direct Goal Entries:</Text>
                {Object.keys(selectedDayLog.entries || {}).length === 0 ? (
                  <Text style={styles.emptyText}>No direct goal entries logged.</Text>
                ) : (
                  Object.entries(selectedDayLog.entries || {}).map(([gId, val]) => (
                    <View key={gId} style={styles.logDetailItem}>
                      <Ionicons name="analytics" size={16} color={theme.colors.secondary} />
                      <Text style={styles.logDetailText}>Goal Value: {val}</Text>
                    </View>
                  ))
                )}
              </ScrollView>
            ) : (
              <Text style={styles.emptyText}>No log found for this date.</Text>
            )}

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedDayDate(null)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { ...theme.typography.titleLarge, color: theme.colors.text, fontWeight: '800' },
  headerSubtitle: { ...theme.typography.bodySmall, color: theme.colors.textSecondary },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primaryLight, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  exportBtnText: { ...theme.typography.button, color: theme.colors.primary, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: theme.colors.cardBackground, padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
  statVal: { ...theme.typography.titleLarge, color: theme.colors.text, fontWeight: '800' },
  statLabel: { ...theme.typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
  cardSection: { backgroundColor: theme.colors.cardBackground, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 16 },
  cardSectionTitle: { ...theme.typography.titleSmall, color: theme.colors.text, fontWeight: '700' },
  cardSectionSubtitle: { ...theme.typography.caption, color: theme.colors.textSecondary, marginBottom: 12 },
  tableContainer: { minWidth: '100%' },
  tableRowHeader: { flexDirection: 'row', backgroundColor: theme.colors.background, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 6 },
  tableHeaderCell: { ...theme.typography.caption, color: theme.colors.textSecondary, fontWeight: '700' },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: theme.colors.border + '40', alignItems: 'center' },
  tableCell: { ...theme.typography.bodySmall, color: theme.colors.text },
  heatmapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heatmapSquare: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  heatmapDayText: { ...theme.typography.caption, color: '#FFF', fontWeight: '700' },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border + '50' },
  categoryGoalTitle: { ...theme.typography.bodyMedium, color: theme.colors.text, fontWeight: '600' },
  categoryBadge: { ...theme.typography.caption, color: theme.colors.textSecondary },
  categoryPct: { ...theme.typography.titleSmall, fontWeight: '700' },
  categoryStatus: { ...theme.typography.caption, color: theme.colors.textMuted },
  fieldLabel: { ...theme.typography.bodySmall, color: theme.colors.text, fontWeight: '600', marginTop: 10 },
  reviewInput: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, padding: 10, color: theme.colors.text, marginTop: 4, ...theme.typography.bodySmall, textAlignVertical: 'top' },
  saveReviewBtn: { backgroundColor: theme.colors.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 14 },
  saveReviewBtnText: { ...theme.typography.button, color: '#FFF', fontWeight: '700' },
  emptyText: { ...theme.typography.bodySmall, color: theme.colors.textMuted, fontStyle: 'italic', marginVertical: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 360, backgroundColor: theme.colors.cardBackground, borderRadius: 14, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { ...theme.typography.titleMedium, color: theme.colors.text, fontWeight: '700' },
  detailHeading: { ...theme.typography.bodySmall, color: theme.colors.text, fontWeight: '700' },
  logDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 4 },
  logDetailText: { ...theme.typography.caption, color: theme.colors.textSecondary },
  modalCloseBtn: { marginTop: 12, backgroundColor: theme.colors.border, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  modalCloseText: { ...theme.typography.button, color: theme.colors.text },
});
