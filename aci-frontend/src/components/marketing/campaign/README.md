# Marketing Campaign Components

A comprehensive set of components for building and managing marketing campaigns in the Marketing Autopilot feature.

## Components

### 1. CampaignBuilder
**Main wizard component** for creating campaigns through a multi-step process.

**Steps:**
1. Goal Selection - Choose campaign objective
2. Channel Selection - Select publishing channels
3. Frequency & Style - Configure posting schedule and content tone
4. Review & Launch - Confirm and create campaign

**Usage:**
```tsx
import { CampaignBuilder } from '@/components/marketing/campaign';

function CreateCampaignPage() {
  const handleSubmit = async (data) => {
    await api.createCampaign(data);
  };

  return (
    <CampaignBuilder
      onSubmit={handleSubmit}
      onCancel={() => navigate('/campaigns')}
    />
  );
}
```

**Props:**
- `onSubmit: (data: CampaignFormData) => void | Promise<void>` - Handler for campaign creation
- `onCancel?: () => void` - Optional cancel handler
- `initialData?: Partial<CampaignFormData>` - Pre-fill form data

---

### 2. GoalSelector
**Visual card selector** for campaign goals.

**Options:**
- Brand Awareness - Increase visibility
- Lead Generation - Capture qualified leads
- Engagement - Build community
- Website Traffic - Drive visitors

**Usage:**
```tsx
import { GoalSelector } from '@/components/marketing/campaign';

<GoalSelector
  value={selectedGoal}
  onChange={(goal) => setGoal(goal)}
/>
```

---

### 3. ChannelPicker
**Multi-select grid** for choosing marketing channels.

**Channels:**
- LinkedIn - B2B professional network
- Twitter/X - Real-time engagement
- Email - Direct communication

Shows connection status for each channel with badges.

**Usage:**
```tsx
import { ChannelPicker } from '@/components/marketing/campaign';

<ChannelPicker
  selected={selectedChannels}
  onChange={(channels) => setChannels(channels)}
/>
```

---

### 4. FrequencySelector
**Frequency selection** with schedule preview.

**Options:**
- Daily - ~20 posts/month
- Weekly - ~4 posts/month
- Bi-weekly - ~8 posts/month
- Monthly - ~1 post/month

**Usage:**
```tsx
import { FrequencySelector } from '@/components/marketing/campaign';

<FrequencySelector
  value={frequency}
  onChange={(freq) => setFrequency(freq)}
/>
```

---

### 5. ContentStyleSelector
**Content tone/style selector** with examples.

**Styles:**
- Thought Leadership - Industry insights
- Product Focused - Features and benefits
- Educational - How-to guides
- Promotional - Offers and launches

**Usage:**
```tsx
import { ContentStyleSelector } from '@/components/marketing/campaign';

<ContentStyleSelector
  value={style}
  onChange={(style) => setStyle(style)}
/>
```

---

### 6. CampaignCard
**Display card** for individual campaigns in list view.

**Features:**
- Status badge (active/paused/draft)
- Channel indicators
- Frequency and style display
- Next post schedule
- Action buttons (edit, pause/resume, delete)

**Usage:**
```tsx
import { CampaignCard } from '@/components/marketing/campaign';

<CampaignCard
  campaign={campaign}
  onEdit={handleEdit}
  onPause={handlePause}
  onResume={handleResume}
  onDelete={handleDelete}
/>
```

---

### 7. CampaignList
**Grid/list container** for campaigns with filtering and search.

**Features:**
- Search by campaign name
- Filter by status (all/active/paused/draft)
- Empty states
- Loading states
- Responsive grid layout

**Usage:**
```tsx
import { CampaignList } from '@/components/marketing/campaign';

<CampaignList
  campaigns={campaigns}
  onCreateCampaign={handleCreate}
  onEditCampaign={handleEdit}
  onPauseCampaign={handlePause}
  onResumeCampaign={handleResume}
  onDeleteCampaign={handleDelete}
  isLoading={isLoading}
/>
```

---

## Design Token Compliance

All components follow the **Fortified Horizon** design system using CSS custom properties:

- **Colors**: `var(--color-brand-primary)`, `var(--color-text-primary)`, etc.
- **Spacing**: `var(--spacing-4)`, `var(--spacing-6)`, etc.
- **Typography**: `var(--typography-font-size-base)`, etc.
- **Motion**: `var(--motion-duration-fast)`, `var(--motion-easing-default)`
- **Borders**: `var(--border-radius-lg)`, `var(--border-width-thin)`

**No hardcoded values** - all styling uses design tokens from `/src/styles/variables.css`

---

## Accessibility

All components include:
- ✅ Semantic HTML elements
- ✅ ARIA labels where appropriate
- ✅ Keyboard navigation support
- ✅ Focus states for interactive elements
- ✅ Screen reader friendly markup

---

## TypeScript Types

All components are fully typed with exported interfaces:

```tsx
import type {
  CampaignFormData,
  CampaignGoal,
  Channel,
  Frequency,
  ContentStyle,
  Campaign,
} from '@/components/marketing/campaign';
```

---

## Integration with API

### Expected API Endpoints

```typescript
// Create campaign
POST /api/campaigns
Body: CampaignFormData

// List campaigns
GET /api/campaigns
Response: Campaign[]

// Update campaign
PUT /api/campaigns/:id
Body: Partial<Campaign>

// Pause/Resume campaign
PATCH /api/campaigns/:id/status
Body: { status: 'active' | 'paused' }

// Delete campaign
DELETE /api/campaigns/:id
```

### Example Integration

```tsx
import { useMutation, useQuery } from '@tanstack/react-query';
import { CampaignList } from '@/components/marketing/campaign';

function CampaignsPage() {
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.getCampaigns(),
  });

  const pauseMutation = useMutation({
    mutationFn: (id: string) => api.pauseCampaign(id),
    onSuccess: () => queryClient.invalidateQueries(['campaigns']),
  });

  return (
    <CampaignList
      campaigns={campaigns ?? []}
      isLoading={isLoading}
      onPauseCampaign={(campaign) => pauseMutation.mutate(campaign.id)}
      // ... other handlers
    />
  );
}
```

---

## File Structure

```
src/components/marketing/campaign/
├── CampaignBuilder.tsx       # Main wizard
├── GoalSelector.tsx           # Goal selection step
├── ChannelPicker.tsx          # Channel selection step
├── FrequencySelector.tsx      # Frequency selector
├── ContentStyleSelector.tsx   # Style selector
├── CampaignCard.tsx           # Individual campaign card
├── CampaignList.tsx           # Campaign list container
├── index.ts                   # Exports
└── README.md                  # This file
```

---

## Dependencies

- `react` - Component framework
- `react-hook-form` - Form state management
- `lucide-react` - Icons
- `@/components/ui/*` - shadcn/ui components
  - Card, CardContent, CardHeader, etc.
  - Button
  - Badge

---

## Future Enhancements

- [ ] Add campaign analytics preview
- [ ] Support custom posting schedules
- [ ] Add campaign templates
- [ ] Implement A/B testing configuration
- [ ] Add performance metrics to cards
- [ ] Support campaign duplication
- [ ] Add bulk actions for campaigns
