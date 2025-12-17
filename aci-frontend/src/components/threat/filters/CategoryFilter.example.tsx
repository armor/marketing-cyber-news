/**
 * CategoryFilter Usage Examples
 * Demonstrates various use cases for the CategoryFilter component
 */

import * as React from 'react';
import { CategoryFilter } from './CategoryFilter';
import { ThreatCategory } from '@/types/threat';

/**
 * Example 1: Basic Usage
 * Simple category filter with state management
 */
export function BasicCategoryFilterExample() {
  const [categories, setCategories] = React.useState<ThreatCategory[]>([]);

  return (
    <div className="p-4">
      <h3 className="mb-4 text-lg font-semibold">Basic Category Filter</h3>
      <CategoryFilter value={categories} onChange={setCategories} />

      {categories.length > 0 && (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">
            Selected: {categories.join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Example 2: Pre-selected Categories
 * Filter with default selections
 */
export function PreselectedCategoryFilterExample() {
  const [categories, setCategories] = React.useState<ThreatCategory[]>([
    ThreatCategory.MALWARE,
    ThreatCategory.RANSOMWARE,
  ]);

  return (
    <div className="p-4">
      <h3 className="mb-4 text-lg font-semibold">Pre-selected Categories</h3>
      <CategoryFilter value={categories} onChange={setCategories} />
    </div>
  );
}

/**
 * Example 3: Disabled State
 * Filter in disabled state (e.g., during loading)
 */
export function DisabledCategoryFilterExample() {
  const [categories] = React.useState<ThreatCategory[]>([ThreatCategory.APT]);

  return (
    <div className="p-4">
      <h3 className="mb-4 text-lg font-semibold">Disabled State</h3>
      <CategoryFilter
        value={categories}
        onChange={() => {}}
        disabled={true}
      />
      <p className="mt-2 text-xs text-muted-foreground">
        Filter is disabled during data loading
      </p>
    </div>
  );
}

/**
 * Example 4: Integrated with Form
 * Category filter as part of a larger filtering form
 */
export function FormIntegrationExample() {
  const [categories, setCategories] = React.useState<ThreatCategory[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Filtering with:', { categories, searchTerm });
  };

  return (
    <div className="p-4">
      <h3 className="mb-4 text-lg font-semibold">Form Integration</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">
            Search Threats
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Enter search term..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Filter by Category
          </label>
          <CategoryFilter value={categories} onChange={setCategories} />
        </div>

        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Apply Filters
        </button>
      </form>
    </div>
  );
}

/**
 * Example 5: With Clear Button Callback
 * Tracking when filters are cleared
 */
export function ClearCallbackExample() {
  const [categories, setCategories] = React.useState<ThreatCategory[]>([
    ThreatCategory.PHISHING,
    ThreatCategory.MALWARE,
  ]);
  const [lastAction, setLastAction] = React.useState<string>('');

  const handleChange = (newCategories: ThreatCategory[]) => {
    if (newCategories.length === 0 && categories.length > 0) {
      setLastAction('Cleared all selections');
    } else if (newCategories.length > categories.length) {
      setLastAction('Added category');
    } else {
      setLastAction('Removed category');
    }
    setCategories(newCategories);
  };

  return (
    <div className="p-4">
      <h3 className="mb-4 text-lg font-semibold">With Action Tracking</h3>
      <CategoryFilter value={categories} onChange={handleChange} />

      {lastAction && (
        <div className="mt-4 rounded-md bg-muted p-3">
          <p className="text-sm">Last action: {lastAction}</p>
          <p className="text-xs text-muted-foreground">
            Current count: {categories.length}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Example 6: All Examples Combined
 * Showcase of all variations
 */
export function AllExamplesShowcase() {
  return (
    <div className="space-y-8 p-6">
      <h2 className="text-2xl font-bold">CategoryFilter Examples</h2>

      <div className="grid gap-6 md:grid-cols-2">
        <BasicCategoryFilterExample />
        <PreselectedCategoryFilterExample />
        <DisabledCategoryFilterExample />
        <FormIntegrationExample />
        <ClearCallbackExample />
      </div>
    </div>
  );
}
