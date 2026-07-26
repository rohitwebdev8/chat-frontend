import React, { createContext, useContext, useState } from 'react';

// ─── Context shape ────────────────────────────────────────────────────────────

interface AudioPlayerContextValue {
  /**
   * The Firestore message ID of the voice message that is currently playing,
   * or null if nothing is playing.
   *
   * Each VoiceMessageBubble watches this value. When it changes to a different
   * message ID, the bubble pauses its own player — enforcing the "only one
   * voice message plays at a time" rule without any Redux.
   */
  playingId: string | null;
  setPlayingId: (id: string | null) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AudioPlayerContext = createContext<AudioPlayerContextValue>({
  playingId: null,
  setPlayingId: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

/**
 * Wrap the Chat screen (or MessageList) in this provider.
 * A single instance per screen is sufficient.
 */
export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const [playingId, setPlayingId] = useState<string | null>(null);

  return (
    <AudioPlayerContext.Provider value={{ playingId, setPlayingId }}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Consume the audio player context inside any component within the Chat screen tree.
 *
 * @example
 * const { playingId, setPlayingId } = useAudioPlayerContext();
 */
export function useAudioPlayerContext(): AudioPlayerContextValue {
  return useContext(AudioPlayerContext);
}
