import { Plus, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../ui/button';
import { ChannelCard } from './ChannelCard';
import { useChannels } from '../../../hooks/useChannels';
import type { ChannelType } from '../../../types/channels';

// ============================================
// TYPES
// ============================================

interface AvailableChannel {
  readonly type: ChannelType;
  readonly name: string;
  readonly description: string;
}

// ============================================
// CONSTANTS
// ============================================

const AVAILABLE_CHANNELS: readonly AvailableChannel[] = [
  {
    type: 'linkedin',
    name: 'LinkedIn',
    description: 'Connect your LinkedIn company page',
  },
  {
    type: 'twitter',
    name: 'Twitter',
    description: 'Connect your Twitter/X account',
  },
  {
    type: 'email',
    name: 'Email',
    description: 'Connect your email marketing platform',
  },
  {
    type: 'facebook',
    name: 'Facebook',
    description: 'Connect your Facebook page',
  },
  {
    type: 'instagram',
    name: 'Instagram',
    description: 'Connect your Instagram business account',
  },
] as const;

// ============================================
// COMPONENT
// ============================================

/**
 * ChannelHub - Main dashboard for managing social media connections
 *
 * Features:
 * - Grid display of connected channels
 * - Connection status overview
 * - "Connect New Channel" section
 * - Refresh all channels
 *
 * Usage:
 *   <ChannelHub />
 */
export function ChannelHub() {
  const [showAvailable, setShowAvailable] = useState(false);
  const { data, isLoading, error, refetch, isFetching } = useChannels();

  const channels = data?.data || [];
  const connectedCount = channels.filter((ch) => ch.status === 'connected').length;
  const totalCount = channels.length;

  const connectedTypes = new Set(channels.map((ch) => ch.type));
  const availableToConnect = AVAILABLE_CHANNELS.filter(
    (ch) => !connectedTypes.has(ch.type)
  );

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center min-h-96"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <div className="text-center space-y-2">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin" />
          <p>Loading channels...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center justify-center min-h-96"
        style={{ color: 'var(--color-semantic-error)' }}
      >
        <div className="text-center space-y-2">
          <p className="font-semibold">Failed to load channels</p>
          <p className="text-sm">{(error as Error).message}</p>
          <Button onClick={handleRefresh} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-2xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Channel Hub
          </h2>
          <p
            className="text-sm mt-1"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Manage your social media and marketing channel connections
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection Status Summary */}
          <div
            className="px-4 py-2 rounded-lg"
            style={{
              backgroundColor: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border-default)',
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Connected:
              </span>
              <span
                className="text-lg font-bold"
                style={{ color: 'var(--color-brand-primary)' }}
              >
                {connectedCount}/{totalCount}
              </span>
            </div>
          </div>

          {/* Refresh Button */}
          <Button
            onClick={handleRefresh}
            disabled={isFetching}
            variant="outline"
            size="sm"
            style={{
              borderColor: 'var(--color-border-default)',
            }}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Connected Channels Grid */}
      {channels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {channels.map((channel) => (
            <ChannelCard key={channel.id} channel={channel} />
          ))}
        </div>
      ) : (
        <div
          className="text-center py-12 rounded-lg"
          style={{
            backgroundColor: 'var(--color-bg-elevated)',
            border: '2px dashed var(--color-border-default)',
          }}
        >
          <p
            className="text-lg font-semibold mb-2"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            No channels connected
          </p>
          <p
            className="text-sm mb-4"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Connect your first channel to start publishing content
          </p>
          <Button
            onClick={() => setShowAvailable(true)}
            style={{
              backgroundColor: 'var(--color-brand-primary)',
              color: 'var(--color-bg-elevated)',
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Connect Channel
          </Button>
        </div>
      )}

      {/* Connect New Channel Section */}
      {availableToConnect.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3
              className="text-lg font-semibold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Available Channels
            </h3>
            <Button
              onClick={() => setShowAvailable(!showAvailable)}
              variant="ghost"
              size="sm"
            >
              {showAvailable ? 'Hide' : 'Show'}
            </Button>
          </div>

          {showAvailable && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableToConnect.map((channel) => (
                <div
                  key={channel.type}
                  className="p-4 rounded-lg transition-all duration-200 hover:shadow-md"
                  style={{
                    backgroundColor: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border-default)',
                  }}
                >
                  <h4
                    className="font-semibold mb-1"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {channel.name}
                  </h4>
                  <p
                    className="text-sm mb-3"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {channel.description}
                  </p>
                  <Button
                    size="sm"
                    className="w-full"
                    style={{
                      backgroundColor: 'var(--color-brand-primary)',
                      color: 'var(--color-bg-elevated)',
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Connect
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
