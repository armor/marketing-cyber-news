/**
 * ChannelPicker.tsx - Channel Selection Component
 *
 * Multi-select grid for choosing marketing channels:
 * - LinkedIn
 * - Twitter
 * - Email
 *
 * Shows connection status for each channel
 */

import { Linkedin, Twitter, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export type Channel = 'linkedin' | 'twitter' | 'email';

interface ChannelOption {
  id: Channel;
  label: string;
  description: string;
  icon: React.ElementType;
  connected: boolean;
}

// TODO: Replace with actual connection status from API
const CHANNEL_OPTIONS: ChannelOption[] = [
  {
    id: 'linkedin',
    label: 'LinkedIn',
    description: 'Professional network for B2B campaigns',
    icon: Linkedin,
    connected: true,
  },
  {
    id: 'twitter',
    label: 'Twitter/X',
    description: 'Real-time engagement and news sharing',
    icon: Twitter,
    connected: true,
  },
  {
    id: 'email',
    label: 'Email',
    description: 'Direct communication with subscribers',
    icon: Mail,
    connected: false,
  },
];

interface ChannelPickerProps {
  selected: string[];
  onChange: (channels: string[]) => void;
}

export function ChannelPicker({ selected, onChange }: ChannelPickerProps) {
  const toggleChannel = (channelId: string) => {
    if (selected.includes(channelId)) {
      onChange(selected.filter((id) => id !== channelId));
    } else {
      onChange([...selected, channelId]);
    }
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 'var(--spacing-4)',
      }}
    >
      {CHANNEL_OPTIONS.map((channel) => {
        const Icon = channel.icon;
        const isSelected = selected.includes(channel.id);
        const isDisabled = !channel.connected;

        return (
          <button
            key={channel.id}
            type="button"
            onClick={() => !isDisabled && toggleChannel(channel.id)}
            disabled={isDisabled}
            style={{
              all: 'unset',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              opacity: isDisabled ? 0.6 : 1,
            }}
          >
            <Card
              style={{
                borderColor: isSelected
                  ? 'var(--color-brand-primary)'
                  : 'var(--color-border-default)',
                borderWidth: isSelected
                  ? 'var(--border-width-medium)'
                  : 'var(--border-width-thin)',
                transition: `all var(--motion-duration-fast) var(--motion-easing-default)`,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                height: '100%',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                position: 'relative',
              }}
            >
              <CardHeader>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: 'var(--spacing-3)',
                  }}
                >
                  <div
                    style={{
                      width: 'var(--spacing-12)',
                      height: 'var(--spacing-12)',
                      borderRadius: 'var(--border-radius-lg)',
                      background: isSelected
                        ? 'var(--gradient-badge-info)'
                        : 'var(--gradient-badge-neutral)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: `background var(--motion-duration-fast) var(--motion-easing-default)`,
                    }}
                  >
                    <Icon
                      style={{
                        width: 'var(--spacing-6)',
                        height: 'var(--spacing-6)',
                        color: isSelected
                          ? 'var(--color-brand-primary)'
                          : 'var(--color-text-muted)',
                      }}
                    />
                  </div>

                  <Badge
                    variant={channel.connected ? 'success' : 'warning'}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-1)',
                    }}
                  >
                    {channel.connected ? (
                      <>
                        <CheckCircle2 style={{ width: 'var(--spacing-3)', height: 'var(--spacing-3)' }} />
                        Connected
                      </>
                    ) : (
                      <>
                        <AlertCircle style={{ width: 'var(--spacing-3)', height: 'var(--spacing-3)' }} />
                        Not Connected
                      </>
                    )}
                  </Badge>
                </div>

                <CardTitle
                  style={{
                    fontSize: 'var(--typography-font-size-lg)',
                    color: isSelected
                      ? 'var(--color-brand-primary)'
                      : 'var(--color-text-primary)',
                  }}
                >
                  {channel.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  style={{
                    fontSize: 'var(--typography-font-size-sm)',
                    lineHeight: 'var(--typography-line-height-normal)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {channel.description}
                </p>

                {isDisabled && (
                  <p
                    style={{
                      fontSize: 'var(--typography-font-size-xs)',
                      color: 'var(--color-semantic-warning)',
                      marginTop: 'var(--spacing-3)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                    }}
                  >
                    Connect this channel in settings to use it
                  </p>
                )}
              </CardContent>

              {isSelected && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'var(--spacing-3)',
                    right: 'var(--spacing-3)',
                    width: 'var(--spacing-6)',
                    height: 'var(--spacing-6)',
                    borderRadius: 'var(--border-radius-full)',
                    background: 'var(--color-brand-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle2
                    style={{
                      width: 'var(--spacing-4)',
                      height: 'var(--spacing-4)',
                      color: 'white',
                    }}
                  />
                </div>
              )}
            </Card>
          </button>
        );
      })}
    </div>
  );
}
