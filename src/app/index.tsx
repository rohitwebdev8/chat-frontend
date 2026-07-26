import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import * as SplashScreen from 'expo-splash-screen';
import { setName } from '../store/slices/userSlice';

export default function Index() {
  const [isReady, setIsReady] = useState(false);
  const [hasName, setHasName] = useState(false);
  const dispatch = useDispatch();

  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [scaleAnim] = useState(() => new Animated.Value(0.85));

  useEffect(() => {
    let isMounted = true;

    // Smooth entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    const checkUserAuth = async () => {
      const startTime = Date.now();
      try {
        const storedName = await AsyncStorage.getItem('displayName');
        if (storedName && isMounted) {
          dispatch(setName(storedName));
          setHasName(true);
        }
      } catch (error) {
        console.error('Error checking stored user name:', error);
      } finally {
        // Guarantee at least 1000ms display for smooth visual splash experience
        const elapsedTime = Date.now() - startTime;
        const minSplashTime = 1000;
        const remainingTime = Math.max(0, minSplashTime - elapsedTime);

        setTimeout(async () => {
          if (isMounted) {
            setIsReady(true);
            await SplashScreen.hideAsync().catch(() => {
              /* ignore error if splash screen is already hidden */
            });
          }
        }, remainingTime);
      }
    };

    checkUserAuth();

    return () => {
      isMounted = false;
    };
  }, [dispatch, fadeAnim, scaleAnim]);

  if (!isReady) {
    return (
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.splashCard,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Image
            source={require('../../assets/images/splash-icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>PulseChat</Text>
          <Text style={styles.tagline}>Realtime Messaging & Voice</Text>
        </Animated.View>
      </View>
    );
  }

  return <Redirect href={hasName ? '/rooms' : '/name'} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1021',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashCard: {
    alignItems: 'center',
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: 20,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    color: '#8A8FAD',
    marginTop: 6,
  },
});


