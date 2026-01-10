package voice

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestExample_Validate(t *testing.T) {
	validExample := func() *Example {
		return &Example{
			ID:         uuid.New(),
			AgentID:    uuid.New(),
			BeforeText: "This is the original text that needs to be transformed.",
			AfterText:  "This is the transformed text with the new voice applied.",
		}
	}

	tests := []struct {
		name    string
		modify  func(*Example)
		wantErr string
	}{
		{
			name:    "valid example passes",
			modify:  func(e *Example) {},
			wantErr: "",
		},
		{
			name:    "nil agent_id fails",
			modify:  func(e *Example) { e.AgentID = uuid.Nil },
			wantErr: "agent_id is required",
		},
		{
			name:    "empty before_text fails",
			modify:  func(e *Example) { e.BeforeText = "" },
			wantErr: "before_text is required",
		},
		{
			name:    "whitespace only before_text fails",
			modify:  func(e *Example) { e.BeforeText = "   " },
			wantErr: "before_text is required",
		},
		{
			name:    "before_text too long fails",
			modify:  func(e *Example) { e.BeforeText = string(make([]byte, 5001)) },
			wantErr: "before_text must not exceed 5000 characters",
		},
		{
			name:    "empty after_text fails",
			modify:  func(e *Example) { e.AfterText = "" },
			wantErr: "after_text is required",
		},
		{
			name:    "whitespace only after_text fails",
			modify:  func(e *Example) { e.AfterText = "   " },
			wantErr: "after_text is required",
		},
		{
			name:    "after_text too long fails",
			modify:  func(e *Example) { e.AfterText = string(make([]byte, 5001)) },
			wantErr: "after_text must not exceed 5000 characters",
		},
		{
			name:    "context too long fails",
			modify:  func(e *Example) { e.Context = string(make([]byte, 501)) },
			wantErr: "context must not exceed 500 characters",
		},
		{
			name:    "valid context passes",
			modify:  func(e *Example) { e.Context = "Marketing copy for landing page" },
			wantErr: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			example := validExample()
			tt.modify(example)

			err := example.Validate()

			if tt.wantErr == "" {
				assert.NoError(t, err)
			} else {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.wantErr)
			}
		})
	}
}

func TestNewExample(t *testing.T) {
	agentID := uuid.New()
	beforeText := "Original text here"
	afterText := "Transformed text here"

	example := NewExample(agentID, beforeText, afterText)

	assert.NotEqual(t, uuid.Nil, example.ID)
	assert.Equal(t, agentID, example.AgentID)
	assert.Equal(t, beforeText, example.BeforeText)
	assert.Equal(t, afterText, example.AfterText)
	assert.Equal(t, "", example.Context)
	assert.Equal(t, 0, example.SortOrder)
	assert.False(t, example.CreatedAt.IsZero())
}

func TestExample_WithContext(t *testing.T) {
	example := NewExample(uuid.New(), "before", "after")
	context := "Marketing copy"

	result := example.WithContext(context)

	assert.Same(t, example, result) // Returns same pointer (fluent)
	assert.Equal(t, context, example.Context)
}

func TestExample_WithSortOrder(t *testing.T) {
	example := NewExample(uuid.New(), "before", "after")
	sortOrder := 5

	result := example.WithSortOrder(sortOrder)

	assert.Same(t, example, result) // Returns same pointer (fluent)
	assert.Equal(t, sortOrder, example.SortOrder)
}

func TestExample_FluentChaining(t *testing.T) {
	agentID := uuid.New()

	example := NewExample(agentID, "before", "after").
		WithContext("Technical docs").
		WithSortOrder(3)

	assert.Equal(t, "Technical docs", example.Context)
	assert.Equal(t, 3, example.SortOrder)
}
