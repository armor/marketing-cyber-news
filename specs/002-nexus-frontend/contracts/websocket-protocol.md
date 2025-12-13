# WebSocket Protocol Contract

**Feature**: 002-nexus-frontend
**Date**: 2024-12-13

## Connection

```
URL: ws://localhost:8080/ws
Auth: JWT token in cookie (HttpOnly) - validated on upgrade
```

### Connection Flow

```
1. Client connects to WS URL
2. Server validates JWT from cookie
3. Server sends: { type: "connection:ack", payload: { userId } }
4. Client starts ping/pong heartbeat
5. Server pushes real-time events
```

### Reconnection Strategy

```typescript
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000]; // Exponential backoff

function reconnect(attempt: number) {
  const delay = RECONNECT_DELAYS[Math.min(attempt, RECONNECT_DELAYS.length - 1)];
  setTimeout(() => connect(), delay);
}
```

## Message Types

### Server → Client

#### New Threat
```json
{
  "type": "threat:new",
  "payload": {
    "id": "uuid",
    "title": "New Zero-Day Discovered",
    "severity": "critical",
    "category": "vulnerabilities",
    "source": "cisa",
    "publishedAt": "2024-12-13T10:00:00Z"
  }
}
```

#### Threat Updated
```json
{
  "type": "threat:updated",
  "payload": {
    "id": "uuid",
    "title": "Updated Title",
    "severity": "high",
    "updatedAt": "2024-12-13T10:30:00Z"
  }
}
```

#### Alert Triggered
```json
{
  "type": "alert:triggered",
  "payload": {
    "alertId": "uuid",
    "alertName": "Critical CVEs",
    "threatId": "uuid",
    "threatTitle": "Matching threat title",
    "severity": "critical",
    "triggeredAt": "2024-12-13T10:00:00Z"
  }
}
```

#### Notification
```json
{
  "type": "notification:new",
  "payload": {
    "id": "uuid",
    "type": "threat",
    "title": "New Critical Threat",
    "message": "A new critical threat has been detected",
    "read": false,
    "createdAt": "2024-12-13T10:00:00Z",
    "data": {
      "threatId": "uuid"
    }
  }
}
```

#### Ping (Server heartbeat)
```json
{
  "type": "connection:ping",
  "timestamp": 1702465200000
}
```

### Client → Server

#### Pong (Client heartbeat response)
```json
{
  "type": "connection:pong",
  "timestamp": 1702465200000
}
```

#### Subscribe to Topics
```json
{
  "type": "subscribe",
  "payload": {
    "topics": ["threats:critical", "alerts"]
  }
}
```

#### Unsubscribe from Topics
```json
{
  "type": "unsubscribe",
  "payload": {
    "topics": ["threats:critical"]
  }
}
```

#### Mark Notification Read
```json
{
  "type": "notification:read",
  "payload": {
    "notificationId": "uuid"
  }
}
```

## Topics

| Topic | Description |
|-------|-------------|
| `threats:all` | All new threats |
| `threats:critical` | Critical severity only |
| `threats:high` | High severity and above |
| `alerts` | User's alert triggers |
| `notifications` | User notifications |

## Frontend Implementation

```typescript
// src/services/websocket/client.ts
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempt = 0;
  private listeners: Map<string, Set<(payload: unknown) => void>> = new Map();

  connect(url: string) {
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.emit('connection:open', null);
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.emit(message.type, message.payload);
    };

    this.ws.onclose = () => {
      this.emit('connection:close', null);
      this.reconnect();
    };

    this.ws.onerror = (error) => {
      this.emit('connection:error', error);
    };
  }

  private reconnect() {
    const delays = [1000, 2000, 4000, 8000, 16000, 30000];
    const delay = delays[Math.min(this.reconnectAttempt, delays.length - 1)];

    setTimeout(() => {
      this.reconnectAttempt++;
      this.connect(this.ws?.url || '');
    }, delay);
  }

  send(type: string, payload?: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  subscribe(topic: string) {
    this.send('subscribe', { topics: [topic] });
  }

  on(type: string, callback: (payload: unknown) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);
  }

  off(type: string, callback: (payload: unknown) => void) {
    this.listeners.get(type)?.delete(callback);
  }

  private emit(type: string, payload: unknown) {
    this.listeners.get(type)?.forEach((cb) => cb(payload));
    this.listeners.get('*')?.forEach((cb) => cb({ type, payload }));
  }
}
```

## React Hook

```typescript
// src/hooks/useWebSocket.ts
export function useWebSocket() {
  const client = useRef<WebSocketClient>();
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>('connecting');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  useEffect(() => {
    client.current = new WebSocketClient();
    client.current.connect(import.meta.env.VITE_WS_URL);

    client.current.on('connection:open', () => setStatus('open'));
    client.current.on('connection:close', () => setStatus('closed'));
    client.current.on('*', (msg) => setLastMessage(msg as WebSocketMessage));

    return () => client.current?.close();
  }, []);

  return { status, lastMessage, send: client.current?.send };
}
```

## Error Handling

| Error | Action |
|-------|--------|
| Connection refused | Retry with backoff |
| Auth failed (401) | Redirect to login |
| Invalid message | Log and ignore |
| Server error | Display connection status indicator |
