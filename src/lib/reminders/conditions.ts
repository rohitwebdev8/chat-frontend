import { Reminder } from '@/types/reminders';
import { DailyLog } from '@/types/tracker';

/**
 * Checks if a reminder's linked task or metric is already satisfied for today.
 */
export function isTaskAlreadyDoneToday(reminder: Reminder, currentLog: DailyLog | null): boolean {
  if (!currentLog) return false;

  const metric = reminder.linkedMetric;
  if (!metric) return false;

  switch (metric) {
    case 'steps':
      return (currentLog.steps || 0) >= 10000;
    case 'workout':
      return currentLog.workoutDone || currentLog.gymDone || currentLog.swimmingDone;
    case 'dsaQuestions':
      return (currentLog.dsaQuestions || 0) >= 2;
    case 'jobApplications':
      return (currentLog.jobApplications ? currentLog.jobApplications.length : 0) >= 5;
    case 'water':
      return (currentLog.water || 0) >= (currentLog.waterTarget || 3.0);
    case 'calories':
      return (currentLog.calories || 0) > 0 && (currentLog.calories || 0) <= (currentLog.calorieTarget || 2000);
    default:
      if (reminder.linkedTaskId) {
        const todo = currentLog.todos.find((t) => t.id === reminder.linkedTaskId);
        return todo ? todo.completed : false;
      }
      return false;
  }
}

/**
 * Generates dynamic text with live numbers (e.g. "6,200 / 10,000 steps. 3,800 to go.").
 */
export function generateDynamicReminderText(reminder: Reminder, currentLog: DailyLog | null): string {
  if (!currentLog) return reminder.body;

  if (reminder.linkedMetric === 'steps') {
    const steps = currentLog.steps || 0;
    const target = 10000;
    const remaining = Math.max(0, target - steps);
    if (remaining === 0) {
      return `🎉 Goal reached! You hit ${steps.toLocaleString()} steps today.`;
    }
    const minsWalk = Math.ceil(remaining / 100);
    return `🏃 ${steps.toLocaleString()} / ${target.toLocaleString()} steps. ${remaining.toLocaleString()} to go. A ${minsWalk} min walk finishes it!`;
  }

  if (reminder.linkedMetric === 'dsaQuestions') {
    const dsa = currentLog.dsaQuestions || 0;
    return `💻 ${dsa} DSA questions solved today. Keep your daily momentum high!`;
  }

  if (reminder.linkedMetric === 'jobApplications') {
    const apps = currentLog.jobApplications ? currentLog.jobApplications.length : 0;
    return `💼 ${apps} job applications submitted today. Keep applying to land your target role!`;
  }

  if (reminder.linkedMetric === 'water') {
    const water = currentLog.water || 0;
    const target = currentLog.waterTarget || 3.0;
    return `💧 ${water}L / ${target}L water logged. Drink a glass of water now to stay hydrated!`;
  }

  return reminder.body;
}
