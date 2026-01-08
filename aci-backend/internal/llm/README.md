# LLM Package

Provides LLM client implementations for AI content generation with OpenRouter and Anthropic fallback support.

## Components

### Client
Production LLM client that calls OpenRouter API (with Anthropic fallback).

**Features:**
- OpenRouter API integration (primary)
- Anthropic API fallback
- Automatic retry with exponential backoff
- Brand context injection
- Content generation, refinement, and validation

### MockClient
Stub implementation for local development and testing without API keys.

**Features:**
- No external API calls
- Returns placeholder content
- Implements same interface as production client
- Customizable behavior via function injection

### ClientAdapter
Adapts the rich Client API to the simple interface used by services.

## Usage

### Production Mode (with API keys)

```go
import "github.com/phillipboles/aci-backend/internal/llm"

// Create production client
client := llm.NewClient(llm.Config{
    OpenRouterAPIKey: os.Getenv("OPENROUTER_API_KEY"),
    OpenRouterModel:  "anthropic/claude-3.5-sonnet",
    AnthropicAPIKey:  os.Getenv("ANTHROPIC_API_KEY"),
    FallbackEnabled:  true,
    MaxRetries:       3,
    Timeout:          60 * time.Second,
})

// Wrap in adapter for service interface
adapter := llm.NewClientAdapter(client)

// Use in service
service := NewContentStudioService(
    contentRepo,
    calendarRepo,
    brandService,
    adapter,  // Implements LLMClient interface
    n8nClient,
)
```

### Local Mode (no API keys)

```go
import "github.com/phillipboles/aci-backend/internal/llm"

// Create mock client
mockClient := llm.NewMockClient()

// Use in service (implements same interface)
service := NewContentStudioService(
    contentRepo,
    calendarRepo,
    brandService,
    mockClient,  // Implements LLMClient interface
    n8nClient,
)
```

### Testing Mode (custom behavior)

```go
mockClient := llm.NewMockClient().
    WithGenerateContentFunc(func(ctx context.Context, prompt string, systemContext string) (string, error) {
        return "Test generated content", nil
    }).
    WithRefineContentFunc(func(ctx context.Context, originalContent string, action string) (string, error) {
        return "Test refined: " + originalContent, nil
    })

service := NewContentStudioService(
    contentRepo,
    calendarRepo,
    brandService,
    mockClient,
    n8nClient,
)
```

## Interface

Both `MockClient` and `ClientAdapter` implement this interface:

```go
type LLMClient interface {
    GenerateContent(ctx context.Context, prompt string, systemContext string) (string, error)
    RefineContent(ctx context.Context, originalContent string, action string) (string, error)
}
```

## Configuration

Set environment variables for production:

```bash
# Primary provider (OpenRouter)
export OPENROUTER_API_KEY="sk-or-v1-..."
export OPENROUTER_MODEL="anthropic/claude-3.5-sonnet"

# Fallback provider (Anthropic)
export ANTHROPIC_API_KEY="sk-ant-..."
export ANTHROPIC_MODEL="claude-3-sonnet-20240229"

# Enable fallback
export LLM_FALLBACK_ENABLED="true"
```

For local development without API keys, the system will use `MockClient` automatically.

## Error Handling

The production client:
- Wraps all errors with context using `%w`
- Implements retry with exponential backoff
- Falls back to Anthropic if OpenRouter fails (when enabled)
- Propagates context for cancellation/timeouts

The mock client:
- Validates required parameters
- Returns descriptive errors for invalid input
- Never panics

## Brand Context

Both clients support brand context injection:

```go
brandContext := &llm.BrandContext{
    VoiceExamples:  []string{"Example 1", "Example 2"},
    Guidelines:     []string{"Be professional", "Use active voice"},
    ApprovedTerms:  []string{"cybersecurity", "threat intelligence"},
    BannedTerms: []llm.TermEntry{
        {Term: "hacker", Replacement: "threat actor"},
    },
    ToneGuidelines: "Professional and authoritative",
}

// Production client uses rich API
req := llm.GenerateRequest{
    Prompt:       "Write a blog post",
    BrandContext: brandContext,
}
resp, err := client.GenerateContent(ctx, req)

// Mock client ignores brand context (returns placeholder)
content, err := mockClient.GenerateContent(ctx, "Write a blog post", "Professional tone")
```

## Testing

Run tests:

```bash
cd aci-backend
go test ./internal/llm/...
```

## Architecture

```
llm/
├── client.go       # Production LLM client (OpenRouter + Anthropic)
├── adapter.go      # Adapter to service interface
├── mock.go         # Mock/stub client for local mode
├── mock_test.go    # Mock client tests
└── README.md       # This file
```

## See Also

- `internal/service/content_studio_service.go` - Uses LLMClient interface
- `internal/service/brand_service.go` - Uses LLMClient interface
- `internal/service/campaign_service.go` - Uses LLMClient interface
