import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import theme from '@/constants/theme';

export interface TabItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon?: keyof typeof Ionicons.glyphMap;
}

interface BottomTabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onTabPress: (key: string) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  tabs,
  activeTab,
  onTabPress,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, 4) },
      ]}
    >
      <View style={styles.inner}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const iconName = isActive && tab.activeIcon ? tab.activeIcon : tab.icon;

          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => onTabPress(tab.key)}
              activeOpacity={0.7}
              accessibilityLabel={tab.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                <Ionicons
                  name={iconName}
                  size={20}
                  color={isActive ? theme.colors.tabActive : theme.colors.tabInactive}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.tabLabelActive,
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.tabBarBg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.tabBarBorder,
    paddingTop: 6,
    ...(Platform.OS === 'web'
      ? { position: 'sticky' as any, bottom: 0, zIndex: 100 }
      : {}),
  },
  inner: {
    flexDirection: 'row',
    maxWidth: theme.layout.contentMaxWidth,
    alignSelf: 'center',
    width: '100%',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: theme.layout.touchTarget,
    paddingVertical: 2,
  },
  iconWrap: {
    width: 36,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: theme.colors.primaryLight,
  },
  tabLabel: {
    ...theme.typography.tabLabel,
    color: theme.colors.tabInactive,
    marginTop: 2,
  },
  tabLabelActive: {
    color: theme.colors.tabActive,
    fontWeight: '700',
  },
});
