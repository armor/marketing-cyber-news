package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/phillipboles/aci-backend/internal/domain"
)

// ============================================================================
// Mock Repositories
// ============================================================================

type MockEngagementEventRepository struct {
	mock.Mock
}

func (m *MockEngagementEventRepository) Create(ctx context.Context, event *domain.EngagementEvent) error {
	args := m.Called(ctx, event)
	return args.Error(0)
}

func (m *MockEngagementEventRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.EngagementEvent, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.EngagementEvent), args.Error(1)
}

func (m *MockEngagementEventRepository) List(ctx context.Context, filter *domain.EngagementEventFilter) ([]*domain.EngagementEvent, int, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]*domain.EngagementEvent), args.Int(1), args.Error(2)
}

func (m *MockEngagementEventRepository) BulkCreate(ctx context.Context, events []*domain.EngagementEvent) error {
	args := m.Called(ctx, events)
	return args.Error(0)
}

func (m *MockEngagementEventRepository) GetByIssueID(ctx context.Context, issueID uuid.UUID) ([]*domain.EngagementEvent, error) {
	args := m.Called(ctx, issueID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.EngagementEvent), args.Error(1)
}

func (m *MockEngagementEventRepository) GetByContactID(ctx context.Context, contactID uuid.UUID, limit int) ([]*domain.EngagementEvent, error) {
	args := m.Called(ctx, contactID, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.EngagementEvent), args.Error(1)
}

func (m *MockEngagementEventRepository) GetMetricsForIssue(ctx context.Context, issueID uuid.UUID) (*domain.EngagementMetrics, error) {
	args := m.Called(ctx, issueID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.EngagementMetrics), args.Error(1)
}

func (m *MockEngagementEventRepository) GetTopicEngagement(ctx context.Context, issueID uuid.UUID) ([]domain.TopicEngagement, error) {
	args := m.Called(ctx, issueID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]domain.TopicEngagement), args.Error(1)
}

func (m *MockEngagementEventRepository) GetDeviceBreakdown(ctx context.Context, issueID uuid.UUID) (*domain.DeviceBreakdown, error) {
	args := m.Called(ctx, issueID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.DeviceBreakdown), args.Error(1)
}

func (m *MockEngagementEventRepository) RecordUnsubscribe(ctx context.Context, contactID, issueID uuid.UUID) error {
	args := m.Called(ctx, contactID, issueID)
	return args.Error(0)
}

type MockContactRepository struct {
	mock.Mock
}

func (m *MockContactRepository) Create(ctx context.Context, contact *domain.Contact) error {
	args := m.Called(ctx, contact)
	return args.Error(0)
}

func (m *MockContactRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Contact, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Contact), args.Error(1)
}

func (m *MockContactRepository) GetByEmail(ctx context.Context, email string) (*domain.Contact, error) {
	args := m.Called(ctx, email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Contact), args.Error(1)
}

func (m *MockContactRepository) Update(ctx context.Context, contact *domain.Contact) error {
	args := m.Called(ctx, contact)
	return args.Error(0)
}

func (m *MockContactRepository) MarkUnsubscribed(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockContactRepository) MarkBounced(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockContactRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockContactRepository) List(ctx context.Context, filter *domain.ContactFilter) ([]*domain.Contact, int, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]*domain.Contact), args.Int(1), args.Error(2)
}

func (m *MockContactRepository) BulkCreate(ctx context.Context, contacts []*domain.Contact) error {
	args := m.Called(ctx, contacts)
	return args.Error(0)
}

func (m *MockContactRepository) BulkUpdate(ctx context.Context, contacts []*domain.Contact) error {
	args := m.Called(ctx, contacts)
	return args.Error(0)
}

func (m *MockContactRepository) GetBySegmentID(ctx context.Context, segmentID uuid.UUID, limit, offset int) ([]*domain.Contact, int, error) {
	args := m.Called(ctx, segmentID, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]*domain.Contact), args.Int(1), args.Error(2)
}

func (m *MockContactRepository) UpdateEngagementScore(ctx context.Context, id uuid.UUID, score float64) error {
	args := m.Called(ctx, id, score)
	return args.Error(0)
}

func (m *MockContactRepository) UpdateNewsletterTracking(ctx context.Context, id uuid.UUID, sentAt time.Time) error {
	args := m.Called(ctx, id, sentAt)
	return args.Error(0)
}

type MockNewsletterIssueRepository struct {
	mock.Mock
}

func (m *MockNewsletterIssueRepository) Create(ctx context.Context, issue *domain.NewsletterIssue) error {
	args := m.Called(ctx, issue)
	return args.Error(0)
}

func (m *MockNewsletterIssueRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.NewsletterIssue, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.NewsletterIssue), args.Error(1)
}

func (m *MockNewsletterIssueRepository) List(ctx context.Context, filter *domain.NewsletterIssueFilter) ([]*domain.NewsletterIssue, int, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]*domain.NewsletterIssue), args.Int(1), args.Error(2)
}

func (m *MockNewsletterIssueRepository) Update(ctx context.Context, issue *domain.NewsletterIssue) error {
	args := m.Called(ctx, issue)
	return args.Error(0)
}

func (m *MockNewsletterIssueRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockNewsletterIssueRepository) GetByConfigAndNumber(ctx context.Context, configID uuid.UUID, number int) (*domain.NewsletterIssue, error) {
	args := m.Called(ctx, configID, number)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.NewsletterIssue), args.Error(1)
}

func (m *MockNewsletterIssueRepository) GetNextIssueNumber(ctx context.Context, configID uuid.UUID) (int, error) {
	args := m.Called(ctx, configID)
	return args.Int(0), args.Error(1)
}

func (m *MockNewsletterIssueRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.IssueStatus) error {
	args := m.Called(ctx, id, status)
	return args.Error(0)
}

func (m *MockNewsletterIssueRepository) UpdateMetrics(ctx context.Context, id uuid.UUID, recipients, delivered, opens, clicks, bounces, unsubscribes, complaints int) error {
	args := m.Called(ctx, id, recipients, delivered, opens, clicks, bounces, unsubscribes, complaints)
	return args.Error(0)
}

func (m *MockNewsletterIssueRepository) GetPendingApprovals(ctx context.Context) ([]*domain.NewsletterIssue, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.NewsletterIssue), args.Error(1)
}

func (m *MockNewsletterIssueRepository) GetScheduledIssues(ctx context.Context, before time.Time) ([]*domain.NewsletterIssue, error) {
	args := m.Called(ctx, before)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.NewsletterIssue), args.Error(1)
}

// ============================================================================
// Test Cases
// ============================================================================

func TestHandleWebhook_GenericOpenEvent(t *testing.T) {
	// Setup
	mockEngagementRepo := new(MockEngagementEventRepository)
	mockContactRepo := new(MockContactRepository)
	mockIssueRepo := new(MockNewsletterIssueRepository)

	handler := NewEngagementHandler(mockEngagementRepo, mockContactRepo, mockIssueRepo, "")

	contactID := uuid.New()
	issueID := uuid.New()

	// Mock expectations
	mockEngagementRepo.On("Create", mock.Anything, mock.MatchedBy(func(event *domain.EngagementEvent) bool {
		return event.ContactID == contactID &&
			event.IssueID == issueID &&
			event.EventType == domain.EventTypeOpen
	})).Return(nil)

	// Create request
	payload := map[string]interface{}{
		"event_type": "open",
		"contact_id": contactID.String(),
		"issue_id":   issueID.String(),
		"user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
		"ip_address": "192.168.1.1",
	}

	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/webhook/engagement", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	// Execute
	handler.HandleWebhook(rec, req)

	// Assert
	assert.Equal(t, http.StatusOK, rec.Code)
	mockEngagementRepo.AssertExpectations(t)
}

func TestHandleWebhook_GenericClickEvent(t *testing.T) {
	// Setup
	mockEngagementRepo := new(MockEngagementEventRepository)
	mockContactRepo := new(MockContactRepository)
	mockIssueRepo := new(MockNewsletterIssueRepository)

	handler := NewEngagementHandler(mockEngagementRepo, mockContactRepo, mockIssueRepo, "")

	contactID := uuid.New()
	issueID := uuid.New()
	clickedURL := "https://example.com/article"

	// Mock expectations
	mockEngagementRepo.On("Create", mock.Anything, mock.MatchedBy(func(event *domain.EngagementEvent) bool {
		return event.ContactID == contactID &&
			event.IssueID == issueID &&
			event.EventType == domain.EventTypeClick &&
			event.ClickedURL != nil &&
			*event.ClickedURL == clickedURL
	})).Return(nil)

	// Create request
	payload := map[string]interface{}{
		"event_type":  "click",
		"contact_id":  contactID.String(),
		"issue_id":    issueID.String(),
		"clicked_url": clickedURL,
		"utm_source":  "newsletter",
		"utm_medium":  "email",
		"utm_campaign": "weekly",
	}

	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/webhook/engagement", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	// Execute
	handler.HandleWebhook(rec, req)

	// Assert
	assert.Equal(t, http.StatusOK, rec.Code)
	mockEngagementRepo.AssertExpectations(t)
}

func TestHandleWebhook_UnsubscribeEvent(t *testing.T) {
	// Setup
	mockEngagementRepo := new(MockEngagementEventRepository)
	mockContactRepo := new(MockContactRepository)
	mockIssueRepo := new(MockNewsletterIssueRepository)

	handler := NewEngagementHandler(mockEngagementRepo, mockContactRepo, mockIssueRepo, "")

	contactID := uuid.New()
	issueID := uuid.New()

	// Mock expectations
	mockEngagementRepo.On("Create", mock.Anything, mock.MatchedBy(func(event *domain.EngagementEvent) bool {
		return event.ContactID == contactID &&
			event.IssueID == issueID &&
			event.EventType == domain.EventTypeUnsubscribe
	})).Return(nil)

	mockContactRepo.On("MarkUnsubscribed", mock.Anything, contactID).Return(nil)

	// Create request
	payload := map[string]interface{}{
		"event_type": "unsubscribe",
		"contact_id": contactID.String(),
		"issue_id":   issueID.String(),
	}

	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/webhook/engagement", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	// Execute
	handler.HandleWebhook(rec, req)

	// Assert
	assert.Equal(t, http.StatusOK, rec.Code)
	mockEngagementRepo.AssertExpectations(t)
	mockContactRepo.AssertExpectations(t)
}

func TestHandleWebhook_BounceEvent(t *testing.T) {
	// Setup
	mockEngagementRepo := new(MockEngagementEventRepository)
	mockContactRepo := new(MockContactRepository)
	mockIssueRepo := new(MockNewsletterIssueRepository)

	handler := NewEngagementHandler(mockEngagementRepo, mockContactRepo, mockIssueRepo, "")

	contactID := uuid.New()
	issueID := uuid.New()

	// Mock expectations
	mockEngagementRepo.On("Create", mock.Anything, mock.MatchedBy(func(event *domain.EngagementEvent) bool {
		return event.ContactID == contactID &&
			event.IssueID == issueID &&
			event.EventType == domain.EventTypeBounce
	})).Return(nil)

	mockContactRepo.On("MarkBounced", mock.Anything, contactID).Return(nil)

	// Create request
	payload := map[string]interface{}{
		"event_type": "bounce",
		"contact_id": contactID.String(),
		"issue_id":   issueID.String(),
	}

	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/webhook/engagement", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	// Execute
	handler.HandleWebhook(rec, req)

	// Assert
	assert.Equal(t, http.StatusOK, rec.Code)
	mockEngagementRepo.AssertExpectations(t)
	mockContactRepo.AssertExpectations(t)
}

func TestHandleWebhook_SpamComplaintEvent(t *testing.T) {
	// Setup
	mockEngagementRepo := new(MockEngagementEventRepository)
	mockContactRepo := new(MockContactRepository)
	mockIssueRepo := new(MockNewsletterIssueRepository)

	handler := NewEngagementHandler(mockEngagementRepo, mockContactRepo, mockIssueRepo, "")

	contactID := uuid.New()
	issueID := uuid.New()

	// Mock expectations
	mockEngagementRepo.On("Create", mock.Anything, mock.MatchedBy(func(event *domain.EngagementEvent) bool {
		return event.ContactID == contactID &&
			event.IssueID == issueID &&
			event.EventType == domain.EventTypeComplaint
	})).Return(nil)

	mockContactRepo.On("MarkUnsubscribed", mock.Anything, contactID).Return(nil)

	// Create request
	payload := map[string]interface{}{
		"event_type": "complaint",
		"contact_id": contactID.String(),
		"issue_id":   issueID.String(),
	}

	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/webhook/engagement", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	// Execute
	handler.HandleWebhook(rec, req)

	// Assert
	assert.Equal(t, http.StatusOK, rec.Code)
	mockEngagementRepo.AssertExpectations(t)
	mockContactRepo.AssertExpectations(t)
}

func TestHandleWebhook_EmailFallback(t *testing.T) {
	// Setup
	mockEngagementRepo := new(MockEngagementEventRepository)
	mockContactRepo := new(MockContactRepository)
	mockIssueRepo := new(MockNewsletterIssueRepository)

	handler := NewEngagementHandler(mockEngagementRepo, mockContactRepo, mockIssueRepo, "")

	contactID := uuid.New()
	issueID := uuid.New()
	email := "test@example.com"

	contact := &domain.Contact{
		ID:    contactID,
		Email: email,
	}

	// Mock expectations
	mockContactRepo.On("GetByEmail", mock.Anything, email).Return(contact, nil)
	mockEngagementRepo.On("Create", mock.Anything, mock.MatchedBy(func(event *domain.EngagementEvent) bool {
		return event.ContactID == contactID &&
			event.IssueID == issueID &&
			event.EventType == domain.EventTypeOpen
	})).Return(nil)

	// Create request without contact_id (use email fallback)
	payload := map[string]interface{}{
		"event_type": "open",
		"email":      email,
		"issue_id":   issueID.String(),
	}

	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/webhook/engagement", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	// Execute
	handler.HandleWebhook(rec, req)

	// Assert
	assert.Equal(t, http.StatusOK, rec.Code)
	mockContactRepo.AssertExpectations(t)
	mockEngagementRepo.AssertExpectations(t)
}

func TestHandleWebhook_InvalidJSON(t *testing.T) {
	// Setup
	mockEngagementRepo := new(MockEngagementEventRepository)
	mockContactRepo := new(MockContactRepository)
	mockIssueRepo := new(MockNewsletterIssueRepository)

	handler := NewEngagementHandler(mockEngagementRepo, mockContactRepo, mockIssueRepo, "")

	// Create request with invalid JSON
	req := httptest.NewRequest(http.MethodPost, "/api/v1/webhook/engagement", bytes.NewReader([]byte("invalid json")))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	// Execute
	handler.HandleWebhook(rec, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestHandleWebhook_MissingEventType(t *testing.T) {
	// Setup
	mockEngagementRepo := new(MockEngagementEventRepository)
	mockContactRepo := new(MockContactRepository)
	mockIssueRepo := new(MockNewsletterIssueRepository)

	handler := NewEngagementHandler(mockEngagementRepo, mockContactRepo, mockIssueRepo, "")

	contactID := uuid.New()
	issueID := uuid.New()

	// Create request without event_type
	payload := map[string]interface{}{
		"contact_id": contactID.String(),
		"issue_id":   issueID.String(),
	}

	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/webhook/engagement", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	// Execute
	handler.HandleWebhook(rec, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestParseDeviceType(t *testing.T) {
	tests := []struct {
		name      string
		userAgent string
		expected  string
	}{
		{
			name:      "iPhone",
			userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
			expected:  "mobile",
		},
		{
			name:      "iPad",
			userAgent: "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)",
			expected:  "tablet",
		},
		{
			name:      "Android Mobile",
			userAgent: "Mozilla/5.0 (Linux; Android 10; SM-G973F)",
			expected:  "mobile",
		},
		{
			name:      "Desktop Chrome",
			userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
			expected:  "desktop",
		},
		{
			name:      "Empty User Agent",
			userAgent: "",
			expected:  "unknown",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := domain.ParseDeviceType(tt.userAgent)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestMapHubSpotEventType(t *testing.T) {
	handler := &EngagementHandler{}

	tests := []struct {
		hubspotType string
		expected    domain.EventType
	}{
		{"open", domain.EventTypeOpen},
		{"email.opened", domain.EventTypeOpen},
		{"click", domain.EventTypeClick},
		{"email.clicked", domain.EventTypeClick},
		{"unsubscribe", domain.EventTypeUnsubscribe},
		{"subscription.change", domain.EventTypeUnsubscribe},
		{"bounce", domain.EventTypeBounce},
		{"email.bounced", domain.EventTypeBounce},
		{"spam", domain.EventTypeComplaint},
		{"spam_report", domain.EventTypeComplaint},
		{"unknown", domain.EventType("")},
	}

	for _, tt := range tests {
		t.Run(tt.hubspotType, func(t *testing.T) {
			result := handler.mapHubSpotEventType(tt.hubspotType)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestMapMailchimpEventType(t *testing.T) {
	handler := &EngagementHandler{}

	tests := []struct {
		mailchimpType string
		expected      domain.EventType
	}{
		{"open", domain.EventTypeOpen},
		{"click", domain.EventTypeClick},
		{"unsubscribe", domain.EventTypeUnsubscribe},
		{"unsub", domain.EventTypeUnsubscribe},
		{"bounce", domain.EventTypeBounce},
		{"cleaned", domain.EventTypeComplaint},
		{"spam", domain.EventTypeComplaint},
		{"unknown", domain.EventType("")},
	}

	for _, tt := range tests {
		t.Run(tt.mailchimpType, func(t *testing.T) {
			result := handler.mapMailchimpEventType(tt.mailchimpType)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestIsHubSpotPayload(t *testing.T) {
	handler := &EngagementHandler{}

	tests := []struct {
		name     string
		payload  map[string]interface{}
		expected bool
	}{
		{
			name: "HubSpot with subscriptionType",
			payload: map[string]interface{}{
				"subscriptionType": "email.opened",
				"email":            "test@example.com",
			},
			expected: true,
		},
		{
			name: "HubSpot with portalId",
			payload: map[string]interface{}{
				"portalId": "12345",
				"email":    "test@example.com",
			},
			expected: true,
		},
		{
			name: "Not HubSpot",
			payload: map[string]interface{}{
				"type":  "open",
				"email": "test@example.com",
			},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := handler.isHubSpotPayload(tt.payload)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestIsMailchimpPayload(t *testing.T) {
	handler := &EngagementHandler{}

	tests := []struct {
		name     string
		payload  map[string]interface{}
		expected bool
	}{
		{
			name: "Mailchimp unsubscribe",
			payload: map[string]interface{}{
				"type": "unsubscribe",
				"data": map[string]interface{}{
					"email": "test@example.com",
				},
			},
			expected: true,
		},
		{
			name: "Mailchimp campaign",
			payload: map[string]interface{}{
				"type": "campaign",
				"data": map[string]interface{}{
					"email": "test@example.com",
				},
			},
			expected: true,
		},
		{
			name: "Not Mailchimp",
			payload: map[string]interface{}{
				"event_type": "open",
				"email":      "test@example.com",
			},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := handler.isMailchimpPayload(tt.payload)
			assert.Equal(t, tt.expected, result)
		})
	}
}
