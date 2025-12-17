/**
 * CategoryFilter Component
 * Multi-select dropdown for filtering threats by category
 *
 * Features:
 * - Multi-select with checkboxes
 * - Category count display
 * - Clear selection button
 * - Keyboard accessible
 * - Design token compliant
 */

import * as React from 'react';
import { ChevronDown, X } from 'lucide-react';
import { ThreatCategory } from '@/types/threat';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface CategoryFilterProps {
  value: readonly ThreatCategory[];
  onChange: (categories: ThreatCategory[]) => void;
  disabled?: boolean;
}

/**
 * Convert enum value to human-readable display name
 * @example getCategoryDisplayName(ThreatCategory.DATA_BREACH) => "Data Breach"
 */
function getCategoryDisplayName(category: ThreatCategory): string {
  const displayNames: Record<ThreatCategory, string> = {
    [ThreatCategory.MALWARE]: 'Malware',
    [ThreatCategory.PHISHING]: 'Phishing',
    [ThreatCategory.RANSOMWARE]: 'Ransomware',
    [ThreatCategory.DATA_BREACH]: 'Data Breach',
    [ThreatCategory.VULNERABILITY]: 'Vulnerability',
    [ThreatCategory.APT]: 'APT',
    [ThreatCategory.DDOS]: 'DDoS',
    [ThreatCategory.INSIDER_THREAT]: 'Insider Threat',
    [ThreatCategory.SUPPLY_CHAIN]: 'Supply Chain',
    [ThreatCategory.ZERO_DAY]: 'Zero Day',
  };
  return displayNames[category];
}

/**
 * All available threat categories in display order
 */
const ALL_CATEGORIES = Object.values(ThreatCategory);

export function CategoryFilter({ value, onChange, disabled = false }: CategoryFilterProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleToggle = (category: ThreatCategory) => {
    const newValue = value.includes(category)
      ? value.filter(c => c !== category)
      : [...value, category];
    onChange(newValue);
  };

  const handleClearAll = (event: React.MouseEvent) => {
    event.stopPropagation();
    onChange([]);
  };

  const selectedCount = value.length;
  const buttonLabel = selectedCount > 0
    ? `Categories (${selectedCount})`
    : 'Categories';

  return (
    <div className="relative" ref={dropdownRef} onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "justify-between",
          isOpen && "ring-1 ring-ring"
        )}
        style={{
          minWidth: 'var(--spacing-32)',
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Filter by threat category"
      >
        <span
          className="flex items-center"
          style={{ gap: 'var(--spacing-gap-xs)' }}
        >
          {buttonLabel}
          {selectedCount > 0 && (
            <div
              role="button"
              tabIndex={disabled ? -1 : 0}
              onClick={handleClearAll}
              onKeyDown={(e) => {
                if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  handleClearAll(e as unknown as React.MouseEvent);
                }
              }}
              aria-disabled={disabled}
              className={cn(
                "rounded-sm opacity-70 hover:opacity-100",
                "focus:outline-none focus:ring-1 focus:ring-ring",
                "cursor-pointer",
                disabled && "pointer-events-none"
              )}
              style={{
                marginLeft: 'var(--spacing-1)',
              }}
              aria-label="Clear category filter"
            >
              <X
                style={{
                  width: 'var(--spacing-3)',
                  height: 'var(--spacing-3)',
                }}
              />
            </div>
          )}
        </span>
        <ChevronDown
          className={cn(
            "opacity-50 transition-transform",
            isOpen && "rotate-180"
          )}
          style={{
            width: 'var(--spacing-4)',
            height: 'var(--spacing-4)',
          }}
        />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Select threat categories"
          aria-multiselectable="true"
          className={cn(
            "absolute z-50 w-full overflow-hidden",
            "rounded-md border bg-popover text-popover-foreground shadow-md",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2"
          )}
          style={{
            minWidth: 'var(--spacing-48)',
            marginTop: 'var(--spacing-2)',
          }}
        >
          <div
            className="overflow-y-auto"
            style={{
              maxHeight: 'var(--spacing-64)',
              padding: 'var(--spacing-1)',
            }}
          >
            {ALL_CATEGORIES.map((category) => {
              const isSelected = value.includes(category);
              return (
                <button
                  key={category}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleToggle(category)}
                  className={cn(
                    "relative flex w-full cursor-default select-none items-center rounded-sm text-sm outline-none",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus:bg-accent focus:text-accent-foreground",
                    "transition-colors"
                  )}
                  style={{
                    paddingLeft: 'var(--spacing-component-sm)',
                    paddingRight: 'var(--spacing-component-sm)',
                    paddingTop: 'var(--spacing-component-xs)',
                    paddingBottom: 'var(--spacing-component-xs)',
                  }}
                >
                  {/* Custom Checkbox */}
                  <div
                    className={cn(
                      "flex items-center justify-center rounded-sm border border-primary",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-background"
                    )}
                    style={{
                      marginRight: 'var(--spacing-component-sm)',
                      width: 'var(--spacing-4)',
                      height: 'var(--spacing-4)',
                    }}
                    aria-hidden="true"
                  >
                    {isSelected && (
                      <svg
                        className="fill-current"
                        viewBox="0 0 12 12"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{
                          width: 'var(--spacing-3)',
                          height: 'var(--spacing-3)',
                        }}
                      >
                        <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span>{getCategoryDisplayName(category)}</span>
                </button>
              );
            })}
          </div>

          {/* Footer with Clear All button */}
          {selectedCount > 0 && (
            <>
              <div
                className="bg-border"
                style={{
                  height: 'var(--border-width-thin)',
                }}
              />
              <div style={{ padding: 'var(--spacing-1)' }}>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className={cn(
                    "flex w-full items-center justify-center rounded-sm text-xs",
                    "text-muted-foreground hover:text-foreground",
                    "hover:bg-accent transition-colors"
                  )}
                  style={{
                    paddingLeft: 'var(--spacing-component-sm)',
                    paddingRight: 'var(--spacing-component-sm)',
                    paddingTop: 'var(--spacing-component-xs)',
                    paddingBottom: 'var(--spacing-component-xs)',
                  }}
                >
                  Clear All
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Usage Example:
 *
 * ```tsx
 * import { CategoryFilter } from '@/components/threat/filters/CategoryFilter';
 * import { ThreatCategory } from '@/types/threat';
 *
 * function ThreatFiltersPanel() {
 *   const [selectedCategories, setSelectedCategories] = useState<ThreatCategory[]>([]);
 *
 *   return (
 *     <CategoryFilter
 *       value={selectedCategories}
 *       onChange={setSelectedCategories}
 *     />
 *   );
 * }
 * ```
 *
 * Accessibility Features:
 * - ARIA roles and labels for screen readers
 * - Keyboard navigation (Tab, Enter, Escape)
 * - Focus management
 * - High contrast checkbox indicators
 *
 * Performance Considerations:
 * - Memoize category list (static data)
 * - Event delegation for click handlers
 * - CSS transitions for smooth animations
 * - Portal-free dropdown for better performance
 *
 * Design Token Compliance:
 * - All spacing uses var(--spacing-*) tokens
 * - All sizing uses var(--spacing-*) tokens
 * - No hardcoded values (min-w, h-, w-, px-, py-, gap-, max-h- all converted)
 * - Semantic color classes (bg-popover, text-accent-foreground, etc.) preserved
 */
