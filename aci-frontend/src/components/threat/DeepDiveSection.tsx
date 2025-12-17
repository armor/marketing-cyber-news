/**
 * DeepDiveSection Component
 * Premium deep dive content container with paywall
 *
 * Features:
 * - Locked state: preview with blur overlay and upgrade CTA
 * - Unlocked state: full content with sub-components
 * - Technical analysis, IOCs, MITRE techniques, timeline
 * - Executive summary and detailed remediation (markdown)
 *
 * Used in: ThreatDetail
 */

import React, { useState } from 'react';
import { Lock, Unlock, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DeepDive } from '@/types/threat';
import { Button } from '@/components/ui/button';
import { IOCTable } from './IOCTable';
import { MitreTechniquesList } from './MitreTechniquesList';
import { ThreatTimeline } from './ThreatTimeline';
import { colors } from '@/styles/tokens/colors';
import { spacing } from '@/styles/tokens/spacing';
import { typography } from '@/styles/tokens/typography';

export interface DeepDiveSectionProps {
  /**
   * Deep dive content data
   */
  readonly deepDive?: DeepDive;
  /**
   * Whether content is locked (requires upgrade)
   */
  readonly isLocked: boolean;
  /**
   * Callback when upgrade CTA is clicked
   */
  readonly onUpgrade?: () => void;
  /**
   * Additional CSS classes
   */
  readonly className?: string;
}

/**
 * Renders markdown content as HTML (basic implementation)
 * In production, use a proper markdown renderer like react-markdown
 */
function renderMarkdown(markdown: string): React.JSX.Element {
  return (
    <div
      style={{
        fontSize: typography.fontSize.base,
        lineHeight: typography.lineHeight.relaxed,
        color: colors.text.primary,
      }}
      dangerouslySetInnerHTML={{
        __html: markdown
          .split('\n\n')
          .map((para) => `<p style="margin: 0 0 ${spacing[4]} 0">${para}</p>`)
          .join(''),
      }}
    />
  );
}

/**
 * Collapsible section component
 */
interface CollapsibleSectionProps {
  readonly title: string;
  readonly children: React.ReactNode;
  readonly defaultOpen?: boolean;
  readonly testId?: string;
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  testId,
}: CollapsibleSectionProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);

  const handleToggle = (): void => {
    setIsOpen((prev) => !prev);
  };

  return (
    <div
      data-testid={testId}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing[4],
        padding: spacing[4],
        backgroundColor: colors.background.elevated,
        borderRadius: 'var(--border-radius-lg)',
        border: `1px solid ${colors.border.default}`,
      }}
    >
      {/* Section Header */}
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-controls={`${testId}-content`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: 0,
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <h3
          style={{
            fontSize: typography.fontSize.lg,
            fontWeight: typography.fontWeight.semibold,
            color: colors.text.primary,
            margin: 0,
          }}
        >
          {title}
        </h3>

        {isOpen ? (
          <ChevronUp size={20} aria-hidden="true" style={{ color: colors.text.secondary }} />
        ) : (
          <ChevronDown size={20} aria-hidden="true" style={{ color: colors.text.secondary }} />
        )}
      </button>

      {/* Section Content */}
      {isOpen && (
        <div id={`${testId}-content`} style={{ paddingTop: spacing[2] }}>
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * DeepDiveSection - Premium content container with paywall
 *
 * Features:
 * - Locked state with upgrade CTA
 * - Unlocked state with full technical content
 * - Collapsible sections for better UX
 * - Technical analysis, IOCs, MITRE, timeline
 *
 * @example
 * ```tsx
 * <DeepDiveSection
 *   deepDive={threat.deepDive}
 *   isLocked={!user.isPremium}
 *   onUpgrade={() => navigate('/upgrade')}
 * />
 * ```
 */
export function DeepDiveSection({
  deepDive,
  isLocked,
  onUpgrade,
  className,
}: DeepDiveSectionProps): React.JSX.Element | null {
  // Guard: No deep dive available
  if (!deepDive || !deepDive.isAvailable) {
    return null;
  }

  // Locked State - Show preview with upgrade CTA
  if (isLocked) {
    return (
      <section
        data-testid="deep-dive-locked"
        className={cn('flex flex-col', className)}
        style={{
          gap: spacing[6],
          padding: spacing[6],
          backgroundColor: colors.background.elevated,
          borderRadius: 'var(--border-radius-lg)',
          border: `2px solid ${colors.border.default}`,
          position: 'relative',
        }}
      >
        {/* Lock Icon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[3],
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius: 'var(--border-radius-md)',
              backgroundColor: colors.background.secondary,
            }}
          >
            <Lock size={24} aria-hidden="true" style={{ color: colors.text.secondary }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[1] }}>
            <h2
              style={{
                fontSize: typography.fontSize.xl,
                fontWeight: typography.fontWeight.bold,
                color: colors.text.primary,
                margin: 0,
              }}
            >
              Premium Deep Dive
            </h2>
            <p
              style={{
                fontSize: typography.fontSize.sm,
                color: colors.text.secondary,
                margin: 0,
              }}
            >
              Unlock advanced threat intelligence and remediation guidance
            </p>
          </div>
        </div>

        {/* Preview Content */}
        {deepDive.preview && (
          <div
            style={{
              position: 'relative',
              padding: spacing[4],
              backgroundColor: colors.background.primary,
              borderRadius: 'var(--border-radius-md)',
              overflow: 'hidden',
            }}
          >
            <p
              style={{
                fontSize: typography.fontSize.base,
                lineHeight: typography.lineHeight.relaxed,
                color: colors.text.secondary,
                margin: 0,
                filter: 'blur(4px)',
                userSelect: 'none',
              }}
            >
              {deepDive.preview}
            </p>
          </div>
        )}

        {/* Upgrade CTA */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: spacing[4],
            padding: spacing[6],
            backgroundColor: colors.background.primary,
            borderRadius: 'var(--border-radius-md)',
          }}
        >
          <p
            style={{
              fontSize: typography.fontSize.base,
              textAlign: 'center',
              color: colors.text.primary,
              margin: 0,
            }}
          >
            Get access to IOCs, MITRE techniques, attack timelines, and detailed remediation steps
          </p>

          <Button onClick={onUpgrade} size="lg" data-testid="upgrade-button">
            <Unlock size={16} style={{ marginRight: spacing[2] }} aria-hidden="true" />
            Upgrade to Premium
          </Button>
        </div>
      </section>
    );
  }

  // Unlocked State - Show full content
  return (
    <section
      data-testid="deep-dive-unlocked"
      className={cn('flex flex-col', className)}
      style={{
        gap: spacing[6],
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing[3],
          paddingBottom: spacing[4],
          borderBottom: `2px solid ${colors.border.default}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: 'var(--border-radius-md)',
            backgroundColor: colors.background.elevated,
          }}
        >
          <Unlock size={24} aria-hidden="true" style={{ color: colors.brand.primary }} />
        </div>

        <h2
          style={{
            fontSize: typography.fontSize['2xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            margin: 0,
          }}
        >
          Deep Dive Analysis
        </h2>
      </div>

      {/* Executive Summary */}
      {deepDive.executiveSummary && (
        <CollapsibleSection
          title="Executive Summary"
          defaultOpen={true}
          testId="executive-summary-section"
        >
          {renderMarkdown(deepDive.executiveSummary)}
        </CollapsibleSection>
      )}

      {/* Technical Analysis */}
      {deepDive.technicalAnalysis && (
        <CollapsibleSection title="Technical Analysis" testId="technical-analysis-section">
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
            <div>
              <h4
                style={{
                  fontSize: typography.fontSize.base,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text.primary,
                  marginBottom: spacing[2],
                }}
              >
                Attack Vector
              </h4>
              <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, margin: 0 }}>
                {deepDive.technicalAnalysis.attackVector}
              </p>
            </div>

            <div>
              <h4
                style={{
                  fontSize: typography.fontSize.base,
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text.primary,
                  marginBottom: spacing[2],
                }}
              >
                Exploitation Method
              </h4>
              <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, margin: 0 }}>
                {deepDive.technicalAnalysis.exploitationMethod}
              </p>
            </div>

            {deepDive.technicalAnalysis.affectedSystems.length > 0 && (
              <div>
                <h4
                  style={{
                    fontSize: typography.fontSize.base,
                    fontWeight: typography.fontWeight.semibold,
                    color: colors.text.primary,
                    marginBottom: spacing[2],
                  }}
                >
                  Affected Systems
                </h4>
                <ul style={{ margin: 0, paddingLeft: spacing[5] }}>
                  {deepDive.technicalAnalysis.affectedSystems.map((system, index) => (
                    <li
                      key={index}
                      style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}
                    >
                      {system}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* MITRE ATT&CK Techniques */}
      {deepDive.mitreTechniques.length > 0 && (
        <CollapsibleSection title="MITRE ATT&CK Techniques" testId="mitre-techniques-section">
          <MitreTechniquesList techniques={deepDive.mitreTechniques} />
        </CollapsibleSection>
      )}

      {/* Indicators of Compromise */}
      {deepDive.iocs.length > 0 && (
        <CollapsibleSection title="Indicators of Compromise" testId="iocs-section">
          <IOCTable iocs={deepDive.iocs} />
        </CollapsibleSection>
      )}

      {/* Attack Timeline */}
      {deepDive.timeline.length > 0 && (
        <CollapsibleSection title="Attack Timeline" testId="timeline-section">
          <ThreatTimeline timeline={deepDive.timeline} />
        </CollapsibleSection>
      )}

      {/* Detailed Remediation */}
      {deepDive.detailedRemediation && (
        <CollapsibleSection title="Detailed Remediation" defaultOpen={true} testId="remediation-section">
          {renderMarkdown(deepDive.detailedRemediation)}
        </CollapsibleSection>
      )}

      {/* Threat Actor Profile */}
      {deepDive.threatActorProfile && (
        <CollapsibleSection title="Threat Actor Profile" testId="threat-actor-section">
          {renderMarkdown(deepDive.threatActorProfile)}
        </CollapsibleSection>
      )}
    </section>
  );
}

/**
 * Accessibility Notes:
 * - Semantic <section> element
 * - Proper heading hierarchy (h2, h3, h4)
 * - aria-expanded on collapsible sections
 * - aria-controls links buttons to content
 * - All icons hidden from screen readers
 * - Keyboard accessible (native button elements)
 * - Focus visible on interactive elements
 *
 * Performance Notes:
 * - Collapsible sections prevent initial render of all content
 * - Efficient state management (local state per section)
 * - Markdown rendering memoization-friendly
 * - Suitable for large content (100+ IOCs, 50+ timeline events)
 *
 * Design Token Usage:
 * - Colors: colors.text.*, colors.background.*, colors.border.*, colors.brand.*
 * - Spacing: spacing[1-6]
 * - Typography: typography.fontSize.*, typography.fontWeight.*, typography.lineHeight.*
 *
 * Testing:
 * - data-testid="deep-dive-locked" for locked state
 * - data-testid="deep-dive-unlocked" for unlocked state
 * - data-testid="upgrade-button" for CTA button
 * - Section testIds: executive-summary-section, technical-analysis-section, etc.
 *
 * TODO: Replace dangerouslySetInnerHTML with proper markdown renderer
 * Consider: react-markdown, markdown-to-jsx, or similar library
 */
