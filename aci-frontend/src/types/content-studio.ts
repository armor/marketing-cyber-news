/**
 * Content Studio Type Definitions
 * AI-powered content generation for marketing automation
 */

export type ContentChannel = 'linkedin' | 'twitter' | 'email' | 'blog';

export type ContentType = 'post' | 'thread' | 'article' | 'newsletter';

export interface BrandIssue {
  id: string;
  type: 'tone' | 'voice' | 'terminology' | 'style' | 'compliance';
  severity: 'high' | 'medium' | 'low';
  message: string;
  suggestedFix?: string;
  location?: {
    start: number;
    end: number;
  };
}

export interface BrandScore {
  overall: number; // 0-100
  tone: number;
  voice: number;
  terminology: number;
  style: number;
  issues: BrandIssue[];
}

export interface GeneratedContent {
  id: string;
  content: string;
  channel: ContentChannel;
  contentType: ContentType;
  brandScore: BrandScore;
  characterCount: number;
  createdAt: string;
  scheduledFor?: string;
  status: 'draft' | 'scheduled' | 'published';
}

export interface SuggestedPrompt {
  id: string;
  text: string;
  category: 'product' | 'thought-leadership' | 'engagement' | 'announcement';
  channels: ContentChannel[];
}

export type RefinementAction =
  | 'make_shorter'
  | 'make_longer'
  | 'more_formal'
  | 'more_casual'
  | 'add_cta'
  | 'remove_cta';
