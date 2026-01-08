package n8n

import "context"

// N8nClient defines the interface for n8n operations
type N8nClient interface {
	CreateWorkflow(ctx context.Context, workflow *Workflow) (*Workflow, error)
	GetWorkflow(ctx context.Context, id string) (*Workflow, error)
	UpdateWorkflow(ctx context.Context, workflow *Workflow) (*Workflow, error)
	DeleteWorkflow(ctx context.Context, id string) error
	ActivateWorkflow(ctx context.Context, id string) error
	DeactivateWorkflow(ctx context.Context, id string) error
	ExecuteWorkflow(ctx context.Context, id string, data map[string]interface{}) (*Execution, error)
	CreateCredential(ctx context.Context, cred *Credential) (*Credential, error)
	UpdateCredential(ctx context.Context, cred *Credential) (*Credential, error)
	DeleteCredential(ctx context.Context, id string) error
}

// Ensure Client implements N8nClient
var _ N8nClient = (*Client)(nil)
