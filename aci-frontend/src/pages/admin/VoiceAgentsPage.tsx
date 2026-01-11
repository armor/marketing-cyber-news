/**
 * VoiceAgentsPage
 *
 * Admin page for managing voice transformation agents.
 * Lists all agents with CRUD operations and detailed editing.
 */

import { type ReactElement, useState } from 'react';
import { Wand2, Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { VoiceAgentForm } from '@/components/marketing/voice/admin/VoiceAgentForm';
import { StyleRuleEditor } from '@/components/marketing/voice/admin/StyleRuleEditor';
import { ExampleEditor } from '@/components/marketing/voice/admin/ExampleEditor';
import { useVoiceAgents, useVoiceAgent } from '@/hooks/useVoice';
import { useDeleteVoiceAgent } from '@/hooks/useVoiceAgentAdmin';
import { AGENT_STATUS_LABELS } from '@/types/voice';

// ============================================================================
// Component
// ============================================================================

export function VoiceAgentsPage(): ReactElement {
  const [showForm, setShowForm] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | undefined>(undefined);
  const [detailAgentId, setDetailAgentId] = useState<string | null>(null);

  const { data: agents, isLoading } = useVoiceAgents();
  const { data: detailAgent } = useVoiceAgent(detailAgentId);
  const deleteMutation = useDeleteVoiceAgent();

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleAddAgent = (): void => {
    setEditingAgentId(undefined);
    setShowForm(true);
  };

  const handleEditAgent = (id: string): void => {
    setEditingAgentId(id);
    setShowForm(true);
  };

  const handleSaveAgent = (): void => {
    setShowForm(false);
    setEditingAgentId(undefined);
  };

  const handleCancelForm = (): void => {
    setShowForm(false);
    setEditingAgentId(undefined);
  };

  const handleDeleteAgent = (id: string, name: string): void => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    deleteMutation.mutate({ id });
  };

  const handleViewDetails = (id: string): void => {
    setDetailAgentId(id);
  };

  const handleCloseDetails = (): void => {
    setDetailAgentId(null);
  };

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const getIconComponent = (_iconName: string): ReactElement => {
    // Map icon names to components
    // TODO: Implement icon mapping when icon selection is added
    return <Wand2 className="size-5" />;
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' => {
    switch (status) {
      case 'active':
        return 'default';
      case 'draft':
        return 'secondary';
      case 'inactive':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

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
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--spacing-6)',
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
            Voice Agents
          </h1>
          <p
            style={{
              fontSize: 'var(--typography-font-size-base)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Manage AI voice transformation agents and their configurations
          </p>
        </div>
        <Button onClick={handleAddAgent}>
          <Plus className="size-4 mr-2" />
          Create Agent
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>
          <p style={{ color: 'var(--color-text-secondary)' }}>Loading agents...</p>
        </div>
      )}

      {/* Agents Grid */}
      {!isLoading && agents && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 'var(--spacing-4)',
          }}
        >
          {agents.map((agent) => (
            <div
              key={agent.id}
              style={{
                padding: 'var(--spacing-4)',
                backgroundColor: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--border-radius-lg)',
                cursor: 'pointer',
                transition: 'all var(--motion-duration-fast) var(--motion-ease-default)',
              }}
              onClick={() => handleViewDetails(agent.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleViewDetails(agent.id);
                }
              }}
              role="button"
              tabIndex={0}
            >
              {/* Agent Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-3)' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--border-radius-md)',
                    backgroundColor: agent.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                  }}
                >
                  {getIconComponent(agent.icon)}
                </div>
                <div style={{ flex: 1 }}>
                  <h3
                    style={{
                      fontSize: 'var(--typography-font-size-lg)',
                      fontWeight: 'var(--typography-font-weight-semibold)',
                      color: 'var(--color-text-primary)',
                      marginBottom: 'var(--spacing-1)',
                    }}
                  >
                    {agent.name}
                  </h3>
                  <Badge variant={getStatusVariant(agent.status)}>
                    {AGENT_STATUS_LABELS[agent.status]}
                  </Badge>
                </div>
              </div>

              {/* Description */}
              {agent.description && (
                <p
                  style={{
                    fontSize: 'var(--typography-font-size-sm)',
                    color: 'var(--color-text-secondary)',
                    marginBottom: 'var(--spacing-3)',
                    lineHeight: '1.5',
                  }}
                >
                  {agent.description}
                </p>
              )}

              {/* Metadata */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 'var(--spacing-2)',
                  marginBottom: 'var(--spacing-3)',
                  fontSize: 'var(--typography-font-size-sm)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <div>
                  <span style={{ fontWeight: 'var(--typography-font-weight-medium)' }}>Temp:</span>{' '}
                  {agent.temperature.toFixed(2)}
                </div>
                <div>
                  <span style={{ fontWeight: 'var(--typography-font-weight-medium)' }}>Tokens:</span>{' '}
                  {agent.max_tokens}
                </div>
              </div>

              {/* Actions */}
              <div
                style={{
                  display: 'flex',
                  gap: 'var(--spacing-2)',
                  paddingTop: 'var(--spacing-3)',
                  borderTop: '1px solid var(--color-border)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditAgent(agent.id);
                  }}
                  style={{ flex: 1 }}
                >
                  <Edit2 className="size-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteAgent(agent.id, agent.name);
                  }}
                  disabled={deleteMutation.isPending}
                  style={{ flex: 1 }}
                >
                  <Trash2 className="size-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && agents && agents.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: 'var(--spacing-12)',
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--border-radius-lg)',
          }}
        >
          <Wand2 className="size-12 mx-auto mb-4" style={{ color: 'var(--color-text-secondary)' }} />
          <h3
            style={{
              fontSize: 'var(--typography-font-size-lg)',
              fontWeight: 'var(--typography-font-weight-semibold)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--spacing-2)',
            }}
          >
            No Voice Agents Yet
          </h3>
          <p
            style={{
              fontSize: 'var(--typography-font-size-base)',
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--spacing-4)',
            }}
          >
            Create your first voice transformation agent to get started
          </p>
          <Button onClick={handleAddAgent}>
            <Plus className="size-4 mr-2" />
            Create Agent
          </Button>
        </div>
      )}

      {/* Form Sheet */}
      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent
          side="right"
          style={{
            maxWidth: '600px',
            padding: '0',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}
        >
          <VoiceAgentForm
            agentId={editingAgentId}
            onSave={handleSaveAgent}
            onCancel={handleCancelForm}
          />
        </SheetContent>
      </Sheet>

      {/* Detail Sheet */}
      <Sheet open={!!detailAgentId} onOpenChange={(open) => !open && handleCloseDetails()}>
        <SheetContent
          side="right"
          style={{
            width: '100%',
            maxWidth: '800px',
            padding: 'var(--spacing-6)',
            overflowY: 'auto',
          }}
        >
          {detailAgent && (
            <>
              <SheetHeader>
                <SheetTitle>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: 'var(--border-radius-md)',
                        backgroundColor: detailAgent.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                      }}
                    >
                      {getIconComponent(detailAgent.icon)}
                    </div>
                    <div>
                      <div style={{ fontSize: 'var(--typography-font-size-xl)', fontWeight: 'var(--typography-font-weight-bold)' }}>
                        {detailAgent.name}
                      </div>
                      <Badge variant={getStatusVariant(detailAgent.status)}>
                        {AGENT_STATUS_LABELS[detailAgent.status]}
                      </Badge>
                    </div>
                  </div>
                </SheetTitle>
              </SheetHeader>

              <div style={{ marginTop: 'var(--spacing-6)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
                {/* Description */}
                {detailAgent.description && (
                  <div>
                    <h3 style={{ fontSize: 'var(--typography-font-size-sm)', fontWeight: 'var(--typography-font-weight-semibold)', marginBottom: 'var(--spacing-2)' }}>
                      Description
                    </h3>
                    <p style={{ color: 'var(--color-text-secondary)' }}>{detailAgent.description}</p>
                  </div>
                )}

                {/* System Prompt */}
                <div>
                  <h3 style={{ fontSize: 'var(--typography-font-size-sm)', fontWeight: 'var(--typography-font-weight-semibold)', marginBottom: 'var(--spacing-2)' }}>
                    System Prompt
                  </h3>
                  <p style={{ color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>{detailAgent.system_prompt}</p>
                </div>

                {/* Style Rules */}
                <StyleRuleEditor
                  agentId={detailAgent.id}
                  rules={detailAgent.style_rules ?? []}
                />

                {/* Examples */}
                <ExampleEditor
                  agentId={detailAgent.id}
                  examples={detailAgent.examples ?? []}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
