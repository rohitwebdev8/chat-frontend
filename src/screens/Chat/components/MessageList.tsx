import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../../../constants/theme';
import { VoiceMessageBubble } from './VoiceMessageBubble';
import { MessageListSkeleton } from './MessageListSkeleton';
import { getSenderColor } from '../../../utils/senderColor';
import { DailyTrackerModal } from '@/components/DailyTrackerModal';


interface MicIconProps {
  size?: number;
  color?: string;
}

export const MicrophoneIcon: React.FC<MicIconProps> = ({ size = 20, color = theme.colors.primary }) => {
  const capsuleWidth = Math.round(size * 0.42);
  const capsuleHeight = Math.round(size * 0.62);
  const arcWidth = Math.round(size * 0.76);
  const arcHeight = Math.round(size * 0.52);
  const stemHeight = Math.round(size * 0.18);
  const baseWidth = Math.round(size * 0.48);

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View
        style={{
          width: capsuleWidth,
          height: capsuleHeight,
          borderRadius: capsuleWidth / 2,
          backgroundColor: color,
          position: 'absolute',
          top: 0,
        }}
      />
      <View
        style={{
          width: arcWidth,
          height: arcHeight,
          borderBottomLeftRadius: arcWidth / 2,
          borderBottomRightRadius: arcWidth / 2,
          borderWidth: 2,
          borderColor: color,
          borderTopWidth: 0,
          position: 'absolute',
          top: Math.round(capsuleHeight * 0.45),
        }}
      />
      <View
        style={{
          width: 2,
          height: stemHeight,
          backgroundColor: color,
          position: 'absolute',
          bottom: 2,
        }}
      />
      <View
        style={{
          width: baseWidth,
          height: 2,
          borderRadius: 1,
          backgroundColor: color,
          position: 'absolute',
          bottom: 0,
        }}
      />
    </View>
  );
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  sender: string;
  text: string;
  time: string;
  type: string;
  downloadUrl?: string;
  durationSeconds?: number;
}

interface Props {
  roomId: string;
  messages: Message[];
  currentUser: string;
  // ── Text input ──
  inputText: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  // ── Navigation ──
  onBack: () => void;
  // ── Voice recording ──
  isRecording: boolean;
  recordingDuration: number;  // seconds
  isSendingVoice: boolean;
  voiceError: string | null;
  permissionDenied: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  loading?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const MessageList: React.FC<Props> = ({
  roomId,
  messages,
  currentUser,
  inputText,
  onChangeText,
  onSend,
  onBack,
  isRecording,
  recordingDuration,
  isSendingVoice,
  voiceError,
  permissionDenied,
  onStartRecording,
  onStopRecording,
  loading,
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);

  // Auto-scroll to bottom when messages update or keyboard opens.
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages.length]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
    return () => showSub.remove();
  }, []);

  // Permission warning
  useEffect(() => {
    if (permissionDenied) {
      Alert.alert(
        'Microphone Permission Required',
        'Please enable microphone access in device settings to record clinical audio notes.',
        [{ text: 'OK' }],
      );
    }
  }, [permissionDenied]);

  // Handle start recording with keyboard dismissal
  const handleStartRecording = () => {
    Keyboard.dismiss();
    onStartRecording();
  };

  // Format seconds → "00:07"
  const formatRecordingTime = (secs: number): string => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.outerContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >

        {/* ── Real Header ── */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back to rooms"
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{roomId}</Text>
          </View>

          <View style={styles.headerRightSpacer} />
        </View>



        {/* ── Messages Area or Skeleton ── */}
        {loading ? (
          <MessageListSkeleton />
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.messageList}
            contentContainerStyle={[
              styles.messageListContent,
              messages.length === 0 && styles.emptyListContent,
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {messages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyBadge}>
                  <Text style={styles.emptyIcon}>🩺</Text>
                </View>
                <Text style={styles.emptyTitle}>Channel Ready</Text>
                <Text style={styles.emptyText}>
                  No messages yet in {roomId}. Start the consultation or general medical discussion.
                </Text>
              </View>
            ) : (
              messages.map((msg, index) => {
                const isMe = msg.sender === currentUser;
                const isFirstInGroup = index === 0 || messages[index - 1].sender !== msg.sender;
                const senderColor = getSenderColor(msg.sender);

                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageWrapper,
                      isMe ? styles.messageWrapperSent : styles.messageWrapperReceived,
                      !isFirstInGroup && styles.messageGroupChild,
                    ]}
                  >
                    {!isMe && isFirstInGroup && (
                      <Text style={[styles.senderName, { color: senderColor }]}>
                        {msg.sender}
                      </Text>
                    )}

                    <View style={[styles.bubble, isMe ? styles.bubbleSent : styles.bubbleReceived]}>
                      {msg.type === 'voice' && msg.downloadUrl ? (
                        // ── Voice message bubble ──
                        <VoiceMessageBubble
                          messageId={msg.id}
                          downloadUrl={msg.downloadUrl}
                          durationSeconds={msg.durationSeconds ?? 0}
                          isMe={isMe}
                        />
                      ) : msg.type === 'voice' ? (
                        // ── Voice message uploading ──
                        <View style={styles.voicePreview}>
                          <MicrophoneIcon size={16} color={isMe ? theme.colors.textSent : theme.colors.textReceived} />
                          <Text style={[styles.messageText, isMe ? styles.textSent : styles.textReceived]}>
                            {msg.text}
                          </Text>
                        </View>
                      ) : (
                        // ── Text message ──
                        <Text style={[styles.messageText, isMe ? styles.textSent : styles.textReceived]}>
                          {msg.text}
                        </Text>
                      )}

                      <Text style={[styles.time, isMe ? styles.timeSent : styles.timeReceived]}>
                        {msg.time}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}


        {/* ── Voice error banner ── */}
        {voiceError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>⚠ {voiceError}</Text>
          </View>
        ) : null}

        {/* ── Bottom Composer ── */}
        <View style={[styles.inputArea, { paddingBottom: Math.max(insets.bottom, 12) }]}>

          {isSendingVoice ? (
            // ── Uploading state ──
            <View style={styles.uploadingRow}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.uploadingText}>Uploading clinical audio note…</Text>
            </View>

          ) : isRecording ? (
            // ── Recording state ──
            <View style={styles.recordingRow}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>
                Recording Audio • {formatRecordingTime(recordingDuration)}
              </Text>
              <TouchableOpacity
                style={styles.stopButton}
                onPress={onStopRecording}
                accessibilityRole="button"
                accessibilityLabel="Stop and send audio message"
              >
                <Text style={styles.stopButtonText}>Stop & Send</Text>
              </TouchableOpacity>
            </View>

          ) : (
            // ── Normal input state ──
            <View style={styles.normalInputRow}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Type clinical message..."
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  value={inputText}
                  onChangeText={onChangeText}
                  returnKeyType="send"
                  onSubmitEditing={onSend}
                  blurOnSubmit={false}
                  accessibilityLabel="Message input"
                />
                <TouchableOpacity
                  style={styles.micButton}
                  onPress={handleStartRecording}
                  accessibilityRole="button"
                  accessibilityLabel="Record voice message"
                >
                  <MicrophoneIcon size={18} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.sendButton, inputText.trim().length === 0 && styles.sendButtonDisabled]}
                onPress={onSend}
                disabled={inputText.trim().length === 0}
                accessibilityRole="button"
                accessibilityLabel="Send message"
              >
                <Text style={styles.sendText}>Send</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>

      </KeyboardAvoidingView>

      <DailyTrackerModal
        visible={isTrackerOpen}
        onClose={() => setIsTrackerOpen(false)}
        onShareToChat={(formattedText) => {
          onChangeText(formattedText);
        }}
      />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    ...theme.shadows.soft,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
  },
  backIcon: {
    fontSize: 20,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 10,
  },
  headerTitle: {
    ...theme.typography.heading3,
    color: theme.colors.text,
  },
  headerRightSpacer: {
    width: 40,
  },
  trackerHeaderBtn: {
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackerHeaderBtnText: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },


  // Messages
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: theme.spacing.md,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    ...theme.typography.heading3,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  emptyText: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },

  // Message Bubbles & Grouping
  messageWrapper: {
    marginTop: 12,
    maxWidth: '82%',
  },
  messageGroupChild: {
    marginTop: 3,
  },
  messageWrapperSent: {
    alignSelf: 'flex-end',
  },
  messageWrapperReceived: {
    alignSelf: 'flex-start',
  },
  senderName: {
    ...theme.typography.caption,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    marginLeft: 6,
    fontWeight: '600',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.borders.radiusLg,
  },
  bubbleSent: {
    backgroundColor: theme.colors.bubbleSent,
    borderBottomRightRadius: theme.borders.radiusSm,
  },
  bubbleReceived: {
    backgroundColor: theme.colors.bubbleReceived,
    borderBottomLeftRadius: theme.borders.radiusSm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  voicePreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playIcon: {
    marginRight: theme.spacing.sm,
    fontSize: 16,
  },
  messageText: {
    ...theme.typography.body,
  },
  textSent: {
    color: theme.colors.textSent,
  },
  textReceived: {
    color: theme.colors.textReceived,
  },
  time: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeSent: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  timeReceived: {
    color: theme.colors.textSecondary,
  },

  // Composer Input Area
  inputArea: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  normalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borders.radiusXl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    marginRight: 10,
    minHeight: 44,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
    maxHeight: 100,
    paddingVertical: 10,
  },
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: theme.borders.radiusXl,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Recording State Row
  recordingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.error,
    marginRight: theme.spacing.sm,
  },
  recordingText: {
    flex: 1,
    ...theme.typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  stopButton: {
    backgroundColor: theme.colors.error,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.borders.radiusXl,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Uploading Row
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  uploadingText: {
    marginLeft: theme.spacing.sm,
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },

  // Error Banner
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderTopWidth: 1,
    borderTopColor: '#FECACA',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  errorBannerText: {
    color: theme.colors.error,
    fontSize: 13,
  },
});



