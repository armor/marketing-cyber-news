package postgres

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/repository"
)

type claimsLibraryRepository struct {
	db *DB
}

// NewClaimsLibraryRepository creates a new PostgreSQL claims library repository
func NewClaimsLibraryRepository(db *DB) repository.ClaimsLibraryRepository {
	if db == nil {
		panic("database cannot be nil")
	}
	return &claimsLibraryRepository{db: db}
}

// Create creates a new claims library entry
func (r *claimsLibraryRepository) Create(ctx context.Context, claim *domain.ClaimsLibraryEntry) error {
	if claim == nil {
		return fmt.Errorf("claim cannot be nil")
	}

	if err := claim.Validate(); err != nil {
		return fmt.Errorf("invalid claim: %w", err)
	}

	// Ensure tags is not nil for TEXT[] column
	tags := claim.Tags
	if tags == nil {
		tags = []string{}
	}

	query := `
		INSERT INTO claims_library (
			id, claim_text, claim_type, category,
			approval_status, approved_by, approved_at, expires_at,
			rejection_reason, source_reference, usage_count, last_used_at,
			tags, notes, created_by, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
	`

	_, err := r.db.Pool.Exec(ctx, query,
		claim.ID,
		claim.ClaimText,
		claim.ClaimType,
		claim.Category,
		claim.ApprovalStatus,
		claim.ApprovedBy,
		claim.ApprovedAt,
		claim.ExpiresAt,
		claim.RejectionReason,
		claim.SourceReference,
		claim.UsageCount,
		claim.LastUsedAt,
		tags,
		claim.Notes,
		claim.CreatedBy,
		claim.CreatedAt,
		claim.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create claim: %w", err)
	}

	return nil
}

// GetByID retrieves a claim by ID
func (r *claimsLibraryRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.ClaimsLibraryEntry, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("claim ID cannot be nil")
	}

	query := `
		SELECT
			id, claim_text, claim_type, category,
			approval_status, approved_by, approved_at, expires_at,
			rejection_reason, source_reference, usage_count, last_used_at,
			tags, notes, created_by, created_at, updated_at
		FROM claims_library
		WHERE id = $1
	`

	claim, err := r.scanClaim(r.db.Pool.QueryRow(ctx, query, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("claim not found: %w", err)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get claim: %w", err)
	}

	return claim, nil
}

// List retrieves claims with filtering and pagination
func (r *claimsLibraryRepository) List(ctx context.Context, filter *domain.ClaimsLibraryFilter) ([]*domain.ClaimsLibraryEntry, int, error) {
	if filter == nil {
		filter = &domain.ClaimsLibraryFilter{}
	}
	filter.WithDefaults()

	if err := filter.Validate(); err != nil {
		return nil, 0, fmt.Errorf("invalid filter: %w", err)
	}

	// Build dynamic query
	whereClause, args := r.buildWhereClause(filter)

	// Count query
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM claims_library %s`, whereClause)
	var total int
	if err := r.db.Pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count claims: %w", err)
	}

	// Data query with pagination
	argOffset := len(args) + 1
	args = append(args, filter.PageSize, filter.Offset())
	dataQuery := fmt.Sprintf(`
		SELECT
			id, claim_text, claim_type, category,
			approval_status, approved_by, approved_at, expires_at,
			rejection_reason, source_reference, usage_count, last_used_at,
			tags, notes, created_by, created_at, updated_at
		FROM claims_library
		%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argOffset, argOffset+1)

	rows, err := r.db.Pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list claims: %w", err)
	}
	defer rows.Close()

	claims := make([]*domain.ClaimsLibraryEntry, 0)
	for rows.Next() {
		claim, err := r.scanClaimFromRows(rows)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan claim: %w", err)
		}
		claims = append(claims, claim)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating claims: %w", err)
	}

	return claims, total, nil
}

// Update updates an existing claim
func (r *claimsLibraryRepository) Update(ctx context.Context, claim *domain.ClaimsLibraryEntry) error {
	if claim == nil {
		return fmt.Errorf("claim cannot be nil")
	}

	if err := claim.Validate(); err != nil {
		return fmt.Errorf("invalid claim: %w", err)
	}

	// Ensure tags is not nil for TEXT[] column
	tags := claim.Tags
	if tags == nil {
		tags = []string{}
	}

	query := `
		UPDATE claims_library
		SET
			claim_text = $2,
			claim_type = $3,
			category = $4,
			approval_status = $5,
			approved_by = $6,
			approved_at = $7,
			expires_at = $8,
			rejection_reason = $9,
			source_reference = $10,
			tags = $11,
			notes = $12,
			updated_at = $13
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query,
		claim.ID,
		claim.ClaimText,
		claim.ClaimType,
		claim.Category,
		claim.ApprovalStatus,
		claim.ApprovedBy,
		claim.ApprovedAt,
		claim.ExpiresAt,
		claim.RejectionReason,
		claim.SourceReference,
		tags,
		claim.Notes,
		time.Now(),
	)

	if err != nil {
		return fmt.Errorf("failed to update claim: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("claim not found")
	}

	return nil
}

// Delete deletes a claim by ID
func (r *claimsLibraryRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("claim ID cannot be nil")
	}

	query := `DELETE FROM claims_library WHERE id = $1`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete claim: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("claim not found")
	}

	return nil
}

// Approve approves a claim
func (r *claimsLibraryRepository) Approve(ctx context.Context, id uuid.UUID, approvedBy uuid.UUID, expiresAt *time.Time) error {
	if id == uuid.Nil {
		return fmt.Errorf("claim ID cannot be nil")
	}
	if approvedBy == uuid.Nil {
		return fmt.Errorf("approvedBy cannot be nil")
	}

	now := time.Now()
	query := `
		UPDATE claims_library
		SET
			approval_status = 'approved',
			approved_by = $2,
			approved_at = $3,
			expires_at = $4,
			rejection_reason = NULL,
			updated_at = $5
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id, approvedBy, now, expiresAt, now)
	if err != nil {
		return fmt.Errorf("failed to approve claim: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("claim not found")
	}

	return nil
}

// Reject rejects a claim
func (r *claimsLibraryRepository) Reject(ctx context.Context, id uuid.UUID, rejectedBy uuid.UUID, reason string) error {
	if id == uuid.Nil {
		return fmt.Errorf("claim ID cannot be nil")
	}
	if reason == "" {
		return fmt.Errorf("rejection reason is required")
	}

	now := time.Now()
	query := `
		UPDATE claims_library
		SET
			approval_status = 'rejected',
			rejection_reason = $2,
			updated_at = $3
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id, reason, now)
	if err != nil {
		return fmt.Errorf("failed to reject claim: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("claim not found")
	}

	return nil
}

// IncrementUsage atomically increments the usage count
func (r *claimsLibraryRepository) IncrementUsage(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("claim ID cannot be nil")
	}

	query := `
		UPDATE claims_library
		SET usage_count = usage_count + 1, last_used_at = $2, updated_at = $2
		WHERE id = $1
	`

	now := time.Now()
	cmdTag, err := r.db.Pool.Exec(ctx, query, id, now)
	if err != nil {
		return fmt.Errorf("failed to increment usage: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("claim not found")
	}

	return nil
}

// BulkIncrementUsage increments usage for multiple claims
func (r *claimsLibraryRepository) BulkIncrementUsage(ctx context.Context, ids []uuid.UUID) error {
	if len(ids) == 0 {
		return nil
	}

	now := time.Now()
	query := `
		UPDATE claims_library
		SET usage_count = usage_count + 1, last_used_at = $1, updated_at = $1
		WHERE id = ANY($2)
	`

	_, err := r.db.Pool.Exec(ctx, query, now, ids)
	if err != nil {
		return fmt.Errorf("failed to bulk increment usage: %w", err)
	}

	return nil
}

// GetByCategory retrieves approved claims by category
func (r *claimsLibraryRepository) GetByCategory(ctx context.Context, category string) ([]*domain.ClaimsLibraryEntry, error) {
	query := `
		SELECT
			id, claim_text, claim_type, category,
			approval_status, approved_by, approved_at, expires_at,
			rejection_reason, source_reference, usage_count, last_used_at,
			tags, notes, created_by, created_at, updated_at
		FROM claims_library
		WHERE category = $1
		  AND approval_status = 'approved'
		  AND (expires_at IS NULL OR expires_at > NOW())
		ORDER BY usage_count DESC
	`

	rows, err := r.db.Pool.Query(ctx, query, category)
	if err != nil {
		return nil, fmt.Errorf("failed to get claims by category: %w", err)
	}
	defer rows.Close()

	return r.scanClaims(rows)
}

// GetApprovedByType retrieves approved claims by type
func (r *claimsLibraryRepository) GetApprovedByType(ctx context.Context, claimType domain.ClaimType) ([]*domain.ClaimsLibraryEntry, error) {
	query := `
		SELECT
			id, claim_text, claim_type, category,
			approval_status, approved_by, approved_at, expires_at,
			rejection_reason, source_reference, usage_count, last_used_at,
			tags, notes, created_by, created_at, updated_at
		FROM claims_library
		WHERE claim_type = $1
		  AND approval_status = 'approved'
		  AND (expires_at IS NULL OR expires_at > NOW())
		ORDER BY usage_count DESC
	`

	rows, err := r.db.Pool.Query(ctx, query, claimType)
	if err != nil {
		return nil, fmt.Errorf("failed to get claims by type: %w", err)
	}
	defer rows.Close()

	return r.scanClaims(rows)
}

// GetExpiringSoon retrieves claims expiring within the given duration
func (r *claimsLibraryRepository) GetExpiringSoon(ctx context.Context, within time.Duration) ([]*domain.ClaimsLibraryEntry, error) {
	expiresBefore := time.Now().Add(within)
	query := `
		SELECT
			id, claim_text, claim_type, category,
			approval_status, approved_by, approved_at, expires_at,
			rejection_reason, source_reference, usage_count, last_used_at,
			tags, notes, created_by, created_at, updated_at
		FROM claims_library
		WHERE approval_status = 'approved'
		  AND expires_at IS NOT NULL
		  AND expires_at <= $1
		  AND expires_at > NOW()
		ORDER BY expires_at ASC
	`

	rows, err := r.db.Pool.Query(ctx, query, expiresBefore)
	if err != nil {
		return nil, fmt.Errorf("failed to get expiring claims: %w", err)
	}
	defer rows.Close()

	return r.scanClaims(rows)
}

// SearchFullText performs full-text search on claim text
func (r *claimsLibraryRepository) SearchFullText(ctx context.Context, searchQuery string, limit int) ([]*domain.ClaimsLibraryEntry, error) {
	if limit <= 0 {
		limit = 20
	}

	query := `
		SELECT
			id, claim_text, claim_type, category,
			approval_status, approved_by, approved_at, expires_at,
			rejection_reason, source_reference, usage_count, last_used_at,
			tags, notes, created_by, created_at, updated_at
		FROM claims_library
		WHERE to_tsvector('english', claim_text) @@ plainto_tsquery('english', $1)
		ORDER BY ts_rank(to_tsvector('english', claim_text), plainto_tsquery('english', $1)) DESC
		LIMIT $2
	`

	rows, err := r.db.Pool.Query(ctx, query, searchQuery, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to search claims: %w", err)
	}
	defer rows.Close()

	return r.scanClaims(rows)
}

// ListCategories returns all distinct categories
func (r *claimsLibraryRepository) ListCategories(ctx context.Context) ([]string, error) {
	query := `SELECT DISTINCT category FROM claims_library ORDER BY category`

	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to list categories: %w", err)
	}
	defer rows.Close()

	categories := make([]string, 0)
	for rows.Next() {
		var category string
		if err := rows.Scan(&category); err != nil {
			return nil, fmt.Errorf("failed to scan category: %w", err)
		}
		categories = append(categories, category)
	}

	return categories, nil
}

// GetByIDs retrieves multiple claims by their IDs
func (r *claimsLibraryRepository) GetByIDs(ctx context.Context, ids []uuid.UUID) ([]*domain.ClaimsLibraryEntry, error) {
	if len(ids) == 0 {
		return []*domain.ClaimsLibraryEntry{}, nil
	}

	query := `
		SELECT
			id, claim_text, claim_type, category,
			approval_status, approved_by, approved_at, expires_at,
			rejection_reason, source_reference, usage_count, last_used_at,
			tags, notes, created_by, created_at, updated_at
		FROM claims_library
		WHERE id = ANY($1)
	`

	rows, err := r.db.Pool.Query(ctx, query, ids)
	if err != nil {
		return nil, fmt.Errorf("failed to get claims by IDs: %w", err)
	}
	defer rows.Close()

	return r.scanClaims(rows)
}

// GetDoNotSayItems retrieves all active "do not say" items
func (r *claimsLibraryRepository) GetDoNotSayItems(ctx context.Context) ([]*domain.ClaimsLibraryEntry, error) {
	query := `
		SELECT
			id, claim_text, claim_type, category,
			approval_status, approved_by, approved_at, expires_at,
			rejection_reason, source_reference, usage_count, last_used_at,
			tags, notes, created_by, created_at, updated_at
		FROM claims_library
		WHERE claim_type = 'do_not_say'
		  AND approval_status = 'approved'
		  AND (expires_at IS NULL OR expires_at > NOW())
		ORDER BY claim_text
	`

	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to get do-not-say items: %w", err)
	}
	defer rows.Close()

	return r.scanClaims(rows)
}

// Helper methods

func (r *claimsLibraryRepository) buildWhereClause(filter *domain.ClaimsLibraryFilter) (string, []interface{}) {
	conditions := make([]string, 0)
	args := make([]interface{}, 0)
	argIndex := 1

	if filter.ClaimType != nil {
		conditions = append(conditions, fmt.Sprintf("claim_type = $%d", argIndex))
		args = append(args, *filter.ClaimType)
		argIndex++
	}

	if filter.Category != nil && *filter.Category != "" {
		conditions = append(conditions, fmt.Sprintf("category = $%d", argIndex))
		args = append(args, *filter.Category)
		argIndex++
	}

	if filter.ApprovalStatus != nil {
		conditions = append(conditions, fmt.Sprintf("approval_status = $%d", argIndex))
		args = append(args, *filter.ApprovalStatus)
		argIndex++
	}

	if len(filter.Tags) > 0 {
		conditions = append(conditions, fmt.Sprintf("tags && $%d", argIndex))
		args = append(args, filter.Tags)
		argIndex++
	}

	if filter.SearchText != nil && *filter.SearchText != "" {
		conditions = append(conditions, fmt.Sprintf("claim_text ILIKE $%d", argIndex))
		args = append(args, "%"+*filter.SearchText+"%")
		argIndex++
	}

	if filter.CreatedBy != nil {
		conditions = append(conditions, fmt.Sprintf("created_by = $%d", argIndex))
		args = append(args, *filter.CreatedBy)
		argIndex++
	}

	if !filter.IncludeExpired {
		conditions = append(conditions, "(expires_at IS NULL OR expires_at > NOW())")
	}

	if len(conditions) == 0 {
		return "", args
	}

	return "WHERE " + strings.Join(conditions, " AND "), args
}

func (r *claimsLibraryRepository) scanClaim(row pgx.Row) (*domain.ClaimsLibraryEntry, error) {
	claim := &domain.ClaimsLibraryEntry{}

	err := row.Scan(
		&claim.ID,
		&claim.ClaimText,
		&claim.ClaimType,
		&claim.Category,
		&claim.ApprovalStatus,
		&claim.ApprovedBy,
		&claim.ApprovedAt,
		&claim.ExpiresAt,
		&claim.RejectionReason,
		&claim.SourceReference,
		&claim.UsageCount,
		&claim.LastUsedAt,
		&claim.Tags,
		&claim.Notes,
		&claim.CreatedBy,
		&claim.CreatedAt,
		&claim.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	if claim.Tags == nil {
		claim.Tags = []string{}
	}

	return claim, nil
}

func (r *claimsLibraryRepository) scanClaimFromRows(rows pgx.Rows) (*domain.ClaimsLibraryEntry, error) {
	claim := &domain.ClaimsLibraryEntry{}

	err := rows.Scan(
		&claim.ID,
		&claim.ClaimText,
		&claim.ClaimType,
		&claim.Category,
		&claim.ApprovalStatus,
		&claim.ApprovedBy,
		&claim.ApprovedAt,
		&claim.ExpiresAt,
		&claim.RejectionReason,
		&claim.SourceReference,
		&claim.UsageCount,
		&claim.LastUsedAt,
		&claim.Tags,
		&claim.Notes,
		&claim.CreatedBy,
		&claim.CreatedAt,
		&claim.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	if claim.Tags == nil {
		claim.Tags = []string{}
	}

	return claim, nil
}

func (r *claimsLibraryRepository) scanClaims(rows pgx.Rows) ([]*domain.ClaimsLibraryEntry, error) {
	claims := make([]*domain.ClaimsLibraryEntry, 0)
	for rows.Next() {
		claim, err := r.scanClaimFromRows(rows)
		if err != nil {
			return nil, err
		}
		claims = append(claims, claim)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return claims, nil
}
