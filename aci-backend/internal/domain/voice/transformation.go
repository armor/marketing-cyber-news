package voice

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// TextTransformation represents an audit record of a text transformation
type TextTransformation struct {
	ID                  uuid.UUID       `json:"id" db:"id"`
	RequestID           uuid.UUID       `json:"request_id" db:"request_id"`
	AgentID             *uuid.UUID      `json:"agent_id,omitempty" db:"agent_id"`
	AgentConfigSnapshot json.RawMessage `json:"agent_config_snapshot,omitempty" db:"agent_config_snapshot"`
	OriginalText        string          `json:"original_text" db:"original_text"`
	TransformedText     string          `json:"transformed_text" db:"transformed_text"`
	TransformationIndex int             `json:"transformation_index" db:"transformation_index"`
	TotalOptions        int             `json:"total_options" db:"total_options"`
	FieldPath           string          `json:"field_path,omitempty" db:"field_path"`
	EntityType          string          `json:"entity_type,omitempty" db:"entity_type"`
	EntityID            *uuid.UUID      `json:"entity_id,omitempty" db:"entity_id"`
	TokensUsed          int             `json:"tokens_used" db:"tokens_used"`
	LatencyMs           int             `json:"latency_ms" db:"latency_ms"`
	TransformedBy       uuid.UUID       `json:"transformed_by" db:"transformed_by"`
	SelectedAt          time.Time       `json:"selected_at" db:"selected_at"`

	// Joined fields - not stored directly in text_transformations table
	AgentName       string `json:"agent_name,omitempty"`
	TransformerName string `json:"transformer_name,omitempty"`
}

// Validate performs validation on the TextTransformation
func (t *TextTransformation) Validate() error {
	if t.RequestID == uuid.Nil {
		return fmt.Errorf("request_id is required")
	}

	if strings.TrimSpace(t.OriginalText) == "" {
		return fmt.Errorf("original_text is required")
	}

	if strings.TrimSpace(t.TransformedText) == "" {
		return fmt.Errorf("transformed_text is required")
	}

	if t.TransformationIndex < 0 || t.TransformationIndex > 4 {
		return fmt.Errorf("transformation_index must be between 0 and 4, got %d", t.TransformationIndex)
	}

	if t.TransformedBy == uuid.Nil {
		return fmt.Errorf("transformed_by is required")
	}

	return nil
}

// NewTextTransformation creates a new TextTransformation record
func NewTextTransformation(
	requestID uuid.UUID,
	agentID *uuid.UUID,
	originalText string,
	transformedText string,
	transformationIndex int,
	transformedBy uuid.UUID,
) *TextTransformation {
	return &TextTransformation{
		ID:                  uuid.New(),
		RequestID:           requestID,
		AgentID:             agentID,
		OriginalText:        originalText,
		TransformedText:     transformedText,
		TransformationIndex: transformationIndex,
		TotalOptions:        3,
		TransformedBy:       transformedBy,
		SelectedAt:          time.Now(),
	}
}

// SetAgentSnapshot captures the agent configuration at transform time
func (t *TextTransformation) SetAgentSnapshot(agent *VoiceAgent) error {
	if agent == nil {
		return nil
	}

	snapshot := map[string]interface{}{
		"id":            agent.ID.String(),
		"name":          agent.Name,
		"system_prompt": agent.SystemPrompt,
		"temperature":   agent.Temperature,
		"max_tokens":    agent.MaxTokens,
		"version":       agent.Version,
	}

	data, err := json.Marshal(snapshot)
	if err != nil {
		return fmt.Errorf("failed to marshal agent snapshot: %w", err)
	}

	t.AgentConfigSnapshot = data
	return nil
}

// SetEntityContext sets the entity context for the transformation
func (t *TextTransformation) SetEntityContext(entityType string, entityID *uuid.UUID, fieldPath string) {
	t.EntityType = entityType
	t.EntityID = entityID
	t.FieldPath = fieldPath
}

// SetMetrics sets the performance metrics for the transformation
func (t *TextTransformation) SetMetrics(tokensUsed, latencyMs int) {
	t.TokensUsed = tokensUsed
	t.LatencyMs = latencyMs
}

// TransformationFilter represents filters for querying transformation history
type TransformationFilter struct {
	AgentID       *uuid.UUID `json:"agent_id,omitempty"`
	TransformedBy *uuid.UUID `json:"transformed_by,omitempty"`
	EntityType    *string    `json:"entity_type,omitempty"`
	EntityID      *uuid.UUID `json:"entity_id,omitempty"`
	StartDate     *time.Time `json:"start_date,omitempty"`
	EndDate       *time.Time `json:"end_date,omitempty"`
	Page          int        `json:"page"`
	PageSize      int        `json:"page_size"`
}

// Validate validates the filter parameters
func (f *TransformationFilter) Validate() error {
	if f.PageSize < 0 {
		return fmt.Errorf("page_size must be non-negative")
	}

	if f.PageSize > 100 {
		return fmt.Errorf("page_size cannot exceed 100")
	}

	if f.Page < 1 {
		return fmt.Errorf("page must be at least 1")
	}

	if f.StartDate != nil && f.EndDate != nil && f.StartDate.After(*f.EndDate) {
		return fmt.Errorf("start_date must be before end_date")
	}

	return nil
}

// Offset calculates the database offset based on page and page_size
func (f *TransformationFilter) Offset() int {
	if f.Page < 1 {
		return 0
	}
	return (f.Page - 1) * f.PageSize
}

// WithDefaults sets default values for the filter
func (f *TransformationFilter) WithDefaults() {
	if f.PageSize <= 0 {
		f.PageSize = 20
	}
	if f.Page <= 0 {
		f.Page = 1
	}
}
