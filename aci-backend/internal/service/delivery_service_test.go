package service

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/phillipboles/aci-backend/internal/domain"
)

// Test SendIssue - Happy Path
func TestSendIssue_HappyPath(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	// Create mock webhook server
	webhookCalled := false
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		webhookCalled = true
		assert.Equal(t, "POST", r.Method)
		assert.Equal(t, "application/json", r.Header.Get("Content-Type"))

		var payload WebhookPayload
		err := json.NewDecoder(r.Body).Decode(&payload)
		assert.NoError(t, err)
		assert.True(t, payload.SendImmediately)
		assert.Equal(t, 2, len(payload.Contacts))

		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, server.URL, 30)

	issueID := uuid.New()
	segmentID := uuid.New()
	subjectLine := "Test Subject"

	issue := &domain.NewsletterIssue{
		ID:                  issueID,
		ConfigurationID:     uuid.New(),
		SegmentID:           segmentID,
		IssueNumber:         1,
		IssueDate:           time.Now(),
		SubjectLines:        []string{subjectLine},
		SelectedSubjectLine: &subjectLine,
		Status:              domain.IssueStatusApproved,
		Blocks: []domain.NewsletterBlock{
			{
				ID:        uuid.New(),
				IssueID:   issueID,
				BlockType: domain.BlockTypeHero,
				Position:  0,
			},
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	email1 := "user1@example.com"
	email2 := "user2@example.com"
	contacts := []*domain.Contact{
		{
			ID:           uuid.New(),
			Email:        email1,
			IsSubscribed: true,
			IsBounced:    false,
		},
		{
			ID:           uuid.New(),
			Email:        email2,
			IsSubscribed: true,
			IsBounced:    false,
		},
	}

	issueRepo.On("GetByID", ctx, issueID).Return(issue, nil)
	contactRepo.On("GetBySegmentID", ctx, segmentID, 10000, 0).Return(contacts, 2, nil)
	issueRepo.On("Update", ctx, mock.AnythingOfType("*domain.NewsletterIssue")).Return(nil)

	// Execute
	err := service.SendIssue(ctx, issueID, nil)

	// Assert
	assert.NoError(t, err)
	assert.True(t, webhookCalled)
	issueRepo.AssertExpectations(t)
	contactRepo.AssertExpectations(t)
}

// Test SendIssue - Failure: Invalid Status
func TestSendIssue_InvalidStatus(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, "http://test.local", 30)

	issueID := uuid.New()
	issue := &domain.NewsletterIssue{
		ID:              issueID,
		ConfigurationID: uuid.New(),
		SegmentID:       uuid.New(),
		IssueNumber:     1,
		IssueDate:       time.Now(),
		Status:          domain.IssueStatusDraft, // Wrong status
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	issueRepo.On("GetByID", ctx, issueID).Return(issue, nil)

	// Execute
	err := service.SendIssue(ctx, issueID, nil)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "must be in approved status")
	issueRepo.AssertExpectations(t)
}

// Test SendIssue - Null/Empty: Missing Required Fields
func TestSendIssue_MissingRequiredFields(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, "http://test.local", 30)

	issueID := uuid.New()
	issue := &domain.NewsletterIssue{
		ID:                  issueID,
		ConfigurationID:     uuid.New(),
		SegmentID:           uuid.New(),
		IssueNumber:         1,
		IssueDate:           time.Now(),
		Status:              domain.IssueStatusApproved,
		SelectedSubjectLine: nil,                        // Missing
		Blocks:              []domain.NewsletterBlock{}, // Empty
		CreatedAt:           time.Now(),
		UpdatedAt:           time.Now(),
	}

	issueRepo.On("GetByID", ctx, issueID).Return(issue, nil)

	// Execute
	err := service.SendIssue(ctx, issueID, nil)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "subject line is required")
	issueRepo.AssertExpectations(t)
}

// Test SendIssue - Edge: No Active Contacts
func TestSendIssue_NoActiveContacts(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, "http://test.local", 30)

	issueID := uuid.New()
	segmentID := uuid.New()
	subjectLine := "Test Subject"

	issue := &domain.NewsletterIssue{
		ID:                  issueID,
		ConfigurationID:     uuid.New(),
		SegmentID:           segmentID,
		IssueNumber:         1,
		IssueDate:           time.Now(),
		SubjectLines:        []string{subjectLine},
		SelectedSubjectLine: &subjectLine,
		Status:              domain.IssueStatusApproved,
		Blocks: []domain.NewsletterBlock{
			{
				ID:        uuid.New(),
				IssueID:   issueID,
				BlockType: domain.BlockTypeHero,
				Position:  0,
			},
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// All contacts are either unsubscribed or bounced
	contacts := []*domain.Contact{
		{
			ID:           uuid.New(),
			Email:        "user1@example.com",
			IsSubscribed: false, // Unsubscribed
			IsBounced:    false,
		},
		{
			ID:           uuid.New(),
			Email:        "user2@example.com",
			IsSubscribed: true,
			IsBounced:    true, // Bounced
		},
	}

	issueRepo.On("GetByID", ctx, issueID).Return(issue, nil)
	contactRepo.On("GetBySegmentID", ctx, segmentID, 10000, 0).Return(contacts, 2, nil)

	// Execute
	err := service.SendIssue(ctx, issueID, nil)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "no active contacts")
	issueRepo.AssertExpectations(t)
	contactRepo.AssertExpectations(t)
}

// Test ScheduleIssue - Happy Path
func TestScheduleIssue_HappyPath(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, "http://test.local", 30)

	issueID := uuid.New()
	subjectLine := "Test Subject"
	scheduledFor := time.Now().Add(24 * time.Hour) // Tomorrow

	issue := &domain.NewsletterIssue{
		ID:                  issueID,
		ConfigurationID:     uuid.New(),
		SegmentID:           uuid.New(),
		IssueNumber:         1,
		IssueDate:           time.Now(),
		SubjectLines:        []string{subjectLine},
		SelectedSubjectLine: &subjectLine,
		Status:              domain.IssueStatusApproved,
		Blocks: []domain.NewsletterBlock{
			{
				ID:        uuid.New(),
				IssueID:   issueID,
				BlockType: domain.BlockTypeHero,
				Position:  0,
			},
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	issueRepo.On("GetByID", ctx, issueID).Return(issue, nil)
	issueRepo.On("Update", ctx, mock.AnythingOfType("*domain.NewsletterIssue")).Return(nil)

	// Execute
	err := service.ScheduleIssue(ctx, issueID, scheduledFor)

	// Assert
	assert.NoError(t, err)
	issueRepo.AssertExpectations(t)
}

// Test ScheduleIssue - Failure: Invalid Status
func TestScheduleIssue_InvalidStatus(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, "http://test.local", 30)

	issueID := uuid.New()
	scheduledFor := time.Now().Add(24 * time.Hour)

	issue := &domain.NewsletterIssue{
		ID:              issueID,
		ConfigurationID: uuid.New(),
		SegmentID:       uuid.New(),
		Status:          domain.IssueStatusDraft, // Wrong status
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	issueRepo.On("GetByID", ctx, issueID).Return(issue, nil)

	// Execute
	err := service.ScheduleIssue(ctx, issueID, scheduledFor)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "must be in approved status")
	issueRepo.AssertExpectations(t)
}

// Test ScheduleIssue - Null/Empty: Zero Time
func TestScheduleIssue_ZeroTime(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, "http://test.local", 30)

	issueID := uuid.New()
	scheduledFor := time.Time{} // Zero time

	// Execute
	err := service.ScheduleIssue(ctx, issueID, scheduledFor)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "scheduled_for time is required")
}

// Test ScheduleIssue - Edge: Past Time
func TestScheduleIssue_PastTime(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, "http://test.local", 30)

	issueID := uuid.New()
	scheduledFor := time.Now().Add(-24 * time.Hour) // Yesterday

	// Execute
	err := service.ScheduleIssue(ctx, issueID, scheduledFor)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "must be in the future")
}

// Test GetDeliveryStatus - Happy Path
func TestGetDeliveryStatus_HappyPath(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, "http://test.local", 30)

	issueID := uuid.New()
	sentAt := time.Now()
	espCampaignID := "esp-123"

	issue := &domain.NewsletterIssue{
		ID:                issueID,
		ConfigurationID:   uuid.New(),
		SegmentID:         uuid.New(),
		Status:            domain.IssueStatusSent,
		SentAt:            &sentAt,
		ESPCampaignID:     &espCampaignID,
		TotalRecipients:   100,
		TotalDelivered:    98,
		TotalOpens:        50,
		TotalClicks:       20,
		TotalBounces:      2,
		TotalUnsubscribes: 1,
		TotalComplaints:   0,
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}

	issueRepo.On("GetByID", ctx, issueID).Return(issue, nil)

	// Execute
	status, err := service.GetDeliveryStatus(ctx, issueID)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, status)
	assert.Equal(t, issueID, status.IssueID)
	assert.Equal(t, domain.IssueStatusSent, status.Status)
	assert.Equal(t, 98, status.SentCount)
	assert.Equal(t, 50, status.OpenCount)
	assert.Equal(t, 20, status.ClickCount)
	assert.Equal(t, 2, status.BounceCount)
	assert.Equal(t, 1, status.UnsubCount)
	assert.Equal(t, 0, status.ComplaintCount)
	assert.NotNil(t, status.ESPCampaignID)
	assert.Equal(t, espCampaignID, *status.ESPCampaignID)
	issueRepo.AssertExpectations(t)
}

// Test UpdateDeliveryMetrics - Happy Path
func TestUpdateDeliveryMetrics_HappyPath(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, "http://test.local", 30)

	issueID := uuid.New()
	espCampaignID := "esp-456"

	issue := &domain.NewsletterIssue{
		ID:              issueID,
		ConfigurationID: uuid.New(),
		SegmentID:       uuid.New(),
		Status:          domain.IssueStatusSent,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	metrics := DeliveryMetrics{
		Recipients:    100,
		Delivered:     98,
		Opens:         50,
		Clicks:        20,
		Bounces:       2,
		Unsubscribes:  1,
		Complaints:    0,
		ESPCampaignID: &espCampaignID,
	}

	issueRepo.On("GetByID", ctx, issueID).Return(issue, nil)
	issueRepo.On("UpdateMetrics", ctx, issueID, 100, 98, 50, 20, 2, 1, 0).Return(nil)
	issueRepo.On("Update", ctx, mock.AnythingOfType("*domain.NewsletterIssue")).Return(nil)

	// Execute
	err := service.UpdateDeliveryMetrics(ctx, issueID, metrics)

	// Assert
	assert.NoError(t, err)
	issueRepo.AssertExpectations(t)
}

// Test UpdateDeliveryMetrics - Failure: Negative Metrics
func TestUpdateDeliveryMetrics_NegativeMetrics(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, "http://test.local", 30)

	issueID := uuid.New()
	metrics := DeliveryMetrics{
		Recipients: 100,
		Delivered:  -1, // Negative value
		Opens:      50,
		Clicks:     20,
	}

	// Execute
	err := service.UpdateDeliveryMetrics(ctx, issueID, metrics)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "metrics cannot be negative")
}

// Test TriggerN8NWebhook - Happy Path
func TestTriggerN8NWebhook_HappyPath(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	webhookCalled := false
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		webhookCalled = true
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, server.URL, 30)

	payload := WebhookPayload{
		IssueID:         uuid.New(),
		IssueNumber:     1,
		ConfigurationID: uuid.New(),
		SegmentID:       uuid.New(),
		SubjectLine:     "Test",
		SendImmediately: true,
		Contacts: []ContactPayload{
			{Email: "test@example.com"},
		},
	}

	// Execute
	err := service.TriggerN8NWebhook(ctx, payload)

	// Assert
	assert.NoError(t, err)
	assert.True(t, webhookCalled)
}

// Test TriggerN8NWebhook - Failure: Server Error
func TestTriggerN8NWebhook_ServerError(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, server.URL, 30)

	payload := WebhookPayload{
		IssueID:         uuid.New(),
		IssueNumber:     1,
		ConfigurationID: uuid.New(),
		SegmentID:       uuid.New(),
		SubjectLine:     "Test",
		SendImmediately: true,
	}

	// Execute
	err := service.TriggerN8NWebhook(ctx, payload)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "webhook failed after")
}

// Test SendIssue - Connectivity: Repository Timeout
func TestSendIssue_RepositoryTimeout(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, "http://test.local", 30)

	issueID := uuid.New()

	// Simulate repository timeout
	issueRepo.On("GetByID", ctx, issueID).Return(nil, context.DeadlineExceeded)

	// Execute
	err := service.SendIssue(ctx, issueID, nil)

	// Assert
	assert.Error(t, err)
	assert.ErrorIs(t, err, context.DeadlineExceeded)
	issueRepo.AssertExpectations(t)
}

// Test SendIssue - Connectivity: Contact Repository Fails
func TestSendIssue_ContactRepositoryFailure(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, "http://test.local", 30)

	issueID := uuid.New()
	segmentID := uuid.New()
	subjectLine := "Test Subject"

	issue := &domain.NewsletterIssue{
		ID:                  issueID,
		ConfigurationID:     uuid.New(),
		SegmentID:           segmentID,
		IssueNumber:         1,
		IssueDate:           time.Now(),
		SubjectLines:        []string{subjectLine},
		SelectedSubjectLine: &subjectLine,
		Status:              domain.IssueStatusApproved,
		Blocks: []domain.NewsletterBlock{
			{
				ID:        uuid.New(),
				IssueID:   issueID,
				BlockType: domain.BlockTypeHero,
				Position:  0,
			},
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	expectedErr := errors.New("database connection refused")
	issueRepo.On("GetByID", ctx, issueID).Return(issue, nil)
	contactRepo.On("GetBySegmentID", ctx, segmentID, 10000, 0).Return(nil, 0, expectedErr)

	// Execute
	err := service.SendIssue(ctx, issueID, nil)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to get contacts")
	issueRepo.AssertExpectations(t)
	contactRepo.AssertExpectations(t)
}

// Test SendIssue - Connectivity: Webhook Timeout on Retry
func TestSendIssue_WebhookTimeoutOnRetry(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	// Server that always returns error
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer server.Close()

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, server.URL, 30)

	issueID := uuid.New()
	segmentID := uuid.New()
	subjectLine := "Test Subject"

	issue := &domain.NewsletterIssue{
		ID:                  issueID,
		ConfigurationID:     uuid.New(),
		SegmentID:           segmentID,
		IssueNumber:         1,
		IssueDate:           time.Now(),
		SubjectLines:        []string{subjectLine},
		SelectedSubjectLine: &subjectLine,
		Status:              domain.IssueStatusApproved,
		Blocks: []domain.NewsletterBlock{
			{
				ID:        uuid.New(),
				IssueID:   issueID,
				BlockType: domain.BlockTypeHero,
				Position:  0,
			},
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	email := "user@example.com"
	contacts := []*domain.Contact{
		{
			ID:           uuid.New(),
			Email:        email,
			IsSubscribed: true,
			IsBounced:    false,
		},
	}

	issueRepo.On("GetByID", ctx, issueID).Return(issue, nil)
	contactRepo.On("GetBySegmentID", ctx, segmentID, 10000, 0).Return(contacts, 1, nil)
	issueRepo.On("Update", ctx, mock.AnythingOfType("*domain.NewsletterIssue")).Return(nil)

	// Execute
	err := service.SendIssue(ctx, issueID, nil)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "webhook failed")
	issueRepo.AssertExpectations(t)
	contactRepo.AssertExpectations(t)
}

// Test SendIssue - Multi-Tenancy: Segment Isolation
func TestSendIssue_SegmentIsolation(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	webhookCalled := false
	var receivedContacts []ContactPayload

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		webhookCalled = true
		var payload WebhookPayload
		json.NewDecoder(r.Body).Decode(&payload)
		receivedContacts = payload.Contacts
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, server.URL, 30)

	issueID := uuid.New()
	segmentID := uuid.New()
	subjectLine := "Test Subject"

	issue := &domain.NewsletterIssue{
		ID:                  issueID,
		ConfigurationID:     uuid.New(),
		SegmentID:           segmentID,
		IssueNumber:         1,
		IssueDate:           time.Now(),
		SubjectLines:        []string{subjectLine},
		SelectedSubjectLine: &subjectLine,
		Status:              domain.IssueStatusApproved,
		Blocks: []domain.NewsletterBlock{
			{
				ID:        uuid.New(),
				IssueID:   issueID,
				BlockType: domain.BlockTypeHero,
				Position:  0,
			},
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Only contacts from the specified segment should be included
	email1 := "segment-user@example.com"
	contacts := []*domain.Contact{
		{
			ID:           uuid.New(),
			Email:        email1,
			IsSubscribed: true,
			IsBounced:    false,
		},
	}

	issueRepo.On("GetByID", ctx, issueID).Return(issue, nil)
	// Verify GetBySegmentID is called with correct segmentID
	contactRepo.On("GetBySegmentID", ctx, segmentID, 10000, 0).Return(contacts, 1, nil).Run(func(args mock.Arguments) {
		// Verify the correct segment ID is being queried
		assert.Equal(t, segmentID, args.Get(1))
	})
	issueRepo.On("Update", ctx, mock.AnythingOfType("*domain.NewsletterIssue")).Return(nil)

	// Execute
	err := service.SendIssue(ctx, issueID, nil)

	// Assert
	assert.NoError(t, err)
	assert.True(t, webhookCalled)
	assert.Len(t, receivedContacts, 1)
	assert.Equal(t, email1, receivedContacts[0].Email)
	contactRepo.AssertCalled(t, "GetBySegmentID", ctx, segmentID, 10000, 0)
}

// Test ScheduleIssue - Connectivity: Issue Repository Timeout
func TestScheduleIssue_IssueRepositoryTimeout(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, "http://test.local", 30)

	issueID := uuid.New()
	scheduledFor := time.Now().Add(24 * time.Hour)

	// Simulate issue repo timeout
	issueRepo.On("GetByID", ctx, issueID).Return(nil, context.DeadlineExceeded)

	// Execute
	err := service.ScheduleIssue(ctx, issueID, scheduledFor)

	// Assert
	assert.Error(t, err)
	assert.ErrorIs(t, err, context.DeadlineExceeded)
	issueRepo.AssertExpectations(t)
}

// Test UpdateDeliveryMetrics - Connectivity: Update Transaction Failure
func TestUpdateDeliveryMetrics_TransactionFailure(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, "http://test.local", 30)

	issueID := uuid.New()
	espCampaignID := "esp-789"

	issue := &domain.NewsletterIssue{
		ID:              issueID,
		ConfigurationID: uuid.New(),
		SegmentID:       uuid.New(),
		Status:          domain.IssueStatusSent,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	metrics := DeliveryMetrics{
		Recipients:    100,
		Delivered:     98,
		Opens:         50,
		Clicks:        20,
		Bounces:       2,
		Unsubscribes:  1,
		Complaints:    0,
		ESPCampaignID: &espCampaignID,
	}

	expectedErr := errors.New("database transaction failed")
	issueRepo.On("GetByID", ctx, issueID).Return(issue, nil)
	issueRepo.On("UpdateMetrics", ctx, issueID, 100, 98, 50, 20, 2, 1, 0).Return(expectedErr)

	// Execute
	err := service.UpdateDeliveryMetrics(ctx, issueID, metrics)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to update")
	issueRepo.AssertExpectations(t)
}

// ADDITIONAL COMPREHENSIVE TESTS

// Test SendIssue - Null/Empty: Nil Issue ID
func TestSendIssue_NilIssueID(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, "http://test.local", 30)

	// Execute
	err := service.SendIssue(ctx, uuid.Nil, nil)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "issue ID is required")
}

// Test SendIssue - Edge: Issue Not Found
func TestSendIssue_IssueNotFound(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, "http://test.local", 30)

	issueID := uuid.New()
	issueRepo.On("GetByID", ctx, issueID).Return(nil, errors.New("issue not found"))

	// Execute
	err := service.SendIssue(ctx, issueID, nil)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to get issue")
	issueRepo.AssertExpectations(t)
}

// Test SendIssue - Null/Empty: Empty Contacts List
func TestSendIssue_EmptyContactsList(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, "http://test.local", 30)

	issueID := uuid.New()
	segmentID := uuid.New()
	subjectLine := "Test Subject"

	issue := &domain.NewsletterIssue{
		ID:                  issueID,
		ConfigurationID:     uuid.New(),
		SegmentID:           segmentID,
		IssueNumber:         1,
		IssueDate:           time.Now(),
		SubjectLines:        []string{subjectLine},
		SelectedSubjectLine: &subjectLine,
		Status:              domain.IssueStatusApproved,
		Blocks: []domain.NewsletterBlock{
			{
				ID:        uuid.New(),
				IssueID:   issueID,
				BlockType: domain.BlockTypeHero,
				Position:  0,
			},
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Empty contacts list
	contacts := []*domain.Contact{}

	issueRepo.On("GetByID", ctx, issueID).Return(issue, nil)
	contactRepo.On("GetBySegmentID", ctx, segmentID, 10000, 0).Return(contacts, 0, nil)

	// Execute
	err := service.SendIssue(ctx, issueID, nil)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "no contacts found")
	issueRepo.AssertExpectations(t)
	contactRepo.AssertExpectations(t)
}

// Test SendIssue - Null/Empty: Empty Subject Line
func TestSendIssue_EmptySubjectLine(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, "http://test.local", 30)

	issueID := uuid.New()
	emptySubject := ""

	issue := &domain.NewsletterIssue{
		ID:                  issueID,
		ConfigurationID:     uuid.New(),
		SegmentID:           uuid.New(),
		IssueNumber:         1,
		IssueDate:           time.Now(),
		SelectedSubjectLine: &emptySubject, // Empty string
		Status:              domain.IssueStatusApproved,
		Blocks: []domain.NewsletterBlock{
			{
				ID:        uuid.New(),
				IssueID:   issueID,
				BlockType: domain.BlockTypeHero,
				Position:  0,
			},
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	issueRepo.On("GetByID", ctx, issueID).Return(issue, nil)

	// Execute
	err := service.SendIssue(ctx, issueID, nil)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "subject line is required")
	issueRepo.AssertExpectations(t)
}

// Test SendIssue - Edge: Webhook Update Status Fails After Failure
func TestSendIssue_WebhookFailsAndStatusUpdateFails(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	// Server that always returns error
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadGateway)
	}))
	defer server.Close()

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, server.URL, 30)

	issueID := uuid.New()
	segmentID := uuid.New()
	subjectLine := "Test Subject"

	issue := &domain.NewsletterIssue{
		ID:                  issueID,
		ConfigurationID:     uuid.New(),
		SegmentID:           segmentID,
		IssueNumber:         1,
		IssueDate:           time.Now(),
		SubjectLines:        []string{subjectLine},
		SelectedSubjectLine: &subjectLine,
		Status:              domain.IssueStatusApproved,
		Blocks: []domain.NewsletterBlock{
			{
				ID:        uuid.New(),
				IssueID:   issueID,
				BlockType: domain.BlockTypeHero,
				Position:  0,
			},
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	contacts := []*domain.Contact{
		{
			ID:           uuid.New(),
			Email:        "user@example.com",
			IsSubscribed: true,
			IsBounced:    false,
		},
	}

	issueRepo.On("GetByID", ctx, issueID).Return(issue, nil)
	contactRepo.On("GetBySegmentID", ctx, segmentID, 10000, 0).Return(contacts, 1, nil)
	// Simulate failure to update status to failed
	issueRepo.On("Update", ctx, mock.AnythingOfType("*domain.NewsletterIssue")).Return(errors.New("update failed"))

	// Execute
	err := service.SendIssue(ctx, issueID, nil)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "webhook failed")
	issueRepo.AssertExpectations(t)
	contactRepo.AssertExpectations(t)
}

// Test SendIssue - Edge: Scheduled Send with Valid Time
func TestSendIssue_ScheduledSendWithValidTime(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	webhookCalled := false
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		webhookCalled = true
		var payload WebhookPayload
		json.NewDecoder(r.Body).Decode(&payload)

		// Verify scheduled send
		assert.False(t, payload.SendImmediately)
		assert.NotNil(t, payload.ScheduledFor)

		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, server.URL, 30)

	issueID := uuid.New()
	segmentID := uuid.New()
	subjectLine := "Test Subject"
	scheduledFor := time.Now().Add(2 * time.Hour)

	issue := &domain.NewsletterIssue{
		ID:                  issueID,
		ConfigurationID:     uuid.New(),
		SegmentID:           segmentID,
		IssueNumber:         1,
		IssueDate:           time.Now(),
		SubjectLines:        []string{subjectLine},
		SelectedSubjectLine: &subjectLine,
		Status:              domain.IssueStatusApproved,
		Blocks: []domain.NewsletterBlock{
			{
				ID:        uuid.New(),
				IssueID:   issueID,
				BlockType: domain.BlockTypeHero,
				Position:  0,
			},
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	contacts := []*domain.Contact{
		{
			ID:           uuid.New(),
			Email:        "user@example.com",
			IsSubscribed: true,
			IsBounced:    false,
		},
	}

	issueRepo.On("GetByID", ctx, issueID).Return(issue, nil)
	contactRepo.On("GetBySegmentID", ctx, segmentID, 10000, 0).Return(contacts, 1, nil)
	issueRepo.On("Update", ctx, mock.AnythingOfType("*domain.NewsletterIssue")).Return(nil)

	// Execute
	err := service.SendIssue(ctx, issueID, &scheduledFor)

	// Assert
	assert.NoError(t, err)
	assert.True(t, webhookCalled)
	issueRepo.AssertExpectations(t)
	contactRepo.AssertExpectations(t)
}

// Test SendIssue - Edge: Concurrent Send Requests (Race Condition)
func TestSendIssue_ConcurrentSendRequests(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	callCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount++
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, server.URL, 30)

	issueID := uuid.New()
	segmentID := uuid.New()
	subjectLine := "Test Subject"

	issue := &domain.NewsletterIssue{
		ID:                  issueID,
		ConfigurationID:     uuid.New(),
		SegmentID:           segmentID,
		IssueNumber:         1,
		IssueDate:           time.Now(),
		SubjectLines:        []string{subjectLine},
		SelectedSubjectLine: &subjectLine,
		Status:              domain.IssueStatusApproved,
		Blocks: []domain.NewsletterBlock{
			{
				ID:        uuid.New(),
				IssueID:   issueID,
				BlockType: domain.BlockTypeHero,
				Position:  0,
			},
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	contacts := []*domain.Contact{
		{
			ID:           uuid.New(),
			Email:        "user@example.com",
			IsSubscribed: true,
			IsBounced:    false,
		},
	}

	// Allow multiple calls for concurrent test
	issueRepo.On("GetByID", ctx, issueID).Return(issue, nil)
	contactRepo.On("GetBySegmentID", ctx, segmentID, 10000, 0).Return(contacts, 1, nil)
	issueRepo.On("Update", ctx, mock.AnythingOfType("*domain.NewsletterIssue")).Return(nil)

	// Execute concurrently
	errChan := make(chan error, 2)

	go func() {
		errChan <- service.SendIssue(ctx, issueID, nil)
	}()

	go func() {
		errChan <- service.SendIssue(ctx, issueID, nil)
	}()

	// Collect results
	err1 := <-errChan
	err2 := <-errChan

	// Assert - both should succeed or one should fail with status validation
	// This demonstrates the service handles concurrent calls
	assert.True(t, err1 == nil || err2 == nil)
}

// Test SendIssue - Edge: Retry Logic Success on Second Attempt
func TestSendIssue_RetrySuccessOnSecondAttempt(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	attemptCount := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attemptCount++
		if attemptCount == 1 {
			// First attempt fails
			w.WriteHeader(http.StatusBadGateway)
		} else {
			// Second attempt succeeds
			w.WriteHeader(http.StatusOK)
		}
	}))
	defer server.Close()

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, server.URL, 30)

	issueID := uuid.New()
	segmentID := uuid.New()
	subjectLine := "Test Subject"

	issue := &domain.NewsletterIssue{
		ID:                  issueID,
		ConfigurationID:     uuid.New(),
		SegmentID:           segmentID,
		IssueNumber:         1,
		IssueDate:           time.Now(),
		SubjectLines:        []string{subjectLine},
		SelectedSubjectLine: &subjectLine,
		Status:              domain.IssueStatusApproved,
		Blocks: []domain.NewsletterBlock{
			{
				ID:        uuid.New(),
				IssueID:   issueID,
				BlockType: domain.BlockTypeHero,
				Position:  0,
			},
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	contacts := []*domain.Contact{
		{
			ID:           uuid.New(),
			Email:        "user@example.com",
			IsSubscribed: true,
			IsBounced:    false,
		},
	}

	issueRepo.On("GetByID", ctx, issueID).Return(issue, nil)
	contactRepo.On("GetBySegmentID", ctx, segmentID, 10000, 0).Return(contacts, 1, nil)
	issueRepo.On("Update", ctx, mock.AnythingOfType("*domain.NewsletterIssue")).Return(nil)

	// Execute
	err := service.SendIssue(ctx, issueID, nil)

	// Assert
	assert.NoError(t, err)
	assert.Equal(t, 2, attemptCount, "Should have retried once")
	issueRepo.AssertExpectations(t)
	contactRepo.AssertExpectations(t)
}

// Test ScheduleIssue - Null/Empty: Nil Issue ID
func TestScheduleIssue_NilIssueID(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, "http://test.local", 30)

	scheduledFor := time.Now().Add(24 * time.Hour)

	// Execute
	err := service.ScheduleIssue(ctx, uuid.Nil, scheduledFor)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "issue ID is required")
}

// Test ScheduleIssue - Edge: Missing Required Content Blocks
func TestScheduleIssue_MissingContentBlocks(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, "http://test.local", 30)

	issueID := uuid.New()
	scheduledFor := time.Now().Add(24 * time.Hour)
	subjectLine := "Test Subject"

	issue := &domain.NewsletterIssue{
		ID:                  issueID,
		ConfigurationID:     uuid.New(),
		SegmentID:           uuid.New(),
		IssueNumber:         1,
		IssueDate:           time.Now(),
		SubjectLines:        []string{subjectLine},
		SelectedSubjectLine: &subjectLine,
		Status:              domain.IssueStatusApproved,
		Blocks:              []domain.NewsletterBlock{}, // Empty blocks
		CreatedAt:           time.Now(),
		UpdatedAt:           time.Now(),
	}

	issueRepo.On("GetByID", ctx, issueID).Return(issue, nil)

	// Execute
	err := service.ScheduleIssue(ctx, issueID, scheduledFor)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "must have at least one content block")
	issueRepo.AssertExpectations(t)
}

// Test ScheduleIssue - Edge: Cannot Transition to Scheduled
func TestScheduleIssue_CannotTransition(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, "http://test.local", 30)

	issueID := uuid.New()
	scheduledFor := time.Now().Add(24 * time.Hour)
	subjectLine := "Test Subject"

	// Issue already sent - cannot transition back to scheduled
	issue := &domain.NewsletterIssue{
		ID:                  issueID,
		ConfigurationID:     uuid.New(),
		SegmentID:           uuid.New(),
		IssueNumber:         1,
		IssueDate:           time.Now(),
		SubjectLines:        []string{subjectLine},
		SelectedSubjectLine: &subjectLine,
		Status:              domain.IssueStatusSent, // Wrong status
		Blocks: []domain.NewsletterBlock{
			{
				ID:        uuid.New(),
				IssueID:   issueID,
				BlockType: domain.BlockTypeHero,
				Position:  0,
			},
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	issueRepo.On("GetByID", ctx, issueID).Return(issue, nil)

	// Execute
	err := service.ScheduleIssue(ctx, issueID, scheduledFor)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "must be in approved status")
	issueRepo.AssertExpectations(t)
}

// Test GetDeliveryStatus - Null/Empty: Nil Issue ID
func TestGetDeliveryStatus_NilIssueID(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, "http://test.local", 30)

	// Execute
	status, err := service.GetDeliveryStatus(ctx, uuid.Nil)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, status)
	assert.Contains(t, err.Error(), "issue ID is required")
}

// Test GetDeliveryStatus - Connectivity: Repository Failure
func TestGetDeliveryStatus_RepositoryFailure(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, "http://test.local", 30)

	issueID := uuid.New()
	issueRepo.On("GetByID", ctx, issueID).Return(nil, errors.New("database connection lost"))

	// Execute
	status, err := service.GetDeliveryStatus(ctx, issueID)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, status)
	assert.Contains(t, err.Error(), "failed to get issue")
	issueRepo.AssertExpectations(t)
}

// Test UpdateDeliveryMetrics - Null/Empty: Nil Issue ID
func TestUpdateDeliveryMetrics_NilIssueID(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, "http://test.local", 30)

	metrics := DeliveryMetrics{
		Recipients: 100,
		Delivered:  98,
	}

	// Execute
	err := service.UpdateDeliveryMetrics(ctx, uuid.Nil, metrics)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "issue ID is required")
}

// Test UpdateDeliveryMetrics - Edge: Invalid Status for Metrics Update
func TestUpdateDeliveryMetrics_InvalidStatus(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, "http://test.local", 30)

	issueID := uuid.New()

	issue := &domain.NewsletterIssue{
		ID:              issueID,
		ConfigurationID: uuid.New(),
		SegmentID:       uuid.New(),
		Status:          domain.IssueStatusDraft, // Wrong status
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	metrics := DeliveryMetrics{
		Recipients: 100,
		Delivered:  98,
	}

	issueRepo.On("GetByID", ctx, issueID).Return(issue, nil)

	// Execute
	err := service.UpdateDeliveryMetrics(ctx, issueID, metrics)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "can only update metrics for sent or scheduled issues")
	issueRepo.AssertExpectations(t)
}

// Test UpdateDeliveryMetrics - Edge: Status Transition from Scheduled to Sent
func TestUpdateDeliveryMetrics_StatusTransition(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, "http://test.local", 30)

	issueID := uuid.New()

	issue := &domain.NewsletterIssue{
		ID:              issueID,
		ConfigurationID: uuid.New(),
		SegmentID:       uuid.New(),
		Status:          domain.IssueStatusScheduled, // Scheduled
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	metrics := DeliveryMetrics{
		Recipients: 100,
		Delivered:  98, // Delivery started
		Opens:      0,
		Clicks:     0,
	}

	issueRepo.On("GetByID", ctx, issueID).Return(issue, nil)
	issueRepo.On("UpdateMetrics", ctx, issueID, 100, 98, 0, 0, 0, 0, 0).Return(nil)
	// Expect status to change to sent
	issueRepo.On("Update", ctx, mock.AnythingOfType("*domain.NewsletterIssue")).Return(nil).Run(func(args mock.Arguments) {
		updatedIssue := args.Get(1).(*domain.NewsletterIssue)
		assert.Equal(t, domain.IssueStatusSent, updatedIssue.Status)
		assert.NotNil(t, updatedIssue.SentAt)
	})

	// Execute
	err := service.UpdateDeliveryMetrics(ctx, issueID, metrics)

	// Assert
	assert.NoError(t, err)
	issueRepo.AssertExpectations(t)
}

// Test UpdateDeliveryMetrics - Null/Empty: Missing ESP Campaign ID
func TestUpdateDeliveryMetrics_WithoutESPCampaignID(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, "http://test.local", 30)

	issueID := uuid.New()

	issue := &domain.NewsletterIssue{
		ID:              issueID,
		ConfigurationID: uuid.New(),
		SegmentID:       uuid.New(),
		Status:          domain.IssueStatusSent,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	// No ESP campaign ID
	metrics := DeliveryMetrics{
		Recipients:    100,
		Delivered:     98,
		Opens:         50,
		Clicks:        20,
		ESPCampaignID: nil, // Nil
	}

	issueRepo.On("GetByID", ctx, issueID).Return(issue, nil)
	issueRepo.On("UpdateMetrics", ctx, issueID, 100, 98, 50, 20, 0, 0, 0).Return(nil)
	// Update should not be called for ESP campaign ID

	// Execute
	err := service.UpdateDeliveryMetrics(ctx, issueID, metrics)

	// Assert
	assert.NoError(t, err)
	issueRepo.AssertExpectations(t)
	issueRepo.AssertNotCalled(t, "Update")
}

// Test TriggerN8NWebhook - Edge: Context Cancellation
func TestTriggerN8NWebhook_ContextCancellation(t *testing.T) {
	// Setup
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(100 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	service := NewDeliveryService(issueRepo, configRepo, contactRepo, server.URL, 30)

	payload := WebhookPayload{
		IssueID:         uuid.New(),
		IssueNumber:     1,
		ConfigurationID: uuid.New(),
		SegmentID:       uuid.New(),
		SubjectLine:     "Test",
		SendImmediately: true,
	}

	// Create context that is immediately cancelled
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	// Execute
	err := service.TriggerN8NWebhook(ctx, payload)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "webhook failed")
}

// Test TriggerN8NWebhook - Connectivity: Invalid URL
func TestTriggerN8NWebhook_InvalidURL(t *testing.T) {
	// Setup
	ctx := context.Background()
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	// Invalid URL
	service := NewDeliveryService(issueRepo, configRepo, contactRepo, "http://invalid-url-that-does-not-exist.local:99999", 30)

	payload := WebhookPayload{
		IssueID:         uuid.New(),
		IssueNumber:     1,
		ConfigurationID: uuid.New(),
		SegmentID:       uuid.New(),
		SubjectLine:     "Test",
		SendImmediately: true,
	}

	// Execute
	err := service.TriggerN8NWebhook(ctx, payload)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "webhook failed after")
}

// Test NewDeliveryService - Null/Empty: Validation Panics
func TestNewDeliveryService_NilIssueRepo(t *testing.T) {
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	assert.Panics(t, func() {
		NewDeliveryService(nil, configRepo, contactRepo, "http://test.local", 30)
	})
}

func TestNewDeliveryService_NilConfigRepo(t *testing.T) {
	issueRepo := new(MockNewsletterIssueRepository)
	contactRepo := new(MockContactRepository)

	assert.Panics(t, func() {
		NewDeliveryService(issueRepo, nil, contactRepo, "http://test.local", 30)
	})
}

func TestNewDeliveryService_NilContactRepo(t *testing.T) {
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)

	assert.Panics(t, func() {
		NewDeliveryService(issueRepo, configRepo, nil, "http://test.local", 30)
	})
}

func TestNewDeliveryService_EmptyWebhookURL(t *testing.T) {
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	assert.Panics(t, func() {
		NewDeliveryService(issueRepo, configRepo, contactRepo, "", 30)
	})
}

func TestNewDeliveryService_InvalidTimeout(t *testing.T) {
	issueRepo := new(MockNewsletterIssueRepository)
	configRepo := new(MockNewsletterConfigRepository)
	contactRepo := new(MockContactRepository)

	assert.Panics(t, func() {
		NewDeliveryService(issueRepo, configRepo, contactRepo, "http://test.local", 0)
	})
}
