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

// TransformHandler handles text transformation HTTP requests
type TransformHandler struct {
	transformService voice.TransformService
}

// NewTransformHandler creates a new transform handler
func NewTransformHandler(transformService voice.TransformService) *TransformHandler {
	if transformService == nil {
		panic("transformService cannot be nil")
	}

	return &TransformHandler{
		transformService: transformService,
	}
}

// TransformRequestDTO represents the API request for text transformation
type TransformRequestDTO struct {
	AgentID    string  `json:"agent_id"`
	Text       string  `json:"text"`
	NumOptions int     `json:"num_options,omitempty"`
	FieldPath  string  `json:"field_path,omitempty"`
	EntityType string  `json:"entity_type,omitempty"`
	EntityID   *string `json:"entity_id,omitempty"`
}

// TransformResponseDTO represents the API response for text transformation
type TransformResponseDTO struct {
	RequestID string               `json:"request_id"`
	AgentID   string               `json:"agent_id"`
	AgentName string               `json:"agent_name"`
	Options   []TransformOptionDTO `json:"options"`
	LatencyMs int                  `json:"latency_ms"`
}

// TransformOptionDTO represents a transformation option in the API response
type TransformOptionDTO struct {
	Index       int     `json:"index"`
	Label       string  `json:"label"`
	DisplayName string  `json:"display_name"`
	Text        string  `json:"text"`
	Temperature float64 `json:"temperature"`
	TokensUsed  int     `json:"tokens_used"`
}

// SelectTransformRequestDTO represents the API request for selecting a transformation
type SelectTransformRequestDTO struct {
	RequestID           string  `json:"request_id"`
	TransformationIndex int     `json:"transformation_index"`
	FieldPath           string  `json:"field_path,omitempty"`
	EntityType          string  `json:"entity_type,omitempty"`
	EntityID            *string `json:"entity_id,omitempty"`
}

// SelectTransformResponseDTO represents the API response for transformation selection
type SelectTransformResponseDTO struct {
	TransformationID string `json:"transformation_id"`
	Text             string `json:"text"`
}

// Transform handles POST /v1/voice-agents/{id}/transform
// Generates multiple transformation options for the given text
func (h *TransformHandler) Transform(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get user from context
	user, err := middleware.GetDomainUserFromContext(ctx)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Parse agent ID from URL path (route: /voice-agents/{id}/transform)
	agentIDStr := chi.URLParam(r, "id")
	if agentIDStr == "" {
		response.BadRequest(w, "Agent ID is required in URL path")
		return
	}
	agentID, err := uuid.Parse(agentIDStr)
	if err != nil {
		response.BadRequest(w, "Invalid agent_id format")
		return
	}

	// Decode request body
	var req TransformRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to decode request body")
		response.BadRequest(w, "Invalid JSON in request body")
		return
	}

	// Validate text
	if req.Text == "" {
		response.BadRequest(w, "text is required")
		return
	}

	if len(req.Text) < voiceDomain.MinInputLength {
		response.BadRequest(w, "text must be at least 10 characters")
		return
	}

	if len(req.Text) > voiceDomain.MaxInputLength {
		response.BadRequest(w, "text must not exceed 10000 characters")
		return
	}

	// Parse optional entity ID
	var entityID *uuid.UUID
	if req.EntityID != nil && *req.EntityID != "" {
		id, err := uuid.Parse(*req.EntityID)
		if err != nil {
			response.BadRequest(w, "Invalid entity_id format")
			return
		}
		entityID = &id
	}

	// Build domain request
	domainReq := &voiceDomain.TransformRequest{
		AgentID:    agentID,
		Text:       req.Text,
		NumOptions: req.NumOptions,
		FieldPath:  req.FieldPath,
		EntityType: req.EntityType,
		EntityID:   entityID,
	}

	// Call service
	resp, err := h.transformService.Transform(ctx, domainReq, user.ID)
	if err != nil {
		// Check for specific errors
		if transformContainsNotFound(err) {
			response.NotFound(w, "Voice agent not found")
			return
		}
		if containsValidation(err) {
			response.BadRequest(w, err.Error())
			return
		}
		log.Error().Err(err).
			Str("request_id", requestID).
			Str("agent_id", agentID.String()).
			Msg("Failed to transform text")
		response.InternalError(w, "Failed to transform text", requestID)
		return
	}

	// Convert to DTO
	options := make([]TransformOptionDTO, 0, len(resp.Options))
	for _, opt := range resp.Options {
		options = append(options, TransformOptionDTO{
			Index:       opt.Index,
			Label:       string(opt.Label),
			DisplayName: opt.Label.DisplayLabel(),
			Text:        opt.Text,
			Temperature: opt.Temperature,
			TokensUsed:  opt.TokensUsed,
		})
	}

	dto := TransformResponseDTO{
		RequestID: resp.RequestID.String(),
		AgentID:   resp.AgentID.String(),
		AgentName: resp.AgentName,
		Options:   options,
		LatencyMs: resp.LatencyMs,
	}

	log.Info().
		Str("request_id", requestID).
		Str("transform_request_id", resp.RequestID.String()).
		Str("user_id", user.ID.String()).
		Str("agent_id", agentID.String()).
		Int("options_count", len(options)).
		Msg("Text transformation completed")

	response.Success(w, dto)
}

// SelectTransformation handles POST /v1/transformations/select
// Records the user's selection of a transformation option
func (h *TransformHandler) SelectTransformation(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get user from context
	user, err := middleware.GetDomainUserFromContext(ctx)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Decode request body
	var req SelectTransformRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to decode request body")
		response.BadRequest(w, "Invalid JSON in request body")
		return
	}

	// Parse request ID
	transformReqID, err := uuid.Parse(req.RequestID)
	if err != nil {
		response.BadRequest(w, "Invalid request_id format")
		return
	}

	// Validate transformation index
	if req.TransformationIndex < 0 || req.TransformationIndex > 4 {
		response.BadRequest(w, "transformation_index must be between 0 and 4")
		return
	}

	// Parse optional entity ID
	var entityID *uuid.UUID
	if req.EntityID != nil && *req.EntityID != "" {
		id, err := uuid.Parse(*req.EntityID)
		if err != nil {
			response.BadRequest(w, "Invalid entity_id format")
			return
		}
		entityID = &id
	}

	// Build domain request
	domainReq := &voiceDomain.SelectTransformRequest{
		RequestID:           transformReqID,
		TransformationIndex: req.TransformationIndex,
		FieldPath:           req.FieldPath,
		EntityType:          req.EntityType,
		EntityID:            entityID,
	}

	// Call service
	resp, err := h.transformService.SelectTransformation(ctx, domainReq, user.ID)
	if err != nil {
		if transformContainsNotFound(err) || containsExpired(err) {
			response.NotFound(w, "Transformation request not found or expired")
			return
		}
		if containsUnauthorized(err) {
			response.Forbidden(w, "Unauthorized to select this transformation")
			return
		}
		if containsValidation(err) {
			response.BadRequest(w, err.Error())
			return
		}
		log.Error().Err(err).
			Str("request_id", requestID).
			Str("transform_request_id", transformReqID.String()).
			Msg("Failed to select transformation")
		response.InternalError(w, "Failed to select transformation", requestID)
		return
	}

	dto := SelectTransformResponseDTO{
		TransformationID: resp.TransformationID.String(),
		Text:             resp.Text,
	}

	log.Info().
		Str("request_id", requestID).
		Str("transformation_id", resp.TransformationID.String()).
		Str("user_id", user.ID.String()).
		Int("selected_index", req.TransformationIndex).
		Msg("Transformation selection recorded")

	response.Success(w, dto)
}

// Helper functions for error checking
func transformContainsNotFound(err error) bool {
	if err == nil {
		return false
	}
	return contains(err.Error(), "not found")
}

func containsValidation(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return contains(msg, "invalid") || contains(msg, "required") ||
		contains(msg, "must be") || contains(msg, "validation failed")
}

func containsExpired(err error) bool {
	if err == nil {
		return false
	}
	return contains(err.Error(), "expired")
}

func containsUnauthorized(err error) bool {
	if err == nil {
		return false
	}
	return contains(err.Error(), "unauthorized")
}
