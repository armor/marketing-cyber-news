package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/phillipboles/aci-backend/internal/config"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/domain/entities"
	domainerrors "github.com/phillipboles/aci-backend/internal/domain/errors"
	"github.com/phillipboles/aci-backend/internal/pkg/crypto"
	"github.com/phillipboles/aci-backend/internal/pkg/jwt"
	"github.com/phillipboles/aci-backend/internal/repository"
)

// EnhancedAuthService extends AuthService with multi-mode registration support
type EnhancedAuthService struct {
	*AuthService
	invitationRepo    repository.InvitationRepository
	verificationRepo  repository.VerificationTokenRepository
	approvalRepo      repository.ApprovalRequestRepository
	loginAttemptRepo  repository.LoginAttemptRepository
	settingsRepo      repository.SystemSettingsRepository
	passwordResetRepo repository.PasswordResetTokenRepository
	authConfig        config.AuthConfig
	httpClient        *http.Client
}

// NewEnhancedAuthService creates a new enhanced authentication service
func NewEnhancedAuthService(
	userRepo UserRepoInterface,
	tokenRepo repository.RefreshTokenRepository,
	jwtSvc jwt.Service,
	invitationRepo repository.InvitationRepository,
	verificationRepo repository.VerificationTokenRepository,
	approvalRepo repository.ApprovalRequestRepository,
	loginAttemptRepo repository.LoginAttemptRepository,
	settingsRepo repository.SystemSettingsRepository,
	passwordResetRepo repository.PasswordResetTokenRepository,
	authConfig config.AuthConfig,
) *EnhancedAuthService {
	baseAuthService := NewAuthService(userRepo, tokenRepo, jwtSvc)

	return &EnhancedAuthService{
		AuthService:       baseAuthService,
		invitationRepo:    invitationRepo,
		verificationRepo:  verificationRepo,
		approvalRepo:      approvalRepo,
		loginAttemptRepo:  loginAttemptRepo,
		settingsRepo:      settingsRepo,
		passwordResetRepo: passwordResetRepo,
		authConfig:        authConfig,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// RegisterWithMode creates a new user account using the appropriate flow based on signup mode
func (s *EnhancedAuthService) RegisterWithMode(ctx context.Context, email, password, name string) (*entities.User, *jwt.TokenPair, error) {
	// Validate email domain
	email = strings.ToLower(strings.TrimSpace(email))
	if err := domain.ValidateEmailDomain(email); err != nil {
		return nil, nil, &domainerrors.ValidationError{
			Field:   "email",
			Message: err.Error(),
		}
	}

	// Validate password
	if err := domain.ValidatePassword(password); err != nil {
		return nil, nil, &domainerrors.ValidationError{
			Field:   "password",
			Message: err.Error(),
		}
	}

	// Validate name
	if err := s.validateName(name); err != nil {
		return nil, nil, err
	}

	// Check if email already exists
	_, err := s.userRepo.GetByEmail(ctx, email)
	if err == nil {
		return nil, nil, &domainerrors.ConflictError{
			Resource: "user",
			Field:    "email",
			Value:    email,
		}
	}

	var notFoundErr *domainerrors.NotFoundError
	if err != nil && !errors.As(err, &notFoundErr) {
		return nil, nil, fmt.Errorf("failed to check existing user: %w", err)
	}

	// Get current signup mode
	signupMode, err := s.GetSignupMode(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get signup mode: %w", err)
	}

	// Hash password
	passwordHash, err := crypto.HashPassword(password)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to hash password: %w", err)
	}

	switch signupMode {
	case domain.SignupModeOpen:
		return s.registerOpen(ctx, email, passwordHash, name)

	case domain.SignupModeEmailVerification:
		return s.registerWithEmailVerification(ctx, email, passwordHash, name)

	case domain.SignupModeAdminApproval:
		return s.registerWithAdminApproval(ctx, email, passwordHash, name)

	case domain.SignupModeInvitationOnly:
		return nil, nil, &domainerrors.ValidationError{
			Field:   "registration",
			Message: "registration is by invitation only",
		}

	default:
		return nil, nil, fmt.Errorf("unsupported signup mode: %s", signupMode)
	}
}

// registerOpen creates a user with immediate active status
func (s *EnhancedAuthService) registerOpen(ctx context.Context, email, passwordHash, name string) (*entities.User, *jwt.TokenPair, error) {
	user := entities.NewUser(email, passwordHash, name)
	user.Status = entities.UserStatusActive
	user.EmailVerified = true

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, nil, fmt.Errorf("failed to create user: %w", err)
	}

	tokenPair, err := s.generateAndStoreTokens(ctx, user, "", "")
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate tokens: %w", err)
	}

	return user, tokenPair, nil
}

// registerWithEmailVerification creates a user pending email verification
func (s *EnhancedAuthService) registerWithEmailVerification(ctx context.Context, email, passwordHash, name string) (*entities.User, *jwt.TokenPair, error) {
	user := entities.NewUserWithStatus(email, passwordHash, name, entities.UserStatusPendingVerification)

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Create verification token
	expiryDuration := time.Duration(s.authConfig.VerificationExpiryHours) * time.Hour
	verificationToken, err := domain.NewEmailVerificationToken(user.ID, expiryDuration)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create verification token: %w", err)
	}

	if err := s.verificationRepo.Create(ctx, verificationToken); err != nil {
		return nil, nil, fmt.Errorf("failed to store verification token: %w", err)
	}

	// Return user without tokens - they need to verify email first
	// Include the token in the response so it can be sent via email
	user.EmailVerified = false
	return user, nil, nil
}

// registerWithAdminApproval creates a user pending admin approval
func (s *EnhancedAuthService) registerWithAdminApproval(ctx context.Context, email, passwordHash, name string) (*entities.User, *jwt.TokenPair, error) {
	user := entities.NewUserWithStatus(email, passwordHash, name, entities.UserStatusPendingApproval)

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Create approval request
	approvalRequest := domain.NewUserApprovalRequest(user.ID)
	if err := s.approvalRepo.Create(ctx, approvalRequest); err != nil {
		return nil, nil, fmt.Errorf("failed to create approval request: %w", err)
	}

	// Return user without tokens - they need admin approval first
	return user, nil, nil
}

// RegisterFromInvitation creates a user from an invitation token
func (s *EnhancedAuthService) RegisterFromInvitation(ctx context.Context, token, password, name string) (*entities.User, *jwt.TokenPair, error) {
	if token == "" {
		return nil, nil, &domainerrors.ValidationError{
			Field:   "token",
			Message: "invitation token is required",
		}
	}

	// Validate password
	if err := domain.ValidatePassword(password); err != nil {
		return nil, nil, &domainerrors.ValidationError{
			Field:   "password",
			Message: err.Error(),
		}
	}

	// Validate name
	if err := s.validateName(name); err != nil {
		return nil, nil, err
	}

	// Hash the token to look it up
	tokenHash := domain.HashToken(token)

	// Get and validate invitation
	invitation, err := s.invitationRepo.GetByToken(ctx, tokenHash)
	if err != nil {
		var notFoundErr *domainerrors.NotFoundError
		if errors.As(err, &notFoundErr) {
			return nil, nil, &domainerrors.ValidationError{
				Field:   "token",
				Message: "invitation not found or expired",
			}
		}
		return nil, nil, fmt.Errorf("failed to get invitation: %w", err)
	}

	if !invitation.IsValid() {
		return nil, nil, &domainerrors.ValidationError{
			Field:   "token",
			Message: "invitation has expired or already been used",
		}
	}

	// Check if email already exists
	_, err = s.userRepo.GetByEmail(ctx, invitation.Email)
	if err == nil {
		return nil, nil, &domainerrors.ConflictError{
			Resource: "user",
			Field:    "email",
			Value:    invitation.Email,
		}
	}

	var notFoundErr *domainerrors.NotFoundError
	if err != nil && !errors.As(err, &notFoundErr) {
		return nil, nil, fmt.Errorf("failed to check existing user: %w", err)
	}

	// Hash password
	passwordHash, err := crypto.HashPassword(password)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Create user with role from invitation
	user := entities.NewUser(invitation.Email, passwordHash, name)
	user.Role = entities.UserRole(invitation.Role)
	user.Status = entities.UserStatusActive
	user.EmailVerified = true

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Mark invitation as accepted
	if err := s.invitationRepo.MarkAccepted(ctx, invitation.ID); err != nil {
		// Log error but don't fail - user was created
		_ = err
	}

	// Generate tokens
	tokenPair, err := s.generateAndStoreTokens(ctx, user, "", "")
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate tokens: %w", err)
	}

	return user, tokenPair, nil
}

// VerifyEmail verifies a user's email address using the token
func (s *EnhancedAuthService) VerifyEmail(ctx context.Context, token string) (*entities.User, *jwt.TokenPair, error) {
	if token == "" {
		return nil, nil, &domainerrors.ValidationError{
			Field:   "token",
			Message: "verification token is required",
		}
	}

	// Hash the token to look it up
	tokenHash := domain.HashToken(token)

	// Get and validate verification token
	verificationToken, err := s.verificationRepo.GetByToken(ctx, tokenHash)
	if err != nil {
		var notFoundErr *domainerrors.NotFoundError
		if errors.As(err, &notFoundErr) {
			return nil, nil, &domainerrors.ValidationError{
				Field:   "token",
				Message: "verification token not found or expired",
			}
		}
		return nil, nil, fmt.Errorf("failed to get verification token: %w", err)
	}

	if !verificationToken.IsValid() {
		return nil, nil, &domainerrors.ValidationError{
			Field:   "token",
			Message: "verification token has expired or already been used",
		}
	}

	// Get user
	user, err := s.userRepo.GetByID(ctx, verificationToken.UserID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Update user status
	user.Status = entities.UserStatusActive
	user.EmailVerified = true

	if err := s.userRepo.Update(ctx, user); err != nil {
		return nil, nil, fmt.Errorf("failed to update user: %w", err)
	}

	// Mark token as verified
	if err := s.verificationRepo.MarkVerified(ctx, verificationToken.ID); err != nil {
		// Log error but don't fail - user was activated
		_ = err
	}

	// Generate tokens
	tokenPair, err := s.generateAndStoreTokens(ctx, user, "", "")
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate tokens: %w", err)
	}

	return user, tokenPair, nil
}

// LoginEnhanced authenticates user credentials with lockout protection
func (s *EnhancedAuthService) LoginEnhanced(ctx context.Context, email, password, ipAddress, userAgent string) (*entities.User, *jwt.TokenPair, error) {
	email = strings.ToLower(strings.TrimSpace(email))

	if email == "" {
		return nil, nil, &domainerrors.ValidationError{
			Field:   "email",
			Message: "email is required",
		}
	}

	if password == "" {
		return nil, nil, &domainerrors.ValidationError{
			Field:   "password",
			Message: "password is required",
		}
	}

	// Get user by email
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		// Record failed attempt
		s.recordLoginAttempt(ctx, email, ipAddress, userAgent, false)
		return nil, nil, fmt.Errorf("invalid credentials: %w", domainerrors.ErrUnauthorized)
	}

	// Check if account is locked
	if user.IsLocked() {
		return nil, nil, &domainerrors.ValidationError{
			Field:   "account",
			Message: "account is temporarily locked due to too many failed login attempts",
		}
	}

	// Check if user can login based on status
	if !user.CanLogin() {
		var message string
		switch user.Status {
		case entities.UserStatusPendingVerification:
			message = "please verify your email address before logging in"
		case entities.UserStatusPendingApproval:
			message = "your account is pending admin approval"
		case entities.UserStatusSuspended:
			message = "your account has been suspended"
		case entities.UserStatusDeactivated:
			message = "your account has been deactivated"
		default:
			message = "account is not active"
		}
		return nil, nil, &domainerrors.ValidationError{
			Field:   "account",
			Message: message,
		}
	}

	// Verify password
	if !crypto.CheckPassword(password, user.PasswordHash) {
		// Record failed attempt
		s.recordLoginAttempt(ctx, email, ipAddress, userAgent, false)

		// Increment failed login count and potentially lock
		if err := s.handleFailedLogin(ctx, user); err != nil {
			// Log error but don't fail
			_ = err
		}

		return nil, nil, fmt.Errorf("invalid credentials: %w", domainerrors.ErrUnauthorized)
	}

	// Successful login - reset failed count and record success
	if user.FailedLoginCount > 0 {
		if err := s.userRepo.UpdateLockout(ctx, user.ID, nil, 0); err != nil {
			// Log error but don't fail
			_ = err
		}
	}

	s.recordLoginAttempt(ctx, email, ipAddress, userAgent, true)

	// Update last login timestamp
	if err := s.userRepo.UpdateLastLogin(ctx, user.ID); err != nil {
		// Log error but don't fail login
		_ = err
	}

	// Generate token pair
	tokenPair, err := s.generateAndStoreTokens(ctx, user, ipAddress, userAgent)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate tokens: %w", err)
	}

	return user, tokenPair, nil
}

// ChangePassword changes a user's password (self-service)
func (s *EnhancedAuthService) ChangePassword(ctx context.Context, userID uuid.UUID, currentPassword, newPassword string) error {
	if userID == uuid.Nil {
		return fmt.Errorf("user ID is required")
	}

	// Validate input
	input := domain.ChangePasswordInput{
		CurrentPassword: currentPassword,
		NewPassword:     newPassword,
	}
	if err := input.Validate(); err != nil {
		return &domainerrors.ValidationError{
			Field:   "password",
			Message: err.Error(),
		}
	}

	// Get user
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to get user: %w", err)
	}

	// Verify current password
	if !crypto.CheckPassword(currentPassword, user.PasswordHash) {
		return &domainerrors.ValidationError{
			Field:   "current_password",
			Message: "current password is incorrect",
		}
	}

	// Hash new password
	newPasswordHash, err := crypto.HashPassword(newPassword)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Update password
	if err := s.userRepo.UpdatePassword(ctx, userID, newPasswordHash); err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	return nil
}

// GetSignupMode retrieves the current signup mode
func (s *EnhancedAuthService) GetSignupMode(ctx context.Context) (domain.SignupMode, error) {
	if s.settingsRepo == nil {
		// Fall back to config
		return domain.SignupMode(s.authConfig.SignupMode), nil
	}

	return s.settingsRepo.GetSignupMode(ctx)
}

// Helper methods

// handleFailedLogin increments failed count and locks if threshold reached
func (s *EnhancedAuthService) handleFailedLogin(ctx context.Context, user *entities.User) error {
	newFailedCount := user.FailedLoginCount + 1

	if newFailedCount >= s.authConfig.LockoutThreshold {
		// Lock the account
		lockUntil := time.Now().Add(time.Duration(s.authConfig.LockoutDurationMinutes) * time.Minute)
		return s.userRepo.UpdateLockout(ctx, user.ID, &lockUntil, newFailedCount)
	}

	// Just increment counter
	return s.userRepo.UpdateLockout(ctx, user.ID, nil, newFailedCount)
}

// recordLoginAttempt records a login attempt for security tracking
func (s *EnhancedAuthService) recordLoginAttempt(ctx context.Context, email, ipAddress, userAgent string, success bool) {
	if s.loginAttemptRepo == nil {
		return
	}

	attempt := domain.NewLoginAttempt(email, ipAddress, userAgent, success)
	_ = s.loginAttemptRepo.Create(ctx, attempt)
}

// =============================================================================
// Password Reset Methods
// =============================================================================

// RequestPasswordReset creates a password reset token for the user
// Returns the token (to be sent via email) or nil if user not found (to prevent enumeration)
func (s *EnhancedAuthService) RequestPasswordReset(ctx context.Context, email string) (*domain.PasswordResetToken, error) {
	if s.passwordResetRepo == nil {
		return nil, fmt.Errorf("password reset service not configured")
	}

	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return nil, &domainerrors.ValidationError{
			Field:   "email",
			Message: "email is required",
		}
	}

	// Validate email domain
	if err := domain.ValidateEmailDomain(email); err != nil {
		// Don't reveal if email is invalid to prevent enumeration
		return nil, nil
	}

	// Get user by email
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		var notFoundErr *domainerrors.NotFoundError
		if errors.As(err, &notFoundErr) {
			// Don't reveal if user doesn't exist
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Check if user is active
	if user.Status != entities.UserStatusActive {
		// Don't reveal if user is not active
		return nil, nil
	}

	// Create password reset token (1 hour expiry)
	resetToken, err := domain.NewPasswordResetToken(user.ID, time.Hour)
	if err != nil {
		return nil, fmt.Errorf("failed to create reset token: %w", err)
	}

	// Store token (this also deletes any existing tokens for the user)
	if err := s.passwordResetRepo.Create(ctx, resetToken); err != nil {
		return nil, fmt.Errorf("failed to store reset token: %w", err)
	}

	// Send password reset email via n8n (fire and forget - errors are logged)
	s.sendPasswordResetEmail(ctx, email, resetToken.Token, resetToken.ExpiresAt)

	return resetToken, nil
}

// sendPasswordResetEmail sends password reset email via n8n webhook
func (s *EnhancedAuthService) sendPasswordResetEmail(ctx context.Context, email, rawToken string, expiresAt time.Time) {
	webhookURL := s.authConfig.PasswordResetWebhookURL
	frontendURL := s.authConfig.PasswordResetFrontendURL

	if webhookURL == "" {
		log.Warn().Msg("Password reset webhook URL not configured, skipping email")
		return
	}

	if frontendURL == "" {
		log.Warn().Msg("Password reset frontend URL not configured, skipping email")
		return
	}

	// Build the reset URL
	resetURL := fmt.Sprintf("%s?token=%s", frontendURL, rawToken)

	// Build webhook payload
	payload := map[string]interface{}{
		"email":      email,
		"token":      rawToken,
		"reset_url":  resetURL,
		"expires_at": expiresAt.Format(time.RFC3339),
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		log.Error().Err(err).Msg("Failed to marshal password reset email payload")
		return
	}

	// Send to n8n webhook (fire and forget)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, webhookURL, bytes.NewReader(payloadBytes))
	if err != nil {
		log.Error().Err(err).Str("webhook_url", webhookURL).Msg("Failed to create password reset webhook request")
		return
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		log.Error().Err(err).Str("webhook_url", webhookURL).Msg("Failed to send password reset email via webhook")
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		log.Error().
			Int("status_code", resp.StatusCode).
			Str("webhook_url", webhookURL).
			Str("email", email).
			Msg("Password reset webhook returned error status")
		return
	}

	log.Info().Str("email", email).Msg("Password reset email sent successfully via n8n")
}

// ResetPassword resets the user's password using a valid reset token
func (s *EnhancedAuthService) ResetPassword(ctx context.Context, token, newPassword string) error {
	if s.passwordResetRepo == nil {
		return fmt.Errorf("password reset service not configured")
	}

	// Validate input
	input := domain.ResetPasswordInput{
		Token:       token,
		NewPassword: newPassword,
	}
	if err := input.Validate(); err != nil {
		return &domainerrors.ValidationError{
			Field:   "input",
			Message: err.Error(),
		}
	}

	// Hash token and look it up
	tokenHash := domain.HashToken(token)
	resetToken, err := s.passwordResetRepo.GetByToken(ctx, tokenHash)
	if err != nil {
		var notFoundErr *domainerrors.NotFoundError
		if errors.As(err, &notFoundErr) {
			return &domainerrors.ValidationError{
				Field:   "token",
				Message: "invalid or expired reset token",
			}
		}
		return fmt.Errorf("failed to get reset token: %w", err)
	}

	// Token validity is checked in the query, but double-check
	if !resetToken.IsValid() {
		return &domainerrors.ValidationError{
			Field:   "token",
			Message: "invalid or expired reset token",
		}
	}

	// Get user
	user, err := s.userRepo.GetByID(ctx, resetToken.UserID)
	if err != nil {
		return fmt.Errorf("failed to get user: %w", err)
	}

	// Hash new password
	newPasswordHash, err := crypto.HashPassword(newPassword)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Update password
	if err := s.userRepo.UpdatePassword(ctx, user.ID, newPasswordHash); err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	// Mark token as used
	if err := s.passwordResetRepo.MarkUsed(ctx, resetToken.ID); err != nil {
		// Log error but don't fail - password was already updated
		_ = err
	}

	// Clear any account lockout
	if user.FailedLoginCount > 0 || user.LockedUntil != nil {
		if err := s.userRepo.UpdateLockout(ctx, user.ID, nil, 0); err != nil {
			// Log error but don't fail
			_ = err
		}
	}

	return nil
}
