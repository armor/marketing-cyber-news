/**
 * AddToNewsletterSheet Component (T010-2.2)
 *
 * Slide-out sheet for adding selected content items to newsletter issues.
 * Allows selection of target issue and block type assignment.
 */

import { useState, useMemo, useCallback } from 'react';
import { Loader2Icon, PlusCircleIcon, AlertCircleIcon } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDraftIssues } from '@/hooks/useDraftIssues';
import { useAddBlocksToIssue } from '@/hooks/useAddBlocksToIssue';
import type { BlockType } from '@/types/newsletter';

// ============================================================================
// Types
// ============================================================================

interface AddToNewsletterSheetProps {
  /** Whether the sheet is open */
  readonly open: boolean;
  /** Callback when open state changes */
  readonly onOpenChange: (open: boolean) => void;
  /** Array of selected content item IDs */
  readonly selectedContentIds: readonly string[];
  /** Callback when content is successfully added */
  readonly onSuccess?: () => void;
}

interface BlockTypeOption {
  readonly value: BlockType;
  readonly label: string;
  readonly description: string;
}

// ============================================================================
// Constants
// ============================================================================

const BLOCK_TYPE_OPTIONS: readonly BlockTypeOption[] = [
  {
    value: 'hero',
    label: 'Hero',
    description: 'Top featured story with large visual',
  },
  {
    value: 'news',
    label: 'News',
    description: 'Industry news and updates',
  },
  {
    value: 'content',
    label: 'Content',
    description: 'Educational content and resources',
  },
  {
    value: 'events',
    label: 'Events',
    description: 'Upcoming events and webinars',
  },
  {
    value: 'spotlight',
    label: 'Spotlight',
    description: 'Product updates and announcements',
  },
] as const;

/** Type guard to validate a string is a valid BlockType */
function isBlockType(value: string): value is BlockType {
  return BLOCK_TYPE_OPTIONS.some((option) => option.value === value);
}

// ============================================================================
// Component
// ============================================================================

export function AddToNewsletterSheet({
  open,
  onOpenChange,
  selectedContentIds,
  onSuccess,
}: AddToNewsletterSheetProps) {
  const [selectedIssueId, setSelectedIssueId] = useState<string>('');
  const [selectedBlockType, setSelectedBlockType] = useState<BlockType>('news');

  // Fetch draft issues
  const {
    data: draftIssues,
    isLoading: isLoadingIssues,
    error: issuesError,
  } = useDraftIssues();

  // Add blocks mutation
  const {
    mutate: addBlocks,
    isPending: isAdding,
    error: addError,
  } = useAddBlocksToIssue();

  // Memoize sorted issues to avoid re-sorting on every render
  const sortedIssues = useMemo(
    () =>
      [...(draftIssues || [])].sort(
        (a, b) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime()
      ),
    [draftIssues]
  );

  // Wrap onOpenChange to reset form state when sheet closes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setSelectedIssueId('');
        setSelectedBlockType('news');
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  // Handle form submission
  const handleSubmit = (): void => {
    if (!selectedIssueId || selectedContentIds.length === 0) {
      return;
    }

    addBlocks(
      {
        issueId: selectedIssueId,
        request: {
          content_item_ids: selectedContentIds,
          block_type: selectedBlockType,
        },
      },
      {
        onSuccess: () => {
          onSuccess?.();
          handleOpenChange(false);
        },
      }
    );
  };

  const canSubmit = selectedIssueId && selectedContentIds.length > 0 && !isAdding;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        style={{
          width: '90%',
          maxWidth: 'var(--spacing-96)',
        }}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center" style={{ gap: 'var(--spacing-2)' }}>
            <PlusCircleIcon className="size-5" style={{ color: 'var(--color-amber-400)' }} />
            Add to Newsletter
          </SheetTitle>
          <SheetDescription>
            Add {selectedContentIds.length} item{selectedContentIds.length !== 1 ? 's' : ''} to a
            draft newsletter issue
          </SheetDescription>
        </SheetHeader>

        <div
          style={{
            padding: 'var(--spacing-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-6)',
          }}
        >
          {/* Selection summary */}
          <div
            style={{
              padding: 'var(--spacing-3)',
              borderRadius: 'var(--border-radius-md)',
              backgroundColor: 'var(--color-bg-elevated)',
              borderWidth: 'var(--border-width-thin)',
              borderColor: 'var(--color-border-default)',
            }}
          >
            <p
              style={{
                fontSize: 'var(--typography-font-size-sm)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <strong style={{ color: 'var(--color-text-primary)' }}>
                {selectedContentIds.length}
              </strong>{' '}
              item{selectedContentIds.length !== 1 ? 's' : ''} selected
            </p>
          </div>

          {/* Issue selection */}
          <div>
            <Label htmlFor="issue-select" required>
              Target Issue
            </Label>
            {isLoadingIssues ? (
              <div
                className="flex items-center justify-center"
                style={{
                  height: 'var(--spacing-10)',
                  gap: 'var(--spacing-2)',
                }}
              >
                <Loader2Icon
                  className="size-4 animate-spin"
                  style={{ color: 'var(--color-text-secondary)' }}
                />
                <span style={{ fontSize: 'var(--typography-font-size-sm)', color: 'var(--color-text-secondary)' }}>
                  Loading issues...
                </span>
              </div>
            ) : issuesError ? (
              <div
                role="alert"
                style={{
                  padding: 'var(--spacing-3)',
                  borderRadius: 'var(--border-radius-md)',
                  backgroundColor: 'var(--color-rose-500-alpha-10)',
                }}
              >
                <p style={{ fontSize: 'var(--typography-font-size-sm)', color: 'var(--color-rose-500)' }}>
                  Failed to load issues. Please try again.
                </p>
              </div>
            ) : !draftIssues || draftIssues.length === 0 ? (
              <div
                role="alert"
                style={{
                  padding: 'var(--spacing-4)',
                  borderRadius: 'var(--border-radius-md)',
                  backgroundColor: 'var(--color-amber-400-alpha-10)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--spacing-3)',
                }}
              >
                <AlertCircleIcon
                  className="size-5 shrink-0"
                  style={{ color: 'var(--color-amber-400)', marginTop: 'var(--spacing-0-5)' }}
                />
                <div>
                  <p
                    style={{
                      fontSize: 'var(--typography-font-size-sm)',
                      fontWeight: 'var(--typography-font-weight-medium)',
                      color: 'var(--color-text-primary)',
                      marginBottom: 'var(--spacing-1)',
                    }}
                  >
                    No draft issues available
                  </p>
                  <p style={{ fontSize: 'var(--typography-font-size-sm)', color: 'var(--color-text-secondary)' }}>
                    Create a draft newsletter issue first before adding content.
                  </p>
                </div>
              </div>
            ) : (
              <Select
                value={selectedIssueId}
                onValueChange={setSelectedIssueId}
                disabled={isAdding}
              >
                <SelectTrigger id="issue-select" aria-label="Select newsletter issue">
                  <SelectValue placeholder="Select an issue" />
                </SelectTrigger>
                <SelectContent>
                  {sortedIssues.map((issue) => (
                    <SelectItem key={issue.id} value={issue.id}>
                      {issue.segment_name} - {new Date(issue.issue_date).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Block type selection */}
          <div>
            <Label htmlFor="block-type-select" required>
              Block Type
            </Label>
            <Select
              value={selectedBlockType}
              onValueChange={(value) => {
                if (isBlockType(value)) {
                  setSelectedBlockType(value);
                }
              }}
              disabled={isAdding}
            >
              <SelectTrigger id="block-type-select" aria-label="Select block type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BLOCK_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div style={{ fontWeight: 'var(--typography-font-weight-medium)' }}>
                        {option.label}
                      </div>
                      <div
                        style={{
                          fontSize: 'var(--typography-font-size-xs)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        {option.description}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Error display */}
          {addError && (
            <div
              role="alert"
              style={{
                padding: 'var(--spacing-3)',
                borderRadius: 'var(--border-radius-md)',
                backgroundColor: 'var(--color-rose-500-alpha-10)',
              }}
            >
              <p style={{ fontSize: 'var(--typography-font-size-sm)', color: 'var(--color-rose-500)' }}>
                {addError.message}
              </p>
            </div>
          )}
        </div>

        <SheetFooter>
          <div
            className="flex gap-3 w-full"
            style={{
              padding: 'var(--spacing-4)',
            }}
          >
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isAdding}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-1"
            >
              {isAdding ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <PlusCircleIcon className="size-4" />
                  Add to Issue
                </>
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default AddToNewsletterSheet;
