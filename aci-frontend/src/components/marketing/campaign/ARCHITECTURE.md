# Campaign Components Architecture

## Component Hierarchy

```
CampaignList (Container)
├── Search Input
├── Filter Tabs (all/active/paused/draft)
├── Create Campaign Button
└── CampaignCard[] (Grid)
    ├── Campaign Header
    │   ├── Title
    │   ├── Status Badge
    │   └── Goal Badge
    ├── Campaign Details
    │   ├── Channels (Badges)
    │   ├── Frequency
    │   ├── Content Style
    │   └── Next Post (if active)
    └── Action Buttons
        ├── Edit
        ├── Pause/Resume
        └── Delete

CampaignBuilder (Wizard)
├── Progress Indicator
├── Step Navigation
└── Step Content
    ├── Step 1: GoalSelector
    │   ├── Awareness Card
    │   ├── Leads Card
    │   ├── Engagement Card
    │   └── Traffic Card
    ├── Step 2: ChannelPicker
    │   ├── LinkedIn Card (with status)
    │   ├── Twitter Card (with status)
    │   └── Email Card (with status)
    ├── Step 3: Frequency & Style
    │   ├── FrequencySelector
    │   │   ├── Daily
    │   │   ├── Weekly
    │   │   ├── Bi-weekly
    │   │   └── Monthly
    │   └── ContentStyleSelector
    │       ├── Thought Leadership
    │       ├── Product Focused
    │       ├── Educational
    │       └── Promotional
    └── Step 4: Review
        ├── Campaign Name Input
        └── Summary Panel
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     CampaignBuilder                         │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ GoalSelector │→ │ChannelPicker │→ │FrequencySelector│  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────────────────┐   │
│  │ContentStyleSelect│→ │    Review & Submit           │   │
│  └──────────────────┘  └──────────────────────────────┘   │
│                                 ↓                           │
│                        CampaignFormData                     │
└────────────────────────────┬────────────────────────────────┘
                             ↓
                      ┌──────────────┐
                      │  onSubmit()  │
                      └──────┬───────┘
                             ↓
                      ┌──────────────┐
                      │  API Client  │
                      └──────┬───────┘
                             ↓
                      POST /api/campaigns
                             ↓
                      ┌──────────────┐
                      │   Backend    │
                      └──────┬───────┘
                             ↓
                      ┌──────────────┐
                      │  Database    │
                      └──────────────┘
```

## State Management

### CampaignBuilder State
```typescript
// Form state managed by react-hook-form
{
  goal: CampaignGoal | null,
  channels: string[],
  frequency: Frequency | null,
  contentStyle: ContentStyle | null,
  name: string
}

// UI state (local)
{
  currentStep: number,
  isSubmitting: boolean
}
```

### CampaignList State
```typescript
// Server state (TanStack Query)
{
  campaigns: Campaign[],
  isLoading: boolean,
  error: Error | null
}

// UI state (local)
{
  searchQuery: string,
  filterStatus: 'all' | 'active' | 'paused' | 'draft'
}
```

## Component Props Interface

### CampaignBuilder
```typescript
interface CampaignBuilderProps {
  onSubmit: (data: CampaignFormData) => void | Promise<void>;
  onCancel?: () => void;
  initialData?: Partial<CampaignFormData>;
}
```

### CampaignList
```typescript
interface CampaignListProps {
  campaigns: Campaign[];
  onCreateCampaign?: () => void;
  onEditCampaign?: (campaign: Campaign) => void;
  onPauseCampaign?: (campaign: Campaign) => void;
  onResumeCampaign?: (campaign: Campaign) => void;
  onDeleteCampaign?: (campaign: Campaign) => void;
  isLoading?: boolean;
}
```

### Individual Selectors
```typescript
interface GoalSelectorProps {
  value: CampaignGoal | null;
  onChange: (goal: CampaignGoal) => void;
}

interface ChannelPickerProps {
  selected: string[];
  onChange: (channels: string[]) => void;
}

interface FrequencySelectorProps {
  value: Frequency | null;
  onChange: (frequency: Frequency) => void;
}

interface ContentStyleSelectorProps {
  value: ContentStyle | null;
  onChange: (style: ContentStyle) => void;
}

interface CampaignCardProps {
  campaign: Campaign;
  onEdit?: (campaign: Campaign) => void;
  onPause?: (campaign: Campaign) => void;
  onResume?: (campaign: Campaign) => void;
  onDelete?: (campaign: Campaign) => void;
}
```

## Styling Strategy

### Design System Usage
All components use **CSS custom properties** exclusively:

```typescript
// Example from CampaignCard
<div style={{
  padding: 'var(--spacing-6)',
  borderRadius: 'var(--border-radius-lg)',
  background: 'var(--gradient-card)',
  color: 'var(--color-text-primary)',
  fontSize: 'var(--typography-font-size-base)',
  transition: `all var(--motion-duration-fast) var(--motion-easing-default)`,
}}>
```

### Responsive Grid
```typescript
// Auto-fit grid with minimum 350px columns
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
  gap: 'var(--spacing-6)',
}}>
```

### Interactive States
```typescript
// Hover states
onMouseEnter={(e) => {
  e.currentTarget.style.color = 'var(--color-brand-primary)';
}}

// Focus states
onFocus={(e) => {
  e.target.style.borderColor = 'var(--color-border-focus)';
  e.target.style.outline = 'none';
}}

// Selected states
style={{
  borderColor: isSelected 
    ? 'var(--color-brand-primary)' 
    : 'var(--color-border-default)',
  transform: isSelected ? 'scale(1.02)' : 'scale(1)',
}}
```

## API Integration Pattern

### TanStack Query Setup
```typescript
// Queries
const { data: campaigns, isLoading } = useQuery({
  queryKey: ['campaigns'],
  queryFn: () => api.getCampaigns(),
});

// Mutations
const createMutation = useMutation({
  mutationFn: (data: CampaignFormData) => api.createCampaign(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
  },
});

const pauseMutation = useMutation({
  mutationFn: (id: string) => api.pauseCampaign(id),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
  },
});
```

### Expected API Endpoints
```
GET    /api/campaigns              - List campaigns
POST   /api/campaigns              - Create campaign
GET    /api/campaigns/:id          - Get campaign
PUT    /api/campaigns/:id          - Update campaign
PATCH  /api/campaigns/:id/status   - Change status
DELETE /api/campaigns/:id          - Delete campaign
```

## Error Handling

### Form Validation
```typescript
// Step-level validation
const isStepValid = (step: number): boolean => {
  switch (step) {
    case 0: return formData.goal !== null;
    case 1: return formData.channels.length > 0;
    case 2: return formData.frequency !== null && formData.contentStyle !== null;
    case 3: return formData.name.trim().length > 0;
    default: return false;
  }
};
```

### API Error Handling
```typescript
// In mutation
onError: (error) => {
  toast.error(`Failed to create campaign: ${error.message}`);
},

// In component
if (error) {
  return <ErrorState message={error.message} />;
}
```

## Accessibility Features

### Keyboard Navigation
- All buttons are keyboard accessible
- Tab order follows logical flow
- Enter/Space to activate buttons
- Arrow keys for selection (future enhancement)

### Screen Reader Support
- Semantic HTML elements
- Descriptive labels
- Status announcements for state changes
- Progress indicator text

### Focus Management
- Clear focus indicators
- Focus trap in wizard (optional)
- Focus restoration on step navigation

## Performance Considerations

### Optimization Strategies
1. **Memoization**: Use `React.memo` for card components
2. **Virtual Scrolling**: For large campaign lists (future)
3. **Lazy Loading**: Load wizard steps on demand (future)
4. **Debounced Search**: Delay search API calls

### Bundle Size
- Component bundle: ~50KB (estimated)
- Dependencies: react-hook-form (~20KB), lucide-react (~10KB)
- Total: ~80KB

## Testing Strategy

### Unit Tests
- Form validation logic
- Step navigation logic
- Filter/search logic

### Integration Tests
- Complete wizard flow
- Campaign CRUD operations
- Search and filter functionality

### E2E Tests (MANDATORY Deep Testing)
- Create campaign with API verification
- Edit campaign with persistence check
- Pause/resume campaign with status update
- Delete campaign with removal verification
- Search campaigns
- Filter by status

See `COMPONENT_SUMMARY.md` for detailed E2E test examples.
