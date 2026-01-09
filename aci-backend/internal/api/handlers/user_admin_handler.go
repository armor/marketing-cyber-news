package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/phillipboles/aci-backend/internal/api/middleware"
	"github.com/phillipboles/aci-backend/internal/api/response"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/domain/entities"
	domainerrors "github.com/phillipboles/aci-backend/internal/domain/errors"
	"github.com/phillipboles/aci-backend/internal/service"
)

// UserAdminHandler handles user administration HTTP requests
type UserAdminHandler struct {
	userAdminService *service.UserAdminService
}

// NewUserAdminHandler creates a new user admin handler
func NewUserAdminHandler(userAdminService *service.UserAdminService) *UserAdminHandler {
	if userAdminService == nil {
		panic("userAdminService cannot be nil")
	}
	return &UserAdminHandler{
		userAdminService: userAdminService,
	}
}

// =============================================================================
// Request/Response Types
// =============================================================================

// CreateUserRequest represents the create user request payload
type CreateUserRequest struct {
	Email    string `json:"email"`
	Name     string `json:"name"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

// UserAdminUpdateRequest represents the update user request payload for user admin
type UserAdminUpdateRequest struct {
	Name          *string `json:"name,omitempty"`
	EmailVerified *bool   `json:"email_verified,omitempty"`
}

// AssignRoleRequest represents the assign role request payload
type AssignRoleRequest struct {
	Role string `json:"role"`
}

// CreateInvitationRequest represents the create invitation request payload
type CreateInvitationRequest struct {
	Email string `json:"email"`
	Role  string `json:"role"`
}

// SetSignupModeRequest represents the set signup mode request payload
type SetSignupModeRequest struct {
	Mode string `json:"mode"`
}

// ResetPasswordRequest represents the admin password reset request payload
type ResetPasswordRequest struct {
	NewPassword string `json:"new_password"`
}

// RejectUserRequest represents the reject user request payload
type RejectUserRequest struct {
	Reason string `json:"reason"`
}

// AdminUserDTO represents user data for admin views
type AdminUserDTO struct {
	ID                  string  `json:"id"`
	Email               string  `json:"email"`
	Name                string  `json:"name"`
	Role                string  `json:"role"`
	Status              string  `json:"status"`
	EmailVerified       bool    `json:"email_verified"`
	ForcePasswordChange bool    `json:"force_password_change"`
	LockedUntil         *string `json:"locked_until,omitempty"`
	FailedLoginCount    int     `json:"failed_login_count"`
	CreatedAt           string  `json:"created_at"`
	UpdatedAt           string  `json:"updated_at"`
	LastLoginAt         *string `json:"last_login_at,omitempty"`
}

// InvitationDTO represents invitation data
type InvitationDTO struct {
	ID            string  `json:"id"`
	Email         string  `json:"email"`
	Role          string  `json:"role"`
	InvitedBy     string  `json:"invited_by"`
	InvitedByName string  `json:"invited_by_name,omitempty"`
	ExpiresAt     string  `json:"expires_at"`
	AcceptedAt    *string `json:"accepted_at,omitempty"`
	CreatedAt     string  `json:"created_at"`
	Token         string  `json:"token,omitempty"`
}

// ApprovalRequestDTO represents approval request data
type ApprovalRequestDTO struct {
	ID              string  `json:"id"`
	UserID          string  `json:"user_id"`
	UserEmail       string  `json:"user_email,omitempty"`
	UserName        string  `json:"user_name,omitempty"`
	Status          string  `json:"status"`
	ReviewedBy      *string `json:"reviewed_by,omitempty"`
	ReviewedByName  string  `json:"reviewed_by_name,omitempty"`
	ReviewedAt      *string `json:"reviewed_at,omitempty"`
	RejectionReason *string `json:"rejection_reason,omitempty"`
	CreatedAt       string  `json:"created_at"`
}

// =============================================================================
// User CRUD Endpoints
// =============================================================================

// ListUsers returns a paginated list of users
// GET /v1/admin/users
func (h *UserAdminHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	// Parse query params
	search := r.URL.Query().Get("search")
	roleStr := r.URL.Query().Get("role")
	statusStr := r.URL.Query().Get("status")
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 20
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	offset := 0
	if offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	var role *entities.UserRole
	if roleStr != "" {
		r := entities.UserRole(roleStr)
		role = &r
	}

	var status *entities.UserStatus
	if statusStr != "" {
		s := entities.UserStatus(statusStr)
		status = &s
	}

	users, total, err := h.userAdminService.ListUsers(r.Context(), search, role, status, limit, offset)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	dtos := make([]AdminUserDTO, len(users))
	for i, u := range users {
		dtos[i] = h.userToAdminDTO(u)
	}

	response.Success(w, map[string]interface{}{
		"users":  dtos,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// GetUser returns a specific user
// GET /v1/admin/users/{id}
func (h *UserAdminHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "invalid user ID")
		return
	}

	user, err := h.userAdminService.GetUser(r.Context(), id)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	response.Success(w, h.userToAdminDTO(user))
}

// CreateUser creates a new user
// POST /v1/admin/users
func (h *UserAdminHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	adminRole, err := middleware.GetUserRoleFromContext(r.Context())
	if err != nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	var req CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		requestID := middleware.GetRequestID(r.Context())
		response.BadRequestWithDetails(w, "Invalid request body", nil, requestID)
		return
	}

	input := &domain.CreateUserInput{
		Email:    req.Email,
		Name:     req.Name,
		Password: req.Password,
		Role:     domain.UserRole(req.Role),
	}

	user, err := h.userAdminService.CreateUser(r.Context(), adminRole, input)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	response.Created(w, h.userToAdminDTO(user))
}

// UpdateUser updates a user
// PUT /v1/admin/users/{id}
func (h *UserAdminHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "invalid user ID")
		return
	}

	var req UserAdminUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		requestID := middleware.GetRequestID(r.Context())
		response.BadRequestWithDetails(w, "Invalid request body", nil, requestID)
		return
	}

	updates := make(map[string]interface{})
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.EmailVerified != nil {
		updates["email_verified"] = *req.EmailVerified
	}

	user, err := h.userAdminService.UpdateUser(r.Context(), id, updates)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	response.Success(w, h.userToAdminDTO(user))
}

// DeactivateUser deactivates a user
// POST /v1/admin/users/{id}/deactivate
func (h *UserAdminHandler) DeactivateUser(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "invalid user ID")
		return
	}

	err = h.userAdminService.DeactivateUser(r.Context(), id)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	response.SuccessWithMessage(w, nil, "User deactivated successfully")
}

// DeleteUser permanently deletes a user
// DELETE /v1/admin/users/{id}
func (h *UserAdminHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "invalid user ID")
		return
	}

	err = h.userAdminService.DeleteUser(r.Context(), id)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	response.NoContent(w)
}

// =============================================================================
// Role Management Endpoints
// =============================================================================

// AssignRole assigns a new role to a user
// POST /v1/admin/users/{id}/role
func (h *UserAdminHandler) AssignRole(w http.ResponseWriter, r *http.Request) {
	adminRole, err := middleware.GetUserRoleFromContext(r.Context())
	if err != nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "invalid user ID")
		return
	}

	var req AssignRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		requestID := middleware.GetRequestID(r.Context())
		response.BadRequestWithDetails(w, "Invalid request body", nil, requestID)
		return
	}

	newRole := entities.UserRole(req.Role)
	err = h.userAdminService.AssignRole(r.Context(), adminRole, id, newRole)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	response.SuccessWithMessage(w, nil, "Role assigned successfully")
}

// =============================================================================
// Invitation Management Endpoints
// =============================================================================

// ListInvitations returns a paginated list of invitations
// GET /v1/admin/invitations
func (h *UserAdminHandler) ListInvitations(w http.ResponseWriter, r *http.Request) {
	pendingOnly := r.URL.Query().Get("pending") == "true"
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 20
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	offset := 0
	if offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	invitations, total, err := h.userAdminService.ListInvitations(r.Context(), pendingOnly, limit, offset)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	dtos := make([]InvitationDTO, len(invitations))
	for i, inv := range invitations {
		dtos[i] = h.invitationToDTO(inv)
	}

	response.Success(w, map[string]interface{}{
		"invitations": dtos,
		"total":       total,
		"limit":       limit,
		"offset":      offset,
	})
}

// CreateInvitation creates a new invitation
// POST /v1/admin/invitations
func (h *UserAdminHandler) CreateInvitation(w http.ResponseWriter, r *http.Request) {
	adminID, err := middleware.GetUserIDFromContext(r.Context())
	if err != nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	adminRole, err := middleware.GetUserRoleFromContext(r.Context())
	if err != nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	var req CreateInvitationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		requestID := middleware.GetRequestID(r.Context())
		response.BadRequestWithDetails(w, "Invalid request body", nil, requestID)
		return
	}

	input := &domain.CreateInvitationInput{
		Email: req.Email,
		Role:  domain.UserRole(req.Role),
	}

	invitation, err := h.userAdminService.CreateInvitation(r.Context(), adminID, adminRole, input)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	dto := h.invitationToDTO(invitation)
	// Include the token in the response so it can be sent via email
	dto.Token = invitation.Token

	response.Created(w, dto)
}

// RevokeInvitation revokes an invitation
// DELETE /v1/admin/invitations/{id}
func (h *UserAdminHandler) RevokeInvitation(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "invalid invitation ID")
		return
	}

	err = h.userAdminService.RevokeInvitation(r.Context(), id)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	response.NoContent(w)
}

// =============================================================================
// Approval Management Endpoints
// =============================================================================

// ListPendingApprovals returns pending user approval requests
// GET /v1/admin/approvals
func (h *UserAdminHandler) ListPendingApprovals(w http.ResponseWriter, r *http.Request) {
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 20
	if limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	offset := 0
	if offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	approvals, total, err := h.userAdminService.ListPendingApprovals(r.Context(), limit, offset)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	dtos := make([]ApprovalRequestDTO, len(approvals))
	for i, req := range approvals {
		dtos[i] = h.approvalToDTO(req)
	}

	response.Success(w, map[string]interface{}{
		"approvals": dtos,
		"total":     total,
		"limit":     limit,
		"offset":    offset,
	})
}

// ApproveUser approves a user registration request
// POST /v1/admin/approvals/{id}/approve
func (h *UserAdminHandler) ApproveUser(w http.ResponseWriter, r *http.Request) {
	reviewerID, err := middleware.GetUserIDFromContext(r.Context())
	if err != nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "invalid request ID")
		return
	}

	err = h.userAdminService.ApproveUser(r.Context(), id, reviewerID)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	response.SuccessWithMessage(w, nil, "User approved successfully")
}

// RejectUser rejects a user registration request
// POST /v1/admin/approvals/{id}/reject
func (h *UserAdminHandler) RejectUser(w http.ResponseWriter, r *http.Request) {
	reviewerID, err := middleware.GetUserIDFromContext(r.Context())
	if err != nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "invalid request ID")
		return
	}

	var req RejectUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		requestID := middleware.GetRequestID(r.Context())
		response.BadRequestWithDetails(w, "Invalid request body", nil, requestID)
		return
	}

	err = h.userAdminService.RejectUser(r.Context(), id, reviewerID, req.Reason)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	response.SuccessWithMessage(w, nil, "User rejected")
}

// =============================================================================
// System Settings Endpoints
// =============================================================================

// GetSignupMode returns the current signup mode
// GET /v1/admin/settings/signup-mode
func (h *UserAdminHandler) GetSignupMode(w http.ResponseWriter, r *http.Request) {
	mode, err := h.userAdminService.GetSignupMode(r.Context())
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	response.Success(w, map[string]string{"mode": string(mode)})
}

// SetSignupMode updates the signup mode
// PUT /v1/admin/settings/signup-mode
func (h *UserAdminHandler) SetSignupMode(w http.ResponseWriter, r *http.Request) {
	adminID, err := middleware.GetUserIDFromContext(r.Context())
	if err != nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	adminRole, err := middleware.GetUserRoleFromContext(r.Context())
	if err != nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	var req SetSignupModeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		requestID := middleware.GetRequestID(r.Context())
		response.BadRequestWithDetails(w, "Invalid request body", nil, requestID)
		return
	}

	mode := domain.SignupMode(req.Mode)
	err = h.userAdminService.SetSignupMode(r.Context(), mode, adminID, adminRole)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	response.SuccessWithMessage(w, nil, "Signup mode updated successfully")
}

// =============================================================================
// Password Management Endpoints
// =============================================================================

// ResetUserPassword resets a user's password (admin action)
// POST /v1/admin/users/{id}/reset-password
func (h *UserAdminHandler) ResetUserPassword(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "invalid user ID")
		return
	}

	var req ResetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		requestID := middleware.GetRequestID(r.Context())
		response.BadRequestWithDetails(w, "Invalid request body", nil, requestID)
		return
	}

	err = h.userAdminService.ResetPasswordByAdmin(r.Context(), id, req.NewPassword)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	response.SuccessWithMessage(w, nil, "Password reset successfully. User will be required to change password on next login.")
}

// UnlockUser unlocks a user's account
// POST /v1/admin/users/{id}/unlock
func (h *UserAdminHandler) UnlockUser(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "invalid user ID")
		return
	}

	err = h.userAdminService.UnlockUser(r.Context(), id)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	response.SuccessWithMessage(w, nil, "User account unlocked successfully")
}

// =============================================================================
// Session Management Endpoints
// =============================================================================

// RevokeUserSessions revokes all sessions for a user
// POST /v1/admin/users/{id}/revoke-sessions
func (h *UserAdminHandler) RevokeUserSessions(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "invalid user ID")
		return
	}

	err = h.userAdminService.RevokeAllUserSessions(r.Context(), id)
	if err != nil {
		h.handleError(w, r, err)
		return
	}

	response.SuccessWithMessage(w, nil, "All user sessions revoked successfully")
}

// =============================================================================
// Helper Methods
// =============================================================================

// handleError handles errors and returns appropriate HTTP responses
func (h *UserAdminHandler) handleError(w http.ResponseWriter, r *http.Request, err error) {
	requestID := middleware.GetRequestID(r.Context())

	// Handle validation errors
	var validationErr *domainerrors.ValidationError
	if errors.As(err, &validationErr) {
		response.BadRequestWithDetails(w, validationErr.Error(), nil, requestID)
		return
	}

	// Handle conflict errors
	var conflictErr *domainerrors.ConflictError
	if errors.As(err, &conflictErr) {
		response.Conflict(w, conflictErr.Error())
		return
	}

	// Handle forbidden errors
	var forbiddenErr *domainerrors.ForbiddenError
	if errors.As(err, &forbiddenErr) {
		response.Forbidden(w, forbiddenErr.Error())
		return
	}

	// Handle not found errors
	var notFoundErr *domainerrors.NotFoundError
	if errors.As(err, &notFoundErr) {
		response.NotFound(w, notFoundErr.Error())
		return
	}

	// Generic internal error
	log.Error().
		Err(err).
		Str("request_id", requestID).
		Msg("Unhandled error in user admin handler")
	response.InternalError(w, "An unexpected error occurred", requestID)
}

// userToAdminDTO converts entities.User to AdminUserDTO
func (h *UserAdminHandler) userToAdminDTO(u *entities.User) AdminUserDTO {
	dto := AdminUserDTO{
		ID:                  u.ID.String(),
		Email:               u.Email,
		Name:                u.Name,
		Role:                string(u.Role),
		Status:              string(u.Status),
		EmailVerified:       u.EmailVerified,
		ForcePasswordChange: u.ForcePasswordChange,
		FailedLoginCount:    u.FailedLoginCount,
		CreatedAt:           u.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:           u.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	if u.LockedUntil != nil {
		lockedUntil := u.LockedUntil.Format("2006-01-02T15:04:05Z07:00")
		dto.LockedUntil = &lockedUntil
	}

	if u.LastLoginAt != nil {
		lastLogin := u.LastLoginAt.Format("2006-01-02T15:04:05Z07:00")
		dto.LastLoginAt = &lastLogin
	}

	return dto
}

// invitationToDTO converts domain.UserInvitation to InvitationDTO
func (h *UserAdminHandler) invitationToDTO(inv *domain.UserInvitation) InvitationDTO {
	dto := InvitationDTO{
		ID:            inv.ID.String(),
		Email:         inv.Email,
		Role:          string(inv.Role),
		InvitedBy:     inv.InvitedBy.String(),
		InvitedByName: inv.InvitedByName,
		ExpiresAt:     inv.ExpiresAt.Format("2006-01-02T15:04:05Z07:00"),
		CreatedAt:     inv.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	if inv.AcceptedAt != nil {
		acceptedAt := inv.AcceptedAt.Format("2006-01-02T15:04:05Z07:00")
		dto.AcceptedAt = &acceptedAt
	}

	return dto
}

// approvalToDTO converts domain.UserApprovalRequest to ApprovalRequestDTO
func (h *UserAdminHandler) approvalToDTO(req *domain.UserApprovalRequest) ApprovalRequestDTO {
	dto := ApprovalRequestDTO{
		ID:              req.ID.String(),
		UserID:          req.UserID.String(),
		UserEmail:       req.UserEmail,
		UserName:        req.UserName,
		Status:          string(req.Status),
		ReviewedByName:  req.ReviewedByName,
		RejectionReason: req.RejectionReason,
		CreatedAt:       req.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	if req.ReviewedBy != nil {
		reviewedBy := req.ReviewedBy.String()
		dto.ReviewedBy = &reviewedBy
	}

	if req.ReviewedAt != nil {
		reviewedAt := req.ReviewedAt.Format("2006-01-02T15:04:05Z07:00")
		dto.ReviewedAt = &reviewedAt
	}

	return dto
}
