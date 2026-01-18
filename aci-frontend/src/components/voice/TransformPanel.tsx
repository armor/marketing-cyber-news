/**
 * TransformPanel Component (T050)
 *
 * Desktop popover panel for voice transformation.
 * Shows agent selector, transformation options, and controls.
 */

import * as React from 'react';
import { Wand2Icon, RotateCcwIcon, XIcon, Loader2Icon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { AgentSelector } from './AgentSelector';
import { TransformOption } from './TransformOption';
import type { VoiceAgent, TransformOption as TransformOptionType } from '@/types/voice';
import { TEXT_CONSTRAINTS } from '@/types/voice';

interface TransformPanelProps {
  /** Whether the panel is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** The original text to transform */
  originalText: string;
  /** List of available voice agents */
  agents: VoiceAgent[];
  /** Whether agents are loading */
  isLoadingAgents: boolean;
  /** Currently selected agent ID */
  selectedAgentId: string | null;
  /** Callback when agent is selected */
  onAgentSelect: (agentId: string) => void;
  /** Transformation options (null if not yet requested) */
  options: TransformOptionType[] | null;
  /** Whether transformation is in progress */
  isTransforming: boolean;
  /** Transformation error message */
  transformError: string | null;
  /** Currently selected option index */
  selectedOptionIndex: number | null;
  /** Callback when option is selected */
  onOptionSelect: (index: number) => void;
  /** Callback when option is applied */
  onApply: (index: number) => void;
  /** Whether apply is in progress */
  isApplying: boolean;
  /** Callback to restore original text */
  onRestoreOriginal: () => void;
  /** Callback to trigger transformation */
  onTransform: () => void;
  /** The trigger element (usually TransformButton) */
  children: React.ReactNode;
}

export function TransformPanel({
  open,
  onOpenChange,
  originalText,
  agents,
  isLoadingAgents,
  selectedAgentId,
  onAgentSelect,
  options,
  isTransforming,
  transformError,
  selectedOptionIndex,
  onOptionSelect,
  onApply,
  isApplying,
  onRestoreOriginal,
  onTransform,
  children,
}: TransformPanelProps) {
  const textLength = originalText.length;
  const isTextValid = textLength >= TEXT_CONSTRAINTS.MIN_LENGTH && textLength <= TEXT_CONSTRAINTS.MAX_LENGTH;
  const canTransform = isTextValid && selectedAgentId && !isTransforming;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        style={{
          width: 'var(--spacing-128)',
          maxWidth: 'calc(100vw - var(--spacing-8))',
          maxHeight: 'calc(100vh - var(--spacing-16))',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        aria-label="Voice transformation panel"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between flex-shrink-0"
          style={{
            paddingBottom: 'var(--spacing-3)',
            borderBottomWidth: 'var(--border-width-thin)',
            borderBottomColor: 'var(--color-border-subtle)',
            marginBottom: 'var(--spacing-3)',
          }}
        >
          <div className="flex items-center" style={{ gap: 'var(--spacing-2)' }}>
            <Wand2Icon className="size-4" style={{ color: 'var(--color-amber-400)' }} />
            <h3
              className="font-semibold"
              style={{
                fontSize: 'var(--typography-font-size-base)',
                color: 'var(--color-text-primary)',
              }}
            >
              Transform Text
            </h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label="Close panel"
            className="size-7"
          >
            <XIcon className="size-4" />
          </Button>
        </div>

        {/* Text validation warning */}
        {!isTextValid && (
          <div
            role="alert"
            style={{
              padding: 'var(--spacing-2) var(--spacing-3)',
              borderRadius: 'var(--border-radius-sm)',
              backgroundColor: 'var(--color-rose-500-alpha-10)',
              marginBottom: 'var(--spacing-3)',
            }}
          >
            <p
              style={{
                fontSize: 'var(--typography-font-size-xs)',
                color: 'var(--color-rose-500)',
              }}
            >
              {textLength < TEXT_CONSTRAINTS.MIN_LENGTH
                ? `Text must be at least ${TEXT_CONSTRAINTS.MIN_LENGTH} characters (currently ${textLength})`
                : `Text must be at most ${TEXT_CONSTRAINTS.MAX_LENGTH} characters (currently ${textLength})`}
            </p>
          </div>
        )}

        {/* Agent selector */}
        <div style={{ marginBottom: 'var(--spacing-3)' }}>
          <label
            style={{
              display: 'block',
              fontSize: 'var(--typography-font-size-xs)',
              fontWeight: 'var(--typography-font-weight-medium)',
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--spacing-1)',
            }}
          >
            Voice Agent
          </label>
          <AgentSelector
            agents={agents}
            selectedAgentId={selectedAgentId}
            onSelect={onAgentSelect}
            isLoading={isLoadingAgents}
            disabled={isTransforming}
          />
        </div>

        {/* Transform button */}
        {!options && !isTransforming && (
          <Button
            variant="primary"
            onClick={onTransform}
            disabled={!canTransform}
            className="w-full"
            style={{ marginBottom: 'var(--spacing-3)' }}
          >
            <Wand2Icon className="size-4" />
            Generate Transformations
          </Button>
        )}

        {/* Loading state */}
        {isTransforming && (
          <div
            className="flex flex-col items-center justify-center"
            style={{
              padding: 'var(--spacing-8)',
              gap: 'var(--spacing-3)',
            }}
          >
            <Loader2Icon
              className="size-8 animate-spin"
              style={{ color: 'var(--color-amber-400)' }}
            />
            <p
              style={{
                fontSize: 'var(--typography-font-size-sm)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Generating transformation options...
            </p>
          </div>
        )}

        {/* Error state */}
        {transformError && (
          <div
            role="alert"
            style={{
              padding: 'var(--spacing-3)',
              borderRadius: 'var(--border-radius-md)',
              backgroundColor: 'var(--color-rose-500-alpha-10)',
              marginBottom: 'var(--spacing-3)',
            }}
          >
            <p
              style={{
                fontSize: 'var(--typography-font-size-sm)',
                color: 'var(--color-rose-500)',
              }}
            >
              {transformError}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={onTransform}
              disabled={!canTransform}
              style={{ marginTop: 'var(--spacing-2)' }}
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Transformation options */}
        {options && !isTransforming && (
          <div
            className="flex-1 overflow-y-auto"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-3)',
            }}
            role="listbox"
            aria-label="Transformation options"
          >
            {options.map((option) => (
              <TransformOption
                key={option.index}
                option={option}
                isSelected={selectedOptionIndex === option.index}
                onSelect={onOptionSelect}
                onApply={onApply}
                isApplying={isApplying && selectedOptionIndex === option.index}
              />
            ))}
          </div>
        )}

        {/* Footer with restore button */}
        {options && (
          <div
            className="flex-shrink-0"
            style={{
              paddingTop: 'var(--spacing-3)',
              borderTopWidth: 'var(--border-width-thin)',
              borderTopColor: 'var(--color-border-subtle)',
              marginTop: 'var(--spacing-3)',
            }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={onRestoreOriginal}
              className="w-full"
            >
              <RotateCcwIcon className="size-4" />
              Restore Original
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default TransformPanel;
