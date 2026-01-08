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

// MarketingAnalyticsService handles analytics for marketing campaigns and content
type MarketingAnalyticsService struct {
	campaignRepo repository.CampaignRepository
	calendarRepo repository.CalendarEntryRepository
	contentRepo  repository.ContentItemRepository
}

// NewMarketingAnalyticsService creates a new marketing analytics service
func NewMarketingAnalyticsService(
	campaignRepo repository.CampaignRepository,
	calendarRepo repository.CalendarEntryRepository,
	contentRepo repository.ContentItemRepository,
) *MarketingAnalyticsService {
	if campaignRepo == nil {
		panic("campaignRepo cannot be nil")
	}
	if calendarRepo == nil {
		panic("calendarRepo cannot be nil")
	}
	if contentRepo == nil {
		panic("contentRepo cannot be nil")
	}

	return &MarketingAnalyticsService{
		campaignRepo: campaignRepo,
		calendarRepo: calendarRepo,
		contentRepo:  contentRepo,
	}
}

// CampaignAnalytics represents aggregated analytics for a campaign
type CampaignAnalytics struct {
	CampaignID         uuid.UUID                    `json:"campaign_id"`
	CampaignName       string                       `json:"campaign_name"`
	TotalContent       int                          `json:"total_content"`
	PublishedContent   int                          `json:"published_content"`
	ScheduledContent   int                          `json:"scheduled_content"`
	DraftContent       int                          `json:"draft_content"`
	TotalEngagement    int                          `json:"total_engagement"`
	TotalImpressions   int                          `json:"total_impressions"`
	TotalClicks        int                          `json:"total_clicks"`
	TotalShares        int                          `json:"total_shares"`
	AvgBrandScore      float64                      `json:"avg_brand_score"`
	AvgEngagementRate  float64                      `json:"avg_engagement_rate"`
	ChannelBreakdown   map[domain.Channel]int       `json:"channel_breakdown"`
	ContentStyleMix    map[domain.ContentStyle]int  `json:"content_style_mix"`
}

// ChannelPerformance represents performance metrics for a specific channel
type ChannelPerformance struct {
	Channel         domain.Channel `json:"channel"`
	TotalContent    int            `json:"total_content"`
	PublishedCount  int            `json:"published_count"`
	TotalEngagement int            `json:"total_engagement"`
	TotalImpressions int           `json:"total_impressions"`
	EngagementRate  float64        `json:"engagement_rate"`
	AvgBrandScore   float64        `json:"avg_brand_score"`
	TopContent      []ContentPerformance `json:"top_content"`
}

// ContentPerformance represents performance metrics for individual content
type ContentPerformance struct {
	ContentID       uuid.UUID      `json:"content_id"`
	Title           string         `json:"title"`
	Channel         domain.Channel `json:"channel"`
	ContentStyle    domain.ContentStyle `json:"content_style"`
	PublishedAt     *time.Time     `json:"published_at,omitempty"`
	Engagement      int            `json:"engagement"`
	Impressions     int            `json:"impressions"`
	Clicks          int            `json:"clicks"`
	Shares          int            `json:"shares"`
	EngagementRate  float64        `json:"engagement_rate"`
	BrandScore      int            `json:"brand_score"`
	PublishedURL    string         `json:"published_url,omitempty"`
}

// EngagementTrend represents engagement metrics over time
type EngagementTrend struct {
	Timestamp       time.Time `json:"timestamp"`
	Engagement      int       `json:"engagement"`
	Impressions     int       `json:"impressions"`
	EngagementRate  float64   `json:"engagement_rate"`
	ContentCount    int       `json:"content_count"`
	Label           string    `json:"label,omitempty"`
}

// AudienceGrowth represents audience growth metrics
type AudienceGrowth struct {
	Channel         domain.Channel `json:"channel"`
	Timestamp       time.Time      `json:"timestamp"`
	FollowerCount   int            `json:"follower_count"`
	Growth          int            `json:"growth"`
	GrowthRate      float64        `json:"growth_rate"`
	Label           string         `json:"label,omitempty"`
}

// ContentFilter represents filters for content performance queries
type ContentFilter struct {
	Channel      *domain.Channel
	ContentStyle *domain.ContentStyle
	StartDate    *time.Time
	EndDate      *time.Time
	MinBrandScore *int
	Limit        int
}

// GetCampaignAnalytics retrieves aggregated analytics for a specific campaign
func (s *MarketingAnalyticsService) GetCampaignAnalytics(ctx context.Context, campaignID uuid.UUID) (*CampaignAnalytics, error) {
	if campaignID == uuid.Nil {
		return nil, fmt.Errorf("campaign ID is required")
	}

	// Get campaign details
	campaign, err := s.campaignRepo.GetByID(ctx, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to get campaign: %w", err)
	}

	// Get calendar entries for this campaign
	filter := &domain.CalendarFilter{
		TenantID:   campaign.TenantID,
		CampaignID: &campaignID,
		PageSize:   10000,
	}

	entries, _, err := s.calendarRepo.List(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to get calendar entries: %w", err)
	}

	analytics := &CampaignAnalytics{
		CampaignID:       campaignID,
		CampaignName:     campaign.Name,
		ChannelBreakdown: make(map[domain.Channel]int),
		ContentStyleMix:  make(map[domain.ContentStyle]int),
	}

	for _, entry := range entries {
		analytics.TotalContent++

		// Count by status
		switch entry.Status {
		case domain.StatusPublished:
			analytics.PublishedContent++
		case domain.StatusScheduled:
			analytics.ScheduledContent++
		default:
			analytics.DraftContent++
		}

		// Channel breakdown
		analytics.ChannelBreakdown[entry.Channel]++

		// Use campaign's content style
		analytics.ContentStyleMix[campaign.ContentStyle]++

		// Note: Performance metrics would come from external platform APIs
		// For now, return zeros - this requires integration with LinkedIn, Twitter, etc.
	}

	log.Info().
		Str("campaign_id", campaignID.String()).
		Int("total_content", analytics.TotalContent).
		Int("published", analytics.PublishedContent).
		Float64("avg_brand_score", analytics.AvgBrandScore).
		Msg("Calculated campaign analytics")

	return analytics, nil
}

// GetChannelPerformance retrieves performance metrics per channel for a tenant
func (s *MarketingAnalyticsService) GetChannelPerformance(ctx context.Context, tenantID uuid.UUID) ([]ChannelPerformance, error) {
	if tenantID == uuid.Nil {
		return nil, fmt.Errorf("tenant ID is required")
	}

	// Get all calendar entries for tenant
	filter := &domain.CalendarFilter{
		TenantID: tenantID,
		PageSize: 10000,
	}

	entries, _, err := s.calendarRepo.List(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to get calendar entries: %w", err)
	}

	// Group by channel
	channelMap := make(map[domain.Channel]*ChannelPerformance)

	for _, entry := range entries {
		channel := entry.Channel
		if channelMap[channel] == nil {
			channelMap[channel] = &ChannelPerformance{
				Channel:    channel,
				TopContent: []ContentPerformance{},
			}
		}

		perf := channelMap[channel]
		perf.TotalContent++

		if entry.Status == domain.StatusPublished {
			perf.PublishedCount++
		}

		// Note: Performance metrics would come from external platform APIs
	}

	// Convert to slice
	performances := make([]ChannelPerformance, 0, len(channelMap))
	for _, perf := range channelMap {
		if perf.TotalImpressions > 0 {
			perf.EngagementRate = (float64(perf.TotalEngagement) / float64(perf.TotalImpressions)) * 100
		}
		performances = append(performances, *perf)
	}

	log.Info().
		Str("tenant_id", tenantID.String()).
		Int("channel_count", len(performances)).
		Msg("Calculated channel performance")

	return performances, nil
}

// GetContentPerformance retrieves content-level performance metrics with filters
func (s *MarketingAnalyticsService) GetContentPerformance(ctx context.Context, tenantID uuid.UUID, filters ContentFilter) ([]ContentPerformance, error) {
	if tenantID == uuid.Nil {
		return nil, fmt.Errorf("tenant ID is required")
	}

	// Build calendar filter
	calFilter := &domain.CalendarFilter{
		TenantID:  tenantID,
		Channel:   filters.Channel,
		StartDate: filters.StartDate,
		EndDate:   filters.EndDate,
		PageSize:  filters.Limit,
	}

	if calFilter.PageSize == 0 {
		calFilter.PageSize = 100
	}

	// Get calendar entries
	entries, _, err := s.calendarRepo.List(ctx, calFilter)
	if err != nil {
		return nil, fmt.Errorf("failed to get calendar entries: %w", err)
	}

	performances := make([]ContentPerformance, 0, len(entries))

	for _, entry := range entries {
		// Skip non-published entries
		if entry.Status != domain.StatusPublished || entry.PublishedAt == nil {
			continue
		}

		perf := ContentPerformance{
			Channel:     entry.Channel,
			PublishedAt: entry.PublishedAt,
		}

		// Get content details if available
		if entry.ContentID != nil {
			content, getErr := s.contentRepo.GetByID(ctx, *entry.ContentID)
			if getErr == nil {
				perf.ContentID = content.ID
				perf.Title = content.Title
			}
		}

		// Note: Performance metrics would come from external platform APIs
		performances = append(performances, perf)
	}

	log.Info().
		Str("tenant_id", tenantID.String()).
		Int("content_count", len(performances)).
		Msg("Retrieved content performance")

	return performances, nil
}

// GetEngagementTrends retrieves time-series engagement data
func (s *MarketingAnalyticsService) GetEngagementTrends(ctx context.Context, tenantID uuid.UUID, startDate, endDate time.Time) ([]EngagementTrend, error) {
	if tenantID == uuid.Nil {
		return nil, fmt.Errorf("tenant ID is required")
	}

	if startDate.IsZero() || endDate.IsZero() {
		return nil, fmt.Errorf("start and end dates are required")
	}

	if endDate.Before(startDate) {
		return nil, fmt.Errorf("end date must be after start date")
	}

	// Get calendar entries in date range
	filter := &domain.CalendarFilter{
		TenantID:  tenantID,
		StartDate: &startDate,
		EndDate:   &endDate,
		PageSize:  10000,
	}

	entries, _, err := s.calendarRepo.List(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to get calendar entries: %w", err)
	}

	// Group by day
	buckets := make(map[time.Time]*EngagementTrend)

	for _, entry := range entries {
		if entry.PublishedAt == nil {
			continue
		}

		// Get day bucket
		day := s.getDayBucket(*entry.PublishedAt)

		if buckets[day] == nil {
			buckets[day] = &EngagementTrend{
				Timestamp: day,
				Label:     day.Format("2006-01-02"),
			}
		}

		trend := buckets[day]
		trend.ContentCount++

		// Note: Performance metrics would come from external platform APIs
	}

	// Convert to slice
	trends := make([]EngagementTrend, 0, len(buckets))
	for _, trend := range buckets {
		if trend.Impressions > 0 {
			trend.EngagementRate = (float64(trend.Engagement) / float64(trend.Impressions)) * 100
		}
		trends = append(trends, *trend)
	}

	// Sort by timestamp
	s.sortEngagementTrends(trends)

	log.Info().
		Str("tenant_id", tenantID.String()).
		Int("trend_points", len(trends)).
		Msg("Calculated engagement trends")

	return trends, nil
}

// GetAudienceGrowth retrieves follower growth metrics (placeholder - requires channel integration data)
func (s *MarketingAnalyticsService) GetAudienceGrowth(ctx context.Context, tenantID uuid.UUID) ([]AudienceGrowth, error) {
	if tenantID == uuid.Nil {
		return nil, fmt.Errorf("tenant ID is required")
	}

	// TODO: Implement actual audience growth tracking
	// This would require:
	// 1. Periodic polling of channel APIs for follower counts
	// 2. Storing historical follower data
	// 3. Calculating growth rates

	// Return empty for now
	growth := []AudienceGrowth{}

	log.Info().
		Str("tenant_id", tenantID.String()).
		Msg("Audience growth not yet implemented")

	return growth, nil
}

// Helper methods

func (s *MarketingAnalyticsService) getDayBucket(t time.Time) time.Time {
	year, month, day := t.Date()
	return time.Date(year, month, day, 0, 0, 0, 0, t.Location())
}

func (s *MarketingAnalyticsService) sortEngagementTrends(trends []EngagementTrend) {
	// Bubble sort by timestamp ascending
	for i := 0; i < len(trends)-1; i++ {
		for j := i + 1; j < len(trends); j++ {
			if trends[j].Timestamp.Before(trends[i].Timestamp) {
				trends[i], trends[j] = trends[j], trends[i]
			}
		}
	}
}
