# n8n Client Package

This package provides n8n workflow automation client for the backend.

## Components

### Client (`client.go`)
Production n8n client that makes actual HTTP requests to n8n instance.

```go
client := n8n.NewClient(n8n.Config{
    BaseURL:        "https://n8n.example.com",
    APIKey:         "your-api-key",
    WebhookBaseURL: "https://n8n.example.com/webhook",
    Timeout:        30 * time.Second,
})
```

### NoOpClient (`noop_client.go`)
No-op stub for local development. All operations succeed but don't interact with n8n.

```go
client := n8n.NewNoOpClient()
```

### Interface (`interface.go`)
`N8nClient` interface that both `Client` and `NoOpClient` implement.

### WorkflowFactory (`factory.go`)
Creates parameterized workflows from templates. Accepts `N8nClient` interface.

```go
factory := n8n.NewWorkflowFactory(client) // Works with both Client and NoOpClient
```

## Usage in Services

Services should depend on `N8nClient` interface, not concrete `*Client`:

```go
type CampaignService struct {
    n8nClient  n8n.N8nClient  // Interface, not *n8n.Client
    n8nFactory *n8n.WorkflowFactory
}

func NewCampaignService(n8nClient n8n.N8nClient) *CampaignService {
    return &CampaignService{
        n8nClient:  n8nClient,
        n8nFactory: n8n.NewWorkflowFactory(n8nClient),
    }
}
```

## Local Development Mode

For local development without n8n instance:

```go
// In main.go or service initialization
var n8nClient n8n.N8nClient

if config.LocalMode {
    n8nClient = n8n.NewNoOpClient()
} else {
    n8nClient = n8n.NewClient(n8n.Config{
        BaseURL: config.N8nBaseURL,
        APIKey:  config.N8nAPIKey,
        // ... other config
    })
}

// Pass to services
campaignService := service.NewCampaignService(n8nClient, ...)
channelService := service.NewChannelService(n8nClient, ...)
```

## NoOpClient Behavior

The NoOpClient:
- Validates input parameters (returns errors for nil/empty required fields)
- Generates fake UUIDs for created resources
- Returns success for all operations
- Does NOT make network requests
- Does NOT require n8n instance to be running

This allows full application functionality in local mode without external dependencies.

## Supported Operations

Both implementations support:
- `CreateWorkflow(ctx, workflow) (*Workflow, error)`
- `GetWorkflow(ctx, id) (*Workflow, error)`
- `UpdateWorkflow(ctx, workflow) (*Workflow, error)`
- `DeleteWorkflow(ctx, id) error`
- `ActivateWorkflow(ctx, id) error`
- `DeactivateWorkflow(ctx, id) error`
- `ExecuteWorkflow(ctx, id, data) (*Execution, error)`
- `CreateCredential(ctx, cred) (*Credential, error)`
- `UpdateCredential(ctx, cred) (*Credential, error)`
- `DeleteCredential(ctx, id) error`
