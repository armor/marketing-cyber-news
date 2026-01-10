# Armor Dashboard Design System

**Component Architect Analysis & Specification**
**Date**: 2026-01-09

---

## Overview

This design system establishes comprehensive standards for interior dashboard pages in the Armor Cyber News platform. Building on the polished Login page (spec 007-armor-dash-theme), this system ensures visual consistency, component reusability, and developer productivity across all authenticated experiences.

---

## Documentation Structure

### 1. **Interior Pages Design System** (`interior-pages-design-system.md`)
**Complete design system specification covering:**
- Component API standards and prop naming conventions
- Design token usage requirements (zero hardcoded values)
- Component specifications (Card, Button, Badge, Form, etc.)
- Page layout patterns and grid systems
- Composition patterns for complex features
- Accessibility standards (ARIA, keyboard nav)
- Responsive design breakpoints
- Dark mode strategy
- Performance optimization guidelines

**When to use:** Reference this for architectural decisions, new component design, and understanding the design system philosophy.

### 2. **Component Migration Guide** (`component-migration-guide.md`)
**Practical guide for migrating existing components:**
- Step-by-step migration checklist
- Before/after code examples with full implementations
- Common token replacement reference
- Testing migration success (visual, accessibility, token coverage)
- Migration priority matrix
- Review process requirements

**When to use:** When refactoring existing components to comply with design tokens and standards.

### 3. **Component Catalog** (`component-catalog.md`)
**Quick reference for all design system components:**
- Component usage examples with code snippets
- Variant options and sizes
- Design token mappings
- State matrices (loading, empty, error, etc.)
- Responsive behavior table
- Accessibility quick reference

**When to use:** Daily reference when implementing features. Quick lookup for component APIs and design tokens.

---

## Key Principles

### 1. Design Token First
**ALL styling MUST use design tokens from `src/styles/tokens/*`**

```typescript
// ✅ CORRECT
import { colors, spacing, typography } from '@/styles/tokens';
<div style={{ color: colors.brand.primary, padding: spacing[4] }} />

// ❌ WRONG
<div style={{ color: '#2563eb', padding: '16px' }} />
```

### 2. Composition Over Configuration
Components should compose smaller, reusable pieces rather than accepting complex configuration.

```typescript
// ✅ CORRECT - Composable
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>

// ❌ WRONG - Configured
<Card title="Title" content="Content" />
```

### 3. Variant Props Over Boolean Flags
Use a single `variant` prop instead of multiple boolean flags.

```typescript
// ✅ CORRECT
<Button variant="primary" />
<Button variant="secondary" />

// ❌ WRONG
<Button isPrimary />
<Button isSecondary />
```

### 4. Accessibility by Default
Every component MUST include proper ARIA attributes, keyboard navigation, and focus management.

```typescript
<button
  aria-label="Close dialog"
  aria-pressed={isOpen}
  onKeyDown={(e) => e.key === 'Escape' && onClose()}
>
  Close
</button>
```

### 5. Responsive & Dark Mode
All components automatically adapt to:
- Screen sizes (mobile, tablet, desktop)
- Theme (light/dark mode via CSS variables)

No component-specific media queries or theme logic required.

---

## Design Token Categories

### Colors (`src/styles/tokens/colors.ts`)
```typescript
colors.brand.primary           // #2563eb (Armor Blue)
colors.severity.critical       // #ef4444 (red)
colors.semantic.success        // #22c55e (green)
colors.background.primary      // Adapts to theme
colors.text.primary            // Adapts to theme
colors.border.default          // Adapts to theme
```

### Spacing (`src/styles/tokens/spacing.ts`)
```typescript
spacing[1]                     // 4px
spacing[4]                     // 16px
spacing[8]                     // 32px
componentSpacing.lg            // 24px (component padding)
```

### Typography (`src/styles/tokens/typography.ts`)
```typescript
typography.fontSize.base       // 16px
typography.fontWeight.medium   // 500
typography.lineHeight.normal   // 1.5
```

### Shadows (`src/styles/tokens/shadows.ts`)
```typescript
shadows.md                     // Card shadow
shadows.focus                  // Focus ring
shadows.btn.primary            // Button shadow
```

### Borders (`src/styles/tokens/borders.ts`)
```typescript
borders.radius.md              // 8px
borders.width.thin             // 1px
```

### Motion (`src/styles/tokens/motion.ts`)
```typescript
motion.duration.fast           // 150ms
motion.easing.default          // cubic-bezier(0.4, 0, 0.2, 1)
```

---

## Component Hierarchy

### Level 1: Primitives (shadcn/ui)
Foundation components with minimal customization:
- Button, Card, Input, Select, Dialog, Badge, Checkbox

### Level 2: Themed Primitives
Primitives styled with design tokens:
- FormInput (Input + Label + Error)
- LoadingSpinner (with brand colors)
- SeverityBadge (Badge + severity logic)

### Level 3: Composition Components
Multiple primitives composed together:
- MetricCard (Card + Typography + Icon + Badge)
- FilterPanel (Card + Inputs + Buttons)
- ApprovalCard (Card + Progress + Actions)

### Level 4: Domain Components
Business logic + composition:
- ThreatList (virtualized list + filtering)
- NewsletterPreview (email rendering + approval)
- CampaignBuilder (multi-step form + validation)

---

## Getting Started

### For New Features
1. Read **Interior Pages Design System** for architecture
2. Use **Component Catalog** to find existing components
3. If creating new component, follow API standards in design system
4. Use design tokens exclusively (no hardcoded values)
5. Request review from `code-reviewer` and Component Architect

### For Refactoring Existing Components
1. Read **Component Migration Guide**
2. Follow migration checklist step-by-step
3. Use before/after examples as reference
4. Run visual regression tests
5. Run accessibility tests
6. Request review from `code-reviewer`

### Quick Reference
- **Token lookup**: See Component Catalog → Common Token Replacements
- **Component usage**: See Component Catalog → specific component
- **Migration**: See Migration Guide → Example Migrations
- **Standards**: See Design System → Component API Standards

---

## File Locations

### Design Tokens
| File | Purpose |
|------|---------|
| `src/styles/variables.css` | CSS custom properties (900+ lines) |
| `src/styles/tokens/colors.ts` | TypeScript color exports |
| `src/styles/tokens/spacing.ts` | Spacing scale |
| `src/styles/tokens/typography.ts` | Font system |
| `src/styles/tokens/shadows.ts` | Elevation levels |
| `src/styles/tokens/borders.ts` | Radius and width |
| `src/styles/tokens/motion.ts` | Animation timing |

### Components
| Directory | Purpose |
|-----------|---------|
| `src/components/ui/` | Primitive components (shadcn/ui) |
| `src/components/layout/` | Layout components (Sidebar, Header, Footer) |
| `src/components/dashboard/` | Dashboard-specific components |
| `src/components/threat/` | Threat intelligence components |
| `src/components/approval/` | Approval workflow components |
| `src/components/marketing/` | Marketing campaign components |

---

## Quality Gates

### Component Checklist

Before marking a component complete:

- [ ] **TypeScript**: Full type safety, exported interfaces
- [ ] **Design Tokens**: Zero hardcoded values
- [ ] **Variants**: Proper variant prop system (not boolean flags)
- [ ] **Composition**: Can compose with other components
- [ ] **Accessibility**: ARIA labels, keyboard navigation
- [ ] **Responsive**: Mobile, tablet, desktop breakpoints
- [ ] **Dark Mode**: Adapts via CSS variables
- [ ] **Loading State**: Skeleton or spinner
- [ ] **Empty State**: Meaningful message
- [ ] **Error State**: User-friendly error handling
- [ ] **Tests**: Unit tests + E2E tests
- [ ] **Documentation**: JSDoc + Storybook (if applicable)

### Review Process

All component changes MUST pass:
1. Self-review using quality checklist
2. `code-reviewer` agent - Design token compliance, SOLID principles
3. `security-reviewer` agent - XSS prevention, input validation
4. Component Architect - API surface, composition patterns

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
**Goal**: Establish component standards and migrate core primitives

- [ ] Audit all components for token compliance
- [ ] Document component API standards
- [ ] Migrate Form components (Input, Select, Textarea)
- [ ] Migrate Button component with all variants
- [ ] Migrate Card component with composition

### Phase 2: Data Components (Weeks 3-4)
**Goal**: Standardize data display components

- [ ] Refactor MetricCard for composition
- [ ] Refactor ThreatCard for composition
- [ ] Implement unified Badge system
- [ ] Create DataTable component
- [ ] Integrate chart theming

### Phase 3: Layout & Navigation (Week 5)
**Goal**: Ensure layout consistency

- [ ] AppSidebar token audit
- [ ] Header standardization
- [ ] Responsive breakpoint system
- [ ] FilterPanel composition
- [ ] Page layout documentation

### Phase 4: Polish & Documentation (Week 6)
**Goal**: Production-ready design system

- [ ] Accessibility audit
- [ ] Performance optimization
- [ ] Storybook stories
- [ ] Component documentation
- [ ] E2E test coverage

---

## Anti-Patterns to Avoid

### Styling
```typescript
// ❌ DON'T: Hardcode values
<div style={{ color: '#2563eb', padding: '16px' }}>

// ✅ DO: Use tokens
<div style={{ color: colors.brand.primary, padding: spacing[4] }}>
```

### Component APIs
```typescript
// ❌ DON'T: Boolean flags
interface BadProps {
  isPrimary?: boolean;
  isSecondary?: boolean;
}

// ✅ DO: Variant props
interface GoodProps {
  variant: 'primary' | 'secondary';
}
```

### Composition
```typescript
// ❌ DON'T: Prop drilling
<Parent onAction={onAction} onOther={onOther} />

// ✅ DO: Context for deep trees
const ActionContext = createContext();
```

---

## Resources

### Internal Documentation
- **Design System Spec**: `./interior-pages-design-system.md`
- **Migration Guide**: `./component-migration-guide.md`
- **Component Catalog**: `./component-catalog.md`
- **Code Quality Standards**: `/CLAUDE_RULES.md`
- **E2E Testing Standards**: `/CLAUDE_RULES.md` (E2E Testing Gate section)

### Code Examples
- **MetricCard**: `src/components/dashboard/MetricCard.tsx` (good example)
- **ThreatCard**: `src/components/threat/ThreatCard.tsx` (good example)
- **Login Page**: `src/pages/Login.tsx` (polished example)
- **AppSidebar**: `src/components/layout/AppSidebar.tsx` (needs audit)

### External References
- **shadcn/ui**: https://ui.shadcn.com/
- **Radix UI**: https://www.radix-ui.com/
- **Tailwind CSS**: https://tailwindcss.com/
- **Apple HIG**: https://developer.apple.com/design/human-interface-guidelines/

---

## Contact & Support

### Design System Ownership
**Component Architect** - Responsible for:
- Design system architecture
- Component API standards
- Composition patterns
- Code review for design consistency

### Review Process
1. Submit PR with completed quality checklist
2. Tag `code-reviewer` agent for SOLID/token compliance
3. Tag `security-reviewer` agent for security audit
4. Tag Component Architect for final approval

### Questions & Feedback
- Use project Slack channel: `#armor-dashboard-design`
- File design system issues: GitHub with `design-system` label
- Schedule design review: Component Architect office hours (Thursdays 2-4pm)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-09 | Initial design system specification |

---

**End of Design System Documentation**

> **Note**: This design system is a living document. As the platform evolves, components will be added, patterns will emerge, and standards will be refined. Contribute improvements via PR with design-system label.
