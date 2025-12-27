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

// GenerationRequest contains the parameters for generating a newsletter issue
type GenerationRequest struct {
	ConfigurationID uuid.UUID   `json:"configuration_id"`
	SegmentID       uuid.UUID   `json:"segment_id"`
	IssueDate       time.Time   `json:"issue_date"`
	CreatedBy       *uuid.UUID  `json:"created_by,omitempty"`
	TopicOverrides  []string    `json:"topic_overrides,omitempty"`
	HeroContentID   *uuid.UUID  `json:"hero_content_id,omitempty"`
	ExcludeItemIDs  []uuid.UUID `json:"exclude_item_ids,omitempty"`
}

// GenerationResult contains the result of issue generation
type GenerationResult struct {
	Issue                *domain.NewsletterIssue  `json:"issue"`
	Blocks               []*domain.NewsletterBlock `json:"blocks"`
	ContentRecommendations []*ContentRecommendation `json:"content_recommendations"`
	BrandVoiceValidation *BrandVoiceValidationResult `json:"brand_voice_validation,omitempty"`
	GenerationMetadata   map[string]interface{}   `json:"generation_metadata"`
}

// GenerationService handles newsletter issue generation
type GenerationService struct {
	issueRepo          repository.NewsletterIssueRepository
	blockRepo          repository.NewsletterBlockRepository
	configRepo         repository.NewsletterConfigRepository
	segmentRepo        repository.SegmentRepository
	contentService     *ContentService
	brandVoiceService  *BrandVoiceService
	auditLogRepo       repository.AuditLogRepository
	contactRepo        repository.ContactRepository
	webinarResourceURL string
}

// NewGenerationService creates a new generation service
func NewGenerationService(
	issueRepo repository.NewsletterIssueRepository,
	blockRepo repository.NewsletterBlockRepository,
	configRepo repository.NewsletterConfigRepository,
	segmentRepo repository.SegmentRepository,
	contentService *ContentService,
	brandVoiceService *BrandVoiceService,
	auditLogRepo repository.AuditLogRepository,
	contactRepo repository.ContactRepository,
	webinarResourceURL string,
) *GenerationService {
	if issueRepo == nil {
		panic("issueRepo cannot be nil")
	}
	if blockRepo == nil {
		panic("blockRepo cannot be nil")
	}
	if configRepo == nil {
		panic("configRepo cannot be nil")
	}
	if segmentRepo == nil {
		panic("segmentRepo cannot be nil")
	}
	if contentService == nil {
		panic("contentService cannot be nil")
	}
	if brandVoiceService == nil {
		panic("brandVoiceService cannot be nil")
	}
	if auditLogRepo == nil {
		panic("auditLogRepo cannot be nil")
	}
	if contactRepo == nil {
		panic("contactRepo cannot be nil")
	}

	return &GenerationService{
		issueRepo:          issueRepo,
		blockRepo:          blockRepo,
		configRepo:         configRepo,
		segmentRepo:        segmentRepo,
		contentService:     contentService,
		brandVoiceService:  brandVoiceService,
		auditLogRepo:       auditLogRepo,
		contactRepo:        contactRepo,
		webinarResourceURL: webinarResourceURL,
	}
}

// CreateDraftIssue generates a new draft newsletter issue
func (s *GenerationService) CreateDraftIssue(ctx context.Context, req *GenerationRequest) (*GenerationResult, error) {
	if req == nil {
		return nil, fmt.Errorf("generation request cannot be nil")
	}

	if req.ConfigurationID == uuid.Nil {
		return nil, fmt.Errorf("configuration ID is required")
	}

	if req.SegmentID == uuid.Nil {
		return nil, fmt.Errorf("segment ID is required")
	}

	// Get configuration
	config, err := s.configRepo.GetByID(ctx, req.ConfigurationID)
	if err != nil {
		return nil, fmt.Errorf("failed to get configuration: %w", err)
	}

	// Get segment
	segment, err := s.segmentRepo.GetByID(ctx, req.SegmentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get segment: %w", err)
	}

	// Get next issue number
	nextNumber, err := s.issueRepo.GetNextIssueNumber(ctx, req.ConfigurationID)
	if err != nil {
		return nil, fmt.Errorf("failed to get next issue number: %w", err)
	}

	// Build content selection criteria
	topicTags := req.TopicOverrides
	if len(topicTags) == 0 {
		topicTags = segment.TopicInterests
	}

	criteria := &ContentSelectionCriteria{
		SegmentID:         req.SegmentID,
		ConfigurationID:   req.ConfigurationID,
		TopicTags:         topicTags,
		FrameworkTags:     segment.ComplianceFrameworks,
		IndustryTags:      segment.Industries,
		FreshnessDays:     config.ContentFreshnessDays,
		MaxBlocks:         config.MaxBlocks,
		EducationRatioMin: config.EducationRatioMin,
		MinTrustScore:     0.5,
		MinRelevanceScore: 0.3,
		ExcludeItemIDs:    req.ExcludeItemIDs,
	}

	// Get content recommendations
	contentResult, err := s.contentService.GetContentForSegment(ctx, criteria)
	if err != nil {
		return nil, fmt.Errorf("failed to get content for segment: %w", err)
	}

	// Determine issue date
	issueDate := req.IssueDate
	if issueDate.IsZero() {
		issueDate = time.Now()
	}

	now := time.Now()

	// Generate subject lines
	subjectLines := s.generateSubjectLines(config, segment, contentResult)

	// Create the issue
	issue := &domain.NewsletterIssue{
		ID:              uuid.New(),
		ConfigurationID: req.ConfigurationID,
		SegmentID:       req.SegmentID,
		IssueNumber:     nextNumber,
		IssueDate:       issueDate,
		SubjectLines:    subjectLines,
		Status:          domain.IssueStatusDraft,
		Version:         1,
		AIModelUsed:     stringPtr(config.AIModel),
		PromptVersionUsed: intPtr(config.PromptVersion),
		GenerationMetadata: map[string]interface{}{
			"generated_at":    now.Format(time.RFC3339),
			"content_count":   len(contentResult.Recommendations),
			"education_ratio": contentResult.EducationRatio,
			"ai_provider":     config.AIProvider,
			"segment_name":    segment.Name,
		},
		CreatedBy: req.CreatedBy,
		CreatedAt: now,
		UpdatedAt: now,
	}

	// Generate intro template
	introTemplate := s.generateIntroTemplate(config, segment)
	issue.IntroTemplate = &introTemplate

	// Create blocks from recommendations
	blocks := s.createBlocksFromRecommendations(issue.ID, contentResult.Recommendations, req.HeroContentID)

	// Validate the issue
	if err := issue.Validate(); err != nil {
		return nil, fmt.Errorf("issue validation failed: %w", err)
	}

	// Save issue
	if err := s.issueRepo.Create(ctx, issue); err != nil {
		return nil, fmt.Errorf("failed to create issue: %w", err)
	}

	// Save blocks
	if len(blocks) > 0 {
		if err := s.blockRepo.BulkCreate(ctx, blocks); err != nil {
			// Rollback issue creation
			_ = s.issueRepo.Delete(ctx, issue.ID)
			return nil, fmt.Errorf("failed to create blocks: %w", err)
		}
	}

	// Attach blocks to issue for return
	issueBlocks := make([]domain.NewsletterBlock, 0, len(blocks))
	for _, b := range blocks {
		issueBlocks = append(issueBlocks, *b)
	}
	issue.Blocks = issueBlocks

	// Run brand voice validation
	contentToValidate := s.buildContentForValidation(issue, blocks)
	brandVoiceResult, err := s.brandVoiceService.ValidateCopy(ctx, req.ConfigurationID, contentToValidate)
	if err != nil {
		log.Warn().Err(err).Str("issue_id", issue.ID.String()).Msg("Brand voice validation failed")
	}

	// Create audit log
	resourceID := issue.ID
	auditLog := &domain.AuditLog{
		ID:           uuid.New(),
		Action:       "newsletter_issue_generated",
		ResourceType: "newsletter_issue",
		ResourceID:   &resourceID,
		UserID:       req.CreatedBy,
		CreatedAt:    now,
	}
	if err := s.auditLogRepo.Create(ctx, auditLog); err != nil {
		log.Error().Err(err).Str("issue_id", issue.ID.String()).Msg("Failed to create audit log for issue generation")
	}

	log.Info().
		Str("issue_id", issue.ID.String()).
		Int("issue_number", nextNumber).
		Int("block_count", len(blocks)).
		Str("segment_id", req.SegmentID.String()).
		Msg("Newsletter issue generated")

	return &GenerationResult{
		Issue:                  issue,
		Blocks:                 blocks,
		ContentRecommendations: contentResult.Recommendations,
		BrandVoiceValidation:   brandVoiceResult,
		GenerationMetadata:     issue.GenerationMetadata,
	}, nil
}

// generateSubjectLines creates subject line options based on style
func (s *GenerationService) generateSubjectLines(config *domain.NewsletterConfiguration, segment *domain.Segment, content *ContentSelectionResult) []string {
	// In a real implementation, this would call an AI service
	// For now, generate template-based subject lines

	segmentName := segment.Name
	contentCount := len(content.Recommendations)

	lines := make([]string, 0, 3)

	switch config.SubjectLineStyle {
	case domain.StylePainFirst:
		lines = append(lines,
			fmt.Sprintf("Critical Security Updates for %s Professionals", segmentName),
			fmt.Sprintf("%d New Threats Your Team Should Know About", contentCount),
			fmt.Sprintf("Security Alert: What %s Teams Need to Address Now", segmentName),
		)
	case domain.StyleOpportunityFirst:
		lines = append(lines,
			fmt.Sprintf("Strengthen Your Security Posture: %d Key Insights", contentCount),
			fmt.Sprintf("Opportunities to Enhance Your %s Security Program", segmentName),
			fmt.Sprintf("This Week's Security Intelligence for %s", segmentName),
		)
	case domain.StyleVisionary:
		lines = append(lines,
			fmt.Sprintf("The Future of Security: Insights for %s Leaders", segmentName),
			fmt.Sprintf("Tomorrow's Security Landscape: %d Trends to Watch", contentCount),
			fmt.Sprintf("Shaping the Future: Security Innovation for %s", segmentName),
		)
	default:
		lines = append(lines,
			fmt.Sprintf("Weekly Security Digest for %s", segmentName),
			fmt.Sprintf("Your %d Security Updates This Week", contentCount),
			fmt.Sprintf("Security Insights: %s Edition", segmentName),
		)
	}

	return lines
}

// generateIntroTemplate creates an intro template for the newsletter
func (s *GenerationService) generateIntroTemplate(config *domain.NewsletterConfiguration, segment *domain.Segment) string {
	// In a real implementation, this would call an AI service
	// For now, return a template-based intro

	switch config.SubjectLineStyle {
	case domain.StylePainFirst:
		return fmt.Sprintf("This week brings critical security updates that demand your attention. As %s professionals, staying ahead of emerging threats is essential. Here's what you need to know.", segment.Name)
	case domain.StyleOpportunityFirst:
		return fmt.Sprintf("Welcome to this week's security insights designed specifically for %s teams. We've curated the most relevant updates to help strengthen your security posture.", segment.Name)
	case domain.StyleVisionary:
		return fmt.Sprintf("The security landscape continues to evolve at a rapid pace. For %s leaders, understanding these changes is key to building a resilient organization. Let's explore what's on the horizon.", segment.Name)
	default:
		return fmt.Sprintf("Welcome to your weekly security digest. We've gathered the most relevant updates for %s professionals. Here's what's new in the world of cybersecurity.", segment.Name)
	}
}

// createBlocksFromRecommendations creates newsletter blocks from content recommendations
func (s *GenerationService) createBlocksFromRecommendations(issueID uuid.UUID, recommendations []*ContentRecommendation, heroContentID *uuid.UUID) []*domain.NewsletterBlock {
	blocks := make([]*domain.NewsletterBlock, 0, len(recommendations))
	now := time.Now()
	position := 0

	// If hero content is specified, find and promote it
	heroIndex := -1
	if heroContentID != nil {
		for i, rec := range recommendations {
			if rec.ContentItem.ID == *heroContentID {
				heroIndex = i
				break
			}
		}
	}

	// Create hero block if we have a hero
	if heroIndex >= 0 {
		heroRec := recommendations[heroIndex]
		block := s.createBlockFromRecommendation(issueID, heroRec, position, domain.BlockTypeHero)
		blocks = append(blocks, block)
		position++
	}

	// Create remaining blocks
	for i, rec := range recommendations {
		if i == heroIndex {
			continue // Skip hero, already added
		}

		blockType := domain.BlockTypeContent
		if rec.IsEducational {
			blockType = domain.BlockTypeNews
		}

		block := s.createBlockFromRecommendation(issueID, rec, position, blockType)
		block.CreatedAt = now
		block.UpdatedAt = now
		blocks = append(blocks, block)
		position++
	}

	return blocks
}

// createBlockFromRecommendation creates a single block from a recommendation
func (s *GenerationService) createBlockFromRecommendation(issueID uuid.UUID, rec *ContentRecommendation, position int, blockType domain.BlockType) *domain.NewsletterBlock {
	now := time.Now()
	item := rec.ContentItem

	block := &domain.NewsletterBlock{
		ID:            uuid.New(),
		IssueID:       issueID,
		ContentItemID: &item.ID,
		BlockType:     blockType,
		Position:      position,
		Title:         &item.Title,
		Teaser:        item.Summary,
		CTALabel:      stringPtr("Read More"),
		CTAURL:        &item.URL,
		IsPromotional: !rec.IsEducational,
		TopicTags:     item.TopicTags,
		Clicks:        0,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	return block
}

// buildContentForValidation builds content structure for brand voice validation
func (s *GenerationService) buildContentForValidation(issue *domain.NewsletterIssue, blocks []*domain.NewsletterBlock) *ContentToValidate {
	content := &ContentToValidate{
		Blocks: make([]BlockContent, 0, len(blocks)),
	}

	if len(issue.SubjectLines) > 0 {
		content.SubjectLine = issue.SubjectLines[0]
		if len(issue.SubjectLines) > 1 {
			content.AlternativeSubjectLines = issue.SubjectLines[1:]
		}
	}

	if issue.IntroTemplate != nil {
		content.Intro = *issue.IntroTemplate
	}

	for _, block := range blocks {
		bc := BlockContent{}
		if block.Title != nil {
			bc.Title = *block.Title
		}
		if block.Teaser != nil {
			bc.Teaser = *block.Teaser
		}
		if block.CTALabel != nil {
			bc.CTALabel = *block.CTALabel
		}
		content.Blocks = append(content.Blocks, bc)
	}

	return content
}

// RegenerateSubjectLines regenerates subject lines for an existing issue
func (s *GenerationService) RegenerateSubjectLines(ctx context.Context, issueID uuid.UUID, style *domain.SubjectLineStyle) error {
	if issueID == uuid.Nil {
		return fmt.Errorf("issue ID is required")
	}

	issue, err := s.issueRepo.GetByID(ctx, issueID)
	if err != nil {
		return fmt.Errorf("failed to get issue: %w", err)
	}

	if !issue.IsEditable() {
		return fmt.Errorf("issue is not editable in status: %s", issue.Status)
	}

	config, err := s.configRepo.GetByID(ctx, issue.ConfigurationID)
	if err != nil {
		return fmt.Errorf("failed to get configuration: %w", err)
	}

	segment, err := s.segmentRepo.GetByID(ctx, issue.SegmentID)
	if err != nil {
		return fmt.Errorf("failed to get segment: %w", err)
	}

	// Override style if provided
	usedStyle := config.SubjectLineStyle
	if style != nil {
		usedStyle = *style
	}

	tempConfig := *config
	tempConfig.SubjectLineStyle = usedStyle

	// Get content for subject line generation
	criteria := &ContentSelectionCriteria{
		SegmentID:       issue.SegmentID,
		ConfigurationID: issue.ConfigurationID,
		MaxBlocks:       len(issue.Blocks),
	}

	contentResult, err := s.contentService.GetContentForSegment(ctx, criteria)
	if err != nil {
		return fmt.Errorf("failed to get content for segment: %w", err)
	}

	// Regenerate subject lines
	newSubjectLines := s.generateSubjectLines(&tempConfig, segment, contentResult)
	issue.SubjectLines = newSubjectLines
	issue.SelectedSubjectLine = nil // Clear selection
	issue.Version++
	issue.UpdatedAt = time.Now()

	if err := s.issueRepo.Update(ctx, issue); err != nil {
		return fmt.Errorf("failed to update issue: %w", err)
	}

	log.Info().
		Str("issue_id", issueID.String()).
		Int("new_lines_count", len(newSubjectLines)).
		Msg("Subject lines regenerated")

	return nil
}

// SelectSubjectLine selects a subject line for an issue
func (s *GenerationService) SelectSubjectLine(ctx context.Context, issueID uuid.UUID, subjectLine string) error {
	if issueID == uuid.Nil {
		return fmt.Errorf("issue ID is required")
	}

	if subjectLine == "" {
		return fmt.Errorf("subject line is required")
	}

	issue, err := s.issueRepo.GetByID(ctx, issueID)
	if err != nil {
		return fmt.Errorf("failed to get issue: %w", err)
	}

	if !issue.IsEditable() {
		return fmt.Errorf("issue is not editable in status: %s", issue.Status)
	}

	// Verify subject line is in the list
	found := false
	for _, line := range issue.SubjectLines {
		if line == subjectLine {
			found = true
			break
		}
	}

	if !found {
		// Allow custom subject lines by adding to the list
		issue.SubjectLines = append(issue.SubjectLines, subjectLine)
	}

	issue.SelectedSubjectLine = &subjectLine
	issue.UpdatedAt = time.Now()

	if err := s.issueRepo.Update(ctx, issue); err != nil {
		return fmt.Errorf("failed to update issue: %w", err)
	}

	log.Info().
		Str("issue_id", issueID.String()).
		Str("subject_line", subjectLine).
		Msg("Subject line selected")

	return nil
}

// SubmitForApproval transitions an issue to pending approval status
func (s *GenerationService) SubmitForApproval(ctx context.Context, issueID uuid.UUID) error {
	if issueID == uuid.Nil {
		return fmt.Errorf("issue ID is required")
	}

	issue, err := s.issueRepo.GetByID(ctx, issueID)
	if err != nil {
		return fmt.Errorf("failed to get issue: %w", err)
	}

	if !issue.CanTransitionTo(domain.IssueStatusPendingApproval) {
		return fmt.Errorf("cannot submit issue for approval from status: %s", issue.Status)
	}

	// Validate issue is complete
	if issue.SelectedSubjectLine == nil || *issue.SelectedSubjectLine == "" {
		return fmt.Errorf("subject line must be selected before submitting for approval")
	}

	// Get blocks
	blocks, err := s.blockRepo.GetByIssueID(ctx, issueID)
	if err != nil {
		return fmt.Errorf("failed to get blocks: %w", err)
	}

	if len(blocks) == 0 {
		return fmt.Errorf("issue must have at least one block before submitting for approval")
	}

	// Run brand voice validation
	content := s.buildContentForValidationFromIssue(issue, blocks)
	validationResult, err := s.brandVoiceService.ValidateCopy(ctx, issue.ConfigurationID, content)
	if err != nil {
		log.Warn().Err(err).Str("issue_id", issueID.String()).Msg("Brand voice validation failed during approval submission")
	}

	// Check for validation errors (not warnings)
	if validationResult != nil && validationResult.ErrorCount > 0 {
		return fmt.Errorf("brand voice validation failed with %d errors - please resolve before submitting", validationResult.ErrorCount)
	}

	// Update status
	if err := s.issueRepo.UpdateStatus(ctx, issueID, domain.IssueStatusPendingApproval); err != nil {
		return fmt.Errorf("failed to update issue status: %w", err)
	}

	// Create audit log
	resourceID := issueID
	auditLog := &domain.AuditLog{
		ID:           uuid.New(),
		Action:       "newsletter_issue_submitted_for_approval",
		ResourceType: "newsletter_issue",
		ResourceID:   &resourceID,
		UserID:       issue.CreatedBy,
		CreatedAt:    time.Now(),
	}
	if err := s.auditLogRepo.Create(ctx, auditLog); err != nil {
		log.Error().Err(err).Str("issue_id", issueID.String()).Msg("Failed to create audit log for approval submission")
	}

	log.Info().
		Str("issue_id", issueID.String()).
		Msg("Issue submitted for approval")

	return nil
}

// buildContentForValidationFromIssue builds validation content from issue and blocks
func (s *GenerationService) buildContentForValidationFromIssue(issue *domain.NewsletterIssue, blocks []*domain.NewsletterBlock) *ContentToValidate {
	content := &ContentToValidate{
		Blocks: make([]BlockContent, 0, len(blocks)),
	}

	if issue.SelectedSubjectLine != nil {
		content.SubjectLine = *issue.SelectedSubjectLine
	} else if len(issue.SubjectLines) > 0 {
		content.SubjectLine = issue.SubjectLines[0]
		if len(issue.SubjectLines) > 1 {
			content.AlternativeSubjectLines = issue.SubjectLines[1:]
		}
	}

	if issue.Preheader != nil {
		content.Preheader = *issue.Preheader
	}

	if issue.IntroTemplate != nil {
		content.Intro = *issue.IntroTemplate
	}

	for _, block := range blocks {
		bc := BlockContent{}
		if block.Title != nil {
			bc.Title = *block.Title
		}
		if block.Teaser != nil {
			bc.Teaser = *block.Teaser
		}
		if block.CTALabel != nil {
			bc.CTALabel = *block.CTALabel
		}
		content.Blocks = append(content.Blocks, bc)
	}

	return content
}

// GetIssueByID retrieves an issue by ID with blocks
func (s *GenerationService) GetIssueByID(ctx context.Context, id uuid.UUID) (*domain.NewsletterIssue, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("issue ID is required")
	}

	issue, err := s.issueRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get issue: %w", err)
	}

	// Fetch blocks
	blocks, err := s.blockRepo.GetByIssueID(ctx, id)
	if err != nil {
		log.Warn().Err(err).Str("issue_id", id.String()).Msg("Failed to get blocks for issue")
	} else {
		issueBlocks := make([]domain.NewsletterBlock, 0, len(blocks))
		for _, b := range blocks {
			issueBlocks = append(issueBlocks, *b)
		}
		issue.Blocks = issueBlocks
	}

	return issue, nil
}

// ListIssues lists newsletter issues with filtering
func (s *GenerationService) ListIssues(ctx context.Context, filter *domain.NewsletterIssueFilter) ([]*domain.NewsletterIssue, int, error) {
	if filter == nil {
		filter = &domain.NewsletterIssueFilter{
			Limit:  20,
			Offset: 0,
		}
	}

	if filter.Limit <= 0 {
		filter.Limit = 20
	}

	return s.issueRepo.List(ctx, filter)
}

// UpdateIssue updates an existing issue
func (s *GenerationService) UpdateIssue(ctx context.Context, issue *domain.NewsletterIssue) error {
	if issue == nil {
		return fmt.Errorf("issue cannot be nil")
	}

	if issue.ID == uuid.Nil {
		return fmt.Errorf("issue ID is required")
	}

	existing, err := s.issueRepo.GetByID(ctx, issue.ID)
	if err != nil {
		return fmt.Errorf("issue not found: %w", err)
	}

	if !existing.IsEditable() {
		return fmt.Errorf("issue is not editable in status: %s", existing.Status)
	}

	issue.CreatedAt = existing.CreatedAt
	issue.CreatedBy = existing.CreatedBy
	issue.UpdatedAt = time.Now()
	issue.Version = existing.Version + 1

	if err := issue.Validate(); err != nil {
		return fmt.Errorf("issue validation failed: %w", err)
	}

	if err := s.issueRepo.Update(ctx, issue); err != nil {
		return fmt.Errorf("failed to update issue: %w", err)
	}

	log.Info().
		Str("issue_id", issue.ID.String()).
		Int("version", issue.Version).
		Msg("Issue updated")

	return nil
}

// DeleteIssue deletes an issue and its blocks
func (s *GenerationService) DeleteIssue(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("issue ID is required")
	}

	issue, err := s.issueRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("issue not found: %w", err)
	}

	if issue.Status == domain.IssueStatusSent {
		return fmt.Errorf("cannot delete sent issues")
	}

	// Delete blocks first (due to foreign key)
	blocks, _ := s.blockRepo.GetByIssueID(ctx, id)
	for _, block := range blocks {
		_ = s.blockRepo.Delete(ctx, block.ID)
	}

	if err := s.issueRepo.Delete(ctx, id); err != nil {
		return fmt.Errorf("failed to delete issue: %w", err)
	}

	log.Info().
		Str("issue_id", id.String()).
		Msg("Issue deleted")

	return nil
}

// BuildPersonalizationContext extracts contact fields for template substitution
// FR-031: Personalize intro with contact-specific context
func (s *GenerationService) BuildPersonalizationContext(contact *domain.Contact) map[string]interface{} {
	if contact == nil {
		return make(map[string]interface{})
	}

	context := make(map[string]interface{})

	// Basic contact fields with null safety
	if contact.FirstName != nil {
		context["first_name"] = *contact.FirstName
	} else {
		context["first_name"] = ""
	}

	if contact.LastName != nil {
		context["last_name"] = *contact.LastName
	} else {
		context["last_name"] = ""
	}

	if contact.Company != nil {
		context["company"] = *contact.Company
	} else {
		context["company"] = ""
	}

	if contact.JobTitle != nil {
		context["title"] = *contact.JobTitle
	} else {
		context["title"] = ""
	}

	if contact.RoleCategory != nil {
		context["role"] = *contact.RoleCategory
	} else {
		context["role"] = ""
	}

	if contact.Industry != nil {
		context["industry"] = *contact.Industry
	} else {
		context["industry"] = ""
	}

	// Behavioral context - FR-032: Adjust content based on behavioral signals
	context["engagement_score"] = contact.EngagementScore

	if len(contact.Last10Interactions) > 0 {
		recentTopics := make([]string, 0)
		for _, interaction := range contact.Last10Interactions {
			if interaction.Topic != "" {
				recentTopics = append(recentTopics, interaction.Topic)
			}
		}
		context["recent_topics"] = recentTopics
	} else {
		context["recent_topics"] = []string{}
	}

	if contact.LastWebinarAttendance != nil {
		context["webinar_attendance"] = contact.LastWebinarAttendance.Format(time.RFC3339)
		context["has_attended_webinar"] = true
	} else {
		context["webinar_attendance"] = ""
		context["has_attended_webinar"] = false
	}

	if contact.TopicScores != nil && len(contact.TopicScores) > 0 {
		context["product_interests"] = contact.TopicScores
	} else {
		context["product_interests"] = make(map[string]float64)
	}

	// Partner-specific data - FR-033: Partner-aware content selection
	context["is_partner"] = len(contact.PartnerTags) > 0
	if len(contact.PartnerTags) > 0 {
		context["partner_tags"] = contact.PartnerTags
	} else {
		context["partner_tags"] = []string{}
	}

	return context
}

// ApplyPersonalization personalizes an issue for a specific contact
// FR-031, FR-032, FR-033: Comprehensive personalization
func (s *GenerationService) ApplyPersonalization(ctx context.Context, issueID uuid.UUID, contactID uuid.UUID) (*domain.NewsletterIssue, error) {
	if issueID == uuid.Nil {
		return nil, fmt.Errorf("issue ID is required")
	}

	if contactID == uuid.Nil {
		return nil, fmt.Errorf("contact ID is required")
	}

	// Fetch the issue
	issue, err := s.issueRepo.GetByID(ctx, issueID)
	if err != nil {
		return nil, fmt.Errorf("failed to get issue: %w", err)
	}

	// Fetch the contact
	contact, err := s.contactRepo.GetByID(ctx, contactID)
	if err != nil {
		return nil, fmt.Errorf("failed to get contact: %w", err)
	}

	// Build personalization context
	personalizationContext := s.BuildPersonalizationContext(contact)

	// Create a personalized copy of the issue (don't modify the original)
	personalizedIssue := *issue

	// Apply field tokens to intro template - FR-031
	if issue.IntroTemplate != nil {
		personalizedIntro := s.substituteTokens(*issue.IntroTemplate, personalizationContext)
		personalizedIssue.IntroTemplate = &personalizedIntro
	}

	// Apply field tokens to subject line
	if issue.SelectedSubjectLine != nil {
		personalizedSubject := s.substituteTokens(*issue.SelectedSubjectLine, personalizationContext)
		personalizedIssue.SelectedSubjectLine = &personalizedSubject
	}

	// Apply field tokens to preheader
	if issue.Preheader != nil {
		personalizedPreheader := s.substituteTokens(*issue.Preheader, personalizationContext)
		personalizedIssue.Preheader = &personalizedPreheader
	}

	// Fetch blocks
	blocks, err := s.blockRepo.GetByIssueID(ctx, issueID)
	if err != nil {
		return nil, fmt.Errorf("failed to get blocks: %w", err)
	}

	// Handle behavioral adjustments - FR-032
	personalizedBlocks := make([]domain.NewsletterBlock, 0, len(blocks))
	for _, block := range blocks {
		personalizedBlock := *block

		// Apply token substitution to block content
		if block.Title != nil {
			personalizedTitle := s.substituteTokens(*block.Title, personalizationContext)
			personalizedBlock.Title = &personalizedTitle
		}

		if block.Teaser != nil {
			personalizedTeaser := s.substituteTokens(*block.Teaser, personalizationContext)
			personalizedBlock.Teaser = &personalizedTeaser
		}

		if block.CTALabel != nil {
			personalizedCTA := s.substituteTokens(*block.CTALabel, personalizationContext)
			personalizedBlock.CTALabel = &personalizedCTA
		}

		personalizedBlocks = append(personalizedBlocks, personalizedBlock)
	}

	// Add webinar follow-up block if applicable - FR-032
	if s.shouldIncludeWebinarFollowUp(contact) {
		webinarBlock := s.createWebinarFollowUpBlock(issueID, len(personalizedBlocks), personalizationContext)
		personalizedBlocks = append(personalizedBlocks, *webinarBlock)
	}

	// Select partner-aware content - FR-033
	if len(contact.PartnerTags) > 0 {
		personalizedBlocks = s.selectPartnerContent(personalizedBlocks, contact)
	}

	personalizedIssue.Blocks = personalizedBlocks

	return &personalizedIssue, nil
}

// substituteTokens replaces template tokens with values from context
func (s *GenerationService) substituteTokens(text string, context map[string]interface{}) string {
	if text == "" {
		return text
	}

	result := text

	// Replace simple field tokens
	for key, value := range context {
		token := fmt.Sprintf("{{%s}}", key)

		var replacement string
		switch v := value.(type) {
		case string:
			replacement = v
		case int:
			replacement = fmt.Sprintf("%d", v)
		case float64:
			replacement = fmt.Sprintf("%.2f", v)
		case bool:
			replacement = fmt.Sprintf("%t", v)
		case []string:
			// Skip array types for simple substitution
			continue
		case map[string]float64:
			// Skip map types for simple substitution
			continue
		default:
			// Skip unknown types
			continue
		}

		result = strings.ReplaceAll(result, token, replacement)
	}

	return result
}

// shouldIncludeWebinarFollowUp determines if webinar follow-up content should be included
// FR-032: Behavioral adjustments based on recent activity
func (s *GenerationService) shouldIncludeWebinarFollowUp(contact *domain.Contact) bool {
	if contact == nil {
		return false
	}

	if contact.LastWebinarAttendance == nil {
		return false
	}

	// Include follow-up if webinar was attended in last 7 days
	daysSinceWebinar := time.Since(*contact.LastWebinarAttendance).Hours() / 24
	return daysSinceWebinar <= 7
}

// selectPartnerContent selects partner-aware content blocks
// FR-033: Partner-aware content selection
func (s *GenerationService) selectPartnerContent(blocks []domain.NewsletterBlock, contact *domain.Contact) []domain.NewsletterBlock {
	if contact == nil || len(contact.PartnerTags) == 0 {
		return blocks
	}

	// Filter blocks to include partner-relevant content
	partnerBlocks := make([]domain.NewsletterBlock, 0, len(blocks))

	for _, block := range blocks {
		// Check if block has partner-relevant tags
		isPartnerRelevant := false
		for _, blockTag := range block.TopicTags {
			for _, partnerTag := range contact.PartnerTags {
				if blockTag == partnerTag {
					isPartnerRelevant = true
					break
				}
			}
			if isPartnerRelevant {
				break
			}
		}

		// Keep promotional blocks and partner-relevant content
		if block.IsPromotional || isPartnerRelevant || block.BlockType == domain.BlockTypeHero {
			partnerBlocks = append(partnerBlocks, block)
		}
	}

	// If no partner-specific content found, return original blocks
	if len(partnerBlocks) == 0 {
		return blocks
	}

	return partnerBlocks
}

// createWebinarFollowUpBlock creates a follow-up block for recent webinar attendees
// FR-032: Add behavioral follow-up content
func (s *GenerationService) createWebinarFollowUpBlock(issueID uuid.UUID, position int, context map[string]interface{}) *domain.NewsletterBlock {
	now := time.Now()

	title := "Thanks for Attending Our Recent Webinar!"
	teaser := "We hope you found the session valuable. Here are some resources to help you implement what you learned."
	ctaLabel := "Access Resources"
	ctaURL := s.webinarResourceURL
	if ctaURL == "" {
		ctaURL = "#" // Fallback to anchor if not configured
	}

	// Apply token substitution
	if firstName, ok := context["first_name"].(string); ok && firstName != "" {
		title = fmt.Sprintf("Thanks for Attending, %s!", firstName)
	}

	block := &domain.NewsletterBlock{
		ID:            uuid.New(),
		IssueID:       issueID,
		BlockType:     domain.BlockTypeContent,
		Position:      position,
		Title:         &title,
		Teaser:        &teaser,
		CTALabel:      &ctaLabel,
		CTAURL:        &ctaURL,
		IsPromotional: false,
		TopicTags:     []string{"webinar", "education"},
		Clicks:        0,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	return block
}

// =============================================================================
// Structured Personalization Methods (FR-031, FR-032, FR-033)
// =============================================================================

// PersonalizationContext contains personalization data for a contact
// This is the structured version as per FR-031, FR-032, FR-033
type PersonalizationContext struct {
	Contact      domain.Contact     `json:"contact"`
	FieldTokens  map[string]string  `json:"field_tokens"`  // name, company, role, etc.
	TopicWeights map[string]float64 `json:"topic_weights"` // Preferred topics based on history
	ContentTags  []string           `json:"content_tags"`  // Tags to prioritize (partner, etc.)
	ExcludeTags  []string           `json:"exclude_tags"`  // Tags to exclude
}

// BuildPersonalizationContextByID builds personalization context for a contact by ID
// FR-031, FR-032, FR-033: Build context from contact ID
func (s *GenerationService) BuildPersonalizationContextByID(ctx context.Context, contactID uuid.UUID) (*PersonalizationContext, error) {
	if contactID == uuid.Nil {
		return nil, fmt.Errorf("contact ID is required")
	}

	// Fetch the contact
	contact, err := s.contactRepo.GetByID(ctx, contactID)
	if err != nil {
		return nil, fmt.Errorf("failed to get contact: %w", err)
	}

	return s.buildStructuredPersonalizationContext(contact), nil
}

// buildStructuredPersonalizationContext builds a structured PersonalizationContext from a contact
func (s *GenerationService) buildStructuredPersonalizationContext(contact *domain.Contact) *PersonalizationContext {
	if contact == nil {
		return &PersonalizationContext{
			FieldTokens:  make(map[string]string),
			TopicWeights: make(map[string]float64),
			ContentTags:  []string{},
			ExcludeTags:  []string{},
		}
	}

	pctx := &PersonalizationContext{
		Contact:      *contact,
		FieldTokens:  make(map[string]string),
		TopicWeights: make(map[string]float64),
		ContentTags:  []string{},
		ExcludeTags:  []string{},
	}

	// Build field tokens
	if contact.FirstName != nil {
		pctx.FieldTokens["first_name"] = *contact.FirstName
	}

	if contact.LastName != nil {
		pctx.FieldTokens["last_name"] = *contact.LastName
	}

	if contact.Company != nil {
		pctx.FieldTokens["company"] = *contact.Company
	}

	if contact.JobTitle != nil {
		pctx.FieldTokens["title"] = *contact.JobTitle
		pctx.FieldTokens["role"] = *contact.JobTitle
	}

	if contact.RoleCategory != nil {
		pctx.FieldTokens["role_category"] = *contact.RoleCategory
	}

	if contact.Industry != nil {
		pctx.FieldTokens["industry"] = *contact.Industry
	}

	// Build topic weights from topic scores and interactions
	if contact.TopicScores != nil {
		for topic, score := range contact.TopicScores {
			pctx.TopicWeights[topic] = score
		}
	}

	// Add recent interaction topics to weights
	for _, interaction := range contact.Last10Interactions {
		if interaction.Topic != "" {
			if _, exists := pctx.TopicWeights[interaction.Topic]; !exists {
				pctx.TopicWeights[interaction.Topic] = 0.5 // Default weight for interacted topics
			} else {
				// Boost weight if already present
				pctx.TopicWeights[interaction.Topic] += 0.1
				if pctx.TopicWeights[interaction.Topic] > 1.0 {
					pctx.TopicWeights[interaction.Topic] = 1.0
				}
			}
		}
	}

	// Build content tags (partner tags)
	if len(contact.PartnerTags) > 0 {
		pctx.ContentTags = append(pctx.ContentTags, contact.PartnerTags...)
	}

	// Add webinar follow-up tag if applicable
	if s.shouldIncludeWebinarFollowUp(contact) {
		pctx.ContentTags = append(pctx.ContentTags, "webinar_followup")
	}

	// Exclude tags based on engagement level
	if contact.EngagementScore < 30 {
		// Low engagement - exclude highly technical content
		pctx.ExcludeTags = append(pctx.ExcludeTags, "technical_deep_dive", "advanced")
	}

	return pctx
}

// ApplyPersonalizationWithContext applies personalization using a PersonalizationContext
// FR-031, FR-032, FR-033: Apply personalization with structured context
func (s *GenerationService) ApplyPersonalizationWithContext(ctx context.Context, issue *domain.NewsletterIssue, pctx *PersonalizationContext) (*domain.NewsletterIssue, error) {
	if issue == nil {
		return nil, fmt.Errorf("issue cannot be nil")
	}

	if pctx == nil {
		return nil, fmt.Errorf("personalization context cannot be nil")
	}

	// Create a personalized copy of the issue
	personalizedIssue := *issue

	// Apply field tokens to intro template
	if issue.IntroTemplate != nil {
		personalizedIntro := s.RenderPersonalizedContent(*issue.IntroTemplate, pctx.FieldTokens)
		personalizedIssue.IntroTemplate = &personalizedIntro
	}

	// Apply field tokens to subject line
	if issue.SelectedSubjectLine != nil {
		personalizedSubject := s.RenderPersonalizedContent(*issue.SelectedSubjectLine, pctx.FieldTokens)
		personalizedIssue.SelectedSubjectLine = &personalizedSubject
	}

	// Apply field tokens to preheader
	if issue.Preheader != nil {
		personalizedPreheader := s.RenderPersonalizedContent(*issue.Preheader, pctx.FieldTokens)
		personalizedIssue.Preheader = &personalizedPreheader
	}

	// Fetch blocks
	blocks, err := s.blockRepo.GetByIssueID(ctx, issue.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get blocks: %w", err)
	}

	// Apply personalization to blocks
	personalizedBlocks := make([]domain.NewsletterBlock, 0, len(blocks))
	for _, block := range blocks {
		personalizedBlock := *block

		// Apply token substitution to block content
		if block.Title != nil {
			personalizedTitle := s.RenderPersonalizedContent(*block.Title, pctx.FieldTokens)
			personalizedBlock.Title = &personalizedTitle
		}

		if block.Teaser != nil {
			personalizedTeaser := s.RenderPersonalizedContent(*block.Teaser, pctx.FieldTokens)
			personalizedBlock.Teaser = &personalizedTeaser
		}

		if block.CTALabel != nil {
			personalizedCTA := s.RenderPersonalizedContent(*block.CTALabel, pctx.FieldTokens)
			personalizedBlock.CTALabel = &personalizedCTA
		}

		personalizedBlocks = append(personalizedBlocks, personalizedBlock)
	}

	// Add webinar follow-up block if applicable
	if contains(pctx.ContentTags, "webinar_followup") {
		webinarBlock := s.createWebinarFollowUpBlockWithContext(issue.ID, len(personalizedBlocks), pctx)
		personalizedBlocks = append(personalizedBlocks, *webinarBlock)
	}

	// Select partner-aware content
	if len(pctx.Contact.PartnerTags) > 0 {
		personalizedBlocks = s.selectPartnerContent(personalizedBlocks, &pctx.Contact)
	}

	// Filter by exclude tags
	if len(pctx.ExcludeTags) > 0 {
		personalizedBlocks = s.filterByExcludeTags(personalizedBlocks, pctx.ExcludeTags)
	}

	personalizedIssue.Blocks = personalizedBlocks

	return &personalizedIssue, nil
}

// RenderPersonalizedContent replaces template tokens with personalized values
// FR-031: Token substitution for personalization
func (s *GenerationService) RenderPersonalizedContent(content string, tokens map[string]string) string {
	if content == "" {
		return content
	}

	result := content

	// Replace all tokens
	for key, value := range tokens {
		token := fmt.Sprintf("{{%s}}", key)
		result = strings.ReplaceAll(result, token, value)
	}

	return result
}

// createWebinarFollowUpBlockWithContext creates a webinar follow-up block using PersonalizationContext
func (s *GenerationService) createWebinarFollowUpBlockWithContext(issueID uuid.UUID, position int, pctx *PersonalizationContext) *domain.NewsletterBlock {
	now := time.Now()

	title := "Thanks for Attending Our Recent Webinar!"
	if firstName, ok := pctx.FieldTokens["first_name"]; ok && firstName != "" {
		title = fmt.Sprintf("Thanks for Attending, %s!", firstName)
	}

	teaser := "We hope you found the session valuable. Here are some resources to help you implement what you learned."
	ctaLabel := "Access Resources"
	ctaURL := s.webinarResourceURL
	if ctaURL == "" {
		ctaURL = "#" // Fallback to anchor if not configured
	}

	block := &domain.NewsletterBlock{
		ID:            uuid.New(),
		IssueID:       issueID,
		BlockType:     domain.BlockTypeContent,
		Position:      position,
		Title:         &title,
		Teaser:        &teaser,
		CTALabel:      &ctaLabel,
		CTAURL:        &ctaURL,
		IsPromotional: false,
		TopicTags:     []string{"webinar", "education"},
		Clicks:        0,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	return block
}

// filterByExcludeTags filters blocks by exclude tags
func (s *GenerationService) filterByExcludeTags(blocks []domain.NewsletterBlock, excludeTags []string) []domain.NewsletterBlock {
	if len(excludeTags) == 0 {
		return blocks
	}

	filtered := make([]domain.NewsletterBlock, 0, len(blocks))

	for _, block := range blocks {
		shouldExclude := false

		// Check if block has any excluded tags
		for _, blockTag := range block.TopicTags {
			for _, excludeTag := range excludeTags {
				if blockTag == excludeTag {
					shouldExclude = true
					break
				}
			}
			if shouldExclude {
				break
			}
		}

		// Keep hero blocks even if they have excluded tags
		if !shouldExclude || block.BlockType == domain.BlockTypeHero {
			filtered = append(filtered, block)
		}
	}

	return filtered
}

// contains checks if a slice contains a string
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// Helper functions

// Helper functions

func stringPtr(s string) *string {
	return &s
}

func intPtr(i int) *int {
	return &i
}
