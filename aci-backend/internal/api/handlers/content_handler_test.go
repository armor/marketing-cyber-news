package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/service"
)

// ============================================================================
// Mock Content Service
// ============================================================================

type MockContentService struct {
	mock.Mock
}

func (m *MockContentService) CreateContentSource(ctx context.Context, source *domain.ContentSource) error {
	args := m.Called(ctx, source)
	return args.Error(0)
}

func (m *MockContentService) GetContentSourceByID(ctx context.Context, id uuid.UUID) (*domain.ContentSource, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.ContentSource), args.Error(1)
}

func (m *MockContentService) ListContentSources(ctx context.Context, filter *domain.ContentSourceFilter) ([]*domain.ContentSource, int, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]*domain.ContentSource), args.Int(1), args.Error(2)
}

func (m *MockContentService) UpdateContentSource(ctx context.Context, source *domain.ContentSource) error {
	args := m.Called(ctx, source)
	return args.Error(0)
}

func (m *MockContentService) DeleteContentSource(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockContentService) GetActiveSources(ctx context.Context) ([]*domain.ContentSource, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.ContentSource), args.Error(1)
}

func (m *MockContentService) TestFeed(ctx context.Context, feedURL string) (*service.FeedTestResult, error) {
	args := m.Called(ctx, feedURL)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*service.FeedTestResult), args.Error(1)
}

func (m *MockContentService) GetPollingStatus(ctx context.Context, sourceID uuid.UUID) (*service.PollingStatus, error) {
	args := m.Called(ctx, sourceID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*service.PollingStatus), args.Error(1)
}

func (m *MockContentService) UpdateSourcePollingStatus(ctx context.Context, id uuid.UUID, success bool, errorMsg *string) error {
	args := m.Called(ctx, id, success, errorMsg)
	return args.Error(0)
}

func (m *MockContentService) BulkCreateContentItems(ctx context.Context, items []*domain.ContentItem) error {
	args := m.Called(ctx, items)
	return args.Error(0)
}

func (m *MockContentService) CreateContentItem(ctx context.Context, item *domain.ContentItem) error {
	args := m.Called(ctx, item)
	return args.Error(0)
}

func (m *MockContentService) GetContentItemByID(ctx context.Context, id uuid.UUID) (*domain.ContentItem, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.ContentItem), args.Error(1)
}

func (m *MockContentService) ListContentItems(ctx context.Context, filter *domain.ContentItemFilter) ([]*domain.ContentItem, int, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]*domain.ContentItem), args.Int(1), args.Error(2)
}

func (m *MockContentService) UpdateContentItem(ctx context.Context, item *domain.ContentItem) error {
	args := m.Called(ctx, item)
	return args.Error(0)
}

func (m *MockContentService) DeleteContentItem(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockContentService) GetFreshContent(ctx context.Context, daysThreshold int, topicTags []string, limit int) ([]*domain.ContentItem, error) {
	args := m.Called(ctx, daysThreshold, topicTags, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.ContentItem), args.Error(1)
}

func (m *MockContentService) GetContentForSegment(ctx context.Context, criteria *service.ContentSelectionCriteria) (*service.ContentSelectionResult, error) {
	args := m.Called(ctx, criteria)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*service.ContentSelectionResult), args.Error(1)
}

func (m *MockContentService) GetContentItemByURL(ctx context.Context, url string) (*domain.ContentItem, error) {
	args := m.Called(ctx, url)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.ContentItem), args.Error(1)
}

// ============================================================================
// Test Helpers
// ============================================================================

func setupContentHandlerTest(t *testing.T) (*ContentHandler, *MockContentService) {
	mockService := new(MockContentService)
	handler := NewContentHandler(mockService)
	return handler, mockService
}

func createTestContentSource() *domain.ContentSource {
	feedURL := "https://example.com/feed.rss"
	return &domain.ContentSource{
		ID:                  uuid.New(),
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
		CreatedAt:           time.Now(),
		UpdatedAt:           time.Now(),
	}
}

func createTestContentItem() *domain.ContentItem {
	return &domain.ContentItem{
		ID:             uuid.New(),
		SourceID:       uuid.New(),
		Title:          "Test Article",
		URL:            "https://example.com/article",
		ContentType:    domain.ContentTypeBlog,
		PublishDate:    time.Now().Add(-24 * time.Hour),
		TrustScore:     0.9,
		RelevanceScore: 0.85,
		IsActive:       true,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}
}

func contextWithUser(userID uuid.UUID) context.Context {
	ctx := context.Background()
	// Use plain string key to match getUserIDFromContext in helpers.go
	return context.WithValue(ctx, "user_id", userID)
}

// ============================================================================
// CreateContentSource Handler Tests
// ============================================================================

func TestCreateContentSource_Success(t *testing.T) {
	// Arrange
	handler, mockService := setupContentHandlerTest(t)
	userID := uuid.New()

	reqBody := CreateContentSourceRequest{
		Name:                "Test Feed",
		SourceType:          "rss",
		FeedURL:             stringPtr("https://example.com/feed.rss"),
		TrustScore:          0.8,
		MinTrustThreshold:   0.5,
		FreshnessDays:       7,
		PollIntervalMinutes: 120,
		IsInternal:          false,
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/v1/content-sources", bytes.NewBuffer(body))
	req = req.WithContext(contextWithUser(userID))
	w := httptest.NewRecorder()

	mockService.On("CreateContentSource", mock.Anything, mock.AnythingOfType("*domain.ContentSource")).Return(nil)

	// Act
	handler.CreateContentSource(w, req)

	// Assert
	assert.Equal(t, http.StatusCreated, w.Code)
	mockService.AssertExpectations(t)
}

func TestCreateContentSource_InvalidJSON(t *testing.T) {
	// Arrange
	handler, _ := setupContentHandlerTest(t)
	userID := uuid.New()

	req := httptest.NewRequest(http.MethodPost, "/v1/content-sources", bytes.NewBufferString("{invalid json}"))
	req = req.WithContext(contextWithUser(userID))
	w := httptest.NewRecorder()

	// Act
	handler.CreateContentSource(w, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCreateContentSource_InvalidFeedURL(t *testing.T) {
	// Arrange
	handler, _ := setupContentHandlerTest(t)
	userID := uuid.New()

	reqBody := CreateContentSourceRequest{
		Name:                "Test Feed",
		SourceType:          "rss",
		FeedURL:             stringPtr("not-a-valid-url"),
		TrustScore:          0.8,
		FreshnessDays:       7,
		PollIntervalMinutes: 120,
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/v1/content-sources", bytes.NewBuffer(body))
	req = req.WithContext(contextWithUser(userID))
	w := httptest.NewRecorder()

	// Act
	handler.CreateContentSource(w, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCreateContentSource_InvalidPollingInterval(t *testing.T) {
	testCases := []struct {
		name     string
		interval int
	}{
		{"below minimum", 30},
		{"above maximum", 2000},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Arrange
			handler, _ := setupContentHandlerTest(t)
			userID := uuid.New()

			reqBody := CreateContentSourceRequest{
				Name:                "Test Feed",
				SourceType:          "rss",
				FeedURL:             stringPtr("https://example.com/feed.rss"),
				TrustScore:          0.8,
				PollIntervalMinutes: tc.interval,
			}

			body, _ := json.Marshal(reqBody)
			req := httptest.NewRequest(http.MethodPost, "/v1/content-sources", bytes.NewBuffer(body))
			req = req.WithContext(contextWithUser(userID))
			w := httptest.NewRecorder()

			// Act
			handler.CreateContentSource(w, req)

			// Assert
			assert.Equal(t, http.StatusBadRequest, w.Code)
		})
	}
}

func TestCreateContentSource_Unauthenticated(t *testing.T) {
	// Arrange
	handler, _ := setupContentHandlerTest(t)

	reqBody := CreateContentSourceRequest{
		Name:                "Test Feed",
		SourceType:          "rss",
		FeedURL:             stringPtr("https://example.com/feed.rss"),
		TrustScore:          0.8,
		PollIntervalMinutes: 120,
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/v1/content-sources", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	// Act
	handler.CreateContentSource(w, req)

	// Assert
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestCreateContentSource_ServiceError(t *testing.T) {
	// Arrange
	handler, mockService := setupContentHandlerTest(t)
	userID := uuid.New()

	reqBody := CreateContentSourceRequest{
		Name:                "Test Feed",
		SourceType:          "rss",
		FeedURL:             stringPtr("https://example.com/feed.rss"),
		TrustScore:          0.8,
		PollIntervalMinutes: 120,
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/v1/content-sources", bytes.NewBuffer(body))
	req = req.WithContext(contextWithUser(userID))
	w := httptest.NewRecorder()

	mockService.On("CreateContentSource", mock.Anything, mock.AnythingOfType("*domain.ContentSource")).
		Return(errors.New("database error"))

	// Act
	handler.CreateContentSource(w, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, w.Code)
	mockService.AssertExpectations(t)
}

// ============================================================================
// UpdateContentSource Handler Tests
// ============================================================================

func TestUpdateContentSource_Success(t *testing.T) {
	// Arrange
	handler, mockService := setupContentHandlerTest(t)
	sourceID := uuid.New()

	existingSource := createTestContentSource()
	existingSource.ID = sourceID

	newName := "Updated Feed Name"
	reqBody := UpdateContentSourceRequest{
		Name: &newName,
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPut, fmt.Sprintf("/v1/content-sources/%s", sourceID), bytes.NewBuffer(body))
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", sourceID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	w := httptest.NewRecorder()

	mockService.On("GetContentSourceByID", mock.Anything, sourceID).Return(existingSource, nil)
	mockService.On("UpdateContentSource", mock.Anything, mock.AnythingOfType("*domain.ContentSource")).Return(nil)

	// Act
	handler.UpdateContentSource(w, req)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)
	mockService.AssertExpectations(t)
}

func TestUpdateContentSource_InvalidID(t *testing.T) {
	// Arrange
	handler, _ := setupContentHandlerTest(t)

	reqBody := UpdateContentSourceRequest{}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPut, "/v1/content-sources/invalid-uuid", bytes.NewBuffer(body))
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "invalid-uuid")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	w := httptest.NewRecorder()

	// Act
	handler.UpdateContentSource(w, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestUpdateContentSource_NotFound(t *testing.T) {
	// Arrange
	handler, mockService := setupContentHandlerTest(t)
	sourceID := uuid.New()

	reqBody := UpdateContentSourceRequest{}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPut, fmt.Sprintf("/v1/content-sources/%s", sourceID), bytes.NewBuffer(body))
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", sourceID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	w := httptest.NewRecorder()

	mockService.On("GetContentSourceByID", mock.Anything, sourceID).Return(nil, errors.New("not found"))

	// Act
	handler.UpdateContentSource(w, req)

	// Assert
	assert.Equal(t, http.StatusNotFound, w.Code)
	mockService.AssertExpectations(t)
}

func TestUpdateContentSource_InvalidPollingInterval(t *testing.T) {
	// Arrange
	handler, mockService := setupContentHandlerTest(t)
	sourceID := uuid.New()

	existingSource := createTestContentSource()
	existingSource.ID = sourceID

	invalidInterval := 30
	reqBody := UpdateContentSourceRequest{
		PollIntervalMinutes: &invalidInterval,
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPut, fmt.Sprintf("/v1/content-sources/%s", sourceID), bytes.NewBuffer(body))
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", sourceID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	w := httptest.NewRecorder()

	mockService.On("GetContentSourceByID", mock.Anything, sourceID).Return(existingSource, nil)

	// Act
	handler.UpdateContentSource(w, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, w.Code)
	mockService.AssertExpectations(t)
}

// ============================================================================
// ListContentSources Handler Tests
// ============================================================================

func TestListContentSources_Success(t *testing.T) {
	// Arrange
	handler, mockService := setupContentHandlerTest(t)

	sources := []*domain.ContentSource{
		createTestContentSource(),
		createTestContentSource(),
	}

	req := httptest.NewRequest(http.MethodGet, "/v1/content-sources", nil)
	w := httptest.NewRecorder()

	mockService.On("ListContentSources", mock.Anything, mock.AnythingOfType("*domain.ContentSourceFilter")).
		Return(sources, 2, nil)

	// Act
	handler.ListContentSources(w, req)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.NewDecoder(w.Body).Decode(&response)
	assert.NotNil(t, response["data"])
	assert.NotNil(t, response["pagination"])

	mockService.AssertExpectations(t)
}

func TestListContentSources_WithFilters(t *testing.T) {
	// Arrange
	handler, mockService := setupContentHandlerTest(t)

	req := httptest.NewRequest(http.MethodGet, "/v1/content-sources?is_active=true&source_type=rss&page=2&page_size=10", nil)
	w := httptest.NewRecorder()

	mockService.On("ListContentSources", mock.Anything, mock.MatchedBy(func(filter *domain.ContentSourceFilter) bool {
		return filter.Limit == 10 && filter.Offset == 10 && *filter.IsActive == true
	})).Return([]*domain.ContentSource{}, 0, nil)

	// Act
	handler.ListContentSources(w, req)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)
	mockService.AssertExpectations(t)
}

func TestListContentSources_InvalidPageParameter(t *testing.T) {
	// Arrange
	handler, _ := setupContentHandlerTest(t)

	req := httptest.NewRequest(http.MethodGet, "/v1/content-sources?page=invalid", nil)
	w := httptest.NewRecorder()

	// Act
	handler.ListContentSources(w, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestListContentSources_EmptyResult(t *testing.T) {
	// Arrange
	handler, mockService := setupContentHandlerTest(t)

	req := httptest.NewRequest(http.MethodGet, "/v1/content-sources", nil)
	w := httptest.NewRecorder()

	mockService.On("ListContentSources", mock.Anything, mock.AnythingOfType("*domain.ContentSourceFilter")).
		Return([]*domain.ContentSource{}, 0, nil)

	// Act
	handler.ListContentSources(w, req)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.NewDecoder(w.Body).Decode(&response)
	data := response["data"].([]interface{})
	assert.Empty(t, data)

	mockService.AssertExpectations(t)
}

// ============================================================================
// TestFeed Handler Tests
// ============================================================================

func TestTestFeed_Success(t *testing.T) {
	// Arrange
	handler, mockService := setupContentHandlerTest(t)

	reqBody := map[string]string{
		"feed_url": "https://example.com/feed.rss",
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/v1/newsletter/content-sources/test-feed", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	mockService.On("TestFeed", mock.Anything, "https://example.com/feed.rss").Return(&service.FeedTestResult{
		IsValid:     true,
		Title:       "Example Feed",
		ItemCount:   10,
		LastUpdated: time.Now(),
	}, nil)

	// Act
	handler.TestFeed(w, req)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.NewDecoder(w.Body).Decode(&response)
	data := response["data"].(map[string]interface{})
	assert.True(t, data["is_valid"].(bool))

	mockService.AssertExpectations(t)
}

func TestTestFeed_EmptyURL(t *testing.T) {
	// Arrange
	handler, _ := setupContentHandlerTest(t)

	reqBody := map[string]string{
		"feed_url": "",
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/v1/newsletter/content-sources/test-feed", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	// Act
	handler.TestFeed(w, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestTestFeed_InvalidURLFormat(t *testing.T) {
	// Arrange
	handler, _ := setupContentHandlerTest(t)

	reqBody := map[string]string{
		"feed_url": "not-a-valid-url",
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/v1/newsletter/content-sources/test-feed", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	// Act
	handler.TestFeed(w, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestTestFeed_InvalidJSON(t *testing.T) {
	// Arrange
	handler, _ := setupContentHandlerTest(t)

	req := httptest.NewRequest(http.MethodPost, "/v1/newsletter/content-sources/test-feed", bytes.NewBufferString("{invalid}"))
	w := httptest.NewRecorder()

	// Act
	handler.TestFeed(w, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestTestFeed_ServiceError(t *testing.T) {
	// Arrange
	handler, mockService := setupContentHandlerTest(t)

	reqBody := map[string]string{
		"feed_url": "https://example.com/feed.rss",
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/v1/newsletter/content-sources/test-feed", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	mockService.On("TestFeed", mock.Anything, "https://example.com/feed.rss").
		Return(nil, errors.New("network timeout"))

	// Act
	handler.TestFeed(w, req)

	// Assert
	assert.Equal(t, http.StatusInternalServerError, w.Code)
	mockService.AssertExpectations(t)
}

// ============================================================================
// GetPollingStatus Handler Tests
// ============================================================================

func TestGetPollingStatus_Success(t *testing.T) {
	// Arrange
	handler, mockService := setupContentHandlerTest(t)
	sourceID := uuid.New()

	lastPolled := time.Now().Add(-2 * time.Hour)
	nextPoll := time.Now().Add(10 * time.Minute)

	req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/v1/newsletter/content-sources/%s/status", sourceID), nil)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", sourceID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	w := httptest.NewRecorder()

	mockService.On("GetPollingStatus", mock.Anything, sourceID).Return(&service.PollingStatus{
		LastPolledAt: &lastPolled,
		NextPollAt:   &nextPoll,
		ItemCount:    15,
		ErrorCount:   2,
	}, nil)

	// Act
	handler.GetPollingStatus(w, req)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.NewDecoder(w.Body).Decode(&response)
	data := response["data"].(map[string]interface{})
	assert.Equal(t, float64(15), data["item_count"])
	assert.Equal(t, float64(2), data["error_count"])

	mockService.AssertExpectations(t)
}

func TestGetPollingStatus_InvalidID(t *testing.T) {
	// Arrange
	handler, _ := setupContentHandlerTest(t)

	req := httptest.NewRequest(http.MethodGet, "/v1/newsletter/content-sources/invalid-uuid/status", nil)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "invalid-uuid")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	w := httptest.NewRecorder()

	// Act
	handler.GetPollingStatus(w, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGetPollingStatus_NotFound(t *testing.T) {
	// Arrange
	handler, mockService := setupContentHandlerTest(t)
	sourceID := uuid.New()

	req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/v1/newsletter/content-sources/%s/status", sourceID), nil)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", sourceID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	w := httptest.NewRecorder()

	mockService.On("GetPollingStatus", mock.Anything, sourceID).Return(nil, errors.New("not found"))

	// Act
	handler.GetPollingStatus(w, req)

	// Assert
	assert.Equal(t, http.StatusNotFound, w.Code)
	mockService.AssertExpectations(t)
}

// ============================================================================
// DeleteContentSource Handler Tests
// ============================================================================

func TestDeleteContentSource_Success(t *testing.T) {
	// Arrange
	handler, mockService := setupContentHandlerTest(t)
	sourceID := uuid.New()

	req := httptest.NewRequest(http.MethodDelete, fmt.Sprintf("/v1/content-sources/%s", sourceID), nil)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", sourceID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	w := httptest.NewRecorder()

	mockService.On("DeleteContentSource", mock.Anything, sourceID).Return(nil)

	// Act
	handler.DeleteContentSource(w, req)

	// Assert
	assert.Equal(t, http.StatusNoContent, w.Code)
	mockService.AssertExpectations(t)
}

func TestDeleteContentSource_InvalidID(t *testing.T) {
	// Arrange
	handler, _ := setupContentHandlerTest(t)

	req := httptest.NewRequest(http.MethodDelete, "/v1/content-sources/invalid-uuid", nil)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", "invalid-uuid")
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	w := httptest.NewRecorder()

	// Act
	handler.DeleteContentSource(w, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestDeleteContentSource_ServiceError(t *testing.T) {
	// Arrange
	handler, mockService := setupContentHandlerTest(t)
	sourceID := uuid.New()

	req := httptest.NewRequest(http.MethodDelete, fmt.Sprintf("/v1/content-sources/%s", sourceID), nil)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", sourceID.String())
	req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
	w := httptest.NewRecorder()

	mockService.On("DeleteContentSource", mock.Anything, sourceID).Return(errors.New("database error"))

	// Act
	handler.DeleteContentSource(w, req)

	// Assert
	assert.Equal(t, http.StatusInternalServerError, w.Code)
	mockService.AssertExpectations(t)
}

// ============================================================================
// Helper Functions
// ============================================================================

func stringPtr(s string) *string {
	return &s
}

func intPtr(i int) *int {
	return &i
}

func boolPtr(b bool) *bool {
	return &b
}

// ============================================================================
// Mock Metadata Extractor
// ============================================================================

type MockMetadataExtractor struct {
	mock.Mock
}

func (m *MockMetadataExtractor) ExtractMetadata(ctx context.Context, url string) (*service.ExtractedMetadata, error) {
	args := m.Called(ctx, url)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*service.ExtractedMetadata), args.Error(1)
}

// ============================================================================
// ExtractURLMetadata Handler Tests
// ============================================================================

func TestExtractURLMetadata_Success(t *testing.T) {
	// Arrange
	mockService := new(MockContentService)
	handler := NewContentHandler(mockService)
	mockExtractor := new(MockMetadataExtractor)
	handler.SetMetadataExtractor(mockExtractor)

	reqBody := map[string]string{
		"url": "https://example.com/article",
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/v1/content/metadata", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	expectedMetadata := &service.ExtractedMetadata{
		URL:             "https://example.com/article",
		Title:           "Example Article",
		Description:     stringPtr("This is an example article"),
		ImageURL:        stringPtr("https://example.com/image.jpg"),
		ReadTimeMinutes: intPtr(5),
	}

	mockExtractor.On("ExtractMetadata", mock.Anything, "https://example.com/article").
		Return(expectedMetadata, nil)

	// Act
	handler.ExtractURLMetadata(w, req)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.NewDecoder(w.Body).Decode(&response)
	assert.NotNil(t, response["data"])

	mockExtractor.AssertExpectations(t)
}

func TestExtractURLMetadata_InvalidURL(t *testing.T) {
	// Arrange
	mockService := new(MockContentService)
	handler := NewContentHandler(mockService)

	reqBody := map[string]string{
		"url": "not-a-valid-url",
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/v1/content/metadata", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	// Act
	handler.ExtractURLMetadata(w, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestExtractURLMetadata_EmptyURL(t *testing.T) {
	// Arrange
	mockService := new(MockContentService)
	handler := NewContentHandler(mockService)

	reqBody := map[string]string{
		"url": "",
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/v1/content/metadata", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	// Act
	handler.ExtractURLMetadata(w, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestExtractURLMetadata_InvalidJSON(t *testing.T) {
	// Arrange
	mockService := new(MockContentService)
	handler := NewContentHandler(mockService)

	req := httptest.NewRequest(http.MethodPost, "/v1/content/metadata", bytes.NewBufferString("{invalid json}"))
	w := httptest.NewRecorder()

	// Act
	handler.ExtractURLMetadata(w, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestExtractURLMetadata_SSRFProtectionBlocksPrivateIP(t *testing.T) {
	// Arrange
	mockService := new(MockContentService)
	handler := NewContentHandler(mockService)
	mockExtractor := new(MockMetadataExtractor)
	handler.SetMetadataExtractor(mockExtractor)

	reqBody := map[string]string{
		"url": "http://192.168.1.1",
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/v1/content/metadata", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	mockExtractor.On("ExtractMetadata", mock.Anything, "http://192.168.1.1").
		Return(nil, errors.New("connection to private/blocked IP not allowed"))

	// Act
	handler.ExtractURLMetadata(w, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, w.Code)
	mockExtractor.AssertExpectations(t)
}

func TestExtractURLMetadata_SSRFProtectionBlocksMetadataEndpoint(t *testing.T) {
	// Arrange
	mockService := new(MockContentService)
	handler := NewContentHandler(mockService)
	mockExtractor := new(MockMetadataExtractor)
	handler.SetMetadataExtractor(mockExtractor)

	reqBody := map[string]string{
		"url": "http://169.254.169.254/latest/meta-data/",
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/v1/content/metadata", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	mockExtractor.On("ExtractMetadata", mock.Anything, "http://169.254.169.254/latest/meta-data/").
		Return(nil, errors.New("blocked hostname"))

	// Act
	handler.ExtractURLMetadata(w, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, w.Code)
	mockExtractor.AssertExpectations(t)
}

func TestExtractURLMetadata_TimeoutHandling(t *testing.T) {
	// Arrange
	mockService := new(MockContentService)
	handler := NewContentHandler(mockService)
	mockExtractor := new(MockMetadataExtractor)
	handler.SetMetadataExtractor(mockExtractor)

	reqBody := map[string]string{
		"url": "https://slow-example.com/article",
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/v1/content/metadata", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	mockExtractor.On("ExtractMetadata", mock.Anything, "https://slow-example.com/article").
		Return(nil, errors.New("context deadline exceeded"))

	// Act
	handler.ExtractURLMetadata(w, req)

	// Assert
	assert.Equal(t, http.StatusRequestTimeout, w.Code)
	mockExtractor.AssertExpectations(t)
}

func TestExtractURLMetadata_ServiceError(t *testing.T) {
	// Arrange
	mockService := new(MockContentService)
	handler := NewContentHandler(mockService)
	mockExtractor := new(MockMetadataExtractor)
	handler.SetMetadataExtractor(mockExtractor)

	reqBody := map[string]string{
		"url": "https://example.com/article",
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/v1/content/metadata", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	mockExtractor.On("ExtractMetadata", mock.Anything, "https://example.com/article").
		Return(nil, errors.New("internal server error"))

	// Act
	handler.ExtractURLMetadata(w, req)

	// Assert
	assert.Equal(t, http.StatusInternalServerError, w.Code)
	mockExtractor.AssertExpectations(t)
}

// ============================================================================
// CreateManualContentItem Handler Tests
// ============================================================================

func TestCreateManualContentItem_Success(t *testing.T) {
	// Arrange
	mockService := new(MockContentService)
	handler := NewContentHandler(mockService)
	userID := uuid.New()

	reqBody := map[string]interface{}{
		"url":          "https://example.com/article",
		"title":        "Example Article",
		"content_type": "blog",
		"topic_tags":   []string{"security", "news"},
		"author":       stringPtr("John Doe"),
		"publish_date": stringPtr("2024-01-15"),
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/v1/content/items/manual", bytes.NewBuffer(body))
	req = req.WithContext(contextWithUser(userID))
	w := httptest.NewRecorder()

	mockService.On("CreateContentItem", mock.Anything, mock.MatchedBy(func(item *domain.ContentItem) bool {
		return item.Title == "Example Article" && item.URL == "https://example.com/article"
	})).Return(nil)

	// Act
	handler.CreateManualContentItem(w, req)

	// Assert
	assert.Equal(t, http.StatusCreated, w.Code)
	mockService.AssertExpectations(t)
}

func TestCreateManualContentItem_MissingRequiredFields(t *testing.T) {
	testCases := []struct {
		name      string
		reqBody   map[string]interface{}
		fieldName string
	}{
		{
			name: "missing url",
			reqBody: map[string]interface{}{
				"title":        "Example Article",
				"content_type": "blog",
			},
			fieldName: "url",
		},
		{
			name: "missing title",
			reqBody: map[string]interface{}{
				"url":          "https://example.com/article",
				"content_type": "blog",
			},
			fieldName: "title",
		},
		{
			name: "missing content_type",
			reqBody: map[string]interface{}{
				"url":   "https://example.com/article",
				"title": "Example Article",
			},
			fieldName: "content_type",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Arrange
			mockService := new(MockContentService)
			handler := NewContentHandler(mockService)
			userID := uuid.New()

			body, _ := json.Marshal(tc.reqBody)
			req := httptest.NewRequest(http.MethodPost, "/v1/content/items/manual", bytes.NewBuffer(body))
			req = req.WithContext(contextWithUser(userID))
			w := httptest.NewRecorder()

			// Act
			handler.CreateManualContentItem(w, req)

			// Assert
			assert.Equal(t, http.StatusBadRequest, w.Code)
		})
	}
}

func TestCreateManualContentItem_InvalidURL(t *testing.T) {
	// Arrange
	mockService := new(MockContentService)
	handler := NewContentHandler(mockService)
	userID := uuid.New()

	reqBody := map[string]interface{}{
		"url":          "not-a-valid-url",
		"title":        "Example Article",
		"content_type": "blog",
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/v1/content/items/manual", bytes.NewBuffer(body))
	req = req.WithContext(contextWithUser(userID))
	w := httptest.NewRecorder()

	// Act
	handler.CreateManualContentItem(w, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCreateManualContentItem_InvalidContentType(t *testing.T) {
	// Arrange
	mockService := new(MockContentService)
	handler := NewContentHandler(mockService)
	userID := uuid.New()

	reqBody := map[string]interface{}{
		"url":          "https://example.com/article",
		"title":        "Example Article",
		"content_type": "invalid_type",
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/v1/content/items/manual", bytes.NewBuffer(body))
	req = req.WithContext(contextWithUser(userID))
	w := httptest.NewRecorder()

	// Act
	handler.CreateManualContentItem(w, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCreateManualContentItem_DuplicateURL(t *testing.T) {
	// Arrange
	mockService := new(MockContentService)
	handler := NewContentHandler(mockService)
	userID := uuid.New()

	reqBody := map[string]interface{}{
		"url":          "https://example.com/article",
		"title":        "Example Article",
		"content_type": "blog",
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/v1/content/items/manual", bytes.NewBuffer(body))
	req = req.WithContext(contextWithUser(userID))
	w := httptest.NewRecorder()

	mockService.On("GetContentItemByURL", mock.Anything, "https://example.com/article").
		Return(&domain.ContentItem{URL: "https://example.com/article"}, nil)

	// Act
	handler.CreateManualContentItem(w, req)

	// Assert
	assert.Equal(t, http.StatusConflict, w.Code)
	mockService.AssertExpectations(t)
}

func TestCreateManualContentItem_InvalidJSON(t *testing.T) {
	// Arrange
	mockService := new(MockContentService)
	handler := NewContentHandler(mockService)
	userID := uuid.New()

	req := httptest.NewRequest(http.MethodPost, "/v1/content/items/manual", bytes.NewBufferString("{invalid json}"))
	req = req.WithContext(contextWithUser(userID))
	w := httptest.NewRecorder()

	// Act
	handler.CreateManualContentItem(w, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCreateManualContentItem_Unauthenticated(t *testing.T) {
	// Arrange
	mockService := new(MockContentService)
	handler := NewContentHandler(mockService)

	reqBody := map[string]interface{}{
		"url":          "https://example.com/article",
		"title":        "Example Article",
		"content_type": "blog",
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/v1/content/items/manual", bytes.NewBuffer(body))
	w := httptest.NewRecorder()

	// Act
	handler.CreateManualContentItem(w, req)

	// Assert
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestCreateManualContentItem_ServiceError(t *testing.T) {
	// Arrange
	mockService := new(MockContentService)
	handler := NewContentHandler(mockService)
	userID := uuid.New()

	reqBody := map[string]interface{}{
		"url":          "https://example.com/article",
		"title":        "Example Article",
		"content_type": "blog",
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/v1/content/items/manual", bytes.NewBuffer(body))
	req = req.WithContext(contextWithUser(userID))
	w := httptest.NewRecorder()

	mockService.On("GetContentItemByURL", mock.Anything, "https://example.com/article").
		Return(nil, nil)
	mockService.On("CreateContentItem", mock.Anything, mock.MatchedBy(func(item *domain.ContentItem) bool {
		return item.Title == "Example Article"
	})).Return(errors.New("database error"))

	// Act
	handler.CreateManualContentItem(w, req)

	// Assert
	assert.Equal(t, http.StatusInternalServerError, w.Code)
	mockService.AssertExpectations(t)
}

func TestCreateManualContentItem_WithOptionalFields(t *testing.T) {
	// Arrange
	mockService := new(MockContentService)
	handler := NewContentHandler(mockService)
	userID := uuid.New()

	reqBody := map[string]interface{}{
		"url":            "https://example.com/article",
		"title":          "Example Article",
		"content_type":   "blog",
		"topic_tags":     []string{"security", "news"},
		"framework_tags": []string{"owasp", "nist"},
		"summary":        stringPtr("An important security article"),
		"author":         stringPtr("Jane Doe"),
		"publish_date":   stringPtr("2024-01-15"),
		"image_url":      stringPtr("https://example.com/image.jpg"),
	}

	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/v1/content/items/manual", bytes.NewBuffer(body))
	req = req.WithContext(contextWithUser(userID))
	w := httptest.NewRecorder()

	mockService.On("GetContentItemByURL", mock.Anything, "https://example.com/article").
		Return(nil, nil)
	mockService.On("CreateContentItem", mock.Anything, mock.MatchedBy(func(item *domain.ContentItem) bool {
		return item.Title == "Example Article" && len(item.TopicTags) == 2
	})).Return(nil)

	// Act
	handler.CreateManualContentItem(w, req)

	// Assert
	assert.Equal(t, http.StatusCreated, w.Code)
	mockService.AssertExpectations(t)
}
