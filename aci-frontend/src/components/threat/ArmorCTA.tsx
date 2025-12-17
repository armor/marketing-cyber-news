/**
 * ArmorCTA Component
 * Call-to-action for Armor protection service
 *
 * Features:
 * - Brand-styled card/banner
 * - External link with security attributes
 * - Prominent action button
 * - Uses brand design tokens
 *
 * Used in: ThreatDetail
 */

import React from 'react';
import { Shield, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { colors } from '@/styles/tokens/colors';
import { spacing } from '@/styles/tokens/spacing';
import { typography } from '@/styles/tokens/typography';
import { motion } from '@/styles/tokens/motion';

export interface ArmorCTAProps {
  /**
   * Optional threat ID for tracking/analytics
   */
  readonly threatId?: string;
  /**
   * Additional CSS classes
   */
  readonly className?: string;
}

const ARMOR_URL = 'https://armor.com/protection';

/**
 * ArmorCTA - Call-to-action banner for Armor protection service
 *
 * Features:
 * - Eye-catching brand-colored design
 * - Shield icon for security visual
 * - Primary action button with external link
 * - Accessible with semantic HTML
 *
 * @example
 * ```tsx
 * <ArmorCTA threatId="threat-123" />
 * ```
 */
export function ArmorCTA({
  threatId,
  className,
}: ArmorCTAProps): React.JSX.Element {
  const armorUrlWithTracking = threatId
    ? `${ARMOR_URL}?source=nexus&threat=${threatId}`
    : ARMOR_URL;

  return (
    <aside
      className={cn(
        'rounded-lg border overflow-hidden',
        className
      )}
      style={{
        borderColor: colors.border.default,
        backgroundColor: `color-mix(in srgb, ${colors.brand.primary} 5%, transparent)`,
        borderLeftWidth: '4px',
        borderLeftColor: colors.brand.primary,
        padding: spacing[6],
        display: 'flex',
        flexDirection: 'column',
        gap: spacing[4],
        transition: `all ${motion.duration.normal} ${motion.easing.default}`,
      }}
      aria-labelledby="armor-cta-heading"
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: spacing[3],
        }}
      >
        {/* Icon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: 'var(--border-radius-lg)',
            backgroundColor: `color-mix(in srgb, ${colors.brand.primary} 15%, transparent)`,
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          <Shield
            size={24}
            style={{
              color: colors.brand.primary,
            }}
          />
        </div>

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: spacing[2],
            flex: 1,
          }}
        >
          <h3
            id="armor-cta-heading"
            style={{
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.semibold,
              lineHeight: typography.lineHeight.tight,
              color: colors.text.primary,
              margin: 0,
            }}
          >
            Protect Your Organization with Armor
          </h3>

          <p
            style={{
              fontSize: typography.fontSize.sm,
              lineHeight: typography.lineHeight.normal,
              color: colors.text.secondary,
              margin: 0,
            }}
          >
            Get real-time threat protection, automated incident response, and 24/7 monitoring from Armor's cybersecurity platform. Defend against threats like this before they impact your systems.
          </p>
        </div>
      </div>

      {/* Action Button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing[3],
        }}
      >
        <Button
          asChild
          size="lg"
          style={{
            backgroundColor: colors.brand.primary,
            color: 'white',
            gap: spacing[2],
          }}
          className="hover:opacity-90"
        >
          <a
            href={armorUrlWithTracking}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Learn more about Armor protection (opens in new tab)"
          >
            <span>Learn More About Armor</span>
            <ExternalLink size={16} aria-hidden="true" />
          </a>
        </Button>

        <span
          style={{
            fontSize: typography.fontSize.xs,
            color: colors.text.muted,
          }}
        >
          No credit card required
        </span>
      </div>
    </aside>
  );
}

/**
 * Accessibility Notes:
 * - <aside> element with aria-labelledby for semantic structure
 * - Heading properly labeled with id
 * - Button has descriptive aria-label mentioning new tab
 * - Icon hidden from screen readers (decorative)
 * - High contrast colors for readability
 *
 * Security Notes:
 * - External link uses rel="noopener noreferrer"
 * - Opens in new tab (target="_blank")
 * - URL includes tracking parameters (optional)
 *
 * Design Token Usage:
 * - Colors: colors.brand.primary, colors.text.*, colors.border.default
 * - Spacing: spacing[2-6]
 * - Typography: typography.fontSize.*, typography.fontWeight.*
 * - Motion: motion.duration.normal, motion.easing.default
 *
 * Marketing Notes:
 * - Prominent placement in threat detail view
 * - Value proposition clearly stated
 * - Low-friction CTA ("No credit card required")
 * - Shield icon reinforces security messaging
 */
