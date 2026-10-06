/**
 * StepTrackerService — Phase 5 Implementation.
 * Uses expo-sensors Pedometer for native step counting on iOS/Android,
 * with safe fallback to manual step log entry if Pedometer is unavailable (e.g. web/simulator/Expo Go).
 */
import { NativeModules, Platform } from 'react-native';
import { personalOS } from '@/services/firebase/personalOS';
import { DailyLog } from '@/types/logs';

function getPedometer() {
  if (Platform.OS === 'web') return null;

  // Check if native ExponentPedometer module exists in native binary
  const hasNativePedometer = !!(
    NativeModules?.ExponentPedometer ||
    (globalThis as any)?.ExpoModules?.ExponentPedometer
  );

  if (!hasNativePedometer) {
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sensors = require('expo-sensors');
    return sensors?.Pedometer || null;
  } catch {
    return null;
  }
}

export class StepTrackerService {
  private static subscription: { remove: () => void } | null = null;

  /**
   * Checks whether hardware Pedometer is available on this device.
   */
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

  /**
   * Requests permissions for step counting.
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const Pedometer = getPedometer();
      if (!Pedometer) return false;
      const { granted } = await Pedometer.requestPermissionsAsync();
      return granted;
    } catch {
      return false;
    }
  }

  /**
   * Fetches step count for today (midnight to now).
   */
  static async getTodayStepCount(): Promise<number> {
    try {
      const Pedometer = getPedometer();
      if (!Pedometer) return 0;

      const available = await this.isAvailable();
      if (!available) return 0;

      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();

      const result = await Pedometer.getStepCountAsync(start, end);
      return result?.steps || 0;
    } catch (err) {
      console.warn('Failed to fetch today step count:', err);
      return 0;
    }
  }

  /**
   * Starts live subscription to step sensor updates and updates today's log in Firestore.
   */
  static async startStepTracking(currentLog: DailyLog): Promise<void> {
    try {
      const Pedometer = getPedometer();
      if (!Pedometer) return;

      const available = await this.isAvailable();
      if (!available) return;

      const granted = await this.requestPermissions();
      if (!granted) return;

      // Stop existing subscription if active
      this.stopStepTracking();

      // Fetch initial today count
      const initialSteps = await this.getTodayStepCount();
      if (initialSteps > (currentLog.metrics?.steps || 0)) {
        await personalOS.upsertLog({
          ...currentLog,
          metrics: {
            ...currentLog.metrics,
            steps: initialSteps,
          },
          updatedAt: new Date().toISOString(),
        });
      }

      // Watch live steps
      this.subscription = Pedometer.watchStepCount((result: { steps: number }) => {
        const total = (currentLog.metrics?.steps || 0) + result.steps;
        personalOS.upsertLog({
          ...currentLog,
          metrics: {
            ...currentLog.metrics,
            steps: total,
          },
          updatedAt: new Date().toISOString(),
        });
      });
    } catch (err) {
      console.warn('Error starting step tracking:', err);
    }
  }

  /**
   * Stops live step tracking subscription.
   */
  static stopStepTracking(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
  }
}
