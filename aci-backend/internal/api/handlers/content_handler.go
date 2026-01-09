package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/phillipboles/aci-backend/internal/api/response"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/service"
)

// ContentHandler handles content-related HTTP requests
type ContentHandler struct {
	contentService *service.ContentService
}

// NewContentHandler creates a new content handler
func NewContentHandler(contentService *service.ContentService) *ContentHandler {
	if contentService == nil {
		panic("contentService cannot be nil")
	}

	return &ContentHandler{
		contentService: contentService,
	}
}

// ============================================================================
// Content Sources
// ============================================================================

// ListContentSources handles GET /v1/content-sources
func (h *ContentHandler) ListContentSources(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Parse pagination
	page, err := parseIntQuery(r, "page", 1)
	if err != nil {
		response.BadRequest(w, "Invalid page parameter")
		return
	}

	pageSize, err := parseIntQuery(r, "page_size", 20)
	if err != nil {
		response.BadRequest(w, "Invalid page_size parameter")
		return
	}

	// Build filter
	filter := &domain.ContentSourceFilter{
		Limit:  pageSize,
		Offset: (page - 1) * pageSize,
	}

	// Parse optional filters
	if sourceType := r.URL.Query().Get("source_type"); sourceType != "" {
		st := domain.SourceType(sourceType)
		if err := st.IsValid(); err != nil {
			response.BadRequest(w, "Invalid source_type parameter")
			return
		}
		filter.SourceType = &st
	}

	if isActive := r.URL.Query().Get("is_active"); isActive != "" {
		active, err := strconv.ParseBool(isActive)
		if err != nil {
			response.BadRequest(w, "Invalid is_active parameter")
			return
		}
		filter.IsActive = &active
	}

	if isInternal := r.URL.Query().Get("is_internal"); isInternal != "" {
		internal, err := strconv.ParseBool(isInternal)
		if err != nil {
			response.BadRequest(w, "Invalid is_internal parameter")
			return
		}
		filter.IsInternal = &internal
	}

	sources, total, err := h.contentService.ListContentSources(ctx, filter)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to list content sources")
		response.InternalError(w, "Failed to retrieve content sources", requestID)
		return
	}

	totalPages := (total + pageSize - 1) / pageSize

	resp := map[string]interface{}{
		"data": sources,
		"pagination": map[string]interface{}{
			"page":        page,
			"page_size":   pageSize,
			"total_items": total,
			"total_pages": totalPages,
		},
	}

	response.JSON(w, http.StatusOK, resp)
}

// GetContentSource handles GET /v1/content-sources/{id}
func (h *ContentHandler) GetContentSource(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.BadRequest(w, "Invalid content source ID")
		return
	}

	source, err := h.contentService.GetContentSourceByID(ctx, id)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Str("id", id.String()).Msg("Failed to get content source")
		response.NotFound(w, "Content source not found")
		return
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{"data": source})
}

// CreateContentSource handles POST /v1/content-sources
func (h *ContentHandler) CreateContentSource(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	var req CreateContentSourceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Get user from context
	userID := getUserIDFromContext(ctx)
	if userID == uuid.Nil {
		response.Unauthorized(w, "User not authenticated")
		return
	}

	// Validate feed URL format if provided
	if req.FeedURL != nil && *req.FeedURL != "" {
		if !isValidURL(*req.FeedURL) {
			response.BadRequest(w, "Invalid feed URL format")
			return
		}
	}

	// Validate polling interval (min 60 minutes = 1 hour, max 1440 minutes = 24 hours)
	if req.PollIntervalMinutes < 60 || req.PollIntervalMinutes > 1440 {
		response.BadRequest(w, "Polling interval must be between 60 (1 hour) and 1440 (24 hours) minutes")
		return
	}

	// Set default trust score if not provided
	trustScore := req.TrustScore
	if trustScore == 0 {
		trustScore = 0.7 // Default trust score
	}

	source := &domain.ContentSource{
		Name:                 req.Name,
		Description:          req.Description,
		SourceType:           domain.SourceType(req.SourceType),
		FeedURL:              req.FeedURL,
		APIConfig:            req.APIConfig,
		DefaultContentType:   req.DefaultContentType,
		DefaultTopicTags:     req.DefaultTopicTags,
		DefaultFrameworkTags: req.DefaultFrameworkTags,
		TrustScore:           trustScore,
		MinTrustThreshold:    req.MinTrustThreshold,
		FreshnessDays:        req.FreshnessDays,
		PollIntervalMinutes:  req.PollIntervalMinutes,
		IsInternal:           req.IsInternal,
		CreatedBy:            userID,
		IsActive:             true, // Set is_active = true by default
	}

	if err := h.contentService.CreateContentSource(ctx, source); err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to create content source")
		response.BadRequestWithDetails(w, "Failed to create content source", err.Error(), requestID)
		return
	}

	response.JSON(w, http.StatusCreated, map[string]interface{}{"data": source})
}

// UpdateContentSource handles PUT /v1/content-sources/{id}
func (h *ContentHandler) UpdateContentSource(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.BadRequest(w, "Invalid content source ID")
		return
	}

	var req UpdateContentSourceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Get existing source
	existing, err := h.contentService.GetContentSourceByID(ctx, id)
	if err != nil {
		response.NotFound(w, "Content source not found")
		return
	}

	// Validate field updates
	if req.FeedURL != nil && *req.FeedURL != "" {
		if !isValidURL(*req.FeedURL) {
			response.BadRequest(w, "Invalid feed URL format")
			return
		}
	}

	if req.PollIntervalMinutes != nil {
		if *req.PollIntervalMinutes < 60 || *req.PollIntervalMinutes > 1440 {
			response.BadRequest(w, "Polling interval must be between 60 (1 hour) and 1440 (24 hours) minutes")
			return
		}
	}

	// Update fields (allow updating: name, feed_url, polling_interval, default_tags, trust_score, is_active)
	if req.Name != nil {
		existing.Name = *req.Name
	}
	if req.Description != nil {
		existing.Description = req.Description
	}
	if req.FeedURL != nil {
		existing.FeedURL = req.FeedURL
	}
	if req.APIConfig != nil {
		existing.APIConfig = req.APIConfig
	}
	if req.DefaultTopicTags != nil {
		existing.DefaultTopicTags = req.DefaultTopicTags
	}
	if req.DefaultFrameworkTags != nil {
		existing.DefaultFrameworkTags = req.DefaultFrameworkTags
	}
	if req.TrustScore != nil {
		existing.TrustScore = *req.TrustScore
	}
	if req.MinTrustThreshold != nil {
		existing.MinTrustThreshold = *req.MinTrustThreshold
	}
	if req.FreshnessDays != nil {
		existing.FreshnessDays = *req.FreshnessDays
	}
	if req.PollIntervalMinutes != nil {
		existing.PollIntervalMinutes = *req.PollIntervalMinutes
	}
	if req.IsActive != nil {
		existing.IsActive = *req.IsActive
	}
	if req.IsInternal != nil {
		existing.IsInternal = *req.IsInternal
	}

	if err := h.contentService.UpdateContentSource(ctx, existing); err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to update content source")
		response.BadRequestWithDetails(w, "Failed to update content source", err.Error(), requestID)
		return
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{"data": existing})
}

// DeleteContentSource handles DELETE /v1/content-sources/{id}
func (h *ContentHandler) DeleteContentSource(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.BadRequest(w, "Invalid content source ID")
		return
	}

	if err := h.contentService.DeleteContentSource(ctx, id); err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to delete content source")
		response.InternalError(w, "Failed to delete content source", requestID)
		return
	}

	response.NoContent(w)
}

// ============================================================================
// Content Items
// ============================================================================

// ListContentItems handles GET /v1/content-items
func (h *ContentHandler) ListContentItems(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Parse pagination
	page, err := parseIntQuery(r, "page", 1)
	if err != nil {
		response.BadRequest(w, "Invalid page parameter")
		return
	}

	pageSize, err := parseIntQuery(r, "page_size", 20)
	if err != nil {
		response.BadRequest(w, "Invalid page_size parameter")
		return
	}

	// Build filter
	filter := &domain.ContentItemFilter{
		Limit:  pageSize,
		Offset: (page - 1) * pageSize,
	}

	// Parse optional filters
	if sourceID := r.URL.Query().Get("source_id"); sourceID != "" {
		sid, err := uuid.Parse(sourceID)
		if err != nil {
			response.BadRequest(w, "Invalid source_id parameter")
			return
		}
		filter.SourceID = &sid
	}

	if contentType := r.URL.Query().Get("content_type"); contentType != "" {
		ct := domain.ContentType(contentType)
		if err := ct.IsValid(); err != nil {
			response.BadRequest(w, "Invalid content_type parameter")
			return
		}
		filter.ContentType = &ct
	}

	if isActive := r.URL.Query().Get("is_active"); isActive != "" {
		active, err := strconv.ParseBool(isActive)
		if err != nil {
			response.BadRequest(w, "Invalid is_active parameter")
			return
		}
		filter.IsActive = &active
	}

	if freshnessDays := r.URL.Query().Get("freshness_days"); freshnessDays != "" {
		days, err := strconv.Atoi(freshnessDays)
		if err != nil {
			response.BadRequest(w, "Invalid freshness_days parameter")
			return
		}
		filter.FreshnessDays = &days
	}

	if minTrustScore := r.URL.Query().Get("min_trust_score"); minTrustScore != "" {
		score, err := strconv.ParseFloat(minTrustScore, 64)
		if err != nil {
			response.BadRequest(w, "Invalid min_trust_score parameter")
			return
		}
		filter.MinTrustScore = &score
	}

	items, total, err := h.contentService.ListContentItems(ctx, filter)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to list content items")
		response.InternalError(w, "Failed to retrieve content items", requestID)
		return
	}

	totalPages := (total + pageSize - 1) / pageSize

	resp := map[string]interface{}{
		"data": items,
		"pagination": map[string]interface{}{
			"page":        page,
			"page_size":   pageSize,
			"total_items": total,
			"total_pages": totalPages,
		},
	}

	response.JSON(w, http.StatusOK, resp)
}

// GetContentItem handles GET /v1/content-items/{id}
func (h *ContentHandler) GetContentItem(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.BadRequest(w, "Invalid content item ID")
		return
	}

	item, err := h.contentService.GetContentItemByID(ctx, id)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Str("id", id.String()).Msg("Failed to get content item")
		response.NotFound(w, "Content item not found")
		return
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{"data": item})
}

// CreateContentItem handles POST /v1/content-items
func (h *ContentHandler) CreateContentItem(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	var req CreateContentItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	item := &domain.ContentItem{
		SourceID:       req.SourceID,
		Title:          req.Title,
		URL:            req.URL,
		Summary:        req.Summary,
		Content:        req.Content,
		ContentType:    domain.ContentType(req.ContentType),
		TopicTags:      req.TopicTags,
		FrameworkTags:  req.FrameworkTags,
		IndustryTags:   req.IndustryTags,
		BuyerStage:     req.BuyerStage,
		PartnerTags:    req.PartnerTags,
		Author:         req.Author,
		PublishDate:    req.PublishDate,
		WordCount:      req.WordCount,
		ImageURL:       req.ImageURL,
		TrustScore:     req.TrustScore,
		RelevanceScore: req.RelevanceScore,
	}

	if err := h.contentService.CreateContentItem(ctx, item); err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to create content item")
		response.BadRequestWithDetails(w, "Failed to create content item", err.Error(), requestID)
		return
	}

	response.JSON(w, http.StatusCreated, map[string]interface{}{"data": item})
}

// UpdateContentItem handles PUT /v1/content-items/{id}
func (h *ContentHandler) UpdateContentItem(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.BadRequest(w, "Invalid content item ID")
		return
	}

	var req UpdateContentItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Get existing item
	existing, err := h.contentService.GetContentItemByID(ctx, id)
	if err != nil {
		response.NotFound(w, "Content item not found")
		return
	}

	// Update fields
	if req.Title != nil {
		existing.Title = *req.Title
	}
	if req.Summary != nil {
		existing.Summary = req.Summary
	}
	if req.Content != nil {
		existing.Content = req.Content
	}
	if req.TopicTags != nil {
		existing.TopicTags = req.TopicTags
	}
	if req.FrameworkTags != nil {
		existing.FrameworkTags = req.FrameworkTags
	}
	if req.IndustryTags != nil {
		existing.IndustryTags = req.IndustryTags
	}
	if req.TrustScore != nil {
		existing.TrustScore = *req.TrustScore
	}
	if req.RelevanceScore != nil {
		existing.RelevanceScore = *req.RelevanceScore
	}
	if req.IsActive != nil {
		existing.IsActive = *req.IsActive
	}

	if err := h.contentService.UpdateContentItem(ctx, existing); err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to update content item")
		response.BadRequestWithDetails(w, "Failed to update content item", err.Error(), requestID)
		return
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{"data": existing})
}

// DeleteContentItem handles DELETE /v1/content-items/{id}
func (h *ContentHandler) DeleteContentItem(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.BadRequest(w, "Invalid content item ID")
		return
	}

	if err := h.contentService.DeleteContentItem(ctx, id); err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to delete content item")
		response.InternalError(w, "Failed to delete content item", requestID)
		return
	}

	response.NoContent(w)
}

// ============================================================================
// Content Selection
// ============================================================================

// GetContentForSegment handles POST /v1/content/select
func (h *ContentHandler) GetContentForSegment(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	var req ContentSelectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	if req.SegmentID == uuid.Nil {
		response.BadRequest(w, "segment_id is required")
		return
	}

	if req.ConfigurationID == uuid.Nil {
		response.BadRequest(w, "configuration_id is required")
		return
	}

	criteria := &service.ContentSelectionCriteria{
		SegmentID:         req.SegmentID,
		ConfigurationID:   req.ConfigurationID,
		TopicTags:         req.TopicTags,
		FrameworkTags:     req.FrameworkTags,
		IndustryTags:      req.IndustryTags,
		FreshnessDays:     req.FreshnessDays,
		MaxBlocks:         req.MaxBlocks,
		EducationRatioMin: req.EducationRatioMin,
		MinTrustScore:     req.MinTrustScore,
		MinRelevanceScore: req.MinRelevanceScore,
		ExcludeItemIDs:    req.ExcludeItemIDs,
	}

	result, err := h.contentService.GetContentForSegment(ctx, criteria)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to get content for segment")
		response.InternalError(w, "Failed to retrieve content recommendations", requestID)
		return
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{"data": result})
}

// GetFreshContent handles GET /v1/content/fresh
func (h *ContentHandler) GetFreshContent(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	daysThreshold, err := parseIntQuery(r, "days", 7)
	if err != nil {
		response.BadRequest(w, "Invalid days parameter")
		return
	}

	limit, err := parseIntQuery(r, "limit", 20)
	if err != nil {
		response.BadRequest(w, "Invalid limit parameter")
		return
	}

	var topicTags []string
	if topics := r.URL.Query().Get("topics"); topics != "" {
		topicTags = splitTags(topics)
	}

	items, err := h.contentService.GetFreshContent(ctx, daysThreshold, topicTags, limit)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to get fresh content")
		response.InternalError(w, "Failed to retrieve fresh content", requestID)
		return
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"data": items,
		"meta": map[string]interface{}{
			"count":          len(items),
			"days_threshold": daysThreshold,
		},
	})
}

// ============================================================================
// Request/Response Types
// ============================================================================

// CreateContentSourceRequest represents a request to create a content source
type CreateContentSourceRequest struct {
	Name                 string                 `json:"name"`
	Description          *string                `json:"description,omitempty"`
	SourceType           string                 `json:"source_type"`
	FeedURL              *string                `json:"feed_url,omitempty"`
	APIConfig            map[string]interface{} `json:"api_config,omitempty"`
	DefaultContentType   *string                `json:"default_content_type,omitempty"`
	DefaultTopicTags     []string               `json:"default_topic_tags,omitempty"`
	DefaultFrameworkTags []string               `json:"default_framework_tags,omitempty"`
	TrustScore           float64                `json:"trust_score"`
	MinTrustThreshold    float64                `json:"min_trust_threshold"`
	FreshnessDays        int                    `json:"freshness_days"`
	PollIntervalMinutes  int                    `json:"poll_interval_minutes"`
	IsInternal           bool                   `json:"is_internal"`
}

// UpdateContentSourceRequest represents a request to update a content source
type UpdateContentSourceRequest struct {
	Name                 *string                `json:"name,omitempty"`
	Description          *string                `json:"description,omitempty"`
	FeedURL              *string                `json:"feed_url,omitempty"`
	APIConfig            map[string]interface{} `json:"api_config,omitempty"`
	DefaultTopicTags     []string               `json:"default_topic_tags,omitempty"`
	DefaultFrameworkTags []string               `json:"default_framework_tags,omitempty"`
	TrustScore           *float64               `json:"trust_score,omitempty"`
	MinTrustThreshold    *float64               `json:"min_trust_threshold,omitempty"`
	FreshnessDays        *int                   `json:"freshness_days,omitempty"`
	PollIntervalMinutes  *int                   `json:"poll_interval_minutes,omitempty"`
	IsActive             *bool                  `json:"is_active,omitempty"`
	IsInternal           *bool                  `json:"is_internal,omitempty"`
}

// CreateContentItemRequest represents a request to create a content item
type CreateContentItemRequest struct {
	SourceID       uuid.UUID `json:"source_id"`
	Title          string    `json:"title"`
	URL            string    `json:"url"`
	Summary        *string   `json:"summary,omitempty"`
	Content        *string   `json:"content,omitempty"`
	ContentType    string    `json:"content_type"`
	TopicTags      []string  `json:"topic_tags,omitempty"`
	FrameworkTags  []string  `json:"framework_tags,omitempty"`
	IndustryTags   []string  `json:"industry_tags,omitempty"`
	BuyerStage     *string   `json:"buyer_stage,omitempty"`
	PartnerTags    []string  `json:"partner_tags,omitempty"`
	Author         *string   `json:"author,omitempty"`
	PublishDate    time.Time `json:"publish_date"`
	WordCount      *int      `json:"word_count,omitempty"`
	ImageURL       *string   `json:"image_url,omitempty"`
	TrustScore     float64   `json:"trust_score"`
	RelevanceScore float64   `json:"relevance_score"`
}

// UpdateContentItemRequest represents a request to update a content item
type UpdateContentItemRequest struct {
	Title          *string  `json:"title,omitempty"`
	Summary        *string  `json:"summary,omitempty"`
	Content        *string  `json:"content,omitempty"`
	TopicTags      []string `json:"topic_tags,omitempty"`
	FrameworkTags  []string `json:"framework_tags,omitempty"`
	IndustryTags   []string `json:"industry_tags,omitempty"`
	TrustScore     *float64 `json:"trust_score,omitempty"`
	RelevanceScore *float64 `json:"relevance_score,omitempty"`
	IsActive       *bool    `json:"is_active,omitempty"`
}

// ContentSelectionRequest represents a request to select content for a segment
type ContentSelectionRequest struct {
	SegmentID         uuid.UUID   `json:"segment_id"`
	ConfigurationID   uuid.UUID   `json:"configuration_id"`
	TopicTags         []string    `json:"topic_tags,omitempty"`
	FrameworkTags     []string    `json:"framework_tags,omitempty"`
	IndustryTags      []string    `json:"industry_tags,omitempty"`
	FreshnessDays     int         `json:"freshness_days,omitempty"`
	MaxBlocks         int         `json:"max_blocks,omitempty"`
	EducationRatioMin float64     `json:"education_ratio_min,omitempty"`
	MinTrustScore     float64     `json:"min_trust_score,omitempty"`
	MinRelevanceScore float64     `json:"min_relevance_score,omitempty"`
	ExcludeItemIDs    []uuid.UUID `json:"exclude_item_ids,omitempty"`
}

// TestFeed handles POST /v1/newsletter/content-sources/test-feed
func (h *ContentHandler) TestFeed(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	var req struct {
		FeedURL string `json:"feed_url"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	if req.FeedURL == "" {
		response.BadRequest(w, "feed_url is required")
		return
	}

	if !isValidURL(req.FeedURL) {
		response.BadRequest(w, "Invalid feed URL format")
		return
	}

	result, err := h.contentService.TestFeed(ctx, req.FeedURL)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to test feed")
		response.InternalError(w, "Failed to test feed", requestID)
		return
	}

	resp := map[string]interface{}{
		"is_valid":      result.IsValid,
		"title":         result.Title,
		"item_count":    result.ItemCount,
		"error_message": result.ErrorMessage,
	}

	if !result.LastUpdated.IsZero() {
		resp["last_updated"] = result.LastUpdated.Format(time.RFC3339)
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{"data": resp})
}

// GetPollingStatus handles GET /v1/newsletter/content-sources/{id}/status
func (h *ContentHandler) GetPollingStatus(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.BadRequest(w, "Invalid content source ID")
		return
	}

	status, err := h.contentService.GetPollingStatus(ctx, id)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Str("id", id.String()).Msg("Failed to get polling status")
		response.NotFound(w, "Content source not found")
		return
	}

	resp := map[string]interface{}{
		"item_count":  status.ItemCount,
		"error_count": status.ErrorCount,
	}

	if status.LastPolledAt != nil {
		resp["last_polled_at"] = status.LastPolledAt.Format(time.RFC3339)
	}

	if status.NextPollAt != nil {
		resp["next_poll_at"] = status.NextPollAt.Format(time.RFC3339)
	}

	if status.LastSuccessAt != nil {
		resp["last_success_at"] = status.LastSuccessAt.Format(time.RFC3339)
	}

	if status.LastError != nil {
		resp["last_error"] = *status.LastError
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{"data": resp})
}

// Helper functions

// isValidURL validates a URL format
func isValidURL(urlStr string) bool {
	if urlStr == "" {
		return false
	}

	if len(urlStr) < 10 {
		return false
	}

	// Check for http:// or https://
	if len(urlStr) >= 7 && urlStr[:7] == "http://" {
		return true
	}

	if len(urlStr) >= 8 && urlStr[:8] == "https://" {
		return true
	}

	return false
}

func splitTags(s string) []string {
	if s == "" {
		return nil
	}
	tags := make([]string, 0)
	for _, tag := range stringSliceSplit(s, ",") {
		trimmed := stringTrim(tag)
		if trimmed != "" {
			tags = append(tags, trimmed)
		}
	}
	return tags
}

func stringSliceSplit(s string, sep string) []string {
	result := make([]string, 0)
	start := 0
	for i := 0; i < len(s); i++ {
		if string(s[i]) == sep {
			result = append(result, s[start:i])
			start = i + 1
		}
	}
	if start < len(s) {
		result = append(result, s[start:])
	}
	return result
}

func stringTrim(s string) string {
	start := 0
	end := len(s)
	for start < end && (s[start] == ' ' || s[start] == '\t') {
		start++
	}
	for end > start && (s[end-1] == ' ' || s[end-1] == '\t') {
		end--
	}
	return s[start:end]
}
