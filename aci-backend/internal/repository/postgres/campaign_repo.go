package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/lib/pq"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/repository"
)

type campaignRepository struct {
	db *DB
}

// NewCampaignRepository creates a new PostgreSQL campaign repository
func NewCampaignRepository(db *DB) repository.CampaignRepository {
	if db == nil {
		panic("database cannot be nil")
	}
	return &campaignRepository{db: db}
}

// Create creates a new campaign
func (r *campaignRepository) Create(ctx context.Context, campaign *domain.Campaign) error {
	if campaign == nil {
		return fmt.Errorf("campaign cannot be nil")
	}

	if err := campaign.Validate(); err != nil {
		return fmt.Errorf("invalid campaign: %w", err)
	}

	// Marshal JSONB fields
	configJSON, err := json.Marshal(campaign.Config)
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	statsJSON, err := json.Marshal(campaign.Stats)
	if err != nil {
		return fmt.Errorf("failed to marshal stats: %w", err)
	}

	// Convert enums to strings
	channelStrs := make([]string, len(campaign.Channels))
	for i, ch := range campaign.Channels {
		channelStrs[i] = ch.String()
	}

	// Ensure arrays are not nil
	topics := campaign.Topics
	if topics == nil {
		topics = []string{}
	}

	workflowIDs := campaign.WorkflowIDs
	if workflowIDs == nil {
		workflowIDs = []string{}
	}

	query := `
		INSERT INTO campaigns (
			id, tenant_id, name, description, goal, status,
			channels, start_date, end_date, frequency, content_style,
			topics, config, workflow_ids, stats,
			created_by, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
	`

	_, err = r.db.Pool.Exec(ctx, query,
		campaign.ID,
		campaign.TenantID,
		campaign.Name,
		campaign.Description,
		campaign.Goal.String(),
		campaign.Status.String(),
		pq.Array(channelStrs),
		campaign.StartDate,
		campaign.EndDate,
		campaign.Frequency.String(),
		campaign.ContentStyle.String(),
		pq.Array(topics),
		configJSON,
		pq.Array(workflowIDs),
		statsJSON,
		campaign.CreatedBy,
		campaign.CreatedAt,
		campaign.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create campaign: %w", err)
	}

	return nil
}

// GetByID retrieves a campaign by ID
func (r *campaignRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Campaign, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("campaign ID cannot be nil")
	}

	query := `
		SELECT
			id, tenant_id, name, description, goal, status,
			channels, start_date, end_date, frequency, content_style,
			topics, config, workflow_ids, stats,
			created_by, created_at, updated_at
		FROM campaigns
		WHERE id = $1
	`

	campaign := &domain.Campaign{}
	var (
		goalStr         string
		statusStr       string
		channelStrs     []string
		frequencyStr    string
		contentStyleStr string
		configJSON      []byte
		statsJSON       []byte
	)

	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&campaign.ID,
		&campaign.TenantID,
		&campaign.Name,
		&campaign.Description,
		&goalStr,
		&statusStr,
		pq.Array(&channelStrs),
		&campaign.StartDate,
		&campaign.EndDate,
		&frequencyStr,
		&contentStyleStr,
		pq.Array(&campaign.Topics),
		&configJSON,
		pq.Array(&campaign.WorkflowIDs),
		&statsJSON,
		&campaign.CreatedBy,
		&campaign.CreatedAt,
		&campaign.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("campaign not found: %w", err)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get campaign: %w", err)
	}

	// Convert strings to enums
	campaign.Goal = domain.CampaignGoal(goalStr)
	campaign.Status = domain.CampaignStatus(statusStr)
	campaign.Frequency = domain.Frequency(frequencyStr)
	campaign.ContentStyle = domain.ContentStyle(contentStyleStr)

	campaign.Channels = make([]domain.Channel, len(channelStrs))
	for i, ch := range channelStrs {
		campaign.Channels[i] = domain.Channel(ch)
	}

	// Unmarshal JSONB fields
	if err := json.Unmarshal(configJSON, &campaign.Config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	if err := json.Unmarshal(statsJSON, &campaign.Stats); err != nil {
		return nil, fmt.Errorf("failed to unmarshal stats: %w", err)
	}

	return campaign, nil
}

// List retrieves campaigns with filtering and pagination
func (r *campaignRepository) List(ctx context.Context, filter *domain.CampaignFilter) ([]*domain.Campaign, int, error) {
	if filter == nil {
		return nil, 0, fmt.Errorf("filter cannot be nil")
	}

	if filter.PageSize <= 0 {
		filter.PageSize = 20
	}

	if filter.PageSize > 100 {
		filter.PageSize = 100
	}

	if filter.Page < 1 {
		filter.Page = 1
	}

	// Build WHERE clauses dynamically
	whereClauses := []string{"tenant_id = $1"}
	args := []interface{}{filter.TenantID}
	argPos := 2

	if filter.Status != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("status = $%d", argPos))
		args = append(args, filter.Status.String())
		argPos++
	}

	if filter.Goal != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("goal = $%d", argPos))
		args = append(args, filter.Goal.String())
		argPos++
	}

	if filter.Channel != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("$%d = ANY(channels)", argPos))
		args = append(args, filter.Channel.String())
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

	whereClause := "WHERE " + whereClauses[0]
	for i := 1; i < len(whereClauses); i++ {
		whereClause += " AND " + whereClauses[i]
	}

	// Count total matching records
	countQuery := "SELECT COUNT(*) FROM campaigns " + whereClause
	var total int
	err := r.db.Pool.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count campaigns: %w", err)
	}

	// Calculate offset
	offset := (filter.Page - 1) * filter.PageSize

	// Query with pagination
	query := `
		SELECT
			id, tenant_id, name, description, goal, status,
			channels, start_date, end_date, frequency, content_style,
			topics, config, workflow_ids, stats,
			created_by, created_at, updated_at
		FROM campaigns
		` + whereClause + `
		ORDER BY created_at DESC
		LIMIT $` + fmt.Sprintf("%d", argPos) + ` OFFSET $` + fmt.Sprintf("%d", argPos+1)

	args = append(args, filter.PageSize, offset)

	rows, err := r.db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list campaigns: %w", err)
	}
	defer rows.Close()

	campaigns := make([]*domain.Campaign, 0)
	for rows.Next() {
		campaign := &domain.Campaign{}
		var (
			goalStr         string
			statusStr       string
			channelStrs     []string
			frequencyStr    string
			contentStyleStr string
			configJSON      []byte
			statsJSON       []byte
		)

		err := rows.Scan(
			&campaign.ID,
			&campaign.TenantID,
			&campaign.Name,
			&campaign.Description,
			&goalStr,
			&statusStr,
			pq.Array(&channelStrs),
			&campaign.StartDate,
			&campaign.EndDate,
			&frequencyStr,
			&contentStyleStr,
			pq.Array(&campaign.Topics),
			&configJSON,
			pq.Array(&campaign.WorkflowIDs),
			&statsJSON,
			&campaign.CreatedBy,
			&campaign.CreatedAt,
			&campaign.UpdatedAt,
		)

		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan campaign: %w", err)
		}

		// Convert strings to enums
		campaign.Goal = domain.CampaignGoal(goalStr)
		campaign.Status = domain.CampaignStatus(statusStr)
		campaign.Frequency = domain.Frequency(frequencyStr)
		campaign.ContentStyle = domain.ContentStyle(contentStyleStr)

		campaign.Channels = make([]domain.Channel, len(channelStrs))
		for i, ch := range channelStrs {
			campaign.Channels[i] = domain.Channel(ch)
		}

		// Unmarshal JSONB fields
		if err := json.Unmarshal(configJSON, &campaign.Config); err != nil {
			return nil, 0, fmt.Errorf("failed to unmarshal config: %w", err)
		}

		if err := json.Unmarshal(statsJSON, &campaign.Stats); err != nil {
			return nil, 0, fmt.Errorf("failed to unmarshal stats: %w", err)
		}

		campaigns = append(campaigns, campaign)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating campaigns: %w", err)
	}

	return campaigns, total, nil
}

// Update updates an existing campaign
func (r *campaignRepository) Update(ctx context.Context, campaign *domain.Campaign) error {
	if campaign == nil {
		return fmt.Errorf("campaign cannot be nil")
	}

	if err := campaign.Validate(); err != nil {
		return fmt.Errorf("invalid campaign: %w", err)
	}

	// Marshal JSONB fields
	configJSON, err := json.Marshal(campaign.Config)
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	statsJSON, err := json.Marshal(campaign.Stats)
	if err != nil {
		return fmt.Errorf("failed to marshal stats: %w", err)
	}

	// Convert enums to strings
	channelStrs := make([]string, len(campaign.Channels))
	for i, ch := range campaign.Channels {
		channelStrs[i] = ch.String()
	}

	// Ensure arrays are not nil
	topics := campaign.Topics
	if topics == nil {
		topics = []string{}
	}

	workflowIDs := campaign.WorkflowIDs
	if workflowIDs == nil {
		workflowIDs = []string{}
	}

	query := `
		UPDATE campaigns
		SET
			name = $2,
			description = $3,
			goal = $4,
			status = $5,
			channels = $6,
			start_date = $7,
			end_date = $8,
			frequency = $9,
			content_style = $10,
			topics = $11,
			config = $12,
			workflow_ids = $13,
			stats = $14,
			updated_at = $15
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query,
		campaign.ID,
		campaign.Name,
		campaign.Description,
		campaign.Goal.String(),
		campaign.Status.String(),
		pq.Array(channelStrs),
		campaign.StartDate,
		campaign.EndDate,
		campaign.Frequency.String(),
		campaign.ContentStyle.String(),
		pq.Array(topics),
		configJSON,
		pq.Array(workflowIDs),
		statsJSON,
		campaign.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to update campaign: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("campaign not found")
	}

	return nil
}

// Delete deletes a campaign by ID
func (r *campaignRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("campaign ID cannot be nil")
	}

	query := `DELETE FROM campaigns WHERE id = $1`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete campaign: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("campaign not found")
	}

	return nil
}

// UpdateStatus updates the campaign status
func (r *campaignRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.CampaignStatus) error {
	if id == uuid.Nil {
		return fmt.Errorf("campaign ID cannot be nil")
	}

	if !status.IsValid() {
		return fmt.Errorf("invalid campaign status: %s", status)
	}

	query := `
		UPDATE campaigns
		SET status = $2, updated_at = NOW()
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id, status.String())
	if err != nil {
		return fmt.Errorf("failed to update campaign status: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("campaign not found")
	}

	return nil
}

// UpdateStats updates the campaign statistics
func (r *campaignRepository) UpdateStats(ctx context.Context, id uuid.UUID, stats domain.CampaignStats) error {
	if id == uuid.Nil {
		return fmt.Errorf("campaign ID cannot be nil")
	}

	statsJSON, err := json.Marshal(stats)
	if err != nil {
		return fmt.Errorf("failed to marshal stats: %w", err)
	}

	query := `
		UPDATE campaigns
		SET stats = $2, updated_at = NOW()
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id, statsJSON)
	if err != nil {
		return fmt.Errorf("failed to update campaign stats: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("campaign not found")
	}

	return nil
}

// GetActiveCampaigns retrieves all active campaigns for a tenant
func (r *campaignRepository) GetActiveCampaigns(ctx context.Context, tenantID uuid.UUID) ([]*domain.Campaign, error) {
	if tenantID == uuid.Nil {
		return nil, fmt.Errorf("tenant ID cannot be nil")
	}

	query := `
		SELECT
			id, tenant_id, name, description, goal, status,
			channels, start_date, end_date, frequency, content_style,
			topics, config, workflow_ids, stats,
			created_by, created_at, updated_at
		FROM campaigns
		WHERE tenant_id = $1 AND status = $2
		ORDER BY created_at DESC
	`

	rows, err := r.db.Pool.Query(ctx, query, tenantID, domain.CampaignActive.String())
	if err != nil {
		return nil, fmt.Errorf("failed to get active campaigns: %w", err)
	}
	defer rows.Close()

	campaigns := make([]*domain.Campaign, 0)
	for rows.Next() {
		campaign := &domain.Campaign{}
		var (
			goalStr         string
			statusStr       string
			channelStrs     []string
			frequencyStr    string
			contentStyleStr string
			configJSON      []byte
			statsJSON       []byte
		)

		err := rows.Scan(
			&campaign.ID,
			&campaign.TenantID,
			&campaign.Name,
			&campaign.Description,
			&goalStr,
			&statusStr,
			pq.Array(&channelStrs),
			&campaign.StartDate,
			&campaign.EndDate,
			&frequencyStr,
			&contentStyleStr,
			pq.Array(&campaign.Topics),
			&configJSON,
			pq.Array(&campaign.WorkflowIDs),
			&statsJSON,
			&campaign.CreatedBy,
			&campaign.CreatedAt,
			&campaign.UpdatedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan campaign: %w", err)
		}

		// Convert strings to enums
		campaign.Goal = domain.CampaignGoal(goalStr)
		campaign.Status = domain.CampaignStatus(statusStr)
		campaign.Frequency = domain.Frequency(frequencyStr)
		campaign.ContentStyle = domain.ContentStyle(contentStyleStr)

		campaign.Channels = make([]domain.Channel, len(channelStrs))
		for i, ch := range channelStrs {
			campaign.Channels[i] = domain.Channel(ch)
		}

		// Unmarshal JSONB fields
		if err := json.Unmarshal(configJSON, &campaign.Config); err != nil {
			return nil, fmt.Errorf("failed to unmarshal config: %w", err)
		}

		if err := json.Unmarshal(statsJSON, &campaign.Stats); err != nil {
			return nil, fmt.Errorf("failed to unmarshal stats: %w", err)
		}

		campaigns = append(campaigns, campaign)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating campaigns: %w", err)
	}

	return campaigns, nil
}

// AddWorkflowID adds a workflow ID to the campaign
func (r *campaignRepository) AddWorkflowID(ctx context.Context, id uuid.UUID, workflowID string) error {
	if id == uuid.Nil {
		return fmt.Errorf("campaign ID cannot be nil")
	}

	if workflowID == "" {
		return fmt.Errorf("workflow ID cannot be empty")
	}

	query := `
		UPDATE campaigns
		SET
			workflow_ids = array_append(workflow_ids, $2),
			updated_at = NOW()
		WHERE id = $1 AND NOT ($2 = ANY(workflow_ids))
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id, workflowID)
	if err != nil {
		return fmt.Errorf("failed to add workflow ID: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("campaign not found or workflow ID already exists")
	}

	return nil
}

// RemoveWorkflowID removes a workflow ID from the campaign
func (r *campaignRepository) RemoveWorkflowID(ctx context.Context, id uuid.UUID, workflowID string) error {
	if id == uuid.Nil {
		return fmt.Errorf("campaign ID cannot be nil")
	}

	if workflowID == "" {
		return fmt.Errorf("workflow ID cannot be empty")
	}

	query := `
		UPDATE campaigns
		SET
			workflow_ids = array_remove(workflow_ids, $2),
			updated_at = NOW()
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id, workflowID)
	if err != nil {
		return fmt.Errorf("failed to remove workflow ID: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("campaign not found")
	}

	return nil
}
