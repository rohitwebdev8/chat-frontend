import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Provider } from 'react-redux';
import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { store } from '../store';
import { ensureAuth, isProfileSet } from '../services/firebase/authService';
import { initNotifications } from '../services/notifications/pushService';
import { AuthScreen } from '../components/auth/AuthScreen';
import { ToastContainer } from '../components/ui/ToastContainer';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [ready,      setReady]      = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    let cleanupFn: (() => void) | undefined;

    ensureAuth().then(() => {
      setHasProfile(isProfileSet());
      setReady(true);
      SplashScreen.hideAsync().catch(() => {});
    });

    initNotifications()
      .then((cleanup) => { cleanupFn = cleanup; })
      .catch(() => {});

    return () => { cleanupFn?.(); };
  }, []);

  // Re-check profile whenever it might change (after SetupScreen saves)
  useEffect(() => {
    if (!ready) return;
    const interval = setInterval(() => {
      const profile = isProfileSet();
      setHasProfile((prev) => (prev !== profile ? profile : prev));
    }, 300);
    return () => clearInterval(interval);
  }, [ready]);

  if (!ready) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#0066FF" />
      </View>
    );
  }

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        {hasProfile ? <Slot /> : <AuthScreen />}
        <ToastContainer />
      </SafeAreaProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f1021',
  },
});
