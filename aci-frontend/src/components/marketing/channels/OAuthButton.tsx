import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { useInitiateOAuth } from '../../../hooks/useChannelMutations';
import type { ChannelType } from '../../../types/channels';

// ============================================
// TYPES
// ============================================

interface OAuthButtonProps {
  readonly channelType: ChannelType;
  readonly isConnected: boolean;
  readonly onDisconnect?: () => void;
  readonly disabled?: boolean;
  readonly className?: string;
}

// ============================================
// COMPONENT
// ============================================

/**
 * OAuthButton - Connect/Disconnect button for OAuth channels
 *
 * Handles:
 * - OAuth flow initiation
 * - Loading state during OAuth
 * - Disconnect action
 * - Error states
 *
 * Usage:
 *   <OAuthButton
 *     channelType="linkedin"
 *     isConnected={false}
 *     onDisconnect={() => handleDisconnect()}
 *   />
 */
export function OAuthButton({
  channelType,
  isConnected,
  onDisconnect,
  disabled = false,
  className = '',
}: OAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const initiateOAuth = useInitiateOAuth();

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      await initiateOAuth.mutateAsync(channelType);
      // OAuth redirect happens in mutation onSuccess
    } catch (error) {
      console.error('OAuth initiation failed:', error);
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    if (onDisconnect) {
      onDisconnect();
    }
  };

  if (isConnected) {
    return (
      <Button
        variant="outline"
        onClick={handleDisconnect}
        disabled={disabled}
        className={className}
        style={{
          borderColor: 'var(--color-semantic-error)',
          color: 'var(--color-semantic-error)',
          backgroundColor: 'transparent',
        }}
      >
        Disconnect
      </Button>
    );
  }

  return (
    <Button
      onClick={handleConnect}
      disabled={disabled || isLoading}
      className={className}
      style={{
        backgroundColor: 'var(--color-brand-primary)',
        color: 'var(--color-bg-elevated)',
        borderColor: 'transparent',
      }}
    >
      {isLoading ? (
        <>
          <Loader2
            className="mr-2 h-4 w-4 animate-spin"
            style={{ color: 'currentColor' }}
          />
          Connecting...
        </>
      ) : (
        'Connect'
      )}
    </Button>
  );
}
