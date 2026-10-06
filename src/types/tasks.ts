// ── Firestore: users/{uid}/tasks/{taskId} ─────────────────────────────────

export type Recurrence =
  | 'once'
  | 'daily'
  | 'weekdays'   // Mon–Fri
  | 'weekly'     // specific weekdays (e.g. Mon, Wed, Fri)
  | 'monthly'    // day of month (e.g. 1st or 15th) or last day
  | 'every-n-days'
  | 'custom';

export interface Task {
  id: string;
  title: string;
  goalId: string | null;         // links to a Goal for context/progress
  recurrence: Recurrence;
  customDays?: number[];         // 0=Sun…6=Sat
  selectedWeekdays?: number[];   // 0=Sun…6=Sat for 'weekly'
  dayOfMonth?: number | 'last';  // for 'monthly'
  intervalN?: number;            // for 'every-n-days' (e.g. 2 = every 2 days)
  startDate?: string;            // YYYY-MM-DD
  endDate?: string;              // YYYY-MM-DD (optional end date)
  
  // Connection to Metrics (Optional)
  metricId?: string;             // e.g. 'steps', 'water', 'pages'
  amount?: number;               // e.g. 500 (adds to metric on tick, subtracts on untick)

  reminderTime: string | null;   // "HH:mm" or null
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Returns a friendly text string describing the recurrence */
export function getTaskRepeatLabel(task: Task): string {
  switch (task.recurrence) {
    case 'once':
      return 'Once';
    case 'daily':
      return 'Repeats: Daily';
    case 'weekdays':
      return 'Repeats: Mon–Fri';
    case 'weekly':
      if (task.selectedWeekdays && task.selectedWeekdays.length > 0) {
        const names = task.selectedWeekdays
          .slice()
          .sort((a, b) => a - b)
          .map((d) => WEEKDAY_NAMES[d]);
        return `Repeats: ${names.join(', ')}`;
      }
      return 'Repeats: Weekly';
    case 'monthly':
      if (task.dayOfMonth === 'last') return 'Repeats: Last day of month';
      if (task.dayOfMonth) return `Repeats: Day ${task.dayOfMonth} of month`;
      return 'Repeats: Monthly';
    case 'every-n-days':
      return `Repeats: Every ${task.intervalN || 2} days`;
    case 'custom':
      if (task.customDays && task.customDays.length > 0) {
        const names = task.customDays.map((d) => WEEKDAY_NAMES[d]);
        return `Repeats: ${names.join(', ')}`;
      }
      return 'Repeats: Custom';
    default:
      return 'Daily';
  }
}

/** Returns true if a task is due on the given JS Date. */
export function isTaskDueOn(task: Task, date: Date): boolean {
  if (!task.active) return false;
  
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  
  // Check start & end date constraints if provided
  if (task.startDate && dateStr < task.startDate) return false;
  if (task.endDate && dateStr > task.endDate) return false;

  const dow = date.getDay(); // 0=Sun, 6=Sat
  const dayNum = date.getDate();

  switch (task.recurrence) {
    case 'once':
      return true; // shown until completed
    case 'daily':
      return true;
    case 'weekdays':
      return dow >= 1 && dow <= 5;
    case 'weekly': {
      const days = task.selectedWeekdays || task.customDays || [];
      return days.includes(dow);
    }
    case 'monthly': {
      if (task.dayOfMonth === 'last') {
        const nextDay = new Date(date.getFullYear(), date.getMonth(), dayNum + 1);
        return nextDay.getDate() === 1;
      }
      if (typeof task.dayOfMonth === 'number') {
        return dayNum === task.dayOfMonth;
      }
      return dayNum === 1;
    }
    case 'every-n-days': {
      const n = task.intervalN || 2;
      if (!task.startDate) return true;
      const start = new Date(task.startDate);
      const diffMs = date.getTime() - start.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays % n === 0;
    }
    case 'custom': {
      const days = task.customDays || [];
      return days.includes(dow);
    }
    default:
      return false;
  }
}
