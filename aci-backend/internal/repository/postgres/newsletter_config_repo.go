package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/repository"
)

type newsletterConfigRepository struct {
	db *DB
}

// NewNewsletterConfigRepository creates a new PostgreSQL newsletter configuration repository
func NewNewsletterConfigRepository(db *DB) repository.NewsletterConfigRepository {
	if db == nil {
		panic("database cannot be nil")
	}
	return &newsletterConfigRepository{db: db}
}

// Create creates a new newsletter configuration
func (r *newsletterConfigRepository) Create(ctx context.Context, config *domain.NewsletterConfiguration) error {
	if config == nil {
		return fmt.Errorf("newsletter configuration cannot be nil")
	}

	if err := config.Validate(); err != nil {
		return fmt.Errorf("invalid newsletter configuration: %w", err)
	}

	// Ensure banned_phrases is not nil for TEXT[] column
	bannedPhrases := config.BannedPhrases
	if bannedPhrases == nil {
		bannedPhrases = []string{}
	}

	query := `
		INSERT INTO newsletter_configurations (
			id, name, description, segment_id,
			cadence, send_day_of_week, send_time_utc, timezone,
			max_blocks, education_ratio_min, content_freshness_days,
			hero_topic_priority, framework_focus,
			subject_line_style, max_metaphors, banned_phrases,
			approval_tier, risk_level,
			ai_provider, ai_model, prompt_version,
			is_active, created_by, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
	`

	_, err := r.db.Pool.Exec(ctx, query,
		config.ID,
		config.Name,
		config.Description,
		config.SegmentID,
		config.Cadence,
		config.SendDayOfWeek,
		config.SendTimeUTC,
		config.Timezone,
		config.MaxBlocks,
		config.EducationRatioMin,
		config.ContentFreshnessDays,
		config.HeroTopicPriority,
		config.FrameworkFocus,
		config.SubjectLineStyle,
		config.MaxMetaphors,
		bannedPhrases,
		config.ApprovalTier,
		config.RiskLevel,
		config.AIProvider,
		config.AIModel,
		config.PromptVersion,
		config.IsActive,
		config.CreatedBy,
		config.CreatedAt,
		config.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create newsletter configuration: %w", err)
	}

	return nil
}

// GetByID retrieves a newsletter configuration by ID
func (r *newsletterConfigRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.NewsletterConfiguration, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("newsletter configuration ID cannot be nil")
	}

	query := `
		SELECT
			id, name, description, segment_id,
			cadence, send_day_of_week, send_time_utc, timezone,
			max_blocks, education_ratio_min, content_freshness_days,
			hero_topic_priority, framework_focus,
			subject_line_style, max_metaphors, banned_phrases,
			approval_tier, risk_level,
			ai_provider, ai_model, prompt_version,
			is_active, created_by, created_at, updated_at
		FROM newsletter_configurations
		WHERE id = $1
	`

	config := &domain.NewsletterConfiguration{}

	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&config.ID,
		&config.Name,
		&config.Description,
		&config.SegmentID,
		&config.Cadence,
		&config.SendDayOfWeek,
		&config.SendTimeUTC,
		&config.Timezone,
		&config.MaxBlocks,
		&config.EducationRatioMin,
		&config.ContentFreshnessDays,
		&config.HeroTopicPriority,
		&config.FrameworkFocus,
		&config.SubjectLineStyle,
		&config.MaxMetaphors,
		&config.BannedPhrases,
		&config.ApprovalTier,
		&config.RiskLevel,
		&config.AIProvider,
		&config.AIModel,
		&config.PromptVersion,
		&config.IsActive,
		&config.CreatedBy,
		&config.CreatedAt,
		&config.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("newsletter configuration not found: %w", err)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get newsletter configuration: %w", err)
	}

	return config, nil
}

// List retrieves newsletter configurations with filtering and pagination
func (r *newsletterConfigRepository) List(ctx context.Context, filter *domain.NewsletterConfigFilter) ([]*domain.NewsletterConfiguration, int, error) {
	if filter == nil {
		return nil, 0, fmt.Errorf("filter cannot be nil")
	}

	if err := filter.Validate(); err != nil {
		return nil, 0, fmt.Errorf("invalid filter: %w", err)
	}

	// Build WHERE clauses dynamically
	whereClauses := []string{}
	args := []interface{}{}
	argPos := 1

	if filter.SegmentID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("segment_id = $%d", argPos))
		args = append(args, *filter.SegmentID)
		argPos++
	}

	if filter.IsActive != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("is_active = $%d", argPos))
		args = append(args, *filter.IsActive)
		argPos++
	}

	if filter.Cadence != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("cadence = $%d", argPos))
		args = append(args, *filter.Cadence)
		argPos++
	}

	if filter.RiskLevel != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("risk_level = $%d", argPos))
		args = append(args, *filter.RiskLevel)
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
	countQuery := "SELECT COUNT(*) FROM newsletter_configurations " + whereClause
	var total int
	err := r.db.Pool.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count newsletter configurations: %w", err)
	}

	// Query with pagination
	query := `
		SELECT
			id, name, description, segment_id,
			cadence, send_day_of_week, send_time_utc, timezone,
			max_blocks, education_ratio_min, content_freshness_days,
			hero_topic_priority, framework_focus,
			subject_line_style, max_metaphors, banned_phrases,
			approval_tier, risk_level,
			ai_provider, ai_model, prompt_version,
			is_active, created_by, created_at, updated_at
		FROM newsletter_configurations
		` + whereClause + `
		ORDER BY created_at DESC
		LIMIT $` + fmt.Sprintf("%d", argPos) + ` OFFSET $` + fmt.Sprintf("%d", argPos+1)

	args = append(args, filter.Limit, filter.Offset())

	rows, err := r.db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list newsletter configurations: %w", err)
	}
	defer rows.Close()

	configs := make([]*domain.NewsletterConfiguration, 0)
	for rows.Next() {
		config := &domain.NewsletterConfiguration{}

		err := rows.Scan(
			&config.ID,
			&config.Name,
			&config.Description,
			&config.SegmentID,
			&config.Cadence,
			&config.SendDayOfWeek,
			&config.SendTimeUTC,
			&config.Timezone,
			&config.MaxBlocks,
			&config.EducationRatioMin,
			&config.ContentFreshnessDays,
			&config.HeroTopicPriority,
			&config.FrameworkFocus,
			&config.SubjectLineStyle,
			&config.MaxMetaphors,
			&config.BannedPhrases,
			&config.ApprovalTier,
			&config.RiskLevel,
			&config.AIProvider,
			&config.AIModel,
			&config.PromptVersion,
			&config.IsActive,
			&config.CreatedBy,
			&config.CreatedAt,
			&config.UpdatedAt,
		)

		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan newsletter configuration: %w", err)
		}

		configs = append(configs, config)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating newsletter configurations: %w", err)
	}

	return configs, total, nil
}

// Update updates an existing newsletter configuration
func (r *newsletterConfigRepository) Update(ctx context.Context, config *domain.NewsletterConfiguration) error {
	if config == nil {
		return fmt.Errorf("newsletter configuration cannot be nil")
	}

	if err := config.Validate(); err != nil {
		return fmt.Errorf("invalid newsletter configuration: %w", err)
	}

	// Ensure banned_phrases is not nil for TEXT[] column
	bannedPhrases := config.BannedPhrases
	if bannedPhrases == nil {
		bannedPhrases = []string{}
	}

	query := `
		UPDATE newsletter_configurations
		SET
			name = $2,
			description = $3,
			segment_id = $4,
			cadence = $5,
			send_day_of_week = $6,
			send_time_utc = $7,
			timezone = $8,
			max_blocks = $9,
			education_ratio_min = $10,
			content_freshness_days = $11,
			hero_topic_priority = $12,
			framework_focus = $13,
			subject_line_style = $14,
			max_metaphors = $15,
			banned_phrases = $16,
			approval_tier = $17,
			risk_level = $18,
			ai_provider = $19,
			ai_model = $20,
			prompt_version = $21,
			is_active = $22,
			updated_at = $23
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query,
		config.ID,
		config.Name,
		config.Description,
		config.SegmentID,
		config.Cadence,
		config.SendDayOfWeek,
		config.SendTimeUTC,
		config.Timezone,
		config.MaxBlocks,
		config.EducationRatioMin,
		config.ContentFreshnessDays,
		config.HeroTopicPriority,
		config.FrameworkFocus,
		config.SubjectLineStyle,
		config.MaxMetaphors,
		bannedPhrases,
		config.ApprovalTier,
		config.RiskLevel,
		config.AIProvider,
		config.AIModel,
		config.PromptVersion,
		config.IsActive,
		config.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to update newsletter configuration: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("newsletter configuration not found")
	}

	return nil
}

// Delete deletes a newsletter configuration by ID
func (r *newsletterConfigRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("newsletter configuration ID cannot be nil")
	}

	query := `DELETE FROM newsletter_configurations WHERE id = $1`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete newsletter configuration: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("newsletter configuration not found")
	}

	return nil
}

// GetBySegmentID retrieves all newsletter configurations for a segment
func (r *newsletterConfigRepository) GetBySegmentID(ctx context.Context, segmentID uuid.UUID) ([]*domain.NewsletterConfiguration, error) {
	if segmentID == uuid.Nil {
		return nil, fmt.Errorf("segment ID cannot be nil")
	}

	query := `
		SELECT
			id, name, description, segment_id,
			cadence, send_day_of_week, send_time_utc, timezone,
			max_blocks, education_ratio_min, content_freshness_days,
			hero_topic_priority, framework_focus,
			subject_line_style, max_metaphors, banned_phrases,
			approval_tier, risk_level,
			ai_provider, ai_model, prompt_version,
			is_active, created_by, created_at, updated_at
		FROM newsletter_configurations
		WHERE segment_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.Pool.Query(ctx, query, segmentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get newsletter configurations by segment: %w", err)
	}
	defer rows.Close()

	configs := make([]*domain.NewsletterConfiguration, 0)
	for rows.Next() {
		config := &domain.NewsletterConfiguration{}

		err := rows.Scan(
			&config.ID,
			&config.Name,
			&config.Description,
			&config.SegmentID,
			&config.Cadence,
			&config.SendDayOfWeek,
			&config.SendTimeUTC,
			&config.Timezone,
			&config.MaxBlocks,
			&config.EducationRatioMin,
			&config.ContentFreshnessDays,
			&config.HeroTopicPriority,
			&config.FrameworkFocus,
			&config.SubjectLineStyle,
			&config.MaxMetaphors,
			&config.BannedPhrases,
			&config.ApprovalTier,
			&config.RiskLevel,
			&config.AIProvider,
			&config.AIModel,
			&config.PromptVersion,
			&config.IsActive,
			&config.CreatedBy,
			&config.CreatedAt,
			&config.UpdatedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan newsletter configuration: %w", err)
		}

		configs = append(configs, config)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating newsletter configurations: %w", err)
	}

	return configs, nil
}
