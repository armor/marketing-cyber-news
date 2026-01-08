# Brand Center Components

Complete brand voice training and management system for AI-powered newsletter generation.

## Overview

The Brand Center provides a comprehensive interface for training and managing brand voice for AI-generated content. It includes document upload, content training, terminology control, and enforcement settings.

## Components

### BrandCenter

Main dashboard component with health overview, quick actions, and tabbed sections.

**Props:**
- `brandVoiceId: string` - Unique identifier for the brand voice configuration

**Features:**
- Brand health score display
- Quick stats (documents, examples, terms)
- Quick action buttons
- Tabbed navigation (Voice Training, Terminology, Settings)

**Usage:**
```tsx
import { BrandCenter } from '@/components/marketing/brand';

function BrandPage() {
  return <BrandCenter brandVoiceId="my-brand-id" />;
}
```

---

### BrandHealthScore

Circular progress indicator showing brand voice health (0-100) with category breakdown.

**Props:**
- `brandVoiceId: string` - Brand voice ID
- `overallScore: number` - Health score (0-100)

**Features:**
- Animated circular progress indicator
- Color-coded score levels (green 80+, orange 60-79, red <60)
- Category breakdown (examples, guidelines, terminology)
- Contextual recommendations

**Usage:**
```tsx
import { BrandHealthScore } from '@/components/marketing/brand';

function HealthWidget() {
  return <BrandHealthScore brandVoiceId="my-brand" overallScore={78} />;
}
```

---

### AssetUploader

Drag-and-drop file upload for brand documents (PDF, DOCX, TXT).

**Props:**
- `brandVoiceId: string` - Brand voice ID

**Features:**
- Drag-and-drop zone with visual feedback
- File validation (type, size)
- Upload progress tracking
- Multiple file support
- Success/error status display

**Accepted Files:**
- PDF (.pdf)
- Word Documents (.docx)
- Text Files (.txt)
- Max size: 10MB

**Usage:**
```tsx
import { AssetUploader } from '@/components/marketing/brand';

function UploadSection() {
  return <AssetUploader brandVoiceId="my-brand" />;
}
```

---

### ContentTrainer

Interface for pasting content examples with quality scores.

**Props:**
- `brandVoiceId: string` - Brand voice ID

**Features:**
- Large textarea for content input
- Quality score slider (1-10)
- Optional source tracking
- Word/character count
- Success feedback animation
- Helpful tips section

**Usage:**
```tsx
import { ContentTrainer } from '@/components/marketing/brand';

function TrainingSection() {
  return <ContentTrainer brandVoiceId="my-brand" />;
}
```

**Best Practices:**
- Use complete paragraphs (50-500 words ideal)
- Score 8-10 for perfect brand voice examples
- Include diverse content types (technical, conversational, educational)

---

### TerminologyEditor

Two-column editor for managing approved and banned terms.

**Props:**
- `brandVoiceId: string` - Brand voice ID
- `approvedTerms: readonly string[]` - List of approved terms
- `bannedTerms: readonly BannedTerm[]` - List of banned terms with replacements

**Features:**
- Separate lists for approved and banned terms
- Optional replacement suggestions for banned terms
- Quick add/remove functionality
- Real-time updates
- Visual term counts

**Usage:**
```tsx
import { TerminologyEditor } from '@/components/marketing/brand';

function TermsSection({ approvedTerms, bannedTerms }) {
  return (
    <TerminologyEditor
      brandVoiceId="my-brand"
      approvedTerms={approvedTerms}
      bannedTerms={bannedTerms}
    />
  );
}
```

**BannedTerm Type:**
```typescript
interface BannedTerm {
  readonly term: string;
  readonly replacement?: string;
  readonly reason?: string;
}
```

---

### StrictnessSlider

Settings component for brand voice enforcement level and auto-correct.

**Props:**
- `brandVoiceId: string` - Brand voice ID
- `initialStrictness: number` - Initial strictness level (0-100)
- `initialAutoCorrect: boolean` - Initial auto-correct setting

**Features:**
- Visual strictness levels with color coding
- Interactive slider (0-100%)
- Auto-correct toggle switch
- Contextual explanations for each level
- Unsaved changes indicator
- Save functionality

**Strictness Levels:**
- **Lenient (0-39%)**: Minimal enforcement, maximum flexibility
- **Moderate (40-59%)**: Suggestions provided, not enforced
- **Strict (60-79%)**: Major deviations flagged
- **Very Strict (80-100%)**: Exact brand voice matching required

**Usage:**
```tsx
import { StrictnessSlider } from '@/components/marketing/brand';

function SettingsSection() {
  return (
    <StrictnessSlider
      brandVoiceId="my-brand"
      initialStrictness={75}
      initialAutoCorrect={true}
    />
  );
}
```

---

## Hooks

### useBrandStore

TanStack Query hooks for fetching brand voice data.

**Available Hooks:**
- `useBrandVoice({ id, enabled? })` - Fetch brand voice configuration
- `useBrandHealth({ id, enabled? })` - Fetch health breakdown
- `useBrandAssets({ id, enabled? })` - Fetch uploaded assets
- `useContentExamples({ id, enabled? })` - Fetch training examples

**Usage:**
```tsx
import { useBrandVoice, useBrandHealth } from '@/hooks/useBrandStore';

function MyComponent() {
  const { data: brand, isLoading } = useBrandVoice({ id: 'my-brand' });
  const { data: health } = useBrandHealth({ id: 'my-brand' });

  // Use data...
}
```

---

### useBrandMutations

TanStack Query mutations for brand voice operations.

**Available Mutations:**
- `useUploadAsset()` - Upload brand document
- `useCreateExample()` - Add content training example
- `useUpdateTerminology()` - Update approved/banned terms
- `useUpdateBrandSettings()` - Update strictness/auto-correct

**Usage:**
```tsx
import { useUploadAsset, useCreateExample } from '@/hooks/useBrandMutations';

function MyComponent() {
  const uploadMutation = useUploadAsset();
  const exampleMutation = useCreateExample();

  const handleUpload = (file: File) => {
    uploadMutation.mutate({
      brandVoiceId: 'my-brand',
      file,
    });
  };

  const handleAddExample = (content: string) => {
    exampleMutation.mutate({
      brandVoiceId: 'my-brand',
      request: {
        content,
        quality_score: 8,
      },
    });
  };
}
```

---

## Types

All types are defined in `/src/types/brand.ts`:

**Core Types:**
- `BrandVoice` - Main brand voice configuration
- `BrandHealthBreakdown` - Health score by category
- `BrandAsset` - Uploaded document
- `ContentExample` - Training example
- `BannedTerm` - Banned term with replacement

**Request Types:**
- `CreateBrandVoiceRequest`
- `UpdateBrandVoiceRequest`
- `UploadAssetRequest`
- `CreateExampleRequest`
- `AddTerminologyRequest`

---

## Design Tokens

All components use CSS custom properties from `/src/styles/variables.css`:

**No hardcoded values allowed:**
- ❌ `color: #3b82f6`
- ✅ `color: var(--color-brand-primary)`

**Token Categories:**
- Colors: `--color-*`
- Spacing: `--spacing-*`
- Typography: `--typography-*`
- Motion: `--motion-*`
- Shadows: `--shadow-*`
- Borders: `--border-*`

---

## Accessibility

All components follow WCAG 2.1 AA standards:

- ✅ Keyboard navigation support
- ✅ ARIA labels and roles
- ✅ Focus indicators
- ✅ Color contrast compliance
- ✅ Screen reader friendly
- ✅ Semantic HTML

**Keyboard Support:**
- Enter: Submit forms, activate buttons
- Escape: Cancel operations (future enhancement)
- Tab: Navigate between fields
- Arrow keys: Adjust sliders

---

## Testing Considerations

### E2E Tests Required

Per project standards, all form/CRUD operations MUST verify:

1. **Network requests** - Use `page.waitForResponse()`
2. **HTTP status** - Verify 200/201 responses
3. **Data persistence** - Reload page, verify data survived
4. **Validation blocks** - Prove invalid submissions make NO API call

**Example Test Pattern:**
```typescript
// Upload asset test
const uploadResponse = await Promise.all([
  page.waitForResponse(r =>
    r.url().includes('/api/brand/assets') &&
    r.request().method() === 'POST'
  ),
  // Perform upload action
]);
expect(uploadResponse[0].status()).toBe(201);

// Verify persistence
await page.reload();
await expect(page.getByText('brand-guidelines.pdf')).toBeVisible();
```

### Unit Tests

- Component rendering
- User interactions
- Validation logic
- Error handling
- Edge cases (empty states, max limits)

---

## Integration

### Adding to Router

```tsx
import BrandCenterPage from '@/pages/BrandCenterPage';

// In your router configuration
{
  path: '/brand',
  element: <BrandCenterPage />,
}
```

### API Integration

Replace mock functions in `useBrandStore.ts` and `useBrandMutations.ts`:

```tsx
// Replace mock with real API
async function getBrandVoice(id: string): Promise<BrandVoice> {
  const response = await fetch(`/api/brand/${id}`);
  if (!response.ok) throw new Error('Failed to fetch');
  return response.json();
}
```

---

## Future Enhancements

- [ ] Real-time collaboration (multiple editors)
- [ ] Version history for brand voice changes
- [ ] A/B testing different strictness levels
- [ ] AI-powered term suggestions
- [ ] Export brand voice as template
- [ ] Integration with content generation workflow
- [ ] Bulk term import/export
- [ ] Custom validation rules
- [ ] Brand voice analytics dashboard

---

## Component Dependencies

**Required shadcn/ui components:**
- Card
- Button
- Input
- Textarea
- Label
- Tabs

**Required icons (lucide-react):**
- Upload, FileText, CheckCircle2, XCircle, Loader2
- Plus, X, AlertCircle, TrendingUp
- Sparkles, BookOpen, Settings
- Shield, ShieldAlert, ShieldCheck

**Required libraries:**
- @tanstack/react-query
- sonner (toast notifications)

---

## Performance

**Bundle Impact:**
- Total component size: ~25KB (minified)
- No heavy dependencies
- Tree-shakeable exports
- Lazy loading recommended for page-level import

**Optimization:**
- TanStack Query caching (30s stale time)
- Memoized calculations
- Debounced API calls
- Progressive enhancement

---

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Modern mobile browsers

**Polyfills needed for:**
- None (uses native APIs only)

---

## Contributing

When adding features:

1. Follow existing component patterns
2. Use design tokens exclusively
3. Write comprehensive E2E tests
4. Update this README
5. Add TypeScript interfaces
6. Follow accessibility guidelines

---

## License

Internal use only - Part of Armor AI Newsletter Automation System
