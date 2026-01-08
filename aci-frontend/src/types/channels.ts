// Marketing Automation - Channel Management Types

// ============================================
// ENUMS
// ============================================

export type ChannelType = 'linkedin' | 'twitter' | 'email' | 'facebook' | 'instagram';

export type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'pending';

export type ChannelHealth = 'healthy' | 'degraded' | 'failing';

// ============================================
// CHANNEL INTERFACES
// ============================================

export interface Channel {
  readonly id: string;
  readonly type: ChannelType;
  readonly name: string;
  readonly status: ConnectionStatus;
  readonly health: ChannelHealth;
  readonly account_name?: string;
  readonly account_id?: string;
  readonly connected_at?: string;
  readonly last_used_at?: string;
  readonly error_message?: string;
  readonly stats: ChannelStats;
  readonly oauth_config?: OAuthConfig;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface ChannelStats {
  readonly posts_published: number;
  readonly total_engagement: number;
  readonly total_impressions: number;
  readonly avg_engagement_rate: number;
  readonly last_post_date?: string;
}

export interface OAuthConfig {
  readonly provider: string;
  readonly authorize_url: string;
  readonly token_url: string;
  readonly scopes: readonly string[];
}

export interface ConnectChannelRequest {
  readonly type: ChannelType;
  readonly auth_code: string;
  readonly redirect_uri: string;
}

export interface DisconnectChannelRequest {
  readonly channel_id: string;
  readonly reason?: string;
}

export interface ChannelListResponse {
  readonly data: readonly Channel[];
  readonly pagination: {
    readonly page: number;
    readonly page_size: number;
    readonly total: number;
    readonly total_pages: number;
  };
}

// ============================================
// OAUTH INTERFACES
// ============================================

export interface OAuthState {
  readonly state_token: string;
  readonly channel_type: ChannelType;
  readonly redirect_uri: string;
  readonly created_at: string;
  readonly expires_at: string;
}

export interface OAuthCallbackParams {
  readonly code: string;
  readonly state: string;
  readonly error?: string;
  readonly error_description?: string;
}

// ============================================
// TYPE GUARDS
// ============================================

export function isChannelType(type: string): type is ChannelType {
  return ['linkedin', 'twitter', 'email', 'facebook', 'instagram'].includes(type);
}

export function isConnectionStatus(status: string): status is ConnectionStatus {
  return ['connected', 'disconnected', 'error', 'pending'].includes(status);
}

export function isChannelHealth(health: string): health is ChannelHealth {
  return ['healthy', 'degraded', 'failing'].includes(health);
}
