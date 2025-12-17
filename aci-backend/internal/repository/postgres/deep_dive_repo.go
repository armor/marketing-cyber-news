package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/phillipboles/aci-backend/internal/domain"
)

type deepDiveRepository struct {
	db *DB
}

// NewDeepDiveRepository creates a new PostgreSQL deep dive repository
func NewDeepDiveRepository(db *DB) *deepDiveRepository {
	if db == nil {
		panic("database cannot be nil")
	}
	return &deepDiveRepository{db: db}
}

// GetByArticleID retrieves a deep dive analysis by article ID
func (r *deepDiveRepository) GetByArticleID(ctx context.Context, articleID uuid.UUID) (*domain.DeepDive, error) {
	if articleID == uuid.Nil {
		return nil, fmt.Errorf("articleID cannot be nil")
	}

	query := `
		SELECT
			id, article_id, executive_summary, technical_analysis,
			timeline, mitre_techniques, iocs, threat_actors,
			affected_products, related_threats, required_tier,
			created_at, updated_at
		FROM deep_dives
		WHERE article_id = $1
	`

	var (
		technicalAnalysisJSON []byte
		timelineJSON          []byte
		mitreTechniquesJSON   []byte
		iocsJSON              []byte
		threatActorsJSON      []byte
		affectedProducts      []string
		relatedThreats        []uuid.UUID
	)

	deepDive := &domain.DeepDive{}

	err := r.db.Pool.QueryRow(ctx, query, articleID).Scan(
		&deepDive.ID,
		&deepDive.ArticleID,
		&deepDive.ExecutiveSummary,
		&technicalAnalysisJSON,
		&timelineJSON,
		&mitreTechniquesJSON,
		&iocsJSON,
		&threatActorsJSON,
		&affectedProducts,
		&relatedThreats,
		&deepDive.RequiredTier,
		&deepDive.CreatedAt,
		&deepDive.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("deep dive not found for article %s: %w", articleID, err)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get deep dive: %w", err)
	}

	// Unmarshal TechnicalAnalysis
	if len(technicalAnalysisJSON) > 0 {
		if err := json.Unmarshal(technicalAnalysisJSON, &deepDive.TechnicalAnalysis); err != nil {
			return nil, fmt.Errorf("failed to unmarshal technical_analysis: %w", err)
		}
	}

	// Unmarshal Timeline
	if len(timelineJSON) > 0 {
		if err := json.Unmarshal(timelineJSON, &deepDive.Timeline); err != nil {
			return nil, fmt.Errorf("failed to unmarshal timeline: %w", err)
		}
	}

	// Unmarshal MitreTechniques
	if len(mitreTechniquesJSON) > 0 {
		if err := json.Unmarshal(mitreTechniquesJSON, &deepDive.MitreTechniques); err != nil {
			return nil, fmt.Errorf("failed to unmarshal mitre_techniques: %w", err)
		}
	}

	// Unmarshal IOCs
	if len(iocsJSON) > 0 {
		if err := json.Unmarshal(iocsJSON, &deepDive.IOCs); err != nil {
			return nil, fmt.Errorf("failed to unmarshal iocs: %w", err)
		}
	}

	// Unmarshal ThreatActors
	if len(threatActorsJSON) > 0 {
		if err := json.Unmarshal(threatActorsJSON, &deepDive.ThreatActors); err != nil {
			return nil, fmt.Errorf("failed to unmarshal threat_actors: %w", err)
		}
	}

	// Set slices
	deepDive.AffectedProducts = affectedProducts
	deepDive.RelatedThreats = relatedThreats

	return deepDive, nil
}

// ExistsByArticleID checks if a deep dive exists for an article
func (r *deepDiveRepository) ExistsByArticleID(ctx context.Context, articleID uuid.UUID) (bool, error) {
	if articleID == uuid.Nil {
		return false, fmt.Errorf("articleID cannot be nil")
	}

	query := `
		SELECT EXISTS(
			SELECT 1 FROM deep_dives
			WHERE article_id = $1
		)
	`

	var exists bool
	err := r.db.Pool.QueryRow(ctx, query, articleID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check deep dive existence: %w", err)
	}

	return exists, nil
}
