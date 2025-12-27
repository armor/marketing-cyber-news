package domain

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// EventType represents the type of engagement event
type EventType string

const (
	EventTypeOpen        EventType = "open"
	EventTypeClick       EventType = "click"
	EventTypeUnsubscribe EventType = "unsubscribe"
	EventTypeBounce      EventType = "bounce"
	EventTypeComplaint   EventType = "complaint"
)

// IsValid validates the event type
func (e EventType) IsValid() bool {
	switch e {
	case EventTypeOpen, EventTypeClick, EventTypeUnsubscribe, EventTypeBounce, EventTypeComplaint:
		return true
	default:
		return false
	}
}

// EngagementEvent represents a single engagement event from a newsletter recipient
type EngagementEvent struct {
	ID             uuid.UUID  `json:"id"`
	ContactID      uuid.UUID  `json:"contact_id"`
	IssueID        uuid.UUID  `json:"issue_id"`
	BlockID        *uuid.UUID `json:"block_id,omitempty"`
	VariantID      *uuid.UUID `json:"variant_id,omitempty"`
	EventType      EventType  `json:"event_type"`
	EventTimestamp time.Time  `json:"event_timestamp"`
	ClickedURL     *string    `json:"clicked_url,omitempty"`
	TopicTag       *string    `json:"topic_tag,omitempty"`
	FrameworkTag   *string    `json:"framework_tag,omitempty"`
	ContentType    *string    `json:"content_type,omitempty"`
	BlockPosition  *int       `json:"block_position,omitempty"`
	UTMSource      *string    `json:"utm_source,omitempty"`
	UTMMedium      *string    `json:"utm_medium,omitempty"`
	UTMCampaign    *string    `json:"utm_campaign,omitempty"`
	UTMContent     *string    `json:"utm_content,omitempty"`
	DeviceType     *string    `json:"device_type,omitempty"`
	EmailClient    *string    `json:"email_client,omitempty"`
	IPAddress      *string    `json:"ip_address,omitempty"`
	UserAgent      *string    `json:"user_agent,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

// Validate validates the engagement event
func (e *EngagementEvent) Validate() error {
	if e.ContactID == uuid.Nil {
		return fmt.Errorf("contact_id is required")
	}

	if e.IssueID == uuid.Nil {
		return fmt.Errorf("issue_id is required")
	}

	if !e.EventType.IsValid() {
		return fmt.Errorf("invalid event_type: %s", e.EventType)
	}

	if e.EventType == EventTypeClick && (e.ClickedURL == nil || *e.ClickedURL == "") {
		return fmt.Errorf("clicked_url is required for click events")
	}

	if e.EventTimestamp.IsZero() {
		return fmt.Errorf("event_timestamp is required")
	}

	return nil
}

// IsNegativeEvent returns true for bounce, unsubscribe, or complaint events
func (e *EngagementEvent) IsNegativeEvent() bool {
	return e.EventType == EventTypeBounce ||
		e.EventType == EventTypeUnsubscribe ||
		e.EventType == EventTypeComplaint
}

// IsPositiveEvent returns true for open or click events
func (e *EngagementEvent) IsPositiveEvent() bool {
	return e.EventType == EventTypeOpen || e.EventType == EventTypeClick
}

// EngagementEventFilter represents filter criteria for engagement events
type EngagementEventFilter struct {
	ContactID    *uuid.UUID `json:"contact_id,omitempty"`
	IssueID      *uuid.UUID `json:"issue_id,omitempty"`
	BlockID      *uuid.UUID `json:"block_id,omitempty"`
	VariantID    *uuid.UUID `json:"variant_id,omitempty"`
	EventType    *EventType `json:"event_type,omitempty"`
	DateFrom     *time.Time `json:"date_from,omitempty"`
	DateTo       *time.Time `json:"date_to,omitempty"`
	TopicTag     *string    `json:"topic_tag,omitempty"`
	FrameworkTag *string    `json:"framework_tag,omitempty"`
	DeviceType   *string    `json:"device_type,omitempty"`
	Limit        int        `json:"limit,omitempty"`
	Offset       int        `json:"offset,omitempty"`
}

// EngagementMetrics represents aggregated engagement metrics
type EngagementMetrics struct {
	TotalOpens       int     `json:"total_opens"`
	UniqueOpens      int     `json:"unique_opens"`
	TotalClicks      int     `json:"total_clicks"`
	UniqueClicks     int     `json:"unique_clicks"`
	Bounces          int     `json:"bounces"`
	Unsubscribes     int     `json:"unsubscribes"`
	Complaints       int     `json:"complaints"`
	OpenRate         float64 `json:"open_rate"`
	ClickRate        float64 `json:"click_rate"`
	CTOR             float64 `json:"ctor"`
	BounceRate       float64 `json:"bounce_rate"`
	UnsubscribeRate  float64 `json:"unsubscribe_rate"`
}

// TopicEngagement represents engagement metrics for a specific topic
type TopicEngagement struct {
	TopicTag string  `json:"topic_tag"`
	Opens    int     `json:"opens"`
	Clicks   int     `json:"clicks"`
	CTR      float64 `json:"ctr"`
}

// DeviceBreakdown represents engagement distribution by device type
type DeviceBreakdown struct {
	Desktop float64 `json:"desktop"`
	Mobile  float64 `json:"mobile"`
	Tablet  float64 `json:"tablet"`
	Unknown float64 `json:"unknown"`
}

// ParseDeviceType performs basic device type detection from user agent
func ParseDeviceType(userAgent string) string {
	if userAgent == "" {
		return "unknown"
	}

	ua := strings.ToLower(userAgent)

	// Check for tablet first (more specific)
	if strings.Contains(ua, "ipad") ||
		strings.Contains(ua, "tablet") ||
		strings.Contains(ua, "kindle") {
		return "tablet"
	}

	// Check for mobile
	if strings.Contains(ua, "mobile") ||
		strings.Contains(ua, "iphone") ||
		strings.Contains(ua, "android") ||
		strings.Contains(ua, "blackberry") ||
		strings.Contains(ua, "windows phone") {
		return "mobile"
	}

	// Default to desktop
	return "desktop"
}

// CalculateMetrics calculates engagement metrics from a list of events
func CalculateMetrics(events []EngagementEvent, totalRecipients int) *EngagementMetrics {
	if totalRecipients == 0 {
		return &EngagementMetrics{}
	}

	metrics := &EngagementMetrics{}
	uniqueOpeners := make(map[uuid.UUID]bool)
	uniqueClickers := make(map[uuid.UUID]bool)

	for _, event := range events {
		switch event.EventType {
		case EventTypeOpen:
			metrics.TotalOpens++
			uniqueOpeners[event.ContactID] = true
		case EventTypeClick:
			metrics.TotalClicks++
			uniqueClickers[event.ContactID] = true
		case EventTypeBounce:
			metrics.Bounces++
		case EventTypeUnsubscribe:
			metrics.Unsubscribes++
		case EventTypeComplaint:
			metrics.Complaints++
		}
	}

	metrics.UniqueOpens = len(uniqueOpeners)
	metrics.UniqueClicks = len(uniqueClickers)

	// Calculate rates
	if totalRecipients > 0 {
		metrics.OpenRate = float64(metrics.UniqueOpens) / float64(totalRecipients) * 100
		metrics.ClickRate = float64(metrics.UniqueClicks) / float64(totalRecipients) * 100
		metrics.BounceRate = float64(metrics.Bounces) / float64(totalRecipients) * 100
		metrics.UnsubscribeRate = float64(metrics.Unsubscribes) / float64(totalRecipients) * 100
	}

	// Calculate click-to-open rate
	if metrics.UniqueOpens > 0 {
		metrics.CTOR = float64(metrics.UniqueClicks) / float64(metrics.UniqueOpens) * 100
	}

	return metrics
}

// GroupByTopic groups engagement events by topic tag and calculates metrics
func GroupByTopic(events []EngagementEvent) []TopicEngagement {
	topicMap := make(map[string]*TopicEngagement)

	for _, event := range events {
		if event.TopicTag == nil || *event.TopicTag == "" {
			continue
		}

		topic := *event.TopicTag
		if _, exists := topicMap[topic]; !exists {
			topicMap[topic] = &TopicEngagement{
				TopicTag: topic,
			}
		}

		switch event.EventType {
		case EventTypeOpen:
			topicMap[topic].Opens++
		case EventTypeClick:
			topicMap[topic].Clicks++
		}
	}

	// Calculate CTR and convert to slice
	result := make([]TopicEngagement, 0, len(topicMap))
	for _, engagement := range topicMap {
		if engagement.Opens > 0 {
			engagement.CTR = float64(engagement.Clicks) / float64(engagement.Opens) * 100
		}
		result = append(result, *engagement)
	}

	return result
}

// GroupByDevice calculates engagement distribution by device type
func GroupByDevice(events []EngagementEvent) *DeviceBreakdown {
	breakdown := &DeviceBreakdown{}
	total := 0

	deviceCounts := make(map[string]int)

	for _, event := range events {
		// Only count positive engagement events
		if !event.IsPositiveEvent() {
			continue
		}

		deviceType := "unknown"
		if event.DeviceType != nil && *event.DeviceType != "" {
			deviceType = strings.ToLower(*event.DeviceType)
		} else if event.UserAgent != nil {
			deviceType = ParseDeviceType(*event.UserAgent)
		}

		deviceCounts[deviceType]++
		total++
	}

	if total == 0 {
		return breakdown
	}

	// Calculate percentages
	breakdown.Desktop = float64(deviceCounts["desktop"]) / float64(total) * 100
	breakdown.Mobile = float64(deviceCounts["mobile"]) / float64(total) * 100
	breakdown.Tablet = float64(deviceCounts["tablet"]) / float64(total) * 100
	breakdown.Unknown = float64(deviceCounts["unknown"]) / float64(total) * 100

	return breakdown
}
