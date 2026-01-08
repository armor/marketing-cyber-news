// Package domain contains the core business types for the application.
package domain

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// WorkflowCategory represents the type of n8n workflow template
type WorkflowCategory string

const (
	CategoryContent   WorkflowCategory = "content"
	CategoryResearch  WorkflowCategory = "research"
	CategoryPublish   WorkflowCategory = "publish"
	CategoryAnalytics WorkflowCategory = "analytics"
)

// WorkflowTemplate represents a pre-built n8n workflow template
type WorkflowTemplate struct {
	ID          uuid.UUID        `json:"id" db:"id"`
	Name        string           `json:"name" db:"name"`
	Description string           `json:"description,omitempty" db:"description"`
	Category    WorkflowCategory `json:"category" db:"category"`
	N8nJSON     json.RawMessage  `json:"n8n_json" db:"n8n_json"`
	Parameters  []TemplateParam  `json:"parameters" db:"parameters"`
	Version     string           `json:"version" db:"version"`
	IsActive    bool             `json:"is_active" db:"is_active"`
	CreatedAt   time.Time        `json:"created_at" db:"created_at"`
}

// TemplateParam represents a configurable parameter in a workflow template
type TemplateParam struct {
	Name        string      `json:"name"`
	Type        string      `json:"type"` // string, number, boolean, array, object
	Required    bool        `json:"required"`
	Default     interface{} `json:"default,omitempty"`
	Description string      `json:"description,omitempty"`
	Options     []string    `json:"options,omitempty"` // For enum-like parameters
}

// Validate validates the workflow template
func (t *WorkflowTemplate) Validate() error {
	if t.Name == "" {
		return fmt.Errorf("template name is required")
	}
	if len(t.Name) > 255 {
		return fmt.Errorf("template name must not exceed 255 characters")
	}
	if !t.Category.IsValid() {
		return fmt.Errorf("invalid workflow category: %s", t.Category)
	}
	if len(t.N8nJSON) == 0 {
		return fmt.Errorf("n8n workflow JSON is required")
	}
	if t.Version == "" {
		return fmt.Errorf("version is required")
	}
	// Validate version format (semver)
	if !isValidSemver(t.Version) {
		return fmt.Errorf("version must be in semver format (e.g., 1.0.0)")
	}
	return nil
}

// IsValid checks if the category is valid
func (c WorkflowCategory) IsValid() bool {
	switch c {
	case CategoryContent, CategoryResearch, CategoryPublish, CategoryAnalytics:
		return true
	}
	return false
}

// String returns the string representation
func (c WorkflowCategory) String() string {
	return string(c)
}

// InstantiateWorkflow creates a new workflow from the template with given parameters
func (t *WorkflowTemplate) InstantiateWorkflow(params map[string]interface{}) (json.RawMessage, error) {
	// Validate required parameters
	for _, p := range t.Parameters {
		if p.Required {
			if _, ok := params[p.Name]; !ok {
				return nil, fmt.Errorf("required parameter %q is missing", p.Name)
			}
		}
	}

	// Parse the template JSON
	var workflow map[string]interface{}
	if err := json.Unmarshal(t.N8nJSON, &workflow); err != nil {
		return nil, fmt.Errorf("failed to parse template: %w", err)
	}

	// Apply parameters - this is a simplified implementation
	// A full implementation would recursively replace {{param}} placeholders
	workflowJSON, err := json.Marshal(workflow)
	if err != nil {
		return nil, fmt.Errorf("failed to serialize workflow: %w", err)
	}

	return workflowJSON, nil
}

// GetRequiredParams returns only the required parameters
func (t *WorkflowTemplate) GetRequiredParams() []TemplateParam {
	required := make([]TemplateParam, 0)
	for _, p := range t.Parameters {
		if p.Required {
			required = append(required, p)
		}
	}
	return required
}

// NewWorkflowTemplate creates a new workflow template with defaults
func NewWorkflowTemplate(name string, category WorkflowCategory, n8nJSON json.RawMessage) *WorkflowTemplate {
	return &WorkflowTemplate{
		ID:        uuid.New(),
		Name:      name,
		Category:  category,
		N8nJSON:   n8nJSON,
		Version:   "1.0.0",
		IsActive:  true,
		CreatedAt: time.Now(),
	}
}

// isValidSemver checks if a version string is valid semver format
func isValidSemver(version string) bool {
	// Simple regex-free validation for X.Y.Z format
	var major, minor, patch int
	n, err := fmt.Sscanf(version, "%d.%d.%d", &major, &minor, &patch)
	if err != nil || n != 3 {
		return false
	}
	return major >= 0 && minor >= 0 && patch >= 0
}
