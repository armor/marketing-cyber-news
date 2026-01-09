package service

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/phillipboles/aci-backend/internal/domain"
)

// Mock repositories for testing
type MockNewsletterBlockRepository struct {
	mock.Mock
}

func (m *MockNewsletterBlockRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.NewsletterBlock, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.NewsletterBlock), args.Error(1)
}

func (m *MockNewsletterBlockRepository) GetByIssueID(ctx context.Context, issueID uuid.UUID) ([]*domain.NewsletterBlock, error) {
	args := m.Called(ctx, issueID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.NewsletterBlock), args.Error(1)
}

func (m *MockNewsletterBlockRepository) Create(ctx context.Context, block *domain.NewsletterBlock) error {
	args := m.Called(ctx, block)
	return args.Error(0)
}

func (m *MockNewsletterBlockRepository) BulkCreate(ctx context.Context, blocks []*domain.NewsletterBlock) error {
	args := m.Called(ctx, blocks)
	return args.Error(0)
}

func (m *MockNewsletterBlockRepository) Update(ctx context.Context, block *domain.NewsletterBlock) error {
	args := m.Called(ctx, block)
	return args.Error(0)
}

func (m *MockNewsletterBlockRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockNewsletterBlockRepository) UpdatePosition(ctx context.Context, id uuid.UUID, position int) error {
	args := m.Called(ctx, id, position)
	return args.Error(0)
}

func (m *MockNewsletterBlockRepository) IncrementClicks(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockNewsletterBlockRepository) UpdatePositions(ctx context.Context, issueID uuid.UUID, positions map[uuid.UUID]int) error {
	args := m.Called(ctx, issueID, positions)
	return args.Error(0)
}

// Test BuildPersonalizationContext

func TestBuildPersonalizationContext_HappyPath(t *testing.T) {
	service := &GenerationService{}

	firstName := "John"
	lastName := "Doe"
	company := "Acme Corp"
	jobTitle := "Security Manager"
	roleCategory := "security_operations"
	industry := "healthcare"
	webinarTime := time.Now().Add(-3 * 24 * time.Hour) // 3 days ago

	contact := &domain.Contact{
		FirstName:             &firstName,
		LastName:              &lastName,
		Company:               &company,
		JobTitle:              &jobTitle,
		RoleCategory:          &roleCategory,
		Industry:              &industry,
		EngagementScore:       75.5,
		LastWebinarAttendance: &webinarTime,
		TopicScores: map[string]float64{
			"ransomware": 0.8,
			"compliance": 0.6,
		},
		PartnerTags: []string{"partner_a", "partner_b"},
		Last10Interactions: []domain.Interaction{
			{Type: "click", Topic: "ransomware", Timestamp: time.Now().Add(-48 * time.Hour)},
			{Type: "open", Topic: "compliance", Timestamp: time.Now().Add(-72 * time.Hour)},
		},
	}

	context := service.BuildPersonalizationContext(contact)

	assert.Equal(t, "John", context["first_name"])
	assert.Equal(t, "Doe", context["last_name"])
	assert.Equal(t, "Acme Corp", context["company"])
	assert.Equal(t, "Security Manager", context["title"])
	assert.Equal(t, "security_operations", context["role"])
	assert.Equal(t, "healthcare", context["industry"])
	assert.Equal(t, 75.5, context["engagement_score"])
	assert.Equal(t, true, context["has_attended_webinar"])
	assert.Equal(t, true, context["is_partner"])
	assert.Equal(t, []string{"partner_a", "partner_b"}, context["partner_tags"])

	recentTopics := context["recent_topics"].([]string)
	assert.Len(t, recentTopics, 2)
	assert.Contains(t, recentTopics, "ransomware")
	assert.Contains(t, recentTopics, "compliance")

	productInterests := context["product_interests"].(map[string]float64)
	assert.Equal(t, 0.8, productInterests["ransomware"])
	assert.Equal(t, 0.6, productInterests["compliance"])
}

func TestBuildPersonalizationContext_MissingContactData(t *testing.T) {
	service := &GenerationService{}

	// Contact with all optional fields nil
	contact := &domain.Contact{
		FirstName:             nil,
		LastName:              nil,
		Company:               nil,
		JobTitle:              nil,
		RoleCategory:          nil,
		Industry:              nil,
		EngagementScore:       0,
		LastWebinarAttendance: nil,
		TopicScores:           nil,
		PartnerTags:           []string{},
		Last10Interactions:    []domain.Interaction{},
	}

	context := service.BuildPersonalizationContext(contact)

	// All fields should have safe default values
	assert.Equal(t, "", context["first_name"])
	assert.Equal(t, "", context["last_name"])
	assert.Equal(t, "", context["company"])
	assert.Equal(t, "", context["title"])
	assert.Equal(t, "", context["role"])
	assert.Equal(t, "", context["industry"])
	assert.Equal(t, 0.0, context["engagement_score"])
	assert.Equal(t, false, context["has_attended_webinar"])
	assert.Equal(t, false, context["is_partner"])
	assert.Equal(t, "", context["webinar_attendance"])
	assert.Equal(t, []string{}, context["recent_topics"])
	assert.Equal(t, []string{}, context["partner_tags"])

	productInterests := context["product_interests"].(map[string]float64)
	assert.Empty(t, productInterests)
}

func TestBuildPersonalizationContext_NilContact(t *testing.T) {
	service := &GenerationService{}

	context := service.BuildPersonalizationContext(nil)

	assert.NotNil(t, context)
	assert.Empty(t, context)
}

// Test substituteTokens

func TestSubstituteTokens_StringTokens(t *testing.T) {
	service := &GenerationService{}

	text := "Hello {{first_name}} {{last_name}} from {{company}}!"
	context := map[string]interface{}{
		"first_name": "Jane",
		"last_name":  "Smith",
		"company":    "TechCorp",
	}

	result := service.substituteTokens(text, context)

	assert.Equal(t, "Hello Jane Smith from TechCorp!", result)
}

func TestSubstituteTokens_NumericTokens(t *testing.T) {
	service := &GenerationService{}

	text := "Your engagement score is {{engagement_score}}"
	context := map[string]interface{}{
		"engagement_score": 85.5,
	}

	result := service.substituteTokens(text, context)

	assert.Equal(t, "Your engagement score is 85.50", result)
}

func TestSubstituteTokens_BooleanTokens(t *testing.T) {
	service := &GenerationService{}

	text := "Partner status: {{is_partner}}"
	context := map[string]interface{}{
		"is_partner": true,
	}

	result := service.substituteTokens(text, context)

	assert.Equal(t, "Partner status: true", result)
}

func TestSubstituteTokens_EmptyText(t *testing.T) {
	service := &GenerationService{}

	result := service.substituteTokens("", map[string]interface{}{"key": "value"})

	assert.Equal(t, "", result)
}

func TestSubstituteTokens_NoTokens(t *testing.T) {
	service := &GenerationService{}

	text := "This text has no tokens"
	result := service.substituteTokens(text, map[string]interface{}{"key": "value"})

	assert.Equal(t, text, result)
}

// Test shouldIncludeWebinarFollowUp

func TestShouldIncludeWebinarFollowUp_RecentAttendance(t *testing.T) {
	service := &GenerationService{}

	// 3 days ago - should include
	recentTime := time.Now().Add(-3 * 24 * time.Hour)
	contact := &domain.Contact{
		LastWebinarAttendance: &recentTime,
	}

	result := service.shouldIncludeWebinarFollowUp(contact)

	assert.True(t, result)
}

func TestShouldIncludeWebinarFollowUp_OldAttendance(t *testing.T) {
	service := &GenerationService{}

	// 10 days ago - should not include
	oldTime := time.Now().Add(-10 * 24 * time.Hour)
	contact := &domain.Contact{
		LastWebinarAttendance: &oldTime,
	}

	result := service.shouldIncludeWebinarFollowUp(contact)

	assert.False(t, result)
}

func TestShouldIncludeWebinarFollowUp_NoAttendance(t *testing.T) {
	service := &GenerationService{}

	contact := &domain.Contact{
		LastWebinarAttendance: nil,
	}

	result := service.shouldIncludeWebinarFollowUp(contact)

	assert.False(t, result)
}

func TestShouldIncludeWebinarFollowUp_NilContact(t *testing.T) {
	service := &GenerationService{}

	result := service.shouldIncludeWebinarFollowUp(nil)

	assert.False(t, result)
}

// Test selectPartnerContent

func TestSelectPartnerContent_WithPartnerTags(t *testing.T) {
	service := &GenerationService{}

	contact := &domain.Contact{
		PartnerTags: []string{"partner_a", "mssp"},
	}

	heroTitle := "Hero Block"
	contentTitle := "Content Block"
	partnerTitle := "Partner Block"

	blocks := []domain.NewsletterBlock{
		{
			ID:            uuid.New(),
			BlockType:     domain.BlockTypeHero,
			Title:         &heroTitle,
			TopicTags:     []string{"security"},
			IsPromotional: false,
		},
		{
			ID:            uuid.New(),
			BlockType:     domain.BlockTypeContent,
			Title:         &contentTitle,
			TopicTags:     []string{"general"},
			IsPromotional: false,
		},
		{
			ID:            uuid.New(),
			BlockType:     domain.BlockTypeContent,
			Title:         &partnerTitle,
			TopicTags:     []string{"mssp", "partner"},
			IsPromotional: false,
		},
	}

	result := service.selectPartnerContent(blocks, contact)

	// Should include hero and partner-relevant blocks
	assert.Len(t, result, 2)
	assert.Equal(t, domain.BlockTypeHero, result[0].BlockType)
	assert.Equal(t, "Partner Block", *result[1].Title)
}

func TestSelectPartnerContent_WithPromotionalBlocks(t *testing.T) {
	service := &GenerationService{}

	contact := &domain.Contact{
		PartnerTags: []string{"partner_a"},
	}

	heroTitle := "Hero"
	promoTitle := "Promo"
	contentTitle := "Content"

	blocks := []domain.NewsletterBlock{
		{
			ID:            uuid.New(),
			BlockType:     domain.BlockTypeHero,
			Title:         &heroTitle,
			IsPromotional: false,
		},
		{
			ID:            uuid.New(),
			BlockType:     domain.BlockTypeContent,
			Title:         &promoTitle,
			IsPromotional: true,
		},
		{
			ID:            uuid.New(),
			BlockType:     domain.BlockTypeContent,
			Title:         &contentTitle,
			IsPromotional: false,
		},
	}

	result := service.selectPartnerContent(blocks, contact)

	// Should include hero and promotional blocks
	assert.Len(t, result, 2)
	assert.True(t, result[0].BlockType == domain.BlockTypeHero || result[0].IsPromotional)
	assert.True(t, result[1].BlockType == domain.BlockTypeHero || result[1].IsPromotional)
}

func TestSelectPartnerContent_NoPartnerTags(t *testing.T) {
	service := &GenerationService{}

	contact := &domain.Contact{
		PartnerTags: []string{},
	}

	blocks := []domain.NewsletterBlock{
		{ID: uuid.New(), BlockType: domain.BlockTypeHero},
		{ID: uuid.New(), BlockType: domain.BlockTypeContent},
	}

	result := service.selectPartnerContent(blocks, contact)

	// Should return all blocks unchanged
	assert.Equal(t, blocks, result)
}

func TestSelectPartnerContent_NilContact(t *testing.T) {
	service := &GenerationService{}

	blocks := []domain.NewsletterBlock{
		{ID: uuid.New(), BlockType: domain.BlockTypeHero},
	}

	result := service.selectPartnerContent(blocks, nil)

	// Should return all blocks unchanged
	assert.Equal(t, blocks, result)
}

func TestSelectPartnerContent_NoMatchingContent(t *testing.T) {
	service := &GenerationService{}

	contact := &domain.Contact{
		PartnerTags: []string{"partner_xyz"},
	}

	contentTitle := "Content"
	blocks := []domain.NewsletterBlock{
		{
			ID:            uuid.New(),
			BlockType:     domain.BlockTypeContent,
			Title:         &contentTitle,
			TopicTags:     []string{"general"},
			IsPromotional: false,
		},
	}

	result := service.selectPartnerContent(blocks, contact)

	// Should return original blocks when no partner content found
	assert.Equal(t, blocks, result)
}

// Test ApplyPersonalization

func TestApplyPersonalization_HappyPath(t *testing.T) {
	// Setup mocks
	contactRepo := new(MockContactRepository)
	issueRepo := new(MockNewsletterIssueRepository)
	blockRepo := new(MockNewsletterBlockRepository)

	service := &GenerationService{
		contactRepo: contactRepo,
		issueRepo:   issueRepo,
		blockRepo:   blockRepo,
	}

	ctx := context.Background()
	issueID := uuid.New()
	contactID := uuid.New()

	firstName := "Alice"
	company := "SecurityCo"
	intro := "Hello {{first_name}} from {{company}}"
	subject := "Weekly Update for {{company}}"
	preheader := "Hi {{first_name}}"
	blockTitle := "Article for {{first_name}}"

	contact := &domain.Contact{
		ID:                    contactID,
		FirstName:             &firstName,
		Company:               &company,
		EngagementScore:       80,
		LastWebinarAttendance: nil,
		PartnerTags:           []string{},
	}

	issue := &domain.NewsletterIssue{
		ID:                  issueID,
		IntroTemplate:       &intro,
		SelectedSubjectLine: &subject,
		Preheader:           &preheader,
	}

	title := blockTitle
	blocks := []*domain.NewsletterBlock{
		{
			ID:      uuid.New(),
			IssueID: issueID,
			Title:   &title,
		},
	}

	issueRepo.On("GetByID", ctx, issueID).Return(issue, nil)
	contactRepo.On("GetByID", ctx, contactID).Return(contact, nil)
	blockRepo.On("GetByIssueID", ctx, issueID).Return(blocks, nil)

	// Execute
	result, err := service.ApplyPersonalization(ctx, issueID, contactID)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "Hello Alice from SecurityCo", *result.IntroTemplate)
	assert.Equal(t, "Weekly Update for SecurityCo", *result.SelectedSubjectLine)
	assert.Equal(t, "Hi Alice", *result.Preheader)
	assert.Len(t, result.Blocks, 1)
	assert.Equal(t, "Article for Alice", *result.Blocks[0].Title)

	contactRepo.AssertExpectations(t)
	issueRepo.AssertExpectations(t)
	blockRepo.AssertExpectations(t)
}

func TestApplyPersonalization_WithWebinarFollowUp(t *testing.T) {
	// Setup mocks
	contactRepo := new(MockContactRepository)
	issueRepo := new(MockNewsletterIssueRepository)
	blockRepo := new(MockNewsletterBlockRepository)

	service := &GenerationService{
		contactRepo: contactRepo,
		issueRepo:   issueRepo,
		blockRepo:   blockRepo,
	}

	ctx := context.Background()
	issueID := uuid.New()
	contactID := uuid.New()

	firstName := "Bob"
	webinarTime := time.Now().Add(-2 * 24 * time.Hour) // 2 days ago

	contact := &domain.Contact{
		ID:                    contactID,
		FirstName:             &firstName,
		EngagementScore:       90,
		LastWebinarAttendance: &webinarTime,
		PartnerTags:           []string{},
	}

	intro := "Hello {{first_name}}"
	issue := &domain.NewsletterIssue{
		ID:            issueID,
		IntroTemplate: &intro,
	}

	blocks := []*domain.NewsletterBlock{
		{
			ID:      uuid.New(),
			IssueID: issueID,
		},
	}

	issueRepo.On("GetByID", ctx, issueID).Return(issue, nil)
	contactRepo.On("GetByID", ctx, contactID).Return(contact, nil)
	blockRepo.On("GetByIssueID", ctx, issueID).Return(blocks, nil)

	// Execute
	result, err := service.ApplyPersonalization(ctx, issueID, contactID)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	// Should have original block + webinar follow-up block
	assert.Len(t, result.Blocks, 2)
	assert.Contains(t, *result.Blocks[1].Title, "Bob")

	contactRepo.AssertExpectations(t)
	issueRepo.AssertExpectations(t)
	blockRepo.AssertExpectations(t)
}

func TestApplyPersonalization_WithPartnerContent(t *testing.T) {
	// Setup mocks
	contactRepo := new(MockContactRepository)
	issueRepo := new(MockNewsletterIssueRepository)
	blockRepo := new(MockNewsletterBlockRepository)

	service := &GenerationService{
		contactRepo: contactRepo,
		issueRepo:   issueRepo,
		blockRepo:   blockRepo,
	}

	ctx := context.Background()
	issueID := uuid.New()
	contactID := uuid.New()

	contact := &domain.Contact{
		ID:              contactID,
		EngagementScore: 70,
		PartnerTags:     []string{"mssp"},
	}

	intro := "Hello"
	issue := &domain.NewsletterIssue{
		ID:            issueID,
		IntroTemplate: &intro,
	}

	heroTitle := "Hero"
	partnerTitle := "Partner Content"
	generalTitle := "General Content"

	blocks := []*domain.NewsletterBlock{
		{
			ID:        uuid.New(),
			IssueID:   issueID,
			BlockType: domain.BlockTypeHero,
			Title:     &heroTitle,
		},
		{
			ID:        uuid.New(),
			IssueID:   issueID,
			BlockType: domain.BlockTypeContent,
			Title:     &partnerTitle,
			TopicTags: []string{"mssp"},
		},
		{
			ID:        uuid.New(),
			IssueID:   issueID,
			BlockType: domain.BlockTypeContent,
			Title:     &generalTitle,
			TopicTags: []string{"general"},
		},
	}

	issueRepo.On("GetByID", ctx, issueID).Return(issue, nil)
	contactRepo.On("GetByID", ctx, contactID).Return(contact, nil)
	blockRepo.On("GetByIssueID", ctx, issueID).Return(blocks, nil)

	// Execute
	result, err := service.ApplyPersonalization(ctx, issueID, contactID)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	// Should only have hero and partner-relevant content
	assert.Len(t, result.Blocks, 2)
	assert.Equal(t, domain.BlockTypeHero, result.Blocks[0].BlockType)
	assert.Equal(t, "Partner Content", *result.Blocks[1].Title)

	contactRepo.AssertExpectations(t)
	issueRepo.AssertExpectations(t)
	blockRepo.AssertExpectations(t)
}

func TestApplyPersonalization_InvalidIssueID(t *testing.T) {
	service := &GenerationService{}

	ctx := context.Background()

	_, err := service.ApplyPersonalization(ctx, uuid.Nil, uuid.New())

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "issue ID is required")
}

func TestApplyPersonalization_InvalidContactID(t *testing.T) {
	service := &GenerationService{}

	ctx := context.Background()

	_, err := service.ApplyPersonalization(ctx, uuid.New(), uuid.Nil)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "contact ID is required")
}

func TestApplyPersonalization_IssueNotFound(t *testing.T) {
	// Setup mocks
	issueRepo := new(MockNewsletterIssueRepository)

	service := &GenerationService{
		issueRepo: issueRepo,
	}

	ctx := context.Background()
	issueID := uuid.New()
	contactID := uuid.New()

	issueRepo.On("GetByID", ctx, issueID).Return(nil, assert.AnError)

	// Execute
	_, err := service.ApplyPersonalization(ctx, issueID, contactID)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to get issue")

	issueRepo.AssertExpectations(t)
}

func TestApplyPersonalization_ContactNotFound(t *testing.T) {
	// Setup mocks
	contactRepo := new(MockContactRepository)
	issueRepo := new(MockNewsletterIssueRepository)

	service := &GenerationService{
		contactRepo: contactRepo,
		issueRepo:   issueRepo,
	}

	ctx := context.Background()
	issueID := uuid.New()
	contactID := uuid.New()

	issue := &domain.NewsletterIssue{
		ID: issueID,
	}

	issueRepo.On("GetByID", ctx, issueID).Return(issue, nil)
	contactRepo.On("GetByID", ctx, contactID).Return(nil, assert.AnError)

	// Execute
	_, err := service.ApplyPersonalization(ctx, issueID, contactID)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to get contact")

	contactRepo.AssertExpectations(t)
	issueRepo.AssertExpectations(t)
}

// =============================================================================
// Tests for Structured Personalization Methods
// =============================================================================

// Test BuildPersonalizationContextByID

func TestBuildPersonalizationContextByID_HappyPath(t *testing.T) {
	contactRepo := new(MockContactRepository)
	service := &GenerationService{
		contactRepo: contactRepo,
	}

	ctx := context.Background()
	contactID := uuid.New()

	firstName := "Alice"
	company := "TechCorp"
	jobTitle := "CISO"
	industry := "finance"

	contact := &domain.Contact{
		ID:              contactID,
		FirstName:       &firstName,
		Company:         &company,
		JobTitle:        &jobTitle,
		Industry:        &industry,
		EngagementScore: 85.5,
		TopicScores: map[string]float64{
			"ransomware": 0.9,
			"compliance": 0.7,
		},
		PartnerTags: []string{"mssp", "partner_a"},
		Last10Interactions: []domain.Interaction{
			{Type: "click", Topic: "ransomware", Timestamp: time.Now().Add(-24 * time.Hour)},
			{Type: "open", Topic: "phishing", Timestamp: time.Now().Add(-48 * time.Hour)},
		},
	}

	contactRepo.On("GetByID", ctx, contactID).Return(contact, nil)

	// Execute
	pctx, err := service.BuildPersonalizationContextByID(ctx, contactID)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, pctx)
	assert.Equal(t, "Alice", pctx.FieldTokens["first_name"])
	assert.Equal(t, "TechCorp", pctx.FieldTokens["company"])
	assert.Equal(t, "CISO", pctx.FieldTokens["title"])
	assert.Equal(t, "finance", pctx.FieldTokens["industry"])

	// Check topic weights
	assert.Equal(t, 0.7, pctx.TopicWeights["compliance"])
	assert.Contains(t, pctx.TopicWeights, "ransomware")
	// Ransomware score should be boosted from interaction (0.9 + 0.1 = 1.0, capped at 1.0)
	assert.Equal(t, 1.0, pctx.TopicWeights["ransomware"])
	// Phishing should be added from interaction with default 0.5
	assert.Equal(t, 0.5, pctx.TopicWeights["phishing"])

	// Check content tags
	assert.Contains(t, pctx.ContentTags, "mssp")
	assert.Contains(t, pctx.ContentTags, "partner_a")

	contactRepo.AssertExpectations(t)
}

func TestBuildPersonalizationContextByID_InvalidID(t *testing.T) {
	service := &GenerationService{}

	ctx := context.Background()

	_, err := service.BuildPersonalizationContextByID(ctx, uuid.Nil)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "contact ID is required")
}

func TestBuildPersonalizationContextByID_ContactNotFound(t *testing.T) {
	contactRepo := new(MockContactRepository)
	service := &GenerationService{
		contactRepo: contactRepo,
	}

	ctx := context.Background()
	contactID := uuid.New()

	contactRepo.On("GetByID", ctx, contactID).Return(nil, assert.AnError)

	// Execute
	_, err := service.BuildPersonalizationContextByID(ctx, contactID)

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to get contact")

	contactRepo.AssertExpectations(t)
}

// Test RenderPersonalizedContent

func TestRenderPersonalizedContent_AllTokens(t *testing.T) {
	service := &GenerationService{}

	content := "Hello {{first_name}} from {{company}}! As a {{title}}, you'll love this."
	tokens := map[string]string{
		"first_name": "Bob",
		"company":    "Acme Corp",
		"title":      "CTO",
	}

	result := service.RenderPersonalizedContent(content, tokens)

	assert.Equal(t, "Hello Bob from Acme Corp! As a CTO, you'll love this.", result)
}

func TestRenderPersonalizedContent_EmptyContent(t *testing.T) {
	service := &GenerationService{}

	result := service.RenderPersonalizedContent("", map[string]string{"key": "value"})

	assert.Equal(t, "", result)
}

func TestRenderPersonalizedContent_NoTokensInContent(t *testing.T) {
	service := &GenerationService{}

	content := "This has no tokens"
	result := service.RenderPersonalizedContent(content, map[string]string{"key": "value"})

	assert.Equal(t, content, result)
}

// Test ApplyPersonalizationWithContext

func TestApplyPersonalizationWithContext_HappyPath(t *testing.T) {
	blockRepo := new(MockNewsletterBlockRepository)
	service := &GenerationService{
		blockRepo: blockRepo,
	}

	ctx := context.Background()
	issueID := uuid.New()

	firstName := "Charlie"
	company := "SecurityInc"

	pctx := &PersonalizationContext{
		Contact: domain.Contact{
			ID:              uuid.New(),
			FirstName:       &firstName,
			Company:         &company,
			EngagementScore: 90,
			PartnerTags:     []string{},
		},
		FieldTokens: map[string]string{
			"first_name": "Charlie",
			"company":    "SecurityInc",
		},
		TopicWeights: map[string]float64{
			"threat_intel": 0.8,
		},
		ContentTags: []string{},
		ExcludeTags: []string{},
	}

	intro := "Welcome {{first_name}} to our newsletter"
	subject := "Security Updates for {{company}}"
	preheader := "Hi {{first_name}}"

	issue := &domain.NewsletterIssue{
		ID:                  issueID,
		IntroTemplate:       &intro,
		SelectedSubjectLine: &subject,
		Preheader:           &preheader,
	}

	title := "Article for {{first_name}}"
	blocks := []*domain.NewsletterBlock{
		{
			ID:      uuid.New(),
			IssueID: issueID,
			Title:   &title,
		},
	}

	blockRepo.On("GetByIssueID", ctx, issueID).Return(blocks, nil)

	// Execute
	result, err := service.ApplyPersonalizationWithContext(ctx, issue, pctx)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "Welcome Charlie to our newsletter", *result.IntroTemplate)
	assert.Equal(t, "Security Updates for SecurityInc", *result.SelectedSubjectLine)
	assert.Equal(t, "Hi Charlie", *result.Preheader)
	assert.Len(t, result.Blocks, 1)
	assert.Equal(t, "Article for Charlie", *result.Blocks[0].Title)

	blockRepo.AssertExpectations(t)
}

func TestApplyPersonalizationWithContext_NilIssue(t *testing.T) {
	service := &GenerationService{}

	ctx := context.Background()
	pctx := &PersonalizationContext{}

	_, err := service.ApplyPersonalizationWithContext(ctx, nil, pctx)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "issue cannot be nil")
}

func TestApplyPersonalizationWithContext_NilContext(t *testing.T) {
	service := &GenerationService{}

	ctx := context.Background()
	issue := &domain.NewsletterIssue{
		ID: uuid.New(),
	}

	_, err := service.ApplyPersonalizationWithContext(ctx, issue, nil)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "personalization context cannot be nil")
}

func TestApplyPersonalizationWithContext_WithWebinarFollowUp(t *testing.T) {
	blockRepo := new(MockNewsletterBlockRepository)
	service := &GenerationService{
		blockRepo: blockRepo,
	}

	ctx := context.Background()
	issueID := uuid.New()

	firstName := "David"

	pctx := &PersonalizationContext{
		Contact: domain.Contact{
			ID:              uuid.New(),
			FirstName:       &firstName,
			EngagementScore: 95,
			PartnerTags:     []string{},
		},
		FieldTokens: map[string]string{
			"first_name": "David",
		},
		TopicWeights: map[string]float64{},
		ContentTags:  []string{"webinar_followup"},
		ExcludeTags:  []string{},
	}

	intro := "Hello"
	issue := &domain.NewsletterIssue{
		ID:            issueID,
		IntroTemplate: &intro,
	}

	blocks := []*domain.NewsletterBlock{
		{
			ID:      uuid.New(),
			IssueID: issueID,
		},
	}

	blockRepo.On("GetByIssueID", ctx, issueID).Return(blocks, nil)

	// Execute
	result, err := service.ApplyPersonalizationWithContext(ctx, issue, pctx)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	// Should have original block + webinar follow-up block
	assert.Len(t, result.Blocks, 2)
	assert.Contains(t, *result.Blocks[1].Title, "David")

	blockRepo.AssertExpectations(t)
}

func TestApplyPersonalizationWithContext_WithExcludeTags(t *testing.T) {
	blockRepo := new(MockNewsletterBlockRepository)
	service := &GenerationService{
		blockRepo: blockRepo,
	}

	ctx := context.Background()
	issueID := uuid.New()

	pctx := &PersonalizationContext{
		Contact: domain.Contact{
			ID:              uuid.New(),
			EngagementScore: 20, // Low engagement
			PartnerTags:     []string{},
		},
		FieldTokens:  map[string]string{},
		TopicWeights: map[string]float64{},
		ContentTags:  []string{},
		ExcludeTags:  []string{"technical_deep_dive"},
	}

	intro := "Hello"
	issue := &domain.NewsletterIssue{
		ID:            issueID,
		IntroTemplate: &intro,
	}

	heroTitle := "Hero"
	techTitle := "Technical Deep Dive"
	generalTitle := "General Article"

	blocks := []*domain.NewsletterBlock{
		{
			ID:        uuid.New(),
			IssueID:   issueID,
			BlockType: domain.BlockTypeHero,
			Title:     &heroTitle,
			TopicTags: []string{},
		},
		{
			ID:        uuid.New(),
			IssueID:   issueID,
			BlockType: domain.BlockTypeContent,
			Title:     &techTitle,
			TopicTags: []string{"technical_deep_dive"},
		},
		{
			ID:        uuid.New(),
			IssueID:   issueID,
			BlockType: domain.BlockTypeContent,
			Title:     &generalTitle,
			TopicTags: []string{"general"},
		},
	}

	blockRepo.On("GetByIssueID", ctx, issueID).Return(blocks, nil)

	// Execute
	result, err := service.ApplyPersonalizationWithContext(ctx, issue, pctx)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	// Should exclude technical block but keep hero and general
	assert.Len(t, result.Blocks, 2)
	assert.Equal(t, domain.BlockTypeHero, result.Blocks[0].BlockType)
	assert.Equal(t, "General Article", *result.Blocks[1].Title)

	blockRepo.AssertExpectations(t)
}

// Test filterByExcludeTags

func TestFilterByExcludeTags_NoExcludeTags(t *testing.T) {
	service := &GenerationService{}

	blocks := []domain.NewsletterBlock{
		{ID: uuid.New(), TopicTags: []string{"general"}},
		{ID: uuid.New(), TopicTags: []string{"advanced"}},
	}

	result := service.filterByExcludeTags(blocks, []string{})

	assert.Equal(t, blocks, result)
}

func TestFilterByExcludeTags_ExcludesMatching(t *testing.T) {
	service := &GenerationService{}

	generalTitle := "General"
	advancedTitle := "Advanced"

	blocks := []domain.NewsletterBlock{
		{
			ID:        uuid.New(),
			BlockType: domain.BlockTypeContent,
			Title:     &generalTitle,
			TopicTags: []string{"general"},
		},
		{
			ID:        uuid.New(),
			BlockType: domain.BlockTypeContent,
			Title:     &advancedTitle,
			TopicTags: []string{"advanced"},
		},
	}

	result := service.filterByExcludeTags(blocks, []string{"advanced"})

	assert.Len(t, result, 1)
	assert.Equal(t, "General", *result[0].Title)
}

func TestFilterByExcludeTags_KeepsHeroBlocks(t *testing.T) {
	service := &GenerationService{}

	heroTitle := "Hero"
	advancedTitle := "Advanced"

	blocks := []domain.NewsletterBlock{
		{
			ID:        uuid.New(),
			BlockType: domain.BlockTypeHero,
			Title:     &heroTitle,
			TopicTags: []string{"advanced"}, // Has excluded tag but is hero
		},
		{
			ID:        uuid.New(),
			BlockType: domain.BlockTypeContent,
			Title:     &advancedTitle,
			TopicTags: []string{"advanced"},
		},
	}

	result := service.filterByExcludeTags(blocks, []string{"advanced"})

	// Hero block should be kept even with excluded tag
	assert.Len(t, result, 1)
	assert.Equal(t, domain.BlockTypeHero, result[0].BlockType)
	assert.Equal(t, "Hero", *result[0].Title)
}

// Test contains helper

func TestContains_Found(t *testing.T) {
	slice := []string{"apple", "banana", "cherry"}
	assert.True(t, contains(slice, "banana"))
}

func TestContains_NotFound(t *testing.T) {
	slice := []string{"apple", "banana", "cherry"}
	assert.False(t, contains(slice, "grape"))
}

func TestContains_EmptySlice(t *testing.T) {
	slice := []string{}
	assert.False(t, contains(slice, "anything"))
}
