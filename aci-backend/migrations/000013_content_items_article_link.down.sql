-- Migration 000013 Down: Revert article_id and source_id changes
-- Warning: This will remove the article link and require source_id for all items

-- Remove indexes
DROP INDEX IF EXISTS idx_content_items_expires_at;
DROP INDEX IF EXISTS idx_content_items_article_id;

-- Remove added columns
ALTER TABLE content_items
    DROP COLUMN IF EXISTS partner_tags,
    DROP COLUMN IF EXISTS expires_at,
    DROP COLUMN IF EXISTS historical_clicks,
    DROP COLUMN IF EXISTS historical_opens,
    DROP COLUMN IF EXISTS image_url,
    DROP COLUMN IF EXISTS reading_time_minutes,
    DROP COLUMN IF EXISTS word_count,
    DROP COLUMN IF EXISTS author,
    DROP COLUMN IF EXISTS article_id;

-- Rename columns back to original names
ALTER TABLE content_items
    RENAME COLUMN content TO full_content;

ALTER TABLE content_items
    RENAME COLUMN indexed_at TO zinc_indexed_at;

-- Note: Cannot restore NOT NULL on source_id if there's existing data with NULL values
-- This would need to be done manually after ensuring all rows have source_id values
-- ALTER TABLE content_items ALTER COLUMN source_id SET NOT NULL;
