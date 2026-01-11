/**
 * VoiceTransformButton Component
 *
 * Reusable button that opens VoiceTransform in a popover.
 * Features:
 * - Magic wand icon button
 * - Popover containing VoiceTransform component
 * - Tooltip with keyboard shortcut
 * - Callback when transformation is applied
 *
 * @example
 * ```tsx
 * <VoiceTransformButton
 *   text={content}
 *   onApply={(transformedText) => setContent(transformedText)}
 * />
 * ```
 */

import * as React from 'react';
import { Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { VoiceTransform } from './VoiceTransform';

interface VoiceTransformButtonProps {
  /**
   * Initial text to transform
   */
  readonly text: string;

  /**
   * Callback when transformation is applied
   * @param transformedText - The selected transformed text
   */
  readonly onApply: (transformedText: string) => void;

  /**
   * Field path for tracking (optional)
   */
  readonly fieldPath?: string;

  /**
   * Entity type for tracking (optional)
   */
  readonly entityType?: string;

  /**
   * Entity ID for tracking (optional)
   */
  readonly entityId?: string;

  /**
   * Whether the button is disabled
   */
  readonly disabled?: boolean;

  /**
   * Additional CSS classes
   */
  readonly className?: string;
}

export function VoiceTransformButton({
  text,
  onApply,
  fieldPath,
  entityType,
  entityId,
  disabled = false,
  className = '',
}: VoiceTransformButtonProps): React.ReactElement {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleApply = (transformedText: string): void => {
    onApply(transformedText);
    setIsOpen(false);
  };

  // Detect Mac vs Windows/Linux for keyboard shortcut display
  const isMac =
    typeof navigator !== 'undefined' &&
    navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const shortcutKey = isMac ? '⌘' : 'Ctrl';

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={disabled}
                className={className}
                aria-label="Transform with Voice Agent"
                style={{
                  padding: 'var(--spacing-2)',
                }}
              >
                <Wand2
                  style={{
                    width: 'var(--spacing-4)',
                    height: 'var(--spacing-4)',
                  }}
                  aria-hidden="true"
                />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Transform with Voice Agent ({shortcutKey}+Shift+T)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent
        align="start"
        style={{
          width: 'min(90vw, var(--spacing-160))',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
      >
        <VoiceTransform
          initialText={text}
          onApply={handleApply}
          fieldPath={fieldPath}
          entityType={entityType}
          entityId={entityId}
        />
      </PopoverContent>
    </Popover>
  );
}
