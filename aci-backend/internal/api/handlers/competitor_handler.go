package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/phillipboles/aci-backend/internal/api/response"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/service"
)

// CompetitorHandler handles competitor monitoring endpoints
type CompetitorHandler struct {
	competitorService *service.CompetitorService
}

// NewCompetitorHandler creates a new competitor handler
func NewCompetitorHandler(competitorService *service.CompetitorService) *CompetitorHandler {
	if competitorService == nil {
		panic("competitorService cannot be nil")
	}

	return &CompetitorHandler{
		competitorService: competitorService,
	}
}

// AddCompetitorRequest represents the request body for adding a competitor
type AddCompetitorRequest struct {
	Name          string  `json:"name"`
	LinkedInURL   *string `json:"linkedin_url,omitempty"`
	TwitterHandle *string `json:"twitter_handle,omitempty"`
	BlogURL       *string `json:"blog_url,omitempty"`
	WebsiteURL    *string `json:"website_url,omitempty"`
}

// AddCompetitor handles POST /api/v1/campaigns/:id/competitors
func (h *CompetitorHandler) AddCompetitor(w http.ResponseWriter, r *http.Request) {
	campaignIDStr := chi.URLParam(r, "id")
	if campaignIDStr == "" {
		response.BadRequest(w, "campaign_id is required")
		return
	}

	campaignID, err := uuid.Parse(campaignIDStr)
	if err != nil {
		response.BadRequest(w, "invalid campaign_id format")
		return
	}

	var req AddCompetitorRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	if req.Name == "" {
		response.BadRequest(w, "name is required")
		return
	}

	// Convert to service request
	serviceReq := service.AddCompetitorRequest{
		CampaignID:    campaignID,
		Name:          req.Name,
		LinkedInURL:   req.LinkedInURL,
		TwitterHandle: req.TwitterHandle,
		BlogURL:       req.BlogURL,
		WebsiteURL:    req.WebsiteURL,
	}

	competitor, err := h.competitorService.AddCompetitor(r.Context(), serviceReq)
	if err != nil {
		log.Error().Err(err).Msg("Failed to add competitor")
		response.InternalError(w, "failed to add competitor", "")
		return
	}

	response.Created(w, competitor)
}

// RemoveCompetitor handles DELETE /api/v1/campaigns/:id/competitors/:competitorId
func (h *CompetitorHandler) RemoveCompetitor(w http.ResponseWriter, r *http.Request) {
	competitorIDStr := chi.URLParam(r, "competitorId")
	if competitorIDStr == "" {
		response.BadRequest(w, "competitor_id is required")
		return
	}

	competitorID, err := uuid.Parse(competitorIDStr)
	if err != nil {
		response.BadRequest(w, "invalid competitor_id format")
		return
	}

	if err := h.competitorService.RemoveCompetitor(r.Context(), competitorID); err != nil {
		log.Error().Err(err).Msg("Failed to remove competitor")
		response.InternalError(w, "failed to remove competitor", "")
		return
	}

	response.Success(w, map[string]string{"message": "competitor removed"})
}

// GetCompetitors handles GET /api/v1/campaigns/:id/competitors
func (h *CompetitorHandler) GetCompetitors(w http.ResponseWriter, r *http.Request) {
	campaignIDStr := chi.URLParam(r, "id")
	if campaignIDStr == "" {
		response.BadRequest(w, "campaign_id is required")
		return
	}

	campaignID, err := uuid.Parse(campaignIDStr)
	if err != nil {
		response.BadRequest(w, "invalid campaign_id format")
		return
	}

	competitors, err := h.competitorService.GetCompetitors(r.Context(), campaignID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get competitors")
		response.InternalError(w, "failed to get competitors", "")
		return
	}

	response.Success(w, map[string]interface{}{
		"data":  competitors,
		"total": len(competitors),
	})
}

// GetCompetitorContent handles GET /api/v1/campaigns/:id/competitors/:competitorId/content
func (h *CompetitorHandler) GetCompetitorContent(w http.ResponseWriter, r *http.Request) {
	competitorIDStr := chi.URLParam(r, "competitorId")
	if competitorIDStr == "" {
		response.BadRequest(w, "competitor_id is required")
		return
	}

	competitorID, err := uuid.Parse(competitorIDStr)
	if err != nil {
		response.BadRequest(w, "invalid competitor_id format")
		return
	}

	// Parse optional filters
	filter := service.CompetitorContentFilter{
		Limit: 50,
	}

	if channel := r.URL.Query().Get("channel"); channel != "" {
		filter.Channel = &channel
	}

	if afterStr := r.URL.Query().Get("after"); afterStr != "" {
		if after, err := time.Parse(time.RFC3339, afterStr); err == nil {
			filter.After = &after
		}
	}

	if beforeStr := r.URL.Query().Get("before"); beforeStr != "" {
		if before, err := time.Parse(time.RFC3339, beforeStr); err == nil {
			filter.Before = &before
		}
	}

	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 {
			filter.Limit = limit
		}
	}

	content, err := h.competitorService.GetCompetitorContent(r.Context(), competitorID, filter)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get competitor content")
		response.InternalError(w, "failed to get competitor content", "")
		return
	}

	response.Success(w, map[string]interface{}{
		"data":  content,
		"total": len(content),
	})
}

// GetCompetitorAnalysis handles GET /api/v1/campaigns/:id/competitors/:competitorId/analysis
func (h *CompetitorHandler) GetCompetitorAnalysis(w http.ResponseWriter, r *http.Request) {
	competitorIDStr := chi.URLParam(r, "competitorId")
	if competitorIDStr == "" {
		response.BadRequest(w, "competitor_id is required")
		return
	}

	competitorID, err := uuid.Parse(competitorIDStr)
	if err != nil {
		response.BadRequest(w, "invalid competitor_id format")
		return
	}

	// Parse optional period_days parameter
	periodDays := 30
	if periodStr := r.URL.Query().Get("period_days"); periodStr != "" {
		if period, err := strconv.Atoi(periodStr); err == nil && period > 0 {
			periodDays = period
		}
	}

	analysis, err := h.competitorService.GetCompetitorAnalysis(r.Context(), competitorID, periodDays)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get competitor analysis")
		response.InternalError(w, "failed to get competitor analysis", "")
		return
	}

	response.Success(w, analysis)
}

// FetchCompetitorContentRequest represents the request body for fetching competitor content
type FetchCompetitorContentRequest struct {
	Force bool `json:"force"`
}

// FetchCompetitorContent handles POST /api/v1/campaigns/:id/competitors/:competitorId/fetch
func (h *CompetitorHandler) FetchCompetitorContent(w http.ResponseWriter, r *http.Request) {
	competitorIDStr := chi.URLParam(r, "competitorId")
	if competitorIDStr == "" {
		response.BadRequest(w, "competitor_id is required")
		return
	}

	competitorID, err := uuid.Parse(competitorIDStr)
	if err != nil {
		response.BadRequest(w, "invalid competitor_id format")
		return
	}

	var req FetchCompetitorContentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// Default to non-forced fetch if request body is invalid
		req.Force = false
	}

	serviceReq := service.FetchCompetitorContentRequest{
		CompetitorID: competitorID,
		Force:        req.Force,
	}

	if err := h.competitorService.FetchCompetitorContent(r.Context(), serviceReq); err != nil {
		log.Error().Err(err).Msg("Failed to fetch competitor content")
		response.InternalError(w, "failed to fetch competitor content", "")
		return
	}

	response.JSON(w, http.StatusAccepted, map[string]string{"message": "fetch triggered"})
}

// GetAlerts handles GET /api/v1/campaigns/:id/alerts
func (h *CompetitorHandler) GetAlerts(w http.ResponseWriter, r *http.Request) {
	campaignIDStr := chi.URLParam(r, "id")
	if campaignIDStr == "" {
		response.BadRequest(w, "campaign_id is required")
		return
	}

	campaignID, err := uuid.Parse(campaignIDStr)
	if err != nil {
		response.BadRequest(w, "invalid campaign_id format")
		return
	}

	// Parse unread_only filter
	unreadOnly := r.URL.Query().Get("unread_only") == "true"

	alerts, err := h.competitorService.GetAlerts(r.Context(), campaignID, unreadOnly)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get alerts")
		response.InternalError(w, "failed to get alerts", "")
		return
	}

	response.Success(w, map[string]interface{}{
		"data":  alerts,
		"total": len(alerts),
	})
}

// MarkAlertRead handles POST /api/v1/campaigns/:id/alerts/:alertId/read
func (h *CompetitorHandler) MarkAlertRead(w http.ResponseWriter, r *http.Request) {
	alertIDStr := chi.URLParam(r, "alertId")
	if alertIDStr == "" {
		response.BadRequest(w, "alert_id is required")
		return
	}

	alertID, err := uuid.Parse(alertIDStr)
	if err != nil {
		response.BadRequest(w, "invalid alert_id format")
		return
	}

	if err := h.competitorService.MarkAlertRead(r.Context(), alertID); err != nil {
		log.Error().Err(err).Msg("Failed to mark alert as read")
		response.InternalError(w, "failed to mark alert as read", "")
		return
	}

	response.Success(w, map[string]string{"message": "alert marked as read"})
}

// MarkAllAlertsRead handles POST /api/v1/campaigns/:id/alerts/read-all
func (h *CompetitorHandler) MarkAllAlertsRead(w http.ResponseWriter, r *http.Request) {
	campaignIDStr := chi.URLParam(r, "id")
	if campaignIDStr == "" {
		response.BadRequest(w, "campaign_id is required")
		return
	}

	campaignID, err := uuid.Parse(campaignIDStr)
	if err != nil {
		response.BadRequest(w, "invalid campaign_id format")
		return
	}

	if err := h.competitorService.MarkAllAlertsRead(r.Context(), campaignID); err != nil {
		log.Error().Err(err).Msg("Failed to mark all alerts as read")
		response.InternalError(w, "failed to mark all alerts as read", "")
		return
	}

	response.Success(w, map[string]string{"message": "all alerts marked as read"})
}

// SaveCompetitorContentWebhook handles POST /api/v1/webhooks/competitor-content
// This endpoint is called by n8n workflows to save scraped competitor content
func (h *CompetitorHandler) SaveCompetitorContentWebhook(w http.ResponseWriter, r *http.Request) {
	var content domain.CompetitorContent
	if err := json.NewDecoder(r.Body).Decode(&content); err != nil {
		response.BadRequest(w, "invalid request body")
		return
	}

	if err := h.competitorService.SaveCompetitorContent(r.Context(), &content); err != nil {
		log.Error().Err(err).Msg("Failed to save competitor content from webhook")
		response.InternalError(w, "failed to save competitor content", "")
		return
	}

	response.Created(w, map[string]string{"message": "content saved"})
}
