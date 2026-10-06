import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DailyLog } from '@/types/tracker';
import { calculateDailySnapshot } from '@/lib/analytics/completion';
import { calculateMissedHabitsInsights, getCompletionCellColor } from '@/lib/analytics/calendar';

interface Props {
  logs: Record<string, DailyLog>;
  onAddReminderForHabit: (habitTitle: string, weekday: string) => void;
}

export const MissedInsightsCard: React.FC<Props> = ({ logs, onAddReminderForHabit }) => {
  const sortedDates = Object.keys(logs).sort();
  const last7Dates = sortedDates.slice(-7);
  const missedHabits = calculateMissedHabitsInsights(logs);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>📊 "What Did I Miss" Weekly Strip & Insights</Text>

      {/* Weekly 7-Day Completion Strip */}
      <View style={styles.stripContainer}>
        {last7Dates.map((dStr) => {
          const snap = calculateDailySnapshot(dStr, logs[dStr]);
          const cellColor = getCompletionCellColor(snap.completionPercent);

          return (
            <View key={`strip-${dStr}`} style={styles.stripItem}>
              <Text style={styles.stripDayName}>{snap.dayOfWeek.slice(0, 3)}</Text>
              <View style={[styles.stripCircle, { backgroundColor: cellColor }]}>
                <Text style={styles.stripScoreText}>{snap.completionPercent}%</Text>
              </View>
              <Text style={styles.stripDateText}>{dStr.slice(8)}</Text>
            </View>
          );
        })}
      </View>

      {/* Top Missed Habits Ranking List */}
      <Text style={[styles.cardTitle, { marginTop: 16, fontSize: 14 }]}>⚠️ Most Frequently Missed Habits</Text>
      {missedHabits.length === 0 ? (
        <Text style={styles.emptyText}>Awesome job! You haven't missed any habits recently.</Text>
      ) : (
        missedHabits.map((item) => (
          <View key={item.title} style={styles.missedRow}>
            <View style={styles.missedLeft}>
              <Text style={styles.missedHabitTitle}>{item.title}</Text>
              <Text style={styles.missedSub}>
                Missed {item.missedCount} times • Most missed on <Text style={styles.boldText}>{item.mostMissedWeekday}s</Text>
              </Text>
            </View>

            <TouchableOpacity
              style={styles.addNudgeBtn}
              onPress={() => onAddReminderForHabit(item.title, item.mostMissedWeekday)}
            >
              <Text style={styles.addNudgeText}>+ Add Reminder</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#212529', marginBottom: 12 },
  stripContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  stripItem: { alignItems: 'center' },
  stripDayName: { fontSize: 11, fontWeight: '700', color: '#868E96', marginBottom: 4 },
  stripCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  stripScoreText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  stripDateText: { fontSize: 10, color: '#6C757D', marginTop: 4 },
  emptyText: { fontSize: 12, color: '#868E96', fontStyle: 'italic' },
  missedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F8F9FA' },
  missedLeft: { flex: 1, marginRight: 8 },
  missedHabitTitle: { fontSize: 14, fontWeight: '700', color: '#212529' },
  missedSub: { fontSize: 11, color: '#6C757D', marginTop: 2 },
  boldText: { fontWeight: '700', color: '#DC3545' },
  addNudgeBtn: { backgroundColor: '#E7F5FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  addNudgeText: { color: '#007AFF', fontWeight: '700', fontSize: 11 },
});
