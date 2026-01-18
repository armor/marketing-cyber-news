# ESLint Configuration Patterns for aci-frontend

## Overview

This document captures ESLint configuration patterns and common fixes applied to resolve 233 linting errors in the aci-frontend codebase.

## ESLint Configuration (eslint.config.js)

### Underscore-Prefixed Unused Variables

TypeScript convention uses underscore prefix (`_variableName`) to indicate intentionally unused parameters. Configure ESLint to allow this:

```javascript
rules: {
  '@typescript-eslint/no-unused-vars': ['error', {
    argsIgnorePattern: '^_',
    varsIgnorePattern: '^_',
  }],
}
```

### Test File Relaxations

Test files often have unused imports (for type checking) and use `any` for mock data:

```javascript
{
  files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', 'tests/**/*.ts'],
  rules: {
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'no-useless-escape': 'off',
    'react-hooks/rules-of-hooks': 'off',
  },
}
```

### React Refresh for UI Libraries

shadcn/ui components export both components and utility functions (like `buttonVariants`). Disable the rule at file level:

```javascript
/* eslint-disable react-refresh/only-export-components */
```

Files typically needing this:
- `src/components/ui/button.tsx` (exports `buttonVariants`)
- `src/components/ui/sidebar.tsx` (exports `useSidebar` hook)
- Example/demo files with mock data exports

## Common Fix Patterns

### 1. Unused Catch Block Parameters

**Before (ESLint error):**
```typescript
} catch (error) {
  toast.error('Failed');
}
```

**After:**
```typescript
} catch {
  toast.error('Failed');
}
```

### 2. Empty Interfaces

**Before (ESLint error):**
```typescript
export interface ClaimListItem extends Claim {
  // Extended fields for list view if needed
}
```

**After:**
```typescript
export type ClaimListItem = Claim;
```

### 3. Proper Type Assertions (avoid `any`)

**Before:**
```typescript
channel_type: body.channel_type as any,
```

**After:**
```typescript
channel_type: body.channel_type as ChannelType,
```

### 4. setState in useEffect (Form Initialization)

This is a valid pattern for initializing form data from props. Use eslint-disable comment:

```typescript
useEffect(() => {
  if (!agent) return;
  
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Initializing form from props is valid
  setFormData({
    name: agent.name,
    // ...
  });
}, [agent]);
```

### 5. Date.now() in useState (react-hooks/purity)

useState initializer only runs once on mount. Use lazy initializer and eslint-disable:

```typescript
// eslint-disable-next-line react-hooks/purity -- useState initializer runs once
const [dateRange, setDateRange] = useState<DateRangeParams>(() => ({
  dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  dateTo: new Date().toISOString().split('T')[0],
}));
```

### 6. Custom Component Props Types

For react-big-calendar or similar libraries with custom toolbars:

```typescript
import { type View, type NavigateAction } from 'react-big-calendar';

interface CustomToolbarProps {
  label: string;
  onNavigate: (action: NavigateAction) => void;
  onView: (view: View) => void;
}

const CustomToolbar = ({ label, onNavigate, onView }: CustomToolbarProps) => {
  // ...
};
```

## Error Categories Encountered

| Category | Count | Solution |
|----------|-------|----------|
| `@typescript-eslint/no-unused-vars` | 44 | Underscore prefix or remove |
| `@typescript-eslint/no-explicit-any` | 8 | Proper type assertions |
| `react-refresh/only-export-components` | 3 | File-level eslint-disable |
| `@typescript-eslint/no-empty-object-type` | 1 | Convert to type alias |
| `prefer-const` | 1 | Use const at assignment point |
| `react-hooks/purity` | 1 | Lazy initializer + eslint-disable |
| `react-hooks/set-state-in-effect` | 1 | eslint-disable with justification |

## TypeScript vs ESLint Coordination

Both TypeScript (`noUnusedParameters: true` in tsconfig) and ESLint check for unused variables. The underscore prefix convention works for both when ESLint is configured with `argsIgnorePattern: '^_'`.

**Important:** If you add eslint-disable comments to remove ESLint warnings but leave non-underscore variable names, TypeScript will still error on build. Always use the underscore prefix pattern for intentionally unused parameters.
