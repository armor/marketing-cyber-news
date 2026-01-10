package voice

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTextTransformation_Validate(t *testing.T) {
	validTransformation := func() *TextTransformation {
		agentID := uuid.New()
		return &TextTransformation{
			ID:                  uuid.New(),
			RequestID:           uuid.New(),
			AgentID:             &agentID,
			OriginalText:        "Original marketing text here",
			TransformedText:     "Transformed marketing text here",
			TransformationIndex: 1,
			TransformedBy:       uuid.New(),
			SelectedAt:          time.Now(),
		}
	}

	tests := []struct {
		name    string
		modify  func(*TextTransformation)
		wantErr string
	}{
		{
			name:    "valid transformation passes",
			modify:  func(t *TextTransformation) {},
			wantErr: "",
		},
		{
			name:    "nil request_id fails",
			modify:  func(t *TextTransformation) { t.RequestID = uuid.Nil },
			wantErr: "request_id is required",
		},
		{
			name:    "empty original_text fails",
			modify:  func(t *TextTransformation) { t.OriginalText = "" },
			wantErr: "original_text is required",
		},
		{
			name:    "whitespace only original_text fails",
			modify:  func(t *TextTransformation) { t.OriginalText = "   " },
			wantErr: "original_text is required",
		},
		{
			name:    "empty transformed_text fails",
			modify:  func(t *TextTransformation) { t.TransformedText = "" },
			wantErr: "transformed_text is required",
		},
		{
			name:    "whitespace only transformed_text fails",
			modify:  func(t *TextTransformation) { t.TransformedText = "   " },
			wantErr: "transformed_text is required",
		},
		{
			name:    "transformation_index below 0 fails",
			modify:  func(t *TextTransformation) { t.TransformationIndex = -1 },
			wantErr: "transformation_index must be between 0 and 4",
		},
		{
			name:    "transformation_index above 4 fails",
			modify:  func(t *TextTransformation) { t.TransformationIndex = 5 },
			wantErr: "transformation_index must be between 0 and 4",
		},
		{
			name:    "transformation_index at 0 passes",
			modify:  func(t *TextTransformation) { t.TransformationIndex = 0 },
			wantErr: "",
		},
		{
			name:    "transformation_index at 4 passes",
			modify:  func(t *TextTransformation) { t.TransformationIndex = 4 },
			wantErr: "",
		},
		{
			name:    "nil transformed_by fails",
			modify:  func(t *TextTransformation) { t.TransformedBy = uuid.Nil },
			wantErr: "transformed_by is required",
		},
		{
			name:    "nil agent_id is allowed",
			modify:  func(t *TextTransformation) { t.AgentID = nil },
			wantErr: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			transformation := validTransformation()
			tt.modify(transformation)

			err := transformation.Validate()

			if tt.wantErr == "" {
				assert.NoError(t, err)
			} else {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.wantErr)
			}
		})
	}
}

func TestNewTextTransformation(t *testing.T) {
	requestID := uuid.New()
	agentID := uuid.New()
	originalText := "Original text"
	transformedText := "Transformed text"
	transformationIndex := 1
	transformedBy := uuid.New()

	transformation := NewTextTransformation(
		requestID,
		&agentID,
		originalText,
		transformedText,
		transformationIndex,
		transformedBy,
	)

	assert.NotEqual(t, uuid.Nil, transformation.ID)
	assert.Equal(t, requestID, transformation.RequestID)
	assert.Equal(t, &agentID, transformation.AgentID)
	assert.Equal(t, originalText, transformation.OriginalText)
	assert.Equal(t, transformedText, transformation.TransformedText)
	assert.Equal(t, transformationIndex, transformation.TransformationIndex)
	assert.Equal(t, 3, transformation.TotalOptions)
	assert.Equal(t, transformedBy, transformation.TransformedBy)
	assert.False(t, transformation.SelectedAt.IsZero())
}

func TestTextTransformation_SetAgentSnapshot(t *testing.T) {
	transformation := NewTextTransformation(
		uuid.New(),
		nil,
		"original",
		"transformed",
		0,
		uuid.New(),
	)

	agent := &VoiceAgent{
		ID:           uuid.New(),
		Name:         "Test Agent",
		SystemPrompt: "You are a test assistant.",
		Temperature:  0.7,
		MaxTokens:    2000,
		Version:      3,
	}

	err := transformation.SetAgentSnapshot(agent)

	require.NoError(t, err)
	assert.NotNil(t, transformation.AgentConfigSnapshot)

	// Verify snapshot contents
	var snapshot map[string]interface{}
	err = json.Unmarshal(transformation.AgentConfigSnapshot, &snapshot)
	require.NoError(t, err)

	assert.Equal(t, agent.ID.String(), snapshot["id"])
	assert.Equal(t, agent.Name, snapshot["name"])
	assert.Equal(t, agent.SystemPrompt, snapshot["system_prompt"])
	assert.Equal(t, agent.Temperature, snapshot["temperature"])
	assert.Equal(t, float64(agent.MaxTokens), snapshot["max_tokens"])
	assert.Equal(t, float64(agent.Version), snapshot["version"])
}

func TestTextTransformation_SetAgentSnapshot_NilAgent(t *testing.T) {
	transformation := NewTextTransformation(
		uuid.New(),
		nil,
		"original",
		"transformed",
		0,
		uuid.New(),
	)

	err := transformation.SetAgentSnapshot(nil)

	assert.NoError(t, err)
	assert.Nil(t, transformation.AgentConfigSnapshot)
}

func TestTextTransformation_SetEntityContext(t *testing.T) {
	transformation := NewTextTransformation(
		uuid.New(),
		nil,
		"original",
		"transformed",
		0,
		uuid.New(),
	)

	entityID := uuid.New()
	transformation.SetEntityContext("claim", &entityID, "claim_text")

	assert.Equal(t, "claim", transformation.EntityType)
	assert.Equal(t, &entityID, transformation.EntityID)
	assert.Equal(t, "claim_text", transformation.FieldPath)
}

func TestTextTransformation_SetMetrics(t *testing.T) {
	transformation := NewTextTransformation(
		uuid.New(),
		nil,
		"original",
		"transformed",
		0,
		uuid.New(),
	)

	transformation.SetMetrics(150, 1200)

	assert.Equal(t, 150, transformation.TokensUsed)
	assert.Equal(t, 1200, transformation.LatencyMs)
}

func TestTransformationFilter_Validate(t *testing.T) {
	now := time.Now()
	yesterday := now.Add(-24 * time.Hour)
	tomorrow := now.Add(24 * time.Hour)

	tests := []struct {
		name    string
		filter  TransformationFilter
		wantErr string
	}{
		{
			name:    "valid filter passes",
			filter:  TransformationFilter{Page: 1, PageSize: 20},
			wantErr: "",
		},
		{
			name:    "negative page_size fails",
			filter:  TransformationFilter{Page: 1, PageSize: -1},
			wantErr: "page_size must be non-negative",
		},
		{
			name:    "page_size over 100 fails",
			filter:  TransformationFilter{Page: 1, PageSize: 101},
			wantErr: "page_size cannot exceed 100",
		},
		{
			name:    "page less than 1 fails",
			filter:  TransformationFilter{Page: 0, PageSize: 20},
			wantErr: "page must be at least 1",
		},
		{
			name:    "start_date after end_date fails",
			filter:  TransformationFilter{Page: 1, PageSize: 20, StartDate: &tomorrow, EndDate: &yesterday},
			wantErr: "start_date must be before end_date",
		},
		{
			name:    "valid date range passes",
			filter:  TransformationFilter{Page: 1, PageSize: 20, StartDate: &yesterday, EndDate: &tomorrow},
			wantErr: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.filter.Validate()

			if tt.wantErr == "" {
				assert.NoError(t, err)
			} else {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.wantErr)
			}
		})
	}
}

func TestTransformationFilter_Offset(t *testing.T) {
	tests := []struct {
		name     string
		page     int
		pageSize int
		want     int
	}{
		{"page 1 returns 0", 1, 20, 0},
		{"page 2 returns pageSize", 2, 20, 20},
		{"page 3 returns 2*pageSize", 3, 10, 20},
		{"page 0 returns 0", 0, 20, 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			filter := TransformationFilter{Page: tt.page, PageSize: tt.pageSize}
			assert.Equal(t, tt.want, filter.Offset())
		})
	}
}

func TestTransformationFilter_WithDefaults(t *testing.T) {
	filter := TransformationFilter{}
	filter.WithDefaults()

	assert.Equal(t, 20, filter.PageSize)
	assert.Equal(t, 1, filter.Page)
}
