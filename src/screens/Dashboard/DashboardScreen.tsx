import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { selectIsSynced } from '@/store/slices/syncSlice';
import { usePersonalOS } from '@/hooks/usePersonalOS';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { BottomTabBar } from '@/components/ui/BottomTabBar';
import type { TabItem } from '@/components/ui/BottomTabBar';

import { TodayView } from '@/components/dashboard/TodayView';
import { GoalsView } from '@/components/dashboard/GoalsView';
import { ProgressView } from '@/components/dashboard/ProgressView';
import { RemindersView } from '@/components/dashboard/RemindersView';

import { ToastContainer } from '@/components/ui/ToastContainer';
import theme from '@/constants/theme';

type AppTab = 'today' | 'goals' | 'progress' | 'reminders';

const TABS: TabItem[] = [
  { key: 'today', label: 'Today', icon: 'sunny-outline', activeIcon: 'sunny' },
  { key: 'goals', label: 'Goals', icon: 'flag-outline', activeIcon: 'flag' },
  { key: 'progress', label: 'Progress', icon: 'analytics-outline', activeIcon: 'analytics' },
  { key: 'reminders', label: 'Reminders', icon: 'notifications-outline', activeIcon: 'notifications' },
];

export const DashboardScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [currentTab, setCurrentTab] = useState<AppTab>('today');
  const isSynced = useSelector(selectIsSynced);

  const data = usePersonalOS();

  const scrollPaddingBottom = theme.layout.tabBarHeight + Math.max(insets.bottom, 8) + 80;
  const contentMaxWidth = Platform.OS === 'web' ? theme.layout.contentMaxWidth : undefined;

  const handleTabPress = useCallback((key: string) => {
    setCurrentTab(key as AppTab);
  }, []);

  const syncBadge = isSynced ? '✅ Synced' : '⏳ Saving…';

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="PACE"
        badgeText={syncBadge}
      />

      {data.loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading PACE…</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={[
            styles.contentArea,
            contentMaxWidth
              ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as any }
              : undefined,
          ]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {currentTab === 'today' && (
            <TodayView
              todayLog={data.todayLog}
              todayStandaloneTasks={data.todayStandaloneTasks}
              goalProgressList={data.goalProgressList}
              onSaveStandaloneTask={data.saveStandaloneTask}
              onDeleteStandaloneTask={data.deleteStandaloneTask}
              onToggleTask={data.toggleTask}
              onLogGoalValue={data.logGoalValue}
              onApplyPaceSuggestion={data.applyPaceSuggestion}
              onUpdateLog={data.updateTodayLog}
              scrollPaddingBottom={scrollPaddingBottom}
            />
          )}

          {currentTab === 'goals' && (
            <GoalsView
              goals={data.goals}
              goalProgressList={data.goalProgressList}
              allLogs={data.allLogs}
              links={data.links}
              onSaveGoal={data.saveGoal}
              onDeleteGoal={data.deleteGoal}
              onSaveGoalTask={data.saveGoalTask}
              onDeleteGoalTask={data.deleteGoalTask}
              onLogGoalValue={data.logGoalValue}
              onApplyPaceSuggestion={data.applyPaceSuggestion}
              onSaveLink={data.saveLink}
              onDeleteLink={data.deleteLink}
              scrollPaddingBottom={scrollPaddingBottom}
            />
          )}

          {currentTab === 'progress' && (
            <ProgressView
              allLogs={data.allLogs}
              goals={data.goals}
              goalProgressList={data.goalProgressList}
              reviews={data.reviews}
              onSaveReview={data.saveReview}
              onExportCSV={data.exportCSV}
              scrollPaddingBottom={scrollPaddingBottom}
            />
          )}

          {currentTab === 'reminders' && (
            <RemindersView
              reminders={data.reminders}
              tasks={data.allUnifiedTasks}
              quietHours={data.quietHours}
              onSaveReminder={data.saveReminder}
              onDeleteReminder={data.deleteReminder}
              onSaveQuietHours={data.saveQuietHours}
              scrollPaddingBottom={scrollPaddingBottom}
            />
          )}
        </KeyboardAvoidingView>
      )}

      <BottomTabBar
        tabs={TABS}
        activeTab={currentTab}
        onTabPress={handleTabPress}
      />

      <ToastContainer />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
});
