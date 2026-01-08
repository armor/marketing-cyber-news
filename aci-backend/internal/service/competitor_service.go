package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/repository"
)

// CompetitorService handles competitor monitoring operations
type CompetitorService struct {
	profileRepo repository.CompetitorProfileRepository
	contentRepo repository.CompetitorContentRepository
	alertRepo   repository.CompetitorAlertRepository
	campaignRepo repository.CampaignRepository
}

// NewCompetitorService creates a new competitor service
func NewCompetitorService(
	profileRepo repository.CompetitorProfileRepository,
	contentRepo repository.CompetitorContentRepository,
	alertRepo repository.CompetitorAlertRepository,
	campaignRepo repository.CampaignRepository,
) *CompetitorService {
	if profileRepo == nil {
		panic("profileRepo cannot be nil")
	}
	if contentRepo == nil {
		panic("contentRepo cannot be nil")
	}
	if alertRepo == nil {
		panic("alertRepo cannot be nil")
	}
	if campaignRepo == nil {
		panic("campaignRepo cannot be nil")
	}

	return &CompetitorService{
		profileRepo:  profileRepo,
		contentRepo:  contentRepo,
		alertRepo:    alertRepo,
		campaignRepo: campaignRepo,
	}
}

// AddCompetitorRequest represents a request to add a competitor
type AddCompetitorRequest struct {
	CampaignID    uuid.UUID
	Name          string
	LinkedInURL   *string
	TwitterHandle *string
	BlogURL       *string
	WebsiteURL    *string
}

// Validate validates the add competitor request
func (r *AddCompetitorRequest) Validate() error {
	if r.CampaignID == uuid.Nil {
		return fmt.Errorf("campaign_id is required")
	}

	if r.Name == "" {
		return fmt.Errorf("name is required")
	}

	if r.LinkedInURL == nil && r.TwitterHandle == nil && r.BlogURL == nil && r.WebsiteURL == nil {
		return fmt.Errorf("at least one channel (LinkedIn, Twitter, Blog, or Website) is required")
	}

	return nil
}

// AddCompetitor adds a new competitor to track
func (s *CompetitorService) AddCompetitor(ctx context.Context, req AddCompetitorRequest) (*domain.CompetitorProfile, error) {
	if err := req.Validate(); err != nil {
		return nil, fmt.Errorf("validation failed: %w", err)
	}

	// Verify campaign exists
	_, err := s.campaignRepo.GetByID(ctx, req.CampaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to get campaign: %w", err)
	}

	competitor := &domain.CompetitorProfile{
		CampaignID:    req.CampaignID,
		Name:          req.Name,
		LinkedInURL:   req.LinkedInURL,
		TwitterHandle: req.TwitterHandle,
		BlogURL:       req.BlogURL,
		WebsiteURL:    req.WebsiteURL,
		IsActive:      true,
	}

	if err := s.profileRepo.Create(ctx, competitor); err != nil {
		return nil, fmt.Errorf("failed to create competitor: %w", err)
	}

	log.Info().
		Str("competitor_id", competitor.ID.String()).
		Str("campaign_id", req.CampaignID.String()).
		Str("name", req.Name).
		Msg("Competitor added")

	return competitor, nil
}

// RemoveCompetitor removes a competitor from tracking
func (s *CompetitorService) RemoveCompetitor(ctx context.Context, competitorID uuid.UUID) error {
	if competitorID == uuid.Nil {
		return fmt.Errorf("competitor_id is required")
	}

	// Check if competitor exists
	competitor, err := s.profileRepo.GetByID(ctx, competitorID)
	if err != nil {
		return fmt.Errorf("failed to get competitor: %w", err)
	}

	// Soft delete by marking inactive
	if err := s.profileRepo.SetActive(ctx, competitorID, false); err != nil {
		return fmt.Errorf("failed to deactivate competitor: %w", err)
	}

	log.Info().
		Str("competitor_id", competitorID.String()).
		Str("campaign_id", competitor.CampaignID.String()).
		Msg("Competitor removed")

	return nil
}

// GetCompetitors retrieves all competitors for a campaign
func (s *CompetitorService) GetCompetitors(ctx context.Context, campaignID uuid.UUID) ([]*domain.CompetitorProfile, error) {
	if campaignID == uuid.Nil {
		return nil, fmt.Errorf("campaign_id is required")
	}

	competitors, err := s.profileRepo.GetByCampaignID(ctx, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to get competitors: %w", err)
	}

	return competitors, nil
}

// CompetitorContentFilter represents filter criteria for competitor content
type CompetitorContentFilter struct {
	Channel *string
	After   *time.Time
	Before  *time.Time
	Limit   int
}

// GetCompetitorContent retrieves recent content for a competitor
func (s *CompetitorService) GetCompetitorContent(ctx context.Context, competitorID uuid.UUID, filter CompetitorContentFilter) ([]*domain.CompetitorContent, error) {
	if competitorID == uuid.Nil {
		return nil, fmt.Errorf("competitor_id is required")
	}

	// Verify competitor exists
	_, err := s.profileRepo.GetByID(ctx, competitorID)
	if err != nil {
		return nil, fmt.Errorf("failed to get competitor: %w", err)
	}

	domainFilter := &domain.CompetitorContentFilter{
		CompetitorID: &competitorID,
		Channel:      filter.Channel,
		After:        filter.After,
		Before:       filter.Before,
		Limit:        filter.Limit,
	}

	content, _, err := s.contentRepo.List(ctx, domainFilter)
	if err != nil {
		return nil, fmt.Errorf("failed to get competitor content: %w", err)
	}

	return content, nil
}

// GetCompetitorAnalysis retrieves analysis summary for a competitor
func (s *CompetitorService) GetCompetitorAnalysis(ctx context.Context, competitorID uuid.UUID, periodDays int) (*domain.CompetitorAnalysis, error) {
	if competitorID == uuid.Nil {
		return nil, fmt.Errorf("competitor_id is required")
	}

	// Verify competitor exists
	_, err := s.profileRepo.GetByID(ctx, competitorID)
	if err != nil {
		return nil, fmt.Errorf("failed to get competitor: %w", err)
	}

	if periodDays <= 0 {
		periodDays = 30
	}

	analysis, err := s.contentRepo.GetContentStats(ctx, competitorID, periodDays)
	if err != nil {
		return nil, fmt.Errorf("failed to get competitor analysis: %w", err)
	}

	return analysis, nil
}

// FetchCompetitorContentRequest represents a request to trigger content fetching
type FetchCompetitorContentRequest struct {
	CompetitorID uuid.UUID
	Force        bool
}

// FetchCompetitorContent triggers n8n workflow to scrape competitor content
// This is a placeholder for the n8n integration
func (s *CompetitorService) FetchCompetitorContent(ctx context.Context, req FetchCompetitorContentRequest) error {
	if req.CompetitorID == uuid.Nil {
		return fmt.Errorf("competitor_id is required")
	}

	// Verify competitor exists
	competitor, err := s.profileRepo.GetByID(ctx, req.CompetitorID)
	if err != nil {
		return fmt.Errorf("failed to get competitor: %w", err)
	}

	if !competitor.IsActive {
		return fmt.Errorf("competitor is not active")
	}

	// TODO: Trigger n8n workflow to fetch competitor content
	// This would call the n8n API to start the competitor-monitor workflow
	// For now, log the request

	log.Info().
		Str("competitor_id", req.CompetitorID.String()).
		Bool("force", req.Force).
		Msg("Competitor content fetch triggered")

	return nil
}

// GetAlerts retrieves alerts for a campaign
func (s *CompetitorService) GetAlerts(ctx context.Context, campaignID uuid.UUID, unreadOnly bool) ([]*domain.CompetitorAlert, error) {
	if campaignID == uuid.Nil {
		return nil, fmt.Errorf("campaign_id is required")
	}

	filter := &domain.CompetitorAlertFilter{
		CampaignID: &campaignID,
		Limit:      100,
	}

	if unreadOnly {
		isRead := false
		filter.IsRead = &isRead
	}

	alerts, _, err := s.alertRepo.List(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to get alerts: %w", err)
	}

	return alerts, nil
}

// MarkAlertRead marks an alert as read
func (s *CompetitorService) MarkAlertRead(ctx context.Context, alertID uuid.UUID) error {
	if alertID == uuid.Nil {
		return fmt.Errorf("alert_id is required")
	}

	if err := s.alertRepo.MarkRead(ctx, alertID); err != nil {
		return fmt.Errorf("failed to mark alert as read: %w", err)
	}

	return nil
}

// MarkAllAlertsRead marks all alerts for a campaign as read
func (s *CompetitorService) MarkAllAlertsRead(ctx context.Context, campaignID uuid.UUID) error {
	if campaignID == uuid.Nil {
		return fmt.Errorf("campaign_id is required")
	}

	if err := s.alertRepo.MarkAllRead(ctx, campaignID); err != nil {
		return fmt.Errorf("failed to mark all alerts as read: %w", err)
	}

	return nil
}

// GetUnreadAlertCount returns the count of unread alerts for a campaign
func (s *CompetitorService) GetUnreadAlertCount(ctx context.Context, campaignID uuid.UUID) (int, error) {
	if campaignID == uuid.Nil {
		return 0, fmt.Errorf("campaign_id is required")
	}

	count, err := s.alertRepo.GetUnreadCount(ctx, campaignID)
	if err != nil {
		return 0, fmt.Errorf("failed to get unread alert count: %w", err)
	}

	return count, nil
}

// SaveCompetitorContent saves scraped competitor content (called by n8n webhook)
func (s *CompetitorService) SaveCompetitorContent(ctx context.Context, content *domain.CompetitorContent) error {
	if content == nil {
		return fmt.Errorf("content cannot be nil")
	}

	if err := content.Validate(); err != nil {
		return fmt.Errorf("validation failed: %w", err)
	}

	// Check if content already exists
	existing, err := s.contentRepo.GetByURL(ctx, content.URL)
	if err == nil && existing != nil {
		// Content already exists, update engagement metrics if needed
		if err := s.contentRepo.Update(ctx, content); err != nil {
			return fmt.Errorf("failed to update existing content: %w", err)
		}
		log.Debug().
			Str("content_id", existing.ID.String()).
			Str("url", content.URL).
			Msg("Updated existing competitor content")
		return nil
	}

	// Create new content
	if err := s.contentRepo.Create(ctx, content); err != nil {
		return fmt.Errorf("failed to create competitor content: %w", err)
	}

	// Create alert for new content
	competitor, err := s.profileRepo.GetByID(ctx, content.CompetitorID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get competitor for alert")
		return nil
	}

	alert := &domain.CompetitorAlert{
		CompetitorID: content.CompetitorID,
		AlertType:    domain.AlertNewContent,
		ContentID:    &content.ID,
		Message:      fmt.Sprintf("%s published new content: %s", competitor.Name, content.Title),
		IsRead:       false,
	}

	if err := s.alertRepo.Create(ctx, alert); err != nil {
		log.Error().Err(err).Msg("Failed to create alert for new content")
	}

	log.Info().
		Str("content_id", content.ID.String()).
		Str("competitor_id", content.CompetitorID.String()).
		Str("url", content.URL).
		Msg("Saved new competitor content")

	return nil
}
