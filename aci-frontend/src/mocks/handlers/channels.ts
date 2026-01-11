import { http, HttpResponse } from 'msw';
import { mockChannels, createMockChannel } from '../fixtures/channels';
import type { Channel, ConnectChannelRequest, OAuthState, ChannelType } from '../../types/channels';

const BASE_URL = 'http://localhost:8080/api/v1';

// ============================================
// MSW HANDLERS
// ============================================

export const channelHandlers = [
  // GET /api/v1/channels - List all channels
  http.get(`${BASE_URL}/channels`, ({ request }) => {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const status = url.searchParams.get('status');

    let filteredChannels = [...mockChannels];

    if (type) {
      filteredChannels = filteredChannels.filter((ch) => ch.type === type);
    }

    if (status) {
      filteredChannels = filteredChannels.filter((ch) => ch.status === status);
    }

    return HttpResponse.json({
      data: filteredChannels,
      pagination: {
        page: 1,
        page_size: 20,
        total: filteredChannels.length,
        total_pages: 1,
      },
    });
  }),

  // GET /api/v1/channels/:id - Get single channel
  http.get(`${BASE_URL}/channels/:id`, ({ params }) => {
    const { id } = params;
    const channel = mockChannels.find((ch) => ch.id === id);

    if (!channel) {
      return HttpResponse.json(
        { error: 'Not Found', message: 'Channel not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(channel);
  }),

  // POST /api/v1/channels/connect - Connect a channel
  http.post(`${BASE_URL}/channels/connect`, async ({ request }) => {
    const body = (await request.json()) as ConnectChannelRequest;

    // Simulate OAuth success
    const newChannel = createMockChannel({
      type: body.type,
      name: body.type.charAt(0).toUpperCase() + body.type.slice(1),
      status: 'connected',
      health: 'healthy',
      account_name: `Test Account`,
      connected_at: new Date().toISOString(),
      stats: {
        posts_published: 0,
        total_engagement: 0,
        total_impressions: 0,
        avg_engagement_rate: 0,
      },
    });

    return HttpResponse.json(newChannel, { status: 201 });
  }),

  // POST /api/v1/channels/:id/disconnect - Disconnect a channel
  http.post(`${BASE_URL}/channels/:id/disconnect`, ({ params }) => {
    const { id } = params;
    const channel = mockChannels.find((ch) => ch.id === id);

    if (!channel) {
      return HttpResponse.json(
        { error: 'Not Found', message: 'Channel not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json({ message: 'Channel disconnected successfully' });
  }),

  // POST /api/v1/channels/oauth/initiate - Initiate OAuth flow
  http.post(`${BASE_URL}/channels/oauth/initiate`, async ({ request }) => {
    const body = (await request.json()) as {
      channel_type: string;
      redirect_uri: string;
    };

    const oauthState: OAuthState = {
      state_token: `state_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      channel_type: body.channel_type as ChannelType,
      redirect_uri: body.redirect_uri,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour
    };

    return HttpResponse.json(oauthState);
  }),

  // POST /api/v1/channels/:id/refresh - Refresh channel connection
  http.post(`${BASE_URL}/channels/:id/refresh`, ({ params }) => {
    const { id } = params;
    const channel = mockChannels.find((ch) => ch.id === id);

    if (!channel) {
      return HttpResponse.json(
        { error: 'Not Found', message: 'Channel not found' },
        { status: 404 }
      );
    }

    // Return channel with updated status
    const refreshedChannel: Channel = {
      ...channel,
      status: 'connected',
      health: 'healthy',
      error_message: undefined,
      updated_at: new Date().toISOString(),
    };

    return HttpResponse.json(refreshedChannel);
  }),
];
