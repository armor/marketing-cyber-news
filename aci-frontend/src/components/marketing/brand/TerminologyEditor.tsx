/**
 * TerminologyEditor Component
 *
 * Two-column editor for approved and banned terms.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUpdateTerminology } from '@/hooks/useBrandMutations';
import type { BannedTerm } from '@/types/brand';
import { Plus, X, CheckCircle2, XCircle } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface TerminologyEditorProps {
  readonly brandVoiceId: string;
  readonly approvedTerms: readonly string[];
  readonly bannedTerms: readonly BannedTerm[];
}

// ============================================================================
// Component
// ============================================================================

export function TerminologyEditor({
  brandVoiceId,
  approvedTerms,
  bannedTerms,
}: TerminologyEditorProps) {
  const [newApprovedTerm, setNewApprovedTerm] = useState('');
  const [newBannedTerm, setNewBannedTerm] = useState('');
  const [newReplacement, setNewReplacement] = useState('');

  const updateMutation = useUpdateTerminology();

  const handleAddApproved = () => {
    if (!newApprovedTerm.trim()) return;

    updateMutation.mutate({
      brandVoiceId,
      request: {
        approved_terms: [...approvedTerms, newApprovedTerm.trim()],
      },
    });

    setNewApprovedTerm('');
  };

  const handleRemoveApproved = (term: string) => {
    updateMutation.mutate({
      brandVoiceId,
      request: {
        approved_terms: approvedTerms.filter((t) => t !== term),
      },
    });
  };

  const handleAddBanned = () => {
    if (!newBannedTerm.trim()) return;

    const newBanned: BannedTerm = {
      term: newBannedTerm.trim(),
      replacement: newReplacement.trim() || undefined,
    };

    updateMutation.mutate({
      brandVoiceId,
      request: {
        banned_terms: [...bannedTerms, newBanned],
      },
    });

    setNewBannedTerm('');
    setNewReplacement('');
  };

  const handleRemoveBanned = (term: string) => {
    updateMutation.mutate({
      brandVoiceId,
      request: {
        banned_terms: bannedTerms.filter((t) => t.term !== term),
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Terminology Control</CardTitle>
        <CardDescription>
          Define approved industry terms and banned phrases with optional replacements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 'var(--spacing-6)',
          }}
        >
          {/* Approved Terms */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-2)',
                paddingBottom: 'var(--spacing-3)',
                borderBottom: `var(--border-width-thin) solid var(--color-border-default)`,
              }}
            >
              <CheckCircle2 size={20} style={{ color: 'var(--color-semantic-success)' }} />
              <h3
                style={{
                  fontSize: 'var(--typography-font-size-lg)',
                  fontWeight: 'var(--typography-font-weight-semibold)',
                  color: 'var(--color-text-primary)',
                  margin: 0,
                }}
              >
                Approved Terms
              </h3>
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: 'var(--typography-font-size-sm)',
                  color: 'var(--color-text-secondary)',
                  fontWeight: 'var(--typography-font-weight-medium)',
                }}
              >
                {approvedTerms.length}
              </span>
            </div>

            {/* Add New Approved Term */}
            <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
              <Input
                placeholder="Add approved term..."
                value={newApprovedTerm}
                onChange={(e) => setNewApprovedTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddApproved();
                  }
                }}
              />
              <Button
                onClick={handleAddApproved}
                disabled={!newApprovedTerm.trim() || updateMutation.isPending}
                size="icon"
              >
                <Plus size={20} />
              </Button>
            </div>

            {/* Approved Terms List */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-2)',
                maxHeight: '400px',
                overflowY: 'auto',
              }}
            >
              {approvedTerms.length === 0 ? (
                <div
                  style={{
                    padding: 'var(--spacing-6)',
                    textAlign: 'center',
                    color: 'var(--color-text-muted)',
                    fontSize: 'var(--typography-font-size-sm)',
                  }}
                >
                  No approved terms yet
                </div>
              ) : (
                approvedTerms.map((term) => (
                  <div
                    key={term}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 'var(--spacing-3)',
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderRadius: 'var(--border-radius-md)',
                      border: `var(--border-width-thin) solid var(--color-border-default)`,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 'var(--typography-font-size-sm)',
                        color: 'var(--color-text-primary)',
                        fontFamily: 'var(--typography-font-family-mono)',
                      }}
                    >
                      {term}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveApproved(term)}
                      disabled={updateMutation.isPending}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 'var(--spacing-1)',
                        cursor: 'pointer',
                        color: 'var(--color-text-muted)',
                        transition: 'color var(--motion-duration-fast) var(--motion-easing-default)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--color-semantic-error)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--color-text-muted)';
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Banned Terms */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-2)',
                paddingBottom: 'var(--spacing-3)',
                borderBottom: `var(--border-width-thin) solid var(--color-border-default)`,
              }}
            >
              <XCircle size={20} style={{ color: 'var(--color-semantic-error)' }} />
              <h3
                style={{
                  fontSize: 'var(--typography-font-size-lg)',
                  fontWeight: 'var(--typography-font-weight-semibold)',
                  color: 'var(--color-text-primary)',
                  margin: 0,
                }}
              >
                Banned Terms
              </h3>
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: 'var(--typography-font-size-sm)',
                  color: 'var(--color-text-secondary)',
                  fontWeight: 'var(--typography-font-weight-medium)',
                }}
              >
                {bannedTerms.length}
              </span>
            </div>

            {/* Add New Banned Term */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
              <Input
                placeholder="Banned term..."
                value={newBannedTerm}
                onChange={(e) => setNewBannedTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    handleAddBanned();
                  }
                }}
              />
              <Input
                placeholder="Replacement (optional)..."
                value={newReplacement}
                onChange={(e) => setNewReplacement(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddBanned();
                  }
                }}
              />
              <Button
                onClick={handleAddBanned}
                disabled={!newBannedTerm.trim() || updateMutation.isPending}
                variant="destructive"
              >
                <Plus size={20} />
                Add Banned Term
              </Button>
            </div>

            {/* Banned Terms List */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-2)',
                maxHeight: '400px',
                overflowY: 'auto',
              }}
            >
              {bannedTerms.length === 0 ? (
                <div
                  style={{
                    padding: 'var(--spacing-6)',
                    textAlign: 'center',
                    color: 'var(--color-text-muted)',
                    fontSize: 'var(--typography-font-size-sm)',
                  }}
                >
                  No banned terms yet
                </div>
              ) : (
                bannedTerms.map((item) => (
                  <div
                    key={item.term}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--spacing-2)',
                      padding: 'var(--spacing-3)',
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderRadius: 'var(--border-radius-md)',
                      border: `var(--border-width-thin) solid var(--color-border-default)`,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 'var(--typography-font-size-sm)',
                          color: 'var(--color-semantic-error)',
                          fontFamily: 'var(--typography-font-family-mono)',
                          textDecoration: 'line-through',
                        }}
                      >
                        {item.term}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBanned(item.term)}
                        disabled={updateMutation.isPending}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 'var(--spacing-1)',
                          cursor: 'pointer',
                          color: 'var(--color-text-muted)',
                          transition: 'color var(--motion-duration-fast) var(--motion-easing-default)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'var(--color-semantic-error)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--color-text-muted)';
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                    {item.replacement && (
                      <div
                        style={{
                          fontSize: 'var(--typography-font-size-xs)',
                          color: 'var(--color-text-secondary)',
                          paddingLeft: 'var(--spacing-4)',
                          borderLeft: `var(--border-width-medium) solid var(--color-semantic-success)`,
                        }}
                      >
                        Use instead: <span style={{ fontFamily: 'var(--typography-font-family-mono)' }}>{item.replacement}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
