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

// AgentService provides business logic for voice agents
type AgentService interface {
	// ListActiveAgents returns all active voice agents
	ListActiveAgents(ctx context.Context) ([]*voice.VoiceAgent, error)

	// GetAgentByID returns a voice agent by ID with rules and examples
	GetAgentByID(ctx context.Context, id uuid.UUID) (*voice.VoiceAgent, error)

	// GetAgentByName returns a voice agent by name
	GetAgentByName(ctx context.Context, name string) (*voice.VoiceAgent, error)

	// BuildSystemPrompt constructs the full system prompt for an agent
	BuildSystemPrompt(agent *voice.VoiceAgent) string

	// CreateAgent creates a new voice agent (admin only)
	CreateAgent(ctx context.Context, agent *voice.VoiceAgent, createdBy uuid.UUID) error

	// UpdateAgent updates an existing voice agent (admin only)
	UpdateAgent(ctx context.Context, agent *voice.VoiceAgent) error

	// DeleteAgent soft-deletes a voice agent (admin only)
	DeleteAgent(ctx context.Context, id uuid.UUID) error
}

type agentService struct {
	agentRepo repository.VoiceAgentRepository
}

// NewAgentService creates a new VoiceAgentService
func NewAgentService(agentRepo repository.VoiceAgentRepository) AgentService {
	if agentRepo == nil {
		panic("agentRepo cannot be nil")
	}
	return &agentService{
		agentRepo: agentRepo,
	}
}

// ListActiveAgents returns all active voice agents
func (s *agentService) ListActiveAgents(ctx context.Context) ([]*voice.VoiceAgent, error) {
	agents, err := s.agentRepo.ListActive(ctx)
	if err != nil {
		log.Error().Err(err).Msg("Failed to list active voice agents")
		return nil, fmt.Errorf("failed to list active agents: %w", err)
	}

	log.Debug().Int("count", len(agents)).Msg("Listed active voice agents")
	return agents, nil
}

// GetAgentByID returns a voice agent by ID with rules and examples
func (s *agentService) GetAgentByID(ctx context.Context, id uuid.UUID) (*voice.VoiceAgent, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("agent ID cannot be empty")
	}

	agent, err := s.agentRepo.GetWithRulesAndExamples(ctx, id)
	if err != nil {
		// Check if not found - wrap in appropriate error
		if strings.Contains(err.Error(), "not found") {
			return nil, fmt.Errorf("voice agent not found: %w", err)
		}
		log.Error().Err(err).Str("agent_id", id.String()).Msg("Failed to get voice agent")
		return nil, fmt.Errorf("failed to get agent: %w", err)
	}

	// Verify agent is active (caller may need an active agent for transformation)
	if !agent.IsActive() {
		log.Warn().
			Str("agent_id", id.String()).
			Str("status", agent.Status.String()).
			Msg("Requested agent is not active")
	}

	log.Debug().
		Str("agent_id", id.String()).
		Str("agent_name", agent.Name).
		Int("style_rules_count", len(agent.StyleRules)).
		Int("examples_count", len(agent.Examples)).
		Msg("Retrieved voice agent")

	return agent, nil
}

// GetAgentByName returns a voice agent by name
func (s *agentService) GetAgentByName(ctx context.Context, name string) (*voice.VoiceAgent, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, fmt.Errorf("agent name cannot be empty")
	}

	agent, err := s.agentRepo.GetByName(ctx, name)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return nil, fmt.Errorf("voice agent not found: %w", err)
		}
		log.Error().Err(err).Str("agent_name", name).Msg("Failed to get voice agent by name")
		return nil, fmt.Errorf("failed to get agent by name: %w", err)
	}

	return agent, nil
}

// BuildSystemPrompt constructs the full system prompt for an agent
// This combines the base system prompt with style rules and examples
func (s *agentService) BuildSystemPrompt(agent *voice.VoiceAgent) string {
	if agent == nil {
		return ""
	}

	var sb strings.Builder

	// Add base system prompt
	sb.WriteString(agent.SystemPrompt)
	sb.WriteString("\n\n")

	// Add style rules if present
	if len(agent.StyleRules) > 0 {
		sb.WriteString("## Style Guidelines\n\n")

		// Separate Do and Don't rules
		var doRules, dontRules []voice.StyleRule
		for _, rule := range agent.StyleRules {
			if rule.RuleType == voice.RuleTypeDo {
				doRules = append(doRules, rule)
			} else if rule.RuleType == voice.RuleTypeDont {
				dontRules = append(dontRules, rule)
			}
		}

		if len(doRules) > 0 {
			sb.WriteString("### DO:\n")
			for _, rule := range doRules {
				sb.WriteString(fmt.Sprintf("- %s\n", rule.RuleText))
			}
			sb.WriteString("\n")
		}

		if len(dontRules) > 0 {
			sb.WriteString("### DON'T:\n")
			for _, rule := range dontRules {
				sb.WriteString(fmt.Sprintf("- %s\n", rule.RuleText))
			}
			sb.WriteString("\n")
		}
	}

	// Add examples if present
	if len(agent.Examples) > 0 {
		sb.WriteString("## Examples\n\n")
		for i, example := range agent.Examples {
			sb.WriteString(fmt.Sprintf("### Example %d", i+1))
			if example.Context != "" {
				sb.WriteString(fmt.Sprintf(" (%s)", example.Context))
			}
			sb.WriteString("\n")
			sb.WriteString(fmt.Sprintf("**Before:** %s\n", example.BeforeText))
			sb.WriteString(fmt.Sprintf("**After:** %s\n\n", example.AfterText))
		}
	}

	return strings.TrimSpace(sb.String())
}

// CreateAgent creates a new voice agent with default values
func (s *agentService) CreateAgent(ctx context.Context, agent *voice.VoiceAgent, createdBy uuid.UUID) error {
	if agent == nil {
		return fmt.Errorf("agent cannot be nil")
	}

	// Set default values if not provided
	if agent.ID == uuid.Nil {
		agent.ID = uuid.New()
	}

	if agent.Icon == "" {
		agent.Icon = "wand"
	}

	if agent.Color == "" {
		agent.Color = "#6366F1"
	}

	if agent.Temperature == 0 {
		agent.Temperature = 0.7
	}

	if agent.MaxTokens == 0 {
		agent.MaxTokens = 2000
	}

	if agent.Status == "" {
		agent.Status = voice.VoiceAgentStatusDraft
	}

	agent.Version = 1
	agent.CreatedBy = &createdBy
	agent.CreatedAt = time.Now()
	agent.UpdatedAt = agent.CreatedAt

	// Validate the agent
	if err := agent.Validate(); err != nil {
		return fmt.Errorf("invalid agent: %w", err)
	}

	// Create in repository
	if err := s.agentRepo.Create(ctx, agent); err != nil {
		log.Error().Err(err).Str("agent_id", agent.ID.String()).Msg("Failed to create voice agent")
		return fmt.Errorf("failed to create agent: %w", err)
	}

	log.Info().
		Str("agent_id", agent.ID.String()).
		Str("agent_name", agent.Name).
		Str("created_by", createdBy.String()).
		Msg("Created voice agent")

	return nil
}

// UpdateAgent updates an existing voice agent and increments version
func (s *agentService) UpdateAgent(ctx context.Context, agent *voice.VoiceAgent) error {
	if agent == nil {
		return fmt.Errorf("agent cannot be nil")
	}

	if agent.ID == uuid.Nil {
		return fmt.Errorf("agent ID cannot be empty")
	}

	// Validate the agent
	if err := agent.Validate(); err != nil {
		return fmt.Errorf("invalid agent: %w", err)
	}

	// Update timestamp
	agent.UpdatedAt = time.Now()

	// Update in repository (version is incremented in the repository layer)
	if err := s.agentRepo.Update(ctx, agent); err != nil {
		if strings.Contains(err.Error(), "not found") {
			return fmt.Errorf("voice agent not found: %w", err)
		}
		log.Error().Err(err).Str("agent_id", agent.ID.String()).Msg("Failed to update voice agent")
		return fmt.Errorf("failed to update agent: %w", err)
	}

	log.Info().
		Str("agent_id", agent.ID.String()).
		Str("agent_name", agent.Name).
		Msg("Updated voice agent")

	return nil
}

// DeleteAgent soft-deletes a voice agent by setting status to inactive and deleted_at
func (s *agentService) DeleteAgent(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("agent ID cannot be empty")
	}

	// Soft delete in repository
	if err := s.agentRepo.Delete(ctx, id); err != nil {
		if strings.Contains(err.Error(), "not found") {
			return fmt.Errorf("voice agent not found: %w", err)
		}
		log.Error().Err(err).Str("agent_id", id.String()).Msg("Failed to delete voice agent")
		return fmt.Errorf("failed to delete agent: %w", err)
	}

	log.Info().
		Str("agent_id", id.String()).
		Msg("Deleted voice agent")

	return nil
}
