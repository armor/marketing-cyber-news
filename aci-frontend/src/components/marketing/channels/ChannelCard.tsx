import { Linkedin, Twitter, Mail, Facebook, Instagram, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { OAuthButton } from './OAuthButton';
import { ChannelStats } from './ChannelStats';
import { useDisconnectChannel } from '../../../hooks/useChannelMutations';
import type { Channel, ChannelType, ConnectionStatus } from '../../../types/channels';

// ============================================
// TYPES
// ============================================

interface ChannelCardProps {
  readonly channel: Channel;
}

// ============================================
// CONSTANTS
// ============================================

const CHANNEL_ICONS: Record<ChannelType, React.ComponentType<{ className?: string }>> = {
  linkedin: Linkedin,
  twitter: Twitter,
  email: Mail,
  facebook: Facebook,
  instagram: Instagram,
};

/**
 * Channel brand colors
 * Note: Social media brand colors (LinkedIn blue, Twitter blue, etc.) are intentionally
 * hardcoded to match official brand guidelines. These are external brand standards,
 * not part of our design system.
 */
const CHANNEL_COLORS: Record<ChannelType, { bg: string; icon: string }> = {
  linkedin: {
    bg: '#0077B5', // LinkedIn brand blue
    icon: 'var(--color-snow)',
  },
  twitter: {
    bg: '#1DA1F2', // Twitter brand blue
    icon: 'var(--color-snow)',
  },
  email: {
    bg: 'var(--color-brand-primary)',
    icon: 'var(--color-bg-elevated)',
  },
  facebook: {
    bg: '#1877F2', // Facebook brand blue
    icon: 'var(--color-snow)',
  },
  instagram: {
    bg: '#E4405F', // Instagram brand pink
    icon: 'var(--color-snow)',
  },
};

// ============================================
// COMPONENT
// ============================================

/**
 * ChannelCard - Display card for a social media channel
 *
 * Shows:
 * - Channel icon and name
 * - Connection status badge
 * - Account name (if connected)
 * - Channel statistics (if connected)
 * - Connect/Disconnect button
 * - Last used timestamp
 * - Error message (if in error state)
 *
 * Usage:
 *   <ChannelCard channel={channelData} />
 */
export function ChannelCard({ channel }: ChannelCardProps) {
  const disconnectMutation = useDisconnectChannel();
  const Icon = CHANNEL_ICONS[channel.type];
  const colors = CHANNEL_COLORS[channel.type];

  const handleDisconnect = async () => {
    try {
      await disconnectMutation.mutateAsync({
        channel_id: channel.id,
        reason: 'User requested disconnect',
      });
    } catch (error) {
      console.error('Failed to disconnect channel:', error);
    }
  };

  const isConnected = channel.status === 'connected';
  const hasError = channel.status === 'error';

  return (
    <Card
      className="overflow-hidden transition-all duration-200 hover:shadow-lg"
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        borderColor: hasError ? 'var(--color-semantic-error)' : 'var(--color-border-default)',
        borderWidth: hasError ? '2px' : '1px',
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          {/* Channel Icon & Name */}
          <div className="flex items-center gap-3">
            <div
              className="rounded-lg p-2.5 flex items-center justify-center"
              style={{
                backgroundColor: colors.bg,
              }}
            >
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <CardTitle
                className="text-lg font-semibold capitalize"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {channel.name}
              </CardTitle>
              {channel.account_name && (
                <p
                  className="text-sm mt-0.5"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  @{channel.account_name}
                </p>
              )}
            </div>
          </div>

          {/* Status Badge */}
          <ConnectionStatusBadge status={channel.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error Message */}
        {hasError && channel.error_message && (
          <div
            className="flex items-start gap-2 p-3 rounded-md"
            style={{
              backgroundColor: 'var(--color-semantic-error-bg)',
              border: '1px solid var(--color-semantic-error)',
            }}
          >
            <AlertCircle
              className="w-4 h-4 mt-0.5 flex-shrink-0"
              style={{ color: 'var(--color-semantic-error)' }}
            />
            <p
              className="text-sm"
              style={{ color: 'var(--color-semantic-error)' }}
            >
              {channel.error_message}
            </p>
          </div>
        )}

        {/* Channel Stats (if connected) */}
        {isConnected && (
          <ChannelStats stats={channel.stats} health={channel.health} />
        )}

        {/* Last Used Timestamp */}
        {channel.last_used_at && (
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: 'var(--color-text-muted)' }}>Last used</span>
            <span style={{ color: 'var(--color-text-secondary)' }}>
              {new Date(channel.last_used_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        )}

        {/* Connect/Disconnect Button */}
        <OAuthButton
          channelType={channel.type}
          isConnected={isConnected}
          onDisconnect={handleDisconnect}
          disabled={disconnectMutation.isPending}
          className="w-full"
        />
      </CardContent>
    </Card>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

interface ConnectionStatusBadgeProps {
  readonly status: ConnectionStatus;
}

function ConnectionStatusBadge({ status }: ConnectionStatusBadgeProps) {
  const statusConfig: Record<
    ConnectionStatus,
    { label: string; bg: string; text: string; icon?: React.ReactNode }
  > = {
    connected: {
      label: 'Connected',
      bg: 'var(--color-semantic-success)',
      text: 'var(--color-bg-elevated)',
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    disconnected: {
      label: 'Disconnected',
      bg: 'var(--color-stone)',
      text: 'var(--color-text-primary)',
    },
    error: {
      label: 'Error',
      bg: 'var(--color-semantic-error)',
      text: 'var(--color-bg-elevated)',
      icon: <AlertCircle className="w-3 h-3" />,
    },
    pending: {
      label: 'Pending',
      bg: 'var(--color-semantic-warning)',
      text: 'var(--color-text-primary)',
    },
  };

  const config = statusConfig[status];

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide"
      style={{
        backgroundColor: config.bg,
        color: config.text,
      }}
    >
      {config.icon}
      {config.label}
    </div>
  );
}
