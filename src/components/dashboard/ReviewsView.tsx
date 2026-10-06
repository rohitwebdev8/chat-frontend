import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Goal, GoalCalculatedProgress, ReviewDoc } from '@/types/goals';
import { loadReviews, saveReview } from '@/services/tracker/reviewService';

interface Props {
  userName: string;
  lifeScore: number;
  goalProgressList: { goal: Goal; progress: GoalCalculatedProgress }[];
  scrollPaddingBottom?: number;
}

export const ReviewsView: React.FC<Props> = ({ userName, lifeScore, goalProgressList, scrollPaddingBottom = 100 }) => {
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly'>('weekly');
  const [reviewsMap, setReviewsMap] = useState<Record<string, ReviewDoc>>({});
  const [loading, setLoading] = useState<boolean>(true);

  // Review Form state
  const [wins, setWins] = useState<string>('');
  const [misses, setMisses] = useState<string>('');
  const [reflections, setReflections] = useState<string>('');
  const [nextFocus, setNextFocus] = useState<string>('');
  const [customScore, setCustomScore] = useState<string>(String(lifeScore));

  const currentPeriodId = activeTab === 'weekly' ? `weekly_${new Date().getFullYear()}_W${getWeekNumber(new Date())}` : `monthly_${new Date().getFullYear()}_M${new Date().getMonth() + 1}`;

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadReviews(userName);
      setReviewsMap(data);

      const existing = data[currentPeriodId];
      if (existing) {
        setWins(existing.wins ? existing.wins.join('\n') : '');
        setMisses(existing.misses ? existing.misses.join('\n') : '');
        setReflections(existing.reflections || '');
        setNextFocus(existing.nextPeriodFocus || '');
        setCustomScore(String(existing.overallScore || lifeScore));
      } else {
        setWins('');
        setMisses('');
        setReflections('');
        setNextFocus('');
        setCustomScore(String(lifeScore));
      }
    } catch (e) {
      console.error('Failed to load reviews:', e);
    } finally {
      setLoading(false);
    }
  }, [userName, currentPeriodId, lifeScore]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSaveReview = async () => {
    const scoreNum = Math.min(100, Math.max(0, parseInt(customScore, 10) || lifeScore));
    const winList = wins.split('\n').filter((w) => w.trim().length > 0);
    const missList = misses.split('\n').filter((m) => m.trim().length > 0);

    const docToSave: ReviewDoc = {
      id: currentPeriodId,
      periodType: activeTab,
      dateKey: currentPeriodId,
      overallScore: scoreNum,
      wins: winList,
      misses: missList,
      reflections: reflections.trim(),
      nextPeriodFocus: nextFocus.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveReview(docToSave, userName);
      Alert.alert('Review Saved', `${activeTab === 'weekly' ? 'Weekly' : 'Monthly'} review successfully saved to Firestore!`);
      fetchReviews();
    } catch (err) {
      Alert.alert('Error', 'Failed to save review.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      {/* Top Banner */}
      <View style={styles.bannerCard}>
        <Text style={styles.bannerSub}>PERSONAL OPERATING SYSTEM</Text>
        <Text style={styles.bannerTitle}>Review & Reflection Engine</Text>
        <Text style={styles.bannerDesc}>
          Auto-generated weekly & monthly review summaries saved to Firestore at users/{userName}/reviews.
        </Text>

        {/* Tab Selector */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'weekly' && styles.tabBtnActive]}
            onPress={() => setActiveTab('weekly')}
          >
            <Text style={[styles.tabText, activeTab === 'weekly' && styles.tabTextActive]}>
              📅 Weekly Review
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'monthly' && styles.tabBtnActive]}
            onPress={() => setActiveTab('monthly')}
          >
            <Text style={[styles.tabText, activeTab === 'monthly' && styles.tabTextActive]}>
              🗓️ Monthly Review
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Review Form Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>
            {activeTab === 'weekly' ? '📅 Weekly Retrospective & Focus' : '🗓️ Monthly Master Review'}
          </Text>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreBadgeText}>Life Score: {customScore}/100</Text>
          </View>
        </View>

        {/* Wins Section */}
        <Text style={styles.label}>🏆 Wins & Achievements (1 per line)</Text>
        <TextInput
          style={[styles.inputField, styles.textArea]}
          multiline
          numberOfLines={3}
          placeholder="Hit 10k steps 5 times&#10;Solved 15 DSA questions&#10;Submitted 10 job apps"
          value={wins}
          onChangeText={setWins}
        />

        {/* Misses Section */}
        <Text style={[styles.label, { marginTop: 10 }]}>⚠️ Misses & Bottlenecks (1 per line)</Text>
        <TextInput
          style={[styles.inputField, styles.textArea]}
          multiline
          numberOfLines={3}
          placeholder="Skipped Saturday workout&#10;Exceeded calorie limit on Friday"
          value={misses}
          onChangeText={setMisses}
        />

        {/* Reflections */}
        <Text style={[styles.label, { marginTop: 10 }]}>📝 Retrospective Reflections</Text>
        <TextInput
          style={[styles.inputField, styles.textArea]}
          multiline
          numberOfLines={3}
          placeholder="What lessons did you learn? How did your energy feel?"
          value={reflections}
          onChangeText={setReflections}
        />

        {/* Next Period Focus */}
        <Text style={[styles.label, { marginTop: 10 }]}>🎯 Next Period Focus & Strategy</Text>
        <TextInput
          style={[styles.inputField, styles.textArea]}
          multiline
          numberOfLines={3}
          placeholder="What are the top 3 priorities for next week/month?"
          value={nextFocus}
          onChangeText={setNextFocus}
        />

        {/* Save Button */}
        <TouchableOpacity style={styles.saveReviewBtn} onPress={handleSaveReview}>
          <Text style={styles.saveReviewText}>Save Review to Firestore</Text>
        </TouchableOpacity>
      </View>

      {/* Historical Reviews List */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📜 Past Reviews Archive ({Object.keys(reviewsMap).length})</Text>
        {Object.keys(reviewsMap).length === 0 ? (
          <Text style={styles.emptyText}>No reviews saved yet.</Text>
        ) : (
          Object.keys(reviewsMap).map((revId) => {
            const rev = reviewsMap[revId];
            return (
              <View key={revId} style={styles.pastReviewBox}>
                <View style={styles.pastReviewHeader}>
                  <Text style={styles.pastReviewTitle}>{rev.id}</Text>
                  <Text style={styles.pastReviewScore}>{rev.overallScore}/100 Score</Text>
                </View>
                {rev.nextPeriodFocus ? (
                  <Text style={styles.pastReviewSub}>Focus: {rev.nextPeriodFocus}</Text>
                ) : null}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
};

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  bannerCard: { backgroundColor: '#0F1021', borderRadius: 16, padding: 18, marginBottom: 16 },
  bannerSub: { fontSize: 10, color: '#8A8FAD', fontWeight: '700', letterSpacing: 1 },
  bannerTitle: { fontSize: 20, color: '#FFFFFF', fontWeight: '800', marginTop: 2 },
  bannerDesc: { fontSize: 12, color: '#BAC2DE', marginTop: 4, lineHeight: 16 },
  tabsRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  tabBtn: { flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#007AFF' },
  tabText: { color: '#BAC2DE', fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#FFFFFF', fontWeight: '700' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#212529' },
  scoreBadge: { backgroundColor: '#E7F5FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  scoreBadgeText: { fontSize: 12, fontWeight: '700', color: '#007AFF' },
  label: { fontSize: 12, fontWeight: '600', color: '#495057', marginBottom: 4 },
  inputField: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#CED4DA', borderRadius: 10, padding: 10, fontSize: 13, color: '#212529' },
  textArea: { height: 75, textAlignVertical: 'top' },
  saveReviewBtn: { backgroundColor: '#28A745', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  saveReviewText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  emptyText: { fontSize: 13, color: '#868E96', fontStyle: 'italic' },
  pastReviewBox: { backgroundColor: '#F8F9FA', borderRadius: 10, padding: 12, marginBottom: 8 },
  pastReviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pastReviewTitle: { fontSize: 14, fontWeight: '700', color: '#212529' },
  pastReviewScore: { fontSize: 12, fontWeight: '700', color: '#007AFF' },
  pastReviewSub: { fontSize: 12, color: '#6C757D', marginTop: 4 },
});
