/**
 * GoalSelector.tsx - Campaign Goal Selection Component
 *
 * Visual card-based selector for campaign goals:
 * - Awareness
 * - Lead Generation
 * - Engagement
 * - Traffic
 */

import { Target, Users, Heart, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export type CampaignGoal = 'awareness' | 'leads' | 'engagement' | 'traffic';

interface GoalOption {
  id: CampaignGoal;
  label: string;
  description: string;
  icon: React.ElementType;
}

const GOAL_OPTIONS: GoalOption[] = [
  {
    id: 'awareness',
    label: 'Brand Awareness',
    description: 'Increase visibility and reach new audiences',
    icon: TrendingUp,
  },
  {
    id: 'leads',
    label: 'Lead Generation',
    description: 'Capture qualified leads and grow your pipeline',
    icon: Users,
  },
  {
    id: 'engagement',
    label: 'Engagement',
    description: 'Build relationships and community interaction',
    icon: Heart,
  },
  {
    id: 'traffic',
    label: 'Website Traffic',
    description: 'Drive visitors to your website or landing pages',
    icon: Target,
  },
];

interface GoalSelectorProps {
  value: CampaignGoal | null;
  onChange: (goal: CampaignGoal) => void;
}

export function GoalSelector({ value, onChange }: GoalSelectorProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: 'var(--spacing-4)',
      }}
    >
      {GOAL_OPTIONS.map((goal) => {
        const Icon = goal.icon;
        const isSelected = value === goal.id;

        return (
          <button
            key={goal.id}
            type="button"
            onClick={() => onChange(goal.id)}
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
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              <CardHeader>
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
                    marginBottom: 'var(--spacing-4)',
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
                <CardTitle
                  style={{
                    fontSize: 'var(--typography-font-size-lg)',
                    color: isSelected
                      ? 'var(--color-brand-primary)'
                      : 'var(--color-text-primary)',
                  }}
                >
                  {goal.label}
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
                  {goal.description}
                </p>
              </CardContent>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
