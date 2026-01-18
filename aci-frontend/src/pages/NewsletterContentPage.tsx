/**
 * NewsletterContentPage
 *
 * Main page for managing newsletter content sources and items.
 *
 * Features:
 * - Tab navigation between Content Sources and Content Items
 * - Content Sources tab: List and manage content sources
 * - Content Items tab: Browse and select content items
 * - Modal form for add/edit operations
 *
 * @example
 * ```tsx
 * <Route path="/newsletter/content" element={<NewsletterContentPage />} />
 * ```
 */

import { type ReactElement, useState } from 'react';
import { Download } from 'lucide-react';
import { Tabs, type TabItem } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  ContentSourceList,
  ContentSourceForm,
  ContentSelector,
  ImportContentSheet,
} from '@/components/newsletter/content';

// ============================================================================
// Component
// ============================================================================

export function NewsletterContentPage(): ReactElement {
  const [showForm, setShowForm] = useState(false);
  const [showImportSheet, setShowImportSheet] = useState(false);
  const [editingSourceId, setEditingSourceId] = useState<string | undefined>(undefined);
  const [selectedContentIds, setSelectedContentIds] = useState<readonly string[]>([]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleAddSource = (): void => {
    setEditingSourceId(undefined);
    setShowForm(true);
  };

  const handleEditSource = (id: string): void => {
    setEditingSourceId(id);
    setShowForm(true);
  };

  const handleSaveSource = (): void => {
    setShowForm(false);
    setEditingSourceId(undefined);
  };

  const handleCancelForm = (): void => {
    setShowForm(false);
    setEditingSourceId(undefined);
  };

  // ============================================================================
  // Tabs Configuration
  // ============================================================================

  const tabs: readonly TabItem[] = [
    {
      id: 'sources',
      label: 'Content Sources',
      content: (
        <ContentSourceList
          onAdd={handleAddSource}
          onEdit={handleEditSource}
        />
      ),
    },
    {
      id: 'items',
      label: 'Content Items',
      content: (
        <ContentSelector
          selectedIds={selectedContentIds}
          onSelectionChange={setSelectedContentIds}
        />
      ),
    },
  ];

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div
      style={{
        padding: 'var(--spacing-6)',
        maxWidth: '1400px',
        margin: '0 auto',
      }}
    >
      {/* Page Header */}
      <div
        style={{
          marginBottom: 'var(--spacing-6)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 'var(--typography-font-size-3xl)',
              fontWeight: 'var(--typography-font-weight-bold)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--spacing-2)',
            }}
          >
            Content Management
          </h1>
          <p
            style={{
              fontSize: 'var(--typography-font-size-base)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Manage content sources and browse available content for newsletters
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowImportSheet(true)}
        >
          <Download
            style={{
              width: 'var(--spacing-4)',
              height: 'var(--spacing-4)',
              marginRight: 'var(--spacing-2)',
            }}
          />
          Import Content
        </Button>
      </div>

      {/* Tab Navigation */}
      <Tabs tabs={tabs} defaultTab="sources" />

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent
          style={{
            maxWidth: '600px',
            padding: '0',
          }}
        >
          <ContentSourceForm
            sourceId={editingSourceId}
            onSave={handleSaveSource}
            onCancel={handleCancelForm}
          />
        </DialogContent>
      </Dialog>

      {/* Import Content Sheet */}
      <ImportContentSheet
        open={showImportSheet}
        onOpenChange={setShowImportSheet}
      />
    </div>
  );
}
