package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/phillipboles/aci-backend/internal/config"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/domain/entities"
	domainerrors "github.com/phillipboles/aci-backend/internal/domain/errors"
	"github.com/phillipboles/aci-backend/internal/pkg/crypto"
	"github.com/phillipboles/aci-backend/internal/repository"
)

// UserAdminService handles administrative user management operations
type UserAdminService struct {
	userRepo       UserRepoInterface
	invitationRepo repository.InvitationRepository
	approvalRepo   repository.ApprovalRequestRepository
	settingsRepo   repository.SystemSettingsRepository
	tokenRepo      repository.RefreshTokenRepository
	authConfig     config.AuthConfig
}

// NewUserAdminService creates a new user admin service
func NewUserAdminService(
	userRepo UserRepoInterface,
	invitationRepo repository.InvitationRepository,
	approvalRepo repository.ApprovalRequestRepository,
	settingsRepo repository.SystemSettingsRepository,
	tokenRepo repository.RefreshTokenRepository,
	authConfig config.AuthConfig,
) *UserAdminService {
	if userRepo == nil {
		panic("userRepo cannot be nil")
	}
	return &UserAdminService{
		userRepo:       userRepo,
		invitationRepo: invitationRepo,
		approvalRepo:   approvalRepo,
		settingsRepo:   settingsRepo,
		tokenRepo:      tokenRepo,
		authConfig:     authConfig,
	}
}

// =============================================================================
// User CRUD Operations
// =============================================================================

// ListUsers retrieves users with optional filtering and pagination
func (s *UserAdminService) ListUsers(ctx context.Context, search string, role *entities.UserRole, status *entities.UserStatus, limit, offset int) ([]*entities.User, int, error) {
	return s.userRepo.List(ctx, search, role, status, limit, offset)
}

// GetUser retrieves a user by ID
func (s *UserAdminService) GetUser(ctx context.Context, id uuid.UUID) (*entities.User, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("user ID is required")
	}
	return s.userRepo.GetByID(ctx, id)
}

// CreateUser creates a new user (admin creation - bypasses signup mode)
func (s *UserAdminService) CreateUser(ctx context.Context, adminRole domain.UserRole, input *domain.CreateUserInput) (*entities.User, error) {
	if input == nil {
		return nil, fmt.Errorf("input cannot be nil")
	}

	if err := input.Validate(); err != nil {
		return nil, &domainerrors.ValidationError{
			Field:   "input",
			Message: err.Error(),
		}
	}

	// Check role assignment permission
	targetRole := domain.UserRole(input.Role)
	if !domain.CanAssignRole(adminRole, targetRole) {
		return nil, &domainerrors.ForbiddenError{
			Message: fmt.Sprintf("cannot assign role %s", input.Role),
		}
	}

	// Check if email already exists
	email := strings.ToLower(strings.TrimSpace(input.Email))
	_, err := s.userRepo.GetByEmail(ctx, email)
	if err == nil {
		return nil, &domainerrors.ConflictError{
			Resource: "user",
			Field:    "email",
			Value:    email,
		}
	}

	var notFoundErr *domainerrors.NotFoundError
	if err != nil && !errors.As(err, &notFoundErr) {
		return nil, fmt.Errorf("failed to check existing user: %w", err)
	}

	// Hash password
	passwordHash, err := crypto.HashPassword(input.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Create user with active status
	user := entities.NewUser(email, passwordHash, input.Name)
	user.Role = entities.UserRole(input.Role)
	user.Status = entities.UserStatusActive
	user.EmailVerified = true

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

// UpdateUser updates a user's information
func (s *UserAdminService) UpdateUser(ctx context.Context, id uuid.UUID, updates map[string]interface{}) (*entities.User, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("user ID is required")
	}

	user, err := s.userRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Apply updates
	if name, ok := updates["name"].(string); ok {
		user.Name = name
	}

	if emailVerified, ok := updates["email_verified"].(bool); ok {
		user.EmailVerified = emailVerified
	}

	user.UpdatedAt = time.Now()

	if err := s.userRepo.Update(ctx, user); err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	return user, nil
}

// DeactivateUser deactivates a user account
func (s *UserAdminService) DeactivateUser(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("user ID is required")
	}

	// Get user to check role
	user, err := s.userRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	// Prevent deactivation of super_admin if they're the last one
	if user.Role == entities.RoleSuperAdmin {
		count, err := s.userRepo.CountByRole(ctx, entities.RoleSuperAdmin)
		if err != nil {
			return fmt.Errorf("failed to count super admins: %w", err)
		}
		if count <= 1 {
			return &domainerrors.ValidationError{
				Field:   "user",
				Message: "cannot deactivate the last super admin",
			}
		}
	}

	if err := s.userRepo.UpdateStatus(ctx, id, entities.UserStatusDeactivated); err != nil {
		return fmt.Errorf("failed to deactivate user: %w", err)
	}

	// Revoke all user's tokens
	if s.tokenRepo != nil {
		_ = s.tokenRepo.RevokeAllForUser(ctx, id)
	}

	return nil
}

// DeleteUser permanently deletes a user
func (s *UserAdminService) DeleteUser(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("user ID is required")
	}

	// Get user to check role
	user, err := s.userRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	// Prevent deletion of super_admin if they're the last one
	if user.Role == entities.RoleSuperAdmin {
		count, err := s.userRepo.CountByRole(ctx, entities.RoleSuperAdmin)
		if err != nil {
			return fmt.Errorf("failed to count super admins: %w", err)
		}
		if count <= 1 {
			return &domainerrors.ValidationError{
				Field:   "user",
				Message: "cannot delete the last super admin",
			}
		}
	}

	return s.userRepo.Delete(ctx, id)
}

// =============================================================================
// Role Management
// =============================================================================

// AssignRole assigns a new role to a user
func (s *UserAdminService) AssignRole(ctx context.Context, adminRole domain.UserRole, userID uuid.UUID, newRole entities.UserRole) error {
	if userID == uuid.Nil {
		return fmt.Errorf("user ID is required")
	}

	// Check role assignment permission
	targetRole := domain.UserRole(newRole)
	if !domain.CanAssignRole(adminRole, targetRole) {
		return &domainerrors.ForbiddenError{
			Message: fmt.Sprintf("cannot assign role %s", newRole),
		}
	}

	// Get user
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return err
	}

	// If demoting from super_admin, check if they're the last one
	if user.Role == entities.RoleSuperAdmin && newRole != entities.RoleSuperAdmin {
		count, err := s.userRepo.CountByRole(ctx, entities.RoleSuperAdmin)
		if err != nil {
			return fmt.Errorf("failed to count super admins: %w", err)
		}
		if count <= 1 {
			return &domainerrors.ValidationError{
				Field:   "role",
				Message: "cannot demote the last super admin",
			}
		}
	}

	user.Role = newRole
	user.UpdatedAt = time.Now()

	if err := s.userRepo.Update(ctx, user); err != nil {
		return fmt.Errorf("failed to update user role: %w", err)
	}

	return nil
}

// =============================================================================
// Invitation Management
// =============================================================================

// CreateInvitation creates a new user invitation
func (s *UserAdminService) CreateInvitation(ctx context.Context, adminID uuid.UUID, adminRole domain.UserRole, input *domain.CreateInvitationInput) (*domain.UserInvitation, error) {
	if s.invitationRepo == nil {
		return nil, fmt.Errorf("invitation repository not configured")
	}

	if input == nil {
		return nil, fmt.Errorf("input cannot be nil")
	}

	if err := input.Validate(); err != nil {
		return nil, &domainerrors.ValidationError{
			Field:   "input",
			Message: err.Error(),
		}
	}

	// Check role assignment permission
	if !domain.CanAssignRole(adminRole, input.Role) {
		return nil, &domainerrors.ForbiddenError{
			Message: fmt.Sprintf("cannot invite with role %s", input.Role),
		}
	}

	// Check if email already has a user
	email := strings.ToLower(strings.TrimSpace(input.Email))
	_, err := s.userRepo.GetByEmail(ctx, email)
	if err == nil {
		return nil, &domainerrors.ConflictError{
			Resource: "user",
			Field:    "email",
			Value:    email,
		}
	}

	var notFoundErr *domainerrors.NotFoundError
	if err != nil && !errors.As(err, &notFoundErr) {
		return nil, fmt.Errorf("failed to check existing user: %w", err)
	}

	// Check if there's already a pending invitation
	existingInv, err := s.invitationRepo.GetByEmail(ctx, email)
	if err == nil && existingInv.IsValid() {
		return nil, &domainerrors.ConflictError{
			Resource: "invitation",
			Field:    "email",
			Value:    email,
		}
	}

	// Create invitation
	expiryDuration := time.Duration(s.authConfig.InvitationExpiryHours) * time.Hour
	invitation, err := domain.NewUserInvitation(email, adminID, input.Role, expiryDuration)
	if err != nil {
		return nil, fmt.Errorf("failed to create invitation: %w", err)
	}

	if err := s.invitationRepo.Create(ctx, invitation); err != nil {
		return nil, fmt.Errorf("failed to store invitation: %w", err)
	}

	return invitation, nil
}

// ListInvitations retrieves invitations with pagination
func (s *UserAdminService) ListInvitations(ctx context.Context, pendingOnly bool, limit, offset int) ([]*domain.UserInvitation, int, error) {
	if s.invitationRepo == nil {
		return nil, 0, fmt.Errorf("invitation repository not configured")
	}

	if pendingOnly {
		return s.invitationRepo.ListPending(ctx, limit, offset)
	}
	return s.invitationRepo.List(ctx, limit, offset)
}

// RevokeInvitation revokes (deletes) an invitation
func (s *UserAdminService) RevokeInvitation(ctx context.Context, id uuid.UUID) error {
	if s.invitationRepo == nil {
		return fmt.Errorf("invitation repository not configured")
	}

	if id == uuid.Nil {
		return fmt.Errorf("invitation ID is required")
	}

	return s.invitationRepo.Delete(ctx, id)
}

// =============================================================================
// Approval Management
// =============================================================================

// ListPendingApprovals retrieves pending user approval requests
func (s *UserAdminService) ListPendingApprovals(ctx context.Context, limit, offset int) ([]*domain.UserApprovalRequest, int, error) {
	if s.approvalRepo == nil {
		return nil, 0, fmt.Errorf("approval repository not configured")
	}

	return s.approvalRepo.ListPending(ctx, limit, offset)
}

// ApproveUser approves a user registration request
func (s *UserAdminService) ApproveUser(ctx context.Context, requestID uuid.UUID, reviewerID uuid.UUID) error {
	if s.approvalRepo == nil {
		return fmt.Errorf("approval repository not configured")
	}

	if requestID == uuid.Nil {
		return fmt.Errorf("request ID is required")
	}

	// Get approval request
	request, err := s.approvalRepo.GetByID(ctx, requestID)
	if err != nil {
		return err
	}

	if !request.IsPending() {
		return &domainerrors.ValidationError{
			Field:   "request",
			Message: "request has already been processed",
		}
	}

	// Approve the request
	request.Approve(reviewerID)
	if err := s.approvalRepo.Update(ctx, request); err != nil {
		return fmt.Errorf("failed to update approval request: %w", err)
	}

	// Activate the user
	if err := s.userRepo.UpdateStatus(ctx, request.UserID, entities.UserStatusActive); err != nil {
		return fmt.Errorf("failed to activate user: %w", err)
	}

	return nil
}

// RejectUser rejects a user registration request
func (s *UserAdminService) RejectUser(ctx context.Context, requestID uuid.UUID, reviewerID uuid.UUID, reason string) error {
	if s.approvalRepo == nil {
		return fmt.Errorf("approval repository not configured")
	}

	if requestID == uuid.Nil {
		return fmt.Errorf("request ID is required")
	}

	if reason == "" {
		return &domainerrors.ValidationError{
			Field:   "reason",
			Message: "rejection reason is required",
		}
	}

	// Get approval request
	request, err := s.approvalRepo.GetByID(ctx, requestID)
	if err != nil {
		return err
	}

	if !request.IsPending() {
		return &domainerrors.ValidationError{
			Field:   "request",
			Message: "request has already been processed",
		}
	}

	// Reject the request
	request.Reject(reviewerID, reason)
	if err := s.approvalRepo.Update(ctx, request); err != nil {
		return fmt.Errorf("failed to update approval request: %w", err)
	}

	// Deactivate the user
	if err := s.userRepo.UpdateStatus(ctx, request.UserID, entities.UserStatusDeactivated); err != nil {
		return fmt.Errorf("failed to deactivate user: %w", err)
	}

	return nil
}

// =============================================================================
// System Settings
// =============================================================================

// GetSignupMode retrieves the current signup mode
func (s *UserAdminService) GetSignupMode(ctx context.Context) (domain.SignupMode, error) {
	if s.settingsRepo == nil {
		return domain.SignupMode(s.authConfig.SignupMode), nil
	}
	return s.settingsRepo.GetSignupMode(ctx)
}

// SetSignupMode updates the signup mode (super_admin only)
func (s *UserAdminService) SetSignupMode(ctx context.Context, mode domain.SignupMode, adminID uuid.UUID, adminRole domain.UserRole) error {
	if s.settingsRepo == nil {
		return fmt.Errorf("settings repository not configured")
	}

	// Only super_admin can change signup mode
	if adminRole != domain.RoleSuperAdmin {
		return &domainerrors.ForbiddenError{
			Message: "only super admin can change signup mode",
		}
	}

	if !mode.IsValid() {
		return &domainerrors.ValidationError{
			Field:   "mode",
			Message: "invalid signup mode",
		}
	}

	return s.settingsRepo.SetSignupMode(ctx, mode, adminID)
}

// =============================================================================
// Password Management
// =============================================================================

// ResetPasswordByAdmin resets a user's password (admin action)
func (s *UserAdminService) ResetPasswordByAdmin(ctx context.Context, userID uuid.UUID, newPassword string) error {
	if userID == uuid.Nil {
		return fmt.Errorf("user ID is required")
	}

	// Validate password
	if err := domain.ValidatePassword(newPassword); err != nil {
		return &domainerrors.ValidationError{
			Field:   "password",
			Message: err.Error(),
		}
	}

	// Hash password
	passwordHash, err := crypto.HashPassword(newPassword)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Update password
	if err := s.userRepo.UpdatePassword(ctx, userID, passwordHash); err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	// Set force password change flag
	if err := s.userRepo.SetForcePasswordChange(ctx, userID, true); err != nil {
		// Log error but don't fail - password was updated
		_ = err
	}

	// Revoke all user's tokens so they have to login with new password
	if s.tokenRepo != nil {
		_ = s.tokenRepo.RevokeAllForUser(ctx, userID)
	}

	return nil
}

// UnlockUser unlocks a user's account
func (s *UserAdminService) UnlockUser(ctx context.Context, userID uuid.UUID) error {
	if userID == uuid.Nil {
		return fmt.Errorf("user ID is required")
	}

	return s.userRepo.UpdateLockout(ctx, userID, nil, 0)
}

// =============================================================================
// Session Management
// =============================================================================

// RevokeAllUserSessions revokes all sessions for a user
func (s *UserAdminService) RevokeAllUserSessions(ctx context.Context, userID uuid.UUID) error {
	if s.tokenRepo == nil {
		return fmt.Errorf("token repository not configured")
	}

	if userID == uuid.Nil {
		return fmt.Errorf("user ID is required")
	}

	return s.tokenRepo.RevokeAllForUser(ctx, userID)
}
