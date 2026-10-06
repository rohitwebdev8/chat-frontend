/**
 * personalOS.ts — Single source of truth for all Personal OS Firestore reads/writes.
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  onSnapshot,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  runTransaction,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './config';
import { getUID } from './authService';
import { Goal } from '@/types/goals';
import { Task, GoalTask } from '@/types/tasks';
import { DailyLog, createEmptyLog } from '@/types/logs';
import { QuickLink, SEED_CAREER_LINKS } from '@/types/links';
import { Reminder, QuietHours } from '@/types/reminders';
import { WeeklyReview } from '@/types/goals';
import { store } from '@/store';
import { pendingWriteStart, pendingWriteDone } from '@/store/slices/syncSlice';
import { showToast } from '@/services/toastService';

// ── Local Date helper (no UTC toISOString) ──────────────────────────────────
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ── Path helpers ───────────────────────────────────────────────────────────
const goalsCol = () => collection(db, 'users', getUID(), 'goals');
const standaloneTasksCol = () => collection(db, 'users', getUID(), 'tasks');
const goalTasksCol = (goalId: string) => collection(db, 'users', getUID(), 'goals', goalId, 'tasks');
const logsCol = () => collection(db, 'users', getUID(), 'logs');
const linksCol = () => collection(db, 'users', getUID(), 'links');
const remindersCol = () => collection(db, 'users', getUID(), 'reminders');
const reviewsCol = () => collection(db, 'users', getUID(), 'reviews');

const goalDoc = (id: string) => doc(db, 'users', getUID(), 'goals', id);
const standaloneTaskDoc = (id: string) => doc(db, 'users', getUID(), 'tasks', id);
const goalTaskDoc = (goalId: string, taskId: string) => doc(db, 'users', getUID(), 'goals', goalId, 'tasks', taskId);
const logDoc = (date: string) => doc(db, 'users', getUID(), 'logs', date);
const linkDoc = (id: string) => doc(db, 'users', getUID(), 'links', id);
const reminderDoc = (id: string) => doc(db, 'users', getUID(), 'reminders', id);
const reviewDoc = (id: string) => doc(db, 'users', getUID(), 'reviews', id);

function stripUndefined<T extends object>(obj: T): T {
  return JSON.parse(JSON.stringify(obj, (_key, val) => (val === undefined ? null : val)));
}

async function safeWrite<T>(label: string, writeFn: () => Promise<T>): Promise<T | null> {
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
export function subscribeGoals(onChange: (goals: Goal[]) => void): Unsubscribe {
  return onSnapshot(goalsCol(), (snap) => {
    onChange(snap.docs.map((d) => d.data() as Goal));
  }, (err) => console.error('[personalOS] subscribeGoals:', err));
}

export async function upsertGoal(goal: Goal): Promise<void> {
  await safeWrite(`upsertGoal(${goal.id})`, () =>
    setDoc(goalDoc(goal.id), stripUndefined({ ...goal, updatedAt: new Date().toISOString() }), { merge: true })
  );
}

export async function removeGoal(goalId: string): Promise<void> {
  // Deleting a goal deletes its subtasks and unlinks reminders
  await safeWrite(`removeGoal(${goalId})`, async () => {
    const tasksSnap = await getDocs(goalTasksCol(goalId));
    const taskIds = new Set(tasksSnap.docs.map((d) => d.id));

    // Delete subtasks
    for (const tDoc of tasksSnap.docs) {
      await deleteDoc(tDoc.ref);
    }
    // Delete goal doc
    await deleteDoc(goalDoc(goalId));

    // Unlink any reminders referencing these subtasks
    if (taskIds.size > 0) {
      const remsSnap = await getDocs(remindersCol());
      for (const rDoc of remsSnap.docs) {
        const rem = rDoc.data() as Reminder;
        if (rem.taskId && taskIds.has(rem.taskId)) {
          await setDoc(rDoc.ref, { taskId: null, updatedAt: new Date().toISOString() }, { merge: true });
        }
      }
    }
  });
}

/**
 * Idempotent Goal Auto-Completion using Firestore runTransaction.
 * Only completes if status is currently 'active'.
 */
export async function autoCompleteGoal(goalId: string): Promise<boolean> {
  return (
    (await safeWrite(`autoCompleteGoal(${goalId})`, async () => {
      const gDocRef = goalDoc(goalId);

      let didComplete = false;
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(gDocRef);
        if (!snap.exists()) return;

        const currentData = snap.data() as Goal;
        if (currentData.status !== 'active') {
          return; // Already done or paused; no-op
        }

        // Mark goal status done
        transaction.update(gDocRef, {
          status: 'done',
          updatedAt: new Date().toISOString(),
        });
        didComplete = true;
      });

      if (didComplete) {
        // Deactivate all tasks under this goal
        const tasksSnap = await getDocs(goalTasksCol(goalId));
        for (const tDoc of tasksSnap.docs) {
          await setDoc(tDoc.ref, { active: false, updatedAt: new Date().toISOString() }, { merge: true });
        }
      }

      return didComplete;
    })) ?? false
  );
}

// ── STANDALONE TASKS ──────────────────────────────────────────────────────
export function subscribeStandaloneTasks(onChange: (tasks: Task[]) => void): Unsubscribe {
  return onSnapshot(
    query(standaloneTasksCol(), orderBy('createdAt', 'asc')),
    (snap) => onChange(snap.docs.map((d) => d.data() as Task)),
    (err) => console.error('[personalOS] subscribeStandaloneTasks:', err)
  );
}

export async function upsertStandaloneTask(task: Task): Promise<void> {
  await safeWrite(`upsertStandaloneTask(${task.id})`, () =>
    setDoc(standaloneTaskDoc(task.id), stripUndefined(task), { merge: true })
  );
}

export async function removeStandaloneTask(taskId: string): Promise<void> {
  await safeWrite(`removeStandaloneTask(${taskId})`, async () => {
    await deleteDoc(standaloneTaskDoc(taskId));

    // Remove task link from any reminders referencing this taskId
    const remsSnap = await getDocs(remindersCol());
    for (const rDoc of remsSnap.docs) {
      const rem = rDoc.data() as Reminder;
      if (rem.taskId === taskId) {
        await setDoc(rDoc.ref, { taskId: null, updatedAt: new Date().toISOString() }, { merge: true });
      }
    }
  });
}

// Compatibility exports for legacy tasksCol
export const subscribeTasks = subscribeStandaloneTasks;
export const upsertTask = upsertStandaloneTask;
export const removeTask = removeStandaloneTask;

// ── GOAL TASKS ────────────────────────────────────────────────────────────
export function subscribeGoalTasks(goalId: string, onChange: (tasks: GoalTask[]) => void): Unsubscribe {
  return onSnapshot(
    goalTasksCol(goalId),
    (snap) => onChange(snap.docs.map((d) => d.data() as GoalTask)),
    (err) => console.error(`[personalOS] subscribeGoalTasks(${goalId}):`, err)
  );
}

export async function fetchAllGoalTasks(goals: Goal[]): Promise<GoalTask[]> {
  const allGoalTasks: GoalTask[] = [];
  for (const g of goals) {
    try {
      const snap = await getDocs(goalTasksCol(g.id));
      snap.docs.forEach((d) => allGoalTasks.push(d.data() as GoalTask));
    } catch { }
  }
  return allGoalTasks;
}

export async function upsertGoalTask(task: GoalTask): Promise<void> {
  await safeWrite(`upsertGoalTask(${task.id})`, () =>
    setDoc(goalTaskDoc(task.goalId, task.id), stripUndefined(task), { merge: true })
  );
}

export async function removeGoalTask(goalId: string, taskId: string): Promise<void> {
  await safeWrite(`removeGoalTask(${taskId})`, async () => {
    await deleteDoc(goalTaskDoc(goalId, taskId));

    // Remove task link from any reminders referencing this taskId
    const remsSnap = await getDocs(remindersCol());
    for (const rDoc of remsSnap.docs) {
      const rem = rDoc.data() as Reminder;
      if (rem.taskId === taskId) {
        await setDoc(rDoc.ref, { taskId: null, updatedAt: new Date().toISOString() }, { merge: true });
      }
    }
  });
}

// ── DAILY LOGS ────────────────────────────────────────────────────────────
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

export function subscribeLog(date: string, onChange: (log: DailyLog) => void): Unsubscribe {
  return onSnapshot(logDoc(date), (snap) => {
    onChange(snap.exists() ? (snap.data() as DailyLog) : createEmptyLog(date));
  }, (err) => console.error('[personalOS] subscribeLog:', err));
}

export async function upsertLog(log: DailyLog): Promise<void> {
  await safeWrite(`upsertLog(${log.date})`, () =>
    setDoc(logDoc(log.date), stripUndefined({ ...log, updatedAt: new Date().toISOString() }), { merge: true })
  );
}

// ── QUICK LINKS ───────────────────────────────────────────────────────────
export function subscribeLinks(onChange: (links: QuickLink[]) => void): Unsubscribe {
  return onSnapshot(linksCol(), async (snap) => {
    if (snap.empty) {
      for (const link of SEED_CAREER_LINKS) {
        await setDoc(linkDoc(link.id), link, { merge: true });
      }
      onChange(SEED_CAREER_LINKS);
    } else {
      onChange(snap.docs.map((d) => d.data() as QuickLink));
    }
  }, (err) => console.error('[personalOS] subscribeLinks:', err));
}

export async function upsertLink(link: QuickLink): Promise<void> {
  await safeWrite(`upsertLink(${link.id})`, () =>
    setDoc(linkDoc(link.id), stripUndefined(link), { merge: true })
  );
}

export async function removeLink(linkId: string): Promise<void> {
  await safeWrite(`removeLink(${linkId})`, () => deleteDoc(linkDoc(linkId)));
}

// ── REMINDERS ─────────────────────────────────────────────────────────────
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

export async function toggleTaskCompletion(taskId: string, done: boolean, dateStr?: string): Promise<void> {
  const d = dateStr || getLocalDateString();
  const log = await fetchLog(d);
  const newDone = { ...(log.done || {}) };
  if (done) {
    newDone[taskId] = true;
  } else {
    delete newDone[taskId];
  }
  await upsertLog({
    ...log,
    done: newDone,
    updatedAt: new Date().toISOString(),
  });
}

// Export personalOS namespace for backwards compatibility
export const personalOS = {
  subscribeGoals,
  upsertGoal,
  removeGoal,
  autoCompleteGoal,
  subscribeTasks,
  upsertTask,
  removeTask,
  subscribeStandaloneTasks,
  upsertStandaloneTask,
  removeStandaloneTask,
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
