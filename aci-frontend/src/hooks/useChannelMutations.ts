import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Channel,
  ConnectChannelRequest,
  DisconnectChannelRequest,
  OAuthState,
} from '../types/channels';
import { apiClient } from '../services/api/client';
import { channelKeys } from './useChannels';

// ============================================
// API FUNCTIONS
// ============================================

async function connectChannel(request: ConnectChannelRequest): Promise<Channel> {
  return apiClient.post<Channel>('/api/v1/channels/connect', request);
}

async function disconnectChannel(request: DisconnectChannelRequest): Promise<void> {
  await apiClient.post(`/api/v1/channels/${request.channel_id}/disconnect`, {
    reason: request.reason,
  });
}

async function initiateOAuth(channelType: string): Promise<OAuthState> {
  return apiClient.post<OAuthState>('/api/v1/channels/oauth/initiate', {
    channel_type: channelType,
    redirect_uri: `${window.location.origin}/channels/oauth/callback`,
  });
}

async function refreshChannel(channelId: string): Promise<Channel> {
  return apiClient.post<Channel>(`/api/v1/channels/${channelId}/refresh`);
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook to connect a new channel via OAuth
 * @returns Mutation for connecting a channel
 */
export function useConnectChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: connectChannel,
    onSuccess: (newChannel) => {
      // Invalidate channels list
      queryClient.invalidateQueries({ queryKey: channelKeys.lists() });

      // Optimistically add to cache
      queryClient.setQueryData<Channel>(
        channelKeys.detail(newChannel.id),
        newChannel
      );
    },
  });
}

/**
 * Hook to disconnect an existing channel
 * @returns Mutation for disconnecting a channel
 */
export function useDisconnectChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: disconnectChannel,
    onSuccess: (_, variables) => {
      // Invalidate channels list
      queryClient.invalidateQueries({ queryKey: channelKeys.lists() });

      // Invalidate specific channel
      queryClient.invalidateQueries({
        queryKey: channelKeys.detail(variables.channel_id),
      });
    },
  });
}

/**
 * Hook to initiate OAuth flow for a channel
 * @returns Mutation that returns OAuth state and redirects to provider
 */
export function useInitiateOAuth() {
  return useMutation({
    mutationFn: initiateOAuth,
    onSuccess: (oauthState) => {
      // Store state in sessionStorage for OAuth callback verification
      sessionStorage.setItem('oauth_state', oauthState.state_token);
      sessionStorage.setItem('oauth_channel_type', oauthState.channel_type);

      // Redirect to OAuth provider (constructed on backend)
      // In real implementation, backend would return authorize_url
      // For now, we'll construct it client-side
      const authorizeUrl = constructOAuthUrl(oauthState);
      window.location.href = authorizeUrl;
    },
  });
}

/**
 * Hook to refresh channel connection status
 * @returns Mutation for refreshing a channel
 */
export function useRefreshChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: refreshChannel,
    onSuccess: (updatedChannel) => {
      // Update cache
      queryClient.setQueryData(
        channelKeys.detail(updatedChannel.id),
        updatedChannel
      );

      // Invalidate lists to reflect updated status
      queryClient.invalidateQueries({ queryKey: channelKeys.lists() });
    },
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Construct OAuth authorization URL
 * In production, this would come from the backend
 */
function constructOAuthUrl(oauthState: OAuthState): string {
  const baseUrls: Record<string, string> = {
    linkedin: 'https://www.linkedin.com/oauth/v2/authorization',
    twitter: 'https://twitter.com/i/oauth2/authorize',
    facebook: 'https://www.facebook.com/v18.0/dialog/oauth',
    instagram: 'https://api.instagram.com/oauth/authorize',
  };

  const clientIds: Record<string, string> = {
    linkedin: import.meta.env.VITE_LINKEDIN_CLIENT_ID || '',
    twitter: import.meta.env.VITE_TWITTER_CLIENT_ID || '',
    facebook: import.meta.env.VITE_FACEBOOK_CLIENT_ID || '',
    instagram: import.meta.env.VITE_INSTAGRAM_CLIENT_ID || '',
  };

  const scopes: Record<string, string> = {
    linkedin: 'r_liteprofile r_emailaddress w_member_social',
    twitter: 'tweet.read tweet.write users.read',
    facebook: 'pages_manage_posts pages_read_engagement',
    instagram: 'instagram_basic instagram_content_publish',
  };

  const baseUrl = baseUrls[oauthState.channel_type];
  const clientId = clientIds[oauthState.channel_type];
  const scope = scopes[oauthState.channel_type];

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: oauthState.redirect_uri,
    state: oauthState.state_token,
    response_type: 'code',
    scope,
  });

  return `${baseUrl}?${params.toString()}`;
}
