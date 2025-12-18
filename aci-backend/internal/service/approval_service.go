package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/repository"
	"github.com/rs/zerolog"
)

// ApprovalService handles approval workflow business logic
type ApprovalService struct {
	approvalRepo repository.ApprovalRepository
	auditLogRepo repository.AuditLogRepository
	logger       zerolog.Logger
}

// NewApprovalService creates a new approval service
func NewApprovalService(
	approvalRepo repository.ApprovalRepository,
	auditLogRepo repository.AuditLogRepository,
	logger zerolog.Logger,
) *ApprovalService {
	return &ApprovalService{
		approvalRepo: approvalRepo,
		auditLogRepo: auditLogRepo,
		logger:       logger,
	}
}

// GetQueueForUser returns articles pending at user's gate
func (s *ApprovalService) GetQueueForUser(
	ctx context.Context,
	userRole domain.UserRole,
	opts repository.QueryOptions,
) ([]domain.Article, int, error) {
	if err := userRole.IsValid(); err != nil {
		return nil, 0, fmt.Errorf("invalid user role: %w", err)
	}

	if err := opts.Validate(); err != nil {
		return nil, 0, fmt.Errorf("invalid query options: %w", err)
	}

	// Determine which status corresponds to this user's gate
	targetGate := userRole.GetTargetGate()
	if targetGate == "" {
		// Admin/super_admin can see all pending articles
		return s.approvalRepo.GetAllPendingArticles(ctx, opts)
	}

	// Map gate to status
	status := s.gateToStatus(targetGate)

	articles, total, err := s.approvalRepo.GetApprovalQueue(ctx, status, opts)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get approval queue: %w", err)
	}

	s.logger.Info().
		Str("user_role", string(userRole)).
		Str("status", string(status)).
		Int("total", total).
		Msg("retrieved approval queue")

	return articles, total, nil
}

// GetAllPendingArticles returns all pending articles (admin only)
func (s *ApprovalService) GetAllPendingArticles(
	ctx context.Context,
	opts repository.QueryOptions,
) ([]domain.Article, int, error) {
	if err := opts.Validate(); err != nil {
		return nil, 0, fmt.Errorf("invalid query options: %w", err)
	}

	articles, total, err := s.approvalRepo.GetAllPendingArticles(ctx, opts)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get all pending articles: %w", err)
	}

	s.logger.Info().
		Int("total", total).
		Msg("retrieved all pending articles")

	return articles, total, nil
}

// ApproveArticle approves article at current gate and advances to next
func (s *ApprovalService) ApproveArticle(
	ctx context.Context,
	articleID uuid.UUID,
	userID uuid.UUID,
	userRole domain.UserRole,
	notes string,
) error {
	if articleID == uuid.Nil {
		return fmt.Errorf("article ID is required")
	}

	if userID == uuid.Nil {
		return fmt.Errorf("user ID is required")
	}

	if err := userRole.IsValid(); err != nil {
		return fmt.Errorf("invalid user role: %w", err)
	}

	// Get article for validation
	article, err := s.approvalRepo.GetArticleForApproval(ctx, articleID)
	if err != nil {
		return fmt.Errorf("failed to get article: %w", err)
	}

	// Validate approval permission
	if err := s.validateApproval(article, userRole); err != nil {
		return err
	}

	// Determine next status
	nextStatus, err := article.ApprovalStatus.NextOnApprove()
	if err != nil {
		return fmt.Errorf("cannot determine next status: %w", err)
	}

	// Create approval record
	currentGate := article.ApprovalStatus.RequiredGate()
	approval := &domain.ArticleApproval{
		ID:         uuid.New(),
		ArticleID:  articleID,
		Gate:       currentGate,
		ApprovedBy: userID,
		ApprovedAt: time.Now(),
		Notes:      s.stringPtr(notes),
	}

	if err := s.approvalRepo.CreateApproval(ctx, approval); err != nil {
		return fmt.Errorf("failed to create approval: %w", err)
	}

	// Update article status
	if err := s.approvalRepo.UpdateArticleStatus(ctx, articleID, nextStatus); err != nil {
		return fmt.Errorf("failed to update article status: %w", err)
	}

	// Create audit log
	if err := s.createAuditLog(
		ctx,
		userID,
		"approve_article",
		articleID,
		string(article.ApprovalStatus),
		string(nextStatus),
	); err != nil {
		s.logger.Error().Err(err).Msg("failed to create audit log")
	}

	s.logger.Info().
		Str("article_id", articleID.String()).
		Str("user_id", userID.String()).
		Str("user_role", string(userRole)).
		Str("gate", string(currentGate)).
		Str("old_status", string(article.ApprovalStatus)).
		Str("new_status", string(nextStatus)).
		Msg("article approved")

	return nil
}

// RejectArticle rejects article from pipeline
func (s *ApprovalService) RejectArticle(
	ctx context.Context,
	articleID uuid.UUID,
	userID uuid.UUID,
	userRole domain.UserRole,
	reason string,
) error {
	if articleID == uuid.Nil {
		return fmt.Errorf("article ID is required")
	}

	if userID == uuid.Nil {
		return fmt.Errorf("user ID is required")
	}

	if err := userRole.IsValid(); err != nil {
		return fmt.Errorf("invalid user role: %w", err)
	}

	// Get article for validation
	article, err := s.approvalRepo.GetArticleForApproval(ctx, articleID)
	if err != nil {
		return fmt.Errorf("failed to get article: %w", err)
	}

	// Validate rejection permission
	if err := s.validateRejection(article, userRole, reason); err != nil {
		return err
	}

	// Reject article in repository
	if err := s.approvalRepo.RejectArticle(ctx, articleID, reason, userID); err != nil {
		return fmt.Errorf("failed to reject article: %w", err)
	}

	// Create audit log
	if err := s.createAuditLog(
		ctx,
		userID,
		"reject_article",
		articleID,
		string(article.ApprovalStatus),
		fmt.Sprintf("rejected: %s", reason),
	); err != nil {
		s.logger.Error().Err(err).Msg("failed to create audit log")
	}

	s.logger.Info().
		Str("article_id", articleID.String()).
		Str("user_id", userID.String()).
		Str("user_role", string(userRole)).
		Str("old_status", string(article.ApprovalStatus)).
		Str("reason", reason).
		Msg("article rejected")

	return nil
}

// ReleaseArticle releases fully-approved article
func (s *ApprovalService) ReleaseArticle(
	ctx context.Context,
	articleID uuid.UUID,
	userID uuid.UUID,
	userRole domain.UserRole,
) error {
	if articleID == uuid.Nil {
		return fmt.Errorf("article ID is required")
	}

	if userID == uuid.Nil {
		return fmt.Errorf("user ID is required")
	}

	if err := userRole.IsValid(); err != nil {
		return fmt.Errorf("invalid user role: %w", err)
	}

	// Get article for validation
	article, err := s.approvalRepo.GetArticleForApproval(ctx, articleID)
	if err != nil {
		return fmt.Errorf("failed to get article: %w", err)
	}

	// Validate release permission
	if err := s.validateRelease(article, userRole); err != nil {
		return err
	}

	// Release article in repository
	if err := s.approvalRepo.ReleaseArticle(ctx, articleID, userID); err != nil {
		return fmt.Errorf("failed to release article: %w", err)
	}

	// Create audit log
	if err := s.createAuditLog(
		ctx,
		userID,
		"release_article",
		articleID,
		string(article.ApprovalStatus),
		string(domain.StatusReleased),
	); err != nil {
		s.logger.Error().Err(err).Msg("failed to create audit log")
	}

	s.logger.Info().
		Str("article_id", articleID.String()).
		Str("user_id", userID.String()).
		Str("user_role", string(userRole)).
		Msg("article released")

	return nil
}

// ResetArticle resets rejected article to pending_marketing (admin only)
func (s *ApprovalService) ResetArticle(
	ctx context.Context,
	articleID uuid.UUID,
	userID uuid.UUID,
	userRole domain.UserRole,
) error {
	if articleID == uuid.Nil {
		return fmt.Errorf("article ID is required")
	}

	if userID == uuid.Nil {
		return fmt.Errorf("user ID is required")
	}

	if err := userRole.IsValid(); err != nil {
		return fmt.Errorf("invalid user role: %w", err)
	}

	// Validate reset permission
	if !userRole.CanResetArticle() {
		return fmt.Errorf("user role %s cannot reset articles", userRole)
	}

	// Get article for validation
	article, err := s.approvalRepo.GetArticleForApproval(ctx, articleID)
	if err != nil {
		return fmt.Errorf("failed to get article: %w", err)
	}

	// Validate article is rejected
	if article.ApprovalStatus != domain.StatusRejected {
		return fmt.Errorf("only rejected articles can be reset, current status: %s", article.ApprovalStatus)
	}

	// Reset article in repository
	if err := s.approvalRepo.ResetArticle(ctx, articleID); err != nil {
		return fmt.Errorf("failed to reset article: %w", err)
	}

	// Create audit log
	if err := s.createAuditLog(
		ctx,
		userID,
		"reset_article",
		articleID,
		string(article.ApprovalStatus),
		string(domain.StatusPendingMarketing),
	); err != nil {
		s.logger.Error().Err(err).Msg("failed to create audit log")
	}

	s.logger.Info().
		Str("article_id", articleID.String()).
		Str("user_id", userID.String()).
		Str("user_role", string(userRole)).
		Msg("article reset")

	return nil
}

// GetApprovalHistory returns full approval history for article
func (s *ApprovalService) GetApprovalHistory(
	ctx context.Context,
	articleID uuid.UUID,
) ([]domain.ArticleApproval, error) {
	if articleID == uuid.Nil {
		return nil, fmt.Errorf("article ID is required")
	}

	approvals, err := s.approvalRepo.GetApprovalsByArticle(ctx, articleID)
	if err != nil {
		return nil, fmt.Errorf("failed to get approval history: %w", err)
	}

	s.logger.Info().
		Str("article_id", articleID.String()).
		Int("approval_count", len(approvals)).
		Msg("retrieved approval history")

	return approvals, nil
}

// GetStatusCounts returns count of articles per status
func (s *ApprovalService) GetStatusCounts(ctx context.Context) (map[domain.ApprovalStatus]int, error) {
	counts, err := s.approvalRepo.CountByStatus(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get status counts: %w", err)
	}

	s.logger.Info().
		Interface("counts", counts).
		Msg("retrieved status counts")

	return counts, nil
}

// validateApproval validates approval permission
func (s *ApprovalService) validateApproval(article *domain.Article, userRole domain.UserRole) error {
	if article == nil {
		return fmt.Errorf("article not found")
	}

	// Check if article can be approved
	if !domain.RoleCanApproveStatus(userRole, article.ApprovalStatus) {
		return fmt.Errorf(
			"user role %s cannot approve article at status %s",
			userRole,
			article.ApprovalStatus,
		)
	}

	// Ensure article is in a pending state
	switch article.ApprovalStatus {
	case domain.StatusPendingMarketing, domain.StatusPendingBranding,
		domain.StatusPendingSocL1, domain.StatusPendingSocL3,
		domain.StatusPendingCISO:
		return nil
	default:
		return fmt.Errorf("article cannot be approved from status: %s", article.ApprovalStatus)
	}
}

// validateRejection validates rejection permission and reason
func (s *ApprovalService) validateRejection(
	article *domain.Article,
	userRole domain.UserRole,
	reason string,
) error {
	if article == nil {
		return fmt.Errorf("article not found")
	}

	// Validate reason is provided with minimum length
	if reason == "" {
		return fmt.Errorf("rejection reason is required")
	}

	if len(reason) < 10 {
		return fmt.Errorf("rejection reason must be at least 10 characters")
	}

	// Check if user can reject at this gate
	requiredGate := article.ApprovalStatus.RequiredGate()
	if requiredGate == "" {
		return fmt.Errorf("article cannot be rejected from status: %s", article.ApprovalStatus)
	}

	if !userRole.CanApproveGate(requiredGate) {
		return fmt.Errorf(
			"user role %s cannot reject article at gate %s",
			userRole,
			requiredGate,
		)
	}

	// Ensure article is in a pending state
	switch article.ApprovalStatus {
	case domain.StatusPendingMarketing, domain.StatusPendingBranding,
		domain.StatusPendingSocL1, domain.StatusPendingSocL3,
		domain.StatusPendingCISO:
		return nil
	default:
		return fmt.Errorf("article cannot be rejected from status: %s", article.ApprovalStatus)
	}
}

// validateRelease validates release permission
func (s *ApprovalService) validateRelease(article *domain.Article, userRole domain.UserRole) error {
	if article == nil {
		return fmt.Errorf("article not found")
	}

	// Check if user can release
	if !userRole.CanRelease() {
		return fmt.Errorf("user role %s cannot release articles", userRole)
	}

	// Validate article is approved
	if article.ApprovalStatus != domain.StatusApproved {
		return fmt.Errorf(
			"only approved articles can be released, current status: %s",
			article.ApprovalStatus,
		)
	}

	return nil
}

// gateToStatus maps approval gate to pending status
func (s *ApprovalService) gateToStatus(gate domain.ApprovalGate) domain.ApprovalStatus {
	switch gate {
	case domain.GateMarketing:
		return domain.StatusPendingMarketing
	case domain.GateBranding:
		return domain.StatusPendingBranding
	case domain.GateSocL1:
		return domain.StatusPendingSocL1
	case domain.GateSocL3:
		return domain.StatusPendingSocL3
	case domain.GateCISO:
		return domain.StatusPendingCISO
	default:
		return ""
	}
}

// createAuditLog creates an audit log entry
func (s *ApprovalService) createAuditLog(
	ctx context.Context,
	userID uuid.UUID,
	action string,
	articleID uuid.UUID,
	oldValue string,
	newValue string,
) error {
	auditLog := domain.NewAuditLog(
		&userID,
		action,
		"article",
		&articleID,
		oldValue,
		newValue,
		nil, // IP address - can be added if available in context
		nil, // User agent - can be added if available in context
	)

	if err := s.auditLogRepo.Create(ctx, auditLog); err != nil {
		return fmt.Errorf("failed to create audit log: %w", err)
	}

	return nil
}

// stringPtr returns a pointer to a string, or nil if empty
func (s *ApprovalService) stringPtr(str string) *string {
	if str == "" {
		return nil
	}
	return &str
}
