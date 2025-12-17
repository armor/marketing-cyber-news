# Database Schema Changes for Enhanced Threat Intelligence

**Date**: 2025-12-15
**Feature**: Enhanced Threat Intelligence API

## Overview

This document outlines the database schema changes required to support the enhanced threat intelligence features including deep dive analysis, external references, industries, and recommendations.

## Required Schema Changes

### 1. User Table Modification

Add subscription tier column to users table:

```sql
ALTER TABLE users
ADD COLUMN subscription_tier VARCHAR(50) NOT NULL DEFAULT 'free';

-- Add check constraint for valid values
ALTER TABLE users
ADD CONSTRAINT check_subscription_tier
CHECK (subscription_tier IN ('free', 'premium', 'enterprise'));

-- Create index for faster subscription tier queries
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);
```

### 2. External References Table

Store external references for articles:

```sql
CREATE TABLE article_external_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    url TEXT NOT NULL,
    source VARCHAR(255) NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_article_external_refs_article FOREIGN KEY (article_id)
        REFERENCES articles(id) ON DELETE CASCADE
);

CREATE INDEX idx_article_external_refs_article_id ON article_external_references(article_id);
CREATE INDEX idx_article_external_refs_source ON article_external_references(source);
```

### 3. Industries Table

Store affected industries for articles:

```sql
CREATE TABLE article_industries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    impact_level VARCHAR(50) NOT NULL,
    details TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_article_industries_article FOREIGN KEY (article_id)
        REFERENCES articles(id) ON DELETE CASCADE,
    CONSTRAINT check_impact_level
        CHECK (impact_level IN ('critical', 'high', 'medium', 'low'))
);

CREATE INDEX idx_article_industries_article_id ON article_industries(article_id);
CREATE INDEX idx_article_industries_name ON article_industries(name);
CREATE INDEX idx_article_industries_impact_level ON article_industries(impact_level);

-- For filtering articles by industry
CREATE INDEX idx_article_industries_name_article_id ON article_industries(name, article_id);
```

### 4. Recommendations Table

Store actionable recommendations for articles:

```sql
CREATE TABLE article_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_article_recommendations_article FOREIGN KEY (article_id)
        REFERENCES articles(id) ON DELETE CASCADE,
    CONSTRAINT check_priority
        CHECK (priority IN ('immediate', 'high', 'medium', 'low')),
    CONSTRAINT check_category
        CHECK (category IN ('patch', 'monitor', 'mitigate', 'investigate', 'configure', 'update'))
);

CREATE INDEX idx_article_recommendations_article_id ON article_recommendations(article_id);
CREATE INDEX idx_article_recommendations_priority ON article_recommendations(priority);
CREATE INDEX idx_article_recommendations_category ON article_recommendations(category);
```

### 5. Deep Dive Tables

#### Main Deep Dive Table

```sql
CREATE TABLE article_deep_dives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL UNIQUE REFERENCES articles(id) ON DELETE CASCADE,
    executive_summary TEXT NOT NULL,
    required_tier VARCHAR(50) NOT NULL DEFAULT 'premium',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_deep_dive_article FOREIGN KEY (article_id)
        REFERENCES articles(id) ON DELETE CASCADE,
    CONSTRAINT check_required_tier
        CHECK (required_tier IN ('free', 'premium', 'enterprise'))
);

CREATE UNIQUE INDEX idx_deep_dives_article_id ON article_deep_dives(article_id);
CREATE INDEX idx_deep_dives_required_tier ON article_deep_dives(required_tier);
```

#### Technical Analysis

```sql
CREATE TABLE deep_dive_technical_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deep_dive_id UUID NOT NULL UNIQUE REFERENCES article_deep_dives(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    attack_chain JSONB NOT NULL, -- Array of strings
    indicators JSONB NOT NULL, -- Array of strings
    detection_methods JSONB NOT NULL, -- Array of strings
    mitigation_strategies JSONB NOT NULL, -- Array of strings
    tools_used JSONB, -- Array of strings (optional)
    vulnerabilities JSONB, -- Array of strings (optional)
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_tech_analysis_deep_dive FOREIGN KEY (deep_dive_id)
        REFERENCES article_deep_dives(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_tech_analysis_deep_dive_id ON deep_dive_technical_analysis(deep_dive_id);
```

#### Timeline Events

```sql
CREATE TABLE deep_dive_timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deep_dive_id UUID NOT NULL REFERENCES article_deep_dives(id) ON DELETE CASCADE,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    source VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_timeline_deep_dive FOREIGN KEY (deep_dive_id)
        REFERENCES article_deep_dives(id) ON DELETE CASCADE
);

CREATE INDEX idx_timeline_deep_dive_id ON deep_dive_timeline_events(deep_dive_id);
CREATE INDEX idx_timeline_event_date ON deep_dive_timeline_events(event_date);
```

#### MITRE Techniques

```sql
CREATE TABLE deep_dive_mitre_techniques (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deep_dive_id UUID NOT NULL REFERENCES article_deep_dives(id) ON DELETE CASCADE,
    technique_id VARCHAR(50) NOT NULL, -- e.g., "T1190"
    name VARCHAR(500) NOT NULL,
    tactic VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_mitre_deep_dive FOREIGN KEY (deep_dive_id)
        REFERENCES article_deep_dives(id) ON DELETE CASCADE
);

CREATE INDEX idx_mitre_deep_dive_id ON deep_dive_mitre_techniques(deep_dive_id);
CREATE INDEX idx_mitre_technique_id ON deep_dive_mitre_techniques(technique_id);
```

#### IOCs for Deep Dive

```sql
CREATE TABLE deep_dive_iocs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deep_dive_id UUID NOT NULL REFERENCES article_deep_dives(id) ON DELETE CASCADE,
    ioc_type VARCHAR(50) NOT NULL,
    value TEXT NOT NULL,
    context TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_ioc_deep_dive FOREIGN KEY (deep_dive_id)
        REFERENCES article_deep_dives(id) ON DELETE CASCADE,
    CONSTRAINT check_ioc_type
        CHECK (ioc_type IN ('ip', 'domain', 'hash', 'url'))
);

CREATE INDEX idx_deep_dive_iocs_deep_dive_id ON deep_dive_iocs(deep_dive_id);
CREATE INDEX idx_deep_dive_iocs_type ON deep_dive_iocs(ioc_type);
CREATE INDEX idx_deep_dive_iocs_value ON deep_dive_iocs(value);
```

#### Threat Actor Profiles

```sql
CREATE TABLE deep_dive_threat_actors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deep_dive_id UUID NOT NULL REFERENCES article_deep_dives(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    aliases JSONB, -- Array of strings (optional)
    motivation VARCHAR(50) NOT NULL,
    origin VARCHAR(255),
    target_sectors JSONB NOT NULL, -- Array of strings
    known_techniques JSONB, -- Array of MITRE IDs (optional)
    first_seen TIMESTAMP WITH TIME ZONE,
    last_seen TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_threat_actor_deep_dive FOREIGN KEY (deep_dive_id)
        REFERENCES article_deep_dives(id) ON DELETE CASCADE,
    CONSTRAINT check_motivation
        CHECK (motivation IN ('financial', 'espionage', 'hacktivism', 'terrorism', 'unknown'))
);

CREATE INDEX idx_threat_actors_deep_dive_id ON deep_dive_threat_actors(deep_dive_id);
CREATE INDEX idx_threat_actors_name ON deep_dive_threat_actors(name);
CREATE INDEX idx_threat_actors_motivation ON deep_dive_threat_actors(motivation);
```

#### Related Threats

```sql
CREATE TABLE deep_dive_related_threats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deep_dive_id UUID NOT NULL REFERENCES article_deep_dives(id) ON DELETE CASCADE,
    related_article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_related_threat_deep_dive FOREIGN KEY (deep_dive_id)
        REFERENCES article_deep_dives(id) ON DELETE CASCADE,
    CONSTRAINT fk_related_threat_article FOREIGN KEY (related_article_id)
        REFERENCES articles(id) ON DELETE CASCADE,
    CONSTRAINT unique_related_threat UNIQUE (deep_dive_id, related_article_id)
);

CREATE INDEX idx_related_threats_deep_dive_id ON deep_dive_related_threats(deep_dive_id);
CREATE INDEX idx_related_threats_article_id ON deep_dive_related_threats(related_article_id);
```

#### Affected Products

```sql
CREATE TABLE deep_dive_affected_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deep_dive_id UUID NOT NULL REFERENCES article_deep_dives(id) ON DELETE CASCADE,
    product_name VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_affected_product_deep_dive FOREIGN KEY (deep_dive_id)
        REFERENCES article_deep_dives(id) ON DELETE CASCADE
);

CREATE INDEX idx_affected_products_deep_dive_id ON deep_dive_affected_products(deep_dive_id);
CREATE INDEX idx_affected_products_name ON deep_dive_affected_products(product_name);
```

## Migration Script

```sql
-- Migration: Enhanced Threat Intelligence
-- Version: v1.1.0
-- Date: 2025-12-15

BEGIN;

-- 1. Add subscription tier to users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) NOT NULL DEFAULT 'free';

ALTER TABLE users
ADD CONSTRAINT IF NOT EXISTS check_subscription_tier
CHECK (subscription_tier IN ('free', 'premium', 'enterprise'));

CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);

-- 2. Create external references table
CREATE TABLE IF NOT EXISTS article_external_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL,
    title VARCHAR(500) NOT NULL,
    url TEXT NOT NULL,
    source VARCHAR(255) NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_article_external_refs_article FOREIGN KEY (article_id)
        REFERENCES articles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_article_external_refs_article_id ON article_external_references(article_id);
CREATE INDEX IF NOT EXISTS idx_article_external_refs_source ON article_external_references(source);

-- 3. Create industries table
CREATE TABLE IF NOT EXISTS article_industries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    impact_level VARCHAR(50) NOT NULL,
    details TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_article_industries_article FOREIGN KEY (article_id)
        REFERENCES articles(id) ON DELETE CASCADE,
    CONSTRAINT check_impact_level
        CHECK (impact_level IN ('critical', 'high', 'medium', 'low'))
);

CREATE INDEX IF NOT EXISTS idx_article_industries_article_id ON article_industries(article_id);
CREATE INDEX IF NOT EXISTS idx_article_industries_name ON article_industries(name);
CREATE INDEX IF NOT EXISTS idx_article_industries_impact_level ON article_industries(impact_level);
CREATE INDEX IF NOT EXISTS idx_article_industries_name_article_id ON article_industries(name, article_id);

-- 4. Create recommendations table
CREATE TABLE IF NOT EXISTS article_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_article_recommendations_article FOREIGN KEY (article_id)
        REFERENCES articles(id) ON DELETE CASCADE,
    CONSTRAINT check_priority
        CHECK (priority IN ('immediate', 'high', 'medium', 'low')),
    CONSTRAINT check_category
        CHECK (category IN ('patch', 'monitor', 'mitigate', 'investigate', 'configure', 'update'))
);

CREATE INDEX IF NOT EXISTS idx_article_recommendations_article_id ON article_recommendations(article_id);
CREATE INDEX IF NOT EXISTS idx_article_recommendations_priority ON article_recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_article_recommendations_category ON article_recommendations(category);

-- 5. Create deep dive tables (all remaining tables from above)
-- ... (include all deep dive table creation statements)

COMMIT;
```

## Repository Implementation Notes

The following repository methods will need to be implemented:

### ArticleRepository Extensions

- `GetArticleIndustries(ctx context.Context, articleID uuid.UUID) ([]Industry, error)`
- `GetExternalReferences(ctx context.Context, articleID uuid.UUID) ([]ExternalReference, error)`
- `GetRecommendations(ctx context.Context, articleID uuid.UUID) ([]Recommendation, error)`
- `HasDeepDive(ctx context.Context, articleID uuid.UUID) (bool, error)`
- `FilterByIndustry(ctx context.Context, industryName string, filter *ArticleFilter) ([]*Article, int, error)`

### DeepDiveRepository (New)

- `GetByArticleID(ctx context.Context, articleID uuid.UUID) (*DeepDive, error)`
- `ExistsByArticleID(ctx context.Context, articleID uuid.UUID) (bool, error)`
- `Create(ctx context.Context, deepDive *DeepDive) error`
- `Update(ctx context.Context, deepDive *DeepDive) error`
- `Delete(ctx context.Context, id uuid.UUID) error`

## Configuration Changes

Add to application configuration:

```go
type Config struct {
    // ... existing config

    DeepDive DeepDiveConfig
}

type DeepDiveConfig struct {
    UpgradeURL string `env:"DEEP_DIVE_UPGRADE_URL" default:"https://example.com/pricing"`
}
```

## Next Steps

1. Create migration scripts in `aci-backend/migrations/`
2. Implement repository interfaces for new tables
3. Wire up deep dive handler in router
4. Add unit tests for new handlers and models
5. Update API documentation
6. Create seed data for testing

## Testing Queries

```sql
-- Count articles with deep dive by industry
SELECT i.name, COUNT(DISTINCT a.id) as article_count
FROM article_industries i
JOIN articles a ON i.article_id = a.id
JOIN article_deep_dives d ON a.id = d.article_id
GROUP BY i.name
ORDER BY article_count DESC;

-- Get user subscription distribution
SELECT subscription_tier, COUNT(*) as user_count
FROM users
GROUP BY subscription_tier;

-- Find articles with critical industry impact
SELECT a.id, a.title, i.name as industry, i.impact_level
FROM articles a
JOIN article_industries i ON a.id = i.article_id
WHERE i.impact_level = 'critical'
ORDER BY a.published_at DESC;
```
