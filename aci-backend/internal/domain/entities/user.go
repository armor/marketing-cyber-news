package entities

import (
	"time"

	"github.com/google/uuid"
)

// UserRole represents the role of a user in the system
type UserRole string

const (
	RoleUser       UserRole = "user"
	RoleAdmin      UserRole = "admin"
	RoleAnalyst    UserRole = "analyst"
	RoleViewer     UserRole = "viewer"
	RoleMarketing  UserRole = "marketing"
	RoleBranding   UserRole = "branding"
	RoleSocLevel1  UserRole = "soc_level_1"
	RoleSocLevel3  UserRole = "soc_level_3"
	RoleCISO       UserRole = "ciso"
	RoleSuperAdmin UserRole = "super_admin"
)

// SubscriptionTier represents user subscription levels
type SubscriptionTier string

const (
	SubscriptionFree       SubscriptionTier = "free"
	SubscriptionPremium    SubscriptionTier = "premium"
	SubscriptionEnterprise SubscriptionTier = "enterprise"
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

// User represents a user in the system
type User struct {
	ID                  uuid.UUID
	Email               string
	PasswordHash        string
	Name                string
	Role                UserRole
	Status              UserStatus
	SubscriptionTier    SubscriptionTier
	EmailVerified       bool
	ForcePasswordChange bool
	LockedUntil         *time.Time
	FailedLoginCount    int
	CreatedAt           time.Time
	UpdatedAt           time.Time
	LastLoginAt         *time.Time
}

// NewUser creates a new user with default values
func NewUser(email, passwordHash, name string) *User {
	now := time.Now()
	return &User{
		ID:                  uuid.New(),
		Email:               email,
		PasswordHash:        passwordHash,
		Name:                name,
		Role:                RoleUser,
		Status:              UserStatusActive,
		SubscriptionTier:    SubscriptionFree,
		EmailVerified:       false,
		ForcePasswordChange: false,
		FailedLoginCount:    0,
		CreatedAt:           now,
		UpdatedAt:           now,
	}
}

// NewUserWithStatus creates a new user with a specific status
func NewUserWithStatus(email, passwordHash, name string, status UserStatus) *User {
	user := NewUser(email, passwordHash, name)
	user.Status = status
	return user
}

// IsAdmin checks if the user has admin or super_admin role
func (u *User) IsAdmin() bool {
	return u.Role == RoleAdmin || u.Role == RoleSuperAdmin
}

// IsSuperAdmin checks if the user has super_admin role
func (u *User) IsSuperAdmin() bool {
	return u.Role == RoleSuperAdmin
}

// IsLocked returns true if the user account is currently locked
func (u *User) IsLocked() bool {
	if u.LockedUntil == nil {
		return false
	}
	return time.Now().Before(*u.LockedUntil)
}

// CanLogin returns true if the user can login (active and not locked)
func (u *User) CanLogin() bool {
	return u.Status == UserStatusActive && !u.IsLocked()
}

// MarkEmailVerified marks the user's email as verified
func (u *User) MarkEmailVerified() {
	u.EmailVerified = true
	u.UpdatedAt = time.Now()
}

// UpdateLastLogin updates the last login timestamp
func (u *User) UpdateLastLogin() {
	now := time.Now()
	u.LastLoginAt = &now
}
