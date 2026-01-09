package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/phillipboles/aci-backend/internal/api/middleware"
	"github.com/phillipboles/aci-backend/internal/api/response"
	"github.com/phillipboles/aci-backend/internal/domain"
)

// CampaignService defines the interface for campaign business logic
type CampaignService interface {
	List(ctx context.Context, filter *domain.CampaignFilter) ([]*domain.Campaign, int, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Campaign, error)
	Create(ctx context.Context, campaign *domain.Campaign) error
	Update(ctx context.Context, campaign *domain.Campaign) error
	Delete(ctx context.Context, id uuid.UUID) error
	Launch(ctx context.Context, id uuid.UUID) error
	Pause(ctx context.Context, id uuid.UUID) error
	Resume(ctx context.Context, id uuid.UUID) error
	Stop(ctx context.Context, id uuid.UUID) error
	GetStats(ctx context.Context, id uuid.UUID) (*domain.CampaignStats, error)
	GetRecommendations(ctx context.Context, req *RecommendationsRequest) ([]AIRecommendation, error)
	GetCompetitors(ctx context.Context, campaignID uuid.UUID) ([]*domain.Competitor, error)
	AddCompetitor(ctx context.Context, competitor *domain.Competitor) error
	RemoveCompetitor(ctx context.Context, campaignID, competitorID uuid.UUID) error
}

// CampaignHandler handles campaign HTTP requests
type CampaignHandler struct {
	service CampaignService
}

// NewCampaignHandler creates a new campaign handler
func NewCampaignHandler(service CampaignService) *CampaignHandler {
	if service == nil {
		panic("service cannot be nil")
	}

	return &CampaignHandler{
		service: service,
	}
}

// CreateCampaignDTO represents the request to create a campaign
type CreateCampaignDTO struct {
	Name         string          `json:"name" validate:"required,min=1,max=255"`
	Description  string          `json:"description,omitempty"`
	Goal         string          `json:"goal" validate:"required,oneof=awareness leads engagement traffic"`
	Channels     []string        `json:"channels" validate:"required,min=1"`
	Frequency    string          `json:"frequency" validate:"required"`
	ContentStyle string          `json:"content_style" validate:"required"`
	Topics       []string        `json:"topics,omitempty"`
	StartDate    *string         `json:"start_date,omitempty"`
	EndDate      *string         `json:"end_date,omitempty"`
	Competitors  []CompetitorDTO `json:"competitors,omitempty"`
}

// UpdateCampaignDTO represents the request to update a campaign
type UpdateCampaignDTO struct {
	Name         *string  `json:"name,omitempty"`
	Description  *string  `json:"description,omitempty"`
	Goal         *string  `json:"goal,omitempty"`
	Channels     []string `json:"channels,omitempty"`
	Frequency    *string  `json:"frequency,omitempty"`
	ContentStyle *string  `json:"content_style,omitempty"`
	Topics       []string `json:"topics,omitempty"`
	StartDate    *string  `json:"start_date,omitempty"`
	EndDate      *string  `json:"end_date,omitempty"`
}

// CompetitorDTO represents a competitor
type CompetitorDTO struct {
	Name     string `json:"name" validate:"required"`
	LinkedIn string `json:"linkedin_url,omitempty"`
	Twitter  string `json:"twitter_handle,omitempty"`
	Blog     string `json:"blog_url,omitempty"`
	Website  string `json:"website_url,omitempty"`
}

// RecommendationsRequest represents a request for AI recommendations
type RecommendationsRequest struct {
	Goal           string   `json:"goal" validate:"required"`
	Channels       []string `json:"channels,omitempty"`
	Topics         []string `json:"topics,omitempty"`
	TargetAudience string   `json:"target_audience,omitempty"`
}

// AIRecommendation represents an AI-powered recommendation
type AIRecommendation struct {
	Type       string  `json:"type"`
	Category   string  `json:"category"`
	Suggestion string  `json:"suggestion"`
	Reasoning  string  `json:"reasoning"`
	Confidence float64 `json:"confidence"`
}

// List handles GET /v1/campaigns - returns paginated campaigns
func (h *CampaignHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get authenticated user
	user, err := middleware.GetDomainUserFromContext(ctx)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Parse pagination parameters
	page, pageSize, err := ParsePagination(r)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Invalid pagination parameters")
		response.BadRequest(w, err.Error())
		return
	}

	// Build filter
	filter := &domain.CampaignFilter{
		TenantID:  uuid.Nil, // TODO: Add multi-tenancy support
		CreatedBy: &user.ID,
		Page:      page,
		PageSize:  pageSize,
	}

	// Parse optional filters
	if status := r.URL.Query().Get("status"); status != "" {
		campaignStatus := domain.CampaignStatus(status)
		if !campaignStatus.IsValid() {
			response.BadRequest(w, fmt.Sprintf("Invalid status: %s", status))
			return
		}
		filter.Status = &campaignStatus
	}

	if goal := r.URL.Query().Get("goal"); goal != "" {
		campaignGoal := domain.CampaignGoal(goal)
		if !campaignGoal.IsValid() {
			response.BadRequest(w, fmt.Sprintf("Invalid goal: %s", goal))
			return
		}
		filter.Goal = &campaignGoal
	}

	if channel := r.URL.Query().Get("channel"); channel != "" {
		campaignChannel := domain.Channel(channel)
		if !campaignChannel.IsValid() {
			response.BadRequest(w, fmt.Sprintf("Invalid channel: %s", channel))
			return
		}
		filter.Channel = &campaignChannel
	}

	if search := r.URL.Query().Get("search"); search != "" {
		filter.Search = search
	}

	// Get campaigns from service
	campaigns, total, err := h.service.List(ctx, filter)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to list campaigns")
		response.InternalError(w, "Failed to retrieve campaigns", requestID)
		return
	}

	// Calculate pagination metadata
	totalPages := CalculateTotalPages(total, pageSize)
	meta := &response.Meta{
		Page:       page,
		PageSize:   pageSize,
		TotalCount: total,
		TotalPages: totalPages,
	}

	response.SuccessWithMeta(w, campaigns, meta)
}

// GetByID handles GET /v1/campaigns/{id} - returns a single campaign
func (h *CampaignHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get authenticated user
	user, err := middleware.GetDomainUserFromContext(ctx)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Extract and validate ID
	idStr := chi.URLParam(r, "id")
	if idStr == "" {
		response.BadRequest(w, "Campaign ID is required")
		return
	}

	id, err := uuid.Parse(idStr)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", idStr).
			Msg("Invalid campaign ID")
		response.BadRequest(w, "Invalid campaign ID format")
		return
	}

	// Get campaign from service
	campaign, err := h.service.GetByID(ctx, id)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", id.String()).
			Msg("Failed to get campaign")
		response.NotFound(w, "Campaign not found")
		return
	}

	// Verify ownership (only creator or admin can view)
	if campaign.CreatedBy != user.ID && user.Role != domain.RoleAdmin {
		log.Warn().
			Str("request_id", requestID).
			Str("user_id", user.ID.String()).
			Str("campaign_owner", campaign.CreatedBy.String()).
			Msg("Unauthorized access to campaign")
		response.Forbidden(w, "You do not have permission to access this campaign")
		return
	}

	response.Success(w, campaign)
}

// Create handles POST /v1/campaigns - creates a new campaign
func (h *CampaignHandler) Create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get authenticated user
	user, err := middleware.GetDomainUserFromContext(ctx)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Decode request body
	var req CreateCampaignDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to decode request body")
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Validate required fields
	if req.Name == "" {
		response.BadRequest(w, "Campaign name is required")
		return
	}

	if len(req.Name) > 255 {
		response.BadRequest(w, "Campaign name must not exceed 255 characters")
		return
	}

	if len(req.Channels) == 0 {
		response.BadRequest(w, "At least one channel is required")
		return
	}

	// Validate goal
	goal := domain.CampaignGoal(req.Goal)
	if !goal.IsValid() {
		response.BadRequest(w, fmt.Sprintf("Invalid goal: %s", req.Goal))
		return
	}

	// Validate frequency
	frequency := domain.Frequency(req.Frequency)
	if !frequency.IsValid() {
		response.BadRequest(w, fmt.Sprintf("Invalid frequency: %s", req.Frequency))
		return
	}

	// Validate content style
	contentStyle := domain.ContentStyle(req.ContentStyle)
	if !contentStyle.IsValid() {
		response.BadRequest(w, fmt.Sprintf("Invalid content style: %s", req.ContentStyle))
		return
	}

	// Validate channels
	channels := make([]domain.Channel, 0, len(req.Channels))
	for _, ch := range req.Channels {
		channel := domain.Channel(ch)
		if !channel.IsValid() {
			response.BadRequest(w, fmt.Sprintf("Invalid channel: %s", ch))
			return
		}
		channels = append(channels, channel)
	}

	// Parse optional dates
	var startDate, endDate *time.Time
	if req.StartDate != nil {
		parsed, err := time.Parse(time.RFC3339, *req.StartDate)
		if err != nil {
			response.BadRequest(w, "Invalid start_date format (expected RFC3339)")
			return
		}
		startDate = &parsed
	}

	if req.EndDate != nil {
		parsed, err := time.Parse(time.RFC3339, *req.EndDate)
		if err != nil {
			response.BadRequest(w, "Invalid end_date format (expected RFC3339)")
			return
		}
		endDate = &parsed
	}

	// Validate date range
	if startDate != nil && endDate != nil && endDate.Before(*startDate) {
		response.BadRequest(w, "End date must be after start date")
		return
	}

	// Create campaign domain object
	campaign := &domain.Campaign{
		TenantID:     uuid.Nil, // TODO: Add multi-tenancy support
		Name:         req.Name,
		Goal:         goal,
		Status:       domain.CampaignDraft,
		Channels:     channels,
		StartDate:    startDate,
		EndDate:      endDate,
		Frequency:    frequency,
		ContentStyle: contentStyle,
		Topics:       req.Topics,
		Config:       domain.DefaultCampaignConfig(),
		WorkflowIDs:  []string{},
		Stats:        domain.CampaignStats{},
		CreatedBy:    user.ID,
	}

	if req.Description != "" {
		campaign.Description = &req.Description
	}

	// Create campaign via service
	if err := h.service.Create(ctx, campaign); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("name", campaign.Name).
			Msg("Failed to create campaign")
		response.InternalError(w, "Failed to create campaign", requestID)
		return
	}

	response.Created(w, campaign)
}

// Update handles PUT /v1/campaigns/{id} - updates an existing campaign
func (h *CampaignHandler) Update(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get authenticated user
	user, err := middleware.GetDomainUserFromContext(ctx)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Extract and validate ID
	idStr := chi.URLParam(r, "id")
	if idStr == "" {
		response.BadRequest(w, "Campaign ID is required")
		return
	}

	id, err := uuid.Parse(idStr)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", idStr).
			Msg("Invalid campaign ID")
		response.BadRequest(w, "Invalid campaign ID format")
		return
	}

	// Get existing campaign
	existing, err := h.service.GetByID(ctx, id)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", id.String()).
			Msg("Failed to get existing campaign")
		response.NotFound(w, "Campaign not found")
		return
	}

	// Verify ownership (only creator or admin can update)
	if existing.CreatedBy != user.ID && user.Role != domain.RoleAdmin {
		log.Warn().
			Str("request_id", requestID).
			Str("user_id", user.ID.String()).
			Str("campaign_owner", existing.CreatedBy.String()).
			Msg("Unauthorized attempt to update campaign")
		response.Forbidden(w, "You do not have permission to update this campaign")
		return
	}

	// Decode request body
	var req UpdateCampaignDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to decode request body")
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Apply updates (only non-nil fields)
	if req.Name != nil {
		if *req.Name == "" {
			response.BadRequest(w, "Campaign name cannot be empty")
			return
		}
		if len(*req.Name) > 255 {
			response.BadRequest(w, "Campaign name must not exceed 255 characters")
			return
		}
		existing.Name = *req.Name
	}

	if req.Description != nil {
		existing.Description = req.Description
	}

	if req.Goal != nil {
		goal := domain.CampaignGoal(*req.Goal)
		if !goal.IsValid() {
			response.BadRequest(w, fmt.Sprintf("Invalid goal: %s", *req.Goal))
			return
		}
		existing.Goal = goal
	}

	if len(req.Channels) > 0 {
		channels := make([]domain.Channel, 0, len(req.Channels))
		for _, ch := range req.Channels {
			channel := domain.Channel(ch)
			if !channel.IsValid() {
				response.BadRequest(w, fmt.Sprintf("Invalid channel: %s", ch))
				return
			}
			channels = append(channels, channel)
		}
		existing.Channels = channels
	}

	if req.Frequency != nil {
		frequency := domain.Frequency(*req.Frequency)
		if !frequency.IsValid() {
			response.BadRequest(w, fmt.Sprintf("Invalid frequency: %s", *req.Frequency))
			return
		}
		existing.Frequency = frequency
	}

	if req.ContentStyle != nil {
		contentStyle := domain.ContentStyle(*req.ContentStyle)
		if !contentStyle.IsValid() {
			response.BadRequest(w, fmt.Sprintf("Invalid content style: %s", *req.ContentStyle))
			return
		}
		existing.ContentStyle = contentStyle
	}

	if len(req.Topics) > 0 {
		existing.Topics = req.Topics
	}

	if req.StartDate != nil {
		parsed, err := time.Parse(time.RFC3339, *req.StartDate)
		if err != nil {
			response.BadRequest(w, "Invalid start_date format (expected RFC3339)")
			return
		}
		existing.StartDate = &parsed
	}

	if req.EndDate != nil {
		parsed, err := time.Parse(time.RFC3339, *req.EndDate)
		if err != nil {
			response.BadRequest(w, "Invalid end_date format (expected RFC3339)")
			return
		}
		existing.EndDate = &parsed
	}

	// Validate date range
	if existing.StartDate != nil && existing.EndDate != nil && existing.EndDate.Before(*existing.StartDate) {
		response.BadRequest(w, "End date must be after start date")
		return
	}

	// Update campaign via service
	if err := h.service.Update(ctx, existing); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", id.String()).
			Msg("Failed to update campaign")
		response.InternalError(w, "Failed to update campaign", requestID)
		return
	}

	response.Success(w, existing)
}

// Delete handles DELETE /v1/campaigns/{id} - deletes a campaign
func (h *CampaignHandler) Delete(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get authenticated user
	user, err := middleware.GetDomainUserFromContext(ctx)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Extract and validate ID
	idStr := chi.URLParam(r, "id")
	if idStr == "" {
		response.BadRequest(w, "Campaign ID is required")
		return
	}

	id, err := uuid.Parse(idStr)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", idStr).
			Msg("Invalid campaign ID")
		response.BadRequest(w, "Invalid campaign ID format")
		return
	}

	// Get existing campaign for ownership check
	existing, err := h.service.GetByID(ctx, id)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", id.String()).
			Msg("Failed to get existing campaign")
		response.NotFound(w, "Campaign not found")
		return
	}

	// Verify ownership (only creator or admin can delete)
	if existing.CreatedBy != user.ID && user.Role != domain.RoleAdmin {
		log.Warn().
			Str("request_id", requestID).
			Str("user_id", user.ID.String()).
			Str("campaign_owner", existing.CreatedBy.String()).
			Msg("Unauthorized attempt to delete campaign")
		response.Forbidden(w, "You do not have permission to delete this campaign")
		return
	}

	// Delete campaign via service
	if err := h.service.Delete(ctx, id); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", id.String()).
			Msg("Failed to delete campaign")
		response.InternalError(w, "Failed to delete campaign", requestID)
		return
	}

	response.NoContent(w)
}

// Launch handles POST /v1/campaigns/{id}/launch - launches a campaign
func (h *CampaignHandler) Launch(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get authenticated user
	user, err := middleware.GetDomainUserFromContext(ctx)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Extract and validate ID
	idStr := chi.URLParam(r, "id")
	if idStr == "" {
		response.BadRequest(w, "Campaign ID is required")
		return
	}

	id, err := uuid.Parse(idStr)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", idStr).
			Msg("Invalid campaign ID")
		response.BadRequest(w, "Invalid campaign ID format")
		return
	}

	// Get existing campaign for ownership check
	existing, err := h.service.GetByID(ctx, id)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", id.String()).
			Msg("Failed to get existing campaign")
		response.NotFound(w, "Campaign not found")
		return
	}

	// Verify ownership (only creator or admin can perform action)
	if existing.CreatedBy != user.ID && user.Role != domain.RoleAdmin {
		log.Warn().
			Str("request_id", requestID).
			Str("user_id", user.ID.String()).
			Str("campaign_owner", existing.CreatedBy.String()).
			Msg("Unauthorized attempt to launch campaign")
		response.Forbidden(w, "You do not have permission to launch this campaign")
		return
	}

	// Launch campaign via service
	if err := h.service.Launch(ctx, id); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", id.String()).
			Msg("Failed to launch campaign")
		response.InternalError(w, "Failed to launch campaign", requestID)
		return
	}

	// Get updated campaign
	campaign, err := h.service.GetByID(ctx, id)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", id.String()).
			Msg("Failed to get launched campaign")
		response.InternalError(w, "Failed to retrieve launched campaign", requestID)
		return
	}

	response.Success(w, campaign)
}

// Pause handles POST /v1/campaigns/{id}/pause - pauses a campaign
func (h *CampaignHandler) Pause(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get authenticated user
	user, err := middleware.GetDomainUserFromContext(ctx)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Extract and validate ID
	idStr := chi.URLParam(r, "id")
	if idStr == "" {
		response.BadRequest(w, "Campaign ID is required")
		return
	}

	id, err := uuid.Parse(idStr)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", idStr).
			Msg("Invalid campaign ID")
		response.BadRequest(w, "Invalid campaign ID format")
		return
	}

	// Get existing campaign for ownership check
	existing, err := h.service.GetByID(ctx, id)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", id.String()).
			Msg("Failed to get existing campaign")
		response.NotFound(w, "Campaign not found")
		return
	}

	// Verify ownership (only creator or admin can perform action)
	if existing.CreatedBy != user.ID && user.Role != domain.RoleAdmin {
		log.Warn().
			Str("request_id", requestID).
			Str("user_id", user.ID.String()).
			Str("campaign_owner", existing.CreatedBy.String()).
			Msg("Unauthorized attempt to pause campaign")
		response.Forbidden(w, "You do not have permission to pause this campaign")
		return
	}

	// Pause campaign via service
	if err := h.service.Pause(ctx, id); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", id.String()).
			Msg("Failed to pause campaign")
		response.InternalError(w, "Failed to pause campaign", requestID)
		return
	}

	// Get updated campaign
	campaign, err := h.service.GetByID(ctx, id)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", id.String()).
			Msg("Failed to get paused campaign")
		response.InternalError(w, "Failed to retrieve paused campaign", requestID)
		return
	}

	response.Success(w, campaign)
}

// Resume handles POST /v1/campaigns/{id}/resume - resumes a paused campaign
func (h *CampaignHandler) Resume(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get authenticated user
	user, err := middleware.GetDomainUserFromContext(ctx)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Extract and validate ID
	idStr := chi.URLParam(r, "id")
	if idStr == "" {
		response.BadRequest(w, "Campaign ID is required")
		return
	}

	id, err := uuid.Parse(idStr)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", idStr).
			Msg("Invalid campaign ID")
		response.BadRequest(w, "Invalid campaign ID format")
		return
	}

	// Get existing campaign for ownership check
	existing, err := h.service.GetByID(ctx, id)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", id.String()).
			Msg("Failed to get existing campaign")
		response.NotFound(w, "Campaign not found")
		return
	}

	// Verify ownership (only creator or admin can perform action)
	if existing.CreatedBy != user.ID && user.Role != domain.RoleAdmin {
		log.Warn().
			Str("request_id", requestID).
			Str("user_id", user.ID.String()).
			Str("campaign_owner", existing.CreatedBy.String()).
			Msg("Unauthorized attempt to resume campaign")
		response.Forbidden(w, "You do not have permission to resume this campaign")
		return
	}

	// Resume campaign via service
	if err := h.service.Resume(ctx, id); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", id.String()).
			Msg("Failed to resume campaign")
		response.InternalError(w, "Failed to resume campaign", requestID)
		return
	}

	// Get updated campaign
	campaign, err := h.service.GetByID(ctx, id)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", id.String()).
			Msg("Failed to get resumed campaign")
		response.InternalError(w, "Failed to retrieve resumed campaign", requestID)
		return
	}

	response.Success(w, campaign)
}

// Stop handles POST /v1/campaigns/{id}/stop - stops a campaign permanently
func (h *CampaignHandler) Stop(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get authenticated user
	user, err := middleware.GetDomainUserFromContext(ctx)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Extract and validate ID
	idStr := chi.URLParam(r, "id")
	if idStr == "" {
		response.BadRequest(w, "Campaign ID is required")
		return
	}

	id, err := uuid.Parse(idStr)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", idStr).
			Msg("Invalid campaign ID")
		response.BadRequest(w, "Invalid campaign ID format")
		return
	}

	// Get existing campaign for ownership check
	existing, err := h.service.GetByID(ctx, id)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", id.String()).
			Msg("Failed to get existing campaign")
		response.NotFound(w, "Campaign not found")
		return
	}

	// Verify ownership (only creator or admin can perform action)
	if existing.CreatedBy != user.ID && user.Role != domain.RoleAdmin {
		log.Warn().
			Str("request_id", requestID).
			Str("user_id", user.ID.String()).
			Str("campaign_owner", existing.CreatedBy.String()).
			Msg("Unauthorized attempt to stop campaign")
		response.Forbidden(w, "You do not have permission to stop this campaign")
		return
	}

	// Stop campaign via service
	if err := h.service.Stop(ctx, id); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", id.String()).
			Msg("Failed to stop campaign")
		response.InternalError(w, "Failed to stop campaign", requestID)
		return
	}

	// Get updated campaign
	campaign, err := h.service.GetByID(ctx, id)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", id.String()).
			Msg("Failed to get stopped campaign")
		response.InternalError(w, "Failed to retrieve stopped campaign", requestID)
		return
	}

	response.Success(w, campaign)
}

// GetStats handles GET /v1/campaigns/{id}/stats - returns campaign statistics
func (h *CampaignHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get authenticated user
	user, err := middleware.GetDomainUserFromContext(ctx)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Extract and validate ID
	idStr := chi.URLParam(r, "id")
	if idStr == "" {
		response.BadRequest(w, "Campaign ID is required")
		return
	}

	id, err := uuid.Parse(idStr)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", idStr).
			Msg("Invalid campaign ID")
		response.BadRequest(w, "Invalid campaign ID format")
		return
	}

	// Get existing campaign for ownership check
	existing, err := h.service.GetByID(ctx, id)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", id.String()).
			Msg("Failed to get existing campaign")
		response.NotFound(w, "Campaign not found")
		return
	}

	// Verify ownership (only creator or admin can perform action)
	if existing.CreatedBy != user.ID && user.Role != domain.RoleAdmin {
		log.Warn().
			Str("request_id", requestID).
			Str("user_id", user.ID.String()).
			Str("campaign_owner", existing.CreatedBy.String()).
			Msg("Unauthorized access to campaign stats")
		response.Forbidden(w, "You do not have permission to access this campaign")
		return
	}

	// Get stats from service
	stats, err := h.service.GetStats(ctx, id)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", id.String()).
			Msg("Failed to get campaign stats")
		response.InternalError(w, "Failed to retrieve campaign statistics", requestID)
		return
	}

	response.Success(w, stats)
}

// GetRecommendations handles POST /v1/campaigns/recommendations - returns AI recommendations
func (h *CampaignHandler) GetRecommendations(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get authenticated user
	user, err := middleware.GetDomainUserFromContext(ctx)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Decode request body
	var req RecommendationsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to decode request body")
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Validate goal
	if req.Goal == "" {
		response.BadRequest(w, "Goal is required")
		return
	}

	goal := domain.CampaignGoal(req.Goal)
	if !goal.IsValid() {
		response.BadRequest(w, fmt.Sprintf("Invalid goal: %s", req.Goal))
		return
	}

	// Get recommendations from service
	recommendations, err := h.service.GetRecommendations(ctx, &req)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("user_id", user.ID.String()).
			Msg("Failed to get recommendations")
		response.InternalError(w, "Failed to retrieve recommendations", requestID)
		return
	}

	response.Success(w, recommendations)
}

// GetCompetitors handles GET /v1/campaigns/{id}/competitors - returns campaign competitors
func (h *CampaignHandler) GetCompetitors(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get authenticated user
	user, err := middleware.GetDomainUserFromContext(ctx)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Extract and validate ID
	idStr := chi.URLParam(r, "id")
	if idStr == "" {
		response.BadRequest(w, "Campaign ID is required")
		return
	}

	id, err := uuid.Parse(idStr)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", idStr).
			Msg("Invalid campaign ID")
		response.BadRequest(w, "Invalid campaign ID format")
		return
	}

	// Get existing campaign for ownership check
	existing, err := h.service.GetByID(ctx, id)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", id.String()).
			Msg("Failed to get existing campaign")
		response.NotFound(w, "Campaign not found")
		return
	}

	// Verify ownership (only creator or admin can perform action)
	if existing.CreatedBy != user.ID && user.Role != domain.RoleAdmin {
		log.Warn().
			Str("request_id", requestID).
			Str("user_id", user.ID.String()).
			Str("campaign_owner", existing.CreatedBy.String()).
			Msg("Unauthorized access to campaign competitors")
		response.Forbidden(w, "You do not have permission to access this campaign")
		return
	}

	// Get competitors from service
	competitors, err := h.service.GetCompetitors(ctx, id)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", id.String()).
			Msg("Failed to get campaign competitors")
		response.InternalError(w, "Failed to retrieve competitors", requestID)
		return
	}

	response.Success(w, competitors)
}

// AddCompetitor handles POST /v1/campaigns/{id}/competitors - adds a competitor
func (h *CampaignHandler) AddCompetitor(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get authenticated user
	user, err := middleware.GetDomainUserFromContext(ctx)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Extract and validate ID
	idStr := chi.URLParam(r, "id")
	if idStr == "" {
		response.BadRequest(w, "Campaign ID is required")
		return
	}

	campaignID, err := uuid.Parse(idStr)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", idStr).
			Msg("Invalid campaign ID")
		response.BadRequest(w, "Invalid campaign ID format")
		return
	}

	// Get existing campaign for ownership check
	existing, err := h.service.GetByID(ctx, campaignID)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", campaignID.String()).
			Msg("Failed to get existing campaign")
		response.NotFound(w, "Campaign not found")
		return
	}

	// Verify ownership (only creator or admin can perform action)
	if existing.CreatedBy != user.ID && user.Role != domain.RoleAdmin {
		log.Warn().
			Str("request_id", requestID).
			Str("user_id", user.ID.String()).
			Str("campaign_owner", existing.CreatedBy.String()).
			Msg("Unauthorized attempt to add competitor")
		response.Forbidden(w, "You do not have permission to modify this campaign")
		return
	}

	// Decode request body
	var req CompetitorDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to decode request body")
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Validate competitor name
	if req.Name == "" {
		response.BadRequest(w, "Competitor name is required")
		return
	}

	// Create competitor domain object
	competitor := &domain.Competitor{
		CampaignID: campaignID,
		Name:       req.Name,
		LinkedIn:   req.LinkedIn,
		Twitter:    req.Twitter,
		Blog:       req.Blog,
		Website:    req.Website,
	}

	// Add competitor via service
	if err := h.service.AddCompetitor(ctx, competitor); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("campaign_id", campaignID.String()).
			Msg("Failed to add competitor")
		response.InternalError(w, "Failed to add competitor", requestID)
		return
	}

	response.Created(w, competitor)
}

// RemoveCompetitor handles DELETE /v1/campaigns/{id}/competitors/{competitorId} - removes a competitor
func (h *CampaignHandler) RemoveCompetitor(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get authenticated user
	user, err := middleware.GetDomainUserFromContext(ctx)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Extract and validate campaign ID
	campaignIDStr := chi.URLParam(r, "id")
	if campaignIDStr == "" {
		response.BadRequest(w, "Campaign ID is required")
		return
	}

	campaignID, err := uuid.Parse(campaignIDStr)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", campaignIDStr).
			Msg("Invalid campaign ID")
		response.BadRequest(w, "Invalid campaign ID format")
		return
	}

	// Extract and validate competitor ID
	competitorIDStr := chi.URLParam(r, "competitorId")
	if competitorIDStr == "" {
		response.BadRequest(w, "Competitor ID is required")
		return
	}

	competitorID, err := uuid.Parse(competitorIDStr)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", competitorIDStr).
			Msg("Invalid competitor ID")
		response.BadRequest(w, "Invalid competitor ID format")
		return
	}

	// Get existing campaign for ownership check
	existing, err := h.service.GetByID(ctx, campaignID)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", campaignID.String()).
			Msg("Failed to get existing campaign")
		response.NotFound(w, "Campaign not found")
		return
	}

	// Verify ownership (only creator or admin can perform action)
	if existing.CreatedBy != user.ID && user.Role != domain.RoleAdmin {
		log.Warn().
			Str("request_id", requestID).
			Str("user_id", user.ID.String()).
			Str("campaign_owner", existing.CreatedBy.String()).
			Msg("Unauthorized attempt to remove competitor")
		response.Forbidden(w, "You do not have permission to modify this campaign")
		return
	}

	// Remove competitor via service
	if err := h.service.RemoveCompetitor(ctx, campaignID, competitorID); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("campaign_id", campaignID.String()).
			Str("competitor_id", competitorID.String()).
			Msg("Failed to remove competitor")
		response.InternalError(w, "Failed to remove competitor", requestID)
		return
	}

	response.NoContent(w)
}
