package domain

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

// IssueStatus represents the current state of a newsletter issue
type IssueStatus string

const (
	IssueStatusDraft           IssueStatus = "draft"
	IssueStatusPendingApproval IssueStatus = "pending_approval"
	IssueStatusApproved        IssueStatus = "approved"
	IssueStatusScheduled       IssueStatus = "scheduled"
	IssueStatusSent            IssueStatus = "sent"
	IssueStatusFailed          IssueStatus = "failed"
)

// IsValid checks if the issue status is valid
func (s IssueStatus) IsValid() bool {
	switch s {
	case IssueStatusDraft, IssueStatusPendingApproval, IssueStatusApproved,
		IssueStatusScheduled, IssueStatusSent, IssueStatusFailed:
		return true
	default:
		return false
	}
}

// BlockType represents the type of content block in a newsletter
type BlockType string

const (
	BlockTypeHero      BlockType = "hero"
	BlockTypeNews      BlockType = "news"
	BlockTypeContent   BlockType = "content"
	BlockTypeEvents    BlockType = "events"
	BlockTypeSpotlight BlockType = "spotlight"
)

// IsValid checks if the block type is valid
func (b BlockType) IsValid() bool {
	switch b {
	case BlockTypeHero, BlockTypeNews, BlockTypeContent, BlockTypeEvents, BlockTypeSpotlight:
		return true
	default:
		return false
	}
}

// NewsletterIssue represents a complete newsletter issue
type NewsletterIssue struct {
	ID              uuid.UUID `json:"id"`
	ConfigurationID uuid.UUID `json:"configuration_id"`
	SegmentID       uuid.UUID `json:"segment_id"`

	// Identification
	IssueNumber int       `json:"issue_number"`
	IssueDate   time.Time `json:"issue_date"`

	// Content
	SubjectLines        []string `json:"subject_lines"`
	SelectedSubjectLine *string  `json:"selected_subject_line,omitempty"`
	Preheader           *string  `json:"preheader,omitempty"`
	IntroTemplate       *string  `json:"intro_template,omitempty"`

	// Status
	Status IssueStatus `json:"status"`

	// Approval
	ApprovedBy      *uuid.UUID `json:"approved_by,omitempty"`
	ApprovedAt      *time.Time `json:"approved_at,omitempty"`
	RejectionReason *string    `json:"rejection_reason,omitempty"`
	RejectedBy      *uuid.UUID `json:"rejected_by,omitempty"`
	RejectedAt      *time.Time `json:"rejected_at,omitempty"`

	// Multi-Gate Approval (7-gate workflow)
	CurrentApprovalStage *ApprovalGate `json:"current_approval_stage,omitempty"`
	VoCNotes             *string       `json:"voc_notes,omitempty"`
	ComplianceNotes      *string       `json:"compliance_notes,omitempty"`
	Approvals            []IssueApproval `json:"approvals,omitempty"` // Joined field

	// Delivery
	ScheduledFor  *time.Time `json:"scheduled_for,omitempty"`
	SentAt        *time.Time `json:"sent_at,omitempty"`
	ESPCampaignID *string    `json:"esp_campaign_id,omitempty"`

	// Metrics
	TotalRecipients   int `json:"total_recipients"`
	TotalDelivered    int `json:"total_delivered"`
	TotalOpens        int `json:"total_opens"`
	TotalClicks       int `json:"total_clicks"`
	TotalBounces      int `json:"total_bounces"`
	TotalUnsubscribes int `json:"total_unsubscribes"`
	TotalComplaints   int `json:"total_complaints"`

	// Version
	Version            int                    `json:"version"`
	AIModelUsed        *string                `json:"ai_model_used,omitempty"`
	PromptVersionUsed  *int                   `json:"prompt_version_used,omitempty"`
	GenerationMetadata map[string]interface{} `json:"generation_metadata,omitempty"`

	// Relationships
	Blocks []NewsletterBlock `json:"blocks,omitempty"`

	// Metadata
	CreatedBy *uuid.UUID `json:"created_by,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

// NewsletterBlock represents a content block within a newsletter issue
type NewsletterBlock struct {
	ID            uuid.UUID  `json:"id"`
	IssueID       uuid.UUID  `json:"issue_id"`
	ContentItemID *uuid.UUID `json:"content_item_id,omitempty"`

	// Configuration
	BlockType BlockType `json:"block_type"`
	Position  int       `json:"position"`

	// Content
	Title    *string `json:"title,omitempty"`
	Teaser   *string `json:"teaser,omitempty"`
	CTALabel *string `json:"cta_label,omitempty"`
	CTAURL   *string `json:"cta_url,omitempty"`

	// Categorization
	IsPromotional bool     `json:"is_promotional"`
	TopicTags     []string `json:"topic_tags,omitempty"`

	// Claims Library References
	ClaimsReferences []uuid.UUID `json:"claims_references,omitempty"`

	// Metrics
	Clicks int `json:"clicks"`

	// Relationships
	ContentItem *ContentItem `json:"content_item,omitempty"`

	// Metadata
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// NewsletterIssueFilter represents filters for querying newsletter issues
type NewsletterIssueFilter struct {
	Status          *IssueStatus `json:"status,omitempty"`
	ConfigurationID *uuid.UUID   `json:"configuration_id,omitempty"`
	SegmentID       *uuid.UUID   `json:"segment_id,omitempty"`
	StartDate       *time.Time   `json:"start_date,omitempty"`
	EndDate         *time.Time   `json:"end_date,omitempty"`
	Limit           int          `json:"limit"`
	Offset          int          `json:"offset"`
}

// Validate validates the newsletter issue
func (n *NewsletterIssue) Validate() error {
	if n.ConfigurationID == uuid.Nil {
		return fmt.Errorf("configuration ID is required")
	}

	if n.SegmentID == uuid.Nil {
		return fmt.Errorf("segment ID is required")
	}

	if n.IssueNumber <= 0 {
		return fmt.Errorf("issue number must be positive")
	}

	if n.IssueDate.IsZero() {
		return fmt.Errorf("issue date is required")
	}

	if !n.Status.IsValid() {
		return fmt.Errorf("invalid status: %s", n.Status)
	}

	if len(n.SubjectLines) == 0 {
		return fmt.Errorf("at least one subject line is required")
	}

	if n.Version < 0 {
		return fmt.Errorf("version cannot be negative")
	}

	// Validate metrics are non-negative
	if n.TotalRecipients < 0 || n.TotalDelivered < 0 || n.TotalOpens < 0 ||
		n.TotalClicks < 0 || n.TotalBounces < 0 || n.TotalUnsubscribes < 0 ||
		n.TotalComplaints < 0 {
		return fmt.Errorf("metrics cannot be negative")
	}

	// Validate approval state
	if n.Status == IssueStatusApproved {
		if n.ApprovedBy == nil {
			return fmt.Errorf("approved_by is required for approved status")
		}
		if n.ApprovedAt == nil {
			return fmt.Errorf("approved_at is required for approved status")
		}
	}

	// Validate rejection state
	if n.RejectedBy != nil || n.RejectedAt != nil {
		if n.RejectedBy == nil || n.RejectedAt == nil {
			return fmt.Errorf("both rejected_by and rejected_at must be set together")
		}
		if n.RejectionReason == nil || *n.RejectionReason == "" {
			return fmt.Errorf("rejection_reason is required when issue is rejected")
		}
	}

	// Validate scheduled state
	if n.Status == IssueStatusScheduled {
		if n.ScheduledFor == nil {
			return fmt.Errorf("scheduled_for is required for scheduled status")
		}
	}

	// Validate sent state
	if n.Status == IssueStatusSent {
		if n.SentAt == nil {
			return fmt.Errorf("sent_at is required for sent status")
		}
	}

	return nil
}

// Validate validates the newsletter block
func (b *NewsletterBlock) Validate() error {
	if b.IssueID == uuid.Nil {
		return fmt.Errorf("issue ID is required")
	}

	if !b.BlockType.IsValid() {
		return fmt.Errorf("invalid block type: %s", b.BlockType)
	}

	if b.Position < 0 {
		return fmt.Errorf("position cannot be negative")
	}

	if b.Clicks < 0 {
		return fmt.Errorf("clicks cannot be negative")
	}

	// Validate CTA fields are set together
	if (b.CTALabel != nil && b.CTAURL == nil) || (b.CTALabel == nil && b.CTAURL != nil) {
		return fmt.Errorf("cta_label and cta_url must be set together")
	}

	return nil
}

// CanTransitionTo checks if the issue can transition to the target status
func (n *NewsletterIssue) CanTransitionTo(target IssueStatus) bool {
	if !target.IsValid() {
		return false
	}

	switch n.Status {
	case IssueStatusDraft:
		return target == IssueStatusPendingApproval
	case IssueStatusPendingApproval:
		return target == IssueStatusApproved || target == IssueStatusDraft
	case IssueStatusApproved:
		return target == IssueStatusScheduled || target == IssueStatusDraft
	case IssueStatusScheduled:
		return target == IssueStatusSent || target == IssueStatusFailed || target == IssueStatusDraft
	case IssueStatusSent:
		return false // Terminal state
	case IssueStatusFailed:
		return target == IssueStatusDraft || target == IssueStatusScheduled
	default:
		return false
	}
}

// CalculateOpenRate calculates the email open rate as a percentage
func (n *NewsletterIssue) CalculateOpenRate() float64 {
	if n.TotalDelivered == 0 {
		return 0.0
	}
	return (float64(n.TotalOpens) / float64(n.TotalDelivered)) * 100.0
}

// CalculateClickRate calculates the click rate as a percentage
func (n *NewsletterIssue) CalculateClickRate() float64 {
	if n.TotalDelivered == 0 {
		return 0.0
	}
	return (float64(n.TotalClicks) / float64(n.TotalDelivered)) * 100.0
}

// CalculateCTOR calculates the click-to-open rate as a percentage
func (n *NewsletterIssue) CalculateCTOR() float64 {
	if n.TotalOpens == 0 {
		return 0.0
	}
	return (float64(n.TotalClicks) / float64(n.TotalOpens)) * 100.0
}

// IsEditable checks if the issue can be edited
func (n *NewsletterIssue) IsEditable() bool {
	return n.Status == IssueStatusDraft || n.Status == IssueStatusPendingApproval
}

// CanApprove checks if the issue can be approved
func (n *NewsletterIssue) CanApprove() bool {
	if n.Status != IssueStatusPendingApproval {
		return false
	}

	if len(n.Blocks) == 0 {
		return false
	}

	if n.SelectedSubjectLine == nil || *n.SelectedSubjectLine == "" {
		return false
	}

	return true
}

// CanSend checks if the issue can be sent
func (n *NewsletterIssue) CanSend() bool {
	if n.Status != IssueStatusScheduled {
		return false
	}

	if n.ScheduledFor == nil {
		return false
	}

	if n.ScheduledFor.After(time.Now()) {
		return false
	}

	if n.TotalRecipients <= 0 {
		return false
	}

	return true
}
