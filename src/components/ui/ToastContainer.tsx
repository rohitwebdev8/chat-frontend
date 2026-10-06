/**
 * ToastContainer — listens to toastService and renders transient messages.
 * Placed once in the root layout (DashboardScreen wrapper level).
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { onToast, ToastPayload } from '@/services/toastService';
import theme from '@/constants/theme';

export const ToastContainer: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ToastPayload[]>([]);

  useEffect(() => {
    return onToast((payload) => {
      setToasts((prev) => [...prev, payload]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== payload.id));
      }, 3500);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <View
      style={[
        styles.container,
        { bottom: insets.bottom + (theme.layout.tabBarHeight ?? 64) + 8 },
      ]}
      pointerEvents="none"
    >
      {toasts.map((t) => (
        <View
          key={t.id}
          style={[
            styles.toast,
            t.type === 'error' && styles.toastError,
            t.type === 'success' && styles.toastSuccess,
          ]}
        >
          <Text style={styles.toastText}>
            {t.type === 'error' ? '❌ ' : t.type === 'success' ? '✅ ' : 'ℹ️ '}
            {t.message}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    gap: 6,
    zIndex: 9999,
  },
  toast: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  toastError: {
    backgroundColor: '#7F1D1D',
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  toastSuccess: {
    backgroundColor: '#14532D',
    borderLeftWidth: 3,
    borderLeftColor: '#22C55E',
  },
  toastText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
});
