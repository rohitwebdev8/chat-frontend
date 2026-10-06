export interface CalorieRecommendation {
  suggestedCalorieTarget: number;
  suggestedProteinTarget: number;
  weeklyWeightLossRateKg: number; // e.g. 0.6 kg/week
  isDeadlineFeasible: boolean;
  warningMessage?: string;
  daysRemaining: number;
}

/**
 * Calculates a safe daily calorie target based on current weight, target weight, and deadline date.
 * Enforces a safe rate limit (max ~0.8-1.0 kg/week loss).
 */
export function calculateCalorieTarget(
  currentWeight: number,
  targetWeight: number,
  deadlineStr?: string
): CalorieRecommendation {
  // Estimated maintenance calories (Rough BMR * activity multiplier, ~30 kcal / kg)
  const maintenanceCalories = Math.round(currentWeight * 31);
  const proteinTarget = Math.round(currentWeight * 2.0); // 2g protein per kg of bodyweight

  if (!deadlineStr || targetWeight >= currentWeight) {
    // Weight maintenance or weight gain
    return {
      suggestedCalorieTarget: maintenanceCalories,
      suggestedProteinTarget: proteinTarget,
      weeklyWeightLossRateKg: 0,
      isDeadlineFeasible: true,
      daysRemaining: 0,
    };
  }

  const today = new Date();
  const deadline = new Date(deadlineStr);
  const diffTime = deadline.getTime() - today.getTime();
  const daysRemaining = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  const weeksRemaining = daysRemaining / 7;

  const totalKgToLose = currentWeight - targetWeight;
  const rawWeeklyRateKg = parseFloat((totalKgToLose / weeksRemaining).toFixed(2));

  // Safe rate ceiling: 1.0 kg per week
  const SAFE_MAX_RATE_KG = 0.9;
  const isDeadlineFeasible = rawWeeklyRateKg <= SAFE_MAX_RATE_KG;

  const effectiveWeeklyRate = Math.min(rawWeeklyRateKg, SAFE_MAX_RATE_KG);

  // 1 kg fat = ~7700 kcal. Daily deficit = (Weekly kg * 7700) / 7 = Weekly kg * 1100 kcal
  const dailyCalorieDeficit = Math.round(effectiveWeeklyRate * 1100);
  const MIN_SAFE_CALORIES = 1350; // Safety floor

  const suggestedCalorieTarget = Math.max(
    MIN_SAFE_CALORIES,
    maintenanceCalories - dailyCalorieDeficit
  );

  let warningMessage: string | undefined;
  if (!isDeadlineFeasible) {
    const minDaysNeeded = Math.ceil((totalKgToLose / SAFE_MAX_RATE_KG) * 7);
    warningMessage = `⚠️ Deadline is aggressive! Losing ${rawWeeklyRateKg} kg/wk exceeds safe limits. A safe rate of ${SAFE_MAX_RATE_KG} kg/wk requires ~${minDaysNeeded} days.`;
  }

  return {
    suggestedCalorieTarget,
    suggestedProteinTarget: proteinTarget,
    weeklyWeightLossRateKg: rawWeeklyRateKg,
    isDeadlineFeasible,
    warningMessage,
    daysRemaining,
  };
}
