import * as React from 'react';
import { Copy, Edit2, Check, Linkedin, Twitter, Mail, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { ContentChannel } from '@/types/content-studio';
import { toast } from 'sonner';

interface ContentPreviewProps {
  content: string;
  channel: ContentChannel;
  onContentChange?: (content: string) => void;
  className?: string;
}

/**
 * ContentPreview - Platform-specific preview of generated content
 *
 * Features:
 * - Platform-specific styling (LinkedIn, Twitter, Email, Blog)
 * - Inline editing mode
 * - Character count
 * - Copy to clipboard
 */
export function ContentPreview({
  content,
  channel,
  onContentChange,
  className = '',
}: ContentPreviewProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedContent, setEditedContent] = React.useState(content);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    setEditedContent(content);
  }, [content]);

  const characterCount = editedContent.length;

  const getChannelConfig = (channel: ContentChannel) => {
    const configs = {
      linkedin: {
        name: 'LinkedIn',
        Icon: Linkedin,
        color: 'var(--color-brand-primary)',
        maxChars: 3000,
        placeholder: 'LinkedIn post content',
      },
      twitter: {
        name: 'Twitter',
        Icon: Twitter,
        color: 'var(--color-shield-cyan)',
        maxChars: 280,
        placeholder: 'Tweet content',
      },
      email: {
        name: 'Email',
        Icon: Mail,
        color: 'var(--color-compliant)',
        maxChars: 5000,
        placeholder: 'Email content',
      },
      blog: {
        name: 'Blog',
        Icon: FileText,
        color: 'var(--color-signal-orange)',
        maxChars: 10000,
        placeholder: 'Blog article content',
      },
    };
    return configs[channel];
  };

  const config = getChannelConfig(channel);
  const Icon = config.Icon;
  const isOverLimit = characterCount > config.maxChars;

  const handleSaveEdit = () => {
    if (!isOverLimit && onContentChange) {
      onContentChange(editedContent);
      setIsEditing(false);
      toast.success('Content updated');
    }
  };

  const handleCancelEdit = () => {
    setEditedContent(content);
    setIsEditing(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedContent);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className={`flex flex-col ${className}`} style={{ gap: 'var(--spacing-3)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center" style={{ gap: 'var(--spacing-2)' }}>
          <div
            className="flex items-center justify-center rounded-lg"
            style={{
              width: 'var(--spacing-8)',
              height: 'var(--spacing-8)',
              background: 'var(--gradient-component)',
            }}
          >
            <Icon
              style={{
                width: 'var(--spacing-5)',
                height: 'var(--spacing-5)',
                color: config.color,
              }}
              aria-hidden="true"
            />
          </div>
          <div>
            <h3
              style={{
                fontSize: 'var(--typography-font-size-base)',
                fontFamily: 'var(--typography-font-family-sans)',
                fontWeight: 'var(--typography-font-weight-semibold)',
                color: 'var(--color-text-primary)',
                lineHeight: 1.2,
              }}
            >
              {config.name} Preview
            </h3>
            <span
              style={{
                fontSize: 'var(--typography-font-size-xs)',
                fontFamily: 'var(--typography-font-family-mono)',
                color: isOverLimit
                  ? 'var(--color-semantic-error)'
                  : 'var(--color-text-muted)',
                fontWeight: isOverLimit
                  ? 'var(--typography-font-weight-semibold)'
                  : 'var(--typography-font-weight-normal)',
              }}
              role="status"
              aria-live="polite"
            >
              {characterCount} / {config.maxChars} characters
            </span>
          </div>
        </div>

        <div className="flex items-center" style={{ gap: 'var(--spacing-2)' }}>
          {!isEditing && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                aria-label={copied ? 'Copied' : 'Copy to clipboard'}
              >
                {copied ? (
                  <Check
                    style={{
                      width: 'var(--spacing-4)',
                      height: 'var(--spacing-4)',
                      color: 'var(--color-semantic-success)',
                    }}
                  />
                ) : (
                  <Copy
                    style={{
                      width: 'var(--spacing-4)',
                      height: 'var(--spacing-4)',
                    }}
                  />
                )}
              </Button>
              {onContentChange && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  aria-label="Edit content"
                >
                  <Edit2
                    style={{
                      width: 'var(--spacing-4)',
                      height: 'var(--spacing-4)',
                    }}
                  />
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Content Display/Edit */}
      <div
        className="rounded-lg overflow-hidden"
        style={{
          background: 'var(--color-bg-elevated)',
          border: `var(--border-width-thin) solid var(--color-border-default)`,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {isEditing ? (
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            placeholder={config.placeholder}
            aria-label="Edit content"
            aria-invalid={isOverLimit}
            style={{
              minHeight: '12rem',
              fontSize: 'var(--typography-font-size-base)',
              border: 'none',
              borderRadius: 0,
              boxShadow: 'none',
            }}
          />
        ) : (
          <div
            style={{
              padding: 'var(--spacing-4)',
              fontSize: 'var(--typography-font-size-base)',
              fontFamily: 'var(--typography-font-family-sans)',
              lineHeight: 'var(--typography-line-height-normal)',
              color: 'var(--color-text-primary)',
              minHeight: '12rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {editedContent || (
              <span
                style={{
                  color: 'var(--color-text-muted)',
                  fontStyle: 'italic',
                }}
              >
                No content generated yet
              </span>
            )}
          </div>
        )}
      </div>

      {/* Edit Actions */}
      {isEditing && (
        <div
          className="flex items-center justify-end"
          style={{ gap: 'var(--spacing-2)' }}
        >
          <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveEdit}
            disabled={isOverLimit}
          >
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}
