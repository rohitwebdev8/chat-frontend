import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus, type AudioPlayerOptions } from 'expo-audio';
import theme from '../../../constants/theme';
import { useAudioPlayerContext } from '../context/AudioPlayerContext';

// ─── Types & Constants ────────────────────────────────────────────────────────

interface Props {
  /** Firestore message ID — used as the key in AudioPlayerContext. */
  messageId: string;
  /** Firebase Storage HTTPS download URL for the audio file. */
  downloadUrl: string;
  /**
   * Duration from Firestore in seconds.
   * Shown before the player loads so the bubble has a known size immediately.
   */
  durationSeconds: number;
  /** Aligns colours to the sent/received bubble palette. */
  isMe: boolean;
}

// Static options object to guarantee reference stability across re-renders.
const AUDIO_PLAYER_OPTIONS: AudioPlayerOptions = { updateInterval: 200 };

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Renders a voice message bubble with play/pause control and a progress bar.
 *
 * Layout:
 *   ▶  ━━━━━━━━━━━━━━━━━━━  0:08
 *   ⏸  ━━━━━●━━━━━━━━━━━━━  0:04 / 0:08
 *
 * Lifecycle Ownership:
 *   - creation & native teardown are owned strictly by `useAudioPlayer()`.
 *   - do NOT attempt to inspect or call `player` methods in unmount cleanups;
 *     `useAudioPlayer` releases native shared objects on unmount automatically.
 */
export const VoiceMessageBubble: React.FC<Props> = ({
  messageId,
  downloadUrl,
  durationSeconds,
  isMe,
}) => {
  const { playingId, setPlayingId } = useAudioPlayerContext();

  // useAudioPlayer manages the native player lifecycle and releases it on unmount.
  const player = useAudioPlayer(downloadUrl, AUDIO_PLAYER_OPTIONS);
  const status = useAudioPlayerStatus(player);

  const isPlaying = status.playing;
  const currentTime = status.currentTime ?? 0;
  // Use the player's reported duration once loaded; fall back to Firestore value.
  const totalDuration = status.duration > 0 ? status.duration : durationSeconds;
  const progress = totalDuration > 0 ? Math.min(currentTime / totalDuration, 1) : 0;

  // Track playingId in a ref for unmount cleanup (JS state cleanup only)
  const playingIdRef = useRef(playingId);
  useEffect(() => {
    playingIdRef.current = playingId;
  }, [playingId]);


  // ─── React Context Cleanup on Unmount ──────────────────────────────────────
  // If this bubble unmounts while marked as active in context (e.g. scrolled off screen),
  // reset playingId to null.
  // CRITICAL: Do NOT call any `player` methods here! `useAudioPlayer()` handles native release.
  useEffect(() => {
    return () => {
      if (playingIdRef.current === messageId) {
        setPlayingId(null);
      }
    };
  }, [messageId, setPlayingId]);

  // ─── Single-player enforcement ─────────────────────────────────────────────
  // When AudioPlayerContext switches to a different message, pause this player.
  useEffect(() => {
    if (playingId !== messageId && isPlaying) {
      player.pause();
    }
  }, [playingId, messageId, isPlaying, player]);

  // ─── Auto-reset when playback completes ───────────────────────────────────
  useEffect(() => {
    if (status.didJustFinish) {
      // Seek back to start so tapping play again works.
      player.seekTo(0).catch(() => { });
      setPlayingId(null);
    }
  }, [status.didJustFinish, player, setPlayingId]);

  // ─── Play / Pause handler ─────────────────────────────────────────────────
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      player.pause();
      setPlayingId(null);
    } else {
      // Notify the context — other playing bubbles will auto-pause.
      setPlayingId(messageId);
      player.play();
    }
  }, [isPlaying, player, messageId, setPlayingId]);

  // ─── Theme-aware colours ──────────────────────────────────────────────────
  const iconColor = isMe ? theme.colors.primary : '#FFFFFF';
  const buttonBg = isMe ? '#FFFFFF' : theme.colors.primary;
  const trackBg = isMe ? 'rgba(255,255,255,0.3)' : theme.colors.border;
  const progressColor = isMe ? '#FFFFFF' : theme.colors.primary;
  const durationColor = isMe ? 'rgba(255,255,255,0.85)' : theme.colors.textSecondary;

  return (
    <View style={styles.container}>
      {/* Play / Pause button */}
      <TouchableOpacity
        onPress={handlePlayPause}
        style={[styles.playButton, { backgroundColor: buttonBg }]}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? 'Pause voice message' : 'Play voice message'}
      >
        <Text style={[styles.playIcon, { color: iconColor }]}>
          {isPlaying ? '⏸' : '▶'}
        </Text>
      </TouchableOpacity>

      {/* Track + duration */}
      <View style={styles.trackArea}>
        {/* Progress bar */}
        <View style={[styles.track, { backgroundColor: trackBg }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.round(progress * 100)}%`, backgroundColor: progressColor },
            ]}
          />
        </View>

        {/* Duration text */}
        <Text style={[styles.duration, { color: durationColor }]} numberOfLines={1}>
          {isPlaying
            ? `${formatSeconds(currentTime)} / ${formatSeconds(totalDuration)}`
            : formatSeconds(durationSeconds)}
        </Text>
      </View>
    </View>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSeconds(seconds: number): string {
  const s = Math.floor(Math.max(0, seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 190,
    maxWidth: 240,
    paddingVertical: 2,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
    ...theme.shadows.soft,
  },
  playIcon: {
    fontSize: 16,
    marginLeft: 1, // Visual center adjustment for play triangle
  },
  trackArea: {
    flex: 1,
    justifyContent: 'center',
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  duration: {
    ...theme.typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
});



