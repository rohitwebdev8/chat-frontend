import { Goal, GoalCalculatedProgress, GoalCategory } from '@/types/goals';
import { DailyLog } from '@/types/tracker';
import { calculateGoalProgress } from './goalProgress';

export interface LifeAreaScore {
  category: GoalCategory;
  score: number; // 0 - 100
  status: string;
}

export interface PatternInsight {
  id: string;
  type: 'warning' | 'positive' | 'info';
  title: string;
  description: string;
}

export interface ComprehensiveInsights {
  lifeScore: number; // 0 - 100
  topLackingGoals: { goal: Goal; progress: GoalCalculatedProgress }[];
  topStrengthGoals: { goal: Goal; progress: GoalCalculatedProgress }[];
  lifeAreaScores: LifeAreaScore[];
  detectedPatterns: PatternInsight[];
  actionableSuggestions: string[];
}

/**
 * Calculates overall weighted Life Score (0 - 100) based on goal priority.
 * High priority = weight 3, Medium = weight 2, Low = weight 1.
 */
export function calculateLifeScore(
  goals: Goal[],
  logs: Record<string, DailyLog>
): number {
  const activeGoals = goals.filter((g) => g.status === 'active');
  if (activeGoals.length === 0) return 0; // 0 if no active goals defined

  let weightedScoreSum = 0;
  let totalWeight = 0;

  activeGoals.forEach((goal) => {
    const progress = calculateGoalProgress(goal, logs);
    const weightMultiplier = goal.priority === 'high' ? 3 : goal.priority === 'medium' ? 2 : 1;

    let score = 0;
    if (progress.statusLabel === 'Completed') score = 100;
    else if (progress.statusLabel === 'Ahead') score = 95;
    else if (progress.statusLabel === 'On track') score = Math.max(70, progress.percentComplete);
    else if (progress.statusLabel === 'Slightly behind') score = Math.max(50, progress.percentComplete);
    else if (progress.statusLabel === 'Behind') score = Math.max(30, progress.percentComplete);
    else if (progress.statusLabel === 'Off track') score = progress.percentComplete;
    else score = 0;

    weightedScoreSum += score * weightMultiplier;
    totalWeight += weightMultiplier;
  });

  return totalWeight > 0 ? Math.round(weightedScoreSum / totalWeight) : 0;
}

/**
 * Ranks goals from most behind to most ahead and returns top lacking & top strengths.
 */
export function rankGoals(
  goals: Goal[],
  logs: Record<string, DailyLog>
): {
  topLacking: { goal: Goal; progress: GoalCalculatedProgress }[];
  topStrengths: { goal: Goal; progress: GoalCalculatedProgress }[];
} {
  const activeGoals = goals.filter((g) => g.status === 'active');
  const evaluated = activeGoals.map((goal) => ({
    goal,
    progress: calculateGoalProgress(goal, logs),
  }));

  // Sort by actual vs expected diff ascending (most behind first)
  evaluated.sort((a, b) => a.progress.actualVsExpectedDiff - b.progress.actualVsExpectedDiff);

  const topLacking = evaluated.slice(0, 3);

  // Reverse sort for strengths (most ahead / highest completion first)
  const evaluatedStrengths = [...evaluated].sort(
    (a, b) => b.progress.percentComplete - a.progress.percentComplete
  );
  const topStrengths = evaluatedStrengths.slice(0, 3);

  return { topLacking, topStrengths };
}

/**
 * Scores life areas 0-100 across Health, Fitness, Diet, Study, Career.
 */
export function calculateLifeAreaScores(
  goals: Goal[],
  logs: Record<string, DailyLog>
): LifeAreaScore[] {
  const categories: GoalCategory[] = ['Health', 'Fitness', 'Diet', 'Study', 'Career', 'Personal'];

  return categories.map((cat) => {
    const catGoals = goals.filter((g) => g.category === cat && g.status === 'active');
    if (catGoals.length === 0) {
      return { category: cat, score: 70, status: 'Balanced' };
    }

    const totalPct = catGoals.reduce((sum, g) => {
      const p = calculateGoalProgress(g, logs);
      return sum + p.percentComplete;
    }, 0);

    const score = Math.round(totalPct / catGoals.length);
    let status = 'Balanced';
    if (score >= 85) status = 'Excellent';
    else if (score >= 65) status = 'Good';
    else if (score >= 45) status = 'Needs Attention';
    else status = 'Critical Focus';

    return { category: cat, score, status };
  });
}

/**
 * Detects behavior patterns without needing external AI (using statistical heuristic rules).
 */
export function detectPatterns(logs: Record<string, DailyLog>): PatternInsight[] {
  const sortedDates = Object.keys(logs).sort();
  if (sortedDates.length < 5) {
    return [
      {
        id: 'pattern-1',
        type: 'info',
        title: 'Building Tracking History',
        description: 'Keep logging daily! 5+ days of logs unlock automated behavioral pattern detection.',
      },
    ];
  }

  const patterns: PatternInsight[] = [];

  // Rule 1: Weekend Step drop detection
  let weekdayStepSum = 0;
  let weekdayCount = 0;
  let weekendStepSum = 0;
  let weekendCount = 0;

  let junkFoodWorkoutSkipCount = 0;

  sortedDates.forEach((dStr) => {
    const log = logs[dStr];
    const dateObj = new Date(dStr);
    const dayOfWeek = dateObj.getDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekendStepSum += log.steps || 0;
      weekendCount++;
    } else {
      weekdayStepSum += log.steps || 0;
      weekdayCount++;
    }

    if (log.hadJunkFood && !log.workoutDone && !log.gymDone && !log.swimmingDone) {
      junkFoodWorkoutSkipCount++;
    }
  });

  const avgWeekdaySteps = weekdayCount > 0 ? Math.round(weekdayStepSum / weekdayCount) : 0;
  const avgWeekendSteps = weekendCount > 0 ? Math.round(weekendStepSum / weekendCount) : 0;

  if (avgWeekendSteps > 0 && avgWeekendSteps < avgWeekdaySteps * 0.7) {
    patterns.push({
      id: 'p-weekend-drop',
      type: 'warning',
      title: 'Weekend Step Drop',
      description: `Your average step count drops on weekends (${avgWeekendSteps.toLocaleString()} steps vs ${avgWeekdaySteps.toLocaleString()} weekdays). Try a weekend morning walk!`,
    });
  }

  if (junkFoodWorkoutSkipCount >= 2) {
    patterns.push({
      id: 'p-junk-workout',
      type: 'warning',
      title: 'Junk Food & Workout Skip Pattern',
      description: `You tend to skip workouts on days with junk food (${junkFoodWorkoutSkipCount} times observed). Staying active on treat days helps maintain momentum!`,
    });
  }

  // Positive Study pattern
  let studyHoursSum = 0;
  sortedDates.forEach((dStr) => {
    const l = logs[dStr];
    studyHoursSum += (l.reactHours || 0) + (l.backendHours || 0);
  });

  if (studyHoursSum > 10) {
    patterns.push({
      id: 'p-study-strong',
      type: 'positive',
      title: 'Strong Study Momentum',
      description: `Great job! You've logged ${studyHoursSum.toFixed(1)} total study hours. Consistency is key to mastering Full Stack engineering.`,
    });
  }

  return patterns;
}

/**
 * Generates 2-3 specific actionable suggestions based on lacking goals.
 */
export function generateActionableSuggestions(
  lackingGoals: { goal: Goal; progress: GoalCalculatedProgress }[]
): string[] {
  if (lackingGoals.length === 0) {
    return [
      '🎯 Keep maintaining your current daily streak!',
      '💪 Log today weight and water intake.',
    ];
  }

  const suggestions: string[] = [];

  lackingGoals.slice(0, 3).forEach(({ goal, progress }) => {
    if (goal.linkedMetric === 'dsaQuestions') {
      suggestions.push(`💡 Solve 2-3 DSA questions today to catch up on your ${goal.title} goal.`);
    } else if (goal.linkedMetric === 'steps') {
      suggestions.push(`🏃 Go for a 20-min evening walk to hit your step target for ${goal.title}.`);
    } else if (goal.linkedMetric === 'weight') {
      suggestions.push(`🥗 Stick to your daily calorie target today to get back on track for ${goal.title}.`);
    } else if (goal.linkedMetric === 'jobApplications') {
      suggestions.push(`💼 Submit 2 applications today to maintain progress on ${goal.title}.`);
    } else {
      suggestions.push(`📌 Complete today's focus tasks for ${goal.title} (${progress.statusLabel}).`);
    }
  });

  return suggestions;
}
