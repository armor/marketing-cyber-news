/**
 * Newsletter MSW Handlers
 * Mock handlers for newsletter configuration, segments, and issues endpoints
 */

import { http, HttpResponse, delay } from 'msw';
import type {
  NewsletterConfiguration,
  Segment,
  NewsletterIssue,
  ConfigurationListResponse,
  SegmentListResponse,
  IssueListResponse,
  GenerateIssueResponse,
} from '@/types/newsletter';
import {
  createMockIssueWithStatus,
  createMockIssuePreview,
} from '@/mocks/factories/newsletter-factory';

// Type to make properties mutable for mock updates
type Mutable<T> = { -readonly [P in keyof T]: T[P] };

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:10081/v1';

// ============================================================================
// Mock Data
// ============================================================================

const mockConfigurations: NewsletterConfiguration[] = [
  {
    id: 'config-001',
    name: 'Weekly Security Digest',
    description: 'Weekly roundup of critical security news for enterprise clients',
    segment_id: 'segment-001',
    cadence: 'weekly',
    send_day_of_week: 2, // Tuesday
    send_time_utc: '14:00',
    timezone: 'America/New_York',
    max_blocks: 6,
    education_ratio_min: 0.3,
    content_freshness_days: 7,
    hero_topic_priority: 'critical_vulnerabilities',
    framework_focus: 'NIST',
    subject_line_style: 'pain_first',
    max_metaphors: 2,
    banned_phrases: ['game-changer', 'synergy', 'paradigm shift'],
    approval_tier: 'tier1',
    risk_level: 'standard',
    ai_provider: 'anthropic',
    ai_model: 'claude-3-sonnet',
    prompt_version: 2,
    is_active: true,
    created_by: 'admin-001',
    created_at: '2024-01-15T10:00:00.000Z',
    updated_at: '2024-12-01T15:30:00.000Z',
  },
  {
    id: 'config-002',
    name: 'Monthly Compliance Update',
    description: 'Monthly newsletter focused on compliance and regulatory updates',
    segment_id: 'segment-002',
    cadence: 'monthly',
    send_day_of_week: 1, // Monday
    send_time_utc: '09:00',
    timezone: 'America/Chicago',
    max_blocks: 8,
    education_ratio_min: 0.5,
    content_freshness_days: 30,
    hero_topic_priority: 'compliance_updates',
    framework_focus: 'SOC2',
    subject_line_style: 'opportunity_first',
    max_metaphors: 1,
    banned_phrases: ['unprecedented', 'revolutionary'],
    approval_tier: 'tier2',
    risk_level: 'standard',
    ai_provider: 'anthropic',
    ai_model: 'claude-3-opus',
    prompt_version: 1,
    is_active: true,
    created_by: 'marketing-001',
    created_at: '2024-02-01T08:00:00.000Z',
    updated_at: '2024-11-15T12:00:00.000Z',
  },
  {
    id: 'config-003',
    name: 'Executive Threat Briefing',
    description: 'Bi-weekly executive summary of emerging threats',
    segment_id: 'segment-003',
    cadence: 'bi-weekly',
    send_day_of_week: 4, // Thursday
    send_time_utc: '16:00',
    timezone: 'America/Los_Angeles',
    max_blocks: 4,
    education_ratio_min: 0.2,
    content_freshness_days: 14,
    hero_topic_priority: 'emerging_threats',
    framework_focus: 'ISO27001',
    subject_line_style: 'visionary',
    max_metaphors: 3,
    banned_phrases: ['cyber hygiene', 'digital transformation'],
    approval_tier: 'tier2',
    risk_level: 'high',
    ai_provider: 'anthropic',
    ai_model: 'claude-3-opus',
    prompt_version: 2,
    is_active: false,
    created_by: 'ciso-001',
    created_at: '2024-03-10T14:00:00.000Z',
    updated_at: '2024-10-20T09:30:00.000Z',
  },
];

const mockSegments: Segment[] = [
  {
    id: 'segment-001',
    name: 'Enterprise Security Teams',
    description: 'IT security professionals at enterprise organizations (1000+ employees)',
    role_cluster: 'security_operations',
    industries: ['Technology', 'Finance', 'Healthcare'],
    regions: ['North America', 'Europe'],
    company_size_bands: ['1000-5000', '5000+'],
    compliance_frameworks: ['SOC2', 'NIST', 'HIPAA'],
    partner_tags: [],
    min_engagement_score: 40,
    topic_interests: ['threat_intelligence', 'vulnerability_management', 'incident_response'],
    exclude_unsubscribed: true,
    exclude_bounced: true,
    exclude_high_touch: false,
    max_newsletters_per_30_days: 4,
    contact_count: 2847,
    is_active: true,
    created_at: '2024-01-10T08:00:00.000Z',
    updated_at: '2024-12-01T10:00:00.000Z',
  },
  {
    id: 'segment-002',
    name: 'Compliance Officers',
    description: 'Compliance and GRC professionals focused on regulatory requirements',
    role_cluster: 'compliance',
    industries: ['Finance', 'Healthcare', 'Government'],
    regions: ['North America'],
    company_size_bands: ['500-1000', '1000-5000', '5000+'],
    compliance_frameworks: ['SOC2', 'PCI-DSS', 'HIPAA', 'GDPR'],
    partner_tags: ['premium'],
    min_engagement_score: 30,
    topic_interests: ['compliance', 'audit', 'risk_management', 'policy'],
    exclude_unsubscribed: true,
    exclude_bounced: true,
    exclude_high_touch: true,
    max_newsletters_per_30_days: 2,
    contact_count: 1523,
    is_active: true,
    created_at: '2024-01-15T09:00:00.000Z',
    updated_at: '2024-11-28T14:00:00.000Z',
  },
  {
    id: 'segment-003',
    name: 'C-Suite Executives',
    description: 'CISOs, CTOs, and other executive leadership',
    role_cluster: 'executive',
    industries: ['All'],
    regions: ['Global'],
    company_size_bands: ['1000-5000', '5000+'],
    compliance_frameworks: [],
    partner_tags: ['strategic', 'enterprise'],
    min_engagement_score: 20,
    topic_interests: ['strategic_risk', 'board_reporting', 'cyber_insurance'],
    exclude_unsubscribed: true,
    exclude_bounced: true,
    exclude_high_touch: true,
    max_newsletters_per_30_days: 2,
    contact_count: 487,
    is_active: true,
    created_at: '2024-02-01T10:00:00.000Z',
    updated_at: '2024-12-05T16:00:00.000Z',
  },
  {
    id: 'segment-004',
    name: 'SMB IT Managers',
    description: 'IT managers at small and medium businesses',
    role_cluster: 'it_management',
    industries: ['All'],
    regions: ['North America'],
    company_size_bands: ['50-200', '200-500'],
    compliance_frameworks: ['SOC2'],
    partner_tags: [],
    min_engagement_score: 25,
    topic_interests: ['practical_security', 'budget_friendly', 'quick_wins'],
    exclude_unsubscribed: true,
    exclude_bounced: true,
    exclude_high_touch: false,
    max_newsletters_per_30_days: 4,
    contact_count: 3912,
    is_active: false,
    created_at: '2024-03-01T11:00:00.000Z',
    updated_at: '2024-09-15T08:00:00.000Z',
  },
];

const mockIssues: NewsletterIssue[] = [
  createMockIssueWithStatus('draft', {
    id: 'issue-001',
    configuration_id: 'config-001',
    segment_id: 'segment-001',
    subject_lines: ['Critical Vulnerabilities - Week of Dec 16'],
    subject_line: 'Critical Vulnerabilities - Week of Dec 16',
    preview_text: 'Apache Struts RCE, OpenSSL updates, and more',
  }),
  createMockIssueWithStatus('pending_approval', {
    id: 'issue-002',
    configuration_id: 'config-001',
    segment_id: 'segment-001',
    subject_lines: ['Weekly Security Digest - Dec 9'],
    subject_line: 'Weekly Security Digest - Dec 9',
    preview_text: 'Zero-day exploits, patch updates, incident reports',
  }),
  createMockIssueWithStatus('approved', {
    id: 'issue-003',
    configuration_id: 'config-002',
    segment_id: 'segment-002',
    subject_lines: ['Monthly Compliance Update - December'],
    subject_line: 'Monthly Compliance Update - December',
    preview_text: 'SOC2 audit requirements, GDPR enforcement actions',
  }),
  createMockIssueWithStatus('scheduled', {
    id: 'issue-004',
    configuration_id: 'config-001',
    segment_id: 'segment-001',
    subject_lines: ['Weekly Security Digest - Dec 2'],
    subject_line: 'Weekly Security Digest - Dec 2',
    preview_text: 'Threat intelligence briefing and industry updates',
    scheduled_for: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  }),
  createMockIssueWithStatus('sent', {
    id: 'issue-005',
    configuration_id: 'config-001',
    segment_id: 'segment-001',
    subject_lines: ['Weekly Security Digest - Nov 25'],
    subject_line: 'Weekly Security Digest - Nov 25',
    preview_text: 'Previous week coverage and analysis',
  }),
  createMockIssueWithStatus('draft', {
    id: 'issue-006',
    configuration_id: 'config-003',
    segment_id: 'segment-003',
    subject_lines: ['Executive Threat Briefing - Rejected'],
    subject_line: 'Executive Threat Briefing - Rejected',
    preview_text: 'This issue did not pass approval',
    rejection_reason: 'Content quality does not meet executive standards',
  }),
];

// ============================================================================
// Handlers
// ============================================================================

export const newsletterHandlers = [
  // GET /newsletter/configs - List configurations
  http.get(`${API_BASE}/newsletter/configs`, async ({ request }) => {
    await delay(300);

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('page_size') || '20', 10);
    const segmentId = url.searchParams.get('segment_id');
    const isActive = url.searchParams.get('is_active');

    let filteredConfigs = [...mockConfigurations];

    // Filter by segment_id
    if (segmentId) {
      filteredConfigs = filteredConfigs.filter((c) => c.segment_id === segmentId);
    }

    // Filter by is_active
    if (isActive !== null) {
      const activeValue = isActive === 'true';
      filteredConfigs = filteredConfigs.filter((c) => c.is_active === activeValue);
    }

    // Paginate
    const total = filteredConfigs.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedConfigs = filteredConfigs.slice(startIndex, startIndex + pageSize);

    const response: ConfigurationListResponse = {
      data: paginatedConfigs,
      pagination: {
        page,
        page_size: pageSize,
        total,
        total_pages: totalPages,
      },
    };

    return HttpResponse.json(response);
  }),

  // GET /newsletter/configs/:id - Get single configuration
  http.get(`${API_BASE}/newsletter/configs/:id`, async ({ params }) => {
    await delay(200);

    const { id } = params;
    const config = mockConfigurations.find((c) => c.id === id);

    if (!config) {
      return HttpResponse.json(
        { error: 'not_found', message: 'Configuration not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(config);
  }),

  // POST /newsletter/configs - Create configuration
  http.post(`${API_BASE}/newsletter/configs`, async ({ request }) => {
    await delay(400);

    const body = await request.json();
    const newConfig: NewsletterConfiguration = {
      id: `config-${Date.now()}`,
      name: (body as Record<string, unknown>).name as string || 'New Configuration',
      description: (body as Record<string, unknown>).description as string || '',
      segment_id: (body as Record<string, unknown>).segment_id as string || '',
      cadence: (body as Record<string, unknown>).cadence as 'weekly' | 'bi-weekly' | 'monthly' || 'weekly',
      send_day_of_week: (body as Record<string, unknown>).send_day_of_week as number || 1,
      send_time_utc: (body as Record<string, unknown>).send_time_utc as string || '09:00',
      timezone: (body as Record<string, unknown>).timezone as string || 'America/New_York',
      max_blocks: (body as Record<string, unknown>).max_blocks as number || 6,
      education_ratio_min: (body as Record<string, unknown>).education_ratio_min as number || 0.3,
      content_freshness_days: (body as Record<string, unknown>).content_freshness_days as number || 7,
      hero_topic_priority: (body as Record<string, unknown>).hero_topic_priority as string || '',
      framework_focus: (body as Record<string, unknown>).framework_focus as string || '',
      subject_line_style: (body as Record<string, unknown>).subject_line_style as 'pain_first' | 'opportunity_first' | 'visionary' || 'pain_first',
      max_metaphors: (body as Record<string, unknown>).max_metaphors as number || 2,
      banned_phrases: (body as Record<string, unknown>).banned_phrases as string[] || [],
      approval_tier: (body as Record<string, unknown>).approval_tier as 'tier1' | 'tier2' || 'tier1',
      risk_level: (body as Record<string, unknown>).risk_level as 'standard' | 'high' | 'experimental' || 'standard',
      ai_provider: 'anthropic',
      ai_model: 'claude-3-sonnet',
      prompt_version: 1,
      is_active: true,
      created_by: 'admin-001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockConfigurations.push(newConfig);
    return HttpResponse.json(newConfig, { status: 201 });
  }),

  // PUT /newsletter/configs/:id - Update configuration
  http.put(`${API_BASE}/newsletter/configs/:id`, async ({ params, request }) => {
    await delay(300);

    const { id } = params;
    const configIndex = mockConfigurations.findIndex((c) => c.id === id);

    if (configIndex === -1) {
      return HttpResponse.json(
        { error: 'not_found', message: 'Configuration not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updated = {
      ...mockConfigurations[configIndex],
      ...(body as Record<string, unknown>),
      updated_at: new Date().toISOString(),
    };

    mockConfigurations[configIndex] = updated as NewsletterConfiguration;
    return HttpResponse.json(updated);
  }),

  // DELETE /newsletter/configs/:id - Delete configuration
  http.delete(`${API_BASE}/newsletter/configs/:id`, async ({ params }) => {
    await delay(200);

    const { id } = params;
    const configIndex = mockConfigurations.findIndex((c) => c.id === id);

    if (configIndex === -1) {
      return HttpResponse.json(
        { error: 'not_found', message: 'Configuration not found' },
        { status: 404 }
      );
    }

    mockConfigurations.splice(configIndex, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /newsletter/segments - List segments
  http.get(`${API_BASE}/newsletter/segments`, async ({ request }) => {
    await delay(300);

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('page_size') || '20', 10);
    const isActive = url.searchParams.get('is_active');

    let filteredSegments = [...mockSegments];

    // Filter by is_active
    if (isActive !== null) {
      const activeValue = isActive === 'true';
      filteredSegments = filteredSegments.filter((s) => s.is_active === activeValue);
    }

    // Paginate
    const total = filteredSegments.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedSegments = filteredSegments.slice(startIndex, startIndex + pageSize);

    const response: SegmentListResponse = {
      data: paginatedSegments,
      pagination: {
        page,
        page_size: pageSize,
        total,
        total_pages: totalPages,
      },
    };

    return HttpResponse.json(response);
  }),

  // GET /newsletter/segments/:id - Get single segment
  http.get(`${API_BASE}/newsletter/segments/:id`, async ({ params }) => {
    await delay(200);

    const { id } = params;
    const segment = mockSegments.find((s) => s.id === id);

    if (!segment) {
      return HttpResponse.json(
        { error: 'not_found', message: 'Segment not found' },
        { status: 404 }
      );
    }

    return HttpResponse.json(segment);
  }),

  // POST /newsletter/segments - Create segment
  http.post(`${API_BASE}/newsletter/segments`, async ({ request }) => {
    await delay(400);

    const body = await request.json();
    const newSegment: Segment = {
      id: `segment-${Date.now()}`,
      name: (body as Record<string, unknown>).name as string || 'New Segment',
      description: (body as Record<string, unknown>).description as string || '',
      role_cluster: (body as Record<string, unknown>).role_cluster as string || '',
      industries: (body as Record<string, unknown>).industries as string[] || [],
      regions: (body as Record<string, unknown>).regions as string[] || [],
      company_size_bands: (body as Record<string, unknown>).company_size_bands as string[] || [],
      compliance_frameworks: (body as Record<string, unknown>).compliance_frameworks as string[] || [],
      partner_tags: (body as Record<string, unknown>).partner_tags as string[] || [],
      min_engagement_score: (body as Record<string, unknown>).min_engagement_score as number || 0,
      topic_interests: (body as Record<string, unknown>).topic_interests as string[] || [],
      exclude_unsubscribed: true,
      exclude_bounced: true,
      exclude_high_touch: false,
      max_newsletters_per_30_days: (body as Record<string, unknown>).max_newsletters_per_30_days as number || 4,
      contact_count: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockSegments.push(newSegment);
    return HttpResponse.json(newSegment, { status: 201 });
  }),

  // PUT /newsletter/segments/:id - Update segment
  http.put(`${API_BASE}/newsletter/segments/:id`, async ({ params, request }) => {
    await delay(300);

    const { id } = params;
    const segmentIndex = mockSegments.findIndex((s) => s.id === id);

    if (segmentIndex === -1) {
      return HttpResponse.json(
        { error: 'not_found', message: 'Segment not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updated = {
      ...mockSegments[segmentIndex],
      ...(body as Record<string, unknown>),
      updated_at: new Date().toISOString(),
    };

    mockSegments[segmentIndex] = updated as Segment;
    return HttpResponse.json(updated);
  }),

  // ============================================================================
  // Newsletter Issues Handlers
  // ============================================================================

  /**
   * GET /newsletter-issues - List issues
   * Query params:
   * - page: number (default: 1)
   * - page_size: number (default: 20)
   * - configuration_id: string (optional filter)
   * - status: IssueStatus (optional filter)
   * - segment_id: string (optional filter)
   */
  http.get(`${API_BASE}/newsletter-issues`, async ({ request }) => {
    await delay(300);

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('page_size') || '20', 10);
    const configurationId = url.searchParams.get('configuration_id');
    const status = url.searchParams.get('status');
    const segmentId = url.searchParams.get('segment_id');

    let filteredIssues = [...mockIssues];

    // Apply filters
    if (configurationId) {
      filteredIssues = filteredIssues.filter((i) => i.configuration_id === configurationId);
    }
    if (status) {
      filteredIssues = filteredIssues.filter((i) => i.status === status);
    }
    if (segmentId) {
      filteredIssues = filteredIssues.filter((i) => i.segment_id === segmentId);
    }

    // Paginate
    const total = filteredIssues.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedIssues = filteredIssues.slice(startIndex, startIndex + pageSize);

    const response: IssueListResponse = {
      data: paginatedIssues,
      pagination: {
        page,
        page_size: pageSize,
        total,
        total_pages: totalPages,
      },
    };

    return HttpResponse.json(response);
  }),

  /**
   * GET /newsletter-issues/:id - Get single issue
   */
  http.get(`${API_BASE}/newsletter-issues/:id`, async ({ params }) => {
    await delay(200);

    const { id } = params;
    const issue = mockIssues.find((i) => i.id === id);

    if (!issue) {
      return HttpResponse.json(
        { error: 'not_found', message: 'Issue not found' },
        { status: 404 }
      );
    }

    // Wrap in { data: issue } to match API client expectations
    return HttpResponse.json({ data: issue });
  }),

  /**
   * POST /newsletter-issues - Create issue (for future use)
   * Currently returns error - issues are generated via /generate endpoint
   */
  http.post(`${API_BASE}/newsletter-issues`, async () => {
    await delay(200);

    return HttpResponse.json(
      {
        error: 'method_not_supported',
        message: 'Use /newsletter-issues/generate to create new issues',
      },
      { status: 405 }
    );
  }),

  /**
   * POST /newsletter-issues/generate - Generate new issue from configuration
   * Body:
   * - configuration_id: string (required)
   * - scheduled_for: ISO date string (optional)
   * Returns: GenerateIssueResponse with issue_id and job_id
   */
  http.post(`${API_BASE}/newsletter-issues/generate`, async ({ request }) => {
    await delay(500);

    const body = (await request.json()) as Record<string, unknown>;
    const configId = body.configuration_id as string | undefined;

    if (!configId) {
      return HttpResponse.json(
        {
          error: 'missing_field',
          message: 'configuration_id is required',
        },
        { status: 400 }
      );
    }

    // Verify configuration exists
    const config = mockConfigurations.find((c) => c.id === configId);
    if (!config) {
      return HttpResponse.json(
        {
          error: 'not_found',
          message: 'Configuration not found',
        },
        { status: 404 }
      );
    }

    // Create new issue in draft status
    const newIssue = createMockIssueWithStatus('draft', {
      id: `issue-${Date.now()}`,
      configuration_id: configId,
      segment_id: config.segment_id,
      scheduled_for: body.scheduled_for as string | undefined,
    });

    mockIssues.push(newIssue);

    const response: GenerateIssueResponse = {
      message: 'Issue generation started',
      issue_id: newIssue.id,
      job_id: `job-${Date.now()}`,
    };

    return HttpResponse.json(response, { status: 201 });
  }),

  /**
   * GET /newsletter-issues/:id/preview - Preview issue with personalization
   * Query params:
   * - contact_id: string (optional, for personalized preview)
   * Returns: IssuePreview with rendered HTML and personalization tokens
   */
  http.get(`${API_BASE}/newsletter-issues/:id/preview`, async ({ params, request }) => {
    await delay(400);

    const { id } = params;
    const url = new URL(request.url);
    const contactId = url.searchParams.get('contact_id') || undefined;

    const issue = mockIssues.find((i) => i.id === id);
    if (!issue) {
      return HttpResponse.json(
        { error: 'not_found', message: 'Issue not found' },
        { status: 404 }
      );
    }

    const preview = createMockIssuePreview({
      issue_id: id as string,
      contact_id: contactId || undefined,
      subject_line: issue.subject_line,
      preview_text: issue.preview_text,
    });

    return HttpResponse.json(preview);
  }),

  /**
   * PUT /newsletter-issues/:id - Update issue
   * Only draft and pending_approval issues can be updated
   */
  http.put(`${API_BASE}/newsletter-issues/:id`, async ({ params, request }) => {
    await delay(300);

    const { id } = params;
    const issueIndex = mockIssues.findIndex((i) => i.id === id);

    if (issueIndex === -1) {
      return HttpResponse.json(
        { error: 'not_found', message: 'Issue not found' },
        { status: 404 }
      );
    }

    const issue = mockIssues[issueIndex];

    // Only draft and pending_approval can be updated
    if (issue.status !== 'draft' && issue.status !== 'pending_approval') {
      return HttpResponse.json(
        {
          error: 'invalid_state',
          message: `Cannot update issue in ${issue.status} status`,
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updated = {
      ...issue,
      ...(body as Record<string, unknown>),
      updated_at: new Date().toISOString(),
    };

    mockIssues[issueIndex] = updated as NewsletterIssue;
    return HttpResponse.json(updated);
  }),

  /**
   * DELETE /newsletter-issues/:id - Delete issue
   * Only draft issues can be deleted
   */
  http.delete(`${API_BASE}/newsletter-issues/:id`, async ({ params }) => {
    await delay(200);

    const { id } = params;
    const issueIndex = mockIssues.findIndex((i) => i.id === id);

    if (issueIndex === -1) {
      return HttpResponse.json(
        { error: 'not_found', message: 'Issue not found' },
        { status: 404 }
      );
    }

    const issue = mockIssues[issueIndex];

    // Only draft can be deleted
    if (issue.status !== 'draft') {
      return HttpResponse.json(
        {
          error: 'invalid_state',
          message: `Cannot delete issue in ${issue.status} status`,
        },
        { status: 400 }
      );
    }

    mockIssues.splice(issueIndex, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  /**
   * POST /newsletter-issues/:id/submit-for-approval - Submit issue for approval
   * Transitions issue from draft to pending_approval
   */
  http.post(`${API_BASE}/newsletter-issues/:id/submit-for-approval`, async ({ params }) => {
    await delay(300);

    const { id } = params;
    const issueIndex = mockIssues.findIndex((i) => i.id === id);

    if (issueIndex === -1) {
      return HttpResponse.json(
        { error: 'not_found', message: 'Issue not found' },
        { status: 404 }
      );
    }

    const issue = mockIssues[issueIndex];

    if (issue.status !== 'draft') {
      return HttpResponse.json(
        {
          error: 'invalid_state',
          message: 'Only draft issues can be submitted for approval',
        },
        { status: 400 }
      );
    }

    const mutableIssue = issue as Mutable<NewsletterIssue>;
    mutableIssue.status = 'pending_approval';
    mutableIssue.updated_at = new Date().toISOString();

    return HttpResponse.json(mutableIssue);
  }),

  /**
   * POST /newsletter-issues/:id/approve - Approve issue
   * Requires admin/approver role
   */
  http.post(`${API_BASE}/newsletter-issues/:id/approve`, async ({ params }) => {
    await delay(300);

    const { id } = params;
    const issueIndex = mockIssues.findIndex((i) => i.id === id);

    if (issueIndex === -1) {
      return HttpResponse.json(
        { error: 'not_found', message: 'Issue not found' },
        { status: 404 }
      );
    }

    const issue = mockIssues[issueIndex];

    if (issue.status !== 'pending_approval') {
      return HttpResponse.json(
        {
          error: 'invalid_state',
          message: 'Only pending_approval issues can be approved',
        },
        { status: 400 }
      );
    }

    const mutableIssue = issue as Mutable<NewsletterIssue>;
    mutableIssue.status = 'approved';
    mutableIssue.approved_by = 'approver-001';
    mutableIssue.approved_at = new Date().toISOString();
    mutableIssue.updated_at = new Date().toISOString();

    return HttpResponse.json(mutableIssue);
  }),

  /**
   * POST /newsletter-issues/:id/reject - Reject issue
   * Body:
   * - reason: string (rejection reason)
   */
  http.post(`${API_BASE}/newsletter-issues/:id/reject`, async ({ params, request }) => {
    await delay(300);

    const { id } = params;
    const issueIndex = mockIssues.findIndex((i) => i.id === id);

    if (issueIndex === -1) {
      return HttpResponse.json(
        { error: 'not_found', message: 'Issue not found' },
        { status: 404 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;

    if (!body.reason) {
      return HttpResponse.json(
        {
          error: 'missing_field',
          message: 'reason is required',
        },
        { status: 400 }
      );
    }

    const issue = mockIssues[issueIndex];

    if (issue.status !== 'pending_approval') {
      return HttpResponse.json(
        {
          error: 'invalid_state',
          message: 'Only pending_approval issues can be rejected',
        },
        { status: 400 }
      );
    }

    const mutableIssue = issue as Mutable<NewsletterIssue>;
    mutableIssue.status = 'draft';
    mutableIssue.rejection_reason = body.reason as string;
    mutableIssue.updated_at = new Date().toISOString();

    return HttpResponse.json(mutableIssue);
  }),

  /**
   * POST /newsletter-issues/:id/schedule - Schedule issue for sending
   * Body:
   * - scheduled_for: ISO date string (required)
   * Transitions from approved to scheduled
   */
  http.post(`${API_BASE}/newsletter-issues/:id/schedule`, async ({ params, request }) => {
    await delay(300);

    const { id } = params;
    const issueIndex = mockIssues.findIndex((i) => i.id === id);

    if (issueIndex === -1) {
      return HttpResponse.json(
        { error: 'not_found', message: 'Issue not found' },
        { status: 404 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;

    if (!body.scheduled_for) {
      return HttpResponse.json(
        {
          error: 'missing_field',
          message: 'scheduled_for is required',
        },
        { status: 400 }
      );
    }

    const issue = mockIssues[issueIndex];

    if (issue.status !== 'approved') {
      return HttpResponse.json(
        {
          error: 'invalid_state',
          message: 'Only approved issues can be scheduled',
        },
        { status: 400 }
      );
    }

    const mutableIssue = issue as Mutable<NewsletterIssue>;
    mutableIssue.status = 'scheduled';
    mutableIssue.scheduled_for = body.scheduled_for as string;
    mutableIssue.updated_at = new Date().toISOString();

    return HttpResponse.json(mutableIssue);
  }),
];
