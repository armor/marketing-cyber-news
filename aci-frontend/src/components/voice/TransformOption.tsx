/**
 * TransformOption Component (T048)
 *
 * Displays a single transformation option with label, preview text, and apply button.
 * Used within TransformPanel and TransformSheet to show conservative/moderate/bold options.
 */

import * as React from 'react';
import { CheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { TransformOption as TransformOptionType, TransformLabel } from '@/types/voice';
import { TRANSFORM_LABEL_DISPLAY, TRANSFORM_LABEL_DESCRIPTIONS } from '@/types/voice';

interface TransformOptionProps {
  /** The transformation option data */
  option: TransformOptionType;
  /** Whether this option is currently selected */
  isSelected: boolean;
  /** Callback when user clicks to select this option */
  onSelect: (index: number) => void;
  /** Callback when user clicks to apply this option */
  onApply: (index: number) => void;
  /** Whether the apply action is in progress */
  isApplying?: boolean;
  /** ARIA label override */
  'aria-label'?: string;
}

/** Badge colors for each transform label */
const LABEL_COLORS: Record<TransformLabel, string> = {
  conservative: 'var(--color-emerald-500)',
  moderate: 'var(--color-amber-400)',
  bold: 'var(--color-rose-500)',
};

export function TransformOption({
  option,
  isSelected,
  onSelect,
  onApply,
  isApplying = false,
  'aria-label': ariaLabel,
}: TransformOptionProps) {
  const labelDisplay = TRANSFORM_LABEL_DISPLAY[option.label];
  const labelDescription = TRANSFORM_LABEL_DESCRIPTIONS[option.label];
  const labelColor = LABEL_COLORS[option.label];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(option.index);
    }
  };

  return (
    <div
      role="option"
      aria-selected={isSelected}
      aria-label={ariaLabel ?? `${labelDisplay} transformation option`}
      tabIndex={0}
      onClick={() => onSelect(option.index)}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative flex flex-col cursor-pointer transition-all',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isSelected && 'ring-2 ring-offset-2'
      )}
      style={{
        padding: 'var(--spacing-4)',
        borderRadius: 'var(--border-radius-md)',
        borderWidth: 'var(--border-width-thin)',
        borderColor: isSelected ? labelColor : 'var(--color-border-default)',
        background: isSelected
          ? 'var(--gradient-component)'
          : 'var(--color-surface-elevated)',
        // @ts-expect-error CSS custom property for ring color
        '--tw-ring-color': labelColor,
      }}
    >
      {/* Header with label badge and selection indicator */}
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--spacing-2)' }}>
        <div className="flex items-center" style={{ gap: 'var(--spacing-2)' }}>
          {/* Label badge */}
          <span
            className="inline-flex items-center font-semibold uppercase"
            style={{
              fontSize: 'var(--typography-font-size-xs)',
              padding: 'var(--spacing-1) var(--spacing-2)',
              borderRadius: 'var(--border-radius-sm)',
              backgroundColor: `${labelColor}20`,
              color: labelColor,
            }}
          >
            {labelDisplay}
          </span>
          {/* Token usage */}
          <span
            style={{
              fontSize: 'var(--typography-font-size-xs)',
              color: 'var(--color-text-tertiary)',
            }}
          >
            {option.tokens_used} tokens
          </span>
        </div>

        {/* Selection indicator */}
        {isSelected && (
          <div
            className="flex items-center justify-center"
            style={{
              width: 'var(--spacing-5)',
              height: 'var(--spacing-5)',
              borderRadius: 'var(--border-radius-full)',
              backgroundColor: labelColor,
            }}
          >
            <CheckIcon className="size-3 text-white" />
          </div>
        )}
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: 'var(--typography-font-size-xs)',
          color: 'var(--color-text-secondary)',
          marginBottom: 'var(--spacing-2)',
        }}
      >
        {labelDescription}
      </p>

      {/* Transformed text preview */}
      <div
        className="flex-1 overflow-hidden"
        style={{
          padding: 'var(--spacing-3)',
          borderRadius: 'var(--border-radius-sm)',
          backgroundColor: 'var(--color-surface-default)',
          marginBottom: 'var(--spacing-3)',
        }}
      >
        <p
          className="line-clamp-4"
          style={{
            fontSize: 'var(--typography-font-size-sm)',
            lineHeight: 'var(--typography-line-height-relaxed)',
            color: 'var(--color-text-primary)',
          }}
        >
          {option.text}
        </p>
      </div>

      {/* Apply button - only shown when selected */}
      {isSelected && (
        <Button
          variant="primary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onApply(option.index);
          }}
          disabled={isApplying}
          className="w-full"
          aria-label={`Apply ${labelDisplay} transformation`}
        >
          {isApplying ? 'Applying...' : 'Apply This Version'}
        </Button>
      )}
    </div>
  );
}

export default TransformOption;
