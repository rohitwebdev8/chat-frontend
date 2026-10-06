import { DailyLog } from '@/types/tracker';
import { calculateDailySnapshot } from './completion';
import { DailySnapshot, MonthSummary } from '@/types/calendar';

export interface MissedHabitInsight {
  title: string;
  category: string;
  missedCount: number;
  mostMissedWeekday: string;
}

/**
 * Returns color hex code for a day's completion percentage cell.
 */
export function getCompletionCellColor(pct: number | null | undefined): string {
  if (pct === null || pct === undefined) return '#F1F3F5'; // No data Grey
  if (pct >= 100) return '#2B8A3E'; // 100% Dark Green
  if (pct >= 80) return '#51CF66'; // 80-99% Light Green
  if (pct >= 50) return '#FCC419'; // 50-79% Yellow
  if (pct >= 1) return '#FF922B'; // 1-49% Orange
  return '#FF6B6B'; // 0% Red
}

/**
 * Generates month summary statistics for a given year and month (1-12).
 */
export function calculateMonthSummary(
  year: number,
  month: number,
  logs: Record<string, DailyLog>
): MonthSummary {
  const datePrefix = `${year}-${String(month).padStart(2, '0')}`;
  const monthDates = Object.keys(logs).filter((d) => d.startsWith(datePrefix)).sort();

  const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' });

  if (monthDates.length === 0) {
    return {
      year,
      month,
      monthName,
      avgCompletionPct: 0,
      bestDay: null,
      worstDay: null,
      perfectDaysCount: 0,
      currentStreak: 0,
      bestStreak: 0,
    };
  }

  const snapshots = monthDates.map((d) => calculateDailySnapshot(d, logs[d]));

  let sumPct = 0;
  let perfectCount = 0;
  let bestDay: string | null = null;
  let maxPct = -1;
  let worstDay: string | null = null;
  let minPct = 101;

  snapshots.forEach((snap) => {
    sumPct += snap.completionPercent;
    if (snap.completionPercent === 100) perfectCount++;

    if (snap.completionPercent > maxPct) {
      maxPct = snap.completionPercent;
      bestDay = snap.date;
    }

    if (snap.completionPercent < minPct) {
      minPct = snap.completionPercent;
      worstDay = snap.date;
    }
  });

  const avgCompletionPct = Math.round(sumPct / snapshots.length);

  return {
    year,
    month,
    monthName,
    avgCompletionPct,
    bestDay,
    worstDay,
    perfectDaysCount: perfectCount,
    currentStreak: 0,
    bestStreak: 0,
  };
}

/**
 * Ranks habits most frequently missed and identifies the weekday missed most often.
 */
export function calculateMissedHabitsInsights(logs: Record<string, DailyLog>): MissedHabitInsight[] {
  const dates = Object.keys(logs);
  if (dates.length === 0) return [];

  const missedMap: Record<string, { title: string; category: string; count: number; weekdayCounts: Record<string, number> }> = {};

  dates.forEach((dStr) => {
    const snap = calculateDailySnapshot(dStr, logs[dStr]);
    snap.tasks.forEach((t) => {
      if (t.status === 'missed') {
        if (!missedMap[t.title]) {
          missedMap[t.title] = {
            title: t.title,
            category: t.category,
            count: 0,
            weekdayCounts: {},
          };
        }
        missedMap[t.title].count++;
        const dayOfWeek = snap.dayOfWeek;
        missedMap[t.title].weekdayCounts[dayOfWeek] = (missedMap[t.title].weekdayCounts[dayOfWeek] || 0) + 1;
      }
    });
  });

  const results: MissedHabitInsight[] = Object.values(missedMap).map((item) => {
    let mostMissedWeekday = 'Friday';
    let maxCount = 0;

    Object.keys(item.weekdayCounts).forEach((wd) => {
      if (item.weekdayCounts[wd] > maxCount) {
        maxCount = item.weekdayCounts[wd];
        mostMissedWeekday = wd;
      }
    });

    return {
      title: item.title,
      category: item.category,
      missedCount: item.count,
      mostMissedWeekday,
    };
  });

  results.sort((a, b) => b.missedCount - a.missedCount);
  return results.slice(0, 5);
}
