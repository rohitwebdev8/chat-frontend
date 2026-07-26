import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '../../../components';
import theme from '../../../constants/theme';

export const RoomListSkeleton: React.FC = () => {
  return (
    <View style={styles.listContent}>
      {[1, 2, 3].map((key) => (
        <View key={key} style={styles.card}>
          <View style={styles.cardRow}>
            <Skeleton width={44} height={44} borderRadius={theme.borders.radiusMd} style={{ marginRight: theme.spacing.md }} />
            <View style={styles.cardBody}>
              <View style={styles.cardHeader}>
                <Skeleton width={120} height={18} />
                <Skeleton width={50} height={12} />
              </View>
              <Skeleton width={100} height={12} style={{ marginTop: 6, marginBottom: 10 }} />
              <Skeleton width="85%" height={14} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
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
  cardBody: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

