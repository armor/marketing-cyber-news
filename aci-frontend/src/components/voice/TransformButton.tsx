/**
 * TransformButton Component (T052)
 *
 * Magic wand button that triggers the voice transformation panel/sheet.
 * Handles responsive behavior (popover on desktop, sheet on mobile).
 */

import * as React from 'react';
import { Wand2Icon, Loader2Icon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TransformPanel } from './TransformPanel';
import { TransformSheet } from './TransformSheet';
import { useVoiceAgents, useTransformText, useSelectTransformation } from '@/hooks/useVoice';
import type { TransformOption } from '@/types/voice';
import { TEXT_CONSTRAINTS } from '@/types/voice';

interface TransformButtonProps {
  /** The text to transform */
  text: string;
  /** Callback when transformation is applied */
  onTransformApply: (newText: string) => void;
  /** Optional callback when transform panel opens */
  onOpen?: () => void;
  /** Optional callback when transform panel closes */
  onClose?: () => void;
  /** Optional field path for audit tracking */
  fieldPath?: string;
  /** Optional entity type for audit tracking */
  entityType?: string;
  /** Optional entity ID for audit tracking */
  entityId?: string;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** ARIA label */
  'aria-label'?: string;
}

/** Breakpoint for mobile detection (in pixels) */
const MOBILE_BREAKPOINT = 768;

/** Hook for mobile detection */
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

export function TransformButton({
  text,
  onTransformApply,
  onOpen,
  onClose,
  fieldPath,
  entityType,
  entityId,
  disabled = false,
  className,
  'aria-label': ariaLabel = 'Transform text with AI voice',
}: TransformButtonProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedAgentId, setSelectedAgentId] = React.useState<string | null>(null);
  const [selectedOptionIndex, setSelectedOptionIndex] = React.useState<number | null>(null);
  const [transformOptions, setTransformOptions] = React.useState<TransformOption[] | null>(null);
  const [transformRequestId, setTransformRequestId] = React.useState<string | null>(null);
  const [originalText, setOriginalText] = React.useState<string>(text);

  // Hooks for API calls
  const { data: agents = [], isLoading: isLoadingAgents } = useVoiceAgents();
  const transformMutation = useTransformText();
  const selectMutation = useSelectTransformation();

  // Reset state when text changes externally
  React.useEffect(() => {
    if (!isOpen) {
      setOriginalText(text);
    }
  }, [text, isOpen]);

  // Set default agent when agents load
  React.useEffect(() => {
    if (agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setOriginalText(text);
      setTransformOptions(null);
      setSelectedOptionIndex(null);
      setTransformRequestId(null);
      onOpen?.();
    } else {
      onClose?.();
    }
  };

  const handleTransform = async () => {
    if (!selectedAgentId) return;

    try {
      const response = await transformMutation.mutateAsync({
        agentId: selectedAgentId,
        request: {
          text: originalText,
          field_path: fieldPath,
          entity_type: entityType,
          entity_id: entityId,
        },
      });

      setTransformOptions(response.options);
      setTransformRequestId(response.request_id);
      setSelectedOptionIndex(null);
    } catch {
      // Error is handled by mutation onError
    }
  };

  const handleOptionSelect = (index: number) => {
    setSelectedOptionIndex(index);
  };

  const handleApply = async (index: number) => {
    if (!transformRequestId || !transformOptions) return;

    const selectedOption = transformOptions.find((opt) => opt.index === index);
    if (!selectedOption) return;

    try {
      await selectMutation.mutateAsync({
        request_id: transformRequestId,
        transformation_index: index,
        field_path: fieldPath,
        entity_type: entityType,
        entity_id: entityId,
      });

      onTransformApply(selectedOption.text);
      handleOpenChange(false);
    } catch {
      // Error is handled by mutation onError
    }
  };

  const handleRestoreOriginal = () => {
    onTransformApply(originalText);
    setTransformOptions(null);
    setSelectedOptionIndex(null);
    setTransformRequestId(null);
  };

  // Validation
  const textLength = text.length;
  const isTextValid = textLength >= TEXT_CONSTRAINTS.MIN_LENGTH && textLength <= TEXT_CONSTRAINTS.MAX_LENGTH;
  const isButtonDisabled = disabled || !isTextValid;

  // Tooltip message
  const tooltipMessage = !isTextValid
    ? textLength < TEXT_CONSTRAINTS.MIN_LENGTH
      ? `Add at least ${TEXT_CONSTRAINTS.MIN_LENGTH - textLength} more characters`
      : `Text is ${textLength - TEXT_CONSTRAINTS.MAX_LENGTH} characters over limit`
    : 'Transform with AI voice';

  // Shared props for panel/sheet
  const transformerProps = {
    open: isOpen,
    onOpenChange: handleOpenChange,
    originalText,
    agents,
    isLoadingAgents,
    selectedAgentId,
    onAgentSelect: setSelectedAgentId,
    options: transformOptions,
    isTransforming: transformMutation.isPending,
    transformError: transformMutation.error?.message ?? null,
    selectedOptionIndex,
    onOptionSelect: handleOptionSelect,
    onApply: handleApply,
    isApplying: selectMutation.isPending,
    onRestoreOriginal: handleRestoreOriginal,
    onTransform: handleTransform,
  };

  // Button element
  const buttonElement = (
    <Button
      variant="ghost"
      size="icon"
      disabled={isButtonDisabled}
      className={cn('size-8', className)}
      aria-label={ariaLabel}
      aria-expanded={isOpen}
      aria-haspopup="dialog"
    >
      {transformMutation.isPending ? (
        <Loader2Icon className="size-4 animate-spin" />
      ) : (
        <Wand2Icon
          className="size-4"
          style={{
            color: isTextValid ? 'var(--color-amber-400)' : 'var(--color-text-tertiary)',
          }}
        />
      )}
    </Button>
  );

  // Wrap in tooltip
  const buttonWithTooltip = (
    <Tooltip>
      <TooltipTrigger asChild>{buttonElement}</TooltipTrigger>
      <TooltipContent side="top">
        <p>{tooltipMessage}</p>
      </TooltipContent>
    </Tooltip>
  );

  // Render based on device type
  if (isMobile) {
    return (
      <>
        <button
          type="button"
          onClick={() => !isButtonDisabled && handleOpenChange(true)}
          disabled={isButtonDisabled}
          className={cn('inline-flex', className)}
          aria-label={ariaLabel}
        >
          {buttonWithTooltip}
        </button>
        <TransformSheet {...transformerProps} />
      </>
    );
  }

  return (
    <TransformPanel {...transformerProps}>
      {buttonWithTooltip}
    </TransformPanel>
  );
}

export default TransformButton;
