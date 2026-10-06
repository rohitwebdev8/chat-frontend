// ── Firestore: users/{uid}/reminders/{id} ─────────────────────────────────

export interface QuietHours {
  enabled: boolean;
  startHour: number; // e.g. 23 (11 PM)
  endHour: number;   // e.g. 6  (6 AM)
}

export type ScheduleType =
  | 'daily-fixed'
  | 'weekdays'
  | 'weekly'
  | 'interval'
  | 'one-time'
  | 'multi-time';

export interface Reminder {
  id: string;
  title: string;
  body: string;
  emoji?: string;
  category?: string;
  linkedMetric?: string;
  linkedTaskId?: string;

  /** Links to a task (standalone or goal task). */
  taskId?: string | null;

  scheduleType: ScheduleType;
  fixedTimes?: string[];          // HH:mm, for daily-fixed / weekdays / weekly
  selectedWeekdays?: number[];    // 0=Sun…6=Sat, for weekly
  intervalMinutes?: number;       // for interval
  intervalWindowStart?: string;   // HH:mm
  intervalWindowEnd?: string;     // HH:mm
  oneTimeDateTime?: string;       // ISO, for one-time

  enabled: boolean;
  snoozeDurationMinutes?: number; // default 60
  soundEnabled?: boolean;
  priority?: string;
  allowSecondNudge?: boolean;
  startDate?: string;

  createdAt: string;
  updatedAt: string;
}
