package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/phillipboles/aci-backend/internal/api/response"
	"github.com/phillipboles/aci-backend/internal/service"
)

const (
	// DefaultDateRangeDays is the default number of days for analytics queries
	DefaultDateRangeDays = 30

	// DefaultTopPerformersLimit is the default number of top performers to return
	DefaultTopPerformersLimit = 10

	// MaxTopPerformersLimit is the maximum number of top performers that can be requested
	MaxTopPerformersLimit = 100

	// DefaultGranularity is the default granularity for trend data
	DefaultGranularity = "daily"
)

// AnalyticsHandler handles newsletter analytics HTTP requests
type AnalyticsHandler struct {
	analyticsService *service.AnalyticsService
	abTestService    *service.ABTestService
}

// NewAnalyticsHandler creates a new analytics handler
func NewAnalyticsHandler(
	analyticsService *service.AnalyticsService,
	abTestService *service.ABTestService,
) *AnalyticsHandler {
	if analyticsService == nil {
		panic("analyticsService cannot be nil")
	}
	if abTestService == nil {
		panic("abTestService cannot be nil")
	}

	return &AnalyticsHandler{
		analyticsService: analyticsService,
		abTestService:    abTestService,
	}
}

// ============================================================================
// Handlers
// ============================================================================

// GetOverview handles GET /v1/newsletter-analytics/overview
func (h *AnalyticsHandler) GetOverview(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Parse date range with defaults
	dateRange, err := h.parseDateRange(r)
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
		Time("start_date", dateRange.Start).
		Time("end_date", dateRange.End).
		Msg("Fetching overview analytics")

	// Get overview metrics from service
	metrics, err := h.analyticsService.GetOverview(ctx, dateRange)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to fetch overview metrics")
		response.InternalError(w, "Failed to fetch analytics data", requestID)
		return
	}

	// Get target comparisons
	comparisons, err := h.analyticsService.CompareToTargets(ctx, metrics)
	if err != nil {
		log.Warn().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to compare to targets")
		// Don't fail the request, just return nil comparisons
		comparisons = nil
	}

	// Get top performers
	topPerformers, err := h.analyticsService.GetTopPerforming(ctx, service.MetricTypeOpenRate, 5)
	if err != nil {
		log.Warn().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to get top performers")
		// Don't fail the request, just return empty list
		topPerformers = []service.TopPerformer{}
	}

	// Build response
	overviewResp := map[string]interface{}{
		"metrics":           metrics,
		"target_comparison": comparisons,
		"top_performers":    topPerformers,
		"date_range": map[string]interface{}{
			"start_date": dateRange.Start,
			"end_date":   dateRange.End,
		},
	}

	log.Info().
		Str("request_id", requestID).
		Int("total_sent", metrics.TotalSent).
		Float64("open_rate", metrics.OpenRate).
		Float64("click_rate", metrics.ClickRate).
		Msg("Successfully calculated overview analytics")

	response.Success(w, overviewResp)
}

// GetSegmentAnalytics handles GET /v1/newsletter-analytics/segments/:segmentId
func (h *AnalyticsHandler) GetSegmentAnalytics(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Parse segment ID
	segmentIDStr := chi.URLParam(r, "segmentId")
	if segmentIDStr == "" {
		response.BadRequest(w, "Segment ID is required")
		return
	}

	segmentID, err := uuid.Parse(segmentIDStr)
	if err != nil {
		response.BadRequest(w, "Invalid segment ID format")
		return
	}

	// Parse date range
	dateRange, err := h.parseDateRange(r)
	if err != nil {
		response.BadRequest(w, fmt.Sprintf("Invalid date range: %v", err))
		return
	}

	log.Info().
		Str("request_id", requestID).
		Str("segment_id", segmentID.String()).
		Time("start_date", dateRange.Start).
		Time("end_date", dateRange.End).
		Msg("Fetching segment analytics")

	// Get segment analytics from service
	segmentMetrics, err := h.analyticsService.GetSegmentAnalytics(ctx, segmentID, dateRange)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("segment_id", segmentID.String()).
			Msg("Failed to fetch segment analytics")
		response.InternalError(w, "Failed to fetch segment analytics", requestID)
		return
	}

	// Build response
	segmentResp := map[string]interface{}{
		"segment_id":   segmentMetrics.SegmentID,
		"segment_name": segmentMetrics.SegmentName,
		"metrics":      segmentMetrics.Metrics,
		"trends":       segmentMetrics.Trends,
		"top_content":  segmentMetrics.TopContent,
		"date_range": map[string]interface{}{
			"start_date": dateRange.Start,
			"end_date":   dateRange.End,
		},
	}

	log.Info().
		Str("request_id", requestID).
		Str("segment_id", segmentID.String()).
		Float64("open_rate", segmentMetrics.Metrics.OpenRate).
		Msg("Successfully calculated segment analytics")

	response.Success(w, segmentResp)
}

// GetTopPerforming handles GET /v1/newsletter-analytics/top
func (h *AnalyticsHandler) GetTopPerforming(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Parse query parameters
	metricStr := r.URL.Query().Get("metric")
	if metricStr == "" {
		metricStr = "open_rate"
	}

	// Convert metric string to MetricType
	var metric service.MetricType
	switch metricStr {
	case "opens":
		metric = service.MetricTypeOpens
	case "clicks":
		metric = service.MetricTypeClicks
	case "ctr":
		metric = service.MetricTypeCTR
	case "open_rate":
		metric = service.MetricTypeOpenRate
	default:
		response.BadRequest(w, fmt.Sprintf("Invalid metric: %s. Must be one of: opens, clicks, ctr, open_rate", metricStr))
		return
	}

	limit, err := parseIntQuery(r, "limit", DefaultTopPerformersLimit)
	if err != nil {
		response.BadRequest(w, fmt.Sprintf("Invalid limit parameter: %v", err))
		return
	}

	if limit < 1 || limit > MaxTopPerformersLimit {
		response.BadRequest(w, fmt.Sprintf("Limit must be between 1 and %d", MaxTopPerformersLimit))
		return
	}

	log.Info().
		Str("request_id", requestID).
		Str("metric", metricStr).
		Int("limit", limit).
		Msg("Fetching top performing newsletters")

	// Get top performers from service
	topPerformers, err := h.analyticsService.GetTopPerforming(ctx, metric, limit)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to get top performers")
		response.InternalError(w, "Failed to calculate top performers", requestID)
		return
	}

	// Build response
	topResp := map[string]interface{}{
		"metric": metricStr,
		"limit":  limit,
		"items":  topPerformers,
	}

	log.Info().
		Str("request_id", requestID).
		Str("metric", metricStr).
		Int("count", len(topPerformers)).
		Msg("Successfully fetched top performers")

	response.Success(w, topResp)
}

// GetTrendData handles GET /v1/newsletter-analytics/trends
func (h *AnalyticsHandler) GetTrendData(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Parse query parameters
	metricStr := r.URL.Query().Get("metric")
	if metricStr == "" {
		metricStr = "open_rate"
	}

	// Convert metric string to MetricType
	var metric service.MetricType
	switch metricStr {
	case "opens":
		metric = service.MetricTypeOpens
	case "clicks":
		metric = service.MetricTypeClicks
	case "ctr":
		metric = service.MetricTypeCTR
	case "open_rate":
		metric = service.MetricTypeOpenRate
	default:
		response.BadRequest(w, fmt.Sprintf("Invalid metric: %s. Must be one of: opens, clicks, ctr, open_rate", metricStr))
		return
	}

	granularityStr := r.URL.Query().Get("granularity")
	if granularityStr == "" {
		granularityStr = DefaultGranularity
	}

	// Convert granularity string to Granularity
	var granularity service.Granularity
	switch granularityStr {
	case "daily":
		granularity = service.GranularityDaily
	case "weekly":
		granularity = service.GranularityWeekly
	case "monthly":
		granularity = service.GranularityMonthly
	default:
		response.BadRequest(w, "Invalid granularity. Must be one of: daily, weekly, monthly")
		return
	}

	// Parse date range
	dateRange, err := h.parseDateRange(r)
	if err != nil {
		response.BadRequest(w, fmt.Sprintf("Invalid date range: %v", err))
		return
	}

	log.Info().
		Str("request_id", requestID).
		Str("metric", metricStr).
		Str("granularity", granularityStr).
		Time("start_date", dateRange.Start).
		Time("end_date", dateRange.End).
		Msg("Fetching trend data")

	// Get trend data from service
	trendPoints, err := h.analyticsService.GetTrendData(ctx, metric, dateRange, granularity)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to get trend data")
		response.InternalError(w, "Failed to calculate trend data", requestID)
		return
	}

	// Build response
	trendResp := map[string]interface{}{
		"metric":      metricStr,
		"granularity": granularityStr,
		"date_range": map[string]interface{}{
			"start_date": dateRange.Start,
			"end_date":   dateRange.End,
		},
		"points": trendPoints,
	}

	log.Info().
		Str("request_id", requestID).
		Str("metric", metricStr).
		Str("granularity", granularityStr).
		Int("points", len(trendPoints)).
		Msg("Successfully calculated trend data")

	response.Success(w, trendResp)
}

// GetTestResults handles GET /v1/newsletter-analytics/tests/:issueId
func (h *AnalyticsHandler) GetTestResults(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Parse issue ID
	issueIDStr := chi.URLParam(r, "issueId")
	if issueIDStr == "" {
		response.BadRequest(w, "Issue ID is required")
		return
	}

	issueID, err := uuid.Parse(issueIDStr)
	if err != nil {
		response.BadRequest(w, "Invalid issue ID format")
		return
	}

	log.Info().
		Str("request_id", requestID).
		Str("issue_id", issueID.String()).
		Msg("Fetching A/B test results")

	// Get test results from A/B test service
	testResult, err := h.abTestService.GetTestResults(ctx, issueID)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("issue_id", issueID.String()).
			Msg("Failed to fetch test results")
		response.InternalError(w, "Failed to fetch test results", requestID)
		return
	}

	if testResult == nil {
		response.NotFound(w, "No A/B test found for this issue")
		return
	}

	// Build response
	testResp := map[string]interface{}{
		"issue_id":            testResult.IssueID,
		"test_type":           testResult.TestType,
		"variants":            testResult.Variants,
		"winner":              testResult.Winner,
		"confidence":          testResult.Confidence,
		"is_significant":      testResult.IsSignificant,
		"min_sample_size_met": testResult.MinSampleSizeMet,
		"total_sample_size":   testResult.TotalSampleSize,
	}

	log.Info().
		Str("request_id", requestID).
		Str("issue_id", issueID.String()).
		Str("test_type", string(testResult.TestType)).
		Bool("is_significant", testResult.IsSignificant).
		Msg("Successfully fetched test results")

	response.Success(w, testResp)
}

// ============================================================================
// Helper Methods
// ============================================================================

// parseDateRange parses start_date and end_date query parameters
// Returns default range of last 30 days if not provided
func (h *AnalyticsHandler) parseDateRange(r *http.Request) (service.DateRange, error) {
	// Default: last DefaultDateRangeDays days
	endDate := time.Now()
	startDate := endDate.AddDate(0, 0, -DefaultDateRangeDays)

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
