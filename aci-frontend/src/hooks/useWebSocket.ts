import { useEffect, useCallback, useState } from 'react';
import { websocketService, type WebSocketEvent } from '../services/websocketService';

interface UseWebSocketResult {
  connectionState: 'connected' | 'connecting' | 'disconnected';
  disconnect: () => void;
}

export function useWebSocket(onMessage?: (event: WebSocketEvent) => void): UseWebSocketResult {
  const [connectionState, setConnectionState] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');

  useEffect(() => {
    websocketService.connect();

    const interval = setInterval(() => {
      setConnectionState(websocketService.getConnectionState());
    }, 1000);

    let unsubscribe: (() => void) | undefined;
    if (onMessage) {
      unsubscribe = websocketService.subscribe(onMessage);
    }

    return () => {
      clearInterval(interval);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [onMessage]);

  const disconnect = useCallback((): void => {
    websocketService.disconnect();
  }, []);

  return { connectionState, disconnect };
}
