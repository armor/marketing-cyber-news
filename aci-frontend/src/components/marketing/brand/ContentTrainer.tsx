/**
 * ContentTrainer Component
 *
 * Paste and train interface for adding content examples with quality scores.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useCreateExample } from '@/hooks/useBrandMutations';
import { CheckCircle2 } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface ContentTrainerProps {
  readonly brandVoiceId: string;
}

// ============================================================================
// Component
// ============================================================================

export function ContentTrainer({ brandVoiceId }: ContentTrainerProps) {
  const [content, setContent] = useState('');
  const [qualityScore, setQualityScore] = useState(7);
  const [source, setSource] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const createMutation = useCreateExample();

  const handleTrain = async () => {
    if (!content.trim()) {
      return;
    }

    await createMutation.mutateAsync({
      brandVoiceId,
      request: {
        content: content.trim(),
        quality_score: qualityScore,
        source: source.trim() || undefined,
      },
    });

    // Show success feedback
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);

    // Reset form
    setContent('');
    setSource('');
    setQualityScore(7);
  };

  const isValid = content.trim().length > 0;
  const characterCount = content.length;
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Train with Content</CardTitle>
        <CardDescription>
          Paste high-quality content that represents your brand voice
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-5)' }}>
          {/* Content Textarea */}
          <div>
            <Label htmlFor="content">Content Example</Label>
            <Textarea
              id="content"
              placeholder="Paste your content here... (newsletter excerpt, social post, blog paragraph, etc.)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{
                minHeight: '200px',
                fontFamily: 'var(--typography-font-family-body)',
              }}
            />
            <div
              style={{
                marginTop: 'var(--spacing-2)',
                fontSize: 'var(--typography-font-size-xs)',
                color: 'var(--color-text-secondary)',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>{wordCount} words</span>
              <span>{characterCount} characters</span>
            </div>
          </div>

          {/* Quality Score Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-2)' }}>
              <Label htmlFor="quality-score">
                Quality Score: How representative is this of your brand?
              </Label>
              <span
                style={{
                  fontSize: 'var(--typography-font-size-2xl)',
                  fontWeight: 'var(--typography-font-weight-bold)',
                  color: 'var(--color-brand-primary)',
                }}
              >
                {qualityScore}/10
              </span>
            </div>
            <input
              id="quality-score"
              type="range"
              min="1"
              max="10"
              step="1"
              value={qualityScore}
              onChange={(e) => setQualityScore(Number(e.target.value))}
              style={{
                width: '100%',
                height: 'var(--spacing-2)',
                borderRadius: 'var(--border-radius-full)',
                outline: 'none',
                appearance: 'none',
                background: `linear-gradient(to right,
                  var(--color-brand-primary) 0%,
                  var(--color-brand-primary) ${(qualityScore - 1) * 11.11}%,
                  var(--color-border-default) ${(qualityScore - 1) * 11.11}%,
                  var(--color-border-default) 100%)`,
                cursor: 'pointer',
              }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 'var(--spacing-2)',
                fontSize: 'var(--typography-font-size-xs)',
                color: 'var(--color-text-muted)',
              }}
            >
              <span>Weak Example</span>
              <span>Perfect Example</span>
            </div>
          </div>

          {/* Source (Optional) */}
          <div>
            <Label htmlFor="source">Source (Optional)</Label>
            <input
              id="source"
              type="text"
              placeholder="e.g., Newsletter 2024-01, Homepage Hero, etc."
              value={source}
              onChange={(e) => setSource(e.target.value)}
              style={{
                width: '100%',
                height: 'var(--spacing-10)',
                padding: '0 var(--spacing-4)',
                borderRadius: 'var(--border-radius-lg)',
                border: `var(--border-width-thin) solid var(--color-border-default)`,
                backgroundColor: 'var(--color-bg-elevated)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--typography-font-size-sm)',
                fontFamily: 'var(--typography-font-family-sans)',
                outline: 'none',
                transition: 'border-color var(--motion-duration-fast) var(--motion-easing-default)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--color-brand-primary)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--color-border-default)';
              }}
            />
          </div>

          {/* Train Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
            <Button
              onClick={handleTrain}
              disabled={!isValid || createMutation.isPending}
              variant="primary"
              size="lg"
              style={{ flex: 1 }}
            >
              {createMutation.isPending ? 'Training...' : 'Train Brand Voice'}
            </Button>

            {/* Success Feedback */}
            {showSuccess && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-2)',
                  color: 'var(--color-semantic-success)',
                  fontSize: 'var(--typography-font-size-sm)',
                  fontWeight: 'var(--typography-font-weight-medium)',
                }}
              >
                <CheckCircle2 size={20} />
                <span>Trained!</span>
              </div>
            )}
          </div>

          {/* Help Text */}
          <div
            style={{
              padding: 'var(--spacing-4)',
              backgroundColor: 'var(--color-bg-secondary)',
              borderRadius: 'var(--border-radius-lg)',
              borderLeft: `var(--border-width-thick) solid var(--color-brand-primary)`,
            }}
          >
            <div
              style={{
                fontSize: 'var(--typography-font-size-sm)',
                fontWeight: 'var(--typography-font-weight-semibold)',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--spacing-2)',
              }}
            >
              Tips for better training
            </div>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-1)',
              }}
            >
              <li
                style={{
                  fontSize: 'var(--typography-font-size-sm)',
                  color: 'var(--color-text-secondary)',
                  paddingLeft: 'var(--spacing-5)',
                  position: 'relative',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    color: 'var(--color-brand-primary)',
                  }}
                >
                  •
                </span>
                Use complete paragraphs or sections (50-500 words ideal)
              </li>
              <li
                style={{
                  fontSize: 'var(--typography-font-size-sm)',
                  color: 'var(--color-text-secondary)',
                  paddingLeft: 'var(--spacing-5)',
                  position: 'relative',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    color: 'var(--color-brand-primary)',
                  }}
                >
                  •
                </span>
                Higher scores (8-10) for content that perfectly captures your voice
              </li>
              <li
                style={{
                  fontSize: 'var(--typography-font-size-sm)',
                  color: 'var(--color-text-secondary)',
                  paddingLeft: 'var(--spacing-5)',
                  position: 'relative',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    color: 'var(--color-brand-primary)',
                  }}
                >
                  •
                </span>
                Include diverse examples: technical, conversational, educational
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
