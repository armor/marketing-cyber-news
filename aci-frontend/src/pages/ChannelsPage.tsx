import { useEffect } from 'react';
import { ChannelHub } from '../components/marketing/channels/ChannelHub';
import { useChannels } from '../hooks/useChannels';

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
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Page Header */}
      <header
        className="border-b"
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          borderColor: 'var(--color-border-default)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Breadcrumb */}
          <nav className="mb-4">
            <ol className="flex items-center space-x-2 text-sm">
              <li>
                <a
                  href="/"
                  className="hover:underline"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Dashboard
                </a>
              </li>
              <li style={{ color: 'var(--color-text-muted)' }}>/</li>
              <li style={{ color: 'var(--color-text-primary)' }}>Channels</li>
            </ol>
          </nav>

          {/* Title & Stats */}
          <div className="flex items-end justify-between">
            <div>
              <h1
                className="text-3xl font-bold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Channel Management
              </h1>
              <p
                className="mt-2 text-base"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Connect and manage your social media and email marketing channels
              </p>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-6">
              {/* Connected Channels */}
              <div className="text-right">
                <div
                  className="text-3xl font-bold"
                  style={{ color: 'var(--color-brand-primary)' }}
                >
                  {connectedCount}
                </div>
                <div
                  className="text-sm font-medium"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Connected
                </div>
              </div>

              {/* Error Count (if any) */}
              {errorCount > 0 && (
                <div className="text-right">
                  <div
                    className="text-3xl font-bold"
                    style={{ color: 'var(--color-semantic-error)' }}
                  >
                    {errorCount}
                  </div>
                  <div
                    className="text-sm font-medium"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Errors
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ChannelHub />
      </main>

      {/* Help Section */}
      <aside
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8"
        style={{ marginTop: 'var(--spacing-xl)' }}
      >
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
    </div>
  );
}
