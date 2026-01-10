package voice

import (
	"fmt"
	"strings"

	"github.com/google/uuid"
)

// TransformRequest represents an incoming text transformation request
type TransformRequest struct {
	AgentID    uuid.UUID  `json:"agent_id"`
	Text       string     `json:"text"`
	NumOptions int        `json:"num_options,omitempty"`
	FieldPath  string     `json:"field_path,omitempty"`
	EntityType string     `json:"entity_type,omitempty"`
	EntityID   *uuid.UUID `json:"entity_id,omitempty"`
}

// Default configuration values
const (
	DefaultNumOptions = 3
	MaxNumOptions     = 5
	MinInputLength    = 10
	MaxInputLength    = 10000
)

// Validate performs validation on the TransformRequest
func (r *TransformRequest) Validate() error {
	if r.AgentID == uuid.Nil {
		return fmt.Errorf("agent_id is required")
	}

	text := strings.TrimSpace(r.Text)
	if text == "" {
		return fmt.Errorf("text is required")
	}

	if len(text) < MinInputLength {
		return fmt.Errorf("text must be at least %d characters, got %d", MinInputLength, len(text))
	}

	if len(text) > MaxInputLength {
		return fmt.Errorf("text must not exceed %d characters, got %d", MaxInputLength, len(text))
	}

	if r.NumOptions < 0 || r.NumOptions > MaxNumOptions {
		return fmt.Errorf("num_options must be between 1 and %d, got %d", MaxNumOptions, r.NumOptions)
	}

	return nil
}

// WithDefaults applies default values to the request
func (r *TransformRequest) WithDefaults() {
	if r.NumOptions <= 0 {
		r.NumOptions = DefaultNumOptions
	}
}

// TransformOptionLabel represents the label for a transformation option
type TransformOptionLabel string

const (
	TransformOptionConservative TransformOptionLabel = "conservative"
	TransformOptionModerate     TransformOptionLabel = "moderate"
	TransformOptionBold         TransformOptionLabel = "bold"
)

// String returns the string representation of the label
func (l TransformOptionLabel) String() string {
	return string(l)
}

// DisplayLabel returns a human-friendly label
func (l TransformOptionLabel) DisplayLabel() string {
	switch l {
	case TransformOptionConservative:
		return "Conservative"
	case TransformOptionModerate:
		return "Moderate"
	case TransformOptionBold:
		return "Bold"
	default:
		return string(l)
	}
}

// TransformOption represents one of the transformation alternatives
type TransformOption struct {
	Index       int                  `json:"index"`
	Label       TransformOptionLabel `json:"label"`
	Text        string               `json:"text"`
	Temperature float64              `json:"temperature"`
	TokensUsed  int                  `json:"tokens_used"`
}

// TransformOptionConfig defines the temperature configuration for each option
type TransformOptionConfig struct {
	Label       TransformOptionLabel
	Temperature float64
}

// DefaultTransformOptions returns the default configuration for transform options
func DefaultTransformOptions() []TransformOptionConfig {
	return []TransformOptionConfig{
		{Label: TransformOptionConservative, Temperature: 0.3},
		{Label: TransformOptionModerate, Temperature: 0.5},
		{Label: TransformOptionBold, Temperature: 0.7},
	}
}

// TransformResponse represents the API response for a transformation request
type TransformResponse struct {
	RequestID uuid.UUID         `json:"request_id"`
	AgentID   uuid.UUID         `json:"agent_id"`
	AgentName string            `json:"agent_name"`
	Options   []TransformOption `json:"options"`
	LatencyMs int               `json:"latency_ms"`
}

// SelectTransformRequest represents a request to select a transformation option
type SelectTransformRequest struct {
	RequestID           uuid.UUID  `json:"request_id"`
	TransformationIndex int        `json:"transformation_index"`
	FieldPath           string     `json:"field_path,omitempty"`
	EntityType          string     `json:"entity_type,omitempty"`
	EntityID            *uuid.UUID `json:"entity_id,omitempty"`
}

// Validate performs validation on the SelectTransformRequest
func (r *SelectTransformRequest) Validate() error {
	if r.RequestID == uuid.Nil {
		return fmt.Errorf("request_id is required")
	}

	if r.TransformationIndex < 0 || r.TransformationIndex > 4 {
		return fmt.Errorf("transformation_index must be between 0 and 4, got %d", r.TransformationIndex)
	}

	return nil
}

// SelectTransformResponse represents the response after selecting a transformation
type SelectTransformResponse struct {
	TransformationID uuid.UUID `json:"transformation_id"`
	Text             string    `json:"text"`
}

// TransformContext holds context information for a transformation operation
type TransformContext struct {
	UserID     uuid.UUID
	FieldPath  string
	EntityType string
	EntityID   *uuid.UUID
}
