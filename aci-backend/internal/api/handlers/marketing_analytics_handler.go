package handlers

import (
	"fmt"
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

// MarketingAnalyticsHandler handles marketing campaign analytics HTTP requests
type MarketingAnalyticsHandler struct {
	analyticsService *service.MarketingAnalyticsService
}

// NewMarketingAnalyticsHandler creates a new marketing analytics handler
func NewMarketingAnalyticsHandler(analyticsService *service.MarketingAnalyticsService) *MarketingAnalyticsHandler {
	if analyticsService == nil {
		panic("analyticsService cannot be nil")
	}

	return &MarketingAnalyticsHandler{
		analyticsService: analyticsService,
	}
}

// GetCampaignAnalytics handles GET /v1/marketing/analytics/campaigns/:id
func (h *MarketingAnalyticsHandler) GetCampaignAnalytics(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Parse campaign ID
	campaignIDStr := chi.URLParam(r, "id")
	if campaignIDStr == "" {
		response.BadRequest(w, "Campaign ID is required")
		return
	}

	campaignID, err := uuid.Parse(campaignIDStr)
	if err != nil {
		response.BadRequest(w, "Invalid campaign ID format")
		return
	}

	log.Info().
		Str("request_id", requestID).
		Str("campaign_id", campaignID.String()).
		Msg("Fetching campaign analytics")

	// Get campaign analytics
	analytics, err := h.analyticsService.GetCampaignAnalytics(ctx, campaignID)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("campaign_id", campaignID.String()).
			Msg("Failed to fetch campaign analytics")
		response.InternalError(w, "Failed to fetch campaign analytics", requestID)
		return
	}

	log.Info().
		Str("request_id", requestID).
		Str("campaign_id", campaignID.String()).
		Int("total_content", analytics.TotalContent).
		Float64("avg_brand_score", analytics.AvgBrandScore).
		Msg("Successfully fetched campaign analytics")

	response.Success(w, analytics)
}

// GetChannelPerformance handles GET /v1/marketing/analytics/channels
func (h *MarketingAnalyticsHandler) GetChannelPerformance(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)
	tenantID, err := getTenantID(ctx)
	if err != nil {
		response.Unauthorized(w, "Tenant ID not found in context")
		return
	}

	log.Info().
		Str("request_id", requestID).
		Str("tenant_id", tenantID.String()).
		Msg("Fetching channel performance")

	// Get channel performance
	performances, err := h.analyticsService.GetChannelPerformance(ctx, tenantID)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("tenant_id", tenantID.String()).
			Msg("Failed to fetch channel performance")
		response.InternalError(w, "Failed to fetch channel performance", requestID)
		return
	}

	log.Info().
		Str("request_id", requestID).
		Str("tenant_id", tenantID.String()).
		Int("channel_count", len(performances)).
		Msg("Successfully fetched channel performance")

	response.Success(w, map[string]interface{}{
		"channels": performances,
	})
}

// GetContentPerformance handles GET /v1/marketing/analytics/content
func (h *MarketingAnalyticsHandler) GetContentPerformance(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)
	tenantID, err := getTenantID(ctx)
	if err != nil {
		response.Unauthorized(w, "Tenant ID not found in context")
		return
	}

	// Parse query parameters
	filters := service.ContentFilter{
		Limit: 100,
	}

	// Parse channel filter
	if channelStr := r.URL.Query().Get("channel"); channelStr != "" {
		channel := domain.Channel(channelStr)
		filters.Channel = &channel
	}

	// Parse content style filter
	if styleStr := r.URL.Query().Get("content_style"); styleStr != "" {
		style := domain.ContentStyle(styleStr)
		filters.ContentStyle = &style
	}

	// Parse date range
	if startDateStr := r.URL.Query().Get("start_date"); startDateStr != "" {
		startDate, parseErr := time.Parse("2006-01-02", startDateStr)
		if parseErr != nil {
			response.BadRequest(w, "Invalid start_date format: must be YYYY-MM-DD")
			return
		}
		filters.StartDate = &startDate
	}

	if endDateStr := r.URL.Query().Get("end_date"); endDateStr != "" {
		endDate, parseErr := time.Parse("2006-01-02", endDateStr)
		if parseErr != nil {
			response.BadRequest(w, "Invalid end_date format: must be YYYY-MM-DD")
			return
		}
		filters.EndDate = &endDate
	}

	// Parse min brand score
	if minScoreStr := r.URL.Query().Get("min_brand_score"); minScoreStr != "" {
		minScore, parseErr := strconv.Atoi(minScoreStr)
		if parseErr != nil {
			response.BadRequest(w, "Invalid min_brand_score: must be an integer")
			return
		}
		filters.MinBrandScore = &minScore
	}

	// Parse limit
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		limit, parseErr := strconv.Atoi(limitStr)
		if parseErr != nil {
			response.BadRequest(w, "Invalid limit: must be an integer")
			return
		}
		if limit < 1 || limit > 1000 {
			response.BadRequest(w, "Limit must be between 1 and 1000")
			return
		}
		filters.Limit = limit
	}

	log.Info().
		Str("request_id", requestID).
		Str("tenant_id", tenantID.String()).
		Int("limit", filters.Limit).
		Msg("Fetching content performance")

	// Get content performance
	performances, err := h.analyticsService.GetContentPerformance(ctx, tenantID, filters)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("tenant_id", tenantID.String()).
			Msg("Failed to fetch content performance")
		response.InternalError(w, "Failed to fetch content performance", requestID)
		return
	}

	log.Info().
		Str("request_id", requestID).
		Str("tenant_id", tenantID.String()).
		Int("content_count", len(performances)).
		Msg("Successfully fetched content performance")

	response.Success(w, map[string]interface{}{
		"content": performances,
		"filters": filters,
	})
}

// GetEngagementTrends handles GET /v1/marketing/analytics/trends
func (h *MarketingAnalyticsHandler) GetEngagementTrends(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)
	tenantID, err := getTenantID(ctx)
	if err != nil {
		response.Unauthorized(w, "Tenant ID not found in context")
		return
	}

	// Parse date range
	timeRange, err := h.parseDateRange(r)
	if err != nil {
		log.Warn().
			Err(err).
			Str("request_id", requestID).
			Msg("Invalid date range parameters")
		response.BadRequest(w, fmt.Sprintf("Invalid date range: %v", err))
		return
	}

	log.Info().
		Str("request_id", requestID).
		Str("tenant_id", tenantID.String()).
		Time("start_date", timeRange.Start).
		Time("end_date", timeRange.End).
		Msg("Fetching engagement trends")

	// Get engagement trends
	trends, err := h.analyticsService.GetEngagementTrends(ctx, tenantID, timeRange.Start, timeRange.End)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("tenant_id", tenantID.String()).
			Msg("Failed to fetch engagement trends")
		response.InternalError(w, "Failed to fetch engagement trends", requestID)
		return
	}

	log.Info().
		Str("request_id", requestID).
		Str("tenant_id", tenantID.String()).
		Int("trend_points", len(trends)).
		Msg("Successfully fetched engagement trends")

	response.Success(w, map[string]interface{}{
		"trends": trends,
		"date_range": map[string]interface{}{
			"start_date": timeRange.Start,
			"end_date":   timeRange.End,
		},
	})
}

// GetAudienceGrowth handles GET /v1/marketing/analytics/audience
func (h *MarketingAnalyticsHandler) GetAudienceGrowth(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)
	tenantID, err := getTenantID(ctx)
	if err != nil {
		response.Unauthorized(w, "Tenant ID not found in context")
		return
	}

	log.Info().
		Str("request_id", requestID).
		Str("tenant_id", tenantID.String()).
		Msg("Fetching audience growth")

	// Get audience growth
	growth, err := h.analyticsService.GetAudienceGrowth(ctx, tenantID)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("tenant_id", tenantID.String()).
			Msg("Failed to fetch audience growth")
		response.InternalError(w, "Failed to fetch audience growth", requestID)
		return
	}

	log.Info().
		Str("request_id", requestID).
		Str("tenant_id", tenantID.String()).
		Int("data_points", len(growth)).
		Msg("Successfully fetched audience growth")

	response.Success(w, map[string]interface{}{
		"growth": growth,
	})
}

// Helper methods

// parseDateRange parses start_date and end_date query parameters
// Returns default range of last 30 days if not provided
func (h *MarketingAnalyticsHandler) parseDateRange(r *http.Request) (service.DateRange, error) {
	// Default: last 30 days
	endDate := time.Now()
	startDate := endDate.AddDate(0, 0, -30)

	// Parse start_date
	startDateStr := r.URL.Query().Get("start_date")
	if startDateStr != "" {
		parsedStart, parseErr := time.Parse(time.RFC3339, startDateStr)
		if parseErr != nil {
			// Try date-only format
			parsedStart, parseErr = time.Parse("2006-01-02", startDateStr)
		}
		if parseErr != nil {
			return service.DateRange{}, fmt.Errorf("invalid start_date format: must be RFC3339 or YYYY-MM-DD")
		}
		startDate = parsedStart
	}

	// Parse end_date
	endDateStr := r.URL.Query().Get("end_date")
	if endDateStr != "" {
		parsedEnd, parseErr := time.Parse(time.RFC3339, endDateStr)
		if parseErr != nil {
			// Try date-only format
			parsedEnd, parseErr = time.Parse("2006-01-02", endDateStr)
		}
		if parseErr != nil {
			return service.DateRange{}, fmt.Errorf("invalid end_date format: must be RFC3339 or YYYY-MM-DD")
		}
		endDate = parsedEnd
	}

	// Validate range
	if startDate.After(endDate) {
		return service.DateRange{}, fmt.Errorf("start_date must be before end_date")
	}

	dateRange := service.DateRange{
		Start: startDate,
		End:   endDate,
	}

	if err := dateRange.Validate(); err != nil {
		return service.DateRange{}, fmt.Errorf("invalid date range: %w", err)
	}

	return dateRange, nil
}

