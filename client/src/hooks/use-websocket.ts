import { useEffect, useRef, useCallback } from 'react';
import { type WebSocketMessage, type GroceryItem } from '@shared/schema';

interface UseWebSocketProps {
  onItemAdded: (item: GroceryItem) => void;
  onItemUpdated: (item: GroceryItem) => void;
  onItemDeleted: (id: number) => void;
  onSync: (items: GroceryItem[]) => void;
}

export function useWebSocket({ onItemAdded, onItemUpdated, onItemDeleted, onSync }: UseWebSocketProps) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
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

      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      // Attempt to reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  }, [onItemAdded, onItemUpdated, onItemDeleted, onSync]);

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
