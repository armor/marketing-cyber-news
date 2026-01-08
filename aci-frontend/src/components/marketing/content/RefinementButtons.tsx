import * as React from 'react';
import {
  Minimize2,
  Maximize2,
  Briefcase,
  SmilePlus,
  MessageSquarePlus,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RefinementAction } from '@/types/content-studio';

interface RefinementButtonsProps {
  onRefine: (action: RefinementAction) => void;
  isRefining?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * RefinementButtons - Quick action buttons for content refinement
 *
 * Actions:
 * - Make shorter: Reduce word count
 * - Make longer: Expand content
 * - More formal: Professional tone
 * - More casual: Conversational tone
 * - Add CTA: Insert call-to-action
 * - Remove CTA: Remove call-to-action
 *
 * Features:
 * - Visual feedback during refinement
 * - Accessible keyboard navigation
 * - Icon + text labels
 */
export function RefinementButtons({
  onRefine,
  isRefining = false,
  disabled = false,
  className = '',
}: RefinementButtonsProps) {
  const [activeAction, setActiveAction] = React.useState<RefinementAction | null>(
    null
  );

  const handleRefine = (action: RefinementAction) => {
    setActiveAction(action);
    onRefine(action);
    setTimeout(() => setActiveAction(null), 2000);
  };

  const refinementActions = [
    {
      action: 'make_shorter' as RefinementAction,
      label: 'Shorter',
      Icon: Minimize2,
      description: 'Reduce word count',
    },
    {
      action: 'make_longer' as RefinementAction,
      label: 'Longer',
      Icon: Maximize2,
      description: 'Expand content',
    },
    {
      action: 'more_formal' as RefinementAction,
      label: 'Formal',
      Icon: Briefcase,
      description: 'Professional tone',
    },
    {
      action: 'more_casual' as RefinementAction,
      label: 'Casual',
      Icon: SmilePlus,
      description: 'Conversational tone',
    },
    {
      action: 'add_cta' as RefinementAction,
      label: 'Add CTA',
      Icon: MessageSquarePlus,
      description: 'Insert call-to-action',
    },
    {
      action: 'remove_cta' as RefinementAction,
      label: 'Remove CTA',
      Icon: X,
      description: 'Remove call-to-action',
    },
  ];

  return (
    <div className={className}>
      <h3
        style={{
          fontSize: 'var(--typography-font-size-sm)',
          fontFamily: 'var(--typography-font-family-sans)',
          fontWeight: 'var(--typography-font-weight-semibold)',
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--spacing-3)',
        }}
      >
        Quick Refinements
      </h3>

      <div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6"
        style={{ gap: 'var(--spacing-2)' }}
        role="group"
        aria-label="Content refinement actions"
      >
        {refinementActions.map(({ action, label, Icon, description }) => {
          const isActive = activeAction === action;
          const isDisabled = disabled || isRefining;

          return (
            <Button
              key={action}
              variant="outline"
              size="sm"
              onClick={() => handleRefine(action)}
              disabled={isDisabled}
              aria-label={description}
              aria-pressed={isActive}
              className="flex flex-col items-center"
              style={{
                height: 'auto',
                padding: 'var(--spacing-3)',
                gap: 'var(--spacing-2)',
                background: isActive
                  ? 'var(--gradient-badge-info)'
                  : 'var(--color-bg-elevated)',
                borderColor: isActive
                  ? 'var(--color-brand-primary)'
                  : 'var(--color-border-default)',
              }}
            >
              {isActive && isRefining ? (
                <div
                  className="animate-spin rounded-full border-2 border-current border-t-transparent"
                  style={{
                    width: 'var(--spacing-4)',
                    height: 'var(--spacing-4)',
                  }}
                  aria-hidden="true"
                />
              ) : (
                <Icon
                  style={{
                    width: 'var(--spacing-4)',
                    height: 'var(--spacing-4)',
                    color: isActive
                      ? 'var(--color-brand-primary)'
                      : 'var(--color-text-secondary)',
                  }}
                  aria-hidden="true"
                />
              )}
              <span
                style={{
                  fontSize: 'var(--typography-font-size-xs)',
                  fontFamily: 'var(--typography-font-family-sans)',
                  fontWeight: 'var(--typography-font-weight-medium)',
                  color: isActive
                    ? 'var(--color-brand-primary)'
                    : 'var(--color-text-primary)',
                  lineHeight: 1,
                  textAlign: 'center',
                }}
              >
                {label}
              </span>
            </Button>
          );
        })}
      </div>

      {isRefining && (
        <div
          className="flex items-center justify-center rounded-md"
          style={{
            marginTop: 'var(--spacing-3)',
            padding: 'var(--spacing-2)',
            background: 'var(--gradient-badge-info)',
          }}
          role="status"
          aria-live="polite"
        >
          <span
            style={{
              fontSize: 'var(--typography-font-size-sm)',
              fontFamily: 'var(--typography-font-family-sans)',
              color: 'var(--color-brand-primary)',
            }}
          >
            Refining content...
          </span>
        </div>
      )}
    </div>
  );
}
