package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	voiceDomain "github.com/phillipboles/aci-backend/internal/domain/voice"
)

// addChiURLParams adds chi URL parameters to a request for testing handlers that use chi.URLParam()
func addChiURLParams(req *http.Request, params map[string]string) *http.Request {
	rctx := chi.NewRouteContext()
	for key, value := range params {
		rctx.URLParams.Add(key, value)
	}
	return req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
}

// ============================================================================
// Mock Services
// ============================================================================

type MockVoiceAgentService struct {
	mock.Mock
}

func (m *MockVoiceAgentService) ListActiveAgents(ctx context.Context) ([]*voiceDomain.VoiceAgent, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*voiceDomain.VoiceAgent), args.Error(1)
}

func (m *MockVoiceAgentService) GetAgentByID(ctx context.Context, id uuid.UUID) (*voiceDomain.VoiceAgent, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*voiceDomain.VoiceAgent), args.Error(1)
}

func (m *MockVoiceAgentService) GetAgentByName(ctx context.Context, name string) (*voiceDomain.VoiceAgent, error) {
	args := m.Called(ctx, name)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*voiceDomain.VoiceAgent), args.Error(1)
}

func (m *MockVoiceAgentService) BuildSystemPrompt(agent *voiceDomain.VoiceAgent) string {
	args := m.Called(agent)
	return args.String(0)
}

func (m *MockVoiceAgentService) CreateAgent(ctx context.Context, agent *voiceDomain.VoiceAgent, createdBy uuid.UUID) error {
	args := m.Called(ctx, agent, createdBy)
	return args.Error(0)
}

func (m *MockVoiceAgentService) UpdateAgent(ctx context.Context, agent *voiceDomain.VoiceAgent) error {
	args := m.Called(ctx, agent)
	return args.Error(0)
}

func (m *MockVoiceAgentService) DeleteAgent(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

type MockStyleRuleService struct {
	mock.Mock
}

func (m *MockStyleRuleService) CreateRule(ctx context.Context, rule *voiceDomain.StyleRule) error {
	args := m.Called(ctx, rule)
	return args.Error(0)
}

func (m *MockStyleRuleService) UpdateRule(ctx context.Context, rule *voiceDomain.StyleRule) error {
	args := m.Called(ctx, rule)
	return args.Error(0)
}

func (m *MockStyleRuleService) DeleteRule(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockStyleRuleService) GetRulesByAgentID(ctx context.Context, agentID uuid.UUID) ([]*voiceDomain.StyleRule, error) {
	args := m.Called(ctx, agentID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*voiceDomain.StyleRule), args.Error(1)
}

func (m *MockStyleRuleService) ReorderRules(ctx context.Context, agentID uuid.UUID, positions map[uuid.UUID]int) error {
	args := m.Called(ctx, agentID, positions)
	return args.Error(0)
}

type MockExampleService struct {
	mock.Mock
}

func (m *MockExampleService) CreateExample(ctx context.Context, example *voiceDomain.Example) error {
	args := m.Called(ctx, example)
	return args.Error(0)
}

func (m *MockExampleService) UpdateExample(ctx context.Context, example *voiceDomain.Example) error {
	args := m.Called(ctx, example)
	return args.Error(0)
}

func (m *MockExampleService) DeleteExample(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockExampleService) GetExamplesByAgentID(ctx context.Context, agentID uuid.UUID) ([]*voiceDomain.Example, error) {
	args := m.Called(ctx, agentID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*voiceDomain.Example), args.Error(1)
}

func (m *MockExampleService) ReorderExamples(ctx context.Context, agentID uuid.UUID, positions map[uuid.UUID]int) error {
	args := m.Called(ctx, agentID, positions)
	return args.Error(0)
}

// ============================================================================
// Helper Functions
// ============================================================================

func createContextWithUser(userID uuid.UUID) context.Context {
	return createTestContextWithUserAdmin(userID)
}

// ============================================================================
// Test ListAgents
// ============================================================================

func TestVoiceAgentHandler_ListAgents_HappyPath(t *testing.T) {
	// Arrange
	userID := uuid.New()
	ctx := createContextWithUser(userID)

	mockAgentService := new(MockVoiceAgentService)
	mockRuleService := new(MockStyleRuleService)
	mockExampleService := new(MockExampleService)

	agents := []*voiceDomain.VoiceAgent{
		{
			ID:     uuid.New(),
			Name:   "Professional",
			Icon:   "briefcase",
			Color:  "#000000",
			Status: voiceDomain.VoiceAgentStatusActive,
		},
		{
			ID:     uuid.New(),
			Name:   "Casual",
			Icon:   "smile",
			Color:  "#FF0000",
			Status: voiceDomain.VoiceAgentStatusActive,
		},
	}

	mockAgentService.On("ListActiveAgents", ctx).Return(agents, nil)

	handler := NewVoiceAgentHandler(mockAgentService, mockRuleService, mockExampleService)

	req := httptest.NewRequest(http.MethodGet, "/v1/voice-agents", nil)
	req = req.WithContext(ctx)
	rec := httptest.NewRecorder()

	// Act
	handler.ListAgents(rec, req)

	// Assert
	assert.Equal(t, http.StatusOK, rec.Code)

	// Parse through {data: {agents: [...]}} envelope
	var envelope struct {
		Data struct {
			Agents []map[string]interface{} `json:"agents"`
		} `json:"data"`
	}
	err := json.Unmarshal(rec.Body.Bytes(), &envelope)
	assert.NoError(t, err)
	assert.Len(t, envelope.Data.Agents, 2)
	mockAgentService.AssertExpectations(t)
}

func TestVoiceAgentHandler_ListAgents_Unauthenticated(t *testing.T) {
	// Arrange
	ctx := context.Background()
	mockAgentService := new(MockVoiceAgentService)
	mockRuleService := new(MockStyleRuleService)
	mockExampleService := new(MockExampleService)

	handler := NewVoiceAgentHandler(mockAgentService, mockRuleService, mockExampleService)

	req := httptest.NewRequest(http.MethodGet, "/v1/voice-agents", nil)
	req = req.WithContext(ctx)
	rec := httptest.NewRecorder()

	// Act
	handler.ListAgents(rec, req)

	// Assert
	assert.Equal(t, http.StatusUnauthorized, rec.Code)
	mockAgentService.AssertNotCalled(t, "ListActiveAgents")
}

func TestVoiceAgentHandler_ListAgents_ServiceError(t *testing.T) {
	// Arrange
	userID := uuid.New()
	ctx := createContextWithUser(userID)

	mockAgentService := new(MockVoiceAgentService)
	mockRuleService := new(MockStyleRuleService)
	mockExampleService := new(MockExampleService)

	mockAgentService.On("ListActiveAgents", ctx).
		Return(nil, context.DeadlineExceeded)

	handler := NewVoiceAgentHandler(mockAgentService, mockRuleService, mockExampleService)

	req := httptest.NewRequest(http.MethodGet, "/v1/voice-agents", nil)
	req = req.WithContext(ctx)
	rec := httptest.NewRecorder()

	// Act
	handler.ListAgents(rec, req)

	// Assert
	assert.Equal(t, http.StatusInternalServerError, rec.Code)
	mockAgentService.AssertExpectations(t)
}

// ============================================================================
// Test GetAgent
// ============================================================================

func TestVoiceAgentHandler_GetAgent_HappyPath(t *testing.T) {
	// Arrange
	userID := uuid.New()
	agentID := uuid.New()
	ctx := createContextWithUser(userID)

	mockAgentService := new(MockVoiceAgentService)
	mockRuleService := new(MockStyleRuleService)
	mockExampleService := new(MockExampleService)

	agent := &voiceDomain.VoiceAgent{
		ID:           agentID,
		Name:         "Professional",
		Description:  "Professional writing style",
		Icon:         "briefcase",
		Color:        "#000000",
		Status:       voiceDomain.VoiceAgentStatusActive,
		SystemPrompt: "Be professional",
		StyleRules: []voiceDomain.StyleRule{
			{ID: uuid.New(), RuleType: voiceDomain.RuleTypeDo, RuleText: "Use formal language"},
		},
		Examples: []voiceDomain.Example{
			{ID: uuid.New(), BeforeText: "hi", AfterText: "hello"},
		},
	}

	mockAgentService.On("GetAgentByID", mock.Anything, agentID).Return(agent, nil)

	handler := NewVoiceAgentHandler(mockAgentService, mockRuleService, mockExampleService)

	req := httptest.NewRequest(http.MethodGet, "/v1/voice-agents/"+agentID.String(), nil)
	req = req.WithContext(ctx)
	req = addChiURLParams(req, map[string]string{"id": agentID.String()})
	rec := httptest.NewRecorder()

	// Act
	handler.GetAgent(rec, req)

	// Assert
	assert.Equal(t, http.StatusOK, rec.Code)

	// Parse through {data: {...}} envelope
	var envelope struct {
		Data VoiceAgentDTO `json:"data"`
	}
	err := json.Unmarshal(rec.Body.Bytes(), &envelope)
	assert.NoError(t, err)
	assert.Equal(t, agentID.String(), envelope.Data.ID)
	assert.Equal(t, "Professional", envelope.Data.Name)
	mockAgentService.AssertExpectations(t)
}

func TestVoiceAgentHandler_GetAgent_NotFound(t *testing.T) {
	// Arrange
	userID := uuid.New()
	agentID := uuid.New()
	ctx := createContextWithUser(userID)

	mockAgentService := new(MockVoiceAgentService)
	mockRuleService := new(MockStyleRuleService)
	mockExampleService := new(MockExampleService)

	mockAgentService.On("GetAgentByID", mock.Anything, agentID).
		Return(nil, context.DeadlineExceeded)

	handler := NewVoiceAgentHandler(mockAgentService, mockRuleService, mockExampleService)

	req := httptest.NewRequest(http.MethodGet, "/v1/voice-agents/"+agentID.String(), nil)
	req = req.WithContext(ctx)
	req = addChiURLParams(req, map[string]string{"id": agentID.String()})
	rec := httptest.NewRecorder()

	// Act
	handler.GetAgent(rec, req)

	// Assert
	assert.Equal(t, http.StatusInternalServerError, rec.Code)
	mockAgentService.AssertExpectations(t)
}

func TestVoiceAgentHandler_GetAgent_InvalidID(t *testing.T) {
	// Arrange
	userID := uuid.New()
	ctx := createContextWithUser(userID)

	mockAgentService := new(MockVoiceAgentService)
	mockRuleService := new(MockStyleRuleService)
	mockExampleService := new(MockExampleService)

	handler := NewVoiceAgentHandler(mockAgentService, mockRuleService, mockExampleService)

	req := httptest.NewRequest(http.MethodGet, "/v1/voice-agents/invalid-id", nil)
	req = req.WithContext(ctx)
	req = addChiURLParams(req, map[string]string{"id": "invalid-id"})
	rec := httptest.NewRecorder()

	// Act
	handler.GetAgent(rec, req)

	// Assert
	assert.Equal(t, http.StatusBadRequest, rec.Code)
	mockAgentService.AssertNotCalled(t, "GetAgentByID")
}

// ============================================================================
// Test CreateAgent
// ============================================================================

func TestVoiceAgentHandler_CreateAgent_HappyPath(t *testing.T) {
	// Arrange
	userID := uuid.New()
	ctx := createContextWithUser(userID)

	mockAgentService := new(MockVoiceAgentService)
	mockRuleService := new(MockStyleRuleService)
	mockExampleService := new(MockExampleService)

	req := &CreateAgentRequest{
		Name:         "Professional",
		Description:  "Professional writing style",
		SystemPrompt: "You are a professional writer",
		Temperature:  0.7,
		MaxTokens:    2000,
	}

	body, _ := json.Marshal(req)

	mockAgentService.On("CreateAgent", ctx, mock.MatchedBy(func(a *voiceDomain.VoiceAgent) bool {
		return a.Name == "Professional"
	}), userID).Return(nil)

	handler := NewVoiceAgentHandler(mockAgentService, mockRuleService, mockExampleService)

	httpReq := httptest.NewRequest(http.MethodPost, "/v1/admin/voice-agents", bytes.NewReader(body))
	httpReq = httpReq.WithContext(ctx)
	httpReq.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	// Act
	handler.CreateAgent(rec, httpReq)

	// Assert
	assert.Equal(t, http.StatusCreated, rec.Code)
	mockAgentService.AssertExpectations(t)
}

func TestVoiceAgentHandler_CreateAgent_MissingName(t *testing.T) {
	// Arrange
	userID := uuid.New()
	ctx := createContextWithUser(userID)

	mockAgentService := new(MockVoiceAgentService)
	mockRuleService := new(MockStyleRuleService)
	mockExampleService := new(MockExampleService)

	req := &CreateAgentRequest{
		Name:         "", // Empty name
		SystemPrompt: "You are a writer",
	}

	body, _ := json.Marshal(req)

	handler := NewVoiceAgentHandler(mockAgentService, mockRuleService, mockExampleService)

	httpReq := httptest.NewRequest(http.MethodPost, "/v1/admin/voice-agents", bytes.NewReader(body))
	httpReq = httpReq.WithContext(ctx)
	httpReq.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	// Act
	handler.CreateAgent(rec, httpReq)

	// Assert
	assert.Equal(t, http.StatusBadRequest, rec.Code)
	mockAgentService.AssertNotCalled(t, "CreateAgent")
}

func TestVoiceAgentHandler_CreateAgent_MissingSystemPrompt(t *testing.T) {
	// Arrange
	userID := uuid.New()
	ctx := createContextWithUser(userID)

	mockAgentService := new(MockVoiceAgentService)
	mockRuleService := new(MockStyleRuleService)
	mockExampleService := new(MockExampleService)

	req := &CreateAgentRequest{
		Name:         "Professional",
		SystemPrompt: "", // Empty prompt
	}

	body, _ := json.Marshal(req)

	handler := NewVoiceAgentHandler(mockAgentService, mockRuleService, mockExampleService)

	httpReq := httptest.NewRequest(http.MethodPost, "/v1/admin/voice-agents", bytes.NewReader(body))
	httpReq = httpReq.WithContext(ctx)
	httpReq.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	// Act
	handler.CreateAgent(rec, httpReq)

	// Assert
	assert.Equal(t, http.StatusBadRequest, rec.Code)
	mockAgentService.AssertNotCalled(t, "CreateAgent")
}

func TestVoiceAgentHandler_CreateAgent_InvalidJSON(t *testing.T) {
	// Arrange
	userID := uuid.New()
	ctx := createContextWithUser(userID)

	mockAgentService := new(MockVoiceAgentService)
	mockRuleService := new(MockStyleRuleService)
	mockExampleService := new(MockExampleService)

	handler := NewVoiceAgentHandler(mockAgentService, mockRuleService, mockExampleService)

	httpReq := httptest.NewRequest(http.MethodPost, "/v1/admin/voice-agents", bytes.NewReader([]byte("invalid json")))
	httpReq = httpReq.WithContext(ctx)
	httpReq.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	// Act
	handler.CreateAgent(rec, httpReq)

	// Assert
	assert.Equal(t, http.StatusBadRequest, rec.Code)
	mockAgentService.AssertNotCalled(t, "CreateAgent")
}

// ============================================================================
// Test UpdateAgent
// ============================================================================

func TestVoiceAgentHandler_UpdateAgent_HappyPath(t *testing.T) {
	// Arrange
	userID := uuid.New()
	agentID := uuid.New()
	ctx := createContextWithUser(userID)

	mockAgentService := new(MockVoiceAgentService)
	mockRuleService := new(MockStyleRuleService)
	mockExampleService := new(MockExampleService)

	existingAgent := &voiceDomain.VoiceAgent{
		ID:           agentID,
		Name:         "Old Name",
		SystemPrompt: "Old prompt",
		Status:       voiceDomain.VoiceAgentStatusActive,
	}

	updateReq := &UpdateAgentRequest{
		Name:         "New Name",
		SystemPrompt: "New prompt",
		Temperature:  0.8,
		MaxTokens:    2500,
		Status:       "active",
	}

	body, _ := json.Marshal(updateReq)

	mockAgentService.On("GetAgentByID", mock.Anything, agentID).Return(existingAgent, nil)
	mockAgentService.On("UpdateAgent", mock.Anything, mock.MatchedBy(func(a *voiceDomain.VoiceAgent) bool {
		return a.ID == agentID && a.Name == "New Name"
	})).Return(nil)

	handler := NewVoiceAgentHandler(mockAgentService, mockRuleService, mockExampleService)

	httpReq := httptest.NewRequest(http.MethodPut, "/v1/admin/voice-agents/"+agentID.String(), bytes.NewReader(body))
	httpReq = httpReq.WithContext(ctx)
	httpReq = addChiURLParams(httpReq, map[string]string{"id": agentID.String()})
	httpReq.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	// Act
	handler.UpdateAgent(rec, httpReq)

	// Assert
	assert.Equal(t, http.StatusOK, rec.Code)
	mockAgentService.AssertExpectations(t)
}

func TestVoiceAgentHandler_UpdateAgent_NotFound(t *testing.T) {
	// Arrange
	userID := uuid.New()
	agentID := uuid.New()
	ctx := createContextWithUser(userID)

	mockAgentService := new(MockVoiceAgentService)
	mockRuleService := new(MockStyleRuleService)
	mockExampleService := new(MockExampleService)

	updateReq := &UpdateAgentRequest{
		Name:         "New Name",
		SystemPrompt: "New prompt",
	}

	body, _ := json.Marshal(updateReq)

	mockAgentService.On("GetAgentByID", mock.Anything, agentID).
		Return(nil, context.DeadlineExceeded)

	handler := NewVoiceAgentHandler(mockAgentService, mockRuleService, mockExampleService)

	httpReq := httptest.NewRequest(http.MethodPut, "/v1/admin/voice-agents/"+agentID.String(), bytes.NewReader(body))
	httpReq = httpReq.WithContext(ctx)
	httpReq = addChiURLParams(httpReq, map[string]string{"id": agentID.String()})
	httpReq.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	// Act
	handler.UpdateAgent(rec, httpReq)

	// Assert
	assert.Equal(t, http.StatusInternalServerError, rec.Code)
	mockAgentService.AssertExpectations(t)
}

// ============================================================================
// Test DeleteAgent
// ============================================================================

func TestVoiceAgentHandler_DeleteAgent_HappyPath(t *testing.T) {
	// Arrange
	userID := uuid.New()
	agentID := uuid.New()
	ctx := createContextWithUser(userID)

	mockAgentService := new(MockVoiceAgentService)
	mockRuleService := new(MockStyleRuleService)
	mockExampleService := new(MockExampleService)

	mockAgentService.On("DeleteAgent", mock.Anything, agentID).Return(nil)

	handler := NewVoiceAgentHandler(mockAgentService, mockRuleService, mockExampleService)

	httpReq := httptest.NewRequest(http.MethodDelete, "/v1/admin/voice-agents/"+agentID.String(), nil)
	httpReq = httpReq.WithContext(ctx)
	httpReq = addChiURLParams(httpReq, map[string]string{"id": agentID.String()})
	rec := httptest.NewRecorder()

	// Act
	handler.DeleteAgent(rec, httpReq)

	// Assert
	assert.Equal(t, http.StatusNoContent, rec.Code)
	mockAgentService.AssertExpectations(t)
}

func TestVoiceAgentHandler_DeleteAgent_NotFound(t *testing.T) {
	// Arrange
	userID := uuid.New()
	agentID := uuid.New()
	ctx := createContextWithUser(userID)

	mockAgentService := new(MockVoiceAgentService)
	mockRuleService := new(MockStyleRuleService)
	mockExampleService := new(MockExampleService)

	mockAgentService.On("DeleteAgent", mock.Anything, agentID).
		Return(context.DeadlineExceeded)

	handler := NewVoiceAgentHandler(mockAgentService, mockRuleService, mockExampleService)

	httpReq := httptest.NewRequest(http.MethodDelete, "/v1/admin/voice-agents/"+agentID.String(), nil)
	httpReq = httpReq.WithContext(ctx)
	httpReq = addChiURLParams(httpReq, map[string]string{"id": agentID.String()})
	rec := httptest.NewRecorder()

	// Act
	handler.DeleteAgent(rec, httpReq)

	// Assert
	assert.Equal(t, http.StatusInternalServerError, rec.Code)
	mockAgentService.AssertExpectations(t)
}

// ============================================================================
// Test Handler Initialization
// ============================================================================

func TestVoiceAgentHandler_NewHandler_Success(t *testing.T) {
	// Act
	handler := NewVoiceAgentHandler(
		new(MockVoiceAgentService),
		new(MockStyleRuleService),
		new(MockExampleService),
	)

	// Assert
	assert.NotNil(t, handler)
}

func TestVoiceAgentHandler_NewHandler_NilAgentService(t *testing.T) {
	// Act & Assert
	assert.Panics(t, func() {
		NewVoiceAgentHandler(
			nil,
			new(MockStyleRuleService),
			new(MockExampleService),
		)
	})
}

func TestVoiceAgentHandler_NewHandler_NilRuleService(t *testing.T) {
	// Act & Assert
	assert.Panics(t, func() {
		NewVoiceAgentHandler(
			new(MockVoiceAgentService),
			nil,
			new(MockExampleService),
		)
	})
}

func TestVoiceAgentHandler_NewHandler_NilExampleService(t *testing.T) {
	// Act & Assert
	assert.Panics(t, func() {
		NewVoiceAgentHandler(
			new(MockVoiceAgentService),
			new(MockStyleRuleService),
			nil,
		)
	})
}
