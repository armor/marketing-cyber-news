package service

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/phillipboles/aci-backend/internal/domain"
)

// Test ApproveIssue

func TestApproveIssue_HappyPath(t *testing.T) {
	// Arrange
	ctx := context.Background()
	issueID := uuid.New()
	approverID := uuid.New()
	configID := uuid.New()
	notes := "Looks good, approved for sending"

	subjectLine := "Test Subject"
	issue := &domain.NewsletterIssue{
		ID:                  issueID,
		ConfigurationID:     configID,
		SegmentID:           uuid.New(),
		IssueNumber:         1,
		IssueDate:           time.Now(),
		Status:              domain.IssueStatusPendingApproval,
		SubjectLines:        []string{subjectLine},
		SelectedSubjectLine: &subjectLine,
		Blocks:              []domain.NewsletterBlock{{ID: uuid.New()}},
		CreatedAt:           time.Now(),
		UpdatedAt:           time.Now(),
	}

	config := &domain.NewsletterConfiguration{
		ID:           configID,
		Name:         "Test Config",
		ApprovalTier: domain.TierTwo,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	mockIssueRepo := new(MockNewsletterIssueRepository)
	mockConfigRepo := new(MockNewsletterConfigRepository)
	mockAuditRepo := new(MockAuditLogRepository)

	mockIssueRepo.On("GetByID", ctx, issueID).Return(issue, nil)
	mockConfigRepo.On("GetByID", ctx, configID).Return(config, nil)
	mockIssueRepo.On("Update", ctx, mock.MatchedBy(func(i *domain.NewsletterIssue) bool {
		return i.ID == issueID &&
			i.Status == domain.IssueStatusApproved &&
			i.ApprovedBy != nil &&
			*i.ApprovedBy == approverID &&
			i.ApprovedAt != nil
	})).Return(nil)
	mockAuditRepo.On("Create", ctx, mock.AnythingOfType("*domain.AuditLog")).Return(nil)

	service := NewApprovalService(mockIssueRepo, mockConfigRepo, mockAuditRepo, nil)

	// Act
	err := service.ApproveIssue(ctx, issueID, approverID, notes)

	// Assert
	assert.NoError(t, err)
	mockIssueRepo.AssertExpectations(t)
	mockConfigRepo.AssertExpectations(t)
	mockAuditRepo.AssertExpectations(t)
}

func TestApproveIssue_InvalidStatusTransition(t *testing.T) {
	// Arrange
	ctx := context.Background()
	issueID := uuid.New()
	approverID := uuid.New()
	configID := uuid.New()

	// Issue already approved - cannot approve again
	issue := &domain.NewsletterIssue{
		ID:              issueID,
		ConfigurationID: configID,
		SegmentID:       uuid.New(),
		IssueNumber:     1,
		IssueDate:       time.Now(),
		Status:          domain.IssueStatusApproved, // Already approved
		SubjectLines:    []string{"Test"},
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	mockIssueRepo := new(MockNewsletterIssueRepository)
	mockConfigRepo := new(MockNewsletterConfigRepository)
	mockAuditRepo := new(MockAuditLogRepository)

	mockIssueRepo.On("GetByID", ctx, issueID).Return(issue, nil)

	service := NewApprovalService(mockIssueRepo, mockConfigRepo, mockAuditRepo, nil)

	// Act
	err := service.ApproveIssue(ctx, issueID, approverID, "notes")

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "must be in pending_approval status")
	mockIssueRepo.AssertExpectations(t)
}

func TestApproveIssue_NilIssueID(t *testing.T) {
	// Arrange
	ctx := context.Background()
	mockIssueRepo := new(MockNewsletterIssueRepository)
	mockConfigRepo := new(MockNewsletterConfigRepository)
	mockAuditRepo := new(MockAuditLogRepository)

	service := NewApprovalService(mockIssueRepo, mockConfigRepo, mockAuditRepo, nil)

	// Act
	err := service.ApproveIssue(ctx, uuid.Nil, uuid.New(), "notes")

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "issue ID is required")
}

func TestApproveIssue_IssueNotReady(t *testing.T) {
	// Arrange
	ctx := context.Background()
	issueID := uuid.New()
	approverID := uuid.New()
	configID := uuid.New()

	// Issue missing selected subject line - must have at least one content block
	issue := &domain.NewsletterIssue{
		ID:                  issueID,
		ConfigurationID:     configID,
		SegmentID:           uuid.New(),
		IssueNumber:         1,
		IssueDate:           time.Now(),
		Status:              domain.IssueStatusPendingApproval,
		SubjectLines:        []string{"Test"},
		SelectedSubjectLine: nil, // Missing - should fail CanApprove()
		Blocks:              []domain.NewsletterBlock{{ID: uuid.New()}},
		CreatedAt:           time.Now(),
		UpdatedAt:           time.Now(),
	}

	mockIssueRepo := new(MockNewsletterIssueRepository)
	mockConfigRepo := new(MockNewsletterConfigRepository)
	mockAuditRepo := new(MockAuditLogRepository)

	mockIssueRepo.On("GetByID", ctx, issueID).Return(issue, nil)

	service := NewApprovalService(mockIssueRepo, mockConfigRepo, mockAuditRepo, nil)

	// Act
	err := service.ApproveIssue(ctx, issueID, approverID, "notes")

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not ready for approval")
	mockIssueRepo.AssertExpectations(t)
}

// Test RejectIssue

func TestRejectIssue_HappyPath(t *testing.T) {
	// Arrange
	ctx := context.Background()
	issueID := uuid.New()
	approverID := uuid.New()
	configID := uuid.New()
	reason := "Subject line needs improvement"

	issue := &domain.NewsletterIssue{
		ID:              issueID,
		ConfigurationID: configID,
		SegmentID:       uuid.New(),
		IssueNumber:     1,
		IssueDate:       time.Now(),
		Status:          domain.IssueStatusPendingApproval,
		SubjectLines:    []string{"Test"},
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	config := &domain.NewsletterConfiguration{
		ID:           configID,
		Name:         "Test Config",
		ApprovalTier: domain.TierTwo,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	mockIssueRepo := new(MockNewsletterIssueRepository)
	mockConfigRepo := new(MockNewsletterConfigRepository)
	mockAuditRepo := new(MockAuditLogRepository)

	mockIssueRepo.On("GetByID", ctx, issueID).Return(issue, nil)
	mockConfigRepo.On("GetByID", ctx, configID).Return(config, nil)
	mockIssueRepo.On("Update", ctx, mock.MatchedBy(func(i *domain.NewsletterIssue) bool {
		return i.ID == issueID &&
			i.Status == domain.IssueStatusDraft &&
			i.RejectedBy != nil &&
			*i.RejectedBy == approverID &&
			i.RejectedAt != nil &&
			i.RejectionReason != nil &&
			*i.RejectionReason == reason
	})).Return(nil)
	mockAuditRepo.On("Create", ctx, mock.AnythingOfType("*domain.AuditLog")).Return(nil)

	service := NewApprovalService(mockIssueRepo, mockConfigRepo, mockAuditRepo, nil)

	// Act
	err := service.RejectIssue(ctx, issueID, approverID, reason)

	// Assert
	assert.NoError(t, err)
	mockIssueRepo.AssertExpectations(t)
	mockConfigRepo.AssertExpectations(t)
	mockAuditRepo.AssertExpectations(t)
}

func TestRejectIssue_InvalidStatusTransition(t *testing.T) {
	// Arrange
	ctx := context.Background()
	issueID := uuid.New()
	approverID := uuid.New()
	configID := uuid.New()

	// Issue in draft - cannot reject from draft
	issue := &domain.NewsletterIssue{
		ID:              issueID,
		ConfigurationID: configID,
		SegmentID:       uuid.New(),
		IssueNumber:     1,
		IssueDate:       time.Now(),
		Status:          domain.IssueStatusDraft, // Wrong status
		SubjectLines:    []string{"Test"},
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	mockIssueRepo := new(MockNewsletterIssueRepository)
	mockConfigRepo := new(MockNewsletterConfigRepository)
	mockAuditRepo := new(MockAuditLogRepository)

	mockIssueRepo.On("GetByID", ctx, issueID).Return(issue, nil)

	service := NewApprovalService(mockIssueRepo, mockConfigRepo, mockAuditRepo, nil)

	// Act
	err := service.RejectIssue(ctx, issueID, approverID, "reason")

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "must be in pending_approval status")
	mockIssueRepo.AssertExpectations(t)
}

func TestRejectIssue_EmptyReason(t *testing.T) {
	// Arrange
	ctx := context.Background()
	mockIssueRepo := new(MockNewsletterIssueRepository)
	mockConfigRepo := new(MockNewsletterConfigRepository)
	mockAuditRepo := new(MockAuditLogRepository)

	service := NewApprovalService(mockIssueRepo, mockConfigRepo, mockAuditRepo, nil)

	// Act
	err := service.RejectIssue(ctx, uuid.New(), uuid.New(), "")

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "rejection reason is required")
}

func TestRejectIssue_NilApproverID(t *testing.T) {
	// Arrange
	ctx := context.Background()
	mockIssueRepo := new(MockNewsletterIssueRepository)
	mockConfigRepo := new(MockNewsletterConfigRepository)
	mockAuditRepo := new(MockAuditLogRepository)

	service := NewApprovalService(mockIssueRepo, mockConfigRepo, mockAuditRepo, nil)

	// Act
	err := service.RejectIssue(ctx, uuid.New(), uuid.Nil, "reason")

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "approver ID is required")
}

// Test SubmitForApproval

func TestSubmitForApproval_HappyPath(t *testing.T) {
	// Arrange
	ctx := context.Background()
	issueID := uuid.New()
	configID := uuid.New()
	creatorID := uuid.New()

	subjectLine := "Test Subject"
	issue := &domain.NewsletterIssue{
		ID:                  issueID,
		ConfigurationID:     configID,
		SegmentID:           uuid.New(),
		IssueNumber:         1,
		IssueDate:           time.Now(),
		Status:              domain.IssueStatusDraft,
		SubjectLines:        []string{subjectLine},
		SelectedSubjectLine: &subjectLine,
		Blocks:              []domain.NewsletterBlock{{ID: uuid.New()}},
		CreatedBy:           &creatorID,
		CreatedAt:           time.Now(),
		UpdatedAt:           time.Now(),
	}

	config := &domain.NewsletterConfiguration{
		ID:           configID,
		Name:         "Test Config",
		ApprovalTier: domain.TierOne,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	mockIssueRepo := new(MockNewsletterIssueRepository)
	mockConfigRepo := new(MockNewsletterConfigRepository)
	mockAuditRepo := new(MockAuditLogRepository)

	mockIssueRepo.On("GetByID", ctx, issueID).Return(issue, nil)
	mockConfigRepo.On("GetByID", ctx, configID).Return(config, nil)
	mockIssueRepo.On("Update", ctx, mock.MatchedBy(func(i *domain.NewsletterIssue) bool {
		return i.ID == issueID && i.Status == domain.IssueStatusPendingApproval
	})).Return(nil)
	mockAuditRepo.On("Create", ctx, mock.AnythingOfType("*domain.AuditLog")).Return(nil)

	service := NewApprovalService(mockIssueRepo, mockConfigRepo, mockAuditRepo, nil)

	// Act
	err := service.SubmitForApproval(ctx, issueID)

	// Assert
	assert.NoError(t, err)
	mockIssueRepo.AssertExpectations(t)
	mockConfigRepo.AssertExpectations(t)
	mockAuditRepo.AssertExpectations(t)
}

func TestSubmitForApproval_InvalidStatus(t *testing.T) {
	// Arrange
	ctx := context.Background()
	issueID := uuid.New()
	configID := uuid.New()

	// Issue already approved - cannot submit for approval
	issue := &domain.NewsletterIssue{
		ID:              issueID,
		ConfigurationID: configID,
		SegmentID:       uuid.New(),
		IssueNumber:     1,
		IssueDate:       time.Now(),
		Status:          domain.IssueStatusApproved, // Wrong status
		SubjectLines:    []string{"Test"},
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	mockIssueRepo := new(MockNewsletterIssueRepository)
	mockConfigRepo := new(MockNewsletterConfigRepository)
	mockAuditRepo := new(MockAuditLogRepository)

	mockIssueRepo.On("GetByID", ctx, issueID).Return(issue, nil)

	service := NewApprovalService(mockIssueRepo, mockConfigRepo, mockAuditRepo, nil)

	// Act
	err := service.SubmitForApproval(ctx, issueID)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "must be in draft status")
	mockIssueRepo.AssertExpectations(t)
}

func TestSubmitForApproval_NilIssueID(t *testing.T) {
	// Arrange
	ctx := context.Background()
	mockIssueRepo := new(MockNewsletterIssueRepository)
	mockConfigRepo := new(MockNewsletterConfigRepository)
	mockAuditRepo := new(MockAuditLogRepository)

	service := NewApprovalService(mockIssueRepo, mockConfigRepo, mockAuditRepo, nil)

	// Act
	err := service.SubmitForApproval(ctx, uuid.Nil)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "issue ID is required")
}

func TestSubmitForApproval_IssueNotReady(t *testing.T) {
	// Arrange
	ctx := context.Background()
	issueID := uuid.New()
	configID := uuid.New()

	// Issue missing blocks - must have at least one content block
	issue := &domain.NewsletterIssue{
		ID:                  issueID,
		ConfigurationID:     configID,
		SegmentID:           uuid.New(),
		IssueNumber:         1,
		IssueDate:           time.Now(),
		Status:              domain.IssueStatusDraft,
		SubjectLines:        []string{"Test"},
		SelectedSubjectLine: nil,
		Blocks:              []domain.NewsletterBlock{}, // Empty - should fail CanApprove()
		CreatedAt:           time.Now(),
		UpdatedAt:           time.Now(),
	}

	mockIssueRepo := new(MockNewsletterIssueRepository)
	mockConfigRepo := new(MockNewsletterConfigRepository)
	mockAuditRepo := new(MockAuditLogRepository)

	mockIssueRepo.On("GetByID", ctx, issueID).Return(issue, nil)

	service := NewApprovalService(mockIssueRepo, mockConfigRepo, mockAuditRepo, nil)

	// Act
	err := service.SubmitForApproval(ctx, issueID)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "must have at least one content block")
	mockIssueRepo.AssertExpectations(t)
}

// Test GetPendingApprovals

func TestGetPendingApprovals_HappyPath(t *testing.T) {
	// Arrange
	ctx := context.Background()
	tier := domain.TierTwo

	configID1 := uuid.New()
	configID2 := uuid.New()

	subjectLine := "Test"
	issues := []*domain.NewsletterIssue{
		{
			ID:                  uuid.New(),
			ConfigurationID:     configID1,
			SegmentID:           uuid.New(),
			IssueNumber:         1,
			IssueDate:           time.Now(),
			Status:              domain.IssueStatusPendingApproval,
			SubjectLines:        []string{subjectLine},
			SelectedSubjectLine: &subjectLine,
			CreatedAt:           time.Now(),
			UpdatedAt:           time.Now(),
		},
		{
			ID:                  uuid.New(),
			ConfigurationID:     configID2,
			SegmentID:           uuid.New(),
			IssueNumber:         2,
			IssueDate:           time.Now(),
			Status:              domain.IssueStatusPendingApproval,
			SubjectLines:        []string{subjectLine},
			SelectedSubjectLine: &subjectLine,
			CreatedAt:           time.Now(),
			UpdatedAt:           time.Now(),
		},
	}

	config1 := &domain.NewsletterConfiguration{
		ID:           configID1,
		Name:         "Config 1",
		ApprovalTier: domain.TierTwo,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	config2 := &domain.NewsletterConfiguration{
		ID:           configID2,
		Name:         "Config 2",
		ApprovalTier: domain.TierOne, // Different tier
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	mockIssueRepo := new(MockNewsletterIssueRepository)
	mockConfigRepo := new(MockNewsletterConfigRepository)
	mockAuditRepo := new(MockAuditLogRepository)

	mockIssueRepo.On("GetPendingApprovals", ctx).Return(issues, nil)
	mockConfigRepo.On("GetByID", ctx, configID1).Return(config1, nil)
	mockConfigRepo.On("GetByID", ctx, configID2).Return(config2, nil)

	service := NewApprovalService(mockIssueRepo, mockConfigRepo, mockAuditRepo, nil)

	// Act
	result, err := service.GetPendingApprovals(ctx, &tier)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, result, 1) // Only config1 matches TierTwo
	assert.Equal(t, configID1, result[0].ConfigurationID)
	mockIssueRepo.AssertExpectations(t)
	mockConfigRepo.AssertExpectations(t)
}

func TestGetPendingApprovals_NoTierFilter(t *testing.T) {
	// Arrange
	ctx := context.Background()

	subjectLine := "Test"
	issues := []*domain.NewsletterIssue{
		{
			ID:                  uuid.New(),
			ConfigurationID:     uuid.New(),
			SegmentID:           uuid.New(),
			IssueNumber:         1,
			IssueDate:           time.Now(),
			Status:              domain.IssueStatusPendingApproval,
			SubjectLines:        []string{subjectLine},
			SelectedSubjectLine: &subjectLine,
			CreatedAt:           time.Now(),
			UpdatedAt:           time.Now(),
		},
	}

	mockIssueRepo := new(MockNewsletterIssueRepository)
	mockConfigRepo := new(MockNewsletterConfigRepository)
	mockAuditRepo := new(MockAuditLogRepository)

	mockIssueRepo.On("GetPendingApprovals", ctx).Return(issues, nil)

	service := NewApprovalService(mockIssueRepo, mockConfigRepo, mockAuditRepo, nil)

	// Act
	result, err := service.GetPendingApprovals(ctx, nil)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, result, 1)
	mockIssueRepo.AssertExpectations(t)
}

func TestGetPendingApprovals_InvalidTier(t *testing.T) {
	// Arrange
	ctx := context.Background()
	invalidTier := domain.ApprovalTier("invalid")

	mockIssueRepo := new(MockNewsletterIssueRepository)
	mockConfigRepo := new(MockNewsletterConfigRepository)
	mockAuditRepo := new(MockAuditLogRepository)

	service := NewApprovalService(mockIssueRepo, mockConfigRepo, mockAuditRepo, nil)

	// Act
	result, err := service.GetPendingApprovals(ctx, &invalidTier)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "invalid approval tier")
}

func TestGetPendingApprovals_EmptyList(t *testing.T) {
	// Arrange
	ctx := context.Background()

	mockIssueRepo := new(MockNewsletterIssueRepository)
	mockConfigRepo := new(MockNewsletterConfigRepository)
	mockAuditRepo := new(MockAuditLogRepository)

	mockIssueRepo.On("GetPendingApprovals", ctx).Return([]*domain.NewsletterIssue{}, nil)

	service := NewApprovalService(mockIssueRepo, mockConfigRepo, mockAuditRepo, nil)

	// Act
	result, err := service.GetPendingApprovals(ctx, nil)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, result, 0)
	mockIssueRepo.AssertExpectations(t)
}

// Test CanApprove

func TestCanApprove_TierOnePermissions(t *testing.T) {
	// Arrange
	service := &ApprovalService{}

	// Act & Assert
	assert.True(t, service.CanApprove("admin", domain.TierOne))
	assert.True(t, service.CanApprove("editor", domain.TierOne))
	assert.True(t, service.CanApprove("reviewer", domain.TierOne))
	assert.False(t, service.CanApprove("user", domain.TierOne))
	assert.False(t, service.CanApprove("", domain.TierOne))
}

func TestCanApprove_TierTwoPermissions(t *testing.T) {
	// Arrange
	service := &ApprovalService{}

	// Act & Assert
	assert.True(t, service.CanApprove("admin", domain.TierTwo))
	assert.True(t, service.CanApprove("senior_reviewer", domain.TierTwo))
	assert.False(t, service.CanApprove("editor", domain.TierTwo))
	assert.False(t, service.CanApprove("reviewer", domain.TierTwo))
	assert.False(t, service.CanApprove("user", domain.TierTwo))
}

func TestCanApprove_InvalidTier(t *testing.T) {
	// Arrange
	service := &ApprovalService{}
	invalidTier := domain.ApprovalTier("invalid")

	// Act & Assert
	assert.False(t, service.CanApprove("admin", invalidTier))
}

func TestCanApprove_EmptyRole(t *testing.T) {
	// Arrange
	service := &ApprovalService{}

	// Act & Assert
	assert.False(t, service.CanApprove("", domain.TierOne))
	assert.False(t, service.CanApprove("", domain.TierTwo))
}

// Test ApproveIssue - Connectivity: Repository Failure
func TestApproveIssue_RepositoryFailure(t *testing.T) {
	// Arrange
	ctx := context.Background()
	issueID := uuid.New()
	approverID := uuid.New()

	mockIssueRepo := new(MockNewsletterIssueRepository)
	mockConfigRepo := new(MockNewsletterConfigRepository)
	mockAuditRepo := new(MockAuditLogRepository)

	mockIssueRepo.On("GetByID", ctx, issueID).Return(nil, context.DeadlineExceeded)

	service := NewApprovalService(mockIssueRepo, mockConfigRepo, mockAuditRepo, nil)

	// Act
	err := service.ApproveIssue(ctx, issueID, approverID, "notes")

	// Assert
	assert.Error(t, err)
	assert.ErrorIs(t, err, context.DeadlineExceeded)
	mockIssueRepo.AssertExpectations(t)
}

// Test ApproveIssue - Connectivity: Audit Log Write Fails
func TestApproveIssue_AuditLogWriteFailure(t *testing.T) {
	// Note: This test documents current behavior - audit log write errors
	// don't block approval (fail-open for availability)
	// If audit log failure should fail approval, this test should expect error

	// Arrange
	ctx := context.Background()
	issueID := uuid.New()
	approverID := uuid.New()
	configID := uuid.New()
	notes := "Approved"

	subjectLine := "Test Subject"
	issue := &domain.NewsletterIssue{
		ID:                  issueID,
		ConfigurationID:     configID,
		SegmentID:           uuid.New(),
		IssueNumber:         1,
		IssueDate:           time.Now(),
		Status:              domain.IssueStatusPendingApproval,
		SubjectLines:        []string{subjectLine},
		SelectedSubjectLine: &subjectLine,
		Blocks:              []domain.NewsletterBlock{{ID: uuid.New()}},
		CreatedAt:           time.Now(),
		UpdatedAt:           time.Now(),
	}

	config := &domain.NewsletterConfiguration{
		ID:           configID,
		Name:         "Test Config",
		ApprovalTier: domain.TierOne,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	mockIssueRepo := new(MockNewsletterIssueRepository)
	mockConfigRepo := new(MockNewsletterConfigRepository)
	mockAuditRepo := new(MockAuditLogRepository)

	mockIssueRepo.On("GetByID", ctx, issueID).Return(issue, nil)
	mockConfigRepo.On("GetByID", ctx, configID).Return(config, nil)
	mockIssueRepo.On("Update", ctx, mock.AnythingOfType("*domain.NewsletterIssue")).Return(nil)
	// Audit log failure is logged but doesn't fail the operation
	mockAuditRepo.On("Create", ctx, mock.AnythingOfType("*domain.AuditLog")).
		Return(context.DeadlineExceeded)

	service := NewApprovalService(mockIssueRepo, mockConfigRepo, mockAuditRepo, nil)

	// Act - should still succeed even if audit log fails
	err := service.ApproveIssue(ctx, issueID, approverID, notes)

	// Assert - approval succeeds despite audit log write failure
	assert.NoError(t, err)
	mockIssueRepo.AssertExpectations(t)
	mockConfigRepo.AssertExpectations(t)
}

// Test RejectIssue - Connectivity: Configuration Load Failure
func TestRejectIssue_ConfigurationLoadFailure(t *testing.T) {
	// Arrange
	ctx := context.Background()
	issueID := uuid.New()
	approverID := uuid.New()
	configID := uuid.New()

	issue := &domain.NewsletterIssue{
		ID:              issueID,
		ConfigurationID: configID,
		SegmentID:       uuid.New(),
		IssueNumber:     1,
		IssueDate:       time.Now(),
		Status:          domain.IssueStatusPendingApproval,
		SubjectLines:    []string{"Test"},
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	mockIssueRepo := new(MockNewsletterIssueRepository)
	mockConfigRepo := new(MockNewsletterConfigRepository)
	mockAuditRepo := new(MockAuditLogRepository)

	mockIssueRepo.On("GetByID", ctx, issueID).Return(issue, nil)
	mockConfigRepo.On("GetByID", ctx, configID).Return(nil, context.DeadlineExceeded)

	service := NewApprovalService(mockIssueRepo, mockConfigRepo, mockAuditRepo, nil)

	// Act
	err := service.RejectIssue(ctx, issueID, approverID, "reason")

	// Assert
	assert.Error(t, err)
	assert.ErrorIs(t, err, context.DeadlineExceeded)
	mockConfigRepo.AssertExpectations(t)
}

// Test SubmitForApproval - Connectivity: Update Transaction Fails
func TestSubmitForApproval_UpdateFailure(t *testing.T) {
	// Arrange
	ctx := context.Background()
	issueID := uuid.New()
	configID := uuid.New()

	subjectLine := "Test Subject"
	issue := &domain.NewsletterIssue{
		ID:                  issueID,
		ConfigurationID:     configID,
		SegmentID:           uuid.New(),
		IssueNumber:         1,
		IssueDate:           time.Now(),
		Status:              domain.IssueStatusDraft,
		SubjectLines:        []string{subjectLine},
		SelectedSubjectLine: &subjectLine,
		Blocks:              []domain.NewsletterBlock{{ID: uuid.New()}},
		CreatedAt:           time.Now(),
		UpdatedAt:           time.Now(),
	}

	config := &domain.NewsletterConfiguration{
		ID:           configID,
		Name:         "Test Config",
		ApprovalTier: domain.TierOne,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	mockIssueRepo := new(MockNewsletterIssueRepository)
	mockConfigRepo := new(MockNewsletterConfigRepository)
	mockAuditRepo := new(MockAuditLogRepository)

	mockIssueRepo.On("GetByID", ctx, issueID).Return(issue, nil)
	mockConfigRepo.On("GetByID", ctx, configID).Return(config, nil)
	mockIssueRepo.On("Update", ctx, mock.AnythingOfType("*domain.NewsletterIssue")).
		Return(context.DeadlineExceeded)

	service := NewApprovalService(mockIssueRepo, mockConfigRepo, mockAuditRepo, nil)

	// Act
	err := service.SubmitForApproval(ctx, issueID)

	// Assert
	assert.Error(t, err)
	assert.ErrorIs(t, err, context.DeadlineExceeded)
	mockIssueRepo.AssertExpectations(t)
}

// Test GetPendingApprovals - Connectivity: Repository Failure
func TestGetPendingApprovals_RepositoryFailure(t *testing.T) {
	// Arrange
	ctx := context.Background()
	expectedErr := context.DeadlineExceeded

	mockIssueRepo := new(MockNewsletterIssueRepository)
	mockConfigRepo := new(MockNewsletterConfigRepository)
	mockAuditRepo := new(MockAuditLogRepository)

	mockIssueRepo.On("GetPendingApprovals", ctx).Return(nil, expectedErr)

	service := NewApprovalService(mockIssueRepo, mockConfigRepo, mockAuditRepo, nil)

	// Act
	result, err := service.GetPendingApprovals(ctx, nil)

	// Assert
	assert.Error(t, err)
	assert.ErrorIs(t, err, expectedErr)
	assert.Nil(t, result)
	mockIssueRepo.AssertExpectations(t)
}

// Test ApproveIssue - Multi-Tenancy: Configuration Tier Isolation
func TestApproveIssue_MultiTenantTierIsolation(t *testing.T) {
	// Arrange
	ctx := context.Background()
	issueID := uuid.New()
	approverID := uuid.New()
	configID := uuid.New()
	notes := "Approved"

	subjectLine := "Test Subject"
	issue := &domain.NewsletterIssue{
		ID:                  issueID,
		ConfigurationID:     configID,
		SegmentID:           uuid.New(),
		IssueNumber:         1,
		IssueDate:           time.Now(),
		Status:              domain.IssueStatusPendingApproval,
		SubjectLines:        []string{subjectLine},
		SelectedSubjectLine: &subjectLine,
		Blocks:              []domain.NewsletterBlock{{ID: uuid.New()}},
		CreatedAt:           time.Now(),
		UpdatedAt:           time.Now(),
	}

	config := &domain.NewsletterConfiguration{
		ID:           configID,
		Name:         "Test Config - Tier Two",
		ApprovalTier: domain.TierTwo,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	mockIssueRepo := new(MockNewsletterIssueRepository)
	mockConfigRepo := new(MockNewsletterConfigRepository)
	mockAuditRepo := new(MockAuditLogRepository)

	mockIssueRepo.On("GetByID", ctx, issueID).Return(issue, nil)
	mockConfigRepo.On("GetByID", ctx, configID).Return(config, nil).Run(func(args mock.Arguments) {
		// Verify we're loading the correct config
		assert.Equal(t, configID, args.Get(1))
	})
	mockIssueRepo.On("Update", ctx, mock.MatchedBy(func(i *domain.NewsletterIssue) bool {
		// Verify the issue is approved with the correct configuration's tier
		return i.ID == issueID && i.Status == domain.IssueStatusApproved
	})).Return(nil)
	mockAuditRepo.On("Create", ctx, mock.AnythingOfType("*domain.AuditLog")).Return(nil)

	service := NewApprovalService(mockIssueRepo, mockConfigRepo, mockAuditRepo, nil)

	// Act
	err := service.ApproveIssue(ctx, issueID, approverID, notes)

	// Assert
	assert.NoError(t, err)
	// Verify the correct config was loaded for tier validation
	mockConfigRepo.AssertCalled(t, "GetByID", ctx, configID)
	mockIssueRepo.AssertExpectations(t)
}

// Test GetPendingApprovals - Multi-Tenancy: Tier Filtering
func TestGetPendingApprovals_TierFilteringValidation(t *testing.T) {
	// Arrange
	ctx := context.Background()
	tier := domain.TierTwo

	configID1 := uuid.New()
	configID2 := uuid.New()

	subjectLine := "Test"
	issues := []*domain.NewsletterIssue{
		{
			ID:                  uuid.New(),
			ConfigurationID:     configID1,
			SegmentID:           uuid.New(),
			IssueNumber:         1,
			IssueDate:           time.Now(),
			Status:              domain.IssueStatusPendingApproval,
			SubjectLines:        []string{subjectLine},
			SelectedSubjectLine: &subjectLine,
			CreatedAt:           time.Now(),
			UpdatedAt:           time.Now(),
		},
		{
			ID:                  uuid.New(),
			ConfigurationID:     configID2,
			SegmentID:           uuid.New(),
			IssueNumber:         2,
			IssueDate:           time.Now(),
			Status:              domain.IssueStatusPendingApproval,
			SubjectLines:        []string{subjectLine},
			SelectedSubjectLine: &subjectLine,
			CreatedAt:           time.Now(),
			UpdatedAt:           time.Now(),
		},
	}

	config1 := &domain.NewsletterConfiguration{
		ID:           configID1,
		Name:         "Tier Two Config",
		ApprovalTier: domain.TierTwo,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	config2 := &domain.NewsletterConfiguration{
		ID:           configID2,
		Name:         "Tier One Config",
		ApprovalTier: domain.TierOne,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	mockIssueRepo := new(MockNewsletterIssueRepository)
	mockConfigRepo := new(MockNewsletterConfigRepository)
	mockAuditRepo := new(MockAuditLogRepository)

	mockIssueRepo.On("GetPendingApprovals", ctx).Return(issues, nil)
	mockConfigRepo.On("GetByID", ctx, configID1).Return(config1, nil)
	mockConfigRepo.On("GetByID", ctx, configID2).Return(config2, nil)

	service := NewApprovalService(mockIssueRepo, mockConfigRepo, mockAuditRepo, nil)

	// Act
	result, err := service.GetPendingApprovals(ctx, &tier)

	// Assert
	assert.NoError(t, err)
	// Only Tier Two config issues should be returned
	assert.Len(t, result, 1)
	assert.Equal(t, configID1, result[0].ConfigurationID)
	// Verify Tier One config was filtered out
	assert.NotEqual(t, configID2, result[0].ConfigurationID)

	mockIssueRepo.AssertExpectations(t)
	mockConfigRepo.AssertExpectations(t)
}
