// ── Firestore: users/{uid}/logs/{YYYY-MM-DD} ──────────────────────────────

export type DailyMetrics = Record<string, number | null | undefined>;

export interface DailyLog {
  /** Same as the document ID: YYYY-MM-DD */
  date: string;

  completedTaskIds: string[];  // task IDs completed today

  metrics: DailyMetrics;

  /** 1–5, null if not logged */
  mood: number | null;
  energy: number | null;
  note: string;

  updatedAt: string;
}

/** Returns a blank log for a given date. */
export function createEmptyLog(date: string): DailyLog {
  return {
    date,
    completedTaskIds: [],
    metrics: {
      weight: null,
      steps: 0,
      water: 0,
      calories: 0,
      protein: 0,
      savings: 0,
    },
    mood: null,
    energy: null,
    note: '',
    updatedAt: new Date().toISOString(),
  };
}
