/**
 * Voice Transformation Mock Handlers
 *
 * MSW handlers for voice transformation API endpoints.
 * Used in E2E tests and local development.
 */

import { http, HttpResponse } from 'msw';
import type {
  VoiceAgent,
  VoiceAgentWithDetails,
  StyleRule,
  TransformationExample,
  TransformOption,
  TransformResponse,
  TransformationRecord,
} from '@/types/voice';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// ============================================================================
// Mock Data
// ============================================================================

const mockVoiceAgents: VoiceAgent[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Professional Brand Voice',
    description: 'Authoritative, trustworthy tone for enterprise security content',
    icon: 'shield',
    color: '#3B82F6',
    system_prompt: 'You are a professional security expert writing for enterprise audiences.',
    temperature: 0.7,
    max_tokens: 500,
    status: 'active',
    sort_order: 1,
    version: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Casual Tech Voice',
    description: 'Approachable, conversational tone for social media',
    icon: 'message-square',
    color: '#8B5CF6',
    system_prompt: 'You are a friendly tech blogger writing for a general audience.',
    temperature: 0.8,
    max_tokens: 500,
    status: 'active',
    sort_order: 2,
    version: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Urgent Alert Voice',
    description: 'Clear, actionable tone for security alerts',
    icon: 'sparkles',
    color: '#EF4444',
    system_prompt: 'You are a security analyst providing urgent threat notifications.',
    temperature: 0.6,
    max_tokens: 300,
    status: 'active',
    sort_order: 3,
    version: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockStyleRules: StyleRule[] = [
  {
    id: '00000000-0000-0000-0000-000000000101',
    agent_id: '00000000-0000-0000-0000-000000000001',
    rule_type: 'do',
    rule_text: 'Use industry-standard terminology',
    sort_order: 1,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000102',
    agent_id: '00000000-0000-0000-0000-000000000001',
    rule_type: 'dont',
    rule_text: 'Avoid sensationalist language',
    sort_order: 2,
    created_at: '2024-01-01T00:00:00Z',
  },
];

const mockExamples: TransformationExample[] = [
  {
    id: '00000000-0000-0000-0000-000000000201',
    agent_id: '00000000-0000-0000-0000-000000000001',
    before_text: 'Bad guys hacked into the system',
    after_text: 'Threat actors gained unauthorized access to the infrastructure',
    context: 'Security incident description',
    sort_order: 1,
    created_at: '2024-01-01T00:00:00Z',
  },
];

// ============================================================================
// Handlers
// ============================================================================

export const voiceHandlers = [
  // GET /v1/voice-agents - List all active voice agents
  http.get(`${BASE_URL}/v1/voice-agents`, () => {
    return HttpResponse.json({
      data: mockVoiceAgents,
    });
  }),

  // GET /v1/voice-agents/:id - Get voice agent with details
  http.get(`${BASE_URL}/v1/voice-agents/:id`, ({ params }) => {
    const { id } = params;
    const agent = mockVoiceAgents.find((a) => a.id === id);

    if (!agent) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Voice agent not found',
          },
        },
        { status: 404 }
      );
    }

    const agentWithDetails: VoiceAgentWithDetails = {
      ...agent,
      style_rules: mockStyleRules.filter((r) => r.agent_id === id),
      examples: mockExamples.filter((e) => e.agent_id === id),
    };

    return HttpResponse.json({
      data: agentWithDetails,
    });
  }),

  // POST /v1/voice-agents/:id/transform - Transform text
  http.post(`${BASE_URL}/v1/voice-agents/:id/transform`, async ({ request, params }) => {
    const { id } = params;
    const agent = mockVoiceAgents.find((a) => a.id === id);

    if (!agent) {
      return HttpResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Voice agent not found',
          },
        },
        { status: 404 }
      );
    }

    const body = (await request.json()) as { text: string };
    const originalText = body.text;

    // Generate 3 mock transformation options
    const options: TransformOption[] = [
      {
        index: 0,
        label: 'conservative',
        text: `${originalText} (Conservative transformation by ${agent.name})`,
        temperature: 0.5,
        tokens_used: 120,
      },
      {
        index: 1,
        label: 'moderate',
        text: `${originalText} (Moderate transformation by ${agent.name})`,
        temperature: 0.7,
        tokens_used: 150,
      },
      {
        index: 2,
        label: 'bold',
        text: `${originalText} (Bold transformation by ${agent.name})`,
        temperature: 0.9,
        tokens_used: 180,
      },
    ];

    const response: TransformResponse = {
      request_id: `req_${Date.now()}`,
      agent_id: agent.id,
      agent_name: agent.name,
      options,
      latency_ms: 1500,
    };

    return HttpResponse.json({
      data: response,
    });
  }),

  // POST /v1/transformations/select - Select transformation
  http.post(`${BASE_URL}/v1/transformations/select`, async ({ request }) => {
    const body = (await request.json()) as {
      request_id: string;
      transformation_index: number;
    };

    const record: TransformationRecord = {
      id: `trans_${Date.now()}`,
      request_id: body.request_id,
      agent_id: '00000000-0000-0000-0000-000000000001',
      original_text: 'Original text',
      transformed_text: 'Transformed text',
      transformation_index: body.transformation_index,
      total_options: 3,
      tokens_used: 150,
      latency_ms: 1500,
      transformed_by: 'user-123',
      selected_at: new Date().toISOString(),
    };

    return HttpResponse.json({
      data: record,
    });
  }),

  // GET /v1/transformations - Get transformation history
  http.get(`${BASE_URL}/v1/transformations`, () => {
    return HttpResponse.json({
      data: [],
      meta: {
        total: 0,
        limit: 20,
        offset: 0,
      },
    });
  }),
];
