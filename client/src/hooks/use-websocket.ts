import { useEffect, useRef, useCallback } from 'react';
import { type GroceryItem } from '@shared/schema';
import { mapRealtimeGroceryRow } from '@shared/realtime-grocery';
import { useAuth } from './use-auth';
import supabase from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseWebSocketProps {
  familyId?: string | null;
  onItemAdded: (item: GroceryItem) => void;
  onItemUpdated: (item: GroceryItem) => void;
  onItemDeleted: (id: number) => void;
  onSync: (items: GroceryItem[]) => void;
  /** Silently refresh list data after Realtime reconnects. */
  onResync?: () => void;
}

export function useWebSocket({
  familyId,
  onItemAdded,
  onItemUpdated,
  onItemDeleted,
  onSync,
  onResync,
}: UseWebSocketProps) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const wasSubscribedRef = useRef(false);
  const { session, user } = useAuth();

  const onItemAddedRef = useRef(onItemAdded);
  const onItemUpdatedRef = useRef(onItemUpdated);
  const onItemDeletedRef = useRef(onItemDeleted);
  const onSyncRef = useRef(onSync);
  const onResyncRef = useRef(onResync);

  onItemAddedRef.current = onItemAdded;
  onItemUpdatedRef.current = onItemUpdated;
  onItemDeletedRef.current = onItemDeleted;
  onSyncRef.current = onSync;
  onResyncRef.current = onResync;

  const connect = useCallback(async () => {
    try {
      if (!user || !session || !familyId) {
        return;
      }

      if (channelRef.current) {
        await channelRef.current.unsubscribe();
        channelRef.current = null;
      }

      const channel = supabase
        .channel(`grocery-items-${familyId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'grocery_items',
            filter: `family_id=eq.${familyId}`,
          },
          (payload) => {
            onItemAddedRef.current(mapRealtimeGroceryRow(payload.new as Record<string, unknown>));
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'grocery_items',
            filter: `family_id=eq.${familyId}`,
          },
          (payload) => {
            onItemUpdatedRef.current(mapRealtimeGroceryRow(payload.new as Record<string, unknown>));
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'grocery_items',
            filter: `family_id=eq.${familyId}`,
          },
          (payload) => {
            const mapped = mapRealtimeGroceryRow(payload.old as Record<string, unknown>);
            onItemDeletedRef.current(mapped.id);
          },
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            if (wasSubscribedRef.current) {
              onResyncRef.current?.();
            }
            wasSubscribedRef.current = true;
          }
        });

      channelRef.current = channel;
    } catch (error) {
      console.error('Error connecting to Supabase Realtime:', error);
    }
  }, [familyId, session, user]);

  useEffect(() => {
    connect();

    return () => {
      wasSubscribedRef.current = false;
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [connect]);
}
