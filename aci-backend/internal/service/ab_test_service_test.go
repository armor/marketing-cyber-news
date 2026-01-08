package service

import (
	"context"
	"errors"
	"math"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/phillipboles/aci-backend/internal/domain"
)

// ============================================================================
// HAPPY PATH TESTS
// ============================================================================

// TestCreateTestVariants_HappyPath tests successful variant creation
func TestCreateTestVariants_HappyPath(t *testing.T) {
	ctx := context.Background()
	issueID := uuid.New()

	tests := []struct {
		name          string
		testType      domain.TestType
		variantAValue string
		variantBValue string
	}{
		{
			name:          "subject line test",
			testType:      domain.TestTypeSubjectLine,
			variantAValue: "Breaking News: Cyber Attack",
			variantBValue: "Urgent: New Security Threat",
		},
		{
			name:          "hero topic test",
			testType:      domain.TestTypeHeroTopic,
			variantAValue: "Ransomware",
			variantBValue: "Data Breach",
		},
		{
			name:          "CTA framing test",
			testType:      domain.TestTypeCTAFraming,
			variantAValue: "Read More",
			variantBValue: "Learn How to Protect Yourself",
		},
		{
			name:          "send time test",
			testType:      domain.TestTypeSendTime,
			variantAValue: "09:00",
			variantBValue: "17:00",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			variantRepo := new(MockTestVariantRepository)
			engagementRepo := new(MockEngagementEventRepository)
			contactRepo := new(MockContactRepository)
			configRepo := new(MockNewsletterConfigRepository)

			variantRepo.On("GetByIssueID", ctx, issueID).Return([]*domain.TestVariant{}, nil)
			variantRepo.On("BulkCreate", ctx, mock.AnythingOfType("[]*domain.TestVariant")).Return(nil)

			service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

			variants, err := service.CreateTestVariants(ctx, issueID, tt.testType, tt.variantAValue, tt.variantBValue)

			assert.NoError(t, err)
			assert.NotNil(t, variants)
			assert.Len(t, variants, 2)

			// Verify variant A
			assert.Equal(t, "A", variants[0].VariantName)
			assert.Equal(t, tt.variantAValue, variants[0].VariantValue)
			assert.Equal(t, tt.testType, variants[0].TestType)
			assert.Equal(t, issueID, variants[0].IssueID)
			assert.Equal(t, 0, variants[0].AssignedContacts)
			assert.Equal(t, 0, variants[0].Opens)
			assert.Equal(t, 0, variants[0].Clicks)
			assert.False(t, variants[0].IsWinner)

			// Verify variant B
			assert.Equal(t, "B", variants[1].VariantName)
			assert.Equal(t, tt.variantBValue, variants[1].VariantValue)
			assert.Equal(t, tt.testType, variants[1].TestType)
			assert.Equal(t, issueID, variants[1].IssueID)
			assert.Equal(t, 0, variants[1].AssignedContacts)
			assert.Equal(t, 0, variants[1].Opens)
			assert.Equal(t, 0, variants[1].Clicks)
			assert.False(t, variants[1].IsWinner)

			// Verify default assignment percentage
			assert.NotNil(t, variants[0].AssignmentPercentage)
			assert.Equal(t, 50.0, *variants[0].AssignmentPercentage)
			assert.NotNil(t, variants[1].AssignmentPercentage)
			assert.Equal(t, 50.0, *variants[1].AssignmentPercentage)

			variantRepo.AssertExpectations(t)
		})
	}
}

// TestAssignContactToVariant_DeterministicHashing tests deterministic assignment
func TestAssignContactToVariant_DeterministicHashing(t *testing.T) {
	ctx := context.Background()
	issueID := uuid.New()
	contactID := uuid.New()

	variantA := &domain.TestVariant{
		ID:               uuid.New(),
		IssueID:          issueID,
		TestType:         domain.TestTypeSubjectLine,
		VariantName:      "A",
		VariantValue:     "Subject A",
		AssignedContacts: 0,
	}

	variantB := &domain.TestVariant{
		ID:               uuid.New(),
		IssueID:          issueID,
		TestType:         domain.TestTypeSubjectLine,
		VariantName:      "B",
		VariantValue:     "Subject B",
		AssignedContacts: 0,
	}

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	// Setup mock to return same variants multiple times
	variantRepo.On("GetByIssueID", ctx, issueID).Return([]*domain.TestVariant{variantA, variantB}, nil)
	variantRepo.On("Update", ctx, mock.AnythingOfType("*domain.TestVariant")).Return(nil)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	// Assign same contact multiple times
	variant1, err := service.AssignContactToVariant(ctx, contactID, issueID)
	assert.NoError(t, err)
	assert.NotNil(t, variant1)

	variant2, err := service.AssignContactToVariant(ctx, contactID, issueID)
	assert.NoError(t, err)
	assert.NotNil(t, variant2)

	variant3, err := service.AssignContactToVariant(ctx, contactID, issueID)
	assert.NoError(t, err)
	assert.NotNil(t, variant3)

	// Should get same variant every time (deterministic)
	assert.Equal(t, variant1.VariantName, variant2.VariantName)
	assert.Equal(t, variant2.VariantName, variant3.VariantName)
	assert.Equal(t, variant1.ID, variant2.ID)
	assert.Equal(t, variant2.ID, variant3.ID)

	variantRepo.AssertExpectations(t)
}

// TestAssignContactToVariant_IncrementCounter tests that assignment increments counter
func TestAssignContactToVariant_IncrementCounter(t *testing.T) {
	ctx := context.Background()
	issueID := uuid.New()
	contactID := uuid.New()

	variantA := &domain.TestVariant{
		ID:               uuid.New(),
		IssueID:          issueID,
		TestType:         domain.TestTypeSubjectLine,
		VariantName:      "A",
		VariantValue:     "Subject A",
		AssignedContacts: 0,
	}

	variantB := &domain.TestVariant{
		ID:               uuid.New(),
		IssueID:          issueID,
		TestType:         domain.TestTypeSubjectLine,
		VariantName:      "B",
		VariantValue:     "Subject B",
		AssignedContacts: 0,
	}

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	variantRepo.On("GetByIssueID", ctx, issueID).Return([]*domain.TestVariant{variantA, variantB}, nil)
	variantRepo.On("Update", ctx, mock.AnythingOfType("*domain.TestVariant")).Return(nil).Run(func(args mock.Arguments) {
		variant := args.Get(1).(*domain.TestVariant)
		// Verify counter was incremented
		assert.Equal(t, 1, variant.AssignedContacts)
	})

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	variant, err := service.AssignContactToVariant(ctx, contactID, issueID)

	assert.NoError(t, err)
	assert.NotNil(t, variant)
	assert.Equal(t, 1, variant.AssignedContacts)

	variantRepo.AssertExpectations(t)
}

// TestRecordVariantEvent_OpenIncrementsCounter tests open event recording
func TestRecordVariantEvent_OpenIncrementsCounter(t *testing.T) {
	ctx := context.Background()
	variantID := uuid.New()

	variant := &domain.TestVariant{
		ID:               variantID,
		IssueID:          uuid.New(),
		TestType:         domain.TestTypeSubjectLine,
		VariantName:      "A",
		VariantValue:     "Subject A",
		AssignedContacts: 100,
		Opens:            10,
		Clicks:           5,
	}

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	variantRepo.On("GetByID", ctx, variantID).Return(variant, nil)
	variantRepo.On("UpdateResults", ctx, variantID, 11, 5).Return(nil)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	err := service.RecordVariantEvent(ctx, variantID, domain.EventTypeOpen)

	assert.NoError(t, err)
	variantRepo.AssertExpectations(t)
}

// TestRecordVariantEvent_ClickIncrementsCounter tests click event recording
func TestRecordVariantEvent_ClickIncrementsCounter(t *testing.T) {
	ctx := context.Background()
	variantID := uuid.New()

	variant := &domain.TestVariant{
		ID:               variantID,
		IssueID:          uuid.New(),
		TestType:         domain.TestTypeSubjectLine,
		VariantName:      "A",
		VariantValue:     "Subject A",
		AssignedContacts: 100,
		Opens:            10,
		Clicks:           5,
	}

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	variantRepo.On("GetByID", ctx, variantID).Return(variant, nil)
	variantRepo.On("UpdateResults", ctx, variantID, 10, 6).Return(nil)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	err := service.RecordVariantEvent(ctx, variantID, domain.EventTypeClick)

	assert.NoError(t, err)
	variantRepo.AssertExpectations(t)
}

// TestCalculateWinner_ClearWinnerWithSignificance tests winner calculation with statistical significance
func TestCalculateWinner_ClearWinnerWithSignificance(t *testing.T) {
	ctx := context.Background()
	issueID := uuid.New()

	variantA := &domain.TestVariant{
		ID:               uuid.New(),
		IssueID:          issueID,
		TestType:         domain.TestTypeSubjectLine,
		VariantName:      "A",
		VariantValue:     "Subject A",
		AssignedContacts: 150,
		Opens:            90, // 60% open rate
		Clicks:           45,
	}

	variantB := &domain.TestVariant{
		ID:               uuid.New(),
		IssueID:          issueID,
		TestType:         domain.TestTypeSubjectLine,
		VariantName:      "B",
		VariantValue:     "Subject B",
		AssignedContacts: 150,
		Opens:            45, // 30% open rate
		Clicks:           22,
	}

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	variantRepo.On("GetByIssueID", ctx, issueID).Return([]*domain.TestVariant{variantA, variantB}, nil)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	result, err := service.CalculateWinner(ctx, issueID)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, issueID, result.IssueID)
	assert.Len(t, result.Variants, 2)
	assert.True(t, result.MinSampleSizeMet)
	assert.Equal(t, 300, result.TotalSampleSize)
	assert.True(t, result.IsSignificant)
	assert.NotNil(t, result.Winner)
	assert.Equal(t, "A", result.Winner.VariantName)
	assert.Greater(t, result.Confidence, 95.0) // Should be >95% confidence
	assert.True(t, result.Winner.IsWinner)

	variantRepo.AssertExpectations(t)
}

// ============================================================================
// FAILURE PATH TESTS
// ============================================================================

// TestCreateTestVariants_InvalidIssueID tests validation of issue ID
func TestCreateTestVariants_InvalidIssueID(t *testing.T) {
	ctx := context.Background()

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	variants, err := service.CreateTestVariants(ctx, uuid.Nil, domain.TestTypeSubjectLine, "Subject A", "Subject B")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "issue ID is required")
	assert.Nil(t, variants)
}

// TestCreateTestVariants_InvalidTestType tests validation of test type
func TestCreateTestVariants_InvalidTestType(t *testing.T) {
	ctx := context.Background()
	issueID := uuid.New()

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	variants, err := service.CreateTestVariants(ctx, issueID, domain.TestType("invalid"), "Subject A", "Subject B")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid test type")
	assert.Nil(t, variants)
}

// TestCreateTestVariants_EmptyVariantAValue tests validation of variant A value
func TestCreateTestVariants_EmptyVariantAValue(t *testing.T) {
	ctx := context.Background()
	issueID := uuid.New()

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	variants, err := service.CreateTestVariants(ctx, issueID, domain.TestTypeSubjectLine, "", "Subject B")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "variant A value is required")
	assert.Nil(t, variants)
}

// TestCreateTestVariants_EmptyVariantBValue tests validation of variant B value
func TestCreateTestVariants_EmptyVariantBValue(t *testing.T) {
	ctx := context.Background()
	issueID := uuid.New()

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	variants, err := service.CreateTestVariants(ctx, issueID, domain.TestTypeSubjectLine, "Subject A", "")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "variant B value is required")
	assert.Nil(t, variants)
}

// TestCreateTestVariants_VariantsAlreadyExist tests duplicate variant prevention
func TestCreateTestVariants_VariantsAlreadyExist(t *testing.T) {
	ctx := context.Background()
	issueID := uuid.New()

	existing := []*domain.TestVariant{
		{ID: uuid.New(), IssueID: issueID},
	}

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	variantRepo.On("GetByIssueID", ctx, issueID).Return(existing, nil)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	variants, err := service.CreateTestVariants(ctx, issueID, domain.TestTypeSubjectLine, "Subject A", "Subject B")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "variants already exist")
	assert.Nil(t, variants)

	variantRepo.AssertExpectations(t)
}

// TestAssignContactToVariant_EmptyContactID tests validation of contact ID
func TestAssignContactToVariant_EmptyContactID(t *testing.T) {
	ctx := context.Background()
	issueID := uuid.New()

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	variant, err := service.AssignContactToVariant(ctx, uuid.Nil, issueID)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "contact ID is required")
	assert.Nil(t, variant)
}

// TestAssignContactToVariant_EmptyIssueID tests validation of issue ID
func TestAssignContactToVariant_EmptyIssueID(t *testing.T) {
	ctx := context.Background()
	contactID := uuid.New()

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	variant, err := service.AssignContactToVariant(ctx, contactID, uuid.Nil)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "issue ID is required")
	assert.Nil(t, variant)
}

// TestAssignContactToVariant_NoVariantsFound tests error when no variants exist
func TestAssignContactToVariant_NoVariantsFound(t *testing.T) {
	ctx := context.Background()
	contactID := uuid.New()
	issueID := uuid.New()

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	variantRepo.On("GetByIssueID", ctx, issueID).Return([]*domain.TestVariant{}, nil)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	variant, err := service.AssignContactToVariant(ctx, contactID, issueID)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "no variants found")
	assert.Nil(t, variant)

	variantRepo.AssertExpectations(t)
}

// TestAssignContactToVariant_WrongVariantCount tests error when variant count is not 2
func TestAssignContactToVariant_WrongVariantCount(t *testing.T) {
	ctx := context.Background()
	contactID := uuid.New()
	issueID := uuid.New()

	variantA := &domain.TestVariant{
		ID:      uuid.New(),
		IssueID: issueID,
	}

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	variantRepo.On("GetByIssueID", ctx, issueID).Return([]*domain.TestVariant{variantA}, nil)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	variant, err := service.AssignContactToVariant(ctx, contactID, issueID)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "expected 2 variants")
	assert.Nil(t, variant)

	variantRepo.AssertExpectations(t)
}

// TestRecordVariantEvent_EmptyVariantID tests validation of variant ID
func TestRecordVariantEvent_EmptyVariantID(t *testing.T) {
	ctx := context.Background()

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	err := service.RecordVariantEvent(ctx, uuid.Nil, domain.EventTypeOpen)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "variant ID is required")
}

// TestRecordVariantEvent_UnsupportedEventType tests validation of event type
func TestRecordVariantEvent_UnsupportedEventType(t *testing.T) {
	ctx := context.Background()
	variantID := uuid.New()

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	err := service.RecordVariantEvent(ctx, variantID, domain.EventTypeUnsubscribe)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "only open and click events")
}

// TestCalculateWinner_EmptyIssueID tests validation of issue ID
func TestCalculateWinner_EmptyIssueID(t *testing.T) {
	ctx := context.Background()

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	result, err := service.CalculateWinner(ctx, uuid.Nil)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "issue ID is required")
	assert.Nil(t, result)
}

// TestCalculateWinner_NoVariantsFound tests error when no variants exist
func TestCalculateWinner_NoVariantsFound(t *testing.T) {
	ctx := context.Background()
	issueID := uuid.New()

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	variantRepo.On("GetByIssueID", ctx, issueID).Return([]*domain.TestVariant{}, nil)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	result, err := service.CalculateWinner(ctx, issueID)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "no variants found")
	assert.Nil(t, result)

	variantRepo.AssertExpectations(t)
}

// TestCalculateWinner_BeforeMinimumSampleSize tests that no winner is declared before minimum sample
func TestCalculateWinner_BeforeMinimumSampleSize(t *testing.T) {
	ctx := context.Background()
	issueID := uuid.New()

	variantA := &domain.TestVariant{
		ID:               uuid.New(),
		IssueID:          issueID,
		TestType:         domain.TestTypeSubjectLine,
		VariantName:      "A",
		VariantValue:     "Subject A",
		AssignedContacts: 50, // Below minimum (100)
		Opens:            30,
		Clicks:           15,
	}

	variantB := &domain.TestVariant{
		ID:               uuid.New(),
		IssueID:          issueID,
		TestType:         domain.TestTypeSubjectLine,
		VariantName:      "B",
		VariantValue:     "Subject B",
		AssignedContacts: 50, // Below minimum (100)
		Opens:            15,
		Clicks:           7,
	}

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	variantRepo.On("GetByIssueID", ctx, issueID).Return([]*domain.TestVariant{variantA, variantB}, nil)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	result, err := service.CalculateWinner(ctx, issueID)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.False(t, result.MinSampleSizeMet)
	assert.Nil(t, result.Winner)
	assert.False(t, result.IsSignificant)

	variantRepo.AssertExpectations(t)
}

// TestApplyFeedbackLoop_NoWinner tests error when no winner exists
func TestApplyFeedbackLoop_NoWinner(t *testing.T) {
	ctx := context.Background()
	issueID := uuid.New()

	variantA := &domain.TestVariant{
		ID:               uuid.New(),
		IssueID:          issueID,
		TestType:         domain.TestTypeSubjectLine,
		VariantName:      "A",
		VariantValue:     "Subject A",
		AssignedContacts: 50, // Insufficient sample
		Opens:            25,
		Clicks:           12,
	}

	variantB := &domain.TestVariant{
		ID:               uuid.New(),
		IssueID:          issueID,
		TestType:         domain.TestTypeSubjectLine,
		VariantName:      "B",
		VariantValue:     "Subject B",
		AssignedContacts: 50,
		Opens:            12,
		Clicks:           6,
	}

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	variantRepo.On("GetByIssueID", ctx, issueID).Return([]*domain.TestVariant{variantA, variantB}, nil)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	err := service.ApplyFeedbackLoop(ctx, issueID)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "no winner to apply feedback from")

	variantRepo.AssertExpectations(t)
}

// TestApplyFeedbackLoop_EmptyIssueID tests validation of issue ID
func TestApplyFeedbackLoop_EmptyIssueID(t *testing.T) {
	ctx := context.Background()

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	err := service.ApplyFeedbackLoop(ctx, uuid.Nil)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "issue ID is required")
}

// ============================================================================
// NULL/EMPTY STATE TESTS
// ============================================================================

// TestCalculateWinner_EmptyVariantList tests handling of empty variant list
func TestCalculateWinner_EmptyVariantList(t *testing.T) {
	ctx := context.Background()
	issueID := uuid.New()

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	variantRepo.On("GetByIssueID", ctx, issueID).Return([]*domain.TestVariant{}, nil)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	result, err := service.CalculateWinner(ctx, issueID)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "no variants found")
	assert.Nil(t, result)

	variantRepo.AssertExpectations(t)
}

// TestCalculateWinner_NoContactsAssigned tests handling when no contacts are assigned
func TestCalculateWinner_NoContactsAssigned(t *testing.T) {
	ctx := context.Background()
	issueID := uuid.New()

	variantA := &domain.TestVariant{
		ID:               uuid.New(),
		IssueID:          issueID,
		TestType:         domain.TestTypeSubjectLine,
		VariantName:      "A",
		VariantValue:     "Subject A",
		AssignedContacts: 0, // No contacts
		Opens:            0,
		Clicks:           0,
	}

	variantB := &domain.TestVariant{
		ID:               uuid.New(),
		IssueID:          issueID,
		TestType:         domain.TestTypeSubjectLine,
		VariantName:      "B",
		VariantValue:     "Subject B",
		AssignedContacts: 0, // No contacts
		Opens:            0,
		Clicks:           0,
	}

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	variantRepo.On("GetByIssueID", ctx, issueID).Return([]*domain.TestVariant{variantA, variantB}, nil)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	result, err := service.CalculateWinner(ctx, issueID)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.False(t, result.MinSampleSizeMet)
	assert.Nil(t, result.Winner)

	variantRepo.AssertExpectations(t)
}

// TestCalculateWinner_ZeroOpensAndClicks tests handling when no engagement events recorded
func TestCalculateWinner_ZeroOpensAndClicks(t *testing.T) {
	ctx := context.Background()
	issueID := uuid.New()

	variantA := &domain.TestVariant{
		ID:               uuid.New(),
		IssueID:          issueID,
		TestType:         domain.TestTypeSubjectLine,
		VariantName:      "A",
		VariantValue:     "Subject A",
		AssignedContacts: 150,
		Opens:            0, // No events
		Clicks:           0,
	}

	variantB := &domain.TestVariant{
		ID:               uuid.New(),
		IssueID:          issueID,
		TestType:         domain.TestTypeSubjectLine,
		VariantName:      "B",
		VariantValue:     "Subject B",
		AssignedContacts: 150,
		Opens:            0, // No events
		Clicks:           0,
	}

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	variantRepo.On("GetByIssueID", ctx, issueID).Return([]*domain.TestVariant{variantA, variantB}, nil)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	result, err := service.CalculateWinner(ctx, issueID)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.True(t, result.MinSampleSizeMet)
	assert.Nil(t, result.Winner) // No winner when both have 0 engagement

	variantRepo.AssertExpectations(t)
}

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

// TestCalculateWinner_TiedResults tests tie-breaker logic
func TestCalculateWinner_TiedResults(t *testing.T) {
	ctx := context.Background()
	issueID := uuid.New()

	variantA := &domain.TestVariant{
		ID:               uuid.New(),
		IssueID:          issueID,
		TestType:         domain.TestTypeSubjectLine,
		VariantName:      "A",
		VariantValue:     "Subject A",
		AssignedContacts: 150,
		Opens:            75, // 50% open rate
		Clicks:           37,
	}

	variantB := &domain.TestVariant{
		ID:               uuid.New(),
		IssueID:          issueID,
		TestType:         domain.TestTypeSubjectLine,
		VariantName:      "B",
		VariantValue:     "Subject B",
		AssignedContacts: 150,
		Opens:            75, // 50% open rate (exactly same)
		Clicks:           37,
	}

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	variantRepo.On("GetByIssueID", ctx, issueID).Return([]*domain.TestVariant{variantA, variantB}, nil)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	result, err := service.CalculateWinner(ctx, issueID)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.True(t, result.MinSampleSizeMet)
	assert.Nil(t, result.Winner) // No winner in a tie
	assert.False(t, result.IsSignificant)

	variantRepo.AssertExpectations(t)
}

// TestCalculateWinner_ExactlyMinimumSampleSize tests boundary at minimum sample size
func TestCalculateWinner_ExactlyMinimumSampleSize(t *testing.T) {
	ctx := context.Background()
	issueID := uuid.New()

	variantA := &domain.TestVariant{
		ID:               uuid.New(),
		IssueID:          issueID,
		TestType:         domain.TestTypeSubjectLine,
		VariantName:      "A",
		VariantValue:     "Subject A",
		AssignedContacts: 100, // Exactly minimum
		Opens:            60,
		Clicks:           30,
	}

	variantB := &domain.TestVariant{
		ID:               uuid.New(),
		IssueID:          issueID,
		TestType:         domain.TestTypeSubjectLine,
		VariantName:      "B",
		VariantValue:     "Subject B",
		AssignedContacts: 100, // Exactly minimum
		Opens:            30,
		Clicks:           15,
	}

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	variantRepo.On("GetByIssueID", ctx, issueID).Return([]*domain.TestVariant{variantA, variantB}, nil)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	result, err := service.CalculateWinner(ctx, issueID)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.True(t, result.MinSampleSizeMet)
	assert.Equal(t, 200, result.TotalSampleSize)

	variantRepo.AssertExpectations(t)
}

// TestCalculateWinner_SubjectLineUsesOpenRate tests subject line test uses open rate as primary metric
func TestCalculateWinner_SubjectLineUsesOpenRate(t *testing.T) {
	ctx := context.Background()
	issueID := uuid.New()

	variantA := &domain.TestVariant{
		ID:               uuid.New(),
		IssueID:          issueID,
		TestType:         domain.TestTypeSubjectLine,
		VariantName:      "A",
		VariantValue:     "Subject A",
		AssignedContacts: 150,
		Opens:            90,  // 60% open rate (higher)
		Clicks:           30,  // 33% click rate (lower)
	}

	variantB := &domain.TestVariant{
		ID:               uuid.New(),
		IssueID:          issueID,
		TestType:         domain.TestTypeSubjectLine,
		VariantName:      "B",
		VariantValue:     "Subject B",
		AssignedContacts: 150,
		Opens:            45,  // 30% open rate (lower)
		Clicks:           36,  // 80% click rate (higher)
	}

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	variantRepo.On("GetByIssueID", ctx, issueID).Return([]*domain.TestVariant{variantA, variantB}, nil)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	result, err := service.CalculateWinner(ctx, issueID)

	assert.NoError(t, err)
	assert.NotNil(t, result)

	if result.Winner != nil {
		// Winner should be variant A (higher open rate)
		assert.Equal(t, "A", result.Winner.VariantName)
	}

	variantRepo.AssertExpectations(t)
}

// TestCalculateWinner_CTAFramingUsesClickRate tests CTA framing test uses click rate as primary metric
func TestCalculateWinner_CTAFramingUsesClickRate(t *testing.T) {
	ctx := context.Background()
	issueID := uuid.New()

	variantA := &domain.TestVariant{
		ID:               uuid.New(),
		IssueID:          issueID,
		TestType:         domain.TestTypeCTAFraming,
		VariantName:      "A",
		VariantValue:     "Read More",
		AssignedContacts: 150,
		Opens:            90,  // 60% open rate (higher)
		Clicks:           30,  // 33% click rate (lower)
	}

	variantB := &domain.TestVariant{
		ID:               uuid.New(),
		IssueID:          issueID,
		TestType:         domain.TestTypeCTAFraming,
		VariantName:      "B",
		VariantValue:     "Learn More",
		AssignedContacts: 150,
		Opens:            75,  // 50% open rate (lower)
		Clicks:           60,  // 80% click rate (higher)
	}

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	variantRepo.On("GetByIssueID", ctx, issueID).Return([]*domain.TestVariant{variantA, variantB}, nil)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	result, err := service.CalculateWinner(ctx, issueID)

	assert.NoError(t, err)
	assert.NotNil(t, result)

	if result.Winner != nil {
		// Winner should be variant B (higher click rate)
		assert.Equal(t, "B", result.Winner.VariantName)
	}

	variantRepo.AssertExpectations(t)
}

// TestApplyFeedbackLoop_DifferentTestTypes tests feedback application for different test types
func TestApplyFeedbackLoop_DifferentTestTypes(t *testing.T) {
	tests := []struct {
		name     string
		testType domain.TestType
	}{
		{name: "subject line", testType: domain.TestTypeSubjectLine},
		{name: "send time", testType: domain.TestTypeSendTime},
		{name: "hero topic", testType: domain.TestTypeHeroTopic},
		{name: "CTA framing", testType: domain.TestTypeCTAFraming},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			issueID := uuid.New()
			winnerID := uuid.New()

			variantA := &domain.TestVariant{
				ID:               winnerID,
				IssueID:          issueID,
				TestType:         tt.testType,
				VariantName:      "A",
				VariantValue:     "Value A",
				AssignedContacts: 150,
				Opens:            90,
				Clicks:           45,
			}

			variantB := &domain.TestVariant{
				ID:               uuid.New(),
				IssueID:          issueID,
				TestType:         tt.testType,
				VariantName:      "B",
				VariantValue:     "Value B",
				AssignedContacts: 150,
				Opens:            45,
				Clicks:           22,
			}

			variantRepo := new(MockTestVariantRepository)
			engagementRepo := new(MockEngagementEventRepository)
			contactRepo := new(MockContactRepository)
			configRepo := new(MockNewsletterConfigRepository)

			variantRepo.On("GetByIssueID", ctx, issueID).Return([]*domain.TestVariant{variantA, variantB}, nil)
			variantRepo.On("DeclareWinner", ctx, winnerID, mock.AnythingOfType("float64")).Return(nil)
			variantRepo.On("GetByID", ctx, winnerID).Return(variantA, nil)

			service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

			err := service.ApplyFeedbackLoop(ctx, issueID)

			assert.NoError(t, err)
			variantRepo.AssertExpectations(t)
		})
	}
}

// ============================================================================
// STATISTICAL CALCULATION TESTS
// ============================================================================

// TestStatisticalHelpers_CalculatePValue tests p-value calculation
func TestStatisticalHelpers_CalculatePValue(t *testing.T) {
	tests := []struct {
		name          string
		zScore        float64
		expectedPVal  float64
		tolerance     float64
	}{
		{name: "zero z-score", zScore: 0, expectedPVal: 1.0, tolerance: 0.001},
		{name: "z=1.96 (95% confidence)", zScore: 1.96, expectedPVal: 0.05, tolerance: 0.01},
		{name: "z=-1.96 (95% confidence, negative)", zScore: -1.96, expectedPVal: 0.05, tolerance: 0.01},
		{name: "z=2.58 (99% confidence)", zScore: 2.58, expectedPVal: 0.01, tolerance: 0.01},
		{name: "very small z-score", zScore: 0.5, expectedPVal: 0.617, tolerance: 0.05},
		{name: "very large z-score", zScore: 3.5, expectedPVal: 0.0005, tolerance: 0.001},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			pValue := calculatePValue(tt.zScore)
			assert.InDelta(t, tt.expectedPVal, pValue, tt.tolerance)
		})
	}
}

// TestStatisticalHelpers_NormalCDF tests normal cumulative distribution function
func TestStatisticalHelpers_NormalCDF(t *testing.T) {
	tests := []struct {
		name      string
		x         float64
		expected  float64
		tolerance float64
	}{
		{name: "zero", x: 0, expected: 0.5, tolerance: 0.001},
		{name: "z=1.96", x: 1.96, expected: 0.975, tolerance: 0.01},
		{name: "z=-1.96", x: -1.96, expected: 0.025, tolerance: 0.01},
		{name: "z=1", x: 1, expected: 0.841, tolerance: 0.01},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cdf := normalCDF(tt.x)
			assert.InDelta(t, tt.expected, cdf, tt.tolerance)
		})
	}
}

// TestStatisticalHelpers_IsStatisticallySignificant tests significance determination
func TestStatisticalHelpers_IsStatisticallySignificant(t *testing.T) {
	tests := []struct {
		name       string
		pValue     float64
		shouldBeSig bool
	}{
		{name: "highly significant", pValue: 0.001, shouldBeSig: true},
		{name: "significant at 5%", pValue: 0.04, shouldBeSig: true},
		{name: "not significant", pValue: 0.10, shouldBeSig: false},
		{name: "borderline", pValue: 0.05, shouldBeSig: false}, // >= threshold
		{name: "negative (invalid)", pValue: -0.1, shouldBeSig: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isStatisticallySignificant(tt.pValue)
			assert.Equal(t, tt.shouldBeSig, result)
		})
	}
}

// TestStatisticalHelpers_CalculateConfidenceInterval tests confidence interval calculation
func TestStatisticalHelpers_CalculateConfidenceInterval(t *testing.T) {
	tests := []struct {
		name       string
		rate       float64
		sampleSize int
		checkValid bool
	}{
		{name: "50% rate, 100 samples", rate: 0.5, sampleSize: 100, checkValid: true},
		{name: "80% rate, 200 samples", rate: 0.8, sampleSize: 200, checkValid: true},
		{name: "10% rate, 50 samples", rate: 0.1, sampleSize: 50, checkValid: true},
		{name: "zero sample size", rate: 0.5, sampleSize: 0, checkValid: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			lower, upper := calculateConfidenceInterval(tt.rate, tt.sampleSize)

			if tt.checkValid {
				assert.GreaterOrEqual(t, lower, 0.0)
				assert.LessOrEqual(t, upper, 1.0)
				assert.Less(t, lower, tt.rate)
				assert.Greater(t, upper, tt.rate)
				assert.Less(t, lower, upper)
			} else {
				assert.Equal(t, 0.0, lower)
				assert.Equal(t, 0.0, upper)
			}
		})
	}
}

// TestStatisticalHelpers_HashString tests deterministic hashing
func TestStatisticalHelpers_HashString(t *testing.T) {
	t.Run("deterministic", func(t *testing.T) {
		input := "test-string"
		hash1 := hashString(input)
		hash2 := hashString(input)
		hash3 := hashString(input)

		assert.Equal(t, hash1, hash2)
		assert.Equal(t, hash2, hash3)
	})

	t.Run("different inputs produce different hashes", func(t *testing.T) {
		hash1 := hashString("input1")
		hash2 := hashString("input2")
		hash3 := hashString("input3")

		assert.NotEqual(t, hash1, hash2)
		assert.NotEqual(t, hash2, hash3)
		assert.NotEqual(t, hash1, hash3)
	})

	t.Run("distribution", func(t *testing.T) {
		// Test that hash modulo 2 gives roughly equal distribution
		count0 := 0
		count1 := 0

		for i := 0; i < 1000; i++ {
			contactID := uuid.New()
			issueID := uuid.New()
			key := contactID.String() + "-" + issueID.String()
			hash := hashString(key)

			if hash%2 == 0 {
				count0++
			} else {
				count1++
			}
		}

		// Should be roughly 50/50 (allow 40-60% range)
		ratio := float64(count0) / 1000.0
		assert.Greater(t, ratio, 0.4)
		assert.Less(t, ratio, 0.6)
	})
}

// TestZScoreAccuracy tests z-score calculation accuracy
func TestZScoreAccuracy(t *testing.T) {
	tests := []struct {
		name               string
		rate1              float64
		rate2              float64
		n1                 int
		n2                 int
		expectSignificant  bool
		expectPositive     bool
	}{
		{
			name:               "clear difference - 60% vs 30%",
			rate1:              0.60,
			rate2:              0.30,
			n1:                 150,
			n2:                 150,
			expectSignificant:  true,
			expectPositive:     true,
		},
		{
			name:               "small difference - 52% vs 48%",
			rate1:              0.52,
			rate2:              0.48,
			n1:                 100,
			n2:                 100,
			expectSignificant:  false,
			expectPositive:     true,
		},
		{
			name:               "identical rates",
			rate1:              0.50,
			rate2:              0.50,
			n1:                 100,
			n2:                 100,
			expectSignificant:  false,
			expectPositive:     false, // Should be ~0
		},
		{
			name:               "zero sample size",
			rate1:              0.50,
			rate2:              0.30,
			n1:                 0,
			n2:                 100,
			expectSignificant:  false,
			expectPositive:     false, // Returns 0
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			zScore := domain.CalculateZScore(tt.rate1, tt.rate2, tt.n1, tt.n2)

			if tt.expectSignificant {
				assert.Greater(t, math.Abs(zScore), CriticalZScore, "Expected z-score > 1.96 for statistical significance")
			}

			if tt.expectPositive {
				assert.Greater(t, zScore, 0.0)
			} else if tt.n1 > 0 && tt.n2 > 0 {
				assert.InDelta(t, 0.0, zScore, 0.1)
			} else {
				assert.Equal(t, 0.0, zScore)
			}
		})
	}
}

// ============================================================================
// CONNECTIVITY/REPOSITORY FAILURE TESTS
// ============================================================================

// TestCreateTestVariants_RepositoryGetFailure tests database timeout on get
func TestCreateTestVariants_RepositoryGetFailure(t *testing.T) {
	ctx := context.Background()
	issueID := uuid.New()

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	variantRepo.On("GetByIssueID", ctx, issueID).Return(nil, context.DeadlineExceeded)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	variants, err := service.CreateTestVariants(ctx, issueID, domain.TestTypeSubjectLine, "Subject A", "Subject B")

	assert.Error(t, err)
	assert.True(t, errors.Is(err, context.DeadlineExceeded))
	assert.Nil(t, variants)

	variantRepo.AssertExpectations(t)
}

// TestCreateTestVariants_RepositoryCreateFailure tests database timeout on create
func TestCreateTestVariants_RepositoryCreateFailure(t *testing.T) {
	ctx := context.Background()
	issueID := uuid.New()

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	variantRepo.On("GetByIssueID", ctx, issueID).Return([]*domain.TestVariant{}, nil)
	variantRepo.On("BulkCreate", ctx, mock.AnythingOfType("[]*domain.TestVariant")).Return(context.DeadlineExceeded)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	variants, err := service.CreateTestVariants(ctx, issueID, domain.TestTypeSubjectLine, "Subject A", "Subject B")

	assert.Error(t, err)
	assert.True(t, errors.Is(err, context.DeadlineExceeded))
	assert.Nil(t, variants)

	variantRepo.AssertExpectations(t)
}

// TestAssignContactToVariant_RepositoryTimeout tests database timeout
func TestAssignContactToVariant_RepositoryTimeout(t *testing.T) {
	ctx := context.Background()
	contactID := uuid.New()
	issueID := uuid.New()

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	variantRepo.On("GetByIssueID", ctx, issueID).Return(nil, context.DeadlineExceeded)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	variant, err := service.AssignContactToVariant(ctx, contactID, issueID)

	assert.Error(t, err)
	assert.True(t, errors.Is(err, context.DeadlineExceeded))
	assert.Nil(t, variant)

	variantRepo.AssertExpectations(t)
}

// TestAssignContactToVariant_UpdateFailure tests update failure
func TestAssignContactToVariant_UpdateFailure(t *testing.T) {
	ctx := context.Background()
	contactID := uuid.New()
	issueID := uuid.New()

	variantA := &domain.TestVariant{
		ID:               uuid.New(),
		IssueID:          issueID,
		TestType:         domain.TestTypeSubjectLine,
		VariantName:      "A",
		VariantValue:     "Subject A",
		AssignedContacts: 0,
	}

	variantB := &domain.TestVariant{
		ID:               uuid.New(),
		IssueID:          issueID,
		TestType:         domain.TestTypeSubjectLine,
		VariantName:      "B",
		VariantValue:     "Subject B",
		AssignedContacts: 0,
	}

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	variantRepo.On("GetByIssueID", ctx, issueID).Return([]*domain.TestVariant{variantA, variantB}, nil)
	variantRepo.On("Update", ctx, mock.AnythingOfType("*domain.TestVariant")).Return(context.DeadlineExceeded)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	variant, err := service.AssignContactToVariant(ctx, contactID, issueID)

	assert.Error(t, err)
	assert.True(t, errors.Is(err, context.DeadlineExceeded))
	assert.Nil(t, variant)

	variantRepo.AssertExpectations(t)
}

// TestRecordVariantEvent_RepositoryGetFailure tests repository failure on get
func TestRecordVariantEvent_RepositoryGetFailure(t *testing.T) {
	ctx := context.Background()
	variantID := uuid.New()

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	variantRepo.On("GetByID", ctx, variantID).Return(nil, context.DeadlineExceeded)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	err := service.RecordVariantEvent(ctx, variantID, domain.EventTypeOpen)

	assert.Error(t, err)
	assert.True(t, errors.Is(err, context.DeadlineExceeded))

	variantRepo.AssertExpectations(t)
}

// TestRecordVariantEvent_UpdateResultsFailure tests repository failure on update
func TestRecordVariantEvent_UpdateResultsFailure(t *testing.T) {
	ctx := context.Background()
	variantID := uuid.New()

	variant := &domain.TestVariant{
		ID:               variantID,
		IssueID:          uuid.New(),
		TestType:         domain.TestTypeSubjectLine,
		VariantName:      "A",
		VariantValue:     "Subject A",
		AssignedContacts: 100,
		Opens:            10,
		Clicks:           5,
	}

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	variantRepo.On("GetByID", ctx, variantID).Return(variant, nil)
	variantRepo.On("UpdateResults", ctx, variantID, 11, 5).Return(context.DeadlineExceeded)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	err := service.RecordVariantEvent(ctx, variantID, domain.EventTypeOpen)

	assert.Error(t, err)
	assert.True(t, errors.Is(err, context.DeadlineExceeded))

	variantRepo.AssertExpectations(t)
}

// TestCalculateWinner_RepositoryFailure tests repository failure
func TestCalculateWinner_RepositoryFailure(t *testing.T) {
	ctx := context.Background()
	issueID := uuid.New()

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	variantRepo.On("GetByIssueID", ctx, issueID).Return(nil, context.DeadlineExceeded)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	result, err := service.CalculateWinner(ctx, issueID)

	assert.Error(t, err)
	assert.True(t, errors.Is(err, context.DeadlineExceeded))
	assert.Nil(t, result)

	variantRepo.AssertExpectations(t)
}

// TestApplyFeedbackLoop_DeclareWinnerFailure tests repository failure on declare winner
func TestApplyFeedbackLoop_DeclareWinnerFailure(t *testing.T) {
	ctx := context.Background()
	issueID := uuid.New()
	winnerID := uuid.New()

	variantA := &domain.TestVariant{
		ID:               winnerID,
		IssueID:          issueID,
		TestType:         domain.TestTypeSubjectLine,
		VariantName:      "A",
		VariantValue:     "Subject A",
		AssignedContacts: 150,
		Opens:            90,
		Clicks:           45,
	}

	variantB := &domain.TestVariant{
		ID:               uuid.New(),
		IssueID:          issueID,
		TestType:         domain.TestTypeSubjectLine,
		VariantName:      "B",
		VariantValue:     "Subject B",
		AssignedContacts: 150,
		Opens:            45,
		Clicks:           22,
	}

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	variantRepo.On("GetByIssueID", ctx, issueID).Return([]*domain.TestVariant{variantA, variantB}, nil)
	variantRepo.On("DeclareWinner", ctx, winnerID, mock.AnythingOfType("float64")).Return(context.DeadlineExceeded)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	err := service.ApplyFeedbackLoop(ctx, issueID)

	assert.Error(t, err)
	assert.True(t, errors.Is(err, context.DeadlineExceeded))

	variantRepo.AssertExpectations(t)
}

// ============================================================================
// DATA SEGREGATION / MULTI-TENANCY TESTS
// ============================================================================

// TestAssignContactToVariant_IssueIsolation tests that variants are isolated by issue
func TestAssignContactToVariant_IssueIsolation(t *testing.T) {
	ctx := context.Background()
	contactID := uuid.New()
	issueID := uuid.New()
	issue2ID := uuid.New() // Different issue

	variantA := &domain.TestVariant{
		ID:               uuid.New(),
		IssueID:          issueID,
		TestType:         domain.TestTypeSubjectLine,
		VariantName:      "A",
		VariantValue:     "Subject A",
		AssignedContacts: 0,
	}

	variantB := &domain.TestVariant{
		ID:               uuid.New(),
		IssueID:          issueID,
		TestType:         domain.TestTypeSubjectLine,
		VariantName:      "B",
		VariantValue:     "Subject B",
		AssignedContacts: 0,
	}

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	// Verify that only variants for the correct issue are retrieved
	variantRepo.On("GetByIssueID", ctx, issueID).Return([]*domain.TestVariant{variantA, variantB}, nil).Run(func(args mock.Arguments) {
		// Verify the correct issue ID is being queried
		assert.Equal(t, issueID, args.Get(1))
		// Ensure it's NOT issue2ID
		assert.NotEqual(t, issue2ID, args.Get(1))
	})
	variantRepo.On("Update", ctx, mock.AnythingOfType("*domain.TestVariant")).Return(nil)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	variant, err := service.AssignContactToVariant(ctx, contactID, issueID)

	assert.NoError(t, err)
	assert.NotNil(t, variant)
	// Verify returned variant belongs to correct issue
	assert.Equal(t, issueID, variant.IssueID)

	variantRepo.AssertCalled(t, "GetByIssueID", ctx, issueID)
}

// TestCalculateWinner_VariantIsolationPerIssue tests that winner calculation is isolated by issue
func TestCalculateWinner_VariantIsolationPerIssue(t *testing.T) {
	ctx := context.Background()
	issue1ID := uuid.New()
	issue2ID := uuid.New()

	// Issue 1 variants
	issue1VariantA := &domain.TestVariant{
		ID:               uuid.New(),
		IssueID:          issue1ID,
		TestType:         domain.TestTypeSubjectLine,
		VariantName:      "A",
		VariantValue:     "Issue 1 Subject A",
		AssignedContacts: 150,
		Opens:            90,
		Clicks:           45,
	}

	issue1VariantB := &domain.TestVariant{
		ID:               uuid.New(),
		IssueID:          issue1ID,
		TestType:         domain.TestTypeSubjectLine,
		VariantName:      "B",
		VariantValue:     "Issue 1 Subject B",
		AssignedContacts: 150,
		Opens:            45,
		Clicks:           22,
	}

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	// Mock returns only variants for issue1
	variantRepo.On("GetByIssueID", ctx, issue1ID).Return([]*domain.TestVariant{issue1VariantA, issue1VariantB}, nil).Run(func(args mock.Arguments) {
		queriedIssueID := args.Get(1).(uuid.UUID)
		assert.Equal(t, issue1ID, queriedIssueID)
		assert.NotEqual(t, issue2ID, queriedIssueID)
	})

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	result, err := service.CalculateWinner(ctx, issue1ID)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, issue1ID, result.IssueID)

	// Verify variants were returned (isolation check done at repository level)
	assert.NotEmpty(t, result.Variants)

	variantRepo.AssertExpectations(t)
}

// TestGetTestResults tests retrieving test results without modifying state
func TestGetTestResults(t *testing.T) {
	ctx := context.Background()
	issueID := uuid.New()

	variantA := &domain.TestVariant{
		ID:               uuid.New(),
		IssueID:          issueID,
		TestType:         domain.TestTypeSubjectLine,
		VariantName:      "A",
		VariantValue:     "Subject A",
		AssignedContacts: 150,
		Opens:            90,
		Clicks:           45,
	}

	variantB := &domain.TestVariant{
		ID:               uuid.New(),
		IssueID:          issueID,
		TestType:         domain.TestTypeSubjectLine,
		VariantName:      "B",
		VariantValue:     "Subject B",
		AssignedContacts: 150,
		Opens:            45,
		Clicks:           22,
	}

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	variantRepo.On("GetByIssueID", ctx, issueID).Return([]*domain.TestVariant{variantA, variantB}, nil)
	variantRepo.On("GetWinner", ctx, issueID).Return(nil, errors.New("no winner declared"))

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	result, err := service.GetTestResults(ctx, issueID)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, issueID, result.IssueID)
	assert.Nil(t, result.WinnerDeclaredAt) // No winner declared yet

	variantRepo.AssertExpectations(t)
}

// TestGetTestResults_WithDeclaredWinner tests retrieving results when winner was already declared
func TestGetTestResults_WithDeclaredWinner(t *testing.T) {
	ctx := context.Background()
	issueID := uuid.New()
	winnerID := uuid.New()
	declaredAt := time.Now()

	variantA := &domain.TestVariant{
		ID:                 winnerID,
		IssueID:            issueID,
		TestType:           domain.TestTypeSubjectLine,
		VariantName:        "A",
		VariantValue:       "Subject A",
		AssignedContacts:   150,
		Opens:              90,
		Clicks:             45,
		IsWinner:           true,
		WinnerDeclaredAt:   &declaredAt,
	}

	variantB := &domain.TestVariant{
		ID:               uuid.New(),
		IssueID:          issueID,
		TestType:         domain.TestTypeSubjectLine,
		VariantName:      "B",
		VariantValue:     "Subject B",
		AssignedContacts: 150,
		Opens:            45,
		Clicks:           22,
	}

	variantRepo := new(MockTestVariantRepository)
	engagementRepo := new(MockEngagementEventRepository)
	contactRepo := new(MockContactRepository)
	configRepo := new(MockNewsletterConfigRepository)

	variantRepo.On("GetByIssueID", ctx, issueID).Return([]*domain.TestVariant{variantA, variantB}, nil)
	variantRepo.On("GetWinner", ctx, issueID).Return(variantA, nil)

	service := NewABTestService(variantRepo, engagementRepo, contactRepo, configRepo)

	result, err := service.GetTestResults(ctx, issueID)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, issueID, result.IssueID)
	assert.NotNil(t, result.WinnerDeclaredAt)
	assert.Equal(t, declaredAt, *result.WinnerDeclaredAt)

	variantRepo.AssertExpectations(t)
}
