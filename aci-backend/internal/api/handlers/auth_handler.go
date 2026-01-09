package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/rs/zerolog/log"

	"github.com/phillipboles/aci-backend/internal/api/middleware"
	"github.com/phillipboles/aci-backend/internal/api/response"
	"github.com/phillipboles/aci-backend/internal/domain/entities"
	domainerrors "github.com/phillipboles/aci-backend/internal/domain/errors"
	"github.com/phillipboles/aci-backend/internal/service"
)

// AuthHandler handles authentication HTTP requests
type AuthHandler struct {
	authService         *service.AuthService
	enhancedAuthService *service.EnhancedAuthService
}

// NewAuthHandler creates a new authentication handler
func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	if authService == nil {
		panic("authService cannot be nil")
	}
	return &AuthHandler{
		authService: authService,
	}
}

// NewEnhancedAuthHandler creates a new authentication handler with enhanced features
func NewEnhancedAuthHandler(authService *service.AuthService, enhancedAuthService *service.EnhancedAuthService) *AuthHandler {
	if authService == nil {
		panic("authService cannot be nil")
	}
	return &AuthHandler{
		authService:         authService,
		enhancedAuthService: enhancedAuthService,
	}
}

// RegisterRequest represents the registration request payload
type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

// LoginRequest represents the login request payload
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// RefreshRequest represents the refresh token request payload
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

// LogoutRequest represents the logout request payload
type LogoutRequest struct {
	RefreshToken string `json:"refresh_token,omitempty"`
	AllDevices   bool   `json:"all_devices"`
}

// AuthResponse represents the authentication response
type AuthResponse struct {
	User         UserDTO `json:"user"`
	AccessToken  string  `json:"access_token"`
	RefreshToken string  `json:"refresh_token"`
	ExpiresAt    string  `json:"expires_at"`
}

// UserDTO represents user data transfer object
type UserDTO struct {
	ID            string  `json:"id"`
	Email         string  `json:"email"`
	Name          string  `json:"name"`
	Role          string  `json:"role"`
	EmailVerified bool    `json:"email_verified"`
	LastLoginAt   *string `json:"last_login_at,omitempty"`
}

// TokenResponse represents token refresh response
type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresAt    string `json:"expires_at"`
}

// Register handles user registration
// POST /v1/auth/register
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		requestID := middleware.GetRequestID(r.Context())
		response.BadRequestWithDetails(w, "Invalid request body", nil, requestID)
		return
	}

	user, tokens, err := h.authService.Register(r.Context(), req.Email, req.Password, req.Name)
	if err != nil {
		h.handleAuthError(w, r, err)
		return
	}

	authResp := AuthResponse{
		User:         h.userToDTO(user),
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		ExpiresAt:    tokens.ExpiresAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	response.Created(w, authResp)
}

// Login handles user authentication
// POST /v1/auth/login
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		requestID := middleware.GetRequestID(r.Context())
		response.BadRequestWithDetails(w, "Invalid request body", nil, requestID)
		return
	}

	user, tokens, err := h.authService.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		h.handleAuthError(w, r, err)
		return
	}

	authResp := AuthResponse{
		User:         h.userToDTO(user),
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		ExpiresAt:    tokens.ExpiresAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	response.Success(w, authResp)
}

// Refresh handles token refresh
// POST /v1/auth/refresh
func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req RefreshRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		requestID := middleware.GetRequestID(r.Context())
		response.BadRequestWithDetails(w, "Invalid request body", nil, requestID)
		return
	}

	if req.RefreshToken == "" {
		response.BadRequest(w, "refresh_token is required")
		return
	}

	tokens, err := h.authService.Refresh(r.Context(), req.RefreshToken)
	if err != nil {
		h.handleAuthError(w, r, err)
		return
	}

	tokenResp := TokenResponse{
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		ExpiresAt:    tokens.ExpiresAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	response.Success(w, tokenResp)
}

// Logout handles user logout
// POST /v1/auth/logout
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	var req LogoutRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		requestID := middleware.GetRequestID(r.Context())
		response.BadRequestWithDetails(w, "Invalid request body", nil, requestID)
		return
	}

	// If logging out all devices, get user ID from JWT context
	if req.AllDevices {
		claims, ok := middleware.GetUserFromContext(r.Context())
		if !ok {
			response.Unauthorized(w, "Authentication required")
			return
		}

		if err := h.authService.LogoutAll(r.Context(), claims.UserID); err != nil {
			h.handleAuthError(w, r, err)
			return
		}
	} else {
		// Logout single device with refresh token
		if req.RefreshToken == "" {
			response.BadRequest(w, "refresh_token is required when all_devices is false")
			return
		}

		if err := h.authService.Logout(r.Context(), req.RefreshToken); err != nil {
			h.handleAuthError(w, r, err)
			return
		}
	}

	response.SuccessWithMessage(w, nil, "Logged out successfully")
}

// handleAuthError handles authentication-specific errors
func (h *AuthHandler) handleAuthError(w http.ResponseWriter, r *http.Request, err error) {
	requestID := middleware.GetRequestID(r.Context())

	// Handle validation errors
	var validationErr *domainerrors.ValidationError
	if errors.As(err, &validationErr) {
		response.BadRequestWithDetails(w, validationErr.Error(), nil, requestID)
		return
	}

	// Handle conflict errors (email already exists)
	var conflictErr *domainerrors.ConflictError
	if errors.As(err, &conflictErr) {
		response.Conflict(w, conflictErr.Error())
		return
	}

	// Handle unauthorized errors
	if errors.Is(err, domainerrors.ErrUnauthorized) {
		response.Unauthorized(w, "Invalid credentials")
		return
	}

	// Handle not found errors
	var notFoundErr *domainerrors.NotFoundError
	if errors.As(err, &notFoundErr) {
		response.NotFound(w, notFoundErr.Error())
		return
	}

	// Generic internal error - log for debugging
	log.Error().
		Err(err).
		Str("request_id", requestID).
		Msg("Unhandled error in auth handler")
	response.InternalError(w, "An unexpected error occurred", requestID)
}

// userToDTO converts entities.User to DTO
func (h *AuthHandler) userToDTO(u *entities.User) UserDTO {
	dto := UserDTO{
		ID:            u.ID.String(),
		Email:         u.Email,
		Name:          u.Name,
		Role:          string(u.Role),
		EmailVerified: u.EmailVerified,
	}

	if u.LastLoginAt != nil {
		lastLogin := u.LastLoginAt.Format("2006-01-02T15:04:05Z07:00")
		dto.LastLoginAt = &lastLogin
	}

	return dto
}

// =============================================================================
// Enhanced Authentication Endpoints
// =============================================================================

// VerifyEmailRequest represents the email verification request payload
type VerifyEmailRequest struct {
	Token string `json:"token"`
}

// RegisterFromInvitationRequest represents the invitation registration request payload
type RegisterFromInvitationRequest struct {
	Token    string `json:"token"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

// ChangePasswordRequest represents the password change request payload
type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

// SignupModeResponse represents the signup mode response
type SignupModeResponse struct {
	Mode string `json:"mode"`
}

// EnhancedUserDTO extends UserDTO with status information
type EnhancedUserDTO struct {
	UserDTO
	Status              string `json:"status"`
	ForcePasswordChange bool   `json:"force_password_change"`
}

// GetSignupMode returns the current signup mode
// GET /v1/auth/signup-mode
func (h *AuthHandler) GetSignupMode(w http.ResponseWriter, r *http.Request) {
	if h.enhancedAuthService == nil {
		response.ServiceUnavailable(w, "Enhanced auth service not configured")
		return
	}

	mode, err := h.enhancedAuthService.GetSignupMode(r.Context())
	if err != nil {
		requestID := middleware.GetRequestID(r.Context())
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to get signup mode")
		response.InternalError(w, "Failed to get signup mode", requestID)
		return
	}

	response.Success(w, SignupModeResponse{Mode: string(mode)})
}

// RegisterWithMode handles user registration using the current signup mode
// POST /v1/auth/register (enhanced version)
func (h *AuthHandler) RegisterWithMode(w http.ResponseWriter, r *http.Request) {
	if h.enhancedAuthService == nil {
		// Fall back to basic registration
		h.Register(w, r)
		return
	}

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		requestID := middleware.GetRequestID(r.Context())
		response.BadRequestWithDetails(w, "Invalid request body", nil, requestID)
		return
	}

	user, tokens, err := h.enhancedAuthService.RegisterWithMode(r.Context(), req.Email, req.Password, req.Name)
	if err != nil {
		h.handleAuthError(w, r, err)
		return
	}

	// If tokens are nil, user needs additional steps (verification or approval)
	if tokens == nil {
		resp := map[string]interface{}{
			"user":    h.userToEnhancedDTO(user),
			"message": h.getStatusMessage(user.Status),
		}
		response.Created(w, resp)
		return
	}

	authResp := AuthResponse{
		User:         h.userToDTO(user),
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		ExpiresAt:    tokens.ExpiresAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	response.Created(w, authResp)
}

// VerifyEmail verifies a user's email address
// POST /v1/auth/verify-email
func (h *AuthHandler) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	if h.enhancedAuthService == nil {
		response.ServiceUnavailable(w, "Enhanced auth service not configured")
		return
	}

	var req VerifyEmailRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		requestID := middleware.GetRequestID(r.Context())
		response.BadRequestWithDetails(w, "Invalid request body", nil, requestID)
		return
	}

	if req.Token == "" {
		response.BadRequest(w, "token is required")
		return
	}

	user, tokens, err := h.enhancedAuthService.VerifyEmail(r.Context(), req.Token)
	if err != nil {
		h.handleAuthError(w, r, err)
		return
	}

	authResp := AuthResponse{
		User:         h.userToDTO(user),
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		ExpiresAt:    tokens.ExpiresAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	response.Success(w, authResp)
}

// RegisterFromInvitation handles registration using an invitation token
// POST /v1/auth/register/invitation
func (h *AuthHandler) RegisterFromInvitation(w http.ResponseWriter, r *http.Request) {
	if h.enhancedAuthService == nil {
		response.ServiceUnavailable(w, "Enhanced auth service not configured")
		return
	}

	var req RegisterFromInvitationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		requestID := middleware.GetRequestID(r.Context())
		response.BadRequestWithDetails(w, "Invalid request body", nil, requestID)
		return
	}

	user, tokens, err := h.enhancedAuthService.RegisterFromInvitation(r.Context(), req.Token, req.Password, req.Name)
	if err != nil {
		h.handleAuthError(w, r, err)
		return
	}

	authResp := AuthResponse{
		User:         h.userToDTO(user),
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		ExpiresAt:    tokens.ExpiresAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	response.Created(w, authResp)
}

// ChangePassword handles self-service password change
// POST /v1/auth/change-password
func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	if h.enhancedAuthService == nil {
		response.ServiceUnavailable(w, "Enhanced auth service not configured")
		return
	}

	claims, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		response.Unauthorized(w, "Authentication required")
		return
	}

	var req ChangePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		requestID := middleware.GetRequestID(r.Context())
		response.BadRequestWithDetails(w, "Invalid request body", nil, requestID)
		return
	}

	err := h.enhancedAuthService.ChangePassword(r.Context(), claims.UserID, req.CurrentPassword, req.NewPassword)
	if err != nil {
		h.handleAuthError(w, r, err)
		return
	}

	response.SuccessWithMessage(w, nil, "Password changed successfully")
}

// LoginEnhanced handles login with enhanced security (lockout protection)
// POST /v1/auth/login (enhanced version)
func (h *AuthHandler) LoginEnhanced(w http.ResponseWriter, r *http.Request) {
	if h.enhancedAuthService == nil {
		// Fall back to basic login
		h.Login(w, r)
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		requestID := middleware.GetRequestID(r.Context())
		response.BadRequestWithDetails(w, "Invalid request body", nil, requestID)
		return
	}

	// Extract IP and user agent for security tracking
	ipAddress := r.RemoteAddr
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		ipAddress = forwarded
	}
	userAgent := r.UserAgent()

	user, tokens, err := h.enhancedAuthService.LoginEnhanced(r.Context(), req.Email, req.Password, ipAddress, userAgent)
	if err != nil {
		h.handleAuthError(w, r, err)
		return
	}

	// Check if user needs to change password
	resp := map[string]interface{}{
		"user":          h.userToDTO(user),
		"access_token":  tokens.AccessToken,
		"refresh_token": tokens.RefreshToken,
		"expires_at":    tokens.ExpiresAt.Format("2006-01-02T15:04:05Z07:00"),
	}

	if user.ForcePasswordChange {
		resp["force_password_change"] = true
	}

	response.Success(w, resp)
}

// userToEnhancedDTO converts entities.User to EnhancedUserDTO
func (h *AuthHandler) userToEnhancedDTO(u *entities.User) EnhancedUserDTO {
	return EnhancedUserDTO{
		UserDTO:             h.userToDTO(u),
		Status:              string(u.Status),
		ForcePasswordChange: u.ForcePasswordChange,
	}
}

// getStatusMessage returns a user-friendly message for the user status
func (h *AuthHandler) getStatusMessage(status entities.UserStatus) string {
	switch status {
	case entities.UserStatusPendingVerification:
		return "Please check your email to verify your account"
	case entities.UserStatusPendingApproval:
		return "Your registration is pending admin approval"
	default:
		return ""
	}
}
