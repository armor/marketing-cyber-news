/**
 * Voice Transformation API Service
 *
 * Type-safe API functions for voice transformation system.
 * Handles voice agent management and text transformations.
 */

import { apiClient } from './client';
import type {
  VoiceAgent,
  VoiceAgentWithDetails,
  VoiceAgentListResponse,
  VoiceAgentResponse,
  TransformRequest,
  TransformResponseWrapper,
  SelectTransformRequest,
  TransformationRecordResponse,
  TransformationFilter,
  TransformationListResponse,
} from '@/types/voice';

// API Prefixes - aligned with backend routing
// Note: API_BASE_URL already includes /v1, so we don't duplicate it here
const VOICE_AGENTS_PREFIX = '/voice-agents';
const ADMIN_VOICE_AGENTS_PREFIX = '/admin/voice-agents';
const TRANSFORMATIONS_PREFIX = '/transformations';

// ============================================================================
// Voice Agent API (Public)
// ============================================================================

/**
 * List all active voice agents
 * GET /v1/voice-agents
 */
export async function listVoiceAgents(): Promise<VoiceAgent[]> {
  const response = await apiClient.get<VoiceAgentListResponse>(VOICE_AGENTS_PREFIX);
  return response.data.agents;
}

/**
 * Get voice agent by ID with style rules and examples
 * GET /v1/voice-agents/{id}
 */
export async function getVoiceAgent(id: string): Promise<VoiceAgentWithDetails> {
  const response = await apiClient.get<VoiceAgentResponse>(`${VOICE_AGENTS_PREFIX}/${id}`);
  return response.data;
}

// ============================================================================
// Transformation API
// ============================================================================

/**
 * Transform text using a voice agent
 * POST /v1/voice-agents/{id}/transform
 * Rate limited: 30 requests/hour per user
 *
 * @param agentId - Voice agent ID
 * @param request - Transformation request
 * @returns Three transformation options (conservative, moderate, bold)
 */
export async function transformText(
  agentId: string,
  request: TransformRequest
): Promise<TransformResponseWrapper> {
  return apiClient.post<TransformResponseWrapper>(
    `${VOICE_AGENTS_PREFIX}/${agentId}/transform`,
    request
  );
}

/**
 * Select a transformation option and record the selection
 * POST /v1/transformations/select
 *
 * @param request - Selection request with request_id and transformation_index
 * @returns Transformation record
 */
export async function selectTransformation(
  request: SelectTransformRequest
): Promise<TransformationRecordResponse> {
  return apiClient.post<TransformationRecordResponse>(`${TRANSFORMATIONS_PREFIX}/select`, request);
}

/**
 * Get transformation history with filters
 * GET /v1/transformations
 *
 * @param filters - Optional filters for user, agent, entity, date range
 * @returns Paginated transformation records
 */
export async function getTransformationHistory(
  filters?: TransformationFilter
): Promise<TransformationListResponse> {
  const params = new URLSearchParams();

  if (filters) {
    if (filters.user_id) params.append('user_id', filters.user_id);
    if (filters.agent_id) params.append('agent_id', filters.agent_id);
    if (filters.entity_type) params.append('entity_type', filters.entity_type);
    if (filters.entity_id) params.append('entity_id', filters.entity_id);
    if (filters.from_date) params.append('from_date', filters.from_date);
    if (filters.to_date) params.append('to_date', filters.to_date);
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());
  }

  const url = params.toString()
    ? `${TRANSFORMATIONS_PREFIX}?${params.toString()}`
    : TRANSFORMATIONS_PREFIX;

  return apiClient.get<TransformationListResponse>(url);
}

// ============================================================================
// Admin Voice Agent API
// ============================================================================

/**
 * Create a new voice agent (admin only)
 * POST /v1/admin/voice-agents
 */
export async function createVoiceAgent(
  data: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    system_prompt: string;
    temperature?: number;
    max_tokens?: number;
    status?: 'active' | 'draft' | 'inactive';
  }
): Promise<VoiceAgentWithDetails> {
  const response = await apiClient.post<VoiceAgentResponse>(ADMIN_VOICE_AGENTS_PREFIX, data);
  return response.data;
}

/**
 * Update a voice agent (admin only)
 * PUT /v1/admin/voice-agents/{id}
 */
export async function updateVoiceAgent(
  id: string,
  data: {
    name?: string;
    description?: string;
    icon?: string;
    color?: string;
    system_prompt?: string;
    temperature?: number;
    max_tokens?: number;
    status?: 'active' | 'draft' | 'inactive';
  }
): Promise<VoiceAgentWithDetails> {
  const response = await apiClient.put<VoiceAgentResponse>(`${ADMIN_VOICE_AGENTS_PREFIX}/${id}`, data);
  return response.data;
}

/**
 * Delete a voice agent (admin only)
 * DELETE /v1/admin/voice-agents/{id}
 */
export async function deleteVoiceAgent(id: string): Promise<void> {
  await apiClient.delete(`${ADMIN_VOICE_AGENTS_PREFIX}/${id}`);
}

// ============================================================================
// Admin Style Rules API
// ============================================================================

/**
 * Create a style rule for a voice agent (admin only)
 * POST /v1/admin/voice-agents/{id}/rules
 */
export async function createStyleRule(
  agentId: string,
  data: {
    rule_type: 'do' | 'dont';
    rule_text: string;
    sort_order?: number;
  }
): Promise<void> {
  await apiClient.post(`${ADMIN_VOICE_AGENTS_PREFIX}/${agentId}/rules`, data);
}

/**
 * Update a style rule (admin only)
 * PUT /v1/admin/voice-agents/{agentId}/rules/{ruleId}
 */
export async function updateStyleRule(
  agentId: string,
  ruleId: string,
  data: {
    rule_type?: 'do' | 'dont';
    rule_text?: string;
    sort_order?: number;
  }
): Promise<void> {
  await apiClient.put(`${ADMIN_VOICE_AGENTS_PREFIX}/${agentId}/rules/${ruleId}`, data);
}

/**
 * Delete a style rule (admin only)
 * DELETE /v1/admin/voice-agents/{agentId}/rules/{ruleId}
 */
export async function deleteStyleRule(agentId: string, ruleId: string): Promise<void> {
  await apiClient.delete(`${ADMIN_VOICE_AGENTS_PREFIX}/${agentId}/rules/${ruleId}`);
}

// ============================================================================
// Admin Examples API
// ============================================================================

/**
 * Create an example for a voice agent (admin only)
 * POST /v1/admin/voice-agents/{id}/examples
 */
export async function createExample(
  agentId: string,
  data: {
    before_text: string;
    after_text: string;
    context?: string;
    sort_order?: number;
  }
): Promise<void> {
  await apiClient.post(`${ADMIN_VOICE_AGENTS_PREFIX}/${agentId}/examples`, data);
}

/**
 * Update an example (admin only)
 * PUT /v1/admin/voice-agents/{agentId}/examples/{exampleId}
 */
export async function updateExample(
  agentId: string,
  exampleId: string,
  data: {
    before_text?: string;
    after_text?: string;
    context?: string;
    sort_order?: number;
  }
): Promise<void> {
  await apiClient.put(`${ADMIN_VOICE_AGENTS_PREFIX}/${agentId}/examples/${exampleId}`, data);
}

/**
 * Delete an example (admin only)
 * DELETE /v1/admin/voice-agents/{agentId}/examples/{exampleId}
 */
export async function deleteExample(agentId: string, exampleId: string): Promise<void> {
  await apiClient.delete(`${ADMIN_VOICE_AGENTS_PREFIX}/${agentId}/examples/${exampleId}`);
}
