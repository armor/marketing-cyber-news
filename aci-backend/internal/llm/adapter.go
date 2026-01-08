package llm

import (
	"context"
	"fmt"
)

// ClientAdapter wraps the LLM Client to implement the simple LLMClient interface
// used by services. This adapts the rich Client API to the simpler interface.
type ClientAdapter struct {
	client *Client
}

// NewClientAdapter creates an adapter that implements the service LLMClient interface
func NewClientAdapter(client *Client) *ClientAdapter {
	if client == nil {
		panic("client cannot be nil")
	}
	return &ClientAdapter{
		client: client,
	}
}

// GenerateContent adapts the simple interface to the rich Client API
func (a *ClientAdapter) GenerateContent(ctx context.Context, prompt string, systemContext string) (string, error) {
	if prompt == "" {
		return "", fmt.Errorf("prompt is required")
	}

	// Combine systemContext into the prompt if provided
	fullPrompt := prompt
	if systemContext != "" {
		fullPrompt = fmt.Sprintf("%s\n\nContext: %s", systemContext, prompt)
	}

	req := GenerateRequest{
		Prompt:      fullPrompt,
		Channel:     "general",
		ContentType: "text",
		MaxTokens:   2000,
		Temperature: 0.7,
	}

	resp, err := a.client.GenerateContent(ctx, req)
	if err != nil {
		return "", fmt.Errorf("failed to generate content: %w", err)
	}

	return resp.Content, nil
}

// RefineContent adapts the simple interface to the rich Client API
func (a *ClientAdapter) RefineContent(ctx context.Context, originalContent string, action string) (string, error) {
	if originalContent == "" {
		return "", fmt.Errorf("original content is required")
	}
	if action == "" {
		return "", fmt.Errorf("action is required")
	}

	req := RefineRequest{
		OriginalContent: originalContent,
		RefinementType:  action,
	}

	resp, err := a.client.RefineContent(ctx, req)
	if err != nil {
		return "", fmt.Errorf("failed to refine content: %w", err)
	}

	return resp.Content, nil
}
