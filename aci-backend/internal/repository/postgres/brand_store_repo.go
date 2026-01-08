package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/repository"
)

type brandStoreRepository struct {
	db *DB
}

// NewBrandStoreRepository creates a new PostgreSQL brand store repository
func NewBrandStoreRepository(db *DB) repository.BrandStoreRepository {
	if db == nil {
		panic("database cannot be nil")
	}
	return &brandStoreRepository{db: db}
}

// Create creates a new brand store
func (r *brandStoreRepository) Create(ctx context.Context, store *domain.BrandStore) error {
	if store == nil {
		return fmt.Errorf("brand store cannot be nil")
	}

	if err := store.Validate(); err != nil {
		return fmt.Errorf("invalid brand store: %w", err)
	}

	// Marshal banned_terms to JSONB
	bannedTermsJSON, err := json.Marshal(store.BannedTerms)
	if err != nil {
		return fmt.Errorf("failed to marshal banned terms: %w", err)
	}

	// Ensure approved_terms is not nil for TEXT[] column
	approvedTerms := store.ApprovedTerms
	if approvedTerms == nil {
		approvedTerms = []string{}
	}

	query := `
		INSERT INTO brand_stores (
			id, tenant_id, qdrant_collection_prefix,
			voice_examples_count, guidelines_count, terminology_count, corrections_count,
			health_score, strictness, auto_correct,
			approved_terms, banned_terms,
			last_trained_at, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
	`

	_, err = r.db.Pool.Exec(ctx, query,
		store.ID,
		store.TenantID,
		store.QdrantCollectionPrefix,
		store.VoiceExamplesCount,
		store.GuidelinesCount,
		store.TerminologyCount,
		store.CorrectionsCount,
		store.HealthScore,
		store.Strictness,
		store.AutoCorrect,
		approvedTerms,
		bannedTermsJSON,
		store.LastTrainedAt,
		store.CreatedAt,
		store.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create brand store: %w", err)
	}

	return nil
}

// GetByID retrieves a brand store by ID
func (r *brandStoreRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.BrandStore, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("brand store ID cannot be nil")
	}

	query := `
		SELECT
			id, tenant_id, qdrant_collection_prefix,
			voice_examples_count, guidelines_count, terminology_count, corrections_count,
			health_score, strictness, auto_correct,
			approved_terms, banned_terms,
			last_trained_at, created_at, updated_at
		FROM brand_stores
		WHERE id = $1
	`

	store := &domain.BrandStore{}
	var bannedTermsJSON []byte

	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&store.ID,
		&store.TenantID,
		&store.QdrantCollectionPrefix,
		&store.VoiceExamplesCount,
		&store.GuidelinesCount,
		&store.TerminologyCount,
		&store.CorrectionsCount,
		&store.HealthScore,
		&store.Strictness,
		&store.AutoCorrect,
		&store.ApprovedTerms,
		&bannedTermsJSON,
		&store.LastTrainedAt,
		&store.CreatedAt,
		&store.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("brand store not found: %w", err)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get brand store: %w", err)
	}

	// Unmarshal banned_terms from JSONB
	if len(bannedTermsJSON) > 0 {
		if err := json.Unmarshal(bannedTermsJSON, &store.BannedTerms); err != nil {
			return nil, fmt.Errorf("failed to unmarshal banned terms: %w", err)
		}
	} else {
		store.BannedTerms = []domain.TermEntry{}
	}

	// Ensure approved_terms is not nil
	if store.ApprovedTerms == nil {
		store.ApprovedTerms = []string{}
	}

	return store, nil
}

// GetByTenantID retrieves a brand store by tenant ID
func (r *brandStoreRepository) GetByTenantID(ctx context.Context, tenantID uuid.UUID) (*domain.BrandStore, error) {
	if tenantID == uuid.Nil {
		return nil, fmt.Errorf("tenant ID cannot be nil")
	}

	query := `
		SELECT
			id, tenant_id, qdrant_collection_prefix,
			voice_examples_count, guidelines_count, terminology_count, corrections_count,
			health_score, strictness, auto_correct,
			approved_terms, banned_terms,
			last_trained_at, created_at, updated_at
		FROM brand_stores
		WHERE tenant_id = $1
	`

	store := &domain.BrandStore{}
	var bannedTermsJSON []byte

	err := r.db.Pool.QueryRow(ctx, query, tenantID).Scan(
		&store.ID,
		&store.TenantID,
		&store.QdrantCollectionPrefix,
		&store.VoiceExamplesCount,
		&store.GuidelinesCount,
		&store.TerminologyCount,
		&store.CorrectionsCount,
		&store.HealthScore,
		&store.Strictness,
		&store.AutoCorrect,
		&store.ApprovedTerms,
		&bannedTermsJSON,
		&store.LastTrainedAt,
		&store.CreatedAt,
		&store.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("brand store not found for tenant: %w", err)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get brand store by tenant: %w", err)
	}

	// Unmarshal banned_terms from JSONB
	if len(bannedTermsJSON) > 0 {
		if err := json.Unmarshal(bannedTermsJSON, &store.BannedTerms); err != nil {
			return nil, fmt.Errorf("failed to unmarshal banned terms: %w", err)
		}
	} else {
		store.BannedTerms = []domain.TermEntry{}
	}

	// Ensure approved_terms is not nil
	if store.ApprovedTerms == nil {
		store.ApprovedTerms = []string{}
	}

	return store, nil
}

// Update updates an existing brand store
func (r *brandStoreRepository) Update(ctx context.Context, store *domain.BrandStore) error {
	if store == nil {
		return fmt.Errorf("brand store cannot be nil")
	}

	if err := store.Validate(); err != nil {
		return fmt.Errorf("invalid brand store: %w", err)
	}

	// Marshal banned_terms to JSONB
	bannedTermsJSON, err := json.Marshal(store.BannedTerms)
	if err != nil {
		return fmt.Errorf("failed to marshal banned terms: %w", err)
	}

	// Ensure approved_terms is not nil for TEXT[] column
	approvedTerms := store.ApprovedTerms
	if approvedTerms == nil {
		approvedTerms = []string{}
	}

	query := `
		UPDATE brand_stores
		SET
			qdrant_collection_prefix = $2,
			voice_examples_count = $3,
			guidelines_count = $4,
			terminology_count = $5,
			corrections_count = $6,
			health_score = $7,
			strictness = $8,
			auto_correct = $9,
			approved_terms = $10,
			banned_terms = $11,
			last_trained_at = $12,
			updated_at = $13
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query,
		store.ID,
		store.QdrantCollectionPrefix,
		store.VoiceExamplesCount,
		store.GuidelinesCount,
		store.TerminologyCount,
		store.CorrectionsCount,
		store.HealthScore,
		store.Strictness,
		store.AutoCorrect,
		approvedTerms,
		bannedTermsJSON,
		store.LastTrainedAt,
		store.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to update brand store: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("brand store not found")
	}

	return nil
}

// Delete deletes a brand store by ID
func (r *brandStoreRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("brand store ID cannot be nil")
	}

	query := `DELETE FROM brand_stores WHERE id = $1`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete brand store: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("brand store not found")
	}

	return nil
}

// UpdateCounts updates content counts for a brand store
func (r *brandStoreRepository) UpdateCounts(ctx context.Context, id uuid.UUID, voiceExamples, guidelines, terminology, corrections int) error {
	if id == uuid.Nil {
		return fmt.Errorf("brand store ID cannot be nil")
	}

	if voiceExamples < 0 || guidelines < 0 || terminology < 0 || corrections < 0 {
		return fmt.Errorf("counts must be non-negative")
	}

	query := `
		UPDATE brand_stores
		SET
			voice_examples_count = $2,
			guidelines_count = $3,
			terminology_count = $4,
			corrections_count = $5,
			updated_at = $6
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query,
		id,
		voiceExamples,
		guidelines,
		terminology,
		corrections,
		time.Now(),
	)

	if err != nil {
		return fmt.Errorf("failed to update brand store counts: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("brand store not found")
	}

	return nil
}

// UpdateHealthScore updates the health score for a brand store
func (r *brandStoreRepository) UpdateHealthScore(ctx context.Context, id uuid.UUID, score int) error {
	if id == uuid.Nil {
		return fmt.Errorf("brand store ID cannot be nil")
	}

	if score < 0 || score > 100 {
		return fmt.Errorf("health score must be between 0 and 100")
	}

	query := `
		UPDATE brand_stores
		SET
			health_score = $2,
			updated_at = $3
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id, score, time.Now())
	if err != nil {
		return fmt.Errorf("failed to update brand store health score: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("brand store not found")
	}

	return nil
}

// UpdateTerminology updates approved and banned terms for a brand store
func (r *brandStoreRepository) UpdateTerminology(ctx context.Context, id uuid.UUID, approved []string, banned []domain.TermEntry) error {
	if id == uuid.Nil {
		return fmt.Errorf("brand store ID cannot be nil")
	}

	// Marshal banned_terms to JSONB
	bannedTermsJSON, err := json.Marshal(banned)
	if err != nil {
		return fmt.Errorf("failed to marshal banned terms: %w", err)
	}

	// Ensure approved_terms is not nil for TEXT[] column
	if approved == nil {
		approved = []string{}
	}

	query := `
		UPDATE brand_stores
		SET
			approved_terms = $2,
			banned_terms = $3,
			updated_at = $4
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query,
		id,
		approved,
		bannedTermsJSON,
		time.Now(),
	)

	if err != nil {
		return fmt.Errorf("failed to update brand store terminology: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("brand store not found")
	}

	return nil
}

// UpdateSettings updates strictness and auto_correct settings for a brand store
func (r *brandStoreRepository) UpdateSettings(ctx context.Context, id uuid.UUID, strictness float64, autoCorrect bool) error {
	if id == uuid.Nil {
		return fmt.Errorf("brand store ID cannot be nil")
	}

	if strictness < 0 || strictness > 1 {
		return fmt.Errorf("strictness must be between 0 and 1")
	}

	query := `
		UPDATE brand_stores
		SET
			strictness = $2,
			auto_correct = $3,
			updated_at = $4
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query,
		id,
		strictness,
		autoCorrect,
		time.Now(),
	)

	if err != nil {
		return fmt.Errorf("failed to update brand store settings: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("brand store not found")
	}

	return nil
}

// UpdateLastTrained updates the last_trained_at timestamp for a brand store
func (r *brandStoreRepository) UpdateLastTrained(ctx context.Context, id uuid.UUID, trainedAt time.Time) error {
	if id == uuid.Nil {
		return fmt.Errorf("brand store ID cannot be nil")
	}

	if trainedAt.IsZero() {
		return fmt.Errorf("trained_at cannot be zero")
	}

	query := `
		UPDATE brand_stores
		SET
			last_trained_at = $2,
			updated_at = $3
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id, trainedAt, time.Now())
	if err != nil {
		return fmt.Errorf("failed to update brand store last_trained_at: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("brand store not found")
	}

	return nil
}
