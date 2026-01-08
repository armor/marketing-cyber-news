import * as React from 'react';
import { Sparkles, ChevronDown } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { SuggestedPrompt } from '@/types/content-studio';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
  isGenerating?: boolean;
  maxCharacters?: number;
  suggestedPrompts?: SuggestedPrompt[];
  className?: string;
}

/**
 * PromptInput - Natural language prompt input for AI content generation
 *
 * Features:
 * - Large textarea with character counter
 * - Suggested prompts dropdown
 * - Visual feedback during generation
 * - Accessible keyboard navigation
 */
export function PromptInput({
  value,
  onChange,
  onGenerate,
  isGenerating = false,
  maxCharacters = 500,
  suggestedPrompts = [],
  className = '',
}: PromptInputProps) {
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  const characterCount = value.length;
  const isOverLimit = characterCount > maxCharacters;
  const canGenerate = value.trim().length > 0 && !isOverLimit && !isGenerating;

  const handlePromptSelect = (prompt: SuggestedPrompt) => {
    onChange(prompt.text);
    setIsPopoverOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd/Ctrl + Enter to generate
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canGenerate) {
      e.preventDefault();
      onGenerate();
    }
  };

  return (
    <div className={`flex flex-col ${className}`} style={{ gap: 'var(--spacing-3)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <label
          htmlFor="content-prompt"
          style={{
            fontSize: 'var(--typography-font-size-sm)',
            fontFamily: 'var(--typography-font-family-sans)',
            fontWeight: 'var(--typography-font-weight-semibold)',
            color: 'var(--color-text-primary)',
          }}
        >
          Describe your content
        </label>

        {suggestedPrompts.length > 0 && (
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Show suggested prompts"
                aria-expanded={isPopoverOpen}
              >
                <Sparkles
                  style={{
                    width: 'var(--spacing-4)',
                    height: 'var(--spacing-4)',
                  }}
                />
                Suggestions
                <ChevronDown
                  style={{
                    width: 'var(--spacing-3)',
                    height: 'var(--spacing-3)',
                  }}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              style={{
                width: '20rem',
                padding: 'var(--spacing-2)',
              }}
            >
              <div
                className="flex flex-col"
                style={{ gap: 'var(--spacing-1)' }}
                role="menu"
                aria-label="Suggested prompts"
              >
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt.id}
                    onClick={() => handlePromptSelect(prompt)}
                    className="text-left rounded-md hover:bg-accent transition-colors"
                    style={{
                      padding: 'var(--spacing-2)',
                      fontSize: 'var(--typography-font-size-sm)',
                      fontFamily: 'var(--typography-font-family-sans)',
                      color: 'var(--color-text-primary)',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                    }}
                    role="menuitem"
                  >
                    <div
                      style={{
                        fontSize: 'var(--typography-font-size-xs)',
                        fontWeight: 'var(--typography-font-weight-medium)',
                        color: 'var(--color-text-muted)',
                        marginBottom: 'var(--spacing-1)',
                        textTransform: 'capitalize',
                      }}
                    >
                      {prompt.category}
                    </div>
                    {prompt.text}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Textarea */}
      <Textarea
        id="content-prompt"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Example: Write a LinkedIn post about our new cybersecurity feature that helps detect zero-day vulnerabilities in real-time"
        disabled={isGenerating}
        aria-describedby="prompt-hint prompt-counter"
        aria-invalid={isOverLimit}
        style={{
          minHeight: '8rem',
          fontSize: 'var(--typography-font-size-base)',
          resize: 'vertical',
        }}
      />

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span
          id="prompt-hint"
          style={{
            fontSize: 'var(--typography-font-size-xs)',
            fontFamily: 'var(--typography-font-family-sans)',
            color: 'var(--color-text-muted)',
          }}
        >
          Press {navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'} + Enter to
          generate
        </span>

        <span
          id="prompt-counter"
          style={{
            fontSize: 'var(--typography-font-size-xs)',
            fontFamily: 'var(--typography-font-family-mono)',
            color: isOverLimit
              ? 'var(--color-semantic-error)'
              : 'var(--color-text-muted)',
            fontWeight: isOverLimit
              ? 'var(--typography-font-weight-semibold)'
              : 'var(--typography-font-weight-normal)',
          }}
          aria-live="polite"
          role="status"
        >
          {characterCount} / {maxCharacters}
        </span>
      </div>

      {/* Generate Button */}
      <Button
        onClick={onGenerate}
        disabled={!canGenerate}
        variant="primary"
        size="lg"
        aria-label={isGenerating ? 'Generating content' : 'Generate content'}
        aria-busy={isGenerating}
      >
        {isGenerating ? (
          <>
            <div
              className="animate-spin rounded-full border-2 border-current border-t-transparent"
              style={{
                width: 'var(--spacing-4)',
                height: 'var(--spacing-4)',
              }}
              aria-hidden="true"
            />
            Generating...
          </>
        ) : (
          <>
            <Sparkles
              style={{
                width: 'var(--spacing-4)',
                height: 'var(--spacing-4)',
              }}
              aria-hidden="true"
            />
            Generate Content
          </>
        )}
      </Button>
    </div>
  );
}
