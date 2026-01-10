// Voice Transformation Types
// For multi-agent text transformation system

// ============================================
// ENUMS AND CONSTANTS
// ============================================

export type VoiceAgentStatus = 'active' | 'inactive' | 'draft';

export type StyleRuleType = 'do' | 'dont';

export type TransformLabel = 'conservative' | 'moderate' | 'bold';

// ============================================
// CORE INTERFACES - Voice Agents
// ============================================

export interface VoiceAgent {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly icon: string;
  readonly color: string;
  readonly system_prompt: string;
  readonly temperature: number;
  readonly max_tokens: number;
  readonly status: VoiceAgentStatus;
  readonly sort_order: number;
  readonly version: number;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface VoiceAgentWithDetails extends VoiceAgent {
  readonly style_rules?: StyleRule[];
  readonly examples?: TransformationExample[];
}

export interface StyleRule {
  readonly id: string;
  readonly agent_id: string;
  readonly rule_type: StyleRuleType;
  readonly rule_text: string;
  readonly sort_order: number;
  readonly created_at: string;
}

export interface TransformationExample {
  readonly id: string;
  readonly agent_id: string;
  readonly before_text: string;
  readonly after_text: string;
  readonly context?: string;
  readonly sort_order: number;
  readonly created_at: string;
}

// ============================================
// VOICE AGENT REQUEST/RESPONSE TYPES
// ============================================

export interface CreateVoiceAgentRequest {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  system_prompt: string;
  temperature?: number;
  max_tokens?: number;
  status?: VoiceAgentStatus;
  sort_order?: number;
}

export interface UpdateVoiceAgentRequest {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  system_prompt?: string;
  temperature?: number;
  max_tokens?: number;
  status?: VoiceAgentStatus;
  sort_order?: number;
}

export interface VoiceAgentListResponse {
  data: VoiceAgent[];
}

export interface VoiceAgentResponse {
  data: VoiceAgentWithDetails;
}

// ============================================
// STYLE RULE REQUEST/RESPONSE TYPES
// ============================================

export interface CreateStyleRuleRequest {
  rule_type: StyleRuleType;
  rule_text: string;
  sort_order?: number;
}

export interface UpdateStyleRuleRequest {
  rule_type?: StyleRuleType;
  rule_text?: string;
  sort_order?: number;
}

export interface StyleRuleListResponse {
  data: StyleRule[];
}

export interface StyleRuleResponse {
  data: StyleRule;
}

// ============================================
// EXAMPLE REQUEST/RESPONSE TYPES
// ============================================

export interface CreateExampleRequest {
  before_text: string;
  after_text: string;
  context?: string;
  sort_order?: number;
}

export interface UpdateExampleRequest {
  before_text?: string;
  after_text?: string;
  context?: string;
  sort_order?: number;
}

export interface ExampleListResponse {
  data: TransformationExample[];
}

export interface ExampleResponse {
  data: TransformationExample;
}

// ============================================
// TRANSFORMATION TYPES
// ============================================

export interface TransformRequest {
  text: string;
  num_options?: number;
  field_path?: string;
  entity_type?: string;
  entity_id?: string;
}

export interface TransformOption {
  readonly index: number;
  readonly label: TransformLabel;
  readonly text: string;
  readonly temperature: number;
  readonly tokens_used: number;
}

export interface TransformResponse {
  readonly request_id: string;
  readonly agent_id: string;
  readonly agent_name: string;
  readonly options: TransformOption[];
  readonly latency_ms: number;
}

export interface TransformResponseWrapper {
  data: TransformResponse;
}

export interface SelectTransformRequest {
  request_id: string;
  transformation_index: number;
  field_path?: string;
  entity_type?: string;
  entity_id?: string;
}

export interface TransformationRecord {
  readonly id: string;
  readonly request_id: string;
  readonly agent_id?: string;
  readonly original_text: string;
  readonly transformed_text: string;
  readonly transformation_index: number;
  readonly total_options: number;
  readonly field_path?: string;
  readonly entity_type?: string;
  readonly entity_id?: string;
  readonly tokens_used: number;
  readonly latency_ms: number;
  readonly transformed_by: string;
  readonly selected_at: string;
}

export interface TransformationRecordWithDetails extends TransformationRecord {
  readonly agent_config_snapshot?: Record<string, unknown>;
  readonly user?: {
    id: string;
    email: string;
    name?: string;
  };
}

export interface TransformationRecordResponse {
  data: TransformationRecord;
}

export interface TransformationRecordWithDetailsResponse {
  data: TransformationRecordWithDetails;
}

// ============================================
// TRANSFORMATION FILTER AND PAGINATION
// ============================================

export interface TransformationFilter {
  user_id?: string;
  agent_id?: string;
  entity_type?: string;
  entity_id?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

export interface TransformationListResponse {
  data: TransformationRecord[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

// ============================================
// UI STATE TYPES
// ============================================

export interface TransformState {
  isLoading: boolean;
  error: string | null;
  requestId: string | null;
  options: TransformOption[] | null;
  selectedIndex: number | null;
  originalText: string | null;
}

export interface VoiceAgentSelectionState {
  selectedAgentId: string | null;
  isAgentSelectorOpen: boolean;
  agents: VoiceAgent[];
  isLoadingAgents: boolean;
}

// ============================================
// ERROR TYPES
// ============================================

export interface VoiceApiError {
  code: string;
  message: string;
}

export interface VoiceApiErrorResponse {
  error: VoiceApiError;
}

// Common error codes
export const VOICE_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
} as const;

// ============================================
// UI HELPER CONSTANTS
// ============================================

// Voice agent status display names
export const AGENT_STATUS_LABELS: Record<VoiceAgentStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  draft: 'Draft',
};

// Voice agent status colors for badges
export const AGENT_STATUS_COLORS: Record<VoiceAgentStatus, string> = {
  active: 'green',
  inactive: 'gray',
  draft: 'yellow',
};

// Style rule type display names
export const RULE_TYPE_LABELS: Record<StyleRuleType, string> = {
  do: 'Do',
  dont: "Don't",
};

// Style rule type colors for badges
export const RULE_TYPE_COLORS: Record<StyleRuleType, string> = {
  do: 'green',
  dont: 'red',
};

// Transform label display names
export const TRANSFORM_LABEL_DISPLAY: Record<TransformLabel, string> = {
  conservative: 'Conservative',
  moderate: 'Moderate',
  bold: 'Bold',
};

// Transform label descriptions
export const TRANSFORM_LABEL_DESCRIPTIONS: Record<TransformLabel, string> = {
  conservative: 'Minimal changes, preserves original style',
  moderate: 'Balanced transformation',
  bold: 'More creative rewrite',
};

// Default voice agent icons (Lucide icon names)
export const DEFAULT_AGENT_ICONS = [
  'wand-2',
  'sparkles',
  'pen-tool',
  'message-square',
  'shield',
  'user-check',
  'trending-up',
  'book-open',
] as const;

// Default voice agent colors
export const DEFAULT_AGENT_COLORS = [
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#F97316', // Orange
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#84CC16', // Lime
] as const;

// Text length constraints (FR-008)
export const TEXT_CONSTRAINTS = {
  MIN_LENGTH: 10,
  MAX_LENGTH: 10000,
} as const;

// Rate limit info (FR-009)
export const RATE_LIMIT = {
  MAX_REQUESTS_PER_HOUR: 30,
  WINDOW_SECONDS: 3600,
} as const;
