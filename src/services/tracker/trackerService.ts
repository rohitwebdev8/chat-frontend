import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { DailyLog, JobApplicationEntry, TodoItem } from '@/types/tracker';

const TRACKER_STORAGE_KEY = '@daily_life_tracker_logs_v1';
const START_DATE_KEY = '@daily_tracker_start_date';

const DEFAULT_TODOS: Omit<TodoItem, 'id'>[] = [
  { title: 'Morning Workout / Gym session', category: 'health', completed: false },
  { title: 'Log Daily Weight & Water Intake', category: 'health', completed: false },
  { title: 'Hit 8,000+ Steps Goal', category: 'health', completed: false },
  { title: 'Zero / Controlled Junk Food', category: 'food', completed: false },
  { title: 'Solve 2+ DSA Questions', category: 'study', completed: false },
  { title: 'Study / Code React (2+ Hours)', category: 'study', completed: false },
  { title: 'Study / Code Backend (2+ Hours)', category: 'study', completed: false },
  { title: 'Submit 5+ Job Applications', category: 'job', completed: false },
];

/**
 * Gets Day # count relative to when the user started tracking.
 */
export async function getDayNumber(currentDateStr: string): Promise<number> {
  try {
    let startDateStr = await AsyncStorage.getItem(START_DATE_KEY);
    if (!startDateStr) {
      startDateStr = currentDateStr;
      await AsyncStorage.setItem(START_DATE_KEY, startDateStr);
    }
    const start = new Date(startDateStr);
    const curr = new Date(currentDateStr);
    const diffTime = curr.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays);
  } catch {
    return 1;
  }
}

/**
 * Gets day of week name from date string YYYY-MM-DD
 */
export function getDayOfWeek(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  }
  return new Date().toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Returns formatted YYYY-MM-DD string for today.
 */
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Creates a default clean log for a given date string.
 */
export function createDefaultLog(dateStr: string, dayNumber: number): DailyLog {
  const dayOfWeek = getDayOfWeek(dateStr);
  const todos: TodoItem[] = DEFAULT_TODOS.map((t, idx) => ({
    id: `${dateStr}-todo-${idx}`,
    ...t,
  }));

  return {
    id: dateStr,
    date: dateStr,
    dayOfWeek,
    dayNumber,
    weight: null,
    targetWeight: 70.0,
    movingAvg7d: null,
    movingAvg14d: null,
    movingAvg30d: null,
    workoutDone: false,
    gymDone: false,
    swimmingDone: false,
    steps: 0,
    hadJunkFood: false,
    junkFoodDetails: 'None',
    teaConsumed: 0,
    blackCoffeeConsumed: 0,
    calories: 0,
    calorieTarget: 2000,
    protein: 0,
    proteinTarget: 140,
    water: 0,
    waterTarget: 3.0,
    dsaQuestions: 0,
    reactHours: 0,
    backendHours: 0,
    jobApplications: [],
    todos,
    dailyCompletionPct: 0,
    dailyStatus: 'Pending',
    notes: '',
    updatedAt: new Date().toISOString(),
  };
}


/**
 * Calculates moving weight averages (7D, 14D, 30D) for all logs.
 */
export function calculateWeightAverages(logs: Record<string, DailyLog>): Record<string, DailyLog> {
  const sortedDates = Object.keys(logs).sort();
  const updatedLogs = { ...logs };

  sortedDates.forEach((dateStr, index) => {
    const currentLog = { ...updatedLogs[dateStr] };

    const getAvgForDays = (days: number): number | null => {
      let sum = 0;
      let count = 0;
      for (let i = index; i >= 0 && i > index - days; i--) {
        const pastWeight = sortedDates[i] ? updatedLogs[sortedDates[i]]?.weight : null;
        if (pastWeight !== null && pastWeight !== undefined && pastWeight > 0) {
          sum += pastWeight;
          count++;
        }
      }
      return count > 0 ? parseFloat((sum / count).toFixed(1)) : null;
    };

    currentLog.movingAvg7d = getAvgForDays(7);
    currentLog.movingAvg14d = getAvgForDays(14);
    currentLog.movingAvg30d = getAvgForDays(30);

    // Calculate daily completion %
    const totalTodos = currentLog.todos.length;
    const completedTodos = currentLog.todos.filter((t) => t.completed).length;
    const pct = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;
    currentLog.dailyCompletionPct = pct;

    if (pct >= 80) currentLog.dailyStatus = 'Great';
    else if (pct >= 50) currentLog.dailyStatus = 'On Track';
    else if (pct > 0) currentLog.dailyStatus = 'Needs Focus';
    else currentLog.dailyStatus = 'Pending';

    updatedLogs[dateStr] = currentLog;
  });

  return updatedLogs;
}

/**
 * Load all stored daily logs from Firestore & AsyncStorage.
 */
export async function loadAllLogs(userName: string = 'User'): Promise<Record<string, DailyLog>> {
  let localLogs: Record<string, DailyLog> = {};

  // 1. Try loading local cache from AsyncStorage first
  try {
    const raw = await AsyncStorage.getItem(TRACKER_STORAGE_KEY);
    if (raw) {
      localLogs = JSON.parse(raw);
    }
  } catch (error) {
    console.warn('AsyncStorage load error:', error);
  }

  // 2. Fetch remote logs from Firestore to ensure multi-device sync
  try {
    const firestoreRef = collection(db, 'users', userName, 'dailyTracker');
    const snapshot = await getDocs(firestoreRef);
    const remoteLogs: Record<string, DailyLog> = {};

    snapshot.forEach((docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as DailyLog;
        remoteLogs[data.date] = data;
      }
    });

    // Merge remote and local logs
    const merged = { ...localLogs, ...remoteLogs };
    const processed = calculateWeightAverages(merged);

    // Save back to local storage
    await AsyncStorage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(processed));
    return processed;
  } catch (firestoreError) {
    console.warn('Firestore fetch fallback to local cache:', firestoreError);
    return calculateWeightAverages(localLogs);
  }
}

/**
 * Save single log to both AsyncStorage and Cloud Firestore!
 */
export async function saveDailyLog(
  log: DailyLog,
  userName: string = 'User'
): Promise<{ updatedLog: DailyLog; allLogs: Record<string, DailyLog> }> {
  try {
    const allLogs = await loadAllLogs(userName);
    const updatedData = { ...log, updatedAt: new Date().toISOString() };
    allLogs[log.date] = updatedData;
    const processedLogs = calculateWeightAverages(allLogs);
    const finalLog = processedLogs[log.date];

    // 1. Save to local AsyncStorage
    await AsyncStorage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(processedLogs));

    // 2. Sync to Cloud Firestore database!
    try {
      const docRef = doc(db, 'users', userName, 'dailyTracker', log.date);
      await setDoc(docRef, finalLog, { merge: true });
    } catch (fsErr) {
      console.warn('Failed to sync log to Firestore (offline fallback active):', fsErr);
    }

    return {
      updatedLog: finalLog,
      allLogs: processedLogs,
    };
  } catch (error) {
    console.error('Failed to save daily log:', error);
    throw error;
  }
}

export interface WeeklyStats {
  avgWeightThisWeek: number | null;
  avgWeightLastWeek: number | null;
  weightChange: number | null;
  totalStepsThisWeek: number;
  avgStepsPerDay: number;
  totalJobAppsThisWeek: number;
  totalDsaThisWeek: number;
  totalStudyHoursThisWeek: number;
  avgCompletionPctThisWeek: number;
  totalWorkoutDays: number;
}

/**
 * Calculates weekly statistics and comparison averages (This Week vs Last Week)
 */
export function calculateWeeklyStats(logs: Record<string, DailyLog>): WeeklyStats {
  const sortedDates = Object.keys(logs).sort().reverse(); // recent dates first

  const last7Days = sortedDates.slice(0, 7).map((d) => logs[d]);
  const prev7Days = sortedDates.slice(7, 14).map((d) => logs[d]);

  // Weight average this week
  const weightsThisWeek = last7Days.map((l) => l.weight).filter((w): w is number => w !== null && w > 0);
  const avgWeightThisWeek = weightsThisWeek.length > 0 ? parseFloat((weightsThisWeek.reduce((a, b) => a + b, 0) / weightsThisWeek.length).toFixed(1)) : null;

  // Weight average last week
  const weightsLastWeek = prev7Days.map((l) => l.weight).filter((w): w is number => w !== null && w > 0);
  const avgWeightLastWeek = weightsLastWeek.length > 0 ? parseFloat((weightsLastWeek.reduce((a, b) => a + b, 0) / weightsLastWeek.length).toFixed(1)) : null;

  let weightChange: number | null = null;
  if (avgWeightThisWeek !== null && avgWeightLastWeek !== null) {
    weightChange = parseFloat((avgWeightThisWeek - avgWeightLastWeek).toFixed(1));
  }

  // Activity stats
  const totalStepsThisWeek = last7Days.reduce((sum, l) => sum + (l.steps || 0), 0);
  const avgStepsPerDay = last7Days.length > 0 ? Math.round(totalStepsThisWeek / last7Days.length) : 0;
  const totalWorkoutDays = last7Days.filter((l) => l.workoutDone || l.gymDone || l.swimmingDone).length;

  // Jobs stats
  const totalJobAppsThisWeek = last7Days.reduce((sum, l) => sum + (l.jobApplications ? l.jobApplications.length : 0), 0);

  // Study stats
  const totalDsaThisWeek = last7Days.reduce((sum, l) => sum + (l.dsaQuestions || 0), 0);
  const totalStudyHoursThisWeek = parseFloat(
    last7Days.reduce((sum, l) => sum + (l.reactHours || 0) + (l.backendHours || 0), 0).toFixed(1)
  );

  // Completion score
  const totalPct = last7Days.reduce((sum, l) => sum + (l.dailyCompletionPct || 0), 0);
  const avgCompletionPctThisWeek = last7Days.length > 0 ? Math.round(totalPct / last7Days.length) : 0;

  return {
    avgWeightThisWeek,
    avgWeightLastWeek,
    weightChange,
    totalStepsThisWeek,
    avgStepsPerDay,
    totalJobAppsThisWeek,
    totalDsaThisWeek,
    totalStudyHoursThisWeek,
    avgCompletionPctThisWeek,
    totalWorkoutDays,
  };
}

/**
 * Formats today's log into a nicely styled summary string for posting to chat.
 */
export function formatLogForChat(log: DailyLog): string {
  const jobAppsCount = log.jobApplications.length;
  const weightText = log.weight ? `${log.weight} kg (Target: ${log.targetWeight ?? '--'} kg, 7D Avg: ${log.movingAvg7d ?? '--'} kg)` : 'Not logged';

  let jobListText = '';
  if (jobAppsCount > 0) {
    jobListText = '\n  • Applications: ' + log.jobApplications.map(j => `${j.company} (${j.position} - ${j.status})`).join(', ');
  }

  return (
    `📊 *Daily Progress Report — Day #${log.dayNumber}* (${log.date}, ${log.dayOfWeek})\n\n` +
    `✅ *Completion*: ${log.dailyCompletionPct}% (${log.dailyStatus})\n` +
    `🏋️ *Health & Weight*: ${weightText}\n` +
    `🏃 *Activity*: ${log.steps.toLocaleString()} steps | Workout: ${log.workoutDone ? 'Yes' : 'No'} | Gym: ${log.gymDone ? 'Yes' : 'No'} | Swimming: ${log.swimmingDone ? 'Yes' : 'No'}\n` +
    `🥗 *Food Intake*: Junk Food: ${log.hadJunkFood ? log.junkFoodDetails : 'None 🎉'} | Tea: ${log.teaConsumed} cups | Black Coffee: ${log.blackCoffeeConsumed} cups\n` +
    `💻 *Study*: DSA Questions: ${log.dsaQuestions} | React: ${log.reactHours}h | Backend: ${log.backendHours}h\n` +
    `💼 *Job Apps Sent*: ${jobAppsCount}${jobListText}\n` +
    (log.notes ? `📝 *Notes*: "${log.notes}"` : '')
  );
}

