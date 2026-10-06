/**
 * goals.ts — Goal model and progress types.
 * Path: users/{uid}/goals/{id}
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

export type GoalType = 'target' | 'cumulative' | 'habit' | 'recurring';
export type GoalHorizon = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type GoalMetric = string;
export type LinkedMetric = string;
export type GoalPriority = 'high' | 'medium' | 'low';
export type GoalStatus = 'active' | 'paused' | 'completed' | 'abandoned';
export type PaceStatus = 'Ahead' | 'On track' | 'Behind' | 'No data' | 'Completed';

export interface Goal {
  id: string;
  title: string;
  category: GoalCategory;
  type: GoalType | string;        // 'target' | 'cumulative' | 'habit'
  metricId?: string;              // links to MetricDefinition (e.g. 'weight', 'steps', 'savings')
  startValue: number;
  targetValue: number;
  startDate: string;              // YYYY-MM-DD
  endDate?: string;               // YYYY-MM-DD
  deadline?: string;              // compatibility alias for endDate
  status: GoalStatus;

  // Compatibility fields
  horizon?: string;
  linkedMetric?: string;
  unit?: string;
  priority?: string;
  currentValue?: number;
  visionStatement?: string;
  whyItMatters?: string;

  // Optional task linking
  createDailyTask?: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface GoalCalculatedProgress {
  goalId: string;
  current: number;                // current logged value or sum
  currentValue: number;           // compatibility alias
  valuePct: number;               // 0..100%
  percentComplete: number;        // compatibility alias
  timePct: number;                // 0..100%
  requiredPerDay: number;         // e.g. 10000 steps/day or -0.17 kg/day
  actualPace: number;             // average daily rate achieved
  projected: number;              // projected final value at current pace
  status: PaceStatus;             // 'Ahead' | 'On track' | 'Behind' | 'No data'
  statusLabel: PaceStatus;        // compatibility alias
  statusColor: string;            // hex color for UI
  message: string;                // formatted summary e.g. "Need 10,000 steps/day · On track"
  insightText?: string;           // compatibility alias
  streakCurrent?: number;
  streakBest?: number;
  consistencyLast7DaysPct?: number;
}

// ── Firestore: users/{uid}/reviews/{id} ───────────────────────────────────
export interface WeeklyReview {
  id: string;          // e.g. "weekly_2026-W40"
  weekKey?: string;    // "2026-W40"
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
  moodRating?: number;  // 1–5
  energyRating?: number;
  createdAt: string;
  updatedAt: string;
}

export type ReviewDoc = WeeklyReview;
