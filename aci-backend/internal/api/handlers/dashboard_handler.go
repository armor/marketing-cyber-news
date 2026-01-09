package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/rs/zerolog/log"

	"github.com/phillipboles/aci-backend/internal/api/response"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/repository"
)

// DashboardHandler handles dashboard-related HTTP requests
type DashboardHandler struct {
	articleRepo repository.ArticleRepository
}

// NewDashboardHandler creates a new dashboard handler instance
func NewDashboardHandler(articleRepo repository.ArticleRepository) *DashboardHandler {
	if articleRepo == nil {
		panic("articleRepo cannot be nil")
	}

	return &DashboardHandler{
		articleRepo: articleRepo,
	}
}

// SeverityDistribution represents threat count by severity
type SeverityDistribution struct {
	Critical int `json:"critical"`
	High     int `json:"high"`
	Medium   int `json:"medium"`
	Low      int `json:"low"`
}

// TimelineEntry represents threat count for a specific date
type TimelineEntry struct {
	Date     string `json:"date"`
	Count    int    `json:"count"`
	Critical int    `json:"critical"`
	High     int    `json:"high"`
	Medium   int    `json:"medium"`
	Low      int    `json:"low"`
}

// DashboardSummary represents aggregated threat statistics
type DashboardSummary struct {
	TotalThreats         int                  `json:"totalThreats"`
	CriticalCount        int                  `json:"criticalCount"`
	HighCount            int                  `json:"highCount"`
	MediumCount          int                  `json:"mediumCount"`
	LowCount             int                  `json:"lowCount"`
	NewToday             int                  `json:"newToday"`
	ActiveAlerts         int                  `json:"activeAlerts"`
	SeverityDistribution SeverityDistribution `json:"severityDistribution"`
	Timeline             []TimelineEntry      `json:"timeline"`
}

// RecentActivity represents a recent threat activity item
type RecentActivity struct {
	ID          string  `json:"id"`
	Type        string  `json:"type"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Severity    string  `json:"severity"`
	Timestamp   string  `json:"timestamp"`
	ThreatID    *string `json:"threatId,omitempty"`
}

// GetSummary handles GET /v1/dashboard/summary
func (h *DashboardHandler) GetSummary(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get articles for aggregation - fetch multiple pages if needed
	filter := domain.NewArticleFilter()
	filter.PageSize = 100 // Max allowed by filter validation

	articles, total, err := h.articleRepo.List(ctx, filter)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to list articles for dashboard summary")
		response.InternalError(w, "Failed to retrieve dashboard summary", requestID)
		return
	}

	summary := h.calculateSummary(ctx, articles, total)

	response.Success(w, summary)
}

// GetRecentActivity handles GET /v1/dashboard/recent-activity
func (h *DashboardHandler) GetRecentActivity(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get recent articles (last 10)
	filter := domain.NewArticleFilter()
	filter.PageSize = 10
	filter.Page = 1

	articles, _, err := h.articleRepo.List(ctx, filter)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to list recent articles")
		response.InternalError(w, "Failed to retrieve recent activity", requestID)
		return
	}

	activities := make([]RecentActivity, 0, len(articles))
	for _, article := range articles {
		threatID := article.ID.String()
		activity := RecentActivity{
			ID:        article.ID.String(),
			Type:      "new_threat",
			Title:     article.Title,
			Severity:  string(article.Severity),
			Timestamp: article.PublishedAt.Format(time.RFC3339),
			ThreatID:  &threatID,
		}

		// Use summary as description if available, otherwise truncate content
		if article.Summary != nil {
			activity.Description = *article.Summary
		} else {
			activity.Description = truncateString(article.Content, 150)
		}

		activities = append(activities, activity)
	}

	response.Success(w, activities)
}

// calculateSummary aggregates article statistics
func (h *DashboardHandler) calculateSummary(ctx context.Context, articles []*domain.Article, total int) *DashboardSummary {
	summary := &DashboardSummary{
		TotalThreats: total,
		ActiveAlerts: 0, // TODO: Implement when alert service is available
		SeverityDistribution: SeverityDistribution{
			Critical: 0,
			High:     0,
			Medium:   0,
			Low:      0,
		},
		Timeline: make([]TimelineEntry, 0),
	}

	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)

	// Map to track timeline entries by date
	timelineMap := make(map[string]*TimelineEntry)

	// Aggregate statistics
	for _, article := range articles {
		if article == nil {
			continue
		}

		// Count by severity
		switch article.Severity {
		case domain.SeverityCritical:
			summary.CriticalCount++
			summary.SeverityDistribution.Critical++
		case domain.SeverityHigh:
			summary.HighCount++
			summary.SeverityDistribution.High++
		case domain.SeverityMedium:
			summary.MediumCount++
			summary.SeverityDistribution.Medium++
		case domain.SeverityLow, domain.SeverityInformational:
			summary.LowCount++
			summary.SeverityDistribution.Low++
		}

		// Count new today
		if article.PublishedAt.After(todayStart) {
			summary.NewToday++
		}

		// Build timeline (last 7 days)
		dateKey := article.PublishedAt.Format("2006-01-02")
		if entry, exists := timelineMap[dateKey]; exists {
			entry.Count++
			switch article.Severity {
			case domain.SeverityCritical:
				entry.Critical++
			case domain.SeverityHigh:
				entry.High++
			case domain.SeverityMedium:
				entry.Medium++
			case domain.SeverityLow, domain.SeverityInformational:
				entry.Low++
			}
		} else {
			entry := &TimelineEntry{
				Date:  dateKey,
				Count: 1,
			}
			switch article.Severity {
			case domain.SeverityCritical:
				entry.Critical = 1
			case domain.SeverityHigh:
				entry.High = 1
			case domain.SeverityMedium:
				entry.Medium = 1
			case domain.SeverityLow, domain.SeverityInformational:
				entry.Low = 1
			}
			timelineMap[dateKey] = entry
		}
	}

	// Convert timeline map to slice
	for _, entry := range timelineMap {
		summary.Timeline = append(summary.Timeline, *entry)
	}

	return summary
}
