import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { DailyLog } from '@/types/tracker';

interface Props {
  logs: Record<string, DailyLog>;
  onExportCSV: () => string;
  onExportJSON: () => string;
  onSelectDate: (dateStr: string) => void;
}

export const HistoryView: React.FC<Props> = ({
  logs,
  onExportCSV,
  onExportJSON,
  onSelectDate,
}) => {
  const sortedDates = Object.keys(logs).sort();
  const recent14 = sortedDates.slice(-14);

  // Weight Chart Data
  const weightData = recent14
    .map((d) => ({
      value: logs[d].weight || 0,
      label: d.slice(8), // day number
    }))
    .filter((item) => item.value > 0);

  // Steps Chart Data
  const stepsData = recent14.map((d) => ({
    value: logs[d].steps || 0,
    label: d.slice(8),
    frontColor: (logs[d].steps || 0) >= 8000 ? '#28A745' : '#007AFF',
  }));

  // Study Hours Chart Data
  const studyData = recent14.map((d) => ({
    value: (logs[d].reactHours || 0) + (logs[d].backendHours || 0),
    label: d.slice(8),
  }));

  const handleExportCSV = () => {
    const csvContent = onExportCSV();
    Alert.alert('CSV Data Export Ready', `Exported ${Object.keys(logs).length} daily records!\n\nFirst 200 chars:\n${csvContent.slice(0, 200)}...`);
  };

  const handleExportJSON = () => {
    const jsonContent = onExportJSON();
    Alert.alert('JSON Data Export Ready', `Exported full database state!\n\nFirst 200 chars:\n${jsonContent.slice(0, 200)}...`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Banner */}
      <View style={styles.bannerCard}>
        <View style={styles.bannerRow}>
          <View>
            <Text style={styles.bannerSub}>VISUAL ANALYTICS & ARCHIVE</Text>
            <Text style={styles.bannerTitle}>History & Charts</Text>
          </View>
          <View style={styles.exportBtns}>
            <TouchableOpacity style={styles.exportBtn} onPress={handleExportCSV}>
              <Text style={styles.exportBtnText}>📥 CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportBtn} onPress={handleExportJSON}>
              <Text style={styles.exportBtnText}>💾 JSON</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* GitHub-style Calendar Heatmap Grid */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🟩 GitHub-Style Completion Heatmap</Text>
        <Text style={styles.cardSub}>Green intensity shows your daily completion score.</Text>

        <View style={styles.heatmapGrid}>
          {sortedDates.slice(-28).map((dStr) => {
            const pct = logs[dStr].dailyCompletionPct || 0;
            let bg = '#EBEDF0';
            if (pct >= 80) bg = '#216E39';
            else if (pct >= 50) bg = '#30A14E';
            else if (pct >= 20) bg = '#40C463';
            else if (pct > 0) bg = '#9BE9A8';

            return (
              <TouchableOpacity
                key={`heat-${dStr}`}
                style={[styles.heatmapSquare, { backgroundColor: bg }]}
                onPress={() => onSelectDate(dStr)}
              >
                <Text style={styles.heatmapDayText}>{dStr.slice(8)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Line Chart: Weight Trend */}
      {weightData.length > 1 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📈 Weight Loss Trend Line</Text>
          <View style={styles.chartContainer}>
            <LineChart
              data={weightData}
              color="#007AFF"
              thickness={3}
              dataPointsColor="#007AFF"
              height={160}
              noOfSections={4}
              yAxisTextStyle={{ fontSize: 10, color: '#868E96' }}
              xAxisLabelTextStyle={{ fontSize: 10, color: '#868E96' }}
            />
          </View>
        </View>
      )}

      {/* Bar Chart: Steps */}
      {stepsData.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 14-Day Step Count Totals</Text>
          <View style={styles.chartContainer}>
            <BarChart
              data={stepsData}
              barWidth={14}
              spacing={10}
              height={150}
              noOfSections={4}
              yAxisTextStyle={{ fontSize: 10, color: '#868E96' }}
              xAxisLabelTextStyle={{ fontSize: 10, color: '#868E96' }}
            />
          </View>
        </View>
      )}

      {/* Line Chart: Study Hours */}
      {studyData.length > 1 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💻 Study Hours Trend</Text>
          <View style={styles.chartContainer}>
            <LineChart
              data={studyData}
              color="#7950F2"
              thickness={3}
              dataPointsColor="#7950F2"
              height={150}
              noOfSections={3}
              yAxisTextStyle={{ fontSize: 10, color: '#868E96' }}
              xAxisLabelTextStyle={{ fontSize: 10, color: '#868E96' }}
            />
          </View>
        </View>
      )}

      {/* Historical Logs List */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📅 Past Log Archive ({sortedDates.length} Days Logged)</Text>
        {sortedDates.slice().reverse().map((dStr) => {
          const l = logs[dStr];
          return (
            <TouchableOpacity key={dStr} style={styles.logRow} onPress={() => onSelectDate(dStr)}>
              <View>
                <Text style={styles.logDate}>{l.date} ({l.dayOfWeek})</Text>
                <Text style={styles.logMeta}>
                  Day #{l.dayNumber} • Weight: {l.weight ? `${l.weight}kg` : '--'} • Steps: {l.steps} • Apps: {l.jobApplications?.length || 0}
                </Text>
              </View>
              <Text style={styles.logScore}>{l.dailyCompletionPct}%</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  bannerCard: { backgroundColor: '#0F1021', borderRadius: 16, padding: 18, marginBottom: 16 },
  bannerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bannerSub: { fontSize: 10, color: '#8A8FAD', fontWeight: '700', letterSpacing: 1 },
  bannerTitle: { fontSize: 20, color: '#FFFFFF', fontWeight: '800', marginTop: 2 },
  exportBtns: { flexDirection: 'row', gap: 6 },
  exportBtn: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  exportBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#212529', marginBottom: 4 },
  cardSub: { fontSize: 12, color: '#868E96', marginBottom: 12 },
  heatmapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  heatmapSquare: { width: 34, height: 34, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  heatmapDayText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  chartContainer: { marginTop: 10, alignItems: 'center' },
  logRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F8F9FA' },
  logDate: { fontSize: 14, fontWeight: '700', color: '#212529' },
  logMeta: { fontSize: 11, color: '#6C757D', marginTop: 2 },
  logScore: { fontSize: 13, fontWeight: '800', color: '#007AFF' },
});
