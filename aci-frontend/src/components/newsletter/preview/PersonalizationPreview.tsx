/**
 * PersonalizationPreview Component
 *
 * Displays newsletter issue preview with personalization comparison.
 * Allows contact selection, side-by-side generic vs personalized views,
 * and highlights personalization tokens with tooltips and type-based colors.
 *
 * Wave 4.8.2: AI Newsletter Automation
 */

import { useState, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useIssuePreview } from '@/hooks/useIssuePreview';
import { getSegmentContacts } from '@/services/api/newsletter';
import { useQuery } from '@tanstack/react-query';
import { newsletterKeys } from '@/hooks/newsletterKeys';
import type { Contact } from '@/types/newsletter';

// ============================================================================
// Types
// ============================================================================

type PreviewMode = 'split' | 'generic' | 'personalized';

interface PersonalizationPreviewProps {
  readonly issueId: string;
  readonly segmentId: string;
}

// ============================================================================
// Constants
// ============================================================================

const PERSONALIZATION_TOKEN_REGEX = /\{\{([^}]+)\}\}/g;

/**
 * Token category for styling and display
 */
type TokenCategory = 'contact' | 'behavioral' | 'custom';

/**
 * Token metadata including category and description
 */
interface TokenMetadata {
  readonly category: TokenCategory;
  readonly label: string;
  readonly description: string;
}

/**
 * Map of known tokens to their metadata
 * Used for categorization and tooltip content
 */
const TOKEN_METADATA: Record<string, TokenMetadata> = {
  first_name: {
    category: 'contact',
    label: 'First Name',
    description: 'Contact first name',
  },
  last_name: {
    category: 'contact',
    label: 'Last Name',
    description: 'Contact last name',
  },
  full_name: {
    category: 'contact',
    label: 'Full Name',
    description: 'Contact full name',
  },
  email: {
    category: 'contact',
    label: 'Email',
    description: 'Contact email address',
  },
  company: {
    category: 'contact',
    label: 'Company',
    description: 'Contact company name',
  },
  job_title: {
    category: 'contact',
    label: 'Job Title',
    description: 'Contact job title',
  },
  role_category: {
    category: 'contact',
    label: 'Role Category',
    description: 'Contact role category',
  },
  industry: {
    category: 'contact',
    label: 'Industry',
    description: 'Contact industry',
  },
  region: {
    category: 'contact',
    label: 'Region',
    description: 'Contact region',
  },
  primary_framework: {
    category: 'contact',
    label: 'Primary Framework',
    description: 'Contact primary compliance framework',
  },
  engagement_score: {
    category: 'behavioral',
    label: 'Engagement Score',
    description: 'Contact engagement score',
  },
  last_opened_at: {
    category: 'behavioral',
    label: 'Last Opened',
    description: 'Date of last email opened',
  },
  last_clicked_at: {
    category: 'behavioral',
    label: 'Last Clicked',
    description: 'Date of last link clicked',
  },
  total_opens: {
    category: 'behavioral',
    label: 'Total Opens',
    description: 'Total number of emails opened',
  },
  total_clicks: {
    category: 'behavioral',
    label: 'Total Clicks',
    description: 'Total number of links clicked',
  },
} as const;

/**
 * Color mapping for token categories
 */
const TOKEN_CATEGORY_COLORS: Record<TokenCategory, { bg: string; text: string; border: string }> = {
  contact: {
    bg: 'var(--color-primary-subtle)',
    text: 'var(--color-primary-emphasis)',
    border: 'var(--color-primary)',
  },
  behavioral: {
    bg: 'var(--color-info-subtle)',
    text: 'var(--color-info-emphasis)',
    border: 'var(--color-info)',
  },
  custom: {
    bg: 'var(--color-warning-subtle)',
    text: 'var(--color-warning-emphasis)',
    border: 'var(--color-warning)',
  },
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extracts unique tokens from HTML content
 */
function extractTokens(html: string): string[] {
  if (!html) {
    return [];
  }

  const tokens = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = PERSONALIZATION_TOKEN_REGEX.exec(html)) !== null) {
    tokens.add(match[1]);
  }

  return Array.from(tokens);
}

/**
 * Get token metadata with fallback for unknown tokens
 */
function getTokenMetadata(token: string): TokenMetadata {
  return (
    TOKEN_METADATA[token] ?? {
      category: 'custom',
      label: token,
      description: `Custom token: ${token}`,
    }
  );
}

/**
 * Get token category for styling
 */
function getTokenCategory(token: string): TokenCategory {
  return getTokenMetadata(token).category;
}

/**
 * Check if contact has data for a token
 */
function hasContactData(contact: Contact | undefined, token: string): boolean {
  if (!contact) {
    return false;
  }

  const tokenKey = token as keyof Contact;
  const value = contact[tokenKey];

  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === 'string' && value.trim() === '') {
    return false;
  }

  if (typeof value === 'number' && value === 0) {
    return false;
  }

  return true;
}

/**
 * Get contact value for a token (for display purposes)
 */
function getContactValue(contact: Contact | undefined, token: string): string {
  if (!contact) {
    return '[No contact selected]';
  }

  if (!hasContactData(contact, token)) {
    return '[Missing data]';
  }

  const tokenKey = token as keyof Contact;
  const value = contact[tokenKey];

  if (value instanceof Date) {
    return value.toLocaleDateString();
  }

  return String(value);
}

/**
 * Find tokens missing data for selected contact
 */
function findMissingTokens(
  tokens: readonly string[],
  contact: Contact | undefined
): readonly string[] {
  if (!contact) {
    return [];
  }

  return tokens.filter((token) => !hasContactData(contact, token));
}

// ============================================================================
// Component
// ============================================================================

export function PersonalizationPreview({
  issueId,
  segmentId,
}: PersonalizationPreviewProps): React.ReactElement {
  const [selectedContactId, setSelectedContactId] = useState<string | undefined>(undefined);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('split');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch segment contacts for contact selector
  const {
    data: contactsData,
    isLoading: isLoadingContacts,
  } = useQuery({
    queryKey: newsletterKeys.segmentContacts(segmentId, { page: 1, page_size: 100 }),
    queryFn: () => getSegmentContacts(segmentId, { page: 1, page_size: 100 }),
  });

  // Fetch generic preview (no contact)
  const {
    data: genericPreview,
    isLoading: isLoadingGeneric,
  } = useIssuePreview({
    id: issueId,
    contactId: undefined,
  });

  // Fetch personalized preview (with selected contact)
  const {
    data: personalizedPreview,
    isLoading: isLoadingPersonalized,
  } = useIssuePreview({
    id: issueId,
    contactId: selectedContactId,
    enabled: !!selectedContactId,
  });

  const contacts = useMemo(() => contactsData?.data ?? [], [contactsData?.data]);
  const selectedContact = contacts.find((c) => c.id === selectedContactId);

  // Filter contacts by search query
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) {
      return contacts;
    }

    const query = searchQuery.toLowerCase();
    return contacts.filter(
      (contact) =>
        contact.first_name.toLowerCase().includes(query) ||
        contact.last_name.toLowerCase().includes(query) ||
        contact.email.toLowerCase().includes(query) ||
        contact.company.toLowerCase().includes(query)
    );
  }, [contacts, searchQuery]);

  // Extract tokens from generic preview
  const tokens = useMemo(() => {
    if (!genericPreview?.html_content) {
      return [];
    }
    return extractTokens(genericPreview.html_content);
  }, [genericPreview]);

  // Find tokens missing data for selected contact
  const missingTokens = useMemo(() => {
    return findMissingTokens(tokens, selectedContact);
  }, [tokens, selectedContact]);

  if (isLoadingContacts) {
    return (
      <Card>
        <CardContent
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
          }}
        >
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-6)',
      }}
    >
      {/* Controls Section */}
      <Card>
        <CardHeader>
          <CardTitle>Personalization Settings</CardTitle>
        </CardHeader>
        <CardContent
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-4)',
          }}
        >
          {/* Contact Selector */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-2)',
            }}
          >
            <label
              htmlFor="contact-search"
              style={{
                fontSize: 'var(--typography-font-size-sm)',
                fontWeight: 'var(--typography-font-weight-medium)',
                color: 'var(--color-text-primary)',
              }}
            >
              Select Contact for Preview
            </label>
            <Input
              id="contact-search"
              type="text"
              placeholder="Search by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ marginBottom: 'var(--spacing-2)' }}
            />
            <Select
              value={selectedContactId}
              onValueChange={setSelectedContactId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a contact to preview personalization" />
              </SelectTrigger>
              <SelectContent>
                {filteredContacts.length === 0 && (
                  <div
                    style={{
                      padding: 'var(--spacing-4)',
                      textAlign: 'center',
                      color: 'var(--color-text-secondary)',
                      fontSize: 'var(--typography-font-size-sm)',
                    }}
                  >
                    No contacts found
                  </div>
                )}
                {filteredContacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name} ({contact.email}) - {contact.company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview Mode Toggle */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-2)',
            }}
          >
            <label
              style={{
                fontSize: 'var(--typography-font-size-sm)',
                fontWeight: 'var(--typography-font-weight-medium)',
                color: 'var(--color-text-primary)',
              }}
            >
              Preview Mode
            </label>
            <div
              style={{
                display: 'flex',
                gap: 'var(--spacing-2)',
              }}
            >
              <Button
                variant={previewMode === 'split' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewMode('split')}
              >
                Side-by-Side
              </Button>
              <Button
                variant={previewMode === 'generic' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewMode('generic')}
              >
                Generic Only
              </Button>
              <Button
                variant={previewMode === 'personalized' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPreviewMode('personalized')}
                disabled={!selectedContactId}
              >
                Personalized Only
              </Button>
            </div>
          </div>

          {/* Missing Data Warnings */}
          {selectedContact && missingTokens.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-2)',
                padding: 'var(--spacing-4)',
                borderRadius: 'var(--border-radius-lg)',
                backgroundColor: 'var(--color-warning-subtle)',
                borderWidth: 'var(--border-width-thin)',
                borderStyle: 'solid',
                borderColor: 'var(--color-warning)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-2)',
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  style={{ flexShrink: 0 }}
                >
                  <path
                    d="M8 1L1 14h14L8 1z"
                    stroke="var(--color-warning-emphasis)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <path
                    d="M8 6v3M8 11h.01"
                    stroke="var(--color-warning-emphasis)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <span
                  style={{
                    fontSize: 'var(--typography-font-size-sm)',
                    fontWeight: 'var(--typography-font-weight-semibold)',
                    color: 'var(--color-warning-emphasis)',
                  }}
                >
                  Missing Contact Data ({missingTokens.length} token{missingTokens.length !== 1 ? 's' : ''})
                </span>
              </div>
              <div
                style={{
                  fontSize: 'var(--typography-font-size-sm)',
                  color: 'var(--color-text-primary)',
                }}
              >
                The following personalization tokens cannot be substituted because the selected contact is missing this data:
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 'var(--spacing-2)',
                }}
              >
                {missingTokens.map((token) => {
                  const metadata = getTokenMetadata(token);
                  return (
                    <Badge key={token} variant="destructive">
                      {metadata.label}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* Personalization Tokens Info */}
          {tokens.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-2)',
              }}
            >
              <label
                style={{
                  fontSize: 'var(--typography-font-size-sm)',
                  fontWeight: 'var(--typography-font-weight-medium)',
                  color: 'var(--color-text-primary)',
                }}
              >
                Personalization Tokens Found ({tokens.length})
              </label>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 'var(--spacing-2)',
                }}
              >
                {tokens.map((token) => {
                  const metadata = getTokenMetadata(token);
                  const category = metadata.category;
                  const colors = TOKEN_CATEGORY_COLORS[category];
                  const isMissing = missingTokens.includes(token);

                  return (
                    <TooltipProvider key={token}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="outline"
                            style={{
                              backgroundColor: colors.bg,
                              color: colors.text,
                              borderColor: colors.border,
                              opacity: isMissing ? 0.6 : 1,
                              cursor: 'help',
                            }}
                          >
                            {'{{'}
                            {token}
                            {'}}'}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 'var(--spacing-1)',
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 'var(--typography-font-weight-semibold)',
                              }}
                            >
                              {metadata.label}
                            </div>
                            <div
                              style={{
                                fontSize: 'var(--typography-font-size-xs)',
                                color: 'var(--color-text-secondary)',
                              }}
                            >
                              {metadata.description}
                            </div>
                            {selectedContact && (
                              <div
                                style={{
                                  marginTop: 'var(--spacing-1)',
                                  paddingTop: 'var(--spacing-1)',
                                  borderTop: 'var(--border-width-thin) solid var(--color-border-subtle)',
                                  fontSize: 'var(--typography-font-size-xs)',
                                }}
                              >
                                <strong>Value:</strong> {getContactValue(selectedContact, token)}
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 'var(--spacing-3)',
                  fontSize: 'var(--typography-font-size-xs)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)' }}>
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: 'var(--border-radius-sm)',
                      backgroundColor: TOKEN_CATEGORY_COLORS.contact.bg,
                      borderWidth: 'var(--border-width-thin)',
                      borderStyle: 'solid',
                      borderColor: TOKEN_CATEGORY_COLORS.contact.border,
                    }}
                  />
                  <span>Contact Info</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)' }}>
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: 'var(--border-radius-sm)',
                      backgroundColor: TOKEN_CATEGORY_COLORS.behavioral.bg,
                      borderWidth: 'var(--border-width-thin)',
                      borderStyle: 'solid',
                      borderColor: TOKEN_CATEGORY_COLORS.behavioral.border,
                    }}
                  />
                  <span>Behavioral</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)' }}>
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: 'var(--border-radius-sm)',
                      backgroundColor: TOKEN_CATEGORY_COLORS.custom.bg,
                      borderWidth: 'var(--border-width-thin)',
                      borderStyle: 'solid',
                      borderColor: TOKEN_CATEGORY_COLORS.custom.border,
                    }}
                  />
                  <span>Custom</span>
                </div>
              </div>
            </div>
          )}

          {/* Contact Details */}
          {selectedContact && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-2)',
                padding: 'var(--spacing-4)',
                borderRadius: 'var(--border-radius-lg)',
                backgroundColor: 'var(--color-bg-surface)',
                borderWidth: 'var(--border-width-thin)',
                borderStyle: 'solid',
                borderColor: 'var(--color-border-default)',
              }}
            >
              <div
                style={{
                  fontSize: 'var(--typography-font-size-sm)',
                  fontWeight: 'var(--typography-font-weight-semibold)',
                  color: 'var(--color-text-primary)',
                }}
              >
                Selected Contact Details
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 'var(--spacing-3)',
                  fontSize: 'var(--typography-font-size-sm)',
                }}
              >
                <ContactDetailRow label="Name" value={`${selectedContact.first_name} ${selectedContact.last_name}`} />
                <ContactDetailRow label="Email" value={selectedContact.email} />
                <ContactDetailRow label="Company" value={selectedContact.company} />
                <ContactDetailRow label="Job Title" value={selectedContact.job_title} />
                <ContactDetailRow label="Role" value={selectedContact.role_category} />
                <ContactDetailRow label="Industry" value={selectedContact.industry} />
                <ContactDetailRow label="Region" value={selectedContact.region} />
                <ContactDetailRow label="Framework" value={selectedContact.primary_framework} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Section */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            previewMode === 'split' ? 'repeat(2, 1fr)' : '1fr',
          gap: 'var(--spacing-6)',
        }}
      >
        {/* Generic Preview */}
        {(previewMode === 'split' || previewMode === 'generic') && (
          <PreviewPanel
            title="Generic Preview (with tokens)"
            htmlContent={genericPreview?.html_content ?? ''}
            subjectLine={genericPreview?.subject_line}
            previewText={genericPreview?.preview_text}
            isLoading={isLoadingGeneric}
            highlightTokens={true}
          />
        )}

        {/* Personalized Preview */}
        {(previewMode === 'split' || previewMode === 'personalized') && (
          <PreviewPanel
            title="Personalized Preview"
            htmlContent={personalizedPreview?.html_content ?? ''}
            subjectLine={personalizedPreview?.subject_line}
            previewText={personalizedPreview?.preview_text}
            isLoading={isLoadingPersonalized}
            highlightTokens={false}
            isEmpty={!selectedContactId}
            emptyMessage="Select a contact to see personalized preview"
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

interface ContactDetailRowProps {
  readonly label: string;
  readonly value: string;
}

function ContactDetailRow({ label, value }: ContactDetailRowProps): React.ReactElement {
  return (
    <div>
      <div
        style={{
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--typography-font-size-xs)',
          marginBottom: 'var(--spacing-1)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: 'var(--color-text-primary)',
          fontWeight: 'var(--typography-font-weight-medium)',
        }}
      >
        {value}
      </div>
    </div>
  );
}

interface PreviewPanelProps {
  readonly title: string;
  readonly htmlContent: string;
  readonly subjectLine?: string;
  readonly previewText?: string;
  readonly isLoading: boolean;
  readonly highlightTokens: boolean;
  readonly isEmpty?: boolean;
  readonly emptyMessage?: string;
}

/**
 * Highlights personalization tokens in HTML content with category-based colors
 * Note: Sanitization happens in PreviewPanel after highlight is applied
 */
function applyTokenHighlight(html: string): string {
  if (!html) {
    return '';
  }

  return html.replace(PERSONALIZATION_TOKEN_REGEX, (match, token: string) => {
    const category = getTokenCategory(token);
    const colors = TOKEN_CATEGORY_COLORS[category];

    return `<span style="background-color: ${colors.bg}; color: ${colors.text}; padding: 0 var(--spacing-1); border-radius: var(--border-radius-sm); font-weight: var(--typography-font-weight-semibold); border: var(--border-width-thin) solid ${colors.border};" title="${token}">${match}</span>`;
  });
}

function PreviewPanel({
  title,
  htmlContent,
  subjectLine,
  previewText,
  isLoading,
  highlightTokens,
  isEmpty = false,
  emptyMessage,
}: PreviewPanelProps): React.ReactElement {
  const processedContent = highlightTokens ? applyTokenHighlight(htmlContent) : htmlContent;

  if (isEmpty && emptyMessage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
          }}
        >
          <div
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--typography-font-size-sm)',
              textAlign: 'center',
            }}
          >
            {emptyMessage}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
          }}
        >
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>

      {/* Subject and Preview Text */}
      {(subjectLine || previewText) && (
        <div
          style={{
            padding: 'var(--spacing-4)',
            paddingTop: '0',
            borderBottom: 'var(--border-width-thin) solid var(--color-border-default)',
          }}
        >
          {subjectLine && (
            <div style={{ marginBottom: 'var(--spacing-2)' }}>
              <span
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--typography-font-size-xs)',
                  fontWeight: 'var(--typography-font-weight-medium)',
                  textTransform: 'uppercase',
                  letterSpacing: 'var(--typography-letter-spacing-wide)',
                }}
              >
                Subject:
              </span>
              <span
                style={{
                  marginLeft: 'var(--spacing-2)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--typography-font-size-sm)',
                  fontWeight: 'var(--typography-font-weight-medium)',
                }}
              >
                {subjectLine}
              </span>
            </div>
          )}
          {previewText && (
            <div>
              <span
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--typography-font-size-xs)',
                  fontWeight: 'var(--typography-font-weight-medium)',
                  textTransform: 'uppercase',
                  letterSpacing: 'var(--typography-letter-spacing-wide)',
                }}
              >
                Preview:
              </span>
              <span
                style={{
                  marginLeft: 'var(--spacing-2)',
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--typography-font-size-sm)',
                }}
              >
                {previewText}
              </span>
            </div>
          )}
        </div>
      )}

      {/* HTML Preview */}
      <CardContent>
        <div
          style={{
            backgroundColor: 'var(--color-bg-surface)',
            padding: 'var(--spacing-4)',
            borderRadius: 'var(--border-radius-lg)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: 'var(--border-radius-md)',
              boxShadow: 'var(--shadow-elevated)',
              overflow: 'auto',
              maxHeight: '600px',
            }}
          >
            {/* HTML content sanitized with DOMPurify to prevent XSS */}
            <div
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(processedContent) }}
              style={{
                padding: 'var(--spacing-4)',
                fontFamily: 'var(--typography-font-family-sans)',
                fontSize: 'var(--typography-font-size-sm)',
                lineHeight: 'var(--typography-line-height-relaxed)',
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
