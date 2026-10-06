import { Goal } from '@/types/goals';
import { DailyLog } from '@/types/tracker';

export interface StreaksAndConsistency {
  streakCurrent: number;
  streakBest: number;
  consistencyLast7DaysPct: number;
  consistencyLast30DaysPct: number;
}

/**
 * Checks whether a daily log satisfies a goal's target on that specific day.
 */
export function isGoalMetOnDay(goal: Goal, log: DailyLog): boolean {
  if (!log) return false;

  switch (goal.linkedMetric) {
    case 'weight':
      return log.weight !== null && goal.targetValue > 0 ? log.weight <= goal.targetValue : false;
    case 'steps':
      return (log.steps || 0) >= goal.targetValue;
    case 'workout':
      return log.workoutDone || log.gymDone || log.swimmingDone;
    case 'dsaQuestions':
      return (log.dsaQuestions || 0) >= goal.targetValue;
    case 'reactHours':
      return (log.reactHours || 0) >= goal.targetValue;
    case 'backendHours':
      return (log.backendHours || 0) >= goal.targetValue;
    case 'jobApplications':
      return (log.jobApplications ? log.jobApplications.length : 0) >= goal.targetValue;
    case 'calories':
      return (log.calories || 0) > 0 && (log.calories || 0) <= (goal.targetValue || 2200);
    case 'protein':
      return (log.protein || 0) >= goal.targetValue;
    case 'water':
      return (log.water || 0) >= goal.targetValue;
    case 'junkFood':
      return !log.hadJunkFood;
    default:
      return log.dailyCompletionPct >= 70;
  }
}

/**
 * Calculates current streak, best streak, 7-day consistency %, and 30-day consistency %.
 */
export function calculateGoalStreaksAndConsistency(
  goal: Goal,
  logs: Record<string, DailyLog>
): StreaksAndConsistency {
  const sortedDates = Object.keys(logs).sort().reverse(); // newest first

  if (sortedDates.length === 0) {
    return {
      streakCurrent: 0,
      streakBest: 0,
      consistencyLast7DaysPct: 0,
      consistencyLast30DaysPct: 0,
    };
  }

  // Current streak
  let streakCurrent = 0;
  for (const dateStr of sortedDates) {
    if (isGoalMetOnDay(goal, logs[dateStr])) {
      streakCurrent++;
    } else {
      break;
    }
  }

  // Best streak
  let streakBest = 0;
  let runningStreak = 0;
  const chronologicalDates = Object.keys(logs).sort(); // oldest first
  for (const dateStr of chronologicalDates) {
    if (isGoalMetOnDay(goal, logs[dateStr])) {
      runningStreak++;
      if (runningStreak > streakBest) {
        streakBest = runningStreak;
      }
    } else {
      runningStreak = 0;
    }
  }

  // Consistency 7D & 30D
  const last7 = sortedDates.slice(0, 7);
  const met7 = last7.filter((d) => isGoalMetOnDay(goal, logs[d])).length;
  const consistencyLast7DaysPct = last7.length > 0 ? Math.round((met7 / last7.length) * 100) : 0;

  const last30 = sortedDates.slice(0, 30);
  const met30 = last30.filter((d) => isGoalMetOnDay(goal, logs[d])).length;
  const consistencyLast30DaysPct = last30.length > 0 ? Math.round((met30 / last30.length) * 100) : 0;

  return {
    streakCurrent,
    streakBest: Math.max(streakBest, streakCurrent),
    consistencyLast7DaysPct,
    consistencyLast30DaysPct,
  };
}
