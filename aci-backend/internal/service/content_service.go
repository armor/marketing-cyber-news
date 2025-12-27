package service

import (
	"context"
	"fmt"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/repository"
)

// ContentSelectionCriteria defines the criteria for selecting content for a segment
type ContentSelectionCriteria struct {
	SegmentID        uuid.UUID   `json:"segment_id"`
	ConfigurationID  uuid.UUID   `json:"configuration_id"`
	TopicTags        []string    `json:"topic_tags,omitempty"`
	FrameworkTags    []string    `json:"framework_tags,omitempty"`
	IndustryTags     []string    `json:"industry_tags,omitempty"`
	ContentTypes     []string    `json:"content_types,omitempty"`
	FreshnessDays    int         `json:"freshness_days"`
	MaxBlocks        int         `json:"max_blocks"`
	EducationRatioMin float64    `json:"education_ratio_min"`
	MinTrustScore    float64     `json:"min_trust_score"`
	MinRelevanceScore float64    `json:"min_relevance_score"`
	ExcludeItemIDs   []uuid.UUID `json:"exclude_item_ids,omitempty"`
}

// ContentRecommendation represents a recommended content item with scoring
type ContentRecommendation struct {
	ContentItem    *domain.ContentItem `json:"content_item"`
	RecommendScore float64             `json:"recommend_score"`
	FreshnessScore float64             `json:"freshness_score"`
	RelevanceScore float64             `json:"relevance_score"`
	TrustScore     float64             `json:"trust_score"`
	CTRScore       float64             `json:"ctr_score"`
	IsEducational  bool                `json:"is_educational"`
	Reason         string              `json:"reason"`
}

// ContentSelectionResult contains the result of content selection
type ContentSelectionResult struct {
	Recommendations    []*ContentRecommendation `json:"recommendations"`
	TotalAvailable     int                      `json:"total_available"`
	EducationalCount   int                      `json:"educational_count"`
	PromotionalCount   int                      `json:"promotional_count"`
	EducationRatio     float64                  `json:"education_ratio"`
	SelectionCriteria  *ContentSelectionCriteria `json:"selection_criteria"`
}

// ContentService handles content selection and management for newsletters
type ContentService struct {
	contentItemRepo  repository.ContentItemRepository
	contentSourceRepo repository.ContentSourceRepository
	segmentRepo      repository.SegmentRepository
	configRepo       repository.NewsletterConfigRepository
	auditLogRepo     repository.AuditLogRepository
}

// NewContentService creates a new content service
func NewContentService(
	contentItemRepo repository.ContentItemRepository,
	contentSourceRepo repository.ContentSourceRepository,
	segmentRepo repository.SegmentRepository,
	configRepo repository.NewsletterConfigRepository,
	auditLogRepo repository.AuditLogRepository,
) *ContentService {
	if contentItemRepo == nil {
		panic("contentItemRepo cannot be nil")
	}
	if contentSourceRepo == nil {
		panic("contentSourceRepo cannot be nil")
	}
	if segmentRepo == nil {
		panic("segmentRepo cannot be nil")
	}
	if configRepo == nil {
		panic("configRepo cannot be nil")
	}
	if auditLogRepo == nil {
		panic("auditLogRepo cannot be nil")
	}

	return &ContentService{
		contentItemRepo:   contentItemRepo,
		contentSourceRepo: contentSourceRepo,
		segmentRepo:       segmentRepo,
		configRepo:        configRepo,
		auditLogRepo:      auditLogRepo,
	}
}

// GetContentForSegment retrieves and ranks content for a specific segment
func (s *ContentService) GetContentForSegment(ctx context.Context, criteria *ContentSelectionCriteria) (*ContentSelectionResult, error) {
	if criteria == nil {
		return nil, fmt.Errorf("selection criteria cannot be nil")
	}

	if criteria.SegmentID == uuid.Nil {
		return nil, fmt.Errorf("segment ID is required")
	}

	if criteria.ConfigurationID == uuid.Nil {
		return nil, fmt.Errorf("configuration ID is required")
	}

	// Get segment details
	segment, err := s.segmentRepo.GetByID(ctx, criteria.SegmentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get segment: %w", err)
	}

	// Get configuration for content preferences
	config, err := s.configRepo.GetByID(ctx, criteria.ConfigurationID)
	if err != nil {
		return nil, fmt.Errorf("failed to get configuration: %w", err)
	}

	// Merge criteria with segment and config settings
	mergedCriteria := s.mergeCriteria(criteria, segment, config)

	// Build content filter
	filter := s.buildContentFilter(mergedCriteria)

	// Fetch content items
	items, total, err := s.contentItemRepo.List(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to list content items: %w", err)
	}

	// Score and rank content
	recommendations := s.scoreAndRankContent(items, mergedCriteria)

	// Apply education ratio balancing
	balanced := s.balanceEducationRatio(recommendations, mergedCriteria.EducationRatioMin, mergedCriteria.MaxBlocks)

	// Calculate final stats
	educationalCount := 0
	promotionalCount := 0
	for _, rec := range balanced {
		if rec.IsEducational {
			educationalCount++
		} else {
			promotionalCount++
		}
	}

	educationRatio := 0.0
	if len(balanced) > 0 {
		educationRatio = float64(educationalCount) / float64(len(balanced))
	}

	result := &ContentSelectionResult{
		Recommendations:   balanced,
		TotalAvailable:    total,
		EducationalCount:  educationalCount,
		PromotionalCount:  promotionalCount,
		EducationRatio:    educationRatio,
		SelectionCriteria: mergedCriteria,
	}

	log.Info().
		Str("segment_id", criteria.SegmentID.String()).
		Str("config_id", criteria.ConfigurationID.String()).
		Int("total_available", total).
		Int("selected", len(balanced)).
		Float64("education_ratio", educationRatio).
		Msg("Content selected for segment")

	return result, nil
}

// mergeCriteria merges selection criteria with segment and config settings
func (s *ContentService) mergeCriteria(criteria *ContentSelectionCriteria, segment *domain.Segment, config *domain.NewsletterConfiguration) *ContentSelectionCriteria {
	merged := &ContentSelectionCriteria{
		SegmentID:         criteria.SegmentID,
		ConfigurationID:   criteria.ConfigurationID,
		TopicTags:         criteria.TopicTags,
		FrameworkTags:     criteria.FrameworkTags,
		IndustryTags:      criteria.IndustryTags,
		ContentTypes:      criteria.ContentTypes,
		FreshnessDays:     criteria.FreshnessDays,
		MaxBlocks:         criteria.MaxBlocks,
		EducationRatioMin: criteria.EducationRatioMin,
		MinTrustScore:     criteria.MinTrustScore,
		MinRelevanceScore: criteria.MinRelevanceScore,
		ExcludeItemIDs:    criteria.ExcludeItemIDs,
	}

	// Apply segment topic interests if not specified
	if len(merged.TopicTags) == 0 && len(segment.TopicInterests) > 0 {
		merged.TopicTags = segment.TopicInterests
	}

	// Apply segment industries if not specified
	if len(merged.IndustryTags) == 0 && len(segment.Industries) > 0 {
		merged.IndustryTags = segment.Industries
	}

	// Apply segment compliance frameworks if not specified
	if len(merged.FrameworkTags) == 0 && len(segment.ComplianceFrameworks) > 0 {
		merged.FrameworkTags = segment.ComplianceFrameworks
	}

	// Apply config defaults if not specified
	if merged.FreshnessDays == 0 {
		merged.FreshnessDays = config.ContentFreshnessDays
	}

	if merged.MaxBlocks == 0 {
		merged.MaxBlocks = config.MaxBlocks
	}

	if merged.EducationRatioMin == 0 {
		merged.EducationRatioMin = config.EducationRatioMin
	}

	return merged
}

// buildContentFilter creates a filter from selection criteria
func (s *ContentService) buildContentFilter(criteria *ContentSelectionCriteria) *domain.ContentItemFilter {
	isActive := true

	// Calculate published after date based on freshness
	publishedAfter := time.Now().AddDate(0, 0, -criteria.FreshnessDays)

	filter := &domain.ContentItemFilter{
		TopicTags:       criteria.TopicTags,
		FrameworkTags:   criteria.FrameworkTags,
		IndustryTags:    criteria.IndustryTags,
		IsActive:        &isActive,
		PublishedAfter:  &publishedAfter,
		FreshnessDays:   &criteria.FreshnessDays,
		Limit:           criteria.MaxBlocks * 5, // Fetch more to allow for filtering
		Offset:          0,
	}

	if criteria.MinTrustScore > 0 {
		filter.MinTrustScore = &criteria.MinTrustScore
	}

	if criteria.MinRelevanceScore > 0 {
		filter.MinRelevanceScore = &criteria.MinRelevanceScore
	}

	return filter
}

// scoreAndRankContent scores and ranks content items
func (s *ContentService) scoreAndRankContent(items []*domain.ContentItem, criteria *ContentSelectionCriteria) []*ContentRecommendation {
	recommendations := make([]*ContentRecommendation, 0, len(items))

	excludeSet := make(map[uuid.UUID]bool)
	for _, id := range criteria.ExcludeItemIDs {
		excludeSet[id] = true
	}

	for _, item := range items {
		// Skip excluded items
		if excludeSet[item.ID] {
			continue
		}

		rec := s.scoreContentItem(item, criteria)
		recommendations = append(recommendations, rec)
	}

	// Sort by recommendation score (descending)
	sort.Slice(recommendations, func(i, j int) bool {
		return recommendations[i].RecommendScore > recommendations[j].RecommendScore
	})

	return recommendations
}

// scoreContentItem calculates scores for a single content item
func (s *ContentService) scoreContentItem(item *domain.ContentItem, criteria *ContentSelectionCriteria) *ContentRecommendation {
	// Calculate freshness score (0-1, with more recent being higher)
	freshnessScore := s.calculateFreshnessScore(item.PublishDate, criteria.FreshnessDays)

	// Calculate relevance score based on tag matching
	relevanceScore := s.calculateRelevanceScore(item, criteria)

	// Trust score is already on the item
	trustScore := item.TrustScore

	// Calculate CTR score (normalized)
	ctrScore := s.calculateCTRScore(item)

	// Determine if educational based on content type
	isEducational := s.isEducationalContent(item.ContentType)

	// Calculate composite recommendation score with weights
	weights := map[string]float64{
		"freshness": 0.25,
		"relevance": 0.30,
		"trust":     0.25,
		"ctr":       0.20,
	}

	recommendScore := (freshnessScore * weights["freshness"]) +
		(relevanceScore * weights["relevance"]) +
		(trustScore * weights["trust"]) +
		(ctrScore * weights["ctr"])

	reason := s.generateReasonText(freshnessScore, relevanceScore, trustScore, ctrScore, isEducational)

	return &ContentRecommendation{
		ContentItem:    item,
		RecommendScore: recommendScore,
		FreshnessScore: freshnessScore,
		RelevanceScore: relevanceScore,
		TrustScore:     trustScore,
		CTRScore:       ctrScore,
		IsEducational:  isEducational,
		Reason:         reason,
	}
}

// calculateFreshnessScore calculates a freshness score based on publish date
func (s *ContentService) calculateFreshnessScore(publishDate time.Time, maxDays int) float64 {
	if maxDays <= 0 {
		maxDays = 7
	}

	daysSincePublish := time.Since(publishDate).Hours() / 24

	if daysSincePublish <= 0 {
		return 1.0
	}

	if daysSincePublish >= float64(maxDays) {
		return 0.0
	}

	// Linear decay
	return 1.0 - (daysSincePublish / float64(maxDays))
}

// calculateRelevanceScore calculates relevance based on tag matching
func (s *ContentService) calculateRelevanceScore(item *domain.ContentItem, criteria *ContentSelectionCriteria) float64 {
	if len(criteria.TopicTags) == 0 && len(criteria.FrameworkTags) == 0 && len(criteria.IndustryTags) == 0 {
		// No criteria, use item's base relevance score
		return item.RelevanceScore
	}

	totalTags := len(criteria.TopicTags) + len(criteria.FrameworkTags) + len(criteria.IndustryTags)
	if totalTags == 0 {
		return item.RelevanceScore
	}

	matchedTags := 0

	// Check topic tag matches
	for _, criteriaTag := range criteria.TopicTags {
		for _, itemTag := range item.TopicTags {
			if criteriaTag == itemTag {
				matchedTags++
				break
			}
		}
	}

	// Check framework tag matches
	for _, criteriaTag := range criteria.FrameworkTags {
		for _, itemTag := range item.FrameworkTags {
			if criteriaTag == itemTag {
				matchedTags++
				break
			}
		}
	}

	// Check industry tag matches
	for _, criteriaTag := range criteria.IndustryTags {
		for _, itemTag := range item.IndustryTags {
			if criteriaTag == itemTag {
				matchedTags++
				break
			}
		}
	}

	// Combine item relevance with tag match ratio
	tagMatchRatio := float64(matchedTags) / float64(totalTags)
	return (item.RelevanceScore*0.5 + tagMatchRatio*0.5)
}

// calculateCTRScore normalizes historical CTR to 0-1 range
func (s *ContentService) calculateCTRScore(item *domain.ContentItem) float64 {
	// Historical CTR is already 0-1
	if item.HistoricalCTR > 0 {
		return item.HistoricalCTR
	}

	// For new content without CTR history, use a neutral score
	return 0.5
}

// isEducationalContent determines if content type is educational
func (s *ContentService) isEducationalContent(contentType domain.ContentType) bool {
	educationalTypes := map[domain.ContentType]bool{
		domain.ContentTypeBlog:      true,
		domain.ContentTypeCaseStudy: true,
		domain.ContentTypeWebinar:   true,
	}

	return educationalTypes[contentType]
}

// generateReasonText generates a human-readable reason for the recommendation
func (s *ContentService) generateReasonText(freshness, relevance, trust, ctr float64, isEducational bool) string {
	reasons := make([]string, 0)

	if freshness >= 0.8 {
		reasons = append(reasons, "very recent")
	} else if freshness >= 0.5 {
		reasons = append(reasons, "fresh content")
	}

	if relevance >= 0.8 {
		reasons = append(reasons, "highly relevant")
	} else if relevance >= 0.5 {
		reasons = append(reasons, "relevant")
	}

	if trust >= 0.9 {
		reasons = append(reasons, "trusted source")
	}

	if ctr >= 0.7 {
		reasons = append(reasons, "high engagement")
	}

	if isEducational {
		reasons = append(reasons, "educational")
	} else {
		reasons = append(reasons, "promotional")
	}

	if len(reasons) == 0 {
		return "meets basic criteria"
	}

	return fmt.Sprintf("Selected: %s", joinWithAnd(reasons))
}

// joinWithAnd joins strings with commas and "and" for the last item
func joinWithAnd(items []string) string {
	if len(items) == 0 {
		return ""
	}
	if len(items) == 1 {
		return items[0]
	}
	if len(items) == 2 {
		return items[0] + " and " + items[1]
	}

	result := ""
	for i, item := range items {
		if i == len(items)-1 {
			result += "and " + item
		} else {
			result += item + ", "
		}
	}
	return result
}

// balanceEducationRatio ensures the education-to-promotional ratio meets requirements
func (s *ContentService) balanceEducationRatio(recommendations []*ContentRecommendation, minRatio float64, maxBlocks int) []*ContentRecommendation {
	if len(recommendations) == 0 {
		return recommendations
	}

	if maxBlocks <= 0 {
		maxBlocks = len(recommendations)
	}

	if maxBlocks > len(recommendations) {
		maxBlocks = len(recommendations)
	}

	// Separate educational and promotional content
	educational := make([]*ContentRecommendation, 0)
	promotional := make([]*ContentRecommendation, 0)

	for _, rec := range recommendations {
		if rec.IsEducational {
			educational = append(educational, rec)
		} else {
			promotional = append(promotional, rec)
		}
	}

	// Calculate required educational count
	requiredEducational := int(float64(maxBlocks) * minRatio)
	if requiredEducational > len(educational) {
		requiredEducational = len(educational)
	}

	// Calculate promotional slots
	promotionalSlots := maxBlocks - requiredEducational
	if promotionalSlots > len(promotional) {
		// If we can't fill promotional slots, add more educational
		promotionalSlots = len(promotional)
		requiredEducational = maxBlocks - promotionalSlots
		if requiredEducational > len(educational) {
			requiredEducational = len(educational)
		}
	}

	// Build balanced result
	result := make([]*ContentRecommendation, 0, maxBlocks)

	// Add educational content
	for i := 0; i < requiredEducational && i < len(educational); i++ {
		result = append(result, educational[i])
	}

	// Add promotional content
	for i := 0; i < promotionalSlots && i < len(promotional); i++ {
		result = append(result, promotional[i])
	}

	// Sort by score again to interleave properly
	sort.Slice(result, func(i, j int) bool {
		return result[i].RecommendScore > result[j].RecommendScore
	})

	return result
}

// CreateContentItem creates a new content item
func (s *ContentService) CreateContentItem(ctx context.Context, item *domain.ContentItem) error {
	if item == nil {
		return fmt.Errorf("content item cannot be nil")
	}

	now := time.Now()
	item.ID = uuid.New()
	item.CreatedAt = now
	item.UpdatedAt = now
	item.IsActive = true

	if err := item.Validate(); err != nil {
		return fmt.Errorf("content item validation failed: %w", err)
	}

	if err := s.contentItemRepo.Create(ctx, item); err != nil {
		return fmt.Errorf("failed to create content item: %w", err)
	}

	log.Info().
		Str("item_id", item.ID.String()).
		Str("title", item.Title).
		Msg("Content item created")

	return nil
}

// GetContentItemByID retrieves a content item by ID
func (s *ContentService) GetContentItemByID(ctx context.Context, id uuid.UUID) (*domain.ContentItem, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("content item ID is required")
	}

	return s.contentItemRepo.GetByID(ctx, id)
}

// ListContentItems lists content items with filtering
func (s *ContentService) ListContentItems(ctx context.Context, filter *domain.ContentItemFilter) ([]*domain.ContentItem, int, error) {
	if filter == nil {
		filter = &domain.ContentItemFilter{
			Limit:  20,
			Offset: 0,
		}
	}

	if filter.Limit <= 0 {
		filter.Limit = 20
	}

	return s.contentItemRepo.List(ctx, filter)
}

// UpdateContentItem updates an existing content item
func (s *ContentService) UpdateContentItem(ctx context.Context, item *domain.ContentItem) error {
	if item == nil {
		return fmt.Errorf("content item cannot be nil")
	}

	if item.ID == uuid.Nil {
		return fmt.Errorf("content item ID is required")
	}

	existing, err := s.contentItemRepo.GetByID(ctx, item.ID)
	if err != nil {
		return fmt.Errorf("content item not found: %w", err)
	}

	item.CreatedAt = existing.CreatedAt
	item.UpdatedAt = time.Now()

	if err := item.Validate(); err != nil {
		return fmt.Errorf("content item validation failed: %w", err)
	}

	if err := s.contentItemRepo.Update(ctx, item); err != nil {
		return fmt.Errorf("failed to update content item: %w", err)
	}

	log.Info().
		Str("item_id", item.ID.String()).
		Str("title", item.Title).
		Msg("Content item updated")

	return nil
}

// DeleteContentItem deletes a content item
func (s *ContentService) DeleteContentItem(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("content item ID is required")
	}

	if err := s.contentItemRepo.Delete(ctx, id); err != nil {
		return fmt.Errorf("failed to delete content item: %w", err)
	}

	log.Info().
		Str("item_id", id.String()).
		Msg("Content item deleted")

	return nil
}

// CreateContentSource creates a new content source
func (s *ContentService) CreateContentSource(ctx context.Context, source *domain.ContentSource) error {
	if source == nil {
		return fmt.Errorf("content source cannot be nil")
	}

	now := time.Now()
	source.ID = uuid.New()
	source.CreatedAt = now
	source.UpdatedAt = now
	source.IsActive = true

	if err := source.Validate(); err != nil {
		return fmt.Errorf("content source validation failed: %w", err)
	}

	if err := s.contentSourceRepo.Create(ctx, source); err != nil {
		return fmt.Errorf("failed to create content source: %w", err)
	}

	// Create audit log entry
	resourceID := source.ID
	auditLog := &domain.AuditLog{
		ID:           uuid.New(),
		Action:       "content_source_created",
		ResourceType: "content_source",
		ResourceID:   &resourceID,
		UserID:       &source.CreatedBy,
		CreatedAt:    now,
	}
	if err := s.auditLogRepo.Create(ctx, auditLog); err != nil {
		log.Error().Err(err).Str("source_id", source.ID.String()).Msg("Failed to create audit log for content source creation")
	}

	log.Info().
		Str("source_id", source.ID.String()).
		Str("name", source.Name).
		Msg("Content source created")

	return nil
}

// GetContentSourceByID retrieves a content source by ID
func (s *ContentService) GetContentSourceByID(ctx context.Context, id uuid.UUID) (*domain.ContentSource, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("content source ID is required")
	}

	return s.contentSourceRepo.GetByID(ctx, id)
}

// ListContentSources lists content sources with filtering
func (s *ContentService) ListContentSources(ctx context.Context, filter *domain.ContentSourceFilter) ([]*domain.ContentSource, int, error) {
	if filter == nil {
		filter = &domain.ContentSourceFilter{
			Limit:  20,
			Offset: 0,
		}
	}

	if filter.Limit <= 0 {
		filter.Limit = 20
	}

	return s.contentSourceRepo.List(ctx, filter)
}

// UpdateContentSource updates an existing content source
func (s *ContentService) UpdateContentSource(ctx context.Context, source *domain.ContentSource) error {
	if source == nil {
		return fmt.Errorf("content source cannot be nil")
	}

	if source.ID == uuid.Nil {
		return fmt.Errorf("content source ID is required")
	}

	existing, err := s.contentSourceRepo.GetByID(ctx, source.ID)
	if err != nil {
		return fmt.Errorf("content source not found: %w", err)
	}

	source.CreatedAt = existing.CreatedAt
	source.CreatedBy = existing.CreatedBy
	source.UpdatedAt = time.Now()

	if err := source.Validate(); err != nil {
		return fmt.Errorf("content source validation failed: %w", err)
	}

	if err := s.contentSourceRepo.Update(ctx, source); err != nil {
		return fmt.Errorf("failed to update content source: %w", err)
	}

	log.Info().
		Str("source_id", source.ID.String()).
		Str("name", source.Name).
		Msg("Content source updated")

	return nil
}

// DeleteContentSource deletes a content source
func (s *ContentService) DeleteContentSource(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("content source ID is required")
	}

	if err := s.contentSourceRepo.Delete(ctx, id); err != nil {
		return fmt.Errorf("failed to delete content source: %w", err)
	}

	log.Info().
		Str("source_id", id.String()).
		Msg("Content source deleted")

	return nil
}

// GetActiveSources retrieves all active content sources for polling
func (s *ContentService) GetActiveSources(ctx context.Context) ([]*domain.ContentSource, error) {
	return s.contentSourceRepo.GetActiveSources(ctx)
}

// UpdateSourcePollingStatus updates the polling status for a content source
func (s *ContentService) UpdateSourcePollingStatus(ctx context.Context, id uuid.UUID, success bool, errorMsg *string) error {
	if id == uuid.Nil {
		return fmt.Errorf("content source ID is required")
	}

	now := time.Now()
	if err := s.contentSourceRepo.UpdateLastPolled(ctx, id, now, success, errorMsg); err != nil {
		return fmt.Errorf("failed to update polling status: %w", err)
	}

	return nil
}

// BulkCreateContentItems creates multiple content items
func (s *ContentService) BulkCreateContentItems(ctx context.Context, items []*domain.ContentItem) error {
	if len(items) == 0 {
		return nil
	}

	now := time.Now()
	for _, item := range items {
		item.ID = uuid.New()
		item.CreatedAt = now
		item.UpdatedAt = now
		item.IsActive = true

		if err := item.Validate(); err != nil {
			return fmt.Errorf("content item validation failed: %w", err)
		}
	}

	if err := s.contentItemRepo.BulkCreate(ctx, items); err != nil {
		return fmt.Errorf("failed to bulk create content items: %w", err)
	}

	log.Info().
		Int("count", len(items)).
		Msg("Content items bulk created")

	return nil
}

// GetFreshContent retrieves fresh content with topic matching
func (s *ContentService) GetFreshContent(ctx context.Context, daysThreshold int, topicTags []string, limit int) ([]*domain.ContentItem, error) {
	if daysThreshold <= 0 {
		daysThreshold = 7
	}

	if limit <= 0 {
		limit = 20
	}

	return s.contentItemRepo.GetFreshContent(ctx, daysThreshold, topicTags, limit)
}

// FeedTestResult represents the result of testing an RSS/Atom feed
type FeedTestResult struct {
	IsValid      bool      `json:"is_valid"`
	Title        string    `json:"title,omitempty"`
	ItemCount    int       `json:"item_count"`
	LastUpdated  time.Time `json:"last_updated,omitempty"`
	ErrorMessage string    `json:"error_message,omitempty"`
}

// TestFeed tests an RSS/Atom feed URL and returns feed information
func (s *ContentService) TestFeed(ctx context.Context, feedURL string) (*FeedTestResult, error) {
	if feedURL == "" {
		return nil, fmt.Errorf("feed URL is required")
	}

	// Validate URL format
	if _, err := validateURL(feedURL); err != nil {
		return &FeedTestResult{
			IsValid:      false,
			ErrorMessage: fmt.Sprintf("invalid URL format: %v", err),
		}, nil
	}

	// TODO: Implement actual RSS/Atom feed parsing using a library like gofeed
	// For now, return a mock implementation that validates the URL
	result := &FeedTestResult{
		IsValid:      true,
		Title:        "Feed Test",
		ItemCount:    0,
		LastUpdated:  time.Now(),
		ErrorMessage: "Feed parsing not yet implemented - URL validation passed",
	}

	log.Info().
		Str("feed_url", feedURL).
		Bool("is_valid", result.IsValid).
		Msg("Feed test completed")

	return result, nil
}

// PollingStatus represents the polling status of a content source
type PollingStatus struct {
	LastPolledAt  *time.Time `json:"last_polled_at,omitempty"`
	NextPollAt    *time.Time `json:"next_poll_at,omitempty"`
	LastSuccessAt *time.Time `json:"last_success_at,omitempty"`
	ItemCount     int        `json:"item_count"`
	ErrorCount    int        `json:"error_count"`
	LastError     *string    `json:"last_error,omitempty"`
}

// GetPollingStatus retrieves the polling status for a content source
func (s *ContentService) GetPollingStatus(ctx context.Context, sourceID uuid.UUID) (*PollingStatus, error) {
	if sourceID == uuid.Nil {
		return nil, fmt.Errorf("content source ID is required")
	}

	source, err := s.contentSourceRepo.GetByID(ctx, sourceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get content source: %w", err)
	}

	// Calculate next poll time
	var nextPollAt *time.Time
	if source.LastPolledAt != nil {
		next := source.LastPolledAt.Add(time.Duration(source.PollIntervalMinutes) * time.Minute)
		nextPollAt = &next
	}

	// Get item count for this source
	isActive := true
	filter := &domain.ContentItemFilter{
		SourceID: &sourceID,
		IsActive: &isActive,
		Limit:    1,
		Offset:   0,
	}

	_, itemCount, err := s.contentItemRepo.List(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to count content items: %w", err)
	}

	status := &PollingStatus{
		LastPolledAt:  source.LastPolledAt,
		NextPollAt:    nextPollAt,
		LastSuccessAt: source.LastSuccessAt,
		ItemCount:     itemCount,
		ErrorCount:    source.ErrorCount,
		LastError:     source.LastError,
	}

	return status, nil
}

// validateURL validates a URL string format
func validateURL(urlStr string) (string, error) {
	if urlStr == "" {
		return "", fmt.Errorf("URL is empty")
	}

	// Basic URL validation - check for scheme and host
	if len(urlStr) < 10 {
		return "", fmt.Errorf("URL too short")
	}

	// Check for http:// or https://
	if urlStr[:7] != "http://" && urlStr[:8] != "https://" {
		return "", fmt.Errorf("URL must start with http:// or https://")
	}

	return urlStr, nil
}
