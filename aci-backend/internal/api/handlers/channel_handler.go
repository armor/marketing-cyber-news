package handlers

import (
	"context"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/phillipboles/aci-backend/internal/api/middleware"
	"github.com/phillipboles/aci-backend/internal/api/response"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/service"
	"github.com/rs/zerolog"
)

// ChannelHandler handles channel connection HTTP requests
type ChannelHandler struct {
	channelService *service.ChannelService
	logger         zerolog.Logger
}

// NewChannelHandler creates a new channel handler
func NewChannelHandler(channelService *service.ChannelService, logger zerolog.Logger) *ChannelHandler {
	if channelService == nil {
		panic("channelService cannot be nil")
	}

	return &ChannelHandler{
		channelService: channelService,
		logger:         logger,
	}
}

// ListChannels handles GET /api/v1/channels
// Returns all channels with their connection status for the authenticated tenant
func (h *ChannelHandler) ListChannels(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	user, err := middleware.GetDomainUserFromContext(ctx)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	channels, err := h.channelService.GetSupportedChannels(ctx, user.ID)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Str("user_id", user.ID.String()).
			Msg("Failed to get supported channels")
		response.InternalError(w, "Failed to retrieve channels", requestID)
		return
	}

	response.Success(w, map[string]interface{}{
		"channels": channels,
	})
}

// GetConnection handles GET /api/v1/channels/:channel
// Returns specific channel connection details
func (h *ChannelHandler) GetConnection(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	user, err := middleware.GetDomainUserFromContext(ctx)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	channelParam := chi.URLParam(r, "channel")
	if channelParam == "" {
		response.BadRequestWithDetails(w, "Channel is required", "missing channel parameter", requestID)
		return
	}

	channel := domain.Channel(channelParam)
	if !channel.IsValid() {
		response.BadRequestWithDetails(w, "Invalid channel", fmt.Sprintf("channel '%s' is not valid", channelParam), requestID)
		return
	}

	connection, err := h.channelService.GetConnection(ctx, user.ID, channel)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Str("user_id", user.ID.String()).
			Str("channel", string(channel)).
			Msg("Failed to get channel connection")
		response.ErrorWithDetails(w, http.StatusNotFound, "NOT_FOUND", "Connection not found", err.Error(), requestID)
		return
	}

	response.Success(w, map[string]interface{}{
		"connection": connection,
	})
}

// InitiateOAuth handles GET /api/v1/channels/:channel/oauth
// Returns OAuth authorization URL to redirect user to
func (h *ChannelHandler) InitiateOAuth(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	user, err := middleware.GetDomainUserFromContext(ctx)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	channelParam := chi.URLParam(r, "channel")
	if channelParam == "" {
		response.BadRequestWithDetails(w, "Channel is required", "missing channel parameter", requestID)
		return
	}

	channel := domain.Channel(channelParam)
	if !channel.IsValid() {
		response.BadRequestWithDetails(w, "Invalid channel", fmt.Sprintf("channel '%s' is not valid", channelParam), requestID)
		return
	}

	authURL, err := h.channelService.InitiateOAuth(ctx, user.ID, channel)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Str("user_id", user.ID.String()).
			Str("channel", string(channel)).
			Msg("Failed to initiate OAuth")
		response.InternalError(w, "Failed to initiate OAuth", requestID)
		return
	}

	h.logger.Info().
		Str("request_id", requestID).
		Str("user_id", user.ID.String()).
		Str("channel", string(channel)).
		Msg("OAuth flow initiated")

	response.Success(w, map[string]interface{}{
		"auth_url": authURL,
		"channel":  channel,
	})
}

// OAuthCallback handles GET /api/v1/channels/:channel/oauth/callback
// Processes OAuth callback and completes connection
func (h *ChannelHandler) OAuthCallback(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	channelParam := chi.URLParam(r, "channel")
	if channelParam == "" {
		response.BadRequestWithDetails(w, "Channel is required", "missing channel parameter", requestID)
		return
	}

	channel := domain.Channel(channelParam)
	if !channel.IsValid() {
		response.BadRequestWithDetails(w, "Invalid channel", fmt.Sprintf("channel '%s' is not valid", channelParam), requestID)
		return
	}

	// Get OAuth code and state from query parameters
	code := r.URL.Query().Get("code")
	if code == "" {
		errorMsg := r.URL.Query().Get("error")
		errorDesc := r.URL.Query().Get("error_description")

		h.logger.Error().
			Str("request_id", requestID).
			Str("channel", string(channel)).
			Str("error", errorMsg).
			Str("error_description", errorDesc).
			Msg("OAuth callback error")

		response.BadRequestWithDetails(w, "OAuth authorization failed", errorMsg+": "+errorDesc, requestID)
		return
	}

	state := r.URL.Query().Get("state")
	if state == "" {
		response.BadRequestWithDetails(w, "State is required", "missing state parameter", requestID)
		return
	}

	connection, err := h.channelService.CompleteOAuth(ctx, channel, code, state)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Str("channel", string(channel)).
			Msg("Failed to complete OAuth")
		response.InternalError(w, "Failed to complete OAuth", requestID)
		return
	}

	h.logger.Info().
		Str("request_id", requestID).
		Str("connection_id", connection.ID.String()).
		Str("tenant_id", connection.TenantID.String()).
		Str("channel", string(channel)).
		Str("account_name", connection.AccountName).
		Msg("Channel connection established")

	response.Created(w, map[string]interface{}{
		"connection": connection,
		"message":    fmt.Sprintf("Successfully connected to %s", channel),
	})
}

// DisconnectChannel handles DELETE /api/v1/channels/:channel
// Removes a channel connection
func (h *ChannelHandler) DisconnectChannel(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	user, err := middleware.GetDomainUserFromContext(ctx)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	channelParam := chi.URLParam(r, "channel")
	if channelParam == "" {
		response.BadRequestWithDetails(w, "Channel is required", "missing channel parameter", requestID)
		return
	}

	channel := domain.Channel(channelParam)
	if !channel.IsValid() {
		response.BadRequestWithDetails(w, "Invalid channel", fmt.Sprintf("channel '%s' is not valid", channelParam), requestID)
		return
	}

	if err := h.channelService.DisconnectChannel(ctx, user.ID, channel); err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Str("user_id", user.ID.String()).
			Str("channel", string(channel)).
			Msg("Failed to disconnect channel")
		response.InternalError(w, "Failed to disconnect channel", requestID)
		return
	}

	h.logger.Info().
		Str("request_id", requestID).
		Str("user_id", user.ID.String()).
		Str("channel", string(channel)).
		Msg("Channel disconnected")

	response.NoContent(w)
}

// TestConnection handles POST /api/v1/channels/:channel/test
// Tests if a channel connection is still valid
func (h *ChannelHandler) TestConnection(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	user, err := middleware.GetDomainUserFromContext(ctx)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	channelParam := chi.URLParam(r, "channel")
	if channelParam == "" {
		response.BadRequestWithDetails(w, "Channel is required", "missing channel parameter", requestID)
		return
	}

	channel := domain.Channel(channelParam)
	if !channel.IsValid() {
		response.BadRequestWithDetails(w, "Invalid channel", fmt.Sprintf("channel '%s' is not valid", channelParam), requestID)
		return
	}

	isValid, err := h.channelService.TestConnection(ctx, user.ID, channel)
	if err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Str("user_id", user.ID.String()).
			Str("channel", string(channel)).
			Msg("Failed to test channel connection")
		response.InternalError(w, "Failed to test connection", requestID)
		return
	}

	h.logger.Info().
		Str("request_id", requestID).
		Str("user_id", user.ID.String()).
		Str("channel", string(channel)).
		Bool("is_valid", isValid).
		Msg("Channel connection tested")

	status := "connected"
	message := "Connection is valid"
	if !isValid {
		status = "disconnected"
		message = "Connection is invalid or expired"
	}

	response.Success(w, map[string]interface{}{
		"channel": channel,
		"status":  status,
		"valid":   isValid,
		"message": message,
	})
}

// RefreshExpiringTokens is a background job handler (not exposed via HTTP)
// Should be called periodically by a scheduler/cron job
func (h *ChannelHandler) RefreshExpiringTokens(ctx context.Context) error {
	requestID := uuid.New().String()

	h.logger.Info().
		Str("request_id", requestID).
		Msg("Starting token refresh job")

	if err := h.channelService.RefreshExpiringTokens(ctx); err != nil {
		h.logger.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Token refresh job failed")
		return fmt.Errorf("failed to refresh expiring tokens: %w", err)
	}

	h.logger.Info().
		Str("request_id", requestID).
		Msg("Token refresh job completed successfully")

	return nil
}

