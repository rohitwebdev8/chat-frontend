import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { DailyLog } from '@/types/tracker';
import { calculateDailySnapshot } from '@/lib/analytics/completion';

interface Props {
  logs: Record<string, DailyLog>;
  onSelectDate: (dateStr: string) => void;
  onExportCSV: () => string;
  scrollPaddingBottom?: number;
}

type RangeOption = 'this-week' | 'last-week' | 'this-month' | 'last-month' | 'all';

export const TableView: React.FC<Props> = ({ logs, onSelectDate, onExportCSV, scrollPaddingBottom = 100 }) => {
  const [range, setRange] = useState<RangeOption>('this-week');
  const [missedOnly, setMissedOnly] = useState<boolean>(false);
  const [sortField, setSortField] = useState<'date' | 'completionPercent'>('date');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const sortedDates = Object.keys(logs).sort();

  // Filter dates by range
  const filterDatesByRange = (): string[] => {
    const today = new Date();
    if (range === 'this-week') {
      return sortedDates.slice(-7);
    }
    if (range === 'last-week') {
      return sortedDates.slice(-14, -7);
    }
    if (range === 'this-month') {
      const monthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      return sortedDates.filter((d) => d.startsWith(monthPrefix));
    }
    if (range === 'last-month') {
      const prevMonth = today.getMonth() === 0 ? 12 : today.getMonth();
      const prevYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
      const prefix = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
      return sortedDates.filter((d) => d.startsWith(prefix));
    }
    return sortedDates;
  };

  let activeDates = filterDatesByRange();

  if (missedOnly) {
    activeDates = activeDates.filter((dStr) => {
      const snap = calculateDailySnapshot(dStr, logs[dStr]);
      return snap.completionPercent < 80;
    });
  }

  // Sort
  activeDates.sort((a, b) => {
    if (sortField === 'completionPercent') {
      const snapA = calculateDailySnapshot(a, logs[a]);
      const snapB = calculateDailySnapshot(b, logs[b]);
      return sortAsc ? snapA.completionPercent - snapB.completionPercent : snapB.completionPercent - snapA.completionPercent;
    }
    return sortAsc ? a.localeCompare(b) : b.localeCompare(a);
  });

  // Calculate Column Averages & Totals for Footer Row
  let totalSteps = 0;
  let totalWorkout = 0;
  let totalDsa = 0;
  let totalStudy = 0;
  let totalApps = 0;
  let totalCalories = 0;
  let totalProtein = 0;
  let sumCompletion = 0;

  activeDates.forEach((d) => {
    const l = logs[d];
    const snap = calculateDailySnapshot(d, l);
    totalSteps += l.steps || 0;
    if (l.workoutDone || l.gymDone || l.swimmingDone) totalWorkout++;
    totalDsa += l.dsaQuestions || 0;
    totalStudy += (l.reactHours || 0) + (l.backendHours || 0);
    totalApps += l.jobApplications ? l.jobApplications.length : 0;
    totalCalories += l.calories || 0;
    totalProtein += l.protein || 0;
    sumCompletion += snap.completionPercent;
  });

  const count = Math.max(1, activeDates.length);
  const avgSteps = Math.round(totalSteps / count);
  const avgStudy = parseFloat((totalStudy / count).toFixed(1));
  const avgCompletion = Math.round(sumCompletion / count);

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]} showsVerticalScrollIndicator={false}>
      {/* Header Controls */}
      <View style={styles.bannerCard}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.bannerSub}>DATA GRID ARCHIVE</Text>
            <Text style={styles.bannerTitle}>Interactive Table View</Text>
          </View>
          <TouchableOpacity style={styles.exportBtn} onPress={() => Alert.alert('CSV Export', onExportCSV().slice(0, 300))}>
            <Text style={styles.exportBtnText}>📥 Export Range CSV</Text>
          </TouchableOpacity>
        </View>

        {/* Range Selector Bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rangePills}>
          {(['this-week', 'last-week', 'this-month', 'last-month', 'all'] as RangeOption[]).map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.rangePill, range === r && styles.rangePillActive]}
              onPress={() => setRange(r)}
            >
              <Text style={[styles.rangePillText, range === r && styles.rangePillTextActive]}>
                {r.replace('-', ' ')}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.rangePill, missedOnly && styles.missedPillActive]}
            onPress={() => setMissedOnly(!missedOnly)}
          >
            <Text style={[styles.rangePillText, missedOnly && styles.rangePillTextActive]}>
              {missedOnly ? '⚠️ Missed Only (Active)' : 'Filter Missed'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Main Table View */}
      <View style={styles.card}>
        <View style={styles.tableHeaderRow}>
          <Text style={styles.tableTitle}>📋 Range Data ({activeDates.length} Days)</Text>
          <TouchableOpacity onPress={() => { setSortField('completionPercent'); setSortAsc(!sortAsc); }}>
            <Text style={styles.sortBtnText}>Sort by Completion {sortField === 'completionPercent' ? (sortAsc ? '▲' : '▼') : ''}</Text>
          </TouchableOpacity>
        </View>

        {activeDates.length === 0 ? (
          <Text style={styles.emptyText}>No data logs found for this range filter.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.tableScrollContent}>
            <View>
              {/* Sticky Table Header */}
              <View style={styles.tHeader}>
                <Text style={[styles.th, styles.colDate]}>Date</Text>
                <Text style={[styles.th, styles.colMetric]}>Weight</Text>
                <Text style={[styles.th, styles.colMetric]}>Steps</Text>
                <Text style={[styles.th, styles.colMetric]}>Workout</Text>
                <Text style={[styles.th, styles.colMetric]}>DSA</Text>
                <Text style={[styles.th, styles.colMetric]}>Study</Text>
                <Text style={[styles.th, styles.colMetric]}>Jobs</Text>
                <Text style={[styles.th, styles.colMetric]}>Calories</Text>
                <Text style={[styles.th, styles.colMetric]}>Protein</Text>
                <Text style={[styles.th, styles.colScore]}>Score %</Text>
              </View>

              {/* Data Rows */}
              {activeDates.map((dStr) => {
                const l = logs[dStr];
                const snap = calculateDailySnapshot(dStr, l);
                return (
                  <TouchableOpacity
                    key={`tr-${dStr}`}
                    style={styles.tRow}
                    onPress={() => onSelectDate(dStr)}
                  >
                    <Text style={[styles.td, styles.colDate, styles.boldText]}>{l.date.slice(5)} ({l.dayOfWeek.slice(0, 3)})</Text>
                    <Text style={[styles.td, styles.colMetric]}>{l.weight ? `${l.weight}k` : '--'}</Text>
                    <Text style={[styles.td, styles.colMetric]}>{l.steps ? l.steps.toLocaleString() : '0'}</Text>
                    <Text style={[styles.td, styles.colMetric]}>{l.workoutDone || l.gymDone || l.swimmingDone ? '✅' : '❌'}</Text>
                    <Text style={[styles.td, styles.colMetric]}>{l.dsaQuestions || 0}</Text>
                    <Text style={[styles.td, styles.colMetric]}>{(l.reactHours || 0) + (l.backendHours || 0)}h</Text>
                    <Text style={[styles.td, styles.colMetric]}>{l.jobApplications ? l.jobApplications.length : 0}</Text>
                    <Text style={[styles.td, styles.colMetric]}>{l.calories || 0}</Text>
                    <Text style={[styles.td, styles.colMetric]}>{l.protein || 0}g</Text>
                    <View style={[styles.colScore, styles.scoreBadgeCell, { backgroundColor: snap.completionPercent >= 80 ? '#E6FCF5' : snap.completionPercent >= 50 ? '#FFF9DB' : '#FFE3E3' }]}>
                      <Text style={[styles.scoreBadgeCellText, { color: snap.completionPercent >= 80 ? '#0CA678' : snap.completionPercent >= 50 ? '#F59F00' : '#E03131' }]}>
                        {snap.completionPercent}%
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Footer Summary Row */}
              <View style={styles.tFooter}>
                <Text style={[styles.tf, styles.colDate]}>AVG / TOTAL</Text>
                <Text style={[styles.tf, styles.colMetric]}>--</Text>
                <Text style={[styles.tf, styles.colMetric]}>{avgSteps.toLocaleString()}/d</Text>
                <Text style={[styles.tf, styles.colMetric]}>{totalWorkout} days</Text>
                <Text style={[styles.tf, styles.colMetric]}>{totalDsa} Qs</Text>
                <Text style={[styles.tf, styles.colMetric]}>{avgStudy}h/d</Text>
                <Text style={[styles.tf, styles.colMetric]}>{totalApps} total</Text>
                <Text style={[styles.tf, styles.colMetric]}>{Math.round(totalCalories / count)}</Text>
                <Text style={[styles.tf, styles.colMetric]}>{Math.round(totalProtein / count)}g</Text>
                <Text style={[styles.tf, styles.colScore, styles.boldText]}>{avgCompletion}% Avg</Text>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  bannerCard: { backgroundColor: '#0F1021', borderRadius: 16, padding: 18, marginBottom: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  bannerSub: { fontSize: 10, color: '#8A8FAD', fontWeight: '700', letterSpacing: 1 },
  bannerTitle: { fontSize: 20, color: '#FFFFFF', fontWeight: '800', marginTop: 2 },
  exportBtn: { backgroundColor: '#007AFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  exportBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  rangePills: { gap: 6 },
  rangePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', marginRight: 4 },
  rangePillActive: { backgroundColor: '#007AFF' },
  missedPillActive: { backgroundColor: '#DC3545' },
  rangePillText: { fontSize: 12, color: '#BAC2DE', fontWeight: '600', textTransform: 'capitalize' },
  rangePillTextActive: { color: '#FFFFFF', fontWeight: '800' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  tableHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tableTitle: { fontSize: 16, fontWeight: '700', color: '#212529' },
  sortBtnText: { fontSize: 12, color: '#007AFF', fontWeight: '700' },
  emptyText: { fontSize: 13, color: '#868E96', fontStyle: 'italic' },
  tableScrollContent: { paddingBottom: 10 },
  tHeader: { flexDirection: 'row', backgroundColor: '#F1F3F5', paddingVertical: 8, paddingHorizontal: 6, borderRadius: 6 },
  th: { fontSize: 11, fontWeight: '800', color: '#495057', textAlign: 'center' },
  tRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: '#F8F9FA', alignItems: 'center' },
  td: { fontSize: 12, color: '#212529', textAlign: 'center' },
  tFooter: { flexDirection: 'row', backgroundColor: '#E9ECEF', paddingVertical: 10, paddingHorizontal: 6, borderRadius: 6, marginTop: 8 },
  tf: { fontSize: 11, fontWeight: '800', color: '#212529', textAlign: 'center' },
  colDate: { width: 90, textAlign: 'left' },
  colMetric: { width: 65 },
  colScore: { width: 75, alignItems: 'center', justifyContent: 'center' },
  scoreBadgeCell: { borderRadius: 12, paddingVertical: 2, paddingHorizontal: 6, alignItems: 'center' },
  scoreBadgeCellText: { fontSize: 11, fontWeight: '800' },
  boldText: { fontWeight: '700' },
});
