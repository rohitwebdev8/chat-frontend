/**
 * computeGoalProgress.ts — Pure function to evaluate Goal progress and pacing.
 * Single unified algorithm supporting target, cumulative, and habit goals.
 */

import { Goal, GoalCalculatedProgress, PaceStatus } from '@/types/goals';
import { MetricDefinition } from '@/types/metrics';
import { DailyLog } from '@/types/logs';

/**
 * Formats a number according to Indian numbering system (en-IN, lakhs, crores)
 * e.g. 300000 -> 3,00,000 | 50000 -> 50,000 | 1200000 -> 12,00,000
 */
export function formatIndianNumber(val: number, options?: { maxFractionDigits?: number; isCurrency?: boolean; unit?: string }): string {
  if (isNaN(val) || val === null || val === undefined) return '0';
  const maxDigits = options?.maxFractionDigits ?? (Number.isInteger(val) ? 0 : 2);
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: maxDigits,
    minimumFractionDigits: 0,
  }).format(val);

  if (options?.isCurrency || options?.unit === '₹') {
    return `₹${formatted}`;
  }
  if (options?.unit) {
    return `${formatted} ${options.unit}`;
  }
  return formatted;
}

/** Helper to parse YYYY-MM-DD to UTC midnight date timestamp */
function parseDateMs(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/**
 * Pure calculation function for all goal types.
 *
 * @param goal The goal object
 * @param metric Optional metric definition for units/directions
 * @param logs Map of daily logs keyed by date (YYYY-MM-DD)
 * @param today Date string for evaluation (YYYY-MM-DD)
 */
export function computeGoalProgress(
  goal: Goal,
  metric?: MetricDefinition,
  logs: Record<string, DailyLog> = {},
  today: string = new Date().toISOString().split('T')[0]
): GoalCalculatedProgress {
  const startDate = goal.startDate;
  const endDate = goal.endDate || goal.deadline || goal.startDate;

  const startMs = parseDateMs(startDate);
  const endMs = parseDateMs(endDate);
  const todayMs = parseDateMs(today);

  const MS_PER_DAY = 86400000;
  const totalDays = Math.max(1, Math.round((endMs - startMs) / MS_PER_DAY) + 1);
  const elapsedDays = Math.max(1, Math.min(totalDays, Math.round((todayMs - startMs) / MS_PER_DAY) + 1));
  const daysLeft = Math.max(0, Math.round((endMs - todayMs) / MS_PER_DAY) + 1);

  const timePct = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));

  const metricKey = goal.metricId || 'value';
  const unit = metric?.unit || 'units';
  const isCurrency = unit === '₹';

  let current = 0;
  let valuePct = 0;
  let requiredPerDay = 0;
  let actualPace = 0;
  let projected = 0;
  let hasData = false;

  const goalType = goal.type || (metric?.aggregation === 'sum' ? 'cumulative' : 'target');

  if (goalType === 'target') {
    // TARGET TYPE (e.g. Weight 70kg -> 65kg in 30 days)
    // Find latest logged metric value on or before `today`
    const sortedDates = Object.keys(logs)
      .filter((d) => d >= startDate && d <= today && logs[d]?.metrics?.[metricKey] !== undefined && logs[d]?.metrics?.[metricKey] !== null)
      .sort((a, b) => b.localeCompare(a));

    if (sortedDates.length > 0) {
      const latestVal = logs[sortedDates[0]].metrics[metricKey];
      if (typeof latestVal === 'number') {
        current = latestVal;
        hasData = true;
      } else {
        current = goal.startValue;
      }
    } else {
      current = goal.startValue;
    }

    const totalTargetDelta = goal.targetValue - goal.startValue; // e.g. 65 - 70 = -5
    const achievedDelta = current - goal.startValue;             // e.g. 69.5 - 70 = -0.5

    if (totalTargetDelta === 0) {
      valuePct = 100;
    } else {
      // (start - current) / (start - target) is mathematically equal to achievedDelta / totalTargetDelta
      valuePct = Math.max(0, Math.round((achievedDelta / totalTargetDelta) * 100));
    }

    const remainingToTarget = goal.targetValue - current; // e.g. 65 - 69.5 = -4.5
    requiredPerDay = daysLeft > 0 ? Number((remainingToTarget / daysLeft).toFixed(2)) : remainingToTarget;
    actualPace = elapsedDays > 0 ? Number((achievedDelta / elapsedDays).toFixed(2)) : 0;
    projected = Number((goal.startValue + actualPace * totalDays).toFixed(2));

  } else if (goalType === 'cumulative') {
    // CUMULATIVE TYPE (e.g. 3,00,000 steps this month or ₹50,000 savings)
    // SUM of metric logs between startDate and today
    let sum = 0;
    let entryCount = 0;

    Object.keys(logs).forEach((dateStr) => {
      if (dateStr >= startDate && dateStr <= today) {
        const val = logs[dateStr]?.metrics?.[metricKey];
        if (typeof val === 'number' && !isNaN(val)) {
          sum += val;
          entryCount++;
        }
      }
    });

    current = sum;
    hasData = entryCount > 0 && sum > 0;

    const target = goal.targetValue || 1;
    valuePct = Math.max(0, Math.round((current / target) * 100));

    const remaining = Math.max(0, goal.targetValue - current);
    requiredPerDay = daysLeft > 0 ? Math.round(remaining / daysLeft) : remaining;
    actualPace = elapsedDays > 0 ? Math.round(current / elapsedDays) : 0;
    projected = Math.round(actualPace * totalDays);

  } else {
    // HABIT TYPE (e.g. 20 gym sessions in 30 days)
    // Count linked task completions in date window
    let completionsCount = 0;
    Object.keys(logs).forEach((dateStr) => {
      if (dateStr >= startDate && dateStr <= today) {
        const completedIds = logs[dateStr]?.completedTaskIds || [];
        // Count if task linked or daily habit checked
        if (completedIds.includes(goal.id) || completedIds.some((id) => id.startsWith(`goal-task-${goal.id}`))) {
          completionsCount++;
        }
      }
    });

    current = completionsCount;
    hasData = completionsCount > 0;
    const target = goal.targetValue || 1;
    valuePct = Math.max(0, Math.round((current / target) * 100));

    const remaining = Math.max(0, goal.targetValue - current);
    requiredPerDay = daysLeft > 0 ? Number((remaining / daysLeft).toFixed(1)) : remaining;
    actualPace = elapsedDays > 0 ? Number((current / elapsedDays).toFixed(1)) : 0;
    projected = Math.round(actualPace * totalDays);
  }

  // ── Determine Pace Status & Color ───────────────────────────────────────
  let status: PaceStatus = 'On track';
  let statusColor = '#10B981'; // green

  if (valuePct >= 100) {
    status = 'Completed';
    statusColor = '#10B981';
  } else if (!hasData && elapsedDays <= 1) {
    status = 'No data';
    statusColor = '#64748B'; // slate
  } else if (valuePct >= timePct + 5) {
    status = 'Ahead';
    statusColor = '#10B981'; // emerald
  } else if (valuePct >= timePct - 10) {
    status = 'On track';
    statusColor = '#3B82F6'; // blue
  } else {
    status = 'Behind';
    statusColor = '#EF4444'; // red
  }

  // ── Construct Message ───────────────────────────────────────────────────
  let message = '';
  if (status === 'Completed') {
    message = 'Goal Completed 🎉';
  } else if (goal.type === 'target') {
    const sign = requiredPerDay > 0 ? '+' : '';
    const formattedReq = `${sign}${formatIndianNumber(requiredPerDay, { maxFractionDigits: 2 })} ${unit}/day`;
    message = `Need ${formattedReq} · ${status}`;
  } else if (isCurrency) {
    message = `Need ₹${formatIndianNumber(requiredPerDay)}/day · ${status}`;
  } else {
    message = `Need ${formatIndianNumber(requiredPerDay)} ${unit}/day · ${status}`;
  }

  return {
    goalId: goal.id,
    current,
    currentValue: current,
    valuePct,
    percentComplete: valuePct,
    timePct,
    requiredPerDay,
    actualPace,
    projected,
    status,
    statusLabel: status,
    statusColor,
    message,
    insightText: message,
  };
}
