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

// NewsletterConfigService handles newsletter configuration business logic
type NewsletterConfigService struct {
	configRepo   repository.NewsletterConfigRepository
	auditLogRepo repository.AuditLogRepository
}

// NewNewsletterConfigService creates a new newsletter config service
func NewNewsletterConfigService(
	configRepo repository.NewsletterConfigRepository,
	auditLogRepo repository.AuditLogRepository,
) *NewsletterConfigService {
	if configRepo == nil {
		panic("configRepo cannot be nil")
	}
	if auditLogRepo == nil {
		panic("auditLogRepo cannot be nil")
	}

	return &NewsletterConfigService{
		configRepo:   configRepo,
		auditLogRepo: auditLogRepo,
	}
}

// Create creates a new newsletter configuration
func (s *NewsletterConfigService) Create(ctx context.Context, config *domain.NewsletterConfiguration) error {
	if config == nil {
		return fmt.Errorf("configuration cannot be nil")
	}

	now := time.Now()
	config.ID = uuid.New()
	config.CreatedAt = now
	config.UpdatedAt = now

	if err := config.Validate(); err != nil {
		return fmt.Errorf("configuration validation failed: %w", err)
	}

	if err := s.configRepo.Create(ctx, config); err != nil {
		return fmt.Errorf("failed to create configuration: %w", err)
	}

	// Create audit log entry
	resourceID := config.ID
	auditLog := &domain.AuditLog{
		ID:           uuid.New(),
		Action:       "newsletter_config_created",
		ResourceType: "newsletter_configuration",
		ResourceID:   &resourceID,
		UserID:       &config.CreatedBy,
		CreatedAt:    now,
	}
	if err := s.auditLogRepo.Create(ctx, auditLog); err != nil {
		log.Error().Err(err).Str("config_id", config.ID.String()).Msg("Failed to create audit log for config creation")
	}

	log.Info().
		Str("config_id", config.ID.String()).
		Str("name", config.Name).
		Msg("Newsletter configuration created")

	return nil
}

// GetByID retrieves a configuration by ID
func (s *NewsletterConfigService) GetByID(ctx context.Context, id uuid.UUID) (*domain.NewsletterConfiguration, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("configuration ID is required")
	}

	config, err := s.configRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get configuration: %w", err)
	}

	return config, nil
}

// List retrieves configurations with filtering
func (s *NewsletterConfigService) List(ctx context.Context, filter *domain.NewsletterConfigFilter) ([]*domain.NewsletterConfiguration, int, error) {
	if filter == nil {
		filter = &domain.NewsletterConfigFilter{
			Limit: 20,
			Page:  1,
		}
	}

	if filter.Limit <= 0 {
		filter.Limit = 20
	}
	if filter.Page <= 0 {
		filter.Page = 1
	}

	if err := filter.Validate(); err != nil {
		return nil, 0, fmt.Errorf("invalid filter: %w", err)
	}

	configs, total, err := s.configRepo.List(ctx, filter)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list configurations: %w", err)
	}

	return configs, total, nil
}

// Update modifies an existing configuration
func (s *NewsletterConfigService) Update(ctx context.Context, config *domain.NewsletterConfiguration) error {
	if config == nil {
		return fmt.Errorf("configuration cannot be nil")
	}

	if config.ID == uuid.Nil {
		return fmt.Errorf("configuration ID is required")
	}

	// Verify configuration exists
	existing, err := s.configRepo.GetByID(ctx, config.ID)
	if err != nil {
		return fmt.Errorf("configuration not found: %w", err)
	}

	config.CreatedAt = existing.CreatedAt
	config.CreatedBy = existing.CreatedBy
	config.UpdatedAt = time.Now()

	if err := config.Validate(); err != nil {
		return fmt.Errorf("configuration validation failed: %w", err)
	}

	if err := s.configRepo.Update(ctx, config); err != nil {
		return fmt.Errorf("failed to update configuration: %w", err)
	}

	// Create audit log entry
	updateResourceID := config.ID
	auditLog := &domain.AuditLog{
		ID:           uuid.New(),
		Action:       "newsletter_config_updated",
		ResourceType: "newsletter_configuration",
		ResourceID:   &updateResourceID,
		UserID:       &config.CreatedBy,
		CreatedAt:    time.Now(),
	}
	if err := s.auditLogRepo.Create(ctx, auditLog); err != nil {
		log.Error().Err(err).Str("config_id", config.ID.String()).Msg("Failed to create audit log for config update")
	}

	log.Info().
		Str("config_id", config.ID.String()).
		Str("name", config.Name).
		Msg("Newsletter configuration updated")

	return nil
}

// Delete removes a configuration
func (s *NewsletterConfigService) Delete(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("configuration ID is required")
	}

	// Verify configuration exists
	config, err := s.configRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("configuration not found: %w", err)
	}

	if err := s.configRepo.Delete(ctx, id); err != nil {
		return fmt.Errorf("failed to delete configuration: %w", err)
	}

	// Create audit log entry
	deleteResourceID := id
	auditLog := &domain.AuditLog{
		ID:           uuid.New(),
		Action:       "newsletter_config_deleted",
		ResourceType: "newsletter_configuration",
		ResourceID:   &deleteResourceID,
		UserID:       &config.CreatedBy,
		CreatedAt:    time.Now(),
	}
	if err := s.auditLogRepo.Create(ctx, auditLog); err != nil {
		log.Error().Err(err).Str("config_id", id.String()).Msg("Failed to create audit log for config deletion")
	}

	log.Info().
		Str("config_id", id.String()).
		Msg("Newsletter configuration deleted")

	return nil
}

// Clone creates a copy of an existing configuration
func (s *NewsletterConfigService) Clone(ctx context.Context, sourceID uuid.UUID, newName string, createdBy uuid.UUID) (*domain.NewsletterConfiguration, error) {
	if sourceID == uuid.Nil {
		return nil, fmt.Errorf("source configuration ID is required")
	}

	if newName == "" {
		return nil, fmt.Errorf("new name is required")
	}

	if createdBy == uuid.Nil {
		return nil, fmt.Errorf("created_by user ID is required")
	}

	// Get source configuration
	source, err := s.configRepo.GetByID(ctx, sourceID)
	if err != nil {
		return nil, fmt.Errorf("source configuration not found: %w", err)
	}

	// Create new configuration with same settings
	now := time.Now()
	cloned := &domain.NewsletterConfiguration{
		ID:                   uuid.New(),
		Name:                 newName,
		Description:          source.Description,
		SegmentID:            source.SegmentID,
		Cadence:              source.Cadence,
		SendDayOfWeek:        source.SendDayOfWeek,
		SendTimeUTC:          source.SendTimeUTC,
		Timezone:             source.Timezone,
		MaxBlocks:            source.MaxBlocks,
		EducationRatioMin:    source.EducationRatioMin,
		ContentFreshnessDays: source.ContentFreshnessDays,
		HeroTopicPriority:    source.HeroTopicPriority,
		FrameworkFocus:       source.FrameworkFocus,
		SubjectLineStyle:     source.SubjectLineStyle,
		MaxMetaphors:         source.MaxMetaphors,
		BannedPhrases:        source.BannedPhrases,
		ApprovalTier:         source.ApprovalTier,
		RiskLevel:            source.RiskLevel,
		AIProvider:           source.AIProvider,
		AIModel:              source.AIModel,
		PromptVersion:        source.PromptVersion,
		IsActive:             false, // Cloned configs start inactive
		CreatedBy:            createdBy,
		CreatedAt:            now,
		UpdatedAt:            now,
	}

	if err := cloned.Validate(); err != nil {
		return nil, fmt.Errorf("cloned configuration validation failed: %w", err)
	}

	if err := s.configRepo.Create(ctx, cloned); err != nil {
		return nil, fmt.Errorf("failed to create cloned configuration: %w", err)
	}

	// Create audit log entry
	cloneResourceID := cloned.ID
	cloneUserID := createdBy
	auditLog := &domain.AuditLog{
		ID:           uuid.New(),
		Action:       "newsletter_config_cloned",
		ResourceType: "newsletter_configuration",
		ResourceID:   &cloneResourceID,
		UserID:       &cloneUserID,
		CreatedAt:    now,
	}
	if err := s.auditLogRepo.Create(ctx, auditLog); err != nil {
		log.Error().Err(err).Str("config_id", cloned.ID.String()).Msg("Failed to create audit log for config clone")
	}

	log.Info().
		Str("source_id", sourceID.String()).
		Str("cloned_id", cloned.ID.String()).
		Str("name", newName).
		Msg("Newsletter configuration cloned")

	return cloned, nil
}

// Activate sets a configuration as active
func (s *NewsletterConfigService) Activate(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("configuration ID is required")
	}

	config, err := s.configRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("configuration not found: %w", err)
	}

	if config.IsActive {
		return nil // Already active
	}

	config.IsActive = true
	config.UpdatedAt = time.Now()

	if err := s.configRepo.Update(ctx, config); err != nil {
		return fmt.Errorf("failed to activate configuration: %w", err)
	}

	// Create audit log entry
	activateResourceID := id
	auditLog := &domain.AuditLog{
		ID:           uuid.New(),
		Action:       "newsletter_config_activated",
		ResourceType: "newsletter_configuration",
		ResourceID:   &activateResourceID,
		UserID:       &config.CreatedBy,
		CreatedAt:    time.Now(),
	}
	if err := s.auditLogRepo.Create(ctx, auditLog); err != nil {
		log.Error().Err(err).Str("config_id", id.String()).Msg("Failed to create audit log for config activation")
	}

	log.Info().
		Str("config_id", id.String()).
		Msg("Newsletter configuration activated")

	return nil
}

// Deactivate sets a configuration as inactive
func (s *NewsletterConfigService) Deactivate(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("configuration ID is required")
	}

	config, err := s.configRepo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("configuration not found: %w", err)
	}

	if !config.IsActive {
		return nil // Already inactive
	}

	config.IsActive = false
	config.UpdatedAt = time.Now()

	if err := s.configRepo.Update(ctx, config); err != nil {
		return fmt.Errorf("failed to deactivate configuration: %w", err)
	}

	// Create audit log entry
	deactivateResourceID := id
	auditLog := &domain.AuditLog{
		ID:           uuid.New(),
		Action:       "newsletter_config_deactivated",
		ResourceType: "newsletter_configuration",
		ResourceID:   &deactivateResourceID,
		UserID:       &config.CreatedBy,
		CreatedAt:    time.Now(),
	}
	if err := s.auditLogRepo.Create(ctx, auditLog); err != nil {
		log.Error().Err(err).Str("config_id", id.String()).Msg("Failed to create audit log for config deactivation")
	}

	log.Info().
		Str("config_id", id.String()).
		Msg("Newsletter configuration deactivated")

	return nil
}
