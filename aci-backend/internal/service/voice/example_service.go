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

// ExampleService provides business logic for transformation examples
type ExampleService interface {
	// CreateExample creates a new transformation example for a voice agent
	CreateExample(ctx context.Context, example *voice.Example) error

	// UpdateExample updates an existing transformation example
	UpdateExample(ctx context.Context, example *voice.Example) error

	// DeleteExample deletes a transformation example
	DeleteExample(ctx context.Context, id uuid.UUID) error

	// ReorderExamples updates the sort order of multiple examples for an agent
	ReorderExamples(ctx context.Context, agentID uuid.UUID, positions map[uuid.UUID]int) error
}

type exampleService struct {
	exampleRepo repository.ExampleRepository
	agentRepo   repository.VoiceAgentRepository
}

// NewExampleService creates a new ExampleService
func NewExampleService(exampleRepo repository.ExampleRepository, agentRepo repository.VoiceAgentRepository) ExampleService {
	if exampleRepo == nil {
		panic("exampleRepo cannot be nil")
	}
	if agentRepo == nil {
		panic("agentRepo cannot be nil")
	}
	return &exampleService{
		exampleRepo: exampleRepo,
		agentRepo:   agentRepo,
	}
}

// CreateExample creates a new transformation example for a voice agent
func (s *exampleService) CreateExample(ctx context.Context, example *voice.Example) error {
	if example == nil {
		return fmt.Errorf("example cannot be nil")
	}

	// Set default values if not provided
	if example.ID == uuid.Nil {
		example.ID = uuid.New()
	}

	example.CreatedAt = time.Now()

	// Validate the example
	if err := example.Validate(); err != nil {
		return fmt.Errorf("invalid example: %w", err)
	}

	// Verify agent exists
	_, err := s.agentRepo.GetByID(ctx, example.AgentID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return fmt.Errorf("voice agent not found: %w", err)
		}
		return fmt.Errorf("failed to verify agent: %w", err)
	}

	// Create in repository
	if err := s.exampleRepo.Create(ctx, example); err != nil {
		log.Error().Err(err).
			Str("example_id", example.ID.String()).
			Str("agent_id", example.AgentID.String()).
			Msg("Failed to create example")
		return fmt.Errorf("failed to create example: %w", err)
	}

	log.Info().
		Str("example_id", example.ID.String()).
		Str("agent_id", example.AgentID.String()).
		Msg("Created transformation example")

	return nil
}

// UpdateExample updates an existing transformation example
func (s *exampleService) UpdateExample(ctx context.Context, example *voice.Example) error {
	if example == nil {
		return fmt.Errorf("example cannot be nil")
	}

	if example.ID == uuid.Nil {
		return fmt.Errorf("example ID cannot be empty")
	}

	// Validate the example
	if err := example.Validate(); err != nil {
		return fmt.Errorf("invalid example: %w", err)
	}

	// Update in repository
	if err := s.exampleRepo.Update(ctx, example); err != nil {
		if strings.Contains(err.Error(), "not found") {
			return fmt.Errorf("example not found: %w", err)
		}
		log.Error().Err(err).
			Str("example_id", example.ID.String()).
			Msg("Failed to update example")
		return fmt.Errorf("failed to update example: %w", err)
	}

	log.Info().
		Str("example_id", example.ID.String()).
		Str("agent_id", example.AgentID.String()).
		Msg("Updated transformation example")

	return nil
}

// DeleteExample deletes a transformation example
func (s *exampleService) DeleteExample(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("example ID cannot be empty")
	}

	// Delete in repository
	if err := s.exampleRepo.Delete(ctx, id); err != nil {
		if strings.Contains(err.Error(), "not found") {
			return fmt.Errorf("example not found: %w", err)
		}
		log.Error().Err(err).
			Str("example_id", id.String()).
			Msg("Failed to delete example")
		return fmt.Errorf("failed to delete example: %w", err)
	}

	log.Info().
		Str("example_id", id.String()).
		Msg("Deleted transformation example")

	return nil
}

// ReorderExamples updates the sort order of multiple examples for an agent
func (s *exampleService) ReorderExamples(ctx context.Context, agentID uuid.UUID, positions map[uuid.UUID]int) error {
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
	if err := s.exampleRepo.UpdateSortOrder(ctx, agentID, positions); err != nil {
		log.Error().Err(err).
			Str("agent_id", agentID.String()).
			Int("examples_count", len(positions)).
			Msg("Failed to reorder examples")
		return fmt.Errorf("failed to reorder examples: %w", err)
	}

	log.Info().
		Str("agent_id", agentID.String()).
		Int("examples_count", len(positions)).
		Msg("Reordered transformation examples")

	return nil
}
