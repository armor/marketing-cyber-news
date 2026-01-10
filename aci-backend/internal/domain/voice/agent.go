package voice

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// VoiceAgentStatus represents the visibility state of a voice agent
type VoiceAgentStatus string

const (
	VoiceAgentStatusDraft    VoiceAgentStatus = "draft"
	VoiceAgentStatusActive   VoiceAgentStatus = "active"
	VoiceAgentStatusInactive VoiceAgentStatus = "inactive"
)

// IsValid checks if the status is a valid VoiceAgentStatus
func (s VoiceAgentStatus) IsValid() bool {
	switch s {
	case VoiceAgentStatusDraft, VoiceAgentStatusActive, VoiceAgentStatusInactive:
		return true
	default:
		return false
	}
}

// String returns the string representation of the status
func (s VoiceAgentStatus) String() string {
	return string(s)
}

// VoiceAgent represents a configurable transformation persona
type VoiceAgent struct {
	ID           uuid.UUID        `json:"id" db:"id"`
	Name         string           `json:"name" db:"name"`
	Description  string           `json:"description" db:"description"`
	Icon         string           `json:"icon" db:"icon"`
	Color        string           `json:"color" db:"color"`
	SystemPrompt string           `json:"system_prompt" db:"system_prompt"`
	Temperature  float64          `json:"temperature" db:"temperature"`
	MaxTokens    int              `json:"max_tokens" db:"max_tokens"`
	Status       VoiceAgentStatus `json:"status" db:"status"`
	SortOrder    int              `json:"sort_order" db:"sort_order"`
	Version      int              `json:"version" db:"version"`
	CreatedBy    *uuid.UUID       `json:"created_by,omitempty" db:"created_by"`
	CreatedAt    time.Time        `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time        `json:"updated_at" db:"updated_at"`
	DeletedAt    *time.Time       `json:"deleted_at,omitempty" db:"deleted_at"`

	// Loaded via joins - not stored directly in voice_agents table
	StyleRules []StyleRule `json:"style_rules,omitempty"`
	Examples   []Example   `json:"examples,omitempty"`
}

// Validate performs validation on the VoiceAgent
func (v *VoiceAgent) Validate() error {
	if strings.TrimSpace(v.Name) == "" {
		return fmt.Errorf("name is required")
	}

	if len(v.Name) > 100 {
		return fmt.Errorf("name must not exceed 100 characters")
	}

	if strings.TrimSpace(v.SystemPrompt) == "" {
		return fmt.Errorf("system_prompt is required")
	}

	if v.Temperature < 0 || v.Temperature > 1 {
		return fmt.Errorf("temperature must be between 0 and 1, got %f", v.Temperature)
	}

	if v.MaxTokens < 100 || v.MaxTokens > 4000 {
		return fmt.Errorf("max_tokens must be between 100 and 4000, got %d", v.MaxTokens)
	}

	if !v.Status.IsValid() {
		return fmt.Errorf("invalid status: %s", v.Status)
	}

	return nil
}

// IsActive returns true if the agent is active and not deleted
func (v *VoiceAgent) IsActive() bool {
	return v.Status == VoiceAgentStatusActive && v.DeletedAt == nil
}

// IsDeleted returns true if the agent has been soft deleted
func (v *VoiceAgent) IsDeleted() bool {
	return v.DeletedAt != nil
}

// CanBeActivated returns true if the agent can transition to active status
func (v *VoiceAgent) CanBeActivated() bool {
	return v.Status == VoiceAgentStatusDraft || v.Status == VoiceAgentStatusInactive
}

// NewVoiceAgent creates a new VoiceAgent with default values
func NewVoiceAgent(name, systemPrompt string) *VoiceAgent {
	now := time.Now()
	return &VoiceAgent{
		ID:           uuid.New(),
		Name:         name,
		SystemPrompt: systemPrompt,
		Icon:         "wand",
		Color:        "#6366F1",
		Temperature:  0.7,
		MaxTokens:    2000,
		Status:       VoiceAgentStatusDraft,
		SortOrder:    0,
		Version:      1,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
}

// VoiceAgentFilter represents filters for querying voice agents
type VoiceAgentFilter struct {
	Status         *VoiceAgentStatus `json:"status,omitempty"`
	IncludeDeleted bool              `json:"include_deleted"`
	SearchText     *string           `json:"search_text,omitempty"`
	CreatedBy      *uuid.UUID        `json:"created_by,omitempty"`
	Page           int               `json:"page"`
	PageSize       int               `json:"page_size"`
}

// Validate validates the filter parameters
func (f *VoiceAgentFilter) Validate() error {
	if f.PageSize < 0 {
		return fmt.Errorf("page_size must be non-negative")
	}

	if f.PageSize > 100 {
		return fmt.Errorf("page_size cannot exceed 100")
	}

	if f.Page < 1 {
		return fmt.Errorf("page must be at least 1")
	}

	if f.Status != nil && !f.Status.IsValid() {
		return fmt.Errorf("invalid status filter: %s", *f.Status)
	}

	return nil
}

// Offset calculates the database offset based on page and page_size
func (f *VoiceAgentFilter) Offset() int {
	if f.Page < 1 {
		return 0
	}
	return (f.Page - 1) * f.PageSize
}

// WithDefaults sets default values for the filter
func (f *VoiceAgentFilter) WithDefaults() {
	if f.PageSize <= 0 {
		f.PageSize = 20
	}
	if f.Page <= 0 {
		f.Page = 1
	}
}
