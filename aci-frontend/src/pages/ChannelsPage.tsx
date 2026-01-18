import { useEffect } from 'react';
import { ChannelHub } from '../components/marketing/channels/ChannelHub';
import { useChannels } from '../hooks/useChannels';
import { PageHeader } from '../components/layout/PageHeader';

// ============================================
// COMPONENT
// ============================================

/**
 * ChannelsPage - Full page wrapper for channel management
 *
 * Features:
 * - Page header with title and description
 * - Channel connection status summary
 * - ChannelHub component for managing connections
 * - Breadcrumb navigation
 *
 * Route: /channels
 *
 * Usage:
 *   <Route path="/channels" element={<ChannelsPage />} />
 */
export function ChannelsPage() {
  const { data } = useChannels();

  useEffect(() => {
    // Set page title
    document.title = 'Channel Hub - Marketing Automation';
  }, []);

  const channels = data?.data || [];
  const connectedCount = channels.filter((ch) => ch.status === 'connected').length;
  const errorCount = channels.filter((ch) => ch.status === 'error').length;

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Channels' },
        ]}
        title="Channel Management"
        description="Connect and manage your social media and email marketing channels"
        actions={
          <div className="flex items-center gap-4">
            {/* Connected Channels Stat */}
            <div className="text-right">
              <div
                className="text-2xl font-bold"
                style={{ color: 'var(--color-brand-primary)' }}
              >
                {connectedCount}
              </div>
              <div
                className="text-xs font-medium"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Connected
              </div>
            </div>

            {/* Error Count (if any) */}
            {errorCount > 0 && (
              <div className="text-right">
                <div
                  className="text-2xl font-bold"
                  style={{ color: 'var(--color-semantic-error)' }}
                >
                  {errorCount}
                </div>
                <div
                  className="text-xs font-medium"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Errors
                </div>
              </div>
            )}
          </div>
        }
      />

      {/* Main Content */}
      <main
        className="flex-1 overflow-y-auto"
        style={{ padding: 'var(--spacing-6)' }}
      >
        <ChannelHub />

        {/* Help Section */}
        <aside style={{ marginTop: 'var(--spacing-8)' }}>
          <div
            className="rounded-lg p-6"
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border-default)',
            }}
          >
            <h3
              className="text-lg font-semibold mb-3"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Getting Started
            </h3>
            <div className="space-y-2">
              <p style={{ color: 'var(--color-text-secondary)' }}>
                <strong>Connect a channel:</strong> Click "Connect" on any available channel to
                authorize access through OAuth.
              </p>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                <strong>Monitor health:</strong> Each connected channel displays real-time health
                status and engagement metrics.
              </p>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                <strong>Disconnect safely:</strong> You can disconnect channels at any time without
                losing historical data.
              </p>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
