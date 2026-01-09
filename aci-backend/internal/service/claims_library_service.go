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

// ClaimsLibraryService handles claims library business logic
type ClaimsLibraryService struct {
	claimsRepo   repository.ClaimsLibraryRepository
	auditLogRepo repository.AuditLogRepository
}

// NewClaimsLibraryService creates a new claims library service
func NewClaimsLibraryService(
	claimsRepo repository.ClaimsLibraryRepository,
	auditLogRepo repository.AuditLogRepository,
) *ClaimsLibraryService {
	if claimsRepo == nil {
		panic("claimsRepo cannot be nil")
	}
	if auditLogRepo == nil {
		panic("auditLogRepo cannot be nil")
	}

	return &ClaimsLibraryService{
		claimsRepo:   claimsRepo,
		auditLogRepo: auditLogRepo,
	}
}

// Create creates a new claim in the library
func (s *ClaimsLibraryService) Create(ctx context.Context, claim *domain.ClaimsLibraryEntry) error {
	if claim == nil {
		return fmt.Errorf("claim cannot be nil")
	}

	now := time.Now()
	claim.ID = uuid.New()
	claim.CreatedAt = now
	claim.UpdatedAt = now
	claim.UsageCount = 0
	claim.ApprovalStatus = domain.ClaimStatusPending

	// Normalize and validate
	claim.ClaimText = strings.TrimSpace(claim.ClaimText)
	claim.Category = strings.TrimSpace(claim.Category)

	if err := claim.Validate(); err != nil {
		return fmt.Errorf("claim validation failed: %w", err)
	}

	if err := s.claimsRepo.Create(ctx, claim); err != nil {
		return fmt.Errorf("failed to create claim: %w", err)
	}

	// Create audit log entry
	s.createAuditLog(ctx, "claim_created", claim.ID, claim.CreatedBy)

	log.Info().
		Str("claim_id", claim.ID.String()).
		Str("claim_type", string(claim.ClaimType)).
		Str("category", claim.Category).
		Msg("Claim created")

	return nil
}

// GetByID retrieves a claim by ID
func (s *ClaimsLibraryService) GetByID(ctx context.Context, id uuid.UUID) (*domain.ClaimsLibraryEntry, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("claim ID is required")
	}

	claim, err := s.claimsRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get claim: %w", err)
	}

	return claim, nil
}

// List retrieves claims with filtering
func (s *ClaimsLibraryService) List(ctx context.Context, filter *domain.ClaimsLibraryFilter) ([]*domain.ClaimsLibraryEntry, int, error) {
	if filter == nil {
		filter = &domain.ClaimsLibraryFilter{}
	}
	filter.WithDefaults()

	if err := filter.Validate(); err != nil {
		return nil, 0, fmt.Errorf("invalid filter: %w", err)
	}

	claims, total, err := s.claimsRepo.List(ctx, filter)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list claims: %w", err)
	}

	return claims, total, nil
}

// Update modifies an existing claim
func (s *ClaimsLibraryService) Update(ctx context.Context, claim *domain.ClaimsLibraryEntry, updatedBy uuid.UUID) error {
	if claim == nil {
		return fmt.Errorf("claim cannot be nil")
	}

	if claim.ID == uuid.Nil {
		return fmt.Errorf("claim ID is required")
	}

	// Verify claim exists
	existing, err := s.claimsRepo.GetByID(ctx, claim.ID)
	if err != nil {
		return fmt.Errorf("claim not found: %w", err)
	}

	// Preserve immutable fields
	claim.CreatedAt = existing.CreatedAt
	claim.CreatedBy = existing.CreatedBy
	claim.UsageCount = existing.UsageCount
	claim.LastUsedAt = existing.LastUsedAt
	claim.UpdatedAt = time.Now()

	// If claim is approved and text changed, reset to pending
	if existing.ApprovalStatus == domain.ClaimStatusApproved && claim.ClaimText != existing.ClaimText {
		claim.ApprovalStatus = domain.ClaimStatusPending
		claim.ApprovedBy = nil
		claim.ApprovedAt = nil
	}

	// Normalize
	claim.ClaimText = strings.TrimSpace(claim.ClaimText)
	claim.Category = strings.TrimSpace(claim.Category)

	if err := claim.Validate(); err != nil {
		return fmt.Errorf("claim validation failed: %w", err)
	}

	if err := s.claimsRepo.Update(ctx, claim); err != nil {
		return fmt.Errorf("failed to update claim: %w", err)
	}

	// Create audit log entry
	s.createAuditLog(ctx, "claim_updated", claim.ID, updatedBy)

	log.Info().
		Str("claim_id", claim.ID.String()).
		Msg("Claim updated")

	return nil
}

// Delete removes a claim from the library
func (s *ClaimsLibraryService) Delete(ctx context.Context, id uuid.UUID, deletedBy uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("claim ID is required")
	}

	// Verify claim exists
	claim, err := s.claimsRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("claim not found: %w", err)
	}

	// Prevent deletion of heavily used claims
	if claim.UsageCount > 10 {
		return fmt.Errorf("cannot delete claim with %d usages; consider expiring instead", claim.UsageCount)
	}

	if err := s.claimsRepo.Delete(ctx, id); err != nil {
		return fmt.Errorf("failed to delete claim: %w", err)
	}

	// Create audit log entry
	s.createAuditLog(ctx, "claim_deleted", id, deletedBy)

	log.Info().
		Str("claim_id", id.String()).
		Msg("Claim deleted")

	return nil
}

// Approve approves a pending claim
func (s *ClaimsLibraryService) Approve(ctx context.Context, id uuid.UUID, approvedBy uuid.UUID, expiresAt *time.Time, notes *string) error {
	if id == uuid.Nil {
		return fmt.Errorf("claim ID is required")
	}

	if approvedBy == uuid.Nil {
		return fmt.Errorf("approvedBy user ID is required")
	}

	// Verify claim exists and is in pending state
	claim, err := s.claimsRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("claim not found: %w", err)
	}

	if claim.ApprovalStatus != domain.ClaimStatusPending {
		return fmt.Errorf("claim is not in pending status; current status: %s", claim.ApprovalStatus)
	}

	// For claims (not disclaimers or do_not_say), require source reference
	if claim.ClaimType == domain.ClaimTypeClaim && (claim.SourceReference == nil || *claim.SourceReference == "") {
		return fmt.Errorf("claims require a source reference before approval")
	}

	if err := s.claimsRepo.Approve(ctx, id, approvedBy, expiresAt); err != nil {
		return fmt.Errorf("failed to approve claim: %w", err)
	}

	// Update notes if provided
	if notes != nil {
		claim.Notes = notes
		claim.UpdatedAt = time.Now()
		if err := s.claimsRepo.Update(ctx, claim); err != nil {
			log.Error().Err(err).Str("claim_id", id.String()).Msg("Failed to update notes after approval")
		}
	}

	// Create audit log entry
	s.createAuditLog(ctx, "claim_approved", id, approvedBy)

	log.Info().
		Str("claim_id", id.String()).
		Str("approved_by", approvedBy.String()).
		Msg("Claim approved")

	return nil
}

// Reject rejects a pending claim
func (s *ClaimsLibraryService) Reject(ctx context.Context, id uuid.UUID, rejectedBy uuid.UUID, reason string) error {
	if id == uuid.Nil {
		return fmt.Errorf("claim ID is required")
	}

	if rejectedBy == uuid.Nil {
		return fmt.Errorf("rejectedBy user ID is required")
	}

	reason = strings.TrimSpace(reason)
	if reason == "" {
		return fmt.Errorf("rejection reason is required")
	}

	// Verify claim exists
	claim, err := s.claimsRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("claim not found: %w", err)
	}

	if claim.ApprovalStatus != domain.ClaimStatusPending {
		return fmt.Errorf("claim is not in pending status; current status: %s", claim.ApprovalStatus)
	}

	if err := s.claimsRepo.Reject(ctx, id, rejectedBy, reason); err != nil {
		return fmt.Errorf("failed to reject claim: %w", err)
	}

	// Create audit log entry
	s.createAuditLog(ctx, "claim_rejected", id, rejectedBy)

	log.Info().
		Str("claim_id", id.String()).
		Str("rejected_by", rejectedBy.String()).
		Str("reason", reason).
		Msg("Claim rejected")

	return nil
}

// Expire marks an approved claim as expired
func (s *ClaimsLibraryService) Expire(ctx context.Context, id uuid.UUID, expiredBy uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("claim ID is required")
	}

	claim, err := s.claimsRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("claim not found: %w", err)
	}

	if claim.ApprovalStatus != domain.ClaimStatusApproved {
		return fmt.Errorf("only approved claims can be expired")
	}

	now := time.Now()
	claim.ExpiresAt = &now
	claim.ApprovalStatus = domain.ClaimStatusExpired
	claim.UpdatedAt = now

	if err := s.claimsRepo.Update(ctx, claim); err != nil {
		return fmt.Errorf("failed to expire claim: %w", err)
	}

	// Create audit log entry
	s.createAuditLog(ctx, "claim_expired", id, expiredBy)

	log.Info().
		Str("claim_id", id.String()).
		Msg("Claim expired")

	return nil
}

// ExtendExpiration extends the expiration date of an approved claim
func (s *ClaimsLibraryService) ExtendExpiration(ctx context.Context, id uuid.UUID, newExpiresAt time.Time, extendedBy uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("claim ID is required")
	}

	if newExpiresAt.Before(time.Now()) {
		return fmt.Errorf("new expiration date must be in the future")
	}

	claim, err := s.claimsRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("claim not found: %w", err)
	}

	if claim.ApprovalStatus != domain.ClaimStatusApproved && claim.ApprovalStatus != domain.ClaimStatusExpired {
		return fmt.Errorf("only approved or expired claims can have expiration extended")
	}

	claim.ExpiresAt = &newExpiresAt
	claim.ApprovalStatus = domain.ClaimStatusApproved // Re-approve if was expired
	claim.UpdatedAt = time.Now()

	if err := s.claimsRepo.Update(ctx, claim); err != nil {
		return fmt.Errorf("failed to extend expiration: %w", err)
	}

	// Create audit log entry
	s.createAuditLog(ctx, "claim_expiration_extended", id, extendedBy)

	log.Info().
		Str("claim_id", id.String()).
		Time("new_expires_at", newExpiresAt).
		Msg("Claim expiration extended")

	return nil
}

// GetUsableClaims returns all approved, non-expired claims
func (s *ClaimsLibraryService) GetUsableClaims(ctx context.Context, claimType *domain.ClaimType) ([]*domain.ClaimsLibraryEntry, error) {
	if claimType != nil {
		return s.claimsRepo.GetApprovedByType(ctx, *claimType)
	}

	// Return all approved claims
	filter := &domain.ClaimsLibraryFilter{
		ApprovalStatus: func() *domain.ClaimApprovalStatus {
			s := domain.ClaimStatusApproved
			return &s
		}(),
		IncludeExpired: false,
		Page:           1,
		PageSize:       1000,
	}
	claims, _, err := s.claimsRepo.List(ctx, filter)
	return claims, err
}

// GetDoNotSayList returns all active do-not-say items
func (s *ClaimsLibraryService) GetDoNotSayList(ctx context.Context) ([]*domain.ClaimsLibraryEntry, error) {
	return s.claimsRepo.GetDoNotSayItems(ctx)
}

// GetExpiringSoon returns claims expiring within the specified duration
func (s *ClaimsLibraryService) GetExpiringSoon(ctx context.Context, within time.Duration) ([]*domain.ClaimsLibraryEntry, error) {
	return s.claimsRepo.GetExpiringSoon(ctx, within)
}

// ListCategories returns all distinct categories
func (s *ClaimsLibraryService) ListCategories(ctx context.Context) ([]string, error) {
	return s.claimsRepo.ListCategories(ctx)
}

// SearchClaims performs full-text search on claims
func (s *ClaimsLibraryService) SearchClaims(ctx context.Context, query string, limit int) ([]*domain.ClaimsLibraryEntry, error) {
	query = strings.TrimSpace(query)
	if query == "" {
		return nil, fmt.Errorf("search query is required")
	}

	if limit <= 0 {
		limit = 20
	}

	return s.claimsRepo.SearchFullText(ctx, query, limit)
}

// TrackUsage increments the usage count for claims linked to a block
func (s *ClaimsLibraryService) TrackUsage(ctx context.Context, claimIDs []uuid.UUID) error {
	if len(claimIDs) == 0 {
		return nil
	}

	return s.claimsRepo.BulkIncrementUsage(ctx, claimIDs)
}

// ValidateContent checks content against do-not-say items
func (s *ClaimsLibraryService) ValidateContent(ctx context.Context, content string, blockID *uuid.UUID) (*domain.ClaimValidationResult, error) {
	content = strings.ToLower(content)

	doNotSayItems, err := s.claimsRepo.GetDoNotSayItems(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get do-not-say items: %w", err)
	}

	result := &domain.ClaimValidationResult{
		IsValid:    true,
		Violations: make([]domain.ClaimViolation, 0),
	}

	for _, item := range doNotSayItems {
		phrase := strings.ToLower(item.ClaimText)
		if strings.Contains(content, phrase) {
			result.IsValid = false
			violation := domain.ClaimViolation{
				ClaimID:       item.ID,
				ClaimText:     item.ClaimText,
				MatchedPhrase: phrase,
				BlockID:       blockID,
			}
			result.Violations = append(result.Violations, violation)
		}
	}

	return result, nil
}

// ValidateClaimsReferences validates that all claim references are valid and usable
func (s *ClaimsLibraryService) ValidateClaimsReferences(ctx context.Context, claimIDs []uuid.UUID) ([]uuid.UUID, error) {
	if len(claimIDs) == 0 {
		return []uuid.UUID{}, nil
	}

	claims, err := s.claimsRepo.GetByIDs(ctx, claimIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to get claims: %w", err)
	}

	// Build map for quick lookup
	claimMap := make(map[uuid.UUID]*domain.ClaimsLibraryEntry)
	for _, claim := range claims {
		claimMap[claim.ID] = claim
	}

	// Find invalid references
	invalidIDs := make([]uuid.UUID, 0)
	for _, id := range claimIDs {
		claim, exists := claimMap[id]
		if !exists || !claim.IsUsable() {
			invalidIDs = append(invalidIDs, id)
		}
	}

	return invalidIDs, nil
}

// GetByIDs retrieves multiple claims by their IDs
func (s *ClaimsLibraryService) GetByIDs(ctx context.Context, ids []uuid.UUID) ([]*domain.ClaimsLibraryEntry, error) {
	return s.claimsRepo.GetByIDs(ctx, ids)
}

// Helper method to create audit logs
func (s *ClaimsLibraryService) createAuditLog(ctx context.Context, action string, claimID uuid.UUID, userID uuid.UUID) {
	resourceID := claimID
	auditLog := &domain.AuditLog{
		ID:           uuid.New(),
		Action:       action,
		ResourceType: "claims_library",
		ResourceID:   &resourceID,
		UserID:       &userID,
		CreatedAt:    time.Now(),
	}
	if err := s.auditLogRepo.Create(ctx, auditLog); err != nil {
		log.Error().Err(err).
			Str("action", action).
			Str("claim_id", claimID.String()).
			Msg("Failed to create audit log")
	}
}
