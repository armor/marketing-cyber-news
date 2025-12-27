# Newsletter Analytics Components

Analytics and reporting components for the newsletter automation system.

## Components

### ABTestResults

Displays A/B test variant comparison and statistical results with winner declaration functionality.

**Features:**
- Variant comparison table with key metrics (recipients, opens, clicks, rates)
- Statistical significance display (confidence level, sample size)
- Winner indicator with crown icon
- Declare Winner action with confirmation dialog
- Real-time updates via polling
- Loading and error states
- FR-043 compliant

**Usage:**

```tsx
import { ABTestResults } from '@/components/newsletter/analytics';

function NewsletterDetailPage({ issueId }: { issueId: string }) {
  return (
    <div>
      <h1>Newsletter Issue Details</h1>
      <ABTestResults issueId={issueId} />
    </div>
  );
}
```

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| issueId | string | Yes | Newsletter issue ID to fetch test results for |

**Requirements:**
- Minimum 95% confidence level to enable winner declaration
- Confirmation dialog before declaring winner
- Automatic query invalidation on winner declaration

## Hooks

The component uses the following hooks (located in `src/hooks/useABTests.ts`):

### useTestVariants(issueId, options?)

Fetches test variants with performance metrics for a specific issue.

```tsx
const { data: variants, isLoading, error, refetch } = useTestVariants(issueId);
```

### useTestResults(issueId, options?)

Fetches complete test results including statistical analysis.

```tsx
const { data: results, isLoading, error, refetch } = useTestResults(issueId);
```

### useDeclareWinner(issueId)

Mutation hook to declare a winning variant.

```tsx
const { mutate: declareWinner, isPending, isError } = useDeclareWinner(issueId);

const handleDeclare = (variantId: string) => {
  declareWinner(variantId);
};
```

## Design Tokens

All styling uses design tokens from the Fortified Horizon theme:

- Colors: `var(--color-*)`
- Spacing: `var(--spacing-*)`
- Typography: `var(--typography-font-size-*)`
- Motion: `var(--motion-duration-*)`

No hardcoded values are used.
