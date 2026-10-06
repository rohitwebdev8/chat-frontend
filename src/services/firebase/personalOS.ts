/**
 * personalOS.ts — Single source of truth for all Personal OS Firestore reads/writes.
 *
 * Path convention: users/{auth.uid}/{collection}/{docId}
 * UID comes from Firebase Auth (anonymous sign-in, persisted via AsyncStorage).
 * Offline persistence is enabled in config.ts (persistentLocalCache).
 * Every write emits a pendingWrite inc/dec for the "Synced" badge (syncSlice).
 * Every catch shows a toast (via toastService).
 */

import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './config';
import { getUID } from './authService';
import { Goal } from '@/types/goals';
import { Task } from '@/types/tasks';
import { DailyLog, createEmptyLog } from '@/types/logs';
import { Reminder, QuietHours } from '@/types/reminders';
import { WeeklyReview } from '@/types/goals';
import { store } from '@/store';
import { pendingWriteStart, pendingWriteDone } from '@/store/slices/syncSlice';
import { showToast } from '@/services/toastService';

// ── Path helpers (getUID() is synchronous after ensureAuth()) ─────────────
const goalsCol = () => collection(db, 'users', getUID(), 'goals');
const tasksCol = () => collection(db, 'users', getUID(), 'tasks');
const logsCol = () => collection(db, 'users', getUID(), 'logs');
const remindersCol = () => collection(db, 'users', getUID(), 'reminders');
const reviewsCol = () => collection(db, 'users', getUID(), 'reviews');
const metricsCol = () => collection(db, 'users', getUID(), 'metrics');

const goalDoc = (id: string) => doc(db, 'users', getUID(), 'goals', id);
const taskDoc = (id: string) => doc(db, 'users', getUID(), 'tasks', id);
const logDoc = (date: string) => doc(db, 'users', getUID(), 'logs', date);
const reminderDoc = (id: string) => doc(db, 'users', getUID(), 'reminders', id);
const reviewDoc = (id: string) => doc(db, 'users', getUID(), 'reviews', id);
const metricDoc = (id: string) => doc(db, 'users', getUID(), 'metrics', id);

// ── Strip undefined fields (Firestore rejects undefined values) ──────────────
function stripUndefined<T extends object>(obj: T): T {
  return JSON.parse(JSON.stringify(obj, (_key, val) => (val === undefined ? null : val)));
}

// ── Generic write wrapper ─────────────────────────────────────────────────
async function safeWrite<T>(
  label: string,
  writeFn: () => Promise<T>
): Promise<T | null> {
  store.dispatch(pendingWriteStart());
  try {
    const result = await writeFn();
    return result;
  } catch (err: any) {
    console.error(`[personalOS] ${label}:`, err);
    showToast(`Save failed: ${label}. Check your connection.`, 'error');
    return null;
  } finally {
    store.dispatch(pendingWriteDone());
  }
}

// ── GOALS ─────────────────────────────────────────────────────────────────

export async function fetchGoals(): Promise<Goal[]> {
  try {
    const snap = await getDocs(goalsCol());
    return snap.docs.map((d) => d.data() as Goal);
  } catch (err) {
    showToast('Failed to load goals.', 'error');
    return [];
  }
}

export function subscribeGoals(onChange: (goals: Goal[]) => void): Unsubscribe {
  return onSnapshot(goalsCol(), (snap) => {
    onChange(snap.docs.map((d) => d.data() as Goal));
  }, (err) => {
    console.error('[personalOS] subscribeGoals:', err);
  });
}

export async function upsertGoal(goal: Goal): Promise<void> {
  await safeWrite(`upsertGoal(${goal.id})`, () =>
    setDoc(goalDoc(goal.id), stripUndefined({ ...goal, updatedAt: new Date().toISOString() }), { merge: true })
  );
}

export async function removeGoal(goalId: string): Promise<void> {
  await safeWrite(`removeGoal(${goalId})`, () => deleteDoc(goalDoc(goalId)));
}

// ── TASKS ─────────────────────────────────────────────────────────────────

export async function fetchTasks(): Promise<Task[]> {
  try {
    const snap = await getDocs(query(tasksCol(), orderBy('createdAt', 'asc')));
    return snap.docs.map((d) => d.data() as Task);
  } catch (err) {
    showToast('Failed to load tasks.', 'error');
    return [];
  }
}

export function subscribeTasks(onChange: (tasks: Task[]) => void): Unsubscribe {
  return onSnapshot(
    query(tasksCol(), orderBy('createdAt', 'asc')),
    (snap) => onChange(snap.docs.map((d) => d.data() as Task)),
    (err) => console.error('[personalOS] subscribeTasks:', err)
  );
}

export async function upsertTask(task: Task): Promise<void> {
  await safeWrite(`upsertTask(${task.id})`, () =>
    setDoc(taskDoc(task.id), stripUndefined(task), { merge: true })
  );
}

export async function removeTask(taskId: string): Promise<void> {
  await safeWrite(`removeTask(${taskId})`, () => deleteDoc(taskDoc(taskId)));
}

// ── LOGS ──────────────────────────────────────────────────────────────────

export async function fetchLogs(): Promise<Record<string, DailyLog>> {
  try {
    const snap = await getDocs(logsCol());
    const result: Record<string, DailyLog> = {};
    snap.docs.forEach((d) => {
      const log = d.data() as DailyLog;
      result[log.date] = log;
    });
    return result;
  } catch (err) {
    showToast('Failed to load logs.', 'error');
    return {};
  }
}

export async function fetchLog(date: string): Promise<DailyLog> {
  try {
    const snap = await getDocs(logsCol());
    const found = snap.docs.find((d) => d.id === date);
    return found ? (found.data() as DailyLog) : createEmptyLog(date);
  } catch {
    return createEmptyLog(date);
  }
}

export function subscribeLog(
  date: string,
  onChange: (log: DailyLog) => void
): Unsubscribe {
  return onSnapshot(logDoc(date), (snap) => {
    onChange(snap.exists() ? (snap.data() as DailyLog) : createEmptyLog(date));
  }, (err) => console.error('[personalOS] subscribeLog:', err));
}

export async function upsertLog(log: DailyLog): Promise<void> {
  await safeWrite(`upsertLog(${log.date})`, () =>
    setDoc(logDoc(log.date), stripUndefined({ ...log, updatedAt: new Date().toISOString() }), { merge: true })
  );
}

// ── REMINDERS ─────────────────────────────────────────────────────────────

// QuietHours lives as a special doc under reminders collection (single doc)
const QUIET_HOURS_DOC = '__quiet_hours__';

export async function fetchReminders(): Promise<Reminder[]> {
  try {
    const snap = await getDocs(remindersCol());
    return snap.docs
      .filter((d) => d.id !== QUIET_HOURS_DOC)
      .map((d) => d.data() as Reminder);
  } catch (err) {
    showToast('Failed to load reminders.', 'error');
    return [];
  }
}

export function subscribeReminders(onChange: (reminders: Reminder[]) => void): Unsubscribe {
  return onSnapshot(
    remindersCol(),
    (snap) => {
      const rems = snap.docs
        .filter((d) => d.id !== QUIET_HOURS_DOC)
        .map((d) => d.data() as Reminder);
      onChange(rems);
    },
    (err) => console.error('[personalOS] subscribeReminders:', err)
  );
}

export async function upsertReminder(reminder: Reminder): Promise<void> {
  await safeWrite(`upsertReminder(${reminder.id})`, () =>
    setDoc(reminderDoc(reminder.id), stripUndefined({ ...reminder, updatedAt: new Date().toISOString() }), { merge: true })
  );
}

export async function removeReminder(reminderId: string): Promise<void> {
  await safeWrite(`removeReminder(${reminderId})`, () => deleteDoc(reminderDoc(reminderId)));
}

export async function fetchQuietHours(): Promise<QuietHours> {
  try {
    const snap = await getDocs(remindersCol());
    const qhDoc = snap.docs.find((d) => d.id === QUIET_HOURS_DOC);
    if (qhDoc) return qhDoc.data() as QuietHours;
  } catch { }
  return { enabled: true, startHour: 23, endHour: 6 };
}

export async function upsertQuietHours(qh: QuietHours): Promise<void> {
  await safeWrite('upsertQuietHours', () =>
    setDoc(doc(db, 'users', getUID(), 'reminders', QUIET_HOURS_DOC), stripUndefined(qh), { merge: true })
  );
}

export async function toggleTaskCompletion(taskId: string, done: boolean, dateStr?: string): Promise<void> {
  const d = dateStr || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  const log = await fetchLog(d);
  const completedTaskIds = done
    ? Array.from(new Set([...(log.completedTaskIds || []), taskId]))
    : (log.completedTaskIds || []).filter((id) => id !== taskId);

  await upsertLog({
    ...log,
    completedTaskIds,
    updatedAt: new Date().toISOString(),
  });
}

// Namespace export for object-style usage
export const personalOS = {
  subscribeGoals,
  upsertGoal,
  removeGoal,
  subscribeTasks,
  upsertTask,
  removeTask,
  fetchLogs,
  fetchLog,
  subscribeLog,
  upsertLog,
  toggleTaskCompletion,
  fetchReminders,
  subscribeReminders,
  upsertReminder,
  removeReminder,
  fetchQuietHours,
  upsertQuietHours,
  fetchReviews,
  upsertReview,
};


// ── REVIEWS ───────────────────────────────────────────────────────────────

export async function fetchReviews(): Promise<WeeklyReview[]> {
  try {
    const snap = await getDocs(reviewsCol());
    return snap.docs.map((d) => d.data() as WeeklyReview);
  } catch (err) {
    showToast('Failed to load reviews.', 'error');
    return [];
  }
}

export async function upsertReview(review: WeeklyReview): Promise<void> {
  await safeWrite(`upsertReview(${review.id})`, () =>
    setDoc(reviewDoc(review.id), stripUndefined({ ...review, updatedAt: new Date().toISOString() }), { merge: true })
  );
}

// ── METRICS ───────────────────────────────────────────────────────────────

import { MetricDefinition, DEFAULT_METRICS } from '@/types/metrics';

export async function fetchMetrics(): Promise<MetricDefinition[]> {
  try {
    const snap = await getDocs(metricsCol());
    if (snap.empty) {
      // Seed default metrics
      await seedDefaultMetrics();
      return DEFAULT_METRICS;
    }
    return snap.docs.map((d) => d.data() as MetricDefinition).filter((m) => !m.archived);
  } catch (err) {
    console.error('[personalOS] fetchMetrics:', err);
    return DEFAULT_METRICS;
  }
}

export function subscribeMetrics(onChange: (metrics: MetricDefinition[]) => void): Unsubscribe {
  return onSnapshot(metricsCol(), async (snap) => {
    if (snap.empty) {
      await seedDefaultMetrics();
      onChange(DEFAULT_METRICS);
    } else {
      const list = snap.docs.map((d) => d.data() as MetricDefinition).filter((m) => !m.archived);
      onChange(list);
    }
  }, (err) => {
    console.error('[personalOS] subscribeMetrics:', err);
  });
}

export async function upsertMetric(metric: MetricDefinition): Promise<void> {
  await safeWrite(`upsertMetric(${metric.id})`, () =>
    setDoc(metricDoc(metric.id), stripUndefined({ ...metric, updatedAt: new Date().toISOString() }), { merge: true })
  );
}

export async function removeMetric(metricId: string): Promise<void> {
  // We archive custom metrics or delete non-builtIns
  await safeWrite(`removeMetric(${metricId})`, () =>
    setDoc(metricDoc(metricId), { archived: true, updatedAt: new Date().toISOString() }, { merge: true })
  );
}

export async function seedDefaultMetrics(): Promise<void> {
  for (const def of DEFAULT_METRICS) {
    try {
      await setDoc(metricDoc(def.id), { ...def, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, { merge: true });
    } catch { }
  }
}

