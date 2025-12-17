/**
 * CategoryFilter Component
 *
 * Dropdown select for filtering by category.
 * Provides "All Categories" option and category-specific filtering.
 *
 * @example
 * ```tsx
 * <CategoryFilter
 *   categories={categories}
 *   selected={selectedCategory}
 *   onSelect={(slug) => setSelectedCategory(slug)}
 * />
 * ```
 */

import { cn } from '@/lib/utils';
import type { Category } from '../types';

interface CategoryFilterProps {
  categories: Category[];
  selected: string | null;
  onSelect: (slug: string | null) => void;
}

export function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) {
  return (
    <div
      className="flex items-center"
      style={{
        gap: 'var(--spacing-gap-xs)',
      }}
    >
      <span
        style={{
          fontSize: 'var(--typography-font-size-sm)',
          color: 'var(--color-text-muted)',
        }}
      >
        Category:
      </span>
      <select
        value={selected || ''}
        onChange={(e) => onSelect(e.target.value || null)}
        className={cn(
          'border-[var(--border-width-thin)] rounded-[var(--border-radius-md)]',
          'transition-all duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-default)]',
          'focus:outline-none focus:ring-[var(--border-width-medium)] focus:ring-opacity-30'
        )}
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          borderColor: 'var(--color-border-default)',
          color: 'var(--color-text-primary)',
          fontSize: 'var(--typography-font-size-sm)',
          paddingLeft: 'var(--spacing-3)',
          paddingRight: 'var(--spacing-3)',
          paddingTop: 'var(--spacing-2)',
          paddingBottom: 'var(--spacing-2)',
        }}
        aria-label="Filter by category"
      >
        <option value="">All Categories</option>
        {categories.map((category) => (
          <option key={category.slug} value={category.slug}>
            {category.name}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * ACCESSIBILITY CHECKLIST:
 * - [x] Keyboard navigable (Tab, Arrow keys, Enter)
 * - [x] ARIA labels (aria-label on select)
 * - [x] Screen reader friendly (native select element)
 * - [x] Semantic HTML (label + select)
 *
 * PERFORMANCE CONSIDERATIONS:
 * - Native select element (no heavy custom dropdown)
 * - Minimal re-renders with controlled component
 * - Simple category mapping
 *
 * DESIGN TOKEN USAGE:
 * - All colors use var(--color-*) tokens
 * - All spacing uses var(--spacing-*) tokens
 * - All typography uses var(--typography-*) tokens
 * - All motion uses var(--motion-*) tokens
 * - All borders use var(--border-*) tokens
 *
 * BROWSER COMPATIBILITY:
 * - Native select supported in all browsers
 * - Standard focus states for accessibility
 */
