package postgres

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/phillipboles/aci-backend/internal/domain/voice"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// =============================================================================
// VoiceAgentRepository Unit Tests
// =============================================================================

func TestVoiceAgentRepository_Create_Unit(t *testing.T) {
	t.Run("failure - nil agent", func(t *testing.T) {
		repo := &voiceAgentRepository{}
		err := repo.Create(context.Background(), nil)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cannot be nil")
	})

	t.Run("failure - invalid agent (empty name)", func(t *testing.T) {
		repo := &voiceAgentRepository{}
		agent := &voice.VoiceAgent{
			ID:           uuid.New(),
			Name:         "", // Invalid - empty
			SystemPrompt: "Valid prompt",
			Temperature:  0.7,
			MaxTokens:    2000,
			Status:       voice.VoiceAgentStatusActive,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}

		err := repo.Create(context.Background(), agent)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid")
	})

	t.Run("failure - invalid temperature", func(t *testing.T) {
		repo := &voiceAgentRepository{}
		agent := &voice.VoiceAgent{
			ID:           uuid.New(),
			Name:         "Test Agent",
			SystemPrompt: "Valid prompt",
			Temperature:  1.5, // Invalid - > 1.0
			MaxTokens:    2000,
			Status:       voice.VoiceAgentStatusActive,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}

		err := repo.Create(context.Background(), agent)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid")
	})
}

func TestVoiceAgentRepository_GetByID_Unit(t *testing.T) {
	t.Run("failure - nil ID", func(t *testing.T) {
		repo := &voiceAgentRepository{}
		_, err := repo.GetByID(context.Background(), uuid.Nil)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cannot be nil")
	})
}

func TestVoiceAgentRepository_GetByName_Unit(t *testing.T) {
	t.Run("failure - empty name", func(t *testing.T) {
		repo := &voiceAgentRepository{}
		_, err := repo.GetByName(context.Background(), "")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cannot be empty")
	})
}

func TestVoiceAgentRepository_Update_Unit(t *testing.T) {
	t.Run("failure - nil agent", func(t *testing.T) {
		repo := &voiceAgentRepository{}
		err := repo.Update(context.Background(), nil)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cannot be nil")
	})

	t.Run("failure - invalid agent", func(t *testing.T) {
		repo := &voiceAgentRepository{}
		agent := &voice.VoiceAgent{
			ID:           uuid.New(),
			Name:         "", // Invalid
			SystemPrompt: "prompt",
			Temperature:  0.7,
			MaxTokens:    2000,
			Status:       voice.VoiceAgentStatusActive,
		}

		err := repo.Update(context.Background(), agent)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid")
	})
}

func TestVoiceAgentRepository_Delete_Unit(t *testing.T) {
	t.Run("failure - nil ID", func(t *testing.T) {
		repo := &voiceAgentRepository{}
		err := repo.Delete(context.Background(), uuid.Nil)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cannot be nil")
	})
}

func TestVoiceAgentRepository_UpdateStatus_Unit(t *testing.T) {
	t.Run("failure - nil ID", func(t *testing.T) {
		repo := &voiceAgentRepository{}
		err := repo.UpdateStatus(context.Background(), uuid.Nil, voice.VoiceAgentStatusActive)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cannot be nil")
	})

	t.Run("failure - invalid status", func(t *testing.T) {
		repo := &voiceAgentRepository{}
		err := repo.UpdateStatus(context.Background(), uuid.New(), voice.VoiceAgentStatus("invalid"))
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid status")
	})
}

func TestVoiceAgentRepository_List_Unit(t *testing.T) {
	t.Run("handles nil filter gracefully", func(t *testing.T) {
		// Filter defaults are applied internally, so nil filter should work
		// This test verifies the defaults mechanism without DB
		filter := &voice.VoiceAgentFilter{}
		filter.WithDefaults()

		assert.Equal(t, 1, filter.Page)
		assert.Equal(t, 20, filter.PageSize)
	})

	t.Run("invalid filter - page too small", func(t *testing.T) {
		filter := &voice.VoiceAgentFilter{Page: 0, PageSize: 10}
		err := filter.Validate()
		assert.Error(t, err)
	})
}

// =============================================================================
// StyleRuleRepository Unit Tests
// =============================================================================

func TestStyleRuleRepository_Create_Unit(t *testing.T) {
	t.Run("failure - nil rule", func(t *testing.T) {
		repo := &styleRuleRepository{}
		err := repo.Create(context.Background(), nil)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cannot be nil")
	})

	t.Run("failure - invalid rule (empty text)", func(t *testing.T) {
		repo := &styleRuleRepository{}
		rule := &voice.StyleRule{
			ID:        uuid.New(),
			AgentID:   uuid.New(),
			RuleType:  voice.RuleTypeDo,
			RuleText:  "", // Invalid
			SortOrder: 0,
			CreatedAt: time.Now(),
		}

		err := repo.Create(context.Background(), rule)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid")
	})

	t.Run("failure - invalid rule type", func(t *testing.T) {
		repo := &styleRuleRepository{}
		rule := &voice.StyleRule{
			ID:        uuid.New(),
			AgentID:   uuid.New(),
			RuleType:  voice.RuleType("invalid"),
			RuleText:  "Valid text",
			SortOrder: 0,
			CreatedAt: time.Now(),
		}

		err := repo.Create(context.Background(), rule)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid")
	})
}

func TestStyleRuleRepository_GetByID_Unit(t *testing.T) {
	t.Run("failure - nil ID", func(t *testing.T) {
		repo := &styleRuleRepository{}
		_, err := repo.GetByID(context.Background(), uuid.Nil)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cannot be nil")
	})
}

func TestStyleRuleRepository_GetByAgentID_Unit(t *testing.T) {
	t.Run("failure - nil agent ID", func(t *testing.T) {
		repo := &styleRuleRepository{}
		_, err := repo.GetByAgentID(context.Background(), uuid.Nil)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cannot be nil")
	})
}

func TestStyleRuleRepository_Update_Unit(t *testing.T) {
	t.Run("failure - nil rule", func(t *testing.T) {
		repo := &styleRuleRepository{}
		err := repo.Update(context.Background(), nil)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cannot be nil")
	})
}

func TestStyleRuleRepository_Delete_Unit(t *testing.T) {
	t.Run("failure - nil ID", func(t *testing.T) {
		repo := &styleRuleRepository{}
		err := repo.Delete(context.Background(), uuid.Nil)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cannot be nil")
	})
}

func TestStyleRuleRepository_DeleteByAgentID_Unit(t *testing.T) {
	t.Run("failure - nil agent ID", func(t *testing.T) {
		repo := &styleRuleRepository{}
		err := repo.DeleteByAgentID(context.Background(), uuid.Nil)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cannot be nil")
	})
}

func TestStyleRuleRepository_BulkCreate_Unit(t *testing.T) {
	t.Run("success - empty slice", func(t *testing.T) {
		repo := &styleRuleRepository{}
		err := repo.BulkCreate(context.Background(), []voice.StyleRule{})
		assert.NoError(t, err)
	})
}

func TestStyleRuleRepository_UpdateSortOrder_Unit(t *testing.T) {
	t.Run("success - empty positions", func(t *testing.T) {
		repo := &styleRuleRepository{}
		err := repo.UpdateSortOrder(context.Background(), uuid.New(), map[uuid.UUID]int{})
		assert.NoError(t, err)
	})
}

// =============================================================================
// ExampleRepository Unit Tests
// =============================================================================

func TestExampleRepository_Create_Unit(t *testing.T) {
	t.Run("failure - nil example", func(t *testing.T) {
		repo := &exampleRepository{}
		err := repo.Create(context.Background(), nil)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cannot be nil")
	})

	t.Run("failure - invalid example (empty before text)", func(t *testing.T) {
		repo := &exampleRepository{}
		example := &voice.Example{
			ID:         uuid.New(),
			AgentID:    uuid.New(),
			BeforeText: "", // Invalid
			AfterText:  "Valid after",
			SortOrder:  0,
			CreatedAt:  time.Now(),
		}

		err := repo.Create(context.Background(), example)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid")
	})

	t.Run("failure - invalid example (empty after text)", func(t *testing.T) {
		repo := &exampleRepository{}
		example := &voice.Example{
			ID:         uuid.New(),
			AgentID:    uuid.New(),
			BeforeText: "Valid before",
			AfterText:  "", // Invalid
			SortOrder:  0,
			CreatedAt:  time.Now(),
		}

		err := repo.Create(context.Background(), example)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "invalid")
	})
}

func TestExampleRepository_GetByID_Unit(t *testing.T) {
	t.Run("failure - nil ID", func(t *testing.T) {
		repo := &exampleRepository{}
		_, err := repo.GetByID(context.Background(), uuid.Nil)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cannot be nil")
	})
}

func TestExampleRepository_GetByAgentID_Unit(t *testing.T) {
	t.Run("failure - nil agent ID", func(t *testing.T) {
		repo := &exampleRepository{}
		_, err := repo.GetByAgentID(context.Background(), uuid.Nil)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cannot be nil")
	})
}

func TestExampleRepository_Update_Unit(t *testing.T) {
	t.Run("failure - nil example", func(t *testing.T) {
		repo := &exampleRepository{}
		err := repo.Update(context.Background(), nil)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cannot be nil")
	})
}

func TestExampleRepository_Delete_Unit(t *testing.T) {
	t.Run("failure - nil ID", func(t *testing.T) {
		repo := &exampleRepository{}
		err := repo.Delete(context.Background(), uuid.Nil)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cannot be nil")
	})
}

func TestExampleRepository_DeleteByAgentID_Unit(t *testing.T) {
	t.Run("failure - nil agent ID", func(t *testing.T) {
		repo := &exampleRepository{}
		err := repo.DeleteByAgentID(context.Background(), uuid.Nil)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "cannot be nil")
	})
}

func TestExampleRepository_BulkCreate_Unit(t *testing.T) {
	t.Run("success - empty slice", func(t *testing.T) {
		repo := &exampleRepository{}
		err := repo.BulkCreate(context.Background(), []voice.Example{})
		assert.NoError(t, err)
	})
}

func TestExampleRepository_UpdateSortOrder_Unit(t *testing.T) {
	t.Run("success - empty positions", func(t *testing.T) {
		repo := &exampleRepository{}
		err := repo.UpdateSortOrder(context.Background(), uuid.New(), map[uuid.UUID]int{})
		assert.NoError(t, err)
	})
}

// =============================================================================
// Integration Tests
// =============================================================================
// These tests require a running PostgreSQL database with the schema loaded.
// Run with: go test -v -run Integration ./internal/repository/postgres/...
// Skip with: go test -short ./internal/repository/postgres/...

func TestVoiceAgentRepository_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	// Setup test database - reuse existing setup from integration package
	t.Skip("Integration test - requires database container setup")

	// Example implementation for when database is available:
	/*
		db := setupTestDB(t)
		defer teardownTestDB(t, db)

		repo := NewVoiceAgentRepository(db)
		ctx := context.Background()

		t.Run("full CRUD lifecycle", func(t *testing.T) {
			// Create
			agent := createTestVoiceAgent(t)
			err := repo.Create(ctx, agent)
			require.NoError(t, err)

			// Read
			retrieved, err := repo.GetByID(ctx, agent.ID)
			require.NoError(t, err)
			assert.Equal(t, agent.Name, retrieved.Name)

			// Update
			agent.Name = "Updated Name"
			err = repo.Update(ctx, agent)
			require.NoError(t, err)

			updated, err := repo.GetByID(ctx, agent.ID)
			require.NoError(t, err)
			assert.Equal(t, "Updated Name", updated.Name)

			// Delete (soft delete)
			err = repo.Delete(ctx, agent.ID)
			require.NoError(t, err)

			// Verify soft deleted
			_, err = repo.GetByID(ctx, agent.ID)
			assert.Error(t, err)
			assert.Contains(t, err.Error(), "not found")
		})
	*/
}

func TestStyleRuleRepository_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	t.Skip("Integration test - requires database container setup")
}

func TestExampleRepository_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	t.Skip("Integration test - requires database container setup")
}

// =============================================================================
// Test Helpers
// =============================================================================

func createTestVoiceAgent(t *testing.T) *voice.VoiceAgent {
	t.Helper()

	userID := uuid.New()
	return &voice.VoiceAgent{
		ID:           uuid.New(),
		Name:         "Test Voice Agent " + uuid.New().String()[:8],
		Description:  "Test description",
		SystemPrompt: "You are a test voice agent.",
		Temperature:  0.7,
		MaxTokens:    2000,
		Status:       voice.VoiceAgentStatusActive,
		Version:      1,
		CreatedBy:    &userID,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
}

func createTestStyleRule(t *testing.T, agentID uuid.UUID) *voice.StyleRule {
	t.Helper()

	return &voice.StyleRule{
		ID:        uuid.New(),
		AgentID:   agentID,
		RuleType:  voice.RuleTypeDo,
		RuleText:  "Test rule: Use active voice",
		SortOrder: 0,
		CreatedAt: time.Now(),
	}
}

func createTestExample(t *testing.T, agentID uuid.UUID) *voice.Example {
	t.Helper()

	return &voice.Example{
		ID:         uuid.New(),
		AgentID:    agentID,
		BeforeText: "We offer comprehensive solutions.",
		AfterText:  "Your team gets powerful tools that work.",
		Context:    "Marketing copy transformation",
		SortOrder:  0,
		CreatedAt:  time.Now(),
	}
}

// ValidateVoiceAgentStatus tests the status validation
func TestVoiceAgentStatus_Validation(t *testing.T) {
	t.Run("valid statuses", func(t *testing.T) {
		validStatuses := []voice.VoiceAgentStatus{
			voice.VoiceAgentStatusActive,
			voice.VoiceAgentStatusInactive,
			voice.VoiceAgentStatusDraft,
		}

		for _, status := range validStatuses {
			assert.True(t, status.IsValid(), "expected %s to be valid", status)
		}
	})

	t.Run("invalid status", func(t *testing.T) {
		invalid := voice.VoiceAgentStatus("unknown")
		assert.False(t, invalid.IsValid())
	})
}

// ValidateRuleType tests the rule type validation
func TestRuleType_Validation(t *testing.T) {
	t.Run("valid rule types", func(t *testing.T) {
		validTypes := []voice.RuleType{
			voice.RuleTypeDo,
			voice.RuleTypeDont,
		}

		for _, ruleType := range validTypes {
			assert.True(t, ruleType.IsValid(), "expected %s to be valid", ruleType)
		}
	})

	t.Run("invalid rule type", func(t *testing.T) {
		invalid := voice.RuleType("maybe")
		assert.False(t, invalid.IsValid())
	})
}

// TestVoiceAgentFilter tests filter validation and defaults
func TestVoiceAgentFilter_Unit(t *testing.T) {
	t.Run("applies defaults", func(t *testing.T) {
		filter := &voice.VoiceAgentFilter{}
		filter.WithDefaults()

		assert.Equal(t, 1, filter.Page)
		assert.Equal(t, 20, filter.PageSize)
	})

	t.Run("respects custom values", func(t *testing.T) {
		filter := &voice.VoiceAgentFilter{
			Page:     3,
			PageSize: 50,
		}
		filter.WithDefaults()

		assert.Equal(t, 3, filter.Page)
		assert.Equal(t, 50, filter.PageSize)
	})

	t.Run("validates page size limits", func(t *testing.T) {
		filter := &voice.VoiceAgentFilter{
			Page:     1,
			PageSize: 200, // exceeds max
		}

		err := filter.Validate()
		assert.Error(t, err)
	})

	t.Run("calculates correct offset", func(t *testing.T) {
		filter := &voice.VoiceAgentFilter{
			Page:     3,
			PageSize: 10,
		}

		assert.Equal(t, 20, filter.Offset())
	})
}

// TestVoiceAgent_Validation tests domain entity validation
func TestVoiceAgent_Validation(t *testing.T) {
	t.Run("valid agent passes", func(t *testing.T) {
		agent := &voice.VoiceAgent{
			ID:           uuid.New(),
			Name:         "Test Agent",
			SystemPrompt: "You are a helpful assistant.",
			Temperature:  0.7,
			MaxTokens:    2000,
			Status:       voice.VoiceAgentStatusActive,
		}

		err := agent.Validate()
		require.NoError(t, err)
	})

	t.Run("empty name fails", func(t *testing.T) {
		agent := &voice.VoiceAgent{
			ID:           uuid.New(),
			Name:         "",
			SystemPrompt: "prompt",
			Temperature:  0.7,
			MaxTokens:    2000,
			Status:       voice.VoiceAgentStatusActive,
		}

		err := agent.Validate()
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "name")
	})

	t.Run("empty system prompt fails", func(t *testing.T) {
		agent := &voice.VoiceAgent{
			ID:           uuid.New(),
			Name:         "Test",
			SystemPrompt: "",
			Temperature:  0.7,
			MaxTokens:    2000,
			Status:       voice.VoiceAgentStatusActive,
		}

		err := agent.Validate()
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "system_prompt")
	})

	t.Run("temperature out of range fails", func(t *testing.T) {
		agent := &voice.VoiceAgent{
			ID:           uuid.New(),
			Name:         "Test",
			SystemPrompt: "prompt",
			Temperature:  -0.1,
			MaxTokens:    2000,
			Status:       voice.VoiceAgentStatusActive,
		}

		err := agent.Validate()
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "temperature")
	})

	t.Run("max tokens out of range fails", func(t *testing.T) {
		agent := &voice.VoiceAgent{
			ID:           uuid.New(),
			Name:         "Test",
			SystemPrompt: "prompt",
			Temperature:  0.7,
			MaxTokens:    50, // too low
			Status:       voice.VoiceAgentStatusActive,
		}

		err := agent.Validate()
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "max_tokens")
	})
}

// TestStyleRule_Validation tests style rule validation
func TestStyleRule_Validation(t *testing.T) {
	t.Run("valid rule passes", func(t *testing.T) {
		rule := &voice.StyleRule{
			ID:       uuid.New(),
			AgentID:  uuid.New(),
			RuleType: voice.RuleTypeDo,
			RuleText: "Use active voice",
		}

		err := rule.Validate()
		require.NoError(t, err)
	})

	t.Run("nil agent ID fails", func(t *testing.T) {
		rule := &voice.StyleRule{
			ID:       uuid.New(),
			AgentID:  uuid.Nil,
			RuleType: voice.RuleTypeDo,
			RuleText: "Use active voice",
		}

		err := rule.Validate()
		assert.Error(t, err)
	})

	t.Run("empty rule text fails", func(t *testing.T) {
		rule := &voice.StyleRule{
			ID:       uuid.New(),
			AgentID:  uuid.New(),
			RuleType: voice.RuleTypeDo,
			RuleText: "",
		}

		err := rule.Validate()
		assert.Error(t, err)
	})

	t.Run("invalid rule type fails", func(t *testing.T) {
		rule := &voice.StyleRule{
			ID:       uuid.New(),
			AgentID:  uuid.New(),
			RuleType: voice.RuleType("maybe"),
			RuleText: "Some text",
		}

		err := rule.Validate()
		assert.Error(t, err)
	})
}

// TestExample_Validation tests example validation
func TestExample_Validation(t *testing.T) {
	t.Run("valid example passes", func(t *testing.T) {
		example := &voice.Example{
			ID:         uuid.New(),
			AgentID:    uuid.New(),
			BeforeText: "Before text",
			AfterText:  "After text",
		}

		err := example.Validate()
		require.NoError(t, err)
	})

	t.Run("nil agent ID fails", func(t *testing.T) {
		example := &voice.Example{
			ID:         uuid.New(),
			AgentID:    uuid.Nil,
			BeforeText: "Before",
			AfterText:  "After",
		}

		err := example.Validate()
		assert.Error(t, err)
	})

	t.Run("empty before text fails", func(t *testing.T) {
		example := &voice.Example{
			ID:         uuid.New(),
			AgentID:    uuid.New(),
			BeforeText: "",
			AfterText:  "After",
		}

		err := example.Validate()
		assert.Error(t, err)
	})

	t.Run("empty after text fails", func(t *testing.T) {
		example := &voice.Example{
			ID:         uuid.New(),
			AgentID:    uuid.New(),
			BeforeText: "Before",
			AfterText:  "",
		}

		err := example.Validate()
		assert.Error(t, err)
	})
}