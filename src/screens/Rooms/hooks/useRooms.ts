import { useCallback, useEffect, useState } from 'react';
import { subscribeToRooms } from '@/services/firebase';
import type { Room as FirestoreRoom } from '@/services/firebase';

export interface UIRoom {
  id: string;
  name: string;
  latestSender: string;
  latestMessage: string;
  time: string;
  unreadCount: number;
}

interface UseRoomsResult {
  rooms: UIRoom[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useRooms(): UseRoomsResult {
  const [rooms, setRooms] = useState<UIRoom[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState<number>(0);

  useEffect(() => {
    const unsubscribe = subscribeToRooms(
      (firestoreRooms: FirestoreRoom[]) => {
        const mapped: UIRoom[] = firestoreRooms.map((room) => ({
          id: room.id,
          name: room.name,
          latestSender: room.lastSender,
          latestMessage: room.lastMessage,
          time: formatTimestamp(room.lastMessageAt),
          unreadCount: room.unreadCount ?? 0,
        }));
        setRooms(mapped);
        setLoading(false);
        setError(null);
      },
      (err: Error) => {
        const message = err.message ?? 'Failed to load rooms.';
        setError(message);
        setLoading(false);
        console.error('[useRooms] Firestore listener error:', err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [retryKey]);

  const refresh = useCallback(() => setRetryKey((k) => k + 1), []);

  return { rooms, loading, error, refresh };
}

function formatTimestamp(timestamp: { toDate: () => Date } | null): string {
  if (!timestamp) return '';

  const date = timestamp.toDate();
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

