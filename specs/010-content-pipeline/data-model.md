# Data Model: Content Pipeline

**Feature**: `010-content-pipeline`
**Generated**: 2026-01-10

---

## API Contracts

### 1. Bulk Add Blocks to Newsletter

**Endpoint**: `POST /v1/newsletters/{issueId}/blocks/bulk`

**Description**: Add multiple content items as newsletter blocks in a single atomic operation.

#### Request

```typescript
interface BulkAddBlocksRequest {
  content_item_ids: string[];  // UUID array, 1-20 items
  block_type: 'hero' | 'news' | 'content' | 'events' | 'spotlight';
}
```

**Validation Rules**:
- `content_item_ids`: required, min 1, max 20, valid UUIDs
- `block_type`: required, must be one of the enum values

**Example Request**:
```json
{
  "content_item_ids": [
    "550e8400-e29b-41d4-a716-446655440001",
    "550e8400-e29b-41d4-a716-446655440002"
  ],
  "block_type": "news"
}
```

#### Response

**Success (201 Created)**:
```typescript
interface BulkAddBlocksResponse {
  blocks: NewsletterBlock[];
  created_count: number;
  skipped_count: number;
  skipped_ids?: string[];  // Content IDs that were duplicates
}

interface NewsletterBlock {
  id: string;
  issue_id: string;
  content_item_id: string;
  block_type: string;
  position: number;
  title: string;
  teaser?: string;
  cta_url: string;
  cta_label: string;
  created_at: string;
  updated_at: string;
}
```

**Example Response**:
```json
{
  "data": {
    "blocks": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "issue_id": "770e8400-e29b-41d4-a716-446655440001",
        "content_item_id": "550e8400-e29b-41d4-a716-446655440001",
        "block_type": "news",
        "position": 3,
        "title": "Critical Vulnerability in Popular CMS",
        "teaser": "A new zero-day vulnerability has been discovered...",
        "cta_url": "https://example.com/article",
        "cta_label": "Read More",
        "created_at": "2026-01-10T14:30:00Z",
        "updated_at": "2026-01-10T14:30:00Z"
      }
    ],
    "created_count": 1,
    "skipped_count": 1,
    "skipped_ids": ["550e8400-e29b-41d4-a716-446655440002"]
  }
}
```

**Error Responses**:

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_REQUEST` | Invalid JSON or validation error |
| 400 | `ISSUE_NOT_DRAFT` | Issue is not in draft status |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | User lacks permission |
| 404 | `ISSUE_NOT_FOUND` | Newsletter issue not found |
| 409 | `ALL_DUPLICATES` | All content items already in issue |

---

### 2. Fetch URL Metadata

**Endpoint**: `POST /v1/content/fetch-metadata`

**Description**: Fetch and extract metadata from a URL for content import.

#### Request

```typescript
interface URLMetadataRequest {
  url: string;  // Required, valid URL, max 2048 chars
}
```

**Example Request**:
```json
{
  "url": "https://www.bleepingcomputer.com/news/security/example-article"
}
```

#### Response

**Success (200 OK)**:
```typescript
interface URLMetadataResponse {
  url: string;              // Normalized URL
  title: string;            // Page title (required)
  description?: string;     // Meta description or OG description
  image_url?: string;       // OG image URL
  publish_date?: string;    // ISO 8601 date string
  author?: string;          // Author name
  read_time_minutes?: number; // Estimated read time
  site_name?: string;       // Site name from OG or domain
}
```

**Example Response**:
```json
{
  "data": {
    "url": "https://www.bleepingcomputer.com/news/security/example-article",
    "title": "Critical Zero-Day Vulnerability Discovered in Popular CMS",
    "description": "Security researchers have discovered a critical zero-day vulnerability affecting millions of websites running the popular CMS platform.",
    "image_url": "https://www.bleepingcomputer.com/images/article-og-image.jpg",
    "publish_date": "2026-01-09",
    "author": "Lawrence Abrams",
    "read_time_minutes": 5,
    "site_name": "BleepingComputer"
  }
}
```

**Error Responses**:

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_URL` | URL format invalid or blocked (SSRF protection) |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 408 | `REQUEST_TIMEOUT` | URL fetch timed out (10s) |
| 422 | `EXTRACTION_FAILED` | Could not extract metadata (no title found) |

---

### 3. Create Manual Content Item

**Endpoint**: `POST /v1/content/items`

**Description**: Create a content item from manual entry or imported metadata.

#### Request

```typescript
interface CreateManualContentRequest {
  url: string;              // Required, valid URL
  title: string;            // Required, max 500 chars
  summary?: string;         // Optional, max 2000 chars
  content_type: string;     // Required, enum value
  topic_tags?: string[];    // Optional, max 10 items
  framework_tags?: string[]; // Optional, max 10 items
  publish_date?: string;    // Optional, ISO 8601 date
  author?: string;          // Optional, max 200 chars
  image_url?: string;       // Optional, valid URL
}
```

**Content Type Values**:
- `blog`
- `news`
- `case_study`
- `webinar`
- `product_update`
- `event`

**Example Request**:
```json
{
  "url": "https://example.com/article",
  "title": "Important Security Update",
  "summary": "A summary of the security update...",
  "content_type": "news",
  "topic_tags": ["ransomware", "threat-intel"],
  "framework_tags": ["NIST", "MITRE"],
  "publish_date": "2026-01-10",
  "author": "John Doe",
  "image_url": "https://example.com/image.jpg"
}
```

#### Response

**Success (201 Created)**:
```typescript
interface ContentItemResponse {
  id: string;
  source_id?: string;       // null for manual items
  article_id?: string;
  url: string;
  title: string;
  summary?: string;
  content?: string;
  content_type: string;
  topic_tags: string[];
  framework_tags: string[];
  industry_tags: string[];
  buyer_stage?: string;
  partner_tags: string[];
  author?: string;
  publish_date: string;
  word_count?: number;
  reading_time_minutes?: number;
  image_url?: string;
  trust_score: number;      // 0.75 for manual
  relevance_score: number;
  historical_ctr: number;
  historical_opens: number;
  historical_clicks: number;
  expires_at?: string;
  is_active: boolean;
  indexed_at?: string;
  source_type: string;      // 'manual' for this endpoint
  created_at: string;
  updated_at: string;
}
```

**Example Response**:
```json
{
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440001",
    "url": "https://example.com/article",
    "title": "Important Security Update",
    "summary": "A summary of the security update...",
    "content_type": "news",
    "topic_tags": ["ransomware", "threat-intel"],
    "framework_tags": ["NIST", "MITRE"],
    "industry_tags": [],
    "partner_tags": [],
    "author": "John Doe",
    "publish_date": "2026-01-10T00:00:00Z",
    "image_url": "https://example.com/image.jpg",
    "trust_score": 0.75,
    "relevance_score": 0.5,
    "historical_ctr": 0.0,
    "historical_opens": 0,
    "historical_clicks": 0,
    "is_active": true,
    "source_type": "manual",
    "created_at": "2026-01-10T15:00:00Z",
    "updated_at": "2026-01-10T15:00:00Z"
  }
}
```

**Error Responses**:

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_REQUEST` | Invalid JSON or validation error |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 409 | `DUPLICATE_URL` | Content item with this URL already exists |

---

## Database Queries

### Bulk Block Creation

```sql
-- Get max position for issue
SELECT COALESCE(MAX(position), 0) AS max_position
FROM newsletter_blocks
WHERE issue_id = $1;

-- Check for existing content items in issue
SELECT content_item_id
FROM newsletter_blocks
WHERE issue_id = $1
  AND content_item_id = ANY($2::uuid[]);

-- Insert new blocks (batch)
INSERT INTO newsletter_blocks (
  id, issue_id, content_item_id, block_type, position,
  title, teaser, cta_url, cta_label, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  $1,  -- issue_id
  ci.id,
  $2,  -- block_type
  $3 + row_number() OVER (ORDER BY array_position($4::uuid[], ci.id)),
  ci.title,
  ci.summary,
  ci.url,
  'Read More',
  NOW(),
  NOW()
FROM content_items ci
WHERE ci.id = ANY($4::uuid[])
  AND ci.id NOT IN (
    SELECT content_item_id FROM newsletter_blocks WHERE issue_id = $1
  )
RETURNING *;
```

### Content Item Creation

```sql
-- Check for duplicate URL
SELECT id FROM content_items WHERE url = $1;

-- Insert content item
INSERT INTO content_items (
  id, url, title, summary, content_type, topic_tags, framework_tags,
  author, publish_date, image_url, trust_score, relevance_score,
  source_type, is_active, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  $1,   -- url
  $2,   -- title
  $3,   -- summary
  $4,   -- content_type
  $5,   -- topic_tags (array)
  $6,   -- framework_tags (array)
  $7,   -- author
  $8,   -- publish_date
  $9,   -- image_url
  0.75, -- trust_score (default for manual)
  0.5,  -- relevance_score (default)
  'manual',
  true,
  NOW(),
  NOW()
) RETURNING *;
```

### Get Draft Issues

```sql
SELECT
  i.id,
  i.segment_id,
  s.name AS segment_name,
  i.issue_date,
  i.subject_line,
  i.status,
  i.created_at
FROM newsletter_issues i
JOIN segments s ON s.id = i.segment_id
WHERE i.status = 'draft'
ORDER BY i.issue_date DESC
LIMIT 50;
```

---

## Indexes

### Recommended Indexes

```sql
-- For bulk block creation duplicate check
CREATE INDEX IF NOT EXISTS idx_newsletter_blocks_issue_content
ON newsletter_blocks (issue_id, content_item_id);

-- For duplicate URL check
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_items_url
ON content_items (url);

-- For draft issues query
CREATE INDEX IF NOT EXISTS idx_newsletter_issues_status_date
ON newsletter_issues (status, issue_date DESC);

-- For source_type filtering
CREATE INDEX IF NOT EXISTS idx_content_items_source_type
ON content_items (source_type);
```

---

## TypeScript Types

### Frontend Types

```typescript
// Block types enum
export type BlockType = 'hero' | 'news' | 'content' | 'events' | 'spotlight';

// Content types enum
export type ContentType =
  | 'blog'
  | 'news'
  | 'case_study'
  | 'webinar'
  | 'product_update'
  | 'event';

// Request/Response types
export interface BulkAddBlocksRequest {
  contentItemIds: string[];
  blockType: BlockType;
}

export interface BulkAddBlocksResponse {
  blocks: NewsletterBlock[];
  createdCount: number;
  skippedCount: number;
  skippedIds?: string[];
}

export interface URLMetadataRequest {
  url: string;
}

export interface URLMetadataResponse {
  url: string;
  title: string;
  description?: string;
  imageUrl?: string;
  publishDate?: string;
  author?: string;
  readTimeMinutes?: number;
  siteName?: string;
}

export interface CreateContentItemRequest {
  url: string;
  title: string;
  summary?: string;
  contentType: ContentType;
  topicTags?: string[];
  frameworkTags?: string[];
  publishDate?: string;
  author?: string;
  imageUrl?: string;
}

export interface ContentItem {
  id: string;
  url: string;
  title: string;
  summary?: string;
  contentType: ContentType;
  topicTags: string[];
  frameworkTags: string[];
  industryTags: string[];
  partnerTags: string[];
  author?: string;
  publishDate: string;
  imageUrl?: string;
  trustScore: number;
  relevanceScore: number;
  sourceType: 'rss' | 'api' | 'manual';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NewsletterBlock {
  id: string;
  issueId: string;
  contentItemId?: string;
  blockType: BlockType;
  position: number;
  title: string;
  teaser?: string;
  ctaUrl: string;
  ctaLabel: string;
  createdAt: string;
  updatedAt: string;
}

export interface DraftIssue {
  id: string;
  segmentId: string;
  segmentName: string;
  issueDate: string;
  subjectLine: string;
  status: 'draft';
  createdAt: string;
}
```

---

## Go Structs

### Backend DTOs

```go
// BulkAddBlocksRequest represents a request to add multiple blocks
type BulkAddBlocksRequest struct {
    ContentItemIDs []uuid.UUID `json:"content_item_ids" validate:"required,min=1,max=20,dive,uuid"`
    BlockType      string      `json:"block_type" validate:"required,oneof=hero news content events spotlight"`
}

// BulkAddBlocksResponse represents the response from bulk block creation
type BulkAddBlocksResponse struct {
    Blocks       []NewsletterBlockDTO `json:"blocks"`
    CreatedCount int                  `json:"created_count"`
    SkippedCount int                  `json:"skipped_count"`
    SkippedIDs   []uuid.UUID          `json:"skipped_ids,omitempty"`
}

// URLMetadataRequest represents a request to fetch URL metadata
type URLMetadataRequest struct {
    URL string `json:"url" validate:"required,url,max=2048"`
}

// URLMetadataResponse represents extracted metadata from a URL
type URLMetadataResponse struct {
    URL             string  `json:"url"`
    Title           string  `json:"title"`
    Description     *string `json:"description,omitempty"`
    ImageURL        *string `json:"image_url,omitempty"`
    PublishDate     *string `json:"publish_date,omitempty"`
    Author          *string `json:"author,omitempty"`
    ReadTimeMinutes *int    `json:"read_time_minutes,omitempty"`
    SiteName        *string `json:"site_name,omitempty"`
}

// CreateManualContentRequest represents a request to create content manually
type CreateManualContentRequest struct {
    URL           string   `json:"url" validate:"required,url,max=2048"`
    Title         string   `json:"title" validate:"required,min=1,max=500"`
    Summary       *string  `json:"summary,omitempty" validate:"omitempty,max=2000"`
    ContentType   string   `json:"content_type" validate:"required,oneof=blog news case_study webinar product_update event"`
    TopicTags     []string `json:"topic_tags,omitempty" validate:"omitempty,max=10,dive,max=50"`
    FrameworkTags []string `json:"framework_tags,omitempty" validate:"omitempty,max=10,dive,max=50"`
    PublishDate   *string  `json:"publish_date,omitempty" validate:"omitempty,datetime=2006-01-02"`
    Author        *string  `json:"author,omitempty" validate:"omitempty,max=200"`
    ImageURL      *string  `json:"image_url,omitempty" validate:"omitempty,url,max=2048"`
}
```
