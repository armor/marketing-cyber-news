package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/phillipboles/aci-backend/internal/api/middleware"
	"github.com/phillipboles/aci-backend/internal/api/response"
	voiceDomain "github.com/phillipboles/aci-backend/internal/domain/voice"
	"github.com/phillipboles/aci-backend/internal/service/voice"
)

// VoiceAgentHandler handles voice agent HTTP requests
type VoiceAgentHandler struct {
	agentService   voice.AgentService
	ruleService    voice.StyleRuleService
	exampleService voice.ExampleService
}

// NewVoiceAgentHandler creates a new voice agent handler
func NewVoiceAgentHandler(agentService voice.AgentService, ruleService voice.StyleRuleService, exampleService voice.ExampleService) *VoiceAgentHandler {
	if agentService == nil {
		panic("agentService cannot be nil")
	}
	if ruleService == nil {
		panic("ruleService cannot be nil")
	}
	if exampleService == nil {
		panic("exampleService cannot be nil")
	}

	return &VoiceAgentHandler{
		agentService:   agentService,
		ruleService:    ruleService,
		exampleService: exampleService,
	}
}

// VoiceAgentDTO represents the API response for a voice agent
type VoiceAgentDTO struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Icon        string         `json:"icon"`
	Color       string         `json:"color"`
	Status      string         `json:"status"`
	StyleRules  []StyleRuleDTO `json:"style_rules,omitempty"`
	Examples    []ExampleDTO   `json:"examples,omitempty"`
}

// StyleRuleDTO represents a style rule in the API response
type StyleRuleDTO struct {
	ID        string `json:"id"`
	RuleType  string `json:"rule_type"`
	RuleText  string `json:"rule_text"`
	SortOrder int    `json:"sort_order"`
}

// ExampleDTO represents an example in the API response
type ExampleDTO struct {
	ID         string `json:"id"`
	BeforeText string `json:"before_text"`
	AfterText  string `json:"after_text"`
	Context    string `json:"context,omitempty"`
	SortOrder  int    `json:"sort_order"`
}

// ListAgents handles GET /v1/voice-agents
// Returns all active voice agents available for transformation
func (h *VoiceAgentHandler) ListAgents(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get user from context - authentication required
	_, err := middleware.GetDomainUserFromContext(ctx)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Get active agents
	agents, err := h.agentService.ListActiveAgents(ctx)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to list voice agents")
		response.InternalError(w, "Failed to list voice agents", requestID)
		return
	}

	// Convert to DTOs
	dtos := make([]VoiceAgentDTO, 0, len(agents))
	for _, agent := range agents {
		dtos = append(dtos, VoiceAgentDTO{
			ID:          agent.ID.String(),
			Name:        agent.Name,
			Description: agent.Description,
			Icon:        agent.Icon,
			Color:       agent.Color,
			Status:      string(agent.Status),
		})
	}

	log.Debug().
		Str("request_id", requestID).
		Int("count", len(dtos)).
		Msg("Listed voice agents")

	response.Success(w, map[string]interface{}{
		"agents": dtos,
		"total":  len(dtos),
	})
}

// GetAgent handles GET /v1/voice-agents/{id}
// Returns a single voice agent with its style rules and examples
func (h *VoiceAgentHandler) GetAgent(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get user from context - authentication required
	_, err := middleware.GetDomainUserFromContext(ctx)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Get agent ID from URL
	agentIDStr := chi.URLParam(r, "id")
	agentID, err := uuid.Parse(agentIDStr)
	if err != nil {
		response.BadRequest(w, "Invalid agent ID format")
		return
	}

	// Get agent with rules and examples
	agent, err := h.agentService.GetAgentByID(ctx, agentID)
	if err != nil {
		if voiceContainsNotFound(err) {
			response.NotFound(w, "Voice agent not found")
			return
		}
		log.Error().Err(err).
			Str("request_id", requestID).
			Str("agent_id", agentID.String()).
			Msg("Failed to get voice agent")
		response.InternalError(w, "Failed to get voice agent", requestID)
		return
	}

	// Convert style rules to DTOs
	styleRules := make([]StyleRuleDTO, 0, len(agent.StyleRules))
	for _, rule := range agent.StyleRules {
		styleRules = append(styleRules, StyleRuleDTO{
			ID:        rule.ID.String(),
			RuleType:  string(rule.RuleType),
			RuleText:  rule.RuleText,
			SortOrder: rule.SortOrder,
		})
	}

	// Convert examples to DTOs
	examples := make([]ExampleDTO, 0, len(agent.Examples))
	for _, example := range agent.Examples {
		examples = append(examples, ExampleDTO{
			ID:         example.ID.String(),
			BeforeText: example.BeforeText,
			AfterText:  example.AfterText,
			Context:    example.Context,
			SortOrder:  example.SortOrder,
		})
	}

	dto := VoiceAgentDTO{
		ID:          agent.ID.String(),
		Name:        agent.Name,
		Description: agent.Description,
		Icon:        agent.Icon,
		Color:       agent.Color,
		Status:      string(agent.Status),
		StyleRules:  styleRules,
		Examples:    examples,
	}

	log.Debug().
		Str("request_id", requestID).
		Str("agent_id", agentID.String()).
		Str("agent_name", agent.Name).
		Msg("Retrieved voice agent")

	response.Success(w, dto)
}

// voiceContainsNotFound checks if an error message contains "not found"
func voiceContainsNotFound(err error) bool {
	if err == nil {
		return false
	}
	return contains(err.Error(), "not found")
}

// =============================================================================
// Admin CRUD Handlers
// =============================================================================

// CreateAgentRequest represents the request body for creating a voice agent
type CreateAgentRequest struct {
	Name         string  `json:"name"`
	Description  string  `json:"description"`
	Icon         string  `json:"icon,omitempty"`
	Color        string  `json:"color,omitempty"`
	SystemPrompt string  `json:"system_prompt"`
	Temperature  float64 `json:"temperature,omitempty"`
	MaxTokens    int     `json:"max_tokens,omitempty"`
	Status       string  `json:"status,omitempty"`
}

// UpdateAgentRequest represents the request body for updating a voice agent
type UpdateAgentRequest struct {
	Name         string  `json:"name"`
	Description  string  `json:"description"`
	Icon         string  `json:"icon"`
	Color        string  `json:"color"`
	SystemPrompt string  `json:"system_prompt"`
	Temperature  float64 `json:"temperature"`
	MaxTokens    int     `json:"max_tokens"`
	Status       string  `json:"status"`
}

// CreateAgent handles POST /v1/admin/voice-agents
func (h *VoiceAgentHandler) CreateAgent(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get user from context - admin middleware already verified role
	claims, ok := middleware.GetUserFromContext(ctx)
	if !ok {
		log.Error().Str("request_id", requestID).Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Parse request body
	var req CreateAgentRequest
	if err := parseJSON(r, &req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Validate required fields
	if req.Name == "" {
		response.BadRequest(w, "Name is required")
		return
	}

	if req.SystemPrompt == "" {
		response.BadRequest(w, "System prompt is required")
		return
	}

	// Create domain object
	agent := &voiceDomain.VoiceAgent{
		Name:         req.Name,
		Description:  req.Description,
		Icon:         req.Icon,
		Color:        req.Color,
		SystemPrompt: req.SystemPrompt,
		Temperature:  req.Temperature,
		MaxTokens:    req.MaxTokens,
	}

	// Set status if provided
	if req.Status != "" {
		agent.Status = voiceDomain.VoiceAgentStatus(req.Status)
	}

	// Create agent via service
	if err := h.agentService.CreateAgent(ctx, agent, claims.UserID); err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to create voice agent")
		response.InternalError(w, "Failed to create voice agent", requestID)
		return
	}

	// Convert to DTO
	dto := VoiceAgentDTO{
		ID:          agent.ID.String(),
		Name:        agent.Name,
		Description: agent.Description,
		Icon:        agent.Icon,
		Color:       agent.Color,
		Status:      string(agent.Status),
	}

	log.Info().
		Str("request_id", requestID).
		Str("agent_id", agent.ID.String()).
		Str("created_by", claims.UserID.String()).
		Msg("Created voice agent")

	response.Created(w, dto)
}

// UpdateAgent handles PUT /v1/admin/voice-agents/{id}
func (h *VoiceAgentHandler) UpdateAgent(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get user from context - admin middleware already verified role
	_, ok := middleware.GetUserFromContext(ctx)
	if !ok {
		log.Error().Str("request_id", requestID).Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Get agent ID from URL
	agentIDStr := chi.URLParam(r, "id")
	agentID, err := uuid.Parse(agentIDStr)
	if err != nil {
		response.BadRequest(w, "Invalid agent ID format")
		return
	}

	// Parse request body
	var req UpdateAgentRequest
	if err := parseJSON(r, &req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Validate required fields
	if req.Name == "" {
		response.BadRequest(w, "Name is required")
		return
	}

	if req.SystemPrompt == "" {
		response.BadRequest(w, "System prompt is required")
		return
	}

	// Get existing agent
	agent, err := h.agentService.GetAgentByID(ctx, agentID)
	if err != nil {
		if voiceContainsNotFound(err) {
			response.NotFound(w, "Voice agent not found")
			return
		}
		log.Error().Err(err).
			Str("request_id", requestID).
			Str("agent_id", agentID.String()).
			Msg("Failed to get voice agent")
		response.InternalError(w, "Failed to get voice agent", requestID)
		return
	}

	// Update fields
	agent.Name = req.Name
	agent.Description = req.Description
	agent.Icon = req.Icon
	agent.Color = req.Color
	agent.SystemPrompt = req.SystemPrompt
	agent.Temperature = req.Temperature
	agent.MaxTokens = req.MaxTokens
	agent.Status = voiceDomain.VoiceAgentStatus(req.Status)

	// Update agent via service
	if err := h.agentService.UpdateAgent(ctx, agent); err != nil {
		if voiceContainsNotFound(err) {
			response.NotFound(w, "Voice agent not found")
			return
		}
		log.Error().Err(err).
			Str("request_id", requestID).
			Str("agent_id", agentID.String()).
			Msg("Failed to update voice agent")
		response.InternalError(w, "Failed to update voice agent", requestID)
		return
	}

	// Convert to DTO
	dto := VoiceAgentDTO{
		ID:          agent.ID.String(),
		Name:        agent.Name,
		Description: agent.Description,
		Icon:        agent.Icon,
		Color:       agent.Color,
		Status:      string(agent.Status),
	}

	log.Info().
		Str("request_id", requestID).
		Str("agent_id", agentID.String()).
		Msg("Updated voice agent")

	response.Success(w, dto)
}

// DeleteAgent handles DELETE /v1/admin/voice-agents/{id}
func (h *VoiceAgentHandler) DeleteAgent(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get user from context - admin middleware already verified role
	_, ok := middleware.GetUserFromContext(ctx)
	if !ok {
		log.Error().Str("request_id", requestID).Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Get agent ID from URL
	agentIDStr := chi.URLParam(r, "id")
	agentID, err := uuid.Parse(agentIDStr)
	if err != nil {
		response.BadRequest(w, "Invalid agent ID format")
		return
	}

	// Delete agent via service
	if err := h.agentService.DeleteAgent(ctx, agentID); err != nil {
		if voiceContainsNotFound(err) {
			response.NotFound(w, "Voice agent not found")
			return
		}
		log.Error().Err(err).
			Str("request_id", requestID).
			Str("agent_id", agentID.String()).
			Msg("Failed to delete voice agent")
		response.InternalError(w, "Failed to delete voice agent", requestID)
		return
	}

	log.Info().
		Str("request_id", requestID).
		Str("agent_id", agentID.String()).
		Msg("Deleted voice agent")

	response.NoContent(w)
}

// =============================================================================
// Style Rule Handlers
// =============================================================================

// CreateStyleRuleRequest represents the request body for creating a style rule
type CreateStyleRuleRequest struct {
	RuleType  string `json:"rule_type"`
	RuleText  string `json:"rule_text"`
	SortOrder int    `json:"sort_order,omitempty"`
}

// CreateStyleRule handles POST /v1/admin/voice-agents/{id}/rules
func (h *VoiceAgentHandler) CreateStyleRule(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get user from context - admin middleware already verified role
	_, ok := middleware.GetUserFromContext(ctx)
	if !ok {
		log.Error().Str("request_id", requestID).Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Get agent ID from URL
	agentIDStr := chi.URLParam(r, "id")
	agentID, err := uuid.Parse(agentIDStr)
	if err != nil {
		response.BadRequest(w, "Invalid agent ID format")
		return
	}

	// Parse request body
	var req CreateStyleRuleRequest
	if err := parseJSON(r, &req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Validate required fields
	if req.RuleType == "" {
		response.BadRequest(w, "Rule type is required")
		return
	}

	if req.RuleText == "" {
		response.BadRequest(w, "Rule text is required")
		return
	}

	// Create domain object
	rule := &voiceDomain.StyleRule{
		AgentID:   agentID,
		RuleType:  voiceDomain.RuleType(req.RuleType),
		RuleText:  req.RuleText,
		SortOrder: req.SortOrder,
	}

	// Create rule via service
	if err := h.ruleService.CreateRule(ctx, rule); err != nil {
		if voiceContainsNotFound(err) {
			response.NotFound(w, "Voice agent not found")
			return
		}
		log.Error().Err(err).
			Str("request_id", requestID).
			Str("agent_id", agentID.String()).
			Msg("Failed to create style rule")
		response.InternalError(w, "Failed to create style rule", requestID)
		return
	}

	// Convert to DTO
	dto := StyleRuleDTO{
		ID:        rule.ID.String(),
		RuleType:  string(rule.RuleType),
		RuleText:  rule.RuleText,
		SortOrder: rule.SortOrder,
	}

	log.Info().
		Str("request_id", requestID).
		Str("rule_id", rule.ID.String()).
		Str("agent_id", agentID.String()).
		Msg("Created style rule")

	response.Created(w, dto)
}

// UpdateStyleRule handles PUT /v1/admin/voice-agents/{id}/rules/{ruleId}
func (h *VoiceAgentHandler) UpdateStyleRule(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get user from context - admin middleware already verified role
	_, ok := middleware.GetUserFromContext(ctx)
	if !ok {
		log.Error().Str("request_id", requestID).Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Get agent ID from URL
	agentIDStr := chi.URLParam(r, "id")
	agentID, err := uuid.Parse(agentIDStr)
	if err != nil {
		response.BadRequest(w, "Invalid agent ID format")
		return
	}

	// Get rule ID from URL
	ruleIDStr := chi.URLParam(r, "ruleId")
	ruleID, err := uuid.Parse(ruleIDStr)
	if err != nil {
		response.BadRequest(w, "Invalid rule ID format")
		return
	}

	// Parse request body
	var req CreateStyleRuleRequest
	if err := parseJSON(r, &req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Validate required fields
	if req.RuleType == "" {
		response.BadRequest(w, "Rule type is required")
		return
	}

	if req.RuleText == "" {
		response.BadRequest(w, "Rule text is required")
		return
	}

	// Create domain object
	rule := &voiceDomain.StyleRule{
		ID:        ruleID,
		AgentID:   agentID,
		RuleType:  voiceDomain.RuleType(req.RuleType),
		RuleText:  req.RuleText,
		SortOrder: req.SortOrder,
	}

	// Update rule via service
	if err := h.ruleService.UpdateRule(ctx, rule); err != nil {
		if voiceContainsNotFound(err) {
			response.NotFound(w, "Style rule not found")
			return
		}
		log.Error().Err(err).
			Str("request_id", requestID).
			Str("rule_id", ruleID.String()).
			Msg("Failed to update style rule")
		response.InternalError(w, "Failed to update style rule", requestID)
		return
	}

	// Convert to DTO
	dto := StyleRuleDTO{
		ID:        rule.ID.String(),
		RuleType:  string(rule.RuleType),
		RuleText:  rule.RuleText,
		SortOrder: rule.SortOrder,
	}

	log.Info().
		Str("request_id", requestID).
		Str("rule_id", ruleID.String()).
		Str("agent_id", agentID.String()).
		Msg("Updated style rule")

	response.Success(w, dto)
}

// DeleteStyleRule handles DELETE /v1/admin/voice-agents/{id}/rules/{ruleId}
func (h *VoiceAgentHandler) DeleteStyleRule(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get user from context - admin middleware already verified role
	_, ok := middleware.GetUserFromContext(ctx)
	if !ok {
		log.Error().Str("request_id", requestID).Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Get rule ID from URL
	ruleIDStr := chi.URLParam(r, "ruleId")
	ruleID, err := uuid.Parse(ruleIDStr)
	if err != nil {
		response.BadRequest(w, "Invalid rule ID format")
		return
	}

	// Delete rule via service
	if err := h.ruleService.DeleteRule(ctx, ruleID); err != nil {
		if voiceContainsNotFound(err) {
			response.NotFound(w, "Style rule not found")
			return
		}
		log.Error().Err(err).
			Str("request_id", requestID).
			Str("rule_id", ruleID.String()).
			Msg("Failed to delete style rule")
		response.InternalError(w, "Failed to delete style rule", requestID)
		return
	}

	log.Info().
		Str("request_id", requestID).
		Str("rule_id", ruleID.String()).
		Msg("Deleted style rule")

	response.NoContent(w)
}

// =============================================================================
// Example Handlers
// =============================================================================

// CreateExampleRequest represents the request body for creating an example
type CreateExampleRequest struct {
	BeforeText string `json:"before_text"`
	AfterText  string `json:"after_text"`
	Context    string `json:"context,omitempty"`
	SortOrder  int    `json:"sort_order,omitempty"`
}

// CreateExample handles POST /v1/admin/voice-agents/{id}/examples
func (h *VoiceAgentHandler) CreateExample(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get user from context - admin middleware already verified role
	_, ok := middleware.GetUserFromContext(ctx)
	if !ok {
		log.Error().Str("request_id", requestID).Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Get agent ID from URL
	agentIDStr := chi.URLParam(r, "id")
	agentID, err := uuid.Parse(agentIDStr)
	if err != nil {
		response.BadRequest(w, "Invalid agent ID format")
		return
	}

	// Parse request body
	var req CreateExampleRequest
	if err := parseJSON(r, &req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Validate required fields
	if req.BeforeText == "" {
		response.BadRequest(w, "Before text is required")
		return
	}

	if req.AfterText == "" {
		response.BadRequest(w, "After text is required")
		return
	}

	// Create domain object
	example := &voiceDomain.Example{
		AgentID:    agentID,
		BeforeText: req.BeforeText,
		AfterText:  req.AfterText,
		Context:    req.Context,
		SortOrder:  req.SortOrder,
	}

	// Create example via service
	if err := h.exampleService.CreateExample(ctx, example); err != nil {
		if voiceContainsNotFound(err) {
			response.NotFound(w, "Voice agent not found")
			return
		}
		log.Error().Err(err).
			Str("request_id", requestID).
			Str("agent_id", agentID.String()).
			Msg("Failed to create example")
		response.InternalError(w, "Failed to create example", requestID)
		return
	}

	// Convert to DTO
	dto := ExampleDTO{
		ID:         example.ID.String(),
		BeforeText: example.BeforeText,
		AfterText:  example.AfterText,
		Context:    example.Context,
		SortOrder:  example.SortOrder,
	}

	log.Info().
		Str("request_id", requestID).
		Str("example_id", example.ID.String()).
		Str("agent_id", agentID.String()).
		Msg("Created example")

	response.Created(w, dto)
}

// UpdateExample handles PUT /v1/admin/voice-agents/{id}/examples/{exampleId}
func (h *VoiceAgentHandler) UpdateExample(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get user from context - admin middleware already verified role
	_, ok := middleware.GetUserFromContext(ctx)
	if !ok {
		log.Error().Str("request_id", requestID).Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Get agent ID from URL
	agentIDStr := chi.URLParam(r, "id")
	agentID, err := uuid.Parse(agentIDStr)
	if err != nil {
		response.BadRequest(w, "Invalid agent ID format")
		return
	}

	// Get example ID from URL
	exampleIDStr := chi.URLParam(r, "exampleId")
	exampleID, err := uuid.Parse(exampleIDStr)
	if err != nil {
		response.BadRequest(w, "Invalid example ID format")
		return
	}

	// Parse request body
	var req CreateExampleRequest
	if err := parseJSON(r, &req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Validate required fields
	if req.BeforeText == "" {
		response.BadRequest(w, "Before text is required")
		return
	}

	if req.AfterText == "" {
		response.BadRequest(w, "After text is required")
		return
	}

	// Create domain object
	example := &voiceDomain.Example{
		ID:         exampleID,
		AgentID:    agentID,
		BeforeText: req.BeforeText,
		AfterText:  req.AfterText,
		Context:    req.Context,
		SortOrder:  req.SortOrder,
	}

	// Update example via service
	if err := h.exampleService.UpdateExample(ctx, example); err != nil {
		if voiceContainsNotFound(err) {
			response.NotFound(w, "Example not found")
			return
		}
		log.Error().Err(err).
			Str("request_id", requestID).
			Str("example_id", exampleID.String()).
			Msg("Failed to update example")
		response.InternalError(w, "Failed to update example", requestID)
		return
	}

	// Convert to DTO
	dto := ExampleDTO{
		ID:         example.ID.String(),
		BeforeText: example.BeforeText,
		AfterText:  example.AfterText,
		Context:    example.Context,
		SortOrder:  example.SortOrder,
	}

	log.Info().
		Str("request_id", requestID).
		Str("example_id", exampleID.String()).
		Str("agent_id", agentID.String()).
		Msg("Updated example")

	response.Success(w, dto)
}

// DeleteExample handles DELETE /v1/admin/voice-agents/{id}/examples/{exampleId}
func (h *VoiceAgentHandler) DeleteExample(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get user from context - admin middleware already verified role
	_, ok := middleware.GetUserFromContext(ctx)
	if !ok {
		log.Error().Str("request_id", requestID).Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Get example ID from URL
	exampleIDStr := chi.URLParam(r, "exampleId")
	exampleID, err := uuid.Parse(exampleIDStr)
	if err != nil {
		response.BadRequest(w, "Invalid example ID format")
		return
	}

	// Delete example via service
	if err := h.exampleService.DeleteExample(ctx, exampleID); err != nil {
		if voiceContainsNotFound(err) {
			response.NotFound(w, "Example not found")
			return
		}
		log.Error().Err(err).
			Str("request_id", requestID).
			Str("example_id", exampleID.String()).
			Msg("Failed to delete example")
		response.InternalError(w, "Failed to delete example", requestID)
		return
	}

	log.Info().
		Str("request_id", requestID).
		Str("example_id", exampleID.String()).
		Msg("Deleted example")

	response.NoContent(w)
}

// =============================================================================
// Helper Functions
// =============================================================================

// parseJSON decodes JSON from request body
func parseJSON(r *http.Request, v interface{}) error {
	return json.NewDecoder(r.Body).Decode(v)
}

// Note: contains() helper function is defined in approval_handler.go
