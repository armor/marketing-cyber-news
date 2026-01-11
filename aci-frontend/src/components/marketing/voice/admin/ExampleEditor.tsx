/**
 * ExampleEditor Component
 *
 * Manages before/after transformation examples for a voice agent.
 * Supports inline editing, adding, and deleting examples.
 */

import { type ReactElement, useState } from 'react';
import { Plus, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { TransformationExample } from '@/types/voice';
import { useCreateExample, useUpdateExample, useDeleteExample } from '@/hooks/useVoiceAgentAdmin';

// ============================================================================
// Types
// ============================================================================

interface ExampleEditorProps {
  readonly agentId: string;
  readonly examples: readonly TransformationExample[];
}

interface EditingExample {
  id: string | null;
  before_text: string;
  after_text: string;
  context: string;
}

// ============================================================================
// Component
// ============================================================================

export function ExampleEditor({ agentId, examples }: ExampleEditorProps): ReactElement {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditingExample>({
    id: null,
    before_text: '',
    after_text: '',
    context: '',
  });

  const createMutation = useCreateExample();
  const updateMutation = useUpdateExample();
  const deleteMutation = useDeleteExample();

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleStartAdd = (): void => {
    setIsAdding(true);
    setEditForm({ id: null, before_text: '', after_text: '', context: '' });
  };

  const handleCancelAdd = (): void => {
    setIsAdding(false);
    setEditForm({ id: null, before_text: '', after_text: '', context: '' });
  };

  const handleSaveNew = (): void => {
    if (!editForm.before_text.trim() || !editForm.after_text.trim()) {
      return;
    }

    createMutation.mutate(
      {
        agentId,
        data: {
          before_text: editForm.before_text,
          after_text: editForm.after_text,
          context: editForm.context || undefined,
        },
      },
      {
        onSuccess: () => {
          setIsAdding(false);
          setEditForm({ id: null, before_text: '', after_text: '', context: '' });
        },
      }
    );
  };

  const handleStartEdit = (example: TransformationExample): void => {
    setEditingId(example.id);
    setEditForm({
      id: example.id,
      before_text: example.before_text,
      after_text: example.after_text,
      context: example.context ?? '',
    });
  };

  const handleCancelEdit = (): void => {
    setEditingId(null);
    setEditForm({ id: null, before_text: '', after_text: '', context: '' });
  };

  const handleSaveEdit = (): void => {
    if (!editingId || !editForm.before_text.trim() || !editForm.after_text.trim()) {
      return;
    }

    updateMutation.mutate(
      {
        agentId,
        exampleId: editingId,
        data: {
          before_text: editForm.before_text,
          after_text: editForm.after_text,
          context: editForm.context || undefined,
        },
      },
      {
        onSuccess: () => {
          setEditingId(null);
          setEditForm({ id: null, before_text: '', after_text: '', context: '' });
        },
      }
    );
  };

  const handleDelete = (exampleId: string): void => {
    if (!confirm('Are you sure you want to delete this example?')) {
      return;
    }

    deleteMutation.mutate({ agentId, exampleId });
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-4)' }}>
        <Label style={{ fontSize: 'var(--typography-font-size-base)', fontWeight: 'var(--typography-font-weight-semibold)' }}>
          Examples ({examples.length})
        </Label>
        {!isAdding && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleStartAdd}
          >
            <Plus className="size-4 mr-2" />
            Add Example
          </Button>
        )}
      </div>

      {/* Examples List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)' }}>
        {examples.map((example) => {
          const isEditing = editingId === example.id;

          if (isEditing) {
            return (
              <div
                key={example.id}
                style={{
                  padding: 'var(--spacing-4)',
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--border-radius-md)',
                }}
              >
                <div style={{ marginBottom: 'var(--spacing-3)' }}>
                  <Label htmlFor="edit-before">Before</Label>
                  <Textarea
                    id="edit-before"
                    value={editForm.before_text}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, before_text: e.target.value }))
                    }
                    placeholder="Original text..."
                    rows={3}
                  />
                </div>
                <div style={{ marginBottom: 'var(--spacing-3)' }}>
                  <Label htmlFor="edit-after">After</Label>
                  <Textarea
                    id="edit-after"
                    value={editForm.after_text}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, after_text: e.target.value }))
                    }
                    placeholder="Transformed text..."
                    rows={3}
                  />
                </div>
                <div style={{ marginBottom: 'var(--spacing-3)' }}>
                  <Label htmlFor="edit-context">Context (optional)</Label>
                  <Input
                    id="edit-context"
                    value={editForm.context}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, context: e.target.value }))
                    }
                    placeholder="Email subject line, blog intro..."
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-2)' }}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                  >
                    <X className="size-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={updateMutation.isPending || !editForm.before_text.trim() || !editForm.after_text.trim()}
                  >
                    <Check className="size-4 mr-2" />
                    Save
                  </Button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={example.id}
              style={{
                padding: 'var(--spacing-4)',
                backgroundColor: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--border-radius-md)',
              }}
            >
              {example.context && (
                <div style={{ marginBottom: 'var(--spacing-2)' }}>
                  <span
                    style={{
                      fontSize: 'var(--typography-font-size-xs)',
                      fontWeight: 'var(--typography-font-weight-semibold)',
                      color: 'var(--color-text-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {example.context}
                  </span>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)', marginBottom: 'var(--spacing-3)' }}>
                <div>
                  <div
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                      color: 'var(--color-text-secondary)',
                      marginBottom: 'var(--spacing-1)',
                    }}
                  >
                    Before:
                  </div>
                  <p style={{ color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap' }}>
                    {example.before_text}
                  </p>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                      color: 'var(--color-text-secondary)',
                      marginBottom: 'var(--spacing-1)',
                    }}
                  >
                    After:
                  </div>
                  <p style={{ color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap' }}>
                    {example.after_text}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-2)' }}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStartEdit(example)}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(example.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          );
        })}

        {/* Add New Form */}
        {isAdding && (
          <div
            style={{
              padding: 'var(--spacing-4)',
              backgroundColor: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--border-radius-md)',
            }}
          >
            <div style={{ marginBottom: 'var(--spacing-3)' }}>
              <Label htmlFor="new-before">Before *</Label>
              <Textarea
                id="new-before"
                value={editForm.before_text}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, before_text: e.target.value }))
                }
                placeholder="Original text..."
                rows={3}
                autoFocus
              />
            </div>
            <div style={{ marginBottom: 'var(--spacing-3)' }}>
              <Label htmlFor="new-after">After *</Label>
              <Textarea
                id="new-after"
                value={editForm.after_text}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, after_text: e.target.value }))
                }
                placeholder="Transformed text..."
                rows={3}
              />
            </div>
            <div style={{ marginBottom: 'var(--spacing-3)' }}>
              <Label htmlFor="new-context">Context (optional)</Label>
              <Input
                id="new-context"
                value={editForm.context}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, context: e.target.value }))
                }
                placeholder="Email subject line, blog intro..."
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-2)' }}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancelAdd}
              >
                <X className="size-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleSaveNew}
                disabled={createMutation.isPending || !editForm.before_text.trim() || !editForm.after_text.trim()}
              >
                <Check className="size-4 mr-2" />
                Add
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {examples.length === 0 && !isAdding && (
          <div
            style={{
              padding: 'var(--spacing-6)',
              textAlign: 'center',
              color: 'var(--color-text-secondary)',
              backgroundColor: 'var(--color-bg-elevated)',
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--border-radius-md)',
            }}
          >
            <p>No examples yet. Add before/after examples to help train the voice agent.</p>
          </div>
        )}
      </div>
    </div>
  );
}
