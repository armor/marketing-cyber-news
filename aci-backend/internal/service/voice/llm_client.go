package voice

import (
	"context"
	"time"
)

// LLMClient defines the interface for LLM providers used in voice transformation
type LLMClient interface {
	// Transform sends text to the LLM for transformation using the provided system prompt
	// Returns the transformed text, tokens used, and any error
	Transform(ctx context.Context, request *LLMTransformRequest) (*LLMTransformResponse, error)

	// HealthCheck verifies the LLM service is available
	HealthCheck(ctx context.Context) error
}

// LLMTransformRequest contains the parameters for a transformation request
type LLMTransformRequest struct {
	// SystemPrompt is the voice agent's system prompt with style rules
	SystemPrompt string `json:"system_prompt"`

	// UserMessage is the text to be transformed
	UserMessage string `json:"user_message"`

	// Temperature controls randomness (0.0-1.0)
	Temperature float64 `json:"temperature"`

	// MaxTokens limits the response length
	MaxTokens int `json:"max_tokens"`

	// Model specifies which LLM model to use (optional, uses default if empty)
	Model string `json:"model,omitempty"`
}

// Validate validates the transform request
func (r *LLMTransformRequest) Validate() error {
	if r.SystemPrompt == "" {
		return ErrEmptySystemPrompt
	}
	if r.UserMessage == "" {
		return ErrEmptyUserMessage
	}
	if r.Temperature < 0 || r.Temperature > 1 {
		return ErrInvalidTemperature
	}
	if r.MaxTokens <= 0 {
		return ErrInvalidMaxTokens
	}
	return nil
}

// LLMTransformResponse contains the response from an LLM transformation
type LLMTransformResponse struct {
	// TransformedText is the resulting text after transformation
	TransformedText string `json:"transformed_text"`

	// TokensUsed is the total tokens consumed (prompt + completion)
	TokensUsed int `json:"tokens_used"`

	// PromptTokens is the number of tokens in the prompt
	PromptTokens int `json:"prompt_tokens"`

	// CompletionTokens is the number of tokens in the completion
	CompletionTokens int `json:"completion_tokens"`

	// Latency is the time taken for the LLM call
	Latency time.Duration `json:"latency"`

	// Model is the actual model used for this request
	Model string `json:"model"`

	// FinishReason indicates why the generation stopped
	FinishReason string `json:"finish_reason"`
}

// LLMError represents an error from the LLM service
type LLMError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Status  int    `json:"status"`
}

func (e *LLMError) Error() string {
	return e.Message
}

// Common LLM errors
var (
	ErrEmptySystemPrompt  = &LLMError{Code: "EMPTY_SYSTEM_PROMPT", Message: "system prompt cannot be empty"}
	ErrEmptyUserMessage   = &LLMError{Code: "EMPTY_USER_MESSAGE", Message: "user message cannot be empty"}
	ErrInvalidTemperature = &LLMError{Code: "INVALID_TEMPERATURE", Message: "temperature must be between 0 and 1"}
	ErrInvalidMaxTokens   = &LLMError{Code: "INVALID_MAX_TOKENS", Message: "max tokens must be positive"}
	ErrLLMUnavailable     = &LLMError{Code: "LLM_UNAVAILABLE", Message: "LLM service is unavailable", Status: 503}
	ErrLLMTimeout         = &LLMError{Code: "LLM_TIMEOUT", Message: "LLM request timed out", Status: 504}
	ErrLLMRateLimited     = &LLMError{Code: "LLM_RATE_LIMITED", Message: "LLM rate limit exceeded", Status: 429}
	ErrLLMInvalidResponse = &LLMError{Code: "LLM_INVALID_RESPONSE", Message: "invalid response from LLM service"}
	ErrLLMContentFiltered = &LLMError{Code: "LLM_CONTENT_FILTERED", Message: "content was filtered by LLM safety systems"}
)

// IsRetryable returns true if the error is transient and the request can be retried
func (e *LLMError) IsRetryable() bool {
	switch e.Code {
	case "LLM_UNAVAILABLE", "LLM_TIMEOUT", "LLM_RATE_LIMITED":
		return true
	default:
		return false
	}
}

// LLMClientConfig holds configuration for an LLM client
type LLMClientConfig struct {
	// APIKey is the authentication key for the LLM service
	APIKey string `json:"api_key"`

	// BaseURL is the API endpoint
	BaseURL string `json:"base_url"`

	// DefaultModel is the model to use when not specified in request
	DefaultModel string `json:"default_model"`

	// Timeout is the maximum time for a request
	Timeout time.Duration `json:"timeout"`

	// MaxRetries is the number of retry attempts for transient errors
	MaxRetries int `json:"max_retries"`

	// RetryDelay is the initial delay between retries
	RetryDelay time.Duration `json:"retry_delay"`
}

// DefaultLLMClientConfig returns a config with sensible defaults
func DefaultLLMClientConfig() *LLMClientConfig {
	return &LLMClientConfig{
		BaseURL:      "https://openrouter.ai/api/v1",
		DefaultModel: "anthropic/claude-3-haiku",
		Timeout:      30 * time.Second,
		MaxRetries:   3,
		RetryDelay:   500 * time.Millisecond,
	}
}
