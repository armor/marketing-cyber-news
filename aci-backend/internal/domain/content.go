package domain

import (
	"fmt"
	"net/url"
	"time"

	"github.com/google/uuid"
)

// SourceType represents the type of content source
type SourceType string

const (
	SourceTypeRSS    SourceType = "rss"
	SourceTypeAPI    SourceType = "api"
	SourceTypeManual SourceType = "manual"
)

// IsValid validates the SourceType
func (s SourceType) IsValid() error {
	switch s {
	case SourceTypeRSS, SourceTypeAPI, SourceTypeManual:
		return nil
	default:
		return fmt.Errorf("invalid source type: %s", s)
	}
}

// ContentType represents the type of content
type ContentType string

const (
	ContentTypeBlog          ContentType = "blog"
	ContentTypeNews          ContentType = "news"
	ContentTypeCaseStudy     ContentType = "case_study"
	ContentTypeWebinar       ContentType = "webinar"
	ContentTypeProductUpdate ContentType = "product_update"
	ContentTypeEvent         ContentType = "event"
)

// IsValid validates the ContentType
func (c ContentType) IsValid() error {
	switch c {
	case ContentTypeBlog, ContentTypeNews, ContentTypeCaseStudy,
		ContentTypeWebinar, ContentTypeProductUpdate, ContentTypeEvent:
		return nil
	default:
		return fmt.Errorf("invalid content type: %s", c)
	}
}

// ContentSource represents a source of content for the newsletter
type ContentSource struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description,omitempty"`

	// Configuration
	SourceType SourceType             `json:"source_type"`
	FeedURL    *string                `json:"feed_url,omitempty"`
	APIConfig  map[string]interface{} `json:"api_config,omitempty"`

	// Default Tags
	DefaultContentType   *string  `json:"default_content_type,omitempty"`
	DefaultTopicTags     []string `json:"default_topic_tags,omitempty"`
	DefaultFrameworkTags []string `json:"default_framework_tags,omitempty"`

	// Trust
	TrustScore        float64 `json:"trust_score"`
	MinTrustThreshold float64 `json:"min_trust_threshold"`

	// Freshness
	FreshnessDays int `json:"freshness_days"`

	// Polling
	PollIntervalMinutes int        `json:"poll_interval_minutes"`
	LastPolledAt        *time.Time `json:"last_polled_at,omitempty"`
	LastSuccessAt       *time.Time `json:"last_success_at,omitempty"`
	ErrorCount          int        `json:"error_count"`
	LastError           *string    `json:"last_error,omitempty"`

	// Status
	IsActive   bool `json:"is_active"`
	IsInternal bool `json:"is_internal"`

	// Metadata
	CreatedBy uuid.UUID `json:"created_by"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Validate validates the ContentSource
func (cs *ContentSource) Validate() error {
	if cs.Name == "" {
		return fmt.Errorf("content source name is required")
	}

	if err := cs.SourceType.IsValid(); err != nil {
		return fmt.Errorf("invalid source type: %w", err)
	}

	if cs.SourceType == SourceTypeRSS {
		if cs.FeedURL == nil || *cs.FeedURL == "" {
			return fmt.Errorf("feed_url is required for RSS sources")
		}

		if _, err := url.ParseRequestURI(*cs.FeedURL); err != nil {
			return fmt.Errorf("invalid feed_url format: %w", err)
		}
	}

	if cs.TrustScore < 0.0 || cs.TrustScore > 1.0 {
		return fmt.Errorf("trust_score must be between 0.0 and 1.0, got %f", cs.TrustScore)
	}

	if cs.MinTrustThreshold < 0.0 || cs.MinTrustThreshold > 1.0 {
		return fmt.Errorf("min_trust_threshold must be between 0.0 and 1.0, got %f", cs.MinTrustThreshold)
	}

	if cs.FreshnessDays < 0 {
		return fmt.Errorf("freshness_days must be non-negative, got %d", cs.FreshnessDays)
	}

	if cs.PollIntervalMinutes <= 0 {
		return fmt.Errorf("poll_interval_minutes must be positive, got %d", cs.PollIntervalMinutes)
	}

	if cs.CreatedBy == uuid.Nil {
		return fmt.Errorf("created_by is required")
	}

	return nil
}

// ShouldPoll determines if the source should be polled based on last poll time and interval
func (cs *ContentSource) ShouldPoll() bool {
	if !cs.IsActive {
		return false
	}

	if cs.LastPolledAt == nil {
		return true
	}

	nextPollTime := cs.LastPolledAt.Add(time.Duration(cs.PollIntervalMinutes) * time.Minute)
	return time.Now().After(nextPollTime)
}

// ContentItem represents a single piece of content from a source
type ContentItem struct {
	ID        uuid.UUID  `json:"id"`
	SourceID  uuid.UUID  `json:"source_id"`
	ArticleID *uuid.UUID `json:"article_id,omitempty"`

	// Content
	Title   string  `json:"title"`
	URL     string  `json:"url"`
	Summary *string `json:"summary,omitempty"`
	Content *string `json:"content,omitempty"`

	// Classification
	ContentType   ContentType `json:"content_type"`
	TopicTags     []string    `json:"topic_tags,omitempty"`
	FrameworkTags []string    `json:"framework_tags,omitempty"`
	IndustryTags  []string    `json:"industry_tags,omitempty"`
	BuyerStage    *string     `json:"buyer_stage,omitempty"`
	PartnerTags   []string    `json:"partner_tags,omitempty"`

	// Metadata
	Author             *string    `json:"author,omitempty"`
	PublishDate        time.Time  `json:"publish_date"`
	WordCount          *int       `json:"word_count,omitempty"`
	ReadingTimeMinutes *int       `json:"reading_time_minutes,omitempty"`
	ImageURL           *string    `json:"image_url,omitempty"`

	// Scoring
	TrustScore       float64 `json:"trust_score"`
	RelevanceScore   float64 `json:"relevance_score"`
	HistoricalCTR    float64 `json:"historical_ctr"`
	HistoricalOpens  int     `json:"historical_opens"`
	HistoricalClicks int     `json:"historical_clicks"`

	// Freshness
	ExpiresAt *time.Time `json:"expires_at,omitempty"`

	// Status
	IsActive  bool       `json:"is_active"`
	IndexedAt *time.Time `json:"indexed_at,omitempty"`

	// Metadata
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Validate validates the ContentItem
func (ci *ContentItem) Validate() error {
	if ci.Title == "" {
		return fmt.Errorf("content item title is required")
	}

	if ci.URL == "" {
		return fmt.Errorf("content item URL is required")
	}

	if _, err := url.ParseRequestURI(ci.URL); err != nil {
		return fmt.Errorf("invalid URL format: %w", err)
	}

	if err := ci.ContentType.IsValid(); err != nil {
		return fmt.Errorf("invalid content type: %w", err)
	}

	if ci.SourceID == uuid.Nil {
		return fmt.Errorf("source_id is required")
	}

	if ci.TrustScore < 0.0 || ci.TrustScore > 1.0 {
		return fmt.Errorf("trust_score must be between 0.0 and 1.0, got %f", ci.TrustScore)
	}

	if ci.RelevanceScore < 0.0 || ci.RelevanceScore > 1.0 {
		return fmt.Errorf("relevance_score must be between 0.0 and 1.0, got %f", ci.RelevanceScore)
	}

	if ci.HistoricalCTR < 0.0 || ci.HistoricalCTR > 1.0 {
		return fmt.Errorf("historical_ctr must be between 0.0 and 1.0, got %f", ci.HistoricalCTR)
	}

	if ci.HistoricalOpens < 0 {
		return fmt.Errorf("historical_opens must be non-negative, got %d", ci.HistoricalOpens)
	}

	if ci.HistoricalClicks < 0 {
		return fmt.Errorf("historical_clicks must be non-negative, got %d", ci.HistoricalClicks)
	}

	if ci.WordCount != nil && *ci.WordCount < 0 {
		return fmt.Errorf("word_count must be non-negative, got %d", *ci.WordCount)
	}

	if ci.ReadingTimeMinutes != nil && *ci.ReadingTimeMinutes < 0 {
		return fmt.Errorf("reading_time_minutes must be non-negative, got %d", *ci.ReadingTimeMinutes)
	}

	if ci.ImageURL != nil && *ci.ImageURL != "" {
		if _, err := url.ParseRequestURI(*ci.ImageURL); err != nil {
			return fmt.Errorf("invalid image_url format: %w", err)
		}
	}

	return nil
}

// IsFresh determines if the content item is still fresh based on the threshold
func (ci *ContentItem) IsFresh(daysThreshold int) bool {
	if ci.ExpiresAt != nil {
		return time.Now().Before(*ci.ExpiresAt)
	}

	publishAge := time.Since(ci.PublishDate)
	threshold := time.Duration(daysThreshold) * 24 * time.Hour

	return publishAge <= threshold
}

// ContentSourceFilter represents filters for querying content sources
type ContentSourceFilter struct {
	SourceType *SourceType `json:"source_type,omitempty"`
	IsActive   *bool       `json:"is_active,omitempty"`
	IsInternal *bool       `json:"is_internal,omitempty"`
	CreatedBy  *uuid.UUID  `json:"created_by,omitempty"`
	Limit      int         `json:"limit"`
	Offset     int         `json:"offset"`
}

// ContentItemFilter represents filters for querying content items
type ContentItemFilter struct {
	SourceID      *uuid.UUID   `json:"source_id,omitempty"`
	ContentType   *ContentType `json:"content_type,omitempty"`
	TopicTags     []string     `json:"topic_tags,omitempty"`
	FrameworkTags []string     `json:"framework_tags,omitempty"`
	IndustryTags  []string     `json:"industry_tags,omitempty"`
	BuyerStage    *string      `json:"buyer_stage,omitempty"`
	IsActive      *bool        `json:"is_active,omitempty"`

	// Date range filters
	PublishedAfter  *time.Time `json:"published_after,omitempty"`
	PublishedBefore *time.Time `json:"published_before,omitempty"`

	// Freshness filter
	FreshnessDays *int `json:"freshness_days,omitempty"`

	// Score filters
	MinTrustScore     *float64 `json:"min_trust_score,omitempty"`
	MinRelevanceScore *float64 `json:"min_relevance_score,omitempty"`

	// Pagination
	Limit  int `json:"limit"`
	Offset int `json:"offset"`
}
