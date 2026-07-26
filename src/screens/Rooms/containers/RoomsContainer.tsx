import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { RoomList } from '../components/RoomList';
import { useRooms } from '../hooks/useRooms';
import { setActiveRoom } from '../../../store/slices/chatSlice';
import { RootState } from '../../../store';
import theme from '../../../constants/theme';

export const RoomsContainer = () => {
  const dispatch = useDispatch();
  const userName = useSelector((state: RootState) => state.user.name);
  const { rooms, loading, error, refresh } = useRooms();

  const handleSelectRoom = useCallback((roomId: string) => {
    dispatch(setActiveRoom(roomId));
    router.push(`/chat/${roomId}`);
  }, [dispatch]);

  const handleReset = useCallback(async () => {
    try {
      await AsyncStorage.removeItem('displayName');
      router.replace('/name');
    } catch (e) {
      console.error('Failed to reset user name:', e);
    }
  }, []);

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.retryText} onPress={refresh}>
          Tap to retry
        </Text>
      </View>
    );
  }

  return (
    <RoomList
      rooms={rooms}
      userName={userName}
      onSelectRoom={handleSelectRoom}
      onReset={handleReset}
      loading={loading}
    />
  );
};



const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  errorText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryText: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
