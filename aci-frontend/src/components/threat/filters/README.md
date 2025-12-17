# Threat Filter Components

Reusable filter components for the NEXUS Cybersecurity Dashboard threat intelligence system.

## Components

### SeverityFilter

Multi-select toggle button filter for threat severity levels (Critical, High, Medium, Low).

#### Features

- ✅ **Design Token Compliant**: Uses CSS variables for all colors, spacing, and motion
- ✅ **Fully Accessible**: WCAG 2.1 compliant with proper ARIA labels and keyboard navigation
- ✅ **Type Safe**: Full TypeScript support with readonly arrays
- ✅ **Keyboard Navigation**: Space and Enter keys to toggle selections
- ✅ **Screen Reader Friendly**: Dynamic ARIA labels that update based on state
- ✅ **Responsive**: Flexbox layout that wraps on smaller screens
- ✅ **Test Coverage**: 31 comprehensive unit tests (100% pass rate)

#### Usage

```tsx
import { SeverityFilter } from '@/components/threat/filters';
import type { Severity } from '@/types/threat';

function MyComponent() {
  const [selectedSeverities, setSelectedSeverities] = useState<Severity[]>([]);

  return (
    <SeverityFilter
      value={selectedSeverities}
      onChange={setSelectedSeverities}
    />
  );
}
```

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `value` | `readonly Severity[]` | Yes | - | Currently selected severity levels |
| `onChange` | `(severity: Severity[]) => void` | Yes | - | Callback when selection changes |
| `disabled` | `boolean` | No | `false` | Disable all filter buttons |
| `className` | `string` | No | - | Additional CSS classes for the wrapper |

#### Type Reference

```typescript
type Severity = 'critical' | 'high' | 'medium' | 'low';

interface SeverityFilterProps {
  value: readonly Severity[];
  onChange: (severity: Severity[]) => void;
  disabled?: boolean;
  className?: string;
}
```

#### Examples

**Basic Usage**
```tsx
<SeverityFilter
  value={['critical', 'high']}
  onChange={(severities) => console.log('Selected:', severities)}
/>
```

**With URL Query Params** (using `useThreatFilters` hook)
```tsx
const { filters, setSeverity } = useThreatFilters();

<SeverityFilter
  value={filters.severity ?? []}
  onChange={setSeverity}
/>
```

**Disabled State**
```tsx
<SeverityFilter
  value={selectedSeverities}
  onChange={setSelectedSeverities}
  disabled={isLoading}
/>
```

**Custom Layout**
```tsx
<SeverityFilter
  value={selectedSeverities}
  onChange={setSelectedSeverities}
  className="justify-end" // Right-align buttons
/>
```

#### Severity Colors

The component uses design tokens for severity colors:

| Severity | CSS Variable | Default Light | Default Dark |
|----------|--------------|---------------|--------------|
| Critical | `--color-severity-critical` | #ef4444 (Red) | #ef4444 |
| High | `--color-severity-high` | #f97316 (Orange) | #f97316 |
| Medium | `--color-severity-medium` | #eab308 (Yellow) | #eab308 |
| Low | `--color-severity-low` | #22c55e (Green) | #22c55e |

#### Accessibility

- **Keyboard Navigation**: Tab to focus, Space/Enter to toggle
- **ARIA Labels**: Dynamic labels (e.g., "Add Critical severity filter" / "Remove Critical severity filter")
- **ARIA Pressed**: `aria-pressed` attribute indicates selection state
- **Focus Visible**: Clear focus ring using `--color-border-focus` token
- **Screen Reader**: Group labeled as "Filter by severity level"
- **Disabled State**: Proper `disabled` attribute and visual feedback

#### Testing

Run the test suite:

```bash
npm test -- SeverityFilter.test.tsx
```

The component has 31 tests covering:
- ✅ Rendering and layout
- ✅ Selection state management
- ✅ Click interactions
- ✅ Keyboard navigation
- ✅ Disabled state
- ✅ Accessibility attributes
- ✅ Design token compliance
- ✅ Edge cases and lifecycle

#### Integration

Works seamlessly with:
- `useThreatFilters` hook for URL synchronization
- TanStack Query for API filtering
- React Router search params
- Custom state management solutions

#### Design Tokens Used

**Colors**
- `--color-severity-{critical|high|medium|low}`: Button backgrounds when selected
- `--color-text-primary`: Text color (hover state)
- `--color-text-secondary`: Text color (unselected state)
- `--color-bg-secondary`: Background hover color
- `--color-border-default`: Border color (unselected state)
- `--color-border-focus`: Focus ring color

**Spacing**
- `--spacing-gap-sm`: Gap between buttons
- `--spacing-component-xs`: Vertical padding
- `--spacing-component-sm`: Horizontal padding

**Motion**
- `--motion-duration-normal`: Transition duration
- `--motion-ease-default`: Transition easing function

#### Performance

- Memoized callbacks prevent unnecessary re-renders
- No external dependencies beyond React
- Minimal bundle impact (~2KB gzipped)
- No network requests

#### Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Development

### Adding a New Filter Component

1. Create component file: `src/components/threat/filters/NewFilter.tsx`
2. Follow the SeverityFilter pattern for consistency
3. Use design tokens for all styling (NO hardcoded values)
4. Add comprehensive tests: `NewFilter.test.tsx`
5. Create usage examples: `NewFilter.example.tsx`
6. Export from `index.ts`
7. Update this README

### Design Token Requirements

All filter components MUST:
- ❌ **Never use hardcoded colors** (hex, rgb, named colors)
- ❌ **Never use hardcoded spacing** (px, rem, em values)
- ❌ **Never use hardcoded timing** (0.3s, 200ms, etc.)
- ✅ **Always reference CSS custom properties** (`var(--token-name)`)
- ✅ **Use tokens from** `@/styles/tokens/`
- ✅ **Support light and dark themes** automatically

### Code Review Checklist

Before submitting a filter component PR:
- [ ] All design tokens used (no hardcoded values)
- [ ] TypeScript types exported
- [ ] Accessibility tested (keyboard + screen reader)
- [ ] Comprehensive test suite (>90% coverage)
- [ ] Usage examples provided
- [ ] README documentation updated
- [ ] Works with disabled state
- [ ] Focus management implemented
- [ ] ARIA labels appropriate

## References

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Design Tokens Standard](../../../styles/tokens/README.md)
- [Threat Types](../../../types/threat.ts)
- [TanStack Query Docs](https://tanstack.com/query/latest)
