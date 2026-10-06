import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { DailyLog } from '@/types/tracker';
import { Goal, GoalCalculatedProgress } from '@/types/goals';
import { Reminder, QuietHours } from '@/types/reminders';
import {
  getTodayDateString,
  getDayNumber,
  createDefaultLog,
  loadAllLogs,
  saveDailyLog,
  calculateWeeklyStats,
  WeeklyStats,
} from '@/services/tracker/trackerService';
import { loadGoals, saveSingleGoal, deleteGoal as removeGoalService } from '@/services/tracker/goalsService';
import {
  loadReminders,
  saveSingleReminder as saveReminderService,
  deleteReminder as removeReminderService,
  loadQuietHours,
  saveQuietHours as saveQuietHoursService,
} from '@/services/tracker/remindersService';
import {
  initReminderNotificationService,
  syncLocalScheduledReminders,
  sendImmediateTestNotification,
} from '@/services/notifications/reminderNotificationService';
import { calculateGoalProgress } from '@/lib/analytics/goalProgress';
import {
  calculateLifeScore,
  rankGoals,
  calculateLifeAreaScores,
  detectPatterns,
  generateActionableSuggestions,
  LifeAreaScore,
  PatternInsight,
} from '@/lib/analytics/insights';

export interface TrackerDataResult {
  userName: string;
  selectedDate: string;
  setSelectedDate: (dateStr: string) => void;
  todayDate: string;

  logs: Record<string, DailyLog>;
  currentLog: DailyLog | null;
  goals: Goal[];
  goalProgressList: { goal: Goal; progress: GoalCalculatedProgress }[];

  reminders: Reminder[];
  quietHours: QuietHours;

  weeklyStats: WeeklyStats | null;
  lifeScore: number;
  topLackingGoals: { goal: Goal; progress: GoalCalculatedProgress }[];
  topStrengthGoals: { goal: Goal; progress: GoalCalculatedProgress }[];
  lifeAreaScores: LifeAreaScore[];
  detectedPatterns: PatternInsight[];
  actionableSuggestions: string[];

  loading: boolean;
  saving: boolean;

  refreshData: () => Promise<void>;
  updateCurrentLog: (updatedLog: DailyLog) => Promise<void>;
  saveGoal: (goal: Goal) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  saveReminder: (reminder: Reminder) => Promise<void>;
  deleteReminder: (reminderId: string) => Promise<void>;
  saveQuietHours: (qh: QuietHours) => Promise<void>;
  sendTestNotification: (reminder: Reminder) => Promise<void>;
  exportDataCSV: () => string;
  exportDataJSON: () => string;
}

export function useTrackerData(): TrackerDataResult {
  const userName = useSelector((state: RootState) => state.user.name) || 'User';
  const todayDate = getTodayDateString();

  const [selectedDate, setSelectedDate] = useState<string>(todayDate);
  const [logs, setLogs] = useState<Record<string, DailyLog>>({});
  const [currentLog, setCurrentLog] = useState<DailyLog | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [quietHours, setQuietHoursState] = useState<QuietHours>({ enabled: true, startHour: 23, endHour: 6 });

  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [lifeScore, setLifeScore] = useState<number>(80);
  const [topLackingGoals, setTopLackingGoals] = useState<{ goal: Goal; progress: GoalCalculatedProgress }[]>([]);
  const [topStrengthGoals, setTopStrengthGoals] = useState<{ goal: Goal; progress: GoalCalculatedProgress }[]>([]);
  const [lifeAreaScores, setLifeAreaScores] = useState<LifeAreaScore[]>([]);
  const [detectedPatterns, setDetectedPatterns] = useState<PatternInsight[]>([]);
  const [actionableSuggestions, setActionableSuggestions] = useState<string[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Initialize Notification Channel & Categories once
  useEffect(() => {
    initReminderNotificationService();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [fetchedLogs, fetchedGoals, fetchedReminders, fetchedQH] = await Promise.all([
        loadAllLogs(userName),
        loadGoals(userName),
        loadReminders(userName),
        loadQuietHours(),
      ]);

      setLogs(fetchedLogs);
      setGoals(fetchedGoals);
      setQuietHoursState(fetchedQH);

      // Selected date log
      let activeLog = fetchedLogs[selectedDate];
      if (!activeLog) {
        const dayNum = await getDayNumber(selectedDate);
        activeLog = createDefaultLog(selectedDate, dayNum);
      }
      setCurrentLog(activeLog);

      // Schedule rolling notifications
      await syncLocalScheduledReminders(fetchedReminders, activeLog as any, fetchedQH);
      setReminders(fetchedReminders);

      // Calculations
      setWeeklyStats(calculateWeeklyStats(fetchedLogs));
      setLifeScore(calculateLifeScore(fetchedGoals, fetchedLogs));

      const { topLacking, topStrengths } = rankGoals(fetchedGoals, fetchedLogs);
      setTopLackingGoals(topLacking);
      setTopStrengthGoals(topStrengths);

      setLifeAreaScores(calculateLifeAreaScores(fetchedGoals, fetchedLogs));
      setDetectedPatterns(detectPatterns(fetchedLogs));
      setActionableSuggestions(generateActionableSuggestions(topLacking));
    } catch (err) {
      console.error('Failed to load tracker data:', err);
    } finally {
      setLoading(false);
    }
  }, [userName, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateCurrentLog = async (updatedLog: DailyLog) => {
    setSaving(true);
    try {
      const { updatedLog: finalLog, allLogs: updatedLogs } = await saveDailyLog(updatedLog, userName);
      setCurrentLog(finalLog);
      setLogs(updatedLogs);

      await syncLocalScheduledReminders(reminders, finalLog as any, quietHours);
      setReminders(reminders);

      setWeeklyStats(calculateWeeklyStats(updatedLogs));
      setLifeScore(calculateLifeScore(goals, updatedLogs));

      const { topLacking, topStrengths } = rankGoals(goals, updatedLogs);
      setTopLackingGoals(topLacking);
      setTopStrengthGoals(topStrengths);

      setLifeAreaScores(calculateLifeAreaScores(goals, updatedLogs));
      setDetectedPatterns(detectPatterns(updatedLogs));
      setActionableSuggestions(generateActionableSuggestions(topLacking));
    } catch (err) {
      console.error('Error updating daily log:', err);
    } finally {
      setSaving(false);
    }
  };

  const saveGoal = async (goal: Goal) => {
    setSaving(true);
    try {
      const updatedGoals = await saveSingleGoal(goal, userName);
      setGoals(updatedGoals);
      setLifeScore(calculateLifeScore(updatedGoals, logs));

      const { topLacking, topStrengths } = rankGoals(updatedGoals, logs);
      setTopLackingGoals(topLacking);
      setTopStrengthGoals(topStrengths);

      setLifeAreaScores(calculateLifeAreaScores(updatedGoals, logs));
      setActionableSuggestions(generateActionableSuggestions(topLacking));
    } catch (err) {
      console.error('Error saving goal:', err);
    } finally {
      setSaving(false);
    }
  };

  const deleteGoal = async (goalId: string) => {
    setSaving(true);
    try {
      const updatedGoals = await removeGoalService(goalId, userName);
      setGoals(updatedGoals);
      setLifeScore(calculateLifeScore(updatedGoals, logs));

      const { topLacking, topStrengths } = rankGoals(updatedGoals, logs);
      setTopLackingGoals(topLacking);
      setTopStrengthGoals(topStrengths);

      setLifeAreaScores(calculateLifeAreaScores(updatedGoals, logs));
      setActionableSuggestions(generateActionableSuggestions(topLacking));
    } catch (err) {
      console.error('Error deleting goal:', err);
    } finally {
      setSaving(false);
    }
  };

  const saveReminder = async (reminder: Reminder) => {
    setSaving(true);
    try {
      const updatedList = await saveReminderService(reminder, userName);
      await syncLocalScheduledReminders(updatedList, currentLog as any, quietHours);
      setReminders(updatedList);
    } catch (err) {
      console.error('Error saving reminder:', err);
    } finally {
      setSaving(false);
    }
  };

  const deleteReminder = async (reminderId: string) => {
    setSaving(true);
    try {
      const updatedList = await removeReminderService(reminderId, userName);
      await syncLocalScheduledReminders(updatedList, currentLog as any, quietHours);
      setReminders(updatedList);
    } catch (err) {
      console.error('Error deleting reminder:', err);
    } finally {
      setSaving(false);
    }
  };

  const saveQuietHours = async (qh: QuietHours) => {
    setQuietHoursState(qh);
    await saveQuietHoursService(qh);
    await syncLocalScheduledReminders(reminders, currentLog as any, qh);
    setReminders(reminders);
  };

  const sendTestNotification = async (reminder: Reminder) => {
    await sendImmediateTestNotification(reminder);
  };

  const goalProgressList = goals.map((goal) => ({
    goal,
    progress: calculateGoalProgress(goal, logs as any),
  }));

  const exportDataJSON = () => {
    const dataObj = {
      userName,
      exportedAt: new Date().toISOString(),
      logs,
      goals,
      reminders,
    };
    return JSON.stringify(dataObj, null, 2);
  };

  const exportDataCSV = () => {
    const dates = Object.keys(logs).sort();
    if (dates.length === 0) return 'Date,Day,Weight,Steps,DSA,ReactHours,BackendHours,JobApps,Calories,Protein\n';

    let csv = 'Date,Day,DayNumber,Weight,TargetWeight,Steps,WorkoutDone,GymDone,SwimmingDone,JunkFood,TeaCups,CoffeeCups,DSAQuestions,ReactHours,BackendHours,JobAppsCount,Calories,Protein,Water,CompletionPct,DailyStatus\n';

    dates.forEach((dStr) => {
      const l = logs[dStr];
      csv += `${l.date},${l.dayOfWeek},${l.dayNumber},${l.weight ?? ''},${l.targetWeight ?? ''},${l.steps || 0},${l.workoutDone ? 'YES' : 'NO'},${l.gymDone ? 'YES' : 'NO'},${l.swimmingDone ? 'YES' : 'NO'},${l.hadJunkFood ? 'YES' : 'NO'},${l.teaConsumed || 0},${l.blackCoffeeConsumed || 0},${l.dsaQuestions || 0},${l.reactHours || 0},${l.backendHours || 0},${l.jobApplications ? l.jobApplications.length : 0},${l.calories || 0},${l.protein || 0},${l.water || 0},${l.dailyCompletionPct || 0},${l.dailyStatus}\n`;
    });

    return csv;
  };

  return {
    userName,
    selectedDate,
    setSelectedDate,
    todayDate,
    logs,
    currentLog,
    goals,
    goalProgressList,
    reminders,
    quietHours,
    weeklyStats,
    lifeScore,
    topLackingGoals,
    topStrengthGoals,
    lifeAreaScores,
    detectedPatterns,
    actionableSuggestions,
    loading,
    saving,
    refreshData: loadData,
    updateCurrentLog,
    saveGoal,
    deleteGoal,
    saveReminder,
    deleteReminder,
    saveQuietHours,
    sendTestNotification,
    exportDataCSV,
    exportDataJSON,
  };
}
