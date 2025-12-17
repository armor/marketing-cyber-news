import * as React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * SearchInput Component - Fortified Horizon Theme
 *
 * A search input component for filtering threats and CVEs with the following features:
 * - Search icon on the left
 * - Clear button (X) on the right when text is entered
 * - Support for CVE ID format search
 * - Full keyboard accessibility with focus styles
 * - Uses CSS design tokens (NO hardcoded values)
 *
 * @example
 * ```tsx
 * <SearchInput
 *   value={searchQuery}
 *   onChange={setSearchQuery}
 *   placeholder="Search threats, CVEs..."
 * />
 * ```
 */

interface SearchInputProps {
  /** Current search value */
  value: string;
  /** Callback when search value changes */
  onChange: (search: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, placeholder = 'Search threats, CVEs...', disabled = false, className }, ref) => {
    const handleClear = () => {
      onChange('');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow Escape key to clear the input
      if (e.key === 'Escape' && value) {
        e.preventDefault();
        handleClear();
      }
    };

    return (
      <div className={cn('relative w-full', className)}>
        {/* Search Icon - Left */}
        <div
          className="pointer-events-none absolute top-1/2 -translate-y-1/2"
          style={{ left: 'var(--spacing-3)' }}
        >
          <Search
            className="transition-colors"
            style={{
              width: 'var(--spacing-5)',
              height: 'var(--spacing-5)',
              color: disabled
                ? 'var(--color-text-muted)'
                : 'var(--color-text-secondary)',
            }}
            aria-hidden="true"
          />
        </div>

        {/* Input Field */}
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'flex w-full border bg-transparent transition-colors',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
          style={{
            height: 'var(--spacing-10)',
            paddingLeft: 'var(--spacing-10)',
            paddingRight: 'var(--spacing-10)',
            paddingTop: 'var(--spacing-2)',
            paddingBottom: 'var(--spacing-2)',
            borderRadius: 'var(--border-radius-lg)',
            borderWidth: 'var(--border-width-thin)',
            borderColor: 'var(--color-border-default)',
            backgroundColor: 'var(--color-bg-elevated)',
            color: 'var(--color-text-primary)',
            fontSize: 'var(--typography-font-size-sm)',
            fontFamily: 'var(--typography-font-family-sans)',
            boxShadow: 'var(--shadow-sm)',
            transitionDuration: 'var(--motion-duration-fast)',
          }}
          aria-label="Search threats and CVEs"
          aria-describedby={value ? 'search-clear-button' : undefined}
        />

        {/* Clear Button - Right (only visible when text is entered) */}
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className={cn(
              'absolute top-1/2 -translate-y-1/2',
              'inline-flex items-center justify-center',
              'transition-colors',
              'focus-visible:outline-none focus-visible:ring-2'
            )}
            style={{
              right: 'var(--spacing-3)',
              width: 'var(--spacing-5)',
              height: 'var(--spacing-5)',
              borderRadius: 'var(--border-radius-sm)',
              color: 'var(--color-text-secondary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
            aria-label="Clear search"
            id="search-clear-button"
          >
            <X
              style={{
                width: 'var(--spacing-4)',
                height: 'var(--spacing-4)',
              }}
              aria-hidden="true"
            />
          </button>
        )}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
