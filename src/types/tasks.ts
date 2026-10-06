/**
 * tasks.ts — Task types for Standalone tasks and Goal subtasks.
 * Standalone: users/{uid}/tasks/{id}
 * Goal Task:  users/{uid}/goals/{goalId}/tasks/{id}
 */

export type RepeatType = 'once' | 'daily' | 'weekdays' | 'everyN' | 'timesPerWeek' | 'monthly';

export interface RepeatConfig {
  type: RepeatType;
  days?: number[];     // [0=Sun, 1=Mon, ..., 6=Sat] for chosen weekdays
  n?: number;          // for everyN days
  count?: number;      // for timesPerWeek (e.g. 3 times per week)
  date?: string;       // YYYY-MM-DD for once
}

/** Standalone task (not tied to any goal) */
export interface Task {
  id: string;
  title: string;
  repeat: RepeatConfig;
  startDate: string;   // YYYY-MM-DD (local)
  endDate?: string;    // YYYY-MM-DD (local)
  reminderTime?: string | null; // "HH:mm"
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Goal task (subtask tied directly to a goal) */
export interface GoalTask {
  id: string;
  goalId: string;
  title: string;
  kind: 'check' | 'amount';
  unit?: string;
  plannedAmount?: number;
  rule?: 'atLeast' | 'atMost';
  repeat: RepeatConfig;
  active: boolean;
  avoidSuccess?: boolean; // For "avoid" habits (e.g. No junk food: No = success)
  reminderTime?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getRepeatLabel(repeat?: RepeatConfig): string {
  if (!repeat) return 'Daily';
  switch (repeat.type) {
    case 'once':
      return repeat.date ? `Once (${repeat.date})` : 'Once';
    case 'daily':
      return 'Daily';
    case 'weekdays':
      if (repeat.days && repeat.days.length > 0) {
        const sorted = [...repeat.days].sort((a, b) => a - b);
        return sorted.map((d) => WEEKDAY_SHORT[d]).join(', ');
      }
      return 'Mon–Fri';
    case 'everyN':
      return `Every ${repeat.n || 2} days`;
    case 'timesPerWeek':
      return `${repeat.count || 3} times/week`;
    case 'monthly':
      return 'Monthly';
    default:
      return 'Daily';
  }
}

/** Returns the local date string formatted as YYYY-MM-DD */
export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Computes completions for a task in the current calendar week (Monday to Sunday) */
export function countTaskCompletionsThisWeek(
  taskId: string,
  logs: Record<string, { done?: Record<string, boolean | number> }>,
  referenceDate: Date = new Date()
): number {
  const ref = new Date(referenceDate);
  const day = ref.getDay();
  const diffToMonday = ref.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(ref.setDate(diffToMonday));

  let count = 0;
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    const curStr = formatLocalDate(cur);
    if (logs[curStr]?.done?.[taskId]) {
      count++;
    }
  }
  return count;
}

/** Determines if a standalone task or goal task is due on a given JS Date. */
export function isTaskDueOn(
  task: { repeat?: RepeatConfig; recurrence?: string; startDate?: string; endDate?: string; active?: boolean },
  date: Date,
  completedCountThisWeek: number = 0
): boolean {
  if (!task || task.active === false) return false;

  const dateStr = formatLocalDate(date);
  
  if (task.startDate && dateStr < task.startDate) return false;
  if (task.endDate && dateStr > task.endDate) return false;

  const dow = date.getDay(); // 0=Sun, 6=Sat

  // Safe repeat normalization for legacy/raw objects
  let repeat: RepeatConfig = task.repeat || { type: 'daily' };
  if (typeof (task as any).recurrence === 'string') {
    const rec = (task as any).recurrence;
    if (rec === 'weekdays') repeat = { type: 'weekdays', days: [1, 2, 3, 4, 5] };
    else if (rec === 'once') repeat = { type: 'once', date: task.startDate };
    else if (rec === 'monthly') repeat = { type: 'monthly' };
    else repeat = { type: 'daily' };
  }

  const rType = repeat?.type || 'daily';

  switch (rType) {
    case 'once':
      return !repeat.date || dateStr === repeat.date;
    case 'daily':
      return true;
    case 'weekdays':
      if (repeat.days && repeat.days.length > 0) {
        return repeat.days.includes(dow);
      }
      return dow >= 1 && dow <= 5; // default Mon-Fri
    case 'everyN': {
      const n = Math.max(1, repeat.n || 2);
      if (!task.startDate) return true;
      const [sy, sm, sd] = task.startDate.split('-').map(Number);
      const startMs = Date.UTC(sy, sm - 1, sd);
      const targetMs = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
      const diffDays = Math.floor((targetMs - startMs) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays % n === 0;
    }
    case 'timesPerWeek': {
      const targetCount = repeat.count || 3;
      // Resets each Monday; shows on day if not yet reached target count for current week
      return completedCountThisWeek < targetCount;
    }
    case 'monthly': {
      return date.getDate() === 1;
    }
    default:
      return true;
  }
}
