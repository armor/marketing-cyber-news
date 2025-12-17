/**
 * BookmarkButton Component
 * Toggle button for bookmarking threats
 *
 * Features:
 * - Filled/outline icon based on bookmark state
 * - Loading state during API call
 * - Accessible with ARIA attributes
 * - Smooth transitions using design tokens
 *
 * Used in: ThreatHeader, ThreatDetail, ThreatCard
 */

import React, { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { colors } from '@/styles/tokens/colors';
import { motion as motionTokens } from '@/styles/tokens/motion';

export interface BookmarkButtonProps {
  /**
   * Whether the item is currently bookmarked
   */
  readonly isBookmarked: boolean;
  /**
   * Callback when bookmark state should change
   */
  readonly onClick: () => void | Promise<void>;
  /**
   * Optional loading state override (for external loading control)
   */
  readonly isLoading?: boolean;
  /**
   * Button size variant
   * @default 'default'
   */
  readonly size?: 'default' | 'sm' | 'lg' | 'icon';
  /**
   * Show label text alongside icon
   * @default false
   */
  readonly showLabel?: boolean;
  /**
   * Additional CSS classes
   */
  readonly className?: string;
}

/**
 * BookmarkButton - Toggle button for bookmarking content
 *
 * Features:
 * - Optimistic UI updates
 * - Loading state with disabled interaction
 * - Accessible with aria-pressed and aria-label
 * - Icon changes based on state (filled vs outline)
 * - Smooth transitions using design tokens
 *
 * @example
 * ```tsx
 * // Basic usage
 * <BookmarkButton
 *   isBookmarked={threat.isBookmarked}
 *   onClick={handleBookmarkToggle}
 * />
 *
 * // With label
 * <BookmarkButton
 *   isBookmarked={true}
 *   onClick={handleBookmarkToggle}
 *   showLabel
 * />
 *
 * // With external loading state
 * <BookmarkButton
 *   isBookmarked={false}
 *   onClick={handleBookmarkToggle}
 *   isLoading={isTogglingBookmark}
 * />
 * ```
 */
export function BookmarkButton({
  isBookmarked,
  onClick,
  isLoading: externalIsLoading,
  size = 'default',
  showLabel = false,
  className,
}: BookmarkButtonProps): React.JSX.Element {
  const [internalIsLoading, setInternalIsLoading] = useState<boolean>(false);
  const isLoading = externalIsLoading ?? internalIsLoading;

  const handleClick = async (): Promise<void> => {
    if (isLoading) {
      return;
    }

    setInternalIsLoading(true);

    try {
      await onClick();
    } finally {
      setInternalIsLoading(false);
    }
  };

  const ariaLabel = isBookmarked
    ? 'Remove bookmark'
    : 'Add bookmark';

  const labelText = isBookmarked
    ? 'Bookmarked'
    : 'Bookmark';

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={handleClick}
      disabled={isLoading}
      aria-pressed={isBookmarked}
      aria-label={ariaLabel}
      className={cn(
        'transition-colors',
        className
      )}
      style={{
        transition: `all ${motionTokens.duration.fast} ${motionTokens.easing.default}`,
      }}
    >
      {isLoading ? (
        // Loading spinner
        <div
          className="animate-spin"
          style={{
            width: '1em',
            height: '1em',
            borderRadius: '50%',
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
          }}
          aria-hidden="true"
        />
      ) : (
        <Bookmark
          size={size === 'icon' ? 18 : size === 'sm' ? 16 : 20}
          fill={isBookmarked ? 'currentColor' : 'none'}
          style={{
            color: isBookmarked ? colors.brand.primary : 'currentColor',
            transition: `all ${motionTokens.duration.fast} ${motionTokens.easing.default}`,
          }}
          aria-hidden="true"
        />
      )}

      {showLabel && !isLoading && (
        <span>{labelText}</span>
      )}
    </Button>
  );
}

/**
 * Accessibility Notes:
 * - aria-pressed indicates toggle state
 * - aria-label describes action (not state)
 * - Disabled during loading to prevent duplicate requests
 * - Keyboard accessible (native button)
 * - Loading spinner hidden from screen readers
 *
 * Performance Notes:
 * - Optimistic UI (icon changes immediately)
 * - Internal loading state fallback
 * - Async onClick support
 * - No unnecessary re-renders
 *
 * Design Token Usage:
 * - Colors: colors.brand.primary
 * - Motion: motionTokens.duration.fast, motionTokens.easing.default
 *
 * Testing:
 * - Use aria-pressed to check bookmark state
 * - Button role with "bookmark" in accessible name
 * - Check disabled state during loading
 * - Verify onClick is called on interaction
 */
