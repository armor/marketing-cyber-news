package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/phillipboles/aci-backend/internal/domain"
	domainerrors "github.com/phillipboles/aci-backend/internal/domain/errors"
	"github.com/phillipboles/aci-backend/internal/repository"
)

// CompetitorContentRepo implements CompetitorContentRepository for PostgreSQL
type CompetitorContentRepo struct {
	db *sqlx.DB
}

// NewCompetitorContentRepo creates a new competitor content repository
func NewCompetitorContentRepo(db *sqlx.DB) repository.CompetitorContentRepository {
	if db == nil {
		panic("db cannot be nil")
	}

	return &CompetitorContentRepo{db: db}
}

// Create creates a new competitor content entry
func (r *CompetitorContentRepo) Create(ctx context.Context, content *domain.CompetitorContent) error {
	if content == nil {
		return fmt.Errorf("content cannot be nil")
	}

	if err := content.Validate(); err != nil {
		return fmt.Errorf("validation failed: %w", err)
	}

	query := `
		INSERT INTO competitor_content (
			id, competitor_id, channel, title, url, published_at, summary, engagement_metrics, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10
		)
	`

	now := time.Now()
	if content.ID == uuid.Nil {
		content.ID = uuid.New()
	}

	content.CreatedAt = now
	content.UpdatedAt = now

	// Serialize engagement metrics to JSON
	metricsJSON, err := json.Marshal(content.EngagementMetrics)
	if err != nil {
		return fmt.Errorf("failed to marshal engagement metrics: %w", err)
	}

	_, err = r.db.ExecContext(ctx, query,
		content.ID,
		content.CompetitorID,
		content.Channel,
		content.Title,
		content.URL,
		content.PublishedAt,
		content.Summary,
		metricsJSON,
		content.CreatedAt,
		content.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create competitor content: %w", err)
	}

	return nil
}

// GetByID retrieves competitor content by ID
func (r *CompetitorContentRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.CompetitorContent, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("id is required")
	}

	query := `
		SELECT id, competitor_id, channel, title, url, published_at, summary, engagement_metrics, created_at, updated_at
		FROM competitor_content
		WHERE id = $1
	`

	var content struct {
		ID                uuid.UUID
		CompetitorID      uuid.UUID `db:"competitor_id"`
		Channel           string
		Title             string
		URL               string
		PublishedAt       time.Time `db:"published_at"`
		Summary           *string
		EngagementMetrics []byte    `db:"engagement_metrics"`
		CreatedAt         time.Time `db:"created_at"`
		UpdatedAt         time.Time `db:"updated_at"`
	}

	err := r.db.GetContext(ctx, &content, query, id)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("competitor content not found: %w", domainerrors.ErrNotFound)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get competitor content: %w", err)
	}

	// Deserialize engagement metrics
	var metrics map[string]interface{}
	if len(content.EngagementMetrics) > 0 {
		if err := json.Unmarshal(content.EngagementMetrics, &metrics); err != nil {
			return nil, fmt.Errorf("failed to unmarshal engagement metrics: %w", err)
		}
	}

	return &domain.CompetitorContent{
		ID:                content.ID,
		CompetitorID:      content.CompetitorID,
		Channel:           content.Channel,
		Title:             content.Title,
		URL:               content.URL,
		PublishedAt:       content.PublishedAt,
		Summary:           content.Summary,
		EngagementMetrics: metrics,
		CreatedAt:         content.CreatedAt,
		UpdatedAt:         content.UpdatedAt,
	}, nil
}

// GetByURL retrieves competitor content by URL
func (r *CompetitorContentRepo) GetByURL(ctx context.Context, url string) (*domain.CompetitorContent, error) {
	if url == "" {
		return nil, fmt.Errorf("url is required")
	}

	query := `
		SELECT id, competitor_id, channel, title, url, published_at, summary, engagement_metrics, created_at, updated_at
		FROM competitor_content
		WHERE url = $1
	`

	var content struct {
		ID                uuid.UUID
		CompetitorID      uuid.UUID `db:"competitor_id"`
		Channel           string
		Title             string
		URL               string
		PublishedAt       time.Time `db:"published_at"`
		Summary           *string
		EngagementMetrics []byte    `db:"engagement_metrics"`
		CreatedAt         time.Time `db:"created_at"`
		UpdatedAt         time.Time `db:"updated_at"`
	}

	err := r.db.GetContext(ctx, &content, query, url)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("competitor content not found: %w", domainerrors.ErrNotFound)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get competitor content by URL: %w", err)
	}

	var metrics map[string]interface{}
	if len(content.EngagementMetrics) > 0 {
		if err := json.Unmarshal(content.EngagementMetrics, &metrics); err != nil {
			return nil, fmt.Errorf("failed to unmarshal engagement metrics: %w", err)
		}
	}

	return &domain.CompetitorContent{
		ID:                content.ID,
		CompetitorID:      content.CompetitorID,
		Channel:           content.Channel,
		Title:             content.Title,
		URL:               content.URL,
		PublishedAt:       content.PublishedAt,
		Summary:           content.Summary,
		EngagementMetrics: metrics,
		CreatedAt:         content.CreatedAt,
		UpdatedAt:         content.UpdatedAt,
	}, nil
}

// GetByCompetitorID retrieves recent content for a competitor
func (r *CompetitorContentRepo) GetByCompetitorID(ctx context.Context, competitorID uuid.UUID, limit int) ([]*domain.CompetitorContent, error) {
	if competitorID == uuid.Nil {
		return nil, fmt.Errorf("competitor_id is required")
	}

	if limit <= 0 {
		limit = 50
	}

	query := `
		SELECT id, competitor_id, channel, title, url, published_at, summary, engagement_metrics, created_at, updated_at
		FROM competitor_content
		WHERE competitor_id = $1
		ORDER BY published_at DESC
		LIMIT $2
	`

	return r.selectContent(ctx, query, competitorID, limit)
}

// List retrieves competitor content with optional filtering
func (r *CompetitorContentRepo) List(ctx context.Context, filter *domain.CompetitorContentFilter) ([]*domain.CompetitorContent, int, error) {
	if filter == nil {
		filter = &domain.CompetitorContentFilter{}
	}

	if filter.Limit <= 0 {
		filter.Limit = 50
	}
	if filter.Offset < 0 {
		filter.Offset = 0
	}

	query := `
		SELECT id, competitor_id, channel, title, url, published_at, summary, engagement_metrics, created_at, updated_at
		FROM competitor_content
		WHERE 1=1
	`
	countQuery := `SELECT COUNT(*) FROM competitor_content WHERE 1=1`
	args := []interface{}{}
	argPos := 1

	if filter.CompetitorID != nil {
		query += fmt.Sprintf(" AND competitor_id = $%d", argPos)
		countQuery += fmt.Sprintf(" AND competitor_id = $%d", argPos)
		args = append(args, *filter.CompetitorID)
		argPos++
	}

	if filter.Channel != nil {
		query += fmt.Sprintf(" AND channel = $%d", argPos)
		countQuery += fmt.Sprintf(" AND channel = $%d", argPos)
		args = append(args, *filter.Channel)
		argPos++
	}

	if filter.After != nil {
		query += fmt.Sprintf(" AND published_at >= $%d", argPos)
		countQuery += fmt.Sprintf(" AND published_at >= $%d", argPos)
		args = append(args, *filter.After)
		argPos++
	}

	if filter.Before != nil {
		query += fmt.Sprintf(" AND published_at <= $%d", argPos)
		countQuery += fmt.Sprintf(" AND published_at <= $%d", argPos)
		args = append(args, *filter.Before)
		argPos++
	}

	var total int
	err := r.db.GetContext(ctx, &total, countQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count competitor content: %w", err)
	}

	query += " ORDER BY published_at DESC"
	query += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argPos, argPos+1)
	args = append(args, filter.Limit, filter.Offset)

	content, err := r.selectContent(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}

	return content, total, nil
}

// Update updates competitor content
func (r *CompetitorContentRepo) Update(ctx context.Context, content *domain.CompetitorContent) error {
	if content == nil {
		return fmt.Errorf("content cannot be nil")
	}

	if content.ID == uuid.Nil {
		return fmt.Errorf("content ID is required")
	}

	if err := content.Validate(); err != nil {
		return fmt.Errorf("validation failed: %w", err)
	}

	query := `
		UPDATE competitor_content
		SET title = $1, summary = $2, engagement_metrics = $3, updated_at = $4
		WHERE id = $5
	`

	content.UpdatedAt = time.Now()

	metricsJSON, err := json.Marshal(content.EngagementMetrics)
	if err != nil {
		return fmt.Errorf("failed to marshal engagement metrics: %w", err)
	}

	result, err := r.db.ExecContext(ctx, query,
		content.Title,
		content.Summary,
		metricsJSON,
		content.UpdatedAt,
		content.ID,
	)

	if err != nil {
		return fmt.Errorf("failed to update competitor content: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("competitor content not found: %w", domainerrors.ErrNotFound)
	}

	return nil
}

// Delete deletes competitor content
func (r *CompetitorContentRepo) Delete(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("id is required")
	}

	query := `DELETE FROM competitor_content WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete competitor content: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("competitor content not found: %w", domainerrors.ErrNotFound)
	}

	return nil
}

// GetRecentContent retrieves content published since a specific time
func (r *CompetitorContentRepo) GetRecentContent(ctx context.Context, competitorID uuid.UUID, since time.Time) ([]*domain.CompetitorContent, error) {
	if competitorID == uuid.Nil {
		return nil, fmt.Errorf("competitor_id is required")
	}

	query := `
		SELECT id, competitor_id, channel, title, url, published_at, summary, engagement_metrics, created_at, updated_at
		FROM competitor_content
		WHERE competitor_id = $1 AND published_at >= $2
		ORDER BY published_at DESC
	`

	return r.selectContent(ctx, query, competitorID, since)
}

// GetContentStats calculates competitor content statistics
func (r *CompetitorContentRepo) GetContentStats(ctx context.Context, competitorID uuid.UUID, periodDays int) (*domain.CompetitorAnalysis, error) {
	if competitorID == uuid.Nil {
		return nil, fmt.Errorf("competitor_id is required")
	}

	if periodDays <= 0 {
		periodDays = 30
	}

	since := time.Now().AddDate(0, 0, -periodDays)

	query := `
		SELECT
			COUNT(*) as content_count,
			ARRAY_AGG(DISTINCT channel) as channels
		FROM competitor_content
		WHERE competitor_id = $1 AND published_at >= $2
	`

	var stats struct {
		ContentCount int
		Channels     []string
	}

	err := r.db.GetContext(ctx, &stats, query, competitorID, since)
	if err != nil {
		return nil, fmt.Errorf("failed to get content stats: %w", err)
	}

	avgFrequency := float64(stats.ContentCount) / float64(periodDays)

	analysis := &domain.CompetitorAnalysis{
		CompetitorID:        competitorID,
		ContentCount:        stats.ContentCount,
		AvgPostingFrequency: avgFrequency,
		TopTopics:           []string{},
		EngagementTrends:    make(map[string]interface{}),
		LastAnalyzedAt:      time.Now(),
		PeriodDays:          periodDays,
	}

	return analysis, nil
}

// selectContent is a helper function to query and deserialize content
func (r *CompetitorContentRepo) selectContent(ctx context.Context, query string, args ...interface{}) ([]*domain.CompetitorContent, error) {
	rows, err := r.db.QueryxContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query competitor content: %w", err)
	}
	defer rows.Close()

	var contentList []*domain.CompetitorContent

	for rows.Next() {
		var content struct {
			ID                uuid.UUID
			CompetitorID      uuid.UUID `db:"competitor_id"`
			Channel           string
			Title             string
			URL               string
			PublishedAt       time.Time `db:"published_at"`
			Summary           *string
			EngagementMetrics []byte    `db:"engagement_metrics"`
			CreatedAt         time.Time `db:"created_at"`
			UpdatedAt         time.Time `db:"updated_at"`
		}

		if err := rows.StructScan(&content); err != nil {
			return nil, fmt.Errorf("failed to scan competitor content: %w", err)
		}

		var metrics map[string]interface{}
		if len(content.EngagementMetrics) > 0 {
			if err := json.Unmarshal(content.EngagementMetrics, &metrics); err != nil {
				return nil, fmt.Errorf("failed to unmarshal engagement metrics: %w", err)
			}
		}

		contentList = append(contentList, &domain.CompetitorContent{
			ID:                content.ID,
			CompetitorID:      content.CompetitorID,
			Channel:           content.Channel,
			Title:             content.Title,
			URL:               content.URL,
			PublishedAt:       content.PublishedAt,
			Summary:           content.Summary,
			EngagementMetrics: metrics,
			CreatedAt:         content.CreatedAt,
			UpdatedAt:         content.UpdatedAt,
		})
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}

	return contentList, nil
}
