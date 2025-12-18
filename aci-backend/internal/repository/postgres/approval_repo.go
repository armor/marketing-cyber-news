package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/repository"
)

type approvalRepository struct {
	db *DB
}

// NewApprovalRepository creates a new PostgreSQL approval repository
func NewApprovalRepository(db *DB) repository.ApprovalRepository {
	if db == nil {
		panic("database cannot be nil")
	}
	return &approvalRepository{db: db}
}

// GetApprovalQueue retrieves articles in a specific approval status with filtering and pagination
func (r *approvalRepository) GetApprovalQueue(ctx context.Context, status domain.ApprovalStatus, opts repository.QueryOptions) ([]domain.Article, int, error) {
	if !status.IsValid() {
		return nil, 0, fmt.Errorf("invalid approval status: %s", status)
	}

	if err := opts.Validate(); err != nil {
		return nil, 0, fmt.Errorf("invalid query options: %w", err)
	}

	// Build WHERE clause
	where := []string{
		"a.approval_status = $1",
		"a.rejected = false",
	}
	args := []interface{}{status}
	argCount := 1

	if opts.CategoryID != nil {
		argCount++
		where = append(where, fmt.Sprintf("a.category_id = $%d", argCount))
		args = append(args, *opts.CategoryID)
	}

	if opts.Severity != nil {
		argCount++
		where = append(where, fmt.Sprintf("a.severity = $%d", argCount))
		args = append(args, *opts.Severity)
	}

	if opts.DateFrom != nil {
		argCount++
		where = append(where, fmt.Sprintf("a.published_at >= $%d", argCount))
		args = append(args, *opts.DateFrom)
	}

	if opts.DateTo != nil {
		argCount++
		where = append(where, fmt.Sprintf("a.published_at <= $%d", argCount))
		args = append(args, *opts.DateTo)
	}

	whereClause := strings.Join(where, " AND ")

	// Count total matching articles
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM articles a
		WHERE %s
	`, whereClause)

	var total int
	err := r.db.Pool.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count approval queue: %w", err)
	}

	if total == 0 {
		return []domain.Article{}, 0, nil
	}

	// Build ORDER BY clause with mapping
	sortFieldMap := map[string]string{
		"created_at":    "a.created_at",
		"published_at":  "a.published_at",
		"severity":      "a.severity",
		"title":         "a.title",
		"category_name": "c.name",
	}

	sortField := sortFieldMap[opts.SortBy]
	orderBy := fmt.Sprintf("%s %s", sortField, opts.SortOrder)

	// Calculate offset
	offset := (opts.Page - 1) * opts.PageSize

	// Query articles with joins
	query := fmt.Sprintf(`
		SELECT
			a.id, a.title, a.slug, a.content, a.summary, a.category_id, a.source_id,
			a.source_url, a.severity, a.tags, a.cves, a.vendors, a.threat_type,
			a.attack_vector, a.impact_assessment, a.recommended_actions, a.iocs,
			a.armor_relevance, a.armor_cta, a.competitor_score, a.is_competitor_favorable,
			a.reading_time_minutes, a.view_count, a.is_published, a.published_at,
			a.enriched_at, a.created_at, a.updated_at,
			a.approval_status, a.rejected, a.rejection_reason, a.rejected_by,
			a.rejected_at, a.released_at, a.released_by,
			c.id, c.name, c.slug, c.description, c.color,
			s.id, s.name, s.url, s.feed_url, s.is_active
		FROM articles a
		INNER JOIN categories c ON a.category_id = c.id
		INNER JOIN sources s ON a.source_id = s.id
		WHERE %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d
	`, whereClause, orderBy, argCount+1, argCount+2)

	args = append(args, opts.PageSize, offset)

	rows, err := r.db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query approval queue: %w", err)
	}
	defer rows.Close()

	articles := make([]domain.Article, 0)
	for rows.Next() {
		article, err := r.scanArticleWithJoins(rows)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan article: %w", err)
		}
		articles = append(articles, *article)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating rows: %w", err)
	}

	return articles, total, nil
}

// GetAllPendingArticles retrieves all articles in any pending status (for admin/super_admin view)
func (r *approvalRepository) GetAllPendingArticles(ctx context.Context, opts repository.QueryOptions) ([]domain.Article, int, error) {
	if err := opts.Validate(); err != nil {
		return nil, 0, fmt.Errorf("invalid query options: %w", err)
	}

	// Build WHERE clause for all pending statuses
	where := []string{
		"a.approval_status IN ('pending_marketing', 'pending_branding', 'pending_soc_l1', 'pending_soc_l3', 'pending_ciso')",
		"a.rejected = false",
	}
	args := []interface{}{}
	argCount := 0

	if opts.CategoryID != nil {
		argCount++
		where = append(where, fmt.Sprintf("a.category_id = $%d", argCount))
		args = append(args, *opts.CategoryID)
	}

	if opts.Severity != nil {
		argCount++
		where = append(where, fmt.Sprintf("a.severity = $%d", argCount))
		args = append(args, *opts.Severity)
	}

	if opts.DateFrom != nil {
		argCount++
		where = append(where, fmt.Sprintf("a.published_at >= $%d", argCount))
		args = append(args, *opts.DateFrom)
	}

	if opts.DateTo != nil {
		argCount++
		where = append(where, fmt.Sprintf("a.published_at <= $%d", argCount))
		args = append(args, *opts.DateTo)
	}

	whereClause := strings.Join(where, " AND ")

	// Count total
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM articles a
		WHERE %s
	`, whereClause)

	var total int
	err := r.db.Pool.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count pending articles: %w", err)
	}

	if total == 0 {
		return []domain.Article{}, 0, nil
	}

	// Build ORDER BY clause
	sortFieldMap := map[string]string{
		"created_at":    "a.created_at",
		"published_at":  "a.published_at",
		"severity":      "a.severity",
		"title":         "a.title",
		"category_name": "c.name",
	}

	sortField := sortFieldMap[opts.SortBy]
	orderBy := fmt.Sprintf("%s %s", sortField, opts.SortOrder)

	offset := (opts.Page - 1) * opts.PageSize

	query := fmt.Sprintf(`
		SELECT
			a.id, a.title, a.slug, a.content, a.summary, a.category_id, a.source_id,
			a.source_url, a.severity, a.tags, a.cves, a.vendors, a.threat_type,
			a.attack_vector, a.impact_assessment, a.recommended_actions, a.iocs,
			a.armor_relevance, a.armor_cta, a.competitor_score, a.is_competitor_favorable,
			a.reading_time_minutes, a.view_count, a.is_published, a.published_at,
			a.enriched_at, a.created_at, a.updated_at,
			a.approval_status, a.rejected, a.rejection_reason, a.rejected_by,
			a.rejected_at, a.released_at, a.released_by,
			c.id, c.name, c.slug, c.description, c.color,
			s.id, s.name, s.url, s.feed_url, s.is_active
		FROM articles a
		INNER JOIN categories c ON a.category_id = c.id
		INNER JOIN sources s ON a.source_id = s.id
		WHERE %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d
	`, whereClause, orderBy, argCount+1, argCount+2)

	args = append(args, opts.PageSize, offset)

	rows, err := r.db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query pending articles: %w", err)
	}
	defer rows.Close()

	articles := make([]domain.Article, 0)
	for rows.Next() {
		article, err := r.scanArticleWithJoins(rows)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan article: %w", err)
		}
		articles = append(articles, *article)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating rows: %w", err)
	}

	return articles, total, nil
}

// CreateApproval creates a new approval record for an article gate
func (r *approvalRepository) CreateApproval(ctx context.Context, approval *domain.ArticleApproval) error {
	if approval == nil {
		return fmt.Errorf("approval cannot be nil")
	}

	if err := approval.Validate(); err != nil {
		return fmt.Errorf("invalid approval: %w", err)
	}

	query := `
		INSERT INTO article_approvals (
			id, article_id, gate, approved_by, approved_at, notes
		) VALUES (
			$1, $2, $3, $4, $5, $6
		)
	`

	_, err := r.db.Pool.Exec(ctx, query,
		approval.ID,
		approval.ArticleID,
		approval.Gate,
		approval.ApprovedBy,
		approval.ApprovedAt,
		approval.Notes,
	)

	if err != nil {
		return fmt.Errorf("failed to create approval: %w", err)
	}

	return nil
}

// GetApprovalsByArticle retrieves all approval records for an article
func (r *approvalRepository) GetApprovalsByArticle(ctx context.Context, articleID uuid.UUID) ([]domain.ArticleApproval, error) {
	if articleID == uuid.Nil {
		return nil, fmt.Errorf("article ID cannot be nil")
	}

	query := `
		SELECT
			aa.id, aa.article_id, aa.gate, aa.approved_by, aa.approved_at, aa.notes,
			u.name, u.email
		FROM article_approvals aa
		INNER JOIN users u ON aa.approved_by = u.id
		WHERE aa.article_id = $1
		ORDER BY aa.approved_at ASC
	`

	rows, err := r.db.Pool.Query(ctx, query, articleID)
	if err != nil {
		return nil, fmt.Errorf("failed to query approvals: %w", err)
	}
	defer rows.Close()

	approvals := make([]domain.ArticleApproval, 0)
	for rows.Next() {
		var approval domain.ArticleApproval
		err := rows.Scan(
			&approval.ID,
			&approval.ArticleID,
			&approval.Gate,
			&approval.ApprovedBy,
			&approval.ApprovedAt,
			&approval.Notes,
			&approval.ApproverName,
			&approval.ApproverEmail,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan approval: %w", err)
		}
		approvals = append(approvals, approval)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}

	return approvals, nil
}

// UpdateArticleStatus updates the approval status of an article
func (r *approvalRepository) UpdateArticleStatus(ctx context.Context, articleID uuid.UUID, status domain.ApprovalStatus) error {
	if articleID == uuid.Nil {
		return fmt.Errorf("article ID cannot be nil")
	}

	if !status.IsValid() {
		return fmt.Errorf("invalid approval status: %s", status)
	}

	query := `
		UPDATE articles
		SET approval_status = $1, updated_at = $2
		WHERE id = $3
	`

	result, err := r.db.Pool.Exec(ctx, query, status, time.Now(), articleID)
	if err != nil {
		return fmt.Errorf("failed to update article status: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("article not found: %s", articleID)
	}

	return nil
}

// RejectArticle marks an article as rejected with reason and rejector
func (r *approvalRepository) RejectArticle(ctx context.Context, articleID uuid.UUID, reason string, rejectedBy uuid.UUID) error {
	if articleID == uuid.Nil {
		return fmt.Errorf("article ID cannot be nil")
	}

	if reason == "" {
		return fmt.Errorf("rejection reason is required")
	}

	if rejectedBy == uuid.Nil {
		return fmt.Errorf("rejected_by user ID is required")
	}

	query := `
		UPDATE articles
		SET
			approval_status = 'rejected',
			rejected = true,
			rejection_reason = $1,
			rejected_by = $2,
			rejected_at = $3,
			updated_at = $3
		WHERE id = $4
	`

	now := time.Now()
	result, err := r.db.Pool.Exec(ctx, query, reason, rejectedBy, now, articleID)
	if err != nil {
		return fmt.Errorf("failed to reject article: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("article not found: %s", articleID)
	}

	return nil
}

// ReleaseArticle marks an approved article as released to the public
func (r *approvalRepository) ReleaseArticle(ctx context.Context, articleID uuid.UUID, releasedBy uuid.UUID) error {
	if articleID == uuid.Nil {
		return fmt.Errorf("article ID cannot be nil")
	}

	if releasedBy == uuid.Nil {
		return fmt.Errorf("released_by user ID is required")
	}

	query := `
		UPDATE articles
		SET
			approval_status = 'released',
			released_at = $1,
			released_by = $2,
			updated_at = $1
		WHERE id = $3 AND approval_status = 'approved'
	`

	now := time.Now()
	result, err := r.db.Pool.Exec(ctx, query, now, releasedBy, articleID)
	if err != nil {
		return fmt.Errorf("failed to release article: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("article not found or not in approved status: %s", articleID)
	}

	return nil
}

// ResetArticle resets a rejected article back to pending_marketing status
func (r *approvalRepository) ResetArticle(ctx context.Context, articleID uuid.UUID) error {
	if articleID == uuid.Nil {
		return fmt.Errorf("article ID cannot be nil")
	}

	// Use transaction to reset article and clear approvals
	tx, err := r.db.BeginTx(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Reset article status and clear rejection fields
	resetQuery := `
		UPDATE articles
		SET
			approval_status = 'pending_marketing',
			rejected = false,
			rejection_reason = NULL,
			rejected_by = NULL,
			rejected_at = NULL,
			updated_at = $1
		WHERE id = $2 AND rejected = true
	`

	result, err := tx.Exec(ctx, resetQuery, time.Now(), articleID)
	if err != nil {
		return fmt.Errorf("failed to reset article: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("article not found or not in rejected status: %s", articleID)
	}

	// Delete existing approvals so article can restart workflow
	deleteQuery := `
		DELETE FROM article_approvals
		WHERE article_id = $1
	`

	_, err = tx.Exec(ctx, deleteQuery, articleID)
	if err != nil {
		return fmt.Errorf("failed to delete approvals: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// GetArticleForApproval retrieves a single article with full details for approval review
func (r *approvalRepository) GetArticleForApproval(ctx context.Context, articleID uuid.UUID) (*domain.Article, error) {
	if articleID == uuid.Nil {
		return nil, fmt.Errorf("article ID cannot be nil")
	}

	query := `
		SELECT
			a.id, a.title, a.slug, a.content, a.summary, a.category_id, a.source_id,
			a.source_url, a.severity, a.tags, a.cves, a.vendors, a.threat_type,
			a.attack_vector, a.impact_assessment, a.recommended_actions, a.iocs,
			a.armor_relevance, a.armor_cta, a.competitor_score, a.is_competitor_favorable,
			a.reading_time_minutes, a.view_count, a.is_published, a.published_at,
			a.enriched_at, a.created_at, a.updated_at,
			a.approval_status, a.rejected, a.rejection_reason, a.rejected_by,
			a.rejected_at, a.released_at, a.released_by,
			c.id, c.name, c.slug, c.description, c.color,
			s.id, s.name, s.url, s.feed_url, s.is_active
		FROM articles a
		INNER JOIN categories c ON a.category_id = c.id
		INNER JOIN sources s ON a.source_id = s.id
		WHERE a.id = $1
	`

	rows, err := r.db.Pool.Query(ctx, query, articleID)
	if err != nil {
		return nil, fmt.Errorf("failed to query article: %w", err)
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, fmt.Errorf("article not found: %s", articleID)
	}

	article, err := r.scanArticleWithJoins(rows)
	if err != nil {
		return nil, fmt.Errorf("failed to scan article: %w", err)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}

	return article, nil
}

// CountByStatus returns counts of articles grouped by approval status
func (r *approvalRepository) CountByStatus(ctx context.Context) (map[domain.ApprovalStatus]int, error) {
	query := `
		SELECT approval_status, COUNT(*) as count
		FROM articles
		WHERE rejected = false
		GROUP BY approval_status
	`

	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to count by status: %w", err)
	}
	defer rows.Close()

	counts := make(map[domain.ApprovalStatus]int)
	for rows.Next() {
		var status domain.ApprovalStatus
		var count int
		err := rows.Scan(&status, &count)
		if err != nil {
			return nil, fmt.Errorf("failed to scan count: %w", err)
		}
		counts[status] = count
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}

	return counts, nil
}

// scanArticleWithJoins scans a row with article, category, and source joined fields
func (r *approvalRepository) scanArticleWithJoins(rows pgx.Rows) (*domain.Article, error) {
	var article domain.Article
	var category domain.Category
	var source domain.Source
	var iocsJSON []byte
	var ctaJSON []byte

	err := rows.Scan(
		// Article fields
		&article.ID,
		&article.Title,
		&article.Slug,
		&article.Content,
		&article.Summary,
		&article.CategoryID,
		&article.SourceID,
		&article.SourceURL,
		&article.Severity,
		&article.Tags,
		&article.CVEs,
		&article.Vendors,
		&article.ThreatType,
		&article.AttackVector,
		&article.ImpactAssessment,
		&article.RecommendedActions,
		&iocsJSON,
		&article.ArmorRelevance,
		&ctaJSON,
		&article.CompetitorScore,
		&article.IsCompetitorFavorable,
		&article.ReadingTimeMinutes,
		&article.ViewCount,
		&article.IsPublished,
		&article.PublishedAt,
		&article.EnrichedAt,
		&article.CreatedAt,
		&article.UpdatedAt,
		// Approval fields
		&article.ApprovalStatus,
		&article.Rejected,
		&article.RejectionReason,
		&article.RejectedBy,
		&article.RejectedAt,
		&article.ReleasedAt,
		&article.ReleasedBy,
		// Category fields
		&category.ID,
		&category.Name,
		&category.Slug,
		&category.Description,
		&category.Color,
		// Source fields (NOTE: FeedURL queried but not loaded, would need to add to Source struct)
		&source.ID,
		&source.Name,
		&source.URL,
		&source.FeedURL,
		&source.IsActive,
	)

	if err != nil {
		return nil, err
	}

	// Unmarshal JSON fields
	if len(iocsJSON) > 0 {
		if err := json.Unmarshal(iocsJSON, &article.IOCs); err != nil {
			return nil, fmt.Errorf("failed to unmarshal IOCs: %w", err)
		}
	}

	if len(ctaJSON) > 0 {
		var cta domain.ArmorCTA
		if err := json.Unmarshal(ctaJSON, &cta); err != nil {
			return nil, fmt.Errorf("failed to unmarshal ArmorCTA: %w", err)
		}
		article.ArmorCTA = &cta
	}

	// Attach joined entities
	article.Category = &category
	article.Source = &source

	return &article, nil
}
