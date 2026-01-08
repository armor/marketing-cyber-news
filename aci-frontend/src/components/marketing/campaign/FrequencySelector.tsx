/**
 * FrequencySelector.tsx - Frequency Selection Component
 *
 * Allows users to select posting frequency:
 * - Daily
 * - Weekly
 * - Biweekly
 * - Monthly
 *
 * Shows preview of posting schedule
 */

import { Calendar, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export type Frequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

interface FrequencyOption {
  id: Frequency;
  label: string;
  description: string;
  postsPerMonth: number;
}

const FREQUENCY_OPTIONS: FrequencyOption[] = [
  {
    id: 'daily',
    label: 'Daily',
    description: 'Post every weekday',
    postsPerMonth: 20,
  },
  {
    id: 'weekly',
    label: 'Weekly',
    description: 'Post once per week',
    postsPerMonth: 4,
  },
  {
    id: 'biweekly',
    label: 'Bi-weekly',
    description: 'Post twice per week',
    postsPerMonth: 8,
  },
  {
    id: 'monthly',
    label: 'Monthly',
    description: 'Post once per month',
    postsPerMonth: 1,
  },
];

interface FrequencySelectorProps {
  value: Frequency | null;
  onChange: (frequency: Frequency) => void;
}

export function FrequencySelector({ value, onChange }: FrequencySelectorProps) {
  const selectedOption = FREQUENCY_OPTIONS.find((opt) => opt.id === value);

  return (
    <div>
      <div
        style={{
          marginBottom: 'var(--spacing-4)',
        }}
      >
        <h3
          style={{
            fontSize: 'var(--typography-font-size-lg)',
            fontWeight: 'var(--typography-font-weight-semibold)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--spacing-2)',
          }}
        >
          Posting Frequency
        </h3>
        <p
          style={{
            fontSize: 'var(--typography-font-size-sm)',
            color: 'var(--color-text-secondary)',
          }}
        >
          How often should we publish content?
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--spacing-3)',
        }}
      >
        {FREQUENCY_OPTIONS.map((option) => {
          const isSelected = value === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              style={{
                all: 'unset',
                cursor: 'pointer',
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
                  cursor: 'pointer',
                  height: '100%',
                  background: isSelected
                    ? 'var(--gradient-badge-info)'
                    : 'var(--gradient-card)',
                }}
              >
                <CardHeader>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-2)',
                      marginBottom: 'var(--spacing-2)',
                    }}
                  >
                    <Calendar
                      style={{
                        width: 'var(--spacing-5)',
                        height: 'var(--spacing-5)',
                        color: isSelected
                          ? 'var(--color-brand-primary)'
                          : 'var(--color-text-muted)',
                      }}
                    />
                    <CardTitle
                      style={{
                        fontSize: 'var(--typography-font-size-base)',
                        color: isSelected
                          ? 'var(--color-brand-primary)'
                          : 'var(--color-text-primary)',
                      }}
                    >
                      {option.label}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      color: 'var(--color-text-secondary)',
                      marginBottom: 'var(--spacing-2)',
                    }}
                  >
                    {option.description}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-2)',
                      fontSize: 'var(--typography-font-size-xs)',
                      color: 'var(--color-text-muted)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                    }}
                  >
                    <Clock style={{ width: 'var(--spacing-3)', height: 'var(--spacing-3)' }} />
                    ~{option.postsPerMonth} posts/month
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      {selectedOption && (
        <div
          style={{
            marginTop: 'var(--spacing-4)',
            padding: 'var(--spacing-4)',
            borderRadius: 'var(--border-radius-lg)',
            background: 'var(--gradient-badge-info)',
            border: `var(--border-width-thin) solid var(--color-brand-primary)`,
          }}
        >
          <h4
            style={{
              fontSize: 'var(--typography-font-size-sm)',
              fontWeight: 'var(--typography-font-weight-semibold)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--spacing-2)',
            }}
          >
            Schedule Preview
          </h4>
          <p
            style={{
              fontSize: 'var(--typography-font-size-sm)',
              color: 'var(--color-text-secondary)',
            }}
          >
            With {selectedOption.label.toLowerCase()} posting, you'll publish approximately{' '}
            <strong style={{ color: 'var(--color-brand-primary)' }}>
              {selectedOption.postsPerMonth} posts per month
            </strong>
            . Content will be automatically generated and queued for your approval.
          </p>
        </div>
      )}
    </div>
  );
}
