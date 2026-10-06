import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { DailyLog } from '@/types/tracker';
import { calculateDailySnapshot } from '@/lib/analytics/completion';
import { calculateMonthSummary, getCompletionCellColor } from '@/lib/analytics/calendar';
import { DailySnapshot } from '@/types/calendar';

interface Props {
  logs: Record<string, DailyLog>;
  onUpdateLog: (log: DailyLog) => void;
  onSelectDate: (dateStr: string) => void;
  scrollPaddingBottom?: number;
}

export const CalendarView: React.FC<Props> = ({ logs, onUpdateLog, onSelectDate, scrollPaddingBottom = 100 }) => {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1); // 1 - 12
  const [selectedHabitFilter, setSelectedHabitFilter] = useState<string>('All');
  const [activeSnapshot, setActiveSnapshot] = useState<DailySnapshot | null>(null);

  const monthSummary = calculateMonthSummary(currentYear, currentMonth, logs);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleJumpToToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);
  };

  // Generate Month Days Grid Matrix
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayWeekday = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 = Sun

  const daysGrid: (string | null)[] = [];
  for (let i = 0; i < firstDayWeekday; i++) {
    daysGrid.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    daysGrid.push(dateStr);
  }

  const handleDayPress = (dateStr: string) => {
    const snap = calculateDailySnapshot(dateStr, logs[dateStr]);
    setActiveSnapshot(snap);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]} showsVerticalScrollIndicator={false}>
      {/* Month Navigator Header */}
      <View style={styles.bannerCard}>
        <View style={styles.monthNavRow}>
          <TouchableOpacity style={styles.navBtn} onPress={handlePrevMonth}>
            <Text style={styles.navBtnText}>‹ Prev</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.monthTitleBox} onPress={handleJumpToToday}>
            <Text style={styles.monthTitleText}>
              {monthSummary.monthName} {currentYear}
            </Text>
            <Text style={styles.todaySubText}>Tap to jump to Today</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navBtn} onPress={handleNextMonth}>
            <Text style={styles.navBtnText}>Next ›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Month Summary Header Stats Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 {monthSummary.monthName} Summary Performance</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{monthSummary.avgCompletionPct}%</Text>
            <Text style={styles.statLbl}>Avg Completion</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statVal}>{monthSummary.perfectDaysCount}</Text>
            <Text style={styles.statLbl}>Perfect 100% Days</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statVal}>{monthSummary.bestDay ? monthSummary.bestDay.slice(8) : '--'}</Text>
            <Text style={styles.statLbl}>Best Day</Text>
          </View>
        </View>
      </View>

      {/* Habit Filter Bar */}
      <View style={styles.filterCard}>
        <Text style={styles.filterLabel}>Single Habit Filter:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPills}>
          {['All', 'Steps', 'Workout', 'DSA', 'Jobs', 'Food'].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.pill, selectedHabitFilter === f && styles.pillActive]}
              onPress={() => setSelectedHabitFilter(f)}
            >
              <Text style={[styles.pillText, selectedHabitFilter === f && styles.pillTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Month Grid */}
      <View style={styles.card}>
        <View style={styles.weekdaysRow}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((wd) => (
            <Text key={wd} style={styles.weekdayHeader}>{wd}</Text>
          ))}
        </View>

        <View style={styles.gridMatrix}>
          {daysGrid.map((dateStr, idx) => {
            if (!dateStr) {
              return <View key={`empty-${idx}`} style={styles.cellEmpty} />;
            }

            const dayNum = dateStr.slice(8);
            const log = logs[dateStr];
            const snap = calculateDailySnapshot(dateStr, log);
            const cellColor = getCompletionCellColor(log ? snap.completionPercent : null);

            return (
              <TouchableOpacity
                key={dateStr}
                style={[styles.dayCell, { backgroundColor: cellColor }]}
                onPress={() => handleDayPress(dateStr)}
              >
                <Text style={styles.dayNumText}>{dayNum}</Text>
                {log ? <Text style={styles.dayPctText}>{snap.completionPercent}%</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}><View style={[styles.legendBox, { backgroundColor: '#2B8A3E' }]} /><Text style={styles.legendText}>100%</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendBox, { backgroundColor: '#51CF66' }]} /><Text style={styles.legendText}>80-99%</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendBox, { backgroundColor: '#FCC419' }]} /><Text style={styles.legendText}>50-79%</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendBox, { backgroundColor: '#FF922B' }]} /><Text style={styles.legendText}>1-49%</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendBox, { backgroundColor: '#FF6B6B' }]} /><Text style={styles.legendText}>0%</Text></View>
        </View>
      </View>

      {/* Day Detail Sheet Modal */}
      {activeSnapshot && (
        <Modal visible animationType="slide" transparent onRequestClose={() => setActiveSnapshot(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.sheetCard}>
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>{activeSnapshot.date} ({activeSnapshot.dayOfWeek})</Text>
                  <Text style={styles.sheetSub}>Completion Score: {activeSnapshot.completionPercent}%</Text>
                </View>
                <TouchableOpacity style={styles.closeSheetBtn} onPress={() => setActiveSnapshot(null)}>
                  <Text style={styles.closeSheetText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.sheetContent}>
                <Text style={styles.sheetSectionTitle}>Task & Habit Breakdown</Text>
                {activeSnapshot.tasks.map((t) => (
                  <View key={t.taskId} style={styles.taskRow}>
                    <View style={styles.taskLeft}>
                      <Text style={styles.taskIcon}>{t.status === 'done' ? '✅' : t.status === 'partial' ? '🌓' : '❌'}</Text>
                      <Text style={styles.taskTitleText}>{t.title}</Text>
                    </View>
                    <Text style={styles.taskValText}>{t.actualValue} / {t.targetValue} {t.unit || ''}</Text>
                  </View>
                ))}

                {activeSnapshot.notes ? (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesTitle}>Reflection Note:</Text>
                    <Text style={styles.notesBody}>{activeSnapshot.notes}</Text>
                  </View>
                ) : null}
              </ScrollView>

              <TouchableOpacity
                style={styles.editBackfillBtn}
                onPress={() => {
                  const targetDate = activeSnapshot.date;
                  setActiveSnapshot(null);
                  onSelectDate(targetDate);
                }}
              >
                <Text style={styles.editBackfillText}>✏️ Edit / Backfill Entry</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  bannerCard: { backgroundColor: '#0F1021', borderRadius: 16, padding: 16, marginBottom: 16 },
  monthNavRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  navBtn: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  navBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  monthTitleBox: { alignItems: 'center' },
  monthTitleText: { fontSize: 18, color: '#FFFFFF', fontWeight: '800' },
  todaySubText: { fontSize: 11, color: '#8A8FAD', marginTop: 2 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#212529', marginBottom: 12 },
  statsGrid: { flexDirection: 'row', gap: 8 },
  statBox: { flex: 1, backgroundColor: '#F8F9FA', borderRadius: 10, padding: 10, alignItems: 'center' },
  statVal: { fontSize: 16, fontWeight: '800', color: '#007AFF' },
  statLbl: { fontSize: 10, color: '#6C757D', marginTop: 2, textAlign: 'center' },
  filterCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 16 },
  filterLabel: { fontSize: 12, fontWeight: '600', color: '#495057', marginBottom: 6 },
  filterPills: { gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: '#E9ECEF' },
  pillActive: { backgroundColor: '#007AFF' },
  pillText: { fontSize: 11, color: '#495057', fontWeight: '600' },
  pillTextActive: { color: '#FFFFFF' },
  weekdaysRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  weekdayHeader: { width: 38, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#868E96' },
  gridMatrix: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-start' },
  cellEmpty: { width: 40, height: 40 },
  dayCell: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  dayNumText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  dayPctText: { fontSize: 8, fontWeight: '800', color: '#FFFFFF' },
  legendRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F3F5' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendBox: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: 10, color: '#6C757D' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheetCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#212529' },
  sheetSub: { fontSize: 13, color: '#007AFF', fontWeight: '700', marginTop: 2 },
  closeSheetBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F3F5', alignItems: 'center', justifyContent: 'center' },
  closeSheetText: { fontSize: 14, fontWeight: '700', color: '#495057' },
  sheetContent: { marginBottom: 16 },
  sheetSectionTitle: { fontSize: 14, fontWeight: '700', color: '#343A40', marginBottom: 10 },
  taskRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F8F9FA' },
  taskLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  taskIcon: { fontSize: 14 },
  taskTitleText: { fontSize: 13, color: '#212529', flex: 1 },
  taskValText: { fontSize: 12, fontWeight: '700', color: '#495057' },
  notesBox: { backgroundColor: '#F8F9FA', padding: 10, borderRadius: 8, marginTop: 12 },
  notesTitle: { fontSize: 12, fontWeight: '700', color: '#495057' },
  notesBody: { fontSize: 12, color: '#6C757D', marginTop: 2, fontStyle: 'italic' },
  editBackfillBtn: { backgroundColor: '#007AFF', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  editBackfillText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
