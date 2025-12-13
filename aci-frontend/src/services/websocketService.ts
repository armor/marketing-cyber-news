// WebSocket Service Types
export interface ArticleCreatedPayload {
  id: string;
  title: string;
  severity: string;
}

export interface WebSocketEvent {
  type: 'article.created' | 'alert.match' | 'system.notification';
  payload: ArticleCreatedPayload | string;
}

type EventCallback = (event: WebSocketEvent) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private subscribers: Set<EventCallback> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectionState: 'connected' | 'connecting' | 'disconnected' = 'disconnected';

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.connectionState = 'connecting';

    try {
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = (): void => {
        console.log('WebSocket connected');
        this.connectionState = 'connected';
      };

      this.ws.onmessage = (event: MessageEvent): void => {
        try {
          const data = JSON.parse(event.data) as WebSocketEvent;
          this.notifySubscribers(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error: Event): void => {
        console.error('WebSocket error:', error);
        this.connectionState = 'disconnected';
      };

      this.ws.onclose = (): void => {
        console.log('WebSocket disconnected');
        this.connectionState = 'disconnected';
        this.scheduleReconnect();
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.connectionState = 'disconnected';
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 5000);
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connectionState = 'disconnected';
  }

  subscribe(callback: EventCallback): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers(event: WebSocketEvent): void {
    this.subscribers.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in WebSocket subscriber:', error);
      }
    });
  }

  getConnectionState(): 'connected' | 'connecting' | 'disconnected' {
    return this.connectionState;
  }
}

export const websocketService = new WebSocketService();
