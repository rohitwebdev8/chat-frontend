/**
 * computeGoalProgress.test.ts — Unit tests for acceptance criteria.
 */

declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void) => void;
declare const expect: (val: any) => any;

import { computeGoalProgress, formatIndianNumber } from '../computeGoalProgress';
import { Goal } from '@/types/goals';
import { GoalTask } from '@/types/tasks';
import { DailyLog, createEmptyLog } from '@/types/logs';

describe('computeGoalProgress Unit Tests', () => {
  it('a) Weight goal 70->65 kg in 30 days: logging 69.5 gives 10% value progress and correct status', () => {
    const weightGoal: Goal = {
      id: 'g-weight',
      title: 'Weight Loss',
      category: 'Health',
      type: 'reach_number',
      unit: 'kg',
      startValue: 70,
      targetValue: 65,
      startDate: '2026-10-01',
      endDate: '2026-10-30',
      status: 'active',
    };

    const logs: Record<string, DailyLog> = {
      '2026-10-03': {
        ...createEmptyLog('2026-10-03'),
        entries: { 'g-weight': 69.5 },
      },
    };

    const result = computeGoalProgress(weightGoal, [], logs, '2026-10-03');

    expect(result.current).toBe(69.5);
    // (70 - 69.5) / (70 - 65) = 10%
    expect(result.valuePct).toBe(10);
    expect(result.status).toBe('On track');
  });

  it('b) Study 100 h in 30 days: ticking task Adds 3 h and computes pace correctly', () => {
    const studyGoal: Goal = {
      id: 'g-study',
      title: 'Study 100 Hours',
      category: 'Study',
      type: 'total',
      unit: 'hours',
      targetValue: 100,
      startDate: '2026-10-01',
      endDate: '2026-10-30',
      status: 'active',
    };

    const studyTask: GoalTask = {
      id: 'gtask-dsa',
      goalId: 'g-study',
      title: 'DSA 3 h',
      kind: 'amount',
      plannedAmount: 3,
      unit: 'hours',
      repeat: { type: 'daily' },
      active: true,
    };

    const logs: Record<string, DailyLog> = {
      '2026-10-01': {
        ...createEmptyLog('2026-10-01'),
        done: { 'gtask-dsa': 3 },
      },
    };

    const result = computeGoalProgress(studyGoal, [studyTask], logs, '2026-10-01');

    expect(result.current).toBe(3);
    expect(result.valuePct).toBe(3);
  });

  it('c) Gym habit 20 days with Mondays off: consistency is not penalised, active days exclude off days', () => {
    // 2026-10-01 (Thu) to 2026-10-30 (Fri): 30 calendar days
    // Mondays in this range: Oct 5, Oct 12, Oct 19, Oct 26 (4 Mondays) -> 26 active days
    const gymGoal: Goal = {
      id: 'g-gym',
      title: 'Gym Workout',
      category: 'Fitness',
      type: 'habit',
      targetValue: 20,
      startDate: '2026-10-01',
      endDate: '2026-10-30',
      offDays: [1], // Monday = 1 off
      status: 'active',
    };

    const gymTask: GoalTask = {
      id: 'gtask-gym',
      goalId: 'g-gym',
      title: 'Go to Gym',
      kind: 'check',
      repeat: { type: 'weekdays', days: [0, 2, 3, 4, 5, 6] }, // no Monday
      active: true,
    };

    const logs: Record<string, DailyLog> = {
      '2026-10-01': { ...createEmptyLog('2026-10-01'), done: { 'gtask-gym': true } },
      '2026-10-02': { ...createEmptyLog('2026-10-02'), done: { 'gtask-gym': true } },
      '2026-10-03': { ...createEmptyLog('2026-10-03'), done: { 'gtask-gym': true } },
      '2026-10-04': { ...createEmptyLog('2026-10-04'), done: { 'gtask-gym': true } },
      // 2026-10-05 is Monday (off day, no log)
    };

    // Evaluate on Monday 2026-10-05
    const result = computeGoalProgress(gymGoal, [gymTask], logs, '2026-10-05');

    expect(result.isOffDayToday).toBe(true);
    expect(result.current).toBe(4); // 4 successful days
    expect(result.activeDaysTotal).toBe(26); // 30 - 4 Mondays
    expect(result.consistencyLast7DaysPct).toBe(100); // 100% consistency (Monday not penalised)
  });

  it('d) Study 100 h with Sundays off: required/day increases correctly over active days', () => {
    // Oct 1 to Oct 30 (30 days), Sundays = Oct 4, 11, 18, 25 (4 Sundays) -> 26 active days
    const studyGoal: Goal = {
      id: 'g-study-sun-off',
      title: 'Study 100 Hours',
      category: 'Study',
      type: 'total',
      unit: 'hours',
      targetValue: 100,
      startDate: '2026-10-01',
      endDate: '2026-10-30',
      offDays: [0], // Sunday off
      status: 'active',
    };

    const result = computeGoalProgress(studyGoal, [], {}, '2026-10-01');

    // 100 hours remaining / 26 active days = ~3.85 h/day (vs 3.33 h/day over 30 days)
    expect(result.activeDaysTotal).toBe(26);
    expect(result.activeDaysLeft).toBe(26);
    expect(result.requiredPerDay).toBe(3.8); // 100 / 26 = 3.8
  });

  it('e) Future goal starting tomorrow: isFuture is true, startsInDays > 0, logs before start date ignored', () => {
    const futureGoal: Goal = {
      id: 'g-future',
      title: 'Future Marathon',
      category: 'Fitness',
      type: 'total',
      targetValue: 42,
      startDate: '2026-10-10',
      endDate: '2026-11-10',
      status: 'active',
    };

    const logs: Record<string, DailyLog> = {
      '2026-10-06': { ...createEmptyLog('2026-10-06'), entries: { 'g-future': 10 } }, // prior to start date
    };

    const result = computeGoalProgress(futureGoal, [], logs, '2026-10-06');

    expect(result.isFuture).toBe(true);
    expect(result.startsInDays).toBe(4);
    expect(result.current).toBe(0); // logs before start date ignored
    expect(result.timePct).toBe(0);
  });

  it('f) Task skip today: excluded from consistency % and not counted as failure', () => {
    const habitGoal: Goal = {
      id: 'g-habit',
      title: 'Daily Meditation',
      category: 'Health',
      type: 'habit',
      targetValue: 30,
      startDate: '2026-10-01',
      endDate: '2026-10-30',
      status: 'active',
    };

    const medTask: GoalTask = {
      id: 'gtask-med',
      goalId: 'g-habit',
      title: 'Meditation 10 min',
      kind: 'check',
      repeat: { type: 'daily' },
      active: true,
    };

    const logs: Record<string, DailyLog> = {
      '2026-10-01': { ...createEmptyLog('2026-10-01'), done: { 'gtask-med': true } },
      '2026-10-02': { ...createEmptyLog('2026-10-02'), skipped: { 'gtask-med': true } }, // skipped
    };

    const result = computeGoalProgress(habitGoal, [medTask], logs, '2026-10-02');

    expect(result.consistencyLast7DaysPct).toBe(100); // Skipped day is ignored, 1/1 = 100%
  });

  it('g) Indian number formatting check', () => {
    expect(formatIndianNumber(50000, { unit: '₹' })).toBe('₹50,000');
    expect(formatIndianNumber(300000)).toBe('3,00,000');
  });
});
