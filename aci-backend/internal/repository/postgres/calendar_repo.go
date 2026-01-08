package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/repository"
)

type calendarEntryRepository struct {
	db *DB
}

// NewCalendarEntryRepository creates a new PostgreSQL calendar entry repository
func NewCalendarEntryRepository(db *DB) repository.CalendarEntryRepository {
	if db == nil {
		panic("database cannot be nil")
	}
	return &calendarEntryRepository{db: db}
}

// Create creates a new calendar entry
func (r *calendarEntryRepository) Create(ctx context.Context, entry *domain.CalendarEntry) error {
	if entry == nil {
		return fmt.Errorf("calendar entry cannot be nil")
	}

	if err := entry.Validate(); err != nil {
		return fmt.Errorf("invalid calendar entry: %w", err)
	}

	query := `
		INSERT INTO calendar_entries (
			id, tenant_id, campaign_id, content_id, channel,
			scheduled_at, status, created_at, updated_at, published_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`

	_, err := r.db.Pool.Exec(ctx, query,
		entry.ID,
		entry.TenantID,
		entry.CampaignID,
		entry.ContentID,
		entry.Channel,
		entry.ScheduledAt,
		entry.Status,
		entry.CreatedAt,
		entry.UpdatedAt,
		entry.PublishedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create calendar entry: %w", err)
	}

	return nil
}

// GetByID retrieves a calendar entry by ID
func (r *calendarEntryRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.CalendarEntry, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("calendar entry ID cannot be nil")
	}

	query := `
		SELECT
			id, tenant_id, campaign_id, content_id, channel,
			scheduled_at, status, created_at, updated_at, published_at
		FROM calendar_entries
		WHERE id = $1
	`

	entry := &domain.CalendarEntry{}

	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&entry.ID,
		&entry.TenantID,
		&entry.CampaignID,
		&entry.ContentID,
		&entry.Channel,
		&entry.ScheduledAt,
		&entry.Status,
		&entry.CreatedAt,
		&entry.UpdatedAt,
		&entry.PublishedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("calendar entry not found: %w", err)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get calendar entry: %w", err)
	}

	return entry, nil
}

// List retrieves calendar entries with filtering and pagination
func (r *calendarEntryRepository) List(ctx context.Context, filter *domain.CalendarFilter) ([]*domain.CalendarEntry, int, error) {
	if filter == nil {
		return nil, 0, fmt.Errorf("filter cannot be nil")
	}

	if err := filter.Validate(); err != nil {
		return nil, 0, fmt.Errorf("invalid filter: %w", err)
	}

	// Build WHERE clauses dynamically
	whereClauses := []string{"tenant_id = $1"}
	args := []interface{}{filter.TenantID}
	argPos := 2

	if filter.CampaignID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("campaign_id = $%d", argPos))
		args = append(args, *filter.CampaignID)
		argPos++
	}

	if filter.ContentID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("content_id = $%d", argPos))
		args = append(args, *filter.ContentID)
		argPos++
	}

	if filter.Channel != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("channel = $%d", argPos))
		args = append(args, *filter.Channel)
		argPos++
	}

	if filter.Status != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("status = $%d", argPos))
		args = append(args, *filter.Status)
		argPos++
	}

	if filter.StartDate != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("scheduled_at >= $%d", argPos))
		args = append(args, *filter.StartDate)
		argPos++
	}

	if filter.EndDate != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("scheduled_at <= $%d", argPos))
		args = append(args, *filter.EndDate)
		argPos++
	}

	whereClause := whereClauses[0]
	for i := 1; i < len(whereClauses); i++ {
		whereClause += " AND " + whereClauses[i]
	}

	// Count total matching records
	countQuery := "SELECT COUNT(*) FROM calendar_entries WHERE " + whereClause
	var total int
	err := r.db.Pool.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count calendar entries: %w", err)
	}

	// Calculate limit and offset
	limit := filter.PageSize
	if limit == 0 {
		limit = 50 // Default page size
	}
	offset := filter.Page * limit

	// Query with pagination
	query := `
		SELECT
			id, tenant_id, campaign_id, content_id, channel,
			scheduled_at, status, created_at, updated_at, published_at
		FROM calendar_entries
		WHERE ` + whereClause + `
		ORDER BY scheduled_at DESC
		LIMIT $` + fmt.Sprintf("%d", argPos) + ` OFFSET $` + fmt.Sprintf("%d", argPos+1)

	args = append(args, limit, offset)

	rows, err := r.db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list calendar entries: %w", err)
	}
	defer rows.Close()

	entries := make([]*domain.CalendarEntry, 0)
	for rows.Next() {
		entry := &domain.CalendarEntry{}

		err := rows.Scan(
			&entry.ID,
			&entry.TenantID,
			&entry.CampaignID,
			&entry.ContentID,
			&entry.Channel,
			&entry.ScheduledAt,
			&entry.Status,
			&entry.CreatedAt,
			&entry.UpdatedAt,
			&entry.PublishedAt,
		)

		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan calendar entry: %w", err)
		}

		entries = append(entries, entry)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating calendar entries: %w", err)
	}

	return entries, total, nil
}

// Update updates an existing calendar entry
func (r *calendarEntryRepository) Update(ctx context.Context, entry *domain.CalendarEntry) error {
	if entry == nil {
		return fmt.Errorf("calendar entry cannot be nil")
	}

	if err := entry.Validate(); err != nil {
		return fmt.Errorf("invalid calendar entry: %w", err)
	}

	query := `
		UPDATE calendar_entries
		SET
			campaign_id = $2,
			content_id = $3,
			channel = $4,
			scheduled_at = $5,
			status = $6,
			updated_at = $7,
			published_at = $8
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query,
		entry.ID,
		entry.CampaignID,
		entry.ContentID,
		entry.Channel,
		entry.ScheduledAt,
		entry.Status,
		entry.UpdatedAt,
		entry.PublishedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to update calendar entry: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("calendar entry not found")
	}

	return nil
}

// Delete deletes a calendar entry by ID
func (r *calendarEntryRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("calendar entry ID cannot be nil")
	}

	query := `DELETE FROM calendar_entries WHERE id = $1`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete calendar entry: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("calendar entry not found")
	}

	return nil
}

// UpdateStatus updates the status of a calendar entry
func (r *calendarEntryRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.PublishingStatus) error {
	if id == uuid.Nil {
		return fmt.Errorf("calendar entry ID cannot be nil")
	}

	if !status.IsValid() {
		return fmt.Errorf("invalid status: %s", status)
	}

	// If status is published, set published_at timestamp
	var publishedAt *time.Time
	if status == domain.StatusPublished {
		now := time.Now()
		publishedAt = &now
	}

	query := `
		UPDATE calendar_entries
		SET
			status = $2,
			published_at = $3,
			updated_at = $4
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query,
		id,
		status,
		publishedAt,
		time.Now(),
	)

	if err != nil {
		return fmt.Errorf("failed to update calendar entry status: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("calendar entry not found")
	}

	return nil
}

// Reschedule updates the scheduled time of a calendar entry
func (r *calendarEntryRepository) Reschedule(ctx context.Context, id uuid.UUID, scheduledAt time.Time) error {
	if id == uuid.Nil {
		return fmt.Errorf("calendar entry ID cannot be nil")
	}

	if scheduledAt.IsZero() {
		return fmt.Errorf("scheduled_at cannot be zero")
	}

	if scheduledAt.Before(time.Now().Add(-time.Minute)) {
		return fmt.Errorf("scheduled_at must be in the future")
	}

	query := `
		UPDATE calendar_entries
		SET
			scheduled_at = $2,
			updated_at = $3
		WHERE id = $1 AND status = $4
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query,
		id,
		scheduledAt,
		time.Now(),
		domain.StatusScheduled,
	)

	if err != nil {
		return fmt.Errorf("failed to reschedule calendar entry: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("calendar entry not found or cannot be rescheduled")
	}

	return nil
}

// GetUpcoming retrieves upcoming calendar entries for a tenant, optionally filtered by channel
func (r *calendarEntryRepository) GetUpcoming(ctx context.Context, tenantID uuid.UUID, channel *domain.Channel, limit int) ([]*domain.CalendarEntry, error) {
	if tenantID == uuid.Nil {
		return nil, fmt.Errorf("tenant ID cannot be nil")
	}

	if limit <= 0 {
		limit = 10 // Default limit
	}

	if limit > 1000 {
		return nil, fmt.Errorf("limit must be <= 1000")
	}

	var query string
	var args []interface{}

	if channel != nil {
		if !channel.IsValid() {
			return nil, fmt.Errorf("invalid channel: %s", *channel)
		}

		query = `
			SELECT
				id, tenant_id, campaign_id, content_id, channel,
				scheduled_at, status, created_at, updated_at, published_at
			FROM calendar_entries
			WHERE tenant_id = $1
				AND channel = $2
				AND status = $3
				AND scheduled_at >= $4
			ORDER BY scheduled_at ASC
			LIMIT $5
		`
		args = []interface{}{tenantID, *channel, domain.StatusScheduled, time.Now(), limit}
	} else {
		query = `
			SELECT
				id, tenant_id, campaign_id, content_id, channel,
				scheduled_at, status, created_at, updated_at, published_at
			FROM calendar_entries
			WHERE tenant_id = $1
				AND status = $2
				AND scheduled_at >= $3
			ORDER BY scheduled_at ASC
			LIMIT $4
		`
		args = []interface{}{tenantID, domain.StatusScheduled, time.Now(), limit}
	}

	rows, err := r.db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get upcoming calendar entries: %w", err)
	}
	defer rows.Close()

	entries := make([]*domain.CalendarEntry, 0)
	for rows.Next() {
		entry := &domain.CalendarEntry{}

		err := rows.Scan(
			&entry.ID,
			&entry.TenantID,
			&entry.CampaignID,
			&entry.ContentID,
			&entry.Channel,
			&entry.ScheduledAt,
			&entry.Status,
			&entry.CreatedAt,
			&entry.UpdatedAt,
			&entry.PublishedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan calendar entry: %w", err)
		}

		entries = append(entries, entry)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating calendar entries: %w", err)
	}

	return entries, nil
}

// GetByDateRange retrieves calendar entries within a date range
func (r *calendarEntryRepository) GetByDateRange(ctx context.Context, tenantID uuid.UUID, startDate, endDate time.Time) ([]*domain.CalendarEntry, error) {
	if tenantID == uuid.Nil {
		return nil, fmt.Errorf("tenant ID cannot be nil")
	}

	if startDate.IsZero() || endDate.IsZero() {
		return nil, fmt.Errorf("start date and end date are required")
	}

	if endDate.Before(startDate) {
		return nil, fmt.Errorf("end date must be after start date")
	}

	query := `
		SELECT
			id, tenant_id, campaign_id, content_id, channel,
			scheduled_at, status, created_at, updated_at, published_at
		FROM calendar_entries
		WHERE tenant_id = $1
			AND scheduled_at >= $2
			AND scheduled_at <= $3
		ORDER BY scheduled_at ASC
	`

	rows, err := r.db.Pool.Query(ctx, query, tenantID, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get calendar entries by date range: %w", err)
	}
	defer rows.Close()

	entries := make([]*domain.CalendarEntry, 0)
	for rows.Next() {
		entry := &domain.CalendarEntry{}

		err := rows.Scan(
			&entry.ID,
			&entry.TenantID,
			&entry.CampaignID,
			&entry.ContentID,
			&entry.Channel,
			&entry.ScheduledAt,
			&entry.Status,
			&entry.CreatedAt,
			&entry.UpdatedAt,
			&entry.PublishedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan calendar entry: %w", err)
		}

		entries = append(entries, entry)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating calendar entries: %w", err)
	}

	return entries, nil
}

// GetScheduledForPublishing retrieves all scheduled entries that should be published before the given time
func (r *calendarEntryRepository) GetScheduledForPublishing(ctx context.Context, before time.Time) ([]*domain.CalendarEntry, error) {
	if before.IsZero() {
		return nil, fmt.Errorf("before time cannot be zero")
	}

	query := `
		SELECT
			id, tenant_id, campaign_id, content_id, channel,
			scheduled_at, status, created_at, updated_at, published_at
		FROM calendar_entries
		WHERE status = $1
			AND scheduled_at <= $2
		ORDER BY scheduled_at ASC
	`

	rows, err := r.db.Pool.Query(ctx, query, domain.StatusScheduled, before)
	if err != nil {
		return nil, fmt.Errorf("failed to get scheduled calendar entries: %w", err)
	}
	defer rows.Close()

	entries := make([]*domain.CalendarEntry, 0)
	for rows.Next() {
		entry := &domain.CalendarEntry{}

		err := rows.Scan(
			&entry.ID,
			&entry.TenantID,
			&entry.CampaignID,
			&entry.ContentID,
			&entry.Channel,
			&entry.ScheduledAt,
			&entry.Status,
			&entry.CreatedAt,
			&entry.UpdatedAt,
			&entry.PublishedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan calendar entry: %w", err)
		}

		entries = append(entries, entry)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating calendar entries: %w", err)
	}

	return entries, nil
}
