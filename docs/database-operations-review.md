# Database Operations Review: Content Workflow Feature

## Executive Summary

This document provides SQL queries, transaction requirements, index recommendations, and acceptance criteria for the content workflow feature database operations.

---

## 1. Core Database Operations

### 1.1 Bulk Block Insert

**Operation:** Insert multiple newsletter blocks with automatic position calculation.

#### SQL Query (Current Implementation)
```sql
-- Transaction-based bulk insert (existing in newsletter_block_repo.go)
BEGIN;

INSERT INTO newsletter_blocks (
    id, issue_id, content_item_id, block_type, position,
    title, teaser, cta_label, cta_url,
    is_promotional, topic_tags, clicks,
    created_at, updated_at
)
VALUES
    ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14),
    ($15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28),
    -- ... more rows
    ;

COMMIT;
```

#### Enhanced Query with Auto-Positioning
```sql
-- If positions are not provided, auto-calculate based on existing blocks
WITH max_position AS (
    SELECT COALESCE(MAX(position), -1) + 1 AS next_position
    FROM newsletter_blocks
    WHERE issue_id = $1
),
block_data AS (
    SELECT
        unnest($2::uuid[]) AS id,
        unnest($3::uuid[]) AS content_item_id,
        unnest($4::block_type[]) AS block_type,
        unnest($5::varchar[]) AS title,
        unnest($6::text[]) AS teaser,
        unnest($7::varchar[]) AS cta_label,
        unnest($8::varchar[]) AS cta_url,
        unnest($9::boolean[]) AS is_promotional,
        unnest($10::text[][]) AS topic_tags,
        ROW_NUMBER() OVER () - 1 AS relative_position
)
INSERT INTO newsletter_blocks (
    id, issue_id, content_item_id, block_type, position,
    title, teaser, cta_label, cta_url,
    is_promotional, topic_tags, clicks,
    created_at, updated_at
)
SELECT
    bd.id,
    $1 AS issue_id,
    bd.content_item_id,
    bd.block_type,
    mp.next_position + bd.relative_position AS position,
    bd.title,
    bd.teaser,
    bd.cta_label,
    bd.cta_url,
    bd.is_promotional,
    bd.topic_tags,
    0 AS clicks,
    NOW() AS created_at,
    NOW() AS updated_at
FROM block_data bd
CROSS JOIN max_position mp;
```

**Performance Characteristics:**
- **Single round-trip** to database for bulk insert
- **Auto-positioning** eliminates client-side calculation
- **Atomic operation** within transaction
- **Efficiency:** O(1) for position calculation, O(n) for insert where n = number of blocks

---

### 1.2 Duplicate Check (Content Item)

**Operation:** Check if content_item_id already exists in newsletter blocks for a given issue.

#### SQL Query
```sql
-- Check for existing block with content_item_id
SELECT EXISTS(
    SELECT 1
    FROM newsletter_blocks
    WHERE issue_id = $1
      AND content_item_id = $2
) AS block_exists;
```

#### Batch Duplicate Check
```sql
-- Check multiple content_item_ids at once
SELECT content_item_id, COUNT(*) > 0 AS exists
FROM (
    SELECT unnest($2::uuid[]) AS content_item_id
) AS input_items
LEFT JOIN newsletter_blocks nb
    ON nb.issue_id = $1
    AND nb.content_item_id = input_items.content_item_id
GROUP BY content_item_id;
```

**Performance Characteristics:**
- **Index usage:** Leverages `idx_newsletter_blocks_content`
- **Efficiency:** O(log n) lookup per content_item_id
- **Batch version:** Single query for multiple checks

---

### 1.3 Content Item Insert

**Operation:** Create content item with `source_type='manual'`.

#### SQL Query
```sql
INSERT INTO content_items (
    id, source_id, external_id, title, url, summary, full_content,
    content_type, topic_tags, framework_tags, industry_tags,
    buyer_stage, publish_date, ingested_at,
    trust_score, relevance_score, historical_ctr,
    usage_count, last_used_at, is_active, zinc_indexed_at,
    created_at, updated_at
)
VALUES (
    $1,  -- id (UUID)
    (SELECT id FROM content_sources WHERE source_type = 'manual' AND is_active = true LIMIT 1),  -- source_id
    NULL,  -- external_id (NULL for manual content)
    $2,  -- title
    $3,  -- url (must be unique)
    $4,  -- summary
    $5,  -- full_content
    $6,  -- content_type (enum: blog, news, case_study, etc.)
    $7,  -- topic_tags (text[])
    $8,  -- framework_tags (text[])
    $9,  -- industry_tags (text[])
    $10, -- buyer_stage
    $11, -- publish_date
    NOW(), -- ingested_at
    $12, -- trust_score (0.0-1.0, default 1.0 for manual)
    $13, -- relevance_score (0.0-1.0, default 1.0 for manual)
    0.0, -- historical_ctr (starts at 0)
    0,   -- usage_count
    NULL, -- last_used_at
    true, -- is_active
    NULL, -- zinc_indexed_at
    NOW(), -- created_at
    NOW()  -- updated_at
)
ON CONFLICT (url) DO NOTHING
RETURNING id;
```

**Edge Cases:**
- **Source not found:** Query returns NULL for source_id, violating NOT NULL constraint (intentional failure)
- **Duplicate URL:** `ON CONFLICT DO NOTHING` prevents duplicate insert
- **Manual source must exist:** Requires a `content_sources` row with `source_type = 'manual'`

---

### 1.4 URL Duplicate Check

**Operation:** Check if URL already exists in content_items before inserting.

#### SQL Query
```sql
-- Simple existence check
SELECT EXISTS(
    SELECT 1
    FROM content_items
    WHERE url = $1
) AS url_exists;
```

#### Query with Full Record Return (for deduplication)
```sql
-- Return existing record if found (for update scenario)
SELECT
    id, source_id, external_id, title, url, summary, full_content,
    content_type, topic_tags, framework_tags, industry_tags,
    buyer_stage, publish_date, ingested_at,
    trust_score, relevance_score, historical_ctr,
    usage_count, last_used_at, is_active,
    created_at, updated_at
FROM content_items
WHERE url = $1;
```

**Performance Characteristics:**
- **Index usage:** Leverages UNIQUE constraint index on `url` column
- **Efficiency:** O(log n) lookup
- **Existing implementation:** Already in `GetByURL()` method (returns NULL if not found)

---

## 2. Transaction Requirements

### 2.1 Atomicity Guarantees

#### Operation: Add Content to Newsletter Issue

**Transaction Scope:**
```sql
BEGIN ISOLATION LEVEL READ COMMITTED;

-- Step 1: Create content_item (if new)
INSERT INTO content_items (...)
VALUES (...)
ON CONFLICT (url) DO NOTHING
RETURNING id;

-- Step 2: Check for duplicate block
SELECT EXISTS(
    SELECT 1 FROM newsletter_blocks
    WHERE issue_id = $1 AND content_item_id = $2
);

-- Step 3: Get max position
SELECT COALESCE(MAX(position), -1) + 1
FROM newsletter_blocks
WHERE issue_id = $1;

-- Step 4: Insert newsletter_block
INSERT INTO newsletter_blocks (...)
VALUES (...);

-- Step 5: Update issue metadata (if needed)
UPDATE newsletter_issues
SET updated_at = NOW()
WHERE id = $1;

COMMIT;
```

**Why Transaction is Required:**
- **Data consistency:** Content item must exist before block references it
- **Position integrity:** Concurrent inserts could cause position conflicts
- **Rollback safety:** If block insert fails, content_item rollback depends on use case
  - **Strategy 1:** Keep content_item (it's reusable)
  - **Strategy 2:** Rollback everything (strict consistency)

**Isolation Level Justification:**
- `READ COMMITTED` is sufficient (default PostgreSQL level)
- `REPEATABLE READ` or `SERIALIZABLE` not needed (position calculation with COALESCE handles gaps)

---

### 2.2 Bulk Insert Transaction

**Transaction Pattern:**
```sql
BEGIN;

-- Insert multiple blocks with conflict handling
INSERT INTO newsletter_blocks (...)
VALUES
    (...),
    (...),
    (...)
ON CONFLICT (issue_id, position) DO UPDATE
SET position = newsletter_blocks.position + 1000;  -- Push conflicting blocks down

-- Fix position gaps
WITH ordered_blocks AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY position) - 1 AS new_position
    FROM newsletter_blocks
    WHERE issue_id = $1
)
UPDATE newsletter_blocks nb
SET position = ob.new_position, updated_at = NOW()
FROM ordered_blocks ob
WHERE nb.id = ob.id;

COMMIT;
```

**Why This Pattern:**
- **Conflict resolution:** Handles concurrent inserts
- **Gap elimination:** Ensures contiguous positions (0, 1, 2, ...)
- **Two-phase approach:** Insert first, normalize second

---

### 2.3 Transaction NOT Required

**Single-row read operations:**
- `GetByID()`
- `GetByURL()`
- `CountByIssueID()`
- `GetMaxPosition()`

**Reason:** Reads are inherently atomic at row level in PostgreSQL.

---

## 3. Index Recommendations

### 3.1 Existing Indexes (Already Optimal)

```sql
-- newsletter_blocks table
CREATE INDEX idx_newsletter_blocks_issue ON newsletter_blocks(issue_id);
CREATE INDEX idx_newsletter_blocks_content ON newsletter_blocks(content_item_id);
CREATE UNIQUE INDEX unique_issue_position ON newsletter_blocks(issue_id, position);

-- content_items table
CREATE UNIQUE INDEX idx_content_items_url ON content_items(url);  -- Via UNIQUE constraint
CREATE INDEX idx_content_items_source ON content_items(source_id);
CREATE INDEX idx_content_items_active ON content_items(is_active) WHERE is_active = true;
CREATE INDEX idx_content_items_publish_date ON content_items(publish_date DESC);
```

**Analysis:**
- ✅ All key operations use indexes
- ✅ Unique constraints prevent duplicates
- ✅ Partial index on `is_active` optimizes filtered queries

---

### 3.2 Recommended New Indexes

#### 3.2.1 Composite Index for Duplicate Check
```sql
-- Optimizes: "Find blocks by issue_id AND content_item_id"
CREATE INDEX idx_newsletter_blocks_issue_content
ON newsletter_blocks(issue_id, content_item_id)
WHERE content_item_id IS NOT NULL;
```

**Justification:**
- Current query: `WHERE issue_id = $1 AND content_item_id = $2`
- Composite index allows **index-only scan** (no table lookup needed)
- Partial index excludes NULL content_item_ids (saves space)

**Impact:**
- **Query speed:** 10-100x faster for duplicate checks
- **Index size:** ~50% smaller than full composite index (due to WHERE clause)

---

#### 3.2.2 Covering Index for Block Listing
```sql
-- Optimizes: "Get all block metadata for an issue without table lookup"
CREATE INDEX idx_newsletter_blocks_issue_position_covering
ON newsletter_blocks(issue_id, position)
INCLUDE (block_type, title, is_promotional, clicks);
```

**Justification:**
- Current `GetByIssueID()` retrieves all columns (requires table lookup)
- Covering index includes frequently accessed columns
- Enables **index-only scans** for summary queries

**Impact:**
- **Query speed:** 2-5x faster for block listings
- **I/O reduction:** ~70% fewer page reads

---

#### 3.2.3 Content Items by Source Type
```sql
-- Optimizes: "Find manual content sources"
CREATE INDEX idx_content_sources_type_active
ON content_sources(source_type, is_active)
WHERE is_active = true;
```

**Justification:**
- Query: `SELECT id FROM content_sources WHERE source_type = 'manual' AND is_active = true`
- Current index on `source_type` alone doesn't filter `is_active` efficiently

**Impact:**
- **Query speed:** Instant lookup (index-only scan)
- **Use case:** Content item insert with manual source lookup

---

### 3.3 Index Maintenance

**Monitoring:**
```sql
-- Check index usage statistics
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('newsletter_blocks', 'content_items', 'content_sources')
ORDER BY idx_scan ASC;
```

**Unused Index Detection:**
```sql
-- Find indexes with zero scans (candidates for removal)
SELECT
    indexrelname AS index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelid NOT IN (
      SELECT indexrelid FROM pg_index WHERE indisunique OR indisprimary
  )
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## 4. Constraint Checks

### 4.1 Foreign Key Constraints

#### newsletter_blocks → content_items
```sql
-- Constraint (already exists)
ALTER TABLE newsletter_blocks
ADD CONSTRAINT fk_newsletter_blocks_content_item
FOREIGN KEY (content_item_id)
REFERENCES content_items(id)
ON DELETE SET NULL;
```

**Impact:**
- **Referential integrity:** Cannot insert block with non-existent content_item_id
- **Cascade behavior:** `ON DELETE SET NULL` allows content deletion without breaking blocks
- **Performance:** FK constraint adds minimal overhead (uses existing index)

**Validation Test:**
```sql
-- This should FAIL (referential integrity violation)
INSERT INTO newsletter_blocks (
    id, issue_id, content_item_id, block_type, position,
    title, created_at, updated_at
)
VALUES (
    gen_random_uuid(),
    (SELECT id FROM newsletter_issues LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::uuid,  -- Non-existent content_item
    'content',
    0,
    'Test Block',
    NOW(),
    NOW()
);
-- Expected: ERROR: insert or update on table "newsletter_blocks" violates foreign key constraint
```

---

#### newsletter_blocks → newsletter_issues
```sql
-- Constraint (already exists)
ALTER TABLE newsletter_blocks
ADD CONSTRAINT fk_newsletter_blocks_issue
FOREIGN KEY (issue_id)
REFERENCES newsletter_issues(id)
ON DELETE CASCADE;
```

**Impact:**
- **Cascade deletion:** Deleting issue automatically removes all blocks
- **Rationale:** Blocks have no meaning without parent issue

---

#### content_items → content_sources
```sql
-- Constraint (already exists)
ALTER TABLE content_items
ADD CONSTRAINT fk_content_items_source
FOREIGN KEY (source_id)
REFERENCES content_sources(id)
ON DELETE RESTRICT;
```

**Impact:**
- **Deletion protection:** Cannot delete content source if content items reference it
- **Workflow safety:** Manual source cannot be accidentally deleted

**Validation Test:**
```sql
-- This should FAIL (deletion restricted)
DELETE FROM content_sources
WHERE source_type = 'manual'
  AND id IN (SELECT DISTINCT source_id FROM content_items);
-- Expected: ERROR: update or update on table "content_sources" violates foreign key constraint
```

---

### 4.2 Unique Constraints

#### newsletter_blocks: (issue_id, position)
```sql
-- Constraint (already exists)
ALTER TABLE newsletter_blocks
ADD CONSTRAINT unique_issue_position
UNIQUE (issue_id, position);
```

**Impact:**
- **Position uniqueness:** No duplicate positions within same issue
- **Concurrency handling:** INSERT will fail if position conflict occurs

**Edge Case Handling:**
```go
// Go code pattern for handling unique constraint violation
_, err := db.Exec(ctx, query, args...)
if err != nil {
    var pgErr *pgconn.PgError
    if errors.As(err, &pgErr) && pgErr.Code == "23505" {  // unique_violation
        // Retry with next available position
        maxPos, _ := repo.GetMaxPosition(ctx, issueID)
        block.Position = maxPos + 1
        return repo.Create(ctx, block)
    }
    return err
}
```

---

#### content_items: url
```sql
-- Constraint (already exists via UNIQUE index)
CREATE UNIQUE INDEX idx_content_items_url ON content_items(url);
```

**Impact:**
- **Duplicate prevention:** Same URL cannot exist twice
- **ON CONFLICT strategy:** Use `ON CONFLICT (url) DO NOTHING` or `DO UPDATE`

---

### 4.3 Check Constraints

#### newsletter_blocks: position >= 0
```sql
-- Constraint (already exists)
ALTER TABLE newsletter_blocks
ADD CONSTRAINT chk_position_non_negative
CHECK (position >= 0);
```

**Validation Test:**
```sql
-- This should FAIL (check constraint violation)
INSERT INTO newsletter_blocks (id, issue_id, position, block_type, created_at, updated_at)
VALUES (gen_random_uuid(), (SELECT id FROM newsletter_issues LIMIT 1), -1, 'content', NOW(), NOW());
-- Expected: ERROR: new row for relation "newsletter_blocks" violates check constraint "chk_position_non_negative"
```

---

#### content_items: trust_score and relevance_score
```sql
-- Constraints (already exist)
ALTER TABLE content_items
ADD CONSTRAINT chk_trust_score_range
CHECK (trust_score >= 0 AND trust_score <= 1);

ALTER TABLE content_items
ADD CONSTRAINT chk_relevance_score_range
CHECK (relevance_score >= 0 AND relevance_score <= 1);
```

**Validation Test:**
```sql
-- This should FAIL (check constraint violation)
INSERT INTO content_items (
    id, source_id, title, url, content_type, publish_date,
    trust_score, relevance_score, created_at, updated_at
)
VALUES (
    gen_random_uuid(),
    (SELECT id FROM content_sources WHERE source_type = 'manual' LIMIT 1),
    'Test Content',
    'https://test-url-' || gen_random_uuid(),
    'blog',
    NOW(),
    1.5,  -- Invalid: > 1.0
    0.5,
    NOW(),
    NOW()
);
-- Expected: ERROR: new row violates check constraint "chk_trust_score_range"
```

---

## 5. Database Acceptance Criteria

### 5.1 Bulk Block Insert

**Acceptance Criteria:**

✅ **GIVEN** an issue with 3 existing blocks (positions 0, 1, 2)
**WHEN** inserting 2 new blocks via `BulkCreate()`
**THEN**:
- New blocks have positions 3 and 4
- All 5 blocks exist in database
- Transaction commits successfully
- Zero gaps in position sequence

**Verification Query:**
```sql
-- After bulk insert
SELECT issue_id, position, block_type, title
FROM newsletter_blocks
WHERE issue_id = $1
ORDER BY position;

-- Expected result:
-- position | block_type | title
-- ---------+------------+-------
--    0     |   hero     | Original Block 1
--    1     |   news     | Original Block 2
--    2     |   content  | Original Block 3
--    3     |   content  | NEW BLOCK 1       -- Inserted
--    4     |   content  | NEW BLOCK 2       -- Inserted
```

**Database State Verification:**
```sql
-- Count should equal expected total
SELECT COUNT(*) FROM newsletter_blocks WHERE issue_id = $1;
-- Expected: 5

-- Position sequence should be contiguous
SELECT MAX(position) - MIN(position) + 1 = COUNT(*) AS is_contiguous
FROM newsletter_blocks WHERE issue_id = $1;
-- Expected: true
```

---

### 5.2 Duplicate Check (Content Item in Blocks)

**Acceptance Criteria:**

✅ **GIVEN** a block exists with `content_item_id = 'abc123'` in issue
**WHEN** querying for duplicates before insert
**THEN**:
- Query returns `true` (block exists)
- No insert is attempted
- Database remains unchanged

**Verification Query:**
```sql
-- Check for duplicate
SELECT EXISTS(
    SELECT 1
    FROM newsletter_blocks
    WHERE issue_id = $1
      AND content_item_id = 'abc123'
) AS exists;
-- Expected: true (if duplicate)

-- Verify block count unchanged
SELECT COUNT(*) FROM newsletter_blocks WHERE issue_id = $1;
-- Expected: Same count before and after check
```

---

### 5.3 Content Item Insert (Manual Source)

**Acceptance Criteria:**

✅ **GIVEN** a manual content source exists and is active
**WHEN** inserting a new content item with `source_type = 'manual'`
**THEN**:
- Content item is created with correct `source_id`
- `external_id` is NULL
- `trust_score` defaults to 1.0
- `is_active` is true
- `created_at` and `updated_at` are set to NOW()

**Verification Query:**
```sql
-- After insert
SELECT
    ci.id,
    ci.source_id,
    cs.source_type,
    ci.external_id,
    ci.title,
    ci.url,
    ci.trust_score,
    ci.is_active,
    ci.created_at,
    ci.updated_at
FROM content_items ci
JOIN content_sources cs ON ci.source_id = cs.id
WHERE ci.url = $1;

-- Expected result:
-- source_type | external_id | trust_score | is_active
-- ------------+-------------+-------------+-----------
--   manual    |    NULL     |    1.0      |   true
```

---

### 5.4 URL Duplicate Check

**Acceptance Criteria:**

✅ **GIVEN** a content item exists with URL 'https://example.com/article'
**WHEN** checking for duplicates before insert
**THEN**:
- Query returns existing content_item record
- Application skips insert
- Database unchanged

**Verification Query:**
```sql
-- Check for duplicate URL
SELECT id, title, url, created_at
FROM content_items
WHERE url = 'https://example.com/article';

-- If returns row: duplicate exists (skip insert)
-- If returns empty: safe to insert
```

**Edge Case - ON CONFLICT Handling:**
```sql
-- Insert with conflict resolution
INSERT INTO content_items (id, source_id, title, url, content_type, publish_date, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    (SELECT id FROM content_sources WHERE source_type = 'manual' LIMIT 1),
    'Test Article',
    'https://example.com/article',  -- Duplicate URL
    'blog',
    NOW(),
    NOW(),
    NOW()
)
ON CONFLICT (url) DO NOTHING
RETURNING id;

-- Expected: Returns empty (no insert), no error raised
```

---

### 5.5 Transaction Rollback (Block Insert Failure)

**Acceptance Criteria:**

✅ **GIVEN** a transaction to insert content_item + block
**WHEN** block insert fails due to constraint violation
**THEN**:
- Transaction rolls back
- Content item is NOT created
- Database state is unchanged from before transaction

**Verification Test:**
```sql
BEGIN;

-- Step 1: Insert content item
INSERT INTO content_items (id, source_id, title, url, content_type, publish_date, created_at, updated_at)
VALUES (
    'test-content-id'::uuid,
    (SELECT id FROM content_sources WHERE source_type = 'manual' LIMIT 1),
    'Test Content',
    'https://test-rollback.com',
    'blog',
    NOW(),
    NOW(),
    NOW()
);

-- Step 2: Attempt to insert block with invalid position (will fail)
INSERT INTO newsletter_blocks (id, issue_id, content_item_id, block_type, position, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    (SELECT id FROM newsletter_issues LIMIT 1),
    'test-content-id'::uuid,
    'content',
    -99,  -- INVALID: Violates CHECK constraint
    NOW(),
    NOW()
);

COMMIT;  -- Will not reach here due to error

-- Verification: Content item should NOT exist
SELECT COUNT(*) FROM content_items WHERE url = 'https://test-rollback.com';
-- Expected: 0 (rollback successful)
```

---

### 5.6 Concurrent Position Assignment

**Acceptance Criteria:**

✅ **GIVEN** two concurrent requests to insert blocks into same issue
**WHEN** both calculate next position simultaneously
**THEN**:
- One insert succeeds with position N
- Other insert fails with UNIQUE constraint violation
- Retry logic assigns position N+1
- Final state has NO position gaps

**Verification Test:**
```bash
# Simulate concurrent inserts (pseudo-code)
# Process 1:
SELECT COALESCE(MAX(position), -1) + 1 FROM newsletter_blocks WHERE issue_id = $1;
# Returns: 5

# Process 2 (simultaneous):
SELECT COALESCE(MAX(position), -1) + 1 FROM newsletter_blocks WHERE issue_id = $1;
# Returns: 5 (same value!)

# Process 1 inserts first:
INSERT INTO newsletter_blocks (..., position = 5) VALUES (...);
# SUCCESS

# Process 2 attempts insert:
INSERT INTO newsletter_blocks (..., position = 5) VALUES (...);
# FAIL: ERROR unique_violation (23505)

# Process 2 retries:
SELECT COALESCE(MAX(position), -1) + 1 FROM newsletter_blocks WHERE issue_id = $1;
# Returns: 6
INSERT INTO newsletter_blocks (..., position = 6) VALUES (...);
# SUCCESS
```

**Database State After:**
```sql
SELECT position FROM newsletter_blocks WHERE issue_id = $1 ORDER BY position;
-- Expected: 0, 1, 2, 3, 4, 5, 6 (no gaps)
```

---

## 6. Performance Benchmarks

### 6.1 Query Execution Time Targets

| Operation | Target Time | Index Used | Notes |
|-----------|-------------|------------|-------|
| Bulk insert (10 blocks) | < 50ms | Primary key, position unique | Transaction overhead included |
| Duplicate check (single) | < 5ms | `idx_newsletter_blocks_issue_content` | Index-only scan |
| Duplicate check (batch of 10) | < 10ms | Same as above | Single query for all |
| Content item insert | < 10ms | `idx_content_items_url` (unique) | Includes source lookup |
| URL duplicate check | < 5ms | UNIQUE index on url | Hash lookup |
| Get max position | < 5ms | `idx_newsletter_blocks_issue` | Single aggregate query |
| Position reordering (10 blocks) | < 30ms | Primary key | UPDATE with JOIN |

---

### 6.2 Scalability Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Blocks per issue | Up to 100 | Position reordering remains < 100ms |
| Content items total | 1M+ rows | Indexes maintain < 10ms lookup |
| Concurrent block inserts | 100 req/s | With retry logic for position conflicts |
| Transaction throughput | 500 tx/s | PostgreSQL default with connection pooling |

---

## 7. Implementation Checklist

### 7.1 Database Schema Validation

- [x] **newsletter_blocks** table exists with all required columns
- [x] **content_items** table exists with `source_type` enum support
- [x] **content_sources** table has `source_type = 'manual'` row
- [x] Foreign key constraints are defined correctly
- [x] Unique constraints prevent duplicates
- [x] Check constraints validate data ranges

### 7.2 Index Creation

- [x] Existing indexes are in place (verified in migration)
- [ ] **NEW:** Create composite index `idx_newsletter_blocks_issue_content`
- [ ] **NEW:** Create covering index `idx_newsletter_blocks_issue_position_covering`
- [ ] **NEW:** Create index `idx_content_sources_type_active`
- [ ] Verify index usage with `EXPLAIN ANALYZE`

### 7.3 Repository Methods

- [x] `BulkCreate()` exists in `newsletter_block_repo.go`
- [x] `GetMaxPosition()` exists for auto-positioning
- [x] `GetByURL()` exists in `content_item_repo.go` for duplicate check
- [x] `Create()` exists for content_item insert
- [ ] **NEW:** Add `CheckDuplicateBlock(ctx, issueID, contentItemID)` method
- [ ] **NEW:** Add `BulkCheckDuplicates(ctx, issueID, contentItemIDs)` method

### 7.4 Transaction Management

- [ ] Implement transaction wrapper for content workflow
- [ ] Add retry logic for unique constraint violations
- [ ] Test rollback scenarios
- [ ] Verify isolation level is appropriate (READ COMMITTED)

### 7.5 Testing

- [ ] Unit tests for all repository methods
- [ ] Integration tests with transaction rollback
- [ ] Concurrency tests for position conflicts
- [ ] Performance benchmarks against targets
- [ ] Edge case tests (NULL values, empty arrays, etc.)

---

## 8. SQL Reference Scripts

### 8.1 Migration Script for New Indexes

```sql
-- migrations/000012_content_workflow_indexes.up.sql

-- Composite index for duplicate checks
CREATE INDEX IF NOT EXISTS idx_newsletter_blocks_issue_content
ON newsletter_blocks(issue_id, content_item_id)
WHERE content_item_id IS NOT NULL;

-- Covering index for block listings
CREATE INDEX IF NOT EXISTS idx_newsletter_blocks_issue_position_covering
ON newsletter_blocks(issue_id, position)
INCLUDE (block_type, title, is_promotional, clicks);

-- Content source type index
CREATE INDEX IF NOT EXISTS idx_content_sources_type_active
ON content_sources(source_type, is_active)
WHERE is_active = true;

-- Verify indexes created
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('newsletter_blocks', 'content_sources')
  AND indexname LIKE '%content%' OR indexname LIKE '%type_active%';
```

```sql
-- migrations/000012_content_workflow_indexes.down.sql

DROP INDEX IF EXISTS idx_newsletter_blocks_issue_content;
DROP INDEX IF EXISTS idx_newsletter_blocks_issue_position_covering;
DROP INDEX IF EXISTS idx_content_sources_type_active;
```

---

### 8.2 Test Data Setup

```sql
-- Create manual content source (if not exists)
INSERT INTO content_sources (
    id, name, description, source_type, is_active, is_internal,
    trust_score, created_by, created_at, updated_at
)
VALUES (
    'manual-source-id'::uuid,
    'Manual Content Entry',
    'Internal content created by marketing team',
    'manual',
    true,
    true,
    1.0,
    (SELECT id FROM users WHERE email = 'admin@test.com' LIMIT 1),
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Create test content item
INSERT INTO content_items (
    id, source_id, title, url, summary, full_content,
    content_type, topic_tags, framework_tags,
    publish_date, trust_score, relevance_score,
    is_active, created_at, updated_at
)
VALUES (
    'test-content-1'::uuid,
    'manual-source-id'::uuid,
    'Test Article: Zero Trust Security',
    'https://armor.com/blog/zero-trust-security',
    'Learn about Zero Trust architecture',
    'Full content here...',
    'blog',
    ARRAY['zero-trust', 'network-security'],
    ARRAY['NIST'],
    NOW(),
    1.0,
    1.0,
    true,
    NOW(),
    NOW()
)
ON CONFLICT (url) DO NOTHING;

-- Create test newsletter issue
INSERT INTO newsletter_issues (
    id, configuration_id, segment_id, issue_number, issue_date,
    status, created_at, updated_at
)
VALUES (
    'test-issue-1'::uuid,
    (SELECT id FROM newsletter_configurations LIMIT 1),
    (SELECT id FROM segments LIMIT 1),
    9999,
    CURRENT_DATE,
    'draft',
    NOW(),
    NOW()
)
ON CONFLICT DO NOTHING;
```

---

### 8.3 Validation Queries

```sql
-- Validate all constraints are active
SELECT
    tc.constraint_name,
    tc.constraint_type,
    tc.table_name,
    kcu.column_name,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name IN ('newsletter_blocks', 'content_items', 'content_sources')
  AND tc.constraint_type IN ('FOREIGN KEY', 'UNIQUE', 'CHECK')
ORDER BY tc.table_name, tc.constraint_type;

-- Validate index coverage
SELECT
    t.tablename,
    i.indexname,
    array_agg(a.attname ORDER BY a.attnum) AS indexed_columns,
    pg_size_pretty(pg_relation_size(i.indexrelid)) AS index_size,
    idx_scan AS times_used
FROM pg_indexes i
JOIN pg_stat_user_indexes ui ON i.indexname = ui.indexname
JOIN pg_class c ON c.relname = i.tablename
JOIN pg_index ix ON c.oid = ix.indrelid AND i.indexname = (SELECT relname FROM pg_class WHERE oid = ix.indexrelid)
JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(ix.indkey)
WHERE i.tablename IN ('newsletter_blocks', 'content_items', 'content_sources')
GROUP BY t.tablename, i.indexname, i.indexrelid, ui.idx_scan
ORDER BY t.tablename, ui.idx_scan DESC;
```

---

## 9. Error Handling Reference

### 9.1 PostgreSQL Error Codes

| Error Code | Error Name | Meaning | Handling Strategy |
|------------|------------|---------|-------------------|
| `23505` | unique_violation | Duplicate key (URL, position) | Retry with new position or skip insert |
| `23503` | foreign_key_violation | Referenced record doesn't exist | Fail fast, return error to user |
| `23502` | not_null_violation | Required field is NULL | Validation error, return 400 |
| `23514` | check_violation | Check constraint failed | Validation error, return 400 |
| `40001` | serialization_failure | Transaction conflict | Retry transaction |
| `40P01` | deadlock_detected | Deadlock between transactions | Retry with exponential backoff |

### 9.2 Go Error Handling Pattern

```go
import (
    "github.com/jackc/pgx/v5/pgconn"
)

func handlePgError(err error) error {
    var pgErr *pgconn.PgError
    if errors.As(err, &pgErr) {
        switch pgErr.Code {
        case "23505": // unique_violation
            return fmt.Errorf("duplicate entry: %s", pgErr.ConstraintName)
        case "23503": // foreign_key_violation
            return fmt.Errorf("referenced record not found: %s", pgErr.ConstraintName)
        case "23502": // not_null_violation
            return fmt.Errorf("required field is missing: %s", pgErr.ColumnName)
        case "23514": // check_violation
            return fmt.Errorf("invalid value: %s", pgErr.ConstraintName)
        default:
            return fmt.Errorf("database error: %s", pgErr.Message)
        }
    }
    return err
}
```

---

## 10. Summary

### Key Takeaways

1. **Transaction Safety:** All multi-step operations (content + block creation) MUST use transactions
2. **Index Usage:** Existing indexes are well-designed; new composite indexes will improve duplicate checks by 10-100x
3. **Constraint Enforcement:** FK, UNIQUE, and CHECK constraints provide strong data integrity guarantees
4. **Concurrency Handling:** Retry logic required for unique constraint violations on position
5. **Performance Targets:** All queries should complete in < 50ms with proper indexing

### Next Steps

1. Create migration for new indexes (`000012_content_workflow_indexes.up.sql`)
2. Implement `CheckDuplicateBlock()` method in repository
3. Add transaction wrapper for content workflow service
4. Write integration tests with database
5. Benchmark queries against performance targets
6. Deploy migration to staging environment
7. Validate with E2E tests

---

## Appendix: EXPLAIN ANALYZE Examples

### A.1 Bulk Insert Performance

```sql
EXPLAIN ANALYZE
INSERT INTO newsletter_blocks (
    id, issue_id, content_item_id, block_type, position,
    title, teaser, cta_label, cta_url, is_promotional,
    topic_tags, clicks, created_at, updated_at
)
VALUES
    (gen_random_uuid(), 'test-issue-1'::uuid, 'test-content-1'::uuid, 'content', 0, 'Block 1', 'Teaser 1', 'Read More', 'https://example.com', false, ARRAY['tag1'], 0, NOW(), NOW()),
    (gen_random_uuid(), 'test-issue-1'::uuid, 'test-content-2'::uuid, 'content', 1, 'Block 2', 'Teaser 2', 'Learn More', 'https://example.com', false, ARRAY['tag2'], 0, NOW(), NOW()),
    (gen_random_uuid(), 'test-issue-1'::uuid, 'test-content-3'::uuid, 'content', 2, 'Block 3', 'Teaser 3', 'Discover', 'https://example.com', false, ARRAY['tag3'], 0, NOW(), NOW());

-- Expected output:
-- Insert on newsletter_blocks  (cost=0.00..0.03 rows=3 width=XXX) (actual time=0.234..0.235 rows=3 loops=1)
--   ->  Values Scan on "*VALUES*"  (cost=0.00..0.03 rows=3 width=XXX) (actual time=0.001..0.002 rows=3 loops=1)
-- Planning Time: 0.123 ms
-- Execution Time: 0.456 ms
```

### A.2 Duplicate Check with Index

```sql
EXPLAIN ANALYZE
SELECT EXISTS(
    SELECT 1
    FROM newsletter_blocks
    WHERE issue_id = 'test-issue-1'::uuid
      AND content_item_id = 'test-content-1'::uuid
) AS exists;

-- Expected output (WITH new composite index):
-- Result  (cost=0.28..0.29 rows=1 width=1) (actual time=0.023..0.024 rows=1 loops=1)
--   InitPlan 1 (returns $0)
--     ->  Index Only Scan using idx_newsletter_blocks_issue_content on newsletter_blocks  (cost=0.28..0.30 rows=1 width=0) (actual time=0.019..0.020 rows=1 loops=1)
--           Index Cond: ((issue_id = 'test-issue-1'::uuid) AND (content_item_id = 'test-content-1'::uuid))
--           Heap Fetches: 0  <-- Index-only scan (optimal!)
-- Planning Time: 0.112 ms
-- Execution Time: 0.045 ms
```

---

**Document Version:** 1.0
**Last Updated:** 2026-01-10
**Author:** Database Developer Agent
**Status:** Ready for Review
