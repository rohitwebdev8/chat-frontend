import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Goal, GoalCalculatedProgress } from '@/types/goals';
import { LifeAreaScore, PatternInsight } from '@/lib/analytics/insights';

interface Props {
  lifeScore: number;
  topLackingGoals: { goal: Goal; progress: GoalCalculatedProgress }[];
  topStrengthGoals: { goal: Goal; progress: GoalCalculatedProgress }[];
  lifeAreaScores: LifeAreaScore[];
  detectedPatterns: PatternInsight[];
  actionableSuggestions: string[];
  scrollPaddingBottom?: number;
}

export const InsightsView: React.FC<Props> = ({
  lifeScore,
  topLackingGoals,
  topStrengthGoals,
  lifeAreaScores,
  detectedPatterns,
  actionableSuggestions,
  scrollPaddingBottom = 100,
}) => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]} showsVerticalScrollIndicator={false}>
      {/* Overview Banner */}
      <View style={styles.bannerCard}>
        <Text style={styles.bannerSub}>DIAGNOSTICS & ANALYTICS</Text>
        <Text style={styles.bannerTitle}>"Where Am I Lacking" Engine</Text>
        <Text style={styles.bannerDesc}>
          Real-time rank of your goals from most behind to most ahead with automated behavioral pattern detection.
        </Text>
      </View>

      {/* Top 3 Actionable Suggestions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>💡 Top Actionable Steps Today</Text>
        {actionableSuggestions.map((sug, idx) => (
          <View key={`sug-${idx}`} style={styles.suggestionRow}>
            <Text style={styles.suggestionBullet}>•</Text>
            <Text style={styles.suggestionText}>{sug}</Text>
          </View>
        ))}
      </View>

      {/* Top 3 Lacking Areas */}
      <View style={styles.card}>
        <Text style={[styles.cardTitle, { color: '#DC3545' }]}>⚠️ Top 3 Lacking Areas (Needs Attention)</Text>
        {topLackingGoals.length === 0 ? (
          <Text style={styles.emptyText}>No goals are currently lagging behind!</Text>
        ) : (
          topLackingGoals.map(({ goal, progress }) => (
            <View key={`lacking-${goal.id}`} style={styles.lackingBox}>
              <View style={styles.lackingHeader}>
                <Text style={styles.lackingTitle}>{goal.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: `${progress.statusColor}20` }]}>
                  <Text style={[styles.statusText, { color: progress.statusColor }]}>
                    {progress.statusLabel || progress.status} ({progress.percentComplete ?? progress.valuePct}%)
                  </Text>
                </View>
              </View>
              <Text style={styles.lackingInsight}>{progress.insightText || progress.message}</Text>
              <View style={styles.lackingTrack}>
                <View style={[styles.lackingFill, { width: `${progress.percentComplete ?? progress.valuePct}%`, backgroundColor: progress.statusColor }]} />
              </View>
            </View>
          ))
        )}
      </View>

      {/* Top 3 Strengths */}
      <View style={styles.card}>
        <Text style={[styles.cardTitle, { color: '#28A745' }]}>🌟 Top 3 Strengths (Doing Well)</Text>
        {topStrengthGoals.map(({ goal, progress }) => (
          <View key={`strength-${goal.id}`} style={styles.strengthBox}>
            <View style={styles.lackingHeader}>
              <Text style={styles.lackingTitle}>{goal.title}</Text>
              <View style={[styles.statusBadge, { backgroundColor: '#28A74520' }]}>
                <Text style={[styles.statusText, { color: '#28A745' }]}>
                  {progress.statusLabel} ({progress.percentComplete}%)
                </Text>
              </View>
            </View>
            <Text style={styles.lackingInsight}>
              Streak: {progress.streakCurrent} days 🔥 | 7D Consistency: {progress.consistencyLast7DaysPct}%
            </Text>
          </View>
        ))}
      </View>

      {/* Life Area Balance Bars */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Life Area Balance Scores (0 - 100)</Text>
        {lifeAreaScores.map((area) => (
          <View key={area.category} style={styles.areaRow}>
            <View style={styles.areaInfo}>
              <Text style={styles.areaName}>{area.category}</Text>
              <Text style={styles.areaStatus}>{area.status}</Text>
            </View>

            <View style={styles.areaTrackContainer}>
              <View style={styles.areaTrack}>
                <View style={[styles.areaFill, { width: `${area.score}%`, backgroundColor: area.score >= 80 ? '#28A745' : area.score >= 50 ? '#007AFF' : '#FD7E14' }]} />
              </View>
              <Text style={styles.areaScoreVal}>{area.score}/100</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Automated Pattern Insights */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔍 Detected Behavioral Patterns</Text>
        {detectedPatterns.map((pat) => (
          <View key={pat.id} style={[styles.patternBox, pat.type === 'warning' && styles.patternWarning, pat.type === 'positive' && styles.patternPositive]}>
            <Text style={styles.patternTitle}>{pat.title}</Text>
            <Text style={styles.patternDesc}>{pat.description}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  bannerCard: { backgroundColor: '#0F1021', borderRadius: 16, padding: 18, marginBottom: 16 },
  bannerSub: { fontSize: 10, color: '#8A8FAD', fontWeight: '700', letterSpacing: 1 },
  bannerTitle: { fontSize: 20, color: '#FFFFFF', fontWeight: '800', marginTop: 2 },
  bannerDesc: { fontSize: 12, color: '#BAC2DE', marginTop: 6, lineHeight: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#212529', marginBottom: 12 },
  suggestionRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  suggestionBullet: { fontSize: 16, color: '#007AFF', marginRight: 8, fontWeight: '700' },
  suggestionText: { fontSize: 13, color: '#343A40', flex: 1, lineHeight: 18 },
  emptyText: { fontSize: 13, color: '#868E96', fontStyle: 'italic' },
  lackingBox: { backgroundColor: '#FFF0F0', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#FFC9C9' },
  lackingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lackingTitle: { fontSize: 14, fontWeight: '700', color: '#212529' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  lackingInsight: { fontSize: 12, color: '#495057', marginTop: 4 },
  lackingTrack: { height: 6, backgroundColor: '#E9ECEF', borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  lackingFill: { height: '100%' },
  strengthBox: { backgroundColor: '#E6FCF5', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#96F2D7' },
  areaRow: { marginBottom: 12 },
  areaInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  areaName: { fontSize: 13, fontWeight: '700', color: '#212529' },
  areaStatus: { fontSize: 11, color: '#6C757D' },
  areaTrackContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  areaTrack: { flex: 1, height: 8, backgroundColor: '#E9ECEF', borderRadius: 4, overflow: 'hidden' },
  areaFill: { height: '100%' },
  areaScoreVal: { fontSize: 12, fontWeight: '700', color: '#212529', minWidth: 45, textAlign: 'right' },
  patternBox: { backgroundColor: '#F8F9FA', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#DEE2E6' },
  patternWarning: { backgroundColor: '#FFF9DB', borderColor: '#FFE066' },
  patternPositive: { backgroundColor: '#E7F5FF', borderColor: '#A5D8FF' },
  patternTitle: { fontSize: 13, fontWeight: '700', color: '#212529' },
  patternDesc: { fontSize: 12, color: '#495057', marginTop: 2, lineHeight: 16 },
});
