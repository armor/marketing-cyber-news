package domain

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

// ApprovalStatus represents the current approval state of an article
type ApprovalStatus string

const (
	StatusPendingMarketing ApprovalStatus = "pending_marketing"
	StatusPendingBranding  ApprovalStatus = "pending_branding"
	StatusPendingSocL1     ApprovalStatus = "pending_soc_l1"
	StatusPendingSocL3     ApprovalStatus = "pending_soc_l3"
	StatusPendingCISO      ApprovalStatus = "pending_ciso"
	StatusApproved         ApprovalStatus = "approved"
	StatusRejected         ApprovalStatus = "rejected"
	StatusReleased         ApprovalStatus = "released"
)

// IsValid checks if the approval status is valid
func (s ApprovalStatus) IsValid() bool {
	switch s {
	case StatusPendingMarketing, StatusPendingBranding, StatusPendingSocL1,
		StatusPendingSocL3, StatusPendingCISO, StatusApproved,
		StatusRejected, StatusReleased:
		return true
	default:
		return false
	}
}

// NextOnApprove returns the next status after approval
func (s ApprovalStatus) NextOnApprove() (ApprovalStatus, error) {
	switch s {
	case StatusPendingMarketing:
		return StatusPendingBranding, nil
	case StatusPendingBranding:
		return StatusPendingSocL1, nil
	case StatusPendingSocL1:
		return StatusPendingSocL3, nil
	case StatusPendingSocL3:
		return StatusPendingCISO, nil
	case StatusPendingCISO:
		return StatusApproved, nil
	default:
		return "", fmt.Errorf("cannot approve from status: %s", s)
	}
}

// RequiredGate returns the gate required for the current status
func (s ApprovalStatus) RequiredGate() ApprovalGate {
	switch s {
	case StatusPendingMarketing:
		return GateMarketing
	case StatusPendingBranding:
		return GateBranding
	case StatusPendingSocL1:
		return GateSocL1
	case StatusPendingSocL3:
		return GateSocL3
	case StatusPendingCISO:
		return GateCISO
	default:
		return ""
	}
}

// String returns the string representation of the status
func (s ApprovalStatus) String() string {
	return string(s)
}

// ApprovalGate represents individual approval gates in the workflow
type ApprovalGate string

const (
	GateMarketing ApprovalGate = "marketing"
	GateBranding  ApprovalGate = "branding"
	GateSocL1     ApprovalGate = "soc_l1"
	GateSocL3     ApprovalGate = "soc_l3"
	GateCISO      ApprovalGate = "ciso"
)

// GateOrder defines the sequential order of approval gates
var GateOrder = []ApprovalGate{
	GateMarketing,
	GateBranding,
	GateSocL1,
	GateSocL3,
	GateCISO,
}

// IsValid checks if the approval gate is valid
func (g ApprovalGate) IsValid() bool {
	switch g {
	case GateMarketing, GateBranding, GateSocL1, GateSocL3, GateCISO:
		return true
	default:
		return false
	}
}

// String returns the string representation of the gate
func (g ApprovalGate) String() string {
	return string(g)
}

// UserRole extensions for approval workflow
// These extend the UserRole type defined in user.go
const (
	RoleMarketing  UserRole = "marketing"
	RoleBranding   UserRole = "branding"
	RoleSocLevel1  UserRole = "soc_level_1"
	RoleSocLevel3  UserRole = "soc_level_3"
	RoleCISO       UserRole = "ciso"
	RoleSuperAdmin UserRole = "super_admin"
)

// CanApproveGate checks if a user role can approve a specific gate
func (r UserRole) CanApproveGate(gate ApprovalGate) bool {
	// Admin and super_admin can approve all gates
	if r == RoleAdmin || r == RoleSuperAdmin {
		return true
	}

	// Role-specific gate permissions
	switch r {
	case RoleMarketing:
		return gate == GateMarketing
	case RoleBranding:
		return gate == GateBranding
	case RoleSocLevel1:
		return gate == GateSocL1
	case RoleSocLevel3:
		return gate == GateSocL3
	case RoleCISO:
		return gate == GateCISO
	default:
		return false
	}
}

// CanRelease checks if a user role can release approved articles
func (r UserRole) CanRelease() bool {
	// Only CISO, admin, and super_admin can release articles
	return r == RoleCISO || r == RoleAdmin || r == RoleSuperAdmin
}

// CanResetArticle checks if a user role can reset rejected articles
func (r UserRole) CanResetArticle() bool {
	// Only admin and super_admin can reset rejected articles
	return r == RoleAdmin || r == RoleSuperAdmin
}

// GetTargetGate returns the gate this role is responsible for
func (r UserRole) GetTargetGate() ApprovalGate {
	switch r {
	case RoleMarketing:
		return GateMarketing
	case RoleBranding:
		return GateBranding
	case RoleSocLevel1:
		return GateSocL1
	case RoleSocLevel3:
		return GateSocL3
	case RoleCISO:
		return GateCISO
	default:
		return "" // Admin/super_admin don't have a specific gate
	}
}

// ArticleApproval represents a single approval event for an article at a specific gate
type ArticleApproval struct {
	ID         uuid.UUID    `json:"id" db:"id"`
	ArticleID  uuid.UUID    `json:"article_id" db:"article_id"`
	Gate       ApprovalGate `json:"gate" db:"gate"`
	ApprovedBy uuid.UUID    `json:"approved_by" db:"approved_by"`
	ApprovedAt time.Time    `json:"approved_at" db:"approved_at"`
	Notes      *string      `json:"notes,omitempty" db:"notes"`

	// Joined fields (not stored in database, populated from joins)
	ApproverName  string `json:"approver_name,omitempty" db:"approver_name"`
	ApproverEmail string `json:"approver_email,omitempty" db:"approver_email"`
}

// Validate validates the article approval
func (a *ArticleApproval) Validate() error {
	if a.ID == uuid.Nil {
		return fmt.Errorf("approval ID is required")
	}

	if a.ArticleID == uuid.Nil {
		return fmt.Errorf("article ID is required")
	}

	if !a.Gate.IsValid() {
		return fmt.Errorf("invalid approval gate: %s", a.Gate)
	}

	if a.ApprovedBy == uuid.Nil {
		return fmt.Errorf("approved_by user ID is required")
	}

	if a.ApprovedAt.IsZero() {
		return fmt.Errorf("approved_at timestamp is required")
	}

	return nil
}

// StatusTransitionValid checks if a status transition is valid
func StatusTransitionValid(from, to ApprovalStatus) bool {
	if !from.IsValid() || !to.IsValid() {
		return false
	}

	// Rejection is allowed from any pending status
	if to == StatusRejected {
		switch from {
		case StatusPendingMarketing, StatusPendingBranding, StatusPendingSocL1,
			StatusPendingSocL3, StatusPendingCISO:
			return true
		default:
			return false
		}
	}

	// Reset to pending_marketing only from rejected
	if to == StatusPendingMarketing {
		return from == StatusRejected
	}

	// Release only from approved
	if to == StatusReleased {
		return from == StatusApproved
	}

	// Forward progression through approval gates
	expectedNext, err := from.NextOnApprove()
	if err != nil {
		return false
	}

	return to == expectedNext
}

// RoleCanApproveStatus checks if a role can approve an article in the given status
func RoleCanApproveStatus(role UserRole, status ApprovalStatus) bool {
	if role.IsValid() != nil {
		return false
	}

	if !status.IsValid() {
		return false
	}

	// Only pending statuses can be approved
	switch status {
	case StatusPendingMarketing, StatusPendingBranding, StatusPendingSocL1,
		StatusPendingSocL3, StatusPendingCISO:
		// Check if role can approve the required gate
		requiredGate := status.RequiredGate()
		return role.CanApproveGate(requiredGate)
	default:
		return false
	}
}
