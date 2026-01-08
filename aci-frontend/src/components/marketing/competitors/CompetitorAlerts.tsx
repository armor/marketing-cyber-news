/**
 * CompetitorAlerts.tsx - Competitor Alerts Component
 *
 * Displays recent alerts from competitor monitoring:
 * - New content alerts
 * - High engagement alerts
 * - Topic match alerts
 * - Frequency change alerts
 */

import { Bell, TrendingUp, Hash, Calendar, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { CompetitorAlert } from '../../../types/marketing';

interface CompetitorAlertsProps {
  alerts: CompetitorAlert[];
  isLoading?: boolean;
  onMarkRead?: (alertId: string) => void;
}

const ALERT_TYPE_ICONS = {
  new_content: Bell,
  high_engagement: TrendingUp,
  topic_match: Hash,
  frequency_change: Calendar,
};

const ALERT_TYPE_LABELS = {
  new_content: 'New Content',
  high_engagement: 'High Engagement',
  topic_match: 'Topic Match',
  frequency_change: 'Frequency Change',
};

export function CompetitorAlerts({ alerts, isLoading, onMarkRead }: CompetitorAlertsProps) {
  const unreadAlerts = alerts.filter((a) => !a.is_read);

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
          <CardTitle>Competitor Alerts</CardTitle>
          {unreadAlerts.length > 0 && (
            <Badge variant="destructive">{unreadAlerts.length} unread</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <p
            style={{
              fontSize: 'var(--font-size-base)',
              color: 'var(--color-text-muted)',
              textAlign: 'center',
              padding: 'var(--spacing-4)',
            }}
          >
            Loading alerts...
          </p>
        )}

        {!isLoading && alerts.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--spacing-6)',
            }}
          >
            <Bell
              style={{
                width: 'var(--spacing-12)',
                height: 'var(--spacing-12)',
                color: 'var(--color-text-muted)',
                marginLeft: 'auto',
                marginRight: 'auto',
                marginBottom: 'var(--spacing-4)',
              }}
            />
            <p
              style={{
                fontSize: 'var(--font-size-base)',
                color: 'var(--color-text-muted)',
              }}
            >
              No alerts yet
            </p>
          </div>
        )}

        {!isLoading && alerts.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-2)',
            }}
          >
            {alerts.map((alert) => {
              const IconComponent = ALERT_TYPE_ICONS[alert.alert_type];
              return (
                <div
                  key={alert.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--spacing-3)',
                    padding: 'var(--spacing-3)',
                    borderRadius: 'var(--border-radius-md)',
                    background: alert.is_read
                      ? 'transparent'
                      : 'var(--color-surface-secondary)',
                    borderWidth: 'var(--border-width-thin)',
                    borderStyle: 'solid',
                    borderColor: alert.is_read
                      ? 'var(--color-border-default)'
                      : 'var(--color-brand-primary)',
                    transition: 'all var(--motion-duration-normal) var(--motion-ease-default)',
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: 'var(--spacing-10)',
                      height: 'var(--spacing-10)',
                      borderRadius: 'var(--border-radius-full)',
                      background: 'var(--color-surface-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <IconComponent
                      style={{
                        width: 'var(--spacing-5)',
                        height: 'var(--spacing-5)',
                        color: 'var(--color-brand-primary)',
                      }}
                    />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-2)',
                        marginBottom: 'var(--spacing-1)',
                      }}
                    >
                      <Badge variant="outline" style={{ fontSize: 'var(--font-size-xs)' }}>
                        {ALERT_TYPE_LABELS[alert.alert_type]}
                      </Badge>
                      <span
                        style={{
                          fontSize: 'var(--font-size-xs)',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        {new Date(alert.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text-primary)',
                        lineHeight: '1.5',
                      }}
                    >
                      {alert.message}
                    </p>
                  </div>

                  {/* Mark as read button */}
                  {!alert.is_read && onMarkRead && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onMarkRead(alert.id)}
                      title="Mark as read"
                      style={{
                        flexShrink: 0,
                      }}
                    >
                      <Check
                        style={{
                          width: 'var(--spacing-4)',
                          height: 'var(--spacing-4)',
                        }}
                      />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
