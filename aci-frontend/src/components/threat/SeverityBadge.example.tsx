/**
 * SeverityBadge Usage Examples
 *
 * This file demonstrates various usage patterns for the SeverityBadge component.
 * NOT included in production bundle - for development reference only.
 */

import { SeverityBadge } from './SeverityBadge';
import type { Severity } from '@/types/threat';

/**
 * Example: All severity levels
 */
export function AllSeverityLevels() {
  const severities: Severity[] = ['critical', 'high', 'medium', 'low'];

  return (
    <div className="flex flex-wrap gap-4">
      {severities.map((severity) => (
        <SeverityBadge key={severity} severity={severity} />
      ))}
    </div>
  );
}

/**
 * Example: Size variants
 */
export function SizeVariants() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="w-20 text-sm">Small:</span>
        <SeverityBadge severity="critical" size="sm" />
        <SeverityBadge severity="high" size="sm" />
        <SeverityBadge severity="medium" size="sm" />
        <SeverityBadge severity="low" size="sm" />
      </div>

      <div className="flex items-center gap-4">
        <span className="w-20 text-sm">Medium:</span>
        <SeverityBadge severity="critical" size="md" />
        <SeverityBadge severity="high" size="md" />
        <SeverityBadge severity="medium" size="md" />
        <SeverityBadge severity="low" size="md" />
      </div>

      <div className="flex items-center gap-4">
        <span className="w-20 text-sm">Large:</span>
        <SeverityBadge severity="critical" size="lg" />
        <SeverityBadge severity="high" size="lg" />
        <SeverityBadge severity="medium" size="lg" />
        <SeverityBadge severity="low" size="lg" />
      </div>
    </div>
  );
}

/**
 * Example: Without labels (icon-only mode)
 */
export function WithoutLabels() {
  return (
    <div className="flex gap-2">
      <SeverityBadge severity="critical" size="sm" showLabel={false} />
      <SeverityBadge severity="high" size="sm" showLabel={false} />
      <SeverityBadge severity="medium" size="sm" showLabel={false} />
      <SeverityBadge severity="low" size="sm" showLabel={false} />
    </div>
  );
}

/**
 * Example: In a threat card context
 */
export function ThreatCardExample() {
  return (
    <div className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">Critical SQL Injection Vulnerability</h3>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Affects multiple web applications...
          </p>
        </div>
        <SeverityBadge severity="critical" />
      </div>
    </div>
  );
}

/**
 * Example: In a list item
 */
export function ListItemExample() {
  const threats = [
    { id: '1', title: 'Zero-day exploit discovered', severity: 'critical' as Severity },
    { id: '2', title: 'Phishing campaign detected', severity: 'high' as Severity },
    { id: '3', title: 'Outdated software version', severity: 'medium' as Severity },
    { id: '4', title: 'Minor configuration issue', severity: 'low' as Severity },
  ];

  return (
    <ul className="space-y-2">
      {threats.map((threat) => (
        <li
          key={threat.id}
          className="flex items-center justify-between rounded-md border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] px-4 py-3"
        >
          <span className="text-sm">{threat.title}</span>
          <SeverityBadge severity={threat.severity} size="sm" />
        </li>
      ))}
    </ul>
  );
}

/**
 * Example: With custom styling
 */
export function CustomStyleExample() {
  return (
    <div className="flex gap-4">
      <SeverityBadge severity="critical" className="shadow-lg" />
      <SeverityBadge severity="high" className="ml-2 opacity-80" />
      <SeverityBadge severity="medium" className="scale-110" />
    </div>
  );
}

/**
 * All examples combined for Storybook or documentation
 */
export function AllExamples() {
  return (
    <div className="space-y-8 p-8">
      <section>
        <h2 className="mb-4 text-xl font-bold">All Severity Levels</h2>
        <AllSeverityLevels />
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">Size Variants</h2>
        <SizeVariants />
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">Without Labels</h2>
        <WithoutLabels />
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">In Threat Card</h2>
        <ThreatCardExample />
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">In List</h2>
        <ListItemExample />
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">Custom Styling</h2>
        <CustomStyleExample />
      </section>
    </div>
  );
}
