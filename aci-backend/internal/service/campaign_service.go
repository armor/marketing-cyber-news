package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/n8n"
	"github.com/phillipboles/aci-backend/internal/repository"
)

// CampaignN8nClient defines the interface for n8n operations used by CampaignService
type CampaignN8nClient interface {
	ActivateWorkflow(ctx context.Context, id string) error
	DeactivateWorkflow(ctx context.Context, id string) error
	DeleteWorkflow(ctx context.Context, id string) error
}

// CampaignLLMClient defines the interface for LLM operations used by CampaignService
type CampaignLLMClient interface {
	// Currently not used directly, but placeholder for future AI-powered campaign features
}

// CampaignService handles campaign business logic
type CampaignService struct {
	campaignRepo   repository.CampaignRepository
	competitorRepo repository.CompetitorRepository
	channelRepo    repository.ChannelConnectionRepository
	n8nClient      n8n.N8nClient
}

// NewCampaignService creates a new campaign service
func NewCampaignService(
	campaignRepo repository.CampaignRepository,
	competitorRepo repository.CompetitorRepository,
	channelRepo repository.ChannelConnectionRepository,
	n8nClient n8n.N8nClient,
) *CampaignService {
	if campaignRepo == nil {
		panic("campaignRepo cannot be nil")
	}
	if n8nClient == nil {
		panic("n8nClient cannot be nil")
	}
	return &CampaignService{
		campaignRepo:   campaignRepo,
		competitorRepo: competitorRepo,
		channelRepo:    channelRepo,
		n8nClient:      n8nClient,
	}
}

// CreateCampaignRequest for creating a campaign
type CreateCampaignRequest struct {
	TenantID     uuid.UUID
	Name         string
	Description  string
	Goal         domain.CampaignGoal
	Channels     []domain.Channel
	Frequency    domain.Frequency
	ContentStyle domain.ContentStyle
	Topics       []string
	StartDate    *time.Time
	EndDate      *time.Time
	Competitors  []CompetitorInput
	CreatedBy    uuid.UUID
}

// UpdateCampaignRequest for updating a campaign
type UpdateCampaignRequest struct {
	Name         *string
	Description  *string
	Goal         *domain.CampaignGoal
	Channels     []domain.Channel
	Frequency    *domain.Frequency
	ContentStyle *domain.ContentStyle
	Topics       []string
	StartDate    *time.Time
	EndDate      *time.Time
}

// CompetitorInput represents competitor data for creation
type CompetitorInput struct {
	Name     string
	LinkedIn string
	Twitter  string
	Blog     string
	Website  string
}

// AIRecommendation represents an AI-powered suggestion
type AIRecommendation struct {
	Type           string      // channel, frequency, content_style, timing, topic
	Title          string      `json:"title"`
	Description    string      `json:"description"`
	Confidence     float64     `json:"confidence"` // 0.0-1.0
	SuggestedValue interface{} `json:"suggested_value"`
}

// Create creates a new campaign in draft status
func (s *CampaignService) Create(ctx context.Context, req CreateCampaignRequest) (*domain.Campaign, error) {
	logger := log.With().
		Str("tenant_id", req.TenantID.String()).
		Str("user_id", req.CreatedBy.String()).
		Str("campaign_name", req.Name).
		Logger()

	logger.Info().Msg("Creating campaign")

	if err := ctx.Err(); err != nil {
		return nil, fmt.Errorf("context error: %w", err)
	}

	// Validate required fields
	if req.Name == "" {
		logger.Warn().Msg("Validation failed: campaign name is required")
		return nil, fmt.Errorf("campaign name is required")
	}

	if req.TenantID == uuid.Nil {
		logger.Warn().Msg("Validation failed: tenant ID is required")
		return nil, fmt.Errorf("tenant ID is required")
	}

	if req.CreatedBy == uuid.Nil {
		logger.Warn().Msg("Validation failed: creator ID is required")
		return nil, fmt.Errorf("creator ID is required")
	}

	if len(req.Channels) == 0 {
		logger.Warn().Msg("Validation failed: at least one channel is required")
		return nil, fmt.Errorf("at least one channel is required")
	}

	// Validate goal
	if !isValidCampaignGoal(req.Goal) {
		logger.Warn().Str("goal", string(req.Goal)).Msg("Validation failed: invalid campaign goal")
		return nil, fmt.Errorf("invalid campaign goal: %s", req.Goal)
	}

	// Validate frequency
	if !isValidFrequency(req.Frequency) {
		logger.Warn().Str("frequency", string(req.Frequency)).Msg("Validation failed: invalid frequency")
		return nil, fmt.Errorf("invalid frequency: %s", req.Frequency)
	}

	// Validate content style
	if !isValidContentStyle(req.ContentStyle) {
		logger.Warn().Str("content_style", string(req.ContentStyle)).Msg("Validation failed: invalid content style")
		return nil, fmt.Errorf("invalid content style: %s", req.ContentStyle)
	}

	// Validate channels
	for _, ch := range req.Channels {
		if !isValidChannel(ch) {
			logger.Warn().Str("channel", string(ch)).Msg("Validation failed: invalid channel")
			return nil, fmt.Errorf("invalid channel: %s", ch)
		}
	}

	// Validate date range if provided
	if req.StartDate != nil && req.EndDate != nil {
		if req.EndDate.Before(*req.StartDate) {
			logger.Warn().Msg("Validation failed: end date cannot be before start date")
			return nil, fmt.Errorf("end date cannot be before start date")
		}
	}

	// Create campaign
	campaign := &domain.Campaign{
		ID:           uuid.New(),
		TenantID:     req.TenantID,
		Name:         req.Name,
		Description:  &req.Description,
		Goal:         req.Goal,
		Channels:     req.Channels,
		Frequency:    req.Frequency,
		ContentStyle: req.ContentStyle,
		Topics:       req.Topics,
		Status:       domain.CampaignDraft,
		StartDate:    req.StartDate,
		EndDate:      req.EndDate,
		CreatedBy:    req.CreatedBy,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := s.campaignRepo.Create(ctx, campaign); err != nil {
		logger.Error().Err(err).Msg("Failed to create campaign in repository")
		return nil, fmt.Errorf("failed to create campaign: %w", err)
	}

	// Add competitors if provided
	if len(req.Competitors) > 0 {
		logger.Info().Int("competitor_count", len(req.Competitors)).Msg("Adding competitors to campaign")
		if err := s.AddCompetitors(ctx, campaign.ID, req.Competitors); err != nil {
			logger.Error().Err(err).Msg("Failed to add competitors")
			return nil, fmt.Errorf("failed to add competitors: %w", err)
		}
	}

	logger.Info().Str("campaign_id", campaign.ID.String()).Msg("Campaign created successfully")
	return campaign, nil
}

// Get retrieves a campaign by ID
func (s *CampaignService) Get(ctx context.Context, id uuid.UUID) (*domain.Campaign, error) {
	if err := ctx.Err(); err != nil {
		return nil, fmt.Errorf("context error: %w", err)
	}

	if id == uuid.Nil {
		return nil, fmt.Errorf("campaign ID is required")
	}

	campaign, err := s.campaignRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get campaign %s: %w", id, err)
	}

	return campaign, nil
}

// List retrieves campaigns with filters
func (s *CampaignService) List(ctx context.Context, filter *domain.CampaignFilter) ([]*domain.Campaign, int, error) {
	if err := ctx.Err(); err != nil {
		return nil, 0, fmt.Errorf("context error: %w", err)
	}

	if filter == nil {
		filter = &domain.CampaignFilter{}
	}

	// Set defaults
	if filter.PageSize <= 0 {
		filter.PageSize = 20
	}
	if filter.PageSize > 100 {
		filter.PageSize = 100
	}

	campaigns, total, err := s.campaignRepo.List(ctx, filter)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list campaigns: %w", err)
	}

	return campaigns, total, nil
}

// Update updates a campaign (only in draft/paused status)
func (s *CampaignService) Update(ctx context.Context, id uuid.UUID, req UpdateCampaignRequest) (*domain.Campaign, error) {
	if err := ctx.Err(); err != nil {
		return nil, fmt.Errorf("context error: %w", err)
	}

	if id == uuid.Nil {
		return nil, fmt.Errorf("campaign ID is required")
	}

	// Get existing campaign
	campaign, err := s.campaignRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get campaign %s: %w", id, err)
	}

	// Validate status
	if campaign.Status != domain.CampaignDraft && campaign.Status != domain.CampaignPaused {
		return nil, fmt.Errorf("cannot update campaign in %s status", campaign.Status)
	}

	// Apply updates
	if req.Name != nil {
		if *req.Name == "" {
			return nil, fmt.Errorf("campaign name cannot be empty")
		}
		campaign.Name = *req.Name
	}

	if req.Description != nil {
		campaign.Description = req.Description
	}

	if req.Goal != nil {
		if !isValidCampaignGoal(*req.Goal) {
			return nil, fmt.Errorf("invalid campaign goal: %s", *req.Goal)
		}
		campaign.Goal = *req.Goal
	}

	if req.Channels != nil {
		if len(req.Channels) == 0 {
			return nil, fmt.Errorf("at least one channel is required")
		}
		for _, ch := range req.Channels {
			if !isValidChannel(ch) {
				return nil, fmt.Errorf("invalid channel: %s", ch)
			}
		}
		campaign.Channels = req.Channels
	}

	if req.Frequency != nil {
		if !isValidFrequency(*req.Frequency) {
			return nil, fmt.Errorf("invalid frequency: %s", *req.Frequency)
		}
		campaign.Frequency = *req.Frequency
	}

	if req.ContentStyle != nil {
		if !isValidContentStyle(*req.ContentStyle) {
			return nil, fmt.Errorf("invalid content style: %s", *req.ContentStyle)
		}
		campaign.ContentStyle = *req.ContentStyle
	}

	if req.Topics != nil {
		campaign.Topics = req.Topics
	}

	if req.StartDate != nil {
		campaign.StartDate = req.StartDate
	}

	if req.EndDate != nil {
		campaign.EndDate = req.EndDate
	}

	// Validate date range
	if campaign.StartDate != nil && campaign.EndDate != nil {
		if campaign.EndDate.Before(*campaign.StartDate) {
			return nil, fmt.Errorf("end date cannot be before start date")
		}
	}

	campaign.UpdatedAt = time.Now()

	if err := s.campaignRepo.Update(ctx, campaign); err != nil {
		return nil, fmt.Errorf("failed to update campaign: %w", err)
	}

	return campaign, nil
}

// Delete deletes a campaign (only in draft/archived status)
func (s *CampaignService) Delete(ctx context.Context, id uuid.UUID) error {
	if err := ctx.Err(); err != nil {
		return fmt.Errorf("context error: %w", err)
	}

	if id == uuid.Nil {
		return fmt.Errorf("campaign ID is required")
	}

	campaign, err := s.campaignRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to get campaign %s: %w", id, err)
	}

	// Only allow deletion of draft or archived campaigns
	if campaign.Status != domain.CampaignDraft && campaign.Status != domain.CampaignArchived {
		return fmt.Errorf("cannot delete campaign in %s status", campaign.Status)
	}

	if err := s.campaignRepo.Delete(ctx, id); err != nil {
		return fmt.Errorf("failed to delete campaign %s: %w", id, err)
	}

	return nil
}

// Launch activates a campaign and creates n8n workflows
func (s *CampaignService) Launch(ctx context.Context, id uuid.UUID) (*domain.Campaign, error) {
	logger := log.With().
		Str("campaign_id", id.String()).
		Logger()

	logger.Info().Msg("Launching campaign")

	if err := ctx.Err(); err != nil {
		return nil, fmt.Errorf("context error: %w", err)
	}

	if id == uuid.Nil {
		logger.Warn().Msg("Validation failed: campaign ID is required")
		return nil, fmt.Errorf("campaign ID is required")
	}

	campaign, err := s.campaignRepo.GetByID(ctx, id)
	if err != nil {
		logger.Error().Err(err).Msg("Failed to get campaign")
		return nil, fmt.Errorf("failed to get campaign %s: %w", id, err)
	}

	logger = logger.With().
		Str("tenant_id", campaign.TenantID.String()).
		Str("campaign_name", campaign.Name).
		Logger()

	// Validate campaign is in draft status
	if campaign.Status != domain.CampaignDraft {
		logger.Warn().Str("current_status", string(campaign.Status)).Msg("Campaign must be in draft status to launch")
		return nil, fmt.Errorf("campaign must be in draft status to launch (current: %s)", campaign.Status)
	}

	// Verify all selected channels are connected
	logger.Info().Int("channel_count", len(campaign.Channels)).Msg("Verifying channel connections")
	for _, channel := range campaign.Channels {
		connection, err := s.channelRepo.GetByTenantAndChannel(ctx, campaign.TenantID, channel)
		if err != nil {
			logger.Error().Err(err).Str("channel", string(channel)).Msg("Channel not connected")
			return nil, fmt.Errorf("channel %s is not connected: %w", channel, err)
		}

		if connection.Status != domain.StatusConnected {
			logger.Warn().
				Str("channel", string(channel)).
				Str("status", string(connection.Status)).
				Msg("Channel not in connected status")
			return nil, fmt.Errorf("channel %s is not in connected status", channel)
		}
	}

	// Get n8n credential IDs for connected channels
	credentialMap := make(map[domain.Channel]string)
	for _, channel := range campaign.Channels {
		connection, err := s.channelRepo.GetByTenantAndChannel(ctx, campaign.TenantID, channel)
		if err != nil {
			logger.Error().Err(err).Str("channel", string(channel)).Msg("Failed to get channel connection")
			return nil, fmt.Errorf("failed to get connection for channel %s: %w", channel, err)
		}

		if connection.N8nCredentialID == "" {
			logger.Error().Str("channel", string(channel)).Msg("Channel has no n8n credential ID")
			return nil, fmt.Errorf("channel %s has no n8n credential ID", channel)
		}

		credentialMap[channel] = connection.N8nCredentialID
	}

	// Create n8n workflows using factory
	logger.Info().Msg("Creating n8n workflows")
	workflowIDs := make(map[string]string)
	for _, channel := range campaign.Channels {
		_ = credentialMap[channel] // TODO: Use this when implementing real workflow creation

		// TODO: Implement proper workflow creation - CreateCampaignWorkflows returns []string not single ID
		workflowID := fmt.Sprintf("placeholder-%s-%s", campaign.ID.String(), channel)

		workflowIDs[string(channel)] = workflowID

		// Activate the workflow
		// TODO: Uncomment when proper workflow creation is implemented
		// if err := s.n8nClient.ActivateWorkflow(ctx, workflowID); err != nil {
		// 	logger.Error().Err(err).Str("workflow_id", workflowID).Msg("Failed to activate workflow")
		// 	return nil, fmt.Errorf("failed to activate workflow: %w", err)
		// }

		logger.Info().
			Str("workflow_id", workflowID).
			Str("channel", string(channel)).
			Msg("Workflow placeholder created")
	}

	// Store workflow IDs in campaign
	// TODO: Fix - workflowIDs is map but Campaign.WorkflowIDs is []string
	campaign.Status = domain.CampaignActive
	// LaunchedAt field removed from Campaign struct
	campaign.UpdatedAt = time.Now()

	if err := s.campaignRepo.Update(ctx, campaign); err != nil {
		logger.Error().Err(err).Msg("Failed to update campaign status")
		// Attempt to clean up workflows
		for channel, workflowID := range workflowIDs {
			if deleteErr := s.n8nClient.DeleteWorkflow(ctx, workflowID); deleteErr != nil {
				logger.Error().Err(deleteErr).
					Str("workflow_id", workflowID).
					Str("channel", channel).
					Msg("Failed to cleanup workflow")
			}
		}
		return nil, fmt.Errorf("failed to update campaign status: %w", err)
	}

	logger.Info().
		Int("workflow_count", len(workflowIDs)).
		Msg("Campaign launched successfully")
	return campaign, nil
}

// Pause pauses an active campaign (deactivates workflows)
func (s *CampaignService) Pause(ctx context.Context, id uuid.UUID) (*domain.Campaign, error) {
	if err := ctx.Err(); err != nil {
		return nil, fmt.Errorf("context error: %w", err)
	}

	if id == uuid.Nil {
		return nil, fmt.Errorf("campaign ID is required")
	}

	campaign, err := s.campaignRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get campaign %s: %w", id, err)
	}

	if campaign.Status != domain.CampaignActive {
		return nil, fmt.Errorf("campaign must be active to pause (current: %s)", campaign.Status)
	}

	// Deactivate all workflows
	for channel, workflowID := range campaign.WorkflowIDs {
		if err := s.n8nClient.DeactivateWorkflow(ctx, workflowID); err != nil {
			return nil, fmt.Errorf("failed to deactivate workflow for channel %s: %w", channel, err)
		}
	}

	campaign.Status = domain.CampaignPaused
	campaign.UpdatedAt = time.Now()

	if err := s.campaignRepo.Update(ctx, campaign); err != nil {
		return nil, fmt.Errorf("failed to update campaign status: %w", err)
	}

	return campaign, nil
}

// Resume resumes a paused campaign (reactivates workflows)
func (s *CampaignService) Resume(ctx context.Context, id uuid.UUID) (*domain.Campaign, error) {
	if err := ctx.Err(); err != nil {
		return nil, fmt.Errorf("context error: %w", err)
	}

	if id == uuid.Nil {
		return nil, fmt.Errorf("campaign ID is required")
	}

	campaign, err := s.campaignRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get campaign %s: %w", id, err)
	}

	if campaign.Status != domain.CampaignPaused {
		return nil, fmt.Errorf("campaign must be paused to resume (current: %s)", campaign.Status)
	}

	// Verify channels are still connected
	for _, channel := range campaign.Channels {
		connection, err := s.channelRepo.GetByTenantAndChannel(ctx, campaign.TenantID, channel)
		if err != nil {
			return nil, fmt.Errorf("channel %s is no longer connected: %w", channel, err)
		}

		if connection.Status != domain.StatusConnected {
			return nil, fmt.Errorf("channel %s is not in connected status", channel)
		}
	}

	// Reactivate all workflows
	for channel, workflowID := range campaign.WorkflowIDs {
		if err := s.n8nClient.ActivateWorkflow(ctx, workflowID); err != nil {
			return nil, fmt.Errorf("failed to activate workflow for channel %s: %w", channel, err)
		}
	}

	campaign.Status = domain.CampaignActive
	campaign.UpdatedAt = time.Now()

	if err := s.campaignRepo.Update(ctx, campaign); err != nil {
		return nil, fmt.Errorf("failed to update campaign status: %w", err)
	}

	return campaign, nil
}

// Stop permanently stops a campaign (deletes workflows)
func (s *CampaignService) Stop(ctx context.Context, id uuid.UUID) (*domain.Campaign, error) {
	if err := ctx.Err(); err != nil {
		return nil, fmt.Errorf("context error: %w", err)
	}

	if id == uuid.Nil {
		return nil, fmt.Errorf("campaign ID is required")
	}

	campaign, err := s.campaignRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get campaign %s: %w", id, err)
	}

	if campaign.Status != domain.CampaignActive && campaign.Status != domain.CampaignPaused {
		return nil, fmt.Errorf("can only stop active or paused campaigns (current: %s)", campaign.Status)
	}

	// Delete all workflows
	var deleteErrors []string
	for channel, workflowID := range campaign.WorkflowIDs {
		if err := s.n8nClient.DeleteWorkflow(ctx, workflowID); err != nil {
			deleteErrors = append(deleteErrors, fmt.Sprintf("channel %s: %v", channel, err))
		}
	}

	if len(deleteErrors) > 0 {
		return nil, fmt.Errorf("failed to delete some workflows: %v", deleteErrors)
	}

	campaign.Status = domain.CampaignArchived
	campaign.WorkflowIDs = nil
	campaign.UpdatedAt = time.Now()

	if err := s.campaignRepo.Update(ctx, campaign); err != nil {
		return nil, fmt.Errorf("failed to update campaign status: %w", err)
	}

	return campaign, nil
}

// GetRecommendations returns AI-powered suggestions for campaign setup
func (s *CampaignService) GetRecommendations(ctx context.Context, req CreateCampaignRequest) ([]AIRecommendation, error) {
	if err := ctx.Err(); err != nil {
		return nil, fmt.Errorf("context error: %w", err)
	}

	recommendations := []AIRecommendation{}

	// Build prompt for LLM
	_ = buildRecommendationPrompt(req) // TODO: Use when implementing LLM recommendations

	// Get LLM recommendations
	// TODO: Implement LLM recommendation generation
	// Skip LLM for now

	// Parse LLM response into recommendations
	// recommendations = parseRecommendations(response, req) // TODO: Implement

	// Add rule-based recommendations
	recommendations = append(recommendations, getRuleBasedRecommendations(req)...)

	return recommendations, nil
}

// GetStats returns campaign statistics
func (s *CampaignService) GetStats(ctx context.Context, id uuid.UUID) (*domain.CampaignStats, error) {
	if err := ctx.Err(); err != nil {
		return nil, fmt.Errorf("context error: %w", err)
	}

	if id == uuid.Nil {
		return nil, fmt.Errorf("campaign ID is required")
	}

	campaign, err := s.campaignRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get campaign %s: %w", id, err)
	}

	return &campaign.Stats, nil // Using campaign.Stats directly since GetStats method doesn't exist

	// Enrich with campaign data

}

// AddCompetitors adds competitors to a campaign
func (s *CampaignService) AddCompetitors(ctx context.Context, campaignID uuid.UUID, competitors []CompetitorInput) error {
	if err := ctx.Err(); err != nil {
		return fmt.Errorf("context error: %w", err)
	}

	if s.competitorRepo == nil {
		return fmt.Errorf("competitor functionality not available")
	}

	if campaignID == uuid.Nil {
		return fmt.Errorf("campaign ID is required")
	}

	if len(competitors) == 0 {
		return fmt.Errorf("at least one competitor is required")
	}

	// Verify campaign exists
	_, err := s.campaignRepo.GetByID(ctx, campaignID)
	if err != nil {
		return fmt.Errorf("failed to get campaign %s: %w", campaignID, err)
	}

	// Create competitors
	for _, comp := range competitors {
		if comp.Name == "" {
			return fmt.Errorf("competitor name is required")
		}

		competitor := &domain.Competitor{
			ID:         uuid.New(),
			CampaignID: campaignID,
			Name:       comp.Name,
			LinkedIn:   comp.LinkedIn,
			Twitter:    comp.Twitter,
			Blog:       comp.Blog,
			Website:    comp.Website,
			CreatedAt:  time.Now(),
		}

		if err := s.competitorRepo.Create(ctx, competitor); err != nil {
			return fmt.Errorf("failed to create competitor %s: %w", comp.Name, err)
		}
	}

	return nil
}

// RemoveCompetitor removes a competitor from a campaign
func (s *CampaignService) RemoveCompetitor(ctx context.Context, campaignID uuid.UUID, competitorID uuid.UUID) error {
	if err := ctx.Err(); err != nil {
		return fmt.Errorf("context error: %w", err)
	}

	if s.competitorRepo == nil {
		return fmt.Errorf("competitor functionality not available")
	}

	if campaignID == uuid.Nil {
		return fmt.Errorf("campaign ID is required")
	}

	if competitorID == uuid.Nil {
		return fmt.Errorf("competitor ID is required")
	}

	// Verify competitor belongs to campaign
	competitor, err := s.competitorRepo.GetByID(ctx, competitorID)
	if err != nil {
		return fmt.Errorf("failed to get competitor %s: %w", competitorID, err)
	}

	if competitor.CampaignID != campaignID {
		return fmt.Errorf("competitor %s does not belong to campaign %s", competitorID, campaignID)
	}

	if err := s.competitorRepo.Delete(ctx, competitorID); err != nil {
		return fmt.Errorf("failed to delete competitor %s: %w", competitorID, err)
	}

	return nil
}

// GetCompetitors returns all competitors for a campaign
func (s *CampaignService) GetCompetitors(ctx context.Context, campaignID uuid.UUID) ([]*domain.Competitor, error) {
	if err := ctx.Err(); err != nil {
		return nil, fmt.Errorf("context error: %w", err)
	}

	if s.competitorRepo == nil {
		return nil, fmt.Errorf("competitor functionality not available")
	}

	if campaignID == uuid.Nil {
		return nil, fmt.Errorf("campaign ID is required")
	}

	competitors, err := s.competitorRepo.GetByCampaignID(ctx, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to list competitors for campaign %s: %w", campaignID, err)
	}

	return competitors, nil
}

// Helper functions

func isValidCampaignGoal(goal domain.CampaignGoal) bool {
	validGoals := []domain.CampaignGoal{
		domain.GoalAwareness,
		domain.GoalLeads,
		domain.GoalEngagement,
		domain.GoalAwareness,
		domain.GoalAwareness,
		domain.GoalEngagement,
	}

	for _, valid := range validGoals {
		if goal == valid {
			return true
		}
	}
	return false
}

func isValidFrequency(freq domain.Frequency) bool {
	validFreqs := []domain.Frequency{
		domain.FreqDaily,
		domain.FreqWeekly,
		domain.FreqBiweekly,
		domain.FreqMonthly,
	}

	for _, valid := range validFreqs {
		if freq == valid {
			return true
		}
	}
	return false
}

func isValidContentStyle(style domain.ContentStyle) bool {
	validStyles := []domain.ContentStyle{
		domain.StyleThoughtLeadership,
		domain.StyleEducational,
		domain.StyleEducational,
		domain.StyleEducational,
		domain.StylePromotional,
		domain.StyleEducational,
	}

	for _, valid := range validStyles {
		if style == valid {
			return true
		}
	}
	return false
}

func isValidChannel(channel domain.Channel) bool {
	validChannels := []domain.Channel{
		domain.ChannelLinkedIn,
		domain.ChannelTwitter,
		domain.ChannelBlog,
		domain.ChannelEmail,
	}

	for _, valid := range validChannels {
		if channel == valid {
			return true
		}
	}
	return false
}

func buildRecommendationPrompt(req CreateCampaignRequest) string {
	prompt := fmt.Sprintf(`Analyze this marketing campaign and provide recommendations:

Campaign Goal: %s
Channels: %v
Frequency: %s
Content Style: %s
Topics: %v

Provide recommendations for:
1. Best channels for this goal
2. Optimal posting frequency
3. Content style suggestions
4. Additional topic ideas
5. Best times to post

Format as JSON with: type, title, description, confidence (0-1), suggested_value`,
		req.Goal, req.Channels, req.Frequency, req.ContentStyle, req.Topics)

	return prompt
}

func parseRecommendations(response string, req CreateCampaignRequest) []AIRecommendation {
	// In a real implementation, this would parse the LLM JSON response
	// For now, return empty slice - actual parsing would be added
	recommendations := []AIRecommendation{}

	// TODO: Parse LLM response JSON into AIRecommendation structs
	// This would use json.Unmarshal on the response string

	return recommendations
}

func getRuleBasedRecommendations(req CreateCampaignRequest) []AIRecommendation {
	recommendations := []AIRecommendation{}

	// Channel recommendations based on goal
	if req.Goal == domain.GoalEngagement {
		recommendations = append(recommendations, AIRecommendation{
			Type:           "channel",
			Title:          "LinkedIn for Thought Leadership",
			Description:    "LinkedIn is the best platform for establishing thought leadership in B2B",
			Confidence:     0.95,
			SuggestedValue: "linkedin",
		})
	}

	// Frequency recommendations
	if req.Frequency == domain.FreqDaily && len(req.Channels) > 2 {
		recommendations = append(recommendations, AIRecommendation{
			Type:           "frequency",
			Title:          "Consider reducing frequency",
			Description:    "Daily posting across multiple channels may lead to burnout. Consider weekly or bi-weekly.",
			Confidence:     0.8,
			SuggestedValue: "weekly",
		})
	}

	// Topic recommendations
	if len(req.Topics) < 3 {
		recommendations = append(recommendations, AIRecommendation{
			Type:           "topic",
			Title:          "Add more topics",
			Description:    "Having 3-5 topics provides better content variety and prevents repetition",
			Confidence:     0.85,
			SuggestedValue: []string{"industry trends", "best practices", "case studies"},
		})
	}

	return recommendations
}

func timePtr(t time.Time) *time.Time {
	return &t
}
