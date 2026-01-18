package domain

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// ClaimType represents the type of claim in the library
type ClaimType string

const (
	ClaimTypeClaim      ClaimType = "claim"
	ClaimTypeDisclaimer ClaimType = "disclaimer"
	ClaimTypeDoNotSay   ClaimType = "do_not_say"
)

// IsValid checks if the claim type is valid
func (c ClaimType) IsValid() bool {
	switch c {
	case ClaimTypeClaim, ClaimTypeDisclaimer, ClaimTypeDoNotSay:
		return true
	default:
		return false
	}
}

// String returns the string representation
func (c ClaimType) String() string {
	return string(c)
}

// ClaimApprovalStatus represents the approval status of a claim
type ClaimApprovalStatus string

const (
	ClaimStatusPending  ClaimApprovalStatus = "pending"
	ClaimStatusApproved ClaimApprovalStatus = "approved"
	ClaimStatusRejected ClaimApprovalStatus = "rejected"
	ClaimStatusExpired  ClaimApprovalStatus = "expired"
)

// IsValid checks if the claim approval status is valid
func (s ClaimApprovalStatus) IsValid() bool {
	switch s {
	case ClaimStatusPending, ClaimStatusApproved, ClaimStatusRejected, ClaimStatusExpired:
		return true
	default:
		return false
	}
}

// String returns the string representation
func (s ClaimApprovalStatus) String() string {
	return string(s)
}

// ClaimsLibraryEntry represents a single claim in the library
type ClaimsLibraryEntry struct {
	ID              uuid.UUID           `json:"id"`
	ClaimText       string              `json:"claim_text"`
	ClaimType       ClaimType           `json:"claim_type"`
	Category        string              `json:"category"`
	ApprovalStatus  ClaimApprovalStatus `json:"approval_status"`
	ApprovedBy      *uuid.UUID          `json:"approved_by,omitempty"`
	ApprovedAt      *time.Time          `json:"approved_at,omitempty"`
	ExpiresAt       *time.Time          `json:"expires_at,omitempty"`
	RejectionReason *string             `json:"rejection_reason,omitempty"`
	SourceReference *string             `json:"source_reference,omitempty"`
	UsageCount      int                 `json:"usage_count"`
	LastUsedAt      *time.Time          `json:"last_used_at,omitempty"`
	Tags            []string            `json:"tags"`
	Notes           *string             `json:"notes,omitempty"`
	CreatedBy       uuid.UUID           `json:"created_by"`
	CreatedAt       time.Time           `json:"created_at"`
	UpdatedAt       time.Time           `json:"updated_at"`
}

// Validate performs validation on the claims library entry
func (c *ClaimsLibraryEntry) Validate() error {
	if strings.TrimSpace(c.ClaimText) == "" {
		return fmt.Errorf("claim_text is required")
	}

	if len(c.ClaimText) > 5000 {
		return fmt.Errorf("claim_text must not exceed 5000 characters")
	}

	if !c.ClaimType.IsValid() {
		return fmt.Errorf("invalid claim_type: %s", c.ClaimType)
	}

	if strings.TrimSpace(c.Category) == "" {
		return fmt.Errorf("category is required")
	}

	if len(c.Category) > 100 {
		return fmt.Errorf("category must not exceed 100 characters")
	}

	if !c.ApprovalStatus.IsValid() {
		return fmt.Errorf("invalid approval_status: %s", c.ApprovalStatus)
	}

	if c.ApprovalStatus == ClaimStatusApproved && c.ApprovedBy == nil {
		return fmt.Errorf("approved_by is required when status is approved")
	}

	if c.ApprovalStatus == ClaimStatusRejected && (c.RejectionReason == nil || *c.RejectionReason == "") {
		return fmt.Errorf("rejection_reason is required when status is rejected")
	}

	if c.CreatedBy == uuid.Nil {
		return fmt.Errorf("created_by is required")
	}

	return nil
}

// IsExpired checks if the claim has expired
func (c *ClaimsLibraryEntry) IsExpired() bool {
	if c.ExpiresAt == nil {
		return false
	}
	return time.Now().After(*c.ExpiresAt)
}

// IsUsable checks if the claim can be used in content
func (c *ClaimsLibraryEntry) IsUsable() bool {
	return c.ApprovalStatus == ClaimStatusApproved && !c.IsExpired()
}

// ClaimsLibraryFilter represents filters for querying claims
type ClaimsLibraryFilter struct {
	ClaimType      *ClaimType           `json:"claim_type,omitempty"`
	Category       *string              `json:"category,omitempty"`
	ApprovalStatus *ClaimApprovalStatus `json:"approval_status,omitempty"`
	Tags           []string             `json:"tags,omitempty"`
	SearchText     *string              `json:"search_text,omitempty"`
	IncludeExpired bool                 `json:"include_expired"`
	CreatedBy      *uuid.UUID           `json:"created_by,omitempty"`
	Page           int                  `json:"page"`
	PageSize       int                  `json:"page_size"`
}

// Validate validates the filter parameters
func (f *ClaimsLibraryFilter) Validate() error {
	if f.PageSize < 0 {
		return fmt.Errorf("page_size must be non-negative")
	}

	if f.PageSize > 100 {
		return fmt.Errorf("page_size cannot exceed 100")
	}

	if f.Page < 1 {
		return fmt.Errorf("page must be at least 1")
	}

	if f.ClaimType != nil && !f.ClaimType.IsValid() {
		return fmt.Errorf("invalid claim_type filter: %s", *f.ClaimType)
	}

	if f.ApprovalStatus != nil && !f.ApprovalStatus.IsValid() {
		return fmt.Errorf("invalid approval_status filter: %s", *f.ApprovalStatus)
	}

	return nil
}

// Offset calculates the database offset based on page and page_size
func (f *ClaimsLibraryFilter) Offset() int {
	if f.Page < 1 {
		return 0
	}
	return (f.Page - 1) * f.PageSize
}

// WithDefaults sets default values for the filter
func (f *ClaimsLibraryFilter) WithDefaults() {
	if f.PageSize <= 0 {
		f.PageSize = 20
	}
	if f.Page <= 0 {
		f.Page = 1
	}
}

// IssueApproval represents a single approval event for a newsletter issue at a specific gate
type IssueApproval struct {
	ID         uuid.UUID    `json:"id"`
	IssueID    uuid.UUID    `json:"issue_id"`
	Gate       ApprovalGate `json:"gate"`
	ApprovedBy uuid.UUID    `json:"approved_by"`
	ApprovedAt time.Time    `json:"approved_at"`
	Notes      *string      `json:"notes,omitempty"`

	// Joined fields (not stored in database, populated from joins)
	ApproverName  string `json:"approver_name,omitempty"`
	ApproverEmail string `json:"approver_email,omitempty"`
}

// Validate validates the issue approval
func (a *IssueApproval) Validate() error {
	if a.ID == uuid.Nil {
		return fmt.Errorf("approval ID is required")
	}

	if a.IssueID == uuid.Nil {
		return fmt.Errorf("issue ID is required")
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

// ClaimValidationResult represents the result of validating content against do-not-say items
type ClaimValidationResult struct {
	IsValid    bool             `json:"is_valid"`
	Violations []ClaimViolation `json:"violations"`
}

// ClaimViolation represents a single violation found during validation
type ClaimViolation struct {
	ClaimID       uuid.UUID  `json:"claim_id"`
	ClaimText     string     `json:"claim_text"`
	MatchedPhrase string     `json:"matched_phrase"`
	BlockID       *uuid.UUID `json:"block_id,omitempty"`
	Position      *struct {
		Start int `json:"start"`
		End   int `json:"end"`
	} `json:"position,omitempty"`
}
