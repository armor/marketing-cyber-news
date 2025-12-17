/**
 * MitreTechniquesList Component
 * Displays MITRE ATT&CK techniques
 *
 * Features:
 * - Shows technique ID, name, tactic as badges
 * - External link to attack.mitre.org
 * - Empty state handling
 *
 * Used in: DeepDiveSection
 */

import React from 'react';
import { ExternalLink, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MitreTechnique } from '@/types/threat';
import { Badge } from '@/components/ui/badge';
import { colors } from '@/styles/tokens/colors';
import { spacing } from '@/styles/tokens/spacing';
import { typography } from '@/styles/tokens/typography';

export interface MitreTechniquesListProps {
  /**
   * Array of MITRE techniques to display
   */
  readonly techniques: readonly MitreTechnique[];
  /**
   * Additional CSS classes
   */
  readonly className?: string;
}

/**
 * MitreTechniquesList - Displays list of MITRE ATT&CK techniques
 *
 * Features:
 * - Technique ID with link to MITRE
 * - Technique name
 * - Tactic badge
 * - External link indicator
 * - Empty state
 *
 * @example
 * ```tsx
 * const techniques: MitreTechnique[] = [
 *   {
 *     id: 'T1566.001',
 *     name: 'Spearphishing Attachment',
 *     tactic: 'Initial Access',
 *     url: 'https://attack.mitre.org/techniques/T1566/001',
 *   },
 * ];
 *
 * <MitreTechniquesList techniques={techniques} />
 * ```
 */
export function MitreTechniquesList({
  techniques,
  className,
}: MitreTechniquesListProps): React.JSX.Element {
  // Guard: Empty state
  if (techniques.length === 0) {
    return (
      <div
        data-testid="mitre-techniques-empty"
        style={{
          padding: spacing[6],
          textAlign: 'center',
          color: colors.text.muted,
          fontSize: typography.fontSize.sm,
        }}
        className={className}
      >
        No MITRE ATT&CK techniques available.
      </div>
    );
  }

  return (
    <ul
      data-testid="mitre-techniques-list"
      aria-label="MITRE ATT&CK techniques"
      role="list"
      className={cn('flex flex-col', className)}
      style={{
        gap: spacing[3],
        listStyle: 'none',
        padding: 0,
        margin: 0,
      }}
    >
      {techniques.map((technique) => (
        <li
          key={technique.id}
          role="listitem"
          data-testid="mitre-technique-item"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: spacing[3],
            padding: spacing[3],
            backgroundColor: colors.background.elevated,
            borderRadius: 'var(--border-radius-md)',
            border: `1px solid ${colors.border.default}`,
          }}
        >
          {/* MITRE Shield Icon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: 'var(--border-radius-sm)',
              backgroundColor: colors.background.secondary,
              flexShrink: 0,
            }}
          >
            <Shield size={16} aria-hidden="true" style={{ color: colors.text.secondary }} />
          </div>

          {/* Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: spacing[2],
              flex: 1,
              minWidth: 0,
            }}
          >
            {/* Technique ID + Name */}
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: spacing[2],
                flexWrap: 'wrap',
              }}
            >
              <a
                href={technique.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${technique.id} - ${technique.name} on MITRE ATT&CK (opens in new tab)`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: spacing[2],
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
                  fontFamily: typography.fontFamily.mono,
                  color: colors.brand.primary,
                  textDecoration: 'none',
                  transition: `color var(--motion-duration-fast) var(--motion-easing-default)`,
                }}
                className="hover:text-primary"
              >
                <span>{technique.id}</span>
                <ExternalLink size={12} aria-hidden="true" style={{ flexShrink: 0 }} />
              </a>

              <span
                style={{
                  fontSize: typography.fontSize.base,
                  fontWeight: typography.fontWeight.medium,
                  color: colors.text.primary,
                }}
              >
                {technique.name}
              </span>
            </div>

            {/* Tactic Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing[2],
              }}
            >
              <span
                style={{
                  fontSize: typography.fontSize.xs,
                  color: colors.text.muted,
                  fontWeight: typography.fontWeight.medium,
                }}
              >
                Tactic:
              </span>
              <Badge variant="info" data-testid="tactic-badge">
                {technique.tactic}
              </Badge>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Accessibility Notes:
 * - Semantic <ul> and <li> elements
 * - role="list" for explicit list semantics
 * - aria-label on container
 * - External links have descriptive aria-labels
 * - All icons hidden from screen readers
 * - Keyboard accessible (native anchor elements)
 *
 * Performance Notes:
 * - Pure presentational component
 * - No state management
 * - Efficient rendering (single loop)
 * - Memoization-friendly (React.memo compatible)
 *
 * Design Token Usage:
 * - Colors: colors.text.*, colors.background.*, colors.border.*, colors.brand.*
 * - Spacing: spacing[2-6]
 * - Typography: typography.fontSize.*, typography.fontWeight.*, typography.fontFamily.*
 *
 * Testing:
 * - data-testid="mitre-techniques-list" for container
 * - data-testid="mitre-techniques-empty" for empty state
 * - data-testid="mitre-technique-item" for individual items
 * - data-testid="tactic-badge" for tactic badges
 */
