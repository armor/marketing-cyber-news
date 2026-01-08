package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

// Config holds LLM client configuration
type Config struct {
	OpenRouterAPIKey string
	OpenRouterModel  string // e.g., "anthropic/claude-3.5-sonnet"
	AnthropicAPIKey  string
	AnthropicModel   string // e.g., "claude-3-sonnet-20240229"
	MaxRetries       int
	Timeout          time.Duration
	FallbackEnabled  bool
}

// Client provides LLM operations with automatic fallback
type Client struct {
	config     Config
	httpClient *http.Client
}

// GenerateRequest for content generation
type GenerateRequest struct {
	Prompt       string
	Channel      string // linkedin, twitter, etc.
	ContentType  string // post, article, thread
	BrandContext *BrandContext
	MaxTokens    int
	Temperature  float64
}

// BrandContext injected into prompts
type BrandContext struct {
	VoiceExamples  []string
	Guidelines     []string
	ApprovedTerms  []string
	BannedTerms    []TermEntry
	ToneGuidelines string
}

// TermEntry represents a banned term and its replacement
type TermEntry struct {
	Term        string
	Replacement string
}

// GenerateResponse from content generation
type GenerateResponse struct {
	Content      string
	TokensUsed   int
	FinishReason string
	Model        string
	Provider     string // "openrouter" or "anthropic"
}

// RefineRequest for content refinement
type RefineRequest struct {
	OriginalContent string
	RefinementType  string // shorter, longer, formal, casual, add_cta
	BrandContext    *BrandContext
}

// RefineResponse from content refinement
type RefineResponse struct {
	Content    string
	TokensUsed int
	Changes    []string // Description of changes made
}

// ValidateRequest for brand validation
type ValidateRequest struct {
	Content      string
	BrandContext *BrandContext
	Strictness   float64 // 0.0-1.0
}

// ValidateResponse from brand validation
type ValidateResponse struct {
	Score       int           // 0-100
	Issues      []BrandIssue
	Suggestions []string
	AutoFix     string // Auto-corrected content if possible
}

// BrandIssue represents a brand guideline violation
type BrandIssue struct {
	Type       string // terminology, tone, guideline, length
	Severity   string // error, warning, info
	Message    string
	Suggestion string
	Position   *TextPosition
}

// TextPosition represents position in text
type TextPosition struct {
	Start int
	End   int
}

// OpenRouter API request/response structures
type openRouterRequest struct {
	Model       string                   `json:"model"`
	Messages    []openRouterMessage      `json:"messages"`
	MaxTokens   int                      `json:"max_tokens,omitempty"`
	Temperature float64                  `json:"temperature,omitempty"`
	TopP        float64                  `json:"top_p,omitempty"`
	Stream      bool                     `json:"stream"`
}

type openRouterMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openRouterResponse struct {
	ID      string `json:"id"`
	Model   string `json:"model"`
	Choices []struct {
		Message struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"message"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
	Usage struct {
		TotalTokens int `json:"total_tokens"`
	} `json:"usage"`
}

// Anthropic API request/response structures
type anthropicRequest struct {
	Model       string             `json:"model"`
	Messages    []anthropicMessage `json:"messages"`
	MaxTokens   int                `json:"max_tokens"`
	Temperature float64            `json:"temperature,omitempty"`
	TopP        float64            `json:"top_p,omitempty"`
}

type anthropicMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type anthropicResponse struct {
	ID      string `json:"id"`
	Model   string `json:"model"`
	Content []struct {
		Type string `json:"type"`
		Text string `json:"text"`
	} `json:"content"`
	StopReason string `json:"stop_reason"`
	Usage      struct {
		InputTokens  int `json:"input_tokens"`
		OutputTokens int `json:"output_tokens"`
	} `json:"usage"`
}

// NewClient creates a new LLM client
func NewClient(config Config) *Client {
	if config.MaxRetries == 0 {
		config.MaxRetries = 3
	}
	if config.Timeout == 0 {
		config.Timeout = 60 * time.Second
	}

	return &Client{
		config: config,
		httpClient: &http.Client{
			Timeout: config.Timeout,
		},
	}
}

// GenerateContent generates content from a prompt with brand context
func (c *Client) GenerateContent(ctx context.Context, req GenerateRequest) (*GenerateResponse, error) {
	if req.Prompt == "" {
		return nil, fmt.Errorf("prompt is required")
	}

	prompt := c.buildGeneratePrompt(req)

	maxTokens := req.MaxTokens
	if maxTokens == 0 {
		maxTokens = 2000
	}

	temperature := req.Temperature
	if temperature == 0 {
		temperature = 0.7
	}

	// Try OpenRouter first
	resp, err := c.callOpenRouter(ctx, prompt, maxTokens, temperature)
	if err != nil {
		if !c.config.FallbackEnabled {
			return nil, fmt.Errorf("openrouter request failed: %w", err)
		}

		log.Printf("OpenRouter failed, falling back to Anthropic: %v", err)

		// Fallback to Anthropic
		resp, err = c.callAnthropic(ctx, prompt, maxTokens, temperature)
		if err != nil {
			return nil, fmt.Errorf("both providers failed - openrouter and anthropic: %w", err)
		}
	}

	return resp, nil
}

// RefineContent refines existing content based on instructions
func (c *Client) RefineContent(ctx context.Context, req RefineRequest) (*RefineResponse, error) {
	if req.OriginalContent == "" {
		return nil, fmt.Errorf("original content is required")
	}
	if req.RefinementType == "" {
		return nil, fmt.Errorf("refinement type is required")
	}

	prompt := c.buildRefinePrompt(req)

	resp, err := c.GenerateContent(ctx, GenerateRequest{
		Prompt:       prompt,
		BrandContext: req.BrandContext,
		MaxTokens:    2000,
		Temperature:  0.5,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to refine content: %w", err)
	}

	// Parse response to extract refined content and changes
	refined, changes := c.parseRefinementResponse(resp.Content)

	return &RefineResponse{
		Content:    refined,
		TokensUsed: resp.TokensUsed,
		Changes:    changes,
	}, nil
}

// ValidateBrand validates content against brand guidelines
func (c *Client) ValidateBrand(ctx context.Context, req ValidateRequest) (*ValidateResponse, error) {
	if req.Content == "" {
		return nil, fmt.Errorf("content is required")
	}

	strictness := req.Strictness
	if strictness == 0 {
		strictness = 0.7
	}

	prompt := c.buildValidatePrompt(req)

	resp, err := c.GenerateContent(ctx, GenerateRequest{
		Prompt:       prompt,
		BrandContext: req.BrandContext,
		MaxTokens:    1500,
		Temperature:  0.3, // Low temperature for consistent validation
	})
	if err != nil {
		return nil, fmt.Errorf("failed to validate brand: %w", err)
	}

	// Parse structured validation response
	validation := c.parseValidationResponse(resp.Content)

	return validation, nil
}

// callOpenRouter makes request to OpenRouter API
func (c *Client) callOpenRouter(ctx context.Context, prompt string, maxTokens int, temperature float64) (*GenerateResponse, error) {
	if c.config.OpenRouterAPIKey == "" {
		return nil, fmt.Errorf("openrouter api key not configured")
	}

	model := c.config.OpenRouterModel
	if model == "" {
		model = "anthropic/claude-3.5-sonnet"
	}

	reqBody := openRouterRequest{
		Model: model,
		Messages: []openRouterMessage{
			{
				Role:    "user",
				Content: prompt,
			},
		},
		MaxTokens:   maxTokens,
		Temperature: temperature,
		Stream:      false,
	}

	var lastErr error
	for attempt := 0; attempt < c.config.MaxRetries; attempt++ {
		if attempt > 0 {
			backoff := time.Duration(attempt) * time.Second
			select {
			case <-ctx.Done():
				return nil, fmt.Errorf("context cancelled during retry: %w", ctx.Err())
			case <-time.After(backoff):
			}
		}

		resp, err := c.makeOpenRouterRequest(ctx, reqBody)
		if err != nil {
			lastErr = err
			continue
		}

		return &GenerateResponse{
			Content:      resp.Choices[0].Message.Content,
			TokensUsed:   resp.Usage.TotalTokens,
			FinishReason: resp.Choices[0].FinishReason,
			Model:        resp.Model,
			Provider:     "openrouter",
		}, nil
	}

	return nil, fmt.Errorf("openrouter request failed after %d retries: %w", c.config.MaxRetries, lastErr)
}

// makeOpenRouterRequest performs the HTTP request to OpenRouter
func (c *Client) makeOpenRouterRequest(ctx context.Context, reqBody openRouterRequest) (*openRouterResponse, error) {
	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://openrouter.ai/api/v1/chat/completions", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.config.OpenRouterAPIKey))
	req.Header.Set("HTTP-Referer", "https://armor-newsletter.ai")
	req.Header.Set("X-Title", "Armor Newsletter AI")

	httpResp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer httpResp.Body.Close()

	if httpResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(httpResp.Body)
		return nil, fmt.Errorf("openrouter returned status %d: %s", httpResp.StatusCode, string(body))
	}

	var response openRouterResponse
	if err := json.NewDecoder(httpResp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if len(response.Choices) == 0 {
		return nil, fmt.Errorf("no choices in response")
	}

	return &response, nil
}

// callAnthropic makes request to Anthropic API
func (c *Client) callAnthropic(ctx context.Context, prompt string, maxTokens int, temperature float64) (*GenerateResponse, error) {
	if c.config.AnthropicAPIKey == "" {
		return nil, fmt.Errorf("anthropic api key not configured")
	}

	model := c.config.AnthropicModel
	if model == "" {
		model = "claude-3-sonnet-20240229"
	}

	reqBody := anthropicRequest{
		Model: model,
		Messages: []anthropicMessage{
			{
				Role:    "user",
				Content: prompt,
			},
		},
		MaxTokens:   maxTokens,
		Temperature: temperature,
	}

	var lastErr error
	for attempt := 0; attempt < c.config.MaxRetries; attempt++ {
		if attempt > 0 {
			backoff := time.Duration(attempt*2) * time.Second
			select {
			case <-ctx.Done():
				return nil, fmt.Errorf("context cancelled during retry: %w", ctx.Err())
			case <-time.After(backoff):
			}
		}

		resp, err := c.makeAnthropicRequest(ctx, reqBody)
		if err != nil {
			lastErr = err
			continue
		}

		return &GenerateResponse{
			Content:      resp.Content[0].Text,
			TokensUsed:   resp.Usage.InputTokens + resp.Usage.OutputTokens,
			FinishReason: resp.StopReason,
			Model:        resp.Model,
			Provider:     "anthropic",
		}, nil
	}

	return nil, fmt.Errorf("anthropic request failed after %d retries: %w", c.config.MaxRetries, lastErr)
}

// makeAnthropicRequest performs the HTTP request to Anthropic
func (c *Client) makeAnthropicRequest(ctx context.Context, reqBody anthropicRequest) (*anthropicResponse, error) {
	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.anthropic.com/v1/messages", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", c.config.AnthropicAPIKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	httpResp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer httpResp.Body.Close()

	if httpResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(httpResp.Body)
		return nil, fmt.Errorf("anthropic returned status %d: %s", httpResp.StatusCode, string(body))
	}

	var response anthropicResponse
	if err := json.NewDecoder(httpResp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if len(response.Content) == 0 {
		return nil, fmt.Errorf("no content in response")
	}

	return &response, nil
}

// buildGeneratePrompt constructs prompt for content generation
func (c *Client) buildGeneratePrompt(req GenerateRequest) string {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("Generate %s content for %s.\n\n", req.ContentType, req.Channel))
	sb.WriteString(fmt.Sprintf("Prompt: %s\n\n", req.Prompt))

	if req.BrandContext != nil {
		sb.WriteString("BRAND GUIDELINES:\n")

		if req.BrandContext.ToneGuidelines != "" {
			sb.WriteString(fmt.Sprintf("Tone: %s\n", req.BrandContext.ToneGuidelines))
		}

		if len(req.BrandContext.Guidelines) > 0 {
			sb.WriteString("Guidelines:\n")
			for _, guideline := range req.BrandContext.Guidelines {
				sb.WriteString(fmt.Sprintf("- %s\n", guideline))
			}
		}

		if len(req.BrandContext.ApprovedTerms) > 0 {
			sb.WriteString(fmt.Sprintf("Approved terminology: %s\n", strings.Join(req.BrandContext.ApprovedTerms, ", ")))
		}

		if len(req.BrandContext.BannedTerms) > 0 {
			sb.WriteString("Avoid these terms:\n")
			for _, term := range req.BrandContext.BannedTerms {
				if term.Replacement != "" {
					sb.WriteString(fmt.Sprintf("- %s (use '%s' instead)\n", term.Term, term.Replacement))
				} else {
					sb.WriteString(fmt.Sprintf("- %s\n", term.Term))
				}
			}
		}

		if len(req.BrandContext.VoiceExamples) > 0 {
			sb.WriteString("\nBrand voice examples:\n")
			for i, example := range req.BrandContext.VoiceExamples {
				sb.WriteString(fmt.Sprintf("%d. %s\n", i+1, example))
			}
		}
	}

	sb.WriteString("\nProvide ONLY the generated content, no explanations or meta-commentary.")

	return sb.String()
}

// buildRefinePrompt constructs prompt for content refinement
func (c *Client) buildRefinePrompt(req RefineRequest) string {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("Refine the following content (%s):\n\n", req.RefinementType))
	sb.WriteString(fmt.Sprintf("Original:\n%s\n\n", req.OriginalContent))

	refinementInstructions := map[string]string{
		"shorter":  "Make the content more concise while preserving key messages.",
		"longer":   "Expand the content with additional details and examples.",
		"formal":   "Increase formality and professional tone.",
		"casual":   "Make the tone more conversational and approachable.",
		"add_cta":  "Add a clear call-to-action at the end.",
		"fix_tone": "Adjust tone to match brand guidelines.",
	}

	if instruction, ok := refinementInstructions[req.RefinementType]; ok {
		sb.WriteString(fmt.Sprintf("Task: %s\n\n", instruction))
	}

	if req.BrandContext != nil {
		sb.WriteString(c.formatBrandContext(req.BrandContext))
	}

	sb.WriteString("\nProvide the refined content followed by a list of changes made (format: 'CHANGES: 1. ... 2. ...').")

	return sb.String()
}

// buildValidatePrompt constructs prompt for brand validation
func (c *Client) buildValidatePrompt(req ValidateRequest) string {
	var sb strings.Builder

	sb.WriteString("Validate the following content against brand guidelines:\n\n")
	sb.WriteString(fmt.Sprintf("Content:\n%s\n\n", req.Content))

	if req.BrandContext != nil {
		sb.WriteString(c.formatBrandContext(req.BrandContext))
	}

	sb.WriteString(fmt.Sprintf("\nStrictness level: %.1f (0.0=lenient, 1.0=strict)\n\n", req.Strictness))

	sb.WriteString("Provide validation results in this format:\n")
	sb.WriteString("SCORE: [0-100]\n")
	sb.WriteString("ISSUES:\n")
	sb.WriteString("- [type] (severity): message | suggestion\n")
	sb.WriteString("SUGGESTIONS:\n")
	sb.WriteString("- general improvement suggestion\n")
	sb.WriteString("AUTOFIX:\n")
	sb.WriteString("[corrected content if minor issues, or NONE if major issues]\n")

	return sb.String()
}

// formatBrandContext formats brand context for prompts
func (c *Client) formatBrandContext(ctx *BrandContext) string {
	var sb strings.Builder

	sb.WriteString("BRAND GUIDELINES:\n")

	if ctx.ToneGuidelines != "" {
		sb.WriteString(fmt.Sprintf("Tone: %s\n", ctx.ToneGuidelines))
	}

	if len(ctx.Guidelines) > 0 {
		sb.WriteString("Guidelines:\n")
		for _, guideline := range ctx.Guidelines {
			sb.WriteString(fmt.Sprintf("- %s\n", guideline))
		}
	}

	if len(ctx.ApprovedTerms) > 0 {
		sb.WriteString(fmt.Sprintf("Approved terms: %s\n", strings.Join(ctx.ApprovedTerms, ", ")))
	}

	if len(ctx.BannedTerms) > 0 {
		sb.WriteString("Banned terms:\n")
		for _, term := range ctx.BannedTerms {
			if term.Replacement != "" {
				sb.WriteString(fmt.Sprintf("- %s (use '%s')\n", term.Term, term.Replacement))
			} else {
				sb.WriteString(fmt.Sprintf("- %s\n", term.Term))
			}
		}
	}

	return sb.String()
}

// parseRefinementResponse extracts refined content and changes from response
func (c *Client) parseRefinementResponse(response string) (string, []string) {
	parts := strings.Split(response, "CHANGES:")
	if len(parts) != 2 {
		return response, []string{}
	}

	content := strings.TrimSpace(parts[0])
	changesText := strings.TrimSpace(parts[1])

	var changes []string
	for _, line := range strings.Split(changesText, "\n") {
		line = strings.TrimSpace(line)
		if line != "" {
			// Remove leading numbers/bullets
			line = strings.TrimPrefix(line, "- ")
			line = strings.TrimLeft(line, "0123456789. ")
			if line != "" {
				changes = append(changes, line)
			}
		}
	}

	return content, changes
}

// parseValidationResponse parses structured validation response
func (c *Client) parseValidationResponse(response string) *ValidateResponse {
	result := &ValidateResponse{
		Score:       0,
		Issues:      []BrandIssue{},
		Suggestions: []string{},
		AutoFix:     "",
	}

	lines := strings.Split(response, "\n")
	section := ""

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// Detect sections
		if strings.HasPrefix(line, "SCORE:") {
			section = "score"
			scoreText := strings.TrimSpace(strings.TrimPrefix(line, "SCORE:"))
			fmt.Sscanf(scoreText, "%d", &result.Score)
			continue
		}
		if strings.HasPrefix(line, "ISSUES:") {
			section = "issues"
			continue
		}
		if strings.HasPrefix(line, "SUGGESTIONS:") {
			section = "suggestions"
			continue
		}
		if strings.HasPrefix(line, "AUTOFIX:") {
			section = "autofix"
			continue
		}

		// Parse content based on section
		switch section {
		case "issues":
			if strings.HasPrefix(line, "-") {
				issue := c.parseIssue(strings.TrimPrefix(line, "-"))
				if issue != nil {
					result.Issues = append(result.Issues, *issue)
				}
			}
		case "suggestions":
			if strings.HasPrefix(line, "-") {
				suggestion := strings.TrimSpace(strings.TrimPrefix(line, "-"))
				if suggestion != "" {
					result.Suggestions = append(result.Suggestions, suggestion)
				}
			}
		case "autofix":
			if line != "NONE" {
				if result.AutoFix == "" {
					result.AutoFix = line
				} else {
					result.AutoFix += "\n" + line
				}
			}
		}
	}

	return result
}

// parseIssue parses a single brand issue from text
func (c *Client) parseIssue(text string) *BrandIssue {
	text = strings.TrimSpace(text)
	if text == "" {
		return nil
	}

	// Format: [type] (severity): message | suggestion
	parts := strings.SplitN(text, ":", 2)
	if len(parts) < 2 {
		return nil
	}

	// Parse type and severity
	typeSeverity := strings.TrimSpace(parts[0])
	typeParts := strings.SplitN(typeSeverity, "(", 2)
	issueType := strings.Trim(typeParts[0], "[] ")

	severity := "warning"
	if len(typeParts) == 2 {
		severity = strings.Trim(typeParts[1], ") ")
	}

	// Parse message and suggestion
	messageSuggestion := strings.TrimSpace(parts[1])
	msgParts := strings.SplitN(messageSuggestion, "|", 2)

	message := strings.TrimSpace(msgParts[0])
	suggestion := ""
	if len(msgParts) == 2 {
		suggestion = strings.TrimSpace(msgParts[1])
	}

	return &BrandIssue{
		Type:       issueType,
		Severity:   severity,
		Message:    message,
		Suggestion: suggestion,
		Position:   nil, // Position detection would require more complex parsing
	}
}
