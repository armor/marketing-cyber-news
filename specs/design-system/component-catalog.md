# Component Catalog - Quick Reference

**Component Architect**
**Date**: 2026-01-09
**Purpose**: Visual reference for all design system components

---

## Table of Contents

1. [Primitives](#primitives)
2. [Form Components](#form-components)
3. [Data Display](#data-display)
4. [Navigation](#navigation)
5. [Feedback](#feedback)
6. [Layout](#layout)
7. [Domain Components](#domain-components)

---

## Primitives

### Button

**Location**: `src/components/ui/button.tsx`

**Variants**:
```typescript
<Button variant="primary">Primary Action</Button>
<Button variant="secondary">Secondary Action</Button>
<Button variant="alert">Dangerous Action</Button>
<Button variant="trust">Confirm Action</Button>
<Button variant="ghost">Tertiary Action</Button>
<Button variant="outline">Alternative Action</Button>
```

**Sizes**:
```typescript
<Button size="sm">Small Button</Button>
<Button size="md">Medium Button</Button> {/* Default */}
<Button size="lg">Large Button</Button>
```

**States**:
```typescript
<Button isLoading>Loading...</Button>
<Button isDisabled>Disabled</Button>
<Button icon={<Save />} iconPosition="left">Save</Button>
<Button icon={<ArrowRight />} iconPosition="right">Next</Button>
```

**Design Tokens**:
- Background: `gradient-btn-{variant}`
- Shadow: `shadow-btn-{variant}`, `shadow-btn-{variant}-hover`
- Transition: `motion.duration.fast`, `motion.easing.default`

---

### Card

**Location**: `src/components/ui/card.tsx`

**Usage**:
```typescript
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Optional description</CardDescription>
  </CardHeader>
  <CardContent>
    Main content goes here
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

**Variants**:
```typescript
<Card variant="default">Default Card</Card>
<Card variant="elevated">Elevated Card</Card>
<Card variant="outlined">Outlined Card</Card>
```

**Design Tokens**:
- Background: `gradient-card`
- Shadow: `shadow-card`
- Border radius: `borders.radius.lg`
- Padding: `componentSpacing.lg`

---

### Badge

**Location**: `src/components/ui/badge.tsx`

**Variants**:
```typescript
<Badge variant="neutral">Neutral</Badge>
<Badge variant="critical">Critical</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="info">Info</Badge>
```

**Sizes**:
```typescript
<Badge size="sm">Small</Badge>
<Badge size="md">Medium</Badge>
<Badge size="lg">Large</Badge>
```

**Design Tokens**:
- Background: `gradient-badge-{variant}`
- Shadow: `shadow-badge`
- Font size: `typography.fontSize.xs`
- Padding: `spacing[1] spacing[2]`

---

## Form Components

### Input

**Location**: `src/components/ui/input.tsx`

**Usage**:
```typescript
<Input
  label="Email Address"
  name="email"
  type="email"
  value={email}
  onChange={setEmail}
  placeholder="you@company.com"
  isRequired
/>

{/* With error */}
<Input
  label="Password"
  name="password"
  type="password"
  value={password}
  onChange={setPassword}
  error="Password must be at least 8 characters"
/>

{/* With help text */}
<Input
  label="Username"
  name="username"
  value={username}
  onChange={setUsername}
  helpText="Choose a unique username"
/>
```

**States**:
```typescript
<Input value={value} onChange={onChange} />           {/* Normal */}
<Input value={value} onChange={onChange} error="..." /> {/* Error */}
<Input value={value} onChange={onChange} isDisabled />  {/* Disabled */}
```

**Design Tokens**:
- Background: `colors.background.secondary`
- Border: `colors.border.default` (normal), `colors.border.error` (error)
- Focus: `colors.border.focus`, `shadows.focus`
- Padding: `spacing[2] spacing[3]`
- Font size: `typography.fontSize.sm`

---

### Select

**Location**: `src/components/ui/select.tsx`

**Usage**:
```typescript
<Select
  label="Severity Level"
  value={severity}
  onChange={setSeverity}
  options={[
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ]}
/>

{/* With error */}
<Select
  label="Category"
  value={category}
  onChange={setCategory}
  options={categories}
  error="Please select a category"
/>
```

**Design Tokens**: Same as Input

---

### Textarea

**Location**: `src/components/ui/textarea.tsx`

**Usage**:
```typescript
<Textarea
  label="Description"
  name="description"
  value={description}
  onChange={setDescription}
  rows={4}
  placeholder="Enter description..."
/>
```

**Design Tokens**: Same as Input

---

### Checkbox

**Location**: `src/components/ui/checkbox.tsx`

**Usage**:
```typescript
<Checkbox
  label="I agree to the terms"
  checked={agreed}
  onChange={setAgreed}
/>

{/* With description */}
<Checkbox
  label="Send notifications"
  description="Receive email updates when threats are detected"
  checked={notifications}
  onChange={setNotifications}
/>
```

**Design Tokens**:
- Border: `colors.border.default`
- Checked background: `colors.brand.primary`
- Focus ring: `shadows.focus`

---

## Data Display

### MetricCard

**Location**: `src/components/dashboard/MetricCard.tsx`

**Usage**:
```typescript
<MetricCard
  title="Total Threats"
  value={2847}
  icon={<Shield />}
  variant="critical"
  trend={{
    direction: 'up',
    percentage: 12.5,
  }}
/>
```

**Variants**:
```typescript
<MetricCard variant="default" {...} />
<MetricCard variant="critical" {...} />
<MetricCard variant="warning" {...} />
<MetricCard variant="success" {...} />
```

**Design Tokens**:
- Border left: `borders.width.thick`, color based on variant
- Background: `gradient-card`
- Shadow: `shadow-md`
- Title font: `typography.fontSize.sm`, `typography.fontWeight.medium`
- Value font: `typography.fontSize['3xl']`, `typography.fontWeight.bold`

---

### ThreatCard

**Location**: `src/components/threat/ThreatCard.tsx`

**Usage**:
```typescript
<ThreatCard
  threat={{
    id: '123',
    title: 'Critical Vulnerability Discovered',
    summary: 'A critical vulnerability has been found...',
    severity: 'critical',
    category: ThreatCategory.VULNERABILITY,
    cves: ['CVE-2024-1234'],
    source: 'CISA',
    publishedAt: '2024-01-09T10:00:00Z',
    isBookmarked: false,
  }}
  onSelect={(id) => navigate(`/threats/${id}`)}
  onBookmarkToggle={(id) => toggleBookmark(id)}
/>
```

**Design Tokens**:
- Border left: Severity color
- Hover shadow: `shadow-md`
- Hover transform: `translateY(-2px)`
- Transition: `motion.duration.fast`

---

### SeverityBadge

**Location**: `src/components/threat/SeverityBadge.tsx`

**Usage**:
```typescript
<SeverityBadge severity="critical" />
<SeverityBadge severity="high" />
<SeverityBadge severity="medium" />
<SeverityBadge severity="low" />

<SeverityBadge severity="critical" size="sm" />
<SeverityBadge severity="critical" size="lg" showIcon />
```

**Design Tokens**:
- Background: Gradient based on severity
- Text color: White or dark based on severity
- Icon: Severity-specific (Shield, AlertTriangle, etc.)

---

### DataTable

**Location**: `src/components/ui/table.tsx` (to be created)

**Usage**:
```typescript
<DataTable
  data={threats}
  columns={[
    {
      key: 'title',
      header: 'Title',
      cell: (row) => row.title,
    },
    {
      key: 'severity',
      header: 'Severity',
      cell: (row) => <SeverityBadge severity={row.severity} />,
    },
    {
      key: 'publishedAt',
      header: 'Date',
      cell: (row) => formatDate(row.publishedAt),
    },
  ]}
  onRowClick={(row) => navigate(`/threats/${row.id}`)}
/>
```

**Design Tokens**:
- Header background: `gradient-panel-header`
- Row hover: `colors.background.secondary`
- Border: `colors.border.default`
- Cell padding: `spacing[3] spacing[4]`

---

## Navigation

### AppSidebar

**Location**: `src/components/layout/AppSidebar.tsx`

**Features**:
- Collapsible (icon-only mode)
- Role-based menu filtering
- Active route highlighting
- User profile section
- Logout action

**Design Tokens**:
- Width expanded: `layout-sidebar-width` (256px)
- Width collapsed: `layout-sidebar-collapsed` (64px)
- Background: `gradient-panel-header`
- Active item: `colors.brand.primary` with 8% opacity
- Hover: `colors.background.secondary`

---

### Header

**Location**: `src/components/layout/Header.tsx`

**Features**:
- Notification bell with badge
- User menu dropdown
- Profile information
- Theme toggle (future)

**Design Tokens**:
- Height: `layout-header-height` (72px)
- Background: `gradient-panel-header`
- Border: `colors.border.default`

---

### Footer

**Location**: `src/components/layout/Footer.tsx`

**Design Tokens**:
- Background: `gradient-panel-header`
- Text color: `colors.text.muted`
- Font size: `typography.fontSize.sm`

---

### Breadcrumbs

**Location**: `src/components/ui/breadcrumbs.tsx` (to be created)

**Usage**:
```typescript
<Breadcrumbs
  items={[
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Threats', href: '/threats' },
    { label: 'Detail', href: '/threats/123' },
  ]}
/>
```

**Design Tokens**:
- Text color: `colors.text.secondary`
- Active color: `colors.text.primary`
- Separator color: `colors.text.muted`
- Font size: `typography.fontSize.sm`

---

## Feedback

### Loading Spinner

**Location**: `src/components/ui/LoadingSpinner.tsx`

**Usage**:
```typescript
<LoadingSpinner />
<LoadingSpinner size="sm" />
<LoadingSpinner size="lg" />
<LoadingSpinner message="Loading threats..." />
```

**Design Tokens**:
- Border color: `colors.brand.primary`
- Size sm: 16px
- Size md: 24px
- Size lg: 48px
- Animation: `spin 1s linear infinite`

---

### Skeleton

**Location**: `src/components/ui/skeleton.tsx`

**Usage**:
```typescript
<Skeleton className="h-8 w-full" />
<Skeleton className="h-4 w-3/4" />
<Skeleton className="h-12 w-12 rounded-full" />

{/* Card skeleton */}
<Card>
  <CardContent>
    <Skeleton className="h-4 w-full mb-2" />
    <Skeleton className="h-4 w-3/4 mb-2" />
    <Skeleton className="h-4 w-1/2" />
  </CardContent>
</Card>
```

**Design Tokens**:
- Background: `colors.background.secondary`
- Animation: Pulse with `motion.duration.slow`

---

### Toast/Notification

**Location**: `src/components/ui/sonner.tsx` (Sonner library)

**Usage**:
```typescript
import { toast } from 'sonner';

// Success
toast.success('Threat bookmarked successfully');

// Error
toast.error('Failed to load threat data');

// Info
toast.info('New newsletter available for review');

// Warning
toast.warning('Approval deadline approaching');

// Custom
toast.custom((t) => (
  <div style={{
    background: colors.background.elevated,
    padding: componentSpacing.md,
    borderRadius: borders.radius.md,
  }}>
    Custom notification content
  </div>
));
```

**Design Tokens**:
- Background: `colors.background.elevated`
- Border: `colors.border.default`
- Success color: `colors.semantic.success`
- Error color: `colors.semantic.error`

---

### Empty State

**Location**: `src/components/ui/EmptyState.tsx`

**Usage**:
```typescript
<EmptyState
  icon={<Inbox />}
  title="No threats found"
  description="Try adjusting your filters or search criteria"
  action={
    <Button onClick={clearFilters}>Clear Filters</Button>
  }
/>
```

**Design Tokens**:
- Icon color: `colors.text.muted`
- Title font: `typography.fontSize.lg`, `typography.fontWeight.semibold`
- Description color: `colors.text.secondary`

---

## Layout

### MainLayout

**Location**: `src/components/layout/MainLayout.tsx`

**Usage**:
```typescript
<MainLayout>
  <YourPageContent />
</MainLayout>
```

**Structure**:
```
┌─────────────────────────────────────┐
│ AppSidebar  │ SidebarInset          │
│             ├───────────────────────┤
│             │ Header                │
│             ├───────────────────────┤
│             │                       │
│             │ Page Content          │
│             │                       │
│             ├───────────────────────┤
│             │ Footer                │
└─────────────────────────────────────┘
```

---

### PageContainer

**Usage**:
```typescript
<PageContainer>
  <PageHeader>
    <Breadcrumbs items={breadcrumbs} />
    <PageTitle>Dashboard</PageTitle>
    <PageDescription>Overview of threat intelligence</PageDescription>
    <PageActions>
      <Button variant="primary">New Report</Button>
    </PageActions>
  </PageHeader>

  <PageContent>
    {/* Main content */}
  </PageContent>
</PageContainer>
```

**Design Tokens**:
- Page padding: `spacing-layout-page` (32px)
- Section spacing: `spacing-layout-section` (48px)
- Content gap: `spacing-gap-lg` (24px)

---

### Grid System

**Metric Cards Grid**:
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[var(--spacing-gap-lg)]">
  <MetricCard {...} />
  <MetricCard {...} />
  <MetricCard {...} />
  <MetricCard {...} />
</div>
```

**Content Grid (2/3 + 1/3)**:
```typescript
<div className="grid grid-cols-1 lg:grid-cols-3 gap-[var(--spacing-gap-lg)]">
  <div className="lg:col-span-2">
    {/* Main content */}
  </div>
  <div>
    {/* Sidebar */}
  </div>
</div>
```

---

## Domain Components

### ApprovalCard

**Location**: `src/components/approval/ApprovalCard.tsx`

**Usage**:
```typescript
<ApprovalCard
  issue={newsletterIssue}
  currentGate="marketing"
>
  <ApprovalProgress
    gates={['marketing', 'soc_level_3', 'ciso']}
    current="marketing"
  />

  <ApprovalCard.Content>
    <NewsletterPreview issue={newsletterIssue} />
  </ApprovalCard.Content>

  <ApprovalCard.Actions>
    <ApproveButton
      gate="marketing"
      onApprove={handleApprove}
      isLoading={isApproving}
    />
    <RejectButton
      gate="marketing"
      onReject={handleReject}
      isLoading={isRejecting}
    />
  </ApprovalCard.Actions>
</ApprovalCard>
```

---

### FilterPanel

**Location**: `src/components/threat/FilterPanel.tsx`

**Usage**:
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
    <SeverityFilter
      selected={filters.severity}
      onChange={(severity) => setFilters({ ...filters, severity })}
    />
  </FilterPanel.Section>

  <FilterPanel.Section>
    <FilterPanel.Label>Category</FilterPanel.Label>
    <CategoryFilter
      selected={filters.category}
      onChange={(category) => setFilters({ ...filters, category })}
    />
  </FilterPanel.Section>

  <FilterPanel.Section>
    <FilterPanel.Label>Date Range</FilterPanel.Label>
    <DateRangeFilter
      from={filters.dateFrom}
      to={filters.dateTo}
      onChange={(from, to) => setFilters({ ...filters, dateFrom: from, dateTo: to })}
    />
  </FilterPanel.Section>

  <FilterPanel.Footer>
    <Button variant="primary" onClick={applyFilters}>
      Apply Filters
    </Button>
  </FilterPanel.Footer>
</FilterPanel>
```

---

### Charts

**ThreatTimeline**:
```typescript
<ThreatTimeline
  data={timelineData}
  height={300}
  showGrid
  showTooltip
/>
```

**SeverityDonut**:
```typescript
<SeverityDonut
  data={{
    critical: 45,
    high: 120,
    medium: 230,
    low: 85,
  }}
  size={200}
  showLegend
/>
```

**Design Tokens** (all charts):
- Colors: `colors.severity.*`
- Grid: `colors.border.default` with 10% opacity
- Tooltip background: `colors.background.elevated`
- Font: `typography.fontFamily.body`
- Font size: `typography.fontSize.sm`

---

## Component States Matrix

| Component | Loading | Empty | Error | Disabled | Focus | Hover |
|-----------|---------|-------|-------|----------|-------|-------|
| **Button** | ✅ Spinner | - | - | ✅ Opacity 0.5 | ✅ Ring | ✅ Shadow |
| **Input** | - | - | ✅ Border/icon | ✅ Opacity 0.5 | ✅ Border/shadow | - |
| **Card** | ✅ Skeleton | ✅ Empty state | ✅ Error msg | - | - | ✅ Shadow |
| **Select** | - | ✅ Placeholder | ✅ Border | ✅ Opacity 0.5 | ✅ Border/shadow | - |
| **Table** | ✅ Skeleton | ✅ Empty state | ✅ Error msg | - | ✅ Row focus | ✅ Row bg |
| **Chart** | ✅ Skeleton | ✅ Empty state | ✅ Error msg | - | - | ✅ Tooltip |

---

## Responsive Behavior

| Component | Mobile (<768px) | Tablet (768-1024px) | Desktop (>1024px) |
|-----------|-----------------|---------------------|-------------------|
| **AppSidebar** | Collapsed, icon-only | Collapsible | Expanded |
| **Header** | Simplified, hide secondary | Full | Full |
| **MetricCard Grid** | 1 column | 2 columns | 4 columns |
| **FilterPanel** | Bottom sheet | Side panel | Side panel |
| **DataTable** | Horizontal scroll | Full | Full |
| **Cards** | Full width | 2 columns | 3-4 columns |

---

## Accessibility Quick Reference

### ARIA Attributes

| Component | Required ARIA |
|-----------|---------------|
| **Button** | `aria-label` (icon-only), `aria-busy` (loading), `aria-disabled` |
| **Input** | `aria-invalid`, `aria-describedby`, `aria-required` |
| **Card** | `role="article"` or `role="region"`, `aria-label` |
| **Dialog** | `role="dialog"`, `aria-labelledby`, `aria-describedby`, `aria-modal` |
| **Alert** | `role="alert"`, `aria-live="assertive"` |
| **Status** | `role="status"`, `aria-live="polite"` |

### Keyboard Navigation

| Component | Keys |
|-----------|------|
| **Button** | Enter, Space |
| **Input** | Tab (focus), Arrow keys (text navigation) |
| **Select** | Tab (focus), Arrow keys (options), Enter (select) |
| **Dialog** | Esc (close), Tab (trap focus) |
| **Table** | Arrow keys (navigate), Enter (select row) |
| **Dropdown** | Arrow keys, Enter, Esc |

---

**End of Component Catalog**
