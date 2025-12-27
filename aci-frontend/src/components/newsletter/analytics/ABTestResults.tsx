/**
 * ABTestResults Component
 *
 * Displays A/B test variant comparison and statistical results.
 * Allows declaring a winning variant when statistical significance is reached.
 *
 * Features:
 * - Variant comparison table with metrics (recipients, opens, clicks, rates)
 * - Statistical significance display (confidence level, p-value, sample size)
 * - Winner indicator (crown icon for winning variant)
 * - Declare Winner action with confirmation dialog
 * - Loading and error states
 * - FR-043 compliance: A/B test variant comparison
 *
 * @example
 * ```tsx
 * <ABTestResults issueId="issue-123" />
 * ```
 */

import { type ReactElement, useState } from 'react';
import { Crown, TrendingUp, Users, MousePointerClick } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTestResults, useDeclareWinner } from '@/hooks/useABTests';
import type { TestVariant } from '@/types/newsletter';

// ============================================================================
// Types
// ============================================================================

export interface ABTestResultsProps {
  readonly issueId: string;
}

// ============================================================================
// Constants
// ============================================================================

const MIN_CONFIDENCE_FOR_WINNER = 0.95; // 95% confidence required
const CONFIDENCE_THRESHOLD_HIGH = 0.95;
const CONFIDENCE_THRESHOLD_MEDIUM = 0.80;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format percentage for display
 */
function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

/**
 * Format number with thousands separator
 */
function formatNumber(value: number): string {
  return value.toLocaleString();
}

/**
 * Get confidence level badge variant
 */
function getConfidenceBadgeVariant(
  confidence: number
): 'success' | 'warning' | 'default' {
  if (confidence >= CONFIDENCE_THRESHOLD_HIGH) return 'success';
  if (confidence >= CONFIDENCE_THRESHOLD_MEDIUM) return 'warning';
  return 'default';
}

/**
 * Format confidence level message
 */
function formatConfidenceMessage(
  confidence: number,
  winningVariantName?: string
): string {
  if (!winningVariantName) {
    return 'No statistically significant winner yet';
  }

  const percentage = (confidence * 100).toFixed(0);
  return `${percentage}% confident "${winningVariantName}" is better`;
}

// ============================================================================
// Subcomponents
// ============================================================================

/**
 * Table Header Component
 */
function TableHeader(): ReactElement {
  return (
    <thead>
      <tr
        style={{
          borderBottomWidth: 'var(--border-width-thin)',
          borderBottomStyle: 'solid',
          borderBottomColor: 'var(--color-border-default)',
        }}
      >
        <th
          style={{
            padding: 'var(--spacing-3)',
            textAlign: 'left',
            fontSize: 'var(--typography-font-size-xs)',
            fontWeight: 'var(--typography-font-weight-semibold)',
            color: 'var(--color-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Variant
        </th>
        <th
          style={{
            padding: 'var(--spacing-3)',
            textAlign: 'left',
            fontSize: 'var(--typography-font-size-xs)',
            fontWeight: 'var(--typography-font-weight-semibold)',
            color: 'var(--color-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Subject Line
        </th>
        <th
          style={{
            padding: 'var(--spacing-3)',
            textAlign: 'right',
            fontSize: 'var(--typography-font-size-xs)',
            fontWeight: 'var(--typography-font-weight-semibold)',
            color: 'var(--color-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Recipients
        </th>
        <th
          style={{
            padding: 'var(--spacing-3)',
            textAlign: 'right',
            fontSize: 'var(--typography-font-size-xs)',
            fontWeight: 'var(--typography-font-weight-semibold)',
            color: 'var(--color-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Opens
        </th>
        <th
          style={{
            padding: 'var(--spacing-3)',
            textAlign: 'right',
            fontSize: 'var(--typography-font-size-xs)',
            fontWeight: 'var(--typography-font-weight-semibold)',
            color: 'var(--color-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Clicks
        </th>
        <th
          style={{
            padding: 'var(--spacing-3)',
            textAlign: 'right',
            fontSize: 'var(--typography-font-size-xs)',
            fontWeight: 'var(--typography-font-weight-semibold)',
            color: 'var(--color-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Open Rate
        </th>
        <th
          style={{
            padding: 'var(--spacing-3)',
            textAlign: 'right',
            fontSize: 'var(--typography-font-size-xs)',
            fontWeight: 'var(--typography-font-weight-semibold)',
            color: 'var(--color-text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          CTR
        </th>
      </tr>
    </thead>
  );
}

/**
 * Variant Row Component
 */
interface VariantRowProps {
  readonly variant: TestVariant;
}

function VariantRow({ variant }: VariantRowProps): ReactElement {
  return (
    <tr
      style={{
        borderBottomWidth: 'var(--border-width-thin)',
        borderBottomStyle: 'solid',
        borderBottomColor: 'var(--color-border-default)',
        backgroundColor: variant.is_winner
          ? 'var(--color-surface-success-subtle)'
          : 'transparent',
      }}
    >
      <td
        style={{
          padding: 'var(--spacing-3)',
          fontSize: 'var(--typography-font-size-sm)',
          fontWeight: 'var(--typography-font-weight-medium)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-2)',
          }}
        >
          {variant.is_winner && (
            <Crown
              style={{
                width: 'var(--icon-size-sm)',
                height: 'var(--icon-size-sm)',
                color: 'var(--color-warning)',
              }}
            />
          )}
          <span>{variant.variant_name}</span>
        </div>
      </td>
      <td
        style={{
          padding: 'var(--spacing-3)',
          fontSize: 'var(--typography-font-size-sm)',
          color: 'var(--color-text-secondary)',
          maxWidth: '300px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={variant.test_value}
      >
        {variant.test_value}
      </td>
      <td
        style={{
          padding: 'var(--spacing-3)',
          textAlign: 'right',
          fontSize: 'var(--typography-font-size-sm)',
        }}
      >
        {formatNumber(variant.recipients)}
      </td>
      <td
        style={{
          padding: 'var(--spacing-3)',
          textAlign: 'right',
          fontSize: 'var(--typography-font-size-sm)',
        }}
      >
        {formatNumber(variant.opened)}
      </td>
      <td
        style={{
          padding: 'var(--spacing-3)',
          textAlign: 'right',
          fontSize: 'var(--typography-font-size-sm)',
        }}
      >
        {formatNumber(variant.clicked)}
      </td>
      <td
        style={{
          padding: 'var(--spacing-3)',
          textAlign: 'right',
          fontSize: 'var(--typography-font-size-sm)',
          fontWeight: 'var(--typography-font-weight-semibold)',
        }}
      >
        {formatPercentage(variant.open_rate)}
      </td>
      <td
        style={{
          padding: 'var(--spacing-3)',
          textAlign: 'right',
          fontSize: 'var(--typography-font-size-sm)',
          fontWeight: 'var(--typography-font-weight-semibold)',
        }}
      >
        {formatPercentage(variant.click_rate)}
      </td>
    </tr>
  );
}

/**
 * Statistical Results Section
 */
interface StatisticalResultsProps {
  readonly confidence: number;
  readonly winningVariantName?: string;
  readonly totalRecipients: number;
  readonly isComplete: boolean;
}

function StatisticalResults({
  confidence,
  winningVariantName,
  totalRecipients,
  isComplete,
}: StatisticalResultsProps): ReactElement {
  const confidenceVariant = getConfidenceBadgeVariant(confidence);
  const confidenceMessage = formatConfidenceMessage(
    confidence,
    winningVariantName
  );

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 'var(--spacing-4)',
        padding: 'var(--spacing-4)',
        backgroundColor: 'var(--color-surface-secondary)',
        borderRadius: 'var(--border-radius-md)',
      }}
    >
      <div>
        <div
          style={{
            fontSize: 'var(--typography-font-size-xs)',
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--spacing-1)',
          }}
        >
          Confidence Level
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-2)',
          }}
        >
          <Badge variant={confidenceVariant}>
            {formatPercentage(confidence)}
          </Badge>
          <span
            style={{
              fontSize: 'var(--typography-font-size-sm)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {confidenceMessage}
          </span>
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: 'var(--typography-font-size-xs)',
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--spacing-1)',
          }}
        >
          Total Sample Size
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-2)',
          }}
        >
          <Users
            style={{
              width: 'var(--icon-size-sm)',
              height: 'var(--icon-size-sm)',
              color: 'var(--color-text-secondary)',
            }}
          />
          <span
            style={{
              fontSize: 'var(--typography-font-size-base)',
              fontWeight: 'var(--typography-font-weight-semibold)',
            }}
          >
            {formatNumber(totalRecipients)}
          </span>
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: 'var(--typography-font-size-xs)',
            color: 'var(--color-text-secondary)',
            marginBottom: 'var(--spacing-1)',
          }}
        >
          Test Status
        </div>
        <div>
          <Badge variant={isComplete ? 'success' : 'warning'}>
            {isComplete ? 'Complete' : 'In Progress'}
          </Badge>
        </div>
      </div>
    </div>
  );
}

/**
 * Winner Declaration Dialog
 */
interface WinnerDialogProps {
  readonly isOpen: boolean;
  readonly variantName: string;
  readonly isPending: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

function WinnerDialog({
  isOpen,
  variantName,
  isPending,
  onConfirm,
  onCancel,
}: WinnerDialogProps): ReactElement {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Declare Test Winner</DialogTitle>
          <DialogDescription>
            Are you sure you want to declare &quot;{variantName}&quot; as the
            winning variant? This action will finalize the test results and
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Declaring...' : 'Declare Winner'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ABTestResults({ issueId }: ABTestResultsProps): ReactElement {
  const { data: results, isLoading, isError, error } = useTestResults(issueId);
  const { mutate: declareWinner, isPending } = useDeclareWinner(issueId);

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleDeclareWinner = (variantId: string): void => {
    setSelectedVariantId(variantId);
    setIsDialogOpen(true);
  };

  const handleConfirmWinner = (): void => {
    if (!selectedVariantId) return;

    declareWinner(selectedVariantId);
    // Dialog will close on successful mutation via isPending state
    setIsDialogOpen(false);
    setSelectedVariantId(null);
  };

  const handleCancelWinner = (): void => {
    setIsDialogOpen(false);
    setSelectedVariantId(null);
  };

  // ============================================================================
  // Loading State
  // ============================================================================

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>A/B Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--spacing-12)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <p>Loading test results...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // Error State
  // ============================================================================

  if (isError || !results) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>A/B Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--spacing-12)',
              gap: 'var(--spacing-4)',
            }}
          >
            <p
              style={{
                color: 'var(--color-error)',
                fontSize: 'var(--typography-font-size-sm)',
              }}
            >
              {error?.message || 'Failed to load test results'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // No Test Data
  // ============================================================================

  if (!results.variants || results.variants.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>A/B Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--spacing-12)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <p>No A/B test variants available for this issue.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // Derived Data
  // ============================================================================

  const totalRecipients = results.variants.reduce(
    (sum, v) => sum + v.recipients,
    0
  );
  const winningVariant = results.variants.find((v) => v.is_winner);
  const canDeclareWinner =
    !results.winning_variant_id &&
    results.statistical_significance >= MIN_CONFIDENCE_FOR_WINNER;

  // Get the best performing variant for declaration
  const bestVariant = results.variants.reduce((best, current) => {
    if (!best) return current;
    return current.open_rate > best.open_rate ? current : best;
  }, results.variants[0]);

  const selectedVariant = results.variants.find(
    (v) => v.variant_id === selectedVariantId
  );

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Card>
      <CardHeader>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-3)',
            }}
          >
            <TrendingUp
              style={{
                width: 'var(--icon-size-md)',
                height: 'var(--icon-size-md)',
                color: 'var(--color-primary)',
              }}
            />
            <CardTitle>A/B Test Results</CardTitle>
          </div>

          {canDeclareWinner && bestVariant && (
            <Button
              onClick={() => handleDeclareWinner(bestVariant.variant_id)}
              disabled={isPending}
            >
              <Crown
                style={{
                  width: 'var(--icon-size-sm)',
                  height: 'var(--icon-size-sm)',
                  marginRight: 'var(--spacing-2)',
                }}
              />
              Declare Winner
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-6)',
          }}
        >
          {/* Statistical Results Section */}
          <StatisticalResults
            confidence={results.statistical_significance}
            winningVariantName={winningVariant?.variant_name}
            totalRecipients={totalRecipients}
            isComplete={results.is_complete}
          />

          {/* Variant Comparison Table */}
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
              }}
            >
              <TableHeader />
              <tbody>
                {results.variants.map((variant) => (
                  <VariantRow key={variant.variant_id} variant={variant} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Winner Status Message */}
          {results.winning_variant_id && winningVariant && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-3)',
                padding: 'var(--spacing-4)',
                backgroundColor: 'var(--color-surface-success-subtle)',
                borderRadius: 'var(--border-radius-md)',
                borderWidth: 'var(--border-width-thin)',
                borderStyle: 'solid',
                borderColor: 'var(--color-success)',
              }}
            >
              <Crown
                style={{
                  width: 'var(--icon-size-md)',
                  height: 'var(--icon-size-md)',
                  color: 'var(--color-warning)',
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: 'var(--typography-font-size-sm)',
                    fontWeight: 'var(--typography-font-weight-semibold)',
                    color: 'var(--color-text-default)',
                  }}
                >
                  Winner Declared: {winningVariant.variant_name}
                </div>
                <div
                  style={{
                    fontSize: 'var(--typography-font-size-xs)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {winningVariant.test_value}
                </div>
              </div>
            </div>
          )}

          {/* No Winner Message */}
          {!results.winning_variant_id &&
            results.statistical_significance < MIN_CONFIDENCE_FOR_WINNER && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-3)',
                  padding: 'var(--spacing-4)',
                  backgroundColor: 'var(--color-surface-warning-subtle)',
                  borderRadius: 'var(--border-radius-md)',
                  borderWidth: 'var(--border-width-thin)',
                  borderStyle: 'solid',
                  borderColor: 'var(--color-warning)',
                }}
              >
                <MousePointerClick
                  style={{
                    width: 'var(--icon-size-md)',
                    height: 'var(--icon-size-md)',
                    color: 'var(--color-warning)',
                  }}
                />
                <div>
                  <div
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      fontWeight: 'var(--typography-font-weight-semibold)',
                      color: 'var(--color-text-default)',
                    }}
                  >
                    Test In Progress
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--typography-font-size-xs)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    Waiting for statistical significance (need{' '}
                    {formatPercentage(MIN_CONFIDENCE_FOR_WINNER)} confidence)
                  </div>
                </div>
              </div>
            )}
        </div>
      </CardContent>

      {/* Winner Declaration Dialog */}
      {selectedVariant && (
        <WinnerDialog
          isOpen={isDialogOpen}
          variantName={selectedVariant.variant_name}
          isPending={isPending}
          onConfirm={handleConfirmWinner}
          onCancel={handleCancelWinner}
        />
      )}
    </Card>
  );
}
