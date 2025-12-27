package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/lib/pq"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/repository"
)

type contentSourceRepository struct {
	db *DB
}

// NewContentSourceRepository creates a new PostgreSQL content source repository
func NewContentSourceRepository(db *DB) repository.ContentSourceRepository {
	if db == nil {
		panic("database cannot be nil")
	}
	return &contentSourceRepository{db: db}
}

// Create creates a new content source
func (r *contentSourceRepository) Create(ctx context.Context, source *domain.ContentSource) error {
	if source == nil {
		return fmt.Errorf("content source cannot be nil")
	}

	if err := source.Validate(); err != nil {
		return fmt.Errorf("invalid content source: %w", err)
	}

	apiConfigJSON, err := json.Marshal(source.APIConfig)
	if err != nil {
		return fmt.Errorf("failed to marshal api_config: %w", err)
	}

	query := `
		INSERT INTO content_sources (
			id, name, description, source_type, feed_url, api_config,
			default_content_type, default_topic_tags, default_framework_tags,
			trust_score, min_trust_threshold, freshness_days,
			poll_interval_minutes, last_polled_at, last_success_at,
			error_count, last_error, is_active, is_internal,
			created_by, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
	`

	_, err = r.db.Pool.Exec(ctx, query,
		source.ID,
		source.Name,
		source.Description,
		source.SourceType,
		source.FeedURL,
		apiConfigJSON,
		source.DefaultContentType,
		pq.Array(source.DefaultTopicTags),
		pq.Array(source.DefaultFrameworkTags),
		source.TrustScore,
		source.MinTrustThreshold,
		source.FreshnessDays,
		source.PollIntervalMinutes,
		source.LastPolledAt,
		source.LastSuccessAt,
		source.ErrorCount,
		source.LastError,
		source.IsActive,
		source.IsInternal,
		source.CreatedBy,
		source.CreatedAt,
		source.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create content source: %w", err)
	}

	return nil
}

// GetByID retrieves a content source by ID
func (r *contentSourceRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.ContentSource, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("content source ID cannot be nil")
	}

	query := `
		SELECT
			id, name, description, source_type, feed_url, api_config,
			default_content_type, default_topic_tags, default_framework_tags,
			trust_score, min_trust_threshold, freshness_days,
			poll_interval_minutes, last_polled_at, last_success_at,
			error_count, last_error, is_active, is_internal,
			created_by, created_at, updated_at
		FROM content_sources
		WHERE id = $1
	`

	source := &domain.ContentSource{}
	var apiConfigJSON []byte
	var defaultTopicTags, defaultFrameworkTags []string

	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&source.ID,
		&source.Name,
		&source.Description,
		&source.SourceType,
		&source.FeedURL,
		&apiConfigJSON,
		&source.DefaultContentType,
		&defaultTopicTags,
		&defaultFrameworkTags,
		&source.TrustScore,
		&source.MinTrustThreshold,
		&source.FreshnessDays,
		&source.PollIntervalMinutes,
		&source.LastPolledAt,
		&source.LastSuccessAt,
		&source.ErrorCount,
		&source.LastError,
		&source.IsActive,
		&source.IsInternal,
		&source.CreatedBy,
		&source.CreatedAt,
		&source.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("content source not found: %w", err)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get content source: %w", err)
	}

	source.DefaultTopicTags = defaultTopicTags
	source.DefaultFrameworkTags = defaultFrameworkTags

	if err := json.Unmarshal(apiConfigJSON, &source.APIConfig); err != nil {
		return nil, fmt.Errorf("failed to unmarshal api_config: %w", err)
	}

	return source, nil
}

// List retrieves content sources with filtering and pagination
func (r *contentSourceRepository) List(ctx context.Context, filter *domain.ContentSourceFilter) ([]*domain.ContentSource, int, error) {
	if filter == nil {
		return nil, 0, fmt.Errorf("filter cannot be nil")
	}

	// Build WHERE clauses dynamically
	whereClauses := []string{}
	args := []interface{}{}
	argPos := 1

	if filter.SourceType != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("source_type = $%d", argPos))
		args = append(args, *filter.SourceType)
		argPos++
	}

	if filter.IsActive != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("is_active = $%d", argPos))
		args = append(args, *filter.IsActive)
		argPos++
	}

	if filter.IsInternal != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("is_internal = $%d", argPos))
		args = append(args, *filter.IsInternal)
		argPos++
	}

	if filter.CreatedBy != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("created_by = $%d", argPos))
		args = append(args, *filter.CreatedBy)
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
	countQuery := "SELECT COUNT(*) FROM content_sources " + whereClause
	var total int
	err := r.db.Pool.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count content sources: %w", err)
	}

	// Query with pagination
	query := `
		SELECT
			id, name, description, source_type, feed_url, api_config,
			default_content_type, default_topic_tags, default_framework_tags,
			trust_score, min_trust_threshold, freshness_days,
			poll_interval_minutes, last_polled_at, last_success_at,
			error_count, last_error, is_active, is_internal,
			created_by, created_at, updated_at
		FROM content_sources
		` + whereClause + `
		ORDER BY created_at DESC
		LIMIT $` + fmt.Sprintf("%d", argPos) + ` OFFSET $` + fmt.Sprintf("%d", argPos+1)

	args = append(args, filter.Limit, filter.Offset)

	rows, err := r.db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list content sources: %w", err)
	}
	defer rows.Close()

	sources := make([]*domain.ContentSource, 0)
	for rows.Next() {
		source := &domain.ContentSource{}
		var apiConfigJSON []byte
		var defaultTopicTags, defaultFrameworkTags []string

		err := rows.Scan(
			&source.ID,
			&source.Name,
			&source.Description,
			&source.SourceType,
			&source.FeedURL,
			&apiConfigJSON,
			&source.DefaultContentType,
			&defaultTopicTags,
			&defaultFrameworkTags,
			&source.TrustScore,
			&source.MinTrustThreshold,
			&source.FreshnessDays,
			&source.PollIntervalMinutes,
			&source.LastPolledAt,
			&source.LastSuccessAt,
			&source.ErrorCount,
			&source.LastError,
			&source.IsActive,
			&source.IsInternal,
			&source.CreatedBy,
			&source.CreatedAt,
			&source.UpdatedAt,
		)

		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan content source: %w", err)
		}

		source.DefaultTopicTags = defaultTopicTags
		source.DefaultFrameworkTags = defaultFrameworkTags

		if err := json.Unmarshal(apiConfigJSON, &source.APIConfig); err != nil {
			return nil, 0, fmt.Errorf("failed to unmarshal api_config: %w", err)
		}

		sources = append(sources, source)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating content sources: %w", err)
	}

	return sources, total, nil
}

// Update updates an existing content source
func (r *contentSourceRepository) Update(ctx context.Context, source *domain.ContentSource) error {
	if source == nil {
		return fmt.Errorf("content source cannot be nil")
	}

	if err := source.Validate(); err != nil {
		return fmt.Errorf("invalid content source: %w", err)
	}

	apiConfigJSON, err := json.Marshal(source.APIConfig)
	if err != nil {
		return fmt.Errorf("failed to marshal api_config: %w", err)
	}

	query := `
		UPDATE content_sources
		SET
			name = $2,
			description = $3,
			source_type = $4,
			feed_url = $5,
			api_config = $6,
			default_content_type = $7,
			default_topic_tags = $8,
			default_framework_tags = $9,
			trust_score = $10,
			min_trust_threshold = $11,
			freshness_days = $12,
			poll_interval_minutes = $13,
			is_active = $14,
			is_internal = $15,
			updated_at = $16
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query,
		source.ID,
		source.Name,
		source.Description,
		source.SourceType,
		source.FeedURL,
		apiConfigJSON,
		source.DefaultContentType,
		pq.Array(source.DefaultTopicTags),
		pq.Array(source.DefaultFrameworkTags),
		source.TrustScore,
		source.MinTrustThreshold,
		source.FreshnessDays,
		source.PollIntervalMinutes,
		source.IsActive,
		source.IsInternal,
		source.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to update content source: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("content source not found")
	}

	return nil
}

// Delete deletes a content source by ID
func (r *contentSourceRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("content source ID cannot be nil")
	}

	query := `DELETE FROM content_sources WHERE id = $1`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete content source: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("content source not found")
	}

	return nil
}

// GetActiveSources retrieves all active content sources for polling
func (r *contentSourceRepository) GetActiveSources(ctx context.Context) ([]*domain.ContentSource, error) {
	query := `
		SELECT
			id, name, description, source_type, feed_url, api_config,
			default_content_type, default_topic_tags, default_framework_tags,
			trust_score, min_trust_threshold, freshness_days,
			poll_interval_minutes, last_polled_at, last_success_at,
			error_count, last_error, is_active, is_internal,
			created_by, created_at, updated_at
		FROM content_sources
		WHERE is_active = true
		ORDER BY last_polled_at NULLS FIRST, created_at ASC
	`

	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get active content sources: %w", err)
	}
	defer rows.Close()

	sources := make([]*domain.ContentSource, 0)
	for rows.Next() {
		source := &domain.ContentSource{}
		var apiConfigJSON []byte
		var defaultTopicTags, defaultFrameworkTags []string

		err := rows.Scan(
			&source.ID,
			&source.Name,
			&source.Description,
			&source.SourceType,
			&source.FeedURL,
			&apiConfigJSON,
			&source.DefaultContentType,
			&defaultTopicTags,
			&defaultFrameworkTags,
			&source.TrustScore,
			&source.MinTrustThreshold,
			&source.FreshnessDays,
			&source.PollIntervalMinutes,
			&source.LastPolledAt,
			&source.LastSuccessAt,
			&source.ErrorCount,
			&source.LastError,
			&source.IsActive,
			&source.IsInternal,
			&source.CreatedBy,
			&source.CreatedAt,
			&source.UpdatedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan content source: %w", err)
		}

		source.DefaultTopicTags = defaultTopicTags
		source.DefaultFrameworkTags = defaultFrameworkTags

		if err := json.Unmarshal(apiConfigJSON, &source.APIConfig); err != nil {
			return nil, fmt.Errorf("failed to unmarshal api_config: %w", err)
		}

		sources = append(sources, source)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating content sources: %w", err)
	}

	return sources, nil
}

// UpdateLastPolled updates the polling status for a content source
func (r *contentSourceRepository) UpdateLastPolled(ctx context.Context, id uuid.UUID, polledAt time.Time, success bool, errorMsg *string) error {
	if id == uuid.Nil {
		return fmt.Errorf("content source ID cannot be nil")
	}

	var query string
	var args []interface{}

	if success {
		query = `
			UPDATE content_sources
			SET
				last_polled_at = $2,
				last_success_at = $2,
				error_count = 0,
				last_error = NULL,
				updated_at = $3
			WHERE id = $1
		`
		args = []interface{}{id, polledAt, time.Now()}
	} else {
		query = `
			UPDATE content_sources
			SET
				last_polled_at = $2,
				error_count = error_count + 1,
				last_error = $3,
				updated_at = $4
			WHERE id = $1
		`
		args = []interface{}{id, polledAt, errorMsg, time.Now()}
	}

	cmdTag, err := r.db.Pool.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("failed to update last polled: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("content source not found")
	}

	return nil
}
