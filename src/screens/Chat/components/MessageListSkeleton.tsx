import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '../../../components';
import theme from '../../../constants/theme';

export const MessageListSkeleton: React.FC = () => {
  return (
    <View style={styles.messagesContainer}>
      {/* Received Bubble Skeleton */}
      <View style={[styles.messageWrapper, styles.messageReceived]}>
        <Skeleton width={80} height={10} style={{ marginBottom: 4, marginLeft: 6 }} />
        <View style={styles.bubbleReceived}>
          <Skeleton width={180} height={16} style={{ marginBottom: 6 }} />
          <Skeleton width={120} height={16} style={{ marginBottom: 6 }} />
          <Skeleton width={40} height={10} style={{ alignSelf: 'flex-end' }} />
        </View>
      </View>

      {/* Sent Bubble Skeleton */}
      <View style={[styles.messageWrapper, styles.messageSent]}>
        <View style={styles.bubbleSent}>
          <Skeleton width={140} height={16} style={{ marginBottom: 6 }} />
          <Skeleton width={40} height={10} style={{ alignSelf: 'flex-end' }} />
        </View>
      </View>

      {/* Received Voice Bubble Skeleton */}
      <View style={[styles.messageWrapper, styles.messageReceived]}>
        <Skeleton width={90} height={10} style={{ marginBottom: 4, marginLeft: 6 }} />
        <View style={styles.bubbleReceived}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Skeleton width={36} height={36} borderRadius={18} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Skeleton width="100%" height={6} style={{ marginBottom: 6 }} />
              <Skeleton width={50} height={10} />
            </View>
          </View>
        </View>
      </View>

      {/* Sent Bubble Skeleton */}
      <View style={[styles.messageWrapper, styles.messageSent]}>
        <View style={styles.bubbleSent}>
          <Skeleton width={200} height={16} style={{ marginBottom: 6 }} />
          <Skeleton width={90} height={16} style={{ marginBottom: 6 }} />
          <Skeleton width={40} height={10} style={{ alignSelf: 'flex-end' }} />
        </View>
      </View>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  messagesContainer: {
    flex: 1,
    padding: theme.spacing.md,
    justifyContent: 'flex-end',
  },
  messageWrapper: {
    marginBottom: theme.spacing.md,
    maxWidth: '82%',
  },
  messageReceived: {
    alignSelf: 'flex-start',
  },
  messageSent: {
    alignSelf: 'flex-end',
  },
  bubbleReceived: {
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: theme.borders.radiusLg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  bubbleSent: {
    backgroundColor: theme.colors.primarySoft,
    padding: 12,
    borderRadius: theme.borders.radiusLg,
  },
  composerArea: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
