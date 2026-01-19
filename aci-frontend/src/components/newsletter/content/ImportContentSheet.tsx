/**
 * ImportContentSheet Component (T010-2.3)
 *
 * Slide-out sheet for importing external content via URL or manual entry.
 * Supports metadata extraction from URLs and manual form entry.
 */

import { useState, useCallback } from 'react';
import { Loader2Icon, DownloadIcon, AlertCircleIcon, CheckCircleIcon } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useFetchURLMetadata, type URLMetadata } from '@/hooks/useFetchURLMetadata';
import { useCreateContentItem, type CreateManualContentRequest } from '@/hooks/useCreateContentItem';
import type { ContentType } from '@/types/newsletter';

// ============================================================================
// Types
// ============================================================================

interface ImportContentSheetProps {
  /** Whether the sheet is open */
  readonly open: boolean;
  /** Callback when open state changes */
  readonly onOpenChange: (open: boolean) => void;
  /** Callback when content is successfully imported */
  readonly onSuccess?: () => void;
}

interface FormData {
  url: string;
  title: string;
  summary: string;
  contentType: ContentType;
  topicTags: string;
  author: string;
  imageUrl: string;
  publishDate: string;
}

// ============================================================================
// Constants
// ============================================================================

const CONTENT_TYPE_OPTIONS: readonly { value: ContentType; label: string }[] = [
  { value: 'blog', label: 'Blog Post' },
  { value: 'news', label: 'News Article' },
  { value: 'case_study', label: 'Case Study' },
  { value: 'webinar', label: 'Webinar' },
  { value: 'product_update', label: 'Product Update' },
  { value: 'event', label: 'Event' },
] as const;

const INITIAL_FORM_DATA: FormData = {
  url: '',
  title: '',
  summary: '',
  contentType: 'news',
  topicTags: '',
  author: '',
  imageUrl: '',
  publishDate: new Date().toISOString().split('T')[0],
};

// ============================================================================
// Component
// ============================================================================

export function ImportContentSheet({
  open,
  onOpenChange,
  onSuccess,
}: ImportContentSheetProps) {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [fetchedMetadata, setFetchedMetadata] = useState<URLMetadata | null>(null);

  // URL metadata fetching
  const {
    mutate: fetchMetadata,
    isPending: isFetching,
    error: fetchError,
  } = useFetchURLMetadata();

  // Content creation
  const {
    mutate: createContent,
    isPending: isCreating,
    error: createError,
  } = useCreateContentItem();

  // Wrap onOpenChange to reset form state when sheet closes
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setFormData(INITIAL_FORM_DATA);
        setFetchedMetadata(null);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  // Handle URL fetch
  const handleFetchMetadata = (): void => {
    if (!formData.url) {
      return;
    }

    fetchMetadata(
      { url: formData.url },
      {
        onSuccess: (metadata) => {
          setFetchedMetadata(metadata);
          // Pre-fill form with metadata
          setFormData((prev) => ({
            ...prev,
            title: metadata.title || prev.title,
            summary: metadata.description || prev.summary,
            author: metadata.author || prev.author,
            imageUrl: metadata.image_url || prev.imageUrl,
            publishDate: metadata.publish_date
              ? new Date(metadata.publish_date).toISOString().split('T')[0]
              : prev.publishDate,
          }));
        },
      }
    );
  };

  // Handle form field changes
  const handleFieldChange = (field: keyof FormData, value: string): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle form submission
  const handleSubmit = (): void => {
    if (!formData.url || !formData.title) {
      return;
    }

    const topicTagsArray = formData.topicTags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const request: CreateManualContentRequest = {
      url: formData.url,
      title: formData.title,
      summary: formData.summary || null,
      content_type: formData.contentType,
      topic_tags: topicTagsArray,
      author: formData.author || null,
      image_url: formData.imageUrl || null,
      publish_date: formData.publishDate || null,
    };

    createContent(
      { request },
      {
        onSuccess: () => {
          onSuccess?.();
          handleOpenChange(false);
        },
      }
    );
  };

  const canFetch = formData.url && !isFetching;
  const canSubmit = formData.url && formData.title && !isCreating;

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
            <DownloadIcon className="size-5" style={{ color: 'var(--color-amber-400)' }} />
            Import Content
          </SheetTitle>
          <SheetDescription>
            Import external content from a URL or enter details manually
          </SheetDescription>
        </SheetHeader>

        <div
          style={{
            padding: 'var(--spacing-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-6)',
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 200px)',
          }}
        >
          <Tabs defaultValue="url">
            <TabsList>
              <TabsTrigger value="url">URL Import</TabsTrigger>
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            </TabsList>

            {/* URL Import Tab */}
            <TabsContent value="url">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                <div>
                  <Label htmlFor="url-input" required>
                    URL
                  </Label>
                  <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                    <Input
                      id="url-input"
                      type="url"
                      placeholder="https://example.com/article"
                      value={formData.url}
                      onChange={(e) => handleFieldChange('url', e.target.value)}
                      disabled={isFetching || isCreating}
                      aria-label="Content URL"
                    />
                    <Button
                      variant="outline"
                      onClick={handleFetchMetadata}
                      disabled={!canFetch}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {isFetching ? (
                        <>
                          <Loader2Icon className="size-4 animate-spin" />
                          Fetching...
                        </>
                      ) : (
                        'Fetch'
                      )}
                    </Button>
                  </div>
                </div>

                {/* Fetch error */}
                {fetchError && (
                  <div
                    role="alert"
                    style={{
                      padding: 'var(--spacing-3)',
                      borderRadius: 'var(--border-radius-md)',
                      backgroundColor: 'var(--color-rose-500-alpha-10)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 'var(--spacing-2)',
                    }}
                  >
                    <AlertCircleIcon
                      className="size-5 shrink-0"
                      style={{ color: 'var(--color-rose-500)', marginTop: 'var(--spacing-0-5)' }}
                    />
                    <div>
                      <p
                        style={{
                          fontSize: 'var(--typography-font-size-sm)',
                          color: 'var(--color-rose-500)',
                          marginBottom: 'var(--spacing-1)',
                        }}
                      >
                        Failed to fetch metadata
                      </p>
                      <p style={{ fontSize: 'var(--typography-font-size-xs)', color: 'var(--color-text-secondary)' }}>
                        You can still enter the details manually below or switch to the Manual Entry tab.
                      </p>
                    </div>
                  </div>
                )}

                {/* Fetch success */}
                {fetchedMetadata && !fetchError && (
                  <div
                    role="status"
                    style={{
                      padding: 'var(--spacing-3)',
                      borderRadius: 'var(--border-radius-md)',
                      backgroundColor: 'var(--color-emerald-500-alpha-10)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-2)',
                    }}
                  >
                    <CheckCircleIcon className="size-5" style={{ color: 'var(--color-emerald-500)' }} />
                    <p style={{ fontSize: 'var(--typography-font-size-sm)', color: 'var(--color-text-primary)' }}>
                      Metadata fetched successfully. Review and edit below.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Manual Entry Tab */}
            <TabsContent value="manual">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                <div>
                  <Label htmlFor="manual-url-input" required>
                    URL
                  </Label>
                  <Input
                    id="manual-url-input"
                    type="url"
                    placeholder="https://example.com/article"
                    value={formData.url}
                    onChange={(e) => handleFieldChange('url', e.target.value)}
                    disabled={isCreating}
                    aria-label="Content URL"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Common form fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
            <div>
              <Label htmlFor="title-input" required>
                Title
              </Label>
              <Input
                id="title-input"
                type="text"
                placeholder="Article title"
                value={formData.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                disabled={isCreating}
                aria-label="Content title"
                aria-required="true"
              />
            </div>

            <div>
              <Label htmlFor="summary-input">Summary</Label>
              <Input
                id="summary-input"
                type="text"
                placeholder="Brief summary or description"
                value={formData.summary}
                onChange={(e) => handleFieldChange('summary', e.target.value)}
                disabled={isCreating}
                aria-label="Content summary"
              />
            </div>

            <div>
              <Label htmlFor="content-type-select" required>
                Content Type
              </Label>
              <Select
                value={formData.contentType}
                onValueChange={(value) => handleFieldChange('contentType', value)}
                disabled={isCreating}
              >
                <SelectTrigger id="content-type-select" aria-label="Select content type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="topic-tags-input">Topic Tags</Label>
              <Input
                id="topic-tags-input"
                type="text"
                placeholder="security, vulnerability, ransomware (comma-separated)"
                value={formData.topicTags}
                onChange={(e) => handleFieldChange('topicTags', e.target.value)}
                disabled={isCreating}
                aria-label="Topic tags"
              />
              <p
                style={{
                  fontSize: 'var(--typography-font-size-xs)',
                  color: 'var(--color-text-secondary)',
                  marginTop: 'var(--spacing-1)',
                }}
              >
                Separate multiple tags with commas
              </p>
            </div>

            <div>
              <Label htmlFor="author-input">Author</Label>
              <Input
                id="author-input"
                type="text"
                placeholder="Author name"
                value={formData.author}
                onChange={(e) => handleFieldChange('author', e.target.value)}
                disabled={isCreating}
                aria-label="Author name"
              />
            </div>

            <div>
              <Label htmlFor="image-url-input">Image URL</Label>
              <Input
                id="image-url-input"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={formData.imageUrl}
                onChange={(e) => handleFieldChange('imageUrl', e.target.value)}
                disabled={isCreating}
                aria-label="Image URL"
              />
            </div>

            <div>
              <Label htmlFor="publish-date-input">Publish Date</Label>
              <Input
                id="publish-date-input"
                type="date"
                value={formData.publishDate}
                onChange={(e) => handleFieldChange('publishDate', e.target.value)}
                disabled={isCreating}
                aria-label="Publish date"
              />
            </div>
          </div>

          {/* Create error */}
          {createError && (
            <div
              role="alert"
              style={{
                padding: 'var(--spacing-3)',
                borderRadius: 'var(--border-radius-md)',
                backgroundColor: 'var(--color-rose-500-alpha-10)',
              }}
            >
              <p style={{ fontSize: 'var(--typography-font-size-sm)', color: 'var(--color-rose-500)' }}>
                {createError.message}
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
              onClick={() => handleOpenChange(false)}
              disabled={isCreating}
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
              {isCreating ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <DownloadIcon className="size-4" />
                  Import Content
                </>
              )}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default ImportContentSheet;
