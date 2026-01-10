# Armor Dashboard Interior Pages - Design System Specification

**Component Architect Analysis**
**Date**: 2026-01-09
**Status**: Specification
**Scope**: Interior dashboard pages (post-login experience)

---

## Executive Summary

This specification establishes a comprehensive design system for Armor Dashboard interior pages, building upon the polished Login page (spec 007-armor-dash-theme) to create consistent, professional interior experiences. The system addresses component APIs, composition patterns, and design tokens for all dashboard elements.

### Current State Analysis

**Strengths:**
- Robust design token foundation (900+ lines in `variables.css`)
- TypeScript token files provide type-safe design tokens
- Login page demonstrates high-quality visual polish
- Fortified Horizon theme with comprehensive light/dark modes
- Good separation of concerns (layout, components, pages)

**Gaps Identified:**
1. **Inconsistent token usage** - Some components use design tokens, others don't
2. **Mixed styling approaches** - Inline styles, Tailwind classes, CSS variables
3. **Component API surface needs standardization** - Props interfaces vary widely
4. **No documented composition patterns** - Unclear how components compose
5. **Missing component variant systems** - Limited variant support in core components
6. **Form component consistency** - Input, select, textarea need unified styling
7. **Data visualization lacks design system integration** - Charts need token-based theming

---

## Design System Architecture

### Component Hierarchy

```
Design System
├── Primitives (shadcn/ui components)
│   ├── Button
│   ├── Card
│   ├── Input
│   ├── Select
│   ├── Dialog
│   └── ...
├── Composition Components (dashboard-specific)
│   ├── MetricCard
│   ├── ThreatCard
│   ├── SeverityBadge
│   ├── FilterPanel
│   └── ...
├── Layout Components
│   ├── MainLayout
│   ├── AppSidebar
│   ├── Header
│   └── Footer
└── Page Components
    ├── DashboardPage
    ├── ThreatsPage
    ├── NewsletterConfigPage
    └── ...
```

---

## 1. Component API Standards

### 1.1 Prop Naming Conventions

All components MUST follow these naming patterns:

| Pattern | Usage | Example |
|---------|-------|---------|
| `variant` | Style variations | `<Badge variant="critical" />` |
| `size` | Size variations | `<Button size="lg" />` |
| `on*` | Event handlers | `onSelect`, `onClick`, `onSubmit` |
| `is*` | Boolean state | `isLoading`, `isActive`, `isDisabled` |
| `className` | Additional CSS classes | For utility overrides only |
| `children` | Composable content | Standard React pattern |

**Example:**
```typescript
interface MetricCardProps {
  title: string;
  value: number;
  icon?: React.ReactNode;
  variant?: 'default' | 'critical' | 'warning' | 'success';
  size?: 'sm' | 'md' | 'lg';
  trend?: TrendIndicator;
  onClick?: (id: string) => void;
  isLoading?: boolean;
  className?: string;
}
```

### 1.2 Component Composition Pattern

**Strategy Pattern**: Components should accept `variant` props for different visual styles, NOT separate components per variant.

```typescript
// GOOD - Single component with variants
<SeverityBadge severity="critical" size="sm" />
<SeverityBadge severity="low" size="lg" />

// BAD - Multiple components for same concept
<CriticalBadge />
<LowSeverityBadge />
```

**Composition over Configuration**: Complex components should compose simpler ones.

```typescript
// MetricCard composes Card + Badge + Icon
<MetricCard
  icon={<Shield />}
  variant="critical"
>
  <MetricCard.Title>Total Threats</MetricCard.Title>
  <MetricCard.Value>2,847</MetricCard.Value>
  <MetricCard.Trend direction="up" value={12.5} />
</MetricCard>
```

### 1.3 Required Component Features

Every dashboard component MUST implement:

| Feature | Requirement |
|---------|-------------|
| **TypeScript** | Full type safety with exported interfaces |
| **Design Tokens** | Zero hardcoded values, all tokens from `src/styles/tokens/` |
| **Accessibility** | ARIA labels, keyboard navigation, focus management |
| **Responsive** | Mobile-first, breakpoints at sm/md/lg/xl |
| **Dark Mode** | Automatic theme adaptation via CSS variables |
| **Loading States** | Skeleton/spinner for async data |
| **Empty States** | Meaningful messaging when no data |
| **Error States** | User-friendly error handling |

---

## 2. Design Token Usage Standards

### 2.1 Token Import Pattern (MANDATORY)

```typescript
// ALWAYS import tokens from TypeScript files
import { colors } from '@/styles/tokens/colors';
import { spacing, componentSpacing } from '@/styles/tokens/spacing';
import { typography } from '@/styles/tokens/typography';
import { shadows } from '@/styles/tokens/shadows';
import { borders } from '@/styles/tokens/borders';
import { motion } from '@/styles/tokens/motion';

// Use in styled components or inline styles
const Card = styled.div`
  background: ${colors.background.elevated};
  padding: ${componentSpacing.lg};
  border-radius: ${borders.radius.lg};
  box-shadow: ${shadows.md};
`;

// Or inline styles
<div style={{
  color: colors.text.primary,
  fontSize: typography.fontSize.base,
  padding: spacing[4],
}} />
```

### 2.2 Token Coverage Requirements

| Token Category | Usage |
|----------------|-------|
| **Colors** | Brand, severity, semantic, backgrounds, text, borders |
| **Spacing** | Base scale (0-64), component, layout, gaps |
| **Typography** | Font families, sizes, weights, line-height, letter-spacing |
| **Shadows** | Elevation levels, focus states, component-specific |
| **Borders** | Radius (sm/md/lg/xl/full), width (thin/medium/thick) |
| **Motion** | Duration (fast/normal/slow), easing curves |
| **Gradients** | Page, card, button, badge, icon, progress |

### 2.3 Anti-Patterns (FORBIDDEN)

```typescript
// ❌ NEVER hardcode hex colors
<div style={{ color: '#2563eb' }} />

// ✅ ALWAYS use color tokens
<div style={{ color: colors.brand.primary }} />

// ❌ NEVER hardcode pixel values
<div style={{ padding: '16px' }} />

// ✅ ALWAYS use spacing tokens
<div style={{ padding: spacing[4] }} />

// ❌ NEVER hardcode font sizes
<h1 style={{ fontSize: '24px' }} />

// ✅ ALWAYS use typography tokens
<h1 style={{ fontSize: typography.fontSize['2xl'] }} />
```

---

## 3. Component Specifications

### 3.1 Card System

**Base Card Component**:
```typescript
interface CardProps {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  radius?: 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}
```

**Design Rules**:
- Use `gradient-card` background for all cards
- Apply `shadow-card` for layered shadow effect
- Border radius: `borders.radius.lg` (12px)
- Left border accent for severity/category indication

**Composition Example**:
```typescript
<Card variant="elevated" padding="lg">
  <CardHeader>
    <CardTitle>Threat Summary</CardTitle>
    <CardDescription>Last 24 hours</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
  <CardFooter>
    <Button>View Details</Button>
  </CardFooter>
</Card>
```

### 3.2 Button System

**Button Variants**:
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'alert' | 'trust' | 'ghost' | 'outline';
  size: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  isDisabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  children: React.ReactNode;
  onClick?: () => void;
}
```

**Design Rules**:
| Variant | Background | Text Color | Use Case |
|---------|------------|------------|----------|
| `primary` | `gradient-btn-primary` | `color-bg-elevated` | Main actions |
| `secondary` | `gradient-btn-secondary` | `color-text-primary` | Secondary actions |
| `alert` | `gradient-btn-alert` | `white` | Dangerous actions |
| `trust` | `gradient-btn-trust` | `white` | Confirmations |
| `ghost` | `transparent` | `color-text-primary` | Tertiary actions |
| `outline` | `transparent` | `color-text-primary` | Alternative actions |

**Shadow System**:
- Default: `shadow-btn-primary` or `shadow-btn-accent`
- Hover: `shadow-btn-primary-hover` or `shadow-btn-accent-hover`
- Transition: `motion.duration.fast` with `motion.easing.default`

### 3.3 Badge System

**Badge Variants**:
```typescript
interface BadgeProps {
  variant: 'neutral' | 'critical' | 'warning' | 'success' | 'info';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}
```

**Severity Badge (Special Case)**:
```typescript
interface SeverityBadgeProps {
  severity: 'critical' | 'high' | 'medium' | 'low';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}
```

**Design Rules**:
- Background: `gradient-badge-{variant}`
- Inset shadow: `shadow-badge`
- Border radius: `borders.radius.sm`
- Padding: `spacing[1] spacing[2]` (4px 8px)
- Font size: `typography.fontSize.xs`
- Font weight: `typography.fontWeight.medium`

### 3.4 Form Components

**Unified Form Input System**:

All form components (Input, Select, Textarea) MUST share:
- Border: `1px solid var(--color-border-default)`
- Border radius: `borders.radius.md`
- Padding: `spacing[2] spacing[3]` (8px 12px)
- Font size: `typography.fontSize.sm`
- Background: `colors.background.secondary`

**Focus State (MANDATORY)**:
```css
focus:border-color: var(--color-border-focus);
focus:box-shadow: var(--shadow-focus);
focus:outline: none;
```

**Error State (MANDATORY)**:
```css
error:border-color: var(--color-border-error);
error:box-shadow: var(--shadow-focus-error);
```

**Component Example**:
```typescript
interface FormInputProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'number';
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  isDisabled?: boolean;
  isRequired?: boolean;
}

<FormInput
  label="Email Address"
  name="email"
  type="email"
  value={email}
  onChange={setEmail}
  error={emailError}
  isRequired
/>
```

### 3.5 Data Visualization Components

**Chart Theming (MANDATORY)**:

All charts (Recharts, Reviz) MUST use design tokens:

```typescript
const chartTheme = {
  colors: {
    critical: colors.severity.critical,
    high: colors.severity.high,
    medium: colors.severity.medium,
    low: colors.severity.low,
  },
  text: {
    primary: colors.text.primary,
    secondary: colors.text.secondary,
    muted: colors.text.muted,
  },
  grid: colors.border.default,
  background: colors.background.primary,
  tooltip: {
    background: colors.background.elevated,
    border: colors.border.default,
  },
  fonts: {
    base: typography.fontFamily.body,
    size: typography.fontSize.sm,
  },
};
```

**Chart Components**:
- `ThreatTimeline` - Line/area chart for trend visualization
- `SeverityDonut` - Donut chart for severity distribution
- `EngagementChart` - Bar/line combo for newsletter metrics
- `ChannelBreakdown` - Stacked bar for multi-channel data

**Design Rules**:
1. Use semantic severity colors for threat data
2. Text labels use `color-text-secondary`
3. Grid lines use `color-border-default` with 10% opacity
4. Tooltips use `gradient-card` background with `shadow-md`
5. Animations use `motion.duration.normal` with `motion.easing.default`

### 3.6 Navigation Components

**Sidebar (AppSidebar)**:
- Width expanded: `layout-sidebar-width` (256px)
- Width collapsed: `layout-sidebar-collapsed` (64px)
- Background: `gradient-panel-header`
- Active item: `color-brand-primary` background with 8% opacity
- Hover: `color-bg-secondary`
- Transition: `motion.duration.normal`

**Header**:
- Height: `layout-header-height` (72px)
- Background: `gradient-panel-header`
- Border bottom: `1px solid var(--color-border-default)`
- User avatar: `gradient-btn-primary` background
- Notification badge: `color-semantic-error`

**Footer**:
- Background: `gradient-panel-header`
- Border top: `1px solid var(--color-border-default)`
- Text: `color-text-muted`
- Font size: `typography.fontSize.sm`

### 3.7 Table Components

**Data Table Pattern**:
```typescript
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  pagination?: PaginationProps;
}
```

**Design Rules**:
- Header: `gradient-panel-header` background
- Row hover: `color-bg-secondary` background
- Border: `1px solid var(--color-border-default)`
- Cell padding: `spacing[3] spacing[4]` (12px 16px)
- Font size: `typography.fontSize.sm`
- Striped rows (optional): alternating `color-bg-primary` and `transparent`

### 3.8 Modal/Dialog Components

**Dialog Pattern**:
```typescript
interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
}
```

**Design Rules**:
- Backdrop: `rgba(0, 0, 0, 0.5)` with `backdrop-filter: blur(4px)`
- Container: `gradient-card` background
- Border: `1px solid var(--color-border-default)`
- Border radius: `borders.radius.lg`
- Shadow: `shadow-xl`
- Max width: `sm=400px`, `md=600px`, `lg=800px`, `xl=1000px`
- Padding: `componentSpacing.xl` (32px)

---

## 4. Page Layout Patterns

### 4.1 Standard Page Structure

```typescript
<MainLayout>
  <PageContainer>
    <PageHeader>
      <Breadcrumbs />
      <PageTitle>Dashboard</PageTitle>
      <PageDescription>Overview of threat intelligence</PageDescription>
      <PageActions>
        <Button variant="primary">New Report</Button>
      </PageActions>
    </PageHeader>

    <PageContent>
      {/* Main content */}
    </PageContent>

    <PageFooter>
      {/* Optional footer actions */}
    </PageFooter>
  </PageContainer>
</MainLayout>
```

### 4.2 Dashboard Grid System

**Metric Cards Grid**:
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[var(--spacing-gap-lg)]">
  <MetricCard {...} />
  <MetricCard {...} />
  <MetricCard {...} />
  <MetricCard {...} />
</div>
```

**Content Sections**:
```typescript
<div className="grid grid-cols-1 lg:grid-cols-3 gap-[var(--spacing-gap-lg)]">
  <div className="lg:col-span-2">
    {/* Main content */}
  </div>
  <div>
    {/* Sidebar content */}
  </div>
</div>
```

### 4.3 Spacing System

| Context | Spacing Token | Value |
|---------|---------------|-------|
| Page padding | `spacing-layout-page` | 32px |
| Section spacing | `spacing-layout-section` | 48px |
| Card padding | `spacing-layout-card` | 24px |
| Component gap XS | `spacing-gap-xs` | 8px |
| Component gap SM | `spacing-gap-sm` | 12px |
| Component gap MD | `spacing-gap-md` | 16px |
| Component gap LG | `spacing-gap-lg` | 24px |

---

## 5. Composition Patterns

### 5.1 Filter Panel Pattern

**Component Composition**:
```typescript
<FilterPanel>
  <FilterPanel.Header>
    <FilterPanel.Title>Filters</FilterPanel.Title>
    <FilterPanel.ClearButton onClick={clearFilters}>
      Clear All
    </FilterPanel.ClearButton>
  </FilterPanel.Header>

  <FilterPanel.Section>
    <FilterPanel.Label>Severity</FilterPanel.Label>
    <SeverityFilter selected={severity} onChange={setSeverity} />
  </FilterPanel.Section>

  <FilterPanel.Section>
    <FilterPanel.Label>Category</FilterPanel.Label>
    <CategoryFilter selected={category} onChange={setCategory} />
  </FilterPanel.Section>

  <FilterPanel.Footer>
    <Button variant="primary" onClick={applyFilters}>
      Apply Filters
    </Button>
  </FilterPanel.Footer>
</FilterPanel>
```

### 5.2 Approval Workflow Pattern

**Multi-Gate Approval**:
```typescript
<ApprovalCard issue={issue}>
  <ApprovalProgress
    gates={approvalGates}
    current={currentGate}
  />

  <ApprovalCard.Content>
    {/* Issue preview */}
  </ApprovalCard.Content>

  <ApprovalCard.Actions>
    <ApproveButton gate={currentGate} onApprove={handleApprove} />
    <RejectButton gate={currentGate} onReject={handleReject} />
  </ApprovalCard.Actions>
</ApprovalCard>
```

### 5.3 List + Detail Pattern

**Split View**:
```typescript
<div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--spacing-gap-lg)]">
  <div className="overflow-y-auto">
    <ThreatList
      threats={threats}
      selectedId={selectedThreat}
      onSelect={setSelectedThreat}
    />
  </div>

  <div className="sticky top-0">
    {selectedThreat && (
      <ThreatDetail id={selectedThreat} />
    )}
  </div>
</div>
```

---

## 6. Accessibility Standards

### 6.1 ARIA Requirements

All interactive components MUST include:
- `aria-label` or `aria-labelledby` for screen readers
- `aria-describedby` for additional context
- `role` attribute when semantic HTML isn't sufficient
- `aria-expanded` for collapsible sections
- `aria-selected` for selectable items
- `aria-disabled` instead of `disabled` for custom components

### 6.2 Keyboard Navigation

| Component | Required Keys |
|-----------|---------------|
| **Cards** | Tab (focus), Enter/Space (select) |
| **Filters** | Tab, Arrow keys (multi-select), Enter (toggle) |
| **Dialogs** | Esc (close), Tab (trap focus) |
| **Dropdowns** | Arrow keys (navigate), Enter (select), Esc (close) |
| **Tables** | Arrow keys (navigate cells), Enter (select row) |

### 6.3 Focus Management

**Focus Visible States**:
```css
focus-visible:outline: none;
focus-visible:ring: 2px solid var(--color-border-focus);
focus-visible:ring-offset: 2px;
```

**Focus Trap** (for modals):
```typescript
import { useFocusTrap } from '@/hooks/useFocusTrap';

function Dialog({ isOpen, onClose, children }) {
  const focusTrapRef = useFocusTrap(isOpen);

  return (
    <div ref={focusTrapRef}>
      {children}
    </div>
  );
}
```

---

## 7. Responsive Design Breakpoints

### 7.1 Breakpoint System

```typescript
export const breakpoints = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large desktop
  '2xl': '1536px' // Extra large
};
```

### 7.2 Component Responsiveness

| Component | Mobile (<768px) | Tablet (768-1024px) | Desktop (>1024px) |
|-----------|-----------------|---------------------|-------------------|
| **Sidebar** | Collapsed (icon only) | Collapsible | Expanded |
| **Header** | Simplified (hide secondary actions) | Full | Full |
| **Cards Grid** | 1 column | 2 columns | 4 columns |
| **Filter Panel** | Bottom sheet | Side panel | Side panel |
| **Data Tables** | Horizontal scroll | Full | Full |

---

## 8. Dark Mode Strategy

### 8.1 Theme Switching

Theme is controlled by `data-theme` attribute or `.dark` class on `<html>` element.

```typescript
// Theme context
const { theme, setTheme } = useTheme();

// Toggle theme
<Button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
  {theme === 'light' ? <Moon /> : <Sun />}
</Button>
```

### 8.2 Color Adaptation

All components AUTOMATICALLY adapt via CSS custom properties:

**Light Theme**:
- Background primary: `#d8d8d0` (pearl)
- Text primary: `#282820` (iron)
- Accent: `#2563eb` (armor blue)

**Dark Theme**:
- Background primary: `#0a0a10` (obsidian)
- Text primary: `#e0e0e8` (snow)
- Accent: `#2563eb` (armor blue - same)

**No component-specific dark mode logic required** - tokens handle everything.

---

## 9. Performance Optimization

### 9.1 Component Lazy Loading

```typescript
// Page-level lazy loading (already implemented)
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));

// Component-level lazy loading for heavy components
const ThreatTimeline = lazy(() => import('@/components/charts/ThreatTimeline'));
```

### 9.2 React.memo Usage

Apply `React.memo` to components that:
1. Receive complex props that rarely change
2. Render frequently in lists
3. Perform expensive computations

```typescript
export const ThreatCard = React.memo(function ThreatCard({ threat, ...props }) {
  // Component implementation
});
```

### 9.3 Virtual Scrolling

For lists with >100 items:

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function ThreatList({ threats }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: threats.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Estimated row height
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <ThreatCard key={threats[virtualRow.index].id} {...} />
        ))}
      </div>
    </div>
  );
}
```

---

## 10. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Audit all components for design token compliance
- [ ] Create component prop interface standards document
- [ ] Implement unified form component system (Input, Select, Textarea)
- [ ] Standardize Button component with all variants
- [ ] Standardize Card component with composition pattern

### Phase 2: Data Components (Week 3-4)
- [ ] Refactor MetricCard for composition pattern
- [ ] Refactor ThreatCard for composition pattern
- [ ] Implement unified Badge system with variants
- [ ] Create DataTable component with sorting/filtering
- [ ] Integrate chart theming with design tokens

### Phase 3: Layout & Navigation (Week 5)
- [ ] Ensure AppSidebar uses all design tokens
- [ ] Standardize Header component
- [ ] Implement responsive breakpoint system
- [ ] Create FilterPanel composition component
- [ ] Document page layout patterns

### Phase 4: Polish & Documentation (Week 6)
- [ ] Accessibility audit (ARIA, keyboard nav)
- [ ] Performance optimization (memo, virtualization)
- [ ] Create Storybook stories for all components
- [ ] Write component usage documentation
- [ ] E2E tests for key user flows

---

## 11. Quality Gates

### 11.1 Component Checklist

Before marking a component "complete", verify:

- [ ] **TypeScript**: Full type safety, exported interfaces
- [ ] **Design Tokens**: Zero hardcoded values
- [ ] **Variants**: Proper variant prop system
- [ ] **Composition**: Can be composed with other components
- [ ] **Accessibility**: ARIA labels, keyboard navigation
- [ ] **Responsive**: Works on mobile, tablet, desktop
- [ ] **Dark Mode**: Adapts via CSS variables
- [ ] **Loading State**: Skeleton or spinner
- [ ] **Empty State**: Meaningful message when no data
- [ ] **Error State**: User-friendly error handling
- [ ] **Tests**: Unit tests + E2E tests
- [ ] **Documentation**: JSDoc comments + Storybook story

### 11.2 Code Review Requirements

All component changes MUST pass review by:
1. **`code-reviewer` agent** - Design token compliance, SOLID principles
2. **`security-reviewer` agent** - XSS prevention, input validation
3. **Component Architect** (this role) - API surface, composition patterns

---

## 12. Anti-Patterns to Avoid

### 12.1 Styling Anti-Patterns

```typescript
// ❌ DON'T: Mix Tailwind with inline styles inconsistently
<div className="p-4" style={{ padding: '16px' }}>

// ✅ DO: Choose one approach per component (prefer inline with tokens)
<div style={{ padding: spacing[4] }}>

// ❌ DON'T: Hardcode colors
<div style={{ background: '#f0f0f0' }}>

// ✅ DO: Use color tokens
<div style={{ background: colors.background.secondary }}>

// ❌ DON'T: Create one-off components for every variant
<CriticalMetricCard />
<WarningMetricCard />

// ✅ DO: Use variant props
<MetricCard variant="critical" />
<MetricCard variant="warning" />
```

### 12.2 Component API Anti-Patterns

```typescript
// ❌ DON'T: Expose internal implementation details
interface BadCardProps {
  _internalState?: any; // Leaky abstraction
  __privateMethod?: () => void; // Should not be in props
}

// ✅ DO: Clean, public API only
interface GoodCardProps {
  variant: 'default' | 'elevated';
  children: React.ReactNode;
  onSelect?: () => void;
}

// ❌ DON'T: Boolean flags for variants
interface BadButtonProps {
  isPrimary?: boolean;
  isSecondary?: boolean;
  isAlert?: boolean;
}

// ✅ DO: Single variant prop
interface GoodButtonProps {
  variant: 'primary' | 'secondary' | 'alert';
}
```

### 12.3 Composition Anti-Patterns

```typescript
// ❌ DON'T: Prop drilling through multiple levels
<ParentComponent
  onChildAction={onChildAction}
  onGrandChildAction={onGrandChildAction}
/>

// ✅ DO: Use context for deep trees
const ActionContext = createContext();

// ❌ DON'T: Rigid, non-composable structure
<MetricCard
  title="..."
  value="..."
  footer={<Button>...</Button>}
/>

// ✅ DO: Flexible composition
<MetricCard>
  <MetricCard.Title>...</MetricCard.Title>
  <MetricCard.Value>...</MetricCard.Value>
  <MetricCard.Footer>
    <Button>...</Button>
  </MetricCard.Footer>
</MetricCard>
```

---

## 13. References

### 13.1 Design Token Files

| File | Purpose |
|------|---------|
| `src/styles/variables.css` | CSS custom properties (900+ lines) |
| `src/styles/tokens/colors.ts` | Color token TypeScript exports |
| `src/styles/tokens/spacing.ts` | Spacing scale + component/layout spacing |
| `src/styles/tokens/typography.ts` | Font families, sizes, weights |
| `src/styles/tokens/shadows.ts` | Elevation levels, focus states |
| `src/styles/tokens/borders.ts` | Radius and width tokens |
| `src/styles/tokens/motion.ts` | Duration and easing curves |

### 13.2 Key Components

| Component | Location | Design Quality |
|-----------|----------|----------------|
| `Login.tsx` | `src/pages/Login.tsx` | ✅ Polished |
| `AppSidebar.tsx` | `src/components/layout/AppSidebar.tsx` | ⚠️ Good, needs token audit |
| `Header.tsx` | `src/components/layout/Header.tsx` | ⚠️ Good, needs token audit |
| `MetricCard.tsx` | `src/components/dashboard/MetricCard.tsx` | ✅ Good token usage |
| `ThreatCard.tsx` | `src/components/threat/ThreatCard.tsx` | ✅ Good token usage |
| `SeverityBadge.tsx` | `src/components/threat/SeverityBadge.tsx` | ⚠️ Needs variant system |

### 13.3 Related Specifications

- **007-armor-dash-theme** - Login page design (completed)
- **CLAUDE_RULES.md** - Code quality standards, E2E testing requirements
- **~/.claude/CLAUDE.md** - Global instructions, agent coordination

---

## Appendix A: Component Abstraction Levels

### Level 1: Primitives (shadcn/ui)
Direct usage with minimal customization:
- Button, Input, Card, Dialog, Select, Checkbox

### Level 2: Themed Primitives
Primitives + design token styling:
- Badge (with severity variants)
- FormInput (with error states)
- LoadingSpinner (with brand colors)

### Level 3: Composition Components
Multiple primitives composed:
- MetricCard (Card + Typography + Icon + Badge)
- FilterPanel (Card + Input + Select + Button)
- ApprovalCard (Card + Progress + Actions)

### Level 4: Domain Components
Business logic + composition:
- ThreatList (virtualized list + filtering)
- NewsletterPreview (email rendering + approval)
- CampaignBuilder (multi-step form + validation)

---

## Appendix B: Design Token Reference

### Color Palette Quick Reference

**Brand Colors**:
- Primary: `#2563eb` (Armor Blue)
- Secondary: `#06b6d4` (Shield Cyan)
- Accent: `#8b5cf6` (Compliant Purple)

**Severity Colors**:
- Critical: `#ef4444` (red-500)
- High: `#f97316` (orange-500)
- Medium: `#f59e0b` (amber-500)
- Low: `#22c55e` (green-500)

**Semantic Colors**:
- Success: `#22c55e`
- Warning: `#f59e0b`
- Error: `#ef4444`
- Info: `#2563eb`

**Grayscale (Light Theme)**:
- Cream → Bone → Pearl → Stone → Pebble → Dove → Cement
- Silver → Ash → Slate → Steel → Iron → Graphite → Charcoal → Black

**Grayscale (Dark Theme)**:
- Void → Abyss → Obsidian → Onyx → Coal → Charcoal → Graphite
- Slate → Steel → Iron → Pewter → Silver → Ash → Mist → Cloud → Snow

---

**End of Design System Specification**
