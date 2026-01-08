package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/repository"
)

type contactRepository struct {
	db *DB
}

// NewContactRepository creates a new PostgreSQL contact repository
func NewContactRepository(db *DB) repository.ContactRepository {
	if db == nil {
		panic("database cannot be nil")
	}
	return &contactRepository{db: db}
}

// Create creates a new contact
func (r *contactRepository) Create(ctx context.Context, contact *domain.Contact) error {
	if contact == nil {
		return fmt.Errorf("contact cannot be nil")
	}

	if err := contact.Validate(); err != nil {
		return fmt.Errorf("invalid contact: %w", err)
	}

	partnerTagsJSON, err := json.Marshal(contact.PartnerTags)
	if err != nil {
		return fmt.Errorf("failed to marshal partner_tags: %w", err)
	}

	secondaryFrameworksJSON, err := json.Marshal(contact.SecondaryFrameworks)
	if err != nil {
		return fmt.Errorf("failed to marshal secondary_frameworks: %w", err)
	}

	last10InteractionsJSON, err := json.Marshal(contact.Last10Interactions)
	if err != nil {
		return fmt.Errorf("failed to marshal last_10_interactions: %w", err)
	}

	topicScoresJSON, err := json.Marshal(contact.TopicScores)
	if err != nil {
		return fmt.Errorf("failed to marshal topic_scores: %w", err)
	}

	query := `
		INSERT INTO contacts (
			id, external_id, email, first_name, last_name, company, job_title,
			role_category, seniority_band, industry, region, company_size_band,
			primary_framework, secondary_frameworks, partner_tags,
			engagement_score, last_10_interactions, last_webinar_attendance, topic_scores,
			is_subscribed, unsubscribed_at, is_bounced, bounced_at, is_high_touch,
			last_newsletter_sent, newsletters_sent_30_days, primary_segment_id,
			created_at, updated_at
		)
		VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
			$16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
		)
	`

	_, err = r.db.Pool.Exec(ctx, query,
		contact.ID,
		contact.ExternalID,
		contact.Email,
		contact.FirstName,
		contact.LastName,
		contact.Company,
		contact.JobTitle,
		contact.RoleCategory,
		contact.SeniorityBand,
		contact.Industry,
		contact.Region,
		contact.CompanySizeBand,
		contact.PrimaryFramework,
		secondaryFrameworksJSON,
		partnerTagsJSON,
		contact.EngagementScore,
		last10InteractionsJSON,
		contact.LastWebinarAttendance,
		topicScoresJSON,
		contact.IsSubscribed,
		contact.UnsubscribedAt,
		contact.IsBounced,
		contact.BouncedAt,
		contact.IsHighTouch,
		contact.LastNewsletterSent,
		contact.NewslettersSent30Days,
		contact.PrimarySegmentID,
		contact.CreatedAt,
		contact.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create contact: %w", err)
	}

	return nil
}

// GetByID retrieves a contact by ID
func (r *contactRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Contact, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("contact ID cannot be nil")
	}

	query := `
		SELECT
			id, external_id, email, first_name, last_name, company, job_title,
			role_category, seniority_band, industry, region, company_size_band,
			primary_framework, secondary_frameworks, partner_tags,
			engagement_score, last_10_interactions, last_webinar_attendance, topic_scores,
			is_subscribed, unsubscribed_at, is_bounced, bounced_at, is_high_touch,
			last_newsletter_sent, newsletters_sent_30_days, primary_segment_id,
			created_at, updated_at
		FROM contacts
		WHERE id = $1
	`

	contact := &domain.Contact{}
	var partnerTagsJSON []byte
	var secondaryFrameworksJSON []byte
	var last10InteractionsJSON []byte
	var topicScoresJSON []byte

	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&contact.ID,
		&contact.ExternalID,
		&contact.Email,
		&contact.FirstName,
		&contact.LastName,
		&contact.Company,
		&contact.JobTitle,
		&contact.RoleCategory,
		&contact.SeniorityBand,
		&contact.Industry,
		&contact.Region,
		&contact.CompanySizeBand,
		&contact.PrimaryFramework,
		&secondaryFrameworksJSON,
		&partnerTagsJSON,
		&contact.EngagementScore,
		&last10InteractionsJSON,
		&contact.LastWebinarAttendance,
		&topicScoresJSON,
		&contact.IsSubscribed,
		&contact.UnsubscribedAt,
		&contact.IsBounced,
		&contact.BouncedAt,
		&contact.IsHighTouch,
		&contact.LastNewsletterSent,
		&contact.NewslettersSent30Days,
		&contact.PrimarySegmentID,
		&contact.CreatedAt,
		&contact.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("contact not found: %w", err)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get contact: %w", err)
	}

	if err := json.Unmarshal(partnerTagsJSON, &contact.PartnerTags); err != nil {
		return nil, fmt.Errorf("failed to unmarshal partner_tags: %w", err)
	}

	if err := json.Unmarshal(secondaryFrameworksJSON, &contact.SecondaryFrameworks); err != nil {
		return nil, fmt.Errorf("failed to unmarshal secondary_frameworks: %w", err)
	}

	if err := json.Unmarshal(last10InteractionsJSON, &contact.Last10Interactions); err != nil {
		return nil, fmt.Errorf("failed to unmarshal last_10_interactions: %w", err)
	}

	if err := json.Unmarshal(topicScoresJSON, &contact.TopicScores); err != nil {
		return nil, fmt.Errorf("failed to unmarshal topic_scores: %w", err)
	}

	return contact, nil
}

// GetByEmail retrieves a contact by email
func (r *contactRepository) GetByEmail(ctx context.Context, email string) (*domain.Contact, error) {
	if email == "" {
		return nil, fmt.Errorf("email cannot be empty")
	}

	query := `
		SELECT
			id, external_id, email, first_name, last_name, company, job_title,
			role_category, seniority_band, industry, region, company_size_band,
			primary_framework, secondary_frameworks, partner_tags,
			engagement_score, last_10_interactions, last_webinar_attendance, topic_scores,
			is_subscribed, unsubscribed_at, is_bounced, bounced_at, is_high_touch,
			last_newsletter_sent, newsletters_sent_30_days, primary_segment_id,
			created_at, updated_at
		FROM contacts
		WHERE email = $1
	`

	contact := &domain.Contact{}
	var partnerTagsJSON []byte
	var secondaryFrameworksJSON []byte
	var last10InteractionsJSON []byte
	var topicScoresJSON []byte

	err := r.db.Pool.QueryRow(ctx, query, email).Scan(
		&contact.ID,
		&contact.ExternalID,
		&contact.Email,
		&contact.FirstName,
		&contact.LastName,
		&contact.Company,
		&contact.JobTitle,
		&contact.RoleCategory,
		&contact.SeniorityBand,
		&contact.Industry,
		&contact.Region,
		&contact.CompanySizeBand,
		&contact.PrimaryFramework,
		&secondaryFrameworksJSON,
		&partnerTagsJSON,
		&contact.EngagementScore,
		&last10InteractionsJSON,
		&contact.LastWebinarAttendance,
		&topicScoresJSON,
		&contact.IsSubscribed,
		&contact.UnsubscribedAt,
		&contact.IsBounced,
		&contact.BouncedAt,
		&contact.IsHighTouch,
		&contact.LastNewsletterSent,
		&contact.NewslettersSent30Days,
		&contact.PrimarySegmentID,
		&contact.CreatedAt,
		&contact.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("contact not found with email %s: %w", email, err)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get contact by email: %w", err)
	}

	if err := json.Unmarshal(partnerTagsJSON, &contact.PartnerTags); err != nil {
		return nil, fmt.Errorf("failed to unmarshal partner_tags: %w", err)
	}

	if err := json.Unmarshal(secondaryFrameworksJSON, &contact.SecondaryFrameworks); err != nil {
		return nil, fmt.Errorf("failed to unmarshal secondary_frameworks: %w", err)
	}

	if err := json.Unmarshal(last10InteractionsJSON, &contact.Last10Interactions); err != nil {
		return nil, fmt.Errorf("failed to unmarshal last_10_interactions: %w", err)
	}

	if err := json.Unmarshal(topicScoresJSON, &contact.TopicScores); err != nil {
		return nil, fmt.Errorf("failed to unmarshal topic_scores: %w", err)
	}

	return contact, nil
}

// List retrieves contacts with filtering
func (r *contactRepository) List(ctx context.Context, filter *domain.ContactFilter) ([]*domain.Contact, int, error) {
	if filter == nil {
		return nil, 0, fmt.Errorf("filter cannot be nil")
	}

	// Build query with filters
	var whereClauses []string
	var args []interface{}
	argIndex := 1

	if filter.SegmentID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("primary_segment_id = $%d", argIndex))
		args = append(args, *filter.SegmentID)
		argIndex++
	}

	if filter.IsSubscribed != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("is_subscribed = $%d", argIndex))
		args = append(args, *filter.IsSubscribed)
		argIndex++
	}

	if filter.IsBounced != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("is_bounced = $%d", argIndex))
		args = append(args, *filter.IsBounced)
		argIndex++
	}

	if filter.IsHighTouch != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("is_high_touch = $%d", argIndex))
		args = append(args, *filter.IsHighTouch)
		argIndex++
	}

	if filter.RoleCategory != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("role_category = $%d", argIndex))
		args = append(args, *filter.RoleCategory)
		argIndex++
	}

	if filter.Industry != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("industry = $%d", argIndex))
		args = append(args, *filter.Industry)
		argIndex++
	}

	if filter.Region != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("region = $%d", argIndex))
		args = append(args, *filter.Region)
		argIndex++
	}

	if filter.Search != "" {
		searchPattern := "%" + filter.Search + "%"
		whereClauses = append(whereClauses, fmt.Sprintf("(email ILIKE $%d OR first_name ILIKE $%d OR last_name ILIKE $%d OR company ILIKE $%d)", argIndex, argIndex, argIndex, argIndex))
		args = append(args, searchPattern)
		argIndex++
	}

	whereClause := ""
	if len(whereClauses) > 0 {
		whereClause = "WHERE " + strings.Join(whereClauses, " AND ")
	}

	// Count total
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM contacts %s", whereClause)
	var total int
	err := r.db.Pool.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count contacts: %w", err)
	}

	// Get paginated results
	query := fmt.Sprintf(`
		SELECT
			id, external_id, email, first_name, last_name, company, job_title,
			role_category, seniority_band, industry, region, company_size_band,
			primary_framework, secondary_frameworks, partner_tags,
			engagement_score, last_10_interactions, last_webinar_attendance, topic_scores,
			is_subscribed, unsubscribed_at, is_bounced, bounced_at, is_high_touch,
			last_newsletter_sent, newsletters_sent_30_days, primary_segment_id,
			created_at, updated_at
		FROM contacts
		%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIndex, argIndex+1)

	args = append(args, filter.Limit, filter.Offset)

	rows, err := r.db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list contacts: %w", err)
	}
	defer rows.Close()

	contacts := make([]*domain.Contact, 0)
	for rows.Next() {
		contact := &domain.Contact{}
		var partnerTagsJSON []byte
		var secondaryFrameworksJSON []byte
		var last10InteractionsJSON []byte
		var topicScoresJSON []byte

		err := rows.Scan(
			&contact.ID,
			&contact.ExternalID,
			&contact.Email,
			&contact.FirstName,
			&contact.LastName,
			&contact.Company,
			&contact.JobTitle,
			&contact.RoleCategory,
			&contact.SeniorityBand,
			&contact.Industry,
			&contact.Region,
			&contact.CompanySizeBand,
			&contact.PrimaryFramework,
			&secondaryFrameworksJSON,
			&partnerTagsJSON,
			&contact.EngagementScore,
			&last10InteractionsJSON,
			&contact.LastWebinarAttendance,
			&topicScoresJSON,
			&contact.IsSubscribed,
			&contact.UnsubscribedAt,
			&contact.IsBounced,
			&contact.BouncedAt,
			&contact.IsHighTouch,
			&contact.LastNewsletterSent,
			&contact.NewslettersSent30Days,
			&contact.PrimarySegmentID,
			&contact.CreatedAt,
			&contact.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan contact: %w", err)
		}

		if err := json.Unmarshal(partnerTagsJSON, &contact.PartnerTags); err != nil {
			return nil, 0, fmt.Errorf("failed to unmarshal partner_tags: %w", err)
		}

		if err := json.Unmarshal(secondaryFrameworksJSON, &contact.SecondaryFrameworks); err != nil {
			return nil, 0, fmt.Errorf("failed to unmarshal secondary_frameworks: %w", err)
		}

		if err := json.Unmarshal(last10InteractionsJSON, &contact.Last10Interactions); err != nil {
			return nil, 0, fmt.Errorf("failed to unmarshal last_10_interactions: %w", err)
		}

		if err := json.Unmarshal(topicScoresJSON, &contact.TopicScores); err != nil {
			return nil, 0, fmt.Errorf("failed to unmarshal topic_scores: %w", err)
		}

		contacts = append(contacts, contact)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating contacts: %w", err)
	}

	return contacts, total, nil
}

// Update updates an existing contact
func (r *contactRepository) Update(ctx context.Context, contact *domain.Contact) error {
	if contact == nil {
		return fmt.Errorf("contact cannot be nil")
	}

	if err := contact.Validate(); err != nil {
		return fmt.Errorf("invalid contact: %w", err)
	}

	partnerTagsJSON, err := json.Marshal(contact.PartnerTags)
	if err != nil {
		return fmt.Errorf("failed to marshal partner_tags: %w", err)
	}

	secondaryFrameworksJSON, err := json.Marshal(contact.SecondaryFrameworks)
	if err != nil {
		return fmt.Errorf("failed to marshal secondary_frameworks: %w", err)
	}

	last10InteractionsJSON, err := json.Marshal(contact.Last10Interactions)
	if err != nil {
		return fmt.Errorf("failed to marshal last_10_interactions: %w", err)
	}

	topicScoresJSON, err := json.Marshal(contact.TopicScores)
	if err != nil {
		return fmt.Errorf("failed to marshal topic_scores: %w", err)
	}

	query := `
		UPDATE contacts
		SET
			external_id = $2,
			email = $3,
			first_name = $4,
			last_name = $5,
			company = $6,
			job_title = $7,
			role_category = $8,
			seniority_band = $9,
			industry = $10,
			region = $11,
			company_size_band = $12,
			primary_framework = $13,
			secondary_frameworks = $14,
			partner_tags = $15,
			engagement_score = $16,
			last_10_interactions = $17,
			last_webinar_attendance = $18,
			topic_scores = $19,
			is_subscribed = $20,
			unsubscribed_at = $21,
			is_bounced = $22,
			bounced_at = $23,
			is_high_touch = $24,
			last_newsletter_sent = $25,
			newsletters_sent_30_days = $26,
			primary_segment_id = $27,
			updated_at = $28
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query,
		contact.ID,
		contact.ExternalID,
		contact.Email,
		contact.FirstName,
		contact.LastName,
		contact.Company,
		contact.JobTitle,
		contact.RoleCategory,
		contact.SeniorityBand,
		contact.Industry,
		contact.Region,
		contact.CompanySizeBand,
		contact.PrimaryFramework,
		secondaryFrameworksJSON,
		partnerTagsJSON,
		contact.EngagementScore,
		last10InteractionsJSON,
		contact.LastWebinarAttendance,
		topicScoresJSON,
		contact.IsSubscribed,
		contact.UnsubscribedAt,
		contact.IsBounced,
		contact.BouncedAt,
		contact.IsHighTouch,
		contact.LastNewsletterSent,
		contact.NewslettersSent30Days,
		contact.PrimarySegmentID,
		contact.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to update contact: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("contact not found")
	}

	return nil
}

// Delete deletes a contact by ID
func (r *contactRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("contact ID cannot be nil")
	}

	query := `DELETE FROM contacts WHERE id = $1`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete contact: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("contact not found")
	}

	return nil
}

// BulkCreate creates multiple contacts in a batch
func (r *contactRepository) BulkCreate(ctx context.Context, contacts []*domain.Contact) error {
	if len(contacts) == 0 {
		return fmt.Errorf("contacts slice cannot be empty")
	}

	batch := &pgx.Batch{}

	query := `
		INSERT INTO contacts (
			id, external_id, email, first_name, last_name, company, job_title,
			role_category, seniority_band, industry, region, company_size_band,
			primary_framework, secondary_frameworks, partner_tags,
			engagement_score, last_10_interactions, last_webinar_attendance, topic_scores,
			is_subscribed, unsubscribed_at, is_bounced, bounced_at, is_high_touch,
			last_newsletter_sent, newsletters_sent_30_days, primary_segment_id,
			created_at, updated_at
		)
		VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
			$16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
		)
	`

	for _, contact := range contacts {
		if contact == nil {
			return fmt.Errorf("contact in slice cannot be nil")
		}

		if err := contact.Validate(); err != nil {
			return fmt.Errorf("invalid contact: %w", err)
		}

		partnerTagsJSON, err := json.Marshal(contact.PartnerTags)
		if err != nil {
			return fmt.Errorf("failed to marshal partner_tags: %w", err)
		}

		secondaryFrameworksJSON, err := json.Marshal(contact.SecondaryFrameworks)
		if err != nil {
			return fmt.Errorf("failed to marshal secondary_frameworks: %w", err)
		}

		last10InteractionsJSON, err := json.Marshal(contact.Last10Interactions)
		if err != nil {
			return fmt.Errorf("failed to marshal last_10_interactions: %w", err)
		}

		topicScoresJSON, err := json.Marshal(contact.TopicScores)
		if err != nil {
			return fmt.Errorf("failed to marshal topic_scores: %w", err)
		}

		batch.Queue(query,
			contact.ID,
			contact.ExternalID,
			contact.Email,
			contact.FirstName,
			contact.LastName,
			contact.Company,
			contact.JobTitle,
			contact.RoleCategory,
			contact.SeniorityBand,
			contact.Industry,
			contact.Region,
			contact.CompanySizeBand,
			contact.PrimaryFramework,
			secondaryFrameworksJSON,
			partnerTagsJSON,
			contact.EngagementScore,
			last10InteractionsJSON,
			contact.LastWebinarAttendance,
			topicScoresJSON,
			contact.IsSubscribed,
			contact.UnsubscribedAt,
			contact.IsBounced,
			contact.BouncedAt,
			contact.IsHighTouch,
			contact.LastNewsletterSent,
			contact.NewslettersSent30Days,
			contact.PrimarySegmentID,
			contact.CreatedAt,
			contact.UpdatedAt,
		)
	}

	results := r.db.Pool.SendBatch(ctx, batch)
	defer results.Close()

	for i := 0; i < len(contacts); i++ {
		_, err := results.Exec()
		if err != nil {
			return fmt.Errorf("failed to execute batch insert at index %d: %w", i, err)
		}
	}

	return nil
}

// BulkUpdate updates multiple contacts in a batch
func (r *contactRepository) BulkUpdate(ctx context.Context, contacts []*domain.Contact) error {
	if len(contacts) == 0 {
		return fmt.Errorf("contacts slice cannot be empty")
	}

	batch := &pgx.Batch{}

	query := `
		UPDATE contacts
		SET
			external_id = $2,
			email = $3,
			first_name = $4,
			last_name = $5,
			company = $6,
			job_title = $7,
			role_category = $8,
			seniority_band = $9,
			industry = $10,
			region = $11,
			company_size_band = $12,
			primary_framework = $13,
			secondary_frameworks = $14,
			partner_tags = $15,
			engagement_score = $16,
			last_10_interactions = $17,
			last_webinar_attendance = $18,
			topic_scores = $19,
			is_subscribed = $20,
			unsubscribed_at = $21,
			is_bounced = $22,
			bounced_at = $23,
			is_high_touch = $24,
			last_newsletter_sent = $25,
			newsletters_sent_30_days = $26,
			primary_segment_id = $27,
			updated_at = $28
		WHERE id = $1
	`

	for _, contact := range contacts {
		if contact == nil {
			return fmt.Errorf("contact in slice cannot be nil")
		}

		if err := contact.Validate(); err != nil {
			return fmt.Errorf("invalid contact: %w", err)
		}

		partnerTagsJSON, err := json.Marshal(contact.PartnerTags)
		if err != nil {
			return fmt.Errorf("failed to marshal partner_tags: %w", err)
		}

		secondaryFrameworksJSON, err := json.Marshal(contact.SecondaryFrameworks)
		if err != nil {
			return fmt.Errorf("failed to marshal secondary_frameworks: %w", err)
		}

		last10InteractionsJSON, err := json.Marshal(contact.Last10Interactions)
		if err != nil {
			return fmt.Errorf("failed to marshal last_10_interactions: %w", err)
		}

		topicScoresJSON, err := json.Marshal(contact.TopicScores)
		if err != nil {
			return fmt.Errorf("failed to marshal topic_scores: %w", err)
		}

		batch.Queue(query,
			contact.ID,
			contact.ExternalID,
			contact.Email,
			contact.FirstName,
			contact.LastName,
			contact.Company,
			contact.JobTitle,
			contact.RoleCategory,
			contact.SeniorityBand,
			contact.Industry,
			contact.Region,
			contact.CompanySizeBand,
			contact.PrimaryFramework,
			secondaryFrameworksJSON,
			partnerTagsJSON,
			contact.EngagementScore,
			last10InteractionsJSON,
			contact.LastWebinarAttendance,
			topicScoresJSON,
			contact.IsSubscribed,
			contact.UnsubscribedAt,
			contact.IsBounced,
			contact.BouncedAt,
			contact.IsHighTouch,
			contact.LastNewsletterSent,
			contact.NewslettersSent30Days,
			contact.PrimarySegmentID,
			contact.UpdatedAt,
		)
	}

	results := r.db.Pool.SendBatch(ctx, batch)
	defer results.Close()

	for i := 0; i < len(contacts); i++ {
		cmdTag, err := results.Exec()
		if err != nil {
			return fmt.Errorf("failed to execute batch update at index %d: %w", i, err)
		}
		if cmdTag.RowsAffected() == 0 {
			return fmt.Errorf("contact not found at index %d", i)
		}
	}

	return nil
}

// GetBySegmentID retrieves contacts by segment ID with pagination
func (r *contactRepository) GetBySegmentID(ctx context.Context, segmentID uuid.UUID, limit, offset int) ([]*domain.Contact, int, error) {
	if segmentID == uuid.Nil {
		return nil, 0, fmt.Errorf("segment ID cannot be nil")
	}

	if limit <= 0 {
		return nil, 0, fmt.Errorf("limit must be greater than 0")
	}

	if offset < 0 {
		return nil, 0, fmt.Errorf("offset must be non-negative")
	}

	// Count total
	countQuery := `SELECT COUNT(*) FROM contacts WHERE primary_segment_id = $1`
	var total int
	err := r.db.Pool.QueryRow(ctx, countQuery, segmentID).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count contacts by segment: %w", err)
	}

	// Get paginated results
	query := `
		SELECT
			id, external_id, email, first_name, last_name, company, job_title,
			role_category, seniority_band, industry, region, company_size_band,
			primary_framework, secondary_frameworks, partner_tags,
			engagement_score, last_10_interactions, last_webinar_attendance, topic_scores,
			is_subscribed, unsubscribed_at, is_bounced, bounced_at, is_high_touch,
			last_newsletter_sent, newsletters_sent_30_days, primary_segment_id,
			created_at, updated_at
		FROM contacts
		WHERE primary_segment_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.Pool.Query(ctx, query, segmentID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get contacts by segment: %w", err)
	}
	defer rows.Close()

	contacts := make([]*domain.Contact, 0)
	for rows.Next() {
		contact := &domain.Contact{}
		var partnerTagsJSON []byte
		var secondaryFrameworksJSON []byte
		var last10InteractionsJSON []byte
		var topicScoresJSON []byte

		err := rows.Scan(
			&contact.ID,
			&contact.ExternalID,
			&contact.Email,
			&contact.FirstName,
			&contact.LastName,
			&contact.Company,
			&contact.JobTitle,
			&contact.RoleCategory,
			&contact.SeniorityBand,
			&contact.Industry,
			&contact.Region,
			&contact.CompanySizeBand,
			&contact.PrimaryFramework,
			&secondaryFrameworksJSON,
			&partnerTagsJSON,
			&contact.EngagementScore,
			&last10InteractionsJSON,
			&contact.LastWebinarAttendance,
			&topicScoresJSON,
			&contact.IsSubscribed,
			&contact.UnsubscribedAt,
			&contact.IsBounced,
			&contact.BouncedAt,
			&contact.IsHighTouch,
			&contact.LastNewsletterSent,
			&contact.NewslettersSent30Days,
			&contact.PrimarySegmentID,
			&contact.CreatedAt,
			&contact.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan contact: %w", err)
		}

		if err := json.Unmarshal(partnerTagsJSON, &contact.PartnerTags); err != nil {
			return nil, 0, fmt.Errorf("failed to unmarshal partner_tags: %w", err)
		}

		if err := json.Unmarshal(secondaryFrameworksJSON, &contact.SecondaryFrameworks); err != nil {
			return nil, 0, fmt.Errorf("failed to unmarshal secondary_frameworks: %w", err)
		}

		if err := json.Unmarshal(last10InteractionsJSON, &contact.Last10Interactions); err != nil {
			return nil, 0, fmt.Errorf("failed to unmarshal last_10_interactions: %w", err)
		}

		if err := json.Unmarshal(topicScoresJSON, &contact.TopicScores); err != nil {
			return nil, 0, fmt.Errorf("failed to unmarshal topic_scores: %w", err)
		}

		contacts = append(contacts, contact)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating contacts: %w", err)
	}

	return contacts, total, nil
}

// UpdateEngagementScore updates the engagement score for a contact
func (r *contactRepository) UpdateEngagementScore(ctx context.Context, id uuid.UUID, score float64) error {
	if id == uuid.Nil {
		return fmt.Errorf("contact ID cannot be nil")
	}

	if score < 0 || score > 100 {
		return fmt.Errorf("engagement score must be between 0 and 100")
	}

	query := `
		UPDATE contacts
		SET engagement_score = $2, updated_at = $3
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id, score, time.Now())
	if err != nil {
		return fmt.Errorf("failed to update engagement score: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("contact not found")
	}

	return nil
}

// UpdateNewsletterTracking updates newsletter tracking fields for a contact
func (r *contactRepository) UpdateNewsletterTracking(ctx context.Context, id uuid.UUID, sentAt time.Time) error {
	if id == uuid.Nil {
		return fmt.Errorf("contact ID cannot be nil")
	}

	if sentAt.IsZero() {
		return fmt.Errorf("sentAt cannot be zero")
	}

	query := `
		UPDATE contacts
		SET
			last_newsletter_sent = $2,
			newsletters_sent_30_days = newsletters_sent_30_days + 1,
			updated_at = $3
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id, sentAt, time.Now())
	if err != nil {
		return fmt.Errorf("failed to update newsletter tracking: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("contact not found")
	}

	return nil
}

// MarkUnsubscribed marks a contact as unsubscribed
func (r *contactRepository) MarkUnsubscribed(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("contact ID cannot be nil")
	}

	now := time.Now()
	query := `
		UPDATE contacts
		SET
			is_subscribed = false,
			unsubscribed_at = $2,
			updated_at = $3
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id, now, now)
	if err != nil {
		return fmt.Errorf("failed to mark contact as unsubscribed: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("contact not found")
	}

	return nil
}

// MarkBounced marks a contact as bounced
func (r *contactRepository) MarkBounced(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("contact ID cannot be nil")
	}

	now := time.Now()
	query := `
		UPDATE contacts
		SET
			is_bounced = true,
			bounced_at = $2,
			updated_at = $3
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id, now, now)
	if err != nil {
		return fmt.Errorf("failed to mark contact as bounced: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("contact not found")
	}

	return nil
}
