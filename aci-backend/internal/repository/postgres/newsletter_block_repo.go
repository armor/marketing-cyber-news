package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/lib/pq"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/repository"
)

type newsletterBlockRepository struct {
	db *DB
}

// NewNewsletterBlockRepository creates a new PostgreSQL newsletter block repository
func NewNewsletterBlockRepository(db *DB) repository.NewsletterBlockRepository {
	if db == nil {
		panic("database cannot be nil")
	}
	return &newsletterBlockRepository{db: db}
}

// Create creates a new newsletter block
func (r *newsletterBlockRepository) Create(ctx context.Context, block *domain.NewsletterBlock) error {
	if block == nil {
		return fmt.Errorf("newsletter block cannot be nil")
	}

	if err := block.Validate(); err != nil {
		return fmt.Errorf("invalid newsletter block: %w", err)
	}

	query := `
		INSERT INTO newsletter_blocks (
			id, issue_id, content_item_id, block_type, position,
			title, teaser, cta_label, cta_url,
			is_promotional, topic_tags, clicks,
			created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
	`

	_, err := r.db.Pool.Exec(ctx, query,
		block.ID,
		block.IssueID,
		block.ContentItemID,
		block.BlockType,
		block.Position,
		block.Title,
		block.Teaser,
		block.CTALabel,
		block.CTAURL,
		block.IsPromotional,
		pq.Array(block.TopicTags),
		block.Clicks,
		block.CreatedAt,
		block.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create newsletter block: %w", err)
	}

	return nil
}

// GetByID retrieves a newsletter block by ID
func (r *newsletterBlockRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.NewsletterBlock, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("newsletter block ID cannot be nil")
	}

	query := `
		SELECT
			id, issue_id, content_item_id, block_type, position,
			title, teaser, cta_label, cta_url,
			is_promotional, topic_tags, clicks,
			created_at, updated_at
		FROM newsletter_blocks
		WHERE id = $1
	`

	block := &domain.NewsletterBlock{}
	var topicTags []string

	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&block.ID,
		&block.IssueID,
		&block.ContentItemID,
		&block.BlockType,
		&block.Position,
		&block.Title,
		&block.Teaser,
		&block.CTALabel,
		&block.CTAURL,
		&block.IsPromotional,
		&topicTags,
		&block.Clicks,
		&block.CreatedAt,
		&block.UpdatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("newsletter block not found: %w", err)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get newsletter block: %w", err)
	}

	block.TopicTags = topicTags

	return block, nil
}

// GetByIssueID retrieves all blocks for a newsletter issue, ordered by position
func (r *newsletterBlockRepository) GetByIssueID(ctx context.Context, issueID uuid.UUID) ([]*domain.NewsletterBlock, error) {
	if issueID == uuid.Nil {
		return nil, fmt.Errorf("issue ID cannot be nil")
	}

	query := `
		SELECT
			id, issue_id, content_item_id, block_type, position,
			title, teaser, cta_label, cta_url,
			is_promotional, topic_tags, clicks,
			created_at, updated_at
		FROM newsletter_blocks
		WHERE issue_id = $1
		ORDER BY position ASC
	`

	rows, err := r.db.Pool.Query(ctx, query, issueID)
	if err != nil {
		return nil, fmt.Errorf("failed to get newsletter blocks by issue ID: %w", err)
	}
	defer rows.Close()

	blocks := make([]*domain.NewsletterBlock, 0)
	for rows.Next() {
		block := &domain.NewsletterBlock{}
		var topicTags []string

		err := rows.Scan(
			&block.ID,
			&block.IssueID,
			&block.ContentItemID,
			&block.BlockType,
			&block.Position,
			&block.Title,
			&block.Teaser,
			&block.CTALabel,
			&block.CTAURL,
			&block.IsPromotional,
			&topicTags,
			&block.Clicks,
			&block.CreatedAt,
			&block.UpdatedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan newsletter block: %w", err)
		}

		block.TopicTags = topicTags
		blocks = append(blocks, block)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating newsletter blocks: %w", err)
	}

	return blocks, nil
}

// Update updates an existing newsletter block
func (r *newsletterBlockRepository) Update(ctx context.Context, block *domain.NewsletterBlock) error {
	if block == nil {
		return fmt.Errorf("newsletter block cannot be nil")
	}

	if err := block.Validate(); err != nil {
		return fmt.Errorf("invalid newsletter block: %w", err)
	}

	query := `
		UPDATE newsletter_blocks
		SET
			content_item_id = $2,
			block_type = $3,
			position = $4,
			title = $5,
			teaser = $6,
			cta_label = $7,
			cta_url = $8,
			is_promotional = $9,
			topic_tags = $10,
			clicks = $11,
			updated_at = $12
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query,
		block.ID,
		block.ContentItemID,
		block.BlockType,
		block.Position,
		block.Title,
		block.Teaser,
		block.CTALabel,
		block.CTAURL,
		block.IsPromotional,
		pq.Array(block.TopicTags),
		block.Clicks,
		block.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to update newsletter block: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("newsletter block not found")
	}

	return nil
}

// Delete deletes a newsletter block by ID
func (r *newsletterBlockRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("newsletter block ID cannot be nil")
	}

	query := `DELETE FROM newsletter_blocks WHERE id = $1`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete newsletter block: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("newsletter block not found")
	}

	return nil
}

// BulkCreate creates multiple newsletter blocks in a single transaction
func (r *newsletterBlockRepository) BulkCreate(ctx context.Context, blocks []*domain.NewsletterBlock) error {
	if len(blocks) == 0 {
		return nil
	}

	// Validate all blocks first
	for i, block := range blocks {
		if block == nil {
			return fmt.Errorf("block at index %d is nil", i)
		}
		if err := block.Validate(); err != nil {
			return fmt.Errorf("invalid block at index %d: %w", i, err)
		}
	}

	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	query := `
		INSERT INTO newsletter_blocks (
			id, issue_id, content_item_id, block_type, position,
			title, teaser, cta_label, cta_url,
			is_promotional, topic_tags, clicks,
			created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
	`

	for _, block := range blocks {
		_, err := tx.Exec(ctx, query,
			block.ID,
			block.IssueID,
			block.ContentItemID,
			block.BlockType,
			block.Position,
			block.Title,
			block.Teaser,
			block.CTALabel,
			block.CTAURL,
			block.IsPromotional,
			pq.Array(block.TopicTags),
			block.Clicks,
			block.CreatedAt,
			block.UpdatedAt,
		)

		if err != nil {
			return fmt.Errorf("failed to insert block %s: %w", block.ID, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// UpdatePositions updates the positions of multiple blocks within an issue
func (r *newsletterBlockRepository) UpdatePositions(ctx context.Context, issueID uuid.UUID, positions map[uuid.UUID]int) error {
	if issueID == uuid.Nil {
		return fmt.Errorf("issue ID cannot be nil")
	}

	if len(positions) == 0 {
		return nil
	}

	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	query := `
		UPDATE newsletter_blocks
		SET position = $2, updated_at = $3
		WHERE id = $1 AND issue_id = $4
	`

	now := time.Now()
	for blockID, position := range positions {
		if position < 0 {
			return fmt.Errorf("position cannot be negative for block %s", blockID)
		}

		cmdTag, err := tx.Exec(ctx, query, blockID, position, now, issueID)
		if err != nil {
			return fmt.Errorf("failed to update position for block %s: %w", blockID, err)
		}

		if cmdTag.RowsAffected() == 0 {
			return fmt.Errorf("block %s not found in issue %s", blockID, issueID)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// IncrementClicks atomically increments the click count for a block
func (r *newsletterBlockRepository) IncrementClicks(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("newsletter block ID cannot be nil")
	}

	query := `
		UPDATE newsletter_blocks
		SET clicks = clicks + 1, updated_at = $2
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id, time.Now())
	if err != nil {
		return fmt.Errorf("failed to increment clicks: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("newsletter block not found")
	}

	return nil
}

// DeleteByIssueID deletes all blocks for a given issue
func (r *newsletterBlockRepository) DeleteByIssueID(ctx context.Context, issueID uuid.UUID) error {
	if issueID == uuid.Nil {
		return fmt.Errorf("issue ID cannot be nil")
	}

	query := `DELETE FROM newsletter_blocks WHERE issue_id = $1`

	_, err := r.db.Pool.Exec(ctx, query, issueID)
	if err != nil {
		return fmt.Errorf("failed to delete blocks for issue: %w", err)
	}

	return nil
}

// GetByBlockType retrieves blocks of a specific type within an issue
func (r *newsletterBlockRepository) GetByBlockType(ctx context.Context, issueID uuid.UUID, blockType domain.BlockType) ([]*domain.NewsletterBlock, error) {
	if issueID == uuid.Nil {
		return nil, fmt.Errorf("issue ID cannot be nil")
	}

	if !blockType.IsValid() {
		return nil, fmt.Errorf("invalid block type: %s", blockType)
	}

	query := `
		SELECT
			id, issue_id, content_item_id, block_type, position,
			title, teaser, cta_label, cta_url,
			is_promotional, topic_tags, clicks,
			created_at, updated_at
		FROM newsletter_blocks
		WHERE issue_id = $1 AND block_type = $2
		ORDER BY position ASC
	`

	rows, err := r.db.Pool.Query(ctx, query, issueID, blockType)
	if err != nil {
		return nil, fmt.Errorf("failed to get newsletter blocks by type: %w", err)
	}
	defer rows.Close()

	blocks := make([]*domain.NewsletterBlock, 0)
	for rows.Next() {
		block := &domain.NewsletterBlock{}
		var topicTags []string

		err := rows.Scan(
			&block.ID,
			&block.IssueID,
			&block.ContentItemID,
			&block.BlockType,
			&block.Position,
			&block.Title,
			&block.Teaser,
			&block.CTALabel,
			&block.CTAURL,
			&block.IsPromotional,
			&topicTags,
			&block.Clicks,
			&block.CreatedAt,
			&block.UpdatedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan newsletter block: %w", err)
		}

		block.TopicTags = topicTags
		blocks = append(blocks, block)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating newsletter blocks: %w", err)
	}

	return blocks, nil
}

// CountByIssueID returns the number of blocks in an issue
func (r *newsletterBlockRepository) CountByIssueID(ctx context.Context, issueID uuid.UUID) (int, error) {
	if issueID == uuid.Nil {
		return 0, fmt.Errorf("issue ID cannot be nil")
	}

	query := `SELECT COUNT(*) FROM newsletter_blocks WHERE issue_id = $1`

	var count int
	err := r.db.Pool.QueryRow(ctx, query, issueID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count blocks: %w", err)
	}

	return count, nil
}

// GetMaxPosition returns the maximum position value for blocks in an issue
func (r *newsletterBlockRepository) GetMaxPosition(ctx context.Context, issueID uuid.UUID) (int, error) {
	if issueID == uuid.Nil {
		return 0, fmt.Errorf("issue ID cannot be nil")
	}

	query := `SELECT COALESCE(MAX(position), -1) FROM newsletter_blocks WHERE issue_id = $1`

	var maxPosition int
	err := r.db.Pool.QueryRow(ctx, query, issueID).Scan(&maxPosition)
	if err != nil {
		return 0, fmt.Errorf("failed to get max position: %w", err)
	}

	return maxPosition, nil
}

// GetMaxPositionForUpdate returns the maximum position with pessimistic locking (FOR UPDATE)
// This must be called within a transaction to prevent race conditions during bulk block creation.
// Note: PostgreSQL doesn't allow FOR UPDATE with aggregate functions, so we lock the parent
// newsletter_issues row instead to serialize concurrent block additions.
func (r *newsletterBlockRepository) GetMaxPositionForUpdate(ctx context.Context, tx pgx.Tx, issueID uuid.UUID) (int, error) {
	if issueID == uuid.Nil {
		return 0, fmt.Errorf("issue ID cannot be nil")
	}

	// Lock the parent newsletter_issues row to serialize concurrent block additions.
	// This prevents race conditions where two concurrent requests could get the same
	// max position value and create blocks with conflicting positions.
	lockQuery := `SELECT id FROM newsletter_issues WHERE id = $1 FOR UPDATE`
	var lockedID uuid.UUID
	err := tx.QueryRow(ctx, lockQuery, issueID).Scan(&lockedID)
	if err != nil {
		return 0, fmt.Errorf("failed to lock newsletter issue: %w", err)
	}

	// Now safely get the max position without FOR UPDATE (the parent lock serializes access)
	maxQuery := `SELECT COALESCE(MAX(position), -1) FROM newsletter_blocks WHERE issue_id = $1`
	var maxPosition int
	err = tx.QueryRow(ctx, maxQuery, issueID).Scan(&maxPosition)
	if err != nil {
		return 0, fmt.Errorf("failed to get max position: %w", err)
	}

	return maxPosition, nil
}

// GetExistingContentItemIDs returns content item IDs that already exist as blocks in the issue
func (r *newsletterBlockRepository) GetExistingContentItemIDs(ctx context.Context, issueID uuid.UUID, contentItemIDs []uuid.UUID) ([]uuid.UUID, error) {
	if issueID == uuid.Nil {
		return nil, fmt.Errorf("issue ID cannot be nil")
	}

	if len(contentItemIDs) == 0 {
		return nil, nil
	}

	query := `
		SELECT content_item_id
		FROM newsletter_blocks
		WHERE issue_id = $1 AND content_item_id = ANY($2)
	`

	rows, err := r.db.Pool.Query(ctx, query, issueID, contentItemIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to get existing content item IDs: %w", err)
	}
	defer rows.Close()

	existingIDs := make([]uuid.UUID, 0)
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("failed to scan content item ID: %w", err)
		}
		existingIDs = append(existingIDs, id)
	}

	return existingIDs, nil
}

// BulkCreateWithLock creates multiple newsletter blocks with pessimistic locking
// Uses SELECT FOR UPDATE to prevent position conflicts during concurrent additions
func (r *newsletterBlockRepository) BulkCreateWithLock(ctx context.Context, issueID uuid.UUID, blocks []*domain.NewsletterBlock) error {
	if issueID == uuid.Nil {
		return fmt.Errorf("issue ID cannot be nil")
	}

	if len(blocks) == 0 {
		return nil
	}

	// Validate all blocks first
	for i, block := range blocks {
		if block == nil {
			return fmt.Errorf("block at index %d is nil", i)
		}
		if err := block.Validate(); err != nil {
			return fmt.Errorf("invalid block at index %d: %w", i, err)
		}
	}

	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Get max position with lock to prevent race conditions
	maxPosition, err := r.GetMaxPositionForUpdate(ctx, tx, issueID)
	if err != nil {
		return fmt.Errorf("failed to get max position: %w", err)
	}

	// Assign positions starting after max
	currentPosition := maxPosition + 1
	insertQuery := `
		INSERT INTO newsletter_blocks (
			id, issue_id, content_item_id, block_type, position,
			title, teaser, cta_label, cta_url,
			is_promotional, topic_tags, clicks,
			created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
	`

	for _, block := range blocks {
		block.Position = currentPosition
		currentPosition++

		_, err := tx.Exec(ctx, insertQuery,
			block.ID,
			block.IssueID,
			block.ContentItemID,
			block.BlockType,
			block.Position,
			block.Title,
			block.Teaser,
			block.CTALabel,
			block.CTAURL,
			block.IsPromotional,
			pq.Array(block.TopicTags),
			block.Clicks,
			block.CreatedAt,
			block.UpdatedAt,
		)

		if err != nil {
			return fmt.Errorf("failed to insert block %s: %w", block.ID, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}
