package postgres

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/repository"
)

type segmentRepository struct {
	db *DB
}

// NewSegmentRepository creates a new PostgreSQL segment repository
func NewSegmentRepository(db *DB) repository.SegmentRepository {
	if db == nil {
		panic("database cannot be nil")
	}
	return &segmentRepository{db: db}
}

// ensureSlice ensures a slice is not nil for TEXT[] columns
func ensureSlice(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}

// Create creates a new segment
func (r *segmentRepository) Create(ctx context.Context, segment *domain.Segment) error {
	if segment == nil {
		return fmt.Errorf("segment cannot be nil")
	}

	if err := segment.Validate(); err != nil {
		return fmt.Errorf("invalid segment: %w", err)
	}

	query := `
		INSERT INTO segments (
			id, name, description, role_cluster,
			industries, regions, company_size_bands, compliance_frameworks, partner_tags,
			min_engagement_score, topic_interests,
			exclude_unsubscribed, exclude_bounced, exclude_high_touch,
			max_newsletters_per_30_days,
			contact_count, is_active, created_by, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
	`

	_, err := r.db.Pool.Exec(ctx, query,
		segment.ID,
		segment.Name,
		segment.Description,
		segment.RoleCluster,
		ensureSlice(segment.Industries),
		ensureSlice(segment.Regions),
		ensureSlice(segment.CompanySizeBands),
		ensureSlice(segment.ComplianceFrameworks),
		ensureSlice(segment.PartnerTags),
		segment.MinEngagementScore,
		ensureSlice(segment.TopicInterests),
		segment.ExcludeUnsubscribed,
		segment.ExcludeBounced,
		segment.ExcludeHighTouch,
		segment.MaxNewslettersPer30Days,
		segment.ContactCount,
		segment.IsActive,
		segment.CreatedBy,
		segment.CreatedAt,
		segment.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create segment: %w", err)
	}

	return nil
}

// GetByID retrieves a segment by ID
func (r *segmentRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Segment, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("segment ID cannot be nil")
	}

	query := `
		SELECT
			id, name, description, role_cluster,
			industries, regions, company_size_bands, compliance_frameworks, partner_tags,
			min_engagement_score, topic_interests,
			exclude_unsubscribed, exclude_bounced, exclude_high_touch,
			max_newsletters_per_30_days,
			contact_count, is_active, created_by, created_at, updated_at
		FROM segments
		WHERE id = $1
	`

	segment := &domain.Segment{}
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&segment.ID,
		&segment.Name,
		&segment.Description,
		&segment.RoleCluster,
		&segment.Industries,
		&segment.Regions,
		&segment.CompanySizeBands,
		&segment.ComplianceFrameworks,
		&segment.PartnerTags,
		&segment.MinEngagementScore,
		&segment.TopicInterests,
		&segment.ExcludeUnsubscribed,
		&segment.ExcludeBounced,
		&segment.ExcludeHighTouch,
		&segment.MaxNewslettersPer30Days,
		&segment.ContactCount,
		&segment.IsActive,
		&segment.CreatedBy,
		&segment.CreatedAt,
		&segment.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("segment not found: %w", err)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get segment: %w", err)
	}

	return segment, nil
}

// List retrieves segments with filtering and pagination
func (r *segmentRepository) List(ctx context.Context, filter *domain.SegmentFilter) ([]*domain.Segment, int, error) {
	if filter == nil {
		return nil, 0, fmt.Errorf("filter cannot be nil")
	}

	if filter.Limit <= 0 {
		filter.Limit = 10
	}

	if filter.Offset < 0 {
		filter.Offset = 0
	}

	// Build WHERE clause
	whereClauses := make([]string, 0)
	args := make([]interface{}, 0)
	argPos := 1

	if filter.IsActive != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("is_active = $%d", argPos))
		args = append(args, *filter.IsActive)
		argPos++
	}

	if filter.CreatedBy != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("created_by = $%d", argPos))
		args = append(args, *filter.CreatedBy)
		argPos++
	}

	if filter.Search != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("(name ILIKE $%d OR description ILIKE $%d)", argPos, argPos))
		args = append(args, "%"+filter.Search+"%")
		argPos++
	}

	whereClause := ""
	if len(whereClauses) > 0 {
		whereClause = "WHERE " + strings.Join(whereClauses, " AND ")
	}

	// Get total count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM segments %s", whereClause)
	var total int
	err := r.db.Pool.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get segment count: %w", err)
	}

	// Get segments with pagination
	query := fmt.Sprintf(`
		SELECT
			id, name, description, role_cluster,
			industries, regions, company_size_bands, compliance_frameworks, partner_tags,
			min_engagement_score, topic_interests,
			exclude_unsubscribed, exclude_bounced, exclude_high_touch,
			max_newsletters_per_30_days,
			contact_count, is_active, created_by, created_at, updated_at
		FROM segments
		%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argPos, argPos+1)

	args = append(args, filter.Limit, filter.Offset)

	rows, err := r.db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list segments: %w", err)
	}
	defer rows.Close()

	segments := make([]*domain.Segment, 0)
	for rows.Next() {
		segment := &domain.Segment{}
		err := rows.Scan(
			&segment.ID,
			&segment.Name,
			&segment.Description,
			&segment.RoleCluster,
			&segment.Industries,
			&segment.Regions,
			&segment.CompanySizeBands,
			&segment.ComplianceFrameworks,
			&segment.PartnerTags,
			&segment.MinEngagementScore,
			&segment.TopicInterests,
			&segment.ExcludeUnsubscribed,
			&segment.ExcludeBounced,
			&segment.ExcludeHighTouch,
			&segment.MaxNewslettersPer30Days,
			&segment.ContactCount,
			&segment.IsActive,
			&segment.CreatedBy,
			&segment.CreatedAt,
			&segment.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan segment: %w", err)
		}

		segments = append(segments, segment)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating segments: %w", err)
	}

	return segments, total, nil
}

// Update updates an existing segment
func (r *segmentRepository) Update(ctx context.Context, segment *domain.Segment) error {
	if segment == nil {
		return fmt.Errorf("segment cannot be nil")
	}

	if err := segment.Validate(); err != nil {
		return fmt.Errorf("invalid segment: %w", err)
	}

	query := `
		UPDATE segments
		SET
			name = $2,
			description = $3,
			role_cluster = $4,
			industries = $5,
			regions = $6,
			company_size_bands = $7,
			compliance_frameworks = $8,
			partner_tags = $9,
			min_engagement_score = $10,
			topic_interests = $11,
			exclude_unsubscribed = $12,
			exclude_bounced = $13,
			exclude_high_touch = $14,
			max_newsletters_per_30_days = $15,
			is_active = $16,
			updated_at = $17
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query,
		segment.ID,
		segment.Name,
		segment.Description,
		segment.RoleCluster,
		ensureSlice(segment.Industries),
		ensureSlice(segment.Regions),
		ensureSlice(segment.CompanySizeBands),
		ensureSlice(segment.ComplianceFrameworks),
		ensureSlice(segment.PartnerTags),
		segment.MinEngagementScore,
		ensureSlice(segment.TopicInterests),
		segment.ExcludeUnsubscribed,
		segment.ExcludeBounced,
		segment.ExcludeHighTouch,
		segment.MaxNewslettersPer30Days,
		segment.IsActive,
		segment.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to update segment: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("segment not found")
	}

	return nil
}

// Delete deletes a segment by ID
func (r *segmentRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("segment ID cannot be nil")
	}

	query := `DELETE FROM segments WHERE id = $1`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete segment: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("segment not found")
	}

	return nil
}

// UpdateContactCount updates the contact count for a segment
func (r *segmentRepository) UpdateContactCount(ctx context.Context, id uuid.UUID, count int) error {
	if id == uuid.Nil {
		return fmt.Errorf("segment ID cannot be nil")
	}

	if count < 0 {
		return fmt.Errorf("contact count cannot be negative")
	}

	query := `
		UPDATE segments
		SET contact_count = $2, updated_at = NOW()
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id, count)
	if err != nil {
		return fmt.Errorf("failed to update contact count: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("segment not found")
	}

	return nil
}
