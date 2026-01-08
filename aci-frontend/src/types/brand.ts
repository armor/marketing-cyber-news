/**
 * Brand Voice Training System Types
 */

// ============================================
// ENUMS
// ============================================

export type AssetType = 'pdf' | 'docx' | 'txt';
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

// ============================================
// BRAND INTERFACES
// ============================================

/**
 * Brand voice configuration and health metrics
 */
export interface BrandVoice {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly health_score: number; // 0-100
  readonly total_examples: number;
  readonly total_documents: number;
  readonly approved_terms: readonly string[];
  readonly banned_terms: readonly BannedTerm[];
  readonly strictness_level: number; // 0-100
  readonly auto_correct_enabled: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}

/**
 * Banned term with optional replacement
 */
export interface BannedTerm {
  readonly term: string;
  readonly replacement?: string;
  readonly reason?: string;
}

/**
 * Brand health breakdown by category
 */
export interface BrandHealthBreakdown {
  readonly examples_score: number;
  readonly guidelines_score: number;
  readonly terminology_score: number;
  readonly recommendations: readonly string[];
}

/**
 * Uploaded brand asset/document
 */
export interface BrandAsset {
  readonly id: string;
  readonly brand_voice_id: string;
  readonly filename: string;
  readonly file_type: AssetType;
  readonly file_size: number;
  readonly upload_url?: string;
  readonly processing_status: ProcessingStatus;
  readonly processing_error?: string;
  readonly extracted_text_length?: number;
  readonly uploaded_at: string;
  readonly processed_at?: string;
}

/**
 * Content training example with quality score
 */
export interface ContentExample {
  readonly id: string;
  readonly brand_voice_id: string;
  readonly content: string;
  readonly quality_score: number; // 1-10, how representative
  readonly source?: string;
  readonly created_by: string;
  readonly created_at: string;
}

/**
 * Brand voice guideline/rule
 */
export interface BrandGuideline {
  readonly id: string;
  readonly brand_voice_id: string;
  readonly category: string; // 'tone', 'style', 'formatting', etc.
  readonly title: string;
  readonly description: string;
  readonly examples?: readonly string[];
  readonly priority: number; // 1-10
  readonly created_at: string;
}

// ============================================
// REQUEST/RESPONSE TYPES
// ============================================

export interface CreateBrandVoiceRequest {
  readonly name: string;
  readonly description?: string;
}

export interface UpdateBrandVoiceRequest {
  readonly name?: string;
  readonly description?: string;
  readonly strictness_level?: number;
  readonly auto_correct_enabled?: boolean;
}

export interface UploadAssetRequest {
  readonly file: File;
  readonly brand_voice_id: string;
}

export interface UploadAssetResponse {
  readonly asset_id: string;
  readonly upload_url: string;
  readonly message: string;
}

export interface CreateExampleRequest {
  readonly content: string;
  readonly quality_score: number;
  readonly source?: string;
}

export interface AddTerminologyRequest {
  readonly approved_terms?: readonly string[];
  readonly banned_terms?: readonly BannedTerm[];
}

export interface ValidateContentRequest {
  readonly content: string;
  readonly auto_correct?: boolean;
}

export interface ValidateContentResponse {
  readonly is_valid: boolean;
  readonly violations: readonly TermViolation[];
  readonly corrected_content?: string;
  readonly confidence_score: number;
}

export interface TermViolation {
  readonly term: string;
  readonly position: number;
  readonly suggestion?: string;
  readonly severity: 'error' | 'warning';
}

// ============================================
// TYPE GUARDS
// ============================================

export function isAssetType(type: string): type is AssetType {
  return ['pdf', 'docx', 'txt'].includes(type);
}

export function isProcessingStatus(status: string): status is ProcessingStatus {
  return ['pending', 'processing', 'completed', 'failed'].includes(status);
}
