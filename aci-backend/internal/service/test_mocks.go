package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"

	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/domain/entities"
)

// Shared mock repositories for all service tests
// This file prevents duplicate mock definitions across test files

// MockNewsletterIssueRepository is a mock implementation of NewsletterIssueRepository
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

// MockNewsletterConfigRepository is a mock implementation of NewsletterConfigRepository
type MockNewsletterConfigRepository struct {
	mock.Mock
}

func (m *MockNewsletterConfigRepository) Create(ctx context.Context, config *domain.NewsletterConfiguration) error {
	args := m.Called(ctx, config)
	return args.Error(0)
}

func (m *MockNewsletterConfigRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.NewsletterConfiguration, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.NewsletterConfiguration), args.Error(1)
}

func (m *MockNewsletterConfigRepository) List(ctx context.Context, filter *domain.NewsletterConfigFilter) ([]*domain.NewsletterConfiguration, int, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]*domain.NewsletterConfiguration), args.Int(1), args.Error(2)
}

func (m *MockNewsletterConfigRepository) Update(ctx context.Context, config *domain.NewsletterConfiguration) error {
	args := m.Called(ctx, config)
	return args.Error(0)
}

func (m *MockNewsletterConfigRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockNewsletterConfigRepository) GetBySegmentID(ctx context.Context, segmentID uuid.UUID) ([]*domain.NewsletterConfiguration, error) {
	args := m.Called(ctx, segmentID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.NewsletterConfiguration), args.Error(1)
}

// MockAuditLogRepository is a mock implementation of AuditLogRepository
type MockAuditLogRepository struct {
	mock.Mock
}

func (m *MockAuditLogRepository) Create(ctx context.Context, log *domain.AuditLog) error {
	args := m.Called(ctx, log)
	return args.Error(0)
}

func (m *MockAuditLogRepository) List(ctx context.Context, filter *domain.AuditLogFilter) ([]*domain.AuditLog, int, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]*domain.AuditLog), args.Int(1), args.Error(2)
}

func (m *MockAuditLogRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.AuditLog, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.AuditLog), args.Error(1)
}

// MockContactRepository is a mock implementation of ContactRepository
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

func (m *MockContactRepository) List(ctx context.Context, filter *domain.ContactFilter) ([]*domain.Contact, int, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]*domain.Contact), args.Int(1), args.Error(2)
}

func (m *MockContactRepository) Update(ctx context.Context, contact *domain.Contact) error {
	args := m.Called(ctx, contact)
	return args.Error(0)
}

func (m *MockContactRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
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

func (m *MockContactRepository) MarkUnsubscribed(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockContactRepository) MarkBounced(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

// MockTestVariantRepository is a mock implementation of TestVariantRepository
type MockTestVariantRepository struct {
	mock.Mock
}

func (m *MockTestVariantRepository) Create(ctx context.Context, variant *domain.TestVariant) error {
	args := m.Called(ctx, variant)
	return args.Error(0)
}

func (m *MockTestVariantRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.TestVariant, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.TestVariant), args.Error(1)
}

func (m *MockTestVariantRepository) GetByIssueID(ctx context.Context, issueID uuid.UUID) ([]*domain.TestVariant, error) {
	args := m.Called(ctx, issueID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.TestVariant), args.Error(1)
}

func (m *MockTestVariantRepository) Update(ctx context.Context, variant *domain.TestVariant) error {
	args := m.Called(ctx, variant)
	return args.Error(0)
}

func (m *MockTestVariantRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockTestVariantRepository) BulkCreate(ctx context.Context, variants []*domain.TestVariant) error {
	args := m.Called(ctx, variants)
	return args.Error(0)
}

func (m *MockTestVariantRepository) UpdateResults(ctx context.Context, id uuid.UUID, opens, clicks int) error {
	args := m.Called(ctx, id, opens, clicks)
	return args.Error(0)
}

func (m *MockTestVariantRepository) DeclareWinner(ctx context.Context, id uuid.UUID, significance float64) error {
	args := m.Called(ctx, id, significance)
	return args.Error(0)
}

func (m *MockTestVariantRepository) GetWinner(ctx context.Context, issueID uuid.UUID) (*domain.TestVariant, error) {
	args := m.Called(ctx, issueID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.TestVariant), args.Error(1)
}

// MockEngagementEventRepository is a mock implementation of EngagementEventRepository
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

// MockSegmentRepository is a mock implementation of SegmentRepository
type MockSegmentRepository struct {
	mock.Mock
}

func (m *MockSegmentRepository) Create(ctx context.Context, segment *domain.Segment) error {
	args := m.Called(ctx, segment)
	return args.Error(0)
}

func (m *MockSegmentRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Segment, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Segment), args.Error(1)
}

func (m *MockSegmentRepository) List(ctx context.Context, filter *domain.SegmentFilter) ([]*domain.Segment, int, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]*domain.Segment), args.Int(1), args.Error(2)
}

func (m *MockSegmentRepository) Update(ctx context.Context, segment *domain.Segment) error {
	args := m.Called(ctx, segment)
	return args.Error(0)
}

func (m *MockSegmentRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockSegmentRepository) UpdateContactCount(ctx context.Context, id uuid.UUID, count int) error {
	args := m.Called(ctx, id, count)
	return args.Error(0)
}

// MockUserRepository is a mock implementation of UserRepository
// SEC-003: Added for tier-based approval validation testing
type MockUserRepository struct {
	mock.Mock
}

func (m *MockUserRepository) Create(ctx context.Context, user *entities.User) error {
	args := m.Called(ctx, user)
	return args.Error(0)
}

func (m *MockUserRepository) GetByID(ctx context.Context, id uuid.UUID) (*entities.User, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*entities.User), args.Error(1)
}

func (m *MockUserRepository) GetByEmail(ctx context.Context, email string) (*entities.User, error) {
	args := m.Called(ctx, email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*entities.User), args.Error(1)
}

func (m *MockUserRepository) Update(ctx context.Context, user *entities.User) error {
	args := m.Called(ctx, user)
	return args.Error(0)
}

func (m *MockUserRepository) UpdateLastLogin(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockUserRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}
