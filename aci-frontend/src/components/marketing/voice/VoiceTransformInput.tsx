/**
 * VoiceTransformInput Component
 *
 * Text input for voice transformation.
 * Validates text length (10-10,000 characters).
 * Shows character count and validation state.
 */

import * as React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Wand2, AlertCircle } from 'lucide-react';
import { TEXT_CONSTRAINTS } from '@/types/voice';

interface VoiceTransformInputProps {
  value: string;
  onChange: (value: string) => void;
  onTransform: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function VoiceTransformInput({
  value,
  onChange,
  onTransform,
  isLoading = false,
  disabled = false,
  placeholder = 'Enter text to transform (10-10,000 characters)...',
  className = '',
}: VoiceTransformInputProps) {
  const charCount = value.length;
  const isValid =
    charCount >= TEXT_CONSTRAINTS.MIN_LENGTH &&
    charCount <= TEXT_CONSTRAINTS.MAX_LENGTH;
  const isTooShort = charCount > 0 && charCount < TEXT_CONSTRAINTS.MIN_LENGTH;
  const isTooLong = charCount > TEXT_CONSTRAINTS.MAX_LENGTH;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow Cmd+Enter or Ctrl+Enter to submit
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && isValid && !disabled && !isLoading) {
      e.preventDefault();
      onTransform();
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <Label htmlFor="voice-input">Text to Transform</Label>
        <div className="flex items-center gap-2">
          {(isTooShort || isTooLong) && (
            <div className="flex items-center gap-1 text-destructive text-xs">
              <AlertCircle className="h-3 w-3" />
              <span>
                {isTooShort && `At least ${TEXT_CONSTRAINTS.MIN_LENGTH} characters required`}
                {isTooLong && `Maximum ${TEXT_CONSTRAINTS.MAX_LENGTH} characters`}
              </span>
            </div>
          )}
          <span
            className={`text-xs ${
              isTooShort || isTooLong
                ? 'text-destructive font-medium'
                : charCount === 0
                ? 'text-muted-foreground'
                : 'text-muted-foreground'
            }`}
          >
            {charCount.toLocaleString()} / {TEXT_CONSTRAINTS.MAX_LENGTH.toLocaleString()}
          </span>
        </div>
      </div>

      <Textarea
        id="voice-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        className={`min-h-[120px] resize-y ${
          isTooShort || isTooLong ? 'border-destructive focus-visible:ring-destructive' : ''
        }`}
      />

      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-muted-foreground">
          Press{' '}
          <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">
            {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter
          </kbd>{' '}
          to transform
        </p>
        <Button
          onClick={onTransform}
          disabled={!isValid || disabled || isLoading}
          size="sm"
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Transforming...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4 mr-2" />
              Transform Text
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
