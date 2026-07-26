import React from 'react';
import { StyleSheet, ViewProps, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import theme from '../constants/theme';

export const ScreenWrapper: React.FC<ViewProps> = ({ children, style, ...rest }) => (
  <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
    <View style={[styles.container, style]} {...rest}>
      {children}
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});

