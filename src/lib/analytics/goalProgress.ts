/**
 * goalProgress.ts — Forwarder to unified computeGoalProgress.
 */

import { Goal, GoalCalculatedProgress } from '@/types/goals';
import { DailyLog } from '@/types/logs';
import { computeGoalProgress } from '@/lib/goals/computeGoalProgress';

export { computeGoalProgress };

export function calculateGoalProgress(
  goal: Goal,
  logs: Record<string, DailyLog>,
  today: string = new Date().toISOString().split('T')[0]
): GoalCalculatedProgress {
  return computeGoalProgress(goal, undefined, logs, today);
}
