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

type newsletterIssueRepository struct {
	db *DB
}

// NewNewsletterIssueRepository creates a new PostgreSQL newsletter issue repository
func NewNewsletterIssueRepository(db *DB) repository.NewsletterIssueRepository {
	if db == nil {
		panic("database cannot be nil")
	}
	return &newsletterIssueRepository{db: db}
}

// Create creates a new newsletter issue
func (r *newsletterIssueRepository) Create(ctx context.Context, issue *domain.NewsletterIssue) error {
	if issue == nil {
		return fmt.Errorf("newsletter issue cannot be nil")
	}

	if err := issue.Validate(); err != nil {
		return fmt.Errorf("invalid newsletter issue: %w", err)
	}

	generationMetadataJSON, err := json.Marshal(issue.GenerationMetadata)
	if err != nil {
		return fmt.Errorf("failed to marshal generation_metadata: %w", err)
	}

	// Query matches actual database schema from migration 000008
	query := `
		INSERT INTO newsletter_issues (
			id, configuration_id, segment_id, issue_number, issue_date,
			subject_lines, selected_subject_line, preheader, intro_template,
			status, approved_by, approved_at, rejection_reason,
			scheduled_for, sent_at, esp_campaign_id,
			total_recipients, total_delivered, total_opens, total_clicks,
			total_bounces, total_unsubscribes,
			generation_metadata,
			created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
	`

	_, err = r.db.Pool.Exec(ctx, query,
		issue.ID,
		issue.ConfigurationID,
		issue.SegmentID,
		issue.IssueNumber,
		issue.IssueDate,
		pq.Array(issue.SubjectLines),
		issue.SelectedSubjectLine,
		issue.Preheader,
		issue.IntroTemplate,
		issue.Status,
		issue.ApprovedBy,
		issue.ApprovedAt,
		issue.RejectionReason,
		issue.ScheduledFor,
		issue.SentAt,
		issue.ESPCampaignID,
		issue.TotalRecipients,
		issue.TotalDelivered,
		issue.TotalOpens,
		issue.TotalClicks,
		issue.TotalBounces,
		issue.TotalUnsubscribes,
		generationMetadataJSON,
		issue.CreatedAt,
		issue.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create newsletter issue: %w", err)
	}

	return nil
}

// GetByID retrieves a newsletter issue by ID
func (r *newsletterIssueRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.NewsletterIssue, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("newsletter issue ID cannot be nil")
	}

	// Query matches actual database schema from migration 000008
	query := `
		SELECT
			id, configuration_id, segment_id, issue_number, issue_date,
			subject_lines, selected_subject_line, preheader, intro_template,
			status, approved_by, approved_at, rejection_reason,
			scheduled_for, sent_at, esp_campaign_id,
			total_recipients, total_delivered, total_opens, total_clicks,
			total_bounces, total_unsubscribes,
			generation_metadata,
			created_at, updated_at
		FROM newsletter_issues
		WHERE id = $1
	`

	issue := &domain.NewsletterIssue{}
	var subjectLines []string
	var generationMetadataJSON []byte

	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&issue.ID,
		&issue.ConfigurationID,
		&issue.SegmentID,
		&issue.IssueNumber,
		&issue.IssueDate,
		&subjectLines,
		&issue.SelectedSubjectLine,
		&issue.Preheader,
		&issue.IntroTemplate,
		&issue.Status,
		&issue.ApprovedBy,
		&issue.ApprovedAt,
		&issue.RejectionReason,
		&issue.ScheduledFor,
		&issue.SentAt,
		&issue.ESPCampaignID,
		&issue.TotalRecipients,
		&issue.TotalDelivered,
		&issue.TotalOpens,
		&issue.TotalClicks,
		&issue.TotalBounces,
		&issue.TotalUnsubscribes,
		&generationMetadataJSON,
		&issue.CreatedAt,
		&issue.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("newsletter issue not found: %w", err)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get newsletter issue: %w", err)
	}

	issue.SubjectLines = subjectLines

	if len(generationMetadataJSON) > 0 {
		if err := json.Unmarshal(generationMetadataJSON, &issue.GenerationMetadata); err != nil {
			return nil, fmt.Errorf("failed to unmarshal generation_metadata: %w", err)
		}
	}

	return issue, nil
}

// List retrieves newsletter issues with filtering and pagination
func (r *newsletterIssueRepository) List(ctx context.Context, filter *domain.NewsletterIssueFilter) ([]*domain.NewsletterIssue, int, error) {
	if filter == nil {
		return nil, 0, fmt.Errorf("filter cannot be nil")
	}

	// Build WHERE clauses dynamically
	whereClauses := []string{}
	args := []interface{}{}
	argPos := 1

	if filter.Status != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("status = $%d", argPos))
		args = append(args, *filter.Status)
		argPos++
	}

	if filter.ConfigurationID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("configuration_id = $%d", argPos))
		args = append(args, *filter.ConfigurationID)
		argPos++
	}

	if filter.SegmentID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("segment_id = $%d", argPos))
		args = append(args, *filter.SegmentID)
		argPos++
	}

	if filter.StartDate != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("issue_date >= $%d", argPos))
		args = append(args, *filter.StartDate)
		argPos++
	}

	if filter.EndDate != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("issue_date <= $%d", argPos))
		args = append(args, *filter.EndDate)
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
	countQuery := "SELECT COUNT(*) FROM newsletter_issues " + whereClause
	var total int
	err := r.db.Pool.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count newsletter issues: %w", err)
	}

	// Query with pagination
	query := `
		SELECT
			id, configuration_id, segment_id, issue_number, issue_date,
			subject_lines, selected_subject_line, preheader, intro_template,
			status, approved_by, approved_at, rejection_reason, rejected_by, rejected_at,
			scheduled_for, sent_at, esp_campaign_id,
			total_recipients, total_delivered, total_opens, total_clicks,
			total_bounces, total_unsubscribes, total_complaints,
			version, ai_model_used, prompt_version_used, generation_metadata,
			created_by, created_at, updated_at
		FROM newsletter_issues
		` + whereClause + `
		ORDER BY issue_date DESC, created_at DESC
		LIMIT $` + fmt.Sprintf("%d", argPos) + ` OFFSET $` + fmt.Sprintf("%d", argPos+1)

	args = append(args, filter.Limit, filter.Offset)

	rows, err := r.db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list newsletter issues: %w", err)
	}
	defer rows.Close()

	issues := make([]*domain.NewsletterIssue, 0)
	for rows.Next() {
		issue := &domain.NewsletterIssue{}
		var subjectLines []string
		var generationMetadataJSON []byte

		err := rows.Scan(
			&issue.ID,
			&issue.ConfigurationID,
			&issue.SegmentID,
			&issue.IssueNumber,
			&issue.IssueDate,
			&subjectLines,
			&issue.SelectedSubjectLine,
			&issue.Preheader,
			&issue.IntroTemplate,
			&issue.Status,
			&issue.ApprovedBy,
			&issue.ApprovedAt,
			&issue.RejectionReason,
			&issue.RejectedBy,
			&issue.RejectedAt,
			&issue.ScheduledFor,
			&issue.SentAt,
			&issue.ESPCampaignID,
			&issue.TotalRecipients,
			&issue.TotalDelivered,
			&issue.TotalOpens,
			&issue.TotalClicks,
			&issue.TotalBounces,
			&issue.TotalUnsubscribes,
			&issue.TotalComplaints,
			&issue.Version,
			&issue.AIModelUsed,
			&issue.PromptVersionUsed,
			&generationMetadataJSON,
			&issue.CreatedBy,
			&issue.CreatedAt,
			&issue.UpdatedAt,
		)

		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan newsletter issue: %w", err)
		}

		issue.SubjectLines = subjectLines

		if len(generationMetadataJSON) > 0 {
			if err := json.Unmarshal(generationMetadataJSON, &issue.GenerationMetadata); err != nil {
				return nil, 0, fmt.Errorf("failed to unmarshal generation_metadata: %w", err)
			}
		}

		issues = append(issues, issue)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating newsletter issues: %w", err)
	}

	return issues, total, nil
}

// Update updates an existing newsletter issue
func (r *newsletterIssueRepository) Update(ctx context.Context, issue *domain.NewsletterIssue) error {
	if issue == nil {
		return fmt.Errorf("newsletter issue cannot be nil")
	}

	if err := issue.Validate(); err != nil {
		return fmt.Errorf("invalid newsletter issue: %w", err)
	}

	generationMetadataJSON, err := json.Marshal(issue.GenerationMetadata)
	if err != nil {
		return fmt.Errorf("failed to marshal generation_metadata: %w", err)
	}

	query := `
		UPDATE newsletter_issues
		SET
			configuration_id = $2,
			segment_id = $3,
			issue_number = $4,
			issue_date = $5,
			subject_lines = $6,
			selected_subject_line = $7,
			preheader = $8,
			intro_template = $9,
			status = $10,
			approved_by = $11,
			approved_at = $12,
			rejection_reason = $13,
			rejected_by = $14,
			rejected_at = $15,
			scheduled_for = $16,
			sent_at = $17,
			esp_campaign_id = $18,
			total_recipients = $19,
			total_delivered = $20,
			total_opens = $21,
			total_clicks = $22,
			total_bounces = $23,
			total_unsubscribes = $24,
			total_complaints = $25,
			version = $26,
			ai_model_used = $27,
			prompt_version_used = $28,
			generation_metadata = $29,
			updated_at = $30
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query,
		issue.ID,
		issue.ConfigurationID,
		issue.SegmentID,
		issue.IssueNumber,
		issue.IssueDate,
		pq.Array(issue.SubjectLines),
		issue.SelectedSubjectLine,
		issue.Preheader,
		issue.IntroTemplate,
		issue.Status,
		issue.ApprovedBy,
		issue.ApprovedAt,
		issue.RejectionReason,
		issue.RejectedBy,
		issue.RejectedAt,
		issue.ScheduledFor,
		issue.SentAt,
		issue.ESPCampaignID,
		issue.TotalRecipients,
		issue.TotalDelivered,
		issue.TotalOpens,
		issue.TotalClicks,
		issue.TotalBounces,
		issue.TotalUnsubscribes,
		issue.TotalComplaints,
		issue.Version,
		issue.AIModelUsed,
		issue.PromptVersionUsed,
		generationMetadataJSON,
		issue.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to update newsletter issue: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("newsletter issue not found")
	}

	return nil
}

// Delete deletes a newsletter issue by ID
func (r *newsletterIssueRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("newsletter issue ID cannot be nil")
	}

	query := `DELETE FROM newsletter_issues WHERE id = $1`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete newsletter issue: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("newsletter issue not found")
	}

	return nil
}

// GetByConfigAndNumber retrieves an issue by configuration ID and issue number
func (r *newsletterIssueRepository) GetByConfigAndNumber(ctx context.Context, configID uuid.UUID, number int) (*domain.NewsletterIssue, error) {
	if configID == uuid.Nil {
		return nil, fmt.Errorf("configuration ID cannot be nil")
	}

	if number <= 0 {
		return nil, fmt.Errorf("issue number must be positive")
	}

	query := `
		SELECT
			id, configuration_id, segment_id, issue_number, issue_date,
			subject_lines, selected_subject_line, preheader, intro_template,
			status, approved_by, approved_at, rejection_reason, rejected_by, rejected_at,
			scheduled_for, sent_at, esp_campaign_id,
			total_recipients, total_delivered, total_opens, total_clicks,
			total_bounces, total_unsubscribes, total_complaints,
			version, ai_model_used, prompt_version_used, generation_metadata,
			created_by, created_at, updated_at
		FROM newsletter_issues
		WHERE configuration_id = $1 AND issue_number = $2
	`

	issue := &domain.NewsletterIssue{}
	var subjectLines []string
	var generationMetadataJSON []byte

	err := r.db.Pool.QueryRow(ctx, query, configID, number).Scan(
		&issue.ID,
		&issue.ConfigurationID,
		&issue.SegmentID,
		&issue.IssueNumber,
		&issue.IssueDate,
		&subjectLines,
		&issue.SelectedSubjectLine,
		&issue.Preheader,
		&issue.IntroTemplate,
		&issue.Status,
		&issue.ApprovedBy,
		&issue.ApprovedAt,
		&issue.RejectionReason,
		&issue.RejectedBy,
		&issue.RejectedAt,
		&issue.ScheduledFor,
		&issue.SentAt,
		&issue.ESPCampaignID,
		&issue.TotalRecipients,
		&issue.TotalDelivered,
		&issue.TotalOpens,
		&issue.TotalClicks,
		&issue.TotalBounces,
		&issue.TotalUnsubscribes,
		&issue.TotalComplaints,
		&issue.Version,
		&issue.AIModelUsed,
		&issue.PromptVersionUsed,
		&generationMetadataJSON,
		&issue.CreatedBy,
		&issue.CreatedAt,
		&issue.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil // Not found is acceptable for this lookup
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get newsletter issue: %w", err)
	}

	issue.SubjectLines = subjectLines

	if len(generationMetadataJSON) > 0 {
		if err := json.Unmarshal(generationMetadataJSON, &issue.GenerationMetadata); err != nil {
			return nil, fmt.Errorf("failed to unmarshal generation_metadata: %w", err)
		}
	}

	return issue, nil
}

// GetNextIssueNumber returns the next issue number for a configuration
func (r *newsletterIssueRepository) GetNextIssueNumber(ctx context.Context, configID uuid.UUID) (int, error) {
	if configID == uuid.Nil {
		return 0, fmt.Errorf("configuration ID cannot be nil")
	}

	query := `
		SELECT COALESCE(MAX(issue_number), 0) + 1
		FROM newsletter_issues
		WHERE configuration_id = $1
	`

	var nextNumber int
	err := r.db.Pool.QueryRow(ctx, query, configID).Scan(&nextNumber)
	if err != nil {
		return 0, fmt.Errorf("failed to get next issue number: %w", err)
	}

	return nextNumber, nil
}

// UpdateStatus updates the status of a newsletter issue
func (r *newsletterIssueRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.IssueStatus) error {
	if id == uuid.Nil {
		return fmt.Errorf("newsletter issue ID cannot be nil")
	}

	if !status.IsValid() {
		return fmt.Errorf("invalid status: %s", status)
	}

	query := `
		UPDATE newsletter_issues
		SET status = $2, updated_at = $3
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id, status, time.Now())
	if err != nil {
		return fmt.Errorf("failed to update status: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("newsletter issue not found")
	}

	return nil
}

// UpdateMetrics updates the engagement metrics for a newsletter issue
func (r *newsletterIssueRepository) UpdateMetrics(ctx context.Context, id uuid.UUID, recipients, delivered, opens, clicks, bounces, unsubscribes, complaints int) error {
	if id == uuid.Nil {
		return fmt.Errorf("newsletter issue ID cannot be nil")
	}

	query := `
		UPDATE newsletter_issues
		SET
			total_recipients = $2,
			total_delivered = $3,
			total_opens = $4,
			total_clicks = $5,
			total_bounces = $6,
			total_unsubscribes = $7,
			total_complaints = $8,
			updated_at = $9
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query,
		id,
		recipients,
		delivered,
		opens,
		clicks,
		bounces,
		unsubscribes,
		complaints,
		time.Now(),
	)

	if err != nil {
		return fmt.Errorf("failed to update metrics: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("newsletter issue not found")
	}

	return nil
}

// GetPendingApprovals retrieves all issues pending approval
func (r *newsletterIssueRepository) GetPendingApprovals(ctx context.Context) ([]*domain.NewsletterIssue, error) {
	query := `
		SELECT
			id, configuration_id, segment_id, issue_number, issue_date,
			subject_lines, selected_subject_line, preheader, intro_template,
			status, approved_by, approved_at, rejection_reason, rejected_by, rejected_at,
			scheduled_for, sent_at, esp_campaign_id,
			total_recipients, total_delivered, total_opens, total_clicks,
			total_bounces, total_unsubscribes, total_complaints,
			version, ai_model_used, prompt_version_used, generation_metadata,
			created_by, created_at, updated_at
		FROM newsletter_issues
		WHERE status = $1
		ORDER BY created_at ASC
	`

	rows, err := r.db.Pool.Query(ctx, query, domain.IssueStatusPendingApproval)
	if err != nil {
		return nil, fmt.Errorf("failed to get pending approvals: %w", err)
	}
	defer rows.Close()

	issues := make([]*domain.NewsletterIssue, 0)
	for rows.Next() {
		issue := &domain.NewsletterIssue{}
		var subjectLines []string
		var generationMetadataJSON []byte

		err := rows.Scan(
			&issue.ID,
			&issue.ConfigurationID,
			&issue.SegmentID,
			&issue.IssueNumber,
			&issue.IssueDate,
			&subjectLines,
			&issue.SelectedSubjectLine,
			&issue.Preheader,
			&issue.IntroTemplate,
			&issue.Status,
			&issue.ApprovedBy,
			&issue.ApprovedAt,
			&issue.RejectionReason,
			&issue.RejectedBy,
			&issue.RejectedAt,
			&issue.ScheduledFor,
			&issue.SentAt,
			&issue.ESPCampaignID,
			&issue.TotalRecipients,
			&issue.TotalDelivered,
			&issue.TotalOpens,
			&issue.TotalClicks,
			&issue.TotalBounces,
			&issue.TotalUnsubscribes,
			&issue.TotalComplaints,
			&issue.Version,
			&issue.AIModelUsed,
			&issue.PromptVersionUsed,
			&generationMetadataJSON,
			&issue.CreatedBy,
			&issue.CreatedAt,
			&issue.UpdatedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan newsletter issue: %w", err)
		}

		issue.SubjectLines = subjectLines

		if len(generationMetadataJSON) > 0 {
			if err := json.Unmarshal(generationMetadataJSON, &issue.GenerationMetadata); err != nil {
				return nil, fmt.Errorf("failed to unmarshal generation_metadata: %w", err)
			}
		}

		issues = append(issues, issue)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating newsletter issues: %w", err)
	}

	return issues, nil
}

// GetScheduledIssues retrieves issues scheduled before a given time
func (r *newsletterIssueRepository) GetScheduledIssues(ctx context.Context, before time.Time) ([]*domain.NewsletterIssue, error) {
	query := `
		SELECT
			id, configuration_id, segment_id, issue_number, issue_date,
			subject_lines, selected_subject_line, preheader, intro_template,
			status, approved_by, approved_at, rejection_reason, rejected_by, rejected_at,
			scheduled_for, sent_at, esp_campaign_id,
			total_recipients, total_delivered, total_opens, total_clicks,
			total_bounces, total_unsubscribes, total_complaints,
			version, ai_model_used, prompt_version_used, generation_metadata,
			created_by, created_at, updated_at
		FROM newsletter_issues
		WHERE status = $1 AND scheduled_for <= $2
		ORDER BY scheduled_for ASC
	`

	rows, err := r.db.Pool.Query(ctx, query, domain.IssueStatusScheduled, before)
	if err != nil {
		return nil, fmt.Errorf("failed to get scheduled issues: %w", err)
	}
	defer rows.Close()

	issues := make([]*domain.NewsletterIssue, 0)
	for rows.Next() {
		issue := &domain.NewsletterIssue{}
		var subjectLines []string
		var generationMetadataJSON []byte

		err := rows.Scan(
			&issue.ID,
			&issue.ConfigurationID,
			&issue.SegmentID,
			&issue.IssueNumber,
			&issue.IssueDate,
			&subjectLines,
			&issue.SelectedSubjectLine,
			&issue.Preheader,
			&issue.IntroTemplate,
			&issue.Status,
			&issue.ApprovedBy,
			&issue.ApprovedAt,
			&issue.RejectionReason,
			&issue.RejectedBy,
			&issue.RejectedAt,
			&issue.ScheduledFor,
			&issue.SentAt,
			&issue.ESPCampaignID,
			&issue.TotalRecipients,
			&issue.TotalDelivered,
			&issue.TotalOpens,
			&issue.TotalClicks,
			&issue.TotalBounces,
			&issue.TotalUnsubscribes,
			&issue.TotalComplaints,
			&issue.Version,
			&issue.AIModelUsed,
			&issue.PromptVersionUsed,
			&generationMetadataJSON,
			&issue.CreatedBy,
			&issue.CreatedAt,
			&issue.UpdatedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan newsletter issue: %w", err)
		}

		issue.SubjectLines = subjectLines

		if len(generationMetadataJSON) > 0 {
			if err := json.Unmarshal(generationMetadataJSON, &issue.GenerationMetadata); err != nil {
				return nil, fmt.Errorf("failed to unmarshal generation_metadata: %w", err)
			}
		}

		issues = append(issues, issue)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating newsletter issues: %w", err)
	}

	return issues, nil
}
