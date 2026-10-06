import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { Reminder, QuietHours } from '@/types/reminders';

const REMINDERS_STORAGE_KEY = '@personal_os_reminders_v1';
const QUIET_HOURS_KEY = '@personal_os_quiet_hours_v1';

export const DEFAULT_REMINDER_TEMPLATES: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: 'Morning Gym Session',
    body: 'Time for your workout session! Stay consistent and build strength.',
    emoji: '🏋️',
    category: 'Gym',
    linkedMetric: 'workout',
    scheduleType: 'weekly',
    fixedTimes: ['07:00'],
    selectedWeekdays: [1, 2, 4, 5, 6], // Mon, Tue, Thu, Fri, Sat
    enabled: true,
    startDate: new Date().toISOString().split('T')[0],
    snoozeDurationMinutes: 15,
    soundEnabled: true,
    priority: 'high',
    allowSecondNudge: true,
  },
  {
    title: 'Study DSA Questions',
    body: 'Solve 2+ DSA questions now to keep your problem-solving sharp.',
    emoji: '💻',
    category: 'Study',
    linkedMetric: 'dsaQuestions',
    scheduleType: 'daily-fixed',
    fixedTimes: ['11:00'],
    enabled: true,
    startDate: new Date().toISOString().split('T')[0],
    snoozeDurationMinutes: 15,
    soundEnabled: true,
    priority: 'high',
    allowSecondNudge: true,
  },
  {
    title: 'Job Applications Push',
    body: 'Submit software engineer job applications to hit your weekly goal.',
    emoji: '💼',
    category: 'Job',
    linkedMetric: 'jobApplications',
    scheduleType: 'multi-time',
    fixedTimes: ['08:30', '15:00'],
    enabled: true,
    startDate: new Date().toISOString().split('T')[0],
    snoozeDurationMinutes: 15,
    soundEnabled: true,
    priority: 'high',
    allowSecondNudge: false,
  },
  {
    title: 'Drink Water Hydration',
    body: 'Drink a glass of water to stay hydrated and energetic!',
    emoji: '💧',
    category: 'Water',
    linkedMetric: 'water',
    scheduleType: 'interval',
    intervalMinutes: 120,
    intervalWindowStart: '08:00',
    intervalWindowEnd: '22:00',
    enabled: true,
    startDate: new Date().toISOString().split('T')[0],
    snoozeDurationMinutes: 15,
    soundEnabled: false,
    priority: 'medium',
    allowSecondNudge: false,
  },
  {
    title: 'Steps Walk Nudge',
    body: 'Check your daily steps count and take a short walk to hit 10,000 steps.',
    emoji: '🏃',
    category: 'Walk',
    linkedMetric: 'steps',
    scheduleType: 'interval',
    intervalMinutes: 60,
    intervalWindowStart: '10:00',
    intervalWindowEnd: '21:00',
    enabled: true,
    startDate: new Date().toISOString().split('T')[0],
    snoozeDurationMinutes: 15,
    soundEnabled: false,
    priority: 'medium',
    allowSecondNudge: false,
  },
  {
    title: 'Evening Check-in & Reflections',
    body: 'Log your day, mood, energy, and evening reflections in your Personal OS.',
    emoji: '🌙',
    category: 'Sleep',
    scheduleType: 'daily-fixed',
    fixedTimes: ['21:30'],
    enabled: true,
    startDate: new Date().toISOString().split('T')[0],
    snoozeDurationMinutes: 15,
    soundEnabled: true,
    priority: 'high',
    allowSecondNudge: false,
  },
  {
    title: 'Weekly Retrospective Review',
    body: 'Reflect on your weekly wins, misses, and set goals for next week.',
    emoji: '📅',
    category: 'Custom',
    scheduleType: 'weekly',
    fixedTimes: ['20:00'],
    selectedWeekdays: [0], // Sunday 8 PM
    enabled: true,
    startDate: new Date().toISOString().split('T')[0],
    snoozeDurationMinutes: 15,
    soundEnabled: true,
    priority: 'high',
    allowSecondNudge: false,
  },
];

export async function loadQuietHours(): Promise<QuietHours> {
  try {
    const raw = await AsyncStorage.getItem(QUIET_HOURS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { enabled: true, startHour: 23, endHour: 6 }; // 11 PM to 6 AM default
}

export async function saveQuietHours(quietHours: QuietHours): Promise<void> {
  await AsyncStorage.setItem(QUIET_HOURS_KEY, JSON.stringify(quietHours));
}

export async function loadReminders(userName: string = 'User'): Promise<Reminder[]> {
  let local: Reminder[] = [];

  try {
    const raw = await AsyncStorage.getItem(REMINDERS_STORAGE_KEY);
    if (raw) local = JSON.parse(raw);
  } catch (e) {}

  try {
    const colRef = collection(db, 'users', userName, 'reminders');
    const snapshot = await getDocs(colRef);
    const remote: Reminder[] = [];

    snapshot.forEach((docSnap) => {
      if (docSnap.exists()) remote.push(docSnap.data() as Reminder);
    });

    if (remote.length === 0 && local.length === 0) {
      const initial: Reminder[] = DEFAULT_REMINDER_TEMPLATES.map((tmpl, idx) => ({
        ...tmpl,
        id: `rem-${idx + 1}-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      await saveAllReminders(initial, userName);
      return initial;
    }

    const mergedMap = new Map<string, Reminder>();
    local.forEach((r) => mergedMap.set(r.id, r));
    remote.forEach((r) => mergedMap.set(r.id, r));

    const final = Array.from(mergedMap.values());
    await AsyncStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(final));
    return final;
  } catch (e) {
    if (local.length === 0) {
      const initial: Reminder[] = DEFAULT_REMINDER_TEMPLATES.map((tmpl, idx) => ({
        ...tmpl,
        id: `rem-${idx + 1}-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      await AsyncStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return local;
  }
}

export async function saveAllReminders(reminders: Reminder[], userName: string = 'User'): Promise<Reminder[]> {
  await AsyncStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders));

  for (const rem of reminders) {
    try {
      const docRef = doc(db, 'users', userName, 'reminders', rem.id);
      await setDoc(docRef, rem, { merge: true });
    } catch (e) {}
  }
  return reminders;
}

export async function saveSingleReminder(reminder: Reminder, userName: string = 'User'): Promise<Reminder[]> {
  const current = await loadReminders(userName);
  const updatedRem = { ...reminder, updatedAt: new Date().toISOString() };

  const idx = current.findIndex((r) => r.id === reminder.id);
  if (idx >= 0) current[idx] = updatedRem;
  else current.push(updatedRem);

  return saveAllReminders(current, userName);
}

export async function deleteReminder(reminderId: string, userName: string = 'User'): Promise<Reminder[]> {
  const current = await loadReminders(userName);
  const filtered = current.filter((r) => r.id !== reminderId);

  try {
    const docRef = doc(db, 'users', userName, 'reminders', reminderId);
    await deleteDoc(docRef);
  } catch (e) {}

  return saveAllReminders(filtered, userName);
}
