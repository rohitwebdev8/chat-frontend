import { useCallback, useState } from 'react';
import {
  useAudioRecorder,
  useAudioRecorderState,
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  RecordingPresets,
} from 'expo-audio';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VoiceRecordingResult {
  /** Local file URI (file://...) returned by expo-audio after stop. */
  uri: string;
  /** Rounded duration in whole seconds. */
  durationSeconds: number;
}

export interface UseVoiceRecorderResult {
  /** Whether a recording is currently in progress. */
  isRecording: boolean;
  /** Elapsed recording time in whole seconds. Updates every ~250 ms. */
  durationSeconds: number;
  /** True after a permission request was denied by the user. Resets on next startRecording attempt. */
  permissionDenied: boolean;
  /** Call to request permission (if needed) and start recording. No-op if already recording. */
  startRecording: () => Promise<void>;
  /**
   * Finalises the recording and returns the result.
   * Returns null if: not recording, stop failed, URI missing, or duration < 1 second.
   */
  stopRecording: () => Promise<VoiceRecordingResult | null>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages the full recording lifecycle using expo-audio.
 *
 * Responsibilities:
 *   - microphone permission (check → request → denied state)
 *   - prepare → record → stop lifecycle
 *   - elapsed duration polling (via useAudioRecorderState at 250ms)
 *
 * Lifecycle Ownership:
 *   - native recorder creation and release on unmount are managed automatically
 *     by `useAudioRecorder()`.
 *
 * Firebase Storage and Firestore are NOT touched here.
 * The caller receives a URI + durationSeconds and handles the upload.
 */
export function useVoiceRecorder(): UseVoiceRecorderResult {
  const [permissionDenied, setPermissionDenied] = useState(false);

  // useAudioRecorder manages the native recorder lifecycle and releases it on unmount.
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // Polls recorder state every 250 ms for a smooth live timer.
  const recorderState = useAudioRecorderState(recorder, 250);

  // ─── Start ────────────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    // Guard: prevent starting a second concurrent recording.
    if (recorder.isRecording) return;

    setPermissionDenied(false);

    try {
      // Check existing permission before prompting.
      const { granted: alreadyGranted } = await getRecordingPermissionsAsync();

      if (!alreadyGranted) {
        const { granted: nowGranted } = await requestRecordingPermissionsAsync();
        if (!nowGranted) {
          setPermissionDenied(true);
          return;
        }
      }

      // prepareToRecordAsync configures the audio session and output format.
      await recorder.prepareToRecordAsync();
      // record() is synchronous — it starts capturing immediately.
      recorder.record();
    } catch (err) {
      console.error('[useVoiceRecorder] startRecording failed:', err);
    }
  }, [recorder]);

  // ─── Stop ─────────────────────────────────────────────────────────────────
  const stopRecording = useCallback(async (): Promise<VoiceRecordingResult | null> => {
    if (!recorder.isRecording) return null;

    try {
      // Capture duration before stop() clears the state.
      const durationMs = recorderState.durationMillis;

      await recorder.stop();

      const uri = recorder.uri;

      if (!uri) {
        console.warn('[useVoiceRecorder] No URI after stop — recording discarded.');
        return null;
      }

      const durationSeconds = Math.max(1, Math.round(durationMs / 1000));

      if (durationMs < 500) {
        // Recordings under 500 ms are almost certainly accidental taps.
        console.warn('[useVoiceRecorder] Recording too short, discarding.');
        return null;
      }

      return { uri, durationSeconds };
    } catch (err) {
      console.error('[useVoiceRecorder] stopRecording failed:', err);
      return null;
    }
  }, [recorder, recorderState.durationMillis]);

  return {
    isRecording: recorderState.isRecording,
    durationSeconds: Math.floor(recorderState.durationMillis / 1000),
    permissionDenied,
    startRecording,
    stopRecording,
  };
}
