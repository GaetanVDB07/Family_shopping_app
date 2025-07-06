import { useEffect, useRef, useCallback } from 'react';
import { type WebSocketMessage, type GroceryItem } from '@shared/schema';
import { useAuth } from './use-auth';

interface UseWebSocketProps {
  onItemAdded: (item: GroceryItem) => void;
  onItemUpdated: (item: GroceryItem) => void;
  onItemDeleted: (id: number) => void;
  onSync: (items: GroceryItem[]) => void;
}

export function useWebSocket({ onItemAdded, onItemUpdated, onItemDeleted, onSync }: UseWebSocketProps) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const { session } = useAuth();

  const connect = useCallback(() => {
    try {
      // Don't connect if no session/token available
      if (!session?.access_token) {
        console.log('No session token available, skipping WebSocket connection');
        return;
      }

      // Close existing connection if any
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.close();
      }

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = import.meta.env.DEV ? 'localhost:5000' : window.location.host;
      const wsUrl = `${protocol}//${host}/ws?token=${session.access_token}`;
      
      console.log('Connecting to WebSocket:', wsUrl.replace(session.access_token, 'TOKEN_HIDDEN'));
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        // Clear any pending reconnection attempts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = undefined;
        }
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'itemAdded':
              onItemAdded(message.item);
              break;
            case 'itemUpdated':
              onItemUpdated(message.item);
              break;
            case 'itemDeleted':
              onItemDeleted(message.id);
              break;
            case 'sync':
              onSync(message.items);
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected');
        // Only attempt to reconnect if it wasn't a deliberate close and we have a session
        if (event.code !== 1000 && !reconnectTimeoutRef.current && session?.access_token) {
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      // Attempt to reconnect after 3 seconds if not already scheduled and we have a session
      if (!reconnectTimeoutRef.current && session?.access_token) {
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      }
    }
  }, [onItemAdded, onItemUpdated, onItemDeleted, onSync, session?.access_token]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  return { isConnected: ws.current?.readyState === WebSocket.OPEN };
}
