/**
 * Newsletter Analytics Page
 *
 * Main analytics page with tabbed navigation for overview, segments, and A/B tests.
 * Provides comprehensive analytics dashboard with export functionality.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EngagementDashboard } from '@/components/newsletter/analytics/EngagementDashboard';
import { SegmentMetrics } from '@/components/newsletter/analytics/SegmentMetrics';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTestResults } from '@/hooks/useNewsletterAnalytics';
import { spacing } from '@/styles/tokens/spacing';
import type { DateRangeParams } from '@/hooks/useNewsletterAnalytics';

// ============================================================================
// Types
// ============================================================================

/**
 * Available tab views
 */
type TabView = 'overview' | 'segments' | 'tests';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Export analytics data to CSV
 */
function exportToCSV(data: unknown, filename: string): void {
  // Convert data to CSV format
  const csvContent = JSON.stringify(data, null, 2);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Props for TabButton component
 */
interface TabButtonProps {
  readonly label: string;
  readonly isActive: boolean;
  readonly onClick: () => void;
}

/**
 * Tab navigation button (memoized to prevent unnecessary re-renders)
 */
const TabButton = React.memo<TabButtonProps>(({ label, isActive, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: `${spacing[3]} ${spacing[4]}`,
        fontSize: 'var(--typography-font-size-sm)',
        fontWeight: 'var(--typography-font-weight-medium)',
        color: isActive
          ? 'var(--color-accent-armorBlue)'
          : 'var(--color-text-secondary)',
        backgroundColor: 'transparent',
        border: 'none',
        borderBottom: isActive
          ? '2px solid var(--color-accent-armorBlue)'
          : '2px solid transparent',
        cursor: 'pointer',
        transition: 'all var(--motion-duration-fast) var(--motion-ease-default)',
      }}
      data-testid={`tab-${label.toLowerCase()}`}
      aria-selected={isActive}
      role="tab"
    >
      {label}
    </button>
  );
});

TabButton.displayName = 'TabButton';

/**
 * A/B Test Results View Component
 */
const ABTestResultsView: React.FC = () => {
  const { data, isLoading, isError, error } = useTestResults();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isError) {
    return (
      <EmptyState
        title="Error loading test results"
        description={error?.message ?? 'Failed to load A/B test results'}
      />
    );
  }

  if (!data || data.variants.length === 0) {
    return (
      <EmptyState
        title="No A/B tests available"
        description="Run A/B tests on your newsletters to see results here"
      />
    );
  }

  const winningVariant = data.variants.find((v) => v.is_winner);

  return (
    <div data-testid="ab-test-results">
      <Card style={{ marginBottom: spacing[6] }}>
        <CardHeader>
          <CardTitle>Test Overview</CardTitle>
          <CardDescription>
            {data.test_type.replace(/_/g, ' ').toUpperCase()} Test
            {data.is_complete ? ' - Complete' : ' - In Progress'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: spacing[4],
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 'var(--typography-font-size-sm)',
                  color: 'var(--color-text-secondary)',
                  marginBottom: spacing[1],
                }}
              >
                Started
              </div>
              <div
                style={{
                  fontSize: 'var(--typography-font-size-base)',
                  fontWeight: 'var(--typography-font-weight-semibold)',
                }}
              >
                {new Date(data.test_started_at).toLocaleDateString()}
              </div>
            </div>
            {data.test_completed_at && (
              <div>
                <div
                  style={{
                    fontSize: 'var(--typography-font-size-sm)',
                    color: 'var(--color-text-secondary)',
                    marginBottom: spacing[1],
                  }}
                >
                  Completed
                </div>
                <div
                  style={{
                    fontSize: 'var(--typography-font-size-base)',
                    fontWeight: 'var(--typography-font-weight-semibold)',
                  }}
                >
                  {new Date(data.test_completed_at).toLocaleDateString()}
                </div>
              </div>
            )}
            <div>
              <div
                style={{
                  fontSize: 'var(--typography-font-size-sm)',
                  color: 'var(--color-text-secondary)',
                  marginBottom: spacing[1],
                }}
              >
                Statistical Significance
              </div>
              <div
                style={{
                  fontSize: 'var(--typography-font-size-base)',
                  fontWeight: 'var(--typography-font-weight-semibold)',
                  color:
                    data.statistical_significance >= 95
                      ? 'var(--color-semantic-success)'
                      : 'var(--color-semantic-warning)',
                }}
              >
                {data.statistical_significance.toFixed(1)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: spacing[4],
        }}
      >
        {data.variants.map((variant) => (
          <Card
            key={variant.variant_id}
            style={{
              borderLeftWidth: variant.is_winner ? 'var(--spacing-1)' : undefined,
              borderLeftColor: variant.is_winner
                ? 'var(--color-semantic-success)'
                : undefined,
            }}
            data-testid={`variant-${variant.variant_id}`}
          >
            <CardHeader>
              <CardTitle>
                {variant.variant_name}
                {variant.is_winner && ' 🏆'}
              </CardTitle>
              <CardDescription>{variant.test_value}</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: spacing[3],
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    Recipients
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--typography-font-size-lg)',
                      fontWeight: 'var(--typography-font-weight-semibold)',
                    }}
                  >
                    {variant.recipients.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    Open Rate
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--typography-font-size-lg)',
                      fontWeight: 'var(--typography-font-weight-semibold)',
                    }}
                  >
                    {(variant.open_rate * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    Click Rate
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--typography-font-size-lg)',
                      fontWeight: 'var(--typography-font-weight-semibold)',
                    }}
                  >
                    {(variant.click_rate * 100).toFixed(1)}%
                  </div>
                </div>
                {variant.confidence_level !== undefined && (
                  <div>
                    <div
                      style={{
                        fontSize: 'var(--typography-font-size-sm)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      Confidence Level
                    </div>
                    <div
                      style={{
                        fontSize: 'var(--typography-font-size-lg)',
                        fontWeight: 'var(--typography-font-weight-semibold)',
                      }}
                    >
                      {variant.confidence_level.toFixed(1)}%
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {winningVariant && data.is_complete && (
        <Card
          style={{
            marginTop: spacing[6],
            backgroundColor: 'var(--color-bg-success-subtle)',
            borderColor: 'var(--color-semantic-success)',
          }}
        >
          <CardHeader>
            <CardTitle>Winner: {winningVariant.variant_name}</CardTitle>
            <CardDescription>
              This variant performed {((winningVariant.open_rate * 100) -
                (data.variants.find(v => !v.is_winner)?.open_rate ?? 0) * 100).toFixed(1)}%
              better on open rate
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * Newsletter Analytics Page Component
 *
 * Comprehensive analytics dashboard with tabbed navigation for:
 * - Overview: Engagement metrics and KPIs
 * - Segments: Segment-specific analytics
 * - A/B Tests: Test results and comparisons
 *
 * @example
 * ```tsx
 * <NewsletterAnalyticsPage />
 * ```
 */
export const NewsletterAnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabView>('overview');
  const [dateRange, setDateRange] = useState<DateRangeParams>({
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
  });

  const handleExport = (): void => {
    const filename = `newsletter-analytics-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV({ dateRange, tab: activeTab }, filename);
  };

  return (
    <div data-testid="newsletter-analytics-page">
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing[6],
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 'var(--typography-font-size-3xl)',
              fontWeight: 'var(--typography-font-weight-bold)',
              color: 'var(--color-text-primary)',
              marginBottom: spacing[2],
            }}
          >
            Newsletter Analytics
          </h1>
          <p
            style={{
              fontSize: 'var(--typography-font-size-base)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Track engagement metrics, segment performance, and A/B test results
          </p>
        </div>
        <Button onClick={handleExport} data-testid="export-button">
          Export Data
        </Button>
      </div>

      {/* Tab Navigation */}
      <div
        style={{
          borderBottom: '1px solid var(--color-border-default)',
          marginBottom: spacing[6],
        }}
        role="tablist"
      >
        <TabButton
          label="Overview"
          isActive={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
        />
        <TabButton
          label="Segments"
          isActive={activeTab === 'segments'}
          onClick={() => setActiveTab('segments')}
        />
        <TabButton
          label="A/B Tests"
          isActive={activeTab === 'tests'}
          onClick={() => setActiveTab('tests')}
        />
      </div>

      {/* Tab Content */}
      <div role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
        {activeTab === 'overview' && (
          <EngagementDashboard
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        )}
        {activeTab === 'segments' && (
          <SegmentMetrics dateRange={dateRange} />
        )}
        {activeTab === 'tests' && <ABTestResultsView />}
      </div>
    </div>
  );
};

NewsletterAnalyticsPage.displayName = 'NewsletterAnalyticsPage';

export default NewsletterAnalyticsPage;
