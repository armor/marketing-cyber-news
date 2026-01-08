# Content Studio Components

AI-powered content generation interface for marketing automation.

## Components

### 1. ContentStudio (Main Component)
**Location:** `ContentStudio.tsx`

Main orchestrator component that combines all sub-components into a complete content generation workflow.

**Features:**
- Natural language prompt input
- Multi-channel support (LinkedIn, Twitter, Email, Blog)
- Content type selection (Post, Thread, Article, Newsletter)
- Real-time brand score feedback
- One-click refinements
- Content scheduling

**Usage:**
```tsx
import { ContentStudio } from '@/components/marketing/content';

<ContentStudio
  onGenerate={handleGenerate}
  onRefine={handleRefine}
  onSchedule={handleSchedule}
  suggestedPrompts={prompts}
/>
```

### 2. PromptInput
**Location:** `PromptInput.tsx`

Natural language prompt input with suggested prompts and character counter.

**Features:**
- Large textarea for detailed prompts
- Suggested prompts dropdown
- Character limit enforcement (500 chars)
- Keyboard shortcut (Cmd/Ctrl + Enter to generate)
- Visual loading state during generation

**Props:**
```typescript
{
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
  isGenerating?: boolean;
  maxCharacters?: number;
  suggestedPrompts?: SuggestedPrompt[];
}
```

### 3. ContentPreview
**Location:** `ContentPreview.tsx`

Platform-specific preview of generated content with inline editing.

**Features:**
- Platform-specific styling (LinkedIn, Twitter, Email, Blog)
- Character count per platform limits
- Inline edit mode
- Copy to clipboard
- Over-limit warning

**Props:**
```typescript
{
  content: string;
  channel: ContentChannel;
  onContentChange?: (content: string) => void;
}
```

**Platform Limits:**
- LinkedIn: 3,000 characters
- Twitter: 280 characters
- Email: 5,000 characters
- Blog: 10,000 characters

### 4. BrandScoreBadge
**Location:** `BrandScoreBadge.tsx`

Visual badge showing brand compliance score with color-coded feedback.

**Color Coding:**
- 🟢 Green (80-100): High brand alignment
- 🟡 Yellow (60-79): Moderate issues
- 🔴 Red (0-59): Significant issues

**Props:**
```typescript
{
  score: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}
```

**Features:**
- Accessible ARIA labels
- Icon + numeric score
- Responsive sizing
- Screen reader support

### 5. BrandFeedback
**Location:** `BrandFeedback.tsx`

List of brand compliance issues with suggested fixes.

**Issue Types:**
- `tone`: Message tone alignment
- `voice`: Brand voice consistency
- `terminology`: Correct terminology usage
- `style`: Style guide compliance
- `compliance`: Regulatory compliance

**Severity Levels:**
- `high`: Critical issues requiring immediate attention
- `medium`: Issues that should be addressed
- `low`: Minor suggestions for improvement

**Props:**
```typescript
{
  issues: BrandIssue[];
  onApplyFix?: (issueId: string, fix: string) => void;
}
```

### 6. RefinementButtons
**Location:** `RefinementButtons.tsx`

Quick action buttons for content refinement.

**Available Actions:**
- `make_shorter`: Reduce word count
- `make_longer`: Expand content
- `more_formal`: Professional tone
- `more_casual`: Conversational tone
- `add_cta`: Insert call-to-action
- `remove_cta`: Remove call-to-action

**Props:**
```typescript
{
  onRefine: (action: RefinementAction) => void;
  isRefining?: boolean;
  disabled?: boolean;
}
```

**Features:**
- Visual feedback during refinement
- Grid layout (responsive: 2 cols mobile, 3 cols tablet, 6 cols desktop)
- Icon + text labels
- Active state indication

### 7. ScheduleDialog
**Location:** `ScheduleDialog.tsx`

Modal dialog for scheduling content publication.

**Features:**
- Date picker with minimum date validation
- Time picker (24-hour format)
- Channel confirmation
- Future-only scheduling enforcement
- Localized date/time display

**Props:**
```typescript
{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: ContentChannel;
  onSchedule: (scheduledTime: string) => void;
  isScheduling?: boolean;
}
```

**Validation:**
- Prevents scheduling in the past
- Shows formatted confirmation message
- Displays error for invalid times

## Page Component

### ContentStudioPage
**Location:** `src/pages/ContentStudioPage.tsx`

Page wrapper that integrates ContentStudio with MainLayout and provides mock API handlers.

**Mock API Functions:**
- `handleGenerate`: Simulates AI content generation (2s delay)
- `handleRefine`: Simulates content refinement (1.5s delay)
- `handleSchedule`: Simulates content scheduling (1s delay)

## Type Definitions

**Location:** `src/types/content-studio.ts`

### Core Types

```typescript
type ContentChannel = 'linkedin' | 'twitter' | 'email' | 'blog';
type ContentType = 'post' | 'thread' | 'article' | 'newsletter';
type RefinementAction =
  | 'make_shorter'
  | 'make_longer'
  | 'more_formal'
  | 'more_casual'
  | 'add_cta'
  | 'remove_cta';

interface BrandIssue {
  id: string;
  type: 'tone' | 'voice' | 'terminology' | 'style' | 'compliance';
  severity: 'high' | 'medium' | 'low';
  message: string;
  suggestedFix?: string;
  location?: { start: number; end: number };
}

interface BrandScore {
  overall: number; // 0-100
  tone: number;
  voice: number;
  terminology: number;
  style: number;
  issues: BrandIssue[];
}

interface GeneratedContent {
  id: string;
  content: string;
  channel: ContentChannel;
  contentType: ContentType;
  brandScore: BrandScore;
  characterCount: number;
  createdAt: string;
  scheduledFor?: string;
  status: 'draft' | 'scheduled' | 'published';
}

interface SuggestedPrompt {
  id: string;
  text: string;
  category: 'product' | 'thought-leadership' | 'engagement' | 'announcement';
  channels: ContentChannel[];
}
```

## Design Standards

### CSS Design Tokens
All components use CSS custom properties (design tokens) exclusively:

✅ **Correct:**
```tsx
style={{
  padding: 'var(--spacing-4)',
  color: 'var(--color-text-primary)',
  fontSize: 'var(--typography-font-size-base)',
}}
```

❌ **Incorrect:**
```tsx
style={{
  padding: '16px',
  color: '#303030',
  fontSize: '16px',
}}
```

### Required Token Categories
- **Colors**: `--color-*` variables
- **Spacing**: `--spacing-*` variables
- **Typography**: `--typography-*` variables
- **Motion**: `--motion-duration-*` and `--motion-easing-*` variables
- **Shadows**: `--shadow-*` variables
- **Borders**: `--border-*` variables

### Accessibility Standards

All components implement:
- ✅ Semantic HTML elements
- ✅ ARIA labels and roles
- ✅ Keyboard navigation support
- ✅ Screen reader compatibility
- ✅ Focus management
- ✅ Error announcements with `aria-live`

### Testing Requirements

Before marking any feature complete:
- [ ] TypeScript compiles without errors
- [ ] All design tokens used (no hardcoded values)
- [ ] ARIA labels present and accurate
- [ ] Keyboard navigation works
- [ ] Visual states clear (loading, error, success)
- [ ] Mock data demonstrates all states

## Integration

### API Integration Points

When integrating with real APIs, replace these mock handlers:

1. **Content Generation** (`onGenerate`):
   ```typescript
   const handleGenerate = async (prompt: string, channel: ContentChannel, type: ContentType) => {
     const response = await fetch('/api/content/generate', {
       method: 'POST',
       body: JSON.stringify({ prompt, channel, type }),
     });
     return response.json();
   };
   ```

2. **Content Refinement** (`onRefine`):
   ```typescript
   const handleRefine = async (content: GeneratedContent, action: RefinementAction) => {
     const response = await fetch(`/api/content/${content.id}/refine`, {
       method: 'PUT',
       body: JSON.stringify({ action }),
     });
     return response.json();
   };
   ```

3. **Content Scheduling** (`onSchedule`):
   ```typescript
   const handleSchedule = async (content: GeneratedContent, scheduledTime: string) => {
     await fetch(`/api/content/${content.id}/schedule`, {
       method: 'POST',
       body: JSON.stringify({ scheduledTime }),
     });
   };
   ```

## File Structure

```
src/components/marketing/content/
├── BrandScoreBadge.tsx      # Brand score visual indicator
├── BrandFeedback.tsx        # Brand issues list with fixes
├── PromptInput.tsx          # Natural language input
├── ContentPreview.tsx       # Platform-specific preview
├── RefinementButtons.tsx    # Quick refinement actions
├── ScheduleDialog.tsx       # Scheduling modal
├── ContentStudio.tsx        # Main orchestrator
├── index.ts                 # Barrel exports
└── README.md               # This file

src/types/
└── content-studio.ts        # TypeScript interfaces

src/pages/
└── ContentStudioPage.tsx    # Page wrapper with mocks
```

## Dependencies

- `react` - UI framework
- `lucide-react` - Icons
- `sonner` - Toast notifications
- `@radix-ui/react-dialog` - Modal dialogs
- `@radix-ui/react-popover` - Popover menus
- `shadcn/ui` components:
  - Button
  - Card
  - Input
  - Textarea
  - Badge
  - Dialog
  - Popover

## Future Enhancements

- [ ] Real-time collaboration (multiple users editing)
- [ ] Version history tracking
- [ ] A/B testing variants
- [ ] Performance analytics integration
- [ ] Multi-language support
- [ ] Image generation and attachment
- [ ] Link preview cards
- [ ] Hashtag suggestions
- [ ] Emoji picker
- [ ] Mention/tag suggestions
