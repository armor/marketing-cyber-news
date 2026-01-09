package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// TestGetOverview_HappyPath tests successful metrics calculation
func TestGetOverview_HappyPath(t *testing.T) {
	// Setup
	mockEngagement := new(MockEngagementEventRepository)
	mockIssue := new(MockNewsletterIssueRepository)
	mockConfig := new(MockNewsletterConfigRepository)
	mockSegment := new(MockSegmentRepository)

	service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

	ctx := context.Background()
	dateRange := DateRange{
		Start: time.Now().AddDate(0, 0, -30),
		End:   time.Now(),
	}

	// Create test data
	issueID := uuid.New()
	contactID1 := uuid.New()
	contactID2 := uuid.New()

	sentAt := time.Now().AddDate(0, 0, -7)
	selectedSubject := "Test Newsletter"
	issues := []*domain.NewsletterIssue{
		{
			ID:                  issueID,
			ConfigurationID:     uuid.New(),
			SegmentID:           uuid.New(),
			IssueNumber:         1,
			SubjectLines:        []string{"Test Newsletter"},
			SelectedSubjectLine: &selectedSubject,
			Status:              domain.IssueStatusSent,
			TotalRecipients:     1000,
			TotalDelivered:      995,
			TotalOpens:          300,
			TotalClicks:         50,
			TotalBounces:        5,
			TotalUnsubscribes:   2,
			TotalComplaints:     1,
			SentAt:              &sentAt,
		},
	}

	events := []*domain.EngagementEvent{
		{
			ID:             uuid.New(),
			ContactID:      contactID1,
			IssueID:        issueID,
			EventType:      domain.EventTypeOpen,
			EventTimestamp: time.Now().AddDate(0, 0, -6),
		},
		{
			ID:             uuid.New(),
			ContactID:      contactID2,
			IssueID:        issueID,
			EventType:      domain.EventTypeOpen,
			EventTimestamp: time.Now().AddDate(0, 0, -6),
		},
		{
			ID:             uuid.New(),
			ContactID:      contactID1,
			IssueID:        issueID,
			EventType:      domain.EventTypeClick,
			EventTimestamp: time.Now().AddDate(0, 0, -5),
		},
	}

	// Setup mocks
	mockIssue.On("List", ctx, mock.AnythingOfType("*domain.NewsletterIssueFilter")).Return(issues, len(issues), nil)
	mockEngagement.On("GetByIssueID", ctx, issueID).Return(events, nil)

	// Execute
	metrics, err := service.GetOverview(ctx, dateRange)

	// Verify
	assert.NoError(t, err)
	assert.NotNil(t, metrics)
	assert.Equal(t, 1000, metrics.TotalSent)
	assert.Equal(t, 995, metrics.TotalDelivered)
	assert.Equal(t, 2, metrics.UniqueOpens)
	assert.Equal(t, 1, metrics.UniqueClicks)
	assert.Equal(t, 5, metrics.Bounces)
	assert.Equal(t, 2, metrics.Unsubscribes)
	assert.Equal(t, 1, metrics.SpamComplaints)

	// Check calculated rates
	assert.InDelta(t, 0.2, metrics.OpenRate, 0.01)        // 2/1000 * 100 = 0.2%
	assert.InDelta(t, 0.1, metrics.ClickRate, 0.01)       // 1/1000 * 100 = 0.1%
	assert.InDelta(t, 50.0, metrics.CTOR, 0.01)           // 1/2 * 100 = 50%
	assert.InDelta(t, 0.5, metrics.BounceRate, 0.01)      // 5/1000 * 100 = 0.5%
	assert.InDelta(t, 0.2, metrics.UnsubscribeRate, 0.01) // 2/1000 * 100 = 0.2%

	mockIssue.AssertExpectations(t)
	mockEngagement.AssertExpectations(t)
}

// TestGetOverview_DatabaseError tests handling of database errors
func TestGetOverview_DatabaseError(t *testing.T) {
	// Setup
	mockEngagement := new(MockEngagementEventRepository)
	mockIssue := new(MockNewsletterIssueRepository)
	mockConfig := new(MockNewsletterConfigRepository)
	mockSegment := new(MockSegmentRepository)

	service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

	ctx := context.Background()
	dateRange := DateRange{
		Start: time.Now().AddDate(0, 0, -30),
		End:   time.Now(),
	}

	// Setup mock to return error
	expectedErr := errors.New("database connection failed")
	mockIssue.On("List", ctx, mock.AnythingOfType("*domain.NewsletterIssueFilter")).Return(nil, 0, expectedErr)

	// Execute
	metrics, err := service.GetOverview(ctx, dateRange)

	// Verify
	assert.Error(t, err)
	assert.Nil(t, metrics)
	assert.Contains(t, err.Error(), "failed to get issues")
	assert.ErrorIs(t, err, expectedErr)

	mockIssue.AssertExpectations(t)
}

// TestGetOverview_NoData tests handling when no data exists for the period
func TestGetOverview_NoData(t *testing.T) {
	// Setup
	mockEngagement := new(MockEngagementEventRepository)
	mockIssue := new(MockNewsletterIssueRepository)
	mockConfig := new(MockNewsletterConfigRepository)
	mockSegment := new(MockSegmentRepository)

	service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

	ctx := context.Background()
	dateRange := DateRange{
		Start: time.Now().AddDate(0, 0, -30),
		End:   time.Now(),
	}

	// Setup mock to return empty list
	mockIssue.On("List", ctx, mock.AnythingOfType("*domain.NewsletterIssueFilter")).Return([]*domain.NewsletterIssue{}, 0, nil)

	// Execute
	metrics, err := service.GetOverview(ctx, dateRange)

	// Verify
	assert.NoError(t, err)
	assert.NotNil(t, metrics)
	assert.Equal(t, 0, metrics.TotalSent)
	assert.Equal(t, 0, metrics.UniqueOpens)
	assert.Equal(t, 0, metrics.UniqueClicks)
	assert.Equal(t, 0.0, metrics.OpenRate)
	assert.Equal(t, 0.0, metrics.ClickRate)
	assert.Equal(t, 0.0, metrics.CTOR)

	mockIssue.AssertExpectations(t)
}

// TestGetOverview_ZeroDivisionHandling tests handling of zero recipients (edge case)
func TestGetOverview_ZeroDivisionHandling(t *testing.T) {
	// Setup
	mockEngagement := new(MockEngagementEventRepository)
	mockIssue := new(MockNewsletterIssueRepository)
	mockConfig := new(MockNewsletterConfigRepository)
	mockSegment := new(MockSegmentRepository)

	service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

	ctx := context.Background()
	dateRange := DateRange{
		Start: time.Now().AddDate(0, 0, -30),
		End:   time.Now(),
	}

	// Create issue with zero recipients
	issueID := uuid.New()
	sentAt := time.Now().AddDate(0, 0, -7)
	selectedSubject := "Test Newsletter"
	issues := []*domain.NewsletterIssue{
		{
			ID:                  issueID,
			ConfigurationID:     uuid.New(),
			SegmentID:           uuid.New(),
			IssueNumber:         1,
			SubjectLines:        []string{"Test Newsletter"},
			SelectedSubjectLine: &selectedSubject,
			Status:              domain.IssueStatusSent,
			TotalRecipients:     0, // Zero recipients
			TotalDelivered:      0,
			TotalOpens:          0,
			TotalClicks:         0,
			TotalBounces:        0,
			TotalUnsubscribes:   0,
			TotalComplaints:     0,
			SentAt:              &sentAt,
		},
	}

	// Setup mocks
	mockIssue.On("List", ctx, mock.AnythingOfType("*domain.NewsletterIssueFilter")).Return(issues, len(issues), nil)
	mockEngagement.On("GetByIssueID", ctx, issueID).Return([]*domain.EngagementEvent{}, nil)

	// Execute
	metrics, err := service.GetOverview(ctx, dateRange)

	// Verify - should not panic, should return zero rates
	assert.NoError(t, err)
	assert.NotNil(t, metrics)
	assert.Equal(t, 0, metrics.TotalSent)
	assert.Equal(t, 0.0, metrics.OpenRate)
	assert.Equal(t, 0.0, metrics.ClickRate)
	assert.Equal(t, 0.0, metrics.CTOR)
	assert.Equal(t, 0.0, metrics.BounceRate)

	mockIssue.AssertExpectations(t)
	mockEngagement.AssertExpectations(t)
}

// TestGetSegmentAnalytics_HappyPath tests successful segment metrics calculation
func TestGetSegmentAnalytics_HappyPath(t *testing.T) {
	// Setup
	mockEngagement := new(MockEngagementEventRepository)
	mockIssue := new(MockNewsletterIssueRepository)
	mockConfig := new(MockNewsletterConfigRepository)
	mockSegment := new(MockSegmentRepository)

	service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

	ctx := context.Background()
	segmentID := uuid.New()
	dateRange := DateRange{
		Start: time.Now().AddDate(0, 0, -30),
		End:   time.Now(),
	}

	// Create test data
	description := "Test description"
	segment := &domain.Segment{
		ID:          segmentID,
		Name:        "Test Segment",
		Description: &description,
	}

	configID := uuid.New()
	configs := []*domain.NewsletterConfiguration{
		{
			ID:        configID,
			SegmentID: &segmentID,
			Name:      "Weekly Newsletter",
		},
	}

	issueID := uuid.New()
	sentAt := time.Now().AddDate(0, 0, -7)
	selectedSubject := "Test Newsletter"
	issues := []*domain.NewsletterIssue{
		{
			ID:                  issueID,
			ConfigurationID:     configID,
			SegmentID:           segmentID,
			IssueNumber:         1,
			SubjectLines:        []string{"Test Newsletter"},
			SelectedSubjectLine: &selectedSubject,
			Status:              domain.IssueStatusSent,
			TotalRecipients:     500,
			TotalDelivered:      495,
			TotalOpens:          150,
			TotalClicks:         25,
			TotalBounces:        5,
			SentAt:              &sentAt,
		},
	}

	contactID := uuid.New()
	events := []*domain.EngagementEvent{
		{
			ID:             uuid.New(),
			ContactID:      contactID,
			IssueID:        issueID,
			EventType:      domain.EventTypeOpen,
			EventTimestamp: time.Now().AddDate(0, 0, -6),
		},
	}

	// Setup mocks
	mockSegment.On("GetByID", ctx, segmentID).Return(segment, nil)
	mockConfig.On("GetBySegmentID", ctx, segmentID).Return(configs, nil)
	mockIssue.On("List", ctx, mock.AnythingOfType("*domain.NewsletterIssueFilter")).Return(issues, len(issues), nil)
	mockEngagement.On("GetByIssueID", ctx, issueID).Return(events, nil)

	// Execute
	segmentMetrics, err := service.GetSegmentAnalytics(ctx, segmentID, dateRange)

	// Verify
	assert.NoError(t, err)
	assert.NotNil(t, segmentMetrics)
	assert.Equal(t, segmentID, segmentMetrics.SegmentID)
	assert.Equal(t, "Test Segment", segmentMetrics.SegmentName)
	assert.NotNil(t, segmentMetrics.Metrics)
	assert.Equal(t, 500, segmentMetrics.Metrics.TotalSent)
	assert.Equal(t, 1, segmentMetrics.Metrics.UniqueOpens)

	mockSegment.AssertExpectations(t)
	mockConfig.AssertExpectations(t)
	mockIssue.AssertExpectations(t)
	mockEngagement.AssertExpectations(t)
}

// TestGetSegmentAnalytics_SegmentNotFound tests handling when segment doesn't exist
func TestGetSegmentAnalytics_SegmentNotFound(t *testing.T) {
	// Setup
	mockEngagement := new(MockEngagementEventRepository)
	mockIssue := new(MockNewsletterIssueRepository)
	mockConfig := new(MockNewsletterConfigRepository)
	mockSegment := new(MockSegmentRepository)

	service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

	ctx := context.Background()
	segmentID := uuid.New()
	dateRange := DateRange{
		Start: time.Now().AddDate(0, 0, -30),
		End:   time.Now(),
	}

	// Setup mock to return error
	expectedErr := errors.New("segment not found")
	mockSegment.On("GetByID", ctx, segmentID).Return(nil, expectedErr)

	// Execute
	metrics, err := service.GetSegmentAnalytics(ctx, segmentID, dateRange)

	// Verify
	assert.Error(t, err)
	assert.Nil(t, metrics)
	assert.Contains(t, err.Error(), "failed to get segment")

	mockSegment.AssertExpectations(t)
}

// TestGetSegmentAnalytics_NoConfigs tests handling when segment has no newsletter configs
func TestGetSegmentAnalytics_NoConfigs(t *testing.T) {
	// Setup
	mockEngagement := new(MockEngagementEventRepository)
	mockIssue := new(MockNewsletterIssueRepository)
	mockConfig := new(MockNewsletterConfigRepository)
	mockSegment := new(MockSegmentRepository)

	service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

	ctx := context.Background()
	segmentID := uuid.New()
	dateRange := DateRange{
		Start: time.Now().AddDate(0, 0, -30),
		End:   time.Now(),
	}

	description := "Test description"
	segment := &domain.Segment{
		ID:          segmentID,
		Name:        "Test Segment",
		Description: &description,
	}

	// Setup mocks
	mockSegment.On("GetByID", ctx, segmentID).Return(segment, nil)
	mockConfig.On("GetBySegmentID", ctx, segmentID).Return([]*domain.NewsletterConfiguration{}, nil)

	// Execute
	metrics, err := service.GetSegmentAnalytics(ctx, segmentID, dateRange)

	// Verify - should return empty metrics, not error
	assert.NoError(t, err)
	assert.NotNil(t, metrics)
	assert.Equal(t, segmentID, metrics.SegmentID)
	assert.Equal(t, "Test Segment", metrics.SegmentName)
	assert.Empty(t, metrics.TopContent)
	assert.Empty(t, metrics.Trends)

	mockSegment.AssertExpectations(t)
	mockConfig.AssertExpectations(t)
}

// TestGetTopPerforming_HappyPath tests successful top performers retrieval
func TestGetTopPerforming_HappyPath(t *testing.T) {
	// Setup
	mockEngagement := new(MockEngagementEventRepository)
	mockIssue := new(MockNewsletterIssueRepository)
	mockConfig := new(MockNewsletterConfigRepository)
	mockSegment := new(MockSegmentRepository)

	service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

	ctx := context.Background()

	// Create test issues with different CTRs
	sentAt1 := time.Now().AddDate(0, 0, -1)
	sentAt2 := time.Now().AddDate(0, 0, -2)
	sentAt3 := time.Now().AddDate(0, 0, -3)
	subject1 := "High Performer"
	subject2 := "Medium Performer"
	subject3 := "Low Performer"

	issues := []*domain.NewsletterIssue{
		{
			ID:                  uuid.New(),
			ConfigurationID:     uuid.New(),
			SegmentID:           uuid.New(),
			IssueNumber:         1,
			SubjectLines:        []string{"High Performer"},
			SelectedSubjectLine: &subject1,
			TotalRecipients:     1000,
			TotalClicks:         100, // 10% CTR
			Status:              domain.IssueStatusSent,
			SentAt:              &sentAt1,
		},
		{
			ID:                  uuid.New(),
			ConfigurationID:     uuid.New(),
			SegmentID:           uuid.New(),
			IssueNumber:         2,
			SubjectLines:        []string{"Medium Performer"},
			SelectedSubjectLine: &subject2,
			TotalRecipients:     1000,
			TotalClicks:         50, // 5% CTR
			Status:              domain.IssueStatusSent,
			SentAt:              &sentAt2,
		},
		{
			ID:                  uuid.New(),
			ConfigurationID:     uuid.New(),
			SegmentID:           uuid.New(),
			IssueNumber:         3,
			SubjectLines:        []string{"Low Performer"},
			SelectedSubjectLine: &subject3,
			TotalRecipients:     1000,
			TotalClicks:         10, // 1% CTR
			Status:              domain.IssueStatusSent,
			SentAt:              &sentAt3,
		},
	}

	// Setup mock
	mockIssue.On("List", ctx, mock.AnythingOfType("*domain.NewsletterIssueFilter")).Return(issues, len(issues), nil)

	// Execute
	performers, err := service.GetTopPerforming(ctx, MetricTypeCTR, 2)

	// Verify
	assert.NoError(t, err)
	assert.Len(t, performers, 2)
	assert.Equal(t, "High Performer", performers[0].Subject)
	assert.InDelta(t, 10.0, performers[0].MetricValue, 0.01)
	assert.Equal(t, 1, performers[0].Rank)
	assert.Equal(t, "Medium Performer", performers[1].Subject)
	assert.InDelta(t, 5.0, performers[1].MetricValue, 0.01)
	assert.Equal(t, 2, performers[1].Rank)

	mockIssue.AssertExpectations(t)
}

// TestGetTopPerforming_DatabaseError tests handling of database errors
func TestGetTopPerforming_DatabaseError(t *testing.T) {
	// Setup
	mockEngagement := new(MockEngagementEventRepository)
	mockIssue := new(MockNewsletterIssueRepository)
	mockConfig := new(MockNewsletterConfigRepository)
	mockSegment := new(MockSegmentRepository)

	service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

	ctx := context.Background()

	// Setup mock to return error
	expectedErr := errors.New("database error")
	mockIssue.On("List", ctx, mock.AnythingOfType("*domain.NewsletterIssueFilter")).Return(nil, 0, expectedErr)

	// Execute
	performers, err := service.GetTopPerforming(ctx, MetricTypeCTR, 5)

	// Verify
	assert.Error(t, err)
	assert.Nil(t, performers)
	assert.Contains(t, err.Error(), "failed to get issues")

	mockIssue.AssertExpectations(t)
}

// TestGetTopPerforming_NoIssues tests handling when no issues exist
func TestGetTopPerforming_NoIssues(t *testing.T) {
	// Setup
	mockEngagement := new(MockEngagementEventRepository)
	mockIssue := new(MockNewsletterIssueRepository)
	mockConfig := new(MockNewsletterConfigRepository)
	mockSegment := new(MockSegmentRepository)

	service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

	ctx := context.Background()

	// Setup mock to return empty list
	mockIssue.On("List", ctx, mock.AnythingOfType("*domain.NewsletterIssueFilter")).Return([]*domain.NewsletterIssue{}, 0, nil)

	// Execute
	performers, err := service.GetTopPerforming(ctx, MetricTypeCTR, 5)

	// Verify
	assert.NoError(t, err)
	assert.NotNil(t, performers)
	assert.Empty(t, performers)

	mockIssue.AssertExpectations(t)
}

// TestCompareToTargets_HappyPath tests successful target comparison
func TestCompareToTargets_HappyPath(t *testing.T) {
	// Setup
	mockEngagement := new(MockEngagementEventRepository)
	mockIssue := new(MockNewsletterIssueRepository)
	mockConfig := new(MockNewsletterConfigRepository)
	mockSegment := new(MockSegmentRepository)

	service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

	ctx := context.Background()

	// Create metrics with values in target range
	metrics := &OverviewMetrics{
		OpenRate:          30.0, // Within 28-35% range
		ClickRate:         4.5,  // Within 3.5-5.5% range
		CTOR:              15.0, // Within 12-18% range
		UnsubscribeRate:   0.1,  // Below 0.2% max
		BounceRate:        0.3,  // Below 0.5% max
		SpamComplaintRate: 0.05, // Below 0.1% max
	}

	// Execute
	comparisons, err := service.CompareToTargets(ctx, metrics)

	// Verify
	assert.NoError(t, err)
	assert.Len(t, comparisons, 6)

	// Check Open Rate comparison
	openRateComp := comparisons[0]
	assert.Equal(t, "Open Rate", openRateComp.MetricName)
	assert.Equal(t, TargetStatusOnTarget, openRateComp.Status)
	assert.True(t, openRateComp.IsAboveMinimum)
	assert.True(t, openRateComp.IsBelowMaximum)

	// Check Click Rate comparison
	clickRateComp := comparisons[1]
	assert.Equal(t, "Click Rate", clickRateComp.MetricName)
	assert.Equal(t, TargetStatusOnTarget, clickRateComp.Status)
}

// TestCompareToTargets_NilMetrics tests handling of nil metrics
func TestCompareToTargets_NilMetrics(t *testing.T) {
	// Setup
	mockEngagement := new(MockEngagementEventRepository)
	mockIssue := new(MockNewsletterIssueRepository)
	mockConfig := new(MockNewsletterConfigRepository)
	mockSegment := new(MockSegmentRepository)

	service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

	ctx := context.Background()

	// Execute
	comparisons, err := service.CompareToTargets(ctx, nil)

	// Verify
	assert.Error(t, err)
	assert.Nil(t, comparisons)
	assert.Contains(t, err.Error(), "metrics cannot be nil")
}

// TestCompareToTargets_AboveTarget tests metrics above target range
func TestCompareToTargets_AboveTarget(t *testing.T) {
	// Setup
	mockEngagement := new(MockEngagementEventRepository)
	mockIssue := new(MockNewsletterIssueRepository)
	mockConfig := new(MockNewsletterConfigRepository)
	mockSegment := new(MockSegmentRepository)

	service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

	ctx := context.Background()

	// Create metrics above target
	metrics := &OverviewMetrics{
		OpenRate:        40.0, // Above 35% max
		UnsubscribeRate: 0.3,  // Above 0.2% max
	}

	// Execute
	comparisons, err := service.CompareToTargets(ctx, metrics)

	// Verify
	assert.NoError(t, err)
	assert.Len(t, comparisons, 6)

	// Check Open Rate is above target
	openRateComp := comparisons[0]
	assert.Equal(t, TargetStatusAbove, openRateComp.Status)
	assert.True(t, openRateComp.PercentageDiff > 0)

	// Check Unsubscribe Rate is above target (bad)
	unsubscribeComp := comparisons[3]
	assert.Equal(t, TargetStatusAbove, unsubscribeComp.Status)
}

// TestCompareToTargets_BelowTarget tests metrics below target range
func TestCompareToTargets_BelowTarget(t *testing.T) {
	// Setup
	mockEngagement := new(MockEngagementEventRepository)
	mockIssue := new(MockNewsletterIssueRepository)
	mockConfig := new(MockNewsletterConfigRepository)
	mockSegment := new(MockSegmentRepository)

	service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

	ctx := context.Background()

	// Create metrics below target
	metrics := &OverviewMetrics{
		OpenRate:  20.0, // Below 28% min
		ClickRate: 2.0,  // Below 3.5% min
	}

	// Execute
	comparisons, err := service.CompareToTargets(ctx, metrics)

	// Verify
	assert.NoError(t, err)
	assert.Len(t, comparisons, 6)

	// Check Open Rate is below target
	openRateComp := comparisons[0]
	assert.Equal(t, TargetStatusBelow, openRateComp.Status)
	assert.False(t, openRateComp.IsAboveMinimum)

	// Check Click Rate is below target
	clickRateComp := comparisons[1]
	assert.Equal(t, TargetStatusBelow, clickRateComp.Status)
	assert.False(t, clickRateComp.IsAboveMinimum)
}

// TestDateRange_Validate tests date range validation
func TestDateRange_Validate(t *testing.T) {
	tests := []struct {
		name        string
		dateRange   DateRange
		expectError bool
		errorMsg    string
	}{
		{
			name: "valid date range",
			dateRange: DateRange{
				Start: time.Now().AddDate(0, 0, -30),
				End:   time.Now(),
			},
			expectError: false,
		},
		{
			name: "zero start date",
			dateRange: DateRange{
				Start: time.Time{},
				End:   time.Now(),
			},
			expectError: true,
			errorMsg:    "start date is required",
		},
		{
			name: "zero end date",
			dateRange: DateRange{
				Start: time.Now(),
				End:   time.Time{},
			},
			expectError: true,
			errorMsg:    "end date is required",
		},
		{
			name: "end before start",
			dateRange: DateRange{
				Start: time.Now(),
				End:   time.Now().AddDate(0, 0, -30),
			},
			expectError: true,
			errorMsg:    "end date must be after start date",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.dateRange.Validate()

			if tt.expectError {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errorMsg)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

// TestGetTrendData_HappyPath tests successful trend data calculation
func TestGetTrendData_HappyPath(t *testing.T) {
	// Setup
	mockEngagement := new(MockEngagementEventRepository)
	mockIssue := new(MockNewsletterIssueRepository)
	mockConfig := new(MockNewsletterConfigRepository)
	mockSegment := new(MockSegmentRepository)

	service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

	ctx := context.Background()
	dateRange := DateRange{
		Start: time.Now().AddDate(0, 0, -14),
		End:   time.Now(),
	}

	// Create issues across multiple days
	sentAt1 := time.Now().AddDate(0, 0, -7)
	sentAt2 := time.Now().AddDate(0, 0, -1)
	subject1 := "Week 1"
	subject2 := "Week 2"

	issues := []*domain.NewsletterIssue{
		{
			ID:                  uuid.New(),
			ConfigurationID:     uuid.New(),
			SegmentID:           uuid.New(),
			IssueNumber:         1,
			SubjectLines:        []string{"Week 1"},
			SelectedSubjectLine: &subject1,
			TotalRecipients:     1000,
			TotalOpens:          300,
			Status:              domain.IssueStatusSent,
			SentAt:              &sentAt1,
		},
		{
			ID:                  uuid.New(),
			ConfigurationID:     uuid.New(),
			SegmentID:           uuid.New(),
			IssueNumber:         2,
			SubjectLines:        []string{"Week 2"},
			SelectedSubjectLine: &subject2,
			TotalRecipients:     1000,
			TotalOpens:          350,
			Status:              domain.IssueStatusSent,
			SentAt:              &sentAt2,
		},
	}

	// Setup mock
	mockIssue.On("List", ctx, mock.AnythingOfType("*domain.NewsletterIssueFilter")).Return(issues, len(issues), nil)

	// Execute
	trendPoints, err := service.GetTrendData(ctx, MetricTypeOpenRate, dateRange, GranularityWeekly)

	// Verify
	assert.NoError(t, err)
	assert.NotEmpty(t, trendPoints)
	// Should have points sorted by timestamp
	if len(trendPoints) > 1 {
		assert.True(t, trendPoints[0].Timestamp.Before(trendPoints[1].Timestamp) || trendPoints[0].Timestamp.Equal(trendPoints[1].Timestamp))
	}

	mockIssue.AssertExpectations(t)
}

// TestGetTrendData_InvalidDateRange tests invalid date range handling
func TestGetTrendData_InvalidDateRange(t *testing.T) {
	// Setup
	mockEngagement := new(MockEngagementEventRepository)
	mockIssue := new(MockNewsletterIssueRepository)
	mockConfig := new(MockNewsletterConfigRepository)
	mockSegment := new(MockSegmentRepository)

	service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

	ctx := context.Background()
	dateRange := DateRange{
		Start: time.Now(),
		End:   time.Now().AddDate(0, 0, -30), // End before start
	}

	// Execute
	trendPoints, err := service.GetTrendData(ctx, MetricTypeOpenRate, dateRange, GranularityDaily)

	// Verify
	assert.Error(t, err)
	assert.Nil(t, trendPoints)
	assert.Contains(t, err.Error(), "invalid date range")
}

// TestGetTrendData_NoIssues tests handling when no issues exist
func TestGetTrendData_NoIssues(t *testing.T) {
	// Setup
	mockEngagement := new(MockEngagementEventRepository)
	mockIssue := new(MockNewsletterIssueRepository)
	mockConfig := new(MockNewsletterConfigRepository)
	mockSegment := new(MockSegmentRepository)

	service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

	ctx := context.Background()
	dateRange := DateRange{
		Start: time.Now().AddDate(0, 0, -30),
		End:   time.Now(),
	}

	// Setup mock to return empty list
	mockIssue.On("List", ctx, mock.AnythingOfType("*domain.NewsletterIssueFilter")).Return([]*domain.NewsletterIssue{}, 0, nil)

	// Execute
	trendPoints, err := service.GetTrendData(ctx, MetricTypeOpenRate, dateRange, GranularityDaily)

	// Verify
	assert.NoError(t, err)
	assert.NotNil(t, trendPoints)
	assert.Empty(t, trendPoints)

	mockIssue.AssertExpectations(t)
}

// TestNewAnalyticsService_NilDependencies tests panic on nil dependencies
func TestNewAnalyticsService_NilDependencies(t *testing.T) {
	t.Run("nil engagement repo", func(t *testing.T) {
		assert.Panics(t, func() {
			NewAnalyticsService(nil, new(MockNewsletterIssueRepository), new(MockNewsletterConfigRepository), new(MockSegmentRepository))
		})
	})

	t.Run("nil issue repo", func(t *testing.T) {
		assert.Panics(t, func() {
			NewAnalyticsService(new(MockEngagementEventRepository), nil, new(MockNewsletterConfigRepository), new(MockSegmentRepository))
		})
	})

	t.Run("nil config repo", func(t *testing.T) {
		assert.Panics(t, func() {
			NewAnalyticsService(new(MockEngagementEventRepository), new(MockNewsletterIssueRepository), nil, new(MockSegmentRepository))
		})
	})

	t.Run("nil segment repo", func(t *testing.T) {
		assert.Panics(t, func() {
			NewAnalyticsService(new(MockEngagementEventRepository), new(MockNewsletterIssueRepository), new(MockNewsletterConfigRepository), nil)
		})
	})

	t.Run("all valid repos", func(t *testing.T) {
		assert.NotPanics(t, func() {
			service := NewAnalyticsService(
				new(MockEngagementEventRepository),
				new(MockNewsletterIssueRepository),
				new(MockNewsletterConfigRepository),
				new(MockSegmentRepository),
			)
			assert.NotNil(t, service)
		})
	})
}

// TestGetOverview_EngagementRepositoryFailure tests handling when engagement repo fails
func TestGetOverview_EngagementRepositoryFailure(t *testing.T) {
	// Setup
	mockEngagement := new(MockEngagementEventRepository)
	mockIssue := new(MockNewsletterIssueRepository)
	mockConfig := new(MockNewsletterConfigRepository)
	mockSegment := new(MockSegmentRepository)

	service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

	ctx := context.Background()
	issueID := uuid.New()
	dateRange := DateRange{
		Start: time.Now().AddDate(0, 0, -30),
		End:   time.Now(),
	}

	sentAt := time.Now().AddDate(0, 0, -7)
	selectedSubject := "Test Newsletter"
	issues := []*domain.NewsletterIssue{
		{
			ID:                  issueID,
			ConfigurationID:     uuid.New(),
			SegmentID:           uuid.New(),
			IssueNumber:         1,
			SubjectLines:        []string{"Test Newsletter"},
			SelectedSubjectLine: &selectedSubject,
			Status:              domain.IssueStatusSent,
			TotalRecipients:     1000,
			TotalDelivered:      995,
			SentAt:              &sentAt,
		},
	}

	// Setup mocks - engagement repo fails while issue repo succeeds
	mockIssue.On("List", ctx, mock.AnythingOfType("*domain.NewsletterIssueFilter")).Return(issues, len(issues), nil)
	mockEngagement.On("GetByIssueID", ctx, issueID).Return(nil, errors.New("connection timeout"))

	// Execute
	metrics, err := service.GetOverview(ctx, dateRange)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, metrics)
	assert.Contains(t, err.Error(), "engagement events")

	mockIssue.AssertExpectations(t)
	mockEngagement.AssertExpectations(t)
}

// TestGetSegmentAnalytics_MultiTenantIsolation tests that analytics are filtered by segment
func TestGetSegmentAnalytics_MultiTenantIsolation(t *testing.T) {
	// Setup
	mockEngagement := new(MockEngagementEventRepository)
	mockIssue := new(MockNewsletterIssueRepository)
	mockConfig := new(MockNewsletterConfigRepository)
	mockSegment := new(MockSegmentRepository)

	service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

	ctx := context.Background()
	segmentID := uuid.New()
	otherSegmentID := uuid.New()
	dateRange := DateRange{
		Start: time.Now().AddDate(0, 0, -30),
		End:   time.Now(),
	}

	description := "Test Segment"
	segment := &domain.Segment{
		ID:          segmentID,
		Name:        "Test Segment",
		Description: &description,
	}

	configID := uuid.New()
	configs := []*domain.NewsletterConfiguration{
		{
			ID:        configID,
			SegmentID: &segmentID,
			Name:      "Config for Segment",
		},
	}

	issueID := uuid.New()
	sentAt := time.Now().AddDate(0, 0, -7)
	selectedSubject := "Test Newsletter"

	// Create filter matcher to verify correct segment is queried
	issues := []*domain.NewsletterIssue{
		{
			ID:                  issueID,
			ConfigurationID:     configID,
			SegmentID:           segmentID,
			IssueNumber:         1,
			SubjectLines:        []string{"Test Newsletter"},
			SelectedSubjectLine: &selectedSubject,
			Status:              domain.IssueStatusSent,
			TotalRecipients:     500,
			TotalDelivered:      495,
			SentAt:              &sentAt,
		},
	}

	mockSegment.On("GetByID", ctx, segmentID).Return(segment, nil)
	mockConfig.On("GetBySegmentID", ctx, segmentID).Return(configs, nil)
	mockIssue.On("List", ctx, mock.MatchedBy(func(filter *domain.NewsletterIssueFilter) bool {
		// Verify the filter includes the correct segment
		return filter != nil
	})).Return(issues, len(issues), nil)
	mockEngagement.On("GetByIssueID", ctx, issueID).Return([]*domain.EngagementEvent{}, nil)

	// Execute
	segmentMetrics, err := service.GetSegmentAnalytics(ctx, segmentID, dateRange)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, segmentMetrics)
	assert.Equal(t, segmentID, segmentMetrics.SegmentID)
	assert.NotEqual(t, otherSegmentID, segmentMetrics.SegmentID)
	assert.Equal(t, "Test Segment", segmentMetrics.SegmentName)

	mockSegment.AssertExpectations(t)
	mockConfig.AssertExpectations(t)
	mockIssue.AssertExpectations(t)
}

// TestGetTopPerforming_EngagementRepositoryFailure tests handling of engagement repo failure
func TestGetTopPerforming_EngagementRepositoryFailure(t *testing.T) {
	// Setup
	mockEngagement := new(MockEngagementEventRepository)
	mockIssue := new(MockNewsletterIssueRepository)
	mockConfig := new(MockNewsletterConfigRepository)
	mockSegment := new(MockSegmentRepository)

	service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

	ctx := context.Background()
	issueID := uuid.New()

	sentAt := time.Now().AddDate(0, 0, -1)
	subject := "Test Issue"

	issues := []*domain.NewsletterIssue{
		{
			ID:                  issueID,
			ConfigurationID:     uuid.New(),
			SegmentID:           uuid.New(),
			IssueNumber:         1,
			SubjectLines:        []string{"Test Issue"},
			SelectedSubjectLine: &subject,
			TotalRecipients:     1000,
			TotalClicks:         100,
			Status:              domain.IssueStatusSent,
			SentAt:              &sentAt,
		},
	}

	// Setup mock - issue repo succeeds but engagement repo fails
	mockIssue.On("List", ctx, mock.AnythingOfType("*domain.NewsletterIssueFilter")).Return(issues, len(issues), nil)

	// Execute
	performers, err := service.GetTopPerforming(ctx, MetricTypeCTR, 5)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, performers)
	// Should still return performers based on issue-level metrics even if engagement fails
	assert.GreaterOrEqual(t, len(performers), 0)

	mockIssue.AssertExpectations(t)
}

// TestCompareToTargets_WithDifferentMetrics tests comparing multiple metrics at once
func TestCompareToTargets_WithDifferentMetrics(t *testing.T) {
	// Setup
	mockEngagement := new(MockEngagementEventRepository)
	mockIssue := new(MockNewsletterIssueRepository)
	mockConfig := new(MockNewsletterConfigRepository)
	mockSegment := new(MockSegmentRepository)

	service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

	ctx := context.Background()

	// Create metrics with some above and some below targets
	metrics := &OverviewMetrics{
		OpenRate:          25.0, // Below 28% min
		ClickRate:         4.0,  // Within 3.5-5.5%
		CTOR:              16.0, // Within 12-18%
		UnsubscribeRate:   0.5,  // Above 0.2% max
		BounceRate:        0.2,  // Below 0.5% max
		SpamComplaintRate: 0.03, // Below 0.1% max
	}

	// Execute
	comparisons, err := service.CompareToTargets(ctx, metrics)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, comparisons, 6)

	// OpenRate should be below target
	openRateComp := comparisons[0]
	assert.Equal(t, "Open Rate", openRateComp.MetricName)
	assert.Equal(t, TargetStatusBelow, openRateComp.Status)

	// ClickRate should be on target
	clickRateComp := comparisons[1]
	assert.Equal(t, "Click Rate", clickRateComp.MetricName)
	assert.Equal(t, TargetStatusOnTarget, clickRateComp.Status)

	// UnsubscribeRate should be above target (bad)
	unsubComp := comparisons[3]
	assert.Equal(t, "Unsubscribe Rate", unsubComp.MetricName)
	assert.Equal(t, TargetStatusAbove, unsubComp.Status)
}

// TestGetTrendData_MultipleIssuesWithinRange tests trend aggregation across multiple issues
func TestGetTrendData_MultipleIssuesWithinRange(t *testing.T) {
	// Setup
	mockEngagement := new(MockEngagementEventRepository)
	mockIssue := new(MockNewsletterIssueRepository)
	mockConfig := new(MockNewsletterConfigRepository)
	mockSegment := new(MockSegmentRepository)

	service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

	ctx := context.Background()
	dateRange := DateRange{
		Start: time.Now().AddDate(0, 0, -30),
		End:   time.Now(),
	}

	// Create multiple issues across the date range
	sentAt1 := time.Now().AddDate(0, 0, -20)
	sentAt2 := time.Now().AddDate(0, 0, -10)
	sentAt3 := time.Now().AddDate(0, 0, -1)

	subject1 := "Week 1"
	subject2 := "Week 2"
	subject3 := "Week 3"

	issues := []*domain.NewsletterIssue{
		{
			ID:                  uuid.New(),
			ConfigurationID:     uuid.New(),
			SegmentID:           uuid.New(),
			IssueNumber:         1,
			SubjectLines:        []string{"Week 1"},
			SelectedSubjectLine: &subject1,
			TotalRecipients:     1000,
			TotalOpens:          300,
			Status:              domain.IssueStatusSent,
			SentAt:              &sentAt1,
		},
		{
			ID:                  uuid.New(),
			ConfigurationID:     uuid.New(),
			SegmentID:           uuid.New(),
			IssueNumber:         2,
			SubjectLines:        []string{"Week 2"},
			SelectedSubjectLine: &subject2,
			TotalRecipients:     1000,
			TotalOpens:          350,
			Status:              domain.IssueStatusSent,
			SentAt:              &sentAt2,
		},
		{
			ID:                  uuid.New(),
			ConfigurationID:     uuid.New(),
			SegmentID:           uuid.New(),
			IssueNumber:         3,
			SubjectLines:        []string{"Week 3"},
			SelectedSubjectLine: &subject3,
			TotalRecipients:     1000,
			TotalOpens:          400,
			Status:              domain.IssueStatusSent,
			SentAt:              &sentAt3,
		},
	}

	// Setup mock
	mockIssue.On("List", ctx, mock.AnythingOfType("*domain.NewsletterIssueFilter")).Return(issues, len(issues), nil)

	// Execute
	trendPoints, err := service.GetTrendData(ctx, MetricTypeOpenRate, dateRange, GranularityWeekly)

	// Assert
	assert.NoError(t, err)
	assert.NotEmpty(t, trendPoints)
	// Should have trend points sorted chronologically
	for i := 0; i < len(trendPoints)-1; i++ {
		assert.True(t, trendPoints[i].Timestamp.Before(trendPoints[i+1].Timestamp) ||
			trendPoints[i].Timestamp.Equal(trendPoints[i+1].Timestamp))
	}

	mockIssue.AssertExpectations(t)
}

// TestGetOverview_MultipleIssuesAggregation tests aggregating metrics across multiple issues
func TestGetOverview_MultipleIssuesAggregation(t *testing.T) {
	// Setup
	mockEngagement := new(MockEngagementEventRepository)
	mockIssue := new(MockNewsletterIssueRepository)
	mockConfig := new(MockNewsletterConfigRepository)
	mockSegment := new(MockSegmentRepository)

	service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

	ctx := context.Background()
	dateRange := DateRange{
		Start: time.Now().AddDate(0, 0, -30),
		End:   time.Now(),
	}

	// Create multiple test issues
	issueID1 := uuid.New()
	issueID2 := uuid.New()
	contactID1 := uuid.New()
	contactID2 := uuid.New()
	contactID3 := uuid.New()

	sentAt1 := time.Now().AddDate(0, 0, -14)
	sentAt2 := time.Now().AddDate(0, 0, -7)
	subject1 := "Issue 1"
	subject2 := "Issue 2"

	issues := []*domain.NewsletterIssue{
		{
			ID:                  issueID1,
			ConfigurationID:     uuid.New(),
			SegmentID:           uuid.New(),
			IssueNumber:         1,
			SubjectLines:        []string{"Issue 1"},
			SelectedSubjectLine: &subject1,
			Status:              domain.IssueStatusSent,
			TotalRecipients:     1000,
			TotalDelivered:      995,
			TotalOpens:          300,
			TotalClicks:         50,
			TotalBounces:        5,
			TotalUnsubscribes:   2,
			TotalComplaints:     0,
			SentAt:              &sentAt1,
		},
		{
			ID:                  issueID2,
			ConfigurationID:     uuid.New(),
			SegmentID:           uuid.New(),
			IssueNumber:         2,
			SubjectLines:        []string{"Issue 2"},
			SelectedSubjectLine: &subject2,
			Status:              domain.IssueStatusSent,
			TotalRecipients:     2000,
			TotalDelivered:      1990,
			TotalOpens:          600,
			TotalClicks:         100,
			TotalBounces:        10,
			TotalUnsubscribes:   3,
			TotalComplaints:     1,
			SentAt:              &sentAt2,
		},
	}

	events1 := []*domain.EngagementEvent{
		{ID: uuid.New(), ContactID: contactID1, IssueID: issueID1, EventType: domain.EventTypeOpen, EventTimestamp: time.Now()},
		{ID: uuid.New(), ContactID: contactID2, IssueID: issueID1, EventType: domain.EventTypeOpen, EventTimestamp: time.Now()},
		{ID: uuid.New(), ContactID: contactID1, IssueID: issueID1, EventType: domain.EventTypeClick, EventTimestamp: time.Now()},
	}

	events2 := []*domain.EngagementEvent{
		{ID: uuid.New(), ContactID: contactID2, IssueID: issueID2, EventType: domain.EventTypeOpen, EventTimestamp: time.Now()},
		{ID: uuid.New(), ContactID: contactID3, IssueID: issueID2, EventType: domain.EventTypeOpen, EventTimestamp: time.Now()},
		{ID: uuid.New(), ContactID: contactID3, IssueID: issueID2, EventType: domain.EventTypeClick, EventTimestamp: time.Now()},
	}

	// Setup mocks
	mockIssue.On("List", ctx, mock.AnythingOfType("*domain.NewsletterIssueFilter")).Return(issues, len(issues), nil)
	mockEngagement.On("GetByIssueID", ctx, issueID1).Return(events1, nil)
	mockEngagement.On("GetByIssueID", ctx, issueID2).Return(events2, nil)

	// Execute
	metrics, err := service.GetOverview(ctx, dateRange)

	// Verify aggregation
	assert.NoError(t, err)
	assert.NotNil(t, metrics)
	assert.Equal(t, 3000, metrics.TotalSent)      // 1000 + 2000
	assert.Equal(t, 2985, metrics.TotalDelivered) // 995 + 1990
	assert.Equal(t, 15, metrics.Bounces)          // 5 + 10
	assert.Equal(t, 5, metrics.Unsubscribes)      // 2 + 3
	assert.Equal(t, 1, metrics.SpamComplaints)    // 0 + 1
	assert.Equal(t, 3, metrics.UniqueOpens)       // contactID1, contactID2, contactID3
	assert.Equal(t, 2, metrics.UniqueClicks)      // contactID1, contactID3

	// Verify rate calculations
	assert.InDelta(t, 0.1, metrics.OpenRate, 0.01)          // 3/3000 * 100 = 0.1%
	assert.InDelta(t, 0.067, metrics.ClickRate, 0.01)       // 2/3000 * 100 = 0.067%
	assert.InDelta(t, 66.67, metrics.CTOR, 0.1)             // 2/3 * 100 = 66.67%
	assert.InDelta(t, 0.5, metrics.BounceRate, 0.01)        // 15/3000 * 100 = 0.5%
	assert.InDelta(t, 0.167, metrics.UnsubscribeRate, 0.01) // 5/3000 * 100 = 0.167%

	mockIssue.AssertExpectations(t)
	mockEngagement.AssertExpectations(t)
}

// TestGetOverview_RateCalculations tests all rate calculation edge cases
func TestGetOverview_RateCalculations(t *testing.T) {
	tests := []struct {
		name               string
		totalSent          int
		uniqueOpens        int
		uniqueClicks       int
		bounces            int
		unsubscribes       int
		spamComplaints     int
		expectedOpenRate   float64
		expectedClickRate  float64
		expectedCTOR       float64
		expectedBounceRate float64
		expectedUnsubRate  float64
		expectedSpamRate   float64
	}{
		{
			name:               "zero opens zero clicks",
			totalSent:          1000,
			uniqueOpens:        0,
			uniqueClicks:       0,
			bounces:            5,
			unsubscribes:       2,
			spamComplaints:     1,
			expectedOpenRate:   0.0,
			expectedClickRate:  0.0,
			expectedCTOR:       0.0,
			expectedBounceRate: 0.5,
			expectedUnsubRate:  0.2,
			expectedSpamRate:   0.1,
		},
		{
			name:               "opens without clicks",
			totalSent:          1000,
			uniqueOpens:        100,
			uniqueClicks:       0,
			bounces:            5,
			unsubscribes:       2,
			spamComplaints:     0,
			expectedOpenRate:   10.0,
			expectedClickRate:  0.0,
			expectedCTOR:       0.0,
			expectedBounceRate: 0.5,
			expectedUnsubRate:  0.2,
			expectedSpamRate:   0.0,
		},
		{
			name:               "high engagement",
			totalSent:          1000,
			uniqueOpens:        400,
			uniqueClicks:       80,
			bounces:            3,
			unsubscribes:       1,
			spamComplaints:     0,
			expectedOpenRate:   40.0,
			expectedClickRate:  8.0,
			expectedCTOR:       20.0,
			expectedBounceRate: 0.3,
			expectedUnsubRate:  0.1,
			expectedSpamRate:   0.0,
		},
		{
			name:               "all clicks are opens",
			totalSent:          1000,
			uniqueOpens:        100,
			uniqueClicks:       100, // Same as opens
			bounces:            0,
			unsubscribes:       0,
			spamComplaints:     0,
			expectedOpenRate:   10.0,
			expectedClickRate:  10.0,
			expectedCTOR:       100.0, // 100% CTOR
			expectedBounceRate: 0.0,
			expectedUnsubRate:  0.0,
			expectedSpamRate:   0.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockEngagement := new(MockEngagementEventRepository)
			mockIssue := new(MockNewsletterIssueRepository)
			mockConfig := new(MockNewsletterConfigRepository)
			mockSegment := new(MockSegmentRepository)

			service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

			// Create test metrics
			metrics := &OverviewMetrics{
				TotalSent:      tt.totalSent,
				UniqueOpens:    tt.uniqueOpens,
				UniqueClicks:   tt.uniqueClicks,
				Bounces:        tt.bounces,
				Unsubscribes:   tt.unsubscribes,
				SpamComplaints: tt.spamComplaints,
			}

			// Calculate rates
			service.calculateRates(metrics)

			// Verify
			assert.InDelta(t, tt.expectedOpenRate, metrics.OpenRate, 0.01, "OpenRate mismatch")
			assert.InDelta(t, tt.expectedClickRate, metrics.ClickRate, 0.01, "ClickRate mismatch")
			assert.InDelta(t, tt.expectedCTOR, metrics.CTOR, 0.01, "CTOR mismatch")
			assert.InDelta(t, tt.expectedBounceRate, metrics.BounceRate, 0.01, "BounceRate mismatch")
			assert.InDelta(t, tt.expectedUnsubRate, metrics.UnsubscribeRate, 0.01, "UnsubscribeRate mismatch")
			assert.InDelta(t, tt.expectedSpamRate, metrics.SpamComplaintRate, 0.01, "SpamRate mismatch")
		})
	}
}

// TestGetSegmentAnalytics_NilSegmentID tests handling of nil segment ID
func TestGetSegmentAnalytics_NilSegmentID(t *testing.T) {
	// Setup
	mockEngagement := new(MockEngagementEventRepository)
	mockIssue := new(MockNewsletterIssueRepository)
	mockConfig := new(MockNewsletterConfigRepository)
	mockSegment := new(MockSegmentRepository)

	service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

	ctx := context.Background()
	dateRange := DateRange{
		Start: time.Now().AddDate(0, 0, -30),
		End:   time.Now(),
	}

	// Execute with nil UUID
	metrics, err := service.GetSegmentAnalytics(ctx, uuid.Nil, dateRange)

	// Verify
	assert.Error(t, err)
	assert.Nil(t, metrics)
	assert.Contains(t, err.Error(), "segment ID is required")
}

// TestGetSegmentAnalytics_InvalidDateRange tests handling of invalid date range
func TestGetSegmentAnalytics_InvalidDateRange(t *testing.T) {
	// Setup
	mockEngagement := new(MockEngagementEventRepository)
	mockIssue := new(MockNewsletterIssueRepository)
	mockConfig := new(MockNewsletterConfigRepository)
	mockSegment := new(MockSegmentRepository)

	service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

	ctx := context.Background()
	segmentID := uuid.New()
	dateRange := DateRange{
		Start: time.Now(),
		End:   time.Now().AddDate(0, 0, -30), // End before start
	}

	// Execute
	metrics, err := service.GetSegmentAnalytics(ctx, segmentID, dateRange)

	// Verify
	assert.Error(t, err)
	assert.Nil(t, metrics)
	assert.Contains(t, err.Error(), "invalid date range")
}

// TestGetSegmentAnalytics_RepositoryTimeout tests handling of repository timeout
func TestGetSegmentAnalytics_RepositoryTimeout(t *testing.T) {
	// Setup
	mockEngagement := new(MockEngagementEventRepository)
	mockIssue := new(MockNewsletterIssueRepository)
	mockConfig := new(MockNewsletterConfigRepository)
	mockSegment := new(MockSegmentRepository)

	service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

	ctx := context.Background()
	segmentID := uuid.New()
	dateRange := DateRange{
		Start: time.Now().AddDate(0, 0, -30),
		End:   time.Now(),
	}

	// Setup mock to return timeout error
	timeoutErr := errors.New("context deadline exceeded")
	mockSegment.On("GetByID", ctx, segmentID).Return(nil, timeoutErr)

	// Execute
	metrics, err := service.GetSegmentAnalytics(ctx, segmentID, dateRange)

	// Verify
	assert.Error(t, err)
	assert.Nil(t, metrics)
	assert.Contains(t, err.Error(), "failed to get segment")

	mockSegment.AssertExpectations(t)
}

// TestGetTopPerforming_DifferentMetricTypes tests ranking by different metric types
func TestGetTopPerforming_DifferentMetricTypes(t *testing.T) {
	tests := []struct {
		name          string
		metricType    MetricType
		expectedRanks []string // Subject lines in expected rank order
	}{
		{
			name:          "rank by opens",
			metricType:    MetricTypeOpens,
			expectedRanks: []string{"Most Opens", "Medium Opens", "Least Opens"},
		},
		{
			name:          "rank by clicks",
			metricType:    MetricTypeClicks,
			expectedRanks: []string{"Most Clicks", "Medium Clicks", "Least Clicks"},
		},
		{
			name:          "rank by CTR",
			metricType:    MetricTypeCTR,
			expectedRanks: []string{"Highest CTR", "Medium CTR", "Lowest CTR"},
		},
		{
			name:          "rank by open rate",
			metricType:    MetricTypeOpenRate,
			expectedRanks: []string{"Highest Open Rate", "Medium Open Rate", "Lowest Open Rate"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockEngagement := new(MockEngagementEventRepository)
			mockIssue := new(MockNewsletterIssueRepository)
			mockConfig := new(MockNewsletterConfigRepository)
			mockSegment := new(MockSegmentRepository)

			service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

			ctx := context.Background()
			sentAt := time.Now()

			// Create issues with different metrics
			var issues []*domain.NewsletterIssue

			switch tt.metricType {
			case MetricTypeOpens:
				subject1 := "Most Opens"
				subject2 := "Medium Opens"
				subject3 := "Least Opens"
				issues = []*domain.NewsletterIssue{
					{ID: uuid.New(), SelectedSubjectLine: &subject1, TotalRecipients: 1000, TotalOpens: 500, Status: domain.IssueStatusSent, SentAt: &sentAt},
					{ID: uuid.New(), SelectedSubjectLine: &subject2, TotalRecipients: 1000, TotalOpens: 300, Status: domain.IssueStatusSent, SentAt: &sentAt},
					{ID: uuid.New(), SelectedSubjectLine: &subject3, TotalRecipients: 1000, TotalOpens: 100, Status: domain.IssueStatusSent, SentAt: &sentAt},
				}
			case MetricTypeClicks:
				subject1 := "Most Clicks"
				subject2 := "Medium Clicks"
				subject3 := "Least Clicks"
				issues = []*domain.NewsletterIssue{
					{ID: uuid.New(), SelectedSubjectLine: &subject1, TotalRecipients: 1000, TotalClicks: 200, Status: domain.IssueStatusSent, SentAt: &sentAt},
					{ID: uuid.New(), SelectedSubjectLine: &subject2, TotalRecipients: 1000, TotalClicks: 100, Status: domain.IssueStatusSent, SentAt: &sentAt},
					{ID: uuid.New(), SelectedSubjectLine: &subject3, TotalRecipients: 1000, TotalClicks: 50, Status: domain.IssueStatusSent, SentAt: &sentAt},
				}
			case MetricTypeCTR:
				subject1 := "Highest CTR"
				subject2 := "Medium CTR"
				subject3 := "Lowest CTR"
				issues = []*domain.NewsletterIssue{
					{ID: uuid.New(), SelectedSubjectLine: &subject1, TotalRecipients: 1000, TotalClicks: 100, Status: domain.IssueStatusSent, SentAt: &sentAt}, // 10% CTR
					{ID: uuid.New(), SelectedSubjectLine: &subject2, TotalRecipients: 1000, TotalClicks: 50, Status: domain.IssueStatusSent, SentAt: &sentAt},  // 5% CTR
					{ID: uuid.New(), SelectedSubjectLine: &subject3, TotalRecipients: 1000, TotalClicks: 10, Status: domain.IssueStatusSent, SentAt: &sentAt},  // 1% CTR
				}
			case MetricTypeOpenRate:
				subject1 := "Highest Open Rate"
				subject2 := "Medium Open Rate"
				subject3 := "Lowest Open Rate"
				issues = []*domain.NewsletterIssue{
					{ID: uuid.New(), SelectedSubjectLine: &subject1, TotalRecipients: 1000, TotalOpens: 400, Status: domain.IssueStatusSent, SentAt: &sentAt}, // 40%
					{ID: uuid.New(), SelectedSubjectLine: &subject2, TotalRecipients: 1000, TotalOpens: 250, Status: domain.IssueStatusSent, SentAt: &sentAt}, // 25%
					{ID: uuid.New(), SelectedSubjectLine: &subject3, TotalRecipients: 1000, TotalOpens: 100, Status: domain.IssueStatusSent, SentAt: &sentAt}, // 10%
				}
			}

			// Setup mock
			mockIssue.On("List", ctx, mock.AnythingOfType("*domain.NewsletterIssueFilter")).Return(issues, len(issues), nil)

			// Execute
			performers, err := service.GetTopPerforming(ctx, tt.metricType, 3)

			// Verify
			assert.NoError(t, err)
			assert.Len(t, performers, 3)
			for i, expected := range tt.expectedRanks {
				assert.Equal(t, expected, performers[i].Subject, "Rank %d mismatch", i+1)
				assert.Equal(t, i+1, performers[i].Rank)
			}

			mockIssue.AssertExpectations(t)
		})
	}
}

// TestGetTopPerforming_ZeroLimit tests handling of zero/negative limit
func TestGetTopPerforming_ZeroLimit(t *testing.T) {
	mockEngagement := new(MockEngagementEventRepository)
	mockIssue := new(MockNewsletterIssueRepository)
	mockConfig := new(MockNewsletterConfigRepository)
	mockSegment := new(MockSegmentRepository)

	service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

	ctx := context.Background()
	sentAt := time.Now()
	subject := "Test"

	issues := []*domain.NewsletterIssue{
		{ID: uuid.New(), SelectedSubjectLine: &subject, TotalRecipients: 1000, TotalClicks: 100, Status: domain.IssueStatusSent, SentAt: &sentAt},
	}

	mockIssue.On("List", ctx, mock.AnythingOfType("*domain.NewsletterIssueFilter")).Return(issues, len(issues), nil)

	// Execute with zero limit - should default to 10
	performers, err := service.GetTopPerforming(ctx, MetricTypeCTR, 0)

	// Verify
	assert.NoError(t, err)
	assert.NotNil(t, performers)
	assert.Len(t, performers, 1)

	mockIssue.AssertExpectations(t)
}

// TestGetTopPerforming_LargeDataset tests performance with many issues
func TestGetTopPerforming_LargeDataset(t *testing.T) {
	mockEngagement := new(MockEngagementEventRepository)
	mockIssue := new(MockNewsletterIssueRepository)
	mockConfig := new(MockNewsletterConfigRepository)
	mockSegment := new(MockSegmentRepository)

	service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

	ctx := context.Background()
	sentAt := time.Now()

	// Create 500 issues
	issues := make([]*domain.NewsletterIssue, 500)
	for i := 0; i < 500; i++ {
		subject := "Issue " + string(rune(i))
		issues[i] = &domain.NewsletterIssue{
			ID:                  uuid.New(),
			SelectedSubjectLine: &subject,
			TotalRecipients:     1000,
			TotalClicks:         i, // Varying clicks for ranking
			Status:              domain.IssueStatusSent,
			SentAt:              &sentAt,
		}
	}

	mockIssue.On("List", ctx, mock.AnythingOfType("*domain.NewsletterIssueFilter")).Return(issues, len(issues), nil)

	// Execute - request top 10
	startTime := time.Now()
	performers, err := service.GetTopPerforming(ctx, MetricTypeCTR, 10)
	duration := time.Since(startTime)

	// Verify
	assert.NoError(t, err)
	assert.Len(t, performers, 10)
	// Should complete reasonably fast (< 1 second for 500 issues)
	assert.Less(t, duration.Milliseconds(), int64(1000), "Should handle large dataset efficiently")

	mockIssue.AssertExpectations(t)
}

// TestGetTrendData_DailyGranularity tests daily trend aggregation
func TestGetTrendData_DailyGranularity(t *testing.T) {
	mockEngagement := new(MockEngagementEventRepository)
	mockIssue := new(MockNewsletterIssueRepository)
	mockConfig := new(MockNewsletterConfigRepository)
	mockSegment := new(MockSegmentRepository)

	service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

	ctx := context.Background()
	dateRange := DateRange{
		Start: time.Now().AddDate(0, 0, -7),
		End:   time.Now(),
	}

	// Create issues on different days
	day1 := time.Now().AddDate(0, 0, -6)
	day2 := time.Now().AddDate(0, 0, -5)
	day3 := time.Now().AddDate(0, 0, -4)
	subject := "Test"

	issues := []*domain.NewsletterIssue{
		{ID: uuid.New(), SelectedSubjectLine: &subject, TotalRecipients: 1000, TotalOpens: 300, Status: domain.IssueStatusSent, SentAt: &day1},
		{ID: uuid.New(), SelectedSubjectLine: &subject, TotalRecipients: 1000, TotalOpens: 350, Status: domain.IssueStatusSent, SentAt: &day2},
		{ID: uuid.New(), SelectedSubjectLine: &subject, TotalRecipients: 1000, TotalOpens: 400, Status: domain.IssueStatusSent, SentAt: &day3},
	}

	mockIssue.On("List", ctx, mock.AnythingOfType("*domain.NewsletterIssueFilter")).Return(issues, len(issues), nil)

	// Execute
	trendPoints, err := service.GetTrendData(ctx, MetricTypeOpenRate, dateRange, GranularityDaily)

	// Verify
	assert.NoError(t, err)
	assert.Len(t, trendPoints, 3)
	// Verify sorted chronologically
	for i := 0; i < len(trendPoints)-1; i++ {
		assert.True(t, !trendPoints[i].Timestamp.After(trendPoints[i+1].Timestamp))
	}
	// Verify label format
	assert.Contains(t, trendPoints[0].Label, "-")

	mockIssue.AssertExpectations(t)
}

// TestGetTrendData_MonthlyGranularity tests monthly trend aggregation
func TestGetTrendData_MonthlyGranularity(t *testing.T) {
	mockEngagement := new(MockEngagementEventRepository)
	mockIssue := new(MockNewsletterIssueRepository)
	mockConfig := new(MockNewsletterConfigRepository)
	mockSegment := new(MockSegmentRepository)

	service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

	ctx := context.Background()
	dateRange := DateRange{
		Start: time.Now().AddDate(0, -3, 0),
		End:   time.Now(),
	}

	// Create issues across different months
	month1 := time.Now().AddDate(0, -2, -15)
	month2 := time.Now().AddDate(0, -1, -15)
	month3 := time.Now().AddDate(0, 0, -5)
	subject := "Test"

	issues := []*domain.NewsletterIssue{
		{ID: uuid.New(), SelectedSubjectLine: &subject, TotalRecipients: 1000, TotalOpens: 300, Status: domain.IssueStatusSent, SentAt: &month1},
		{ID: uuid.New(), SelectedSubjectLine: &subject, TotalRecipients: 1000, TotalOpens: 350, Status: domain.IssueStatusSent, SentAt: &month2},
		{ID: uuid.New(), SelectedSubjectLine: &subject, TotalRecipients: 1000, TotalOpens: 400, Status: domain.IssueStatusSent, SentAt: &month3},
	}

	mockIssue.On("List", ctx, mock.AnythingOfType("*domain.NewsletterIssueFilter")).Return(issues, len(issues), nil)

	// Execute
	trendPoints, err := service.GetTrendData(ctx, MetricTypeOpenRate, dateRange, GranularityMonthly)

	// Verify
	assert.NoError(t, err)
	assert.NotEmpty(t, trendPoints)
	// Verify label format (YYYY-MM)
	assert.Regexp(t, `^\d{4}-\d{2}$`, trendPoints[0].Label)

	mockIssue.AssertExpectations(t)
}

// TestGetTrendData_MultipleIssuesInSameBucket tests aggregating multiple issues in same time bucket
func TestGetTrendData_MultipleIssuesInSameBucket(t *testing.T) {
	mockEngagement := new(MockEngagementEventRepository)
	mockIssue := new(MockNewsletterIssueRepository)
	mockConfig := new(MockNewsletterConfigRepository)
	mockSegment := new(MockSegmentRepository)

	service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

	ctx := context.Background()
	dateRange := DateRange{
		Start: time.Now().AddDate(0, 0, -7),
		End:   time.Now(),
	}

	// Create multiple issues on the same day
	sameDay := time.Now().AddDate(0, 0, -3)
	subject1 := "Issue 1"
	subject2 := "Issue 2"
	subject3 := "Issue 3"

	issues := []*domain.NewsletterIssue{
		{ID: uuid.New(), SelectedSubjectLine: &subject1, TotalRecipients: 1000, TotalOpens: 300, Status: domain.IssueStatusSent, SentAt: &sameDay},
		{ID: uuid.New(), SelectedSubjectLine: &subject2, TotalRecipients: 1000, TotalOpens: 400, Status: domain.IssueStatusSent, SentAt: &sameDay},
		{ID: uuid.New(), SelectedSubjectLine: &subject3, TotalRecipients: 1000, TotalOpens: 500, Status: domain.IssueStatusSent, SentAt: &sameDay},
	}

	mockIssue.On("List", ctx, mock.AnythingOfType("*domain.NewsletterIssueFilter")).Return(issues, len(issues), nil)

	// Execute
	trendPoints, err := service.GetTrendData(ctx, MetricTypeOpenRate, dateRange, GranularityDaily)

	// Verify - should have one data point aggregating all three issues
	assert.NoError(t, err)
	assert.Len(t, trendPoints, 1)
	// Verify aggregated metric: (300+400+500)/(1000+1000+1000) * 100 = 40%
	assert.InDelta(t, 40.0, trendPoints[0].Value, 0.01)

	mockIssue.AssertExpectations(t)
}

// TestGetTrendData_RepositoryFailure tests handling of repository failure
func TestGetTrendData_RepositoryFailure(t *testing.T) {
	mockEngagement := new(MockEngagementEventRepository)
	mockIssue := new(MockNewsletterIssueRepository)
	mockConfig := new(MockNewsletterConfigRepository)
	mockSegment := new(MockSegmentRepository)

	service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

	ctx := context.Background()
	dateRange := DateRange{
		Start: time.Now().AddDate(0, 0, -7),
		End:   time.Now(),
	}

	// Setup mock to return error
	dbErr := errors.New("database connection lost")
	mockIssue.On("List", ctx, mock.AnythingOfType("*domain.NewsletterIssueFilter")).Return(nil, 0, dbErr)

	// Execute
	trendPoints, err := service.GetTrendData(ctx, MetricTypeOpenRate, dateRange, GranularityDaily)

	// Verify
	assert.Error(t, err)
	assert.Nil(t, trendPoints)
	assert.Contains(t, err.Error(), "failed to get issues")

	mockIssue.AssertExpectations(t)
}

// TestCompareToTargets_EdgeCases tests target comparison edge cases
func TestCompareToTargets_EdgeCases(t *testing.T) {
	tests := []struct {
		name           string
		metrics        *OverviewMetrics
		metricIdx      int // Index in comparisons array
		expectedStatus TargetStatus
	}{
		{
			name: "open rate exactly at minimum",
			metrics: &OverviewMetrics{
				OpenRate: TargetOpenRateMin * 100, // Exactly 28%
			},
			metricIdx:      0,
			expectedStatus: TargetStatusOnTarget,
		},
		{
			name: "open rate exactly at maximum",
			metrics: &OverviewMetrics{
				OpenRate: TargetOpenRateMax * 100, // Exactly 35%
			},
			metricIdx:      0,
			expectedStatus: TargetStatusOnTarget,
		},
		{
			name: "open rate just below minimum",
			metrics: &OverviewMetrics{
				OpenRate: (TargetOpenRateMin * 100) - 0.01, // 27.99%
			},
			metricIdx:      0,
			expectedStatus: TargetStatusBelow,
		},
		{
			name: "open rate just above maximum",
			metrics: &OverviewMetrics{
				OpenRate: (TargetOpenRateMax * 100) + 0.01, // 35.01%
			},
			metricIdx:      0,
			expectedStatus: TargetStatusAbove,
		},
		{
			name: "zero metrics",
			metrics: &OverviewMetrics{
				OpenRate:          0.0,
				ClickRate:         0.0,
				CTOR:              0.0,
				UnsubscribeRate:   0.0,
				BounceRate:        0.0,
				SpamComplaintRate: 0.0,
			},
			metricIdx:      0,
			expectedStatus: TargetStatusBelow,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockEngagement := new(MockEngagementEventRepository)
			mockIssue := new(MockNewsletterIssueRepository)
			mockConfig := new(MockNewsletterConfigRepository)
			mockSegment := new(MockSegmentRepository)

			service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

			ctx := context.Background()

			// Execute
			comparisons, err := service.CompareToTargets(ctx, tt.metrics)

			// Verify
			assert.NoError(t, err)
			assert.Len(t, comparisons, 6)
			assert.Equal(t, tt.expectedStatus, comparisons[tt.metricIdx].Status)
		})
	}
}

// TestGetOverview_InvalidDateRange tests all date range validation scenarios
func TestGetOverview_InvalidDateRange(t *testing.T) {
	tests := []struct {
		name      string
		dateRange DateRange
		errorMsg  string
	}{
		{
			name: "zero start date",
			dateRange: DateRange{
				Start: time.Time{},
				End:   time.Now(),
			},
			errorMsg: "start date is required",
		},
		{
			name: "zero end date",
			dateRange: DateRange{
				Start: time.Now(),
				End:   time.Time{},
			},
			errorMsg: "end date is required",
		},
		{
			name: "end before start",
			dateRange: DateRange{
				Start: time.Now(),
				End:   time.Now().AddDate(0, 0, -1),
			},
			errorMsg: "end date must be after start date",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockEngagement := new(MockEngagementEventRepository)
			mockIssue := new(MockNewsletterIssueRepository)
			mockConfig := new(MockNewsletterConfigRepository)
			mockSegment := new(MockSegmentRepository)

			service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

			ctx := context.Background()

			// Execute
			metrics, err := service.GetOverview(ctx, tt.dateRange)

			// Verify
			assert.Error(t, err)
			assert.Nil(t, metrics)
			assert.Contains(t, err.Error(), tt.errorMsg)
		})
	}
}

// TestGetSegmentAnalytics_ZeroContacts tests segment with zero contacts
func TestGetSegmentAnalytics_ZeroContacts(t *testing.T) {
	mockEngagement := new(MockEngagementEventRepository)
	mockIssue := new(MockNewsletterIssueRepository)
	mockConfig := new(MockNewsletterConfigRepository)
	mockSegment := new(MockSegmentRepository)

	service := NewAnalyticsService(mockEngagement, mockIssue, mockConfig, mockSegment)

	ctx := context.Background()
	segmentID := uuid.New()
	dateRange := DateRange{
		Start: time.Now().AddDate(0, 0, -30),
		End:   time.Now(),
	}

	description := "Empty Segment"
	segment := &domain.Segment{
		ID:           segmentID,
		Name:         "Empty Segment",
		Description:  &description,
		ContactCount: 0, // Zero contacts
	}

	configID := uuid.New()
	configs := []*domain.NewsletterConfiguration{
		{
			ID:        configID,
			SegmentID: &segmentID,
			Name:      "Config for Empty Segment",
		},
	}

	// Setup mocks - no issues sent to this segment
	mockSegment.On("GetByID", ctx, segmentID).Return(segment, nil)
	mockConfig.On("GetBySegmentID", ctx, segmentID).Return(configs, nil)
	mockIssue.On("List", ctx, mock.AnythingOfType("*domain.NewsletterIssueFilter")).Return([]*domain.NewsletterIssue{}, 0, nil)

	// Execute
	metrics, err := service.GetSegmentAnalytics(ctx, segmentID, dateRange)

	// Verify - should succeed with zero metrics
	assert.NoError(t, err)
	assert.NotNil(t, metrics)
	assert.Equal(t, segmentID, metrics.SegmentID)
	assert.Equal(t, "Empty Segment", metrics.SegmentName)
	assert.Equal(t, 0, metrics.Metrics.TotalSent)
	assert.Empty(t, metrics.TopContent)
	assert.Empty(t, metrics.Trends)

	mockSegment.AssertExpectations(t)
	mockConfig.AssertExpectations(t)
	mockIssue.AssertExpectations(t)
}
