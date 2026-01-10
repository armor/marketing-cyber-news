package domain

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
)

// UserStatus represents the status of a user account
type UserStatus string

const (
	UserStatusPendingVerification UserStatus = "pending_verification"
	UserStatusPendingApproval     UserStatus = "pending_approval"
	UserStatusActive              UserStatus = "active"
	UserStatusSuspended           UserStatus = "suspended"
	UserStatusDeactivated         UserStatus = "deactivated"
)

// IsValid checks if the user status is valid
func (s UserStatus) IsValid() bool {
	switch s {
	case UserStatusPendingVerification,
		UserStatusPendingApproval,
		UserStatusActive,
		UserStatusSuspended,
		UserStatusDeactivated:
		return true
	}
	return false
}

// CanLogin returns true if the status allows login
func (s UserStatus) CanLogin() bool {
	return s == UserStatusActive
}

// String returns the string representation of the status
func (s UserStatus) String() string {
	return string(s)
}

// SignupMode represents the registration mode for the system
type SignupMode string

const (
	SignupModeOpen              SignupMode = "open"
	SignupModeEmailVerification SignupMode = "email_verification"
	SignupModeAdminApproval     SignupMode = "admin_approval"
	SignupModeInvitationOnly    SignupMode = "invitation_only"
)

// IsValid checks if the signup mode is valid
func (m SignupMode) IsValid() bool {
	switch m {
	case SignupModeOpen,
		SignupModeEmailVerification,
		SignupModeAdminApproval,
		SignupModeInvitationOnly:
		return true
	}
	return false
}

// String returns the string representation of the mode
func (m SignupMode) String() string {
	return string(m)
}

// AllowedEmailDomain is the domain required for registration
const AllowedEmailDomain = "armor.com"

// ValidateEmailDomain validates that an email ends with the allowed domain
func ValidateEmailDomain(email string) error {
	pattern := regexp.MustCompile(`^[A-Za-z0-9._%+-]+@armor\.com$`)
	if !pattern.MatchString(email) {
		return fmt.Errorf("email must be an @armor.com address")
	}
	return nil
}

// UserInvitation represents an invitation to register
type UserInvitation struct {
	ID         uuid.UUID  `json:"id"`
	Email      string     `json:"email"`
	InvitedBy  uuid.UUID  `json:"invited_by"`
	Role       UserRole   `json:"role"`
	TokenHash  string     `json:"-"`
	Token      string     `json:"token,omitempty"` // Only set when creating, never persisted
	ExpiresAt  time.Time  `json:"expires_at"`
	AcceptedAt *time.Time `json:"accepted_at,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`

	// Joined fields (populated by queries)
	InvitedByName string `json:"invited_by_name,omitempty"`
}

// NewUserInvitation creates a new invitation with a secure random token
func NewUserInvitation(email string, invitedBy uuid.UUID, role UserRole, expiresIn time.Duration) (*UserInvitation, error) {
	if err := ValidateEmailDomain(email); err != nil {
		return nil, err
	}

	token, err := generateSecureToken(32)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	now := time.Now()
	return &UserInvitation{
		ID:        uuid.New(),
		Email:     strings.ToLower(email),
		InvitedBy: invitedBy,
		Role:      role,
		Token:     token,
		TokenHash: hashToken(token),
		ExpiresAt: now.Add(expiresIn),
		CreatedAt: now,
	}, nil
}

// Validate validates the invitation
func (i *UserInvitation) Validate() error {
	if i.ID == uuid.Nil {
		return fmt.Errorf("invitation ID is required")
	}
	if i.Email == "" {
		return fmt.Errorf("email is required")
	}
	if err := ValidateEmailDomain(i.Email); err != nil {
		return err
	}
	if i.InvitedBy == uuid.Nil {
		return fmt.Errorf("invited_by is required")
	}
	if err := i.Role.IsValid(); err != nil {
		return err
	}
	if i.TokenHash == "" {
		return fmt.Errorf("token_hash is required")
	}
	if i.ExpiresAt.IsZero() {
		return fmt.Errorf("expires_at is required")
	}
	return nil
}

// IsExpired checks if the invitation has expired
func (i *UserInvitation) IsExpired() bool {
	return time.Now().After(i.ExpiresAt)
}

// IsAccepted checks if the invitation has been accepted
func (i *UserInvitation) IsAccepted() bool {
	return i.AcceptedAt != nil
}

// IsValid checks if the invitation is still valid (not expired, not accepted)
func (i *UserInvitation) IsValid() bool {
	return !i.IsExpired() && !i.IsAccepted()
}

// MarkAccepted marks the invitation as accepted
func (i *UserInvitation) MarkAccepted() {
	now := time.Now()
	i.AcceptedAt = &now
}

// EmailVerificationToken represents a token for email verification
type EmailVerificationToken struct {
	ID         uuid.UUID  `json:"id"`
	UserID     uuid.UUID  `json:"user_id"`
	TokenHash  string     `json:"-"`
	Token      string     `json:"token,omitempty"` // Only set when creating
	ExpiresAt  time.Time  `json:"expires_at"`
	VerifiedAt *time.Time `json:"verified_at,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
}

// NewEmailVerificationToken creates a new verification token
func NewEmailVerificationToken(userID uuid.UUID, expiresIn time.Duration) (*EmailVerificationToken, error) {
	token, err := generateSecureToken(32)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	now := time.Now()
	return &EmailVerificationToken{
		ID:        uuid.New(),
		UserID:    userID,
		Token:     token,
		TokenHash: hashToken(token),
		ExpiresAt: now.Add(expiresIn),
		CreatedAt: now,
	}, nil
}

// Validate validates the verification token
func (t *EmailVerificationToken) Validate() error {
	if t.ID == uuid.Nil {
		return fmt.Errorf("token ID is required")
	}
	if t.UserID == uuid.Nil {
		return fmt.Errorf("user_id is required")
	}
	if t.TokenHash == "" {
		return fmt.Errorf("token_hash is required")
	}
	if t.ExpiresAt.IsZero() {
		return fmt.Errorf("expires_at is required")
	}
	return nil
}

// IsExpired checks if the token has expired
func (t *EmailVerificationToken) IsExpired() bool {
	return time.Now().After(t.ExpiresAt)
}

// IsVerified checks if the token has been used
func (t *EmailVerificationToken) IsVerified() bool {
	return t.VerifiedAt != nil
}

// IsValid checks if the token is still valid
func (t *EmailVerificationToken) IsValid() bool {
	return !t.IsExpired() && !t.IsVerified()
}

// MarkVerified marks the token as verified
func (t *EmailVerificationToken) MarkVerified() {
	now := time.Now()
	t.VerifiedAt = &now
}

// UserApprovalStatus represents the status of a user approval request
type UserApprovalStatus string

const (
	UserApprovalStatusPending  UserApprovalStatus = "pending"
	UserApprovalStatusApproved UserApprovalStatus = "approved"
	UserApprovalStatusRejected UserApprovalStatus = "rejected"
)

// IsValid checks if the status is valid
func (s UserApprovalStatus) IsValid() bool {
	switch s {
	case UserApprovalStatusPending, UserApprovalStatusApproved, UserApprovalStatusRejected:
		return true
	}
	return false
}

// UserApprovalRequest represents a request for admin approval
type UserApprovalRequest struct {
	ID              uuid.UUID          `json:"id"`
	UserID          uuid.UUID          `json:"user_id"`
	Status          UserApprovalStatus `json:"status"`
	ReviewedBy      *uuid.UUID         `json:"reviewed_by,omitempty"`
	ReviewedAt      *time.Time         `json:"reviewed_at,omitempty"`
	RejectionReason *string            `json:"rejection_reason,omitempty"`
	CreatedAt       time.Time          `json:"created_at"`

	// Joined fields (populated by queries)
	UserEmail      string `json:"user_email,omitempty"`
	UserName       string `json:"user_name,omitempty"`
	ReviewedByName string `json:"reviewed_by_name,omitempty"`
}

// NewUserApprovalRequest creates a new approval request
func NewUserApprovalRequest(userID uuid.UUID) *UserApprovalRequest {
	return &UserApprovalRequest{
		ID:        uuid.New(),
		UserID:    userID,
		Status:    UserApprovalStatusPending,
		CreatedAt: time.Now(),
	}
}

// Validate validates the approval request
func (r *UserApprovalRequest) Validate() error {
	if r.ID == uuid.Nil {
		return fmt.Errorf("request ID is required")
	}
	if r.UserID == uuid.Nil {
		return fmt.Errorf("user_id is required")
	}
	if !r.Status.IsValid() {
		return fmt.Errorf("invalid status: %s", r.Status)
	}
	if r.Status == UserApprovalStatusRejected && (r.RejectionReason == nil || *r.RejectionReason == "") {
		return fmt.Errorf("rejection_reason is required when status is rejected")
	}
	return nil
}

// IsPending checks if the request is still pending
func (r *UserApprovalRequest) IsPending() bool {
	return r.Status == UserApprovalStatusPending
}

// Approve marks the request as approved
func (r *UserApprovalRequest) Approve(reviewerID uuid.UUID) {
	now := time.Now()
	r.Status = UserApprovalStatusApproved
	r.ReviewedBy = &reviewerID
	r.ReviewedAt = &now
}

// Reject marks the request as rejected
func (r *UserApprovalRequest) Reject(reviewerID uuid.UUID, reason string) {
	now := time.Now()
	r.Status = UserApprovalStatusRejected
	r.ReviewedBy = &reviewerID
	r.ReviewedAt = &now
	r.RejectionReason = &reason
}

// LoginAttempt represents a login attempt for security tracking
type LoginAttempt struct {
	ID          uuid.UUID `json:"id"`
	Email       string    `json:"email"`
	IPAddress   string    `json:"ip_address"`
	UserAgent   string    `json:"user_agent,omitempty"`
	Success     bool      `json:"success"`
	AttemptedAt time.Time `json:"attempted_at"`
}

// NewLoginAttempt creates a new login attempt record
func NewLoginAttempt(email, ipAddress, userAgent string, success bool) *LoginAttempt {
	return &LoginAttempt{
		ID:          uuid.New(),
		Email:       strings.ToLower(email),
		IPAddress:   ipAddress,
		UserAgent:   userAgent,
		Success:     success,
		AttemptedAt: time.Now(),
	}
}

// SystemSetting represents a system configuration setting
type SystemSetting struct {
	Key         string     `json:"key"`
	Value       any        `json:"value"`
	Description string     `json:"description,omitempty"`
	UpdatedBy   *uuid.UUID `json:"updated_by,omitempty"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// UserFilter represents filters for listing users
type UserFilter struct {
	Search string      `json:"search,omitempty"`
	Role   *UserRole   `json:"role,omitempty"`
	Status *UserStatus `json:"status,omitempty"`
}

// CreateUserInput represents input for creating a user by admin
type CreateUserInput struct {
	Email    string   `json:"email"`
	Name     string   `json:"name"`
	Password string   `json:"password"`
	Role     UserRole `json:"role"`
}

// Validate validates the create user input
func (i *CreateUserInput) Validate() error {
	if i.Email == "" {
		return fmt.Errorf("email is required")
	}
	if err := ValidateEmailDomain(i.Email); err != nil {
		return err
	}
	if i.Name == "" {
		return fmt.Errorf("name is required")
	}
	if len(i.Name) < 2 {
		return fmt.Errorf("name must be at least 2 characters")
	}
	if i.Password == "" {
		return fmt.Errorf("password is required")
	}
	if err := ValidatePassword(i.Password); err != nil {
		return err
	}
	if err := i.Role.IsValid(); err != nil {
		return err
	}
	return nil
}

// CreateInvitationInput represents input for creating an invitation
type CreateInvitationInput struct {
	Email string   `json:"email"`
	Role  UserRole `json:"role"`
}

// Validate validates the invitation input
func (i *CreateInvitationInput) Validate() error {
	if i.Email == "" {
		return fmt.Errorf("email is required")
	}
	if err := ValidateEmailDomain(i.Email); err != nil {
		return err
	}
	if err := i.Role.IsValid(); err != nil {
		return err
	}
	return nil
}

// ChangePasswordInput represents input for changing password
type ChangePasswordInput struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

// Validate validates the change password input
func (i *ChangePasswordInput) Validate() error {
	if i.CurrentPassword == "" {
		return fmt.Errorf("current_password is required")
	}
	if i.NewPassword == "" {
		return fmt.Errorf("new_password is required")
	}
	if err := ValidatePassword(i.NewPassword); err != nil {
		return err
	}
	if i.CurrentPassword == i.NewPassword {
		return fmt.Errorf("new password must be different from current password")
	}
	return nil
}

// ValidatePassword validates password strength requirements
func ValidatePassword(password string) error {
	if len(password) < 8 {
		return fmt.Errorf("password must be at least 8 characters")
	}

	hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
	hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
	hasDigit := regexp.MustCompile(`[0-9]`).MatchString(password)

	if !hasUpper {
		return fmt.Errorf("password must contain at least one uppercase letter")
	}
	if !hasLower {
		return fmt.Errorf("password must contain at least one lowercase letter")
	}
	if !hasDigit {
		return fmt.Errorf("password must contain at least one digit")
	}

	return nil
}

// Helper functions

// generateSecureToken generates a cryptographically secure random token
func generateSecureToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// hashToken hashes a token using SHA-256
func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

// HashToken is the exported version for use by other packages
func HashToken(token string) string {
	return hashToken(token)
}

// PasswordResetToken represents a token for password reset
type PasswordResetToken struct {
	ID        uuid.UUID  `json:"id"`
	UserID    uuid.UUID  `json:"user_id"`
	TokenHash string     `json:"-"`
	Token     string     `json:"token,omitempty"` // Only set when creating
	ExpiresAt time.Time  `json:"expires_at"`
	UsedAt    *time.Time `json:"used_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

// NewPasswordResetToken creates a new password reset token
func NewPasswordResetToken(userID uuid.UUID, expiresIn time.Duration) (*PasswordResetToken, error) {
	token, err := generateSecureToken(32)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	now := time.Now()
	return &PasswordResetToken{
		ID:        uuid.New(),
		UserID:    userID,
		Token:     token,
		TokenHash: hashToken(token),
		ExpiresAt: now.Add(expiresIn),
		CreatedAt: now,
	}, nil
}

// Validate validates the password reset token
func (t *PasswordResetToken) Validate() error {
	if t.ID == uuid.Nil {
		return fmt.Errorf("token ID is required")
	}
	if t.UserID == uuid.Nil {
		return fmt.Errorf("user_id is required")
	}
	if t.TokenHash == "" {
		return fmt.Errorf("token_hash is required")
	}
	if t.ExpiresAt.IsZero() {
		return fmt.Errorf("expires_at is required")
	}
	return nil
}

// IsExpired checks if the token has expired
func (t *PasswordResetToken) IsExpired() bool {
	return time.Now().After(t.ExpiresAt)
}

// IsUsed checks if the token has been used
func (t *PasswordResetToken) IsUsed() bool {
	return t.UsedAt != nil
}

// IsValid checks if the token is still valid
func (t *PasswordResetToken) IsValid() bool {
	return !t.IsExpired() && !t.IsUsed()
}

// MarkUsed marks the token as used
func (t *PasswordResetToken) MarkUsed() {
	now := time.Now()
	t.UsedAt = &now
}

// ResetPasswordInput represents input for resetting password with token
type ResetPasswordInput struct {
	Token       string `json:"token"`
	NewPassword string `json:"new_password"`
}

// Validate validates the reset password input
func (i *ResetPasswordInput) Validate() error {
	if i.Token == "" {
		return fmt.Errorf("token is required")
	}
	if i.NewPassword == "" {
		return fmt.Errorf("new_password is required")
	}
	if err := ValidatePassword(i.NewPassword); err != nil {
		return err
	}
	return nil
}

// CanAssignRole checks if a user with sourceRole can assign targetRole
// Super admin can assign any role
// Admin can assign any role except super_admin
func CanAssignRole(sourceRole, targetRole UserRole) bool {
	if sourceRole == RoleSuperAdmin {
		return true
	}
	if sourceRole == RoleAdmin {
		return targetRole != RoleSuperAdmin
	}
	return false
}
