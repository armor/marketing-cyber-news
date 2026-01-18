package voice

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/phillipboles/aci-backend/internal/domain/voice"

)

// ============================================================================
// Mock Agent Service
// ============================================================================

type MockAgentService struct {
	mock.Mock
}

func (m *MockAgentService) ListActiveAgents(ctx context.Context) ([]*voice.VoiceAgent, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*voice.VoiceAgent), args.Error(1)
}

func (m *MockAgentService) GetAgentByID(ctx context.Context, id uuid.UUID) (*voice.VoiceAgent, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*voice.VoiceAgent), args.Error(1)
}

func (m *MockAgentService) GetAgentByName(ctx context.Context, name string) (*voice.VoiceAgent, error) {
	args := m.Called(ctx, name)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*voice.VoiceAgent), args.Error(1)
}

func (m *MockAgentService) BuildSystemPrompt(agent *voice.VoiceAgent) string {
	args := m.Called(agent)
	return args.String(0)
}

func (m *MockAgentService) CreateAgent(ctx context.Context, agent *voice.VoiceAgent, createdBy uuid.UUID) error {
	args := m.Called(ctx, agent, createdBy)
	return args.Error(0)
}

func (m *MockAgentService) UpdateAgent(ctx context.Context, agent *voice.VoiceAgent) error {
	args := m.Called(ctx, agent)
	return args.Error(0)
}

func (m *MockAgentService) DeleteAgent(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

// ============================================================================
// Mock Transformation Repository
// ============================================================================

type MockTransformationRepository struct {
	mock.Mock
}

func (m *MockTransformationRepository) Create(ctx context.Context, t *voice.TextTransformation) error {
	args := m.Called(ctx, t)
	return args.Error(0)
}

func (m *MockTransformationRepository) GetByID(ctx context.Context, id uuid.UUID) (*voice.TextTransformation, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*voice.TextTransformation), args.Error(1)
}

func (m *MockTransformationRepository) List(ctx context.Context, filter *voice.TransformationFilter) ([]*voice.TextTransformation, int, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]*voice.TextTransformation), args.Int(1), args.Error(2)
}

func (m *MockTransformationRepository) Update(ctx context.Context, t *voice.TextTransformation) error {
	args := m.Called(ctx, t)
	return args.Error(0)
}

func (m *MockTransformationRepository) GetByRequestID(ctx context.Context, requestID uuid.UUID) ([]*voice.TextTransformation, error) {
	args := m.Called(ctx, requestID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*voice.TextTransformation), args.Error(1)
}

func (m *MockTransformationRepository) CountByAgent(ctx context.Context, agentID uuid.UUID) (int, error) {
	args := m.Called(ctx, agentID)
	return args.Int(0), args.Error(1)
}

func (m *MockTransformationRepository) CountByUser(ctx context.Context, userID uuid.UUID) (int, error) {
	args := m.Called(ctx, userID)
	return args.Int(0), args.Error(1)
}

func (m *MockTransformationRepository) GetRecentByUser(ctx context.Context, userID uuid.UUID, limit int) ([]*voice.TextTransformation, error) {
	args := m.Called(ctx, userID, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*voice.TextTransformation), args.Error(1)
}

// ============================================================================
// Test Transform - Happy Path
// ============================================================================

func TestTransform_HappyPath(t *testing.T) {
	// Arrange
	ctx := context.Background()
	userID := uuid.New()
	agentID := uuid.New()
	mockAgentService := new(MockAgentService)
	mockLLMClient := new(MockLLMClient)
	mockTransformRepo := new(MockTransformationRepository)

	agent := &voice.VoiceAgent{
		ID:           agentID,
		Name:         "Professional",
		SystemPrompt: "Be professional",
		MaxTokens:    2000,
		Status:       voice.VoiceAgentStatusActive,
	}

	req := &voice.TransformRequest{
		AgentID:    agentID,
		Text:       "this is a test message that needs transformation",
		NumOptions: 3,
	}

	mockAgentService.On("GetAgentByID", ctx, agentID).Return(agent, nil)
	mockAgentService.On("BuildSystemPrompt", agent).Return("You are professional")

	// Mock LLM responses for 3 parallel calls
	for i := 0; i < 3; i++ {
		mockLLMClient.On("Transform", ctx, mock.MatchedBy(func(r *LLMTransformRequest) bool {
			return r.SystemPrompt == "You are professional"
		})).Return(&LLMTransformResponse{
			TransformedText: fmt.Sprintf("This is a test message that needs transformation (option %d)", i+1),
			TokensUsed:      42,
		}, nil)
	}

	service := NewTransformService(mockAgentService, mockLLMClient, mockTransformRepo)

	// Act
	resp, err := service.Transform(ctx, req, userID)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, resp)
	assert.Equal(t, agentID, resp.AgentID)
	assert.Equal(t, "Professional", resp.AgentName)
	assert.Greater(t, len(resp.Options), 0)
	assert.GreaterOrEqual(t, resp.LatencyMs, 0)
	mockAgentService.AssertExpectations(t)
}

func TestTransform_InvalidRequest_EmptyText(t *testing.T) {
	// Arrange
	ctx := context.Background()
	userID := uuid.New()
	agentID := uuid.New()
	mockAgentService := new(MockAgentService)
	mockLLMClient := new(MockLLMClient)
	mockTransformRepo := new(MockTransformationRepository)

	req := &voice.TransformRequest{
		AgentID: agentID,
		Text:    "", // Empty text
	}

	service := NewTransformService(mockAgentService, mockLLMClient, mockTransformRepo)

	// Act
	resp, err := service.Transform(ctx, req, userID)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, resp)
	assert.Contains(t, err.Error(), "invalid request")
}

func TestTransform_InvalidRequest_MissingAgentID(t *testing.T) {
	// Arrange
	ctx := context.Background()
	userID := uuid.New()
	mockAgentService := new(MockAgentService)
	mockLLMClient := new(MockLLMClient)
	mockTransformRepo := new(MockTransformationRepository)

	req := &voice.TransformRequest{
		AgentID: uuid.Nil, // Empty agent ID
		Text:    "test message for transformation",
	}

	service := NewTransformService(mockAgentService, mockLLMClient, mockTransformRepo)

	// Act
	resp, err := service.Transform(ctx, req, userID)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, resp)
}

func TestTransform_InvalidUserID(t *testing.T) {
	// Arrange
	ctx := context.Background()
	agentID := uuid.New()
	mockAgentService := new(MockAgentService)
	mockLLMClient := new(MockLLMClient)
	mockTransformRepo := new(MockTransformationRepository)

	req := &voice.TransformRequest{
		AgentID: agentID,
		Text:    "test message for transformation",
	}

	service := NewTransformService(mockAgentService, mockLLMClient, mockTransformRepo)

	// Act
	resp, err := service.Transform(ctx, req, uuid.Nil) // Empty user ID

	// Assert
	assert.Error(t, err)
	assert.Nil(t, resp)
	assert.Contains(t, err.Error(), "user ID is required")
}

func TestTransform_AgentNotFound(t *testing.T) {
	// Arrange
	ctx := context.Background()
	userID := uuid.New()
	agentID := uuid.New()
	mockAgentService := new(MockAgentService)
	mockLLMClient := new(MockLLMClient)
	mockTransformRepo := new(MockTransformationRepository)

	req := &voice.TransformRequest{
		AgentID: agentID,
		Text:    "test message for transformation",
	}

	mockAgentService.On("GetAgentByID", ctx, agentID).
		Return(nil, fmt.Errorf("voice agent not found"))

	service := NewTransformService(mockAgentService, mockLLMClient, mockTransformRepo)

	// Act
	resp, err := service.Transform(ctx, req, userID)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, resp)
	mockAgentService.AssertExpectations(t)
}

func TestTransform_InactiveAgent(t *testing.T) {
	// Arrange
	ctx := context.Background()
	userID := uuid.New()
	agentID := uuid.New()
	mockAgentService := new(MockAgentService)
	mockLLMClient := new(MockLLMClient)
	mockTransformRepo := new(MockTransformationRepository)

	agent := &voice.VoiceAgent{
		ID:     agentID,
		Name:   "Inactive",
		Status: voice.VoiceAgentStatusDraft, // Not active
	}

	req := &voice.TransformRequest{
		AgentID: agentID,
		Text:    "test message for transformation",
	}

	mockAgentService.On("GetAgentByID", ctx, agentID).Return(agent, nil)

	service := NewTransformService(mockAgentService, mockLLMClient, mockTransformRepo)

	// Act
	resp, err := service.Transform(ctx, req, userID)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, resp)
	assert.Contains(t, err.Error(), "not active")
}

// ============================================================================
// Test Transform - LLM Failures
// ============================================================================

func TestTransform_AllLLMCallsFailed(t *testing.T) {
	// Arrange
	ctx := context.Background()
	userID := uuid.New()
	agentID := uuid.New()
	mockAgentService := new(MockAgentService)
	mockLLMClient := new(MockLLMClient)
	mockTransformRepo := new(MockTransformationRepository)

	agent := &voice.VoiceAgent{
		ID:           agentID,
		Name:         "Professional",
		SystemPrompt: "Be professional",
		MaxTokens:    2000,
		Status:       voice.VoiceAgentStatusActive,
	}

	req := &voice.TransformRequest{
		AgentID: agentID,
		Text:    "this is a test message that needs transformation",
	}

	mockAgentService.On("GetAgentByID", ctx, agentID).Return(agent, nil)
	mockAgentService.On("BuildSystemPrompt", agent).Return("You are professional")

	// All LLM calls fail
	mockLLMClient.On("Transform", ctx, mock.Anything).
		Return(nil, fmt.Errorf("LLM service unavailable"))

	service := NewTransformService(mockAgentService, mockLLMClient, mockTransformRepo)

	// Act
	resp, err := service.Transform(ctx, req, userID)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, resp)
	assert.Contains(t, err.Error(), "all LLM calls failed")
}

func TestTransform_ParallelExecution(t *testing.T) {
	// Arrange
	ctx := context.Background()
	userID := uuid.New()
	agentID := uuid.New()
	mockAgentService := new(MockAgentService)
	mockLLMClient := new(MockLLMClient)
	mockTransformRepo := new(MockTransformationRepository)

	agent := &voice.VoiceAgent{
		ID:           agentID,
		Name:         "Professional",
		SystemPrompt: "Be professional",
		MaxTokens:    2000,
		Status:       voice.VoiceAgentStatusActive,
	}

	req := &voice.TransformRequest{
		AgentID: agentID,
		Text:    "test message for transformation",
	}

	mockAgentService.On("GetAgentByID", ctx, agentID).Return(agent, nil)
	mockAgentService.On("BuildSystemPrompt", agent).Return("You are professional")

	var callCount int
	var mu sync.Mutex

	// Track parallel calls
	mockLLMClient.On("Transform", ctx, mock.Anything).Run(func(args mock.Arguments) {
		mu.Lock()
		callCount++
		mu.Unlock()
		time.Sleep(10 * time.Millisecond) // Simulate network latency
	}).Return(&LLMTransformResponse{
		TransformedText: "Transformed text",
		TokensUsed:      42,
	}, nil)

	service := NewTransformService(mockAgentService, mockLLMClient, mockTransformRepo)

	// Act
	resp, err := service.Transform(ctx, req, userID)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, resp)
	assert.Greater(t, callCount, 0)
	mockAgentService.AssertExpectations(t)
}

// ============================================================================
// Test SelectTransformation
// ============================================================================

func TestSelectTransformation_HappyPath(t *testing.T) {
	// Arrange
	ctx := context.Background()
	userID := uuid.New()
	agentID := uuid.New()
	requestID := uuid.New()
	mockAgentService := new(MockAgentService)
	mockLLMClient := new(MockLLMClient)
	mockTransformRepo := new(MockTransformationRepository)

	agent := &voice.VoiceAgent{
		ID:     agentID,
		Name:   "Professional",
		Status: voice.VoiceAgentStatusActive,
	}

	// Manually set up pending transform in cache
	service := NewTransformService(mockAgentService, mockLLMClient, mockTransformRepo)
	transformService := service.(*transformService)

	pending := &PendingTransform{
		RequestID:    requestID,
		AgentID:      agentID,
		AgentName:    "Professional",
		OriginalText: "original text",
		UserID:       userID,
		Agent:        agent,
		Options: []voice.TransformOption{
			{Index: 0, Label: voice.TransformOptionConservative, Text: "Conservative version"},
			{Index: 1, Label: voice.TransformOptionModerate, Text: "Moderate version"},
			{Index: 2, Label: voice.TransformOptionBold, Text: "Bold version"},
		},
	}
	transformService.pendingCache.Set(requestID, pending)

	req := &voice.SelectTransformRequest{
		RequestID:           requestID,
		TransformationIndex: 1,
	}

	mockTransformRepo.On("Create", ctx, mock.MatchedBy(func(t *voice.TextTransformation) bool {
		return t.TransformationIndex == 1 &&
			t.TransformedBy == userID &&
			t.AgentID != nil &&
			*t.AgentID == agentID
	})).Return(nil)

	// Act
	resp, err := service.SelectTransformation(ctx, req, userID)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, resp)
	assert.Equal(t, "Moderate version", resp.Text)
	mockTransformRepo.AssertExpectations(t)

	// Verify pending was removed from cache
	_, ok := transformService.pendingCache.Get(requestID)
	assert.False(t, ok)
}

func TestSelectTransformation_InvalidRequest_InvalidIndex(t *testing.T) {
	// Arrange
	ctx := context.Background()
	userID := uuid.New()
	mockAgentService := new(MockAgentService)
	mockLLMClient := new(MockLLMClient)
	mockTransformRepo := new(MockTransformationRepository)

	req := &voice.SelectTransformRequest{
		RequestID:           uuid.New(),
		TransformationIndex: -1, // Invalid
	}

	service := NewTransformService(mockAgentService, mockLLMClient, mockTransformRepo)

	// Act
	resp, err := service.SelectTransformation(ctx, req, userID)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, resp)
}

func TestSelectTransformation_RequestNotFound(t *testing.T) {
	// Arrange
	ctx := context.Background()
	userID := uuid.New()
	mockAgentService := new(MockAgentService)
	mockLLMClient := new(MockLLMClient)
	mockTransformRepo := new(MockTransformationRepository)

	req := &voice.SelectTransformRequest{
		RequestID:           uuid.New(),
		TransformationIndex: 0,
	}

	service := NewTransformService(mockAgentService, mockLLMClient, mockTransformRepo)

	// Act
	resp, err := service.SelectTransformation(ctx, req, userID)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, resp)
	assert.Contains(t, err.Error(), "not found or expired")
}

func TestSelectTransformation_UserMismatch(t *testing.T) {
	// Arrange
	ctx := context.Background()
	agentID := uuid.New()
	userID := uuid.New()
	differentUserID := uuid.New()
	requestID := uuid.New()
	mockAgentService := new(MockAgentService)
	mockLLMClient := new(MockLLMClient)
	mockTransformRepo := new(MockTransformationRepository)

	agent := &voice.VoiceAgent{
		ID:     agentID,
		Name:   "Professional",
		Status: voice.VoiceAgentStatusActive,
	}

	service := NewTransformService(mockAgentService, mockLLMClient, mockTransformRepo)
	transformService := service.(*transformService)

	// Create pending transform with different user
	pending := &PendingTransform{
		RequestID: requestID,
		AgentID:   agentID,
		AgentName: "Professional",
		UserID:    userID, // Original user
		Agent:     agent,
		Options: []voice.TransformOption{
			{Index: 0, Label: voice.TransformOptionConservative, Text: "Option 1"},
		},
	}
	transformService.pendingCache.Set(requestID, pending)

	req := &voice.SelectTransformRequest{
		RequestID:           requestID,
		TransformationIndex: 0,
	}

	// Act - try with different user
	resp, err := service.SelectTransformation(ctx, req, differentUserID)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, resp)
	assert.Contains(t, err.Error(), "unauthorized")
}

func TestSelectTransformation_InvalidIndex(t *testing.T) {
	// Arrange
	ctx := context.Background()
	agentID := uuid.New()
	userID := uuid.New()
	requestID := uuid.New()
	mockAgentService := new(MockAgentService)
	mockLLMClient := new(MockLLMClient)
	mockTransformRepo := new(MockTransformationRepository)

	agent := &voice.VoiceAgent{
		ID:     agentID,
		Name:   "Professional",
		Status: voice.VoiceAgentStatusActive,
	}

	service := NewTransformService(mockAgentService, mockLLMClient, mockTransformRepo)
	transformService := service.(*transformService)

	pending := &PendingTransform{
		RequestID: requestID,
		AgentID:   agentID,
		UserID:    userID,
		Agent:     agent,
		Options: []voice.TransformOption{
			{Index: 0, Label: voice.TransformOptionConservative, Text: "Option 1"},
		}, // Only 1 option
	}
	transformService.pendingCache.Set(requestID, pending)

	req := &voice.SelectTransformRequest{
		RequestID:           requestID,
		TransformationIndex: 10, // Out of bounds
	}

	// Act
	resp, err := service.SelectTransformation(ctx, req, userID)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, resp)
	// Validation happens at request level, checking index bounds
	assert.Contains(t, err.Error(), "invalid request")
}

func TestSelectTransformation_RepositoryFailure(t *testing.T) {
	// Arrange
	ctx := context.Background()
	agentID := uuid.New()
	userID := uuid.New()
	requestID := uuid.New()
	mockAgentService := new(MockAgentService)
	mockLLMClient := new(MockLLMClient)
	mockTransformRepo := new(MockTransformationRepository)

	agent := &voice.VoiceAgent{
		ID:     agentID,
		Name:   "Professional",
		Status: voice.VoiceAgentStatusActive,
	}

	service := NewTransformService(mockAgentService, mockLLMClient, mockTransformRepo)
	transformService := service.(*transformService)

	pending := &PendingTransform{
		RequestID: requestID,
		AgentID:   agentID,
		UserID:    userID,
		Agent:     agent,
		Options: []voice.TransformOption{
			{Index: 0, Label: voice.TransformOptionConservative, Text: "Option 1"},
		},
	}
	transformService.pendingCache.Set(requestID, pending)

	req := &voice.SelectTransformRequest{
		RequestID:           requestID,
		TransformationIndex: 0,
	}

	mockTransformRepo.On("Create", ctx, mock.Anything).
		Return(context.DeadlineExceeded)

	// Act
	resp, err := service.SelectTransformation(ctx, req, userID)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, resp)
	mockTransformRepo.AssertExpectations(t)
}

// ============================================================================
// Test NewTransformService Initialization
// ============================================================================

func TestNewTransformService_NilAgentService(t *testing.T) {
	// Act & Assert
	assert.Panics(t, func() {
		NewTransformService(nil, new(MockLLMClient), new(MockTransformationRepository))
	})
}

func TestNewTransformService_NilLLMClient(t *testing.T) {
	// Act & Assert
	assert.Panics(t, func() {
		NewTransformService(new(MockAgentService), nil, new(MockTransformationRepository))
	})
}

func TestNewTransformService_NilRepository(t *testing.T) {
	// Act & Assert
	assert.Panics(t, func() {
		NewTransformService(new(MockAgentService), new(MockLLMClient), nil)
	})
}

func TestNewTransformService_Success(t *testing.T) {
	// Act
	service := NewTransformService(
		new(MockAgentService),
		new(MockLLMClient),
		new(MockTransformationRepository),
	)

	// Assert
	assert.NotNil(t, service)
}

// ============================================================================
// Test Cache Behavior
// ============================================================================

func TestPendingCache_SetAndGet(t *testing.T) {
	// Arrange
	cache := newPendingCache()
	id := uuid.New()
	pending := &PendingTransform{
		RequestID: id,
		AgentID:   uuid.New(),
	}

	// Act
	cache.Set(id, pending)
	retrieved, ok := cache.Get(id)

	// Assert
	assert.True(t, ok)
	assert.Equal(t, id, retrieved.RequestID)
}

func TestPendingCache_Delete(t *testing.T) {
	// Arrange
	cache := newPendingCache()
	id := uuid.New()
	pending := &PendingTransform{
		RequestID: id,
	}
	cache.Set(id, pending)

	// Act
	cache.Delete(id)
	_, ok := cache.Get(id)

	// Assert
	assert.False(t, ok)
}

func TestPendingCache_Cleanup(t *testing.T) {
	// Arrange
	cache := newPendingCache()
	expiredID := uuid.New()
	validID := uuid.New()

	// Add expired entry (1 hour ago)
	expiredEntry := &PendingTransform{
		RequestID: expiredID,
		CreatedAt: time.Now().Add(-1 * time.Hour),
	}
	cache.Set(expiredID, expiredEntry)

	// Add valid entry (just now)
	validEntry := &PendingTransform{
		RequestID: validID,
		CreatedAt: time.Now(),
	}
	cache.Set(validID, validEntry)

	// Act
	cache.Cleanup(30 * time.Minute) // Cleanup items older than 30 minutes

	// Assert
	_, expiredOk := cache.Get(expiredID)
	_, validOk := cache.Get(validID)
	assert.False(t, expiredOk)  // Expired should be gone
	assert.True(t, validOk)     // Valid should remain
}
