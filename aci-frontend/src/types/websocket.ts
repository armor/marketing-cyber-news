import type { ThreatSummary } from './threat';

/**
 * WebSocket message types for real-time threat notifications
 */
export enum WebSocketMessageType {
  NEW_THREAT = 'new_threat',
  THREAT_UPDATED = 'threat_updated',
  ALERT_TRIGGERED = 'alert_triggered',
  CONNECTION_STATUS = 'connection_status',
  HEARTBEAT = 'heartbeat',
  ERROR = 'error',
}

/**
 * Base WebSocket message structure
 */
export interface BaseWebSocketMessage {
  readonly type: WebSocketMessageType;
  readonly timestamp: string;
}

/**
 * New threat notification message
 */
export interface NewThreatMessage extends BaseWebSocketMessage {
  readonly type: WebSocketMessageType.NEW_THREAT;
  readonly payload: ThreatSummary;
}

/**
 * Threat update notification message
 */
export interface ThreatUpdatedMessage extends BaseWebSocketMessage {
  readonly type: WebSocketMessageType.THREAT_UPDATED;
  readonly payload: {
    readonly threatId: string;
    readonly updates: Partial<ThreatSummary>;
  };
}

/**
 * Alert triggered notification message
 */
export interface AlertTriggeredMessage extends BaseWebSocketMessage {
  readonly type: WebSocketMessageType.ALERT_TRIGGERED;
  readonly payload: {
    readonly alertId: string;
    readonly alertName: string;
    readonly threatId: string;
    readonly matchedKeywords: readonly string[];
  };
}

/**
 * Connection status types
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

/**
 * Connection status change message
 */
export interface ConnectionStatusMessage extends BaseWebSocketMessage {
  readonly type: WebSocketMessageType.CONNECTION_STATUS;
  readonly payload: {
    readonly status: ConnectionStatus;
    readonly attempt?: number;
  };
}

/**
 * Heartbeat message for connection health
 */
export interface HeartbeatMessage extends BaseWebSocketMessage {
  readonly type: WebSocketMessageType.HEARTBEAT;
  readonly payload: {
    readonly serverTime: string;
  };
}

/**
 * Error message from WebSocket
 */
export interface ErrorMessage extends BaseWebSocketMessage {
  readonly type: WebSocketMessageType.ERROR;
  readonly payload: {
    readonly code: string;
    readonly message: string;
  };
}

/**
 * Union type of all WebSocket message types
 */
export type WebSocketMessage =
  | NewThreatMessage
  | ThreatUpdatedMessage
  | AlertTriggeredMessage
  | ConnectionStatusMessage
  | HeartbeatMessage
  | ErrorMessage;

/**
 * WebSocket connection state
 */
export interface WebSocketState {
  readonly isConnected: boolean;
  readonly isReconnecting: boolean;
  readonly lastMessageAt: string | null;
  readonly reconnectAttempts: number;
}
