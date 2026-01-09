package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/repository"
)

// DeliveryService handles newsletter issue delivery and scheduling
type DeliveryService struct {
	issueRepo     repository.NewsletterIssueRepository
	configRepo    repository.NewsletterConfigRepository
	contactRepo   repository.ContactRepository
	n8nWebhookURL string
	httpClient    *http.Client
}

// DeliveryStatus represents the current delivery status of an issue
type DeliveryStatus struct {
	IssueID        uuid.UUID          `json:"issue_id"`
	Status         domain.IssueStatus `json:"status"`
	SentCount      int                `json:"sent_count"`
	OpenCount      int                `json:"open_count"`
	ClickCount     int                `json:"click_count"`
	BounceCount    int                `json:"bounce_count"`
	UnsubCount     int                `json:"unsub_count"`
	ComplaintCount int                `json:"complaint_count"`
	ESPCampaignID  *string            `json:"esp_campaign_id,omitempty"`
	ScheduledFor   *time.Time         `json:"scheduled_for,omitempty"`
	SentAt         *time.Time         `json:"sent_at,omitempty"`
}

// DeliveryMetrics represents metrics to update for an issue
type DeliveryMetrics struct {
	Recipients    int     `json:"recipients"`
	Delivered     int     `json:"delivered"`
	Opens         int     `json:"opens"`
	Clicks        int     `json:"clicks"`
	Bounces       int     `json:"bounces"`
	Unsubscribes  int     `json:"unsubscribes"`
	Complaints    int     `json:"complaints"`
	ESPCampaignID *string `json:"esp_campaign_id,omitempty"`
}

// WebhookPayload represents the payload sent to n8n webhook
type WebhookPayload struct {
	IssueID         uuid.UUID                `json:"issue_id"`
	IssueNumber     int                      `json:"issue_number"`
	ConfigurationID uuid.UUID                `json:"configuration_id"`
	SegmentID       uuid.UUID                `json:"segment_id"`
	SubjectLine     string                   `json:"subject_line"`
	Preheader       *string                  `json:"preheader,omitempty"`
	IntroTemplate   *string                  `json:"intro_template,omitempty"`
	Blocks          []domain.NewsletterBlock `json:"blocks"`
	Contacts        []ContactPayload         `json:"contacts"`
	ScheduledFor    *time.Time               `json:"scheduled_for,omitempty"`
	SendImmediately bool                     `json:"send_immediately"`
}

// ContactPayload represents contact data in the webhook payload
type ContactPayload struct {
	Email     string  `json:"email"`
	FirstName *string `json:"first_name,omitempty"`
	LastName  *string `json:"last_name,omitempty"`
	Company   *string `json:"company,omitempty"`
	JobTitle  *string `json:"job_title,omitempty"`
}

// NewDeliveryService creates a new delivery service
func NewDeliveryService(
	issueRepo repository.NewsletterIssueRepository,
	configRepo repository.NewsletterConfigRepository,
	contactRepo repository.ContactRepository,
	n8nWebhookURL string,
	webhookTimeoutSecs int,
) *DeliveryService {
	if issueRepo == nil {
		panic("issueRepo cannot be nil")
	}
	if configRepo == nil {
		panic("configRepo cannot be nil")
	}
	if contactRepo == nil {
		panic("contactRepo cannot be nil")
	}
	if n8nWebhookURL == "" {
		panic("n8nWebhookURL cannot be empty")
	}
	if webhookTimeoutSecs <= 0 {
		panic("webhookTimeoutSecs must be greater than 0")
	}

	return &DeliveryService{
		issueRepo:     issueRepo,
		configRepo:    configRepo,
		contactRepo:   contactRepo,
		n8nWebhookURL: n8nWebhookURL,
		httpClient: &http.Client{
			Timeout: time.Duration(webhookTimeoutSecs) * time.Second,
		},
	}
}

// SendIssue sends or schedules a newsletter issue (FR-037, FR-038)
func (s *DeliveryService) SendIssue(ctx context.Context, issueID uuid.UUID, scheduledFor *time.Time) error {
	if issueID == uuid.Nil {
		return fmt.Errorf("issue ID is required")
	}

	// Get the issue
	issue, err := s.issueRepo.GetByID(ctx, issueID)
	if err != nil {
		return fmt.Errorf("failed to get issue: %w", err)
	}

	// Validate status
	if scheduledFor != nil {
		// Scheduling for later
		if issue.Status != domain.IssueStatusApproved && issue.Status != domain.IssueStatusScheduled {
			return fmt.Errorf("issue must be in approved or scheduled status, current status: %s", issue.Status)
		}
	} else {
		// Sending immediately
		if issue.Status != domain.IssueStatusApproved {
			return fmt.Errorf("issue must be in approved status, current status: %s", issue.Status)
		}
	}

	// Validate required fields
	if issue.SelectedSubjectLine == nil || *issue.SelectedSubjectLine == "" {
		return fmt.Errorf("selected subject line is required")
	}

	if len(issue.Blocks) == 0 {
		return fmt.Errorf("issue must have at least one content block")
	}

	// Get contacts for the segment
	contacts, total, err := s.contactRepo.GetBySegmentID(ctx, issue.SegmentID, 10000, 0)
	if err != nil {
		return fmt.Errorf("failed to get contacts for segment: %w", err)
	}

	if total == 0 {
		return fmt.Errorf("no contacts found for segment")
	}

	// Filter subscribed and non-bounced contacts
	activeContacts := make([]*domain.Contact, 0)
	for _, contact := range contacts {
		if contact.IsSubscribed && !contact.IsBounced {
			activeContacts = append(activeContacts, contact)
		}
	}

	if len(activeContacts) == 0 {
		return fmt.Errorf("no active contacts found for segment")
	}

	// Update total recipients
	issue.TotalRecipients = len(activeContacts)

	// Prepare webhook payload
	contactPayloads := make([]ContactPayload, len(activeContacts))
	for i, contact := range activeContacts {
		contactPayloads[i] = ContactPayload{
			Email:     contact.Email,
			FirstName: contact.FirstName,
			LastName:  contact.LastName,
			Company:   contact.Company,
			JobTitle:  contact.JobTitle,
		}
	}

	payload := WebhookPayload{
		IssueID:         issue.ID,
		IssueNumber:     issue.IssueNumber,
		ConfigurationID: issue.ConfigurationID,
		SegmentID:       issue.SegmentID,
		SubjectLine:     *issue.SelectedSubjectLine,
		Preheader:       issue.Preheader,
		IntroTemplate:   issue.IntroTemplate,
		Blocks:          issue.Blocks,
		Contacts:        contactPayloads,
		ScheduledFor:    scheduledFor,
		SendImmediately: scheduledFor == nil,
	}

	// Trigger n8n webhook
	if err := s.TriggerN8NWebhook(ctx, payload); err != nil {
		// Update status to failed
		issue.Status = domain.IssueStatusFailed
		issue.UpdatedAt = time.Now()
		if updateErr := s.issueRepo.Update(ctx, issue); updateErr != nil {
			log.Error().
				Err(updateErr).
				Str("issue_id", issueID.String()).
				Msg("Failed to update issue status to failed")
		}
		return fmt.Errorf("failed to trigger n8n webhook: %w", err)
	}

	// Update issue status
	now := time.Now()
	if scheduledFor != nil {
		// Schedule for later
		issue.Status = domain.IssueStatusScheduled
		issue.ScheduledFor = scheduledFor
	} else {
		// Mark as sent immediately
		issue.Status = domain.IssueStatusSent
		issue.SentAt = &now
	}
	issue.UpdatedAt = now

	if err := s.issueRepo.Update(ctx, issue); err != nil {
		return fmt.Errorf("failed to update issue status: %w", err)
	}

	log.Info().
		Str("issue_id", issueID.String()).
		Int("issue_number", issue.IssueNumber).
		Int("recipients", len(activeContacts)).
		Str("status", string(issue.Status)).
		Msg("Newsletter issue sent/scheduled")

	return nil
}

// ScheduleIssue schedules an issue for future delivery (FR-039)
func (s *DeliveryService) ScheduleIssue(ctx context.Context, issueID uuid.UUID, scheduledFor time.Time) error {
	if issueID == uuid.Nil {
		return fmt.Errorf("issue ID is required")
	}

	if scheduledFor.IsZero() {
		return fmt.Errorf("scheduled_for time is required")
	}

	if scheduledFor.Before(time.Now()) {
		return fmt.Errorf("scheduled_for must be in the future")
	}

	// Get the issue
	issue, err := s.issueRepo.GetByID(ctx, issueID)
	if err != nil {
		return fmt.Errorf("failed to get issue: %w", err)
	}

	// Validate status
	if issue.Status != domain.IssueStatusApproved {
		return fmt.Errorf("issue must be in approved status, current status: %s", issue.Status)
	}

	if !issue.CanTransitionTo(domain.IssueStatusScheduled) {
		return fmt.Errorf("issue cannot transition to scheduled status")
	}

	// Validate required fields
	if issue.SelectedSubjectLine == nil || *issue.SelectedSubjectLine == "" {
		return fmt.Errorf("selected subject line is required")
	}

	if len(issue.Blocks) == 0 {
		return fmt.Errorf("issue must have at least one content block")
	}

	// Update issue
	now := time.Now()
	issue.Status = domain.IssueStatusScheduled
	issue.ScheduledFor = &scheduledFor
	issue.UpdatedAt = now

	if err := s.issueRepo.Update(ctx, issue); err != nil {
		return fmt.Errorf("failed to update issue status: %w", err)
	}

	log.Info().
		Str("issue_id", issueID.String()).
		Int("issue_number", issue.IssueNumber).
		Time("scheduled_for", scheduledFor).
		Msg("Newsletter issue scheduled")

	return nil
}

// GetDeliveryStatus retrieves the current delivery status of an issue
func (s *DeliveryService) GetDeliveryStatus(ctx context.Context, issueID uuid.UUID) (*DeliveryStatus, error) {
	if issueID == uuid.Nil {
		return nil, fmt.Errorf("issue ID is required")
	}

	issue, err := s.issueRepo.GetByID(ctx, issueID)
	if err != nil {
		return nil, fmt.Errorf("failed to get issue: %w", err)
	}

	status := &DeliveryStatus{
		IssueID:        issue.ID,
		Status:         issue.Status,
		SentCount:      issue.TotalDelivered,
		OpenCount:      issue.TotalOpens,
		ClickCount:     issue.TotalClicks,
		BounceCount:    issue.TotalBounces,
		UnsubCount:     issue.TotalUnsubscribes,
		ComplaintCount: issue.TotalComplaints,
		ESPCampaignID:  issue.ESPCampaignID,
		ScheduledFor:   issue.ScheduledFor,
		SentAt:         issue.SentAt,
	}

	return status, nil
}

// UpdateDeliveryMetrics updates delivery metrics from webhook callback
func (s *DeliveryService) UpdateDeliveryMetrics(ctx context.Context, issueID uuid.UUID, metrics DeliveryMetrics) error {
	if issueID == uuid.Nil {
		return fmt.Errorf("issue ID is required")
	}

	// Validate metrics are non-negative
	if metrics.Recipients < 0 || metrics.Delivered < 0 || metrics.Opens < 0 ||
		metrics.Clicks < 0 || metrics.Bounces < 0 || metrics.Unsubscribes < 0 ||
		metrics.Complaints < 0 {
		return fmt.Errorf("metrics cannot be negative")
	}

	// Get the issue to verify it exists and is in valid state
	issue, err := s.issueRepo.GetByID(ctx, issueID)
	if err != nil {
		return fmt.Errorf("failed to get issue: %w", err)
	}

	// Only update metrics for sent or scheduled issues
	if issue.Status != domain.IssueStatusSent && issue.Status != domain.IssueStatusScheduled {
		return fmt.Errorf("can only update metrics for sent or scheduled issues, current status: %s", issue.Status)
	}

	// Update metrics
	if err := s.issueRepo.UpdateMetrics(ctx, issueID,
		metrics.Recipients,
		metrics.Delivered,
		metrics.Opens,
		metrics.Clicks,
		metrics.Bounces,
		metrics.Unsubscribes,
		metrics.Complaints,
	); err != nil {
		return fmt.Errorf("failed to update metrics: %w", err)
	}

	// Update ESP campaign ID if provided
	if metrics.ESPCampaignID != nil {
		issue.ESPCampaignID = metrics.ESPCampaignID
		issue.UpdatedAt = time.Now()
		if err := s.issueRepo.Update(ctx, issue); err != nil {
			return fmt.Errorf("failed to update ESP campaign ID: %w", err)
		}
	}

	// If all recipients have been delivered, mark as sent
	if issue.Status == domain.IssueStatusScheduled && metrics.Delivered > 0 {
		now := time.Now()
		issue.Status = domain.IssueStatusSent
		issue.SentAt = &now
		issue.UpdatedAt = now
		if err := s.issueRepo.Update(ctx, issue); err != nil {
			return fmt.Errorf("failed to update status to sent: %w", err)
		}
	}

	log.Info().
		Str("issue_id", issueID.String()).
		Int("delivered", metrics.Delivered).
		Int("opens", metrics.Opens).
		Int("clicks", metrics.Clicks).
		Msg("Updated delivery metrics")

	return nil
}

// TriggerN8NWebhook sends the webhook payload to n8n
func (s *DeliveryService) TriggerN8NWebhook(ctx context.Context, webhookPayload WebhookPayload) error {
	// Marshal payload to JSON
	payloadBytes, err := json.Marshal(webhookPayload)
	if err != nil {
		return fmt.Errorf("failed to marshal webhook payload: %w", err)
	}

	// Create request with context
	req, err := http.NewRequestWithContext(ctx, "POST", s.n8nWebhookURL, bytes.NewReader(payloadBytes))
	if err != nil {
		return fmt.Errorf("failed to create webhook request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "ACI-Backend/1.0")

	// Send request with retries
	maxRetries := 3
	var lastErr error

	for attempt := 0; attempt < maxRetries; attempt++ {
		if attempt > 0 {
			// Exponential backoff: 1s, 2s, 4s
			backoff := time.Duration(1<<uint(attempt-1)) * time.Second
			log.Info().
				Int("attempt", attempt+1).
				Dur("backoff", backoff).
				Msg("Retrying n8n webhook after backoff")
			time.Sleep(backoff)
		}

		resp, err := s.httpClient.Do(req)
		if err != nil {
			lastErr = fmt.Errorf("webhook request failed: %w", err)
			log.Warn().
				Err(err).
				Int("attempt", attempt+1).
				Msg("n8n webhook request failed")
			continue
		}
		defer resp.Body.Close()

		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			lastErr = fmt.Errorf("webhook returned non-success status: %d", resp.StatusCode)
			log.Warn().
				Int("status_code", resp.StatusCode).
				Int("attempt", attempt+1).
				Msg("n8n webhook returned error status")
			continue
		}

		// Success
		log.Info().
			Str("issue_id", webhookPayload.IssueID.String()).
			Int("recipients", len(webhookPayload.Contacts)).
			Bool("immediate", webhookPayload.SendImmediately).
			Msg("Successfully triggered n8n webhook")
		return nil
	}

	return fmt.Errorf("webhook failed after %d attempts: %w", maxRetries, lastErr)
}
