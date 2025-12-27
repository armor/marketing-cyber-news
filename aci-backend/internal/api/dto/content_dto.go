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
