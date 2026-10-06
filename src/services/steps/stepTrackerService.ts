/**
 * StepTrackerService — Pedometer step tracking service.
 */
import { NativeModules, Platform } from 'react-native';
import { personalOS } from '@/services/firebase/personalOS';
import { DailyLog } from '@/types/logs';

function getPedometer() {
  if (Platform.OS === 'web') return null;

  const hasNativePedometer = !!(
    NativeModules?.ExponentPedometer ||
    (globalThis as any)?.ExpoModules?.ExponentPedometer
  );

  if (!hasNativePedometer) return null;

  try {
    const sensors = require('expo-sensors');
    return sensors?.Pedometer || null;
  } catch {
    return null;
  }
}

export class StepTrackerService {
  private static subscription: { remove: () => void } | null = null;

  static async isAvailable(): Promise<boolean> {
    try {
      const Pedometer = getPedometer();
      if (!Pedometer) return false;
      const res = await Pedometer.isAvailableAsync();
      return !!res;
    } catch {
      return false;
    }
  }

  static async startStepTracking(currentLog: DailyLog): Promise<void> {
    try {
      const Pedometer = getPedometer();
      if (!Pedometer) return;

      const available = await this.isAvailable();
      if (!available) return;

      this.stopStepTracking();

      this.subscription = Pedometer.watchStepCount((result: { steps: number }) => {
        const currentSteps = currentLog.entries?.['steps'] || 0;
        personalOS.upsertLog({
          ...currentLog,
          entries: {
            ...currentLog.entries,
            steps: currentSteps + result.steps,
          },
          updatedAt: new Date().toISOString(),
        });
      });
    } catch (err) {
      console.warn('Error starting step tracking:', err);
    }
  }

  static stopStepTracking(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
  }
}
