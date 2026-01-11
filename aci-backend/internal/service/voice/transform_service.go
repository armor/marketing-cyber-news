package voice

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/phillipboles/aci-backend/internal/domain/voice"
	"github.com/phillipboles/aci-backend/internal/repository"
)

// TransformService provides business logic for text transformation
type TransformService interface {
	// Transform generates multiple transformation options for the given text
	Transform(ctx context.Context, req *voice.TransformRequest, userID uuid.UUID) (*voice.TransformResponse, error)

	// SelectTransformation records the user's selection and stores the transformation
	SelectTransformation(ctx context.Context, req *voice.SelectTransformRequest, userID uuid.UUID) (*voice.SelectTransformResponse, error)
}

// PendingTransform stores the result of a transform request awaiting selection
type PendingTransform struct {
	RequestID    uuid.UUID
	AgentID      uuid.UUID
	AgentName    string
	OriginalText string
	Options      []voice.TransformOption
	CreatedAt    time.Time
	UserID       uuid.UUID
	FieldPath    string
	EntityType   string
	EntityID     *uuid.UUID
	Agent        *voice.VoiceAgent
}

type transformService struct {
	agentService    AgentService
	llmClient       LLMClient
	sanitizer       *InputSanitizer
	transformRepo   repository.TransformationRepository
	pendingCache    *pendingCache
	cacheExpiration time.Duration
}

// pendingCache is a thread-safe in-memory cache for pending transformations
type pendingCache struct {
	mu    sync.RWMutex
	items map[uuid.UUID]*PendingTransform
}

func newPendingCache() *pendingCache {
	return &pendingCache{
		items: make(map[uuid.UUID]*PendingTransform),
	}
}

func (c *pendingCache) Set(id uuid.UUID, pt *PendingTransform) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.items[id] = pt
}

func (c *pendingCache) Get(id uuid.UUID) (*PendingTransform, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	pt, ok := c.items[id]
	return pt, ok
}

func (c *pendingCache) Delete(id uuid.UUID) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.items, id)
}

// Cleanup removes expired entries
func (c *pendingCache) Cleanup(expiration time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	now := time.Now()
	for id, pt := range c.items {
		if now.Sub(pt.CreatedAt) > expiration {
			delete(c.items, id)
		}
	}
}

// NewTransformService creates a new TransformService
func NewTransformService(
	agentService AgentService,
	llmClient LLMClient,
	transformRepo repository.TransformationRepository,
) TransformService {
	if agentService == nil {
		panic("agentService cannot be nil")
	}
	if llmClient == nil {
		panic("llmClient cannot be nil")
	}
	if transformRepo == nil {
		panic("transformRepo cannot be nil")
	}

	svc := &transformService{
		agentService:    agentService,
		llmClient:       llmClient,
		sanitizer:       NewInputSanitizer(),
		transformRepo:   transformRepo,
		pendingCache:    newPendingCache(),
		cacheExpiration: 30 * time.Minute, // Pending transforms expire after 30 minutes
	}

	// Start background cleanup goroutine
	go svc.startCacheCleanup()

	return svc
}

// startCacheCleanup runs periodic cleanup of expired pending transforms
func (s *transformService) startCacheCleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		s.pendingCache.Cleanup(s.cacheExpiration)
	}
}

// Transform generates multiple transformation options for the given text
func (s *transformService) Transform(ctx context.Context, req *voice.TransformRequest, userID uuid.UUID) (*voice.TransformResponse, error) {
	startTime := time.Now()

	// Validate request
	if err := req.Validate(); err != nil {
		return nil, fmt.Errorf("invalid request: %w", err)
	}
	req.WithDefaults()

	// Validate user
	if userID == uuid.Nil {
		return nil, fmt.Errorf("user ID is required")
	}

	// Sanitize input
	sanitizeResult := s.sanitizer.Sanitize(req.Text)
	if !sanitizeResult.IsValid {
		log.Warn().
			Str("user_id", userID.String()).
			Strs("errors", sanitizeResult.Errors).
			Strs("rejected_patterns", sanitizeResult.RejectedPatterns).
			Msg("Input sanitization failed")
		return nil, fmt.Errorf("input validation failed: %v", sanitizeResult.Errors)
	}

	// Log warnings if any
	if len(sanitizeResult.Warnings) > 0 {
		log.Warn().
			Str("user_id", userID.String()).
			Strs("warnings", sanitizeResult.Warnings).
			Msg("Input sanitization warnings")
	}

	// Get agent with rules and examples
	agent, err := s.agentService.GetAgentByID(ctx, req.AgentID)
	if err != nil {
		log.Error().Err(err).Str("agent_id", req.AgentID.String()).Msg("Failed to get voice agent")
		return nil, fmt.Errorf("failed to get voice agent: %w", err)
	}

	// Verify agent is active
	if !agent.IsActive() {
		return nil, fmt.Errorf("voice agent is not active")
	}

	// Build system prompt with rules and examples
	systemPrompt := s.agentService.BuildSystemPrompt(agent)

	// Generate request ID for this transform session
	requestID := uuid.New()

	// Get transform option configurations
	optionConfigs := voice.DefaultTransformOptions()

	// Make parallel LLM calls
	options, err := s.transformParallel(ctx, systemPrompt, sanitizeResult.SanitizedText, agent.MaxTokens, optionConfigs)
	if err != nil {
		log.Error().Err(err).Str("agent_id", req.AgentID.String()).Msg("Failed to generate transformations")
		return nil, fmt.Errorf("failed to generate transformations: %w", err)
	}

	// Calculate latency
	latencyMs := int(time.Since(startTime).Milliseconds())

	// Store pending transform for later selection
	pending := &PendingTransform{
		RequestID:    requestID,
		AgentID:      agent.ID,
		AgentName:    agent.Name,
		OriginalText: sanitizeResult.SanitizedText,
		Options:      options,
		CreatedAt:    time.Now(),
		UserID:       userID,
		FieldPath:    req.FieldPath,
		EntityType:   req.EntityType,
		EntityID:     req.EntityID,
		Agent:        agent,
	}
	s.pendingCache.Set(requestID, pending)

	log.Info().
		Str("request_id", requestID.String()).
		Str("user_id", userID.String()).
		Str("agent_id", agent.ID.String()).
		Str("agent_name", agent.Name).
		Int("options_count", len(options)).
		Int("latency_ms", latencyMs).
		Int("input_length", len(sanitizeResult.SanitizedText)).
		Msg("Generated transformation options")

	return &voice.TransformResponse{
		RequestID: requestID,
		AgentID:   agent.ID,
		AgentName: agent.Name,
		Options:   options,
		LatencyMs: latencyMs,
	}, nil
}

// transformParallel makes parallel LLM calls with different temperatures
func (s *transformService) transformParallel(
	ctx context.Context,
	systemPrompt string,
	text string,
	maxTokens int,
	configs []voice.TransformOptionConfig,
) ([]voice.TransformOption, error) {
	type result struct {
		index  int
		option voice.TransformOption
		err    error
	}

	results := make(chan result, len(configs))
	var wg sync.WaitGroup

	// Launch parallel LLM calls
	for i, cfg := range configs {
		wg.Add(1)
		go func(index int, config voice.TransformOptionConfig) {
			defer wg.Done()

			req := &LLMTransformRequest{
				SystemPrompt: systemPrompt,
				UserMessage:  buildTransformUserMessage(text),
				Temperature:  config.Temperature,
				MaxTokens:    maxTokens,
			}

			resp, err := s.llmClient.Transform(ctx, req)
			if err != nil {
				results <- result{index: index, err: err}
				return
			}

			results <- result{
				index: index,
				option: voice.TransformOption{
					Index:       index,
					Label:       config.Label,
					Text:        resp.TransformedText,
					Temperature: config.Temperature,
					TokensUsed:  resp.TokensUsed,
				},
			}
		}(i, cfg)
	}

	// Close results channel when all goroutines complete
	go func() {
		wg.Wait()
		close(results)
	}()

	// Collect results
	options := make([]voice.TransformOption, len(configs))
	var errs []error

	for r := range results {
		if r.err != nil {
			errs = append(errs, fmt.Errorf("option %d: %w", r.index, r.err))
			continue
		}
		options[r.index] = r.option
	}

	// If all calls failed, return error
	if len(errs) == len(configs) {
		return nil, fmt.Errorf("all LLM calls failed: %v", errs)
	}

	// Log partial failures
	if len(errs) > 0 {
		log.Warn().Int("failed_count", len(errs)).Msg("Some LLM calls failed")
	}

	// Filter out empty options (failed calls)
	validOptions := make([]voice.TransformOption, 0, len(options))
	for _, opt := range options {
		if opt.Text != "" {
			validOptions = append(validOptions, opt)
		}
	}

	if len(validOptions) == 0 {
		return nil, fmt.Errorf("no valid transformation options generated")
	}

	return validOptions, nil
}

// buildTransformUserMessage creates the user message for transformation
func buildTransformUserMessage(text string) string {
	return fmt.Sprintf(`Transform the following text according to the voice and style guidelines:

---
%s
---

Provide only the transformed text, without any preamble or explanation.`, text)
}

// SelectTransformation records the user's selection and stores the transformation
func (s *transformService) SelectTransformation(ctx context.Context, req *voice.SelectTransformRequest, userID uuid.UUID) (*voice.SelectTransformResponse, error) {
	// Validate request
	if err := req.Validate(); err != nil {
		return nil, fmt.Errorf("invalid request: %w", err)
	}

	// Validate user
	if userID == uuid.Nil {
		return nil, fmt.Errorf("user ID is required")
	}

	// Get pending transform from cache
	pending, ok := s.pendingCache.Get(req.RequestID)
	if !ok {
		return nil, fmt.Errorf("transformation request not found or expired")
	}

	// Verify user matches
	if pending.UserID != userID {
		log.Warn().
			Str("request_id", req.RequestID.String()).
			Str("expected_user", pending.UserID.String()).
			Str("actual_user", userID.String()).
			Msg("User mismatch for transformation selection")
		return nil, fmt.Errorf("unauthorized to select this transformation")
	}

	// Verify index is valid
	if req.TransformationIndex >= len(pending.Options) {
		return nil, fmt.Errorf("invalid transformation index: %d (max: %d)", req.TransformationIndex, len(pending.Options)-1)
	}

	selectedOption := pending.Options[req.TransformationIndex]

	// Create transformation record
	transformation := voice.NewTextTransformation(
		pending.RequestID,
		&pending.AgentID,
		pending.OriginalText,
		selectedOption.Text,
		req.TransformationIndex,
		userID,
	)
	transformation.TotalOptions = len(pending.Options)
	transformation.SetEntityContext(pending.EntityType, pending.EntityID, pending.FieldPath)
	transformation.SetMetrics(selectedOption.TokensUsed, 0) // Latency not relevant for selection

	// Set agent snapshot for audit
	if err := transformation.SetAgentSnapshot(pending.Agent); err != nil {
		log.Warn().Err(err).Msg("Failed to set agent snapshot")
	}

	// Store transformation
	if err := s.transformRepo.Create(ctx, transformation); err != nil {
		log.Error().Err(err).Str("request_id", req.RequestID.String()).Msg("Failed to store transformation")
		return nil, fmt.Errorf("failed to record transformation: %w", err)
	}

	// Remove from pending cache
	s.pendingCache.Delete(req.RequestID)

	log.Info().
		Str("transformation_id", transformation.ID.String()).
		Str("request_id", req.RequestID.String()).
		Str("user_id", userID.String()).
		Str("agent_id", pending.AgentID.String()).
		Int("selected_index", req.TransformationIndex).
		Str("selected_label", string(selectedOption.Label)).
		Msg("Transformation selection recorded")

	return &voice.SelectTransformResponse{
		TransformationID: transformation.ID,
		Text:             selectedOption.Text,
	}, nil
}
