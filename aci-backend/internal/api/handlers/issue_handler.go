package handlers

import (
	"encoding/json"
	"html"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/phillipboles/aci-backend/internal/api/middleware"
	"github.com/phillipboles/aci-backend/internal/api/response"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/repository"
	"github.com/phillipboles/aci-backend/internal/service"
)

// IssueHandler handles newsletter issue HTTP requests
type IssueHandler struct {
	generationService *service.GenerationService
	brandVoiceService *service.BrandVoiceService
	approvalService   *service.ApprovalService
	contactRepo       repository.ContactRepository
}

// NewIssueHandler creates a new newsletter issue handler
func NewIssueHandler(
	generationService *service.GenerationService,
	brandVoiceService *service.BrandVoiceService,
	approvalService *service.ApprovalService,
	contactRepo repository.ContactRepository,
) *IssueHandler {
	if generationService == nil {
		panic("generationService cannot be nil")
	}
	if brandVoiceService == nil {
		panic("brandVoiceService cannot be nil")
	}
	if approvalService == nil {
		panic("approvalService cannot be nil")
	}
	if contactRepo == nil {
		panic("contactRepo cannot be nil")
	}

	return &IssueHandler{
		generationService: generationService,
		brandVoiceService: brandVoiceService,
		approvalService:   approvalService,
		contactRepo:       contactRepo,
	}
}

// ============================================================================
// Issue CRUD Operations
// ============================================================================

// ListIssues handles GET /v1/newsletter-issues
func (h *IssueHandler) ListIssues(w http.ResponseWriter, r *http.Request) {
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
	filter := &domain.NewsletterIssueFilter{
		Limit:  pageSize,
		Offset: (page - 1) * pageSize,
	}

	// Parse optional filters
	if status := r.URL.Query().Get("status"); status != "" {
		s := domain.IssueStatus(status)
		if !s.IsValid() {
			response.BadRequest(w, "Invalid status parameter")
			return
		}
		filter.Status = &s
	}

	if configID := r.URL.Query().Get("configuration_id"); configID != "" {
		cid, err := uuid.Parse(configID)
		if err != nil {
			response.BadRequest(w, "Invalid configuration_id parameter")
			return
		}
		filter.ConfigurationID = &cid
	}

	if segmentID := r.URL.Query().Get("segment_id"); segmentID != "" {
		sid, err := uuid.Parse(segmentID)
		if err != nil {
			response.BadRequest(w, "Invalid segment_id parameter")
			return
		}
		filter.SegmentID = &sid
	}

	if startDate := r.URL.Query().Get("start_date"); startDate != "" {
		t, err := time.Parse("2006-01-02", startDate)
		if err != nil {
			response.BadRequest(w, "Invalid start_date parameter (use YYYY-MM-DD format)")
			return
		}
		filter.StartDate = &t
	}

	if endDate := r.URL.Query().Get("end_date"); endDate != "" {
		t, err := time.Parse("2006-01-02", endDate)
		if err != nil {
			response.BadRequest(w, "Invalid end_date parameter (use YYYY-MM-DD format)")
			return
		}
		filter.EndDate = &t
	}

	issues, total, err := h.generationService.ListIssues(ctx, filter)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to list newsletter issues")
		response.InternalError(w, "Failed to retrieve newsletter issues", requestID)
		return
	}

	totalPages := (total + pageSize - 1) / pageSize

	resp := map[string]interface{}{
		"data": issues,
		"pagination": map[string]interface{}{
			"page":        page,
			"page_size":   pageSize,
			"total_items": total,
			"total_pages": totalPages,
		},
	}

	response.JSON(w, http.StatusOK, resp)
}

// GetIssue handles GET /v1/newsletter-issues/{id}
func (h *IssueHandler) GetIssue(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.BadRequest(w, "Invalid issue ID")
		return
	}

	issue, err := h.generationService.GetIssueByID(ctx, id)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Str("id", id.String()).Msg("Failed to get newsletter issue")
		response.NotFound(w, "Newsletter issue not found")
		return
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{"data": issue})
}

// CreateIssue handles POST /v1/newsletter-issues/generate
func (h *IssueHandler) CreateIssue(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	var req GenerateIssueRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	if req.ConfigurationID == uuid.Nil {
		response.BadRequest(w, "configuration_id is required")
		return
	}

	if req.SegmentID == uuid.Nil {
		response.BadRequest(w, "segment_id is required")
		return
	}

	// Get user from context
	userID := getUserIDFromContext(ctx)

	// Only set CreatedBy if we have a valid user ID
	var createdBy *uuid.UUID
	if userID != uuid.Nil {
		createdBy = &userID
	}

	genReq := &service.GenerationRequest{
		ConfigurationID: req.ConfigurationID,
		SegmentID:       req.SegmentID,
		IssueDate:       req.IssueDate,
		CreatedBy:       createdBy,
		TopicOverrides:  req.TopicOverrides,
		HeroContentID:   req.HeroContentID,
		ExcludeItemIDs:  req.ExcludeItemIDs,
	}

	result, err := h.generationService.CreateDraftIssue(ctx, genReq)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to generate newsletter issue")
		response.BadRequestWithDetails(w, "Failed to generate newsletter issue", err.Error(), requestID)
		return
	}

	response.JSON(w, http.StatusCreated, map[string]interface{}{"data": result})
}

// UpdateIssue handles PUT /v1/newsletter-issues/{id}
func (h *IssueHandler) UpdateIssue(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.BadRequest(w, "Invalid issue ID")
		return
	}

	var req UpdateIssueRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Get existing issue
	issue, err := h.generationService.GetIssueByID(ctx, id)
	if err != nil {
		response.NotFound(w, "Newsletter issue not found")
		return
	}

	// Update fields
	if req.SelectedSubjectLine != nil {
		issue.SelectedSubjectLine = req.SelectedSubjectLine
	}
	if req.Preheader != nil {
		issue.Preheader = req.Preheader
	}
	if req.IntroTemplate != nil {
		issue.IntroTemplate = req.IntroTemplate
	}
	if req.ScheduledFor != nil {
		issue.ScheduledFor = req.ScheduledFor
	}

	if err := h.generationService.UpdateIssue(ctx, issue); err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to update newsletter issue")
		response.BadRequestWithDetails(w, "Failed to update newsletter issue", err.Error(), requestID)
		return
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{"data": issue})
}

// DeleteIssue handles DELETE /v1/newsletter-issues/{id}
func (h *IssueHandler) DeleteIssue(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.BadRequest(w, "Invalid issue ID")
		return
	}

	if err := h.generationService.DeleteIssue(ctx, id); err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to delete newsletter issue")
		response.InternalError(w, "Failed to delete newsletter issue", requestID)
		return
	}

	response.NoContent(w)
}

// ============================================================================
// Subject Line Operations
// ============================================================================

// SelectSubjectLine handles POST /v1/newsletter-issues/{id}/select-subject-line
func (h *IssueHandler) SelectSubjectLine(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.BadRequest(w, "Invalid issue ID")
		return
	}

	var req SelectSubjectLineRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	if req.SubjectLine == "" {
		response.BadRequest(w, "subject_line is required")
		return
	}

	if err := h.generationService.SelectSubjectLine(ctx, id, req.SubjectLine); err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to select subject line")
		response.BadRequestWithDetails(w, "Failed to select subject line", err.Error(), requestID)
		return
	}

	issue, _ := h.generationService.GetIssueByID(ctx, id)
	response.JSON(w, http.StatusOK, map[string]interface{}{"data": issue})
}

// RegenerateSubjectLines handles POST /v1/newsletter-issues/{id}/regenerate-subject-lines
func (h *IssueHandler) RegenerateSubjectLines(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.BadRequest(w, "Invalid issue ID")
		return
	}

	var req RegenerateSubjectLinesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	var style *domain.SubjectLineStyle
	if req.Style != "" {
		s := domain.SubjectLineStyle(req.Style)
		if !s.IsValid() {
			response.BadRequest(w, "Invalid style parameter")
			return
		}
		style = &s
	}

	if err := h.generationService.RegenerateSubjectLines(ctx, id, style); err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to regenerate subject lines")
		response.BadRequestWithDetails(w, "Failed to regenerate subject lines", err.Error(), requestID)
		return
	}

	issue, _ := h.generationService.GetIssueByID(ctx, id)
	response.JSON(w, http.StatusOK, map[string]interface{}{"data": issue})
}

// ============================================================================
// Approval Workflow
// ============================================================================

// SubmitForApproval handles POST /v1/newsletter-issues/{id}/submit
func (h *IssueHandler) SubmitForApproval(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.BadRequest(w, "Invalid issue ID")
		return
	}

	if err := h.approvalService.SubmitForApproval(ctx, id); err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to submit issue for approval")
		response.BadRequestWithDetails(w, "Failed to submit for approval", err.Error(), requestID)
		return
	}

	issue, err := h.generationService.GetIssueByID(ctx, id)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to retrieve issue after submission")
		response.InternalError(w, "Issue submitted but failed to retrieve updated status", requestID)
		return
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"data":    issue,
		"message": "Issue submitted for approval",
	})
}

// ApproveIssue handles POST /v1/newsletter-issues/{id}/approve
func (h *IssueHandler) ApproveIssue(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.BadRequest(w, "Invalid issue ID")
		return
	}

	var req ApproveIssueRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	approverID := getUserIDFromContext(ctx)
	if approverID == uuid.Nil {
		response.Unauthorized(w, "User authentication required")
		return
	}

	if err := h.approvalService.ApproveIssue(ctx, id, approverID, req.Notes); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("issue_id", id.String()).
			Str("approver_id", approverID.String()).
			Msg("Failed to approve issue")
		response.BadRequestWithDetails(w, "Failed to approve issue", err.Error(), requestID)
		return
	}

	issue, err := h.generationService.GetIssueByID(ctx, id)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to retrieve issue after approval")
		response.InternalError(w, "Issue approved but failed to retrieve updated status", requestID)
		return
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"data":    issue,
		"message": "Issue approved successfully",
	})
}

// RejectIssue handles POST /v1/newsletter-issues/{id}/reject
func (h *IssueHandler) RejectIssue(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.BadRequest(w, "Invalid issue ID")
		return
	}

	var req RejectIssueRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	if req.Reason == "" {
		response.BadRequest(w, "rejection reason is required")
		return
	}

	approverID := getUserIDFromContext(ctx)
	if approverID == uuid.Nil {
		response.Unauthorized(w, "User authentication required")
		return
	}

	if err := h.approvalService.RejectIssue(ctx, id, approverID, req.Reason); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("issue_id", id.String()).
			Str("approver_id", approverID.String()).
			Msg("Failed to reject issue")
		response.BadRequestWithDetails(w, "Failed to reject issue", err.Error(), requestID)
		return
	}

	issue, err := h.generationService.GetIssueByID(ctx, id)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to retrieve issue after rejection")
		response.InternalError(w, "Issue rejected but failed to retrieve updated status", requestID)
		return
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"data":    issue,
		"message": "Issue rejected and returned to draft",
	})
}

// GetPendingApprovals handles GET /v1/newsletter-issues/pending?tier=<tier>
func (h *IssueHandler) GetPendingApprovals(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	var tier *domain.ApprovalTier
	if tierStr := r.URL.Query().Get("tier"); tierStr != "" {
		t := domain.ApprovalTier(tierStr)
		if !t.IsValid() {
			response.BadRequest(w, "Invalid tier parameter")
			return
		}
		tier = &t
	}

	issues, err := h.approvalService.GetPendingApprovals(ctx, tier)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to get pending approvals")
		response.InternalError(w, "Failed to retrieve pending approvals", requestID)
		return
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"data": issues,
		"meta": map[string]interface{}{
			"count": len(issues),
			"tier":  tier,
		},
	})
}

// ============================================================================
// Personalization Operations
// ============================================================================

// PreviewIssue handles GET /v1/newsletter-issues/{id}/preview?contact_id={contact_id}
// FR-031: Support personalized previews with contact-specific context
// SEC-004: Validates user has appropriate role to preview newsletter issues
func (h *IssueHandler) PreviewIssue(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// SEC-004: Validate user has preview permission
	// Only users with marketing, branding, admin, or super_admin roles can preview
	user, err := middleware.GetDomainUserFromContext(ctx)
	if err != nil {
		log.Warn().
			Err(err).
			Str("request_id", requestID).
			Msg("SEC-004: Failed to get user from context for preview")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Check if user role is allowed to preview
	allowedRoles := []domain.UserRole{
		domain.RoleMarketing,
		domain.RoleBranding,
		domain.RoleAdmin,
		domain.RoleSuperAdmin,
		domain.RoleCISO,
	}

	hasPermission := false
	for _, role := range allowedRoles {
		if user.Role == role {
			hasPermission = true
			break
		}
	}

	if !hasPermission {
		log.Warn().
			Str("request_id", requestID).
			Str("user_id", user.ID.String()).
			Str("user_role", string(user.Role)).
			Msg("SEC-004: User lacks permission to preview newsletter issues")
		response.Forbidden(w, "Insufficient permissions to preview newsletter issues")
		return
	}

	// Parse issue ID
	issueID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.BadRequest(w, "Invalid issue ID")
		return
	}

	// Check for optional contact_id query parameter
	contactIDStr := r.URL.Query().Get("contact_id")

	// If contact_id is provided, return personalized preview
	if contactIDStr != "" {
		contactID, err := uuid.Parse(contactIDStr)
		if err != nil {
			response.BadRequest(w, "Invalid contact_id parameter")
			return
		}

		personalizedIssue, err := h.generationService.ApplyPersonalization(ctx, issueID, contactID)
		if err != nil {
			log.Error().Err(err).
				Str("request_id", requestID).
				Str("issue_id", issueID.String()).
				Str("contact_id", contactID.String()).
				Msg("Failed to apply personalization")

			// Check if contact not found
			if err.Error() == "failed to get contact: contact not found" {
				response.NotFound(w, "Contact not found")
				return
			}

			response.InternalError(w, "Failed to generate personalized preview", requestID)
			return
		}

		// Generate HTML preview from personalized issue
		htmlPreview := h.generateHTMLPreview(personalizedIssue)

		response.JSON(w, http.StatusOK, map[string]interface{}{
			"data": map[string]interface{}{
				"issue":        personalizedIssue,
				"html_preview": htmlPreview,
				"personalized": true,
				"contact_id":   contactID,
			},
		})
		return
	}

	// No contact_id provided, return generic preview
	issue, err := h.generationService.GetIssueByID(ctx, issueID)
	if err != nil {
		log.Error().Err(err).
			Str("request_id", requestID).
			Str("issue_id", issueID.String()).
			Msg("Failed to get issue for preview")
		response.NotFound(w, "Newsletter issue not found")
		return
	}

	// Generate generic HTML preview
	htmlPreview := h.generateHTMLPreview(issue)

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"data": map[string]interface{}{
			"issue":        issue,
			"html_preview": htmlPreview,
			"personalized": false,
		},
	})
}

// GetPersonalizationContext handles GET /v1/newsletter/contacts/{id}/personalization-context
// Returns the personalization context map for debugging/preview purposes
// SEC-004: Validates user has appropriate role to view contact personalization context
func (h *IssueHandler) GetPersonalizationContext(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// SEC-004: Validate user has permission to view personalization context
	user, err := middleware.GetDomainUserFromContext(ctx)
	if err != nil {
		log.Warn().
			Err(err).
			Str("request_id", requestID).
			Msg("SEC-004: Failed to get user from context for personalization context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Check if user role is allowed to view personalization context
	allowedRoles := []domain.UserRole{
		domain.RoleMarketing,
		domain.RoleBranding,
		domain.RoleAdmin,
		domain.RoleSuperAdmin,
	}

	hasPermission := false
	for _, role := range allowedRoles {
		if user.Role == role {
			hasPermission = true
			break
		}
	}

	if !hasPermission {
		log.Warn().
			Str("request_id", requestID).
			Str("user_id", user.ID.String()).
			Str("user_role", string(user.Role)).
			Msg("SEC-004: User lacks permission to view personalization context")
		response.Forbidden(w, "Insufficient permissions to view personalization context")
		return
	}

	contactID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.BadRequest(w, "Invalid contact ID")
		return
	}

	// Fetch contact
	contact, err := h.contactRepo.GetByID(ctx, contactID)
	if err != nil {
		log.Error().Err(err).
			Str("request_id", requestID).
			Str("contact_id", contactID.String()).
			Msg("Failed to get contact")
		response.NotFound(w, "Contact not found")
		return
	}

	// Build personalization context
	context := h.generationService.BuildPersonalizationContext(contact)

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"data": map[string]interface{}{
			"contact_id":       contactID,
			"context":          context,
			"available_tokens": h.extractAvailableTokens(context),
		},
	})
}

// ============================================================================
// Brand Voice Validation
// ============================================================================

// ValidateBrandVoice handles POST /v1/newsletter-issues/{id}/validate
func (h *IssueHandler) ValidateBrandVoice(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		response.BadRequest(w, "Invalid issue ID")
		return
	}

	issue, err := h.generationService.GetIssueByID(ctx, id)
	if err != nil {
		response.NotFound(w, "Newsletter issue not found")
		return
	}

	// Build content for validation
	content := &service.ContentToValidate{
		Blocks: make([]service.BlockContent, 0, len(issue.Blocks)),
	}

	if issue.SelectedSubjectLine != nil {
		content.SubjectLine = *issue.SelectedSubjectLine
	} else if len(issue.SubjectLines) > 0 {
		content.SubjectLine = issue.SubjectLines[0]
		if len(issue.SubjectLines) > 1 {
			content.AlternativeSubjectLines = issue.SubjectLines[1:]
		}
	}

	if issue.Preheader != nil {
		content.Preheader = *issue.Preheader
	}

	if issue.IntroTemplate != nil {
		content.Intro = *issue.IntroTemplate
	}

	for _, block := range issue.Blocks {
		bc := service.BlockContent{}
		if block.Title != nil {
			bc.Title = *block.Title
		}
		if block.Teaser != nil {
			bc.Teaser = *block.Teaser
		}
		if block.CTALabel != nil {
			bc.CTALabel = *block.CTALabel
		}
		content.Blocks = append(content.Blocks, bc)
	}

	result, err := h.brandVoiceService.ValidateCopy(ctx, issue.ConfigurationID, content)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to validate brand voice")
		response.InternalError(w, "Failed to validate brand voice", requestID)
		return
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{"data": result})
}

// ValidateCopy handles POST /v1/brand-voice/validate
func (h *IssueHandler) ValidateCopy(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	var req ValidateCopyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	if req.ConfigurationID == uuid.Nil {
		response.BadRequest(w, "configuration_id is required")
		return
	}

	content := &service.ContentToValidate{
		SubjectLine:             req.SubjectLine,
		AlternativeSubjectLines: req.AlternativeSubjectLines,
		Preheader:               req.Preheader,
		Intro:                   req.Intro,
		Blocks:                  make([]service.BlockContent, 0, len(req.Blocks)),
	}

	for _, b := range req.Blocks {
		content.Blocks = append(content.Blocks, service.BlockContent{
			Title:    b.Title,
			Teaser:   b.Teaser,
			CTALabel: b.CTALabel,
		})
	}

	result, err := h.brandVoiceService.ValidateCopy(ctx, req.ConfigurationID, content)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to validate copy")
		response.InternalError(w, "Failed to validate copy", requestID)
		return
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{"data": result})
}

// GetBannedPhrases handles GET /v1/brand-voice/banned-phrases
func (h *IssueHandler) GetBannedPhrases(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	var configID uuid.UUID
	if configIDStr := r.URL.Query().Get("configuration_id"); configIDStr != "" {
		var err error
		configID, err = uuid.Parse(configIDStr)
		if err != nil {
			response.BadRequest(w, "Invalid configuration_id parameter")
			return
		}
	}

	phrases, err := h.brandVoiceService.GetBannedPhrases(ctx, configID)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to get banned phrases")
		response.InternalError(w, "Failed to retrieve banned phrases", requestID)
		return
	}

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"data": phrases,
		"meta": map[string]interface{}{
			"count": len(phrases),
		},
	})
}

// ============================================================================
// Helper Methods
// ============================================================================

// sanitizeURL validates and sanitizes a URL to prevent XSS attacks
// HIGH-003: Only allows http://, https://, and mailto: protocols
func sanitizeURL(rawURL string) string {
	if rawURL == "" {
		return ""
	}

	// Trim whitespace and convert to lowercase for protocol check
	trimmed := strings.TrimSpace(rawURL)
	lowered := strings.ToLower(trimmed)

	// Allow only safe protocols
	if strings.HasPrefix(lowered, "http://") ||
		strings.HasPrefix(lowered, "https://") ||
		strings.HasPrefix(lowered, "mailto:") {
		// Return the original URL (preserving case) with HTML escaping
		return html.EscapeString(trimmed)
	}

	// Block dangerous protocols like javascript:, data:, vbscript:
	// Return empty string for unsafe URLs
	return ""
}

// generateHTMLPreview generates HTML preview from issue with XSS protection
// All user-controlled content is escaped using html.EscapeString
// URLs are additionally validated to prevent javascript: protocol injection
func (h *IssueHandler) generateHTMLPreview(issue *domain.NewsletterIssue) string {
	if issue == nil {
		return ""
	}

	output := "<html><head><style>"
	output += "body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }"
	output += ".subject { font-size: 18px; font-weight: bold; margin-bottom: 10px; }"
	output += ".preheader { font-size: 12px; color: #666; margin-bottom: 20px; }"
	output += ".intro { margin-bottom: 30px; line-height: 1.6; }"
	output += ".block { margin-bottom: 30px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }"
	output += ".block-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; }"
	output += ".block-teaser { line-height: 1.5; margin-bottom: 15px; }"
	output += ".cta { display: inline-block; padding: 10px 20px; background: #0066cc; color: white; text-decoration: none; border-radius: 3px; }"
	output += "</style></head><body>"

	// Subject line - escape user content to prevent XSS
	if issue.SelectedSubjectLine != nil {
		output += "<div class='subject'>" + html.EscapeString(*issue.SelectedSubjectLine) + "</div>"
	} else if len(issue.SubjectLines) > 0 {
		output += "<div class='subject'>" + html.EscapeString(issue.SubjectLines[0]) + "</div>"
	}

	// Preheader - escape user content
	if issue.Preheader != nil {
		output += "<div class='preheader'>" + html.EscapeString(*issue.Preheader) + "</div>"
	}

	output += "<hr style='margin: 20px 0;'>"

	// Intro - escape user content
	if issue.IntroTemplate != nil {
		output += "<div class='intro'>" + html.EscapeString(*issue.IntroTemplate) + "</div>"
	}

	// Blocks - escape all user content
	for _, block := range issue.Blocks {
		output += "<div class='block'>"

		if block.Title != nil {
			output += "<div class='block-title'>" + html.EscapeString(*block.Title) + "</div>"
		}

		if block.Teaser != nil {
			output += "<div class='block-teaser'>" + html.EscapeString(*block.Teaser) + "</div>"
		}

		if block.CTAURL != nil {
			ctaLabel := "Read More"
			if block.CTALabel != nil {
				ctaLabel = html.EscapeString(*block.CTALabel)
			}
			// HIGH-003: Sanitize URL to prevent javascript: protocol injection
			safeURL := sanitizeURL(*block.CTAURL)
			if safeURL != "" {
				output += "<a href='" + safeURL + "' class='cta'>" + ctaLabel + "</a>"
			}
		}

		output += "</div>"
	}

	output += "</body></html>"
	return output
}

// extractAvailableTokens extracts available token names from context
func (h *IssueHandler) extractAvailableTokens(context map[string]interface{}) []string {
	tokens := make([]string, 0, len(context))
	for key := range context {
		tokens = append(tokens, "{{"+key+"}}")
	}
	return tokens
}

// ============================================================================
// Request/Response Types
// ============================================================================

// GenerateIssueRequest represents a request to generate a newsletter issue
type GenerateIssueRequest struct {
	ConfigurationID uuid.UUID   `json:"configuration_id"`
	SegmentID       uuid.UUID   `json:"segment_id"`
	IssueDate       time.Time   `json:"issue_date,omitempty"`
	TopicOverrides  []string    `json:"topic_overrides,omitempty"`
	HeroContentID   *uuid.UUID  `json:"hero_content_id,omitempty"`
	ExcludeItemIDs  []uuid.UUID `json:"exclude_item_ids,omitempty"`
}

// UpdateIssueRequest represents a request to update a newsletter issue
type UpdateIssueRequest struct {
	SelectedSubjectLine *string    `json:"selected_subject_line,omitempty"`
	Preheader           *string    `json:"preheader,omitempty"`
	IntroTemplate       *string    `json:"intro_template,omitempty"`
	ScheduledFor        *time.Time `json:"scheduled_for,omitempty"`
}

// SelectSubjectLineRequest represents a request to select a subject line
type SelectSubjectLineRequest struct {
	SubjectLine string `json:"subject_line"`
}

// RegenerateSubjectLinesRequest represents a request to regenerate subject lines
type RegenerateSubjectLinesRequest struct {
	Style string `json:"style,omitempty"`
}

// ValidateCopyRequest represents a request to validate copy against brand voice
type ValidateCopyRequest struct {
	ConfigurationID         uuid.UUID         `json:"configuration_id"`
	SubjectLine             string            `json:"subject_line,omitempty"`
	AlternativeSubjectLines []string          `json:"alternative_subject_lines,omitempty"`
	Preheader               string            `json:"preheader,omitempty"`
	Intro                   string            `json:"intro,omitempty"`
	Blocks                  []BlockContentDTO `json:"blocks,omitempty"`
}

// BlockContentDTO represents a block content for validation
type BlockContentDTO struct {
	Title    string `json:"title,omitempty"`
	Teaser   string `json:"teaser,omitempty"`
	CTALabel string `json:"cta_label,omitempty"`
}

// ApproveIssueRequest represents a request to approve a newsletter issue
type ApproveIssueRequest struct {
	Notes string `json:"notes,omitempty"`
}

// RejectIssueRequest represents a request to reject a newsletter issue
type RejectIssueRequest struct {
	Reason string `json:"reason"`
}
