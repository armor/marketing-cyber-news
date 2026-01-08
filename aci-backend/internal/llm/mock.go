package llm

import (
	"context"
	"fmt"
)

// MockClient provides a stub implementation for local development without API keys
type MockClient struct {
	generateContentFunc func(ctx context.Context, prompt string, systemContext string) (string, error)
	refineContentFunc   func(ctx context.Context, originalContent string, action string) (string, error)
}

// NewMockClient creates a mock LLM client for testing/local mode
func NewMockClient() *MockClient {
	return &MockClient{}
}

// GenerateContent returns mock generated content without calling external APIs
func (m *MockClient) GenerateContent(ctx context.Context, prompt string, systemContext string) (string, error) {
	if m.generateContentFunc != nil {
		return m.generateContentFunc(ctx, prompt, systemContext)
	}

	// Return stub content based on prompt keywords
	if prompt == "" {
		return "", fmt.Errorf("prompt is required")
	}

	return fmt.Sprintf("Mock generated content for: %s\n\n[This is placeholder content from the mock LLM client. Configure OpenRouter or Anthropic API keys for real AI generation.]", truncate(prompt, 50)), nil
}

// RefineContent returns mock refined content without calling external APIs
func (m *MockClient) RefineContent(ctx context.Context, originalContent string, action string) (string, error) {
	if m.refineContentFunc != nil {
		return m.refineContentFunc(ctx, originalContent, action)
	}

	if originalContent == "" {
		return "", fmt.Errorf("original content is required")
	}

	if action == "" {
		return "", fmt.Errorf("action is required")
	}

	return fmt.Sprintf("[Mock Refined - %s]\n%s\n\n[This is placeholder refinement from the mock LLM client. Configure API keys for real AI refinement.]", action, originalContent), nil
}

// WithGenerateContentFunc allows overriding the generate function for testing
func (m *MockClient) WithGenerateContentFunc(fn func(ctx context.Context, prompt string, systemContext string) (string, error)) *MockClient {
	m.generateContentFunc = fn
	return m
}

// WithRefineContentFunc allows overriding the refine function for testing
func (m *MockClient) WithRefineContentFunc(fn func(ctx context.Context, originalContent string, action string) (string, error)) *MockClient {
	m.refineContentFunc = fn
	return m
}

// truncate limits string length for display
func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}
