package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/phillipboles/aci-backend/internal/api/dto"
	"github.com/phillipboles/aci-backend/internal/api/middleware"
	"github.com/phillipboles/aci-backend/internal/api/response"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/service"
)

// SegmentHandler handles segment-related HTTP requests
type SegmentHandler struct {
	segmentService *service.SegmentService
	logger         zerolog.Logger
}

// NewSegmentHandler creates a new segment handler
func NewSegmentHandler(segmentService *service.SegmentService, logger zerolog.Logger) *SegmentHandler {
	if segmentService == nil {
		panic("segmentService cannot be nil")
	}

	return &SegmentHandler{
		segmentService: segmentService,
		logger:         logger,
	}
}

// List handles GET /v1/segments - returns all segments with filtering and pagination
func (h *SegmentHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Parse filter options
	filter, err := parseSegmentFilter(r)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to parse segment filter")
		response.BadRequestWithDetails(w, "Invalid filter parameters", err.Error(), requestID)
		return
	}

	segments, total, err := h.segmentService.List(ctx, filter)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to list segments")
		response.InternalError(w, "Failed to retrieve segments", requestID)
		return
	}

	// Convert to DTOs
	segmentDTOs := make([]dto.SegmentResponse, len(segments))
	for i, segment := range segments {
		segmentDTOs[i] = dto.SegmentToResponse(segment)
	}

	// Build pagination metadata
	totalPages := (total + filter.Limit - 1) / filter.Limit
	page := (filter.Offset / filter.Limit) + 1

	meta := &response.Meta{
		Page:       page,
		PageSize:   filter.Limit,
		TotalCount: total,
		TotalPages: totalPages,
	}

	response.SuccessWithMeta(w, segmentDTOs, meta)
}

// GetByID handles GET /v1/segments/{id} - returns a single segment by ID
func (h *SegmentHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	idParam := chi.URLParam(r, "id")
	if idParam == "" {
		response.BadRequest(w, "Segment ID is required")
		return
	}

	segmentID, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(w, "Invalid segment ID format")
		return
	}

	segment, err := h.segmentService.GetByID(ctx, segmentID)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Str("segment_id", idParam).
			Msg("Failed to get segment by ID")
		response.NotFound(w, "Segment not found")
		return
	}

	segmentDTO := dto.SegmentToResponse(segment)
	response.Success(w, segmentDTO)
}

// Create handles POST /v1/segments - creates a new segment
func (h *SegmentHandler) Create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get authenticated user
	user, err := middleware.GetDomainUserFromContext(ctx)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Parse request body
	var createReq dto.CreateSegmentRequest
	if err := json.NewDecoder(r.Body).Decode(&createReq); err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to decode create segment request")
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Convert DTO to domain model
	segment := createSegmentRequestToDomain(&createReq, user.ID)

	// Create segment
	if err := h.segmentService.Create(ctx, segment); err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Str("user_id", user.ID.String()).
			Msg("Failed to create segment")
		response.InternalError(w, "Failed to create segment", requestID)
		return
	}

	segmentDTO := dto.SegmentToResponse(segment)
	response.Created(w, segmentDTO)
}

// Update handles PUT /v1/segments/{id} - updates an existing segment
func (h *SegmentHandler) Update(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	idParam := chi.URLParam(r, "id")
	if idParam == "" {
		response.BadRequest(w, "Segment ID is required")
		return
	}

	segmentID, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(w, "Invalid segment ID format")
		return
	}

	// Fetch existing segment first
	existingSegment, err := h.segmentService.GetByID(ctx, segmentID)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Str("segment_id", segmentID.String()).
			Msg("Failed to get existing segment")
		response.NotFound(w, "Segment not found")
		return
	}

	// Parse request body
	var updateReq dto.UpdateSegmentRequest
	if err := json.NewDecoder(r.Body).Decode(&updateReq); err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to decode update segment request")
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Convert DTO to domain model
	segment := updateSegmentRequestToDomain(&updateReq, existingSegment)

	// Update segment
	if err := h.segmentService.Update(ctx, segment); err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Str("segment_id", segmentID.String()).
			Msg("Failed to update segment")
		response.InternalError(w, "Failed to update segment", requestID)
		return
	}

	// Fetch updated segment for response
	updatedSegment, err := h.segmentService.GetByID(ctx, segmentID)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Str("segment_id", segmentID.String()).
			Msg("Failed to fetch updated segment")
		response.InternalError(w, "Segment updated but failed to retrieve", requestID)
		return
	}

	segmentDTO := dto.SegmentToResponse(updatedSegment)
	response.Success(w, segmentDTO)
}

// Delete handles DELETE /v1/segments/{id} - deletes a segment
func (h *SegmentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	idParam := chi.URLParam(r, "id")
	if idParam == "" {
		response.BadRequest(w, "Segment ID is required")
		return
	}

	segmentID, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(w, "Invalid segment ID format")
		return
	}

	if err := h.segmentService.Delete(ctx, segmentID); err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Str("segment_id", segmentID.String()).
			Msg("Failed to delete segment")

		// Check if error is due to existing contacts
		if strings.Contains(err.Error(), "cannot delete segment") {
			response.BadRequestWithDetails(w, "Cannot delete segment with existing contacts", err.Error(), requestID)
			return
		}

		response.InternalError(w, "Failed to delete segment", requestID)
		return
	}

	response.NoContent(w)
}

// GetContacts handles GET /v1/segments/{id}/contacts - returns contacts for a segment with pagination
func (h *SegmentHandler) GetContacts(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	idParam := chi.URLParam(r, "id")
	if idParam == "" {
		response.BadRequest(w, "Segment ID is required")
		return
	}

	segmentID, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(w, "Invalid segment ID format")
		return
	}

	// Parse pagination parameters
	limit, offset, err := parsePaginationParams(r)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to parse pagination parameters")
		response.BadRequestWithDetails(w, "Invalid pagination parameters", err.Error(), requestID)
		return
	}

	contacts, total, err := h.segmentService.GetContacts(ctx, segmentID, limit, offset)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Str("segment_id", segmentID.String()).
			Msg("Failed to get segment contacts")

		// Check if segment not found
		if strings.Contains(err.Error(), "segment not found") {
			response.NotFound(w, "Segment not found")
			return
		}

		response.InternalError(w, "Failed to retrieve segment contacts", requestID)
		return
	}

	// Convert to DTOs
	contactDTOs := make([]dto.ContactResponse, len(contacts))
	for i, contact := range contacts {
		contactDTOs[i] = dto.ContactToResponse(contact)
	}

	// Build pagination metadata
	totalPages := (total + limit - 1) / limit
	page := (offset / limit) + 1

	meta := &response.Meta{
		Page:       page,
		PageSize:   limit,
		TotalCount: total,
		TotalPages: totalPages,
	}

	response.SuccessWithMeta(w, contactDTOs, meta)
}

// RecalculateContacts handles POST /v1/segments/{id}/recalculate - recalculates contact count for a segment
func (h *SegmentHandler) RecalculateContacts(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	idParam := chi.URLParam(r, "id")
	if idParam == "" {
		response.BadRequest(w, "Segment ID is required")
		return
	}

	segmentID, err := uuid.Parse(idParam)
	if err != nil {
		response.BadRequest(w, "Invalid segment ID format")
		return
	}

	if err := h.segmentService.RecalculateContactCount(ctx, segmentID); err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Str("segment_id", segmentID.String()).
			Msg("Failed to recalculate segment contact count")

		// Check if segment not found
		if strings.Contains(err.Error(), "segment not found") {
			response.NotFound(w, "Segment not found")
			return
		}

		response.InternalError(w, "Failed to recalculate contact count", requestID)
		return
	}

	// Fetch updated segment for response
	segment, err := h.segmentService.GetByID(ctx, segmentID)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Str("segment_id", segmentID.String()).
			Msg("Failed to fetch segment after recalculation")
		response.InternalError(w, "Contact count updated but failed to retrieve segment", requestID)
		return
	}

	segmentDTO := dto.SegmentToResponse(segment)
	response.SuccessWithMessage(w, segmentDTO, "Contact count recalculated successfully")
}

// Helper Functions

// parseSegmentFilter parses filter parameters from the request
func parseSegmentFilter(r *http.Request) (*domain.SegmentFilter, error) {
	filter := &domain.SegmentFilter{
		Limit:  20, // Default limit
		Offset: 0,  // Default offset
	}

	// Parse is_active filter
	if activeStr := r.URL.Query().Get("is_active"); activeStr != "" {
		isActive, err := strconv.ParseBool(activeStr)
		if err != nil {
			return nil, fmt.Errorf("invalid is_active value: %w", err)
		}
		filter.IsActive = &isActive
	}

	// Parse created_by filter
	if createdByStr := r.URL.Query().Get("created_by"); createdByStr != "" {
		createdBy, err := uuid.Parse(createdByStr)
		if err != nil {
			return nil, fmt.Errorf("invalid created_by value: %w", err)
		}
		filter.CreatedBy = &createdBy
	}

	// Parse search filter
	if search := r.URL.Query().Get("search"); search != "" {
		filter.Search = search
	}

	// Parse pagination
	limit, offset, err := parsePaginationParams(r)
	if err != nil {
		return nil, err
	}
	filter.Limit = limit
	filter.Offset = offset

	return filter, nil
}

// parsePaginationParams parses pagination parameters from the request
func parsePaginationParams(r *http.Request) (limit, offset int, err error) {
	limit = 20  // Default limit
	offset = 0  // Default offset

	// Parse limit
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		parsedLimit, parseErr := strconv.Atoi(limitStr)
		if parseErr != nil {
			return 0, 0, fmt.Errorf("invalid limit value: %w", parseErr)
		}
		if parsedLimit <= 0 {
			return 0, 0, fmt.Errorf("limit must be positive")
		}
		if parsedLimit > 100 {
			return 0, 0, fmt.Errorf("limit must not exceed 100")
		}
		limit = parsedLimit
	}

	// Parse offset
	if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
		parsedOffset, parseErr := strconv.Atoi(offsetStr)
		if parseErr != nil {
			return 0, 0, fmt.Errorf("invalid offset value: %w", parseErr)
		}
		if parsedOffset < 0 {
			return 0, 0, fmt.Errorf("offset must be non-negative")
		}
		offset = parsedOffset
	}

	// Support page-based pagination
	if pageStr := r.URL.Query().Get("page"); pageStr != "" {
		page, parseErr := strconv.Atoi(pageStr)
		if parseErr != nil {
			return 0, 0, fmt.Errorf("invalid page value: %w", parseErr)
		}
		if page < 1 {
			return 0, 0, fmt.Errorf("page must be at least 1")
		}
		offset = (page - 1) * limit
	}

	return limit, offset, nil
}

// createSegmentRequestToDomain converts a CreateSegmentRequest DTO to a domain Segment
func createSegmentRequestToDomain(req *dto.CreateSegmentRequest, userID uuid.UUID) *domain.Segment {
	if req == nil {
		return nil
	}

	segment := &domain.Segment{
		Name:                    req.Name,
		Description:             req.Description,
		RoleCluster:             req.RoleCluster,
		Industries:              req.Industries,
		Regions:                 req.Regions,
		CompanySizeBands:        req.CompanySizeBands,
		ComplianceFrameworks:    req.ComplianceFrameworks,
		PartnerTags:             req.PartnerTags,
		MinEngagementScore:      req.MinEngagementScore,
		TopicInterests:          req.TopicInterests,
		ExcludeUnsubscribed:     req.ExcludeUnsubscribed,
		ExcludeBounced:          req.ExcludeBounced,
		ExcludeHighTouch:        req.ExcludeHighTouch,
		MaxNewslettersPer30Days: req.MaxNewslettersPer30Days,
		IsActive:                req.IsActive,
		CreatedBy:               userID,
	}

	// Ensure empty slices are initialized
	if segment.Industries == nil {
		segment.Industries = []string{}
	}
	if segment.Regions == nil {
		segment.Regions = []string{}
	}
	if segment.CompanySizeBands == nil {
		segment.CompanySizeBands = []string{}
	}
	if segment.ComplianceFrameworks == nil {
		segment.ComplianceFrameworks = []string{}
	}
	if segment.PartnerTags == nil {
		segment.PartnerTags = []string{}
	}
	if segment.TopicInterests == nil {
		segment.TopicInterests = []string{}
	}

	return segment
}

// updateSegmentRequestToDomain converts an UpdateSegmentRequest DTO to a domain Segment
func updateSegmentRequestToDomain(req *dto.UpdateSegmentRequest, existingSegment *domain.Segment) *domain.Segment {
	if req == nil || existingSegment == nil {
		return nil
	}

	// Copy existing values and apply updates
	segment := &domain.Segment{
		ID:                      existingSegment.ID,
		Name:                    req.Name,
		Description:             req.Description,
		RoleCluster:             req.RoleCluster,
		Industries:              req.Industries,
		Regions:                 req.Regions,
		CompanySizeBands:        req.CompanySizeBands,
		ComplianceFrameworks:    req.ComplianceFrameworks,
		PartnerTags:             req.PartnerTags,
		MinEngagementScore:      req.MinEngagementScore,
		TopicInterests:          req.TopicInterests,
		ExcludeUnsubscribed:     req.ExcludeUnsubscribed,
		ExcludeBounced:          req.ExcludeBounced,
		ExcludeHighTouch:        req.ExcludeHighTouch,
		MaxNewslettersPer30Days: req.MaxNewslettersPer30Days,
		IsActive:                req.IsActive,
		ContactCount:            existingSegment.ContactCount,
		CreatedBy:               existingSegment.CreatedBy,
		CreatedAt:               existingSegment.CreatedAt,
	}

	// Ensure empty slices are initialized
	if segment.Industries == nil {
		segment.Industries = []string{}
	}
	if segment.Regions == nil {
		segment.Regions = []string{}
	}
	if segment.CompanySizeBands == nil {
		segment.CompanySizeBands = []string{}
	}
	if segment.ComplianceFrameworks == nil {
		segment.ComplianceFrameworks = []string{}
	}
	if segment.PartnerTags == nil {
		segment.PartnerTags = []string{}
	}
	if segment.TopicInterests == nil {
		segment.TopicInterests = []string{}
	}

	return segment
}
