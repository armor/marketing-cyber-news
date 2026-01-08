/**
 * MarketingAnalyticsPage.tsx - Analytics Page
 *
 * Main page for viewing marketing campaign analytics.
 * Displays comprehensive performance metrics and insights.
 */

import { useSearchParams } from 'react-router-dom';
import { AnalyticsDashboard } from '@/components/marketing/analytics/AnalyticsDashboard';

export function MarketingAnalyticsPage() {
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get('campaign');

  return (
    <div
      style={{
        padding: 'var(--spacing-xl)',
        maxWidth: '1400px',
        margin: '0 auto',
      }}
    >
      <AnalyticsDashboard campaignId={campaignId || undefined} />
    </div>
  );
}
