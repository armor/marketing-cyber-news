package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/phillipboles/aci-backend/internal/domain"
	domainerrors "github.com/phillipboles/aci-backend/internal/domain/errors"
	"github.com/phillipboles/aci-backend/internal/repository"
)

// CompetitorProfileRepo implements CompetitorProfileRepository for PostgreSQL
type CompetitorProfileRepo struct {
	db *sqlx.DB
}

// NewCompetitorProfileRepo creates a new competitor profile repository
func NewCompetitorProfileRepo(db *sqlx.DB) repository.CompetitorProfileRepository {
	if db == nil {
		panic("db cannot be nil")
	}

	return &CompetitorProfileRepo{db: db}
}

// Create creates a new competitor profile
func (r *CompetitorProfileRepo) Create(ctx context.Context, competitor *domain.CompetitorProfile) error {
	if competitor == nil {
		return fmt.Errorf("competitor cannot be nil")
	}

	if err := competitor.Validate(); err != nil {
		return fmt.Errorf("validation failed: %w", err)
	}

	query := `
		INSERT INTO campaign_competitors (
			id, campaign_id, name, linkedin_url, twitter_handle, blog_url, website_url, is_active, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10
		)
	`

	now := time.Now()
	if competitor.ID == uuid.Nil {
		competitor.ID = uuid.New()
	}

	competitor.CreatedAt = now
	competitor.UpdatedAt = now

	_, err := r.db.ExecContext(ctx, query,
		competitor.ID,
		competitor.CampaignID,
		competitor.Name,
		competitor.LinkedInURL,
		competitor.TwitterHandle,
		competitor.BlogURL,
		competitor.WebsiteURL,
		competitor.IsActive,
		competitor.CreatedAt,
		competitor.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create competitor: %w", err)
	}

	return nil
}

// GetByID retrieves a competitor profile by ID
func (r *CompetitorProfileRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.CompetitorProfile, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("id is required")
	}

	query := `
		SELECT id, campaign_id, name, linkedin_url, twitter_handle, blog_url, website_url, is_active, created_at, updated_at
		FROM campaign_competitors
		WHERE id = $1
	`

	var competitor domain.CompetitorProfile
	err := r.db.GetContext(ctx, &competitor, query, id)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("competitor not found: %w", domainerrors.ErrNotFound)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get competitor: %w", err)
	}

	return &competitor, nil
}

// GetByCampaignID retrieves all competitors for a campaign
func (r *CompetitorProfileRepo) GetByCampaignID(ctx context.Context, campaignID uuid.UUID) ([]*domain.CompetitorProfile, error) {
	if campaignID == uuid.Nil {
		return nil, fmt.Errorf("campaign_id is required")
	}

	query := `
		SELECT id, campaign_id, name, linkedin_url, twitter_handle, blog_url, website_url, is_active, created_at, updated_at
		FROM campaign_competitors
		WHERE campaign_id = $1 AND is_active = true
		ORDER BY created_at DESC
	`

	var competitors []*domain.CompetitorProfile
	err := r.db.SelectContext(ctx, &competitors, query, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to get competitors by campaign: %w", err)
	}

	return competitors, nil
}

// List retrieves competitors with optional filtering
func (r *CompetitorProfileRepo) List(ctx context.Context, filter *domain.CompetitorFilter) ([]*domain.CompetitorProfile, int, error) {
	if filter == nil {
		filter = &domain.CompetitorFilter{}
	}

	// Set default pagination
	if filter.Limit <= 0 {
		filter.Limit = 50
	}
	if filter.Offset < 0 {
		filter.Offset = 0
	}

	// Build query with filters
	query := `
		SELECT id, campaign_id, name, linkedin_url, twitter_handle, blog_url, website_url, is_active, created_at, updated_at
		FROM campaign_competitors
		WHERE 1=1
	`
	countQuery := `SELECT COUNT(*) FROM campaign_competitors WHERE 1=1`
	args := []interface{}{}
	argPos := 1

	if filter.CampaignID != nil {
		query += fmt.Sprintf(" AND campaign_id = $%d", argPos)
		countQuery += fmt.Sprintf(" AND campaign_id = $%d", argPos)
		args = append(args, *filter.CampaignID)
		argPos++
	}

	if filter.IsActive != nil {
		query += fmt.Sprintf(" AND is_active = $%d", argPos)
		countQuery += fmt.Sprintf(" AND is_active = $%d", argPos)
		args = append(args, *filter.IsActive)
		argPos++
	}

	// Count total
	var total int
	err := r.db.GetContext(ctx, &total, countQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count competitors: %w", err)
	}

	// Add pagination
	query += " ORDER BY created_at DESC"
	query += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argPos, argPos+1)
	args = append(args, filter.Limit, filter.Offset)

	var competitors []*domain.CompetitorProfile
	err = r.db.SelectContext(ctx, &competitors, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list competitors: %w", err)
	}

	return competitors, total, nil
}

// Update updates a competitor profile
func (r *CompetitorProfileRepo) Update(ctx context.Context, competitor *domain.CompetitorProfile) error {
	if competitor == nil {
		return fmt.Errorf("competitor cannot be nil")
	}

	if competitor.ID == uuid.Nil {
		return fmt.Errorf("competitor ID is required")
	}

	if err := competitor.Validate(); err != nil {
		return fmt.Errorf("validation failed: %w", err)
	}

	query := `
		UPDATE campaign_competitors
		SET name = $1, linkedin_url = $2, twitter_handle = $3, blog_url = $4, website_url = $5, is_active = $6, updated_at = $7
		WHERE id = $8
	`

	competitor.UpdatedAt = time.Now()

	result, err := r.db.ExecContext(ctx, query,
		competitor.Name,
		competitor.LinkedInURL,
		competitor.TwitterHandle,
		competitor.BlogURL,
		competitor.WebsiteURL,
		competitor.IsActive,
		competitor.UpdatedAt,
		competitor.ID,
	)

	if err != nil {
		return fmt.Errorf("failed to update competitor: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("competitor not found: %w", domainerrors.ErrNotFound)
	}

	return nil
}

// Delete deletes a competitor profile
func (r *CompetitorProfileRepo) Delete(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("id is required")
	}

	query := `DELETE FROM campaign_competitors WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete competitor: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("competitor not found: %w", domainerrors.ErrNotFound)
	}

	return nil
}

// SetActive sets the active status of a competitor
func (r *CompetitorProfileRepo) SetActive(ctx context.Context, id uuid.UUID, isActive bool) error {
	if id == uuid.Nil {
		return fmt.Errorf("id is required")
	}

	query := `
		UPDATE campaign_competitors
		SET is_active = $1, updated_at = $2
		WHERE id = $3
	`

	result, err := r.db.ExecContext(ctx, query, isActive, time.Now(), id)
	if err != nil {
		return fmt.Errorf("failed to set active status: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("competitor not found: %w", domainerrors.ErrNotFound)
	}

	return nil
}
