/**
 * metrics.ts — Dynamic Metric Registry Types & Defaults.
 * Path: users/{uid}/metrics/{metricId}
 */

export type MetricAggregation = 'latest' | 'sum' | 'avg';
export type MetricDirection = 'increase' | 'decrease';

export interface MetricDefinition {
  id: string;                    // e.g. 'weight', 'steps', 'water', 'calories', 'protein', 'savings', 'custom_xxx'
  name: string;                  // 'Weight', 'Steps', 'Pages read'
  unit: string;                  // 'kg', 'steps', 'L', 'kcal', 'g', '₹', 'pages', 'hrs'
  icon: string;                  // '⚖️', '👟', '💧', '🔥', '🥩', '💰', '📖'
  aggregation: MetricAggregation; // 'latest' | 'sum' | 'avg'
  direction: MetricDirection;    // 'increase' | 'decrease'
  dailyTarget?: number;
  pinned: boolean;
  builtIn: boolean;
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_METRICS: MetricDefinition[] = [
  {
    id: 'weight',
    name: 'Weight',
    unit: 'kg',
    icon: '⚖️',
    aggregation: 'latest',
    direction: 'decrease',
    pinned: true,
    builtIn: true,
  },
  {
    id: 'steps',
    name: 'Steps',
    unit: 'steps',
    icon: '👟',
    aggregation: 'sum',
    direction: 'increase',
    dailyTarget: 10000,
    pinned: true,
    builtIn: true,
  },
  {
    id: 'water',
    name: 'Water',
    unit: 'L',
    icon: '💧',
    aggregation: 'sum',
    direction: 'increase',
    dailyTarget: 3,
    pinned: true,
    builtIn: true,
  },
  {
    id: 'calories',
    name: 'Calories',
    unit: 'kcal',
    icon: '🔥',
    aggregation: 'sum',
    direction: 'increase',
    dailyTarget: 2000,
    pinned: true,
    builtIn: true,
  },
  {
    id: 'protein',
    name: 'Protein',
    unit: 'g',
    icon: '🥩',
    aggregation: 'sum',
    direction: 'increase',
    dailyTarget: 140,
    pinned: true,
    builtIn: true,
  },
  {
    id: 'savings',
    name: 'Savings',
    unit: '₹',
    icon: '💰',
    aggregation: 'sum',
    direction: 'increase',
    pinned: true,
    builtIn: true,
  },
];
