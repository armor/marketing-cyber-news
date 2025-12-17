import * as React from 'react';
import { SourceFilter } from './SourceFilter';

/**
 * SourceFilter Usage Examples
 *
 * Demonstrates different use cases and integration patterns
 */

export function SourceFilterExamples() {
  const [selectedSources, setSelectedSources] = React.useState<string[]>([]);
  const [disabledSources, setDisabledSources] = React.useState<string[]>(['cisa']);

  // Simulated available sources (typically fetched from API)
  const availableSources = [
    'cisa',
    'cert-in',
    'mitre',
    'nist',
    'ncsc',
    'us-cert',
  ];

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-2xl font-bold">SourceFilter Component Examples</h1>

      {/* Example 1: Basic Usage */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Basic Usage</h2>
        <p className="text-sm text-muted-foreground">
          Simple multi-select filter with dynamic source list
        </p>
        <SourceFilter
          value={selectedSources}
          onChange={setSelectedSources}
          availableSources={availableSources}
        />
        <div className="mt-2 text-sm">
          <strong>Selected:</strong>{' '}
          {selectedSources.length > 0 ? selectedSources.join(', ') : 'None'}
        </div>
      </section>

      {/* Example 2: Pre-selected Sources */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Pre-selected Sources</h2>
        <p className="text-sm text-muted-foreground">
          Filter with initial selection
        </p>
        <SourceFilter
          value={disabledSources}
          onChange={setDisabledSources}
          availableSources={availableSources}
        />
      </section>

      {/* Example 3: Disabled State */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Disabled State</h2>
        <p className="text-sm text-muted-foreground">
          Filter disabled (e.g., during loading)
        </p>
        <SourceFilter
          value={[]}
          onChange={() => {}}
          availableSources={availableSources}
          disabled
        />
      </section>

      {/* Example 4: Empty Sources */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Empty State</h2>
        <p className="text-sm text-muted-foreground">
          No sources available
        </p>
        <SourceFilter
          value={[]}
          onChange={() => {}}
          availableSources={[]}
        />
      </section>

      {/* Example 5: Integration with Threat Dashboard */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Dashboard Integration Example</h2>
        <p className="text-sm text-muted-foreground">
          Typical usage in a threat dashboard filter bar
        </p>
        <div className="flex items-center gap-4 rounded-lg border p-4">
          <span className="text-sm font-medium">Filters:</span>
          <SourceFilter
            value={selectedSources}
            onChange={setSelectedSources}
            availableSources={availableSources}
          />
          <button
            onClick={() => setSelectedSources([])}
            className="text-sm text-primary hover:underline"
            disabled={selectedSources.length === 0}
          >
            Reset Filters
          </button>
        </div>
      </section>

      {/* Example 6: Controlled with URL State */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">URL State Integration</h2>
        <p className="text-sm text-muted-foreground">
          Example code for syncing with URL parameters
        </p>
        <pre className="rounded-lg bg-muted p-4 text-xs">
          {`// React Router v7 example
import { useSearchParams } from 'react-router-dom';

function ThreatDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedSources = searchParams.get('sources')?.split(',') ?? [];

  const handleSourceChange = (sources: string[]) => {
    setSearchParams(prev => {
      if (sources.length > 0) {
        prev.set('sources', sources.join(','));
      } else {
        prev.delete('sources');
      }
      return prev;
    });
  };

  return (
    <SourceFilter
      value={selectedSources}
      onChange={handleSourceChange}
      availableSources={availableSources}
    />
  );
}`}
        </pre>
      </section>

      {/* Example 7: Performance Optimization */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Performance Optimization</h2>
        <p className="text-sm text-muted-foreground">
          Memoized callback to prevent unnecessary re-renders
        </p>
        <pre className="rounded-lg bg-muted p-4 text-xs">
          {`// Optimization example
const handleSourceChange = React.useCallback((sources: string[]) => {
  // Update state or query parameters
  setSelectedSources(sources);

  // Trigger API call with debouncing if needed
  debouncedFetchThreats(sources);
}, []);

const memoizedSources = React.useMemo(
  () => availableSourcesFromAPI,
  [availableSourcesFromAPI]
);

<SourceFilter
  value={selectedSources}
  onChange={handleSourceChange}
  availableSources={memoizedSources}
/>`}
        </pre>
      </section>

      {/* Example 8: Accessibility Features */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Accessibility Features</h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
          <li>Keyboard navigable: Tab to focus, Space/Enter to select</li>
          <li>Screen reader friendly: ARIA labels and roles</li>
          <li>Focus management: Escape closes and returns focus</li>
          <li>Visual indicators: Selected state clearly marked</li>
          <li>High contrast: Works with dark/light themes</li>
        </ul>
      </section>
    </div>
  );
}

/**
 * Integration with TanStack Query
 */
export function SourceFilterWithQuery() {
  const [selectedSources, setSelectedSources] = React.useState<string[]>([]);

  // Fetch available sources from API
  // const { data: sources, isLoading } = useQuery({
  //   queryKey: ['threat-sources'],
  //   queryFn: fetchAvailableSources,
  // });

  // Mock for example
  const sources = ['cisa', 'cert-in', 'mitre'];
  const isLoading = false;

  return (
    <SourceFilter
      value={selectedSources}
      onChange={setSelectedSources}
      availableSources={sources}
      disabled={isLoading}
    />
  );
}
