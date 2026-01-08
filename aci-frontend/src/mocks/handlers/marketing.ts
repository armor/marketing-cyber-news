import { http, HttpResponse } from 'msw';

// Types for mock data
interface MockCampaign {
  id: string;
  tenant_id: string;
  name?: string;
  description?: string;
  goal?: string;
  channels?: string[];
  frequency?: string;
  content_style?: string;
  topics?: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

interface MockChannel {
  id: string;
  channel: string;
  status: string;
  provider: string;
  connected_at: string | null;
  config: Record<string, unknown> | null;
  error_message?: string;
  updated_at?: string;
}

// Mock data
const mockCampaigns: MockCampaign[] = [
  {
    id: 'campaign-001',
    tenant_id: 'tenant-001',
    name: 'Q1 Newsletter Campaign',
    description: 'Weekly newsletter for Q1 2025',
    goal: 'engagement',
    channels: ['email', 'linkedin'],
    frequency: 'weekly',
    content_style: 'educational',
    topics: ['cybersecurity', 'compliance'],
    status: 'draft',
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date('2025-01-01').toISOString()
  },
  {
    id: 'campaign-002',
    tenant_id: 'tenant-001',
    name: 'Product Launch Campaign',
    description: 'New security platform launch',
    goal: 'conversion',
    channels: ['email', 'linkedin', 'twitter'],
    frequency: 'daily',
    content_style: 'promotional',
    topics: ['product', 'features'],
    status: 'active',
    created_at: new Date('2025-01-05').toISOString(),
    updated_at: new Date('2025-01-10').toISOString()
  },
  {
    id: 'campaign-003',
    tenant_id: 'tenant-001',
    name: 'Monthly Threat Intelligence',
    description: 'Monthly threat landscape summary',
    goal: 'awareness',
    channels: ['email'],
    frequency: 'monthly',
    content_style: 'informative',
    topics: ['threats', 'intelligence', 'analysis'],
    status: 'paused',
    created_at: new Date('2024-12-01').toISOString(),
    updated_at: new Date('2025-01-12').toISOString()
  }
];

const mockChannels: MockChannel[] = [
  {
    id: 'channel-001',
    channel: 'email',
    status: 'connected',
    provider: 'sendgrid',
    connected_at: new Date('2025-01-01').toISOString(),
    config: {
      api_key: '***',
      sender_email: 'newsletter@example.com',
      sender_name: 'Cyber News'
    }
  },
  {
    id: 'channel-002',
    channel: 'linkedin',
    status: 'connected',
    provider: 'linkedin',
    connected_at: new Date('2025-01-02').toISOString(),
    config: {
      page_id: 'company-page-123',
      access_token: '***'
    }
  },
  {
    id: 'channel-003',
    channel: 'twitter',
    status: 'disconnected',
    provider: 'twitter',
    connected_at: null,
    config: null
  },
  {
    id: 'channel-004',
    channel: 'facebook',
    status: 'error',
    provider: 'facebook',
    connected_at: new Date('2024-12-15').toISOString(),
    config: {
      page_id: 'page-456',
      access_token: '***'
    },
    error_message: 'Access token expired'
  }
];

const mockCalendarEntries = [
  {
    id: 'cal-001',
    title: 'Weekly Newsletter - Cybersecurity Update',
    scheduled_at: new Date(Date.now() + 86400000).toISOString(),
    status: 'scheduled',
    campaign_id: 'campaign-001',
    channels: ['email'],
    content_preview: 'This week in cybersecurity...'
  },
  {
    id: 'cal-002',
    title: 'Product Launch Announcement',
    scheduled_at: new Date(Date.now() + 172800000).toISOString(),
    status: 'scheduled',
    campaign_id: 'campaign-002',
    channels: ['email', 'linkedin', 'twitter'],
    content_preview: 'Introducing our new platform...'
  },
  {
    id: 'cal-003',
    title: 'LinkedIn Post - Industry Insights',
    scheduled_at: new Date(Date.now() + 259200000).toISOString(),
    status: 'draft',
    campaign_id: 'campaign-001',
    channels: ['linkedin'],
    content_preview: 'Key trends in enterprise security...'
  }
];

const mockBrandSettings = {
  voice_guidelines: 'Professional, informative, engaging. Speak with authority but remain accessible.',
  tone: 'authoritative',
  approved_terms: ['cybersecurity', 'threat intelligence', 'compliance', 'zero trust', 'SIEM'],
  banned_terms: ['hack', 'breach', 'guaranteed', 'revolutionary'],
  color_palette: ['#1a1a2e', '#16213e', '#0f3460', '#e94560', '#f07b3f'],
  logo_url: '/assets/logo.png',
  brand_name: 'Cyber News Intelligence',
  tagline: 'Stay Ahead of Emerging Threats'
};

const mockContentItems = [
  {
    id: 'content-001',
    title: 'Understanding Zero Trust Architecture',
    body: 'Zero Trust Architecture represents a paradigm shift in cybersecurity...',
    campaign_id: 'campaign-001',
    status: 'approved',
    created_at: new Date().toISOString()
  },
  {
    id: 'content-002',
    title: 'Top 5 Security Threats This Week',
    body: 'Our analysis reveals critical emerging threats...',
    campaign_id: 'campaign-001',
    status: 'draft',
    created_at: new Date().toISOString()
  }
];

export const marketingHandlers = [
  // ===== CAMPAIGNS =====
  http.get('/v1/campaigns', () => {
    return HttpResponse.json({
      data: mockCampaigns,
      total: mockCampaigns.length,
      page: 1,
      page_size: 20
    });
  }),

  http.post('/v1/campaigns', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;

    // Validation
    if (!body.name || typeof body.name !== 'string' || body.name.length < 3) {
      return HttpResponse.json(
        { error: { message: 'Campaign name must be at least 3 characters' } },
        { status: 400 }
      );
    }

    if (!body.goal) {
      return HttpResponse.json(
        { error: { message: 'Campaign goal is required' } },
        { status: 400 }
      );
    }

    if (!body.channels || !Array.isArray(body.channels) || body.channels.length === 0) {
      return HttpResponse.json(
        { error: { message: 'At least one channel is required' } },
        { status: 400 }
      );
    }

    const newCampaign = {
      id: `campaign-${Date.now()}`,
      tenant_id: 'tenant-001',
      ...body,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    mockCampaigns.push(newCampaign);
    return HttpResponse.json({ data: newCampaign }, { status: 201 });
  }),

  http.get('/v1/campaigns/:id', ({ params }) => {
    const campaign = mockCampaigns.find(c => c.id === params.id);
    if (!campaign) {
      return HttpResponse.json(
        { error: { message: 'Campaign not found' } },
        { status: 404 }
      );
    }
    return HttpResponse.json({ data: campaign });
  }),

  http.put('/v1/campaigns/:id', async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    const index = mockCampaigns.findIndex(c => c.id === params.id);

    if (index === -1) {
      return HttpResponse.json(
        { error: { message: 'Campaign not found' } },
        { status: 404 }
      );
    }

    mockCampaigns[index] = {
      ...mockCampaigns[index],
      ...body,
      updated_at: new Date().toISOString()
    };

    return HttpResponse.json({ data: mockCampaigns[index] });
  }),

  http.delete('/v1/campaigns/:id', ({ params }) => {
    const index = mockCampaigns.findIndex(c => c.id === params.id);

    if (index === -1) {
      return HttpResponse.json(
        { error: { message: 'Campaign not found' } },
        { status: 404 }
      );
    }

    mockCampaigns.splice(index, 1);
    return HttpResponse.json(null, { status: 204 });
  }),

  // Campaign lifecycle
  http.post('/v1/campaigns/:id/launch', ({ params }) => {
    const campaign = mockCampaigns.find(c => c.id === params.id);

    if (!campaign) {
      return HttpResponse.json(
        { error: { message: 'Campaign not found' } },
        { status: 404 }
      );
    }

    campaign.status = 'active';
    campaign.updated_at = new Date().toISOString();

    return HttpResponse.json({ data: campaign });
  }),

  http.post('/v1/campaigns/:id/pause', ({ params }) => {
    const campaign = mockCampaigns.find(c => c.id === params.id);

    if (!campaign) {
      return HttpResponse.json(
        { error: { message: 'Campaign not found' } },
        { status: 404 }
      );
    }

    campaign.status = 'paused';
    campaign.updated_at = new Date().toISOString();

    return HttpResponse.json({ data: campaign });
  }),

  http.post('/v1/campaigns/:id/resume', ({ params }) => {
    const campaign = mockCampaigns.find(c => c.id === params.id);

    if (!campaign) {
      return HttpResponse.json(
        { error: { message: 'Campaign not found' } },
        { status: 404 }
      );
    }

    campaign.status = 'active';
    campaign.updated_at = new Date().toISOString();

    return HttpResponse.json({ data: campaign });
  }),

  http.post('/v1/campaigns/:id/stop', ({ params }) => {
    const campaign = mockCampaigns.find(c => c.id === params.id);

    if (!campaign) {
      return HttpResponse.json(
        { error: { message: 'Campaign not found' } },
        { status: 404 }
      );
    }

    campaign.status = 'stopped';
    campaign.updated_at = new Date().toISOString();

    return HttpResponse.json({ data: campaign });
  }),

  // ===== CHANNELS =====
  http.get('/v1/channels', () => {
    return HttpResponse.json({ data: mockChannels });
  }),

  http.post('/v1/channels', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;

    if (!body.channel || typeof body.channel !== 'string') {
      return HttpResponse.json(
        { error: { message: 'Channel type is required' } },
        { status: 400 }
      );
    }

    const newChannel = {
      id: `channel-${Date.now()}`,
      channel: body.channel,
      status: 'disconnected',
      provider: body.channel,
      connected_at: null,
      config: null
    };

    mockChannels.push(newChannel);
    return HttpResponse.json({ data: newChannel }, { status: 201 });
  }),

  http.get('/v1/channels/:channel', ({ params }) => {
    const channel = mockChannels.find(c => c.channel === params.channel);

    if (!channel) {
      return HttpResponse.json(
        { error: { message: 'Channel not found' } },
        { status: 404 }
      );
    }

    return HttpResponse.json({ data: channel });
  }),

  http.put('/v1/channels/:channel', async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    const index = mockChannels.findIndex(c => c.channel === params.channel);

    if (index === -1) {
      return HttpResponse.json(
        { error: { message: 'Channel not found' } },
        { status: 404 }
      );
    }

    mockChannels[index] = {
      ...mockChannels[index],
      ...body,
      updated_at: new Date().toISOString()
    };

    return HttpResponse.json({ data: mockChannels[index] });
  }),

  http.delete('/v1/channels/:channel', ({ params }) => {
    const index = mockChannels.findIndex(c => c.channel === params.channel);

    if (index === -1) {
      return HttpResponse.json(
        { error: { message: 'Channel not found' } },
        { status: 404 }
      );
    }

    mockChannels.splice(index, 1);
    return HttpResponse.json(null, { status: 204 });
  }),

  http.post('/v1/channels/:channel/oauth/initiate', ({ params }) => {
    return HttpResponse.json({
      data: {
        oauth_url: `https://oauth.example.com/authorize?channel=${params.channel}&state=mock-state-token-${Date.now()}`,
        state: `mock-state-token-${Date.now()}`
      }
    });
  }),

  http.post('/v1/channels/:channel/oauth/callback', async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    const channel = mockChannels.find(c => c.channel === params.channel);

    if (!channel) {
      return HttpResponse.json(
        { error: { message: 'Channel not found' } },
        { status: 404 }
      );
    }

    if (!body.code) {
      return HttpResponse.json(
        { error: { message: 'Authorization code required' } },
        { status: 400 }
      );
    }

    channel.status = 'connected';
    channel.connected_at = new Date().toISOString();

    return HttpResponse.json({ data: channel });
  }),

  // ===== CONTENT STUDIO =====
  http.post('/v1/content-studio/generate', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;

    if (!body.topic && !body.prompt) {
      return HttpResponse.json(
        { error: { message: 'Topic or prompt is required' } },
        { status: 400 }
      );
    }

    const topic = (typeof body.topic === 'string' ? body.topic : 'cybersecurity');
    const generatedContent = {
      id: `content-${Date.now()}`,
      title: `${topic.charAt(0).toUpperCase() + topic.slice(1)}: Latest Insights`,
      body: `Generated content about ${topic}. This is a comprehensive overview covering key aspects including best practices, emerging trends, and actionable recommendations for security professionals.\n\nKey Points:\n- Latest developments in ${topic}\n- Industry best practices\n- Threat landscape analysis\n- Mitigation strategies\n\nThis content is generated based on current threat intelligence and industry standards.`,
      suggestions: [
        'Add specific statistics to strengthen credibility',
        'Include a case study or real-world example',
        'Consider adding a call-to-action at the end',
        'Shorten paragraphs for better readability'
      ],
      metadata: {
        word_count: 150,
        reading_time: '2 min',
        sentiment: 'neutral',
        topics: [topic, 'security', 'best practices']
      },
      created_at: new Date().toISOString()
    };

    return HttpResponse.json({ data: generatedContent }, { status: 201 });
  }),

  http.get('/v1/content-studio/generate', () => {
    return HttpResponse.json({ data: mockContentItems });
  }),

  // ===== CALENDAR =====
  http.get('/v1/calendar', ({ request }) => {
    const url = new URL(request.url);
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');

    let filteredEntries = mockCalendarEntries;

    if (startDate || endDate) {
      filteredEntries = mockCalendarEntries.filter(entry => {
        const entryDate = new Date(entry.scheduled_at);
        if (startDate && entryDate < new Date(startDate)) return false;
        if (endDate && entryDate > new Date(endDate)) return false;
        return true;
      });
    }

    return HttpResponse.json({ data: filteredEntries });
  }),

  // ===== BRAND =====
  http.get('/v1/brand', () => {
    return HttpResponse.json({ data: mockBrandSettings });
  }),

  http.put('/v1/brand/settings', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;

    Object.assign(mockBrandSettings, body);

    return HttpResponse.json({ data: mockBrandSettings });
  }),

  http.put('/v1/brand', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;

    Object.assign(mockBrandSettings, body);

    return HttpResponse.json({ data: mockBrandSettings });
  }),

  // ===== ANALYTICS =====
  http.get('/v1/marketing/analytics/channels', ({ request }) => {
    const url = new URL(request.url);
    const timeRange = url.searchParams.get('time_range') || '30d';

    return HttpResponse.json({
      data: {
        email: {
          sent: 12450,
          delivered: 12234,
          opens: 5834,
          clicks: 2156,
          open_rate: 47.7,
          click_rate: 17.6,
          ctr: 36.9,
          bounces: 216,
          unsubscribes: 45
        },
        linkedin: {
          posts: 28,
          impressions: 45600,
          engagement: 2134,
          engagement_rate: 4.7,
          likes: 1234,
          comments: 456,
          shares: 444,
          followers_gained: 234
        },
        twitter: {
          tweets: 42,
          impressions: 78900,
          engagement: 3456,
          engagement_rate: 4.4,
          retweets: 890,
          likes: 2100,
          replies: 466,
          followers_gained: 156
        }
      },
      metadata: {
        time_range: timeRange,
        last_updated: new Date().toISOString()
      }
    });
  }),

  http.get('/v1/marketing/analytics/trends', ({ request }) => {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'weekly';

    return HttpResponse.json({
      data: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        engagement: [1050, 1520, 1820, 2240],
        reach: [5200, 6400, 7850, 9300],
        clicks: [420, 580, 690, 820],
        conversions: [52, 68, 84, 96]
      },
      metadata: {
        period,
        last_updated: new Date().toISOString()
      }
    });
  }),

  http.get('/v1/marketing/analytics/campaigns/:id', ({ params }) => {
    const campaign = mockCampaigns.find(c => c.id === params.id);

    if (!campaign) {
      return HttpResponse.json(
        { error: { message: 'Campaign not found' } },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      data: {
        campaign_id: params.id,
        total_sent: 8450,
        total_delivered: 8323,
        total_opens: 3845,
        total_clicks: 1456,
        open_rate: 46.2,
        click_rate: 17.5,
        conversion_rate: 3.2,
        revenue: 12450.00,
        roi: 245.6,
        performance_by_channel: {
          email: { sent: 5000, opens: 2300, clicks: 890 },
          linkedin: { impressions: 15000, engagement: 720 }
        },
        top_content: [
          { title: 'Security Update #1', opens: 890, clicks: 345 },
          { title: 'Threat Analysis Report', opens: 756, clicks: 298 }
        ]
      }
    });
  }),

  http.get('/v1/marketing/analytics/content-performance', () => {
    return HttpResponse.json({
      data: [
        {
          content_id: 'content-001',
          title: 'Understanding Zero Trust Architecture',
          views: 2340,
          engagement: 456,
          engagement_rate: 19.5,
          shares: 89,
          avg_time_spent: 245
        },
        {
          content_id: 'content-002',
          title: 'Top 5 Security Threats This Week',
          views: 1890,
          engagement: 378,
          engagement_rate: 20.0,
          shares: 102,
          avg_time_spent: 189
        }
      ]
    });
  }),

  http.get('/v1/marketing/analytics/audience', () => {
    return HttpResponse.json({
      data: {
        total_subscribers: 45678,
        active_subscribers: 38945,
        engagement_rate: 42.5,
        segments: [
          { name: 'Enterprise', count: 12340, engagement_rate: 48.2 },
          { name: 'SMB', count: 18234, engagement_rate: 39.8 },
          { name: 'Individual', count: 15104, engagement_rate: 38.5 }
        ],
        demographics: {
          industries: {
            'Technology': 35.2,
            'Finance': 28.4,
            'Healthcare': 18.7,
            'Other': 17.7
          },
          regions: {
            'North America': 45.6,
            'Europe': 32.4,
            'Asia Pacific': 15.8,
            'Other': 6.2
          }
        }
      }
    });
  })
];
