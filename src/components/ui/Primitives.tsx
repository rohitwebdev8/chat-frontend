import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '@/constants/theme';

// ─── Card ─────────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

// ─── Section Header ───────────────────────────────────────────────
interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  actionLabel,
  onAction,
}) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {actionLabel && onAction && (
      <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.sectionAction}>{actionLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── Status Pill ──────────────────────────────────────────────────
interface StatusPillProps {
  label: string;
  color: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({ label, color }) => (
  <View style={[styles.statusPill, { backgroundColor: `${color}18` }]}>
    <Text style={[styles.statusPillText, { color }]}>{label}</Text>
  </View>
);

// ─── Chip ─────────────────────────────────────────────────────────
interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
}

export const Chip: React.FC<ChipProps> = ({ label, active, onPress }) => (
  <TouchableOpacity
    style={[styles.chip, active && styles.chipActive]}
    onPress={onPress}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
  >
    <Text style={[styles.chipText, active && styles.chipTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

// ─── Progress Bar ─────────────────────────────────────────────────
interface ProgressBarProps {
  percent?: number;
  progress?: number;
  color?: string;
  height?: number;
  trackColor?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percent,
  progress,
  color = theme.colors.primary,
  height = 6,
  trackColor = theme.colors.surfaceSecondary,
}) => {
  const pct = percent !== undefined 
    ? percent 
    : (progress !== undefined ? (progress <= 1 && progress > 0 ? progress * 100 : progress) : 0);

  return (
    <View style={[styles.progressTrack, { height, backgroundColor: trackColor }]}>
      <View
        style={[
          styles.progressFill,
          {
            width: `${Math.min(100, Math.max(0, pct))}%`,
            backgroundColor: color,
            height,
          },
        ]}
      />
    </View>
  );
};

// ─── FAB (Floating Action Button) ─────────────────────────────────
interface FABProps {
  icon?: keyof typeof Ionicons.glyphMap;
  label?: string;
  onPress: () => void;
  bottomOffset?: number;
}

export const FAB: React.FC<FABProps> = ({
  icon = 'add',
  label,
  onPress,
  bottomOffset = 80,
}) => (
  <TouchableOpacity
    style={[styles.fab, { bottom: bottomOffset }]}
    onPress={onPress}
    activeOpacity={0.85}
    accessibilityLabel={label || 'Add'}
    accessibilityRole="button"
  >
    <Ionicons name={icon} size={22} color="#FFFFFF" />
    {label && <Text style={styles.fabLabel}>{label}</Text>}
  </TouchableOpacity>
);

// ─── Empty State ──────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'layers-outline',
  title,
  subtitle,
  actionLabel,
  onAction,
}) => (
  <View style={styles.emptyState}>
    <View style={styles.emptyIconWrap}>
      <Ionicons name={icon} size={36} color={theme.colors.textTertiary} />
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
    {actionLabel && onAction && (
      <TouchableOpacity style={styles.emptyAction} onPress={onAction}>
        <Text style={styles.emptyActionText}>{actionLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── Stat Card ────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtitle,
  color = theme.colors.textPrimary,
}) => (
  <View style={styles.statCard}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Card
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borders.radiusLg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.heading3,
    color: theme.colors.textPrimary,
  },
  sectionAction: {
    ...theme.typography.buttonSmall,
    color: theme.colors.primary,
  },

  // Status Pill
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borders.pill,
  },
  statusPillText: {
    ...theme.typography.captionSmall,
    fontWeight: '700',
  },

  // Chip
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: theme.borders.pill,
    backgroundColor: theme.colors.surfaceSecondary,
    marginRight: 6,
    minHeight: 32,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
  },
  chipText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Progress Bar
  progressTrack: {
    borderRadius: 100,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: 100,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    height: 52,
    borderRadius: 26,
    gap: 8,
    ...theme.shadows.fab,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  fabLabel: {
    ...theme.typography.buttonSmall,
    color: '#FFFFFF',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    ...theme.typography.heading3,
    color: theme.colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyAction: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: theme.borders.radiusSm,
  },
  emptyActionText: {
    ...theme.typography.buttonSmall,
    color: '#FFFFFF',
  },

  // Stat Card
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.borders.radiusMd,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  statValue: {
    ...theme.typography.heading2,
    fontWeight: '800',
  },
  statLabel: {
    ...theme.typography.captionSmall,
    color: theme.colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  statSubtitle: {
    ...theme.typography.captionSmall,
    color: theme.colors.textTertiary,
    marginTop: 1,
    textAlign: 'center',
  },
});
