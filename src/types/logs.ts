/**
 * logs.ts — Daily Log schema.
 * Firestore doc: users/{uid}/logs/{YYYY-MM-DD}
 */

export interface DailyLog {
  date: string; // YYYY-MM-DD
  done: Record<string, boolean | number>;    // taskId -> true or logged number amount
  entries: Record<string, number>;           // goalId -> number value (e.g. today's weight, daily spend)
  skipped?: Record<string, boolean>;         // taskId -> true if skipped for today
  mood?: string | number | null;
  note?: string;
  updatedAt?: string;
}

export function createEmptyLog(date: string): DailyLog {
  return {
    date,
    done: {},
    entries: {},
    skipped: {},
    mood: null,
    note: '',
    updatedAt: new Date().toISOString(),
  };
}
