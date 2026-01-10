package voice

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/rs/zerolog/log"
)

// OpenRouterClient implements LLMClient for the OpenRouter API
type OpenRouterClient struct {
	config     *LLMClientConfig
	httpClient *http.Client
}

// Ensure OpenRouterClient implements LLMClient
var _ LLMClient = (*OpenRouterClient)(nil)

// NewOpenRouterClient creates a new OpenRouter API client
func NewOpenRouterClient(config *LLMClientConfig) (*OpenRouterClient, error) {
	if config == nil {
		config = DefaultLLMClientConfig()
	}

	if config.APIKey == "" {
		return nil, fmt.Errorf("API key is required")
	}

	if config.BaseURL == "" {
		config.BaseURL = "https://openrouter.ai/api/v1"
	}

	if config.DefaultModel == "" {
		config.DefaultModel = "anthropic/claude-3-haiku-20240307"
	}

	if config.Timeout <= 0 {
		config.Timeout = 30 * time.Second
	}

	if config.MaxRetries <= 0 {
		config.MaxRetries = 3
	}

	if config.RetryDelay <= 0 {
		config.RetryDelay = 500 * time.Millisecond
	}

	return &OpenRouterClient{
		config: config,
		httpClient: &http.Client{
			Timeout: config.Timeout,
		},
	}, nil
}

// openRouterRequest represents the request payload for OpenRouter API
type openRouterRequest struct {
	Model       string              `json:"model"`
	Messages    []openRouterMessage `json:"messages"`
	Temperature float64             `json:"temperature"`
	MaxTokens   int                 `json:"max_tokens"`
	Stream      bool                `json:"stream"`
}

// openRouterMessage represents a message in the conversation
type openRouterMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// openRouterResponse represents the response from OpenRouter API
type openRouterResponse struct {
	ID      string `json:"id"`
	Object  string `json:"object"`
	Created int64  `json:"created"`
	Model   string `json:"model"`
	Choices []struct {
		Index   int `json:"index"`
		Message struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"message"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
	Usage struct {
		PromptTokens     int `json:"prompt_tokens"`
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
	Error *struct {
		Message string `json:"message"`
		Type    string `json:"type"`
		Code    string `json:"code"`
	} `json:"error,omitempty"`
}

// Transform sends text to OpenRouter for transformation
func (c *OpenRouterClient) Transform(ctx context.Context, request *LLMTransformRequest) (*LLMTransformResponse, error) {
	if err := request.Validate(); err != nil {
		return nil, err
	}

	model := request.Model
	if model == "" {
		model = c.config.DefaultModel
	}

	startTime := time.Now()

	// Build the request payload
	payload := openRouterRequest{
		Model: model,
		Messages: []openRouterMessage{
			{Role: "system", Content: request.SystemPrompt},
			{Role: "user", Content: request.UserMessage},
		},
		Temperature: request.Temperature,
		MaxTokens:   request.MaxTokens,
		Stream:      false,
	}

	var lastErr error
	for attempt := 0; attempt <= c.config.MaxRetries; attempt++ {
		if attempt > 0 {
			delay := c.config.RetryDelay * time.Duration(1<<(attempt-1)) // Exponential backoff
			log.Debug().
				Int("attempt", attempt).
				Dur("delay", delay).
				Msg("Retrying OpenRouter request")

			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(delay):
			}
		}

		response, err := c.doRequest(ctx, payload)
		if err == nil {
			response.Latency = time.Since(startTime)
			return response, nil
		}

		lastErr = err

		// Check if error is retryable
		if llmErr, ok := err.(*LLMError); ok && llmErr.IsRetryable() {
			continue
		}

		// Non-retryable error, return immediately
		return nil, err
	}

	return nil, lastErr
}

// doRequest performs the actual HTTP request to OpenRouter
func (c *OpenRouterClient) doRequest(ctx context.Context, payload openRouterRequest) (*LLMTransformResponse, error) {
	jsonData, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.config.BaseURL+"/chat/completions", bytes.NewReader(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.config.APIKey)
	req.Header.Set("HTTP-Referer", "https://armor-newsletter.com")
	req.Header.Set("X-Title", "Armor Newsletter Voice Transformation")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			return nil, ErrLLMTimeout
		}
		return nil, &LLMError{
			Code:    "REQUEST_FAILED",
			Message: fmt.Sprintf("request failed: %v", err),
			Status:  0,
		}
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// Handle HTTP errors
	if resp.StatusCode != http.StatusOK {
		return nil, c.handleHTTPError(resp.StatusCode, body)
	}

	var openRouterResp openRouterResponse
	if err := json.Unmarshal(body, &openRouterResp); err != nil {
		return nil, &LLMError{
			Code:    "INVALID_RESPONSE",
			Message: fmt.Sprintf("failed to parse response: %v", err),
		}
	}

	// Check for API-level error
	if openRouterResp.Error != nil {
		return nil, &LLMError{
			Code:    openRouterResp.Error.Code,
			Message: openRouterResp.Error.Message,
		}
	}

	// Validate response has choices
	if len(openRouterResp.Choices) == 0 {
		return nil, ErrLLMInvalidResponse
	}

	choice := openRouterResp.Choices[0]

	// Check for content filtering
	if choice.FinishReason == "content_filter" {
		return nil, ErrLLMContentFiltered
	}

	return &LLMTransformResponse{
		TransformedText:  choice.Message.Content,
		TokensUsed:       openRouterResp.Usage.TotalTokens,
		PromptTokens:     openRouterResp.Usage.PromptTokens,
		CompletionTokens: openRouterResp.Usage.CompletionTokens,
		Model:            openRouterResp.Model,
		FinishReason:     choice.FinishReason,
	}, nil
}

// handleHTTPError converts HTTP error codes to LLMError
func (c *OpenRouterClient) handleHTTPError(statusCode int, body []byte) error {
	// Try to parse error response
	var errorResp struct {
		Error struct {
			Message string `json:"message"`
			Type    string `json:"type"`
			Code    string `json:"code"`
		} `json:"error"`
	}
	json.Unmarshal(body, &errorResp)

	message := errorResp.Error.Message
	if message == "" {
		message = fmt.Sprintf("HTTP %d error", statusCode)
	}

	switch statusCode {
	case http.StatusTooManyRequests:
		return &LLMError{
			Code:    "LLM_RATE_LIMITED",
			Message: message,
			Status:  statusCode,
		}
	case http.StatusServiceUnavailable, http.StatusBadGateway, http.StatusGatewayTimeout:
		return &LLMError{
			Code:    "LLM_UNAVAILABLE",
			Message: message,
			Status:  statusCode,
		}
	case http.StatusUnauthorized:
		return &LLMError{
			Code:    "UNAUTHORIZED",
			Message: "Invalid API key",
			Status:  statusCode,
		}
	case http.StatusForbidden:
		return &LLMError{
			Code:    "FORBIDDEN",
			Message: message,
			Status:  statusCode,
		}
	default:
		return &LLMError{
			Code:    fmt.Sprintf("HTTP_%d", statusCode),
			Message: message,
			Status:  statusCode,
		}
	}
}

// HealthCheck verifies the OpenRouter API is accessible
func (c *OpenRouterClient) HealthCheck(ctx context.Context) error {
	// Make a minimal request to check API availability
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		c.config.BaseURL+"/models", nil)
	if err != nil {
		return fmt.Errorf("failed to create health check request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.config.APIKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return ErrLLMUnavailable
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		if resp.StatusCode == http.StatusUnauthorized {
			return &LLMError{
				Code:    "UNAUTHORIZED",
				Message: "Invalid API key",
				Status:  resp.StatusCode,
			}
		}
		return ErrLLMUnavailable
	}

	return nil
}

// GetConfig returns the current configuration (useful for testing)
func (c *OpenRouterClient) GetConfig() *LLMClientConfig {
	return c.config
}
