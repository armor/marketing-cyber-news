/**
 * CompetitorMonitorPage.tsx - Competitor Monitoring Page
 *
 * Page wrapper for competitor monitoring functionality.
 * Extracts campaign ID from route params and renders CompetitorMonitor component.
 */

import { useParams } from 'react-router-dom';
import { CompetitorMonitor } from '../components/marketing/competitors/CompetitorMonitor';

export function CompetitorMonitorPage() {
  const { campaignId } = useParams<{ campaignId: string }>();

  if (!campaignId) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            maxWidth: '400px',
          }}
        >
          <h2
            style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--spacing-4)',
            }}
          >
            Campaign Not Found
          </h2>
          <p
            style={{
              fontSize: 'var(--font-size-base)',
              color: 'var(--color-text-muted)',
            }}
          >
            No campaign ID provided. Please navigate from a campaign detail page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: '1400px',
        marginLeft: 'auto',
        marginRight: 'auto',
        padding: 'var(--spacing-6)',
      }}
    >
      <CompetitorMonitor campaignId={campaignId} />
    </div>
  );
}
