package handlers

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/phillipboles/aci-backend/internal/api/response"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/repository"
)

// EngagementHandler handles engagement webhook events from ESPs
type EngagementHandler struct {
	engagementRepo repository.EngagementEventRepository
	contactRepo    repository.ContactRepository
	issueRepo      repository.NewsletterIssueRepository
	webhookSecret  string
}

// NewEngagementHandler creates a new engagement webhook handler
func NewEngagementHandler(
	engagementRepo repository.EngagementEventRepository,
	contactRepo repository.ContactRepository,
	issueRepo repository.NewsletterIssueRepository,
	webhookSecret string,
) *EngagementHandler {
	if engagementRepo == nil {
		panic("engagementRepo cannot be nil")
	}
	if contactRepo == nil {
		panic("contactRepo cannot be nil")
	}
	if issueRepo == nil {
		panic("issueRepo cannot be nil")
	}

	return &EngagementHandler{
		engagementRepo: engagementRepo,
		contactRepo:    contactRepo,
		issueRepo:      issueRepo,
		webhookSecret:  webhookSecret,
	}
}

// ============================================================================
// Webhook Event Handler
// ============================================================================

// HandleWebhook handles POST /api/v1/webhook/engagement
// FR-040: Track opens and clicks
// FR-041: Handle unsubscribes
// FR-042: Track engagement metrics
func (h *EngagementHandler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Verify webhook signature if secret is configured
	if h.webhookSecret != "" {
		if err := h.verifyWebhookSignature(r); err != nil {
			log.Warn().
				Err(err).
				Str("request_id", requestID).
				Msg("Webhook signature verification failed")
			response.Unauthorized(w, "Invalid webhook signature")
			return
		}
	}

	// Parse raw body
	var rawPayload map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&rawPayload); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to decode webhook payload")
		response.BadRequest(w, "Invalid JSON payload")
		return
	}

	// Auto-detect ESP and parse event
	event, err := h.parseESPPayload(ctx, rawPayload)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Interface("payload", rawPayload).
			Msg("Failed to parse ESP payload")
		response.BadRequestWithDetails(w, "Failed to parse webhook payload", err.Error(), requestID)
		return
	}

	// Validate event
	if err := event.Validate(); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Invalid engagement event")
		response.BadRequestWithDetails(w, "Invalid engagement event", err.Error(), requestID)
		return
	}

	// Handle event based on type
	if err := h.handleEngagementEvent(ctx, event); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("event_type", string(event.EventType)).
			Msg("Failed to handle engagement event")
		response.InternalError(w, "Failed to process engagement event", requestID)
		return
	}

	log.Info().
		Str("request_id", requestID).
		Str("event_type", string(event.EventType)).
		Str("contact_id", event.ContactID.String()).
		Str("issue_id", event.IssueID.String()).
		Msg("Successfully processed engagement event")

	response.JSON(w, http.StatusOK, map[string]interface{}{
		"status":  "success",
		"message": "Engagement event processed",
	})
}

// ============================================================================
// Event Processing
// ============================================================================

// handleEngagementEvent processes an engagement event and updates contact status if needed
func (h *EngagementHandler) handleEngagementEvent(ctx context.Context, event *domain.EngagementEvent) error {
	if event == nil {
		return fmt.Errorf("engagement event cannot be nil")
	}

	// Create engagement event record
	if err := h.engagementRepo.Create(ctx, event); err != nil {
		return fmt.Errorf("failed to create engagement event: %w", err)
	}

	// Handle negative events that require contact status updates
	switch event.EventType {
	case domain.EventTypeUnsubscribe:
		if err := h.contactRepo.MarkUnsubscribed(ctx, event.ContactID); err != nil {
			return fmt.Errorf("failed to mark contact unsubscribed: %w", err)
		}
		log.Info().
			Str("contact_id", event.ContactID.String()).
			Msg("Contact marked as unsubscribed")

	case domain.EventTypeBounce:
		if err := h.contactRepo.MarkBounced(ctx, event.ContactID); err != nil {
			return fmt.Errorf("failed to mark contact bounced: %w", err)
		}
		log.Info().
			Str("contact_id", event.ContactID.String()).
			Msg("Contact marked as bounced")

	case domain.EventTypeComplaint:
		// For spam complaints, mark both unsubscribed and log
		if err := h.contactRepo.MarkUnsubscribed(ctx, event.ContactID); err != nil {
			return fmt.Errorf("failed to mark contact unsubscribed after spam complaint: %w", err)
		}
		log.Warn().
			Str("contact_id", event.ContactID.String()).
			Msg("Contact marked as unsubscribed due to spam complaint")

	case domain.EventTypeOpen, domain.EventTypeClick:
		// Positive engagement events - just log
		log.Debug().
			Str("contact_id", event.ContactID.String()).
			Str("event_type", string(event.EventType)).
			Msg("Positive engagement event recorded")
	}

	return nil
}

// ============================================================================
// ESP Payload Parsing
// ============================================================================

// parseESPPayload auto-detects ESP from payload structure and parses the event
func (h *EngagementHandler) parseESPPayload(ctx context.Context, payload map[string]interface{}) (*domain.EngagementEvent, error) {
	if payload == nil {
		return nil, fmt.Errorf("payload cannot be nil")
	}

	// Auto-detect ESP based on payload structure
	if h.isHubSpotPayload(payload) {
		return h.parseHubSpotEvent(ctx, payload)
	}

	if h.isMailchimpPayload(payload) {
		return h.parseMailchimpEvent(ctx, payload)
	}

	// Fallback: try generic format
	return h.parseGenericEvent(ctx, payload)
}

// isHubSpotPayload checks if payload is from HubSpot
func (h *EngagementHandler) isHubSpotPayload(payload map[string]interface{}) bool {
	// HubSpot typically has "subscriptionType" or "portalId" fields
	_, hasSubscriptionType := payload["subscriptionType"]
	_, hasPortalID := payload["portalId"]
	return hasSubscriptionType || hasPortalID
}

// isMailchimpPayload checks if payload is from Mailchimp
func (h *EngagementHandler) isMailchimpPayload(payload map[string]interface{}) bool {
	// Mailchimp has "type" field with values like "subscribe", "unsubscribe", "campaign"
	typeVal, hasType := payload["type"]
	if !hasType {
		return false
	}

	typeStr, ok := typeVal.(string)
	if !ok {
		return false
	}

	// Mailchimp event types
	mailchimpTypes := []string{"subscribe", "unsubscribe", "campaign", "profile", "cleaned"}
	for _, t := range mailchimpTypes {
		if strings.Contains(typeStr, t) {
			return true
		}
	}

	return false
}

// parseHubSpotEvent parses a HubSpot webhook event
func (h *EngagementHandler) parseHubSpotEvent(ctx context.Context, payload map[string]interface{}) (*domain.EngagementEvent, error) {
	event := &domain.EngagementEvent{
		ID:             uuid.New(),
		EventTimestamp: time.Now(),
		CreatedAt:      time.Now(),
	}

	// Extract event type
	eventType, ok := payload["subscriptionType"].(string)
	if !ok {
		eventType, ok = payload["type"].(string)
		if !ok {
			return nil, fmt.Errorf("missing event type in HubSpot payload")
		}
	}

	event.EventType = h.mapHubSpotEventType(eventType)
	if !event.EventType.IsValid() {
		return nil, fmt.Errorf("unsupported HubSpot event type: %s", eventType)
	}

	// Extract email
	email, ok := payload["email"].(string)
	if !ok {
		return nil, fmt.Errorf("missing email in HubSpot payload")
	}

	// Lookup contact by email
	contact, err := h.contactRepo.GetByEmail(ctx, email)
	if err != nil {
		return nil, fmt.Errorf("failed to find contact with email %s: %w", email, err)
	}
	event.ContactID = contact.ID

	// Extract issue/campaign ID
	if campaignID, ok := payload["campaignId"].(string); ok {
		issueID, err := uuid.Parse(campaignID)
		if err == nil {
			event.IssueID = issueID
		}
	}

	// If no issue ID found, try to get latest sent issue for contact
	if event.IssueID == uuid.Nil {
		if err := h.inferIssueID(ctx, event); err != nil {
			return nil, fmt.Errorf("failed to infer issue ID: %w", err)
		}
	}

	// Extract additional metadata
	if timestamp, ok := payload["occurredAt"].(float64); ok {
		event.EventTimestamp = time.Unix(int64(timestamp)/1000, 0)
	}

	if userAgent, ok := payload["userAgent"].(string); ok {
		event.UserAgent = &userAgent
		deviceType := domain.ParseDeviceType(userAgent)
		event.DeviceType = &deviceType
	}

	if ipAddress, ok := payload["ipAddress"].(string); ok {
		event.IPAddress = &ipAddress
	}

	// For click events, extract URL
	if event.EventType == domain.EventTypeClick {
		if url, ok := payload["url"].(string); ok {
			event.ClickedURL = &url
		}
	}

	return event, nil
}

// parseMailchimpEvent parses a Mailchimp webhook event
func (h *EngagementHandler) parseMailchimpEvent(ctx context.Context, payload map[string]interface{}) (*domain.EngagementEvent, error) {
	event := &domain.EngagementEvent{
		ID:             uuid.New(),
		EventTimestamp: time.Now(),
		CreatedAt:      time.Now(),
	}

	// Extract event type
	eventType, ok := payload["type"].(string)
	if !ok {
		return nil, fmt.Errorf("missing event type in Mailchimp payload")
	}

	event.EventType = h.mapMailchimpEventType(eventType)
	if !event.EventType.IsValid() {
		return nil, fmt.Errorf("unsupported Mailchimp event type: %s", eventType)
	}

	// Extract data object
	data, ok := payload["data"].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("missing data object in Mailchimp payload")
	}

	// Extract email
	email, ok := data["email"].(string)
	if !ok {
		return nil, fmt.Errorf("missing email in Mailchimp payload")
	}

	// Lookup contact by email
	contact, err := h.contactRepo.GetByEmail(ctx, email)
	if err != nil {
		return nil, fmt.Errorf("failed to find contact with email %s: %w", email, err)
	}
	event.ContactID = contact.ID

	// Extract campaign ID
	if campaignID, ok := data["campaign_id"].(string); ok {
		issueID, err := uuid.Parse(campaignID)
		if err == nil {
			event.IssueID = issueID
		}
	}

	// If no issue ID found, try to infer
	if event.IssueID == uuid.Nil {
		if err := h.inferIssueID(ctx, event); err != nil {
			return nil, fmt.Errorf("failed to infer issue ID: %w", err)
		}
	}

	// Extract IP address
	if ip, ok := data["ip"].(string); ok {
		event.IPAddress = &ip
	}

	// For click events, extract URL
	if event.EventType == domain.EventTypeClick {
		if url, ok := data["url"].(string); ok {
			event.ClickedURL = &url
		}
	}

	// Extract timestamp
	if firedAt, ok := payload["fired_at"].(string); ok {
		if timestamp, err := time.Parse(time.RFC3339, firedAt); err == nil {
			event.EventTimestamp = timestamp
		}
	}

	return event, nil
}

// parseGenericEvent parses a generic webhook event format
func (h *EngagementHandler) parseGenericEvent(ctx context.Context, payload map[string]interface{}) (*domain.EngagementEvent, error) {
	event := &domain.EngagementEvent{
		ID:             uuid.New(),
		EventTimestamp: time.Now(),
		CreatedAt:      time.Now(),
	}

	// Extract required fields
	eventTypeStr, ok := payload["event_type"].(string)
	if !ok {
		return nil, fmt.Errorf("missing event_type in payload")
	}

	event.EventType = domain.EventType(eventTypeStr)
	if !event.EventType.IsValid() {
		return nil, fmt.Errorf("invalid event_type: %s", eventTypeStr)
	}

	// Extract contact ID
	contactIDStr, ok := payload["contact_id"].(string)
	if !ok {
		// Try email fallback
		email, emailOk := payload["email"].(string)
		if !emailOk {
			return nil, fmt.Errorf("missing contact_id or email in payload")
		}

		contact, err := h.contactRepo.GetByEmail(ctx, email)
		if err != nil {
			return nil, fmt.Errorf("failed to find contact with email %s: %w", email, err)
		}
		event.ContactID = contact.ID
	} else {
		contactID, err := uuid.Parse(contactIDStr)
		if err != nil {
			return nil, fmt.Errorf("invalid contact_id: %w", err)
		}
		event.ContactID = contactID
	}

	// Extract issue ID
	issueIDStr, ok := payload["issue_id"].(string)
	if !ok {
		// Try to infer from recent sends
		if err := h.inferIssueID(ctx, event); err != nil {
			return nil, fmt.Errorf("missing issue_id and failed to infer: %w", err)
		}
	} else {
		issueID, err := uuid.Parse(issueIDStr)
		if err != nil {
			return nil, fmt.Errorf("invalid issue_id: %w", err)
		}
		event.IssueID = issueID
	}

	// Extract optional fields
	if clickedURL, ok := payload["clicked_url"].(string); ok {
		event.ClickedURL = &clickedURL
	}

	if userAgent, ok := payload["user_agent"].(string); ok {
		event.UserAgent = &userAgent
		deviceType := domain.ParseDeviceType(userAgent)
		event.DeviceType = &deviceType
	}

	if ipAddress, ok := payload["ip_address"].(string); ok {
		event.IPAddress = &ipAddress
	}

	if deviceType, ok := payload["device_type"].(string); ok {
		event.DeviceType = &deviceType
	}

	if emailClient, ok := payload["email_client"].(string); ok {
		event.EmailClient = &emailClient
	}

	// Extract UTM parameters
	if utmSource, ok := payload["utm_source"].(string); ok {
		event.UTMSource = &utmSource
	}

	if utmMedium, ok := payload["utm_medium"].(string); ok {
		event.UTMMedium = &utmMedium
	}

	if utmCampaign, ok := payload["utm_campaign"].(string); ok {
		event.UTMCampaign = &utmCampaign
	}

	if utmContent, ok := payload["utm_content"].(string); ok {
		event.UTMContent = &utmContent
	}

	// Extract timestamp
	if timestampStr, ok := payload["event_timestamp"].(string); ok {
		if timestamp, err := time.Parse(time.RFC3339, timestampStr); err == nil {
			event.EventTimestamp = timestamp
		}
	}

	return event, nil
}

// ============================================================================
// Helper Methods
// ============================================================================

// mapHubSpotEventType maps HubSpot event types to domain event types
func (h *EngagementHandler) mapHubSpotEventType(hubspotType string) domain.EventType {
	switch strings.ToLower(hubspotType) {
	case "open", "email.opened":
		return domain.EventTypeOpen
	case "click", "email.clicked":
		return domain.EventTypeClick
	case "unsubscribe", "subscription.change":
		return domain.EventTypeUnsubscribe
	case "bounce", "email.bounced":
		return domain.EventTypeBounce
	case "spam", "spam_report", "email.spamreport":
		return domain.EventTypeComplaint
	default:
		return domain.EventType("")
	}
}

// mapMailchimpEventType maps Mailchimp event types to domain event types
func (h *EngagementHandler) mapMailchimpEventType(mailchimpType string) domain.EventType {
	switch strings.ToLower(mailchimpType) {
	case "open":
		return domain.EventTypeOpen
	case "click":
		return domain.EventTypeClick
	case "unsubscribe", "unsub":
		return domain.EventTypeUnsubscribe
	case "bounce":
		return domain.EventTypeBounce
	case "cleaned", "spam":
		return domain.EventTypeComplaint
	default:
		return domain.EventType("")
	}
}

// inferIssueID attempts to infer the issue ID from recent newsletter sends to the contact
func (h *EngagementHandler) inferIssueID(ctx context.Context, event *domain.EngagementEvent) error {
	if event.ContactID == uuid.Nil {
		return fmt.Errorf("contact_id is required to infer issue_id")
	}

	// Get contact to find last newsletter sent
	contact, err := h.contactRepo.GetByID(ctx, event.ContactID)
	if err != nil {
		return fmt.Errorf("failed to get contact: %w", err)
	}

	if contact.LastNewsletterSent == nil {
		return fmt.Errorf("contact has no recent newsletter sends")
	}

	// Find most recent issue sent around the same time
	// This is a simplified approach - in production you'd want a send_log table
	// For now, we'll assume the event is for the most recent issue
	filter := &domain.NewsletterIssueFilter{
		Status: func() *domain.IssueStatus { s := domain.IssueStatusSent; return &s }(),
		Limit:  1,
		Offset: 0,
	}

	issues, _, err := h.issueRepo.List(ctx, filter)
	if err != nil {
		return fmt.Errorf("failed to list recent issues: %w", err)
	}

	if len(issues) == 0 {
		return fmt.Errorf("no recent sent issues found")
	}

	event.IssueID = issues[0].ID
	return nil
}

// verifyWebhookSignature verifies the HMAC signature of the webhook payload
func (h *EngagementHandler) verifyWebhookSignature(r *http.Request) error {
	// Get signature from header
	signature := r.Header.Get("X-Webhook-Signature")
	if signature == "" {
		signature = r.Header.Get("X-Hub-Signature-256")
	}
	if signature == "" {
		return fmt.Errorf("missing webhook signature header")
	}

	// Read body for verification
	// Note: In production, you'd cache this to avoid reading body twice
	var payload map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		return fmt.Errorf("failed to decode payload: %w", err)
	}

	// Re-encode to get consistent JSON for verification
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	// Compute HMAC
	mac := hmac.New(sha256.New, []byte(h.webhookSecret))
	if _, err := mac.Write(payloadBytes); err != nil {
		return fmt.Errorf("failed to compute HMAC: %w", err)
	}

	expectedSignature := "sha256=" + hex.EncodeToString(mac.Sum(nil))

	// Compare signatures
	if !hmac.Equal([]byte(signature), []byte(expectedSignature)) {
		return fmt.Errorf("signature mismatch")
	}

	return nil
}

// ============================================================================
// Rate Limiting (Placeholder)
// ============================================================================

// TODO: Implement rate limiting using Redis or in-memory cache
// For now, this is a placeholder for future implementation

// checkRateLimit checks if the webhook endpoint is being rate limited
func (h *EngagementHandler) checkRateLimit(ctx context.Context, key string) error {
	// Placeholder: In production, implement with Redis or similar
	// Example: 1000 requests per minute per IP
	return nil
}
