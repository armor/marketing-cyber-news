package voice

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/phillipboles/aci-backend/internal/domain/voice"
)

// ============================================================================
// Mock Repository
// ============================================================================

type MockVoiceAgentRepository struct {
	mock.Mock
}

func (m *MockVoiceAgentRepository) Create(ctx context.Context, agent *voice.VoiceAgent) error {
	args := m.Called(ctx, agent)
	return args.Error(0)
}

func (m *MockVoiceAgentRepository) GetByID(ctx context.Context, id uuid.UUID) (*voice.VoiceAgent, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*voice.VoiceAgent), args.Error(1)
}

func (m *MockVoiceAgentRepository) GetWithRulesAndExamples(ctx context.Context, id uuid.UUID) (*voice.VoiceAgent, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*voice.VoiceAgent), args.Error(1)
}

func (m *MockVoiceAgentRepository) GetByName(ctx context.Context, name string) (*voice.VoiceAgent, error) {
	args := m.Called(ctx, name)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*voice.VoiceAgent), args.Error(1)
}

func (m *MockVoiceAgentRepository) ListActive(ctx context.Context) ([]*voice.VoiceAgent, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*voice.VoiceAgent), args.Error(1)
}

func (m *MockVoiceAgentRepository) List(ctx context.Context, filter *voice.VoiceAgentFilter) ([]*voice.VoiceAgent, int, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]*voice.VoiceAgent), args.Int(1), args.Error(2)
}

func (m *MockVoiceAgentRepository) Update(ctx context.Context, agent *voice.VoiceAgent) error {
	args := m.Called(ctx, agent)
	return args.Error(0)
}

func (m *MockVoiceAgentRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockVoiceAgentRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status voice.VoiceAgentStatus) error {
	args := m.Called(ctx, id, status)
	return args.Error(0)
}

// ============================================================================
// Test ListActiveAgents
// ============================================================================

func TestListActiveAgents_HappyPath(t *testing.T) {
	// Arrange
	ctx := context.Background()
	mockRepo := new(MockVoiceAgentRepository)

	activeAgent1 := &voice.VoiceAgent{
		ID:     uuid.New(),
		Name:   "Professional",
		Status: voice.VoiceAgentStatusActive,
	}
	activeAgent2 := &voice.VoiceAgent{
		ID:     uuid.New(),
		Name:   "Casual",
		Status: voice.VoiceAgentStatusActive,
	}

	mockRepo.On("ListActive", ctx).Return([]*voice.VoiceAgent{activeAgent1, activeAgent2}, nil)

	service := NewAgentService(mockRepo)

	// Act
	agents, err := service.ListActiveAgents(ctx)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, agents, 2)
	assert.Equal(t, "Professional", agents[0].Name)
	assert.Equal(t, "Casual", agents[1].Name)
	mockRepo.AssertExpectations(t)
}

func TestListActiveAgents_EmptyList(t *testing.T) {
	// Arrange
	ctx := context.Background()
	mockRepo := new(MockVoiceAgentRepository)

	mockRepo.On("ListActive", ctx).Return([]*voice.VoiceAgent{}, nil)

	service := NewAgentService(mockRepo)

	// Act
	agents, err := service.ListActiveAgents(ctx)

	// Assert
	assert.NoError(t, err)
	assert.Len(t, agents, 0)
	mockRepo.AssertExpectations(t)
}

func TestListActiveAgents_RepositoryFailure(t *testing.T) {
	// Arrange
	ctx := context.Background()
	mockRepo := new(MockVoiceAgentRepository)

	mockRepo.On("ListActive", ctx).Return(nil, context.DeadlineExceeded)

	service := NewAgentService(mockRepo)

	// Act
	agents, err := service.ListActiveAgents(ctx)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, agents)
	mockRepo.AssertExpectations(t)
}

// ============================================================================
// Test GetAgentByID
// ============================================================================

func TestGetAgentByID_HappyPath(t *testing.T) {
	// Arrange
	ctx := context.Background()
	agentID := uuid.New()
	mockRepo := new(MockVoiceAgentRepository)

	agent := &voice.VoiceAgent{
		ID:     agentID,
		Name:   "Professional",
		Status: voice.VoiceAgentStatusActive,
		StyleRules: []voice.StyleRule{
			{ID: uuid.New(), RuleType: voice.RuleTypeDo, RuleText: "Be formal"},
		},
		Examples: []voice.Example{
			{ID: uuid.New(), BeforeText: "Hi", AfterText: "Hello"},
		},
	}

	mockRepo.On("GetWithRulesAndExamples", ctx, agentID).Return(agent, nil)

	service := NewAgentService(mockRepo)

	// Act
	result, err := service.GetAgentByID(ctx, agentID)

	// Assert
	assert.NoError(t, err)
	assert.Equal(t, agentID, result.ID)
	assert.Equal(t, "Professional", result.Name)
	assert.Len(t, result.StyleRules, 1)
	assert.Len(t, result.Examples, 1)
	mockRepo.AssertExpectations(t)
}

func TestGetAgentByID_NotFound(t *testing.T) {
	// Arrange
	ctx := context.Background()
	agentID := uuid.New()
	mockRepo := new(MockVoiceAgentRepository)

	mockRepo.On("GetWithRulesAndExamples", ctx, agentID).Return(nil, context.DeadlineExceeded)

	service := NewAgentService(mockRepo)

	// Act
	result, err := service.GetAgentByID(ctx, agentID)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, result)
	mockRepo.AssertExpectations(t)
}

func TestGetAgentByID_EmptyID(t *testing.T) {
	// Arrange
	ctx := context.Background()
	mockRepo := new(MockVoiceAgentRepository)

	service := NewAgentService(mockRepo)

	// Act
	result, err := service.GetAgentByID(ctx, uuid.Nil)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "agent ID cannot be empty")
	mockRepo.AssertNotCalled(t, "GetWithRulesAndExamples")
}

func TestGetAgentByID_InactiveAgent(t *testing.T) {
	// Arrange
	ctx := context.Background()
	agentID := uuid.New()
	mockRepo := new(MockVoiceAgentRepository)

	agent := &voice.VoiceAgent{
		ID:     agentID,
		Name:   "Inactive Agent",
		Status: voice.VoiceAgentStatusDraft, // Not active
	}

	mockRepo.On("GetWithRulesAndExamples", ctx, agentID).Return(agent, nil)

	service := NewAgentService(mockRepo)

	// Act - should still return the agent but log warning
	result, err := service.GetAgentByID(ctx, agentID)

	// Assert
	assert.NoError(t, err)
	assert.Equal(t, agentID, result.ID)
	assert.False(t, result.IsActive())
	mockRepo.AssertExpectations(t)
}

// ============================================================================
// Test BuildSystemPrompt
// ============================================================================

func TestBuildSystemPrompt_BasePromptOnly(t *testing.T) {
	// Arrange
	agent := &voice.VoiceAgent{
		SystemPrompt: "You are a professional writer.",
	}
	mockRepo := new(MockVoiceAgentRepository)
	service := NewAgentService(mockRepo)

	// Act
	prompt := service.BuildSystemPrompt(agent)

	// Assert
	assert.Equal(t, "You are a professional writer.", prompt)
}

func TestBuildSystemPrompt_WithStyleRules(t *testing.T) {
	// Arrange
	agent := &voice.VoiceAgent{
		SystemPrompt: "You are a professional writer.",
		StyleRules: []voice.StyleRule{
			{RuleType: voice.RuleTypeDo, RuleText: "Use formal language"},
			{RuleType: voice.RuleTypeDo, RuleText: "Avoid contractions"},
			{RuleType: voice.RuleTypeDont, RuleText: "Do not use slang"},
		},
	}
	mockRepo := new(MockVoiceAgentRepository)
	service := NewAgentService(mockRepo)

	// Act
	prompt := service.BuildSystemPrompt(agent)

	// Assert
	assert.Contains(t, prompt, "You are a professional writer.")
	assert.Contains(t, prompt, "## Style Guidelines")
	assert.Contains(t, prompt, "### DO:")
	assert.Contains(t, prompt, "Use formal language")
	assert.Contains(t, prompt, "Avoid contractions")
	assert.Contains(t, prompt, "### DON'T:")
	assert.Contains(t, prompt, "Do not use slang")
	mockRepo.AssertNotCalled(t, "GetWithRulesAndExamples")
}

func TestBuildSystemPrompt_WithExamples(t *testing.T) {
	// Arrange
	agent := &voice.VoiceAgent{
		SystemPrompt: "Transform text to professional tone.",
		Examples: []voice.Example{
			{
				BeforeText: "hey",
				AfterText:  "hello",
				Context:    "greeting",
			},
			{
				BeforeText: "gonna",
				AfterText:  "going to",
			},
		},
	}
	mockRepo := new(MockVoiceAgentRepository)
	service := NewAgentService(mockRepo)

	// Act
	prompt := service.BuildSystemPrompt(agent)

	// Assert
	assert.Contains(t, prompt, "Transform text to professional tone.")
	assert.Contains(t, prompt, "## Examples")
	assert.Contains(t, prompt, "### Example 1 (greeting)")
	assert.Contains(t, prompt, "**Before:** hey")
	assert.Contains(t, prompt, "**After:** hello")
	assert.Contains(t, prompt, "### Example 2")
	assert.Contains(t, prompt, "**Before:** gonna")
	assert.Contains(t, prompt, "**After:** going to")
}

func TestBuildSystemPrompt_Complete(t *testing.T) {
	// Arrange
	agent := &voice.VoiceAgent{
		SystemPrompt: "You are a professional writer.",
		StyleRules: []voice.StyleRule{
			{RuleType: voice.RuleTypeDo, RuleText: "Use formal language"},
			{RuleType: voice.RuleTypeDont, RuleText: "Do not use slang"},
		},
		Examples: []voice.Example{
			{BeforeText: "hey", AfterText: "hello"},
		},
	}
	mockRepo := new(MockVoiceAgentRepository)
	service := NewAgentService(mockRepo)

	// Act
	prompt := service.BuildSystemPrompt(agent)

	// Assert
	// Verify all sections are present
	assert.Contains(t, prompt, "You are a professional writer.")
	assert.Contains(t, prompt, "## Style Guidelines")
	assert.Contains(t, prompt, "## Examples")
	// Verify structure
	lines := len(prompt)
	assert.Greater(t, lines, 50)
}

func TestBuildSystemPrompt_NilAgent(t *testing.T) {
	// Arrange
	mockRepo := new(MockVoiceAgentRepository)
	service := NewAgentService(mockRepo)

	// Act
	prompt := service.BuildSystemPrompt(nil)

	// Assert
	assert.Equal(t, "", prompt)
}

// ============================================================================
// Test CreateAgent
// ============================================================================

func TestCreateAgent_HappyPath(t *testing.T) {
	// Arrange
	ctx := context.Background()
	createdBy := uuid.New()
	mockRepo := new(MockVoiceAgentRepository)

	agent := &voice.VoiceAgent{
		Name:         "Professional",
		Description:  "Professional writing style",
		SystemPrompt: "You are a professional writer.",
		Temperature:  0.7,
		MaxTokens:    2000,
		Status:       voice.VoiceAgentStatusDraft,
	}

	mockRepo.On("Create", ctx, mock.MatchedBy(func(a *voice.VoiceAgent) bool {
		return a.Name == "Professional" &&
			a.CreatedBy != nil &&
			*a.CreatedBy == createdBy &&
			a.Version == 1
	})).Return(nil)

	service := NewAgentService(mockRepo)

	// Act
	err := service.CreateAgent(ctx, agent, createdBy)

	// Assert
	assert.NoError(t, err)
	assert.Equal(t, createdBy, *agent.CreatedBy)
	assert.Equal(t, 1, agent.Version)
	mockRepo.AssertExpectations(t)
}

func TestCreateAgent_ValidationFailure(t *testing.T) {
	// Arrange
	ctx := context.Background()
	createdBy := uuid.New()
	mockRepo := new(MockVoiceAgentRepository)

	agent := &voice.VoiceAgent{
		Name:         "", // Empty - should fail validation
		SystemPrompt: "You are a writer.",
	}

	service := NewAgentService(mockRepo)

	// Act
	err := service.CreateAgent(ctx, agent, createdBy)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid agent")
	mockRepo.AssertNotCalled(t, "Create")
}

func TestCreateAgent_RepositoryFailure(t *testing.T) {
	// Arrange
	ctx := context.Background()
	createdBy := uuid.New()
	mockRepo := new(MockVoiceAgentRepository)

	agent := &voice.VoiceAgent{
		Name:         "Professional",
		SystemPrompt: "You are a writer.",
		Temperature:  0.7,
		MaxTokens:    2000,
	}

	mockRepo.On("Create", ctx, mock.Anything).Return(context.DeadlineExceeded)

	service := NewAgentService(mockRepo)

	// Act
	err := service.CreateAgent(ctx, agent, createdBy)

	// Assert
	assert.Error(t, err)
	mockRepo.AssertExpectations(t)
}

// ============================================================================
// Test UpdateAgent
// ============================================================================

func TestUpdateAgent_HappyPath(t *testing.T) {
	// Arrange
	ctx := context.Background()
	agentID := uuid.New()
	mockRepo := new(MockVoiceAgentRepository)

	agent := &voice.VoiceAgent{
		ID:           agentID,
		Name:         "Updated Professional",
		SystemPrompt: "Updated prompt",
		Temperature:  0.8,
		MaxTokens:    2500,
		Status:       voice.VoiceAgentStatusActive,
	}

	mockRepo.On("Update", ctx, mock.MatchedBy(func(a *voice.VoiceAgent) bool {
		return a.ID == agentID &&
			a.Name == "Updated Professional" &&
			!a.UpdatedAt.IsZero()
	})).Return(nil)

	service := NewAgentService(mockRepo)

	// Act
	err := service.UpdateAgent(ctx, agent)

	// Assert
	assert.NoError(t, err)
	assert.NotZero(t, agent.UpdatedAt)
	mockRepo.AssertExpectations(t)
}

func TestUpdateAgent_EmptyID(t *testing.T) {
	// Arrange
	ctx := context.Background()
	mockRepo := new(MockVoiceAgentRepository)

	agent := &voice.VoiceAgent{
		ID:           uuid.Nil,
		Name:         "Test",
		SystemPrompt: "Test",
	}

	service := NewAgentService(mockRepo)

	// Act
	err := service.UpdateAgent(ctx, agent)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "agent ID cannot be empty")
	mockRepo.AssertNotCalled(t, "Update")
}

// ============================================================================
// Test DeleteAgent
// ============================================================================

func TestDeleteAgent_HappyPath(t *testing.T) {
	// Arrange
	ctx := context.Background()
	agentID := uuid.New()
	mockRepo := new(MockVoiceAgentRepository)

	mockRepo.On("Delete", ctx, agentID).Return(nil)

	service := NewAgentService(mockRepo)

	// Act
	err := service.DeleteAgent(ctx, agentID)

	// Assert
	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestDeleteAgent_EmptyID(t *testing.T) {
	// Arrange
	ctx := context.Background()
	mockRepo := new(MockVoiceAgentRepository)

	service := NewAgentService(mockRepo)

	// Act
	err := service.DeleteAgent(ctx, uuid.Nil)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "agent ID cannot be empty")
	mockRepo.AssertNotCalled(t, "Delete")
}

func TestDeleteAgent_NotFound(t *testing.T) {
	// Arrange
	ctx := context.Background()
	agentID := uuid.New()
	mockRepo := new(MockVoiceAgentRepository)

	mockRepo.On("Delete", ctx, agentID).Return(context.DeadlineExceeded)

	service := NewAgentService(mockRepo)

	// Act
	err := service.DeleteAgent(ctx, agentID)

	// Assert
	assert.Error(t, err)
	mockRepo.AssertExpectations(t)
}

// ============================================================================
// Test NewAgentService Initialization
// ============================================================================

func TestNewAgentService_NilRepository(t *testing.T) {
	// Act & Assert
	assert.Panics(t, func() {
		NewAgentService(nil)
	})
}

func TestNewAgentService_Success(t *testing.T) {
	// Arrange
	mockRepo := new(MockVoiceAgentRepository)

	// Act
	service := NewAgentService(mockRepo)

	// Assert
	assert.NotNil(t, service)
}
