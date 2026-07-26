import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { store } from '../store';
import { initNotifications } from '../services/notifications/pushService';
import { FloatingDebugButton } from '../components';

// Prevent splash screen from auto-hiding before state initialization is complete
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore error if already prevented or not supported */
});

export default function RootLayout() {
  useEffect(() => {
    let cleanupFn: (() => void) | undefined;

    initNotifications()
      .then((cleanup) => {
        cleanupFn = cleanup;
      })
      .catch((error) => {
        console.error('Failed to initialize notifications:', error);
      });

    return () => {
      cleanupFn?.();
    };
  }, []);

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Slot />
        <FloatingDebugButton />
      </SafeAreaProvider>
    </Provider>
  );
}


