import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import ChatScreen from '../../screens/Chat';

export default function ChatRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ChatScreen id={id ?? ''} />;
}

