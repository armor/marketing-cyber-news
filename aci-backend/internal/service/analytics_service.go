package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/repository"
)

// Target metrics constants (FR-042, SC-001 through SC-006)
const (
	TargetOpenRateMin     = 0.28   // 28% minimum open rate
	TargetOpenRateMax     = 0.35   // 35% maximum open rate
	TargetCTRMin          = 0.035  // 3.5% minimum click-through rate
	TargetCTRMax          = 0.055  // 5.5% maximum click-through rate
	TargetCTORMin         = 0.12   // 12% minimum click-to-open rate
	TargetCTORMax         = 0.18   // 18% maximum click-to-open rate
	TargetUnsubscribeMax  = 0.002  // 0.2% maximum unsubscribe rate
	TargetBounceMax       = 0.005  // 0.5% maximum bounce rate
	TargetSpamMax         = 0.001  // 0.1% maximum spam complaint rate
)

// Granularity represents the time granularity for trend data
type Granularity string

const (
	GranularityDaily   Granularity = "daily"
	GranularityWeekly  Granularity = "weekly"
	GranularityMonthly Granularity = "monthly"
)

// MetricType represents the type of metric to track
type MetricType string

const (
	MetricTypeOpens  MetricType = "opens"
	MetricTypeClicks MetricType = "clicks"
	MetricTypeCTR    MetricType = "ctr"
	MetricTypeOpenRate MetricType = "open_rate"
)

// TargetStatus represents how actual metrics compare to targets
type TargetStatus string

const (
	TargetStatusAbove    TargetStatus = "above_target"
	TargetStatusOnTarget TargetStatus = "on_target"
	TargetStatusBelow    TargetStatus = "below_target"
)

// DateRange represents a time range for analytics queries
type DateRange struct {
	Start time.Time `json:"start"`
	End   time.Time `json:"end"`
}

// Validate validates the date range
func (dr *DateRange) Validate() error {
	if dr.Start.IsZero() {
		return fmt.Errorf("start date is required")
	}

	if dr.End.IsZero() {
		return fmt.Errorf("end date is required")
	}

	if dr.End.Before(dr.Start) {
		return fmt.Errorf("end date must be after start date")
	}

	return nil
}

// OverviewMetrics represents high-level newsletter performance metrics
type OverviewMetrics struct {
	TotalSent        int     `json:"total_sent"`
	TotalDelivered   int     `json:"total_delivered"`
	TotalOpens       int     `json:"total_opens"`
	UniqueOpens      int     `json:"unique_opens"`
	TotalClicks      int     `json:"total_clicks"`
	UniqueClicks     int     `json:"unique_clicks"`
	Bounces          int     `json:"bounces"`
	Unsubscribes     int     `json:"unsubscribes"`
	SpamComplaints   int     `json:"spam_complaints"`
	OpenRate         float64 `json:"open_rate"`
	ClickRate        float64 `json:"click_rate"`
	CTOR             float64 `json:"ctor"`
	BounceRate       float64 `json:"bounce_rate"`
	UnsubscribeRate  float64 `json:"unsubscribe_rate"`
	SpamComplaintRate float64 `json:"spam_complaint_rate"`
}

// SegmentMetrics represents metrics for a specific segment
type SegmentMetrics struct {
	SegmentID        uuid.UUID              `json:"segment_id"`
	SegmentName      string                 `json:"segment_name"`
	Metrics          *OverviewMetrics       `json:"metrics"`
	Trends           []TrendPoint           `json:"trends"`
	TopContent       []TopPerformer         `json:"top_content"`
}

// TopPerformer represents a top-performing newsletter issue
type TopPerformer struct {
	IssueID      uuid.UUID  `json:"issue_id"`
	Subject      string     `json:"subject"`
	SentAt       time.Time  `json:"sent_at"`
	MetricValue  float64    `json:"metric_value"`
	MetricType   MetricType `json:"metric_type"`
	Rank         int        `json:"rank"`
}

// TrendPoint represents a single data point in a time series
type TrendPoint struct {
	Timestamp time.Time `json:"timestamp"`
	Value     float64   `json:"value"`
	Label     string    `json:"label,omitempty"`
}

// TargetComparison represents how a metric compares to its target
type TargetComparison struct {
	MetricName         string       `json:"metric_name"`
	TargetMin          float64      `json:"target_min"`
	TargetMax          float64      `json:"target_max"`
	ActualValue        float64      `json:"actual_value"`
	Status             TargetStatus `json:"status"`
	PercentageDiff     float64      `json:"percentage_diff"`
	IsAboveMinimum     bool         `json:"is_above_minimum"`
	IsBelowMaximum     bool         `json:"is_below_maximum"`
}

// AnalyticsService handles analytics and reporting for newsletter performance
type AnalyticsService struct {
	engagementRepo repository.EngagementEventRepository
	issueRepo      repository.NewsletterIssueRepository
	configRepo     repository.NewsletterConfigRepository
	segmentRepo    repository.SegmentRepository
}

// NewAnalyticsService creates a new analytics service
func NewAnalyticsService(
	engagementRepo repository.EngagementEventRepository,
	issueRepo repository.NewsletterIssueRepository,
	configRepo repository.NewsletterConfigRepository,
	segmentRepo repository.SegmentRepository,
) *AnalyticsService {
	if engagementRepo == nil {
		panic("engagementRepo cannot be nil")
	}
	if issueRepo == nil {
		panic("issueRepo cannot be nil")
	}
	if configRepo == nil {
		panic("configRepo cannot be nil")
	}
	if segmentRepo == nil {
		panic("segmentRepo cannot be nil")
	}

	return &AnalyticsService{
		engagementRepo: engagementRepo,
		issueRepo:      issueRepo,
		configRepo:     configRepo,
		segmentRepo:    segmentRepo,
	}
}

// GetOverview retrieves overview metrics for a date range (FR-042, SC-001 through SC-006)
func (s *AnalyticsService) GetOverview(ctx context.Context, dateRange DateRange) (*OverviewMetrics, error) {
	if err := dateRange.Validate(); err != nil {
		return nil, fmt.Errorf("invalid date range: %w", err)
	}

	// Get all issues in the date range
	status := domain.IssueStatusSent
	filter := &domain.NewsletterIssueFilter{
		StartDate: &dateRange.Start,
		EndDate:   &dateRange.End,
		Status:    &status,
		Limit:     10000,
	}

	issues, _, err := s.issueRepo.List(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to get issues: %w", err)
	}

	if len(issues) == 0 {
		return &OverviewMetrics{}, nil
	}

	// Aggregate metrics across all issues
	metrics := &OverviewMetrics{}
	uniqueOpeners := make(map[uuid.UUID]bool)
	uniqueClickers := make(map[uuid.UUID]bool)

	for _, issue := range issues {
		// Add issue-level metrics
		metrics.TotalSent += issue.TotalRecipients
		metrics.TotalDelivered += issue.TotalDelivered
		metrics.Bounces += issue.TotalBounces
		metrics.Unsubscribes += issue.TotalUnsubscribes
		metrics.SpamComplaints += issue.TotalComplaints

		// Get engagement events for this issue
		events, err := s.engagementRepo.GetByIssueID(ctx, issue.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to get engagement events for issue %s: %w", issue.ID, err)
		}

		// Count events and track unique contacts
		for _, event := range events {
			switch event.EventType {
			case domain.EventTypeOpen:
				metrics.TotalOpens++
				uniqueOpeners[event.ContactID] = true
			case domain.EventTypeClick:
				metrics.TotalClicks++
				uniqueClickers[event.ContactID] = true
			}
		}
	}

	metrics.UniqueOpens = len(uniqueOpeners)
	metrics.UniqueClicks = len(uniqueClickers)

	// Calculate rates
	s.calculateRates(metrics)

	log.Info().
		Int("total_sent", metrics.TotalSent).
		Int("unique_opens", metrics.UniqueOpens).
		Int("unique_clicks", metrics.UniqueClicks).
		Float64("open_rate", metrics.OpenRate).
		Float64("click_rate", metrics.ClickRate).
		Msg("Calculated overview metrics")

	return metrics, nil
}

// GetSegmentAnalytics retrieves analytics for a specific segment (SC-016)
func (s *AnalyticsService) GetSegmentAnalytics(ctx context.Context, segmentID uuid.UUID, dateRange DateRange) (*SegmentMetrics, error) {
	if segmentID == uuid.Nil {
		return nil, fmt.Errorf("segment ID is required")
	}

	if err := dateRange.Validate(); err != nil {
		return nil, fmt.Errorf("invalid date range: %w", err)
	}

	// Get segment details
	segment, err := s.segmentRepo.GetByID(ctx, segmentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get segment: %w", err)
	}

	// Get newsletter configs for this segment
	configs, err := s.configRepo.GetBySegmentID(ctx, segmentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get newsletter configs: %w", err)
	}

	if len(configs) == 0 {
		return &SegmentMetrics{
			SegmentID:   segmentID,
			SegmentName: segment.Name,
			Metrics:     &OverviewMetrics{},
			Trends:      []TrendPoint{},
			TopContent:  []TopPerformer{},
		}, nil
	}

	// Aggregate metrics across all configs for this segment
	configIDs := make([]uuid.UUID, len(configs))
	for i, cfg := range configs {
		configIDs[i] = cfg.ID
	}

	// Get issues for these configs
	status := domain.IssueStatusSent
	filter := &domain.NewsletterIssueFilter{
		StartDate: &dateRange.Start,
		EndDate:   &dateRange.End,
		Status:    &status,
		Limit:     10000,
	}

	allIssues, _, err := s.issueRepo.List(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to get issues: %w", err)
	}

	// Filter issues by config IDs
	issues := make([]*domain.NewsletterIssue, 0)
	for _, issue := range allIssues {
		for _, cfgID := range configIDs {
			if issue.ConfigurationID == cfgID {
				issues = append(issues, issue)
				break
			}
		}
	}

	// Calculate metrics for segment
	metrics := &OverviewMetrics{}
	uniqueOpeners := make(map[uuid.UUID]bool)
	uniqueClickers := make(map[uuid.UUID]bool)

	for _, issue := range issues {
		metrics.TotalSent += issue.TotalRecipients
		metrics.TotalDelivered += issue.TotalDelivered
		metrics.Bounces += issue.TotalBounces
		metrics.Unsubscribes += issue.TotalUnsubscribes
		metrics.SpamComplaints += issue.TotalComplaints

		events, err := s.engagementRepo.GetByIssueID(ctx, issue.ID)
		if err != nil {
			log.Error().Err(err).Str("issue_id", issue.ID.String()).Msg("Failed to get engagement events")
			continue
		}

		for _, event := range events {
			switch event.EventType {
			case domain.EventTypeOpen:
				metrics.TotalOpens++
				uniqueOpeners[event.ContactID] = true
			case domain.EventTypeClick:
				metrics.TotalClicks++
				uniqueClickers[event.ContactID] = true
			}
		}
	}

	metrics.UniqueOpens = len(uniqueOpeners)
	metrics.UniqueClicks = len(uniqueClickers)
	s.calculateRates(metrics)

	// Get trend data
	trends, err := s.GetTrendData(ctx, MetricTypeOpenRate, dateRange, GranularityWeekly)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get trend data")
		trends = []TrendPoint{}
	}

	// Get top performing content
	topContent, err := s.getTopPerformingForIssues(ctx, issues, MetricTypeCTR, 5)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get top performing content")
		topContent = []TopPerformer{}
	}

	return &SegmentMetrics{
		SegmentID:   segmentID,
		SegmentName: segment.Name,
		Metrics:     metrics,
		Trends:      trends,
		TopContent:  topContent,
	}, nil
}

// GetTopPerforming retrieves top N performing issues by metric
func (s *AnalyticsService) GetTopPerforming(ctx context.Context, metric MetricType, limit int) ([]TopPerformer, error) {
	if limit <= 0 {
		limit = 10
	}

	// Get all sent issues (limit to recent for performance)
	status := domain.IssueStatusSent
	filter := &domain.NewsletterIssueFilter{
		Status: &status,
		Limit:  1000,
	}

	issues, _, err := s.issueRepo.List(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to get issues: %w", err)
	}

	if len(issues) == 0 {
		return []TopPerformer{}, nil
	}

	return s.getTopPerformingForIssues(ctx, issues, metric, limit)
}

// GetTrendData retrieves time-series data for a metric
func (s *AnalyticsService) GetTrendData(ctx context.Context, metric MetricType, dateRange DateRange, granularity Granularity) ([]TrendPoint, error) {
	if err := dateRange.Validate(); err != nil {
		return nil, fmt.Errorf("invalid date range: %w", err)
	}

	// Get all issues in range
	status := domain.IssueStatusSent
	filter := &domain.NewsletterIssueFilter{
		StartDate: &dateRange.Start,
		EndDate:   &dateRange.End,
		Status:    &status,
		Limit:     10000,
	}

	issues, _, err := s.issueRepo.List(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to get issues: %w", err)
	}

	if len(issues) == 0 {
		return []TrendPoint{}, nil
	}

	// Group issues by time bucket
	buckets := s.groupByGranularity(issues, granularity)

	// Calculate metric for each bucket
	trendPoints := make([]TrendPoint, 0, len(buckets))
	for timestamp, bucketIssues := range buckets {
		value := s.calculateMetricForIssues(ctx, bucketIssues, metric)
		label := s.formatTimestamp(timestamp, granularity)

		trendPoints = append(trendPoints, TrendPoint{
			Timestamp: timestamp,
			Value:     value,
			Label:     label,
		})
	}

	// Sort by timestamp
	s.sortTrendPoints(trendPoints)

	return trendPoints, nil
}

// CompareToTargets compares actual metrics to target ranges
func (s *AnalyticsService) CompareToTargets(ctx context.Context, metrics *OverviewMetrics) ([]TargetComparison, error) {
	if metrics == nil {
		return nil, fmt.Errorf("metrics cannot be nil")
	}

	comparisons := []TargetComparison{
		{
			MetricName:  "Open Rate",
			TargetMin:   TargetOpenRateMin * 100,
			TargetMax:   TargetOpenRateMax * 100,
			ActualValue: metrics.OpenRate,
		},
		{
			MetricName:  "Click Rate",
			TargetMin:   TargetCTRMin * 100,
			TargetMax:   TargetCTRMax * 100,
			ActualValue: metrics.ClickRate,
		},
		{
			MetricName:  "Click-to-Open Rate",
			TargetMin:   TargetCTORMin * 100,
			TargetMax:   TargetCTORMax * 100,
			ActualValue: metrics.CTOR,
		},
		{
			MetricName:  "Unsubscribe Rate",
			TargetMin:   0,
			TargetMax:   TargetUnsubscribeMax * 100,
			ActualValue: metrics.UnsubscribeRate,
		},
		{
			MetricName:  "Bounce Rate",
			TargetMin:   0,
			TargetMax:   TargetBounceMax * 100,
			ActualValue: metrics.BounceRate,
		},
		{
			MetricName:  "Spam Complaint Rate",
			TargetMin:   0,
			TargetMax:   TargetSpamMax * 100,
			ActualValue: metrics.SpamComplaintRate,
		},
	}

	// Calculate status and percentage difference for each comparison
	for i := range comparisons {
		comp := &comparisons[i]
		comp.IsAboveMinimum = comp.ActualValue >= comp.TargetMin
		comp.IsBelowMaximum = comp.ActualValue <= comp.TargetMax

		// Determine status
		if comp.IsAboveMinimum && comp.IsBelowMaximum {
			comp.Status = TargetStatusOnTarget
			// Calculate difference from midpoint
			midpoint := (comp.TargetMin + comp.TargetMax) / 2
			comp.PercentageDiff = ((comp.ActualValue - midpoint) / midpoint) * 100
		} else if comp.ActualValue > comp.TargetMax {
			comp.Status = TargetStatusAbove
			comp.PercentageDiff = ((comp.ActualValue - comp.TargetMax) / comp.TargetMax) * 100
		} else {
			comp.Status = TargetStatusBelow
			comp.PercentageDiff = ((comp.ActualValue - comp.TargetMin) / comp.TargetMin) * 100
		}
	}

	return comparisons, nil
}

// Helper methods

func (s *AnalyticsService) calculateRates(metrics *OverviewMetrics) {
	if metrics.TotalSent > 0 {
		metrics.OpenRate = (float64(metrics.UniqueOpens) / float64(metrics.TotalSent)) * 100
		metrics.ClickRate = (float64(metrics.UniqueClicks) / float64(metrics.TotalSent)) * 100
		metrics.BounceRate = (float64(metrics.Bounces) / float64(metrics.TotalSent)) * 100
		metrics.UnsubscribeRate = (float64(metrics.Unsubscribes) / float64(metrics.TotalSent)) * 100
		metrics.SpamComplaintRate = (float64(metrics.SpamComplaints) / float64(metrics.TotalSent)) * 100
	}

	if metrics.UniqueOpens > 0 {
		metrics.CTOR = (float64(metrics.UniqueClicks) / float64(metrics.UniqueOpens)) * 100
	}
}

func (s *AnalyticsService) getTopPerformingForIssues(ctx context.Context, issues []*domain.NewsletterIssue, metric MetricType, limit int) ([]TopPerformer, error) {
	type issueScore struct {
		issue *domain.NewsletterIssue
		score float64
	}

	scores := make([]issueScore, 0, len(issues))

	for _, issue := range issues {
		if issue.TotalRecipients == 0 {
			continue
		}

		var score float64
		switch metric {
		case MetricTypeOpens:
			score = float64(issue.TotalOpens)
		case MetricTypeClicks:
			score = float64(issue.TotalClicks)
		case MetricTypeCTR:
			score = (float64(issue.TotalClicks) / float64(issue.TotalRecipients)) * 100
		case MetricTypeOpenRate:
			score = (float64(issue.TotalOpens) / float64(issue.TotalRecipients)) * 100
		default:
			score = (float64(issue.TotalClicks) / float64(issue.TotalRecipients)) * 100
		}

		scores = append(scores, issueScore{
			issue: issue,
			score: score,
		})
	}

	// Sort by score descending
	for i := 0; i < len(scores)-1; i++ {
		for j := i + 1; j < len(scores); j++ {
			if scores[j].score > scores[i].score {
				scores[i], scores[j] = scores[j], scores[i]
			}
		}
	}

	// Take top N
	if len(scores) > limit {
		scores = scores[:limit]
	}

	// Convert to TopPerformer
	performers := make([]TopPerformer, len(scores))
	for i, s := range scores {
		subject := ""
		if s.issue.SelectedSubjectLine != nil {
			subject = *s.issue.SelectedSubjectLine
		} else if len(s.issue.SubjectLines) > 0 {
			subject = s.issue.SubjectLines[0]
		}

		sentAt := time.Time{}
		if s.issue.SentAt != nil {
			sentAt = *s.issue.SentAt
		}

		performers[i] = TopPerformer{
			IssueID:     s.issue.ID,
			Subject:     subject,
			SentAt:      sentAt,
			MetricValue: s.score,
			MetricType:  metric,
			Rank:        i + 1,
		}
	}

	return performers, nil
}

func (s *AnalyticsService) groupByGranularity(issues []*domain.NewsletterIssue, granularity Granularity) map[time.Time][]*domain.NewsletterIssue {
	buckets := make(map[time.Time][]*domain.NewsletterIssue)

	for _, issue := range issues {
		if issue.SentAt == nil {
			continue
		}
		bucket := s.getBucket(*issue.SentAt, granularity)
		buckets[bucket] = append(buckets[bucket], issue)
	}

	return buckets
}

func (s *AnalyticsService) getBucket(t time.Time, granularity Granularity) time.Time {
	year, month, day := t.Date()

	switch granularity {
	case GranularityDaily:
		return time.Date(year, month, day, 0, 0, 0, 0, t.Location())
	case GranularityWeekly:
		// Start of week (Monday)
		weekday := int(t.Weekday())
		if weekday == 0 {
			weekday = 7 // Sunday = 7
		}
		daysToMonday := weekday - 1
		return time.Date(year, month, day-daysToMonday, 0, 0, 0, 0, t.Location())
	case GranularityMonthly:
		return time.Date(year, month, 1, 0, 0, 0, 0, t.Location())
	default:
		return time.Date(year, month, day, 0, 0, 0, 0, t.Location())
	}
}

func (s *AnalyticsService) calculateMetricForIssues(ctx context.Context, issues []*domain.NewsletterIssue, metric MetricType) float64 {
	if len(issues) == 0 {
		return 0
	}

	totalSent := 0
	totalOpens := 0
	totalClicks := 0

	for _, issue := range issues {
		totalSent += issue.TotalRecipients
		totalOpens += issue.TotalOpens
		totalClicks += issue.TotalClicks
	}

	if totalSent == 0 {
		return 0
	}

	switch metric {
	case MetricTypeOpens:
		return float64(totalOpens)
	case MetricTypeClicks:
		return float64(totalClicks)
	case MetricTypeCTR:
		return (float64(totalClicks) / float64(totalSent)) * 100
	case MetricTypeOpenRate:
		return (float64(totalOpens) / float64(totalSent)) * 100
	default:
		return 0
	}
}

func (s *AnalyticsService) formatTimestamp(t time.Time, granularity Granularity) string {
	switch granularity {
	case GranularityDaily:
		return t.Format("2006-01-02")
	case GranularityWeekly:
		return fmt.Sprintf("Week of %s", t.Format("2006-01-02"))
	case GranularityMonthly:
		return t.Format("2006-01")
	default:
		return t.Format("2006-01-02")
	}
}

func (s *AnalyticsService) sortTrendPoints(points []TrendPoint) {
	// Simple bubble sort by timestamp
	for i := 0; i < len(points)-1; i++ {
		for j := i + 1; j < len(points); j++ {
			if points[j].Timestamp.Before(points[i].Timestamp) {
				points[i], points[j] = points[j], points[i]
			}
		}
	}
}
