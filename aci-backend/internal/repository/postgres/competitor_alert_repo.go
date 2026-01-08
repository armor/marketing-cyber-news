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

// CompetitorAlertRepo implements CompetitorAlertRepository for PostgreSQL
type CompetitorAlertRepo struct {
	db *sqlx.DB
}

// NewCompetitorAlertRepo creates a new competitor alert repository
func NewCompetitorAlertRepo(db *sqlx.DB) repository.CompetitorAlertRepository {
	if db == nil {
		panic("db cannot be nil")
	}

	return &CompetitorAlertRepo{db: db}
}

// Create creates a new competitor alert
func (r *CompetitorAlertRepo) Create(ctx context.Context, alert *domain.CompetitorAlert) error {
	if alert == nil {
		return fmt.Errorf("alert cannot be nil")
	}

	if err := alert.Validate(); err != nil {
		return fmt.Errorf("validation failed: %w", err)
	}

	query := `
		INSERT INTO competitor_alerts (
			id, competitor_id, alert_type, content_id, message, is_read, created_at, read_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8
		)
	`

	if alert.ID == uuid.Nil {
		alert.ID = uuid.New()
	}

	alert.CreatedAt = time.Now()

	_, err := r.db.ExecContext(ctx, query,
		alert.ID,
		alert.CompetitorID,
		alert.AlertType,
		alert.ContentID,
		alert.Message,
		alert.IsRead,
		alert.CreatedAt,
		alert.ReadAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create competitor alert: %w", err)
	}

	return nil
}

// GetByID retrieves a competitor alert by ID
func (r *CompetitorAlertRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.CompetitorAlert, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("id is required")
	}

	query := `
		SELECT id, competitor_id, alert_type, content_id, message, is_read, created_at, read_at
		FROM competitor_alerts
		WHERE id = $1
	`

	var alert domain.CompetitorAlert
	err := r.db.GetContext(ctx, &alert, query, id)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("competitor alert not found: %w", domainerrors.ErrNotFound)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get competitor alert: %w", err)
	}

	return &alert, nil
}

// List retrieves competitor alerts with optional filtering
func (r *CompetitorAlertRepo) List(ctx context.Context, filter *domain.CompetitorAlertFilter) ([]*domain.CompetitorAlert, int, error) {
	if filter == nil {
		filter = &domain.CompetitorAlertFilter{}
	}

	if filter.Limit <= 0 {
		filter.Limit = 50
	}
	if filter.Offset < 0 {
		filter.Offset = 0
	}

	query := `
		SELECT a.id, a.competitor_id, a.alert_type, a.content_id, a.message, a.is_read, a.created_at, a.read_at
		FROM competitor_alerts a
	`
	countQuery := `SELECT COUNT(*) FROM competitor_alerts a`
	args := []interface{}{}
	argPos := 1

	// Join with competitors if filtering by campaign
	if filter.CampaignID != nil {
		query += ` INNER JOIN campaign_competitors c ON a.competitor_id = c.id`
		countQuery += ` INNER JOIN campaign_competitors c ON a.competitor_id = c.id`
	}

	query += ` WHERE 1=1`
	countQuery += ` WHERE 1=1`

	if filter.CompetitorID != nil {
		query += fmt.Sprintf(" AND a.competitor_id = $%d", argPos)
		countQuery += fmt.Sprintf(" AND a.competitor_id = $%d", argPos)
		args = append(args, *filter.CompetitorID)
		argPos++
	}

	if filter.CampaignID != nil {
		query += fmt.Sprintf(" AND c.campaign_id = $%d", argPos)
		countQuery += fmt.Sprintf(" AND c.campaign_id = $%d", argPos)
		args = append(args, *filter.CampaignID)
		argPos++
	}

	if filter.IsRead != nil {
		query += fmt.Sprintf(" AND a.is_read = $%d", argPos)
		countQuery += fmt.Sprintf(" AND a.is_read = $%d", argPos)
		args = append(args, *filter.IsRead)
		argPos++
	}

	if filter.AlertType != nil {
		query += fmt.Sprintf(" AND a.alert_type = $%d", argPos)
		countQuery += fmt.Sprintf(" AND a.alert_type = $%d", argPos)
		args = append(args, *filter.AlertType)
		argPos++
	}

	var total int
	err := r.db.GetContext(ctx, &total, countQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count competitor alerts: %w", err)
	}

	query += " ORDER BY a.created_at DESC"
	query += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argPos, argPos+1)
	args = append(args, filter.Limit, filter.Offset)

	var alerts []*domain.CompetitorAlert
	err = r.db.SelectContext(ctx, &alerts, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list competitor alerts: %w", err)
	}

	return alerts, total, nil
}

// Update updates a competitor alert
func (r *CompetitorAlertRepo) Update(ctx context.Context, alert *domain.CompetitorAlert) error {
	if alert == nil {
		return fmt.Errorf("alert cannot be nil")
	}

	if alert.ID == uuid.Nil {
		return fmt.Errorf("alert ID is required")
	}

	if err := alert.Validate(); err != nil {
		return fmt.Errorf("validation failed: %w", err)
	}

	query := `
		UPDATE competitor_alerts
		SET message = $1, is_read = $2, read_at = $3
		WHERE id = $4
	`

	result, err := r.db.ExecContext(ctx, query,
		alert.Message,
		alert.IsRead,
		alert.ReadAt,
		alert.ID,
	)

	if err != nil {
		return fmt.Errorf("failed to update competitor alert: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("competitor alert not found: %w", domainerrors.ErrNotFound)
	}

	return nil
}

// Delete deletes a competitor alert
func (r *CompetitorAlertRepo) Delete(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("id is required")
	}

	query := `DELETE FROM competitor_alerts WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete competitor alert: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("competitor alert not found: %w", domainerrors.ErrNotFound)
	}

	return nil
}

// MarkRead marks a competitor alert as read
func (r *CompetitorAlertRepo) MarkRead(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("id is required")
	}

	query := `
		UPDATE competitor_alerts
		SET is_read = true, read_at = $1
		WHERE id = $2
	`

	now := time.Now()
	result, err := r.db.ExecContext(ctx, query, now, id)
	if err != nil {
		return fmt.Errorf("failed to mark alert as read: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("competitor alert not found: %w", domainerrors.ErrNotFound)
	}

	return nil
}

// MarkAllRead marks all alerts for a campaign as read
func (r *CompetitorAlertRepo) MarkAllRead(ctx context.Context, campaignID uuid.UUID) error {
	if campaignID == uuid.Nil {
		return fmt.Errorf("campaign_id is required")
	}

	query := `
		UPDATE competitor_alerts a
		SET is_read = true, read_at = $1
		FROM campaign_competitors c
		WHERE a.competitor_id = c.id AND c.campaign_id = $2 AND a.is_read = false
	`

	now := time.Now()
	_, err := r.db.ExecContext(ctx, query, now, campaignID)
	if err != nil {
		return fmt.Errorf("failed to mark all alerts as read: %w", err)
	}

	return nil
}

// GetUnreadCount returns the count of unread alerts for a campaign
func (r *CompetitorAlertRepo) GetUnreadCount(ctx context.Context, campaignID uuid.UUID) (int, error) {
	if campaignID == uuid.Nil {
		return 0, fmt.Errorf("campaign_id is required")
	}

	query := `
		SELECT COUNT(*)
		FROM competitor_alerts a
		INNER JOIN campaign_competitors c ON a.competitor_id = c.id
		WHERE c.campaign_id = $1 AND a.is_read = false
	`

	var count int
	err := r.db.GetContext(ctx, &count, query, campaignID)
	if err != nil {
		return 0, fmt.Errorf("failed to get unread count: %w", err)
	}

	return count, nil
}
