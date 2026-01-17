package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/repository"
)

type articleRepository struct {
	db *DB
}

// NewArticleRepository creates a new PostgreSQL article repository
func NewArticleRepository(db *DB) repository.ArticleRepository {
	if db == nil {
		panic("database cannot be nil")
	}
	return &articleRepository{db: db}
}

// Create creates a new article
func (r *articleRepository) Create(ctx context.Context, article *domain.Article) error {
	if article == nil {
		return fmt.Errorf("article cannot be nil")
	}

	if err := article.Validate(); err != nil {
		return fmt.Errorf("invalid article: %w", err)
	}

	// Marshal IOCs to JSON
	iocsJSON, err := json.Marshal(article.IOCs)
	if err != nil {
		return fmt.Errorf("failed to marshal IOCs: %w", err)
	}

	// Marshal ArmorCTA to JSON
	var ctaJSON []byte
	if article.ArmorCTA != nil {
		ctaJSON, err = json.Marshal(article.ArmorCTA)
		if err != nil {
			return fmt.Errorf("failed to marshal ArmorCTA: %w", err)
		}
	}

	query := `
		INSERT INTO articles (
			id, title, slug, content, summary, category_id, source_id, source_url,
			severity, tags, cves, vendors, threat_type, attack_vector, impact_assessment,
			recommended_actions, iocs, armor_relevance, armor_cta, competitor_score,
			is_competitor_favorable, reading_time_minutes, view_count, is_published,
			published_at, enriched_at, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
			$18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
		)
	`

	_, err = r.db.Pool.Exec(ctx, query,
		article.ID,
		article.Title,
		article.Slug,
		article.Content,
		article.Summary,
		article.CategoryID,
		article.SourceID,
		article.SourceURL,
		article.Severity,
		article.Tags,
		article.CVEs,
		article.Vendors,
		article.ThreatType,
		article.AttackVector,
		article.ImpactAssessment,
		article.RecommendedActions,
		iocsJSON,
		article.ArmorRelevance,
		ctaJSON,
		article.CompetitorScore,
		article.IsCompetitorFavorable,
		article.ReadingTimeMinutes,
		article.ViewCount,
		article.IsPublished,
		article.PublishedAt,
		article.EnrichedAt,
		article.CreatedAt,
		article.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create article: %w", err)
	}

	return nil
}

// GetByID retrieves an article by ID
func (r *articleRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Article, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("article ID cannot be nil")
	}

	query := `
		SELECT
			id, title, slug, content, summary, category_id, source_id, source_url,
			severity, tags, cves, vendors, threat_type, attack_vector, impact_assessment,
			recommended_actions, iocs, armor_relevance, armor_cta, competitor_score,
			is_competitor_favorable, reading_time_minutes, view_count, is_published,
			published_at, enriched_at, created_at, updated_at
		FROM articles
		WHERE id = $1
	`

	var iocsJSON []byte
	var ctaJSON []byte
	article := &domain.Article{}

	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
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
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("article not found: %w", err)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get article: %w", err)
	}

	// Unmarshal IOCs
	if len(iocsJSON) > 0 {
		if err := json.Unmarshal(iocsJSON, &article.IOCs); err != nil {
			return nil, fmt.Errorf("failed to unmarshal IOCs: %w", err)
		}
	}

	// Unmarshal ArmorCTA
	if len(ctaJSON) > 0 {
		if err := json.Unmarshal(ctaJSON, &article.ArmorCTA); err != nil {
			return nil, fmt.Errorf("failed to unmarshal ArmorCTA: %w", err)
		}
	}

	return article, nil
}

// GetBySlug retrieves an article by slug
func (r *articleRepository) GetBySlug(ctx context.Context, slug string) (*domain.Article, error) {
	if slug == "" {
		return nil, fmt.Errorf("slug cannot be empty")
	}

	query := `
		SELECT
			id, title, slug, content, summary, category_id, source_id, source_url,
			severity, tags, cves, vendors, threat_type, attack_vector, impact_assessment,
			recommended_actions, iocs, armor_relevance, armor_cta, competitor_score,
			is_competitor_favorable, reading_time_minutes, view_count, is_published,
			published_at, enriched_at, created_at, updated_at
		FROM articles
		WHERE slug = $1
	`

	var iocsJSON []byte
	var ctaJSON []byte
	article := &domain.Article{}

	err := r.db.Pool.QueryRow(ctx, query, slug).Scan(
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
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("article not found with slug %s: %w", slug, err)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get article by slug: %w", err)
	}

	// Unmarshal IOCs
	if len(iocsJSON) > 0 {
		if err := json.Unmarshal(iocsJSON, &article.IOCs); err != nil {
			return nil, fmt.Errorf("failed to unmarshal IOCs: %w", err)
		}
	}

	// Unmarshal ArmorCTA
	if len(ctaJSON) > 0 {
		if err := json.Unmarshal(ctaJSON, &article.ArmorCTA); err != nil {
			return nil, fmt.Errorf("failed to unmarshal ArmorCTA: %w", err)
		}
	}

	return article, nil
}

// GetBySourceURL retrieves an article by source URL
func (r *articleRepository) GetBySourceURL(ctx context.Context, sourceURL string) (*domain.Article, error) {
	if sourceURL == "" {
		return nil, fmt.Errorf("source URL cannot be empty")
	}

	query := `
		SELECT
			id, title, slug, content, summary, category_id, source_id, source_url,
			severity, tags, cves, vendors, threat_type, attack_vector, impact_assessment,
			recommended_actions, iocs, armor_relevance, armor_cta, competitor_score,
			is_competitor_favorable, reading_time_minutes, view_count, is_published,
			published_at, enriched_at, created_at, updated_at
		FROM articles
		WHERE source_url = $1
	`

	var iocsJSON []byte
	var ctaJSON []byte
	article := &domain.Article{}

	err := r.db.Pool.QueryRow(ctx, query, sourceURL).Scan(
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
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("article not found with source URL: %w", err)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get article by source URL: %w", err)
	}

	// Unmarshal IOCs
	if len(iocsJSON) > 0 {
		if err := json.Unmarshal(iocsJSON, &article.IOCs); err != nil {
			return nil, fmt.Errorf("failed to unmarshal IOCs: %w", err)
		}
	}

	// Unmarshal ArmorCTA
	if len(ctaJSON) > 0 {
		if err := json.Unmarshal(ctaJSON, &article.ArmorCTA); err != nil {
			return nil, fmt.Errorf("failed to unmarshal ArmorCTA: %w", err)
		}
	}

	return article, nil
}

// List retrieves articles with filtering and pagination
func (r *articleRepository) List(ctx context.Context, filter *domain.ArticleFilter) ([]*domain.Article, int, error) {
	if filter == nil {
		filter = domain.NewArticleFilter()
	}

	if err := filter.Validate(); err != nil {
		return nil, 0, fmt.Errorf("invalid filter: %w", err)
	}

	// Build WHERE clause
	where := []string{"a.is_published = true"} // Only published articles
	args := []interface{}{}
	argCount := 0

	if filter.CategoryID != nil {
		argCount++
		where = append(where, fmt.Sprintf("a.category_id = $%d", argCount))
		args = append(args, *filter.CategoryID)
	}

	if filter.SourceID != nil {
		argCount++
		where = append(where, fmt.Sprintf("a.source_id = $%d", argCount))
		args = append(args, *filter.SourceID)
	}

	if filter.Severity != nil {
		argCount++
		where = append(where, fmt.Sprintf("a.severity = $%d", argCount))
		args = append(args, *filter.Severity)
	}

	if len(filter.Tags) > 0 {
		argCount++
		where = append(where, fmt.Sprintf("a.tags && $%d", argCount))
		args = append(args, filter.Tags)
	}

	if filter.CVE != nil {
		argCount++
		where = append(where, fmt.Sprintf("$%d = ANY(a.cves)", argCount))
		args = append(args, *filter.CVE)
	}

	if filter.Vendor != nil {
		argCount++
		where = append(where, fmt.Sprintf("$%d = ANY(a.vendors)", argCount))
		args = append(args, *filter.Vendor)
	}

	if filter.DateFrom != nil {
		argCount++
		where = append(where, fmt.Sprintf("a.published_at >= $%d", argCount))
		args = append(args, *filter.DateFrom)
	}

	if filter.DateTo != nil {
		argCount++
		where = append(where, fmt.Sprintf("a.published_at <= $%d", argCount))
		args = append(args, *filter.DateTo)
	}

	if filter.SearchQuery != nil {
		argCount++
		where = append(where, fmt.Sprintf("(a.title ILIKE $%d OR a.content ILIKE $%d OR COALESCE(a.summary, '') ILIKE $%d)", argCount, argCount, argCount))
		searchTerm := "%" + *filter.SearchQuery + "%"
		args = append(args, searchTerm)
	}

	whereClause := strings.Join(where, " AND ")

	// Determine JOIN clause and ORDER BY based on sort option
	var joinClause, orderClause string

	if filter.SortBy != nil {
		switch *filter.SortBy {
		case domain.SortByLatestViewed:
			if filter.UserID == nil {
				return nil, 0, fmt.Errorf("user_id is required for latest_viewed sorting")
			}
			argCount++
			userIDArg := argCount
			args = append(args, *filter.UserID)

			joinClause = fmt.Sprintf(`
				LEFT JOIN (
					SELECT DISTINCT ON (article_id) article_id, read_at
					FROM article_reads
					WHERE user_id = $%d
					ORDER BY article_id, read_at DESC
				) user_reads ON a.id = user_reads.article_id`, userIDArg)
			orderClause = "user_reads.read_at DESC NULLS LAST, a.published_at DESC"

		case domain.SortByNewest:
			orderClause = "a.published_at DESC"
		case domain.SortByOldest:
			orderClause = "a.published_at ASC"
		case domain.SortBySeverityDesc:
			orderClause = `
				CASE a.severity
					WHEN 'critical' THEN 1
					WHEN 'high' THEN 2
					WHEN 'medium' THEN 3
					WHEN 'low' THEN 4
					WHEN 'informational' THEN 5
					ELSE 6
				END ASC, a.published_at DESC`
		case domain.SortBySeverityAsc:
			orderClause = `
				CASE a.severity
					WHEN 'critical' THEN 1
					WHEN 'high' THEN 2
					WHEN 'medium' THEN 3
					WHEN 'low' THEN 4
					WHEN 'informational' THEN 5
					ELSE 6
				END DESC, a.published_at DESC`
		case domain.SortByTitleAsc:
			orderClause = "a.title ASC"
		case domain.SortByTitleDesc:
			orderClause = "a.title DESC"
		case domain.SortByCVECountDesc:
			orderClause = "COALESCE(array_length(a.cves, 1), 0) DESC, a.published_at DESC"
		case domain.SortBySourceAsc:
			joinClause = "LEFT JOIN sources s ON a.source_id = s.id"
			orderClause = "s.name ASC, a.published_at DESC"
		default:
			orderClause = "a.published_at DESC"
		}
	} else {
		orderClause = "a.published_at DESC"
	}

	// Count total with appropriate joins
	countFromClause := "articles a"
	if joinClause != "" {
		countFromClause = fmt.Sprintf("articles a %s", joinClause)
	}
	countQuery := fmt.Sprintf("SELECT COUNT(DISTINCT a.id) FROM %s WHERE %s", countFromClause, whereClause)

	var total int
	err := r.db.Pool.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count articles: %w", err)
	}

	// Get articles with pagination
	argCount++
	limitArg := argCount
	argCount++
	offsetArg := argCount

	// Build complete query
	selectFields := `
		a.id, a.title, a.slug, a.content, a.summary, a.category_id, a.source_id, a.source_url,
		a.severity, a.tags, a.cves, a.vendors, a.threat_type, a.attack_vector, a.impact_assessment,
		a.recommended_actions, a.iocs, a.armor_relevance, a.armor_cta, a.competitor_score,
		a.is_competitor_favorable, a.reading_time_minutes, a.view_count, a.is_published,
		a.published_at, a.enriched_at, a.created_at, a.updated_at`

	fromClause := "articles a"
	if joinClause != "" {
		fromClause = fmt.Sprintf("articles a %s", joinClause)
	}

	query := fmt.Sprintf(`
		SELECT DISTINCT %s
		FROM %s
		WHERE %s
		ORDER BY %s
		LIMIT $%d OFFSET $%d
	`, selectFields, fromClause, whereClause, orderClause, limitArg, offsetArg)

	args = append(args, filter.PageSize, filter.Offset())

	rows, err := r.db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list articles: %w", err)
	}
	defer rows.Close()

	articles := make([]*domain.Article, 0)
	for rows.Next() {
		var iocsJSON []byte
		var ctaJSON []byte
		article := &domain.Article{}

		err := rows.Scan(
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
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan article: %w", err)
		}

		// Unmarshal IOCs
		if len(iocsJSON) > 0 {
			if err := json.Unmarshal(iocsJSON, &article.IOCs); err != nil {
				return nil, 0, fmt.Errorf("failed to unmarshal IOCs: %w", err)
			}
		}

		// Unmarshal ArmorCTA
		if len(ctaJSON) > 0 {
			if err := json.Unmarshal(ctaJSON, &article.ArmorCTA); err != nil {
				return nil, 0, fmt.Errorf("failed to unmarshal ArmorCTA: %w", err)
			}
		}

		articles = append(articles, article)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating articles: %w", err)
	}

	return articles, total, nil
}

// Update updates an existing article
func (r *articleRepository) Update(ctx context.Context, article *domain.Article) error {
	if article == nil {
		return fmt.Errorf("article cannot be nil")
	}

	if err := article.Validate(); err != nil {
		return fmt.Errorf("invalid article: %w", err)
	}

	// Marshal IOCs to JSON
	iocsJSON, err := json.Marshal(article.IOCs)
	if err != nil {
		return fmt.Errorf("failed to marshal IOCs: %w", err)
	}

	// Marshal ArmorCTA to JSON
	var ctaJSON []byte
	if article.ArmorCTA != nil {
		ctaJSON, err = json.Marshal(article.ArmorCTA)
		if err != nil {
			return fmt.Errorf("failed to marshal ArmorCTA: %w", err)
		}
	}

	query := `
		UPDATE articles SET
			title = $2, slug = $3, content = $4, summary = $5, category_id = $6,
			source_id = $7, source_url = $8, severity = $9, tags = $10, cves = $11,
			vendors = $12, threat_type = $13, attack_vector = $14, impact_assessment = $15,
			recommended_actions = $16, iocs = $17, armor_relevance = $18, armor_cta = $19,
			competitor_score = $20, is_competitor_favorable = $21, reading_time_minutes = $22,
			view_count = $23, is_published = $24, published_at = $25, enriched_at = $26,
			updated_at = $27
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query,
		article.ID,
		article.Title,
		article.Slug,
		article.Content,
		article.Summary,
		article.CategoryID,
		article.SourceID,
		article.SourceURL,
		article.Severity,
		article.Tags,
		article.CVEs,
		article.Vendors,
		article.ThreatType,
		article.AttackVector,
		article.ImpactAssessment,
		article.RecommendedActions,
		iocsJSON,
		article.ArmorRelevance,
		ctaJSON,
		article.CompetitorScore,
		article.IsCompetitorFavorable,
		article.ReadingTimeMinutes,
		article.ViewCount,
		article.IsPublished,
		article.PublishedAt,
		article.EnrichedAt,
		article.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to update article: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("article not found")
	}

	return nil
}

// Delete soft deletes an article by ID
func (r *articleRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("article ID cannot be nil")
	}

	query := `DELETE FROM articles WHERE id = $1`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete article: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("article not found")
	}

	return nil
}

// IncrementViewCount increments the view count for an article
func (r *articleRepository) IncrementViewCount(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("article ID cannot be nil")
	}

	query := `UPDATE articles SET view_count = view_count + 1 WHERE id = $1`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to increment view count: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("article not found")
	}

	return nil
}
