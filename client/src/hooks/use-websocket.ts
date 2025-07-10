import { useEffect, useRef, useCallback } from 'react';
import { type GroceryItem } from '@shared/schema';
import { useAuth } from './use-auth';
import supabase from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseWebSocketProps {
  onItemAdded: (item: GroceryItem) => void;
  onItemUpdated: (item: GroceryItem) => void;
  onItemDeleted: (id: number) => void;
  onSync: (items: GroceryItem[]) => void;
}

export function useWebSocket({ onItemAdded, onItemUpdated, onItemDeleted, onSync }: UseWebSocketProps) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { session, user } = useAuth();

  const connect = useCallback(async () => {
    try {
      // Don't connect if no user is authenticated
      if (!user || !session) {
        console.log('No authenticated user, skipping realtime connection');
        return;
      }

      // First, get the user's family ID to know which changes to listen for
      const response = await fetch('/api/user/family', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.log('No family found, skipping realtime connection');
        return;
      }

      const { family } = await response.json();
      if (!family) {
        console.log('User not in a family, skipping realtime connection');
        return;
      }

      // Close existing channel if any
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }

      // Create a new channel for grocery items changes
      const channel = supabase
        .channel(`grocery-items-${family.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'grocery_items',
            filter: `family_id=eq.${family.id}`
          },
          (payload) => {
            console.log('Item added:', payload.new);
            onItemAdded(payload.new as GroceryItem);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'grocery_items',
            filter: `family_id=eq.${family.id}`
          },
          (payload) => {
            console.log('Item updated:', payload.new);
            onItemUpdated(payload.new as GroceryItem);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'grocery_items',
            filter: `family_id=eq.${family.id}`
          },
          (payload) => {
            console.log('Item deleted:', payload.old);
            onItemDeleted((payload.old as GroceryItem).id);
          }
        )
        .subscribe((status) => {
          console.log('Realtime subscription status:', status);
        });

      channelRef.current = channel;

    } catch (error) {
      console.error('Error connecting to Supabase Realtime:', error);
    }
  }, [onItemAdded, onItemUpdated, onItemDeleted, onSync, session, user]);

  useEffect(() => {
    connect();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [connect]);

  return { isConnected: channelRef.current?.state === 'joined' };
}
