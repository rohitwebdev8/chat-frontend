import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../../../constants/theme';
import { getSenderColor } from '../../../utils/senderColor';
import { RoomListSkeleton } from './RoomListSkeleton';

interface Room {
  id: string;
  name: string;
  latestSender: string;
  latestMessage: string;
  time: string;
}

interface Props {
  rooms: Room[];
  userName?: string | null;
  onSelectRoom: (id: string) => void;
  onReset: () => void;
  loading?: boolean;
}

const getRoomIdentity = (roomIdOrName: string) => {
  const normalized = roomIdOrName.toLowerCase();
  if (normalized.includes('general')) {
    return {
      icon: '💬',
      subtitle: 'General Discussion',
      badgeBg: '#E0F2FE',
      iconColor: '#0284C7',
    };
  }
  if (normalized.includes('random')) {
    return {
      icon: '☕',
      subtitle: 'Coffee Lounge',
      badgeBg: '#F1F5F9',
      iconColor: '#64748B',
    };
  }
  if (normalized.includes('dev') || normalized.includes('tech')) {
    return {
      icon: '⚡',
      subtitle: 'Tech & Updates',
      badgeBg: '#FEF3C7',
      iconColor: '#D97706',
    };
  }
  return {
    icon: '📋',
    subtitle: 'Group Channel',
    badgeBg: theme.colors.surfaceSecondary,
    iconColor: theme.colors.primary,
  };
};

function formatHeaderName(name?: string | null): string {
  if (!name || !name.trim()) return 'User';
  const firstName = name.trim().split(/\s+/)[0];
  if (firstName.length > 5) {
    return `${firstName.substring(0, 4)}…`;
  }
  return firstName;
}

const CARD_HEIGHT = 88;

interface RoomCardProps {
  room: Room;
  onPress: (id: string) => void;
}

const RoomCard: React.FC<RoomCardProps> = memo(({ room, onPress }) => {
  const identity = getRoomIdentity(room.id || room.name);
  const hasMessage = Boolean(room.latestMessage && room.latestMessage.trim().length > 0);
  const senderColor = getSenderColor(room.latestSender);

  const handlePress = () => onPress(room.id);

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${room.name} room`}
    >
      <View style={styles.cardRow}>
        <View style={[styles.avatar, { backgroundColor: identity.badgeBg }]}>
          <Text style={styles.avatarIcon}>{identity.icon}</Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <View style={styles.titleRow}>
              <Text style={styles.roomName} numberOfLines={1}>
                {room.name}
              </Text>
            </View>
            {room.time ? <Text style={styles.time}>{room.time}</Text> : null}
          </View>

          <Text style={styles.subtext}>{identity.subtitle}</Text>

          <View style={styles.messagePreview}>
            {hasMessage ? (
              <>
                <Text style={[styles.sender, { color: senderColor }]} numberOfLines={1}>
                  {room.latestSender ? `${room.latestSender}: ` : ''}
                </Text>
                <Text style={styles.messageText} numberOfLines={1}>
                  {room.latestMessage}
                </Text>
              </>
            ) : (
              <Text style={styles.noMessageText}>No messages yet. Tap to start chatting.</Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

RoomCard.displayName = 'RoomCard';

export const RoomList: React.FC<Props> = memo(({
  rooms,
  userName,
  onSelectRoom,
  onReset,
  loading,
}) => {
  const insets = useSafeAreaInsets();

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Room>) => (
      <RoomCard room={item} onPress={onSelectRoom} />
    ),
    [onSelectRoom]
  );

  const keyExtractor = useCallback((item: Room) => item.id, []);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: CARD_HEIGHT,
      offset: CARD_HEIGHT * index,
      index,
    }),
    []
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerSubtitle}>Realtime Channels</Text>
          <View style={styles.titleWithBadge}>
            <Text style={styles.headerTitle}>Chat Rooms</Text>
            <View style={styles.roomCountBadge}>
              <Text style={styles.roomCountText}>{rooms.length}</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={onReset}
            style={styles.userBadge}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Switch User"
          >
            <Text style={styles.userAvatarIcon}>👤</Text>
            <Text style={styles.userNameText} numberOfLines={1}>
              {formatHeaderName(userName)}
            </Text>
            <Text style={styles.switchPillText}>Switch</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <RoomListSkeleton />
      ) : (
        <FlatList
          data={rooms}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom + 80, 100) },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyTitle}>No Rooms Available</Text>
              <Text style={styles.emptySubtitle}>
                Rooms will appear here automatically when created.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
});

RoomList.displayName = 'RoomList';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    ...theme.shadows.soft,
  },
  headerLeft: {
    flex: 1,
  },
  headerSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    ...theme.typography.heading2,
    color: theme.colors.text,
    marginRight: 8,
  },
  roomCountBadge: {
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  roomCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.borders.radiusLg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  userAvatarIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  userNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    maxWidth: 50,
    marginRight: 6,
  },
  switchPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  listContent: {
    padding: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borders.radiusLg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.soft,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: theme.borders.radiusMd,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  avatarIcon: {
    fontSize: 22,
  },
  cardBody: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  roomName: {
    ...theme.typography.heading3,
    color: theme.colors.text,
    marginRight: 6,
  },
  time: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  subtext: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  messagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sender: {
    ...theme.typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  messageText: {
    flex: 1,
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  noMessageText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});


