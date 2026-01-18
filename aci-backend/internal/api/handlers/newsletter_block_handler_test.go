package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/phillipboles/aci-backend/internal/api/dto"
	"github.com/phillipboles/aci-backend/internal/domain"
)

// ============================================================================
// Mock Repositories for Newsletter Block Handler Tests
// ============================================================================

type MockNewsletterBlockRepository struct {
	mock.Mock
}

func (m *MockNewsletterBlockRepository) Create(ctx context.Context, block *domain.NewsletterBlock) error {
	args := m.Called(ctx, block)
	return args.Error(0)
}

func (m *MockNewsletterBlockRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.NewsletterBlock, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.NewsletterBlock), args.Error(1)
}

func (m *MockNewsletterBlockRepository) GetExistingContentItemIDs(ctx context.Context, issueID uuid.UUID, contentItemIDs []uuid.UUID) ([]uuid.UUID, error) {
	args := m.Called(ctx, issueID, contentItemIDs)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]uuid.UUID), args.Error(1)
}

func (m *MockNewsletterBlockRepository) BulkCreate(ctx context.Context, blocks []*domain.NewsletterBlock) error {
	args := m.Called(ctx, blocks)
	return args.Error(0)
}

func (m *MockNewsletterBlockRepository) GetByIssueID(ctx context.Context, issueID uuid.UUID) ([]*domain.NewsletterBlock, error) {
	args := m.Called(ctx, issueID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.NewsletterBlock), args.Error(1)
}

func (m *MockNewsletterBlockRepository) Update(ctx context.Context, block *domain.NewsletterBlock) error {
	args := m.Called(ctx, block)
	return args.Error(0)
}

func (m *MockNewsletterBlockRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockNewsletterBlockRepository) GetMaxPosition(ctx context.Context, issueID uuid.UUID) (int, error) {
	args := m.Called(ctx, issueID)
	return args.Int(0), args.Error(1)
}

func (m *MockNewsletterBlockRepository) BulkCreateWithLock(ctx context.Context, issueID uuid.UUID, blocks []*domain.NewsletterBlock) error {
	args := m.Called(ctx, issueID, blocks)
	return args.Error(0)
}

func (m *MockNewsletterBlockRepository) UpdatePositions(ctx context.Context, issueID uuid.UUID, positions map[uuid.UUID]int) error {
	args := m.Called(ctx, issueID, positions)
	return args.Error(0)
}

func (m *MockNewsletterBlockRepository) IncrementClicks(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockNewsletterBlockRepository) GetMaxPositionForUpdate(ctx context.Context, tx pgx.Tx, issueID uuid.UUID) (int, error) {
	args := m.Called(ctx, tx, issueID)
	return args.Int(0), args.Error(1)
}

type MockContentItemRepoForBlocks struct {
	mock.Mock
}

func (m *MockContentItemRepoForBlocks) Create(ctx context.Context, item *domain.ContentItem) error {
	args := m.Called(ctx, item)
	return args.Error(0)
}

func (m *MockContentItemRepoForBlocks) GetByID(ctx context.Context, id uuid.UUID) (*domain.ContentItem, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.ContentItem), args.Error(1)
}

func (m *MockContentItemRepoForBlocks) GetByURL(ctx context.Context, url string) (*domain.ContentItem, error) {
	args := m.Called(ctx, url)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.ContentItem), args.Error(1)
}

func (m *MockContentItemRepoForBlocks) BulkCreate(ctx context.Context, items []*domain.ContentItem) error {
	args := m.Called(ctx, items)
	return args.Error(0)
}

func (m *MockContentItemRepoForBlocks) List(ctx context.Context, filter *domain.ContentItemFilter) ([]*domain.ContentItem, int, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]*domain.ContentItem), args.Int(1), args.Error(2)
}

func (m *MockContentItemRepoForBlocks) Update(ctx context.Context, item *domain.ContentItem) error {
	args := m.Called(ctx, item)
	return args.Error(0)
}

func (m *MockContentItemRepoForBlocks) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockContentItemRepoForBlocks) GetByIDs(ctx context.Context, ids []uuid.UUID) ([]*domain.ContentItem, error) {
	args := m.Called(ctx, ids)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.ContentItem), args.Error(1)
}

func (m *MockContentItemRepoForBlocks) UpdateHistoricalMetrics(ctx context.Context, id uuid.UUID, opens, clicks int) error {
	args := m.Called(ctx, id, opens, clicks)
	return args.Error(0)
}

func (m *MockContentItemRepoForBlocks) GetFreshContent(ctx context.Context, daysThreshold int, topicTags []string, limit int) ([]*domain.ContentItem, error) {
	args := m.Called(ctx, daysThreshold, topicTags, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.ContentItem), args.Error(1)
}

type MockNewsletterIssueRepositoryForBlocks struct {
	mock.Mock
}

func (m *MockNewsletterIssueRepositoryForBlocks) GetByID(ctx context.Context, id uuid.UUID) (*domain.NewsletterIssue, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.NewsletterIssue), args.Error(1)
}

func (m *MockNewsletterIssueRepositoryForBlocks) Create(ctx context.Context, issue *domain.NewsletterIssue) error {
	args := m.Called(ctx, issue)
	return args.Error(0)
}

func (m *MockNewsletterIssueRepositoryForBlocks) List(ctx context.Context, filter *domain.NewsletterIssueFilter) ([]*domain.NewsletterIssue, int, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]*domain.NewsletterIssue), args.Int(1), args.Error(2)
}

func (m *MockNewsletterIssueRepositoryForBlocks) Update(ctx context.Context, issue *domain.NewsletterIssue) error {
	args := m.Called(ctx, issue)
	return args.Error(0)
}

func (m *MockNewsletterIssueRepositoryForBlocks) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockNewsletterIssueRepositoryForBlocks) GetByConfigAndNumber(ctx context.Context, configID uuid.UUID, number int) (*domain.NewsletterIssue, error) {
	args := m.Called(ctx, configID, number)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.NewsletterIssue), args.Error(1)
}

func (m *MockNewsletterIssueRepositoryForBlocks) GetNextIssueNumber(ctx context.Context, configID uuid.UUID) (int, error) {
	args := m.Called(ctx, configID)
	return args.Int(0), args.Error(1)
}

func (m *MockNewsletterIssueRepositoryForBlocks) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.IssueStatus) error {
	args := m.Called(ctx, id, status)
	return args.Error(0)
}

func (m *MockNewsletterIssueRepositoryForBlocks) UpdateMetrics(ctx context.Context, id uuid.UUID, recipients, delivered, opens, clicks, bounces, unsubscribes, complaints int) error {
	args := m.Called(ctx, id, recipients, delivered, opens, clicks, bounces, unsubscribes, complaints)
	return args.Error(0)
}

func (m *MockNewsletterIssueRepositoryForBlocks) GetPendingApprovals(ctx context.Context) ([]*domain.NewsletterIssue, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.NewsletterIssue), args.Error(1)
}

func (m *MockNewsletterIssueRepositoryForBlocks) GetScheduledIssues(ctx context.Context, before time.Time) ([]*domain.NewsletterIssue, error) {
	args := m.Called(ctx, before)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.NewsletterIssue), args.Error(1)
}

// ============================================================================
// Test Setup Helpers
// ============================================================================

func setupBlockHandlerTest(t *testing.T) (
	*NewsletterBlockHandler,
	*MockNewsletterBlockRepository,
	*MockNewsletterIssueRepositoryForBlocks,
	*MockContentItemRepoForBlocks,
) {
	mockBlockRepo := new(MockNewsletterBlockRepository)
	mockIssueRepo := new(MockNewsletterIssueRepositoryForBlocks)
	mockContentItemRepo := new(MockContentItemRepoForBlocks)

	handler := NewNewsletterBlockHandler(mockBlockRepo, mockIssueRepo, mockContentItemRepo)

	return handler, mockBlockRepo, mockIssueRepo, mockContentItemRepo
}

func createTestDraftIssue(id uuid.UUID) *domain.NewsletterIssue {
	return &domain.NewsletterIssue{
		ID:        id,
		Status:    domain.IssueStatusDraft,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
}

func contextWithUserAndRequestID(userID uuid.UUID, role domain.UserRole) context.Context {
	ctx := context.Background()
	user := &domain.User{
		ID:   userID,
		Role: role,
	}
	ctx = context.WithValue(ctx, "user", user)
	ctx = context.WithValue(ctx, "request_id", uuid.New().String())
	return ctx
}

// ============================================================================
// BulkAddBlocks Handler Tests
// ============================================================================

func TestBulkAddBlocks_Success(t *testing.T) {
	// Arrange
	handler, mockBlockRepo, mockIssueRepo, _ := setupBlockHandlerTest(t)
	issueID := uuid.New()
	userID := uuid.New()
	contentID1 := uuid.New()
	contentID2 := uuid.New()

	req := dto.BulkAddBlocksRequest{
		ContentItemIDs: []uuid.UUID{contentID1, contentID2},
		BlockType:      "news",
	}

	body, _ := json.Marshal(req)
	httpReq := httptest.NewRequest(http.MethodPost, "/v1/newsletters/"+issueID.String()+"/blocks/bulk", bytes.NewBuffer(body))
	httpReq = httpReq.WithContext(contextWithUserAndRequestID(userID, domain.RoleMarketing))

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", issueID.String())
	httpReq = httpReq.WithContext(context.WithValue(httpReq.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()

	mockIssueRepo.On("GetByID", mock.Anything, issueID).Return(createTestDraftIssue(issueID), nil)
	mockBlockRepo.On("GetExistingContentItemIDs", mock.Anything, issueID, req.ContentItemIDs).Return([]uuid.UUID{}, nil)
	mockBlockRepo.On("BulkCreate", mock.Anything, mock.MatchedBy(func(blocks []*domain.NewsletterBlock) bool {
		return len(blocks) == 2
	})).Return(nil)

	// Act
	handler.BulkAddBlocks(w, httpReq)

	// Assert
	assert.Equal(t, http.StatusCreated, w.Code)
	mockIssueRepo.AssertExpectations(t)
	mockBlockRepo.AssertExpectations(t)
}

func TestBulkAddBlocks_InvalidJSON(t *testing.T) {
	handler, _, _, _ := setupBlockHandlerTest(t)
	issueID := uuid.New()
	userID := uuid.New()

	httpReq := httptest.NewRequest(http.MethodPost, "/v1/newsletters/"+issueID.String()+"/blocks/bulk", bytes.NewBufferString("{invalid json}"))
	httpReq = httpReq.WithContext(contextWithUserAndRequestID(userID, domain.RoleMarketing))

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", issueID.String())
	httpReq = httpReq.WithContext(context.WithValue(httpReq.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()

	handler.BulkAddBlocks(w, httpReq)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestBulkAddBlocks_IssueNotFound(t *testing.T) {
	handler, _, mockIssueRepo, _ := setupBlockHandlerTest(t)
	issueID := uuid.New()
	userID := uuid.New()
	contentID := uuid.New()

	req := dto.BulkAddBlocksRequest{
		ContentItemIDs: []uuid.UUID{contentID},
		BlockType:      "news",
	}

	body, _ := json.Marshal(req)
	httpReq := httptest.NewRequest(http.MethodPost, "/v1/newsletters/"+issueID.String()+"/blocks/bulk", bytes.NewBuffer(body))
	httpReq = httpReq.WithContext(contextWithUserAndRequestID(userID, domain.RoleMarketing))

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", issueID.String())
	httpReq = httpReq.WithContext(context.WithValue(httpReq.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()

	mockIssueRepo.On("GetByID", mock.Anything, issueID).Return(nil, errors.New("not found"))

	handler.BulkAddBlocks(w, httpReq)

	assert.Equal(t, http.StatusNotFound, w.Code)
	mockIssueRepo.AssertExpectations(t)
}

func TestBulkAddBlocks_NonDraftIssueReturns400(t *testing.T) {
	handler, _, mockIssueRepo, _ := setupBlockHandlerTest(t)
	issueID := uuid.New()
	userID := uuid.New()
	contentID := uuid.New()

	publishedIssue := createTestDraftIssue(issueID)
	publishedIssue.Status = domain.IssueStatusScheduled

	req := dto.BulkAddBlocksRequest{
		ContentItemIDs: []uuid.UUID{contentID},
		BlockType:      "news",
	}

	body, _ := json.Marshal(req)
	httpReq := httptest.NewRequest(http.MethodPost, "/v1/newsletters/"+issueID.String()+"/blocks/bulk", bytes.NewBuffer(body))
	httpReq = httpReq.WithContext(contextWithUserAndRequestID(userID, domain.RoleMarketing))

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", issueID.String())
	httpReq = httpReq.WithContext(context.WithValue(httpReq.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()

	mockIssueRepo.On("GetByID", mock.Anything, issueID).Return(publishedIssue, nil)

	handler.BulkAddBlocks(w, httpReq)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	mockIssueRepo.AssertExpectations(t)
}

func TestBulkAddBlocks_UnauthorizedReturns401(t *testing.T) {
	handler, _, _, _ := setupBlockHandlerTest(t)
	issueID := uuid.New()

	req := dto.BulkAddBlocksRequest{
		ContentItemIDs: []uuid.UUID{uuid.New()},
		BlockType:      "news",
	}

	body, _ := json.Marshal(req)
	httpReq := httptest.NewRequest(http.MethodPost, "/v1/newsletters/"+issueID.String()+"/blocks/bulk", bytes.NewBuffer(body))
	httpReq = httpReq.WithContext(context.Background())

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", issueID.String())
	httpReq = httpReq.WithContext(context.WithValue(httpReq.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()

	handler.BulkAddBlocks(w, httpReq)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestBulkAddBlocks_ForbiddenForNonMarketing(t *testing.T) {
	handler, _, _, _ := setupBlockHandlerTest(t)
	issueID := uuid.New()
	userID := uuid.New()

	req := dto.BulkAddBlocksRequest{
		ContentItemIDs: []uuid.UUID{uuid.New()},
		BlockType:      "news",
	}

	body, _ := json.Marshal(req)
	httpReq := httptest.NewRequest(http.MethodPost, "/v1/newsletters/"+issueID.String()+"/blocks/bulk", bytes.NewBuffer(body))
	httpReq = httpReq.WithContext(contextWithUserAndRequestID(userID, domain.RoleViewer))

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", issueID.String())
	httpReq = httpReq.WithContext(context.WithValue(httpReq.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()

	handler.BulkAddBlocks(w, httpReq)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestBulkAddBlocks_DuplicateContentDetection(t *testing.T) {
	handler, mockBlockRepo, mockIssueRepo, _ := setupBlockHandlerTest(t)
	issueID := uuid.New()
	userID := uuid.New()
	contentID1 := uuid.New()
	contentID2 := uuid.New()
	duplicateID := uuid.New()

	req := dto.BulkAddBlocksRequest{
		ContentItemIDs: []uuid.UUID{contentID1, duplicateID, contentID2},
		BlockType:      "news",
	}

	body, _ := json.Marshal(req)
	httpReq := httptest.NewRequest(http.MethodPost, "/v1/newsletters/"+issueID.String()+"/blocks/bulk", bytes.NewBuffer(body))
	httpReq = httpReq.WithContext(contextWithUserAndRequestID(userID, domain.RoleMarketing))

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", issueID.String())
	httpReq = httpReq.WithContext(context.WithValue(httpReq.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()

	mockIssueRepo.On("GetByID", mock.Anything, issueID).Return(createTestDraftIssue(issueID), nil)
	mockBlockRepo.On("GetExistingContentItemIDs", mock.Anything, issueID, req.ContentItemIDs).
		Return([]uuid.UUID{duplicateID}, nil)
	mockBlockRepo.On("BulkCreate", mock.Anything, mock.MatchedBy(func(blocks []*domain.NewsletterBlock) bool {
		return len(blocks) == 2
	})).Return(nil)

	handler.BulkAddBlocks(w, httpReq)

	assert.Equal(t, http.StatusCreated, w.Code)

	var response dto.BulkAddBlocksResponse
	json.NewDecoder(w.Body).Decode(&response)
	assert.Equal(t, 2, response.CreatedCount)
	assert.Equal(t, 1, response.SkippedCount)
	assert.Contains(t, response.SkippedIDs, duplicateID)

	mockIssueRepo.AssertExpectations(t)
	mockBlockRepo.AssertExpectations(t)
}

func TestBulkAddBlocks_EmptyContentItemIDsReturns400(t *testing.T) {
	handler, _, _, _ := setupBlockHandlerTest(t)
	issueID := uuid.New()
	userID := uuid.New()

	req := dto.BulkAddBlocksRequest{
		ContentItemIDs: []uuid.UUID{},
		BlockType:      "news",
	}

	body, _ := json.Marshal(req)
	httpReq := httptest.NewRequest(http.MethodPost, "/v1/newsletters/"+issueID.String()+"/blocks/bulk", bytes.NewBuffer(body))
	httpReq = httpReq.WithContext(contextWithUserAndRequestID(userID, domain.RoleMarketing))

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", issueID.String())
	httpReq = httpReq.WithContext(context.WithValue(httpReq.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()

	handler.BulkAddBlocks(w, httpReq)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestBulkAddBlocks_InvalidBlockType(t *testing.T) {
	handler, _, _, _ := setupBlockHandlerTest(t)
	issueID := uuid.New()
	userID := uuid.New()

	req := dto.BulkAddBlocksRequest{
		ContentItemIDs: []uuid.UUID{uuid.New()},
		BlockType:      "invalid_type",
	}

	body, _ := json.Marshal(req)
	httpReq := httptest.NewRequest(http.MethodPost, "/v1/newsletters/"+issueID.String()+"/blocks/bulk", bytes.NewBuffer(body))
	httpReq = httpReq.WithContext(contextWithUserAndRequestID(userID, domain.RoleMarketing))

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", issueID.String())
	httpReq = httpReq.WithContext(context.WithValue(httpReq.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()

	handler.BulkAddBlocks(w, httpReq)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestBulkAddBlocks_AllDuplicateReturns409(t *testing.T) {
	handler, mockBlockRepo, mockIssueRepo, _ := setupBlockHandlerTest(t)
	issueID := uuid.New()
	userID := uuid.New()
	contentID1 := uuid.New()
	contentID2 := uuid.New()

	req := dto.BulkAddBlocksRequest{
		ContentItemIDs: []uuid.UUID{contentID1, contentID2},
		BlockType:      "news",
	}

	body, _ := json.Marshal(req)
	httpReq := httptest.NewRequest(http.MethodPost, "/v1/newsletters/"+issueID.String()+"/blocks/bulk", bytes.NewBuffer(body))
	httpReq = httpReq.WithContext(contextWithUserAndRequestID(userID, domain.RoleMarketing))

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", issueID.String())
	httpReq = httpReq.WithContext(context.WithValue(httpReq.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()

	mockIssueRepo.On("GetByID", mock.Anything, issueID).Return(createTestDraftIssue(issueID), nil)
	mockBlockRepo.On("GetExistingContentItemIDs", mock.Anything, issueID, req.ContentItemIDs).
		Return([]uuid.UUID{contentID1, contentID2}, nil)

	handler.BulkAddBlocks(w, httpReq)

	assert.Equal(t, http.StatusConflict, w.Code)
	mockIssueRepo.AssertExpectations(t)
	mockBlockRepo.AssertExpectations(t)
}

func TestBulkAddBlocks_AdminCanAdd(t *testing.T) {
	handler, mockBlockRepo, mockIssueRepo, _ := setupBlockHandlerTest(t)
	issueID := uuid.New()
	userID := uuid.New()
	contentID := uuid.New()

	req := dto.BulkAddBlocksRequest{
		ContentItemIDs: []uuid.UUID{contentID},
		BlockType:      "news",
	}

	body, _ := json.Marshal(req)
	httpReq := httptest.NewRequest(http.MethodPost, "/v1/newsletters/"+issueID.String()+"/blocks/bulk", bytes.NewBuffer(body))
	httpReq = httpReq.WithContext(contextWithUserAndRequestID(userID, domain.RoleAdmin))

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", issueID.String())
	httpReq = httpReq.WithContext(context.WithValue(httpReq.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()

	mockIssueRepo.On("GetByID", mock.Anything, issueID).Return(createTestDraftIssue(issueID), nil)
	mockBlockRepo.On("GetExistingContentItemIDs", mock.Anything, issueID, req.ContentItemIDs).Return([]uuid.UUID{}, nil)
	mockBlockRepo.On("BulkCreate", mock.Anything, mock.MatchedBy(func(blocks []*domain.NewsletterBlock) bool {
		return len(blocks) == 1
	})).Return(nil)

	handler.BulkAddBlocks(w, httpReq)

	assert.Equal(t, http.StatusCreated, w.Code)
	mockIssueRepo.AssertExpectations(t)
	mockBlockRepo.AssertExpectations(t)
}

func TestBulkAddBlocks_MaximumItemsLimit(t *testing.T) {
	handler, _, _, _ := setupBlockHandlerTest(t)
	issueID := uuid.New()
	userID := uuid.New()

	contentIDs := make([]uuid.UUID, 21)
	for i := 0; i < 21; i++ {
		contentIDs[i] = uuid.New()
	}

	req := dto.BulkAddBlocksRequest{
		ContentItemIDs: contentIDs,
		BlockType:      "news",
	}

	body, _ := json.Marshal(req)
	httpReq := httptest.NewRequest(http.MethodPost, "/v1/newsletters/"+issueID.String()+"/blocks/bulk", bytes.NewBuffer(body))
	httpReq = httpReq.WithContext(contextWithUserAndRequestID(userID, domain.RoleMarketing))

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", issueID.String())
	httpReq = httpReq.WithContext(context.WithValue(httpReq.Context(), chi.RouteCtxKey, rctx))

	w := httptest.NewRecorder()

	handler.BulkAddBlocks(w, httpReq)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}
