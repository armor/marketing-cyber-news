/**
 * SeverityFilter Usage Examples
 *
 * Demonstrates various ways to use the SeverityFilter component.
 */

import * as React from 'react';
import { SeverityFilter } from './SeverityFilter';
import type { Severity } from '@/types/threat';

/**
 * Example 1: Basic Usage
 * Simple controlled component with local state
 */
export const BasicExample: React.FC = () => {
  const [selectedSeverities, setSelectedSeverities] = React.useState<Severity[]>([]);

  return (
    <div className="space-y-[var(--spacing-gap-md)]">
      <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
        Filter Threats by Severity
      </h3>

      <SeverityFilter
        value={selectedSeverities}
        onChange={setSelectedSeverities}
      />

      <div className="text-sm text-[var(--color-text-secondary)]">
        Selected: {selectedSeverities.length === 0 ? 'None' : selectedSeverities.join(', ')}
      </div>
    </div>
  );
};

/**
 * Example 2: Pre-selected Values
 * Start with critical and high severity selected
 */
export const PreselectedExample: React.FC = () => {
  const [selectedSeverities, setSelectedSeverities] = React.useState<Severity[]>([
    'critical',
    'high',
  ]);

  return (
    <div className="space-y-[var(--spacing-gap-md)]">
      <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
        High-Priority Threats Only
      </h3>

      <SeverityFilter
        value={selectedSeverities}
        onChange={setSelectedSeverities}
      />

      <div className="text-sm text-[var(--color-text-secondary)]">
        Showing {selectedSeverities.join(' and ')} threats
      </div>
    </div>
  );
};

/**
 * Example 3: Disabled State
 * Filter disabled while data is loading
 */
export const DisabledExample: React.FC = () => {
  const [selectedSeverities, setSelectedSeverities] = React.useState<Severity[]>(['critical']);
  const [isLoading, setIsLoading] = React.useState(true);

  // Simulate loading
  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-[var(--spacing-gap-md)]">
      <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
        Loading State
      </h3>

      <SeverityFilter
        value={selectedSeverities}
        onChange={setSelectedSeverities}
        disabled={isLoading}
      />

      <div className="text-sm text-[var(--color-text-secondary)]">
        {isLoading ? 'Loading...' : 'Ready'}
      </div>
    </div>
  );
};

/**
 * Example 4: Integration with URL Query Params
 * Syncs filter state with URL search parameters
 */
export const URLSyncExample: React.FC = () => {
  const [searchParams, setSearchParams] = React.useState(new URLSearchParams());

  // Parse severity from URL
  const selectedSeverities = React.useMemo(() => {
    const params = searchParams.getAll('severity');
    return params.filter((p): p is Severity => ['critical', 'high', 'medium', 'low'].includes(p));
  }, [searchParams]);

  // Update URL when severity changes
  const handleSeverityChange = React.useCallback((severities: Severity[]) => {
    const newParams = new URLSearchParams();
    severities.forEach(s => newParams.append('severity', s));
    setSearchParams(newParams);
  }, []);

  return (
    <div className="space-y-[var(--spacing-gap-md)]">
      <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
        URL Synchronized Filters
      </h3>

      <SeverityFilter
        value={selectedSeverities}
        onChange={handleSeverityChange}
      />

      <div className="text-sm text-[var(--color-text-secondary)]">
        URL: ?{searchParams.toString() || '(empty)'}
      </div>
    </div>
  );
};

/**
 * Example 5: Custom Styling
 * Apply custom classes for specific layouts
 */
export const CustomStyledExample: React.FC = () => {
  const [selectedSeverities, setSelectedSeverities] = React.useState<Severity[]>([]);

  return (
    <div className="space-y-[var(--spacing-gap-md)]">
      <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
        Custom Styling
      </h3>

      <SeverityFilter
        value={selectedSeverities}
        onChange={setSelectedSeverities}
        className="justify-end"
      />
    </div>
  );
};

/**
 * Example 6: With TanStack Query Hook
 * Real-world integration with API filtering
 */
export const WithAPIExample: React.FC = () => {
  const [selectedSeverities, setSelectedSeverities] = React.useState<Severity[]>([]);

  // In real implementation, this would trigger a TanStack Query refetch
  const handleFilterChange = React.useCallback((severities: Severity[]) => {
    setSelectedSeverities(severities);
    // queryClient.invalidateQueries(['threats']);
    console.log('Filtering API by:', severities);
  }, []);

  return (
    <div className="space-y-[var(--spacing-gap-md)]">
      <h3 className="text-lg font-medium text-[var(--color-text-primary)]">
        API Integration
      </h3>

      <SeverityFilter
        value={selectedSeverities}
        onChange={handleFilterChange}
      />

      <div className="text-sm text-[var(--color-text-secondary)]">
        Check console for API filter updates
      </div>
    </div>
  );
};

/**
 * All Examples Container
 */
export const SeverityFilterExamples: React.FC = () => {
  return (
    <div className="space-y-[var(--spacing-layout-section)] p-[var(--spacing-layout-page)]">
      <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
        SeverityFilter Component Examples
      </h2>

      <div className="space-y-[var(--spacing-layout-card)]">
        <BasicExample />
        <PreselectedExample />
        <DisabledExample />
        <URLSyncExample />
        <CustomStyledExample />
        <WithAPIExample />
      </div>
    </div>
  );
};

export default SeverityFilterExamples;
