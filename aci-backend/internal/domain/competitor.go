package domain

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

// CompetitorAlertType represents different types of competitor alerts
type CompetitorAlertType string

const (
	AlertNewContent      CompetitorAlertType = "new_content"
	AlertHighEngagement  CompetitorAlertType = "high_engagement"
	AlertFrequencyChange CompetitorAlertType = "frequency_change"
	AlertNewChannel      CompetitorAlertType = "new_channel"
	AlertTopicChange     CompetitorAlertType = "topic_change"
)

// IsValid checks if the competitor alert type is valid
func (t CompetitorAlertType) IsValid() bool {
	switch t {
	case AlertNewContent, AlertHighEngagement, AlertFrequencyChange, AlertNewChannel, AlertTopicChange:
		return true
	default:
		return false
	}
}

// String returns the string representation of the competitor alert type
func (t CompetitorAlertType) String() string {
	return string(t)
}

// CompetitorProfile represents a competitor being tracked
type CompetitorProfile struct {
	ID            uuid.UUID `json:"id"`
	CampaignID    uuid.UUID `json:"campaign_id"`
	Name          string    `json:"name"`
	LinkedInURL   *string   `json:"linkedin_url,omitempty"`
	TwitterHandle *string   `json:"twitter_handle,omitempty"`
	BlogURL       *string   `json:"blog_url,omitempty"`
	WebsiteURL    *string   `json:"website_url,omitempty"`
	IsActive      bool      `json:"is_active"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// Validate validates the competitor profile
func (c *CompetitorProfile) Validate() error {
	if c.CampaignID == uuid.Nil {
		return fmt.Errorf("campaign_id is required")
	}

	if c.Name == "" {
		return fmt.Errorf("name is required")
	}

	// At least one social/content channel must be provided
	if c.LinkedInURL == nil && c.TwitterHandle == nil && c.BlogURL == nil && c.WebsiteURL == nil {
		return fmt.Errorf("at least one channel (LinkedIn, Twitter, Blog, or Website) is required")
	}

	return nil
}

// CompetitorContent represents content published by a competitor
type CompetitorContent struct {
	ID                uuid.UUID              `json:"id"`
	CompetitorID      uuid.UUID              `json:"competitor_id"`
	Channel           string                 `json:"channel"`
	Title             string                 `json:"title"`
	URL               string                 `json:"url"`
	PublishedAt       time.Time              `json:"published_at"`
	Summary           *string                `json:"summary,omitempty"`
	EngagementMetrics map[string]interface{} `json:"engagement_metrics"`
	CreatedAt         time.Time              `json:"created_at"`
	UpdatedAt         time.Time              `json:"updated_at"`
}

// Validate validates the competitor content
func (c *CompetitorContent) Validate() error {
	if c.CompetitorID == uuid.Nil {
		return fmt.Errorf("competitor_id is required")
	}

	if c.Channel == "" {
		return fmt.Errorf("channel is required")
	}

	if c.URL == "" {
		return fmt.Errorf("url is required")
	}

	if c.PublishedAt.IsZero() {
		return fmt.Errorf("published_at is required")
	}

	return nil
}

// CompetitorAnalysis represents analysis data for a competitor
type CompetitorAnalysis struct {
	CompetitorID        uuid.UUID              `json:"competitor_id"`
	ContentCount        int                    `json:"content_count"`
	AvgPostingFrequency float64                `json:"avg_posting_frequency"`
	TopTopics           []string               `json:"top_topics"`
	EngagementTrends    map[string]interface{} `json:"engagement_trends"`
	LastAnalyzedAt      time.Time              `json:"last_analyzed_at"`
	PeriodDays          int                    `json:"period_days"`
}

// CompetitorAlert represents an alert about competitor activity
type CompetitorAlert struct {
	ID           uuid.UUID           `json:"id"`
	CompetitorID uuid.UUID           `json:"competitor_id"`
	AlertType    CompetitorAlertType `json:"alert_type"`
	ContentID    *uuid.UUID          `json:"content_id,omitempty"`
	Message      string              `json:"message"`
	IsRead       bool                `json:"is_read"`
	CreatedAt    time.Time           `json:"created_at"`
	ReadAt       *time.Time          `json:"read_at,omitempty"`
}

// Validate validates the competitor alert
func (a *CompetitorAlert) Validate() error {
	if a.CompetitorID == uuid.Nil {
		return fmt.Errorf("competitor_id is required")
	}

	if !a.AlertType.IsValid() {
		return fmt.Errorf("invalid alert_type: %s", a.AlertType)
	}

	if a.Message == "" {
		return fmt.Errorf("message is required")
	}

	return nil
}

// CompetitorFilter represents filter criteria for competitor queries
type CompetitorFilter struct {
	CampaignID *uuid.UUID
	IsActive   *bool
	Limit      int
	Offset     int
}

// CompetitorContentFilter represents filter criteria for competitor content queries
type CompetitorContentFilter struct {
	CompetitorID *uuid.UUID
	Channel      *string
	After        *time.Time
	Before       *time.Time
	Limit        int
	Offset       int
}

// CompetitorAlertFilter represents filter criteria for competitor alert queries
type CompetitorAlertFilter struct {
	CompetitorID *uuid.UUID
	CampaignID   *uuid.UUID
	IsRead       *bool
	AlertType    *CompetitorAlertType
	Limit        int
	Offset       int
}
