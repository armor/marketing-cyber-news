package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/phillipboles/aci-backend/internal/api/response"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/service"
)

// ContentStudioHandler handles content studio HTTP requests
type ContentStudioHandler struct {
	studioService *service.ContentStudioService
}

// NewContentStudioHandler creates a new content studio handler
func NewContentStudioHandler(studioService *service.ContentStudioService) *ContentStudioHandler {
	if studioService == nil {
		panic("studioService cannot be nil")
	}

	return &ContentStudioHandler{
		studioService: studioService,
	}
}

// ============================================================================
// Request/Response DTOs
// ============================================================================

// GenerateContentRequestDTO for POST /api/v1/content/generate
type GenerateContentRequestDTO struct {
	CampaignID  *string `json:"campaign_id,omitempty"`
	Channel     string  `json:"channel"`
	ContentType string  `json:"content_type"` // post, article, thread
	Prompt      string  `json:"prompt"`
	Tone        string  `json:"tone,omitempty"`
	Length      string  `json:"length,omitempty"` // short, medium, long
	Audience    string  `json:"audience,omitempty"`
	IncludesCTA bool    `json:"includes_cta,omitempty"`
}

// RefineContentRequestDTO for POST /api/v1/content/:id/refine
type RefineContentRequestDTO struct {
	Action string `json:"action"` // shorter, longer, formal, casual, add_cta, remove_cta
}

// ScheduleContentRequestDTO for POST /api/v1/content/:id/schedule
type ScheduleContentRequestDTO struct {
	Channel     string `json:"channel"`
	ScheduledAt string `json:"scheduled_at"` // ISO 8601 format
}

// GeneratedContentResponse for content generation responses
type GeneratedContentResponse struct {
	ID              string                  `json:"id"`
	Content         string                  `json:"content"`
	Channel         string                  `json:"channel"`
	ContentType     string                  `json:"content_type"`
	BrandScore      int                     `json:"brand_score"`
	BrandValidation *domain.BrandValidation `json:"brand_validation,omitempty"`
	CharacterCount  int                     `json:"character_count"`
	CreatedAt       string                  `json:"created_at"`
}

// PublishResultResponse for publish responses
type PublishResultResponse struct {
	PublishedURL string `json:"published_url"`
	PublishedID  string `json:"published_id"`
	PublishedAt  string `json:"published_at"`
}

// CalendarEntryResponse for schedule responses
type CalendarEntryResponse struct {
	ID          string `json:"id"`
	TenantID    string `json:"tenant_id"`
	ContentID   string `json:"content_id"`
	Channel     string `json:"channel"`
	ScheduledAt string `json:"scheduled_at"`
	Status      string `json:"status"`
	CreatedAt   string `json:"created_at"`
}

// ============================================================================
// Handlers
// ============================================================================

// GenerateContent handles POST /api/v1/content/generate
func (h *ContentStudioHandler) GenerateContent(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get tenant ID from context (set by auth middleware)
	tenantID, err := getTenantID(ctx)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to get tenant ID")
		response.Unauthorized(w, "Invalid authentication")
		return
	}

	// Parse request body
	var dto GenerateContentRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Validate required fields
	if dto.Prompt == "" {
		response.BadRequest(w, "prompt is required")
		return
	}

	if dto.Channel == "" {
		response.BadRequest(w, "channel is required")
		return
	}

	if dto.ContentType == "" {
		response.BadRequest(w, "content_type is required")
		return
	}

	// Parse channel
	channel := domain.Channel(dto.Channel)
	if !channel.IsValid() {
		response.BadRequest(w, "invalid channel")
		return
	}

	// Parse campaign ID if provided
	var campaignID *uuid.UUID
	if dto.CampaignID != nil && *dto.CampaignID != "" {
		id, err := uuid.Parse(*dto.CampaignID)
		if err != nil {
			response.BadRequest(w, "invalid campaign_id format")
			return
		}
		campaignID = &id
	}

	// Build service request
	req := service.GenerateContentRequest{
		TenantID:    tenantID,
		CampaignID:  campaignID,
		Channel:     channel,
		ContentType: dto.ContentType,
		Prompt:      dto.Prompt,
		Tone:        dto.Tone,
		Length:      dto.Length,
		Audience:    dto.Audience,
		IncludesCTA: dto.IncludesCTA,
	}

	// Generate content
	generated, err := h.studioService.Generate(ctx, req)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to generate content")
		response.InternalError(w, "Failed to generate content", requestID)
		return
	}

	// Build response
	resp := GeneratedContentResponse{
		ID:              generated.ID.String(),
		Content:         generated.Content,
		Channel:         string(generated.Channel),
		ContentType:     generated.ContentType,
		BrandScore:      generated.BrandScore,
		BrandValidation: generated.BrandValidation,
		CharacterCount:  generated.CharacterCount,
		CreatedAt:       generated.CreatedAt.Format(time.RFC3339),
	}

	response.Created(w, resp)
}

// RefineContent handles POST /api/v1/content/:id/refine
func (h *ContentStudioHandler) RefineContent(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Parse content ID from URL
	contentIDStr := chi.URLParam(r, "id")
	contentID, err := uuid.Parse(contentIDStr)
	if err != nil {
		response.BadRequest(w, "invalid content ID format")
		return
	}

	// Parse request body
	var dto RefineContentRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Validate action
	if dto.Action == "" {
		response.BadRequest(w, "action is required")
		return
	}

	validActions := map[string]bool{
		"shorter":    true,
		"longer":     true,
		"formal":     true,
		"casual":     true,
		"add_cta":    true,
		"remove_cta": true,
	}

	if !validActions[dto.Action] {
		response.BadRequest(w, "invalid action")
		return
	}

	// Refine content
	req := service.RefineRequest{
		ContentID: contentID,
		Action:    dto.Action,
	}

	refined, err := h.studioService.Refine(ctx, req)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to refine content")
		response.InternalError(w, "Failed to refine content", requestID)
		return
	}

	// Build response
	resp := GeneratedContentResponse{
		ID:             refined.ID.String(),
		Content:        refined.Content,
		Channel:        string(refined.Channel),
		ContentType:    refined.ContentType,
		CharacterCount: refined.CharacterCount,
		CreatedAt:      refined.CreatedAt.Format(time.RFC3339),
	}

	response.Success(w, resp)
}

// ValidateContent handles POST /api/v1/content/:id/validate
func (h *ContentStudioHandler) ValidateContent(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Parse content ID from URL
	contentIDStr := chi.URLParam(r, "id")
	contentID, err := uuid.Parse(contentIDStr)
	if err != nil {
		response.BadRequest(w, "invalid content ID format")
		return
	}

	// Validate content
	validation, err := h.studioService.Validate(ctx, contentID)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to validate content")
		response.InternalError(w, "Failed to validate content", requestID)
		return
	}

	response.Success(w, validation)
}

// ScheduleContent handles POST /api/v1/content/:id/schedule
func (h *ContentStudioHandler) ScheduleContent(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get tenant ID from context
	tenantID, err := getTenantID(ctx)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to get tenant ID")
		response.Unauthorized(w, "Invalid authentication")
		return
	}

	// Parse content ID from URL
	contentIDStr := chi.URLParam(r, "id")
	contentID, err := uuid.Parse(contentIDStr)
	if err != nil {
		response.BadRequest(w, "invalid content ID format")
		return
	}

	// Parse request body
	var dto ScheduleContentRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Validate required fields
	if dto.Channel == "" {
		response.BadRequest(w, "channel is required")
		return
	}

	if dto.ScheduledAt == "" {
		response.BadRequest(w, "scheduled_at is required")
		return
	}

	// Parse channel
	channel := domain.Channel(dto.Channel)
	if !channel.IsValid() {
		response.BadRequest(w, "invalid channel")
		return
	}

	// Parse scheduled time
	scheduledAt, err := time.Parse(time.RFC3339, dto.ScheduledAt)
	if err != nil {
		response.BadRequest(w, "invalid scheduled_at format (use ISO 8601)")
		return
	}

	// Schedule content
	req := service.ScheduleRequest{
		TenantID:    tenantID,
		ContentID:   contentID,
		Channel:     channel,
		ScheduledAt: scheduledAt,
	}

	entry, err := h.studioService.Schedule(ctx, req)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to schedule content")
		response.InternalError(w, "Failed to schedule content", requestID)
		return
	}

	// Build response
	resp := CalendarEntryResponse{
		ID:          entry.ID.String(),
		TenantID:    entry.TenantID.String(),
		ContentID:   entry.ContentID.String(),
		Channel:     string(entry.Channel),
		ScheduledAt: entry.ScheduledAt.Format(time.RFC3339),
		Status:      string(entry.Status),
		CreatedAt:   entry.CreatedAt.Format(time.RFC3339),
	}

	response.Created(w, resp)
}

// PublishContent handles POST /api/v1/content/:id/publish
func (h *ContentStudioHandler) PublishContent(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Parse content ID from URL
	contentIDStr := chi.URLParam(r, "id")
	contentID, err := uuid.Parse(contentIDStr)
	if err != nil {
		response.BadRequest(w, "invalid content ID format")
		return
	}

	// Publish content
	result, err := h.studioService.Publish(ctx, contentID)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to publish content")
		response.InternalError(w, "Failed to publish content", requestID)
		return
	}

	// Build response
	resp := PublishResultResponse{
		PublishedURL: result.PublishedURL,
		PublishedID:  result.PublishedID,
		PublishedAt:  result.PublishedAt.Format(time.RFC3339),
	}

	response.Success(w, resp)
}

// GetContent handles GET /api/v1/content/:id
func (h *ContentStudioHandler) GetContent(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Parse content ID from URL
	contentIDStr := chi.URLParam(r, "id")
	contentID, err := uuid.Parse(contentIDStr)
	if err != nil {
		response.BadRequest(w, "invalid content ID format")
		return
	}

	// Get content
	content, err := h.studioService.GetContent(ctx, contentID)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to get content")
		response.InternalError(w, "Failed to get content", requestID)
		return
	}

	// Build response
	resp := GeneratedContentResponse{
		ID:             content.ID.String(),
		Content:        content.Content,
		Channel:        string(content.Channel),
		ContentType:    content.ContentType,
		CharacterCount: content.CharacterCount,
		CreatedAt:      content.CreatedAt.Format(time.RFC3339),
	}

	response.Success(w, resp)
}

// ============================================================================
// Helper functions
// ============================================================================
