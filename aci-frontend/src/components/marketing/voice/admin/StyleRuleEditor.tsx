/**
 * StyleRuleEditor Component
 *
 * Manages style rules (do/don't) for a voice agent.
 * Supports inline editing, adding, and deleting rules.
 */

import { type ReactElement, useState } from 'react';
import { Plus, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { StyleRule } from '@/types/voice';
import { useCreateStyleRule, useUpdateStyleRule, useDeleteStyleRule } from '@/hooks/useVoiceAgentAdmin';

// ============================================================================
// Types
// ============================================================================

interface StyleRuleEditorProps {
  readonly agentId: string;
  readonly rules: readonly StyleRule[];
}

interface EditingRule {
  id: string | null;
  rule_type: 'do' | 'dont';
  rule_text: string;
}

// ============================================================================
// Component
// ============================================================================

export function StyleRuleEditor({ agentId, rules }: StyleRuleEditorProps): ReactElement {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditingRule>({
    id: null,
    rule_type: 'do',
    rule_text: '',
  });

  const createMutation = useCreateStyleRule();
  const updateMutation = useUpdateStyleRule();
  const deleteMutation = useDeleteStyleRule();

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleStartAdd = (): void => {
    setIsAdding(true);
    setEditForm({ id: null, rule_type: 'do', rule_text: '' });
  };

  const handleCancelAdd = (): void => {
    setIsAdding(false);
    setEditForm({ id: null, rule_type: 'do', rule_text: '' });
  };

  const handleSaveNew = (): void => {
    if (!editForm.rule_text.trim()) {
      return;
    }

    createMutation.mutate(
      {
        agentId,
        data: {
          rule_type: editForm.rule_type,
          rule_text: editForm.rule_text,
        },
      },
      {
        onSuccess: () => {
          setIsAdding(false);
          setEditForm({ id: null, rule_type: 'do', rule_text: '' });
        },
      }
    );
  };

  const handleStartEdit = (rule: StyleRule): void => {
    setEditingId(rule.id);
    setEditForm({
      id: rule.id,
      rule_type: rule.rule_type,
      rule_text: rule.rule_text,
    });
  };

  const handleCancelEdit = (): void => {
    setEditingId(null);
    setEditForm({ id: null, rule_type: 'do', rule_text: '' });
  };

  const handleSaveEdit = (): void => {
    if (!editingId || !editForm.rule_text.trim()) {
      return;
    }

    updateMutation.mutate(
      {
        agentId,
        ruleId: editingId,
        data: {
          rule_type: editForm.rule_type,
          rule_text: editForm.rule_text,
        },
      },
      {
        onSuccess: () => {
          setEditingId(null);
          setEditForm({ id: null, rule_type: 'do', rule_text: '' });
        },
      }
    );
  };

  const handleDelete = (ruleId: string): void => {
    if (!confirm('Are you sure you want to delete this style rule?')) {
      return;
    }

    deleteMutation.mutate({ agentId, ruleId });
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-4)' }}>
        <Label style={{ fontSize: 'var(--typography-font-size-base)', fontWeight: 'var(--typography-font-weight-semibold)' }}>
          Style Rules ({rules.length})
        </Label>
        {!isAdding && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleStartAdd}
          >
            <Plus className="size-4 mr-2" />
            Add Rule
          </Button>
        )}
      </div>

      {/* Rules List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
        {rules.map((rule) => {
          const isEditing = editingId === rule.id;

          if (isEditing) {
            return (
              <div
                key={rule.id}
                style={{
                  padding: 'var(--spacing-3)',
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--border-radius-md)',
                }}
              >
                <div style={{ display: 'flex', gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-2)' }}>
                  <Select
                    value={editForm.rule_type}
                    onValueChange={(value: 'do' | 'dont') =>
                      setEditForm((prev) => ({ ...prev, rule_type: value }))
                    }
                  >
                    <SelectTrigger style={{ width: '120px' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="do">Do</SelectItem>
                      <SelectItem value="dont">Don't</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={editForm.rule_text}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, rule_text: e.target.value }))
                    }
                    placeholder="Enter rule text..."
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-2)' }}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                  >
                    <X className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={updateMutation.isPending || !editForm.rule_text.trim()}
                  >
                    <Check className="size-4" />
                  </Button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={rule.id}
              style={{
                padding: 'var(--spacing-3)',
                backgroundColor: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--border-radius-md)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 'var(--spacing-3)',
              }}
            >
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                <Badge variant={rule.rule_type === 'do' ? 'default' : 'destructive'}>
                  {rule.rule_type === 'do' ? 'Do' : "Don't"}
                </Badge>
                <span style={{ color: 'var(--color-text-primary)' }}>
                  {rule.rule_text}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStartEdit(rule)}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(rule.id)}
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
              padding: 'var(--spacing-3)',
              backgroundColor: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--border-radius-md)',
            }}
          >
            <div style={{ display: 'flex', gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-2)' }}>
              <Select
                value={editForm.rule_type}
                onValueChange={(value: 'do' | 'dont') =>
                  setEditForm((prev) => ({ ...prev, rule_type: value }))
                }
              >
                <SelectTrigger style={{ width: '120px' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="do">Do</SelectItem>
                  <SelectItem value="dont">Don't</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={editForm.rule_text}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, rule_text: e.target.value }))
                }
                placeholder="Enter rule text..."
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-2)' }}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancelAdd}
              >
                <X className="size-4" />
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleSaveNew}
                disabled={createMutation.isPending || !editForm.rule_text.trim()}
              >
                <Check className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {rules.length === 0 && !isAdding && (
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
            <p>No style rules yet. Add your first rule to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
