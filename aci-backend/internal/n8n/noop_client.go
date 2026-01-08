package n8n

import (
	"context"
	"fmt"

	"github.com/google/uuid"
)

// NoOpClient provides a no-op implementation for local development
// All operations succeed but don't actually interact with n8n
type NoOpClient struct{}

// NewNoOpClient creates a new no-op client for local mode
func NewNoOpClient() *NoOpClient {
	return &NoOpClient{}
}

// CreateWorkflow simulates workflow creation
func (c *NoOpClient) CreateWorkflow(ctx context.Context, workflow *Workflow) (*Workflow, error) {
	if workflow == nil {
		return nil, fmt.Errorf("workflow cannot be nil")
	}

	if workflow.Name == "" {
		return nil, fmt.Errorf("workflow name is required")
	}

	// Generate fake ID and return copy
	result := *workflow
	result.ID = uuid.New().String()
	result.Active = false

	return &result, nil
}

// GetWorkflow simulates workflow retrieval
func (c *NoOpClient) GetWorkflow(ctx context.Context, id string) (*Workflow, error) {
	if id == "" {
		return nil, fmt.Errorf("workflow ID is required")
	}

	// Return fake workflow
	return &Workflow{
		ID:          id,
		Name:        "No-Op Workflow",
		Active:      false,
		Nodes:       []map[string]interface{}{},
		Connections: map[string]interface{}{},
	}, nil
}

// UpdateWorkflow simulates workflow update
func (c *NoOpClient) UpdateWorkflow(ctx context.Context, workflow *Workflow) (*Workflow, error) {
	if workflow == nil {
		return nil, fmt.Errorf("workflow cannot be nil")
	}

	if workflow.ID == "" {
		return nil, fmt.Errorf("workflow ID is required")
	}

	// Return copy
	result := *workflow
	return &result, nil
}

// DeleteWorkflow simulates workflow deletion
func (c *NoOpClient) DeleteWorkflow(ctx context.Context, id string) error {
	if id == "" {
		return fmt.Errorf("workflow ID is required")
	}
	// Success - no-op
	return nil
}

// ActivateWorkflow simulates workflow activation
func (c *NoOpClient) ActivateWorkflow(ctx context.Context, id string) error {
	if id == "" {
		return fmt.Errorf("workflow ID is required")
	}
	// Success - no-op
	return nil
}

// DeactivateWorkflow simulates workflow deactivation
func (c *NoOpClient) DeactivateWorkflow(ctx context.Context, id string) error {
	if id == "" {
		return fmt.Errorf("workflow ID is required")
	}
	// Success - no-op
	return nil
}

// ExecuteWorkflow simulates workflow execution
func (c *NoOpClient) ExecuteWorkflow(ctx context.Context, id string, data map[string]interface{}) (*Execution, error) {
	if id == "" {
		return nil, fmt.Errorf("workflow ID is required")
	}

	// Return fake execution
	return &Execution{
		ID:     uuid.New().String(),
		Status: "success",
	}, nil
}

// CreateCredential simulates credential creation
func (c *NoOpClient) CreateCredential(ctx context.Context, cred *Credential) (*Credential, error) {
	if cred == nil {
		return nil, fmt.Errorf("credential cannot be nil")
	}

	if cred.Name == "" {
		return nil, fmt.Errorf("credential name is required")
	}

	if cred.Type == "" {
		return nil, fmt.Errorf("credential type is required")
	}

	// Generate fake ID and return copy
	result := *cred
	result.ID = uuid.New().String()

	return &result, nil
}

// UpdateCredential simulates credential update
func (c *NoOpClient) UpdateCredential(ctx context.Context, cred *Credential) (*Credential, error) {
	if cred == nil {
		return nil, fmt.Errorf("credential cannot be nil")
	}

	if cred.ID == "" {
		return nil, fmt.Errorf("credential ID is required")
	}

	// Return copy
	result := *cred
	return &result, nil
}

// DeleteCredential simulates credential deletion
func (c *NoOpClient) DeleteCredential(ctx context.Context, id string) error {
	if id == "" {
		return fmt.Errorf("credential ID is required")
	}
	// Success - no-op
	return nil
}

// Ensure NoOpClient implements N8nClient interface
var _ N8nClient = (*NoOpClient)(nil)
