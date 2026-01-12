/**
 * NewsletterConfigPage Component
 *
 * Main page for managing newsletter configurations and audience segments.
 *
 * Features:
 * - Tab navigation: Configurations | Segments
 * - Create buttons in header
 * - Loading and error states
 * - Integrates with sidebar navigation
 * - Responsive design with design tokens
 *
 * @example
 * ```tsx
 * <Route path="/newsletter-config" element={<NewsletterConfigPage />} />
 * ```
 */

import { type ReactElement, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Settings, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  ConfigurationList,
  ConfigurationForm,
  SegmentList,
  SegmentForm,
} from '@/components/newsletter';
import { useNewsletterConfigs } from '@/hooks/useNewsletterConfigs';
import { useSegments } from '@/hooks/useSegments';
import { useSegment } from '@/hooks/useSegment';
import { useCreateConfig, useUpdateConfig, useDeleteConfig } from '@/hooks/useNewsletterConfigMutations';
import { useCreateSegment, useUpdateSegment } from '@/hooks/useSegmentMutations';
import { generateIssue } from '@/services/api/newsletter';
import type {
  NewsletterConfiguration,
  CreateConfigurationRequest,
  UpdateConfigurationRequest,
  CreateSegmentRequest,
  UpdateSegmentRequest,
  GenerateIssueRequest,
} from '@/types/newsletter';

// ============================================================================
// Types
// ============================================================================

type TabId = 'configurations' | 'segments';

interface Tab {
  readonly id: TabId;
  readonly label: string;
  readonly icon: typeof Settings;
}

// ============================================================================
// Constants
// ============================================================================

const TABS: readonly Tab[] = [
  { id: 'configurations', label: 'Configurations', icon: Settings },
  { id: 'segments', label: 'Segments', icon: Users },
] as const;

// ============================================================================
// Component
// ============================================================================

export function NewsletterConfigPage(): ReactElement {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('configurations');
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [showSegmentForm, setShowSegmentForm] = useState(false);
  // Store full config object for edit/clone instead of just ID
  const [selectedConfig, setSelectedConfig] = useState<NewsletterConfiguration | null>(null);
  const [configFormMode, setConfigFormMode] = useState<'create' | 'edit' | 'clone'>('create');
  const [editingSegment, setEditingSegment] = useState<string | null>(null);
  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<NewsletterConfiguration | null>(null);

  // Fetch configurations and segments using TanStack Query hooks
  const configurationsQuery = useNewsletterConfigs();
  const segmentsQuery = useSegments();

  // Fetch individual segment when editing
  const segmentQuery = useSegment({
    id: editingSegment || '',
    enabled: Boolean(editingSegment),
  });

  // Mutation hooks for creating/updating/deleting
  const createConfigMutation = useCreateConfig();
  const updateConfigMutation = useUpdateConfig();
  const deleteConfigMutation = useDeleteConfig();
  const createSegmentMutation = useCreateSegment();
  const updateSegmentMutation = useUpdateSegment();

  // Mutation hook for generating newsletters
  const generateMutation = useMutation({
    mutationFn: (data: GenerateIssueRequest) => generateIssue(data),
  });

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleCreateConfiguration = useCallback((): void => {
    setSelectedConfig(null);
    setConfigFormMode('create');
    setShowConfigForm(true);
  }, []);

  const handleCreateSegment = useCallback((): void => {
    setEditingSegment(null);
    setShowSegmentForm(true);
  }, []);

  const handleEditConfiguration = useCallback((id: string): void => {
    // Find the config from the list to use immediately (no loading delay)
    const config = configurationsQuery.data?.data.find(c => c.id === id);
    if (config) {
      setSelectedConfig(config);
      setConfigFormMode('edit');
      setShowConfigForm(true);
    } else {
      toast.error('Error', {
        description: 'Configuration not found',
      });
    }
  }, [configurationsQuery.data?.data]);

  const handleCloneConfiguration = useCallback((id: string): void => {
    // Find the config from the list and clone it
    const config = configurationsQuery.data?.data.find(c => c.id === id);
    if (config) {
      // Create a clone with modified name
      const clonedConfig = {
        ...config,
        name: `${config.name} (Copy)`,
      };
      setSelectedConfig(clonedConfig);
      setConfigFormMode('clone');
      setShowConfigForm(true);
    } else {
      toast.error('Error', {
        description: 'Configuration not found',
      });
    }
  }, [configurationsQuery.data?.data]);

  const handleDeleteConfiguration = useCallback((id: string): void => {
    // Find the config and show delete confirmation dialog
    const config = configurationsQuery.data?.data.find(c => c.id === id);
    if (config) {
      setConfigToDelete(config);
      setDeleteDialogOpen(true);
    } else {
      toast.error('Error', {
        description: 'Configuration not found',
      });
    }
  }, [configurationsQuery.data?.data]);

  const handleConfirmDelete = useCallback(async (): Promise<void> => {
    if (!configToDelete) return;

    try {
      await deleteConfigMutation.mutateAsync({ id: configToDelete.id });
      toast.success('Configuration Deleted', {
        description: `"${configToDelete.name}" has been deleted successfully`,
      });
      setDeleteDialogOpen(false);
      setConfigToDelete(null);
    } catch (error) {
      toast.error('Delete Failed', {
        description: error instanceof Error ? error.message : 'Failed to delete configuration',
      });
    }
  }, [configToDelete, deleteConfigMutation]);

  const handleCancelDelete = useCallback((): void => {
    setDeleteDialogOpen(false);
    setConfigToDelete(null);
  }, []);

  const handleGenerateNewsletter = useCallback((configId: string): void => {
    // Find the configuration to get its segment_id
    const config = configurationsQuery.data?.data.find(c => c.id === configId);
    if (!config?.segment_id) {
      toast.error('Cannot Generate', {
        description: 'Configuration must have a segment assigned to generate a newsletter.',
      });
      return;
    }

    // Show immediate loading feedback
    const toastId = toast.loading(`Generating newsletter for "${config.name}"...`, {
      description: 'This may take a moment. Please wait.',
    });

    // Generate with the selected configuration and its segment
    generateMutation.mutate(
      {
        configuration_id: configId,
        segment_id: config.segment_id,
      },
      {
        onSuccess: (response) => {
          toast.success('Newsletter Generation Started', {
            id: toastId,
            description: `Issue created successfully. Job ID: ${response.job_id}`,
            action: {
              label: 'View Issue',
              onClick: () => navigate(`/newsletter/preview/${response.issue_id}`),
            },
          });
        },
        onError: (error: Error) => {
          toast.error('Generation Failed', {
            id: toastId,
            description: error.message || 'Failed to start newsletter generation',
          });
        },
      }
    );
  }, [generateMutation, configurationsQuery.data?.data, navigate]);

  const handleEditSegment = useCallback((id: string): void => {
    setEditingSegment(id);
    setShowSegmentForm(true);
  }, []);

  const handleViewContacts = useCallback((id: string): void => {
    // TODO: Navigate to contacts view for segment
    toast.info('View Contacts', {
      description: `Viewing contacts for segment ${id}`,
    });
  }, []);

  const handleConfigSubmit = async (
    data: CreateConfigurationRequest | UpdateConfigurationRequest
  ): Promise<void> => {
    try {
      if (configFormMode === 'edit' && selectedConfig) {
        await updateConfigMutation.mutateAsync({
          id: selectedConfig.id,
          request: data as UpdateConfigurationRequest,
        });
        toast.success('Configuration Updated', {
          description: 'Configuration has been updated successfully',
        });
      } else {
        // Both 'create' and 'clone' modes create a new config
        await createConfigMutation.mutateAsync({
          request: data as CreateConfigurationRequest,
        });
        toast.success(
          configFormMode === 'clone' ? 'Configuration Cloned' : 'Configuration Created',
          {
            description: configFormMode === 'clone'
              ? 'Configuration has been cloned successfully'
              : 'New configuration has been created successfully',
          }
        );
      }
      setShowConfigForm(false);
      setSelectedConfig(null);
    } catch (error) {
      console.error('Config submit error:', error);
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to save configuration',
      });
    }
  };

  const handleSegmentSubmit = async (
    data: CreateSegmentRequest | UpdateSegmentRequest
  ): Promise<void> => {
    try {
      if (editingSegment) {
        await updateSegmentMutation.mutateAsync({
          id: editingSegment,
          request: data as UpdateSegmentRequest,
        });
        toast.success('Segment Updated', {
          description: 'Segment has been updated successfully',
        });
      } else {
        await createSegmentMutation.mutateAsync({
          request: data as CreateSegmentRequest,
        });
        toast.success('Segment Created', {
          description: 'New segment has been created successfully',
        });
      }
      setShowSegmentForm(false);
    } catch (error) {
      console.error('Segment submit error:', error);
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to save segment',
      });
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Newsletter', href: '/newsletter/configs' },
          { label: 'Configuration' },
        ]}
        title="Newsletter Configuration"
        description="Manage newsletter configurations and audience segments"
        actions={
          <Button
            onClick={
              activeTab === 'configurations'
                ? handleCreateConfiguration
                : handleCreateSegment
            }
            size="default"
            aria-label={
              activeTab === 'configurations'
                ? 'Create new newsletter configuration'
                : 'Create new audience segment'
            }
          >
            <Plus
              style={{
                width: 'var(--spacing-4)',
                height: 'var(--spacing-4)',
                marginRight: 'var(--spacing-2)',
              }}
              aria-hidden="true"
            />
            {activeTab === 'configurations'
              ? 'New Configuration'
              : 'New Segment'}
          </Button>
        }
      />

      {/* Main Content */}
      <main
        className="flex-1 overflow-y-auto"
        style={{ padding: 'var(--spacing-6)' }}
      >
        <div className="max-w-7xl mx-auto">
          {/* Tab Navigation */}
          <Card
            style={{
              marginBottom: 'var(--spacing-6)',
            }}
          >
            <CardContent
              style={{
                padding: 'var(--spacing-4)',
              }}
            >
              <div
                className="flex"
                role="tablist"
                aria-label="Newsletter configuration tabs"
                style={{
                  gap: 'var(--spacing-2)',
                  borderBottom: `var(--border-width-thin) solid var(--color-border-default)`,
                }}
              >
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      role="tab"
                      id={`${tab.id}-tab`}
                      aria-selected={isActive}
                      aria-controls={`${tab.id}-panel`}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-2)',
                        padding: 'var(--spacing-3) var(--spacing-4)',
                        fontSize: 'var(--typography-font-size-sm)',
                        fontWeight: isActive
                          ? 'var(--typography-font-weight-semibold)'
                          : 'var(--typography-font-weight-medium)',
                        color: isActive
                          ? 'var(--color-brand-primary)'
                          : 'var(--color-text-secondary)',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderBottom: isActive
                          ? `2px solid var(--color-brand-primary)`
                          : '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'all var(--motion-duration-fast) var(--motion-easing-default)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.color =
                            'var(--color-text-primary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.color =
                            'var(--color-text-secondary)';
                        }
                      }}
                    >
                      <Icon
                        style={{
                          width: 'var(--spacing-4)',
                          height: 'var(--spacing-4)',
                        }}
                        aria-hidden="true"
                      />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Tab Panels */}
          <div
            id="configurations-panel"
            role="tabpanel"
            aria-labelledby="configurations-tab"
            tabIndex={0}
            hidden={activeTab !== 'configurations'}
          >
            {activeTab === 'configurations' && (
              <ConfigurationList
                configurations={configurationsQuery.data?.data || []}
                isLoading={configurationsQuery.isLoading}
                pagination={configurationsQuery.data?.pagination}
                onEdit={handleEditConfiguration}
                onClone={handleCloneConfiguration}
                onDelete={handleDeleteConfiguration}
                onGenerate={handleGenerateNewsletter}
              />
            )}
          </div>

          <div
            id="segments-panel"
            role="tabpanel"
            aria-labelledby="segments-tab"
            tabIndex={0}
            hidden={activeTab !== 'segments'}
          >
            {activeTab === 'segments' && (
              <SegmentList
                segments={segmentsQuery.data?.data || []}
                isLoading={segmentsQuery.isLoading}
                pagination={segmentsQuery.data?.pagination}
                onEdit={handleEditSegment}
                onViewContacts={handleViewContacts}
              />
            )}
          </div>
        </div>
      </main>

      {/* Forms */}
      <ConfigurationForm
        open={showConfigForm}
        mode={configFormMode === 'clone' ? 'create' : configFormMode}
        onClose={() => {
          setShowConfigForm(false);
          setSelectedConfig(null);
        }}
        onSubmit={handleConfigSubmit}
        initialData={selectedConfig || undefined}
      />

      <SegmentForm
        open={showSegmentForm}
        mode={editingSegment ? 'edit' : 'create'}
        onClose={() => setShowSegmentForm(false)}
        onSubmit={handleSegmentSubmit}
        initialData={editingSegment ? segmentQuery.data : undefined}
      />

      {/* Delete Confirmation Sheet */}
      <Sheet open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Delete Configuration</SheetTitle>
            <SheetDescription>
              Are you sure you want to delete &quot;{configToDelete?.name}&quot;? This action cannot be undone.
            </SheetDescription>
          </SheetHeader>
          <SheetFooter>
            <Button
              variant="outline"
              onClick={handleCancelDelete}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleConfirmDelete()}
              disabled={deleteConfigMutation.isPending}
            >
              {deleteConfigMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

NewsletterConfigPage.displayName = 'NewsletterConfigPage';

/**
 * ============================================================================
 * TODO: Integration Tasks
 * ============================================================================
 *
 * 1. Create TanStack Query hooks:
 *    - useNewsletterConfigs(params)
 *    - useCreateConfiguration()
 *    - useUpdateConfiguration()
 *    - useDeleteConfiguration()
 *    - useNewsletterSegments(params)
 *    - useCreateSegment()
 *    - useUpdateSegment()
 *
 * 2. Add route to router configuration:
 *    <Route path="/newsletter-config" element={<NewsletterConfigPage />} />
 *
 * 3. Add sidebar navigation link:
 *    - Icon: Settings or Mail
 *    - Label: "Newsletter Config"
 *    - Path: "/newsletter-config"
 *
 * 4. Implement delete confirmation dialog:
 *    - Use AlertDialog component
 *    - Show warning about cascading effects
 *
 * 5. Implement clone functionality:
 *    - Fetch config by ID
 *    - Pre-fill form with cloned data
 *    - Add "(Copy)" suffix to name
 *
 * 6. Add loading skeletons for better UX
 *
 * 7. Add error boundary for page-level errors
 *
 * 8. Consider adding:
 *    - Bulk actions (delete multiple)
 *    - Search/filter for configurations
 *    - Export/import configurations
 *    - Configuration preview
 */
