export type TaskStatus = 'done' | 'missed' | 'skipped' | 'partial';

export interface TaskSnapshotItem {
  taskId: string;
  title: string;
  category: string;
  status: TaskStatus;
  actualValue: number;
  targetValue: number;
  unit?: string;
  weight: number; // Weight in completion % calculation
}

export interface DailySnapshot {
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  dayNumber: number;
  completionPercent: number;
  tasksDone: number;
  tasksTotal: number;
  tasks: TaskSnapshotItem[];
  weight: number | null;
  moodRating?: number;
  energyRating?: number;
  notes?: string;
  isFrozen: boolean;
  editedLater?: boolean;
}

export interface MonthSummary {
  year: number;
  month: number; // 1 - 12
  monthName: string;
  avgCompletionPct: number;
  bestDay: string | null; // YYYY-MM-DD
  worstDay: string | null;
  perfectDaysCount: number;
  currentStreak: number;
  bestStreak: number;
}
