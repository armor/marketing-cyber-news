/**
 * ContentStyleSelector.tsx - Content Style Selection Component
 *
 * Card-based selector for content style/tone:
 * - Thought Leadership
 * - Product Focused
 * - Educational
 * - Promotional
 */

import { Lightbulb, Package, GraduationCap, Megaphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export type ContentStyle =
  | 'thought-leadership'
  | 'product-focused'
  | 'educational'
  | 'promotional';

interface StyleOption {
  id: ContentStyle;
  label: string;
  description: string;
  icon: React.ElementType;
  examples: string[];
}

const STYLE_OPTIONS: StyleOption[] = [
  {
    id: 'thought-leadership',
    label: 'Thought Leadership',
    description: 'Industry insights and expert perspectives',
    icon: Lightbulb,
    examples: ['Industry trends', 'Expert opinions', 'Future predictions'],
  },
  {
    id: 'product-focused',
    label: 'Product Focused',
    description: 'Highlight features, benefits, and use cases',
    icon: Package,
    examples: ['Feature highlights', 'Use cases', 'Customer success'],
  },
  {
    id: 'educational',
    label: 'Educational',
    description: 'How-to guides and tutorials',
    icon: GraduationCap,
    examples: ['How-to guides', 'Best practices', 'Tips and tricks'],
  },
  {
    id: 'promotional',
    label: 'Promotional',
    description: 'Offers, launches, and announcements',
    icon: Megaphone,
    examples: ['Product launches', 'Special offers', 'Events'],
  },
];

interface ContentStyleSelectorProps {
  value: ContentStyle | null;
  onChange: (style: ContentStyle) => void;
}

export function ContentStyleSelector({ value, onChange }: ContentStyleSelectorProps) {
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
          Content Style
        </h3>
        <p
          style={{
            fontSize: 'var(--typography-font-size-sm)',
            color: 'var(--color-text-secondary)',
          }}
        >
          What tone and style should your content have?
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 'var(--spacing-4)',
        }}
      >
        {STYLE_OPTIONS.map((style) => {
          const Icon = style.icon;
          const isSelected = value === style.id;

          return (
            <button
              key={style.id}
              type="button"
              onClick={() => onChange(style.id)}
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
                      width: 'var(--spacing-10)',
                      height: 'var(--spacing-10)',
                      borderRadius: 'var(--border-radius-lg)',
                      background: isSelected
                        ? 'var(--gradient-badge-info)'
                        : 'var(--gradient-badge-neutral)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 'var(--spacing-3)',
                      transition: `background var(--motion-duration-fast) var(--motion-easing-default)`,
                    }}
                  >
                    <Icon
                      style={{
                        width: 'var(--spacing-5)',
                        height: 'var(--spacing-5)',
                        color: isSelected
                          ? 'var(--color-brand-primary)'
                          : 'var(--color-text-muted)',
                      }}
                    />
                  </div>
                  <CardTitle
                    style={{
                      fontSize: 'var(--typography-font-size-base)',
                      color: isSelected
                        ? 'var(--color-brand-primary)'
                        : 'var(--color-text-primary)',
                    }}
                  >
                    {style.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      lineHeight: 'var(--typography-line-height-normal)',
                      color: 'var(--color-text-secondary)',
                      marginBottom: 'var(--spacing-3)',
                    }}
                  >
                    {style.description}
                  </p>

                  <div>
                    <p
                      style={{
                        fontSize: 'var(--typography-font-size-xs)',
                        fontWeight: 'var(--typography-font-weight-medium)',
                        color: 'var(--color-text-muted)',
                        marginBottom: 'var(--spacing-2)',
                        textTransform: 'uppercase',
                        letterSpacing: 'var(--typography-letter-spacing-wide)',
                      }}
                    >
                      Examples
                    </p>
                    <ul
                      style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--spacing-1)',
                      }}
                    >
                      {style.examples.map((example, index) => (
                        <li
                          key={index}
                          style={{
                            fontSize: 'var(--typography-font-size-xs)',
                            color: 'var(--color-text-muted)',
                            paddingLeft: 'var(--spacing-3)',
                            position: 'relative',
                          }}
                        >
                          <span
                            style={{
                              position: 'absolute',
                              left: 0,
                              color: isSelected
                                ? 'var(--color-brand-primary)'
                                : 'var(--color-text-muted)',
                            }}
                          >
                            •
                          </span>
                          {example}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
}
