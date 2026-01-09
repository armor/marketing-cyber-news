package domain

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Segment represents an audience segment for newsletter targeting
type Segment struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description,omitempty"`

	// Segmentation Criteria - Firmographic
	RoleCluster          *string  `json:"role_cluster,omitempty"`
	Industries           []string `json:"industries,omitempty"`
	Regions              []string `json:"regions,omitempty"`
	CompanySizeBands     []string `json:"company_size_bands,omitempty"`
	ComplianceFrameworks []string `json:"compliance_frameworks,omitempty"`
	PartnerTags          []string `json:"partner_tags,omitempty"`

	// Behavioral
	MinEngagementScore *float64 `json:"min_engagement_score,omitempty"`
	TopicInterests     []string `json:"topic_interests,omitempty"`

	// Exclusions
	ExcludeUnsubscribed bool `json:"exclude_unsubscribed"`
	ExcludeBounced      bool `json:"exclude_bounced"`
	ExcludeHighTouch    bool `json:"exclude_high_touch"`

	// Frequency
	MaxNewslettersPer30Days int `json:"max_newsletters_per_30_days"`

	// Metadata
	ContactCount int       `json:"contact_count"`
	IsActive     bool      `json:"is_active"`
	CreatedBy    uuid.UUID `json:"created_by"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// Contact represents a newsletter subscriber with firmographic and behavioral data
type Contact struct {
	ID         uuid.UUID `json:"id"`
	ExternalID *string   `json:"external_id,omitempty"`
	Email      string    `json:"email"`

	// Firmographic
	FirstName       *string `json:"first_name,omitempty"`
	LastName        *string `json:"last_name,omitempty"`
	Company         *string `json:"company,omitempty"`
	JobTitle        *string `json:"job_title,omitempty"`
	RoleCategory    *string `json:"role_category,omitempty"`
	SeniorityBand   *string `json:"seniority_band,omitempty"`
	Industry        *string `json:"industry,omitempty"`
	Region          *string `json:"region,omitempty"`
	CompanySizeBand *string `json:"company_size_band,omitempty"`

	// Compliance
	PrimaryFramework    *string  `json:"primary_framework,omitempty"`
	SecondaryFrameworks []string `json:"secondary_frameworks,omitempty"`

	// Partner
	PartnerTags []string `json:"partner_tags,omitempty"`

	// Behavioral
	EngagementScore       float64            `json:"engagement_score"`
	Last10Interactions    []Interaction      `json:"last_10_interactions,omitempty"`
	LastWebinarAttendance *time.Time         `json:"last_webinar_attendance,omitempty"`
	TopicScores           map[string]float64 `json:"topic_scores,omitempty"`

	// Subscription
	IsSubscribed   bool       `json:"is_subscribed"`
	UnsubscribedAt *time.Time `json:"unsubscribed_at,omitempty"`
	IsBounced      bool       `json:"is_bounced"`
	BouncedAt      *time.Time `json:"bounced_at,omitempty"`
	IsHighTouch    bool       `json:"is_high_touch"`

	// Newsletter Tracking
	LastNewsletterSent    *time.Time `json:"last_newsletter_sent,omitempty"`
	NewslettersSent30Days int        `json:"newsletters_sent_30_days"`

	// Segment
	PrimarySegmentID *uuid.UUID `json:"primary_segment_id,omitempty"`

	// Metadata
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Interaction represents a single contact interaction event
type Interaction struct {
	Type      string    `json:"type"`
	Topic     string    `json:"topic"`
	Timestamp time.Time `json:"timestamp"`
}

// SegmentFilter provides filtering options for segment queries
type SegmentFilter struct {
	IsActive  *bool      `json:"is_active,omitempty"`
	CreatedBy *uuid.UUID `json:"created_by,omitempty"`
	Search    string     `json:"search,omitempty"`

	// Pagination
	Limit  int `json:"limit"`
	Offset int `json:"offset"`
}

// ContactFilter provides filtering options for contact queries
type ContactFilter struct {
	SegmentID    *uuid.UUID `json:"segment_id,omitempty"`
	IsSubscribed *bool      `json:"is_subscribed,omitempty"`
	IsBounced    *bool      `json:"is_bounced,omitempty"`
	IsHighTouch  *bool      `json:"is_high_touch,omitempty"`
	RoleCategory *string    `json:"role_category,omitempty"`
	Industry     *string    `json:"industry,omitempty"`
	Region       *string    `json:"region,omitempty"`
	Search       string     `json:"search,omitempty"`

	// Pagination
	Limit  int `json:"limit"`
	Offset int `json:"offset"`
}

// Validate validates the Segment struct
func (s *Segment) Validate() error {
	if s.Name == "" {
		return fmt.Errorf("segment name is required")
	}

	if len(s.Name) > 255 {
		return fmt.Errorf("segment name must not exceed 255 characters")
	}

	if s.MinEngagementScore != nil {
		if *s.MinEngagementScore < 0 || *s.MinEngagementScore > 100 {
			return fmt.Errorf("min engagement score must be between 0 and 100")
		}
	}

	if s.MaxNewslettersPer30Days < 0 {
		return fmt.Errorf("max newsletters per 30 days must be non-negative")
	}

	if s.MaxNewslettersPer30Days > 100 {
		return fmt.Errorf("max newsletters per 30 days must not exceed 100")
	}

	if s.CreatedBy == uuid.Nil {
		return fmt.Errorf("created_by user ID is required")
	}

	return nil
}

// Validate validates the Contact struct
func (c *Contact) Validate() error {
	if c.Email == "" {
		return fmt.Errorf("contact email is required")
	}

	if len(c.Email) > 255 {
		return fmt.Errorf("contact email must not exceed 255 characters")
	}

	if !isValidEmail(c.Email) {
		return fmt.Errorf("contact email format is invalid")
	}

	if c.EngagementScore < 0 || c.EngagementScore > 100 {
		return fmt.Errorf("engagement score must be between 0 and 100")
	}

	if c.NewslettersSent30Days < 0 {
		return fmt.Errorf("newsletters sent in 30 days must be non-negative")
	}

	if len(c.Last10Interactions) > 10 {
		return fmt.Errorf("last 10 interactions must not exceed 10 entries")
	}

	if c.UnsubscribedAt != nil && !c.IsSubscribed {
		if c.UnsubscribedAt.After(time.Now()) {
			return fmt.Errorf("unsubscribed_at cannot be in the future")
		}
	}

	if c.BouncedAt != nil && c.IsBounced {
		if c.BouncedAt.After(time.Now()) {
			return fmt.Errorf("bounced_at cannot be in the future")
		}
	}

	if c.LastNewsletterSent != nil {
		if c.LastNewsletterSent.After(time.Now()) {
			return fmt.Errorf("last_newsletter_sent cannot be in the future")
		}
	}

	return nil
}

// Validate validates the Interaction struct
func (i *Interaction) Validate() error {
	if i.Type == "" {
		return fmt.Errorf("interaction type is required")
	}

	if i.Topic == "" {
		return fmt.Errorf("interaction topic is required")
	}

	if i.Timestamp.IsZero() {
		return fmt.Errorf("interaction timestamp is required")
	}

	if i.Timestamp.After(time.Now()) {
		return fmt.Errorf("interaction timestamp cannot be in the future")
	}

	return nil
}

// isValidEmail performs basic email validation
func isValidEmail(email string) bool {
	if email == "" {
		return false
	}

	if !strings.Contains(email, "@") {
		return false
	}

	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return false
	}

	if parts[0] == "" || parts[1] == "" {
		return false
	}

	if !strings.Contains(parts[1], ".") {
		return false
	}

	return true
}
