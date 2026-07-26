import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSelector } from 'react-redux';
import { MessageList } from '../components/MessageList';
import { useMessages } from '../hooks/useMessages';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { AudioPlayerProvider } from '../context/AudioPlayerContext';
import type { RootState } from '@/store';
import theme from '@/constants/theme';

interface Props {
  roomId: string;
}


export const ChatContainer: React.FC<Props> = ({ roomId }) => {
  // The user's display name is the identity token in this no-auth architecture.
  // It is used as both the senderId and senderName for Firestore writes.
  const senderName = useSelector((state: RootState) => state.user.name) ?? 'Anonymous';

  // ── Text + voice send pipeline ──────────────────────────────────────────────
  const {
    messages,
    loading,
    error,
    inputText,
    onChangeText,
    onSend,
    onSendVoice,
    isSendingVoice,
    voiceError,
  } = useMessages(roomId, senderName, senderName);

  // ── Recording lifecycle ─────────────────────────────────────────────────────
  const {
    isRecording,
    durationSeconds: recordingDuration,
    permissionDenied,
    startRecording,
    stopRecording,
  } = useVoiceRecorder();

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  /**
   * Called when the user taps "Stop".
   * Finalises the recording, then hands the URI + duration to the send pipeline.
   * If the recording was too short or failed, we surface nothing — useVoiceRecorder
   * already logs the warning and returns null.
   */
  const handleStopRecording = useCallback(async () => {
    const result = await stopRecording();
    if (!result) {
      // Recording was invalid or failed — nothing to upload.
      return;
    }
    await onSendVoice(result.uri, result.durationSeconds);
  }, [stopRecording, onSendVoice]);

  // ── Render states ───────────────────────────────────────────────────────────

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    // AudioPlayerProvider ensures only one VoiceMessageBubble plays at a time.
    // It is scoped to the Chat screen so it is destroyed when the user navigates away.
    <AudioPlayerProvider>
      <MessageList
        roomId={roomId}
        messages={messages}
        currentUser={senderName}
        inputText={inputText}
        onChangeText={onChangeText}
        onSend={onSend}
        onBack={handleBack}
        isRecording={isRecording}
        recordingDuration={recordingDuration}
        isSendingVoice={isSendingVoice}
        voiceError={voiceError}
        permissionDenied={permissionDenied}
        onStartRecording={startRecording}
        onStopRecording={handleStopRecording}
        loading={loading}
      />
    </AudioPlayerProvider>
  );
};


const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  errorText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
