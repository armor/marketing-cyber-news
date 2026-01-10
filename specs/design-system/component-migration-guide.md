# Component Migration Guide - Design Token Compliance

**Component Architect**
**Date**: 2026-01-09
**Purpose**: Practical guide for migrating existing components to design token standards

---

## Overview

This guide provides step-by-step instructions for migrating existing components to comply with the Armor Dashboard design system. Use this as a checklist when refactoring components.

---

## Migration Checklist

For each component, complete these steps in order:

### 1. Audit Current State
- [ ] Identify all hardcoded CSS values (colors, spacing, fonts)
- [ ] Document current prop interface
- [ ] List all component variants/states
- [ ] Note accessibility gaps (ARIA, keyboard nav)
- [ ] Check dark mode support

### 2. Update Imports
- [ ] Add design token imports
- [ ] Remove unused CSS imports
- [ ] Update TypeScript types

### 3. Replace Hardcoded Values
- [ ] Colors → `colors.*`
- [ ] Spacing → `spacing[*]` or `componentSpacing.*`
- [ ] Typography → `typography.*`
- [ ] Shadows → `shadows.*`
- [ ] Borders → `borders.*`
- [ ] Transitions → `motion.*`

### 4. Standardize Props Interface
- [ ] Use `variant` instead of boolean flags
- [ ] Use `size` for sizing variants
- [ ] Prefix event handlers with `on*`
- [ ] Prefix boolean state with `is*`
- [ ] Export interface for external use

### 5. Add Missing Features
- [ ] Loading state (skeleton/spinner)
- [ ] Empty state (meaningful message)
- [ ] Error state (user-friendly error)
- [ ] Accessibility (ARIA, keyboard)
- [ ] Responsive breakpoints

### 6. Test & Document
- [ ] Unit tests for all variants
- [ ] E2E tests for user flows
- [ ] JSDoc comments
- [ ] Storybook story (if applicable)

---

## Example Migrations

### Example 1: Badge Component

**Before (Non-Compliant)**:
```typescript
// ❌ Hardcoded colors, no variants, poor accessibility
export function Badge({ children, severity }: { children: React.ReactNode; severity: string }) {
  let bgColor = '#e5e5e5';
  if (severity === 'critical') bgColor = '#dc2626';
  if (severity === 'warning') bgColor = '#f59e0b';

  return (
    <span style={{
      backgroundColor: bgColor,
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 500,
    }}>
      {children}
    </span>
  );
}
```

**After (Compliant)**:
```typescript
// ✅ Design tokens, proper variants, accessible
import { colors } from '@/styles/tokens/colors';
import { spacing } from '@/styles/tokens/spacing';
import { typography } from '@/styles/tokens/typography';
import { borders } from '@/styles/tokens/borders';
import { shadows } from '@/styles/tokens/shadows';

interface BadgeProps {
  /** Visual variant affecting background color */
  variant: 'neutral' | 'critical' | 'warning' | 'success' | 'info';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Badge content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

const VARIANT_BACKGROUNDS: Record<BadgeProps['variant'], string> = {
  neutral: 'var(--gradient-badge-neutral)',
  critical: 'var(--gradient-badge-critical)',
  warning: 'var(--gradient-badge-warning)',
  success: 'var(--gradient-badge-success)',
  info: 'var(--gradient-badge-info)',
};

const SIZE_STYLES: Record<NonNullable<BadgeProps['size']>, React.CSSProperties> = {
  sm: {
    padding: `${spacing[1]} ${spacing[2]}`, // 4px 8px
    fontSize: typography.fontSize.xs,
  },
  md: {
    padding: `${spacing[2]} ${spacing[3]}`, // 8px 12px
    fontSize: typography.fontSize.sm,
  },
  lg: {
    padding: `${spacing[2]} ${spacing[4]}`, // 8px 16px
    fontSize: typography.fontSize.base,
  },
};

export function Badge({
  variant,
  size = 'md',
  children,
  className,
}: BadgeProps): React.ReactElement {
  const background = VARIANT_BACKGROUNDS[variant];
  const sizeStyles = SIZE_STYLES[size];

  return (
    <span
      role="status"
      aria-label={`${variant} badge`}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background,
        borderRadius: borders.radius.sm,
        fontWeight: typography.fontWeight.medium,
        textTransform: 'uppercase',
        letterSpacing: typography.letterSpacing.wide,
        boxShadow: shadows.badge,
        ...sizeStyles,
      }}
    >
      {children}
    </span>
  );
}

Badge.displayName = 'Badge';
```

**Migration Steps**:
1. ✅ Added TypeScript interface with proper variant system
2. ✅ Replaced hardcoded colors with design tokens
3. ✅ Added size variant support
4. ✅ Used gradient backgrounds from design system
5. ✅ Added ARIA role and label for accessibility
6. ✅ Exported displayName for React DevTools

---

### Example 2: Button Component

**Before (Non-Compliant)**:
```typescript
// ❌ Boolean flags, hardcoded styles, no loading state
export function Button({
  children,
  onClick,
  isPrimary,
  isSecondary,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  isPrimary?: boolean;
  isSecondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '10px 20px',
        backgroundColor: isPrimary ? '#2563eb' : '#e5e5e5',
        color: isPrimary ? '#fff' : '#000',
        border: 'none',
        borderRadius: '6px',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}
```

**After (Compliant)**:
```typescript
// ✅ Variant prop, design tokens, loading state, accessibility
import { colors } from '@/styles/tokens/colors';
import { spacing } from '@/styles/tokens/spacing';
import { typography } from '@/styles/tokens/typography';
import { borders } from '@/styles/tokens/borders';
import { shadows } from '@/styles/tokens/shadows';
import { motion } from '@/styles/tokens/motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ButtonProps {
  /** Visual variant */
  variant: 'primary' | 'secondary' | 'alert' | 'trust' | 'ghost' | 'outline';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Loading state */
  isLoading?: boolean;
  /** Disabled state */
  isDisabled?: boolean;
  /** Optional icon */
  icon?: React.ReactNode;
  /** Icon position */
  iconPosition?: 'left' | 'right';
  /** Click handler */
  onClick?: () => void;
  /** Button content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Button type */
  type?: 'button' | 'submit' | 'reset';
}

const VARIANT_STYLES: Record<ButtonProps['variant'], React.CSSProperties> = {
  primary: {
    background: 'var(--gradient-btn-primary)',
    color: 'var(--color-bg-elevated)',
    boxShadow: 'var(--shadow-btn-primary)',
  },
  secondary: {
    background: 'var(--gradient-btn-secondary)',
    color: 'var(--color-text-primary)',
    boxShadow: 'var(--shadow-btn-accent)',
  },
  alert: {
    background: 'var(--gradient-btn-alert)',
    color: '#ffffff',
    boxShadow: 'var(--shadow-btn-accent)',
  },
  trust: {
    background: 'var(--gradient-btn-trust)',
    color: '#ffffff',
    boxShadow: 'var(--shadow-btn-accent)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-text-primary)',
    boxShadow: 'none',
  },
  outline: {
    background: 'transparent',
    color: 'var(--color-text-primary)',
    border: `1px solid var(--color-border-default)`,
    boxShadow: 'none',
  },
};

const SIZE_STYLES: Record<NonNullable<ButtonProps['size']>, React.CSSProperties> = {
  sm: {
    padding: `${spacing[2]} ${spacing[3]}`, // 8px 12px
    fontSize: typography.fontSize.sm,
  },
  md: {
    padding: `${spacing[3]} ${spacing[4]}`, // 12px 16px
    fontSize: typography.fontSize.base,
  },
  lg: {
    padding: `${spacing[4]} ${spacing[6]}`, // 16px 24px
    fontSize: typography.fontSize.lg,
  },
};

export function Button({
  variant,
  size = 'md',
  isLoading = false,
  isDisabled = false,
  icon,
  iconPosition = 'left',
  onClick,
  children,
  className,
  type = 'button',
}: ButtonProps): React.ReactElement {
  const variantStyles = VARIANT_STYLES[variant];
  const sizeStyles = SIZE_STYLES[size];
  const disabled = isLoading || isDisabled;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-busy={isLoading}
      aria-disabled={disabled}
      className={cn('inline-flex items-center justify-center gap-2 transition-all', className)}
      style={{
        ...variantStyles,
        ...sizeStyles,
        borderRadius: borders.radius.md,
        fontWeight: typography.fontWeight.medium,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: `all ${motion.duration.fast} ${motion.easing.default}`,
        border: variantStyles.border || 'none',
      }}
      onMouseEnter={(e) => {
        if (!disabled && variant !== 'ghost' && variant !== 'outline') {
          e.currentTarget.style.boxShadow =
            variant === 'primary'
              ? 'var(--shadow-btn-primary-hover)'
              : 'var(--shadow-btn-accent-hover)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.boxShadow = variantStyles.boxShadow || 'none';
        }
      }}
    >
      {isLoading && <Loader2 className="animate-spin" size={16} />}
      {!isLoading && icon && iconPosition === 'left' && icon}
      {children}
      {!isLoading && icon && iconPosition === 'right' && icon}
    </button>
  );
}

Button.displayName = 'Button';
```

**Migration Steps**:
1. ✅ Replaced boolean flags with `variant` prop
2. ✅ Added size variant system
3. ✅ Replaced hardcoded colors/spacing with tokens
4. ✅ Added loading state with spinner
5. ✅ Added icon support with position control
6. ✅ Improved accessibility (aria-busy, aria-disabled)
7. ✅ Added hover state with shadow transitions
8. ✅ Used motion tokens for transitions

---

### Example 3: Input Component

**Before (Non-Compliant)**:
```typescript
// ❌ No error states, hardcoded styles, poor accessibility
export function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        padding: '8px 12px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        fontSize: '14px',
      }}
    />
  );
}
```

**After (Compliant)**:
```typescript
// ✅ Proper labels, error states, design tokens, full accessibility
import { colors } from '@/styles/tokens/colors';
import { spacing } from '@/styles/tokens/spacing';
import { typography } from '@/styles/tokens/typography';
import { borders } from '@/styles/tokens/borders';
import { shadows } from '@/styles/tokens/shadows';
import { motion } from '@/styles/tokens/motion';
import { AlertCircle } from 'lucide-react';
import { useId } from 'react';

interface InputProps {
  /** Input label */
  label: string;
  /** Input name for form */
  name: string;
  /** Input type */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  /** Current value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Blur handler */
  onBlur?: () => void;
  /** Placeholder text */
  placeholder?: string;
  /** Error message */
  error?: string;
  /** Help text */
  helpText?: string;
  /** Disabled state */
  isDisabled?: boolean;
  /** Required field */
  isRequired?: boolean;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function Input({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  helpText,
  isDisabled = false,
  isRequired = false,
  autoFocus = false,
  className,
}: InputProps): React.ReactElement {
  const inputId = useId();
  const errorId = useId();
  const helpId = useId();
  const hasError = Boolean(error);

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
      {/* Label */}
      <label
        htmlFor={inputId}
        style={{
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.medium,
          color: colors.text.primary,
        }}
      >
        {label}
        {isRequired && (
          <span
            aria-label="required"
            style={{ color: colors.semantic.error, marginLeft: spacing[1] }}
          >
            *
          </span>
        )}
      </label>

      {/* Input */}
      <div style={{ position: 'relative' }}>
        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={isDisabled}
          required={isRequired}
          autoFocus={autoFocus}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? errorId : helpText ? helpId : undefined
          }
          style={{
            width: '100%',
            padding: `${spacing[2]} ${spacing[3]}`,
            fontSize: typography.fontSize.sm,
            color: colors.text.primary,
            backgroundColor: colors.background.secondary,
            border: `1px solid ${hasError ? colors.border.error : colors.border.default}`,
            borderRadius: borders.radius.md,
            outline: 'none',
            transition: `all ${motion.duration.fast} ${motion.easing.default}`,
            cursor: isDisabled ? 'not-allowed' : 'text',
            opacity: isDisabled ? 0.5 : 1,
          }}
          onFocus={(e) => {
            if (!hasError) {
              e.currentTarget.style.borderColor = colors.border.focus;
              e.currentTarget.style.boxShadow = shadows.focus;
            }
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = hasError
              ? colors.border.error
              : colors.border.default;
            e.currentTarget.style.boxShadow = 'none';
            onBlur?.();
          }}
        />

        {/* Error icon */}
        {hasError && (
          <div
            style={{
              position: 'absolute',
              right: spacing[3],
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.semantic.error,
            }}
          >
            <AlertCircle size={16} />
          </div>
        )}
      </div>

      {/* Error message */}
      {hasError && (
        <p
          id={errorId}
          role="alert"
          style={{
            fontSize: typography.fontSize.xs,
            color: colors.semantic.error,
            margin: 0,
          }}
        >
          {error}
        </p>
      )}

      {/* Help text */}
      {!hasError && helpText && (
        <p
          id={helpId}
          style={{
            fontSize: typography.fontSize.xs,
            color: colors.text.muted,
            margin: 0,
          }}
        >
          {helpText}
        </p>
      )}
    </div>
  );
}

Input.displayName = 'Input';
```

**Migration Steps**:
1. ✅ Added comprehensive props interface
2. ✅ Replaced hardcoded values with design tokens
3. ✅ Added proper label with htmlFor association
4. ✅ Added error state with icon and message
5. ✅ Added help text support
6. ✅ Improved accessibility (aria-invalid, aria-describedby, role="alert")
7. ✅ Added focus/blur state handling with shadows
8. ✅ Used useId() for stable IDs
9. ✅ Added required field indicator

---

## Common Token Replacements

### Colors

| Hardcoded | Token |
|-----------|-------|
| `#2563eb` | `colors.brand.primary` |
| `#ef4444` | `colors.severity.critical` |
| `#f59e0b` | `colors.severity.medium` |
| `#22c55e` | `colors.severity.low` |
| `#ffffff` | `colors.background.elevated` (or white in dark mode context) |
| `#000000` | `colors.text.primary` (adapts to theme) |
| `#e5e5e5` | `colors.background.secondary` |
| `#ccc` | `colors.border.default` |

### Spacing

| Hardcoded | Token |
|-----------|-------|
| `4px` | `spacing[1]` |
| `8px` | `spacing[2]` |
| `12px` | `spacing[3]` |
| `16px` | `spacing[4]` |
| `24px` | `spacing[6]` |
| `32px` | `spacing[8]` |
| `padding: 16px` | `componentSpacing.md` |
| `padding: 24px` | `componentSpacing.lg` |
| `gap: 8px` | `spacing-gap-xs` (CSS) or `spacing[2]` (JS) |

### Typography

| Hardcoded | Token |
|-----------|-------|
| `12px` | `typography.fontSize.xs` |
| `14px` | `typography.fontSize.sm` |
| `16px` | `typography.fontSize.base` |
| `18px` | `typography.fontSize.lg` |
| `24px` | `typography.fontSize['2xl']` |
| `font-weight: 500` | `typography.fontWeight.medium` |
| `font-weight: 600` | `typography.fontWeight.semibold` |
| `font-weight: 700` | `typography.fontWeight.bold` |

### Shadows

| Hardcoded | Token |
|-----------|-------|
| `box-shadow: 0 1px 2px rgba(...)` | `shadows.sm` |
| `box-shadow: 0 4px 6px rgba(...)` | `shadows.md` |
| `box-shadow: 0 10px 15px rgba(...)` | `shadows.lg` |
| `box-shadow: 0 0 0 3px rgba(14,165,233,0.3)` | `shadows.focus` |

### Borders

| Hardcoded | Token |
|-----------|-------|
| `border-radius: 4px` | `borders.radius.sm` |
| `border-radius: 6px` | `borders.radius.md` |
| `border-radius: 8px` | `borders.radius.lg` |
| `border-radius: 9999px` | `borders.radius.full` |
| `border: 1px solid` | `borders.width.thin` |
| `border: 2px solid` | `borders.width.medium` |

### Motion

| Hardcoded | Token |
|-----------|-------|
| `transition: 150ms` | `motion.duration.fast` |
| `transition: 300ms` | `motion.duration.normal` |
| `transition: 500ms` | `motion.duration.slow` |
| `ease-in-out` | `motion.easing.inOut` |
| `cubic-bezier(...)` | `motion.easing.default` |

---

## Testing Migration Success

### Visual Regression Testing

After migration, verify visual consistency:

1. **Light Mode**: Component looks identical to before
2. **Dark Mode**: Component adapts properly
3. **Hover States**: Interactive states work
4. **Focus States**: Keyboard focus visible
5. **Disabled States**: Disabled appearance correct
6. **Loading States**: Loading spinner/skeleton displays
7. **Error States**: Error styling applied

### Accessibility Testing

Run these checks:

```bash
# Install axe-core
npm install --save-dev @axe-core/react

# Add to component test
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

test('should have no accessibility violations', async () => {
  const { container } = render(<YourComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Token Coverage Audit

Run this script to find hardcoded values:

```bash
# Find hardcoded hex colors
rg "#[0-9a-fA-F]{3,6}" src/components/

# Find hardcoded pixel values
rg "\d+px" src/components/

# Find hardcoded font sizes
rg "font-size:\s*\d+px" src/components/
```

---

## Migration Priority Matrix

Prioritize component migrations based on:

| Priority | Criteria | Examples |
|----------|----------|----------|
| **P0 - Critical** | Used on every page, poor UX | Button, Input, Card |
| **P1 - High** | Used frequently, inconsistent | Badge, Select, Dialog |
| **P2 - Medium** | Domain-specific, good UX | MetricCard, ThreatCard |
| **P3 - Low** | Rarely used, acceptable UX | Skeleton, Tooltip |

**Suggested Order**:
1. Form components (Input, Select, Textarea, Checkbox)
2. Button component
3. Card component
4. Badge/Severity components
5. Navigation (Sidebar, Header, Footer)
6. Data components (MetricCard, ThreatCard)
7. Charts and visualizations
8. Modals and dialogs
9. Tables and lists
10. Everything else

---

## Getting Help

### Resources

1. **Design Token Reference**: `/docs/design-system/interior-pages-design-system.md`
2. **Code Examples**: See `src/components/dashboard/MetricCard.tsx` (good example)
3. **Design Tokens**: `src/styles/tokens/*`
4. **CSS Variables**: `src/styles/variables.css`

### Review Process

Before submitting PR:
1. Self-review using migration checklist
2. Run `npm run lint` and fix all issues
3. Run `npm run test` and ensure all pass
4. Request review from `code-reviewer` agent
5. Request review from Component Architect

---

**End of Migration Guide**
