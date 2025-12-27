package domain

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

// CadenceType represents newsletter delivery frequency
type CadenceType string

const (
	CadenceWeekly   CadenceType = "weekly"
	CadenceBiWeekly CadenceType = "bi-weekly"
	CadenceMonthly  CadenceType = "monthly"
)

// IsValid checks if the cadence type is valid
func (c CadenceType) IsValid() bool {
	switch c {
	case CadenceWeekly, CadenceBiWeekly, CadenceMonthly:
		return true
	default:
		return false
	}
}

// String returns the string representation of the cadence type
func (c CadenceType) String() string {
	return string(c)
}

// ApprovalTier represents the approval workflow tier
type ApprovalTier string

const (
	ApprovalTierNone ApprovalTier = "none"  // Auto-approved, no human review
	ApprovalTier1    ApprovalTier = "tier1" // Tier 1: Marketing/Branding approval
	ApprovalTier2    ApprovalTier = "tier2" // Tier 2: Branding/CISO approval (more restrictive)
	ApprovalTier3    ApprovalTier = "tier3" // Tier 3: CISO/Admin approval (most restrictive)

	// Legacy aliases for backwards compatibility
	TierOne ApprovalTier = "tier1"
	TierTwo ApprovalTier = "tier2"
)

// IsValid checks if the approval tier is valid
func (a ApprovalTier) IsValid() bool {
	switch a {
	case ApprovalTierNone, ApprovalTier1, ApprovalTier2, ApprovalTier3:
		return true
	default:
		return false
	}
}

// String returns the string representation of the approval tier
func (a ApprovalTier) String() string {
	return string(a)
}

// RiskLevel represents the risk assessment level
type RiskLevel string

const (
	RiskStandard     RiskLevel = "standard"
	RiskHigh         RiskLevel = "high"
	RiskExperimental RiskLevel = "experimental"
)

// IsValid checks if the risk level is valid
func (r RiskLevel) IsValid() bool {
	switch r {
	case RiskStandard, RiskHigh, RiskExperimental:
		return true
	default:
		return false
	}
}

// String returns the string representation of the risk level
func (r RiskLevel) String() string {
	return string(r)
}

// SubjectLineStyle represents the style of subject lines
type SubjectLineStyle string

const (
	StylePainFirst        SubjectLineStyle = "pain_first"
	StyleOpportunityFirst SubjectLineStyle = "opportunity_first"
	StyleVisionary        SubjectLineStyle = "visionary"
)

// IsValid checks if the subject line style is valid
func (s SubjectLineStyle) IsValid() bool {
	switch s {
	case StylePainFirst, StyleOpportunityFirst, StyleVisionary:
		return true
	default:
		return false
	}
}

// String returns the string representation of the subject line style
func (s SubjectLineStyle) String() string {
	return string(s)
}

// NewsletterConfiguration represents global and segment-level settings
// controlling newsletter generation and delivery
type NewsletterConfiguration struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description,omitempty"`
	SegmentID   *uuid.UUID `json:"segment_id,omitempty"`

	// Cadence Settings
	Cadence       CadenceType `json:"cadence"`
	SendDayOfWeek *int        `json:"send_day_of_week,omitempty"` // 0=Sunday, 1=Monday, etc.
	SendTimeUTC   *time.Time  `json:"send_time_utc,omitempty"`
	Timezone      string      `json:"timezone"`

	// Content Mix Settings
	MaxBlocks            int     `json:"max_blocks"`
	EducationRatioMin    float64 `json:"education_ratio_min"`
	ContentFreshnessDays int     `json:"content_freshness_days"`
	HeroTopicPriority    *string `json:"hero_topic_priority,omitempty"`
	FrameworkFocus       *string `json:"framework_focus,omitempty"`

	// Brand Voice Settings
	SubjectLineStyle SubjectLineStyle `json:"subject_line_style"`
	MaxMetaphors     int              `json:"max_metaphors"`
	BannedPhrases    []string         `json:"banned_phrases"`

	// Approval Settings
	ApprovalTier ApprovalTier `json:"approval_tier"`
	RiskLevel    RiskLevel    `json:"risk_level"`

	// AI Provider Settings
	AIProvider    string `json:"ai_provider"`
	AIModel       string `json:"ai_model"`
	PromptVersion int    `json:"prompt_version"`

	// Metadata
	IsActive  bool      `json:"is_active"`
	CreatedBy uuid.UUID `json:"created_by"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Validate performs comprehensive validation on the newsletter configuration
func (n *NewsletterConfiguration) Validate() error {
	if n.Name == "" {
		return fmt.Errorf("name is required")
	}

	if !n.Cadence.IsValid() {
		return fmt.Errorf("invalid cadence: %s", n.Cadence)
	}

	if n.SendDayOfWeek != nil {
		if *n.SendDayOfWeek < 0 || *n.SendDayOfWeek > 6 {
			return fmt.Errorf("send_day_of_week must be between 0 (Sunday) and 6 (Saturday)")
		}
	}

	if n.Timezone == "" {
		return fmt.Errorf("timezone is required")
	}

	if n.MaxBlocks < 1 || n.MaxBlocks > 10 {
		return fmt.Errorf("max_blocks must be between 1 and 10")
	}

	if n.EducationRatioMin < 0.0 || n.EducationRatioMin > 1.0 {
		return fmt.Errorf("education_ratio_min must be between 0.0 and 1.0")
	}

	if n.ContentFreshnessDays < 1 {
		return fmt.Errorf("content_freshness_days must be at least 1")
	}

	if !n.SubjectLineStyle.IsValid() {
		return fmt.Errorf("invalid subject_line_style: %s", n.SubjectLineStyle)
	}

	if n.MaxMetaphors < 0 {
		return fmt.Errorf("max_metaphors must be non-negative")
	}

	if !n.ApprovalTier.IsValid() {
		return fmt.Errorf("invalid approval_tier: %s", n.ApprovalTier)
	}

	if !n.RiskLevel.IsValid() {
		return fmt.Errorf("invalid risk_level: %s", n.RiskLevel)
	}

	if n.AIProvider == "" {
		return fmt.Errorf("ai_provider is required")
	}

	if n.AIModel == "" {
		return fmt.Errorf("ai_model is required")
	}

	if n.PromptVersion < 1 {
		return fmt.Errorf("prompt_version must be at least 1")
	}

	if n.CreatedBy == uuid.Nil {
		return fmt.Errorf("created_by is required")
	}

	return nil
}

// NewsletterConfigFilter represents filters for querying newsletter configurations
type NewsletterConfigFilter struct {
	SegmentID  *uuid.UUID `json:"segment_id,omitempty"`
	IsActive   *bool      `json:"is_active,omitempty"`
	Cadence    *CadenceType `json:"cadence,omitempty"`
	RiskLevel  *RiskLevel `json:"risk_level,omitempty"`
	Limit      int        `json:"limit"`
	Page       int        `json:"page"`
}

// Validate validates the filter parameters
func (f *NewsletterConfigFilter) Validate() error {
	if f.Limit < 0 {
		return fmt.Errorf("limit must be non-negative")
	}

	if f.Limit > 100 {
		return fmt.Errorf("limit cannot exceed 100")
	}

	if f.Page < 1 {
		return fmt.Errorf("page must be at least 1")
	}

	if f.Cadence != nil {
		if !f.Cadence.IsValid() {
			return fmt.Errorf("invalid cadence filter: %s", *f.Cadence)
		}
	}

	if f.RiskLevel != nil {
		if !f.RiskLevel.IsValid() {
			return fmt.Errorf("invalid risk_level filter: %s", *f.RiskLevel)
		}
	}

	return nil
}

// Offset calculates the database offset based on page and limit
func (f *NewsletterConfigFilter) Offset() int {
	if f.Page < 1 {
		return 0
	}
	return (f.Page - 1) * f.Limit
}
