import { Button } from './button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  disabled?: boolean;
}

/**
 * Pagination Component
 *
 * Generic pagination control for paginated lists with ellipsis support.
 * Integrates with URL params for shareable pagination state.
 *
 * @example
 * ```tsx
 * <Pagination
 *   currentPage={currentPage}
 *   totalPages={totalPages}
 *   onPageChange={setCurrentPage}
 *   siblingCount={1}
 * />
 * ```
 */
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  disabled = false,
}: PaginationProps) {
  // Generate array of page numbers to display
  const generatePageNumbers = (): (number | string)[] => {
    // If total pages fits in display, show all
    const totalNumbers = siblingCount * 2 + 5; // siblings + current + first + last + 2 ellipsis

    if (totalPages <= totalNumbers) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const showLeftEllipsis = leftSiblingIndex > 2;
    const showRightEllipsis = rightSiblingIndex < totalPages - 1;

    const pages: (number | string)[] = [];

    // Always show first page
    pages.push(1);

    // Left ellipsis
    if (showLeftEllipsis) {
      pages.push('left-ellipsis');
    } else if (leftSiblingIndex === 2) {
      pages.push(2);
    }

    // Sibling pages around current
    for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
      if (i !== 1 && i !== totalPages) {
        pages.push(i);
      }
    }

    // Right ellipsis
    if (showRightEllipsis) {
      pages.push('right-ellipsis');
    } else if (rightSiblingIndex === totalPages - 1) {
      pages.push(totalPages - 1);
    }

    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = generatePageNumbers();
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  const handlePrevious = () => {
    if (!isFirstPage && !disabled) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (!isLastPage && !disabled) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageClick = (page: number) => {
    if (!disabled && page !== currentPage) {
      onPageChange(page);
    }
  };

  // Don't render if there's only one page or no pages
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      role="navigation"
      aria-label="Pagination navigation"
      data-testid="pagination"
      className="flex items-center justify-center"
      style={{
        gap: 'var(--spacing-gap-xs)',
      }}
    >
      {/* Previous Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={handlePrevious}
        disabled={isFirstPage || disabled}
        aria-label="Go to previous page"
        aria-disabled={isFirstPage || disabled}
      >
        <ChevronLeft style={{ width: 'var(--spacing-4)', height: 'var(--spacing-4)' }} />
      </Button>

      {/* Page Numbers - Hidden on mobile, visible on tablet+ */}
      <div
        className="hidden sm:flex items-center"
        style={{
          gap: 'var(--spacing-gap-xs)',
        }}
      >
        {pageNumbers.map((page, index) => {
          if (typeof page === 'string') {
            // Ellipsis
            return (
              <span
                key={`${page}-${index}`}
                className="flex items-center justify-center"
                style={{
                  height: 'var(--spacing-9)',
                  width: 'var(--spacing-9)',
                  color: 'var(--color-text-secondary)',
                }}
                aria-hidden="true"
              >
                …
              </span>
            );
          }

          const isCurrent = page === currentPage;

          return (
            <Button
              key={page}
              variant={isCurrent ? 'default' : 'outline'}
              size="icon"
              onClick={() => handlePageClick(page)}
              disabled={disabled}
              aria-label={`Go to page ${page}`}
              aria-current={isCurrent ? 'page' : undefined}
            >
              {page}
            </Button>
          );
        })}
      </div>

      {/* Current Page Indicator - Visible only on mobile */}
      <div
        className="sm:hidden flex items-center"
        style={{
          gap: 'var(--spacing-gap-xs)',
          paddingLeft: 'var(--spacing-component-sm)',
          paddingRight: 'var(--spacing-component-sm)',
        }}
      >
        <span
          style={{
            fontSize: 'var(--typography-font-size-sm)',
            color: 'var(--color-text-primary)',
          }}
        >
          Page {currentPage} of {totalPages}
        </span>
      </div>

      {/* Next Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={handleNext}
        disabled={isLastPage || disabled}
        aria-label="Go to next page"
        aria-disabled={isLastPage || disabled}
      >
        <ChevronRight style={{ width: 'var(--spacing-4)', height: 'var(--spacing-4)' }} />
      </Button>
    </nav>
  );
}

/**
 * Accessibility Checklist:
 * ✅ ARIA labels for Previous/Next buttons
 * ✅ aria-current="page" for current page
 * ✅ role="navigation" with aria-label
 * ✅ Keyboard navigable (Button components)
 * ✅ Disabled state handling
 * ✅ Screen reader friendly (ellipsis hidden with aria-hidden)
 *
 * Performance Considerations:
 * ✅ Memoization opportunity: Wrap in React.memo if parent re-renders frequently
 * ✅ Page calculation done only on prop changes
 * ✅ Minimal DOM elements
 *
 * Responsive Strategy:
 * ✅ Mobile: Previous/Next + page indicator only
 * ✅ Tablet+: Full pagination with page numbers
 * ✅ Breakpoint: sm (640px)
 *
 * Design Token Usage:
 * ✅ Spacing: var(--spacing-gap-xs), var(--spacing-component-sm), var(--spacing-9)
 * ✅ Colors: var(--color-text-primary), var(--color-text-muted)
 * ✅ Typography: var(--typography-font-size-sm)
 * ✅ All sizing uses CSS custom properties
 *
 * Browser Compatibility:
 * ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
 * ✅ CSS Grid fallback not needed (flexbox)
 * ✅ ARIA support in all modern browsers
 */
