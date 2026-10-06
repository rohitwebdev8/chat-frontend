/**
 * computeGoalProgress.test.ts — Unit tests for acceptance criteria.
 */

declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void) => void;
declare const expect: (val: any) => any;

import { computeGoalProgress, formatIndianNumber } from '../computeGoalProgress';
import { Goal } from '@/types/goals';
import { MetricDefinition } from '@/types/metrics';
import { DailyLog, createEmptyLog } from '@/types/logs';

describe('computeGoalProgress Unit Tests', () => {
  // Test 1: Weight goal 70 -> 65 kg in 30 days
  it('a) Weight goal 70->65 kg in 30 days: logging 69.5 gives 10% value progress and correct timeline/status', () => {
    const weightGoal: Goal = {
      id: 'g-weight',
      title: 'Weight Loss',
      category: 'Health',
      type: 'target',
      metricId: 'weight',
      startValue: 70,
      targetValue: 65,
      startDate: '2026-10-01',
      endDate: '2026-10-30',
      status: 'active',
      createdAt: '2026-10-01',
      updatedAt: '2026-10-01',
    };

    const weightMetric: MetricDefinition = {
      id: 'weight',
      name: 'Weight',
      unit: 'kg',
      icon: '⚖️',
      aggregation: 'latest',
      direction: 'decrease',
      pinned: true,
      builtIn: true,
    };

    const logs: Record<string, DailyLog> = {
      '2026-10-03': {
        ...createEmptyLog('2026-10-03'),
        metrics: { weight: 69.5 },
      },
    };

    const result = computeGoalProgress(weightGoal, weightMetric, logs, '2026-10-03');

    expect(result.current).toBe(69.5);
    // (70 - 69.5) / (70 - 65) = 0.5 / 5 = 10%
    expect(result.valuePct).toBe(10);
    // Day 3 of 30 is 10% timeline
    expect(result.timePct).toBe(10);
    expect(result.status).toBe('On track');
    expect(result.requiredPerDay).toBeLessThan(0); // Need negative weight delta per day
  });

  // Test 2: Cumulative steps goal 3,00,000 this month
  it('b) Cumulative steps goal 3,00,000 this month: logging 10,000 daily gives exact required/day and projection', () => {
    const stepsGoal: Goal = {
      id: 'g-steps',
      title: 'Monthly Steps',
      category: 'Fitness',
      type: 'cumulative',
      metricId: 'steps',
      startValue: 0,
      targetValue: 300000,
      startDate: '2026-10-01',
      endDate: '2026-10-30',
      status: 'active',
      createdAt: '2026-10-01',
      updatedAt: '2026-10-01',
    };

    const stepsMetric: MetricDefinition = {
      id: 'steps',
      name: 'Steps',
      unit: 'steps',
      icon: '👟',
      aggregation: 'sum',
      direction: 'increase',
      dailyTarget: 10000,
      pinned: true,
      builtIn: true,
    };

    // 5 days of 10,000 steps = 50,000 steps logged
    const logs: Record<string, DailyLog> = {};
    for (let d = 1; d <= 5; d++) {
      const date = `2026-10-0${d}`;
      logs[date] = {
        ...createEmptyLog(date),
        metrics: { steps: 10000 },
      };
    }

    const result = computeGoalProgress(stepsGoal, stepsMetric, logs, '2026-10-05');

    expect(result.current).toBe(50000);
    // 50,000 / 3,00,000 = 16.67% -> 17%
    expect(result.valuePct).toBe(17);
    expect(result.projected).toBe(300000); // 10k * 30 days = 3,00,000
    expect(result.requiredPerDay).toBeGreaterThan(0);
    expect(result.status).toBe('On track');
  });

  // Test 3: Savings goal ₹50,000 with custom savings metric
  it('c) Savings goal ₹50,000 using custom savings metric: adding ₹2,000 formats correctly with Indian numbering', () => {
    const savingsGoal: Goal = {
      id: 'g-savings',
      title: 'Emergency Fund',
      category: 'Finance',
      type: 'cumulative',
      metricId: 'savings',
      startValue: 0,
      targetValue: 50000,
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      status: 'active',
      createdAt: '2026-10-01',
      updatedAt: '2026-10-01',
    };

    const savingsMetric: MetricDefinition = {
      id: 'savings',
      name: 'Savings',
      unit: '₹',
      icon: '💰',
      aggregation: 'sum',
      direction: 'increase',
      pinned: true,
      builtIn: true,
    };

    const logs: Record<string, DailyLog> = {
      '2026-10-01': {
        ...createEmptyLog('2026-10-01'),
        metrics: { savings: 2000 },
      },
    };

    const result = computeGoalProgress(savingsGoal, savingsMetric, logs, '2026-10-01');

    expect(result.current).toBe(2000);
    // 2000 / 50000 = 4%
    expect(result.valuePct).toBe(4);
    expect(formatIndianNumber(50000, { unit: '₹' })).toBe('₹50,000');
    expect(formatIndianNumber(300000)).toBe('3,00,000');
  });
});
