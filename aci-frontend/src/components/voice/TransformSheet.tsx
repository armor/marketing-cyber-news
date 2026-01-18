/**
 * TransformSheet Component (T051)
 *
 * Mobile sheet (slide-up) for voice transformation.
 * Alternative to TransformPanel for smaller screens.
 */

import { Wand2Icon, RotateCcwIcon, Loader2Icon } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { AgentSelector } from './AgentSelector';
import { TransformOption } from './TransformOption';
import type { VoiceAgent, TransformOption as TransformOptionType } from '@/types/voice';
import { TEXT_CONSTRAINTS } from '@/types/voice';

interface TransformSheetProps {
  /** Whether the sheet is open */
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
}

export function TransformSheet({
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
}: TransformSheetProps) {
  const textLength = originalText.length;
  const isTextValid = textLength >= TEXT_CONSTRAINTS.MIN_LENGTH && textLength <= TEXT_CONSTRAINTS.MAX_LENGTH;
  const canTransform = isTextValid && selectedAgentId && !isTransforming;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        style={{
          maxHeight: '85vh',
          borderTopLeftRadius: 'var(--border-radius-lg)',
          borderTopRightRadius: 'var(--border-radius-lg)',
        }}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center" style={{ gap: 'var(--spacing-2)' }}>
            <Wand2Icon className="size-5" style={{ color: 'var(--color-amber-400)' }} />
            Transform Text
          </SheetTitle>
          <SheetDescription>
            Select a voice agent and generate transformation options
          </SheetDescription>
        </SheetHeader>

        <div
          className="flex-1 overflow-y-auto"
          style={{
            padding: 'var(--spacing-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-4)',
          }}
        >
          {/* Text validation warning */}
          {!isTextValid && (
            <div
              role="alert"
              style={{
                padding: 'var(--spacing-3)',
                borderRadius: 'var(--border-radius-md)',
                backgroundColor: 'var(--color-rose-500-alpha-10)',
              }}
            >
              <p
                style={{
                  fontSize: 'var(--typography-font-size-sm)',
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
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 'var(--typography-font-size-sm)',
                fontWeight: 'var(--typography-font-weight-medium)',
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--spacing-2)',
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
                className="size-10 animate-spin"
                style={{ color: 'var(--color-amber-400)' }}
              />
              <p
                style={{
                  fontSize: 'var(--typography-font-size-base)',
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
                padding: 'var(--spacing-4)',
                borderRadius: 'var(--border-radius-md)',
                backgroundColor: 'var(--color-rose-500-alpha-10)',
              }}
            >
              <p
                style={{
                  fontSize: 'var(--typography-font-size-sm)',
                  color: 'var(--color-rose-500)',
                  marginBottom: 'var(--spacing-3)',
                }}
              >
                {transformError}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={onTransform}
                disabled={!canTransform}
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Transformation options */}
          {options && !isTransforming && (
            <div
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
        </div>

        {/* Footer with restore button */}
        {options && (
          <SheetFooter>
            <Button
              variant="ghost"
              onClick={onRestoreOriginal}
              className="w-full"
            >
              <RotateCcwIcon className="size-4" />
              Restore Original
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default TransformSheet;
