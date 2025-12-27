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

// SegmentService handles segment business logic
type SegmentService struct {
	segmentRepo  repository.SegmentRepository
	contactRepo  repository.ContactRepository
	auditLogRepo repository.AuditLogRepository
}

// NewSegmentService creates a new segment service
func NewSegmentService(
	segmentRepo repository.SegmentRepository,
	contactRepo repository.ContactRepository,
	auditLogRepo repository.AuditLogRepository,
) *SegmentService {
	if segmentRepo == nil {
		panic("segmentRepo cannot be nil")
	}
	if contactRepo == nil {
		panic("contactRepo cannot be nil")
	}
	if auditLogRepo == nil {
		panic("auditLogRepo cannot be nil")
	}

	return &SegmentService{
		segmentRepo:  segmentRepo,
		contactRepo:  contactRepo,
		auditLogRepo: auditLogRepo,
	}
}

// Create creates a new segment
func (s *SegmentService) Create(ctx context.Context, segment *domain.Segment) error {
	if segment == nil {
		return fmt.Errorf("segment cannot be nil")
	}

	now := time.Now()
	segment.ID = uuid.New()
	segment.CreatedAt = now
	segment.UpdatedAt = now

	if err := segment.Validate(); err != nil {
		return fmt.Errorf("segment validation failed: %w", err)
	}

	if err := s.segmentRepo.Create(ctx, segment); err != nil {
		return fmt.Errorf("failed to create segment: %w", err)
	}

	// Create audit log entry
	resourceID := segment.ID
	auditLog := &domain.AuditLog{
		ID:           uuid.New(),
		Action:       "segment_created",
		ResourceType: "segment",
		ResourceID:   &resourceID,
		UserID:       &segment.CreatedBy,
		CreatedAt:    now,
	}
	if err := s.auditLogRepo.Create(ctx, auditLog); err != nil {
		log.Error().Err(err).Str("segment_id", segment.ID.String()).Msg("Failed to create audit log for segment creation")
	}

	log.Info().
		Str("segment_id", segment.ID.String()).
		Str("name", segment.Name).
		Msg("Segment created")

	return nil
}

// GetByID retrieves a segment by ID
func (s *SegmentService) GetByID(ctx context.Context, id uuid.UUID) (*domain.Segment, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("segment ID is required")
	}

	segment, err := s.segmentRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get segment: %w", err)
	}

	return segment, nil
}

// List retrieves segments with filtering
func (s *SegmentService) List(ctx context.Context, filter *domain.SegmentFilter) ([]*domain.Segment, int, error) {
	if filter == nil {
		filter = &domain.SegmentFilter{
			Limit:  20,
			Offset: 0,
		}
	}

	if filter.Limit <= 0 {
		filter.Limit = 20
	}

	segments, total, err := s.segmentRepo.List(ctx, filter)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list segments: %w", err)
	}

	return segments, total, nil
}

// Update modifies an existing segment
func (s *SegmentService) Update(ctx context.Context, segment *domain.Segment) error {
	if segment == nil {
		return fmt.Errorf("segment cannot be nil")
	}

	if segment.ID == uuid.Nil {
		return fmt.Errorf("segment ID is required")
	}

	// Verify segment exists
	existing, err := s.segmentRepo.GetByID(ctx, segment.ID)
	if err != nil {
		return fmt.Errorf("segment not found: %w", err)
	}

	segment.CreatedAt = existing.CreatedAt
	segment.CreatedBy = existing.CreatedBy
	segment.UpdatedAt = time.Now()

	if err := segment.Validate(); err != nil {
		return fmt.Errorf("segment validation failed: %w", err)
	}

	if err := s.segmentRepo.Update(ctx, segment); err != nil {
		return fmt.Errorf("failed to update segment: %w", err)
	}

	// Create audit log entry
	updateResourceID := segment.ID
	auditLog := &domain.AuditLog{
		ID:           uuid.New(),
		Action:       "segment_updated",
		ResourceType: "segment",
		ResourceID:   &updateResourceID,
		UserID:       &segment.CreatedBy,
		CreatedAt:    time.Now(),
	}
	if err := s.auditLogRepo.Create(ctx, auditLog); err != nil {
		log.Error().Err(err).Str("segment_id", segment.ID.String()).Msg("Failed to create audit log for segment update")
	}

	log.Info().
		Str("segment_id", segment.ID.String()).
		Str("name", segment.Name).
		Msg("Segment updated")

	return nil
}

// Delete removes a segment (only if no contacts exist)
func (s *SegmentService) Delete(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("segment ID is required")
	}

	// Verify segment exists
	segment, err := s.segmentRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("segment not found: %w", err)
	}

	// Check for existing contacts
	contacts, count, err := s.contactRepo.GetBySegmentID(ctx, id, 1, 0)
	if err != nil {
		return fmt.Errorf("failed to check segment contacts: %w", err)
	}
	_ = contacts // We only need the count

	if count > 0 {
		return fmt.Errorf("cannot delete segment with %d existing contacts", count)
	}

	if err := s.segmentRepo.Delete(ctx, id); err != nil {
		return fmt.Errorf("failed to delete segment: %w", err)
	}

	// Create audit log entry
	deleteResourceID := id
	auditLog := &domain.AuditLog{
		ID:           uuid.New(),
		Action:       "segment_deleted",
		ResourceType: "segment",
		ResourceID:   &deleteResourceID,
		UserID:       &segment.CreatedBy,
		CreatedAt:    time.Now(),
	}
	if err := s.auditLogRepo.Create(ctx, auditLog); err != nil {
		log.Error().Err(err).Str("segment_id", id.String()).Msg("Failed to create audit log for segment deletion")
	}

	log.Info().
		Str("segment_id", id.String()).
		Msg("Segment deleted")

	return nil
}

// GetContacts retrieves contacts for a segment
func (s *SegmentService) GetContacts(ctx context.Context, segmentID uuid.UUID, limit, offset int) ([]*domain.Contact, int, error) {
	if segmentID == uuid.Nil {
		return nil, 0, fmt.Errorf("segment ID is required")
	}

	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	// Verify segment exists
	_, err := s.segmentRepo.GetByID(ctx, segmentID)
	if err != nil {
		return nil, 0, fmt.Errorf("segment not found: %w", err)
	}

	contacts, total, err := s.contactRepo.GetBySegmentID(ctx, segmentID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get segment contacts: %w", err)
	}

	return contacts, total, nil
}

// RecalculateContactCount updates the contact count for a segment
func (s *SegmentService) RecalculateContactCount(ctx context.Context, segmentID uuid.UUID) error {
	if segmentID == uuid.Nil {
		return fmt.Errorf("segment ID is required")
	}

	// Verify segment exists
	_, err := s.segmentRepo.GetByID(ctx, segmentID)
	if err != nil {
		return fmt.Errorf("segment not found: %w", err)
	}

	// Get actual count
	_, count, err := s.contactRepo.GetBySegmentID(ctx, segmentID, 1, 0)
	if err != nil {
		return fmt.Errorf("failed to count segment contacts: %w", err)
	}

	// Update segment contact count
	if err := s.segmentRepo.UpdateContactCount(ctx, segmentID, count); err != nil {
		return fmt.Errorf("failed to update contact count: %w", err)
	}

	log.Info().
		Str("segment_id", segmentID.String()).
		Int("contact_count", count).
		Msg("Segment contact count recalculated")

	return nil
}

// EvaluateMembership checks if a contact matches segment criteria
func (s *SegmentService) EvaluateMembership(ctx context.Context, segmentID uuid.UUID, contact *domain.Contact) (bool, error) {
	if segmentID == uuid.Nil {
		return false, fmt.Errorf("segment ID is required")
	}

	if contact == nil {
		return false, fmt.Errorf("contact cannot be nil")
	}

	segment, err := s.segmentRepo.GetByID(ctx, segmentID)
	if err != nil {
		return false, fmt.Errorf("segment not found: %w", err)
	}

	// Check industry criteria
	if len(segment.Industries) > 0 {
		if contact.Industry == nil || !containsStr(segment.Industries, *contact.Industry) {
			return false, nil
		}
	}

	// Check company size criteria
	if len(segment.CompanySizeBands) > 0 {
		if contact.CompanySizeBand == nil || !containsStr(segment.CompanySizeBands, *contact.CompanySizeBand) {
			return false, nil
		}
	}

	// Check role cluster criteria
	if segment.RoleCluster != nil && *segment.RoleCluster != "" {
		if contact.RoleCategory == nil || *contact.RoleCategory != *segment.RoleCluster {
			return false, nil
		}
	}

	// Check region criteria
	if len(segment.Regions) > 0 {
		if contact.Region == nil || !containsStr(segment.Regions, *contact.Region) {
			return false, nil
		}
	}

	// Check engagement score minimum
	if segment.MinEngagementScore != nil {
		if contact.EngagementScore < *segment.MinEngagementScore {
			return false, nil
		}
	}

	// Check partner tags (contact must have at least one of the segment's required tags)
	if len(segment.PartnerTags) > 0 {
		hasPartnerTag := false
		for _, requiredTag := range segment.PartnerTags {
			if containsStr(contact.PartnerTags, requiredTag) {
				hasPartnerTag = true
				break
			}
		}
		if !hasPartnerTag {
			return false, nil
		}
	}

	// Check exclusions
	if segment.ExcludeUnsubscribed && !contact.IsSubscribed {
		return false, nil
	}

	if segment.ExcludeBounced && contact.IsBounced {
		return false, nil
	}

	if segment.ExcludeHighTouch && contact.IsHighTouch {
		return false, nil
	}

	// Check frequency cap
	if segment.MaxNewslettersPer30Days > 0 {
		if contact.NewslettersSent30Days >= segment.MaxNewslettersPer30Days {
			return false, nil
		}
	}

	return true, nil
}

// containsStr checks if a slice contains a string value
func containsStr(slice []string, value string) bool {
	for _, v := range slice {
		if v == value {
			return true
		}
	}
	return false
}
