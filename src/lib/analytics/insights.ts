import { Goal, GoalCalculatedProgress, GoalCategory } from '@/types/goals';
import { calculateGoalProgress } from './goalProgress';

export interface LifeAreaScore {
  category: GoalCategory;
  score: number;
  status: string;
}

export interface PatternInsight {
  id: string;
  type: 'warning' | 'positive' | 'info';
  title: string;
  description: string;
}

export interface ComprehensiveInsights {
  lifeScore: number;
  topLackingGoals: { goal: Goal; progress: GoalCalculatedProgress }[];
  topStrengthGoals: { goal: Goal; progress: GoalCalculatedProgress }[];
  lifeAreaScores: LifeAreaScore[];
  detectedPatterns: PatternInsight[];
  actionableSuggestions: string[];
}

export function calculateLifeScore(
  goals: Goal[],
  logs: Record<string, any>
): number {
  const activeGoals = goals.filter((g) => g.status === 'active');
  if (activeGoals.length === 0) return 0;

  let weightedScoreSum = 0;
  let totalWeight = 0;

  activeGoals.forEach((goal) => {
    const progress = calculateGoalProgress(goal, logs);
    const weightMultiplier = goal.priority === 'high' ? 3 : goal.priority === 'medium' ? 2 : 1;
    const pct = progress.valuePct ?? progress.percentComplete ?? 0;

    let score = 0;
    if (progress.status === 'Completed') score = 100;
    else if (progress.status === 'Ahead') score = 95;
    else if (progress.status === 'On track') score = Math.max(70, pct);
    else if (progress.status === 'Behind') score = Math.max(30, pct);
    else score = pct;

    weightedScoreSum += score * weightMultiplier;
    totalWeight += weightMultiplier;
  });

  return totalWeight > 0 ? Math.round(weightedScoreSum / totalWeight) : 0;
}

export function getRankedGoals(
  goals: Goal[],
  logs: Record<string, any>
): {
  topLacking: { goal: Goal; progress: GoalCalculatedProgress }[];
  topStrengths: { goal: Goal; progress: GoalCalculatedProgress }[];
} {
  const activeGoals = goals.filter((g) => g.status === 'active');
  const evaluated = activeGoals.map((goal) => ({
    goal,
    progress: calculateGoalProgress(goal, logs),
  }));

  evaluated.sort((a, b) => (a.progress.valuePct ?? 0) - (b.progress.valuePct ?? 0));
  const topLacking = evaluated.slice(0, 3);

  const evaluatedStrengths = [...evaluated].sort(
    (a, b) => (b.progress.valuePct ?? 0) - (a.progress.valuePct ?? 0)
  );
  const topStrengths = evaluatedStrengths.slice(0, 3);

  return { topLacking, topStrengths };
}

export const rankGoals = getRankedGoals;
export const detectPatterns = (_logs: any): PatternInsight[] => [];
export const generateActionableSuggestions = (_lacking?: any): string[] => [
  'Stay consistent with today\'s scheduled goal subtasks!',
];

export function calculateLifeAreaScores(
  goals: Goal[],
  logs: Record<string, any>
): LifeAreaScore[] {
  const categories: GoalCategory[] = ['Health', 'Fitness', 'Diet', 'Study', 'Career', 'Personal'];

  return categories.map((cat) => {
    const catGoals = goals.filter((g) => g.category === cat && g.status === 'active');
    if (catGoals.length === 0) {
      return { category: cat, score: 70, status: 'Balanced' };
    }

    const totalPct = catGoals.reduce((sum, g) => {
      const p = calculateGoalProgress(g, logs);
      return sum + (p.valuePct ?? p.percentComplete ?? 0);
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

export function generateComprehensiveInsights(
  goals: Goal[],
  logs: Record<string, any>
): ComprehensiveInsights {
  const lifeScore = calculateLifeScore(goals, logs);
  const { topLacking, topStrengths } = getRankedGoals(goals, logs);
  const lifeAreaScores = calculateLifeAreaScores(goals, logs);

  return {
    lifeScore,
    topLackingGoals: topLacking,
    topStrengthGoals: topStrengths,
    lifeAreaScores,
    detectedPatterns: [],
    actionableSuggestions: ['Keep up consistent daily tasks for your active goals!'],
  };
}
