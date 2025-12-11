# ACI WebSocket Protocol Specification

## Overview

The ACI WebSocket service provides real-time updates for cybersecurity news and alerts. This document specifies the protocol for client-server communication.

## Connection

### Endpoint

```
Production: wss://api.aci.armor.com/ws
Staging:    wss://api-staging.aci.armor.com/ws
Development: ws://localhost:8080/ws
```

### Authentication

Authentication is required via JWT token passed as a query parameter:

```
wss://api.aci.armor.com/ws?token=<JWT_ACCESS_TOKEN>
```

**Alternative**: Send auth message immediately after connection (see Client Messages below).

### Connection Lifecycle

```
1. Client connects to WebSocket endpoint with token
2. Server validates JWT token
3. If valid: Server sends 'connected' message
4. If invalid: Server sends 'error' message and closes connection
5. Client subscribes to channels
6. Server sends real-time updates on subscribed channels
7. Client sends periodic ping (every 30 seconds)
8. Server responds with pong
9. Either party can close the connection
```

## Message Format

All messages use JSON format with the following envelope structure:

```json
{
  "type": "string",
  "id": "uuid",
  "timestamp": "ISO8601",
  "payload": {}
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | string | Yes | Message type identifier |
| id | string (UUID) | Yes | Unique message ID for correlation |
| timestamp | string (ISO 8601) | Yes | Message timestamp |
| payload | object | No | Type-specific payload |

## Client Messages

### auth

Authenticate the WebSocket connection (alternative to query parameter).

```json
{
  "type": "auth",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-15T10:30:00Z",
  "payload": {
    "token": "<JWT_ACCESS_TOKEN>"
  }
}
```

**Response**: `auth_result`

### subscribe

Subscribe to real-time update channels.

```json
{
  "type": "subscribe",
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "timestamp": "2024-01-15T10:30:01Z",
  "payload": {
    "channels": [
      "articles:all",
      "articles:critical",
      "articles:category:ransomware",
      "alerts:user"
    ]
  }
}
```

**Available Channels**:

| Channel | Description |
|---------|-------------|
| `articles:all` | All new/updated articles |
| `articles:critical` | Critical severity articles only |
| `articles:high` | High severity and above |
| `articles:category:{slug}` | Articles in specific category |
| `articles:vendor:{name}` | Articles mentioning specific vendor |
| `articles:cve:{id}` | Articles related to specific CVE |
| `alerts:user` | User's alert subscription matches |
| `system` | System announcements |

**Response**: `subscribe_result`

### unsubscribe

Unsubscribe from channels.

```json
{
  "type": "unsubscribe",
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "timestamp": "2024-01-15T10:30:02Z",
  "payload": {
    "channels": ["articles:category:ransomware"]
  }
}
```

**Response**: `unsubscribe_result`

### ping

Client heartbeat to keep connection alive.

```json
{
  "type": "ping",
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "timestamp": "2024-01-15T10:30:03Z"
}
```

**Response**: `pong`

### mark_read

Mark an article as read (for analytics).

```json
{
  "type": "mark_read",
  "id": "550e8400-e29b-41d4-a716-446655440004",
  "timestamp": "2024-01-15T10:30:04Z",
  "payload": {
    "article_id": "789e0123-e89b-12d3-a456-426614174001"
  }
}
```

**Response**: `ack`

## Server Messages

### connected

Sent immediately after successful connection and authentication.

```json
{
  "type": "connected",
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "timestamp": "2024-01-15T10:30:00Z",
  "payload": {
    "connection_id": "conn_abc123",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "server_time": "2024-01-15T10:30:00Z",
    "token_expires_at": "2024-01-15T10:45:00Z"
  }
}
```

### auth_result

Response to `auth` message.

**Success**:
```json
{
  "type": "auth_result",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-15T10:30:00Z",
  "payload": {
    "success": true,
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "expires_at": "2024-01-15T10:45:00Z"
  }
}
```

**Failure**:
```json
{
  "type": "auth_result",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2024-01-15T10:30:00Z",
  "payload": {
    "success": false,
    "error": {
      "code": "INVALID_TOKEN",
      "message": "JWT token is invalid or expired"
    }
  }
}
```

### subscribe_result

Confirmation of subscription request.

```json
{
  "type": "subscribe_result",
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "timestamp": "2024-01-15T10:30:01Z",
  "payload": {
    "success": true,
    "subscribed": [
      "articles:all",
      "articles:critical",
      "articles:category:ransomware",
      "alerts:user"
    ],
    "failed": [],
    "total_subscriptions": 4
  }
}
```

### unsubscribe_result

Confirmation of unsubscription request.

```json
{
  "type": "unsubscribe_result",
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "timestamp": "2024-01-15T10:30:02Z",
  "payload": {
    "success": true,
    "unsubscribed": ["articles:category:ransomware"],
    "total_subscriptions": 3
  }
}
```

### pong

Response to client `ping`.

```json
{
  "type": "pong",
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "timestamp": "2024-01-15T10:30:03Z"
}
```

### ack

Generic acknowledgment for client actions.

```json
{
  "type": "ack",
  "id": "550e8400-e29b-41d4-a716-446655440004",
  "timestamp": "2024-01-15T10:30:04Z",
  "payload": {
    "success": true
  }
}
```

### article

New or updated article notification.

```json
{
  "type": "article",
  "id": "550e8400-e29b-41d4-a716-446655440020",
  "timestamp": "2024-01-15T10:30:20Z",
  "payload": {
    "event": "created",
    "article": {
      "id": "789e0123-e89b-12d3-a456-426614174001",
      "title": "Critical VMware vCenter Vulnerability Exploited in Wild",
      "slug": "critical-vmware-vcenter-vulnerability-exploited",
      "summary": "Attackers are actively exploiting CVE-2024-XXXX affecting VMware vCenter Server...",
      "category": {
        "id": "cat-001",
        "name": "Vulnerabilities",
        "slug": "vulnerabilities",
        "color": "#EA580C"
      },
      "severity": "critical",
      "tags": ["vmware", "vcenter", "exploit", "cve-2024"],
      "source_name": "CISA",
      "related_cves": ["CVE-2024-12345"],
      "affected_vendors": ["VMware"],
      "armor_cta": {
        "type": "vulnerability-management",
        "title": "Protect Your VMware Infrastructure",
        "url": "https://armor.com/vulnerability-management"
      },
      "reading_time_minutes": 4,
      "published_at": "2024-01-15T10:25:00Z"
    },
    "matched_channels": [
      "articles:all",
      "articles:critical",
      "articles:category:vulnerabilities",
      "articles:vendor:vmware"
    ]
  }
}
```

**Event Types**:
- `created` - New article published
- `updated` - Existing article modified
- `deleted` - Article removed (rare)

### alert_match

User's alert subscription matched a new article.

```json
{
  "type": "alert_match",
  "id": "550e8400-e29b-41d4-a716-446655440021",
  "timestamp": "2024-01-15T10:30:21Z",
  "payload": {
    "alert": {
      "id": "alert-001",
      "name": "VMware Vulnerabilities",
      "type": "vendor",
      "value": "vmware"
    },
    "article": {
      "id": "789e0123-e89b-12d3-a456-426614174001",
      "title": "Critical VMware vCenter Vulnerability Exploited in Wild",
      "slug": "critical-vmware-vcenter-vulnerability-exploited",
      "severity": "critical",
      "category_slug": "vulnerabilities",
      "published_at": "2024-01-15T10:25:00Z"
    },
    "priority": "high"
  }
}
```

**Priority Levels**:
- `critical` - Severity=critical or CVE match
- `high` - Severity=high or threat-actor match
- `normal` - All other matches

### error

Error notification.

```json
{
  "type": "error",
  "id": "550e8400-e29b-41d4-a716-446655440030",
  "timestamp": "2024-01-15T10:30:30Z",
  "payload": {
    "code": "INVALID_CHANNEL",
    "message": "Channel 'articles:unknown' does not exist",
    "request_id": "550e8400-e29b-41d4-a716-446655440001"
  }
}
```

### system

System announcements and notifications.

```json
{
  "type": "system",
  "id": "550e8400-e29b-41d4-a716-446655440040",
  "timestamp": "2024-01-15T10:30:40Z",
  "payload": {
    "event": "maintenance",
    "message": "Scheduled maintenance in 10 minutes",
    "details": {
      "start_time": "2024-01-15T10:40:00Z",
      "estimated_duration_seconds": 300,
      "action_required": "reconnect"
    }
  }
}
```

**System Events**:
- `maintenance` - Scheduled maintenance notification
- `reconnect` - Client should reconnect (e.g., server restart)
- `token_expiring` - JWT token expiring soon, client should refresh
- `rate_limited` - Client is being rate limited

### token_expiring

Warning that the JWT token is about to expire.

```json
{
  "type": "token_expiring",
  "id": "550e8400-e29b-41d4-a716-446655440050",
  "timestamp": "2024-01-15T10:44:00Z",
  "payload": {
    "expires_at": "2024-01-15T10:45:00Z",
    "expires_in_seconds": 60,
    "action": "refresh_token"
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_TOKEN` | JWT token is invalid or malformed |
| `TOKEN_EXPIRED` | JWT token has expired |
| `UNAUTHORIZED` | Authentication required |
| `INVALID_MESSAGE` | Message format is invalid |
| `INVALID_CHANNEL` | Requested channel does not exist |
| `SUBSCRIPTION_LIMIT` | Maximum subscriptions reached (50) |
| `RATE_LIMITED` | Too many messages, slow down |
| `INTERNAL_ERROR` | Internal server error |

## Connection Limits

| Limit | Value | Description |
|-------|-------|-------------|
| Max subscriptions per connection | 50 | Maximum channels per WebSocket |
| Max connections per user | 5 | Across all devices |
| Max message size | 64 KB | Per message |
| Messages per minute | 60 | Rate limit per connection |
| Ping interval | 30 seconds | Client should ping |
| Pong timeout | 10 seconds | Server closes if no response |
| Reconnect grace period | 5 minutes | Missed messages buffered |

## Heartbeat Protocol

Clients MUST send a `ping` message at least every 30 seconds to keep the connection alive.

```
Client                              Server
   |                                   |
   |--- ping ----------------------->  |
   |                                   |
   |<------------------------ pong --- |
   |                                   |
   |        (30 second interval)       |
   |                                   |
   |--- ping ----------------------->  |
   |                                   |
   |<------------------------ pong --- |
```

If the server does not receive a ping within 60 seconds, it will close the connection.

## Reconnection Strategy

Clients should implement exponential backoff for reconnection:

```
Initial delay: 1 second
Max delay: 30 seconds
Multiplier: 2
Jitter: 10%

Attempt 1: 1s    (0.9s - 1.1s with jitter)
Attempt 2: 2s    (1.8s - 2.2s with jitter)
Attempt 3: 4s    (3.6s - 4.4s with jitter)
Attempt 4: 8s    (7.2s - 8.8s with jitter)
Attempt 5: 16s   (14.4s - 17.6s with jitter)
Attempt 6+: 30s  (27s - 33s with jitter)
```

## Token Refresh Flow

When the server sends a `token_expiring` message:

1. Client calls REST API `POST /auth/refresh` with refresh token
2. Client receives new access token
3. Client sends new `auth` message with new token
4. Server confirms with `auth_result`
5. Subscriptions are preserved

```
Client                              Server
   |                                   |
   |<-------------- token_expiring --- |
   |                                   |
   |--- POST /auth/refresh --------->  | (REST API)
   |<------------ new tokens -------- |
   |                                   |
   |--- auth (new token) -----------> |
   |                                   |
   |<------------------ auth_result -- |
   |                                   |
```

## Example: React Client Integration

```typescript
import { useEffect, useRef, useState, useCallback } from 'react';

interface WSMessage {
  type: string;
  id: string;
  timestamp: string;
  payload: any;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string;
  severity: string;
  category: { name: string; slug: string; color: string };
  published_at: string;
}

export function useACIWebSocket(token: string) {
  const ws = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const pingInterval = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);

  const connect = useCallback(() => {
    const wsUrl = `${process.env.REACT_APP_WS_URL}/ws?token=${token}`;
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setConnected(true);
      reconnectAttempts.current = 0;

      // Subscribe to channels
      ws.current?.send(JSON.stringify({
        type: 'subscribe',
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        payload: {
          channels: [
            'articles:critical',
            'articles:high',
            'alerts:user'
          ]
        }
      }));

      // Start heartbeat
      pingInterval.current = setInterval(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({
            type: 'ping',
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString()
          }));
        }
      }, 30000);
    };

    ws.current.onmessage = (event) => {
      const msg: WSMessage = JSON.parse(event.data);

      switch (msg.type) {
        case 'article':
          setArticles(prev => [msg.payload.article, ...prev.slice(0, 99)]);
          break;

        case 'alert_match':
          setAlerts(prev => [msg.payload, ...prev.slice(0, 49)]);
          // Show notification
          if (Notification.permission === 'granted') {
            new Notification(`Alert: ${msg.payload.alert.name}`, {
              body: msg.payload.article.title,
              icon: '/alert-icon.png'
            });
          }
          break;

        case 'token_expiring':
          // Trigger token refresh
          refreshToken();
          break;

        case 'error':
          console.error('WebSocket error:', msg.payload);
          break;
      }
    };

    ws.current.onclose = () => {
      setConnected(false);
      clearInterval(pingInterval.current);

      // Reconnect with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      const jitter = delay * 0.1 * (Math.random() * 2 - 1);
      reconnectAttempts.current++;

      setTimeout(connect, delay + jitter);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [token]);

  const refreshToken = async () => {
    // Call your auth refresh logic here
    // Then send new auth message to WebSocket
  };

  useEffect(() => {
    connect();
    return () => {
      clearInterval(pingInterval.current);
      ws.current?.close();
    };
  }, [connect]);

  const subscribe = useCallback((channels: string[]) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'subscribe',
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        payload: { channels }
      }));
    }
  }, []);

  const unsubscribe = useCallback((channels: string[]) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'unsubscribe',
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        payload: { channels }
      }));
    }
  }, []);

  return {
    connected,
    articles,
    alerts,
    subscribe,
    unsubscribe
  };
}
```

## Example: Go Server Implementation

```go
package websocket

import (
    "encoding/json"
    "sync"
    "time"

    "github.com/google/uuid"
    "github.com/gorilla/websocket"
)

// Message represents a WebSocket message
type Message struct {
    Type      string          `json:"type"`
    ID        string          `json:"id"`
    Timestamp string          `json:"timestamp"`
    Payload   json.RawMessage `json:"payload,omitempty"`
}

// Client represents a WebSocket client
type Client struct {
    ID            string
    UserID        string
    Conn          *websocket.Conn
    Hub           *Hub
    Subscriptions map[string]bool
    Send          chan []byte
    mu            sync.RWMutex
}

// Hub maintains active clients and broadcasts messages
type Hub struct {
    Clients    map[*Client]bool
    Channels   map[string]map[*Client]bool
    Register   chan *Client
    Unregister chan *Client
    Broadcast  chan *ChannelMessage
    mu         sync.RWMutex
}

type ChannelMessage struct {
    Channel string
    Message []byte
}

// NewHub creates a new Hub
func NewHub() *Hub {
    return &Hub{
        Clients:    make(map[*Client]bool),
        Channels:   make(map[string]map[*Client]bool),
        Register:   make(chan *Client),
        Unregister: make(chan *Client),
        Broadcast:  make(chan *ChannelMessage, 256),
    }
}

// Run starts the hub
func (h *Hub) Run() {
    for {
        select {
        case client := <-h.Register:
            h.mu.Lock()
            h.Clients[client] = true
            h.mu.Unlock()

        case client := <-h.Unregister:
            h.mu.Lock()
            if _, ok := h.Clients[client]; ok {
                delete(h.Clients, client)
                close(client.Send)
                // Remove from all channels
                for channel := range client.Subscriptions {
                    if clients, ok := h.Channels[channel]; ok {
                        delete(clients, client)
                    }
                }
            }
            h.mu.Unlock()

        case msg := <-h.Broadcast:
            h.mu.RLock()
            if clients, ok := h.Channels[msg.Channel]; ok {
                for client := range clients {
                    select {
                    case client.Send <- msg.Message:
                    default:
                        close(client.Send)
                        delete(h.Clients, client)
                    }
                }
            }
            h.mu.RUnlock()
        }
    }
}

// Subscribe adds a client to a channel
func (h *Hub) Subscribe(client *Client, channels []string) []string {
    h.mu.Lock()
    defer h.mu.Unlock()

    subscribed := make([]string, 0, len(channels))
    for _, channel := range channels {
        if _, ok := h.Channels[channel]; !ok {
            h.Channels[channel] = make(map[*Client]bool)
        }
        h.Channels[channel][client] = true
        client.Subscriptions[channel] = true
        subscribed = append(subscribed, channel)
    }
    return subscribed
}

// BroadcastArticle sends an article to relevant channels
func (h *Hub) BroadcastArticle(article Article, event string) {
    payload, _ := json.Marshal(map[string]interface{}{
        "event":   event,
        "article": article,
    })

    msg := Message{
        Type:      "article",
        ID:        uuid.New().String(),
        Timestamp: time.Now().UTC().Format(time.RFC3339),
        Payload:   payload,
    }

    msgBytes, _ := json.Marshal(msg)

    // Broadcast to relevant channels
    channels := []string{
        "articles:all",
        "articles:category:" + article.Category.Slug,
    }

    if article.Severity == "critical" {
        channels = append(channels, "articles:critical")
    }
    if article.Severity == "critical" || article.Severity == "high" {
        channels = append(channels, "articles:high")
    }

    for _, vendor := range article.AffectedVendors {
        channels = append(channels, "articles:vendor:"+vendor)
    }

    for _, channel := range channels {
        h.Broadcast <- &ChannelMessage{
            Channel: channel,
            Message: msgBytes,
        }
    }
}
```