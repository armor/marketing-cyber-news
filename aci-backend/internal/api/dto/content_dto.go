package dto

// Content Source DTOs

// TestFeedRequest represents a request to test an RSS/Atom feed
type TestFeedRequest struct {
	FeedURL string `json:"feed_url" validate:"required,url"`
}

// TestFeedResponse represents the response from testing a feed
type TestFeedResponse struct {
	IsValid      bool   `json:"is_valid"`
	Title        string `json:"title,omitempty"`
	ItemCount    int    `json:"item_count"`
	LastUpdated  string `json:"last_updated,omitempty"`
	ErrorMessage string `json:"error_message,omitempty"`
}

// PollingStatusResponse represents the polling status of a content source
type PollingStatusResponse struct {
	LastPolledAt  *string `json:"last_polled_at,omitempty"`
	NextPollAt    *string `json:"next_poll_at,omitempty"`
	LastSuccessAt *string `json:"last_success_at,omitempty"`
	ItemCount     int     `json:"item_count"`
	ErrorCount    int     `json:"error_count"`
	LastError     *string `json:"last_error,omitempty"`
}

// PaginationDTO is reused from existing DTOs
// (already defined in approval_dto.go)

// ============================================================================
// URL Metadata Extraction DTOs (010-content-pipeline Phase 1.2)
// ============================================================================

// URLMetadataRequest represents a request to extract metadata from a URL
type URLMetadataRequest struct {
	URL string `json:"url" validate:"required,url,max=2048"`
}

// URLMetadataResponse represents extracted metadata from a URL
type URLMetadataResponse struct {
	URL             string  `json:"url"`
	Title           string  `json:"title"`
	Description     *string `json:"description,omitempty"`
	ImageURL        *string `json:"image_url,omitempty"`
	PublishDate     *string `json:"publish_date,omitempty"`
	Author          *string `json:"author,omitempty"`
	ReadTimeMinutes *int    `json:"read_time_minutes,omitempty"`
	SiteName        *string `json:"site_name,omitempty"`
}

// ============================================================================
// Manual Content Creation DTOs (010-content-pipeline Phase 1.3)
// ============================================================================

// CreateManualContentRequest represents a request to create a manual content item
type CreateManualContentRequest struct {
	URL           string   `json:"url" validate:"required,url,max=2048"`
	Title         string   `json:"title" validate:"required,max=500"`
	Summary       *string  `json:"summary,omitempty" validate:"omitempty,max=2000"`
	ContentType   string   `json:"content_type" validate:"required,oneof=blog news case_study webinar product_update event"`
	TopicTags     []string `json:"topic_tags,omitempty"`
	FrameworkTags []string `json:"framework_tags,omitempty"`
	PublishDate   *string  `json:"publish_date,omitempty"`
	Author        *string  `json:"author,omitempty" validate:"omitempty,max=200"`
	ImageURL      *string  `json:"image_url,omitempty" validate:"omitempty,url,max=2048"`
}

// ContentItemResponse represents a content item in API responses
type ContentItemResponse struct {
	ID             string   `json:"id"`
	SourceID       *string  `json:"source_id,omitempty"`
	Title          string   `json:"title"`
	URL            string   `json:"url"`
	Summary        *string  `json:"summary,omitempty"`
	ContentType    string   `json:"content_type"`
	TopicTags      []string `json:"topic_tags,omitempty"`
	FrameworkTags  []string `json:"framework_tags,omitempty"`
	Author         *string  `json:"author,omitempty"`
	PublishDate    string   `json:"publish_date"`
	ImageURL       *string  `json:"image_url,omitempty"`
	TrustScore     float64  `json:"trust_score"`
	RelevanceScore float64  `json:"relevance_score"`
	IsActive       bool     `json:"is_active"`
	SourceType     string   `json:"source_type"`
	CreatedAt      string   `json:"created_at"`
	UpdatedAt      string   `json:"updated_at"`
}
