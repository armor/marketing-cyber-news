package voice

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/phillipboles/aci-backend/internal/domain/voice"
	"github.com/phillipboles/aci-backend/internal/repository"
)

// StyleRuleService provides business logic for style rules
type StyleRuleService interface {
	// CreateRule creates a new style rule for a voice agent
	CreateRule(ctx context.Context, rule *voice.StyleRule) error

	// UpdateRule updates an existing style rule
	UpdateRule(ctx context.Context, rule *voice.StyleRule) error

	// DeleteRule deletes a style rule
	DeleteRule(ctx context.Context, id uuid.UUID) error

	// ReorderRules updates the sort order of multiple rules for an agent
	ReorderRules(ctx context.Context, agentID uuid.UUID, positions map[uuid.UUID]int) error
}

type styleRuleService struct {
	ruleRepo  repository.StyleRuleRepository
	agentRepo repository.VoiceAgentRepository
}

// NewStyleRuleService creates a new StyleRuleService
func NewStyleRuleService(ruleRepo repository.StyleRuleRepository, agentRepo repository.VoiceAgentRepository) StyleRuleService {
	if ruleRepo == nil {
		panic("ruleRepo cannot be nil")
	}
	if agentRepo == nil {
		panic("agentRepo cannot be nil")
	}
	return &styleRuleService{
		ruleRepo:  ruleRepo,
		agentRepo: agentRepo,
	}
}

// CreateRule creates a new style rule for a voice agent
func (s *styleRuleService) CreateRule(ctx context.Context, rule *voice.StyleRule) error {
	if rule == nil {
		return fmt.Errorf("rule cannot be nil")
	}

	// Set default values if not provided
	if rule.ID == uuid.Nil {
		rule.ID = uuid.New()
	}

	rule.CreatedAt = time.Now()

	// Validate the rule
	if err := rule.Validate(); err != nil {
		return fmt.Errorf("invalid rule: %w", err)
	}

	// Verify agent exists
	_, err := s.agentRepo.GetByID(ctx, rule.AgentID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return fmt.Errorf("voice agent not found: %w", err)
		}
		return fmt.Errorf("failed to verify agent: %w", err)
	}

	// Create in repository
	if err := s.ruleRepo.Create(ctx, rule); err != nil {
		log.Error().Err(err).
			Str("rule_id", rule.ID.String()).
			Str("agent_id", rule.AgentID.String()).
			Msg("Failed to create style rule")
		return fmt.Errorf("failed to create rule: %w", err)
	}

	log.Info().
		Str("rule_id", rule.ID.String()).
		Str("agent_id", rule.AgentID.String()).
		Str("rule_type", string(rule.RuleType)).
		Msg("Created style rule")

	return nil
}

// UpdateRule updates an existing style rule
func (s *styleRuleService) UpdateRule(ctx context.Context, rule *voice.StyleRule) error {
	if rule == nil {
		return fmt.Errorf("rule cannot be nil")
	}

	if rule.ID == uuid.Nil {
		return fmt.Errorf("rule ID cannot be empty")
	}

	// Validate the rule
	if err := rule.Validate(); err != nil {
		return fmt.Errorf("invalid rule: %w", err)
	}

	// Update in repository
	if err := s.ruleRepo.Update(ctx, rule); err != nil {
		if strings.Contains(err.Error(), "not found") {
			return fmt.Errorf("style rule not found: %w", err)
		}
		log.Error().Err(err).
			Str("rule_id", rule.ID.String()).
			Msg("Failed to update style rule")
		return fmt.Errorf("failed to update rule: %w", err)
	}

	log.Info().
		Str("rule_id", rule.ID.String()).
		Str("agent_id", rule.AgentID.String()).
		Msg("Updated style rule")

	return nil
}

// DeleteRule deletes a style rule
func (s *styleRuleService) DeleteRule(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("rule ID cannot be empty")
	}

	// Delete in repository
	if err := s.ruleRepo.Delete(ctx, id); err != nil {
		if strings.Contains(err.Error(), "not found") {
			return fmt.Errorf("style rule not found: %w", err)
		}
		log.Error().Err(err).
			Str("rule_id", id.String()).
			Msg("Failed to delete style rule")
		return fmt.Errorf("failed to delete rule: %w", err)
	}

	log.Info().
		Str("rule_id", id.String()).
		Msg("Deleted style rule")

	return nil
}

// ReorderRules updates the sort order of multiple rules for an agent
func (s *styleRuleService) ReorderRules(ctx context.Context, agentID uuid.UUID, positions map[uuid.UUID]int) error {
	if agentID == uuid.Nil {
		return fmt.Errorf("agent ID cannot be empty")
	}

	if len(positions) == 0 {
		return fmt.Errorf("positions map cannot be empty")
	}

	// Verify agent exists
	_, err := s.agentRepo.GetByID(ctx, agentID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return fmt.Errorf("voice agent not found: %w", err)
		}
		return fmt.Errorf("failed to verify agent: %w", err)
	}

	// Update sort order in repository
	if err := s.ruleRepo.UpdateSortOrder(ctx, agentID, positions); err != nil {
		log.Error().Err(err).
			Str("agent_id", agentID.String()).
			Int("rules_count", len(positions)).
			Msg("Failed to reorder style rules")
		return fmt.Errorf("failed to reorder rules: %w", err)
	}

	log.Info().
		Str("agent_id", agentID.String()).
		Int("rules_count", len(positions)).
		Msg("Reordered style rules")

	return nil
}
