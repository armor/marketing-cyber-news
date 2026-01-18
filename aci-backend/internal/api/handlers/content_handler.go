package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/phillipboles/aci-backend/internal/api/middleware"
	"github.com/phillipboles/aci-backend/internal/api/response"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/service"
)

// Configuration constants for content handler validation
const (
	// MinPollingIntervalMinutes is the minimum allowed polling interval for content sources
	MinPollingIntervalMinutes = 60
	// MaxPollingIntervalMinutes is the maximum allowed polling interval for content sources
	MaxPollingIntervalMinutes = 1440
	// DefaultTrustScore is the default trust score for content sources
	DefaultTrustScore = 0.7
	// ManualContentTrustScore is the trust score assigned to manually created content
	ManualContentTrustScore = 1.0
	// ManualContentRelevanceScore is the relevance score assigned to manually created content
	ManualContentRelevanceScore = 1.0
	// MaxURLLength is the maximum allowed URL length
	MaxURLLength = 2048
	// MaxTitleLength is the maximum allowed title length
	MaxTitleLength = 500
	// MaxSummaryLength is the maximum allowed summary length
	MaxSummaryLength = 2000
	// MaxAuthorLength is the maximum allowed author name length
	MaxAuthorLength = 200
)

// ContentServiceInterface defines the interface for content service operations
// This allows for easy mocking in tests
type ContentServiceInterface interface {
	// Content Sources
	CreateContentSource(ctx context.Context, source *domain.ContentSource) error
	GetContentSourceByID(ctx context.Context, id uuid.UUID) (*domain.ContentSource, error)
	ListContentSources(ctx context.Context, filter *domain.ContentSourceFilter) ([]*domain.ContentSource, int, error)
	UpdateContentSource(ctx context.Context, source *domain.ContentSource) error
	DeleteContentSource(ctx context.Context, id uuid.UUID) error
	GetActiveSources(ctx context.Context) ([]*domain.ContentSource, error)
	TestFeed(ctx context.Context, feedURL string) (*service.FeedTestResult, error)
	GetPollingStatus(ctx context.Context, sourceID uuid.UUID) (*service.PollingStatus, error)
	UpdateSourcePollingStatus(ctx context.Context, id uuid.UUID, success bool, errorMsg *string) error

	// Content Items
	BulkCreateContentItems(ctx context.Context, items []*domain.ContentItem) error
	CreateContentItem(ctx context.Context, item *domain.ContentItem) error
	GetContentItemByID(ctx context.Context, id uuid.UUID) (*domain.ContentItem, error)
	GetContentItemByURL(ctx context.Context, url string) (*domain.ContentItem, error)
	ListContentItems(ctx context.Context, filter *domain.ContentItemFilter) ([]*domain.ContentItem, int, error)
	UpdateContentItem(ctx context.Context, item *domain.ContentItem) error
	DeleteContentItem(ctx context.Context, id uuid.UUID) error
	GetFreshContent(ctx context.Context, daysThreshold int, topicTags []string, limit int) ([]*domain.ContentItem, error)

	// Content Selection
	GetContentForSegment(ctx context.Context, criteria *service.ContentSelectionCriteria) (*service.ContentSelectionResult, error)
}

// MetadataExtractorInterface defines the interface for URL metadata extraction
// This allows for easy mocking in tests
type MetadataExtractorInterface interface {
	ExtractMetadata(ctx context.Context, url string) (*service.ExtractedMetadata, error)
}

// ContentHandler handles content-related HTTP requests
type ContentHandler struct {
	contentService    ContentServiceInterface
	metadataExtractor MetadataExtractorInterface
}

// NewContentHandler creates a new content handler
func NewContentHandler(contentService ContentServiceInterface) *ContentHandler {
	if contentService == nil {
		panic("contentService cannot be nil")
	}

	return &ContentHandler{
		contentService: contentService,
	}
}

// SetMetadataExtractor sets the metadata extractor (optional dependency injection)
func (h *ContentHandler) SetMetadataExtractor(extractor MetadataExtractorInterface) {
	h.metadataExtractor = extractor
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
	if req.PollIntervalMinutes < MinPollingIntervalMinutes || req.PollIntervalMinutes > MaxPollingIntervalMinutes {
		response.BadRequest(w, "Polling interval must be between 60 (1 hour) and 1440 (24 hours) minutes")
		return
	}

	// Set default trust score if not provided
	trustScore := req.TrustScore
	if trustScore == 0 {
		trustScore = DefaultTrustScore // Default trust score for content sources
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
		if *req.PollIntervalMinutes < MinPollingIntervalMinutes || *req.PollIntervalMinutes > MaxPollingIntervalMinutes {
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

// ============================================================================
// URL Metadata Extraction (Content Pipeline Phase 1.2)
// ============================================================================

// ExtractURLMetadataRequest represents the request body for URL metadata extraction
type ExtractURLMetadataRequest struct {
	URL string `json:"url"`
}

// ExtractURLMetadata handles POST /v1/newsletter/content/extract-metadata
// Extracts Open Graph, meta tags, and JSON-LD schema from a URL with SSRF protection
func (h *ContentHandler) ExtractURLMetadata(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Authorization: Only marketing and admin users can extract URL metadata
	// This prevents unauthenticated SSRF attacks via the metadata extraction endpoint
	user, err := middleware.GetDomainUserFromContext(ctx)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	if user.Role != domain.RoleMarketing && user.Role != domain.RoleAdmin {
		log.Warn().
			Str("request_id", requestID).
			Str("user_id", user.ID.String()).
			Str("role", string(user.Role)).
			Msg("Unauthorized attempt to extract URL metadata")
		response.Forbidden(w, "User lacks permission to extract URL metadata")
		return
	}

	// Check if metadata extractor is configured
	if h.metadataExtractor == nil {
		log.Error().Str("request_id", requestID).Msg("Metadata extractor not configured")
		response.ServiceUnavailable(w, "URL metadata extraction is not available")
		return
	}

	// Parse request body
	var req ExtractURLMetadataRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Validate URL
	if req.URL == "" {
		response.BadRequest(w, "URL is required")
		return
	}

	if !isValidURL(req.URL) {
		response.BadRequest(w, "Invalid URL format - must start with http:// or https://")
		return
	}

	// Check URL length
	if len(req.URL) > MaxURLLength {
		response.BadRequest(w, "URL exceeds maximum length of 2048 characters")
		return
	}

	// Extract metadata
	metadata, err := h.metadataExtractor.ExtractMetadata(ctx, req.URL)
	if err != nil {
		// Log the detailed error internally but return a generic message to the client
		// to avoid leaking internal details (network topology, library versions, etc.)
		log.Warn().Err(err).Str("request_id", requestID).Str("url", req.URL).Msg("Failed to extract URL metadata")
		response.BadRequest(w, "Failed to extract metadata from URL. Please verify the URL is accessible and try again.")
		return
	}

	// Build response
	resp := map[string]interface{}{
		"url":   metadata.URL,
		"title": metadata.Title,
	}

	if metadata.Description != nil {
		resp["description"] = *metadata.Description
	}
	if metadata.ImageURL != nil {
		resp["image_url"] = *metadata.ImageURL
	}
	if metadata.PublishDate != nil {
		resp["publish_date"] = *metadata.PublishDate
	}
	if metadata.Author != nil {
		resp["author"] = *metadata.Author
	}
	if metadata.ReadTimeMinutes != nil {
		resp["read_time_minutes"] = *metadata.ReadTimeMinutes
	}
	if metadata.SiteName != nil {
		resp["site_name"] = *metadata.SiteName
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{"data": resp})
}

// ============================================================================
// Manual Content Creation (Content Pipeline Phase 1.3)
// ============================================================================

// CreateManualContentRequest represents the request body for manual content creation
type CreateManualContentRequest struct {
	URL           string   `json:"url"`
	Title         string   `json:"title"`
	Summary       *string  `json:"summary,omitempty"`
	ContentType   string   `json:"content_type"`
	TopicTags     []string `json:"topic_tags,omitempty"`
	FrameworkTags []string `json:"framework_tags,omitempty"`
	PublishDate   *string  `json:"publish_date,omitempty"`
	Author        *string  `json:"author,omitempty"`
	ImageURL      *string  `json:"image_url,omitempty"`
}

// CreateManualContentItem handles POST /v1/newsletter/content-items/manual
// Creates a content item with source_type="manual" for user-submitted URLs
func (h *ContentHandler) CreateManualContentItem(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Authorization: Only marketing and admin users can create manual content
	// This prevents privilege escalation via content injection with high trust scores
	user, err := middleware.GetDomainUserFromContext(ctx)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	if user.Role != domain.RoleMarketing && user.Role != domain.RoleAdmin {
		log.Warn().
			Str("request_id", requestID).
			Str("user_id", user.ID.String()).
			Str("role", string(user.Role)).
			Msg("Unauthorized attempt to create manual content")
		response.Forbidden(w, "User lacks permission to create manual content")
		return
	}

	// Parse request body
	var req CreateManualContentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Validate required fields
	if req.URL == "" {
		response.BadRequest(w, "URL is required")
		return
	}

	if !isValidURL(req.URL) {
		response.BadRequest(w, "Invalid URL format - must start with http:// or https://")
		return
	}

	if len(req.URL) > MaxURLLength {
		response.BadRequest(w, "URL exceeds maximum length of 2048 characters")
		return
	}

	if req.Title == "" {
		response.BadRequest(w, "Title is required")
		return
	}

	if len(req.Title) > MaxTitleLength {
		response.BadRequest(w, "Title exceeds maximum length of 500 characters")
		return
	}

	if req.ContentType == "" {
		response.BadRequest(w, "Content type is required")
		return
	}

	// Validate content type using domain validation
	contentType := domain.ContentType(req.ContentType)
	if err := contentType.IsValid(); err != nil {
		response.BadRequest(w, "Invalid content type - must be one of: blog, news, case_study, webinar, product_update, event")
		return
	}

	// Validate optional fields
	if req.Summary != nil && len(*req.Summary) > MaxSummaryLength {
		response.BadRequest(w, "Summary exceeds maximum length of 2000 characters")
		return
	}

	if req.Author != nil && len(*req.Author) > MaxAuthorLength {
		response.BadRequest(w, "Author exceeds maximum length of 200 characters")
		return
	}

	if req.ImageURL != nil && !isValidURL(*req.ImageURL) {
		response.BadRequest(w, "Invalid image URL format")
		return
	}

	// Parse publish date if provided
	var publishDate time.Time
	if req.PublishDate != nil && *req.PublishDate != "" {
		var err error
		publishDate, err = time.Parse(time.RFC3339, *req.PublishDate)
		if err != nil {
			// Try alternative formats
			publishDate, err = time.Parse("2006-01-02", *req.PublishDate)
			if err != nil {
				response.BadRequest(w, "Invalid publish date format - use RFC3339 or YYYY-MM-DD")
				return
			}
		}
	} else {
		publishDate = time.Now()
	}

	// Check for duplicate URL
	existingItem, err := h.contentService.GetContentItemByURL(ctx, req.URL)
	if err == nil && existingItem != nil {
		log.Warn().
			Str("request_id", requestID).
			Str("url", req.URL).
			Str("existing_id", existingItem.ID.String()).
			Msg("Duplicate URL detected for manual content creation")
		response.Conflict(w, "Content item with this URL already exists")
		return
	}

	// Create content item
	// For manual content, SourceID is the zero UUID (uuid.Nil) to indicate no automated source
	item := &domain.ContentItem{
		ID:             uuid.New(),
		SourceID:       uuid.Nil, // Zero UUID indicates manual entry (no automated source)
		Title:          req.Title,
		URL:            req.URL,
		Summary:        req.Summary,
		ContentType:    contentType, // Already validated above
		TopicTags:      req.TopicTags,
		FrameworkTags:  req.FrameworkTags,
		Author:         req.Author,
		PublishDate:    publishDate,
		ImageURL:       req.ImageURL,
		TrustScore:     ManualContentTrustScore,     // High trust for manually curated content
		RelevanceScore: ManualContentRelevanceScore, // High relevance for manually curated content
		IsActive:       true,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	if err := h.contentService.CreateContentItem(ctx, item); err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to create manual content item")
		response.InternalError(w, "Failed to create content item", requestID)
		return
	}

	// Determine source type for response
	sourceType := "automated"
	if item.SourceID == uuid.Nil {
		sourceType = "manual"
	}

	log.Info().
		Str("request_id", requestID).
		Str("item_id", item.ID.String()).
		Str("title", item.Title).
		Str("source_type", sourceType).
		Msg("Manual content item created")

	// Build response
	resp := map[string]interface{}{
		"id":              item.ID.String(),
		"title":           item.Title,
		"url":             item.URL,
		"content_type":    item.ContentType,
		"source_type":     sourceType,
		"trust_score":     item.TrustScore,
		"relevance_score": item.RelevanceScore,
		"is_active":       item.IsActive,
		"publish_date":    item.PublishDate.Format(time.RFC3339),
		"created_at":      item.CreatedAt.Format(time.RFC3339),
		"updated_at":      item.UpdatedAt.Format(time.RFC3339),
	}

	if item.Summary != nil {
		resp["summary"] = *item.Summary
	}
	if item.Author != nil {
		resp["author"] = *item.Author
	}
	if item.ImageURL != nil {
		resp["image_url"] = *item.ImageURL
	}
	if len(item.TopicTags) > 0 {
		resp["topic_tags"] = item.TopicTags
	}
	if len(item.FrameworkTags) > 0 {
		resp["framework_tags"] = item.FrameworkTags
	}

	response.JSON(w, http.StatusCreated, map[string]interface{}{"data": resp})
}

// Helper functions

// isValidURL validates a URL format using proper URL parsing
func isValidURL(urlStr string) bool {
	if urlStr == "" {
		return false
	}

	// Parse the URL to validate structure
	parsed, err := url.Parse(urlStr)
	if err != nil {
		return false
	}

	// Require http or https scheme
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return false
	}

	// Require a valid host
	if parsed.Host == "" {
		return false
	}

	return true
}

// splitTags splits a comma-separated string into trimmed tags using standard library
func splitTags(s string) []string {
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	tags := make([]string, 0, len(parts))
	for _, tag := range parts {
		trimmed := strings.TrimSpace(tag)
		if trimmed != "" {
			tags = append(tags, trimmed)
		}
	}
	return tags
}
