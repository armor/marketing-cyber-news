import * as React from 'react';
import { Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PromptInput } from './PromptInput';
import { ContentPreview } from './ContentPreview';
import { BrandScoreBadge } from './BrandScoreBadge';
import { BrandFeedback } from './BrandFeedback';
import { RefinementButtons } from './RefinementButtons';
import { ScheduleDialog } from './ScheduleDialog';
import { VoiceTransformButton } from '@/components/marketing/voice';
import type {
  ContentChannel,
  ContentType,
  GeneratedContent,
  RefinementAction,
  SuggestedPrompt,
} from '@/types/content-studio';
import { toast } from 'sonner';

interface ContentStudioProps {
  onGenerate?: (prompt: string, channel: ContentChannel, type: ContentType) => Promise<GeneratedContent>;
  onRefine?: (content: GeneratedContent, action: RefinementAction) => Promise<GeneratedContent>;
  onSchedule?: (content: GeneratedContent, scheduledTime: string) => Promise<void>;
  suggestedPrompts?: SuggestedPrompt[];
  className?: string;
}

/**
 * ContentStudio - AI-powered content generation interface
 *
 * Features:
 * - Natural language prompt input
 * - Multi-channel support (LinkedIn, Twitter, Email, Blog)
 * - Content type selection
 * - Real-time brand score feedback
 * - One-click refinements
 * - Content scheduling
 *
 * Usage:
 * ```tsx
 * <ContentStudio
 *   onGenerate={handleGenerate}
 *   onRefine={handleRefine}
 *   onSchedule={handleSchedule}
 * />
 * ```
 */
export function ContentStudio({
  onGenerate,
  onRefine,
  onSchedule,
  suggestedPrompts = [],
  className = '',
}: ContentStudioProps) {
  const [prompt, setPrompt] = React.useState('');
  const [selectedChannel, setSelectedChannel] = React.useState<ContentChannel>('linkedin');
  const [selectedType, setSelectedType] = React.useState<ContentType>('post');
  const [generatedContent, setGeneratedContent] = React.useState<GeneratedContent | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isRefining, setIsRefining] = React.useState(false);
  const [isScheduling, setIsScheduling] = React.useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = React.useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim() || !onGenerate) return;

    setIsGenerating(true);
    try {
      const content = await onGenerate(prompt, selectedChannel, selectedType);
      setGeneratedContent(content);
      toast.success('Content generated successfully');
    } catch (error) {
      toast.error('Failed to generate content');
      console.error('Generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async (action: RefinementAction) => {
    if (!generatedContent || !onRefine) return;

    setIsRefining(true);
    try {
      const refined = await onRefine(generatedContent, action);
      setGeneratedContent(refined);
      toast.success('Content refined');
    } catch (error) {
      toast.error('Failed to refine content');
      console.error('Refinement error:', error);
    } finally {
      setIsRefining(false);
    }
  };

  const handleContentChange = (newContent: string) => {
    if (!generatedContent) return;
    setGeneratedContent({
      ...generatedContent,
      content: newContent,
      characterCount: newContent.length,
    });
  };

  const handleApplyFix = (_issueId: string, fix: string) => {
    if (!generatedContent) return;

    // Apply the suggested fix to the content
    const newContent = generatedContent.content + ' ' + fix;
    handleContentChange(newContent);
    toast.success('Fix applied');
  };

  const handleSchedule = async (scheduledTime: string) => {
    if (!generatedContent || !onSchedule) return;

    setIsScheduling(true);
    try {
      await onSchedule(generatedContent, scheduledTime);
      toast.success('Content scheduled');
      setShowScheduleDialog(false);
      // Reset form
      setPrompt('');
      setGeneratedContent(null);
    } catch (error) {
      toast.error('Failed to schedule content');
      console.error('Scheduling error:', error);
    } finally {
      setIsScheduling(false);
    }
  };

  const channelOptions = [
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'twitter', label: 'Twitter' },
    { value: 'email', label: 'Email' },
    { value: 'blog', label: 'Blog' },
  ];

  const typeOptions = [
    { value: 'post', label: 'Post' },
    { value: 'thread', label: 'Thread' },
    { value: 'article', label: 'Article' },
    { value: 'newsletter', label: 'Newsletter' },
  ];

  return (
    <div className={`flex flex-col ${className}`} style={{ gap: 'var(--spacing-6)' }}>
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col" style={{ gap: 'var(--spacing-4)' }}>
            {/* Channel and Type Selectors */}
            <div
              className="grid grid-cols-1 md:grid-cols-2"
              style={{ gap: 'var(--spacing-4)' }}
            >
              <div className="flex flex-col" style={{ gap: 'var(--spacing-2)' }}>
                <label
                  htmlFor="channel-select"
                  style={{
                    fontSize: 'var(--typography-font-size-sm)',
                    fontFamily: 'var(--typography-font-family-sans)',
                    fontWeight: 'var(--typography-font-weight-semibold)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  Channel
                </label>
                <select
                  id="channel-select"
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value as ContentChannel)}
                  disabled={isGenerating}
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-2) var(--spacing-3)',
                    borderRadius: 'var(--border-radius-md)',
                    border: `var(--border-width-thin) solid var(--color-border-default)`,
                    background: 'var(--color-bg-elevated)',
                    fontSize: 'var(--typography-font-size-sm)',
                    fontFamily: 'var(--typography-font-family-sans)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {channelOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col" style={{ gap: 'var(--spacing-2)' }}>
                <label
                  htmlFor="type-select"
                  style={{
                    fontSize: 'var(--typography-font-size-sm)',
                    fontFamily: 'var(--typography-font-family-sans)',
                    fontWeight: 'var(--typography-font-weight-semibold)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  Content Type
                </label>
                <select
                  id="type-select"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as ContentType)}
                  disabled={isGenerating}
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-2) var(--spacing-3)',
                    borderRadius: 'var(--border-radius-md)',
                    border: `var(--border-width-thin) solid var(--color-border-default)`,
                    background: 'var(--color-bg-elevated)',
                    fontSize: 'var(--typography-font-size-sm)',
                    fontFamily: 'var(--typography-font-family-sans)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {typeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Prompt Input */}
            <PromptInput
              value={prompt}
              onChange={setPrompt}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              suggestedPrompts={suggestedPrompts}
            />
          </div>
        </CardContent>
      </Card>

      {/* Generated Content Section */}
      {generatedContent && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Generated Content</CardTitle>
                <div className="flex items-center" style={{ gap: 'var(--spacing-2)' }}>
                  <VoiceTransformButton
                    text={generatedContent.content}
                    onApply={handleContentChange}
                    fieldPath="content"
                    entityType="content_studio"
                    disabled={isGenerating || isRefining}
                  />
                  <BrandScoreBadge score={generatedContent.brandScore.overall} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col" style={{ gap: 'var(--spacing-4)' }}>
                <ContentPreview
                  content={generatedContent.content}
                  channel={generatedContent.channel}
                  onContentChange={handleContentChange}
                />

                <RefinementButtons
                  onRefine={handleRefine}
                  isRefining={isRefining}
                  disabled={isGenerating}
                />
              </div>
            </CardContent>
          </Card>

          {/* Brand Feedback */}
          {generatedContent.brandScore.issues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Brand Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <BrandFeedback
                  issues={generatedContent.brandScore.issues}
                  onApplyFix={handleApplyFix}
                />
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div
            className="flex items-center justify-end"
            style={{ gap: 'var(--spacing-3)' }}
          >
            <Button
              variant="outline"
              onClick={() => {
                setPrompt('');
                setGeneratedContent(null);
              }}
            >
              Start Over
            </Button>
            <Button
              variant="primary"
              onClick={() => setShowScheduleDialog(true)}
              disabled={isScheduling}
            >
              <Calendar
                style={{
                  width: 'var(--spacing-4)',
                  height: 'var(--spacing-4)',
                }}
                aria-hidden="true"
              />
              Schedule
            </Button>
          </div>
        </>
      )}

      {/* Schedule Dialog */}
      {generatedContent && (
        <ScheduleDialog
          open={showScheduleDialog}
          onOpenChange={setShowScheduleDialog}
          channel={generatedContent.channel}
          onSchedule={handleSchedule}
          isScheduling={isScheduling}
        />
      )}
    </div>
  );
}
