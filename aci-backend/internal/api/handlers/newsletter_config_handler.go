package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/phillipboles/aci-backend/internal/api/dto"
	"github.com/phillipboles/aci-backend/internal/api/middleware"
	"github.com/phillipboles/aci-backend/internal/api/response"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/service"
)

// NewsletterConfigHandler handles newsletter configuration HTTP requests
type NewsletterConfigHandler struct {
	configService *service.NewsletterConfigService
}

// NewNewsletterConfigHandler creates a new newsletter configuration handler
func NewNewsletterConfigHandler(configService *service.NewsletterConfigService) *NewsletterConfigHandler {
	if configService == nil {
		panic("configService cannot be nil")
	}

	return &NewsletterConfigHandler{
		configService: configService,
	}
}

// List handles GET /v1/newsletter-configs - returns paginated newsletter configurations
func (h *NewsletterConfigHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Parse pagination parameters
	page, err := parseIntQuery(r, "page", 1)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Invalid page parameter")
		response.BadRequest(w, "Invalid page parameter")
		return
	}

	pageSize, err := parseIntQuery(r, "page_size", 20)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Invalid page_size parameter")
		response.BadRequest(w, "Invalid page_size parameter")
		return
	}

	// Build filter
	filter := &domain.NewsletterConfigFilter{
		Limit: pageSize,
		Page:  page,
	}

	// Parse optional filters
	if isActive := r.URL.Query().Get("is_active"); isActive != "" {
		active, err := strconv.ParseBool(isActive)
		if err != nil {
			log.Error().
				Err(err).
				Str("request_id", requestID).
				Msg("Invalid is_active parameter")
			response.BadRequest(w, "Invalid is_active parameter")
			return
		}
		filter.IsActive = &active
	}

	if cadence := r.URL.Query().Get("cadence"); cadence != "" {
		cadenceType := domain.CadenceType(cadence)
		if !cadenceType.IsValid() {
			response.BadRequest(w, fmt.Sprintf("Invalid cadence: %s", cadence))
			return
		}
		filter.Cadence = &cadenceType
	}

	if riskLevel := r.URL.Query().Get("risk_level"); riskLevel != "" {
		riskLevelType := domain.RiskLevel(riskLevel)
		if !riskLevelType.IsValid() {
			response.BadRequest(w, fmt.Sprintf("Invalid risk_level: %s", riskLevel))
			return
		}
		filter.RiskLevel = &riskLevelType
	}

	if segmentID := r.URL.Query().Get("segment_id"); segmentID != "" {
		segID, err := uuid.Parse(segmentID)
		if err != nil {
			response.BadRequest(w, "Invalid segment_id parameter")
			return
		}
		filter.SegmentID = &segID
	}

	// Validate filter
	if err := filter.Validate(); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Filter validation failed")
		response.BadRequestWithDetails(w, "Invalid filter parameters", err.Error(), requestID)
		return
	}

	// Get configurations from service
	configs, total, err := h.configService.List(ctx, filter)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to list newsletter configurations")
		response.InternalError(w, "Failed to retrieve newsletter configurations", requestID)
		return
	}

	// Convert to response DTOs
	configResponses := dto.NewsletterConfigsToResponse(configs)

	// Calculate pagination metadata
	totalPages := (total + pageSize - 1) / pageSize
	meta := &response.Meta{
		Page:       page,
		PageSize:   pageSize,
		TotalCount: total,
		TotalPages: totalPages,
	}

	// Return response
	listResponse := dto.NewsletterConfigListResponse{
		Data: configResponses,
		Pagination: dto.PaginationDTO{
			Page:       page,
			PageSize:   pageSize,
			TotalItems: total,
			TotalPages: totalPages,
		},
	}

	response.SuccessWithMeta(w, listResponse.Data, meta)
}

// GetByID handles GET /v1/newsletter-configs/{id} - returns a single configuration
func (h *NewsletterConfigHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Extract and validate ID
	idStr := chi.URLParam(r, "id")
	if idStr == "" {
		response.BadRequest(w, "Configuration ID is required")
		return
	}

	id, err := uuid.Parse(idStr)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", idStr).
			Msg("Invalid configuration ID")
		response.BadRequest(w, "Invalid configuration ID format")
		return
	}

	// Get configuration from service
	config, err := h.configService.GetByID(ctx, id)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", id.String()).
			Msg("Failed to get newsletter configuration")
		response.NotFound(w, "Newsletter configuration not found")
		return
	}

	// Convert to response DTO
	configResponse := dto.NewsletterConfigToResponse(config)

	response.Success(w, configResponse)
}

// Create handles POST /v1/newsletter-configs - creates a new configuration
func (h *NewsletterConfigHandler) Create(w http.ResponseWriter, r *http.Request) {
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
	var req dto.CreateNewsletterConfigRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to decode request body")
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Convert request to domain model
	config := &domain.NewsletterConfiguration{
		Name:                 req.Name,
		Description:          req.Description,
		Cadence:              domain.CadenceType(req.Cadence),
		SendDayOfWeek:        req.SendDayOfWeek,
		Timezone:             req.Timezone,
		MaxBlocks:            req.MaxBlocks,
		EducationRatioMin:    req.EducationRatioMin,
		ContentFreshnessDays: req.ContentFreshnessDays,
		HeroTopicPriority:    req.HeroTopicPriority,
		FrameworkFocus:       req.FrameworkFocus,
		SubjectLineStyle:     domain.SubjectLineStyle(req.SubjectLineStyle),
		MaxMetaphors:         req.MaxMetaphors,
		BannedPhrases:        req.BannedPhrases,
		ApprovalTier:         domain.ApprovalTier(req.ApprovalTier),
		RiskLevel:            domain.RiskLevel(req.RiskLevel),
		AIProvider:           req.AIProvider,
		AIModel:              req.AIModel,
		PromptVersion:        req.PromptVersion,
		IsActive:             false, // New configs start inactive
		CreatedBy:            user.ID,
	}

	// Parse optional segment ID
	if req.SegmentID != nil {
		segmentID, err := uuid.Parse(*req.SegmentID)
		if err != nil {
			response.BadRequest(w, "Invalid segment_id format")
			return
		}
		config.SegmentID = &segmentID
	}

	// Parse optional send time UTC
	if req.SendTimeUTC != nil {
		sendTime, err := time.Parse(time.RFC3339, *req.SendTimeUTC)
		if err != nil {
			response.BadRequest(w, "Invalid send_time_utc format (expected RFC3339)")
			return
		}
		config.SendTimeUTC = &sendTime
	}

	// Create configuration via service
	if err := h.configService.Create(ctx, config); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("name", config.Name).
			Msg("Failed to create newsletter configuration")
		response.InternalError(w, "Failed to create newsletter configuration", requestID)
		return
	}

	// Convert to response DTO
	configResponse := dto.NewsletterConfigToResponse(config)

	response.Created(w, configResponse)
}

// Update handles PUT /v1/newsletter-configs/{id} - updates an existing configuration
func (h *NewsletterConfigHandler) Update(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// SEC-CRIT-003: Get authenticated user for authorization check
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
		response.BadRequest(w, "Configuration ID is required")
		return
	}

	id, err := uuid.Parse(idStr)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", idStr).
			Msg("Invalid configuration ID")
		response.BadRequest(w, "Invalid configuration ID format")
		return
	}

	// Get existing configuration
	existing, err := h.configService.GetByID(ctx, id)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", id.String()).
			Msg("Failed to get existing configuration")
		response.NotFound(w, "Newsletter configuration not found")
		return
	}

	// SEC-CRIT-003: Authorization check - user must be creator or admin
	if existing.CreatedBy != user.ID && user.Role != "admin" {
		log.Warn().
			Str("request_id", requestID).
			Str("user_id", user.ID.String()).
			Str("config_id", id.String()).
			Str("config_owner", existing.CreatedBy.String()).
			Msg("Unauthorized attempt to update newsletter configuration")
		response.Forbidden(w, "You do not have permission to update this configuration")
		return
	}

	// Decode request body
	var req dto.UpdateNewsletterConfigRequest
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
		existing.Name = *req.Name
	}
	if req.Description != nil {
		existing.Description = req.Description
	}
	if req.SegmentID != nil {
		segmentID, err := uuid.Parse(*req.SegmentID)
		if err != nil {
			response.BadRequest(w, "Invalid segment_id format")
			return
		}
		existing.SegmentID = &segmentID
	}
	if req.Cadence != nil {
		existing.Cadence = domain.CadenceType(*req.Cadence)
	}
	if req.SendDayOfWeek != nil {
		existing.SendDayOfWeek = req.SendDayOfWeek
	}
	if req.SendTimeUTC != nil {
		sendTime, err := time.Parse(time.RFC3339, *req.SendTimeUTC)
		if err != nil {
			response.BadRequest(w, "Invalid send_time_utc format (expected RFC3339)")
			return
		}
		existing.SendTimeUTC = &sendTime
	}
	if req.Timezone != nil {
		existing.Timezone = *req.Timezone
	}
	if req.MaxBlocks != nil {
		existing.MaxBlocks = *req.MaxBlocks
	}
	if req.EducationRatioMin != nil {
		existing.EducationRatioMin = *req.EducationRatioMin
	}
	if req.ContentFreshnessDays != nil {
		existing.ContentFreshnessDays = *req.ContentFreshnessDays
	}
	if req.HeroTopicPriority != nil {
		existing.HeroTopicPriority = req.HeroTopicPriority
	}
	if req.FrameworkFocus != nil {
		existing.FrameworkFocus = req.FrameworkFocus
	}
	if req.SubjectLineStyle != nil {
		existing.SubjectLineStyle = domain.SubjectLineStyle(*req.SubjectLineStyle)
	}
	if req.MaxMetaphors != nil {
		existing.MaxMetaphors = *req.MaxMetaphors
	}
	if req.BannedPhrases != nil {
		existing.BannedPhrases = req.BannedPhrases
	}
	if req.ApprovalTier != nil {
		existing.ApprovalTier = domain.ApprovalTier(*req.ApprovalTier)
	}
	if req.RiskLevel != nil {
		existing.RiskLevel = domain.RiskLevel(*req.RiskLevel)
	}
	if req.AIProvider != nil {
		existing.AIProvider = *req.AIProvider
	}
	if req.AIModel != nil {
		existing.AIModel = *req.AIModel
	}
	if req.PromptVersion != nil {
		existing.PromptVersion = *req.PromptVersion
	}

	// Update configuration via service
	if err := h.configService.Update(ctx, existing); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", id.String()).
			Msg("Failed to update newsletter configuration")
		response.InternalError(w, "Failed to update newsletter configuration", requestID)
		return
	}

	// Convert to response DTO
	configResponse := dto.NewsletterConfigToResponse(existing)

	response.Success(w, configResponse)
}

// Delete handles DELETE /v1/newsletter-configs/{id} - deletes a configuration
func (h *NewsletterConfigHandler) Delete(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// SEC-CRIT-003: Get authenticated user for authorization check
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
		response.BadRequest(w, "Configuration ID is required")
		return
	}

	id, err := uuid.Parse(idStr)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", idStr).
			Msg("Invalid configuration ID")
		response.BadRequest(w, "Invalid configuration ID format")
		return
	}

	// SEC-CRIT-003: Get existing config and check ownership
	existing, err := h.configService.GetByID(ctx, id)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", id.String()).
			Msg("Failed to get existing configuration")
		response.NotFound(w, "Newsletter configuration not found")
		return
	}

	// SEC-CRIT-003: Authorization check - user must be creator or admin
	if existing.CreatedBy != user.ID && user.Role != "admin" {
		log.Warn().
			Str("request_id", requestID).
			Str("user_id", user.ID.String()).
			Str("config_id", id.String()).
			Str("config_owner", existing.CreatedBy.String()).
			Msg("Unauthorized attempt to delete newsletter configuration")
		response.Forbidden(w, "You do not have permission to delete this configuration")
		return
	}

	// Delete configuration via service
	if err := h.configService.Delete(ctx, id); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", id.String()).
			Msg("Failed to delete newsletter configuration")
		response.InternalError(w, "Failed to delete newsletter configuration", requestID)
		return
	}

	response.NoContent(w)
}

// Clone handles POST /v1/newsletter-configs/{id}/clone - clones a configuration
func (h *NewsletterConfigHandler) Clone(w http.ResponseWriter, r *http.Request) {
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

	// Extract and validate source ID
	idStr := chi.URLParam(r, "id")
	if idStr == "" {
		response.BadRequest(w, "Source configuration ID is required")
		return
	}

	sourceID, err := uuid.Parse(idStr)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", idStr).
			Msg("Invalid source configuration ID")
		response.BadRequest(w, "Invalid source configuration ID format")
		return
	}

	// Decode request body
	var req dto.CloneNewsletterConfigRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to decode request body")
		response.BadRequest(w, "Invalid request body")
		return
	}

	if req.Name == "" {
		response.BadRequest(w, "Name is required for cloned configuration")
		return
	}

	// Clone configuration via service
	cloned, err := h.configService.Clone(ctx, sourceID, req.Name, user.ID)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("source_id", sourceID.String()).
			Msg("Failed to clone newsletter configuration")
		response.InternalError(w, "Failed to clone newsletter configuration", requestID)
		return
	}

	// Convert to response DTO
	configResponse := dto.NewsletterConfigToResponse(cloned)

	response.Created(w, configResponse)
}

// Activate handles POST /v1/newsletter-configs/{id}/activate - activates a configuration
func (h *NewsletterConfigHandler) Activate(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// SEC-CRIT-003: Get authenticated user for authorization check
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
		response.BadRequest(w, "Configuration ID is required")
		return
	}

	id, err := uuid.Parse(idStr)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", idStr).
			Msg("Invalid configuration ID")
		response.BadRequest(w, "Invalid configuration ID format")
		return
	}

	// SEC-CRIT-003: Get existing config and check ownership
	existing, err := h.configService.GetByID(ctx, id)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", id.String()).
			Msg("Failed to get existing configuration")
		response.NotFound(w, "Newsletter configuration not found")
		return
	}

	// SEC-CRIT-003: Authorization check - user must be creator or admin
	if existing.CreatedBy != user.ID && user.Role != "admin" {
		log.Warn().
			Str("request_id", requestID).
			Str("user_id", user.ID.String()).
			Str("config_id", id.String()).
			Str("config_owner", existing.CreatedBy.String()).
			Msg("Unauthorized attempt to activate newsletter configuration")
		response.Forbidden(w, "You do not have permission to activate this configuration")
		return
	}

	// Activate configuration via service
	if err := h.configService.Activate(ctx, id); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", id.String()).
			Msg("Failed to activate newsletter configuration")
		response.InternalError(w, "Failed to activate newsletter configuration", requestID)
		return
	}

	// Get updated configuration
	config, err := h.configService.GetByID(ctx, id)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", id.String()).
			Msg("Failed to get activated configuration")
		response.InternalError(w, "Failed to retrieve activated configuration", requestID)
		return
	}

	// Convert to response DTO
	configResponse := dto.NewsletterConfigToResponse(config)

	response.Success(w, configResponse)
}

// Deactivate handles POST /v1/newsletter-configs/{id}/deactivate - deactivates a configuration
func (h *NewsletterConfigHandler) Deactivate(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// SEC-CRIT-003: Get authenticated user for authorization check
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
		response.BadRequest(w, "Configuration ID is required")
		return
	}

	id, err := uuid.Parse(idStr)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", idStr).
			Msg("Invalid configuration ID")
		response.BadRequest(w, "Invalid configuration ID format")
		return
	}

	// SEC-CRIT-003: Get existing config and check ownership
	existing, err := h.configService.GetByID(ctx, id)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", id.String()).
			Msg("Failed to get existing configuration")
		response.NotFound(w, "Newsletter configuration not found")
		return
	}

	// SEC-CRIT-003: Authorization check - user must be creator or admin
	if existing.CreatedBy != user.ID && user.Role != "admin" {
		log.Warn().
			Str("request_id", requestID).
			Str("user_id", user.ID.String()).
			Str("config_id", id.String()).
			Str("config_owner", existing.CreatedBy.String()).
			Msg("Unauthorized attempt to deactivate newsletter configuration")
		response.Forbidden(w, "You do not have permission to deactivate this configuration")
		return
	}

	// Deactivate configuration via service
	if err := h.configService.Deactivate(ctx, id); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", id.String()).
			Msg("Failed to deactivate newsletter configuration")
		response.InternalError(w, "Failed to deactivate newsletter configuration", requestID)
		return
	}

	// Get updated configuration
	config, err := h.configService.GetByID(ctx, id)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", id.String()).
			Msg("Failed to get deactivated configuration")
		response.InternalError(w, "Failed to retrieve deactivated configuration", requestID)
		return
	}

	// Convert to response DTO
	configResponse := dto.NewsletterConfigToResponse(config)

	response.Success(w, configResponse)
}
