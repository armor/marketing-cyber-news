package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/lib/pq"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/repository"
)

type contentItemRepository struct {
	db *DB
}

// NewContentItemRepository creates a new PostgreSQL content item repository
func NewContentItemRepository(db *DB) repository.ContentItemRepository {
	if db == nil {
		panic("database cannot be nil")
	}
	return &contentItemRepository{db: db}
}

// Create creates a new content item
func (r *contentItemRepository) Create(ctx context.Context, item *domain.ContentItem) error {
	if item == nil {
		return fmt.Errorf("content item cannot be nil")
	}

	if err := item.Validate(); err != nil {
		return fmt.Errorf("invalid content item: %w", err)
	}

	query := `
		INSERT INTO content_items (
			id, source_id, article_id, title, url, summary, content,
			content_type, topic_tags, framework_tags, industry_tags,
			buyer_stage, partner_tags, author, publish_date,
			word_count, reading_time_minutes, image_url,
			trust_score, relevance_score, historical_ctr,
			historical_opens, historical_clicks, expires_at,
			is_active, indexed_at, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
	`

	_, err := r.db.Pool.Exec(ctx, query,
		item.ID,
		item.SourceID,
		item.ArticleID,
		item.Title,
		item.URL,
		item.Summary,
		item.Content,
		item.ContentType,
		pq.Array(item.TopicTags),
		pq.Array(item.FrameworkTags),
		pq.Array(item.IndustryTags),
		item.BuyerStage,
		pq.Array(item.PartnerTags),
		item.Author,
		item.PublishDate,
		item.WordCount,
		item.ReadingTimeMinutes,
		item.ImageURL,
		item.TrustScore,
		item.RelevanceScore,
		item.HistoricalCTR,
		item.HistoricalOpens,
		item.HistoricalClicks,
		item.ExpiresAt,
		item.IsActive,
		item.IndexedAt,
		item.CreatedAt,
		item.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create content item: %w", err)
	}

	return nil
}

// GetByID retrieves a content item by ID
func (r *contentItemRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.ContentItem, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("content item ID cannot be nil")
	}

	query := `
		SELECT
			id, source_id, article_id, title, url, summary, content,
			content_type, topic_tags, framework_tags, industry_tags,
			buyer_stage, partner_tags, author, publish_date,
			word_count, reading_time_minutes, image_url,
			trust_score, relevance_score, historical_ctr,
			historical_opens, historical_clicks, expires_at,
			is_active, indexed_at, created_at, updated_at
		FROM content_items
		WHERE id = $1
	`

	item := &domain.ContentItem{}
	var topicTags, frameworkTags, industryTags, partnerTags []string

	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&item.ID,
		&item.SourceID,
		&item.ArticleID,
		&item.Title,
		&item.URL,
		&item.Summary,
		&item.Content,
		&item.ContentType,
		&topicTags,
		&frameworkTags,
		&industryTags,
		&item.BuyerStage,
		&partnerTags,
		&item.Author,
		&item.PublishDate,
		&item.WordCount,
		&item.ReadingTimeMinutes,
		&item.ImageURL,
		&item.TrustScore,
		&item.RelevanceScore,
		&item.HistoricalCTR,
		&item.HistoricalOpens,
		&item.HistoricalClicks,
		&item.ExpiresAt,
		&item.IsActive,
		&item.IndexedAt,
		&item.CreatedAt,
		&item.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("content item not found: %w", err)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get content item: %w", err)
	}

	item.TopicTags = topicTags
	item.FrameworkTags = frameworkTags
	item.IndustryTags = industryTags
	item.PartnerTags = partnerTags

	return item, nil
}

// GetByURL retrieves a content item by URL (for deduplication)
func (r *contentItemRepository) GetByURL(ctx context.Context, url string) (*domain.ContentItem, error) {
	if url == "" {
		return nil, fmt.Errorf("content item URL cannot be empty")
	}

	query := `
		SELECT
			id, source_id, article_id, title, url, summary, content,
			content_type, topic_tags, framework_tags, industry_tags,
			buyer_stage, partner_tags, author, publish_date,
			word_count, reading_time_minutes, image_url,
			trust_score, relevance_score, historical_ctr,
			historical_opens, historical_clicks, expires_at,
			is_active, indexed_at, created_at, updated_at
		FROM content_items
		WHERE url = $1
	`

	item := &domain.ContentItem{}
	var topicTags, frameworkTags, industryTags, partnerTags []string

	err := r.db.Pool.QueryRow(ctx, query, url).Scan(
		&item.ID,
		&item.SourceID,
		&item.ArticleID,
		&item.Title,
		&item.URL,
		&item.Summary,
		&item.Content,
		&item.ContentType,
		&topicTags,
		&frameworkTags,
		&industryTags,
		&item.BuyerStage,
		&partnerTags,
		&item.Author,
		&item.PublishDate,
		&item.WordCount,
		&item.ReadingTimeMinutes,
		&item.ImageURL,
		&item.TrustScore,
		&item.RelevanceScore,
		&item.HistoricalCTR,
		&item.HistoricalOpens,
		&item.HistoricalClicks,
		&item.ExpiresAt,
		&item.IsActive,
		&item.IndexedAt,
		&item.CreatedAt,
		&item.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil // Not found is acceptable for deduplication checks
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get content item by URL: %w", err)
	}

	item.TopicTags = topicTags
	item.FrameworkTags = frameworkTags
	item.IndustryTags = industryTags
	item.PartnerTags = partnerTags

	return item, nil
}

// List retrieves content items with filtering and pagination
func (r *contentItemRepository) List(ctx context.Context, filter *domain.ContentItemFilter) ([]*domain.ContentItem, int, error) {
	if filter == nil {
		return nil, 0, fmt.Errorf("filter cannot be nil")
	}

	// Build WHERE clauses dynamically
	whereClauses := []string{}
	args := []interface{}{}
	argPos := 1

	if filter.SourceID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("source_id = $%d", argPos))
		args = append(args, *filter.SourceID)
		argPos++
	}

	if filter.ContentType != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("content_type = $%d", argPos))
		args = append(args, *filter.ContentType)
		argPos++
	}

	if len(filter.TopicTags) > 0 {
		whereClauses = append(whereClauses, fmt.Sprintf("topic_tags && $%d", argPos))
		args = append(args, pq.Array(filter.TopicTags))
		argPos++
	}

	if len(filter.FrameworkTags) > 0 {
		whereClauses = append(whereClauses, fmt.Sprintf("framework_tags && $%d", argPos))
		args = append(args, pq.Array(filter.FrameworkTags))
		argPos++
	}

	if len(filter.IndustryTags) > 0 {
		whereClauses = append(whereClauses, fmt.Sprintf("industry_tags && $%d", argPos))
		args = append(args, pq.Array(filter.IndustryTags))
		argPos++
	}

	if filter.BuyerStage != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("buyer_stage = $%d", argPos))
		args = append(args, *filter.BuyerStage)
		argPos++
	}

	if filter.IsActive != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("is_active = $%d", argPos))
		args = append(args, *filter.IsActive)
		argPos++
	}

	if filter.PublishedAfter != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("publish_date >= $%d", argPos))
		args = append(args, *filter.PublishedAfter)
		argPos++
	}

	if filter.PublishedBefore != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("publish_date <= $%d", argPos))
		args = append(args, *filter.PublishedBefore)
		argPos++
	}

	if filter.FreshnessDays != nil {
		freshnessCutoff := time.Now().AddDate(0, 0, -*filter.FreshnessDays)
		whereClauses = append(whereClauses, fmt.Sprintf("publish_date >= $%d", argPos))
		args = append(args, freshnessCutoff)
		argPos++
	}

	if filter.MinTrustScore != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("trust_score >= $%d", argPos))
		args = append(args, *filter.MinTrustScore)
		argPos++
	}

	if filter.MinRelevanceScore != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("relevance_score >= $%d", argPos))
		args = append(args, *filter.MinRelevanceScore)
		argPos++
	}

	whereClause := ""
	if len(whereClauses) > 0 {
		whereClause = "WHERE " + whereClauses[0]
		for i := 1; i < len(whereClauses); i++ {
			whereClause += " AND " + whereClauses[i]
		}
	}

	// Count total matching records
	countQuery := "SELECT COUNT(*) FROM content_items " + whereClause
	var total int
	err := r.db.Pool.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count content items: %w", err)
	}

	// Query with pagination
	query := `
		SELECT
			id, source_id, article_id, title, url, summary, content,
			content_type, topic_tags, framework_tags, industry_tags,
			buyer_stage, partner_tags, author, publish_date,
			word_count, reading_time_minutes, image_url,
			trust_score, relevance_score, historical_ctr,
			historical_opens, historical_clicks, expires_at,
			is_active, indexed_at, created_at, updated_at
		FROM content_items
		` + whereClause + `
		ORDER BY publish_date DESC, relevance_score DESC
		LIMIT $` + fmt.Sprintf("%d", argPos) + ` OFFSET $` + fmt.Sprintf("%d", argPos+1)

	args = append(args, filter.Limit, filter.Offset)

	rows, err := r.db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list content items: %w", err)
	}
	defer rows.Close()

	items := make([]*domain.ContentItem, 0)
	for rows.Next() {
		item := &domain.ContentItem{}
		var topicTags, frameworkTags, industryTags, partnerTags []string

		err := rows.Scan(
			&item.ID,
			&item.SourceID,
			&item.ArticleID,
			&item.Title,
			&item.URL,
			&item.Summary,
			&item.Content,
			&item.ContentType,
			&topicTags,
			&frameworkTags,
			&industryTags,
			&item.BuyerStage,
			&partnerTags,
			&item.Author,
			&item.PublishDate,
			&item.WordCount,
			&item.ReadingTimeMinutes,
			&item.ImageURL,
			&item.TrustScore,
			&item.RelevanceScore,
			&item.HistoricalCTR,
			&item.HistoricalOpens,
			&item.HistoricalClicks,
			&item.ExpiresAt,
			&item.IsActive,
			&item.IndexedAt,
			&item.CreatedAt,
			&item.UpdatedAt,
		)

		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan content item: %w", err)
		}

		item.TopicTags = topicTags
		item.FrameworkTags = frameworkTags
		item.IndustryTags = industryTags
		item.PartnerTags = partnerTags

		items = append(items, item)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating content items: %w", err)
	}

	return items, total, nil
}

// Update updates an existing content item
func (r *contentItemRepository) Update(ctx context.Context, item *domain.ContentItem) error {
	if item == nil {
		return fmt.Errorf("content item cannot be nil")
	}

	if err := item.Validate(); err != nil {
		return fmt.Errorf("invalid content item: %w", err)
	}

	query := `
		UPDATE content_items
		SET
			source_id = $2,
			article_id = $3,
			title = $4,
			url = $5,
			summary = $6,
			content = $7,
			content_type = $8,
			topic_tags = $9,
			framework_tags = $10,
			industry_tags = $11,
			buyer_stage = $12,
			partner_tags = $13,
			author = $14,
			publish_date = $15,
			word_count = $16,
			reading_time_minutes = $17,
			image_url = $18,
			trust_score = $19,
			relevance_score = $20,
			expires_at = $21,
			is_active = $22,
			indexed_at = $23,
			updated_at = $24
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query,
		item.ID,
		item.SourceID,
		item.ArticleID,
		item.Title,
		item.URL,
		item.Summary,
		item.Content,
		item.ContentType,
		pq.Array(item.TopicTags),
		pq.Array(item.FrameworkTags),
		pq.Array(item.IndustryTags),
		item.BuyerStage,
		pq.Array(item.PartnerTags),
		item.Author,
		item.PublishDate,
		item.WordCount,
		item.ReadingTimeMinutes,
		item.ImageURL,
		item.TrustScore,
		item.RelevanceScore,
		item.ExpiresAt,
		item.IsActive,
		item.IndexedAt,
		item.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to update content item: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("content item not found")
	}

	return nil
}

// Delete deletes a content item by ID
func (r *contentItemRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("content item ID cannot be nil")
	}

	query := `DELETE FROM content_items WHERE id = $1`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete content item: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("content item not found")
	}

	return nil
}

// BulkCreate creates multiple content items in a single transaction
func (r *contentItemRepository) BulkCreate(ctx context.Context, items []*domain.ContentItem) error {
	if len(items) == 0 {
		return nil
	}

	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	query := `
		INSERT INTO content_items (
			id, source_id, article_id, title, url, summary, content,
			content_type, topic_tags, framework_tags, industry_tags,
			buyer_stage, partner_tags, author, publish_date,
			word_count, reading_time_minutes, image_url,
			trust_score, relevance_score, historical_ctr,
			historical_opens, historical_clicks, expires_at,
			is_active, indexed_at, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
		ON CONFLICT (url) DO NOTHING
	`

	for _, item := range items {
		if item == nil {
			continue
		}

		if err := item.Validate(); err != nil {
			return fmt.Errorf("invalid content item: %w", err)
		}

		_, err = tx.Exec(ctx, query,
			item.ID,
			item.SourceID,
			item.ArticleID,
			item.Title,
			item.URL,
			item.Summary,
			item.Content,
			item.ContentType,
			pq.Array(item.TopicTags),
			pq.Array(item.FrameworkTags),
			pq.Array(item.IndustryTags),
			item.BuyerStage,
			pq.Array(item.PartnerTags),
			item.Author,
			item.PublishDate,
			item.WordCount,
			item.ReadingTimeMinutes,
			item.ImageURL,
			item.TrustScore,
			item.RelevanceScore,
			item.HistoricalCTR,
			item.HistoricalOpens,
			item.HistoricalClicks,
			item.ExpiresAt,
			item.IsActive,
			item.IndexedAt,
			item.CreatedAt,
			item.UpdatedAt,
		)

		if err != nil {
			return fmt.Errorf("failed to insert content item: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// UpdateHistoricalMetrics updates engagement metrics for a content item
func (r *contentItemRepository) UpdateHistoricalMetrics(ctx context.Context, id uuid.UUID, opens, clicks int) error {
	if id == uuid.Nil {
		return fmt.Errorf("content item ID cannot be nil")
	}

	query := `
		UPDATE content_items
		SET
			historical_opens = historical_opens + $2,
			historical_clicks = historical_clicks + $3,
			historical_ctr = CASE
				WHEN (historical_opens + $2) > 0
				THEN CAST((historical_clicks + $3) AS FLOAT) / CAST((historical_opens + $2) AS FLOAT)
				ELSE 0
			END,
			updated_at = $4
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id, opens, clicks, time.Now())
	if err != nil {
		return fmt.Errorf("failed to update historical metrics: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("content item not found")
	}

	return nil
}

// GetFreshContent retrieves fresh content items for newsletter generation
func (r *contentItemRepository) GetFreshContent(ctx context.Context, daysThreshold int, topicTags []string, limit int) ([]*domain.ContentItem, error) {
	if daysThreshold < 0 {
		return nil, fmt.Errorf("days threshold must be non-negative")
	}

	if limit <= 0 {
		limit = 20
	}

	freshnessCutoff := time.Now().AddDate(0, 0, -daysThreshold)

	// Build query with optional topic filter
	whereClauses := []string{
		"is_active = true",
		"publish_date >= $1",
	}
	args := []interface{}{freshnessCutoff}
	argPos := 2

	if len(topicTags) > 0 {
		whereClauses = append(whereClauses, fmt.Sprintf("topic_tags && $%d", argPos))
		args = append(args, pq.Array(topicTags))
		argPos++
	}

	whereClause := "WHERE " + whereClauses[0]
	for i := 1; i < len(whereClauses); i++ {
		whereClause += " AND " + whereClauses[i]
	}

	query := `
		SELECT
			id, source_id, article_id, title, url, summary, content,
			content_type, topic_tags, framework_tags, industry_tags,
			buyer_stage, partner_tags, author, publish_date,
			word_count, reading_time_minutes, image_url,
			trust_score, relevance_score, historical_ctr,
			historical_opens, historical_clicks, expires_at,
			is_active, indexed_at, created_at, updated_at
		FROM content_items
		` + whereClause + `
		ORDER BY
			relevance_score DESC,
			trust_score DESC,
			publish_date DESC
		LIMIT $` + fmt.Sprintf("%d", argPos)

	args = append(args, limit)

	rows, err := r.db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get fresh content: %w", err)
	}
	defer rows.Close()

	items := make([]*domain.ContentItem, 0)
	for rows.Next() {
		item := &domain.ContentItem{}
		var topicTagsResult, frameworkTags, industryTags, partnerTags []string

		err := rows.Scan(
			&item.ID,
			&item.SourceID,
			&item.ArticleID,
			&item.Title,
			&item.URL,
			&item.Summary,
			&item.Content,
			&item.ContentType,
			&topicTagsResult,
			&frameworkTags,
			&industryTags,
			&item.BuyerStage,
			&partnerTags,
			&item.Author,
			&item.PublishDate,
			&item.WordCount,
			&item.ReadingTimeMinutes,
			&item.ImageURL,
			&item.TrustScore,
			&item.RelevanceScore,
			&item.HistoricalCTR,
			&item.HistoricalOpens,
			&item.HistoricalClicks,
			&item.ExpiresAt,
			&item.IsActive,
			&item.IndexedAt,
			&item.CreatedAt,
			&item.UpdatedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan content item: %w", err)
		}

		item.TopicTags = topicTagsResult
		item.FrameworkTags = frameworkTags
		item.IndustryTags = industryTags
		item.PartnerTags = partnerTags

		items = append(items, item)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating content items: %w", err)
	}

	return items, nil
}
