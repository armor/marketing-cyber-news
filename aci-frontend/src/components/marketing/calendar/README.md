# Content Calendar Components

Full-featured content calendar implementation using react-big-calendar with newsletter scheduling capabilities.

## Components

### CalendarView
Main calendar component with monthly/weekly/daily views.

**Features:**
- Monthly, weekly, and daily view modes
- Color-coded events by status (draft, pending_approval, approved, scheduled, sent, failed)
- Click events to view details
- Click days to see all events for that date
- Custom styling using design tokens
- Responsive layout

**Props:**
```typescript
interface CalendarViewProps {
  selectedStatuses?: IssueStatus[];    // Filter by status
  selectedConfigId?: string;           // Filter by newsletter configuration
}
```

**Usage:**
```tsx
import { CalendarView } from '@/components/marketing/calendar/CalendarView';

<CalendarView
  selectedStatuses={['scheduled', 'approved']}
  selectedConfigId="config-123"
/>
```

### CalendarEntry
Custom event component for week/day views showing detailed event information.

**Displays:**
- Newsletter title (subject line)
- Status indicator (colored bar)
- Channel icon (email)
- Content preview (first 2 block titles)
- Status badge

**Variant:**
- `CalendarEntry`: Full details for week/day views
- `CalendarEntryMinimal`: Compact for month view (title + status dot)

### CalendarFilters
Filter controls for calendar events.

**Features:**
- Multi-select status filter (draft, pending_approval, approved, scheduled, sent, failed)
- Newsletter configuration/campaign filter
- Active filter chips with remove buttons
- Clear all filters button
- Filter count badge

**Props:**
```typescript
interface CalendarFiltersProps {
  selectedStatuses: IssueStatus[];
  onStatusChange: (statuses: IssueStatus[]) => void;
  selectedConfigId?: string;
  onConfigChange: (configId?: string) => void;
  configurations?: Array<{ id: string; name: string }>;
}
```

**Usage:**
```tsx
import { CalendarFilters } from '@/components/marketing/calendar/CalendarFilters';

const [selectedStatuses, setSelectedStatuses] = useState<IssueStatus[]>([]);
const [selectedConfigId, setSelectedConfigId] = useState<string>();

<CalendarFilters
  selectedStatuses={selectedStatuses}
  onStatusChange={setSelectedStatuses}
  selectedConfigId={selectedConfigId}
  onConfigChange={setSelectedConfigId}
  configurations={configurations}
/>
```

### DayDetail
Sidebar panel showing all events for a selected day.

**Features:**
- Sheet overlay with event list
- Event cards with full details
- Click event to navigate to newsletter preview
- Time display for each event
- Recipient count
- Empty state for days with no events

**Props:**
```typescript
interface DayDetailProps {
  date: Date | null;
  events: CalendarEvent[];
  isOpen: boolean;
  onClose: () => void;
}
```

## Hooks

### useCalendar
Fetch and transform newsletter issues into calendar events.

**Features:**
- Automatic transformation of newsletter issues to calendar events
- Date range filtering
- Configuration filtering
- Status filtering
- Auto-refresh every 5 minutes

**Usage:**
```tsx
import { useCalendar } from '@/hooks/useCalendar';

const { data: events, isLoading } = useCalendar({
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
  configurationId: 'config-123',
  status: ['scheduled', 'approved'],
});
```

### useCalendarDay
Convenience hook for fetching events for a specific day.

**Usage:**
```tsx
import { useCalendarDay } from '@/hooks/useCalendar';

const { events, isLoading } = useCalendarDay(new Date());
```

### useCalendarMutations
Mutation hooks for calendar event actions.

**Methods:**
- `reschedule`: Update scheduled_for date of a newsletter issue
- `deleteEvent`: Delete a newsletter issue

**Usage:**
```tsx
import { useCalendarMutations } from '@/hooks/useCalendarMutations';

const { reschedule, deleteEvent } = useCalendarMutations();

// Reschedule an event
reschedule.mutate({
  issueId: 'issue-123',
  newDate: new Date('2025-02-15'),
});

// Delete an event
deleteEvent.mutate('issue-123');
```

## Pages

### CalendarPage
Full calendar page with header, filters, and calendar view.

**Features:**
- Page header with title and "Create Newsletter" button
- Integrated filters (status + configuration)
- Full-height calendar view
- Default filters: scheduled + approved issues

**Route:** `/calendar`

**Usage:**
```tsx
import { CalendarPage } from '@/pages/CalendarPage';

// In routing configuration
<Route path="/calendar" element={<CalendarPage />} />
```

## Data Flow

```
Newsletter Issues (API)
         ↓
  useCalendar hook
         ↓
Transform to CalendarEvent format
         ↓
   CalendarView component
         ↓
Display with react-big-calendar
```

### CalendarEvent Type
```typescript
interface CalendarEvent {
  id: string;
  title: string;           // Newsletter subject line
  start: Date;            // Scheduled date/time
  end: Date;              // Start + 1 hour
  resource: {
    issue: NewsletterIssue;
    status: IssueStatus;
    channel: string;      // "Email"
    contentPreview: string; // First 2 block titles
  };
}
```

## Styling

All components use CSS design tokens from `/src/styles/variables.css`:

**Colors:**
- `--color-brand-primary`: Primary brand color
- `--color-bg-elevated`: Card backgrounds
- `--color-border-default`: Borders
- `--color-text-primary`: Primary text
- Status colors: `--color-critical`, `--color-warning`, `--color-success`

**Spacing:**
- `--spacing-*`: Consistent spacing scale
- `--spacing-component-*`: Component-specific spacing

**Typography:**
- `--typography-font-size-*`: Font size scale
- `--typography-font-weight-*`: Font weights

**Shadows:**
- `--shadow-card`: Card shadows
- `--shadow-md`: Medium elevation

**Motion:**
- `--motion-duration-fast`: Quick transitions (150ms)
- `--motion-easing-default`: Standard easing curve

## Status Color Mapping

| Status | Color Variable | Description |
|--------|---------------|-------------|
| draft | `--color-text-muted` | Muted gray |
| pending_approval | `--color-warning` | Warning orange |
| approved | `--color-success` | Success green |
| scheduled | `--color-brand-primary` | Primary blue |
| sent | `--color-text-secondary` | Secondary gray |
| failed | `--color-critical` | Error red |

## Future Enhancements

### Drag-and-Drop Rescheduling
To enable drag-and-drop rescheduling, install the react-big-calendar DnD addon:

```bash
npm install react-big-calendar react-dnd react-dnd-html5-backend
```

Then wrap the Calendar component with DnD context:

```tsx
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

const DnDCalendar = withDragAndDrop(Calendar);

// In component:
<DndProvider backend={HTML5Backend}>
  <DnDCalendar
    onEventDrop={handleEventDrop}
    onEventResize={handleEventResize}
    draggableAccessor={() => true}
    resizable
  />
</DndProvider>
```

### Recurring Events
Add support for recurring newsletter schedules (weekly, monthly).

### Timezone Support
Display events in user's local timezone with timezone selector.

### Multi-day Events
Support multi-day campaigns spanning multiple dates.

### Export/Import
Export calendar to iCal format for external calendar apps.

## Accessibility

- Keyboard navigation supported
- ARIA labels on all interactive elements
- Focus management for modals/sheets
- Screen reader friendly event labels
- Color contrast meets WCAG AA standards

## Performance

- Lazy loading with React.lazy
- Query caching with TanStack Query (5 min stale time)
- Auto-refresh every 5 minutes
- Optimized re-renders with useMemo/useCallback
- Virtual scrolling in day detail sidebar

## Testing

Test checklist for calendar features:

- [ ] Events display correctly in all views (month/week/day)
- [ ] Status filters work correctly
- [ ] Configuration filter works correctly
- [ ] Click event opens day detail sidebar
- [ ] Click day opens day detail sidebar
- [ ] Day detail displays all events for selected date
- [ ] Event click in day detail navigates to preview page
- [ ] Empty states display correctly
- [ ] Loading states display correctly
- [ ] Events are color-coded by status
- [ ] Date navigation works (prev/next/today)
- [ ] View toggle works (month/week/day)
- [ ] Auto-refresh updates calendar every 5 minutes
