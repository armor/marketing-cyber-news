package domain

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

// CampaignGoal represents the primary objective of a campaign
type CampaignGoal string

const (
	GoalAwareness  CampaignGoal = "awareness"
	GoalLeads      CampaignGoal = "leads"
	GoalEngagement CampaignGoal = "engagement"
	GoalTraffic    CampaignGoal = "traffic"
)

// IsValid checks if the campaign goal is valid
func (g CampaignGoal) IsValid() bool {
	switch g {
	case GoalAwareness, GoalLeads, GoalEngagement, GoalTraffic:
		return true
	default:
		return false
	}
}

// String returns the string representation of the campaign goal
func (g CampaignGoal) String() string {
	return string(g)
}

// CampaignStatus represents the lifecycle state of a campaign
type CampaignStatus string

const (
	CampaignDraft     CampaignStatus = "draft"
	CampaignActive    CampaignStatus = "active"
	CampaignPaused    CampaignStatus = "paused"
	CampaignCompleted CampaignStatus = "completed"
	CampaignArchived  CampaignStatus = "archived"
)

// IsValid checks if the campaign status is valid
func (s CampaignStatus) IsValid() bool {
	switch s {
	case CampaignDraft, CampaignActive, CampaignPaused, CampaignCompleted, CampaignArchived:
		return true
	default:
		return false
	}
}

// String returns the string representation of the campaign status
func (s CampaignStatus) String() string {
	return string(s)
}

// ContentStyle represents the content approach for a campaign
type ContentStyle string

const (
	StyleThoughtLeadership ContentStyle = "thought_leadership"
	StyleProductFocused    ContentStyle = "product_focused"
	StyleIndustryNews      ContentStyle = "industry_news"
	StyleEducational       ContentStyle = "educational"
	StylePromotional       ContentStyle = "promotional"
)

// IsValid checks if the content style is valid
func (s ContentStyle) IsValid() bool {
	switch s {
	case StyleThoughtLeadership, StyleProductFocused, StyleIndustryNews, StyleEducational, StylePromotional:
		return true
	default:
		return false
	}
}

// String returns the string representation of the content style
func (s ContentStyle) String() string {
	return string(s)
}

// Frequency represents content publishing frequency
type Frequency string

const (
	FreqDaily    Frequency = "daily"
	Freq3xWeek   Frequency = "3x_week"
	Freq5xWeek   Frequency = "5x_week"
	FreqWeekly   Frequency = "weekly"
	FreqBiweekly Frequency = "biweekly"
	FreqMonthly  Frequency = "monthly"
)

// IsValid checks if the frequency is valid
func (f Frequency) IsValid() bool {
	switch f {
	case FreqDaily, Freq3xWeek, Freq5xWeek, FreqWeekly, FreqBiweekly, FreqMonthly:
		return true
	default:
		return false
	}
}

// String returns the string representation of the frequency
func (f Frequency) String() string {
	return string(f)
}

// ToCron converts frequency to a cron expression
func (f Frequency) ToCron() string {
	switch f {
	case FreqDaily:
		return "0 9 * * *" // Daily at 9am
	case Freq3xWeek:
		return "0 9 * * 1,3,5" // Mon, Wed, Fri at 9am
	case Freq5xWeek:
		return "0 9 * * 1-5" // Weekdays at 9am
	case FreqWeekly:
		return "0 9 * * 1" // Monday at 9am
	case FreqBiweekly:
		return "0 9 1,15 * *" // 1st and 15th at 9am
	case FreqMonthly:
		return "0 9 1 * *" // 1st of month at 9am
	default:
		return "0 9 * * 1" // Default to weekly
	}
}

// Channel represents a publishing platform
type Channel string

const (
	ChannelLinkedIn  Channel = "linkedin"
	ChannelTwitter   Channel = "twitter"
	ChannelBlog      Channel = "blog"
	ChannelEmail     Channel = "email"
	ChannelFacebook  Channel = "facebook"
	ChannelInstagram Channel = "instagram"
)

// IsValid checks if the channel is valid
func (c Channel) IsValid() bool {
	switch c {
	case ChannelLinkedIn, ChannelTwitter, ChannelBlog, ChannelEmail, ChannelFacebook, ChannelInstagram:
		return true
	default:
		return false
	}
}

// String returns the string representation of the channel
func (c Channel) String() string {
	return string(c)
}

// Campaign represents a marketing campaign with multi-channel orchestration
type Campaign struct {
	ID           uuid.UUID      `json:"id" db:"id"`
	TenantID     uuid.UUID      `json:"tenant_id" db:"tenant_id"`
	Name         string         `json:"name" db:"name"`
	Description  *string        `json:"description,omitempty" db:"description"`
	Goal         CampaignGoal   `json:"goal" db:"goal"`
	Status       CampaignStatus `json:"status" db:"status"`
	Channels     []Channel      `json:"channels" db:"channels"`
	StartDate    *time.Time     `json:"start_date,omitempty" db:"start_date"`
	EndDate      *time.Time     `json:"end_date,omitempty" db:"end_date"`
	Frequency    Frequency      `json:"frequency" db:"frequency"`
	ContentStyle ContentStyle   `json:"content_style" db:"content_style"`
	Topics       []string       `json:"topics" db:"topics"`
	Config       CampaignConfig `json:"config" db:"config"`
	WorkflowIDs  []string       `json:"workflow_ids" db:"workflow_ids"`
	Stats        CampaignStats  `json:"stats" db:"stats"`
	CreatedBy    uuid.UUID      `json:"created_by" db:"created_by"`
	CreatedAt    time.Time      `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at" db:"updated_at"`
}

// CampaignConfig holds advanced campaign configuration
type CampaignConfig struct {
	WeeklyMix      map[Channel]int      `json:"weekly_mix"`      // Posts per channel per week
	ThemeWeights   map[ContentStyle]int `json:"theme_weights"`   // Content mix percentages
	PostingTimes   map[Channel][]string `json:"posting_times"`   // Preferred posting times per channel
	AutoPublish    bool                 `json:"auto_publish"`    // Auto-publish without approval
	MinBrandScore  int                  `json:"min_brand_score"` // Minimum brand score to publish (0-100)
	Hashtags       []string             `json:"hashtags,omitempty"`
	TargetAudience string               `json:"target_audience,omitempty"`
	ToneGuidance   string               `json:"tone_guidance,omitempty"`
}

// CampaignStats holds aggregated campaign performance metrics
type CampaignStats struct {
	TotalContent     int        `json:"total_content"`
	PublishedContent int        `json:"published_content"`
	PendingApproval  int        `json:"pending_approval"`
	AvgBrandScore    float64    `json:"avg_brand_score"`
	TotalEngagement  int        `json:"total_engagement"`
	TotalImpressions int        `json:"total_impressions"`
	TotalClicks      int        `json:"total_clicks"`
	EngagementRate   float64    `json:"engagement_rate"`
	LastPublishedAt  *time.Time `json:"last_published_at,omitempty"`
}

// Competitor represents a tracked competitor for content research
type Competitor struct {
	ID         uuid.UUID `json:"id" db:"id"`
	CampaignID uuid.UUID `json:"campaign_id" db:"campaign_id"`
	Name       string    `json:"name" db:"name"`
	LinkedIn   string    `json:"linkedin,omitempty" db:"linkedin_url"`
	Twitter    string    `json:"twitter,omitempty" db:"twitter_handle"`
	Blog       string    `json:"blog,omitempty" db:"blog_url"`
	Website    string    `json:"website,omitempty" db:"website_url"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
}

// Validate validates the campaign fields
func (c *Campaign) Validate() error {
	if c.Name == "" {
		return fmt.Errorf("campaign name is required")
	}

	if len(c.Name) > 255 {
		return fmt.Errorf("campaign name must not exceed 255 characters")
	}

	if len(c.Channels) == 0 {
		return fmt.Errorf("at least one channel is required")
	}

	if !c.Goal.IsValid() {
		return fmt.Errorf("invalid campaign goal: %s", c.Goal)
	}

	if !c.Frequency.IsValid() {
		return fmt.Errorf("invalid frequency: %s", c.Frequency)
	}

	if !c.ContentStyle.IsValid() {
		return fmt.Errorf("invalid content style: %s", c.ContentStyle)
	}

	for _, ch := range c.Channels {
		if !ch.IsValid() {
			return fmt.Errorf("invalid channel: %s", ch)
		}
	}

	if c.StartDate != nil && c.EndDate != nil && c.EndDate.Before(*c.StartDate) {
		return fmt.Errorf("end date must be after start date")
	}

	return nil
}

// CanTransitionTo checks if a status transition is valid
func (c *Campaign) CanTransitionTo(newStatus CampaignStatus) bool {
	transitions := map[CampaignStatus][]CampaignStatus{
		CampaignDraft:     {CampaignActive, CampaignArchived},
		CampaignActive:    {CampaignPaused, CampaignCompleted},
		CampaignPaused:    {CampaignActive, CampaignCompleted, CampaignArchived},
		CampaignCompleted: {CampaignArchived},
		CampaignArchived:  {}, // Terminal state
	}

	for _, allowed := range transitions[c.Status] {
		if allowed == newStatus {
			return true
		}
	}

	return false
}

// IsActive returns true if the campaign is currently running
func (c *Campaign) IsActive() bool {
	return c.Status == CampaignActive
}

// CampaignFilter for listing campaigns
type CampaignFilter struct {
	TenantID  uuid.UUID
	Status    *CampaignStatus
	Goal      *CampaignGoal
	Channel   *Channel
	CreatedBy *uuid.UUID
	Search    string
	Page      int
	PageSize  int
}

// DefaultCampaignConfig returns a sensible default configuration
func DefaultCampaignConfig() CampaignConfig {
	return CampaignConfig{
		WeeklyMix: map[Channel]int{
			ChannelLinkedIn: 3,
			ChannelTwitter:  5,
		},
		ThemeWeights: map[ContentStyle]int{
			StyleThoughtLeadership: 40,
			StyleIndustryNews:      30,
			StyleEducational:       30,
		},
		PostingTimes: map[Channel][]string{
			ChannelLinkedIn: {"09:00", "12:00", "17:00"},
			ChannelTwitter:  {"08:00", "12:00", "16:00", "20:00"},
		},
		AutoPublish:   false,
		MinBrandScore: 70,
	}
}
