package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/phillipboles/aci-backend/internal/api/dto"
	"github.com/phillipboles/aci-backend/internal/api/middleware"
	"github.com/phillipboles/aci-backend/internal/api/response"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/repository"
	"github.com/phillipboles/aci-backend/internal/service"
)

// ApprovalHandler handles article approval workflow HTTP requests
type ApprovalHandler struct {
	approvalService *service.ApprovalService
	logger          zerolog.Logger
}

// NewApprovalHandler creates a new approval handler
func NewApprovalHandler(approvalService *service.ApprovalService, logger zerolog.Logger) *ApprovalHandler {
	if approvalService == nil {
		panic("approvalService cannot be nil")
	}

	return &ApprovalHandler{
		approvalService: approvalService,
		logger:          logger,
	}
}

// GetQueue handles GET /api/v1/approvals/queue
// Returns articles pending approval at the gate corresponding to the authenticated user's role
func (h *ApprovalHandler) GetQueue(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get user from context
	user, err := middleware.GetDomainUserFromContext(ctx)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Parse query parameters
	opts, err := parseApprovalQueueOptions(r)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to parse queue options")
		response.BadRequestWithDetails(w, "Invalid query parameters", err.Error(), requestID)
		return
	}

	// Get approval queue based on role
	var articles []domain.Article
	var total int

	// Admin sees all pending articles
	if user.Role == domain.RoleAdmin || user.Role == domain.RoleSuperAdmin {
		articles, total, err = h.approvalService.GetAllPendingArticles(ctx, opts)
	} else {
		articles, total, err = h.approvalService.GetQueueForUser(ctx, user.Role, opts)
	}

	if err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Str("user_id", user.ID.String()).
			Str("role", string(user.Role)).
			Msg("Failed to get approval queue")
		response.InternalError(w, "Failed to retrieve approval queue", requestID)
		return
	}

	// Convert to DTOs
	articleDTOs := make([]dto.ArticleForApprovalDTO, len(articles))
	for i := range articles {
		// Note: These fields will be populated by the service layer
		// when the Article struct is updated with approval fields
		articleDTOs[i] = dto.ArticleToApprovalDTO(
			&articles[i],
			domain.StatusPendingMarketing, // Placeholder - will be populated from article
			false,                         // Placeholder - will be populated from article
			[]domain.ArticleApproval{},    // Placeholder - will be populated from service
		)
	}

	// Build response
	targetGate := user.Role.GetTargetGate()

	resp := dto.ApprovalQueueResponse{
		Data: articleDTOs,
		Pagination: dto.PaginationDTO{
			Page:       opts.Page,
			PageSize:   opts.PageSize,
			TotalItems: total,
			TotalPages: CalculateTotalPages(total, opts.PageSize),
		},
		Meta: dto.ApprovalQueueMetaDTO{
			UserRole:   string(user.Role),
			TargetGate: string(targetGate),
			QueueCount: total,
		},
	}

	response.Success(w, resp)
}

// Approve handles POST /api/v1/articles/{articleId}/approve
// Approves an article at the current gate and advances to the next gate
func (h *ApprovalHandler) Approve(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get user from context
	user, err := middleware.GetDomainUserFromContext(ctx)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Parse article ID from URL
	articleIDStr := chi.URLParam(r, "articleId")
	if articleIDStr == "" {
		response.BadRequest(w, "Article ID is required")
		return
	}

	articleID, err := uuid.Parse(articleIDStr)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Str("article_id", articleIDStr).
			Msg("Invalid article ID format")
		response.BadRequest(w, "Invalid article ID format")
		return
	}

	// Parse optional request body
	var req dto.ApproveRequest
	if r.Body != nil && r.ContentLength > 0 {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			h.logger.Warn().
				Err(err).
				Str("request_id", requestID).
				Msg("Failed to decode approve request body")
			// Continue with empty notes - body is optional
		}
	}

	// Validate notes length if provided
	if req.Notes != "" && len(req.Notes) > 1000 {
		response.BadRequest(w, "Notes cannot exceed 1000 characters")
		return
	}

	// Call service to approve article
	if err := h.approvalService.ApproveArticle(ctx, articleID, user.ID, user.Role, req.Notes); err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Str("article_id", articleID.String()).
			Str("user_id", user.ID.String()).
			Msg("Failed to approve article")

		// Handle specific error types
		if isInvalidGateError(err) {
			response.BadRequestWithDetails(w, "Invalid approval gate", err.Error(), requestID)
			return
		}
		if isAlreadyRejectedError(err) {
			response.BadRequestWithDetails(w, "Article has already been rejected", err.Error(), requestID)
			return
		}
		if isNotFoundError(err) {
			response.NotFound(w, "Article not found")
			return
		}

		response.InternalError(w, "Failed to approve article", requestID)
		return
	}

	// Build success response
	resp := dto.ApprovalActionResponse{
		Success: true,
		Message: "Article approved successfully",
		Article: &dto.ArticleStatusDTO{
			ID:             articleID.String(),
			ApprovalStatus: string(domain.StatusPendingMarketing), // Will be updated by service
			Rejected:       false,
		},
	}

	response.Success(w, resp)
}

// Reject handles POST /api/v1/articles/{articleId}/reject
// Marks an article as rejected with a mandatory reason
func (h *ApprovalHandler) Reject(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get user from context
	user, err := middleware.GetDomainUserFromContext(ctx)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Parse article ID from URL
	articleIDStr := chi.URLParam(r, "articleId")
	if articleIDStr == "" {
		response.BadRequest(w, "Article ID is required")
		return
	}

	articleID, err := uuid.Parse(articleIDStr)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Str("article_id", articleIDStr).
			Msg("Invalid article ID format")
		response.BadRequest(w, "Invalid article ID format")
		return
	}

	// Parse required request body
	var req dto.RejectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to decode reject request body")
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Validate reason is provided
	if req.Reason == "" {
		response.BadRequestWithDetails(w, "Rejection reason is required", "MISSING_REASON", requestID)
		return
	}

	// Validate reason length
	if len(req.Reason) < 10 {
		response.BadRequest(w, "Rejection reason must be at least 10 characters")
		return
	}

	if len(req.Reason) > 2000 {
		response.BadRequest(w, "Rejection reason cannot exceed 2000 characters")
		return
	}

	// Call service to reject article
	if err := h.approvalService.RejectArticle(ctx, articleID, user.ID, user.Role, req.Reason); err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Str("article_id", articleID.String()).
			Str("user_id", user.ID.String()).
			Msg("Failed to reject article")

		// Handle specific error types
		if isAlreadyRejectedError(err) {
			response.BadRequestWithDetails(w, "Article has already been rejected", "ALREADY_REJECTED", requestID)
			return
		}
		if isNotFoundError(err) {
			response.NotFound(w, "Article not found")
			return
		}

		response.InternalError(w, "Failed to reject article", requestID)
		return
	}

	// Build success response
	resp := dto.ApprovalActionResponse{
		Success: true,
		Message: "Article rejected successfully",
		Article: &dto.ArticleStatusDTO{
			ID:             articleID.String(),
			ApprovalStatus: string(domain.StatusRejected),
			Rejected:       true,
		},
	}

	response.Success(w, resp)
}

// Release handles POST /api/v1/articles/{articleId}/release
// Publishes a fully-approved article for public viewing
func (h *ApprovalHandler) Release(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get user from context
	user, err := middleware.GetDomainUserFromContext(ctx)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Parse article ID from URL
	articleIDStr := chi.URLParam(r, "articleId")
	if articleIDStr == "" {
		response.BadRequest(w, "Article ID is required")
		return
	}

	articleID, err := uuid.Parse(articleIDStr)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Str("article_id", articleIDStr).
			Msg("Invalid article ID format")
		response.BadRequest(w, "Invalid article ID format")
		return
	}

	// Call service to release article
	if err := h.approvalService.ReleaseArticle(ctx, articleID, user.ID, user.Role); err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Str("article_id", articleID.String()).
			Str("user_id", user.ID.String()).
			Msg("Failed to release article")

		// Handle specific error types
		if isNotFullyApprovedError(err) {
			response.BadRequestWithDetails(w, "Article must pass all approval gates before release", "NOT_FULLY_APPROVED", requestID)
			return
		}
		if isNotFoundError(err) {
			response.NotFound(w, "Article not found")
			return
		}

		response.InternalError(w, "Failed to release article", requestID)
		return
	}

	// Build success response
	resp := dto.ApprovalActionResponse{
		Success: true,
		Message: "Article released successfully",
		Article: &dto.ArticleStatusDTO{
			ID:             articleID.String(),
			ApprovalStatus: string(domain.StatusReleased),
			Rejected:       false,
		},
	}

	response.Success(w, resp)
}

// Reset handles POST /api/v1/articles/{articleId}/reset
// Admin-only endpoint to reset a rejected article back to initial state
func (h *ApprovalHandler) Reset(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get user from context
	user, err := middleware.GetDomainUserFromContext(ctx)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Parse article ID from URL
	articleIDStr := chi.URLParam(r, "articleId")
	if articleIDStr == "" {
		response.BadRequest(w, "Article ID is required")
		return
	}

	articleID, err := uuid.Parse(articleIDStr)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Str("article_id", articleIDStr).
			Msg("Invalid article ID format")
		response.BadRequest(w, "Invalid article ID format")
		return
	}

	// Call service to reset article
	if err := h.approvalService.ResetArticle(ctx, articleID, user.ID, user.Role); err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Str("article_id", articleID.String()).
			Str("user_id", user.ID.String()).
			Msg("Failed to reset article")

		// Handle specific error types
		if isNotRejectedError(err) {
			response.BadRequest(w, "Article is not rejected")
			return
		}
		if isNotFoundError(err) {
			response.NotFound(w, "Article not found")
			return
		}

		response.InternalError(w, "Failed to reset article", requestID)
		return
	}

	// Build success response
	resp := dto.ApprovalActionResponse{
		Success: true,
		Message: "Article reset successfully",
		Article: &dto.ArticleStatusDTO{
			ID:             articleID.String(),
			ApprovalStatus: string(domain.StatusPendingMarketing),
			Rejected:       false,
		},
	}

	response.Success(w, resp)
}

// GetHistory handles GET /api/v1/articles/{articleId}/approval-history
// Returns all gate approvals and rejection details for an article
func (h *ApprovalHandler) GetHistory(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Parse article ID from URL
	articleIDStr := chi.URLParam(r, "articleId")
	if articleIDStr == "" {
		response.BadRequest(w, "Article ID is required")
		return
	}

	articleID, err := uuid.Parse(articleIDStr)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Str("article_id", articleIDStr).
			Msg("Invalid article ID format")
		response.BadRequest(w, "Invalid article ID format")
		return
	}

	// Get approval history from service
	approvals, err := h.approvalService.GetApprovalHistory(ctx, articleID)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Str("article_id", articleID.String()).
			Msg("Failed to get approval history")

		if isNotFoundError(err) {
			response.NotFound(w, "Article not found")
			return
		}

		response.InternalError(w, "Failed to retrieve approval history", requestID)
		return
	}

	// Convert to DTOs
	approvalDTOs := make([]dto.ArticleApprovalDTO, len(approvals))
	for i, approval := range approvals {
		approvalDTOs[i] = dto.ApprovalToDTO(&approval)
	}

	// Build response (simplified - full history will be built when ApprovalHistory domain type is created)
	historyResp := dto.ApprovalHistoryResponse{
		ArticleID:     articleID.String(),
		CurrentStatus: string(domain.StatusPendingMarketing), // Will be populated from article
		Rejected:      false,                                 // Will be populated from article
		Approvals:     approvalDTOs,
		Progress:      dto.BuildApprovalProgress(domain.StatusPendingMarketing, approvals),
	}

	response.Success(w, historyResp)
}

// parseApprovalQueueOptions extracts and validates query parameters for approval queue
func parseApprovalQueueOptions(r *http.Request) (repository.QueryOptions, error) {
	opts := repository.QueryOptions{
		Page:      1,
		PageSize:  20,
		SortBy:    "created_at",
		SortOrder: "desc",
	}

	query := r.URL.Query()

	// Parse pagination
	if pageStr := query.Get("page"); pageStr != "" {
		page, err := strconv.Atoi(pageStr)
		if err != nil {
			return opts, fmt.Errorf("invalid page parameter: %w", err)
		}
		if page < 1 {
			return opts, fmt.Errorf("page must be at least 1")
		}
		opts.Page = page
	}

	if pageSizeStr := query.Get("page_size"); pageSizeStr != "" {
		pageSize, err := strconv.Atoi(pageSizeStr)
		if err != nil {
			return opts, fmt.Errorf("invalid page_size parameter: %w", err)
		}
		if pageSize < 1 {
			return opts, fmt.Errorf("page_size must be at least 1")
		}
		if pageSize > 100 {
			return opts, fmt.Errorf("page_size cannot exceed 100")
		}
		opts.PageSize = pageSize
	}

	// Parse sort_by
	if sortBy := query.Get("sort_by"); sortBy != "" {
		validSortFields := map[string]bool{
			"created_at": true,
			"severity":   true,
			"category":   true,
		}
		if !validSortFields[sortBy] {
			return opts, fmt.Errorf("invalid sort_by parameter: must be created_at, severity, or category")
		}
		opts.SortBy = sortBy
	}

	// Parse sort_order
	if sortOrder := query.Get("sort_order"); sortOrder != "" {
		if sortOrder != "asc" && sortOrder != "desc" {
			return opts, fmt.Errorf("invalid sort_order parameter: must be asc or desc")
		}
		opts.SortOrder = sortOrder
	}

	// Parse category_id
	if categoryIDStr := query.Get("category_id"); categoryIDStr != "" {
		categoryID, err := uuid.Parse(categoryIDStr)
		if err != nil {
			return opts, fmt.Errorf("invalid category_id parameter: %w", err)
		}
		opts.CategoryID = &categoryID
	}

	// Parse severity
	if severityStr := query.Get("severity"); severityStr != "" {
		opts.Severity = &severityStr
	}

	// Parse date_from
	if dateFromStr := query.Get("date_from"); dateFromStr != "" {
		dateFrom, err := time.Parse(time.RFC3339, dateFromStr)
		if err != nil {
			return opts, fmt.Errorf("invalid date_from parameter (use RFC3339 format): %w", err)
		}
		opts.DateFrom = &dateFrom
	}

	// Parse date_to
	if dateToStr := query.Get("date_to"); dateToStr != "" {
		dateTo, err := time.Parse(time.RFC3339, dateToStr)
		if err != nil {
			return opts, fmt.Errorf("invalid date_to parameter (use RFC3339 format): %w", err)
		}
		opts.DateTo = &dateTo
	}

	return opts, nil
}

// Error type helpers
func isNotFoundError(err error) bool {
	if err == nil {
		return false
	}
	// Check if error message contains "not found"
	return contains(err.Error(), "not found")
}

func isInvalidGateError(err error) bool {
	if err == nil {
		return false
	}
	return contains(err.Error(), "invalid gate") || contains(err.Error(), "wrong gate")
}

func isAlreadyRejectedError(err error) bool {
	if err == nil {
		return false
	}
	return contains(err.Error(), "already rejected")
}

func isNotFullyApprovedError(err error) bool {
	if err == nil {
		return false
	}
	return contains(err.Error(), "not fully approved") || contains(err.Error(), "missing approvals")
}

func isNotRejectedError(err error) bool {
	if err == nil {
		return false
	}
	return contains(err.Error(), "not rejected")
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || findSubstring(s, substr))
}

func findSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
