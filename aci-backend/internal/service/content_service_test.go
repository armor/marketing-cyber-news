package service

import (
	"context"
	"errors"
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

type MockContentSourceRepository struct {
	mock.Mock
}

func (m *MockContentSourceRepository) Create(ctx context.Context, source *domain.ContentSource) error {
	args := m.Called(ctx, source)
	return args.Error(0)
}

func (m *MockContentSourceRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.ContentSource, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.ContentSource), args.Error(1)
}

func (m *MockContentSourceRepository) List(ctx context.Context, filter *domain.ContentSourceFilter) ([]*domain.ContentSource, int, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]*domain.ContentSource), args.Int(1), args.Error(2)
}

func (m *MockContentSourceRepository) Update(ctx context.Context, source *domain.ContentSource) error {
	args := m.Called(ctx, source)
	return args.Error(0)
}

func (m *MockContentSourceRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockContentSourceRepository) GetActiveSources(ctx context.Context) ([]*domain.ContentSource, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.ContentSource), args.Error(1)
}

func (m *MockContentSourceRepository) UpdateLastPolled(ctx context.Context, id uuid.UUID, polledAt time.Time, success bool, errorMsg *string) error {
	args := m.Called(ctx, id, polledAt, success, errorMsg)
	return args.Error(0)
}

type MockContentItemRepository struct {
	mock.Mock
}

func (m *MockContentItemRepository) Create(ctx context.Context, item *domain.ContentItem) error {
	args := m.Called(ctx, item)
	return args.Error(0)
}

func (m *MockContentItemRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.ContentItem, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.ContentItem), args.Error(1)
}

func (m *MockContentItemRepository) GetByURL(ctx context.Context, url string) (*domain.ContentItem, error) {
	args := m.Called(ctx, url)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.ContentItem), args.Error(1)
}

func (m *MockContentItemRepository) List(ctx context.Context, filter *domain.ContentItemFilter) ([]*domain.ContentItem, int, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]*domain.ContentItem), args.Int(1), args.Error(2)
}

func (m *MockContentItemRepository) Update(ctx context.Context, item *domain.ContentItem) error {
	args := m.Called(ctx, item)
	return args.Error(0)
}

func (m *MockContentItemRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockContentItemRepository) BulkCreate(ctx context.Context, items []*domain.ContentItem) error {
	args := m.Called(ctx, items)
	return args.Error(0)
}

func (m *MockContentItemRepository) UpdateHistoricalMetrics(ctx context.Context, id uuid.UUID, opens, clicks int) error {
	args := m.Called(ctx, id, opens, clicks)
	return args.Error(0)
}

func (m *MockContentItemRepository) GetFreshContent(ctx context.Context, daysThreshold int, topicTags []string, limit int) ([]*domain.ContentItem, error) {
	args := m.Called(ctx, daysThreshold, topicTags, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.ContentItem), args.Error(1)
}

func (m *MockContentItemRepository) GetByIDs(ctx context.Context, ids []uuid.UUID) ([]*domain.ContentItem, error) {
	args := m.Called(ctx, ids)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.ContentItem), args.Error(1)
}

// Segment, NewsletterConfig, and AuditLog mocks are already defined in test_mocks.go

// ============================================================================
// Test Helpers
// ============================================================================

func setupContentServiceTest(t *testing.T) (*ContentService, *MockContentSourceRepository, *MockContentItemRepository, *MockSegmentRepository, *MockNewsletterConfigRepository, *MockAuditLogRepository) {
	mockContentItemRepo := new(MockContentItemRepository)
	mockContentSourceRepo := new(MockContentSourceRepository)
	mockSegmentRepo := new(MockSegmentRepository)
	mockConfigRepo := new(MockNewsletterConfigRepository)
	mockAuditLogRepo := new(MockAuditLogRepository)

	service := NewContentService(
		mockContentItemRepo,
		mockContentSourceRepo,
		mockSegmentRepo,
		mockConfigRepo,
		mockAuditLogRepo,
	)

	return service, mockContentSourceRepo, mockContentItemRepo, mockSegmentRepo, mockConfigRepo, mockAuditLogRepo
}

func createValidContentSource() *domain.ContentSource {
	feedURL := "https://example.com/feed.rss"
	return &domain.ContentSource{
		Name:                "Test Feed",
		SourceType:          domain.SourceTypeRSS,
		FeedURL:             &feedURL,
		TrustScore:          0.8,
		MinTrustThreshold:   0.5,
		FreshnessDays:       7,
		PollIntervalMinutes: 120,
		IsActive:            true,
		IsInternal:          false,
		CreatedBy:           uuid.New(),
	}
}

func createValidContentItem() *domain.ContentItem {
	return &domain.ContentItem{
		SourceID:       uuid.New(),
		Title:          "Test Article",
		URL:            "https://example.com/article",
		ContentType:    domain.ContentTypeBlog,
		PublishDate:    time.Now().Add(-24 * time.Hour),
		TrustScore:     0.9,
		RelevanceScore: 0.85,
		IsActive:       true,
	}
}

// ============================================================================
// CreateContentSource Tests
// ============================================================================

func TestCreateContentSource_Success(t *testing.T) {
	// Arrange
	service, mockSourceRepo, _, _, _, mockAuditLogRepo := setupContentServiceTest(t)
	ctx := context.Background()

	source := createValidContentSource()

	mockSourceRepo.On("Create", ctx, mock.AnythingOfType("*domain.ContentSource")).Return(nil)
	mockAuditLogRepo.On("Create", ctx, mock.AnythingOfType("*domain.AuditLog")).Return(nil)

	// Act
	err := service.CreateContentSource(ctx, source)

	// Assert
	assert.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, source.ID, "Source ID should be generated")
	assert.True(t, source.IsActive, "Source should be active by default")
	mockSourceRepo.AssertExpectations(t)
	mockAuditLogRepo.AssertExpectations(t)
}

func TestCreateContentSource_NilSource(t *testing.T) {
	// Arrange
	service, _, _, _, _, _ := setupContentServiceTest(t)
	ctx := context.Background()

	// Act
	err := service.CreateContentSource(ctx, nil)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "cannot be nil")
}

func TestCreateContentSource_InvalidURL(t *testing.T) {
	// Arrange
	service, _, _, _, _, _ := setupContentServiceTest(t)
	ctx := context.Background()

	source := createValidContentSource()
	invalidURL := "not-a-valid-url"
	source.FeedURL = &invalidURL

	// Act
	err := service.CreateContentSource(ctx, source)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "validation failed")
}

func TestCreateContentSource_TrustScoreOutOfRange(t *testing.T) {
	testCases := []struct {
		name       string
		trustScore float64
	}{
		{"below zero", -0.1},
		{"above one", 1.5},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Arrange
			service, _, _, _, _, _ := setupContentServiceTest(t)
			ctx := context.Background()

			source := createValidContentSource()
			source.TrustScore = tc.trustScore

			// Act
			err := service.CreateContentSource(ctx, source)

			// Assert
			assert.Error(t, err)
			assert.Contains(t, err.Error(), "trust_score must be between 0.0 and 1.0")
		})
	}
}

func TestCreateContentSource_RSSWithoutFeedURL(t *testing.T) {
	// Arrange
	service, _, _, _, _, _ := setupContentServiceTest(t)
	ctx := context.Background()

	source := createValidContentSource()
	source.FeedURL = nil

	// Act
	err := service.CreateContentSource(ctx, source)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "feed_url is required")
}

func TestCreateContentSource_RepositoryError(t *testing.T) {
	// Arrange
	service, mockSourceRepo, _, _, _, mockAuditLogRepo := setupContentServiceTest(t)
	ctx := context.Background()

	source := createValidContentSource()
	mockSourceRepo.On("Create", ctx, mock.AnythingOfType("*domain.ContentSource")).Return(errors.New("database error"))

	// Act
	err := service.CreateContentSource(ctx, source)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to create content source")
	mockSourceRepo.AssertExpectations(t)
	mockAuditLogRepo.AssertNotCalled(t, "Create")
}

// ============================================================================
// UpdateContentSource Tests
// ============================================================================

func TestUpdateContentSource_Success(t *testing.T) {
	// Arrange
	service, mockSourceRepo, _, _, _, _ := setupContentServiceTest(t)
	ctx := context.Background()

	existing := createValidContentSource()
	existing.ID = uuid.New()
	existing.CreatedAt = time.Now().Add(-24 * time.Hour)

	updated := createValidContentSource()
	updated.ID = existing.ID
	updated.Name = "Updated Feed Name"

	mockSourceRepo.On("GetByID", ctx, existing.ID).Return(existing, nil)
	mockSourceRepo.On("Update", ctx, mock.AnythingOfType("*domain.ContentSource")).Return(nil)

	// Act
	err := service.UpdateContentSource(ctx, updated)

	// Assert
	assert.NoError(t, err)
	assert.Equal(t, "Updated Feed Name", updated.Name)
	assert.Equal(t, existing.CreatedAt, updated.CreatedAt, "CreatedAt should be preserved")
	mockSourceRepo.AssertExpectations(t)
}

func TestUpdateContentSource_NilSource(t *testing.T) {
	// Arrange
	service, _, _, _, _, _ := setupContentServiceTest(t)
	ctx := context.Background()

	// Act
	err := service.UpdateContentSource(ctx, nil)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "cannot be nil")
}

func TestUpdateContentSource_NilID(t *testing.T) {
	// Arrange
	service, _, _, _, _, _ := setupContentServiceTest(t)
	ctx := context.Background()

	source := createValidContentSource()
	source.ID = uuid.Nil

	// Act
	err := service.UpdateContentSource(ctx, source)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "ID is required")
}

func TestUpdateContentSource_NotFound(t *testing.T) {
	// Arrange
	service, mockSourceRepo, _, _, _, _ := setupContentServiceTest(t)
	ctx := context.Background()

	source := createValidContentSource()
	source.ID = uuid.New()

	mockSourceRepo.On("GetByID", ctx, source.ID).Return(nil, errors.New("not found"))

	// Act
	err := service.UpdateContentSource(ctx, source)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not found")
	mockSourceRepo.AssertExpectations(t)
}

// ============================================================================
// GetActiveSources Tests
// ============================================================================

func TestGetActiveSources_Success(t *testing.T) {
	// Arrange
	service, mockSourceRepo, _, _, _, _ := setupContentServiceTest(t)
	ctx := context.Background()

	source1 := createValidContentSource()
	source1.ID = uuid.New()
	source1.IsActive = true

	source2 := createValidContentSource()
	source2.ID = uuid.New()
	source2.IsActive = true

	expectedSources := []*domain.ContentSource{source1, source2}

	mockSourceRepo.On("GetActiveSources", ctx).Return(expectedSources, nil)

	// Act
	sources, err := service.GetActiveSources(ctx)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, sources, 2)
	assert.True(t, sources[0].IsActive)
	assert.True(t, sources[1].IsActive)
	mockSourceRepo.AssertExpectations(t)
}

func TestGetActiveSources_EmptyList(t *testing.T) {
	// Arrange
	service, mockSourceRepo, _, _, _, _ := setupContentServiceTest(t)
	ctx := context.Background()

	mockSourceRepo.On("GetActiveSources", ctx).Return([]*domain.ContentSource{}, nil)

	// Act
	sources, err := service.GetActiveSources(ctx)

	// Assert
	assert.NoError(t, err)
	assert.Empty(t, sources)
	mockSourceRepo.AssertExpectations(t)
}

func TestGetActiveSources_RepositoryError(t *testing.T) {
	// Arrange
	service, mockSourceRepo, _, _, _, _ := setupContentServiceTest(t)
	ctx := context.Background()

	mockSourceRepo.On("GetActiveSources", ctx).Return(nil, errors.New("database error"))

	// Act
	sources, err := service.GetActiveSources(ctx)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, sources)
	mockSourceRepo.AssertExpectations(t)
}

// ============================================================================
// TestFeed Tests
// ============================================================================

func TestTestFeed_Success(t *testing.T) {
	// Arrange
	service, _, _, _, _, _ := setupContentServiceTest(t)
	ctx := context.Background()

	feedURL := "https://example.com/feed.rss"

	// Act
	result, err := service.TestFeed(ctx, feedURL)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.True(t, result.IsValid, "Valid URL should pass validation")
}

func TestTestFeed_EmptyURL(t *testing.T) {
	// Arrange
	service, _, _, _, _, _ := setupContentServiceTest(t)
	ctx := context.Background()

	// Act
	result, err := service.TestFeed(ctx, "")

	// Assert
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "feed URL is required")
}

func TestTestFeed_InvalidURLFormat(t *testing.T) {
	testCases := []struct {
		name string
		url  string
	}{
		{"no scheme", "example.com/feed"},
		{"ftp scheme", "ftp://example.com/feed"},
		{"too short", "http://a"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Arrange
			service, _, _, _, _, _ := setupContentServiceTest(t)
			ctx := context.Background()

			// Act
			result, err := service.TestFeed(ctx, tc.url)

			// Assert
			assert.NoError(t, err, "TestFeed should not return error, but validation result")
			assert.NotNil(t, result)
			assert.False(t, result.IsValid, "Invalid URL should fail validation")
			assert.NotEmpty(t, result.ErrorMessage)
		})
	}
}

func TestTestFeed_ValidHTTPSURL(t *testing.T) {
	// Arrange
	service, _, _, _, _, _ := setupContentServiceTest(t)
	ctx := context.Background()

	// Act
	result, err := service.TestFeed(ctx, "https://secure.example.com/feed.xml")

	// Assert
	assert.NoError(t, err)
	assert.True(t, result.IsValid)
}

// ============================================================================
// GetPollingStatus Tests
// ============================================================================

func TestGetPollingStatus_Success(t *testing.T) {
	// Arrange
	service, mockSourceRepo, mockItemRepo, _, _, _ := setupContentServiceTest(t)
	ctx := context.Background()

	sourceID := uuid.New()
	lastPolled := time.Now().Add(-2 * time.Hour)

	source := createValidContentSource()
	source.ID = sourceID
	source.LastPolledAt = &lastPolled
	source.PollIntervalMinutes = 120
	source.ErrorCount = 2

	mockSourceRepo.On("GetByID", ctx, sourceID).Return(source, nil)
	mockItemRepo.On("List", ctx, mock.AnythingOfType("*domain.ContentItemFilter")).Return([]*domain.ContentItem{}, 5, nil)

	// Act
	status, err := service.GetPollingStatus(ctx, sourceID)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, status)
	assert.Equal(t, 5, status.ItemCount)
	assert.Equal(t, 2, status.ErrorCount)
	assert.NotNil(t, status.NextPollAt, "NextPollAt should be calculated")
	mockSourceRepo.AssertExpectations(t)
	mockItemRepo.AssertExpectations(t)
}

func TestGetPollingStatus_NilSourceID(t *testing.T) {
	// Arrange
	service, _, _, _, _, _ := setupContentServiceTest(t)
	ctx := context.Background()

	// Act
	status, err := service.GetPollingStatus(ctx, uuid.Nil)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, status)
	assert.Contains(t, err.Error(), "ID is required")
}

func TestGetPollingStatus_SourceNotFound(t *testing.T) {
	// Arrange
	service, mockSourceRepo, _, _, _, _ := setupContentServiceTest(t)
	ctx := context.Background()

	sourceID := uuid.New()
	mockSourceRepo.On("GetByID", ctx, sourceID).Return(nil, errors.New("not found"))

	// Act
	status, err := service.GetPollingStatus(ctx, sourceID)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, status)
	mockSourceRepo.AssertExpectations(t)
}

func TestGetPollingStatus_NeverPolled(t *testing.T) {
	// Arrange
	service, mockSourceRepo, mockItemRepo, _, _, _ := setupContentServiceTest(t)
	ctx := context.Background()

	sourceID := uuid.New()
	source := createValidContentSource()
	source.ID = sourceID
	source.LastPolledAt = nil

	mockSourceRepo.On("GetByID", ctx, sourceID).Return(source, nil)
	mockItemRepo.On("List", ctx, mock.AnythingOfType("*domain.ContentItemFilter")).Return([]*domain.ContentItem{}, 0, nil)

	// Act
	status, err := service.GetPollingStatus(ctx, sourceID)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, status)
	assert.Nil(t, status.LastPolledAt)
	assert.Nil(t, status.NextPollAt, "NextPollAt should be nil when never polled")
	mockSourceRepo.AssertExpectations(t)
}

// ============================================================================
// UpdateSourcePollingStatus Tests
// ============================================================================

func TestUpdateSourcePollingStatus_Success(t *testing.T) {
	// Arrange
	service, mockSourceRepo, _, _, _, _ := setupContentServiceTest(t)
	ctx := context.Background()

	sourceID := uuid.New()
	mockSourceRepo.On("UpdateLastPolled", ctx, sourceID, mock.AnythingOfType("time.Time"), true, (*string)(nil)).Return(nil)

	// Act
	err := service.UpdateSourcePollingStatus(ctx, sourceID, true, nil)

	// Assert
	assert.NoError(t, err)
	mockSourceRepo.AssertExpectations(t)
}

func TestUpdateSourcePollingStatus_WithError(t *testing.T) {
	// Arrange
	service, mockSourceRepo, _, _, _, _ := setupContentServiceTest(t)
	ctx := context.Background()

	sourceID := uuid.New()
	errorMsg := "timeout fetching feed"

	mockSourceRepo.On("UpdateLastPolled", ctx, sourceID, mock.AnythingOfType("time.Time"), false, &errorMsg).Return(nil)

	// Act
	err := service.UpdateSourcePollingStatus(ctx, sourceID, false, &errorMsg)

	// Assert
	assert.NoError(t, err)
	mockSourceRepo.AssertExpectations(t)
}

func TestUpdateSourcePollingStatus_NilID(t *testing.T) {
	// Arrange
	service, _, _, _, _, _ := setupContentServiceTest(t)
	ctx := context.Background()

	// Act
	err := service.UpdateSourcePollingStatus(ctx, uuid.Nil, true, nil)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "ID is required")
}

func TestUpdateSourcePollingStatus_RepositoryError(t *testing.T) {
	// Arrange
	service, mockSourceRepo, _, _, _, _ := setupContentServiceTest(t)
	ctx := context.Background()

	sourceID := uuid.New()
	mockSourceRepo.On("UpdateLastPolled", ctx, sourceID, mock.AnythingOfType("time.Time"), true, (*string)(nil)).Return(errors.New("database error"))

	// Act
	err := service.UpdateSourcePollingStatus(ctx, sourceID, true, nil)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to update polling status")
	mockSourceRepo.AssertExpectations(t)
}

// ============================================================================
// BulkCreateContentItems Tests
// ============================================================================

func TestBulkCreateContentItems_Success(t *testing.T) {
	// Arrange
	service, _, mockItemRepo, _, _, _ := setupContentServiceTest(t)
	ctx := context.Background()

	items := []*domain.ContentItem{
		createValidContentItem(),
		createValidContentItem(),
		createValidContentItem(),
	}

	mockItemRepo.On("BulkCreate", ctx, mock.AnythingOfType("[]*domain.ContentItem")).Return(nil)

	// Act
	err := service.BulkCreateContentItems(ctx, items)

	// Assert
	assert.NoError(t, err)
	for _, item := range items {
		assert.NotEqual(t, uuid.Nil, item.ID, "Item ID should be generated")
		assert.True(t, item.IsActive, "Item should be active")
	}
	mockItemRepo.AssertExpectations(t)
}

func TestBulkCreateContentItems_EmptyList(t *testing.T) {
	// Arrange
	service, _, mockItemRepo, _, _, _ := setupContentServiceTest(t)
	ctx := context.Background()

	// Act
	err := service.BulkCreateContentItems(ctx, []*domain.ContentItem{})

	// Assert
	assert.NoError(t, err, "Empty list should not cause error")
	mockItemRepo.AssertNotCalled(t, "BulkCreate")
}

func TestBulkCreateContentItems_ValidationFailure(t *testing.T) {
	// Arrange
	service, _, _, _, _, _ := setupContentServiceTest(t)
	ctx := context.Background()

	items := []*domain.ContentItem{
		createValidContentItem(),
		{
			// Invalid item - missing required fields
			SourceID:    uuid.Nil,
			Title:       "",
			URL:         "",
			ContentType: domain.ContentTypeBlog,
		},
	}

	// Act
	err := service.BulkCreateContentItems(ctx, items)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "validation failed")
}

func TestBulkCreateContentItems_RepositoryError(t *testing.T) {
	// Arrange
	service, _, mockItemRepo, _, _, _ := setupContentServiceTest(t)
	ctx := context.Background()

	items := []*domain.ContentItem{createValidContentItem()}
	mockItemRepo.On("BulkCreate", ctx, mock.AnythingOfType("[]*domain.ContentItem")).Return(errors.New("database error"))

	// Act
	err := service.BulkCreateContentItems(ctx, items)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to bulk create")
	mockItemRepo.AssertExpectations(t)
}

// ============================================================================
// Edge Cases and Data Segregation Tests
// ============================================================================

func TestContentSource_TrustScoreValidation_Boundaries(t *testing.T) {
	testCases := []struct {
		name       string
		trustScore float64
		valid      bool
	}{
		{"exactly zero", 0.0, true},
		{"exactly one", 1.0, true},
		{"middle value", 0.5, true},
		{"slightly below zero", -0.000001, false},
		{"slightly above one", 1.000001, false},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Arrange
			service, mockSourceRepo, _, _, _, mockAuditLogRepo := setupContentServiceTest(t)
			ctx := context.Background()

			source := createValidContentSource()
			source.TrustScore = tc.trustScore

			if tc.valid {
				mockSourceRepo.On("Create", ctx, mock.AnythingOfType("*domain.ContentSource")).Return(nil)
				mockAuditLogRepo.On("Create", ctx, mock.AnythingOfType("*domain.AuditLog")).Return(nil)
			}

			// Act
			err := service.CreateContentSource(ctx, source)

			// Assert
			if tc.valid {
				assert.NoError(t, err)
			} else {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), "trust_score must be between 0.0 and 1.0")
			}
		})
	}
}

func TestContentSource_FreshnessDaysThreshold(t *testing.T) {
	testCases := []struct {
		name          string
		freshnessDays int
		valid         bool
	}{
		{"zero days", 0, true},
		{"one day", 1, true},
		{"seven days", 7, true},
		{"negative days", -1, false},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Arrange
			service, mockSourceRepo, _, _, _, mockAuditLogRepo := setupContentServiceTest(t)
			ctx := context.Background()

			source := createValidContentSource()
			source.FreshnessDays = tc.freshnessDays

			if tc.valid {
				mockSourceRepo.On("Create", ctx, mock.AnythingOfType("*domain.ContentSource")).Return(nil)
				mockAuditLogRepo.On("Create", ctx, mock.AnythingOfType("*domain.AuditLog")).Return(nil)
			}

			// Act
			err := service.CreateContentSource(ctx, source)

			// Assert
			if tc.valid {
				assert.NoError(t, err)
			} else {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), "freshness_days must be non-negative")
			}
		})
	}
}

func TestGetFreshContent_Success(t *testing.T) {
	// Arrange
	service, _, mockItemRepo, _, _, _ := setupContentServiceTest(t)
	ctx := context.Background()

	daysThreshold := 7
	topicTags := []string{"security", "compliance"}
	limit := 10

	expectedItems := []*domain.ContentItem{
		createValidContentItem(),
		createValidContentItem(),
	}

	mockItemRepo.On("GetFreshContent", ctx, daysThreshold, topicTags, limit).Return(expectedItems, nil)

	// Act
	items, err := service.GetFreshContent(ctx, daysThreshold, topicTags, limit)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, items, 2)
	mockItemRepo.AssertExpectations(t)
}

func TestGetFreshContent_DefaultParameters(t *testing.T) {
	// Arrange
	service, _, mockItemRepo, _, _, _ := setupContentServiceTest(t)
	ctx := context.Background()

	mockItemRepo.On("GetFreshContent", ctx, 7, []string(nil), 20).Return([]*domain.ContentItem{}, nil)

	// Act
	items, err := service.GetFreshContent(ctx, 0, nil, 0)

	// Assert
	assert.NoError(t, err)
	assert.Empty(t, items)
	mockItemRepo.AssertExpectations(t)
}

// ============================================================================
// Connectivity and Timeout Tests
// ============================================================================

func TestCreateContentSource_TimeoutSimulation(t *testing.T) {
	// Arrange
	service, mockSourceRepo, _, _, _, _ := setupContentServiceTest(t)
	ctx := context.Background()

	source := createValidContentSource()
	mockSourceRepo.On("Create", ctx, mock.AnythingOfType("*domain.ContentSource")).
		Return(errors.New("context deadline exceeded"))

	// Act
	err := service.CreateContentSource(ctx, source)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to create content source")
	mockSourceRepo.AssertExpectations(t)
}

func TestGetActiveSources_ConnectionFailure(t *testing.T) {
	// Arrange
	service, mockSourceRepo, _, _, _, _ := setupContentServiceTest(t)
	ctx := context.Background()

	mockSourceRepo.On("GetActiveSources", ctx).
		Return(nil, errors.New("connection refused"))

	// Act
	sources, err := service.GetActiveSources(ctx)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, sources)
	mockSourceRepo.AssertExpectations(t)
}

func TestUpdateSourcePollingStatus_NetworkError(t *testing.T) {
	// Arrange
	service, mockSourceRepo, _, _, _, _ := setupContentServiceTest(t)
	ctx := context.Background()

	sourceID := uuid.New()
	errorMsg := "network timeout"

	mockSourceRepo.On("UpdateLastPolled", ctx, sourceID, mock.AnythingOfType("time.Time"), false, &errorMsg).
		Return(errors.New("connection lost"))

	// Act
	err := service.UpdateSourcePollingStatus(ctx, sourceID, false, &errorMsg)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to update polling status")
	mockSourceRepo.AssertExpectations(t)
}
