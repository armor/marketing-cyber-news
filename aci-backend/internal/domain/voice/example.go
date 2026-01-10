package voice

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Example represents a before/after transformation example for a voice agent
type Example struct {
	ID         uuid.UUID `json:"id" db:"id"`
	AgentID    uuid.UUID `json:"agent_id" db:"agent_id"`
	BeforeText string    `json:"before_text" db:"before_text"`
	AfterText  string    `json:"after_text" db:"after_text"`
	Context    string    `json:"context" db:"context"`
	SortOrder  int       `json:"sort_order" db:"sort_order"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
}

// Validate performs validation on the Example
func (e *Example) Validate() error {
	if e.AgentID == uuid.Nil {
		return fmt.Errorf("agent_id is required")
	}

	if strings.TrimSpace(e.BeforeText) == "" {
		return fmt.Errorf("before_text is required")
	}

	if len(e.BeforeText) > 5000 {
		return fmt.Errorf("before_text must not exceed 5000 characters")
	}

	if strings.TrimSpace(e.AfterText) == "" {
		return fmt.Errorf("after_text is required")
	}

	if len(e.AfterText) > 5000 {
		return fmt.Errorf("after_text must not exceed 5000 characters")
	}

	if len(e.Context) > 500 {
		return fmt.Errorf("context must not exceed 500 characters")
	}

	return nil
}

// NewExample creates a new Example with default values
func NewExample(agentID uuid.UUID, beforeText, afterText string) *Example {
	return &Example{
		ID:         uuid.New(),
		AgentID:    agentID,
		BeforeText: beforeText,
		AfterText:  afterText,
		SortOrder:  0,
		CreatedAt:  time.Now(),
	}
}

// WithContext adds context to an Example (fluent builder pattern)
func (e *Example) WithContext(context string) *Example {
	e.Context = context
	return e
}

// WithSortOrder sets the sort order for an Example (fluent builder pattern)
func (e *Example) WithSortOrder(order int) *Example {
	e.SortOrder = order
	return e
}
