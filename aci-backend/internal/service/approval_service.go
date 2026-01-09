package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/domain/entities"
	"github.com/phillipboles/aci-backend/internal/repository"
)

// ApprovalService handles newsletter issue and article approval workflows
type ApprovalService struct {
	issueRepo         repository.NewsletterIssueRepository
	configRepo        repository.NewsletterConfigRepository
	auditLogRepo      repository.AuditLogRepository
	userRepo          repository.UserRepository
	issueApprovalRepo repository.IssueApprovalRepository
}

// NewApprovalService creates a new approval service for newsletter issues
func NewApprovalService(
	issueRepo repository.NewsletterIssueRepository,
	configRepo repository.NewsletterConfigRepository,
	auditLogRepo repository.AuditLogRepository,
	userRepo repository.UserRepository,
	issueApprovalRepo repository.IssueApprovalRepository,
) *ApprovalService {
	if issueRepo == nil {
		panic("issueRepo cannot be nil")
	}
	if configRepo == nil {
		panic("configRepo cannot be nil")
	}
	if auditLogRepo == nil {
		panic("auditLogRepo cannot be nil")
	}
	// userRepo can be nil for backward compatibility with article approval
	// which doesn't require tier-based validation
	// issueApprovalRepo can be nil for backward compatibility

	return &ApprovalService{
		issueRepo:         issueRepo,
		configRepo:        configRepo,
		auditLogRepo:      auditLogRepo,
		userRepo:          userRepo,
		issueApprovalRepo: issueApprovalRepo,
	}
}

// NewArticleApprovalService creates an approval service for article workflows only
// This is a lightweight version that doesn't require newsletter repos
func NewArticleApprovalService() *ApprovalService {
	return &ApprovalService{}
}

// ApproveIssue approves a newsletter issue for sending (FR-051, FR-052)
// SEC-003: Implements tier-based approval validation
func (s *ApprovalService) ApproveIssue(ctx context.Context, issueID uuid.UUID, approverID uuid.UUID, notes string) error {
	if issueID == uuid.Nil {
		return fmt.Errorf("issue ID is required")
	}

	if approverID == uuid.Nil {
		return fmt.Errorf("approver ID is required")
	}

	// Get the issue
	issue, err := s.issueRepo.GetByID(ctx, issueID)
	if err != nil {
		return fmt.Errorf("failed to get issue: %w", err)
	}

	// Validate status transition
	if issue.Status != domain.IssueStatusPendingApproval {
		return fmt.Errorf("issue must be in pending_approval status, current status: %s", issue.Status)
	}

	if !issue.CanTransitionTo(domain.IssueStatusApproved) {
		return fmt.Errorf("issue cannot transition to approved status")
	}

	if !issue.CanApprove() {
		return fmt.Errorf("issue is not ready for approval: missing required fields")
	}

	// Get configuration to check approval tier
	config, err := s.configRepo.GetByID(ctx, issue.ConfigurationID)
	if err != nil {
		return fmt.Errorf("failed to get configuration: %w", err)
	}

	// SEC-003: Validate approver has permission based on tier
	if s.userRepo != nil {
		user, err := s.userRepo.GetByID(ctx, approverID)
		if err != nil {
			return fmt.Errorf("failed to get approver: %w", err)
		}

		// Convert entities.UserRole to string for CanApprove check
		userRole := s.mapUserRole(user.Role)
		if !s.CanApprove(userRole, config.ApprovalTier) {
			log.Warn().
				Str("approver_id", approverID.String()).
				Str("user_role", userRole).
				Str("required_tier", string(config.ApprovalTier)).
				Str("issue_id", issueID.String()).
				Msg("SEC-003: User lacks permission to approve this tier")
			return fmt.Errorf("user with role '%s' does not have permission to approve tier '%s' newsletters", userRole, config.ApprovalTier)
		}
	}

	// Update issue to approved status
	now := time.Now()
	issue.Status = domain.IssueStatusApproved
	issue.ApprovedBy = &approverID
	issue.ApprovedAt = &now
	issue.UpdatedAt = now

	if err := s.issueRepo.Update(ctx, issue); err != nil {
		return fmt.Errorf("failed to update issue status: %w", err)
	}

	// Log approval to audit trail
	approvalResourceID := issueID
	auditLog := &domain.AuditLog{
		ID:           uuid.New(),
		Action:       "newsletter_issue_approved",
		ResourceType: "newsletter_issue",
		ResourceID:   &approvalResourceID,
		UserID:       &approverID,
		NewValue: map[string]interface{}{
			"issue_id":         issueID.String(),
			"issue_number":     issue.IssueNumber,
			"configuration_id": issue.ConfigurationID.String(),
			"approval_tier":    config.ApprovalTier,
			"notes":            notes,
		},
		CreatedAt: now,
	}

	if err := s.auditLogRepo.Create(ctx, auditLog); err != nil {
		log.Error().
			Err(err).
			Str("issue_id", issueID.String()).
			Msg("Failed to create audit log for issue approval")
	}

	log.Info().
		Str("issue_id", issueID.String()).
		Int("issue_number", issue.IssueNumber).
		Str("approver_id", approverID.String()).
		Str("approval_tier", string(config.ApprovalTier)).
		Msg("Newsletter issue approved")

	return nil
}

// RejectIssue rejects a newsletter issue with a reason (FR-053, FR-054)
// SEC-003: Implements tier-based rejection validation
func (s *ApprovalService) RejectIssue(ctx context.Context, issueID uuid.UUID, approverID uuid.UUID, reason string) error {
	if issueID == uuid.Nil {
		return fmt.Errorf("issue ID is required")
	}

	if approverID == uuid.Nil {
		return fmt.Errorf("approver ID is required")
	}

	if reason == "" {
		return fmt.Errorf("rejection reason is required")
	}

	// Get the issue
	issue, err := s.issueRepo.GetByID(ctx, issueID)
	if err != nil {
		return fmt.Errorf("failed to get issue: %w", err)
	}

	// Validate status transition
	if issue.Status != domain.IssueStatusPendingApproval {
		return fmt.Errorf("issue must be in pending_approval status, current status: %s", issue.Status)
	}

	if !issue.CanTransitionTo(domain.IssueStatusDraft) {
		return fmt.Errorf("issue cannot transition back to draft status")
	}

	// Get configuration for audit context
	config, err := s.configRepo.GetByID(ctx, issue.ConfigurationID)
	if err != nil {
		return fmt.Errorf("failed to get configuration: %w", err)
	}

	// SEC-003: Validate rejector has permission based on tier
	if s.userRepo != nil {
		user, err := s.userRepo.GetByID(ctx, approverID)
		if err != nil {
			return fmt.Errorf("failed to get rejector: %w", err)
		}

		// Convert entities.UserRole to string for CanApprove check
		userRole := s.mapUserRole(user.Role)
		if !s.CanApprove(userRole, config.ApprovalTier) {
			log.Warn().
				Str("rejector_id", approverID.String()).
				Str("user_role", userRole).
				Str("required_tier", string(config.ApprovalTier)).
				Str("issue_id", issueID.String()).
				Msg("SEC-003: User lacks permission to reject this tier")
			return fmt.Errorf("user with role '%s' does not have permission to reject tier '%s' newsletters", userRole, config.ApprovalTier)
		}
	}

	// Update issue to draft status with rejection details
	now := time.Now()
	issue.Status = domain.IssueStatusDraft
	issue.RejectedBy = &approverID
	issue.RejectedAt = &now
	issue.RejectionReason = &reason
	issue.UpdatedAt = now

	if err := s.issueRepo.Update(ctx, issue); err != nil {
		return fmt.Errorf("failed to update issue status: %w", err)
	}

	// Log rejection to audit trail
	rejectionResourceID := issueID
	auditLog := &domain.AuditLog{
		ID:           uuid.New(),
		Action:       "newsletter_issue_rejected",
		ResourceType: "newsletter_issue",
		ResourceID:   &rejectionResourceID,
		UserID:       &approverID,
		NewValue: map[string]interface{}{
			"issue_id":         issueID.String(),
			"issue_number":     issue.IssueNumber,
			"configuration_id": issue.ConfigurationID.String(),
			"approval_tier":    config.ApprovalTier,
			"rejection_reason": reason,
		},
		CreatedAt: now,
	}

	if err := s.auditLogRepo.Create(ctx, auditLog); err != nil {
		log.Error().
			Err(err).
			Str("issue_id", issueID.String()).
			Msg("Failed to create audit log for issue rejection")
	}

	log.Info().
		Str("issue_id", issueID.String()).
		Int("issue_number", issue.IssueNumber).
		Str("approver_id", approverID.String()).
		Str("reason", reason).
		Msg("Newsletter issue rejected")

	return nil
}

// GetPendingApprovals retrieves all issues pending approval, optionally filtered by tier
func (s *ApprovalService) GetPendingApprovals(ctx context.Context, tier *domain.ApprovalTier) ([]*domain.NewsletterIssue, error) {
	if tier != nil && !tier.IsValid() {
		return nil, fmt.Errorf("invalid approval tier: %s", *tier)
	}

	// Get all pending issues
	issues, err := s.issueRepo.GetPendingApprovals(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get pending approvals: %w", err)
	}

	// If no tier filter, return all
	if tier == nil {
		return issues, nil
	}

	// Filter by tier
	filtered := make([]*domain.NewsletterIssue, 0)
	for _, issue := range issues {
		config, err := s.configRepo.GetByID(ctx, issue.ConfigurationID)
		if err != nil {
			log.Error().
				Err(err).
				Str("issue_id", issue.ID.String()).
				Str("config_id", issue.ConfigurationID.String()).
				Msg("Failed to get configuration for pending issue")
			continue
		}

		if config.ApprovalTier == *tier {
			filtered = append(filtered, issue)
		}
	}

	return filtered, nil
}

// SubmitForApproval transitions an issue from draft to pending approval
func (s *ApprovalService) SubmitForApproval(ctx context.Context, issueID uuid.UUID) error {
	if issueID == uuid.Nil {
		return fmt.Errorf("issue ID is required")
	}

	// Get the issue
	issue, err := s.issueRepo.GetByID(ctx, issueID)
	if err != nil {
		return fmt.Errorf("failed to get issue: %w", err)
	}

	// Validate status transition
	if issue.Status != domain.IssueStatusDraft {
		return fmt.Errorf("issue must be in draft status, current status: %s", issue.Status)
	}

	if !issue.CanTransitionTo(domain.IssueStatusPendingApproval) {
		return fmt.Errorf("issue cannot transition to pending_approval status")
	}

	// Validate issue is ready for approval (has content)
	if len(issue.Blocks) == 0 {
		return fmt.Errorf("issue must have at least one content block")
	}

	if issue.SelectedSubjectLine == nil || *issue.SelectedSubjectLine == "" {
		return fmt.Errorf("issue must have a selected subject line")
	}

	// Get configuration for audit context
	config, err := s.configRepo.GetByID(ctx, issue.ConfigurationID)
	if err != nil {
		return fmt.Errorf("failed to get configuration: %w", err)
	}

	// Update status
	now := time.Now()
	issue.Status = domain.IssueStatusPendingApproval
	issue.UpdatedAt = now

	if err := s.issueRepo.Update(ctx, issue); err != nil {
		return fmt.Errorf("failed to update issue status: %w", err)
	}

	// Log submission to audit trail
	submissionResourceID := issueID
	creatorID := issue.CreatedBy
	auditLog := &domain.AuditLog{
		ID:           uuid.New(),
		Action:       "newsletter_issue_submitted_for_approval",
		ResourceType: "newsletter_issue",
		ResourceID:   &submissionResourceID,
		UserID:       creatorID,
		NewValue: map[string]interface{}{
			"issue_id":         issueID.String(),
			"issue_number":     issue.IssueNumber,
			"configuration_id": issue.ConfigurationID.String(),
			"approval_tier":    config.ApprovalTier,
		},
		CreatedAt: now,
	}

	if err := s.auditLogRepo.Create(ctx, auditLog); err != nil {
		log.Error().
			Err(err).
			Str("issue_id", issueID.String()).
			Msg("Failed to create audit log for issue submission")
	}

	log.Info().
		Str("issue_id", issueID.String()).
		Int("issue_number", issue.IssueNumber).
		Str("approval_tier", string(config.ApprovalTier)).
		Msg("Newsletter issue submitted for approval")

	// TODO: Notify reviewers via webhook (placeholder for future implementation)

	return nil
}

// CanApprove checks if a user can approve issues for a given tier
func (s *ApprovalService) CanApprove(userRole string, tier domain.ApprovalTier) bool {
	if !tier.IsValid() {
		return false
	}

	// Define approval permissions based on tier
	switch tier {
	case domain.TierOne:
		// Tier 1 (Low Risk): Auto-approve or standard reviewer
		// Any authenticated user can review Tier 1
		return userRole == "admin" || userRole == "editor" || userRole == "reviewer"

	case domain.TierTwo:
		// Tier 2 (Medium/High Risk): Senior reviewer or admin required
		return userRole == "admin" || userRole == "senior_reviewer"

	default:
		return false
	}
}

// mapUserRole converts entities.UserRole to a string for approval permission checks
// SEC-003: Maps both entities.UserRole and domain.UserRole to standardized role strings
func (s *ApprovalService) mapUserRole(role entities.UserRole) string {
	switch role {
	case entities.RoleAdmin:
		return "admin"
	case entities.RoleUser:
		return "user"
	default:
		// For extended roles not defined in entities, return as-is
		return string(role)
	}
}

// ============================================================================
// 7-Gate Approval Workflow Methods (FR-100: Multi-stage approval)
// ============================================================================

// ApproveGate approves a specific gate in the 7-gate workflow
// Gates: Marketing → Branding → VoC → SOC L1 → SOC L3 → Compliance → CISO
func (s *ApprovalService) ApproveGate(ctx context.Context, issueID uuid.UUID, approverID uuid.UUID, gate domain.ApprovalGate, notes string) error {
	if issueID == uuid.Nil {
		return fmt.Errorf("issue ID is required")
	}
	if approverID == uuid.Nil {
		return fmt.Errorf("approver ID is required")
	}
	if !gate.IsValid() {
		return fmt.Errorf("invalid approval gate: %s", gate)
	}

	// Get the issue
	issue, err := s.issueRepo.GetByID(ctx, issueID)
	if err != nil {
		return fmt.Errorf("failed to get issue: %w", err)
	}

	// Validate issue is in pending_approval status
	if issue.Status != domain.IssueStatusPendingApproval {
		return fmt.Errorf("issue must be in pending_approval status, current status: %s", issue.Status)
	}

	// Validate user has permission to approve this gate
	if s.userRepo == nil {
		return fmt.Errorf("user repository not configured")
	}

	user, err := s.userRepo.GetByID(ctx, approverID)
	if err != nil {
		return fmt.Errorf("failed to get approver: %w", err)
	}

	userRole := domain.UserRole(user.Role)
	if !userRole.CanApproveGate(gate) {
		log.Warn().
			Str("approver_id", approverID.String()).
			Str("user_role", string(userRole)).
			Str("gate", string(gate)).
			Str("issue_id", issueID.String()).
			Msg("SEC-003: User lacks permission to approve this gate")
		return fmt.Errorf("user with role '%s' does not have permission to approve gate '%s'", userRole, gate)
	}

	// Validate gate sequence (can't skip gates)
	if err := s.validateGateSequence(ctx, issue, gate); err != nil {
		return fmt.Errorf("gate sequence validation failed: %w", err)
	}

	// Check if this gate was already approved
	if s.issueApprovalRepo == nil {
		return fmt.Errorf("issue approval repository not configured")
	}

	existingApproval, err := s.issueApprovalRepo.GetLatestByIssueAndGate(ctx, issueID, gate)
	if err != nil {
		return fmt.Errorf("failed to check existing approval: %w", err)
	}
	if existingApproval != nil {
		return fmt.Errorf("gate '%s' has already been approved", gate)
	}

	// Create approval record
	now := time.Now()
	approval := &domain.IssueApproval{
		ID:         uuid.New(),
		IssueID:    issueID,
		Gate:       gate,
		ApprovedBy: approverID,
		ApprovedAt: now,
	}
	if notes != "" {
		approval.Notes = &notes
	}

	if err := s.issueApprovalRepo.Create(ctx, approval); err != nil {
		return fmt.Errorf("failed to create approval record: %w", err)
	}

	// Update issue's current approval stage
	issue.CurrentApprovalStage = &gate
	issue.UpdatedAt = now

	// Store gate-specific notes
	if notes != "" {
		switch gate {
		case domain.GateVoC:
			issue.VoCNotes = &notes
		case domain.GateCompliance:
			issue.ComplianceNotes = &notes
		}
	}

	// Check if this was the final gate (CISO)
	if gate == domain.GateCISO {
		issue.Status = domain.IssueStatusApproved
		issue.ApprovedBy = &approverID
		issue.ApprovedAt = &now
	}

	if err := s.issueRepo.Update(ctx, issue); err != nil {
		return fmt.Errorf("failed to update issue: %w", err)
	}

	// Audit log
	resourceID := issueID
	auditLog := &domain.AuditLog{
		ID:           uuid.New(),
		Action:       "newsletter_gate_approved",
		ResourceType: "newsletter_issue",
		ResourceID:   &resourceID,
		UserID:       &approverID,
		NewValue: map[string]interface{}{
			"issue_id":     issueID.String(),
			"issue_number": issue.IssueNumber,
			"gate":         gate,
			"notes":        notes,
			"is_final":     gate == domain.GateCISO,
		},
		CreatedAt: now,
	}

	if err := s.auditLogRepo.Create(ctx, auditLog); err != nil {
		log.Error().
			Err(err).
			Str("issue_id", issueID.String()).
			Str("gate", string(gate)).
			Msg("Failed to create audit log for gate approval")
	}

	log.Info().
		Str("issue_id", issueID.String()).
		Int("issue_number", issue.IssueNumber).
		Str("approver_id", approverID.String()).
		Str("gate", string(gate)).
		Bool("is_final", gate == domain.GateCISO).
		Msg("Newsletter gate approved")

	return nil
}

// validateGateSequence ensures gates are approved in order
func (s *ApprovalService) validateGateSequence(ctx context.Context, issue *domain.NewsletterIssue, targetGate domain.ApprovalGate) error {
	if s.issueApprovalRepo == nil {
		return fmt.Errorf("issue approval repository not configured")
	}

	// Get existing approvals for this issue
	existingApprovals, err := s.issueApprovalRepo.GetByIssueID(ctx, issue.ID)
	if err != nil {
		return fmt.Errorf("failed to get existing approvals: %w", err)
	}

	// Build set of approved gates
	approvedGates := make(map[domain.ApprovalGate]bool)
	for _, approval := range existingApprovals {
		approvedGates[approval.Gate] = true
	}

	// Check all preceding gates are approved
	for _, gate := range domain.GateOrder {
		if gate == targetGate {
			break // Reached target gate, all preceding gates are approved
		}
		if !approvedGates[gate] {
			return fmt.Errorf("gate '%s' must be approved before '%s'", gate, targetGate)
		}
	}

	return nil
}

// GetIssueApprovals returns all approvals for a specific issue
func (s *ApprovalService) GetIssueApprovals(ctx context.Context, issueID uuid.UUID) ([]*domain.IssueApproval, error) {
	if issueID == uuid.Nil {
		return nil, fmt.Errorf("issue ID is required")
	}

	if s.issueApprovalRepo == nil {
		return nil, fmt.Errorf("issue approval repository not configured")
	}

	return s.issueApprovalRepo.GetByIssueID(ctx, issueID)
}

// GetNextPendingGate returns the next gate that needs approval for an issue
func (s *ApprovalService) GetNextPendingGate(ctx context.Context, issueID uuid.UUID) (*domain.ApprovalGate, error) {
	if issueID == uuid.Nil {
		return nil, fmt.Errorf("issue ID is required")
	}

	if s.issueApprovalRepo == nil {
		return nil, fmt.Errorf("issue approval repository not configured")
	}

	// Get existing approvals
	existingApprovals, err := s.issueApprovalRepo.GetByIssueID(ctx, issueID)
	if err != nil {
		return nil, fmt.Errorf("failed to get existing approvals: %w", err)
	}

	// Build set of approved gates
	approvedGates := make(map[domain.ApprovalGate]bool)
	for _, approval := range existingApprovals {
		approvedGates[approval.Gate] = true
	}

	// Find first unapproved gate in sequence
	for _, gate := range domain.GateOrder {
		if !approvedGates[gate] {
			return &gate, nil
		}
	}

	// All gates approved
	return nil, nil
}

// GetIssueApprovalStatus returns a summary of approval status for an issue
type IssueApprovalStatus struct {
	IssueID          uuid.UUID                    `json:"issue_id"`
	TotalGates       int                          `json:"total_gates"`
	ApprovedGates    int                          `json:"approved_gates"`
	NextPendingGate  *domain.ApprovalGate         `json:"next_pending_gate,omitempty"`
	IsFullyApproved  bool                         `json:"is_fully_approved"`
	GateStatuses     map[domain.ApprovalGate]bool `json:"gate_statuses"`
	Approvals        []*domain.IssueApproval      `json:"approvals"`
}

func (s *ApprovalService) GetIssueApprovalStatus(ctx context.Context, issueID uuid.UUID) (*IssueApprovalStatus, error) {
	if issueID == uuid.Nil {
		return nil, fmt.Errorf("issue ID is required")
	}

	if s.issueApprovalRepo == nil {
		return nil, fmt.Errorf("issue approval repository not configured")
	}

	// Get all approvals for this issue
	approvals, err := s.issueApprovalRepo.GetByIssueID(ctx, issueID)
	if err != nil {
		return nil, fmt.Errorf("failed to get approvals: %w", err)
	}

	// Build status map
	gateStatuses := make(map[domain.ApprovalGate]bool)
	for _, gate := range domain.GateOrder {
		gateStatuses[gate] = false
	}
	for _, approval := range approvals {
		gateStatuses[approval.Gate] = true
	}

	// Find next pending gate
	var nextPending *domain.ApprovalGate
	for _, gate := range domain.GateOrder {
		if !gateStatuses[gate] {
			nextPending = &gate
			break
		}
	}

	return &IssueApprovalStatus{
		IssueID:          issueID,
		TotalGates:       len(domain.GateOrder),
		ApprovedGates:    len(approvals),
		NextPendingGate:  nextPending,
		IsFullyApproved:  len(approvals) == len(domain.GateOrder),
		GateStatuses:     gateStatuses,
		Approvals:        approvals,
	}, nil
}

// GetPendingApprovalsByGate returns all issues waiting for a specific gate approval
func (s *ApprovalService) GetPendingApprovalsByGate(ctx context.Context, gate domain.ApprovalGate) ([]*domain.NewsletterIssue, error) {
	if !gate.IsValid() {
		return nil, fmt.Errorf("invalid gate: %s", gate)
	}

	// Get all pending issues
	allPending, err := s.issueRepo.GetPendingApprovals(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get pending issues: %w", err)
	}

	// Filter to those waiting for this specific gate
	var waiting []*domain.NewsletterIssue
	for _, issue := range allPending {
		nextGate, err := s.GetNextPendingGate(ctx, issue.ID)
		if err != nil {
			log.Error().
				Err(err).
				Str("issue_id", issue.ID.String()).
				Msg("Failed to get next pending gate")
			continue
		}
		if nextGate != nil && *nextGate == gate {
			waiting = append(waiting, issue)
		}
	}

	return waiting, nil
}

// CanUserApproveAnyGate checks if user can approve any gate for an issue
func (s *ApprovalService) CanUserApproveAnyGate(ctx context.Context, issueID uuid.UUID, userID uuid.UUID) (bool, *domain.ApprovalGate, error) {
	if issueID == uuid.Nil || userID == uuid.Nil {
		return false, nil, fmt.Errorf("issue ID and user ID are required")
	}

	if s.userRepo == nil {
		return false, nil, fmt.Errorf("user repository not configured")
	}

	// Get user
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return false, nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Get next pending gate
	nextGate, err := s.GetNextPendingGate(ctx, issueID)
	if err != nil {
		return false, nil, fmt.Errorf("failed to get next pending gate: %w", err)
	}

	if nextGate == nil {
		return false, nil, nil // All gates approved
	}

	// Check if user can approve this gate
	userRole := domain.UserRole(user.Role)
	if userRole.CanApproveGate(*nextGate) {
		return true, nextGate, nil
	}

	return false, nextGate, nil
}

// UpdateVoCNotes updates the VoC expert notes for an issue
func (s *ApprovalService) UpdateVoCNotes(ctx context.Context, issueID uuid.UUID, userID uuid.UUID, notes string) error {
	if issueID == uuid.Nil {
		return fmt.Errorf("issue ID is required")
	}
	if userID == uuid.Nil {
		return fmt.Errorf("user ID is required")
	}

	// Verify user has VoC role
	if s.userRepo != nil {
		user, err := s.userRepo.GetByID(ctx, userID)
		if err != nil {
			return fmt.Errorf("failed to get user: %w", err)
		}
		userRole := domain.UserRole(user.Role)
		if userRole != domain.RoleVoCExpert && userRole != domain.RoleAdmin {
			return fmt.Errorf("user does not have permission to update VoC notes")
		}
	}

	issue, err := s.issueRepo.GetByID(ctx, issueID)
	if err != nil {
		return fmt.Errorf("failed to get issue: %w", err)
	}

	issue.VoCNotes = &notes
	issue.UpdatedAt = time.Now()

	if err := s.issueRepo.Update(ctx, issue); err != nil {
		return fmt.Errorf("failed to update issue: %w", err)
	}

	log.Info().
		Str("issue_id", issueID.String()).
		Str("user_id", userID.String()).
		Msg("VoC notes updated")

	return nil
}

// UpdateComplianceNotes updates the compliance notes for an issue
func (s *ApprovalService) UpdateComplianceNotes(ctx context.Context, issueID uuid.UUID, userID uuid.UUID, notes string) error {
	if issueID == uuid.Nil {
		return fmt.Errorf("issue ID is required")
	}
	if userID == uuid.Nil {
		return fmt.Errorf("user ID is required")
	}

	// Verify user has Compliance role
	if s.userRepo != nil {
		user, err := s.userRepo.GetByID(ctx, userID)
		if err != nil {
			return fmt.Errorf("failed to get user: %w", err)
		}
		userRole := domain.UserRole(user.Role)
		if userRole != domain.RoleComplianceSME && userRole != domain.RoleAdmin {
			return fmt.Errorf("user does not have permission to update compliance notes")
		}
	}

	issue, err := s.issueRepo.GetByID(ctx, issueID)
	if err != nil {
		return fmt.Errorf("failed to get issue: %w", err)
	}

	issue.ComplianceNotes = &notes
	issue.UpdatedAt = time.Now()

	if err := s.issueRepo.Update(ctx, issue); err != nil {
		return fmt.Errorf("failed to update issue: %w", err)
	}

	log.Info().
		Str("issue_id", issueID.String()).
		Str("user_id", userID.String()).
		Msg("Compliance notes updated")

	return nil
}

// ============================================================================
// Article Approval Methods (for article approval workflow)
// ============================================================================

// GetAllPendingArticles returns all articles pending approval (admin only)
func (s *ApprovalService) GetAllPendingArticles(ctx context.Context, opts repository.QueryOptions) ([]domain.Article, int, error) {
	// Stub implementation - to be implemented when article approval feature is complete
	return []domain.Article{}, 0, nil
}

// GetQueueForUser returns articles pending approval for a specific user's role
func (s *ApprovalService) GetQueueForUser(ctx context.Context, role domain.UserRole, opts repository.QueryOptions) ([]domain.Article, int, error) {
	// Stub implementation - to be implemented when article approval feature is complete
	return []domain.Article{}, 0, nil
}

// ApproveArticle approves an article at the current gate
func (s *ApprovalService) ApproveArticle(ctx context.Context, articleID uuid.UUID, userID uuid.UUID, role domain.UserRole, notes string) error {
	// Stub implementation - to be implemented when article approval feature is complete
	return fmt.Errorf("article approval not yet implemented")
}

// RejectArticle rejects an article with a reason
func (s *ApprovalService) RejectArticle(ctx context.Context, articleID uuid.UUID, userID uuid.UUID, role domain.UserRole, reason string) error {
	// Stub implementation - to be implemented when article approval feature is complete
	return fmt.Errorf("article rejection not yet implemented")
}

// ReleaseArticle publishes a fully-approved article
func (s *ApprovalService) ReleaseArticle(ctx context.Context, articleID uuid.UUID, userID uuid.UUID, role domain.UserRole) error {
	// Stub implementation - to be implemented when article approval feature is complete
	return fmt.Errorf("article release not yet implemented")
}

// ResetArticle resets a rejected article back to initial state (admin only)
func (s *ApprovalService) ResetArticle(ctx context.Context, articleID uuid.UUID, userID uuid.UUID, role domain.UserRole) error {
	// Stub implementation - to be implemented when article approval feature is complete
	return fmt.Errorf("article reset not yet implemented")
}

// GetApprovalHistory returns the approval history for an article
func (s *ApprovalService) GetApprovalHistory(ctx context.Context, articleID uuid.UUID) ([]domain.ArticleApproval, error) {
	// Stub implementation - to be implemented when article approval feature is complete
	return []domain.ArticleApproval{}, nil
}
