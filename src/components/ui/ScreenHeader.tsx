import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import theme from '@/constants/theme';
import { getCurrentUser, logout } from '@/services/firebase/authService';

interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
  badgeText?: string;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title = 'PACE',
  subtitle = 'Personal Action & Consistency Engine',
  badgeText,
}) => {
  const insets = useSafeAreaInsets();
  const currentUser = getCurrentUser();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';

  const handleLogout = () => {
    Alert.alert('Reset Profile', `Clear profile for ${displayName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: async () => { await logout(); } },
    ]);
  };

  return (
    <View
      style={[
        styles.headerContainer,
        { paddingTop: Math.max(insets.top, 12) + 6 },
      ]}
    >
      <View style={styles.headerInner}>
        {/* Left: Title block */}
        <View style={styles.titleBlock}>
          <View style={styles.titleRow}>
            <Text style={styles.titleText} numberOfLines={1}>
              {title}
            </Text>
            {badgeText && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badgeText}</Text>
              </View>
            )}
          </View>
          {subtitle && (
            <Text style={styles.subtitleText} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        {/* Right: User Profile & Logout */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={handleLogout}
            activeOpacity={0.8}
            accessibilityLabel="User Account"
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.profileName} numberOfLines={1}>
              {displayName}
            </Text>
            <Ionicons name="log-out-outline" size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 10,
    paddingHorizontal: 16,
    ...(Platform.OS === 'web' ? { position: 'sticky' as any, top: 0, zIndex: 100 } : {}),
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: theme.layout.contentMaxWidth,
    alignSelf: 'center',
    width: '100%',
  },
  titleBlock: {
    flex: 1,
    marginRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    ...theme.typography.heading2,
    color: theme.colors.textPrimary,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borders.radiusSm,
  },
  badgeText: {
    ...theme.typography.captionSmall,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  subtitleText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
  },
  avatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  profileName: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    maxWidth: 90,
  },
});
