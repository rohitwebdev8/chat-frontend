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
    scheduleType: 'weekly',
    fixedTimes: ['07:00'],
    selectedWeekdays: [1, 2, 4, 5, 6],
    enabled: true,
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
    scheduleType: 'daily-fixed',
    fixedTimes: ['11:00'],
    enabled: true,
    snoozeDurationMinutes: 15,
    soundEnabled: true,
    priority: 'high',
    allowSecondNudge: true,
  },
  {
    title: 'Evening Task Finish',
    body: 'Finish today\'s remaining tasks!',
    emoji: '🌙',
    category: 'Tasks',
    scheduleType: 'daily-fixed',
    fixedTimes: ['21:00'],
    enabled: true,
    snoozeDurationMinutes: 15,
    soundEnabled: true,
    priority: 'medium',
    allowSecondNudge: false,
  }
];

export async function loadReminders(userName: string = 'User'): Promise<Reminder[]> {
  let localReminders: Reminder[] = [];

  try {
    const raw = await AsyncStorage.getItem(REMINDERS_STORAGE_KEY);
    if (raw) localReminders = JSON.parse(raw);
  } catch (err) {
    console.warn('AsyncStorage reminder load error:', err);
  }

  try {
    const colRef = collection(db, 'users', userName, 'reminders');
    const snapshot = await getDocs(colRef);
    const remoteReminders: Reminder[] = [];

    snapshot.forEach((docSnap) => {
      if (docSnap.exists() && docSnap.id !== '__quiet_hours__') {
        remoteReminders.push(docSnap.data() as Reminder);
      }
    });

    if (remoteReminders.length === 0 && localReminders.length === 0) {
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
    localReminders.forEach((r) => mergedMap.set(r.id, r));
    remoteReminders.forEach((r) => mergedMap.set(r.id, r));

    const finalReminders = Array.from(mergedMap.values());
    await AsyncStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(finalReminders));
    return finalReminders;
  } catch (fsErr) {
    if (localReminders.length === 0) {
      const initial: Reminder[] = DEFAULT_REMINDER_TEMPLATES.map((tmpl, idx) => ({
        ...tmpl,
        id: `rem-${idx + 1}-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      await AsyncStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return localReminders;
  }
}

export async function saveAllReminders(reminders: Reminder[], userName: string = 'User'): Promise<Reminder[]> {
  try {
    await AsyncStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders));
    for (const r of reminders) {
      try {
        const docRef = doc(db, 'users', userName, 'reminders', r.id);
        await setDoc(docRef, r, { merge: true });
      } catch (e) { }
    }
    return reminders;
  } catch (err) {
    console.error('Failed to save reminders:', err);
    throw err;
  }
}

export async function saveSingleReminder(reminder: Reminder, userName: string = 'User'): Promise<Reminder[]> {
  const current = await loadReminders(userName);
  const updatedTime = new Date().toISOString();
  const remWithTimestamp = { ...reminder, updatedAt: updatedTime };

  const existingIdx = current.findIndex((r) => r.id === reminder.id);
  if (existingIdx >= 0) {
    current[existingIdx] = remWithTimestamp;
  } else {
    current.push(remWithTimestamp);
  }

  return saveAllReminders(current, userName);
}

export async function deleteReminder(reminderId: string, userName: string = 'User'): Promise<Reminder[]> {
  const current = await loadReminders(userName);
  const filtered = current.filter((r) => r.id !== reminderId);

  try {
    const docRef = doc(db, 'users', userName, 'reminders', reminderId);
    await deleteDoc(docRef);
  } catch (e) { }

  return saveAllReminders(filtered, userName);
}

export async function loadQuietHours(userName: string = 'User'): Promise<QuietHours> {
  const defaultQH: QuietHours = { enabled: true, startHour: 23, endHour: 6 };
  try {
    const raw = await AsyncStorage.getItem(QUIET_HOURS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { }
  return defaultQH;
}

export async function saveQuietHours(qh: QuietHours, userName: string = 'User'): Promise<QuietHours> {
  try {
    await AsyncStorage.setItem(QUIET_HOURS_KEY, JSON.stringify(qh));
    const docRef = doc(db, 'users', userName, 'reminders', '__quiet_hours__');
    await setDoc(docRef, qh, { merge: true });
  } catch { }
  return qh;
}
