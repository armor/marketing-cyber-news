package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/repository"
)

// LLMClient defines the interface for AI content generation
type LLMClient interface {
	GenerateContent(ctx context.Context, prompt string, systemContext string) (string, error)
	RefineContent(ctx context.Context, originalContent string, action string) (string, error)
}

// N8nClient defines the interface for n8n workflow execution
type N8nClient interface {
	TriggerPublish(ctx context.Context, contentID uuid.UUID, channel domain.Channel) (*PublishResult, error)
}

// BrandService defines the interface for brand validation
type BrandService interface {
	GetBrandContext(ctx context.Context, tenantID uuid.UUID, topic string) (*domain.BrandContext, error)
	ValidateContent(ctx context.Context, tenantID uuid.UUID, content string) (*domain.BrandValidation, error)
}

// ContentStudioService handles AI content generation with brand validation
type ContentStudioService struct {
	contentRepo  repository.ContentItemRepository
	calendarRepo repository.CalendarEntryRepository
	brandService BrandService
	llmClient    LLMClient
	channelRepo  repository.ChannelConnectionRepository
	n8nClient    N8nClient
}

// NewContentStudioService creates a new content studio service
func NewContentStudioService(
	contentRepo repository.ContentItemRepository,
	calendarRepo repository.CalendarEntryRepository,
	brandService BrandService,
	llmClient LLMClient,
	channelRepo repository.ChannelConnectionRepository,
	n8nClient N8nClient,
) *ContentStudioService {
	if contentRepo == nil {
		panic("contentRepo cannot be nil")
	}
	if calendarRepo == nil {
		panic("calendarRepo cannot be nil")
	}
	if brandService == nil {
		panic("brandService cannot be nil")
	}
	if llmClient == nil {
		panic("llmClient cannot be nil")
	}
	if channelRepo == nil {
		panic("channelRepo cannot be nil")
	}
	if n8nClient == nil {
		panic("n8nClient cannot be nil")
	}

	return &ContentStudioService{
		contentRepo:  contentRepo,
		calendarRepo: calendarRepo,
		brandService: brandService,
		llmClient:    llmClient,
		channelRepo:  channelRepo,
		n8nClient:    n8nClient,
	}
}

// GenerateContentRequest for content generation
type GenerateContentRequest struct {
	TenantID    uuid.UUID
	CampaignID  *uuid.UUID
	Channel     domain.Channel
	ContentType string // post, article, thread
	Prompt      string
	Tone        string
	Length      string // short, medium, long
	Audience    string
	IncludesCTA bool
}

// GeneratedContent result
type GeneratedContent struct {
	ID              uuid.UUID               `json:"id"`
	Content         string                  `json:"content"`
	Channel         domain.Channel          `json:"channel"`
	ContentType     string                  `json:"content_type"`
	BrandScore      int                     `json:"brand_score"`
	BrandValidation *domain.BrandValidation `json:"brand_validation"`
	CharacterCount  int                     `json:"character_count"`
	CreatedAt       time.Time               `json:"created_at"`
}

// Generate generates content from a natural language prompt
func (s *ContentStudioService) Generate(ctx context.Context, req GenerateContentRequest) (*GeneratedContent, error) {
	if req.TenantID == uuid.Nil {
		return nil, fmt.Errorf("tenant_id is required")
	}

	if req.Prompt == "" {
		return nil, fmt.Errorf("prompt is required")
	}

	if !req.Channel.IsValid() {
		return nil, fmt.Errorf("invalid channel: %s", req.Channel)
	}

	// Get brand context from BrandService (use prompt as topic for RAG context)
	brandContext, err := s.brandService.GetBrandContext(ctx, req.TenantID, req.Prompt)
	if err != nil {
		return nil, fmt.Errorf("failed to get brand context: %w", err)
	}

	// Build content brief with channel-specific constraints
	brief := s.buildContentBrief(req, brandContext)

	// Build system context with brand guidelines
	systemContext := s.buildSystemContext(brandContext, req.Channel)

	// Call LLM to generate content
	generatedText, err := s.llmClient.GenerateContent(ctx, brief, systemContext)
	if err != nil {
		return nil, fmt.Errorf("failed to generate content: %w", err)
	}

	// Validate content against brand rules
	validation, err := s.brandService.ValidateContent(ctx, req.TenantID, generatedText)
	if err != nil {
		return nil, fmt.Errorf("failed to validate content: %w", err)
	}

	// Use auto-fixed content if available and better
	finalContent := generatedText
	if validation.AutoFixed && validation.FixedContent != "" {
		finalContent = validation.FixedContent
	}

	// Create content item in database
	now := time.Now()
	contentItem := &domain.ContentItem{
		ID:             uuid.New(),
		SourceID:       uuid.Nil, // Generated content doesn't have a source
		Title:          s.extractTitle(finalContent, req.ContentType),
		URL:            "", // No URL for generated content yet
		Summary:        &finalContent,
		Content:        &finalContent,
		ContentType:    domain.ContentType(req.ContentType),
		TopicTags:      s.extractTags(req.Prompt),
		TrustScore:     1.0, // Generated content is trusted by default
		RelevanceScore: 1.0,
		PublishDate:    now,
		IsActive:       true,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if err := s.contentRepo.Create(ctx, contentItem); err != nil {
		return nil, fmt.Errorf("failed to save content item: %w", err)
	}

	log.Info().
		Str("tenant_id", req.TenantID.String()).
		Str("content_id", contentItem.ID.String()).
		Str("channel", string(req.Channel)).
		Int("brand_score", validation.Score).
		Msg("Content generated successfully")

	return &GeneratedContent{
		ID:              contentItem.ID,
		Content:         finalContent,
		Channel:         req.Channel,
		ContentType:     req.ContentType,
		BrandScore:      validation.Score,
		BrandValidation: validation,
		CharacterCount:  len(finalContent),
		CreatedAt:       now,
	}, nil
}

// buildContentBrief creates a content generation prompt
func (s *ContentStudioService) buildContentBrief(req GenerateContentRequest, brandContext *domain.BrandContext) string {
	var builder strings.Builder

	builder.WriteString(fmt.Sprintf("Generate %s content for %s.\n\n", req.ContentType, req.Channel))
	builder.WriteString(fmt.Sprintf("Topic: %s\n\n", req.Prompt))

	if req.Tone != "" {
		builder.WriteString(fmt.Sprintf("Tone: %s\n", req.Tone))
	}

	if req.Audience != "" {
		builder.WriteString(fmt.Sprintf("Audience: %s\n", req.Audience))
	}

	if req.Length != "" {
		builder.WriteString(fmt.Sprintf("Length: %s\n", req.Length))
	}

	if req.IncludesCTA {
		builder.WriteString("Include a clear call-to-action.\n")
	}

	// Add channel-specific constraints
	builder.WriteString(fmt.Sprintf("\nChannel constraints for %s:\n", req.Channel))
	builder.WriteString(s.getChannelConstraints(req.Channel))

	// Add brand context if available
	if brandContext != nil && len(brandContext.VoiceExamples) > 0 {
		builder.WriteString("\n\nBrand voice examples:\n")
		for i, example := range brandContext.VoiceExamples {
			if i >= 3 {
				break // Limit to 3 examples
			}
			builder.WriteString(fmt.Sprintf("- %s\n", example))
		}
	}

	return builder.String()
}

// buildSystemContext creates system context with brand guidelines
func (s *ContentStudioService) buildSystemContext(brandContext *domain.BrandContext, channel domain.Channel) string {
	var builder strings.Builder

	builder.WriteString("You are a professional content writer creating high-quality content.\n\n")

	if brandContext != nil {
		if brandContext.BrandPersonality != "" {
			builder.WriteString(fmt.Sprintf("Brand personality: %s\n", brandContext.BrandPersonality))
		}

		if brandContext.ToneGuidelines != "" {
			builder.WriteString(fmt.Sprintf("Tone guidelines: %s\n", brandContext.ToneGuidelines))
		}

		if len(brandContext.ApprovedTerms) > 0 {
			builder.WriteString("\nApproved terminology:\n")
			for i, term := range brandContext.ApprovedTerms {
				if i >= 10 {
					break
				}
				builder.WriteString(fmt.Sprintf("- %s\n", term))
			}
		}

		if len(brandContext.BannedTerms) > 0 {
			builder.WriteString("\nAvoid these terms:\n")
			for i, term := range brandContext.BannedTerms {
				if i >= 10 {
					break
				}
				builder.WriteString(fmt.Sprintf("- %s", term.Term))
				if term.Replacement != "" {
					builder.WriteString(fmt.Sprintf(" (use: %s)", term.Replacement))
				}
				builder.WriteString("\n")
			}
		}
	}

	builder.WriteString(fmt.Sprintf("\nOptimize for %s platform.\n", channel))

	return builder.String()
}

// getChannelConstraints returns platform-specific constraints
func (s *ContentStudioService) getChannelConstraints(channel domain.Channel) string {
	switch channel {
	case domain.ChannelTwitter:
		return "- Maximum 280 characters\n- Make it punchy and engaging\n- Consider thread format for longer content"
	case domain.ChannelLinkedIn:
		return "- Ideal: 1300 characters\n- Professional tone\n- Use line breaks for readability\n- Include relevant hashtags"
	case domain.ChannelEmail:
		return "- Subject line: max 60 characters\n- Preview text: max 100 characters\n- Body: clear structure with headers"
	case domain.ChannelBlog:
		return "- SEO-optimized\n- Clear headings and subheadings\n- Include meta description (155 characters)"
	default:
		return "- Follow platform best practices"
	}
}

// extractTitle extracts or generates a title from content
func (s *ContentStudioService) extractTitle(content string, contentType string) string {
	lines := strings.Split(content, "\n")
	if len(lines) > 0 && len(lines[0]) > 0 {
		title := strings.TrimSpace(lines[0])
		// Remove markdown heading markers
		title = strings.TrimPrefix(title, "# ")
		if len(title) > 100 {
			title = title[:97] + "..."
		}
		return title
	}

	return fmt.Sprintf("Generated %s", contentType)
}

// extractTags extracts topic tags from prompt
func (s *ContentStudioService) extractTags(prompt string) []string {
	// Simple implementation - extract hashtags if present
	words := strings.Fields(prompt)
	tags := make([]string, 0)

	for _, word := range words {
		if strings.HasPrefix(word, "#") {
			tag := strings.TrimPrefix(word, "#")
			tags = append(tags, strings.ToLower(tag))
		}
	}

	if len(tags) == 0 {
		// Extract first few keywords
		for i, word := range words {
			if i >= 3 {
				break
			}
			if len(word) > 4 {
				tags = append(tags, strings.ToLower(word))
			}
		}
	}

	return tags
}

// RefineRequest refines existing content
type RefineRequest struct {
	ContentID uuid.UUID
	Action    string // shorter, longer, formal, casual, add_cta, remove_cta
}

// Refine refines existing content
func (s *ContentStudioService) Refine(ctx context.Context, req RefineRequest) (*GeneratedContent, error) {
	if req.ContentID == uuid.Nil {
		return nil, fmt.Errorf("content_id is required")
	}

	if req.Action == "" {
		return nil, fmt.Errorf("action is required")
	}

	// Get existing content
	contentItem, err := s.contentRepo.GetByID(ctx, req.ContentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get content: %w", err)
	}

	if contentItem.Content == nil {
		return nil, fmt.Errorf("content has no text to refine")
	}

	originalContent := *contentItem.Content

	// Call LLM to refine content
	refinedText, err := s.llmClient.RefineContent(ctx, originalContent, req.Action)
	if err != nil {
		return nil, fmt.Errorf("failed to refine content: %w", err)
	}

	// Update content item
	now := time.Now()
	contentItem.Content = &refinedText
	contentItem.Summary = &refinedText
	contentItem.UpdatedAt = now

	if err := s.contentRepo.Update(ctx, contentItem); err != nil {
		return nil, fmt.Errorf("failed to update content: %w", err)
	}

	log.Info().
		Str("content_id", req.ContentID.String()).
		Str("action", req.Action).
		Msg("Content refined successfully")

	return &GeneratedContent{
		ID:             contentItem.ID,
		Content:        refinedText,
		Channel:        domain.Channel(""), // Channel not tracked in ContentItem
		ContentType:    string(contentItem.ContentType),
		CharacterCount: len(refinedText),
		CreatedAt:      contentItem.CreatedAt,
	}, nil
}

// Validate re-validates content against current brand rules
func (s *ContentStudioService) Validate(ctx context.Context, contentID uuid.UUID) (*domain.BrandValidation, error) {
	if contentID == uuid.Nil {
		return nil, fmt.Errorf("content_id is required")
	}

	// Get content
	contentItem, err := s.contentRepo.GetByID(ctx, contentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get content: %w", err)
	}

	if contentItem.Content == nil {
		return nil, fmt.Errorf("content has no text to validate")
	}

	// Validate content (tenant ID would come from content item or context)
	// For now, using uuid.Nil as placeholder - should be from authenticated user context
	validation, err := s.brandService.ValidateContent(ctx, uuid.Nil, *contentItem.Content)
	if err != nil {
		return nil, fmt.Errorf("failed to validate content: %w", err)
	}

	log.Info().
		Str("content_id", contentID.String()).
		Int("brand_score", validation.Score).
		Int("issues", len(validation.Issues)).
		Msg("Content validated")

	return validation, nil
}

// ScheduleRequest schedules content for publishing
type ScheduleRequest struct {
	TenantID    uuid.UUID
	ContentID   uuid.UUID
	Channel     domain.Channel
	ScheduledAt time.Time
}

// Schedule schedules content for publishing
func (s *ContentStudioService) Schedule(ctx context.Context, req ScheduleRequest) (*domain.CalendarEntry, error) {
	if req.TenantID == uuid.Nil {
		return nil, fmt.Errorf("tenant_id is required")
	}

	if req.ContentID == uuid.Nil {
		return nil, fmt.Errorf("content_id is required")
	}

	if !req.Channel.IsValid() {
		return nil, fmt.Errorf("invalid channel: %s", req.Channel)
	}

	if req.ScheduledAt.IsZero() {
		return nil, fmt.Errorf("scheduled_at is required")
	}

	if req.ScheduledAt.Before(time.Now()) {
		return nil, fmt.Errorf("scheduled_at must be in the future")
	}

	// Verify content exists
	_, err := s.contentRepo.GetByID(ctx, req.ContentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get content: %w", err)
	}

	// Create calendar entry
	entry := domain.NewCalendarEntry(req.TenantID, req.Channel, req.ScheduledAt)
	entry.ContentID = &req.ContentID

	if err := s.calendarRepo.Create(ctx, entry); err != nil {
		return nil, fmt.Errorf("failed to create calendar entry: %w", err)
	}

	log.Info().
		Str("tenant_id", req.TenantID.String()).
		Str("content_id", req.ContentID.String()).
		Str("channel", string(req.Channel)).
		Time("scheduled_at", req.ScheduledAt).
		Msg("Content scheduled for publishing")

	return entry, nil
}

// PublishResult contains publishing result details
type PublishResult struct {
	PublishedURL string    `json:"published_url"`
	PublishedID  string    `json:"published_id"`
	PublishedAt  time.Time `json:"published_at"`
}

// Publish publishes content immediately
func (s *ContentStudioService) Publish(ctx context.Context, contentID uuid.UUID) (*PublishResult, error) {
	if contentID == uuid.Nil {
		return nil, fmt.Errorf("content_id is required")
	}

	// Get content to verify it exists
	_, err := s.contentRepo.GetByID(ctx, contentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get content: %w", err)
	}

	// For now, we need to determine channel from context or calendar entry
	// This is a simplification - in real implementation, channel should be explicit
	channel := domain.ChannelLinkedIn

	// Trigger n8n publishing workflow
	result, err := s.n8nClient.TriggerPublish(ctx, contentID, channel)
	if err != nil {
		return nil, fmt.Errorf("failed to publish content: %w", err)
	}

	log.Info().
		Str("content_id", contentID.String()).
		Str("published_id", result.PublishedID).
		Str("published_url", result.PublishedURL).
		Msg("Content published successfully")

	return result, nil
}

// GetContent retrieves a content item
func (s *ContentStudioService) GetContent(ctx context.Context, contentID uuid.UUID) (*GeneratedContent, error) {
	if contentID == uuid.Nil {
		return nil, fmt.Errorf("content_id is required")
	}

	item, err := s.contentRepo.GetByID(ctx, contentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get content: %w", err)
	}

	content := ""
	if item.Content != nil {
		content = *item.Content
	}

	return &GeneratedContent{
		ID:             item.ID,
		Content:        content,
		Channel:        domain.Channel(""), // Channel not tracked in ContentItem
		ContentType:    string(item.ContentType),
		CharacterCount: len(content),
		CreatedAt:      item.CreatedAt,
	}, nil
}
