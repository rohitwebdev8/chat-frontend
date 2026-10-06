/**
 * computeGoalProgress.ts — Pure functions to derive goal progress, active-day pacing, off-days, and task consistency.
 */

import { Goal, GoalCalculatedProgress, PaceStatus, GoalPauseRange } from '@/types/goals';
import { GoalTask, isTaskDueOn, formatLocalDate } from '@/types/tasks';
import { DailyLog } from '@/types/logs';

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

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getPrevDateStr(dateStr: string, offsetDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d - offsetDays);
  return formatLocalDate(dt);
}

function isDateInPauseRange(dateStr: string, pauseRanges?: GoalPauseRange[]): boolean {
  if (!pauseRanges || pauseRanges.length === 0) return false;
  return pauseRanges.some((r) => dateStr >= r.startDate && dateStr <= r.endDate);
}

function isGoalActiveDay(dateStr: string, offDays?: number[], pauseRanges?: GoalPauseRange[]): boolean {
  if (isDateInPauseRange(dateStr, pauseRanges)) return false;
  if (offDays && offDays.length > 0) {
    const dow = parseLocalDate(dateStr).getDay();
    if (offDays.includes(dow)) return false;
  }
  return true;
}

export function computeGoalProgress(
  goal: Goal,
  goalTasks: GoalTask[] = [],
  logs: Record<string, DailyLog> = {},
  today: string = formatLocalDate(new Date())
): GoalCalculatedProgress {
  const startDate = goal.startDate || today;
  const endDate = goal.endDate || startDate;

  const startDt = parseLocalDate(startDate);
  const endDt = parseLocalDate(endDate);
  const todayDt = parseLocalDate(today);

  const MS_PER_DAY = 86400000;
  const isFuture = today < startDate;
  const startsInDays = isFuture ? Math.max(1, Math.round((startDt.getTime() - todayDt.getTime()) / MS_PER_DAY)) : 0;

  // 1. Calculate Active Days in date range (excluding offDays and pauseRanges)
  const totalCalendarDays = Math.max(1, Math.round((endDt.getTime() - startDt.getTime()) / MS_PER_DAY) + 1);

  let activeDaysTotal = 0;
  let activeDaysElapsed = 0;
  let activeDaysLeft = 0;

  for (let i = 0; i < totalCalendarDays; i++) {
    const d = new Date(startDt.getTime() + i * MS_PER_DAY);
    const dStr = formatLocalDate(d);
    const isActive = isGoalActiveDay(dStr, goal.offDays, goal.pauseRanges);

    if (isActive) {
      activeDaysTotal++;
      if (dStr <= today && !isFuture) {
        activeDaysElapsed++;
      }
      if (dStr >= today) {
        activeDaysLeft++;
      }
    }
  }

  activeDaysTotal = Math.max(1, activeDaysTotal);
  activeDaysLeft = Math.max(1, activeDaysLeft);

  const timePct = isFuture ? 0 : Math.min(100, Math.max(0, Math.round((activeDaysElapsed / activeDaysTotal) * 100)));

  const startVal = goal.startValue ?? 0;
  const targetVal = goal.targetValue;
  const unit = goal.unit || '';
  const isCurrency = unit === '₹' || goal.category === 'Finance';

  let current = 0;
  let valuePct = 0;
  let requiredPerDay = 0;
  let actualPace = 0;
  let projected = 0;
  let hasData = false;

  const isOffDayToday = goal.offDays?.includes(todayDt.getDay()) ?? false;
  const isPausedToday = isDateInPauseRange(today, goal.pauseRanges);

  // 2. Compute Progress based on Goal Type (ignoring logs before startDate)
  if (goal.type === 'reach_number') {
    const sortedDates = Object.keys(logs)
      .filter((d) => d >= startDate && d <= today && logs[d]?.entries?.[goal.id] !== undefined && logs[d]?.entries?.[goal.id] !== null)
      .sort((a, b) => b.localeCompare(a));

    if (sortedDates.length > 0 && !isFuture) {
      current = logs[sortedDates[0]].entries[goal.id];
      hasData = true;
    } else {
      current = startVal;
    }

    const totalDelta = Math.abs(targetVal - startVal);
    const achievedDelta = Math.abs(current - startVal);

    if (totalDelta === 0) {
      valuePct = 100;
    } else if (startVal > targetVal) {
      valuePct = Math.max(0, Math.round(((startVal - current) / (startVal - targetVal)) * 100));
    } else {
      valuePct = Math.max(0, Math.round(((current - startVal) / (targetVal - startVal)) * 100));
    }

    const remaining = Math.abs(targetVal - current);
    requiredPerDay = activeDaysLeft > 0 ? Number((remaining / activeDaysLeft).toFixed(2)) : remaining;
    actualPace = activeDaysElapsed > 0 ? Number((achievedDelta / activeDaysElapsed).toFixed(2)) : 0;
    projected = Number((current + actualPace * activeDaysLeft).toFixed(2));

  } else if (goal.type === 'total' || goal.type === 'limit') {
    let sum = 0;
    let entriesCount = 0;

    if (!isFuture) {
      Object.keys(logs).forEach((dateStr) => {
        if (dateStr >= startDate && dateStr <= today) {
          const log = logs[dateStr];
          if (!log) return;

          if (typeof log.entries?.[goal.id] === 'number') {
            sum += log.entries[goal.id];
            entriesCount++;
          }

          goalTasks.forEach((gt) => {
            const loggedVal = log.done?.[gt.id];
            if (typeof loggedVal === 'number') {
              sum += loggedVal;
              entriesCount++;
            } else if (loggedVal === true) {
              sum += gt.plannedAmount || 1;
              entriesCount++;
            }
          });
        }
      });
    }

    current = sum;
    hasData = entriesCount > 0 || current > 0;
    valuePct = targetVal > 0 ? Math.round((current / targetVal) * 100) : 0;

    const remaining = Math.max(0, targetVal - current);
    requiredPerDay = activeDaysLeft > 0 ? Number((remaining / activeDaysLeft).toFixed(1)) : remaining;
    actualPace = activeDaysElapsed > 0 ? Number((current / activeDaysElapsed).toFixed(1)) : 0;
    projected = Math.round(actualPace * activeDaysTotal);

  } else if (goal.type === 'habit') {
    let successfulDays = 0;

    if (!isFuture) {
      Object.keys(logs).forEach((dateStr) => {
        if (dateStr >= startDate && dateStr <= today && isGoalActiveDay(dateStr, goal.offDays, goal.pauseRanges)) {
          const log = logs[dateStr];
          if (!log) return;

          let daySuccess = false;
          if (log.entries?.[goal.id] === 1) {
            daySuccess = true;
          } else if (goalTasks.length > 0) {
            const dObj = parseLocalDate(dateStr);
            const dueTasks = goalTasks.filter((t) => isTaskDueOn(t, dObj));
            if (dueTasks.length > 0) {
              const allPassed = dueTasks.every((t) => {
                // If skipped, not penalised
                if (log.skipped?.[t.id]) return true;
                const val = log.done?.[t.id];
                if (t.avoidSuccess) return val !== false;
                return Boolean(val);
              });
              if (allPassed) daySuccess = true;
            }
          }

          if (daySuccess) successfulDays++;
        }
      });
    }

    current = successfulDays;
    hasData = successfulDays > 0;
    valuePct = targetVal > 0 ? Math.round((current / targetVal) * 100) : 0;

    const remaining = Math.max(0, targetVal - current);
    requiredPerDay = activeDaysLeft > 0 ? Number((remaining / activeDaysLeft).toFixed(1)) : remaining;
    actualPace = activeDaysElapsed > 0 ? Number((current / activeDaysElapsed).toFixed(1)) : 0;
    projected = Math.round(actualPace * activeDaysTotal);
  }

  // 3. Streaks
  let streakCurrent = 0;
  let streakBest = 0;
  let tempStreak = 0;

  if (!isFuture) {
    for (let i = 0; i <= activeDaysElapsed; i++) {
      const dStr = getPrevDateStr(today, i);
      if (dStr < startDate) break;

      if (!isGoalActiveDay(dStr, goal.offDays, goal.pauseRanges)) {
        continue; // Off days and pause days don't break streak!
      }

      const log = logs[dStr];
      let isSuccess = false;

      if (log) {
        if (log.entries?.[goal.id] === 1) isSuccess = true;
        else if (goalTasks.length > 0) {
          const dueTasks = goalTasks.filter((t) => isTaskDueOn(t, parseLocalDate(dStr)));
          if (
            dueTasks.length > 0 &&
            dueTasks.every((t) => (log.skipped?.[t.id] ? true : t.avoidSuccess ? log.done?.[t.id] !== false : Boolean(log.done?.[t.id])))
          ) {
            isSuccess = true;
          }
        }
      }

      if (isSuccess) {
        tempStreak++;
        if (i === 0 || i === 1) streakCurrent = tempStreak;
        if (tempStreak > streakBest) streakBest = tempStreak;
      } else {
        if (i === 0) continue;
        tempStreak = 0;
      }
    }
  }

  // 4. Task Consistency over last 7 days (ignoring off days and skipped tasks)
  let last7Due = 0;
  let last7Done = 0;
  let todayDueCount = 0;
  let todayDoneCount = 0;

  for (let i = 0; i < 7; i++) {
    const dStr = getPrevDateStr(today, i);
    if (dStr < startDate) continue;

    // Skip off days or paused days from consistency
    if (!isGoalActiveDay(dStr, goal.offDays, goal.pauseRanges)) {
      continue;
    }

    const dObj = parseLocalDate(dStr);
    const log = logs[dStr];

    goalTasks.forEach((gt) => {
      // If task marked skipped for this date, ignore from consistency
      if (log?.skipped?.[gt.id]) return;

      if (isTaskDueOn(gt, dObj)) {
        last7Due++;
        const doneVal = log?.done?.[gt.id];
        const isDone = Boolean(doneVal);
        if (isDone) last7Done++;

        if (i === 0) {
          todayDueCount++;
          if (isDone) todayDoneCount++;
        }
      }
    });
  }

  const consistencyLast7DaysPct = last7Due > 0 ? Math.round((last7Done / last7Due) * 100) : 100;

  // 5. Pace Status Determination
  let status: PaceStatus = 'On track';
  let statusColor = '#10B981';

  if (isFuture) {
    status = 'No data';
    statusColor = '#64748B';
  } else if (goal.type === 'limit') {
    if (current > targetVal) {
      status = 'Exceeded';
      statusColor = '#EF4444';
    } else {
      status = 'On track';
      statusColor = '#10B981';
    }
  } else if (valuePct >= 100 || goal.status === 'done') {
    status = 'Completed';
    statusColor = '#10B981';
  } else if (!hasData && activeDaysElapsed <= 1) {
    status = 'No data';
    statusColor = '#64748B';
  } else if (valuePct >= timePct + 5) {
    status = 'Ahead';
    statusColor = '#10B981';
  } else if (valuePct >= timePct - 10) {
    status = 'On track';
    statusColor = '#3B82F6';
  } else {
    status = 'Behind';
    statusColor = '#EF4444';
  }

  // 6. Pace Message & Suggestions
  let message = '';
  let paceSuggestion: GoalCalculatedProgress['paceSuggestion'] = undefined;

  if (isFuture) {
    message = `Starts in ${startsInDays} day${startsInDays > 1 ? 's' : ''} (${startDate})`;
  } else if (isPausedToday) {
    message = 'Goal is currently paused (rest/travel)';
  } else if (isOffDayToday) {
    message = 'Today is a scheduled off-day';
  } else if (status === 'Completed') {
    message = 'Goal Completed 🎉';
  } else if (goal.type === 'limit') {
    const formattedVal = formatIndianNumber(current, { isCurrency, unit });
    const formattedTarget = formatIndianNumber(targetVal, { isCurrency, unit });
    message = `${formattedVal} / limit ${formattedTarget} · ${status}`;
  } else if (goal.type === 'reach_number') {
    const formattedReq = `${formatIndianNumber(requiredPerDay, { maxFractionDigits: 2 })} ${unit}/active day`;
    message = `Need ${formattedReq} · ${status}`;
  } else {
    const unitLabel = unit ? ` ${unit}` : '';
    const formattedReq = formatIndianNumber(requiredPerDay);
    const formattedActual = formatIndianNumber(actualPace);

    message = `Need ${formattedReq}${unitLabel}/active day; your pace ${formattedActual}${unitLabel}/day.`;

    if (requiredPerDay > actualPace && requiredPerDay > 0) {
      const extraNeeded = Math.ceil(requiredPerDay - actualPace);
      const targetTask = goalTasks.find((t) => t.kind === 'amount') || goalTasks[0];
      if (targetTask) {
        const currentPlanned = targetTask.plannedAmount || 1;
        const suggestedAmount = Math.max(currentPlanned + extraNeeded, Math.ceil(requiredPerDay));
        paceSuggestion = {
          text: `Catch-up: add ${extraNeeded} extra ${unit || 'unit'}/day?`,
          suggestedAmount,
          taskId: targetTask.id,
        };
      }
    }
  }

  return {
    goalId: goal.id,
    current,
    currentValue: current,
    targetValue: targetVal,
    startValue: startVal,
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
    isFuture,
    startsInDays,
    isOffDayToday,
    isPausedToday,
    activeDaysTotal,
    activeDaysElapsed,
    activeDaysLeft,
    paceSuggestion,
    consistencyLast7DaysPct,
    todayDueCount,
    todayDoneCount,
    streakCurrent,
    streakBest,
  };
}
