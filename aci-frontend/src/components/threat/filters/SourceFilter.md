# SourceFilter Component

Multi-select dropdown filter for threat intelligence sources.

## Features

- ✅ **Multi-select**: Select multiple sources with checkboxes
- ✅ **Dynamic list**: Accepts any list of sources via `availableSources` prop
- ✅ **Bulk actions**: "Select All" and "Clear" buttons
- ✅ **Selected count**: Shows count in button label: "Sources (2)"
- ✅ **Visual feedback**: Selected sources shown as badges in footer
- ✅ **Keyboard accessible**: Space/Enter to toggle, Escape to close
- ✅ **Click outside**: Automatically closes when clicking outside
- ✅ **Dark theme**: Uses design tokens for theming
- ✅ **ARIA compliant**: Proper roles, labels, and states

## Usage

```tsx
import { SourceFilter } from '@/components/threat/filters';

function ThreatDashboard() {
  const [sources, setSources] = useState<string[]>([]);

  return (
    <SourceFilter
      value={sources}
      onChange={setSources}
      availableSources={['cisa', 'cert-in', 'mitre', 'nist']}
    />
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `value` | `readonly string[]` | Yes | Currently selected source identifiers |
| `onChange` | `(sources: string[]) => void` | Yes | Callback when selection changes |
| `availableSources` | `readonly string[]` | Yes | Available sources to choose from |
| `disabled` | `boolean` | No | Disable the filter (default: `false`) |

## Design Tokens

All colors, spacing, and transitions use CSS variables from the design token system:

- `--color-primary`, `--color-accent`: Colors
- `--ring`: Focus ring
- `--border`, `--input`: Borders
- `--popover`, `--popover-foreground`: Dropdown colors
- `--muted`, `--muted-foreground`: Muted text

**No hardcoded values** - fully theme-able via CSS variables.

## Source Formatting

Source identifiers are automatically formatted for display:
- `cisa` → `CISA`
- `cert-in` → `CERT IN`
- `us-cert` → `US CERT`

## Keyboard Navigation

- **Tab**: Focus the dropdown button
- **Space/Enter**: Open/close dropdown
- **Space/Enter** (on option): Toggle source selection
- **Escape**: Close dropdown and return focus to button
- **Tab** (inside dropdown): Navigate through options

## Accessibility

- ARIA roles: `button`, `listbox`, `option`
- ARIA attributes: `aria-haspopup`, `aria-expanded`, `aria-selected`, `aria-label`
- Keyboard navigable throughout
- Screen reader friendly labels
- Focus management with visible indicators

## Testing

Comprehensive test suite covers:
- Rendering with different states
- Dropdown open/close behavior
- Source selection/deselection
- Keyboard navigation (Space, Enter, Escape)
- "Select All" / "Clear" actions
- Badge removal
- Empty state
- Disabled state
- Accessibility attributes

Run tests:
```bash
npm test -- SourceFilter
```

## Examples

See `SourceFilter.example.tsx` for:
- Basic usage
- Pre-selected sources
- Disabled state
- Empty state
- Dashboard integration
- URL state synchronization
- Performance optimization with memoization
- TanStack Query integration

## File Structure

```
src/components/threat/filters/
├── SourceFilter.tsx           # Component implementation
├── SourceFilter.example.tsx   # Usage examples
├── SourceFilter.md            # This documentation
└── index.ts                   # Barrel export
```

## Performance Considerations

- **Memoization**: Consider wrapping `onChange` with `React.useCallback`
- **Available sources**: Memoize `availableSources` if computed
- **Debouncing**: If triggering API calls, debounce the onChange handler
- **Virtual scrolling**: Not needed for typical source lists (<50 items)

## Integration Points

### With TanStack Query

```tsx
const { data: sources = [] } = useQuery({
  queryKey: ['threat-sources'],
  queryFn: fetchSources,
});

<SourceFilter
  value={selectedSources}
  onChange={setSelectedSources}
  availableSources={sources}
/>
```

### With React Router

```tsx
const [searchParams, setSearchParams] = useSearchParams();

const sources = searchParams.get('sources')?.split(',') ?? [];

const handleChange = (sources: string[]) => {
  setSearchParams(prev => {
    if (sources.length > 0) {
      prev.set('sources', sources.join(','));
    } else {
      prev.delete('sources');
    }
    return prev;
  });
};
```

### With Zustand

```tsx
const selectedSources = useFilterStore(state => state.sources);
const setSources = useFilterStore(state => state.setSources);

<SourceFilter
  value={selectedSources}
  onChange={setSources}
  availableSources={availableSources}
/>
```

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Touch-friendly

## Future Enhancements

Potential improvements for future iterations:

- [ ] Search/filter within sources list
- [ ] Grouped sources (e.g., by region)
- [ ] Custom source icons/badges
- [ ] Virtualized list for 100+ sources
- [ ] Drag-to-reorder selected sources
- [ ] Preset groups (e.g., "US Only", "All Government")

## Related Components

- `CategoryFilter`: Similar single-select filter
- `SeverityFilter`: Severity level filter
- `DateRangeFilter`: Date range picker
- `SearchInput`: Text search input
