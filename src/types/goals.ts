/**
 * goals.ts — Goal data model and progress types.
 * Path: users/{uid}/goals/{goalId}
 */

export type GoalCategory =
  | 'Health'
  | 'Fitness'
  | 'Diet'
  | 'Study'
  | 'Career'
  | 'Finance'
  | 'Personal'
  | 'Custom';

export type GoalType = 'reach_number' | 'total' | 'habit' | 'limit' | 'target' | 'cumulative' | 'recurring';
export type GoalStatus = 'active' | 'paused' | 'done' | 'completed' | 'abandoned';
export type PaceStatus = 'Ahead' | 'On track' | 'Behind' | 'No data' | 'Completed' | 'Exceeded';

export interface GoalPauseRange {
  id?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  reason?: string;
  extendDeadline?: boolean;
}

export interface Goal {
  id: string;
  category: GoalCategory;
  title: string;
  type: GoalType;
  unit?: string;
  startValue?: number;
  targetValue: number;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  status: GoalStatus;
  
  // Off days (0=Sun..6=Sat)
  offDays?: number[];

  // Pause ranges
  pauseRanges?: GoalPauseRange[];

  // Compatibility fields
  metricId?: string;
  linkedMetric?: string;
  horizon?: string;
  priority?: string;
  visionStatement?: string;
  whyItMatters?: string;
  currentValue?: number;
  deadline?: string;

  createdAt?: string;
  updatedAt?: string;
}

export interface GoalCalculatedProgress {
  goalId: string;
  current: number;
  currentValue?: number;
  targetValue: number;
  startValue: number;
  valuePct: number;             // 0..100%
  percentComplete?: number;
  timePct: number;              // 0..100% (active days basis)
  requiredPerDay: number;
  actualPace: number;
  projected: number;
  status: PaceStatus;
  statusLabel?: PaceStatus;
  statusColor: string;
  message: string;
  insightText?: string;
  isFuture?: boolean;
  startsInDays?: number;
  isOffDayToday?: boolean;
  isPausedToday?: boolean;
  activeDaysTotal?: number;
  activeDaysElapsed?: number;
  activeDaysLeft?: number;
  paceSuggestion?: {
    text: string;
    suggestedAmount: number;
    taskId?: string;
  };
  consistencyLast7DaysPct: number; // 0..100%
  todayDueCount: number;
  todayDoneCount: number;
  streakCurrent: number;
  streakBest: number;
}

export interface WeeklyReview {
  id: string;
  weekKey?: string;
  periodId?: string;
  periodType?: 'weekly' | 'monthly';
  dateKey?: string;
  type?: 'weekly' | 'monthly';
  wins: string[];
  misses: string[];
  reflections: string;
  nextWeekFocus?: string;
  nextPeriodFocus?: string;
  overallScore?: number;
  moodRating?: number;
  energyRating?: number;
  createdAt: string;
  updatedAt: string;
}

export type ReviewDoc = WeeklyReview;
