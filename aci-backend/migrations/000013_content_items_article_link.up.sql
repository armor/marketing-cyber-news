-- Migration 000013: Add article_id to content_items and make source_id nullable
-- Description: Allows content items to link to articles and supports manual content (no source)
-- Author: Content Pipeline Implementation
-- Date: 2025-01-19

-- Step 1: Make source_id nullable to support manual content entries
-- Manual content (user-submitted URLs) has no automated source
ALTER TABLE content_items
    ALTER COLUMN source_id DROP NOT NULL;

-- Step 2: Add article_id column to link content items to articles
-- This allows content to be associated with existing articles when applicable
ALTER TABLE content_items
    ADD COLUMN IF NOT EXISTS article_id UUID REFERENCES articles(id) ON DELETE SET NULL;

-- Step 3: Rename columns to match repository code expectations
-- Repository code uses 'content' and 'indexed_at' but DB has 'full_content' and 'zinc_indexed_at'
ALTER TABLE content_items
    RENAME COLUMN full_content TO content;

ALTER TABLE content_items
    RENAME COLUMN zinc_indexed_at TO indexed_at;

-- Step 4: Add additional metadata columns that the domain model expects
-- These may have been added by code but not in migrations
ALTER TABLE content_items
    ADD COLUMN IF NOT EXISTS author VARCHAR(255),
    ADD COLUMN IF NOT EXISTS word_count INTEGER CHECK (word_count >= 0),
    ADD COLUMN IF NOT EXISTS reading_time_minutes INTEGER CHECK (reading_time_minutes >= 0),
    ADD COLUMN IF NOT EXISTS image_url VARCHAR(2000),
    ADD COLUMN IF NOT EXISTS historical_opens INTEGER DEFAULT 0 CHECK (historical_opens >= 0),
    ADD COLUMN IF NOT EXISTS historical_clicks INTEGER DEFAULT 0 CHECK (historical_clicks >= 0),
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS partner_tags TEXT[] DEFAULT '{}';

-- Step 4: Create index for article_id lookups
CREATE INDEX IF NOT EXISTS idx_content_items_article_id ON content_items(article_id);

-- Step 5: Create index for expires_at for freshness queries
CREATE INDEX IF NOT EXISTS idx_content_items_expires_at ON content_items(expires_at)
    WHERE expires_at IS NOT NULL;

COMMENT ON COLUMN content_items.article_id IS 'Optional link to an article when content item corresponds to an existing article';
COMMENT ON COLUMN content_items.source_id IS 'Source ID, NULL for manual content entries (user-submitted URLs)';
