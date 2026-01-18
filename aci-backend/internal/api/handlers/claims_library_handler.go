package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
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

// ClaimsLibraryHandler handles claims library HTTP requests
type ClaimsLibraryHandler struct {
	claimsService *service.ClaimsLibraryService
}

// NewClaimsLibraryHandler creates a new claims library handler
func NewClaimsLibraryHandler(claimsService *service.ClaimsLibraryService) *ClaimsLibraryHandler {
	if claimsService == nil {
		panic("claimsService cannot be nil")
	}

	return &ClaimsLibraryHandler{
		claimsService: claimsService,
	}
}

// ClaimRequest represents the request body for creating/updating a claim
type ClaimRequest struct {
	ClaimText       string   `json:"claim_text"`
	ClaimType       string   `json:"claim_type"`
	Category        string   `json:"category"`
	SourceReference *string  `json:"source_reference,omitempty"`
	Tags            []string `json:"tags,omitempty"`
	Notes           *string  `json:"notes,omitempty"`
	ExpiresAt       *string  `json:"expires_at,omitempty"` // ISO 8601 format
}

// ClaimApprovalRequest represents the request body for approving a claim
type ClaimApprovalRequest struct {
	ExpiresAt *string `json:"expires_at,omitempty"` // ISO 8601 format
	Notes     *string `json:"notes,omitempty"`
}

// ClaimRejectionRequest represents the request body for rejecting a claim
type ClaimRejectionRequest struct {
	Reason string `json:"reason"`
}

// ClaimValidationRequest represents the request body for validating content
type ClaimValidationRequest struct {
	Content string     `json:"content"`
	BlockID *uuid.UUID `json:"block_id,omitempty"`
}

// ClaimResponse represents a claim in the API response
type ClaimResponse struct {
	ID              uuid.UUID  `json:"id"`
	ClaimText       string     `json:"claim_text"`
	ClaimType       string     `json:"claim_type"`
	Category        string     `json:"category"`
	ApprovalStatus  string     `json:"approval_status"`
	ApprovedBy      *uuid.UUID `json:"approved_by,omitempty"`
	ApprovedAt      *time.Time `json:"approved_at,omitempty"`
	ExpiresAt       *time.Time `json:"expires_at,omitempty"`
	RejectionReason *string    `json:"rejection_reason,omitempty"`
	SourceReference *string    `json:"source_reference,omitempty"`
	UsageCount      int        `json:"usage_count"`
	LastUsedAt      *time.Time `json:"last_used_at,omitempty"`
	Tags            []string   `json:"tags"`
	Notes           *string    `json:"notes,omitempty"`
	CreatedBy       uuid.UUID  `json:"created_by"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
	IsExpired       bool       `json:"is_expired"`
	IsUsable        bool       `json:"is_usable"`
}

// List handles GET /v1/claims - returns paginated claims
func (h *ClaimsLibraryHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Parse pagination parameters
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
	filter := &domain.ClaimsLibraryFilter{
		Page:     page,
		PageSize: pageSize,
	}

	// Parse optional filters
	if claimType := r.URL.Query().Get("claim_type"); claimType != "" {
		ct := domain.ClaimType(claimType)
		if !ct.IsValid() {
			response.BadRequest(w, fmt.Sprintf("Invalid claim_type: %s", claimType))
			return
		}
		filter.ClaimType = &ct
	}

	if category := r.URL.Query().Get("category"); category != "" {
		filter.Category = &category
	}

	if status := r.URL.Query().Get("approval_status"); status != "" {
		st := domain.ClaimApprovalStatus(status)
		if !st.IsValid() {
			response.BadRequest(w, fmt.Sprintf("Invalid approval_status: %s", status))
			return
		}
		filter.ApprovalStatus = &st
	}

	if tags := r.URL.Query().Get("tags"); tags != "" {
		filter.Tags = strings.Split(tags, ",")
	}

	if search := r.URL.Query().Get("search"); search != "" {
		filter.SearchText = &search
	}

	if includeExpired := r.URL.Query().Get("include_expired"); includeExpired == "true" {
		filter.IncludeExpired = true
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

	// Get claims from service
	claims, total, err := h.claimsService.List(ctx, filter)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to list claims")
		response.InternalError(w, "Failed to retrieve claims", requestID)
		return
	}

	// Convert to response DTOs
	claimResponses := make([]ClaimResponse, len(claims))
	for i, claim := range claims {
		claimResponses[i] = claimToResponse(claim)
	}

	// Calculate pagination metadata
	totalPages := (total + pageSize - 1) / pageSize
	meta := &response.Meta{
		Page:       page,
		PageSize:   pageSize,
		TotalCount: total,
		TotalPages: totalPages,
	}

	response.SuccessWithMeta(w, claimResponses, meta)
}

// Get handles GET /v1/claims/{id} - returns a single claim
func (h *ClaimsLibraryHandler) Get(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Parse claim ID from URL
	claimID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.BadRequest(w, "Invalid claim ID")
		return
	}

	// Get claim from service
	claim, err := h.claimsService.GetByID(ctx, claimID)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("claim_id", claimID.String()).
			Msg("Failed to get claim")
		if strings.Contains(err.Error(), "not found") {
			response.NotFound(w, "Claim not found")
			return
		}
		response.InternalError(w, "Failed to retrieve claim", requestID)
		return
	}

	response.Success(w, claimToResponse(claim))
}

// Create handles POST /v1/claims - creates a new claim
func (h *ClaimsLibraryHandler) Create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get user ID from context
	userID, err := middleware.GetUserIDFromContext(ctx)
	if err != nil {
		response.Unauthorized(w, "User not authenticated")
		return
	}

	// Parse request body
	var req ClaimRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Validate claim type
	claimType := domain.ClaimType(req.ClaimType)
	if !claimType.IsValid() {
		response.BadRequest(w, fmt.Sprintf("Invalid claim_type: %s", req.ClaimType))
		return
	}

	// Parse expiration date if provided
	var expiresAt *time.Time
	if req.ExpiresAt != nil {
		t, err := time.Parse(time.RFC3339, *req.ExpiresAt)
		if err != nil {
			response.BadRequest(w, "Invalid expires_at format. Use ISO 8601 (RFC3339)")
			return
		}
		expiresAt = &t
	}

	// Create claim entity
	claim := &domain.ClaimsLibraryEntry{
		ID:              uuid.New(),
		ClaimText:       req.ClaimText,
		ClaimType:       claimType,
		Category:        req.Category,
		ApprovalStatus:  domain.ClaimStatusPending,
		SourceReference: req.SourceReference,
		Tags:            req.Tags,
		Notes:           req.Notes,
		ExpiresAt:       expiresAt,
		CreatedBy:       userID,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	// Create claim via service
	if err := h.claimsService.Create(ctx, claim); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("user_id", userID.String()).
			Msg("Failed to create claim")
		if strings.Contains(err.Error(), "invalid") || strings.Contains(err.Error(), "required") {
			response.BadRequest(w, err.Error())
			return
		}
		response.InternalError(w, "Failed to create claim", requestID)
		return
	}

	log.Info().
		Str("request_id", requestID).
		Str("claim_id", claim.ID.String()).
		Str("user_id", userID.String()).
		Str("claim_type", string(claimType)).
		Msg("Claim created")

	response.Created(w, claimToResponse(claim))
}

// Update handles PUT /v1/claims/{id} - updates an existing claim
func (h *ClaimsLibraryHandler) Update(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get user ID from context
	userID, err := middleware.GetUserIDFromContext(ctx)
	if err != nil {
		response.Unauthorized(w, "User not authenticated")
		return
	}

	// Parse claim ID from URL
	claimID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.BadRequest(w, "Invalid claim ID")
		return
	}

	// Parse request body
	var req ClaimRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Validate claim type
	claimType := domain.ClaimType(req.ClaimType)
	if !claimType.IsValid() {
		response.BadRequest(w, fmt.Sprintf("Invalid claim_type: %s", req.ClaimType))
		return
	}

	// Parse expiration date if provided
	var expiresAt *time.Time
	if req.ExpiresAt != nil {
		t, err := time.Parse(time.RFC3339, *req.ExpiresAt)
		if err != nil {
			response.BadRequest(w, "Invalid expires_at format. Use ISO 8601 (RFC3339)")
			return
		}
		expiresAt = &t
	}

	// Create update entity
	claim := &domain.ClaimsLibraryEntry{
		ID:              claimID,
		ClaimText:       req.ClaimText,
		ClaimType:       claimType,
		Category:        req.Category,
		SourceReference: req.SourceReference,
		Tags:            req.Tags,
		Notes:           req.Notes,
		ExpiresAt:       expiresAt,
	}

	// Update via service
	if err := h.claimsService.Update(ctx, claim, userID); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("claim_id", claimID.String()).
			Msg("Failed to update claim")
		if strings.Contains(err.Error(), "not found") {
			response.NotFound(w, "Claim not found")
			return
		}
		if strings.Contains(err.Error(), "invalid") || strings.Contains(err.Error(), "required") {
			response.BadRequest(w, err.Error())
			return
		}
		response.InternalError(w, "Failed to update claim", requestID)
		return
	}

	// Fetch updated claim
	updated, err := h.claimsService.GetByID(ctx, claimID)
	if err != nil {
		response.InternalError(w, "Failed to retrieve updated claim", requestID)
		return
	}

	log.Info().
		Str("request_id", requestID).
		Str("claim_id", claimID.String()).
		Str("user_id", userID.String()).
		Msg("Claim updated")

	response.Success(w, claimToResponse(updated))
}

// Delete handles DELETE /v1/claims/{id} - deletes a claim
func (h *ClaimsLibraryHandler) Delete(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get user ID from context
	userID, err := middleware.GetUserIDFromContext(ctx)
	if err != nil {
		response.Unauthorized(w, "User not authenticated")
		return
	}

	// Parse claim ID from URL
	claimID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.BadRequest(w, "Invalid claim ID")
		return
	}

	// Delete via service
	if err := h.claimsService.Delete(ctx, claimID, userID); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("claim_id", claimID.String()).
			Msg("Failed to delete claim")
		if strings.Contains(err.Error(), "not found") {
			response.NotFound(w, "Claim not found")
			return
		}
		response.InternalError(w, "Failed to delete claim", requestID)
		return
	}

	log.Info().
		Str("request_id", requestID).
		Str("claim_id", claimID.String()).
		Str("user_id", userID.String()).
		Msg("Claim deleted")

	response.NoContent(w)
}

// Approve handles POST /v1/claims/{id}/approve - approves a claim
func (h *ClaimsLibraryHandler) Approve(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get user ID from context
	userID, err := middleware.GetUserIDFromContext(ctx)
	if err != nil {
		response.Unauthorized(w, "User not authenticated")
		return
	}

	// Parse claim ID from URL
	claimID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.BadRequest(w, "Invalid claim ID")
		return
	}

	// Parse optional request body
	var req ClaimApprovalRequest
	if r.Body != nil && r.ContentLength > 0 {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			response.BadRequest(w, "Invalid request body")
			return
		}
	}

	// Parse expiration date if provided
	var expiresAt *time.Time
	if req.ExpiresAt != nil {
		t, err := time.Parse(time.RFC3339, *req.ExpiresAt)
		if err != nil {
			response.BadRequest(w, "Invalid expires_at format. Use ISO 8601 (RFC3339)")
			return
		}
		expiresAt = &t
	}

	// Approve via service
	if err := h.claimsService.Approve(ctx, claimID, userID, expiresAt, req.Notes); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("claim_id", claimID.String()).
			Msg("Failed to approve claim")
		if strings.Contains(err.Error(), "not found") {
			response.NotFound(w, "Claim not found")
			return
		}
		if strings.Contains(err.Error(), "already approved") {
			response.BadRequest(w, "Claim is already approved")
			return
		}
		response.InternalError(w, "Failed to approve claim", requestID)
		return
	}

	// Fetch updated claim
	claim, err := h.claimsService.GetByID(ctx, claimID)
	if err != nil {
		response.InternalError(w, "Failed to retrieve approved claim", requestID)
		return
	}

	log.Info().
		Str("request_id", requestID).
		Str("claim_id", claimID.String()).
		Str("user_id", userID.String()).
		Msg("Claim approved")

	response.Success(w, claimToResponse(claim))
}

// Reject handles POST /v1/claims/{id}/reject - rejects a claim
func (h *ClaimsLibraryHandler) Reject(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get user ID from context
	userID, err := middleware.GetUserIDFromContext(ctx)
	if err != nil {
		response.Unauthorized(w, "User not authenticated")
		return
	}

	// Parse claim ID from URL
	claimID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.BadRequest(w, "Invalid claim ID")
		return
	}

	// Parse request body
	var req ClaimRejectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	if req.Reason == "" {
		response.BadRequest(w, "Rejection reason is required")
		return
	}

	// Reject via service
	if err := h.claimsService.Reject(ctx, claimID, userID, req.Reason); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("claim_id", claimID.String()).
			Msg("Failed to reject claim")
		if strings.Contains(err.Error(), "not found") {
			response.NotFound(w, "Claim not found")
			return
		}
		response.InternalError(w, "Failed to reject claim", requestID)
		return
	}

	// Fetch updated claim
	claim, err := h.claimsService.GetByID(ctx, claimID)
	if err != nil {
		response.InternalError(w, "Failed to retrieve rejected claim", requestID)
		return
	}

	log.Info().
		Str("request_id", requestID).
		Str("claim_id", claimID.String()).
		Str("user_id", userID.String()).
		Str("reason", req.Reason).
		Msg("Claim rejected")

	response.Success(w, claimToResponse(claim))
}

// GetCategories handles GET /v1/claims/categories - returns all claim categories
func (h *ClaimsLibraryHandler) GetCategories(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	categories, err := h.claimsService.ListCategories(ctx)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to get categories")
		response.InternalError(w, "Failed to retrieve categories", requestID)
		return
	}

	response.Success(w, categories)
}

// ValidateContent handles POST /v1/claims/validate - validates content against do-not-say items
func (h *ClaimsLibraryHandler) ValidateContent(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Parse request body
	var req ClaimValidationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	if req.Content == "" {
		response.BadRequest(w, "Content is required for validation")
		return
	}

	// Validate via service
	result, err := h.claimsService.ValidateContent(ctx, req.Content, req.BlockID)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to validate content")
		response.InternalError(w, "Failed to validate content", requestID)
		return
	}

	response.Success(w, result)
}

// RecordUsage handles POST /v1/claims/{id}/usage - records usage of a claim
func (h *ClaimsLibraryHandler) RecordUsage(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Parse claim ID from URL
	claimID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.BadRequest(w, "Invalid claim ID")
		return
	}

	// Record usage via service (TrackUsage takes a slice)
	if err := h.claimsService.TrackUsage(ctx, []uuid.UUID{claimID}); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("claim_id", claimID.String()).
			Msg("Failed to record usage")
		if strings.Contains(err.Error(), "not found") {
			response.NotFound(w, "Claim not found")
			return
		}
		response.InternalError(w, "Failed to record usage", requestID)
		return
	}

	response.NoContent(w)
}

// Search handles GET /v1/claims/search - searches claims by text
func (h *ClaimsLibraryHandler) Search(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	query := r.URL.Query().Get("q")
	if query == "" {
		response.BadRequest(w, "Search query 'q' is required")
		return
	}

	limit, err := parseIntQuery(r, "limit", 20)
	if err != nil {
		response.BadRequest(w, "Invalid limit parameter")
		return
	}
	if limit > 100 {
		limit = 100
	}

	claims, err := h.claimsService.SearchClaims(ctx, query, limit)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("query", query).
			Msg("Failed to search claims")
		response.InternalError(w, "Failed to search claims", requestID)
		return
	}

	// Convert to response DTOs
	claimResponses := make([]ClaimResponse, len(claims))
	for i, claim := range claims {
		claimResponses[i] = claimToResponse(claim)
	}

	response.Success(w, claimResponses)
}

// Helper function to convert domain claim to response
func claimToResponse(claim *domain.ClaimsLibraryEntry) ClaimResponse {
	tags := claim.Tags
	if tags == nil {
		tags = []string{}
	}
	return ClaimResponse{
		ID:              claim.ID,
		ClaimText:       claim.ClaimText,
		ClaimType:       string(claim.ClaimType),
		Category:        claim.Category,
		ApprovalStatus:  string(claim.ApprovalStatus),
		ApprovedBy:      claim.ApprovedBy,
		ApprovedAt:      claim.ApprovedAt,
		ExpiresAt:       claim.ExpiresAt,
		RejectionReason: claim.RejectionReason,
		SourceReference: claim.SourceReference,
		UsageCount:      claim.UsageCount,
		LastUsedAt:      claim.LastUsedAt,
		Tags:            tags,
		Notes:           claim.Notes,
		CreatedBy:       claim.CreatedBy,
		CreatedAt:       claim.CreatedAt,
		UpdatedAt:       claim.UpdatedAt,
		IsExpired:       claim.IsExpired(),
		IsUsable:        claim.IsUsable(),
	}
}
