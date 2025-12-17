# CategoryFilter Component

Multi-select dropdown component for filtering threats by category.

## Overview

The `CategoryFilter` component provides an accessible, keyboard-navigable multi-select dropdown for filtering cybersecurity threats by category. It follows design token standards and includes comprehensive accessibility features.

## Features

- ✅ Multi-select with custom checkboxes
- ✅ Category count display in trigger button
- ✅ Clear selection functionality (inline and in dropdown)
- ✅ Keyboard accessible (Tab, Enter, Escape)
- ✅ ARIA compliant for screen readers
- ✅ Design token compliant (no hardcoded colors/spacing)
- ✅ Human-readable category labels
- ✅ Smooth animations and transitions
- ✅ Click-outside to close behavior

## Installation

The component is located at:
```
src/components/threat/filters/CategoryFilter.tsx
```

Export through barrel file:
```typescript
// src/components/threat/filters/index.ts
export { CategoryFilter, type CategoryFilterProps } from './CategoryFilter';
```

## Usage

### Basic Example

```tsx
import { useState } from 'react';
import { CategoryFilter } from '@/components/threat/filters';
import { ThreatCategory } from '@/types/threat';

function ThreatFilters() {
  const [selectedCategories, setSelectedCategories] = useState<ThreatCategory[]>([]);

  return (
    <CategoryFilter
      value={selectedCategories}
      onChange={setSelectedCategories}
    />
  );
}
```

### With Pre-selected Categories

```tsx
const [categories, setCategories] = useState<ThreatCategory[]>([
  ThreatCategory.MALWARE,
  ThreatCategory.RANSOMWARE,
]);

<CategoryFilter value={categories} onChange={setCategories} />
```

### Disabled State

```tsx
<CategoryFilter
  value={categories}
  onChange={setCategories}
  disabled={isLoading}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `readonly ThreatCategory[]` | Required | Array of selected categories |
| `onChange` | `(categories: ThreatCategory[]) => void` | Required | Callback when selection changes |
| `disabled` | `boolean` | `false` | Disables the filter |

## Category Display Names

The component converts enum values to human-readable labels:

| Enum Value | Display Name |
|------------|--------------|
| `MALWARE` | Malware |
| `PHISHING` | Phishing |
| `RANSOMWARE` | Ransomware |
| `DATA_BREACH` | Data Breach |
| `VULNERABILITY` | Vulnerability |
| `APT` | APT |
| `DDOS` | DDoS |
| `INSIDER_THREAT` | Insider Threat |
| `SUPPLY_CHAIN` | Supply Chain |
| `ZERO_DAY` | Zero Day |

## Accessibility

### ARIA Attributes
- `role="button"` with `aria-haspopup="listbox"` on trigger
- `aria-expanded` reflects dropdown state
- `role="listbox"` with `aria-multiselectable="true"` on dropdown
- `role="option"` with `aria-selected` on each category
- Descriptive `aria-label` attributes

### Keyboard Navigation
- **Tab**: Focus trigger button
- **Enter/Space**: Open/close dropdown
- **Escape**: Close dropdown
- **Tab**: Navigate through options when open

### Screen Reader Support
- Announces filter purpose and state
- Announces selection count
- Announces each category selection change

## Design Tokens

All styling uses Tailwind classes that reference design tokens:

```css
/* Colors */
--color-primary
--color-primary-foreground
--color-accent
--color-accent-foreground
--color-border
--color-popover
--color-popover-foreground

/* From Tailwind config */
rounded-md      /* --radius-md */
shadow-md       /* --shadow-md */
border          /* --border */
```

### NO Hardcoded Values
❌ No hardcoded hex colors
❌ No hardcoded pixel values
❌ No hardcoded timing values

All values reference CSS variables or Tailwind utilities.

## Testing

Comprehensive test suite included in `CategoryFilter.test.tsx`:

```bash
# Run tests
npm test CategoryFilter

# Run with coverage
npm test -- --coverage CategoryFilter
```

### Test Coverage
- ✅ Rendering states (empty, selected, disabled)
- ✅ Dropdown interaction (open, close, keyboard)
- ✅ Selection behavior (add, remove, multiple)
- ✅ Clear functionality (inline button, dropdown footer)
- ✅ Accessibility (ARIA, labels, keyboard)
- ✅ Display names (human-readable labels)
- ✅ Edge cases (empty, all selected, disabled)

## Examples

See `CategoryFilter.example.tsx` for interactive examples:

1. **BasicCategoryFilterExample** - Simple usage
2. **PreselectedCategoryFilterExample** - With defaults
3. **DisabledCategoryFilterExample** - Loading state
4. **FormIntegrationExample** - In a form
5. **ClearCallbackExample** - With action tracking

## Component Architecture

```
CategoryFilter
├── Trigger Button
│   ├── Label (with count)
│   ├── Clear Button (conditional)
│   └── Chevron Icon
└── Dropdown (conditional)
    ├── Option List
    │   └── Option Items (with checkboxes)
    └── Footer (conditional)
        └── Clear All Button
```

## Performance Considerations

- **Static data**: Category list is constant (no re-renders)
- **Event delegation**: Single click handler for dropdown
- **CSS animations**: Hardware-accelerated transforms
- **Portal-free**: No React Portal overhead
- **Memoization opportunity**: Parent can memoize `onChange` callback

### Bundle Size
- Component: ~3KB (minified)
- Dependencies: Button, lucide-react (chevron, X icons)
- No external libraries required

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

All modern browsers with CSS custom properties support.

## Migration from Select

If migrating from a single-select `<Select>` component:

```tsx
// Before (single-select)
<Select value={category} onChange={setCategory}>
  {categories.map(cat => <option value={cat}>{cat}</option>)}
</Select>

// After (multi-select)
<CategoryFilter
  value={[category]} // Wrap in array
  onChange={cats => setCategory(cats[0])} // Take first
/>
```

## Related Components

- `SeverityFilter` - Filter by threat severity (critical, high, etc.)
- `SourceFilter` - Filter by threat source
- `DateRangeFilter` - Filter by date range

## Files

```
src/components/threat/filters/
├── CategoryFilter.tsx           # Main component
├── CategoryFilter.test.tsx      # Test suite
├── CategoryFilter.example.tsx   # Usage examples
├── CategoryFilter.README.md     # This file
└── index.ts                     # Barrel export
```

## Support

For issues or questions:
1. Check test suite for examples
2. Review example file for patterns
3. Consult ARIA documentation for accessibility
4. Reference Tailwind docs for styling

---

**Last Updated**: 2025-12-14
**Version**: 1.0.0
**Component Status**: Production Ready ✅
