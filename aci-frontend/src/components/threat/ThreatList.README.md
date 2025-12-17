# ThreatList Component

Container component that renders a list of threat cards with loading, error, and empty states.

## Features

- ✅ Displays list of ThreatSummary items as cards
- ✅ Loading state with animated skeleton cards
- ✅ Empty state with icon and customizable message
- ✅ Responsive layout (full width mobile, max-width desktop)
- ✅ Smooth transitions between states
- ✅ Keyboard accessible (tab navigation, Enter/Space activation)
- ✅ ARIA labels for screen readers
- ✅ Design token-based styling (no hardcoded values)
- ✅ Click handler for threat selection
- ✅ Bookmark toggle handler

## Props

```typescript
interface ThreatListProps {
  readonly threats: readonly ThreatSummary[];
  readonly isLoading?: boolean;
  readonly onThreatSelect?: (threatId: string) => void;
  readonly onBookmarkToggle?: (threatId: string) => void;
  readonly emptyMessage?: string;
}
```

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `threats` | `ThreatSummary[]` | Yes | - | Array of threat summaries to display |
| `isLoading` | `boolean` | No | `false` | Shows loading skeleton when true |
| `onThreatSelect` | `(id: string) => void` | No | - | Callback when threat card is clicked |
| `onBookmarkToggle` | `(id: string) => void` | No | - | Callback when bookmark button is clicked |
| `emptyMessage` | `string` | No | `"No threats found"` | Message shown in empty state |

## Usage

### Basic Usage

```tsx
import { ThreatList } from '@/components/threat';
import type { ThreatSummary } from '@/types/threat';

function ThreatsPage() {
  const [threats, setThreats] = useState<ThreatSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  return (
    <ThreatList
      threats={threats}
      isLoading={isLoading}
    />
  );
}
```

### With Event Handlers

```tsx
import { ThreatList } from '@/components/threat';
import { useNavigate } from 'react-router-dom';

function ThreatsPage() {
  const navigate = useNavigate();
  const { toggleBookmark } = useBookmarks();

  return (
    <ThreatList
      threats={threats}
      onThreatSelect={(id) => navigate(`/threats/${id}`)}
      onBookmarkToggle={(id) => toggleBookmark(id)}
    />
  );
}
```

### With Custom Empty Message

```tsx
<ThreatList
  threats={[]}
  emptyMessage="No critical threats found in the last 24 hours"
/>
```

### With TanStack Query

```tsx
import { useQuery } from '@tanstack/react-query';
import { ThreatList } from '@/components/threat';
import { fetchThreats } from '@/services/threatService';

function ThreatsPage() {
  const { data: threats = [], isLoading } = useQuery({
    queryKey: ['threats'],
    queryFn: fetchThreats,
  });

  return (
    <ThreatList
      threats={threats}
      isLoading={isLoading}
      onThreatSelect={(id) => navigate(`/threats/${id}`)}
    />
  );
}
```

## States

### Loading State

Shows 3 animated skeleton cards with pulse effect:

```tsx
<ThreatList
  threats={[]}
  isLoading={true}
/>
```

### Empty State

Shows EmptyState component with icon and message:

```tsx
<ThreatList
  threats={[]}
  isLoading={false}
  emptyMessage="No threats match your filters"
/>
```

### Populated State

Renders ThreatCard for each threat with:
- Severity badge (color-coded)
- Category label
- Title (clickable)
- Summary (2-line clamp)
- Metadata (source, published date)
- CVE count (if applicable)
- Bookmark button

## Subcomponents

### ThreatCard (Internal)

**Note:** This is a placeholder implementation within ThreatList.tsx. It should be replaced with a dedicated ThreatCard component once created.

Features:
- Severity badge with color from design tokens
- Category display with proper formatting
- Clickable card with hover effects
- Bookmark toggle (stopPropagation to prevent card click)
- Relative time formatting ("2h ago", "3d ago")
- CVE count display with Shield icon
- Keyboard accessible (Enter/Space)
- Focus styles with ring

### ThreatCardSkeleton (Internal)

Animated loading skeleton that matches ThreatCard dimensions:
- Header skeleton (severity + category)
- Title skeleton
- Summary text lines
- Footer metadata skeleton
- Pulse animation via Tailwind

## Accessibility

- ✅ **Keyboard Navigation**: Tab through cards, Enter/Space to activate
- ✅ **ARIA Labels**:
  - `role="feed"` on list container
  - `role="button"` on cards
  - `aria-label` on cards with threat title
  - `aria-busy` for loading state
  - `aria-pressed` for bookmark toggle
- ✅ **Screen Reader Support**: All interactive elements have labels
- ✅ **Focus Management**: Visible focus rings on all interactive elements

## Design Tokens Used

### Colors
- `--color-bg-elevated`: Card background
- `--color-bg-secondary`: Skeleton background
- `--color-border-default`: Card border
- `--color-brand-primary`: Focus rings, hover states
- `--color-text-primary`: Title text
- `--color-text-secondary`: Summary, metadata text
- `--color-text-muted`: Muted metadata
- `--color-severity-critical/high/medium/low`: Severity badges

### Spacing
- `--spacing-component-lg`: Card padding
- `--spacing-component-sm`: Small gaps
- `--spacing-component-md`: Medium gaps
- `--spacing-gap-md`: Gap between cards
- `--spacing-gap-sm`: Small inline gaps

### Motion
- `--motion-duration-fast`: Transitions (150ms)
- `--motion-easing-default`: Easing function

### Typography
- `--typography-font-weight-semibold`: Title, badges
- `--typography-font-weight-medium`: Category
- `--typography-line-height-tight`: Title
- `--typography-line-height-normal`: Summary
- `--typography-letter-spacing-wide`: Badges

### Shadows
- `--shadow-sm`: Card default shadow
- `--shadow-md`: Card hover shadow

## Responsive Behavior

- **Mobile (< 768px)**: Full width with container padding
- **Desktop (≥ 768px)**: Max-width 896px (4xl), centered with margin auto

## Performance Considerations

- **No virtualization in MVP**: Lists are limited to ~20 items per page
- **Smooth transitions**: All state changes use CSS transitions
- **Optimized re-renders**: Uses readonly props to prevent mutations

## Testing

Component includes:
- `data-testid="threat-list"` for testing
- `data-testid="threat-card"` for individual cards
- ARIA labels for accessibility testing

Example test:

```tsx
import { render, screen } from '@testing-library/react';
import { ThreatList } from './ThreatList';

test('renders loading state', () => {
  render(<ThreatList threats={[]} isLoading={true} />);
  expect(screen.getByLabelText('Loading threats')).toBeInTheDocument();
});

test('renders empty state', () => {
  render(<ThreatList threats={[]} emptyMessage="No threats" />);
  expect(screen.getByText('No threats')).toBeInTheDocument();
});

test('renders threat cards', () => {
  const threats = [mockThreat1, mockThreat2];
  render(<ThreatList threats={threats} />);
  expect(screen.getAllByTestId('threat-card')).toHaveLength(2);
});
```

## Future Enhancements

- [ ] Extract ThreatCard into separate component
- [ ] Add virtualization for lists > 100 items
- [ ] Add sort controls (date, severity, etc.)
- [ ] Add bulk selection mode
- [ ] Add drag-and-drop reordering
- [ ] Add export functionality (CSV, JSON)
- [ ] Add share functionality
- [ ] Add filtering UI within component

## Related Components

- `EmptyState` - Used for empty state display
- `ThreatCard` - (To be created) Individual threat card
- `SeverityBadge` - (Available) Dedicated severity badge component
- Filter components - Category, Severity, Source, DateRange filters

## Notes

1. **ThreatCard Placeholder**: Current implementation includes an inline ThreatCard. This should be extracted to a dedicated component file once the design is finalized.

2. **Color-mix Function**: Uses CSS `color-mix()` for severity badge backgrounds. Fallback for older browsers is solid background color.

3. **Date Formatting**: Implements relative time formatting ("2h ago"). For absolute dates beyond 7 days, uses locale-aware formatting.

4. **CVE Display**: Shows count only (not full CVE list). Detail view shows full CVE information.

5. **Bookmark State**: Component is controlled - parent must manage bookmark state and pass updated threats array.
