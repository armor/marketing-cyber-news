import type { Channel, ChannelListResponse } from '../../types/channels';

// ============================================
// MOCK CHANNEL DATA
// ============================================

export const mockChannels: Channel[] = [
  {
    id: 'ch-linkedin-001',
    type: 'linkedin',
    name: 'LinkedIn',
    status: 'connected',
    health: 'healthy',
    account_name: 'Armor Security',
    account_id: 'armor-security-inc',
    connected_at: '2025-01-15T10:00:00Z',
    last_used_at: '2025-12-20T14:30:00Z',
    stats: {
      posts_published: 47,
      total_engagement: 3824,
      total_impressions: 28450,
      avg_engagement_rate: 0.134,
      last_post_date: '2025-12-20T14:30:00Z',
    },
    oauth_config: {
      provider: 'linkedin',
      authorize_url: 'https://www.linkedin.com/oauth/v2/authorization',
      token_url: 'https://www.linkedin.com/oauth/v2/accessToken',
      scopes: ['r_liteprofile', 'r_emailaddress', 'w_member_social'],
    },
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-12-20T14:30:00Z',
  },
  {
    id: 'ch-twitter-001',
    type: 'twitter',
    name: 'Twitter',
    status: 'connected',
    health: 'healthy',
    account_name: 'ArmorSecurity',
    account_id: 'armor_security',
    connected_at: '2025-02-01T09:00:00Z',
    last_used_at: '2025-12-19T16:45:00Z',
    stats: {
      posts_published: 124,
      total_engagement: 8942,
      total_impressions: 145230,
      avg_engagement_rate: 0.062,
      last_post_date: '2025-12-19T16:45:00Z',
    },
    oauth_config: {
      provider: 'twitter',
      authorize_url: 'https://twitter.com/i/oauth2/authorize',
      token_url: 'https://api.twitter.com/2/oauth2/token',
      scopes: ['tweet.read', 'tweet.write', 'users.read'],
    },
    created_at: '2025-02-01T09:00:00Z',
    updated_at: '2025-12-19T16:45:00Z',
  },
  {
    id: 'ch-email-001',
    type: 'email',
    name: 'Email Marketing',
    status: 'connected',
    health: 'healthy',
    account_name: 'Armor Newsletter',
    account_id: 'armor-newsletter',
    connected_at: '2025-01-10T08:00:00Z',
    last_used_at: '2025-12-18T10:00:00Z',
    stats: {
      posts_published: 12,
      total_engagement: 2456,
      total_impressions: 15800,
      avg_engagement_rate: 0.155,
      last_post_date: '2025-12-18T10:00:00Z',
    },
    created_at: '2025-01-10T08:00:00Z',
    updated_at: '2025-12-18T10:00:00Z',
  },
  {
    id: 'ch-facebook-001',
    type: 'facebook',
    name: 'Facebook',
    status: 'error',
    health: 'failing',
    account_name: 'Armor Security Inc',
    account_id: 'armor-security-page',
    connected_at: '2025-03-15T12:00:00Z',
    last_used_at: '2025-12-10T11:20:00Z',
    error_message: 'Token expired. Please reconnect your Facebook account.',
    stats: {
      posts_published: 32,
      total_engagement: 1847,
      total_impressions: 42300,
      avg_engagement_rate: 0.044,
      last_post_date: '2025-12-10T11:20:00Z',
    },
    oauth_config: {
      provider: 'facebook',
      authorize_url: 'https://www.facebook.com/v18.0/dialog/oauth',
      token_url: 'https://graph.facebook.com/v18.0/oauth/access_token',
      scopes: ['pages_manage_posts', 'pages_read_engagement'],
    },
    created_at: '2025-03-15T12:00:00Z',
    updated_at: '2025-12-15T09:30:00Z',
  },
];

// ============================================
// MOCK API RESPONSES
// ============================================

export const mockChannelListResponse: ChannelListResponse = {
  data: mockChannels,
  pagination: {
    page: 1,
    page_size: 20,
    total: mockChannels.length,
    total_pages: 1,
  },
};

// ============================================
// FACTORY FUNCTIONS
// ============================================

export function createMockChannel(overrides?: Partial<Channel>): Channel {
  const baseChannel: Channel = {
    id: `ch-${Date.now()}`,
    type: 'linkedin',
    name: 'LinkedIn',
    status: 'disconnected',
    health: 'healthy',
    stats: {
      posts_published: 0,
      total_engagement: 0,
      total_impressions: 0,
      avg_engagement_rate: 0,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return { ...baseChannel, ...overrides };
}
