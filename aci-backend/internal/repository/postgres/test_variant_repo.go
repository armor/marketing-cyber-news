package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/repository"
)

type testVariantRepository struct {
	db *DB
}

// NewTestVariantRepository creates a new PostgreSQL test variant repository
func NewTestVariantRepository(db *DB) repository.TestVariantRepository {
	if db == nil {
		panic("database cannot be nil")
	}
	return &testVariantRepository{db: db}
}

// Create creates a new test variant
func (r *testVariantRepository) Create(ctx context.Context, variant *domain.TestVariant) error {
	if variant == nil {
		return fmt.Errorf("test variant cannot be nil")
	}

	if err := variant.Validate(); err != nil {
		return fmt.Errorf("invalid test variant: %w", err)
	}

	// Validate variant name (typically A, B, or Control)
	if variant.VariantName == "" {
		return fmt.Errorf("variant name is required")
	}

	// Set created_at if not set
	if variant.CreatedAt.IsZero() {
		variant.CreatedAt = time.Now()
	}

	// Set updated_at if not set
	if variant.UpdatedAt.IsZero() {
		variant.UpdatedAt = time.Now()
	}

	// Set ID if not set
	if variant.ID == uuid.Nil {
		variant.ID = uuid.New()
	}

	query := `
		INSERT INTO test_variants (
			id, issue_id, test_type, variant_name, variant_value,
			assigned_contacts, opens, clicks, open_rate, click_rate,
			is_winner, statistical_significance, winner_declared_at,
			created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
	`

	_, err := r.db.Pool.Exec(ctx, query,
		variant.ID,
		variant.IssueID,
		variant.TestType,
		variant.VariantName,
		variant.VariantValue,
		variant.AssignedContacts,
		variant.Opens,
		variant.Clicks,
		variant.OpenRate,
		variant.ClickRate,
		variant.IsWinner,
		variant.StatisticalSignificance,
		variant.WinnerDeclaredAt,
		variant.CreatedAt,
		variant.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create test variant: %w", err)
	}

	return nil
}

// GetByID retrieves a test variant by ID
func (r *testVariantRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.TestVariant, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("test variant ID cannot be nil")
	}

	query := `
		SELECT
			tv.id, tv.issue_id, tv.test_type, tv.variant_name, tv.variant_value,
			tv.assigned_contacts, tv.opens, tv.clicks, tv.open_rate, tv.click_rate,
			tv.is_winner, tv.statistical_significance, tv.winner_declared_at,
			tv.created_at, tv.updated_at
		FROM test_variants tv
		WHERE tv.id = $1
	`

	variant := &domain.TestVariant{}
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&variant.ID,
		&variant.IssueID,
		&variant.TestType,
		&variant.VariantName,
		&variant.VariantValue,
		&variant.AssignedContacts,
		&variant.Opens,
		&variant.Clicks,
		&variant.OpenRate,
		&variant.ClickRate,
		&variant.IsWinner,
		&variant.StatisticalSignificance,
		&variant.WinnerDeclaredAt,
		&variant.CreatedAt,
		&variant.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("test variant not found: %w", err)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get test variant: %w", err)
	}

	return variant, nil
}

// GetByIssueID retrieves all test variants for a specific issue
func (r *testVariantRepository) GetByIssueID(ctx context.Context, issueID uuid.UUID) ([]*domain.TestVariant, error) {
	if issueID == uuid.Nil {
		return nil, fmt.Errorf("issue ID cannot be nil")
	}

	query := `
		SELECT
			tv.id, tv.issue_id, tv.test_type, tv.variant_name, tv.variant_value,
			tv.assigned_contacts, tv.opens, tv.clicks, tv.open_rate, tv.click_rate,
			tv.is_winner, tv.statistical_significance, tv.winner_declared_at,
			tv.created_at, tv.updated_at
		FROM test_variants tv
		WHERE tv.issue_id = $1
		ORDER BY tv.variant_name ASC
	`

	rows, err := r.db.Pool.Query(ctx, query, issueID)
	if err != nil {
		return nil, fmt.Errorf("failed to get variants for issue: %w", err)
	}
	defer rows.Close()

	variants := make([]*domain.TestVariant, 0)
	for rows.Next() {
		variant := &domain.TestVariant{}
		err := rows.Scan(
			&variant.ID,
			&variant.IssueID,
			&variant.TestType,
			&variant.VariantName,
			&variant.VariantValue,
			&variant.AssignedContacts,
			&variant.Opens,
			&variant.Clicks,
			&variant.OpenRate,
			&variant.ClickRate,
			&variant.IsWinner,
			&variant.StatisticalSignificance,
			&variant.WinnerDeclaredAt,
			&variant.CreatedAt,
			&variant.UpdatedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan test variant: %w", err)
		}

		variants = append(variants, variant)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating test variants: %w", err)
	}

	return variants, nil
}

// Update updates a test variant
func (r *testVariantRepository) Update(ctx context.Context, variant *domain.TestVariant) error {
	if variant == nil {
		return fmt.Errorf("test variant cannot be nil")
	}

	if variant.ID == uuid.Nil {
		return fmt.Errorf("test variant ID is required")
	}

	if err := variant.Validate(); err != nil {
		return fmt.Errorf("invalid test variant: %w", err)
	}

	// Update timestamp
	variant.UpdatedAt = time.Now()

	query := `
		UPDATE test_variants
		SET
			test_type = $2,
			variant_name = $3,
			variant_value = $4,
			assigned_contacts = $5,
			opens = $6,
			clicks = $7,
			open_rate = $8,
			click_rate = $9,
			is_winner = $10,
			statistical_significance = $11,
			winner_declared_at = $12,
			updated_at = $13
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query,
		variant.ID,
		variant.TestType,
		variant.VariantName,
		variant.VariantValue,
		variant.AssignedContacts,
		variant.Opens,
		variant.Clicks,
		variant.OpenRate,
		variant.ClickRate,
		variant.IsWinner,
		variant.StatisticalSignificance,
		variant.WinnerDeclaredAt,
		variant.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to update test variant: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("test variant not found: %s", variant.ID)
	}

	return nil
}

// Delete deletes a test variant
func (r *testVariantRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("test variant ID cannot be nil")
	}

	query := `DELETE FROM test_variants WHERE id = $1`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete test variant: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("test variant not found: %s", id)
	}

	return nil
}

// BulkCreate creates multiple test variants in a single transaction
func (r *testVariantRepository) BulkCreate(ctx context.Context, variants []*domain.TestVariant) error {
	if len(variants) == 0 {
		return nil
	}

	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	query := `
		INSERT INTO test_variants (
			id, issue_id, test_type, variant_name, variant_value,
			assigned_contacts, opens, clicks, open_rate, click_rate,
			is_winner, statistical_significance, winner_declared_at,
			created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
	`

	now := time.Now()
	for _, variant := range variants {
		if err := variant.Validate(); err != nil {
			return fmt.Errorf("invalid test variant: %w", err)
		}

		if variant.CreatedAt.IsZero() {
			variant.CreatedAt = now
		}

		if variant.UpdatedAt.IsZero() {
			variant.UpdatedAt = now
		}

		if variant.ID == uuid.Nil {
			variant.ID = uuid.New()
		}

		_, err := tx.Exec(ctx, query,
			variant.ID,
			variant.IssueID,
			variant.TestType,
			variant.VariantName,
			variant.VariantValue,
			variant.AssignedContacts,
			variant.Opens,
			variant.Clicks,
			variant.OpenRate,
			variant.ClickRate,
			variant.IsWinner,
			variant.StatisticalSignificance,
			variant.WinnerDeclaredAt,
			variant.CreatedAt,
			variant.UpdatedAt,
		)

		if err != nil {
			return fmt.Errorf("failed to insert test variant: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// UpdateResults atomically increments opens and clicks counters
func (r *testVariantRepository) UpdateResults(ctx context.Context, id uuid.UUID, opens, clicks int) error {
	if id == uuid.Nil {
		return fmt.Errorf("test variant ID cannot be nil")
	}

	if opens < 0 {
		return fmt.Errorf("opens increment must be non-negative")
	}

	if clicks < 0 {
		return fmt.Errorf("clicks increment must be non-negative")
	}

	// Atomic update with recalculated rates
	query := `
		UPDATE test_variants
		SET
			opens = opens + $2,
			clicks = clicks + $3,
			open_rate = CASE
				WHEN assigned_contacts > 0 THEN (opens + $2)::DECIMAL / assigned_contacts
				ELSE 0
			END,
			click_rate = CASE
				WHEN assigned_contacts > 0 THEN (clicks + $3)::DECIMAL / assigned_contacts
				ELSE 0
			END,
			updated_at = $4
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id, opens, clicks, time.Now())
	if err != nil {
		return fmt.Errorf("failed to update test variant results: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("test variant not found: %s", id)
	}

	return nil
}

// DeclareWinner sets a variant as the winner and clears other variants for the same issue
func (r *testVariantRepository) DeclareWinner(ctx context.Context, id uuid.UUID, significance float64) error {
	if id == uuid.Nil {
		return fmt.Errorf("test variant ID cannot be nil")
	}

	if significance < 0 {
		return fmt.Errorf("statistical significance must be non-negative")
	}

	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Get issue ID for the variant
	var issueID uuid.UUID
	issueQuery := `SELECT issue_id FROM test_variants WHERE id = $1`
	err = tx.QueryRow(ctx, issueQuery, id).Scan(&issueID)
	if errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("test variant not found: %s", id)
	}
	if err != nil {
		return fmt.Errorf("failed to get issue ID: %w", err)
	}

	// Clear all winners for the issue
	clearQuery := `
		UPDATE test_variants
		SET
			is_winner = false,
			statistical_significance = NULL,
			winner_declared_at = NULL,
			updated_at = $2
		WHERE issue_id = $1
	`
	_, err = tx.Exec(ctx, clearQuery, issueID, time.Now())
	if err != nil {
		return fmt.Errorf("failed to clear existing winners: %w", err)
	}

	// Set the new winner
	winnerQuery := `
		UPDATE test_variants
		SET
			is_winner = true,
			statistical_significance = $2,
			winner_declared_at = $3,
			updated_at = $3
		WHERE id = $1
	`
	now := time.Now()
	cmdTag, err := tx.Exec(ctx, winnerQuery, id, significance, now)
	if err != nil {
		return fmt.Errorf("failed to declare winner: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("test variant not found: %s", id)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// GetWinner retrieves the winning variant for an issue
func (r *testVariantRepository) GetWinner(ctx context.Context, issueID uuid.UUID) (*domain.TestVariant, error) {
	if issueID == uuid.Nil {
		return nil, fmt.Errorf("issue ID cannot be nil")
	}

	query := `
		SELECT
			tv.id, tv.issue_id, tv.test_type, tv.variant_name, tv.variant_value,
			tv.assigned_contacts, tv.opens, tv.clicks, tv.open_rate, tv.click_rate,
			tv.is_winner, tv.statistical_significance, tv.winner_declared_at,
			tv.created_at, tv.updated_at
		FROM test_variants tv
		WHERE tv.issue_id = $1 AND tv.is_winner = true
		LIMIT 1
	`

	variant := &domain.TestVariant{}
	err := r.db.Pool.QueryRow(ctx, query, issueID).Scan(
		&variant.ID,
		&variant.IssueID,
		&variant.TestType,
		&variant.VariantName,
		&variant.VariantValue,
		&variant.AssignedContacts,
		&variant.Opens,
		&variant.Clicks,
		&variant.OpenRate,
		&variant.ClickRate,
		&variant.IsWinner,
		&variant.StatisticalSignificance,
		&variant.WinnerDeclaredAt,
		&variant.CreatedAt,
		&variant.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil // No winner declared yet
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get winning variant: %w", err)
	}

	return variant, nil
}
