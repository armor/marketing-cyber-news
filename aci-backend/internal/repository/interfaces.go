package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/domain/entities"
	voiceDomain "github.com/phillipboles/aci-backend/internal/domain/voice"
)

// Repository interfaces define contracts for data persistence layer
// Implementations will be in postgres/ and redis/ subdirectories

// UserRepository defines operations for user persistence
// NOTE: Uses entities.User which is the concrete type used by services
type UserRepository interface {
	Create(ctx context.Context, user *entities.User) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.User, error)
	GetByEmail(ctx context.Context, email string) (*entities.User, error)
	Update(ctx context.Context, user *entities.User) error
	UpdateLastLogin(ctx context.Context, id uuid.UUID) error
	Delete(ctx context.Context, id uuid.UUID) error
}

// ArticleRepository defines operations for article persistence
type ArticleRepository interface {
	Create(ctx context.Context, article *domain.Article) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Article, error)
	GetBySlug(ctx context.Context, slug string) (*domain.Article, error)
	GetBySourceURL(ctx context.Context, sourceURL string) (*domain.Article, error)
	List(ctx context.Context, filter *domain.ArticleFilter) ([]*domain.Article, int, error)
	Update(ctx context.Context, article *domain.Article) error
	Delete(ctx context.Context, id uuid.UUID) error
	IncrementViewCount(ctx context.Context, id uuid.UUID) error
}

// AlertRepository defines operations for alert persistence
type AlertRepository interface {
	Create(ctx context.Context, alert *domain.Alert) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Alert, error)
	GetByUserID(ctx context.Context, userID uuid.UUID) ([]*domain.Alert, error)
	Update(ctx context.Context, alert *domain.Alert) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetActiveAlerts(ctx context.Context) ([]*domain.Alert, error)
}

// AlertMatchRepository defines operations for alert matches
type AlertMatchRepository interface {
	Create(ctx context.Context, match *domain.AlertMatch) error
	GetByAlertID(ctx context.Context, alertID uuid.UUID) ([]*domain.AlertMatch, error)
	MarkNotified(ctx context.Context, id uuid.UUID) error
}

// RefreshTokenRepository defines operations for refresh token management
type RefreshTokenRepository interface {
	Create(ctx context.Context, token *domain.RefreshToken) error
	GetByTokenHash(ctx context.Context, tokenHash string) (*domain.RefreshToken, error)
	Revoke(ctx context.Context, id uuid.UUID) error
	RevokeAllForUser(ctx context.Context, userID uuid.UUID) error
	DeleteExpired(ctx context.Context) error
}

// SessionRepository defines operations for session management (Redis)
type SessionRepository interface {
	Set(ctx context.Context, key string, data interface{}, expiry time.Duration) error
	Get(ctx context.Context, key string) (interface{}, error)
	Delete(ctx context.Context, key string) error
}

// CategoryRepository defines operations for category persistence
type CategoryRepository interface {
	Create(ctx context.Context, category *domain.Category) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Category, error)
	GetBySlug(ctx context.Context, slug string) (*domain.Category, error)
	List(ctx context.Context) ([]*domain.Category, error)
	Update(ctx context.Context, category *domain.Category) error
	Delete(ctx context.Context, id uuid.UUID) error
}

// SourceRepository defines operations for source persistence
type SourceRepository interface {
	Create(ctx context.Context, source *domain.Source) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Source, error)
	GetByURL(ctx context.Context, url string) (*domain.Source, error)
	GetByName(ctx context.Context, name string) (*domain.Source, error)
	List(ctx context.Context, activeOnly bool) ([]*domain.Source, error)
	Update(ctx context.Context, source *domain.Source) error
	Delete(ctx context.Context, id uuid.UUID) error
}

// WebhookLogRepository defines operations for webhook log persistence
type WebhookLogRepository interface {
	Create(ctx context.Context, log *domain.WebhookLog) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.WebhookLog, error)
	Update(ctx context.Context, log *domain.WebhookLog) error
	List(ctx context.Context, limit, offset int) ([]*domain.WebhookLog, error)
}

// AuditLogRepository defines operations for audit log persistence
type AuditLogRepository interface {
	Create(ctx context.Context, log *domain.AuditLog) error
	List(ctx context.Context, filter *domain.AuditLogFilter) ([]*domain.AuditLog, int, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.AuditLog, error)
}

// BookmarkRepository defines operations for bookmark persistence
type BookmarkRepository interface {
	Create(ctx context.Context, userID, articleID uuid.UUID) error
	Delete(ctx context.Context, userID, articleID uuid.UUID) error
	IsBookmarked(ctx context.Context, userID, articleID uuid.UUID) (bool, error)
	GetByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*domain.Article, int, error)
	CountByUserID(ctx context.Context, userID uuid.UUID) (int, error)
}

// ArticleReadRepository defines operations for article read tracking
type ArticleReadRepository interface {
	Create(ctx context.Context, userID, articleID uuid.UUID, readingTimeSeconds int) error
	GetByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*ArticleRead, int, error)
	GetUserStats(ctx context.Context, userID uuid.UUID) (*UserReadStats, error)
}

// ArticleRead represents an article read record with article details
type ArticleRead struct {
	ID                 uuid.UUID
	UserID             uuid.UUID
	ArticleID          uuid.UUID
	ReadAt             time.Time
	ReadingTimeSeconds int
	Article            *domain.Article
}

// UserReadStats represents user reading statistics
type UserReadStats struct {
	TotalArticlesRead  int
	TotalReadingTime   int
	TotalBookmarks     int
	TotalAlerts        int
	TotalAlertMatches  int
	FavoriteCategory   string
	ArticlesThisWeek   int
	ArticlesThisMonth  int
	AverageReadingTime float64
}

// =============================================================================
// Newsletter System Repositories
// =============================================================================

// NewsletterConfigRepository defines operations for newsletter configuration persistence
type NewsletterConfigRepository interface {
	Create(ctx context.Context, config *domain.NewsletterConfiguration) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.NewsletterConfiguration, error)
	List(ctx context.Context, filter *domain.NewsletterConfigFilter) ([]*domain.NewsletterConfiguration, int, error)
	Update(ctx context.Context, config *domain.NewsletterConfiguration) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetBySegmentID(ctx context.Context, segmentID uuid.UUID) ([]*domain.NewsletterConfiguration, error)
}

// SegmentRepository defines operations for segment persistence
type SegmentRepository interface {
	Create(ctx context.Context, segment *domain.Segment) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Segment, error)
	List(ctx context.Context, filter *domain.SegmentFilter) ([]*domain.Segment, int, error)
	Update(ctx context.Context, segment *domain.Segment) error
	Delete(ctx context.Context, id uuid.UUID) error
	UpdateContactCount(ctx context.Context, id uuid.UUID, count int) error
}

// ContactRepository defines operations for contact persistence
type ContactRepository interface {
	Create(ctx context.Context, contact *domain.Contact) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Contact, error)
	GetByEmail(ctx context.Context, email string) (*domain.Contact, error)
	List(ctx context.Context, filter *domain.ContactFilter) ([]*domain.Contact, int, error)
	Update(ctx context.Context, contact *domain.Contact) error
	Delete(ctx context.Context, id uuid.UUID) error
	BulkCreate(ctx context.Context, contacts []*domain.Contact) error
	BulkUpdate(ctx context.Context, contacts []*domain.Contact) error
	GetBySegmentID(ctx context.Context, segmentID uuid.UUID, limit, offset int) ([]*domain.Contact, int, error)
	UpdateEngagementScore(ctx context.Context, id uuid.UUID, score float64) error
	UpdateNewsletterTracking(ctx context.Context, id uuid.UUID, sentAt time.Time) error
	MarkUnsubscribed(ctx context.Context, id uuid.UUID) error
	MarkBounced(ctx context.Context, id uuid.UUID) error
}

// ContentSourceRepository defines operations for content source persistence
type ContentSourceRepository interface {
	Create(ctx context.Context, source *domain.ContentSource) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.ContentSource, error)
	List(ctx context.Context, filter *domain.ContentSourceFilter) ([]*domain.ContentSource, int, error)
	Update(ctx context.Context, source *domain.ContentSource) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetActiveSources(ctx context.Context) ([]*domain.ContentSource, error)
	UpdateLastPolled(ctx context.Context, id uuid.UUID, polledAt time.Time, success bool, errorMsg *string) error
}

// ContentItemRepository defines operations for content item persistence
type ContentItemRepository interface {
	Create(ctx context.Context, item *domain.ContentItem) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.ContentItem, error)
	GetByIDs(ctx context.Context, ids []uuid.UUID) ([]*domain.ContentItem, error)
	GetByURL(ctx context.Context, url string) (*domain.ContentItem, error)
	List(ctx context.Context, filter *domain.ContentItemFilter) ([]*domain.ContentItem, int, error)
	Update(ctx context.Context, item *domain.ContentItem) error
	Delete(ctx context.Context, id uuid.UUID) error
	BulkCreate(ctx context.Context, items []*domain.ContentItem) error
	UpdateHistoricalMetrics(ctx context.Context, id uuid.UUID, opens, clicks int) error
	GetFreshContent(ctx context.Context, daysThreshold int, topicTags []string, limit int) ([]*domain.ContentItem, error)
}

// NewsletterIssueRepository defines operations for newsletter issue persistence
type NewsletterIssueRepository interface {
	Create(ctx context.Context, issue *domain.NewsletterIssue) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.NewsletterIssue, error)
	List(ctx context.Context, filter *domain.NewsletterIssueFilter) ([]*domain.NewsletterIssue, int, error)
	Update(ctx context.Context, issue *domain.NewsletterIssue) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetByConfigAndNumber(ctx context.Context, configID uuid.UUID, number int) (*domain.NewsletterIssue, error)
	GetNextIssueNumber(ctx context.Context, configID uuid.UUID) (int, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status domain.IssueStatus) error
	UpdateMetrics(ctx context.Context, id uuid.UUID, recipients, delivered, opens, clicks, bounces, unsubscribes, complaints int) error
	GetPendingApprovals(ctx context.Context) ([]*domain.NewsletterIssue, error)
	GetScheduledIssues(ctx context.Context, before time.Time) ([]*domain.NewsletterIssue, error)
}

// NewsletterBlockRepository defines operations for newsletter block persistence
type NewsletterBlockRepository interface {
	Create(ctx context.Context, block *domain.NewsletterBlock) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.NewsletterBlock, error)
	GetByIssueID(ctx context.Context, issueID uuid.UUID) ([]*domain.NewsletterBlock, error)
	Update(ctx context.Context, block *domain.NewsletterBlock) error
	Delete(ctx context.Context, id uuid.UUID) error
	BulkCreate(ctx context.Context, blocks []*domain.NewsletterBlock) error
	BulkCreateWithLock(ctx context.Context, issueID uuid.UUID, blocks []*domain.NewsletterBlock) error
	UpdatePositions(ctx context.Context, issueID uuid.UUID, positions map[uuid.UUID]int) error
	IncrementClicks(ctx context.Context, id uuid.UUID) error
	GetMaxPositionForUpdate(ctx context.Context, tx pgx.Tx, issueID uuid.UUID) (int, error)
	GetExistingContentItemIDs(ctx context.Context, issueID uuid.UUID, contentItemIDs []uuid.UUID) ([]uuid.UUID, error)
}

// TestVariantRepository defines operations for A/B test variant persistence
type TestVariantRepository interface {
	Create(ctx context.Context, variant *domain.TestVariant) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.TestVariant, error)
	GetByIssueID(ctx context.Context, issueID uuid.UUID) ([]*domain.TestVariant, error)
	Update(ctx context.Context, variant *domain.TestVariant) error
	Delete(ctx context.Context, id uuid.UUID) error
	BulkCreate(ctx context.Context, variants []*domain.TestVariant) error
	UpdateResults(ctx context.Context, id uuid.UUID, opens, clicks int) error
	DeclareWinner(ctx context.Context, id uuid.UUID, significance float64) error
	GetWinner(ctx context.Context, issueID uuid.UUID) (*domain.TestVariant, error)
}

// EngagementEventRepository defines operations for engagement event persistence
type EngagementEventRepository interface {
	Create(ctx context.Context, event *domain.EngagementEvent) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.EngagementEvent, error)
	List(ctx context.Context, filter *domain.EngagementEventFilter) ([]*domain.EngagementEvent, int, error)
	BulkCreate(ctx context.Context, events []*domain.EngagementEvent) error
	GetByIssueID(ctx context.Context, issueID uuid.UUID) ([]*domain.EngagementEvent, error)
	GetByContactID(ctx context.Context, contactID uuid.UUID, limit int) ([]*domain.EngagementEvent, error)
	GetMetricsForIssue(ctx context.Context, issueID uuid.UUID) (*domain.EngagementMetrics, error)
	GetTopicEngagement(ctx context.Context, issueID uuid.UUID) ([]domain.TopicEngagement, error)
	GetDeviceBreakdown(ctx context.Context, issueID uuid.UUID) (*domain.DeviceBreakdown, error)
}

// =============================================================================
// Marketing Autopilot Repositories
// =============================================================================

// CampaignRepository defines operations for campaign persistence
type CampaignRepository interface {
	Create(ctx context.Context, campaign *domain.Campaign) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Campaign, error)
	List(ctx context.Context, filter *domain.CampaignFilter) ([]*domain.Campaign, int, error)
	Update(ctx context.Context, campaign *domain.Campaign) error
	Delete(ctx context.Context, id uuid.UUID) error
	UpdateStatus(ctx context.Context, id uuid.UUID, status domain.CampaignStatus) error
	UpdateStats(ctx context.Context, id uuid.UUID, stats domain.CampaignStats) error
	GetActiveCampaigns(ctx context.Context, tenantID uuid.UUID) ([]*domain.Campaign, error)
	AddWorkflowID(ctx context.Context, id uuid.UUID, workflowID string) error
	RemoveWorkflowID(ctx context.Context, id uuid.UUID, workflowID string) error
}

// CompetitorRepository defines operations for competitor persistence
type CompetitorRepository interface {
	Create(ctx context.Context, competitor *domain.Competitor) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Competitor, error)
	GetByCampaignID(ctx context.Context, campaignID uuid.UUID) ([]*domain.Competitor, error)
	Update(ctx context.Context, competitor *domain.Competitor) error
	Delete(ctx context.Context, id uuid.UUID) error
	BulkCreate(ctx context.Context, competitors []*domain.Competitor) error
}

// ChannelConnectionRepository defines operations for channel connection persistence
type ChannelConnectionRepository interface {
	Create(ctx context.Context, connection *domain.ChannelConnection) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.ChannelConnection, error)
	GetByTenantAndChannel(ctx context.Context, tenantID uuid.UUID, channel domain.Channel) (*domain.ChannelConnection, error)
	List(ctx context.Context, filter *domain.ChannelConnectionFilter) ([]*domain.ChannelConnection, int, error)
	Update(ctx context.Context, connection *domain.ChannelConnection) error
	Delete(ctx context.Context, id uuid.UUID) error
	UpdateStatus(ctx context.Context, id uuid.UUID, status domain.ConnectionStatus) error
	UpdateCredentials(ctx context.Context, id uuid.UUID, encryptedCreds []byte, n8nCredID string, expiresAt *time.Time) error
	UpdateLastUsed(ctx context.Context, id uuid.UUID) error
	GetExpiringConnections(ctx context.Context, within time.Duration) ([]*domain.ChannelConnection, error)
}

// BrandStoreRepository defines operations for brand store persistence
type BrandStoreRepository interface {
	Create(ctx context.Context, store *domain.BrandStore) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.BrandStore, error)
	GetByTenantID(ctx context.Context, tenantID uuid.UUID) (*domain.BrandStore, error)
	Update(ctx context.Context, store *domain.BrandStore) error
	Delete(ctx context.Context, id uuid.UUID) error
	UpdateCounts(ctx context.Context, id uuid.UUID, voiceExamples, guidelines, terminology, corrections int) error
	UpdateHealthScore(ctx context.Context, id uuid.UUID, score int) error
	UpdateTerminology(ctx context.Context, id uuid.UUID, approved []string, banned []domain.TermEntry) error
	UpdateSettings(ctx context.Context, id uuid.UUID, strictness float64, autoCorrect bool) error
	UpdateLastTrained(ctx context.Context, id uuid.UUID, trainedAt time.Time) error
}

// CalendarEntryRepository defines operations for calendar entry persistence
type CalendarEntryRepository interface {
	Create(ctx context.Context, entry *domain.CalendarEntry) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.CalendarEntry, error)
	List(ctx context.Context, filter *domain.CalendarFilter) ([]*domain.CalendarEntry, int, error)
	Update(ctx context.Context, entry *domain.CalendarEntry) error
	Delete(ctx context.Context, id uuid.UUID) error
	UpdateStatus(ctx context.Context, id uuid.UUID, status domain.PublishingStatus) error
	Reschedule(ctx context.Context, id uuid.UUID, scheduledAt time.Time) error
	GetUpcoming(ctx context.Context, tenantID uuid.UUID, channel *domain.Channel, limit int) ([]*domain.CalendarEntry, error)
	GetByDateRange(ctx context.Context, tenantID uuid.UUID, startDate, endDate time.Time) ([]*domain.CalendarEntry, error)
	GetScheduledForPublishing(ctx context.Context, before time.Time) ([]*domain.CalendarEntry, error)
}

// WorkflowTemplateRepository defines operations for workflow template persistence
type WorkflowTemplateRepository interface {
	Create(ctx context.Context, template *domain.WorkflowTemplate) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.WorkflowTemplate, error)
	GetByName(ctx context.Context, name string) (*domain.WorkflowTemplate, error)
	List(ctx context.Context, category *string, activeOnly bool) ([]*domain.WorkflowTemplate, error)
	Update(ctx context.Context, template *domain.WorkflowTemplate) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetActiveByCategory(ctx context.Context, category string) ([]*domain.WorkflowTemplate, error)
}

// CompetitorProfileRepository defines operations for competitor profile persistence
type CompetitorProfileRepository interface {
	Create(ctx context.Context, competitor *domain.CompetitorProfile) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.CompetitorProfile, error)
	GetByCampaignID(ctx context.Context, campaignID uuid.UUID) ([]*domain.CompetitorProfile, error)
	List(ctx context.Context, filter *domain.CompetitorFilter) ([]*domain.CompetitorProfile, int, error)
	Update(ctx context.Context, competitor *domain.CompetitorProfile) error
	Delete(ctx context.Context, id uuid.UUID) error
	SetActive(ctx context.Context, id uuid.UUID, isActive bool) error
}

// CompetitorContentRepository defines operations for competitor content persistence
type CompetitorContentRepository interface {
	Create(ctx context.Context, content *domain.CompetitorContent) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.CompetitorContent, error)
	GetByURL(ctx context.Context, url string) (*domain.CompetitorContent, error)
	GetByCompetitorID(ctx context.Context, competitorID uuid.UUID, limit int) ([]*domain.CompetitorContent, error)
	List(ctx context.Context, filter *domain.CompetitorContentFilter) ([]*domain.CompetitorContent, int, error)
	Update(ctx context.Context, content *domain.CompetitorContent) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetRecentContent(ctx context.Context, competitorID uuid.UUID, since time.Time) ([]*domain.CompetitorContent, error)
	GetContentStats(ctx context.Context, competitorID uuid.UUID, periodDays int) (*domain.CompetitorAnalysis, error)
}

// CompetitorAlertRepository defines operations for competitor alert persistence
type CompetitorAlertRepository interface {
	Create(ctx context.Context, alert *domain.CompetitorAlert) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.CompetitorAlert, error)
	List(ctx context.Context, filter *domain.CompetitorAlertFilter) ([]*domain.CompetitorAlert, int, error)
	Update(ctx context.Context, alert *domain.CompetitorAlert) error
	Delete(ctx context.Context, id uuid.UUID) error
	MarkRead(ctx context.Context, id uuid.UUID) error
	MarkAllRead(ctx context.Context, campaignID uuid.UUID) error
	GetUnreadCount(ctx context.Context, campaignID uuid.UUID) (int, error)
}

// =============================================================================
// Enhanced Authentication Repositories
// =============================================================================

// InvitationRepository defines operations for user invitation persistence
type InvitationRepository interface {
	Create(ctx context.Context, invitation *domain.UserInvitation) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.UserInvitation, error)
	GetByToken(ctx context.Context, tokenHash string) (*domain.UserInvitation, error)
	GetByEmail(ctx context.Context, email string) (*domain.UserInvitation, error)
	MarkAccepted(ctx context.Context, id uuid.UUID) error
	DeleteExpired(ctx context.Context) (int, error)
	List(ctx context.Context, limit, offset int) ([]*domain.UserInvitation, int, error)
	ListPending(ctx context.Context, limit, offset int) ([]*domain.UserInvitation, int, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

// VerificationTokenRepository defines operations for email verification token persistence
type VerificationTokenRepository interface {
	Create(ctx context.Context, token *domain.EmailVerificationToken) error
	GetByToken(ctx context.Context, tokenHash string) (*domain.EmailVerificationToken, error)
	GetByUserID(ctx context.Context, userID uuid.UUID) (*domain.EmailVerificationToken, error)
	MarkVerified(ctx context.Context, id uuid.UUID) error
	DeleteForUser(ctx context.Context, userID uuid.UUID) error
	DeleteExpired(ctx context.Context) (int, error)
}

// ApprovalRequestRepository defines operations for user approval request persistence
type ApprovalRequestRepository interface {
	Create(ctx context.Context, request *domain.UserApprovalRequest) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.UserApprovalRequest, error)
	GetByUserID(ctx context.Context, userID uuid.UUID) (*domain.UserApprovalRequest, error)
	Update(ctx context.Context, request *domain.UserApprovalRequest) error
	ListPending(ctx context.Context, limit, offset int) ([]*domain.UserApprovalRequest, int, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

// LoginAttemptRepository defines operations for login attempt tracking
type LoginAttemptRepository interface {
	Create(ctx context.Context, attempt *domain.LoginAttempt) error
	GetRecentFailures(ctx context.Context, email string, since time.Time) (int, error)
	GetRecentFailuresByIP(ctx context.Context, ipAddress string, since time.Time) (int, error)
	DeleteOld(ctx context.Context, before time.Time) (int, error)
}

// PasswordResetTokenRepository defines operations for password reset token persistence
type PasswordResetTokenRepository interface {
	Create(ctx context.Context, token *domain.PasswordResetToken) error
	GetByToken(ctx context.Context, tokenHash string) (*domain.PasswordResetToken, error)
	GetByUserID(ctx context.Context, userID uuid.UUID) (*domain.PasswordResetToken, error)
	MarkUsed(ctx context.Context, id uuid.UUID) error
	DeleteForUser(ctx context.Context, userID uuid.UUID) error
	DeleteExpired(ctx context.Context) (int, error)
}

// SystemSettingsRepository defines operations for system settings persistence
type SystemSettingsRepository interface {
	Get(ctx context.Context, key string) (*domain.SystemSetting, error)
	Set(ctx context.Context, key string, value interface{}, updatedBy *uuid.UUID) error
	GetSignupMode(ctx context.Context) (domain.SignupMode, error)
	SetSignupMode(ctx context.Context, mode domain.SignupMode, updatedBy uuid.UUID) error
	GetAll(ctx context.Context) ([]*domain.SystemSetting, error)
}

// =============================================================================
// Claims Library and Extended Approval Workflow Repositories
// =============================================================================

// ClaimsLibraryRepository defines operations for claims library persistence
type ClaimsLibraryRepository interface {
	Create(ctx context.Context, claim *domain.ClaimsLibraryEntry) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.ClaimsLibraryEntry, error)
	List(ctx context.Context, filter *domain.ClaimsLibraryFilter) ([]*domain.ClaimsLibraryEntry, int, error)
	Update(ctx context.Context, claim *domain.ClaimsLibraryEntry) error
	Delete(ctx context.Context, id uuid.UUID) error

	// Approval workflow
	Approve(ctx context.Context, id uuid.UUID, approvedBy uuid.UUID, expiresAt *time.Time) error
	Reject(ctx context.Context, id uuid.UUID, rejectedBy uuid.UUID, reason string) error

	// Usage tracking
	IncrementUsage(ctx context.Context, id uuid.UUID) error
	BulkIncrementUsage(ctx context.Context, ids []uuid.UUID) error

	// Search and discovery
	GetByCategory(ctx context.Context, category string) ([]*domain.ClaimsLibraryEntry, error)
	GetApprovedByType(ctx context.Context, claimType domain.ClaimType) ([]*domain.ClaimsLibraryEntry, error)
	GetExpiringSoon(ctx context.Context, within time.Duration) ([]*domain.ClaimsLibraryEntry, error)
	SearchFullText(ctx context.Context, query string, limit int) ([]*domain.ClaimsLibraryEntry, error)

	// Categories
	ListCategories(ctx context.Context) ([]string, error)

	// Validation helpers
	GetByIDs(ctx context.Context, ids []uuid.UUID) ([]*domain.ClaimsLibraryEntry, error)
	GetDoNotSayItems(ctx context.Context) ([]*domain.ClaimsLibraryEntry, error)
}

// IssueApprovalRepository defines operations for issue approval tracking in 7-gate workflow
type IssueApprovalRepository interface {
	Create(ctx context.Context, approval *domain.IssueApproval) error
	GetByIssueID(ctx context.Context, issueID uuid.UUID) ([]*domain.IssueApproval, error)
	GetByGate(ctx context.Context, gate domain.ApprovalGate) ([]*domain.IssueApproval, error)
	Delete(ctx context.Context, id uuid.UUID) error
	DeleteByIssueID(ctx context.Context, issueID uuid.UUID) error
	GetLatestByIssueAndGate(ctx context.Context, issueID uuid.UUID, gate domain.ApprovalGate) (*domain.IssueApproval, error)
}

// =============================================================================
// Voice Transformation Repositories
// =============================================================================

// VoiceAgentRepository defines operations for voice agent persistence
type VoiceAgentRepository interface {
	// CRUD operations
	Create(ctx context.Context, agent *VoiceAgent) error
	GetByID(ctx context.Context, id uuid.UUID) (*VoiceAgent, error)
	GetByName(ctx context.Context, name string) (*VoiceAgent, error)
	List(ctx context.Context, filter *VoiceAgentFilter) ([]*VoiceAgent, int, error)
	Update(ctx context.Context, agent *VoiceAgent) error
	Delete(ctx context.Context, id uuid.UUID) error

	// Status management
	ListActive(ctx context.Context) ([]*VoiceAgent, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status VoiceAgentStatus) error

	// With related entities
	GetWithRulesAndExamples(ctx context.Context, id uuid.UUID) (*VoiceAgent, error)
}

// StyleRuleRepository defines operations for style rule persistence
type StyleRuleRepository interface {
	Create(ctx context.Context, rule *StyleRule) error
	GetByID(ctx context.Context, id uuid.UUID) (*StyleRule, error)
	GetByAgentID(ctx context.Context, agentID uuid.UUID) ([]StyleRule, error)
	Update(ctx context.Context, rule *StyleRule) error
	Delete(ctx context.Context, id uuid.UUID) error
	DeleteByAgentID(ctx context.Context, agentID uuid.UUID) error
	BulkCreate(ctx context.Context, rules []StyleRule) error
	UpdateSortOrder(ctx context.Context, agentID uuid.UUID, positions map[uuid.UUID]int) error
}

// ExampleRepository defines operations for transformation example persistence
type ExampleRepository interface {
	Create(ctx context.Context, example *Example) error
	GetByID(ctx context.Context, id uuid.UUID) (*Example, error)
	GetByAgentID(ctx context.Context, agentID uuid.UUID) ([]Example, error)
	Update(ctx context.Context, example *Example) error
	Delete(ctx context.Context, id uuid.UUID) error
	DeleteByAgentID(ctx context.Context, agentID uuid.UUID) error
	BulkCreate(ctx context.Context, examples []Example) error
	UpdateSortOrder(ctx context.Context, agentID uuid.UUID, positions map[uuid.UUID]int) error
}

// TransformationRepository defines operations for text transformation audit persistence
type TransformationRepository interface {
	// CRUD operations
	Create(ctx context.Context, transformation *TextTransformation) error
	GetByID(ctx context.Context, id uuid.UUID) (*TextTransformation, error)
	GetByRequestID(ctx context.Context, requestID uuid.UUID) ([]*TextTransformation, error)
	List(ctx context.Context, filter *TransformationFilter) ([]*TextTransformation, int, error)

	// Metrics and analytics
	CountByAgent(ctx context.Context, agentID uuid.UUID) (int, error)
	CountByUser(ctx context.Context, userID uuid.UUID) (int, error)
	GetRecentByUser(ctx context.Context, userID uuid.UUID, limit int) ([]*TextTransformation, error)
}

// Voice domain types re-exported for interface definitions
type (
	VoiceAgent           = voiceDomain.VoiceAgent
	VoiceAgentStatus     = voiceDomain.VoiceAgentStatus
	VoiceAgentFilter     = voiceDomain.VoiceAgentFilter
	StyleRule            = voiceDomain.StyleRule
	Example              = voiceDomain.Example
	TextTransformation   = voiceDomain.TextTransformation
	TransformationFilter = voiceDomain.TransformationFilter
)
