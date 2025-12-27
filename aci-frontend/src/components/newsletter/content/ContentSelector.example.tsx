/**
 * ContentSelector Usage Example
 *
 * Demonstrates how to use the ContentSelector component for newsletter assembly.
 */

import { useState } from 'react';
import { ContentSelector } from './ContentSelector';

export function ContentSelectorExample() {
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);

  return (
    <div style={{ padding: 'var(--spacing-6)' }}>
      <h1
        style={{
          fontSize: 'var(--typography-font-size-2xl)',
          fontWeight: 'var(--typography-font-weight-bold)',
          marginBottom: 'var(--spacing-4)',
        }}
      >
        Newsletter Content Selection
      </h1>

      <ContentSelector
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        maxSelections={10}
        excludeIds={['already-used-item-1', 'already-used-item-2']}
      />

      <div
        style={{
          marginTop: 'var(--spacing-6)',
          padding: 'var(--spacing-4)',
          borderRadius: 'var(--border-radius-lg)',
          backgroundColor: 'var(--color-surface-secondary)',
        }}
      >
        <h2
          style={{
            fontSize: 'var(--typography-font-size-lg)',
            fontWeight: 'var(--typography-font-weight-semibold)',
            marginBottom: 'var(--spacing-2)',
          }}
        >
          Selected Items ({selectedIds.length})
        </h2>
        <pre
          style={{
            fontSize: 'var(--typography-font-size-sm)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {JSON.stringify(selectedIds, null, 2)}
        </pre>
      </div>
    </div>
  );
}
