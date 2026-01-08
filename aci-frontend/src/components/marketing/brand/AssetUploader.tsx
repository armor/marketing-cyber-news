/**
 * AssetUploader Component
 *
 * Drag-drop file upload for brand documents (PDF, DOCX).
 */

import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUploadAsset } from '@/hooks/useBrandMutations';
import { Upload, FileText, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface AssetUploaderProps {
  readonly brandVoiceId: string;
}

interface FileWithProgress {
  readonly file: File;
  readonly progress: number;
  readonly status: 'uploading' | 'success' | 'error';
  readonly error?: string;
}

// ============================================================================
// Helpers
// ============================================================================

const ACCEPTED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'Only PDF, DOCX, and TXT files are supported';
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File size must be less than ${formatFileSize(MAX_FILE_SIZE)}`;
  }
  return null;
}

// ============================================================================
// Component
// ============================================================================

export function AssetUploader({ brandVoiceId }: AssetUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useUploadAsset();

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      processFiles(selectedFiles);
    }
  };

  const processFiles = (newFiles: File[]) => {
    const validFiles: FileWithProgress[] = newFiles.map((file) => {
      const error = validateFile(file);
      return {
        file,
        progress: 0,
        status: error ? ('error' as const) : ('uploading' as const),
        error: error ?? undefined,
      };
    });

    setFiles((prev) => [...prev, ...validFiles]);

    // Upload valid files
    validFiles.forEach((fileItem) => {
      if (!fileItem.error) {
        uploadFile(fileItem.file);
      }
    });
  };

  const uploadFile = async (file: File) => {
    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setFiles((prev) =>
          prev.map((f) =>
            f.file === file && f.progress < 90
              ? { ...f, progress: f.progress + 10 }
              : f
          )
        );
      }, 200);

      await uploadMutation.mutateAsync({ brandVoiceId, file });

      clearInterval(progressInterval);

      setFiles((prev) =>
        prev.map((f) =>
          f.file === file
            ? { ...f, progress: 100, status: 'success' as const }
            : f
        )
      );
    } catch (error) {
      setFiles((prev) =>
        prev.map((f) =>
          f.file === file
            ? {
                ...f,
                status: 'error' as const,
                error: error instanceof Error ? error.message : 'Upload failed',
              }
            : f
        )
      );
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (file: File) => {
    setFiles((prev) => prev.filter((f) => f.file !== file));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Brand Assets</CardTitle>
        <CardDescription>
          Upload brand guidelines, style guides, or example documents (PDF, DOCX, TXT)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Drop Zone */}
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: `var(--border-width-medium) dashed ${
              isDragging ? 'var(--color-brand-primary)' : 'var(--color-border-default)'
            }`,
            borderRadius: 'var(--border-radius-lg)',
            padding: 'var(--spacing-8)',
            textAlign: 'center',
            backgroundColor: isDragging ? 'var(--color-bg-secondary)' : 'transparent',
            transition: 'all var(--motion-duration-fast) var(--motion-easing-default)',
            cursor: 'pointer',
          }}
          onClick={handleBrowseClick}
        >
          <Upload
            size={48}
            style={{
              color: isDragging ? 'var(--color-brand-primary)' : 'var(--color-text-muted)',
              margin: '0 auto var(--spacing-4)',
            }}
          />
          <div
            style={{
              fontSize: 'var(--typography-font-size-base)',
              fontWeight: 'var(--typography-font-weight-medium)',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--spacing-2)',
            }}
          >
            {isDragging ? 'Drop files here' : 'Drag & drop files here'}
          </div>
          <div
            style={{
              fontSize: 'var(--typography-font-size-sm)',
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--spacing-4)',
            }}
          >
            or click to browse
          </div>
          <div
            style={{
              fontSize: 'var(--typography-font-size-xs)',
              color: 'var(--color-text-muted)',
            }}
          >
            PDF, DOCX, TXT up to {formatFileSize(MAX_FILE_SIZE)}
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />

        {/* File List */}
        {files.length > 0 && (
          <div
            style={{
              marginTop: 'var(--spacing-6)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-3)',
            }}
          >
            {files.map((fileItem, index) => (
              <div
                key={index}
                style={{
                  padding: 'var(--spacing-4)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderRadius: 'var(--border-radius-lg)',
                  border: `var(--border-width-thin) solid var(--color-border-default)`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-3)' }}>
                  <FileText size={20} style={{ color: 'var(--color-brand-primary)', flexShrink: 0 }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 'var(--typography-font-size-sm)',
                        fontWeight: 'var(--typography-font-weight-medium)',
                        color: 'var(--color-text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {fileItem.file.name}
                    </div>
                    <div
                      style={{
                        fontSize: 'var(--typography-font-size-xs)',
                        color: 'var(--color-text-secondary)',
                        marginTop: 'var(--spacing-1)',
                      }}
                    >
                      {formatFileSize(fileItem.file.size)}
                    </div>

                    {/* Progress Bar */}
                    {fileItem.status === 'uploading' && (
                      <div
                        style={{
                          marginTop: 'var(--spacing-2)',
                          height: 'var(--spacing-1)',
                          backgroundColor: 'var(--color-border-default)',
                          borderRadius: 'var(--border-radius-full)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${fileItem.progress}%`,
                            height: '100%',
                            backgroundColor: 'var(--color-brand-primary)',
                            transition: 'width var(--motion-duration-fast) var(--motion-easing-default)',
                          }}
                        />
                      </div>
                    )}

                    {/* Error Message */}
                    {fileItem.status === 'error' && fileItem.error && (
                      <div
                        style={{
                          marginTop: 'var(--spacing-2)',
                          fontSize: 'var(--typography-font-size-xs)',
                          color: 'var(--color-semantic-error)',
                        }}
                      >
                        {fileItem.error}
                      </div>
                    )}
                  </div>

                  {/* Status Icon */}
                  <div style={{ flexShrink: 0 }}>
                    {fileItem.status === 'uploading' && (
                      <Loader2 size={20} className="text-[var(--color-brand-primary)] animate-spin" />
                    )}
                    {fileItem.status === 'success' && (
                      <CheckCircle2 size={20} style={{ color: 'var(--color-semantic-success)' }} />
                    )}
                    {fileItem.status === 'error' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(fileItem.file);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                        }}
                      >
                        <XCircle size={20} style={{ color: 'var(--color-semantic-error)' }} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
