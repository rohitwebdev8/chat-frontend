import { Reminder, QuietHours } from '@/types/reminders';

export interface FiringInstance {
  reminder: Reminder;
  fireDate: Date;
  dynamicBody: string;
}

/**
 * Checks if a given Date falls inside Quiet Hours.
 */
export function isInsideQuietHours(date: Date, quietHours?: QuietHours): boolean {
  if (!quietHours || !quietHours.enabled) return false;
  const hour = date.getHours();

  if (quietHours.startHour > quietHours.endHour) {
    // Overnight quiet hours, e.g., 23:00 to 06:00
    return hour >= quietHours.startHour || hour < quietHours.endHour;
  } else {
    // Same day quiet hours, e.g., 13:00 to 15:00
    return hour >= quietHours.startHour && hour < quietHours.endHour;
  }
}

/**
 * Generates the next N firing Date instances for a single reminder over the next `daysAhead` days.
 */
export function generateUpcomingFiringDates(
  reminder: Reminder,
  quietHours?: QuietHours,
  daysAhead: number = 7
): Date[] {
  if (!reminder.enabled) return [];

  const firingDates: Date[] = [];
  const now = new Date();
  const endDateLimit = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  if (reminder.scheduleType === 'one-time' && reminder.oneTimeDateTime) {
    const fireDate = new Date(reminder.oneTimeDateTime);
    if (fireDate > now && !isInsideQuietHours(fireDate, quietHours)) {
      firingDates.push(fireDate);
    }
    return firingDates;
  }

  // Iterate over days from today up to daysAhead
  for (let dayOffset = 0; dayOffset <= daysAhead; dayOffset++) {
    const targetDate = new Date();
    targetDate.setDate(now.getDate() + dayOffset);
    targetDate.setSeconds(0);
    targetDate.setMilliseconds(0);

    const dayOfWeek = targetDate.getDay(); // 0 = Sun

    // Check weekly rest day filter
    if (
      reminder.scheduleType === 'weekly' &&
      reminder.selectedWeekdays &&
      !reminder.selectedWeekdays.includes(dayOfWeek)
    ) {
      continue;
    }

    if (reminder.scheduleType === 'daily-fixed' || reminder.scheduleType === 'weekdays' || reminder.scheduleType === 'weekly') {
      const times = reminder.fixedTimes && reminder.fixedTimes.length > 0 ? reminder.fixedTimes : ['09:00'];
      for (const timeStr of times) {
        const [h, m] = timeStr.split(':').map(Number);
        const fDate = new Date(targetDate);
        fDate.setHours(h, m, 0, 0);

        if (fDate > now && fDate <= endDateLimit && !isInsideQuietHours(fDate, quietHours)) {
          firingDates.push(fDate);
        }
      }
    } else if (reminder.scheduleType === 'interval') {
      const intervalMins = reminder.intervalMinutes || 120;
      const [startH, startM] = (reminder.intervalWindowStart || '08:00').split(':').map(Number);
      const [endH, endM] = (reminder.intervalWindowEnd || '22:00').split(':').map(Number);

      const windowStart = new Date(targetDate);
      windowStart.setHours(startH, startM, 0, 0);

      const windowEnd = new Date(targetDate);
      windowEnd.setHours(endH, endM, 0, 0);

      let currentCursor = new Date(windowStart);
      while (currentCursor <= windowEnd) {
        if (currentCursor > now && currentCursor <= endDateLimit && !isInsideQuietHours(currentCursor, quietHours)) {
          firingDates.push(new Date(currentCursor));
        }
        currentCursor = new Date(currentCursor.getTime() + intervalMins * 60 * 1000);
      }
    }
  }

  // Sort ascending by time
  firingDates.sort((a, b) => a.getTime() - b.getTime());
  return firingDates;
}

/**
 * Formats the next 5 firing dates for display in the UI schedule preview.
 */
export function getSchedulePreviewText(reminder: Reminder, quietHours?: QuietHours): string[] {
  const dates = generateUpcomingFiringDates(reminder, quietHours, 7);
  return dates.slice(0, 5).map((d) =>
    d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  );
}

/**
 * Enforces iOS 64 pending local notification limit by sorting all upcoming instances across all reminders
 * and picking the top `maxPending` nearest ones.
 */
export function calculateRollingWindowSchedule(
  reminders: Reminder[],
  quietHours?: QuietHours,
  maxPending: number = 60
): FiringInstance[] {
  const allInstances: FiringInstance[] = [];

  reminders.forEach((rem) => {
    if (!rem.enabled) return;
    const dates = generateUpcomingFiringDates(rem, quietHours, 5);

    dates.forEach((fireDate) => {
      allInstances.push({
        reminder: rem,
        fireDate,
        dynamicBody: rem.body,
      });
    });
  });

  // Sort by nearest fireDate
  allInstances.sort((a, b) => a.fireDate.getTime() - b.fireDate.getTime());

  // Return top nearest instances within iOS limit (max 60 to be safe)
  return allInstances.slice(0, maxPending);
}
