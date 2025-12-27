package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/repository"
)

type engagementEventRepository struct {
	db *DB
}

// ContentPerformance represents click performance metrics for content
type ContentPerformance struct {
	BlockID    uuid.UUID `json:"block_id"`
	LinkURL    string    `json:"link_url"`
	ClickCount int       `json:"click_count"`
}

// NewEngagementEventRepository creates a new PostgreSQL engagement event repository
func NewEngagementEventRepository(db *DB) repository.EngagementEventRepository {
	if db == nil {
		panic("database cannot be nil")
	}
	return &engagementEventRepository{db: db}
}

// Create creates a new engagement event
func (r *engagementEventRepository) Create(ctx context.Context, event *domain.EngagementEvent) error {
	if event == nil {
		return fmt.Errorf("engagement event cannot be nil")
	}

	if err := event.Validate(); err != nil {
		return fmt.Errorf("invalid engagement event: %w", err)
	}

	// Set created_at if not set
	if event.CreatedAt.IsZero() {
		event.CreatedAt = time.Now()
	}

	// Set ID if not set
	if event.ID == uuid.Nil {
		event.ID = uuid.New()
	}

	query := `
		INSERT INTO engagement_events (
			id, contact_id, issue_id, block_id, variant_id, event_type,
			event_timestamp, clicked_url, topic_tag, framework_tag, content_type,
			block_position, utm_source, utm_medium, utm_campaign, utm_content,
			device_type, email_client, ip_address, user_agent, created_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
		ON CONFLICT (contact_id, issue_id, event_type, event_timestamp)
		DO NOTHING
	`

	_, err := r.db.Pool.Exec(ctx, query,
		event.ID,
		event.ContactID,
		event.IssueID,
		event.BlockID,
		event.VariantID,
		event.EventType,
		event.EventTimestamp,
		event.ClickedURL,
		event.TopicTag,
		event.FrameworkTag,
		event.ContentType,
		event.BlockPosition,
		event.UTMSource,
		event.UTMMedium,
		event.UTMCampaign,
		event.UTMContent,
		event.DeviceType,
		event.EmailClient,
		event.IPAddress,
		event.UserAgent,
		event.CreatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create engagement event: %w", err)
	}

	return nil
}

// GetByID retrieves an engagement event by ID
func (r *engagementEventRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.EngagementEvent, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("engagement event ID cannot be nil")
	}

	query := `
		SELECT
			id, contact_id, issue_id, block_id, variant_id, event_type,
			event_timestamp, clicked_url, topic_tag, framework_tag, content_type,
			block_position, utm_source, utm_medium, utm_campaign, utm_content,
			device_type, email_client, ip_address, user_agent, created_at
		FROM engagement_events
		WHERE id = $1
	`

	event := &domain.EngagementEvent{}
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&event.ID,
		&event.ContactID,
		&event.IssueID,
		&event.BlockID,
		&event.VariantID,
		&event.EventType,
		&event.EventTimestamp,
		&event.ClickedURL,
		&event.TopicTag,
		&event.FrameworkTag,
		&event.ContentType,
		&event.BlockPosition,
		&event.UTMSource,
		&event.UTMMedium,
		&event.UTMCampaign,
		&event.UTMContent,
		&event.DeviceType,
		&event.EmailClient,
		&event.IPAddress,
		&event.UserAgent,
		&event.CreatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("engagement event not found: %w", err)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get engagement event: %w", err)
	}

	return event, nil
}

// List retrieves engagement events with filtering and pagination
func (r *engagementEventRepository) List(ctx context.Context, filter *domain.EngagementEventFilter) ([]*domain.EngagementEvent, int, error) {
	if filter == nil {
		return nil, 0, fmt.Errorf("filter cannot be nil")
	}

	// Build WHERE clauses dynamically
	whereClauses := []string{}
	args := []interface{}{}
	argPos := 1

	if filter.ContactID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("contact_id = $%d", argPos))
		args = append(args, *filter.ContactID)
		argPos++
	}

	if filter.IssueID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("issue_id = $%d", argPos))
		args = append(args, *filter.IssueID)
		argPos++
	}

	if filter.BlockID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("block_id = $%d", argPos))
		args = append(args, *filter.BlockID)
		argPos++
	}

	if filter.VariantID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("variant_id = $%d", argPos))
		args = append(args, *filter.VariantID)
		argPos++
	}

	if filter.EventType != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("event_type = $%d", argPos))
		args = append(args, *filter.EventType)
		argPos++
	}

	if filter.DateFrom != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("event_timestamp >= $%d", argPos))
		args = append(args, *filter.DateFrom)
		argPos++
	}

	if filter.DateTo != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("event_timestamp <= $%d", argPos))
		args = append(args, *filter.DateTo)
		argPos++
	}

	if filter.TopicTag != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("topic_tag = $%d", argPos))
		args = append(args, *filter.TopicTag)
		argPos++
	}

	if filter.FrameworkTag != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("framework_tag = $%d", argPos))
		args = append(args, *filter.FrameworkTag)
		argPos++
	}

	if filter.DeviceType != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("device_type = $%d", argPos))
		args = append(args, *filter.DeviceType)
		argPos++
	}

	whereClause := ""
	if len(whereClauses) > 0 {
		whereClause = "WHERE " + strings.Join(whereClauses, " AND ")
	}

	// Count total matching records
	countQuery := "SELECT COUNT(*) FROM engagement_events " + whereClause
	var total int
	err := r.db.Pool.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count engagement events: %w", err)
	}

	// Apply default limit if not set
	limit := filter.Limit
	if limit <= 0 {
		limit = 100
	}

	offset := filter.Offset
	if offset < 0 {
		offset = 0
	}

	// Query with pagination
	query := `
		SELECT
			id, contact_id, issue_id, block_id, variant_id, event_type,
			event_timestamp, clicked_url, topic_tag, framework_tag, content_type,
			block_position, utm_source, utm_medium, utm_campaign, utm_content,
			device_type, email_client, ip_address, user_agent, created_at
		FROM engagement_events
		` + whereClause + `
		ORDER BY event_timestamp DESC, created_at DESC
		LIMIT $` + fmt.Sprintf("%d", argPos) + ` OFFSET $` + fmt.Sprintf("%d", argPos+1)

	args = append(args, limit, offset)

	rows, err := r.db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list engagement events: %w", err)
	}
	defer rows.Close()

	events := make([]*domain.EngagementEvent, 0)
	for rows.Next() {
		event := &domain.EngagementEvent{}
		err := rows.Scan(
			&event.ID,
			&event.ContactID,
			&event.IssueID,
			&event.BlockID,
			&event.VariantID,
			&event.EventType,
			&event.EventTimestamp,
			&event.ClickedURL,
			&event.TopicTag,
			&event.FrameworkTag,
			&event.ContentType,
			&event.BlockPosition,
			&event.UTMSource,
			&event.UTMMedium,
			&event.UTMCampaign,
			&event.UTMContent,
			&event.DeviceType,
			&event.EmailClient,
			&event.IPAddress,
			&event.UserAgent,
			&event.CreatedAt,
		)

		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan engagement event: %w", err)
		}

		events = append(events, event)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating engagement events: %w", err)
	}

	return events, total, nil
}

// BulkCreate creates multiple engagement events in a single transaction
func (r *engagementEventRepository) BulkCreate(ctx context.Context, events []*domain.EngagementEvent) error {
	if len(events) == 0 {
		return nil
	}

	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	query := `
		INSERT INTO engagement_events (
			id, contact_id, issue_id, block_id, variant_id, event_type,
			event_timestamp, clicked_url, topic_tag, framework_tag, content_type,
			block_position, utm_source, utm_medium, utm_campaign, utm_content,
			device_type, email_client, ip_address, user_agent, created_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
		ON CONFLICT (contact_id, issue_id, event_type, event_timestamp)
		DO NOTHING
	`

	for _, event := range events {
		if err := event.Validate(); err != nil {
			return fmt.Errorf("invalid engagement event: %w", err)
		}

		if event.CreatedAt.IsZero() {
			event.CreatedAt = time.Now()
		}

		if event.ID == uuid.Nil {
			event.ID = uuid.New()
		}

		_, err := tx.Exec(ctx, query,
			event.ID,
			event.ContactID,
			event.IssueID,
			event.BlockID,
			event.VariantID,
			event.EventType,
			event.EventTimestamp,
			event.ClickedURL,
			event.TopicTag,
			event.FrameworkTag,
			event.ContentType,
			event.BlockPosition,
			event.UTMSource,
			event.UTMMedium,
			event.UTMCampaign,
			event.UTMContent,
			event.DeviceType,
			event.EmailClient,
			event.IPAddress,
			event.UserAgent,
			event.CreatedAt,
		)

		if err != nil {
			return fmt.Errorf("failed to insert engagement event: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// GetByIssueID retrieves all engagement events for a specific issue
func (r *engagementEventRepository) GetByIssueID(ctx context.Context, issueID uuid.UUID) ([]*domain.EngagementEvent, error) {
	if issueID == uuid.Nil {
		return nil, fmt.Errorf("issue ID cannot be nil")
	}

	query := `
		SELECT
			id, contact_id, issue_id, block_id, variant_id, event_type,
			event_timestamp, clicked_url, topic_tag, framework_tag, content_type,
			block_position, utm_source, utm_medium, utm_campaign, utm_content,
			device_type, email_client, ip_address, user_agent, created_at
		FROM engagement_events
		WHERE issue_id = $1
		ORDER BY event_timestamp DESC, created_at DESC
	`

	rows, err := r.db.Pool.Query(ctx, query, issueID)
	if err != nil {
		return nil, fmt.Errorf("failed to get events for issue: %w", err)
	}
	defer rows.Close()

	events := make([]*domain.EngagementEvent, 0)
	for rows.Next() {
		event := &domain.EngagementEvent{}
		err := rows.Scan(
			&event.ID,
			&event.ContactID,
			&event.IssueID,
			&event.BlockID,
			&event.VariantID,
			&event.EventType,
			&event.EventTimestamp,
			&event.ClickedURL,
			&event.TopicTag,
			&event.FrameworkTag,
			&event.ContentType,
			&event.BlockPosition,
			&event.UTMSource,
			&event.UTMMedium,
			&event.UTMCampaign,
			&event.UTMContent,
			&event.DeviceType,
			&event.EmailClient,
			&event.IPAddress,
			&event.UserAgent,
			&event.CreatedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan engagement event: %w", err)
		}

		events = append(events, event)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating engagement events: %w", err)
	}

	return events, nil
}

// GetByContactID retrieves recent engagement events for a specific contact
func (r *engagementEventRepository) GetByContactID(ctx context.Context, contactID uuid.UUID, limit int) ([]*domain.EngagementEvent, error) {
	if contactID == uuid.Nil {
		return nil, fmt.Errorf("contact ID cannot be nil")
	}

	if limit <= 0 {
		limit = 100
	}

	query := `
		SELECT
			id, contact_id, issue_id, block_id, variant_id, event_type,
			event_timestamp, clicked_url, topic_tag, framework_tag, content_type,
			block_position, utm_source, utm_medium, utm_campaign, utm_content,
			device_type, email_client, ip_address, user_agent, created_at
		FROM engagement_events
		WHERE contact_id = $1
		ORDER BY event_timestamp DESC, created_at DESC
		LIMIT $2
	`

	rows, err := r.db.Pool.Query(ctx, query, contactID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get events for contact: %w", err)
	}
	defer rows.Close()

	events := make([]*domain.EngagementEvent, 0)
	for rows.Next() {
		event := &domain.EngagementEvent{}
		err := rows.Scan(
			&event.ID,
			&event.ContactID,
			&event.IssueID,
			&event.BlockID,
			&event.VariantID,
			&event.EventType,
			&event.EventTimestamp,
			&event.ClickedURL,
			&event.TopicTag,
			&event.FrameworkTag,
			&event.ContentType,
			&event.BlockPosition,
			&event.UTMSource,
			&event.UTMMedium,
			&event.UTMCampaign,
			&event.UTMContent,
			&event.DeviceType,
			&event.EmailClient,
			&event.IPAddress,
			&event.UserAgent,
			&event.CreatedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan engagement event: %w", err)
		}

		events = append(events, event)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating engagement events: %w", err)
	}

	return events, nil
}

// GetMetricsForIssue aggregates engagement metrics for a specific issue
func (r *engagementEventRepository) GetMetricsForIssue(ctx context.Context, issueID uuid.UUID) (*domain.EngagementMetrics, error) {
	if issueID == uuid.Nil {
		return nil, fmt.Errorf("issue ID cannot be nil")
	}

	query := `
		SELECT
			COUNT(CASE WHEN event_type = 'open' THEN 1 END) as total_opens,
			COUNT(DISTINCT CASE WHEN event_type = 'open' THEN contact_id END) as unique_opens,
			COUNT(CASE WHEN event_type = 'click' THEN 1 END) as total_clicks,
			COUNT(DISTINCT CASE WHEN event_type = 'click' THEN contact_id END) as unique_clicks,
			COUNT(CASE WHEN event_type = 'bounce' THEN 1 END) as bounces,
			COUNT(CASE WHEN event_type = 'unsubscribe' THEN 1 END) as unsubscribes,
			COUNT(CASE WHEN event_type = 'complaint' THEN 1 END) as complaints
		FROM engagement_events
		WHERE issue_id = $1
	`

	metrics := &domain.EngagementMetrics{}
	err := r.db.Pool.QueryRow(ctx, query, issueID).Scan(
		&metrics.TotalOpens,
		&metrics.UniqueOpens,
		&metrics.TotalClicks,
		&metrics.UniqueClicks,
		&metrics.Bounces,
		&metrics.Unsubscribes,
		&metrics.Complaints,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get metrics for issue: %w", err)
	}

	// Get total recipients from issue
	issueQuery := `SELECT total_recipients FROM newsletter_issues WHERE id = $1`
	var totalRecipients sql.NullInt32
	err = r.db.Pool.QueryRow(ctx, issueQuery, issueID).Scan(&totalRecipients)
	if err != nil {
		return nil, fmt.Errorf("failed to get total recipients: %w", err)
	}

	recipients := 0
	if totalRecipients.Valid {
		recipients = int(totalRecipients.Int32)
	}

	// Calculate rates
	if recipients > 0 {
		metrics.OpenRate = float64(metrics.UniqueOpens) / float64(recipients) * 100
		metrics.ClickRate = float64(metrics.UniqueClicks) / float64(recipients) * 100
		metrics.BounceRate = float64(metrics.Bounces) / float64(recipients) * 100
		metrics.UnsubscribeRate = float64(metrics.Unsubscribes) / float64(recipients) * 100
	}

	// Calculate click-to-open rate
	if metrics.UniqueOpens > 0 {
		metrics.CTOR = float64(metrics.UniqueClicks) / float64(metrics.UniqueOpens) * 100
	}

	return metrics, nil
}

// GetTopicEngagement retrieves engagement metrics grouped by topic tag
func (r *engagementEventRepository) GetTopicEngagement(ctx context.Context, issueID uuid.UUID) ([]domain.TopicEngagement, error) {
	if issueID == uuid.Nil {
		return nil, fmt.Errorf("issue ID cannot be nil")
	}

	query := `
		SELECT
			topic_tag,
			COUNT(CASE WHEN event_type = 'open' THEN 1 END) as opens,
			COUNT(CASE WHEN event_type = 'click' THEN 1 END) as clicks
		FROM engagement_events
		WHERE issue_id = $1 AND topic_tag IS NOT NULL AND topic_tag != ''
		GROUP BY topic_tag
		ORDER BY clicks DESC, opens DESC
	`

	rows, err := r.db.Pool.Query(ctx, query, issueID)
	if err != nil {
		return nil, fmt.Errorf("failed to get topic engagement: %w", err)
	}
	defer rows.Close()

	engagements := make([]domain.TopicEngagement, 0)
	for rows.Next() {
		var engagement domain.TopicEngagement
		err := rows.Scan(
			&engagement.TopicTag,
			&engagement.Opens,
			&engagement.Clicks,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan topic engagement: %w", err)
		}

		// Calculate CTR
		if engagement.Opens > 0 {
			engagement.CTR = float64(engagement.Clicks) / float64(engagement.Opens) * 100
		}

		engagements = append(engagements, engagement)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating topic engagement: %w", err)
	}

	return engagements, nil
}

// GetDeviceBreakdown calculates engagement distribution by device type
func (r *engagementEventRepository) GetDeviceBreakdown(ctx context.Context, issueID uuid.UUID) (*domain.DeviceBreakdown, error) {
	if issueID == uuid.Nil {
		return nil, fmt.Errorf("issue ID cannot be nil")
	}

	query := `
		SELECT
			COALESCE(device_type, 'unknown') as device,
			COUNT(*) as count
		FROM engagement_events
		WHERE issue_id = $1
		  AND event_type IN ('open', 'click')
		GROUP BY device_type
	`

	rows, err := r.db.Pool.Query(ctx, query, issueID)
	if err != nil {
		return nil, fmt.Errorf("failed to get device breakdown: %w", err)
	}
	defer rows.Close()

	deviceCounts := make(map[string]int)
	total := 0

	for rows.Next() {
		var device string
		var count int
		err := rows.Scan(&device, &count)
		if err != nil {
			return nil, fmt.Errorf("failed to scan device breakdown: %w", err)
		}

		deviceCounts[strings.ToLower(device)] = count
		total += count
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating device breakdown: %w", err)
	}

	breakdown := &domain.DeviceBreakdown{}

	if total > 0 {
		breakdown.Desktop = float64(deviceCounts["desktop"]) / float64(total) * 100
		breakdown.Mobile = float64(deviceCounts["mobile"]) / float64(total) * 100
		breakdown.Tablet = float64(deviceCounts["tablet"]) / float64(total) * 100
		breakdown.Unknown = float64(deviceCounts["unknown"]) / float64(total) * 100
	}

	return breakdown, nil
}

// GetTopPerformingContent retrieves the top performing content blocks by clicks
func (r *engagementEventRepository) GetTopPerformingContent(ctx context.Context, issueID uuid.UUID, limit int) ([]ContentPerformance, error) {
	if issueID == uuid.Nil {
		return nil, fmt.Errorf("issue ID cannot be nil")
	}

	if limit <= 0 {
		limit = 10
	}

	query := `
		SELECT
			block_id,
			clicked_url,
			COUNT(*) as click_count
		FROM engagement_events
		WHERE issue_id = $1
		  AND event_type = 'click'
		  AND block_id IS NOT NULL
		  AND clicked_url IS NOT NULL
		GROUP BY block_id, clicked_url
		ORDER BY click_count DESC
		LIMIT $2
	`

	rows, err := r.db.Pool.Query(ctx, query, issueID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get top performing content: %w", err)
	}
	defer rows.Close()

	performances := make([]ContentPerformance, 0)
	for rows.Next() {
		var perf ContentPerformance
		var clickedURL sql.NullString

		err := rows.Scan(
			&perf.BlockID,
			&clickedURL,
			&perf.ClickCount,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan content performance: %w", err)
		}

		if clickedURL.Valid {
			perf.LinkURL = clickedURL.String
		}

		performances = append(performances, perf)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating content performance: %w", err)
	}

	return performances, nil
}

// RecordUnsubscribe records an unsubscribe event and updates the contact's status
func (r *engagementEventRepository) RecordUnsubscribe(ctx context.Context, contactID uuid.UUID, issueID uuid.UUID) error {
	if contactID == uuid.Nil {
		return fmt.Errorf("contact ID cannot be nil")
	}

	if issueID == uuid.Nil {
		return fmt.Errorf("issue ID cannot be nil")
	}

	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Create unsubscribe event
	event := &domain.EngagementEvent{
		ID:             uuid.New(),
		ContactID:      contactID,
		IssueID:        issueID,
		EventType:      domain.EventTypeUnsubscribe,
		EventTimestamp: time.Now(),
		CreatedAt:      time.Now(),
	}

	insertQuery := `
		INSERT INTO engagement_events (
			id, contact_id, issue_id, block_id, variant_id, event_type,
			event_timestamp, clicked_url, topic_tag, framework_tag, content_type,
			block_position, utm_source, utm_medium, utm_campaign, utm_content,
			device_type, email_client, ip_address, user_agent, created_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
		ON CONFLICT (contact_id, issue_id, event_type, event_timestamp)
		DO NOTHING
	`

	_, err = tx.Exec(ctx, insertQuery,
		event.ID,
		event.ContactID,
		event.IssueID,
		event.BlockID,
		event.VariantID,
		event.EventType,
		event.EventTimestamp,
		event.ClickedURL,
		event.TopicTag,
		event.FrameworkTag,
		event.ContentType,
		event.BlockPosition,
		event.UTMSource,
		event.UTMMedium,
		event.UTMCampaign,
		event.UTMContent,
		event.DeviceType,
		event.EmailClient,
		event.IPAddress,
		event.UserAgent,
		event.CreatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to insert unsubscribe event: %w", err)
	}

	// Update contact status
	updateQuery := `
		UPDATE contacts
		SET is_unsubscribed = true, updated_at = $2
		WHERE id = $1
	`

	cmdTag, err := tx.Exec(ctx, updateQuery, contactID, time.Now())
	if err != nil {
		return fmt.Errorf("failed to update contact unsubscribe status: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("contact not found: %s", contactID)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}
