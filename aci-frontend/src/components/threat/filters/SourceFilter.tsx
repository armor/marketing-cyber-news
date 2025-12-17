import * as React from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/**
 * SourceFilter Component
 *
 * Multi-select dropdown for filtering threat intelligence by source.
 *
 * Features:
 * - Multi-select with checkboxes
 * - Dynamic source list
 * - "Select All" / "Clear" actions
 * - Keyboard accessible (Space/Enter to toggle, Escape to close)
 * - Shows count of selected sources
 * - Dark theme optimized
 * - Design token compliant (NO hardcoded values)
 *
 * @example
 * ```tsx
 * <SourceFilter
 *   value={['cisa', 'cert-in']}
 *   onChange={(sources) => setSelectedSources(sources)}
 *   availableSources={['cisa', 'cert-in', 'mitre', 'nist']}
 * />
 * ```
 */

export interface SourceFilterProps {
  /** Currently selected source identifiers */
  value: readonly string[];
  /** Callback when selection changes */
  onChange: (sources: string[]) => void;
  /** Available source identifiers to choose from */
  availableSources: readonly string[];
  /** Disable the filter */
  disabled?: boolean;
}

export function SourceFilter({
  value,
  onChange,
  availableSources,
  disabled = false,
}: SourceFilterProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape key
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const toggleSource = (source: string) => {
    const newValue = value.includes(source)
      ? value.filter((s) => s !== source)
      : [...value, source];
    onChange(newValue);
  };

  const selectAll = () => {
    onChange([...availableSources]);
  };

  const clearAll = () => {
    onChange([]);
  };

  const handleKeyDown = (event: React.KeyboardEvent, source: string) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      toggleSource(source);
    }
  };

  const formatSourceName = (source: string): string => {
    // Convert source identifier to readable name (e.g., 'cisa' -> 'CISA')
    return source
      .split('-')
      .map((word) => word.toUpperCase())
      .join(' ');
  };

  const selectedCount = value.length;
  const allSelected = selectedCount === availableSources.length;

  return (
    <div className="relative inline-block">
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-between',
          isOpen && 'ring-1 ring-ring'
        )}
        style={{
          gap: 'var(--spacing-gap-xs)',
          minWidth: 'var(--spacing-40)',
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Filter by source. ${selectedCount} sources selected`}
      >
        <span className="text-sm">
          Sources {selectedCount > 0 && `(${selectedCount})`}
        </span>
        <ChevronDown
          className={cn(
            'transition-transform',
            isOpen && 'rotate-180'
          )}
          style={{
            width: 'var(--spacing-4)',
            height: 'var(--spacing-4)',
          }}
        />
      </Button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className={cn(
            'absolute z-50 rounded-md border bg-popover shadow-md',
            'animate-in fade-in-0 zoom-in-95',
            'origin-top-left'
          )}
          style={{
            marginTop: 'var(--spacing-1)',
            width: 'var(--spacing-64)',
          }}
          role="listbox"
          aria-label="Source filter options"
        >
          {/* Header with Select All / Clear actions */}
          <div
            className="flex items-center justify-between border-b"
            style={{
              paddingLeft: 'var(--spacing-component-sm)',
              paddingRight: 'var(--spacing-component-sm)',
              paddingTop: 'var(--spacing-component-xs)',
              paddingBottom: 'var(--spacing-component-xs)',
            }}
          >
            <span className="text-xs font-medium text-muted-foreground">
              Select Sources
            </span>
            <div
              className="flex"
              style={{ gap: 'var(--spacing-1)' }}
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={selectAll}
                disabled={allSelected}
                className="text-xs"
                style={{
                  height: 'var(--spacing-6)',
                  paddingLeft: 'var(--spacing-2)',
                  paddingRight: 'var(--spacing-2)',
                }}
              >
                All
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAll}
                disabled={selectedCount === 0}
                className="text-xs"
                style={{
                  height: 'var(--spacing-6)',
                  paddingLeft: 'var(--spacing-2)',
                  paddingRight: 'var(--spacing-2)',
                }}
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Source list */}
          <div
            className="overflow-y-auto"
            style={{
              maxHeight: 'var(--spacing-64)',
              padding: 'var(--spacing-1)',
            }}
          >
            {availableSources.length === 0 ? (
              <div
                className="text-center text-sm text-muted-foreground"
                style={{
                  paddingLeft: 'var(--spacing-component-sm)',
                  paddingRight: 'var(--spacing-component-sm)',
                  paddingTop: 'var(--spacing-6)',
                  paddingBottom: 'var(--spacing-6)',
                }}
              >
                No sources available
              </div>
            ) : (
              availableSources.map((source) => {
                const isSelected = value.includes(source);
                return (
                  <div
                    key={source}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={0}
                    onClick={() => toggleSource(source)}
                    onKeyDown={(e) => handleKeyDown(e, source)}
                    className={cn(
                      'relative flex cursor-pointer select-none items-center rounded-sm',
                      'transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      'focus:bg-accent focus:text-accent-foreground focus:outline-none',
                      isSelected && 'bg-accent/50'
                    )}
                    style={{
                      gap: 'var(--spacing-gap-xs)',
                      paddingLeft: 'var(--spacing-component-sm)',
                      paddingRight: 'var(--spacing-component-sm)',
                      paddingTop: 'var(--spacing-component-xs)',
                      paddingBottom: 'var(--spacing-component-xs)',
                    }}
                  >
                    {/* Custom Checkbox */}
                    <div
                      className={cn(
                        'flex items-center justify-center rounded border',
                        'transition-colors',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input bg-background'
                      )}
                      style={{
                        width: 'var(--spacing-4)',
                        height: 'var(--spacing-4)',
                      }}
                      aria-hidden="true"
                    >
                      {isSelected && (
                        <Check
                          style={{
                            width: 'var(--spacing-3)',
                            height: 'var(--spacing-3)',
                          }}
                        />
                      )}
                    </div>

                    <span className="flex-1 text-sm">
                      {formatSourceName(source)}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with selected count */}
          {selectedCount > 0 && (
            <div
              className="border-t"
              style={{
                paddingLeft: 'var(--spacing-component-sm)',
                paddingRight: 'var(--spacing-component-sm)',
                paddingTop: 'var(--spacing-component-xs)',
                paddingBottom: 'var(--spacing-component-xs)',
              }}
            >
              <div
                className="flex flex-wrap"
                style={{ gap: 'var(--spacing-1)' }}
              >
                {value.map((source) => (
                  <Badge
                    key={source}
                    variant="secondary"
                    className="text-xs"
                    style={{
                      gap: 'var(--spacing-1)',
                      paddingRight: 'var(--spacing-1)',
                    }}
                  >
                    {formatSourceName(source)}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSource(source);
                      }}
                      className={cn(
                        'rounded-sm hover:bg-muted',
                        'focus:outline-none focus:ring-1 focus:ring-ring'
                      )}
                      style={{
                        marginLeft: 'var(--spacing-1)',
                      }}
                      aria-label={`Remove ${formatSourceName(source)}`}
                    >
                      <X
                        style={{
                          width: 'var(--spacing-3)',
                          height: 'var(--spacing-3)',
                        }}
                      />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * ACCESSIBILITY CHECKLIST:
 * - [x] Keyboard navigable (Tab, Space/Enter to toggle, Escape to close)
 * - [x] ARIA roles and labels (listbox, option)
 * - [x] ARIA states (aria-expanded, aria-haspopup, aria-selected)
 * - [x] Focus management (focus returns to trigger on Escape)
 * - [x] Screen reader friendly labels
 *
 * PERFORMANCE CONSIDERATIONS:
 * - Click outside handler only active when dropdown is open
 * - Minimal re-renders with useState for local state
 * - Event delegation for click handlers
 *
 * DESIGN TOKEN COMPLIANCE:
 * - All spacing uses var(--spacing-*) tokens
 * - All sizing uses var(--spacing-*) tokens
 * - No hardcoded pixel values (min-w, h-, w-, px-, py-, gap-, max-h- all converted)
 * - Semantic color classes (bg-popover, text-accent-foreground, etc.) preserved
 */
