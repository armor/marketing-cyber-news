package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/phillipboles/aci-backend/internal/domain"
)

// QueryOptions defines query parameters for approval queue operations
type QueryOptions struct {
	Page       int
	PageSize   int
	SortBy     string
	SortOrder  string
	CategoryID *uuid.UUID
	Severity   *string
	DateFrom   *time.Time
	DateTo     *time.Time
}

// Validate validates query options and sets defaults
func (o *QueryOptions) Validate() error {
	if o.Page < 1 {
		o.Page = 1
	}

	if o.PageSize < 1 {
		o.PageSize = 20
	}

	if o.PageSize > 100 {
		o.PageSize = 100
	}

	if o.SortBy == "" {
		o.SortBy = "created_at"
	}

	if o.SortOrder == "" {
		o.SortOrder = "DESC"
	}

	// Validate sort order
	if o.SortOrder != "ASC" && o.SortOrder != "DESC" {
		o.SortOrder = "DESC"
	}

	// Validate sort fields
	validSortFields := map[string]bool{
		"created_at":    true,
		"published_at":  true,
		"severity":      true,
		"title":         true,
		"category_name": true,
	}

	if !validSortFields[o.SortBy] {
		o.SortBy = "created_at"
	}

	return nil
}

// ApprovalRepository defines operations for article approval workflow
type ApprovalRepository interface {
	// Queue operations - retrieve articles needing approval
	GetApprovalQueue(ctx context.Context, status domain.ApprovalStatus, opts QueryOptions) ([]domain.Article, int, error)
	GetAllPendingArticles(ctx context.Context, opts QueryOptions) ([]domain.Article, int, error)

	// Approval operations - record approval events
	CreateApproval(ctx context.Context, approval *domain.ArticleApproval) error
	GetApprovalsByArticle(ctx context.Context, articleID uuid.UUID) ([]domain.ArticleApproval, error)

	// Article status operations - manage approval workflow
	UpdateArticleStatus(ctx context.Context, articleID uuid.UUID, status domain.ApprovalStatus) error
	RejectArticle(ctx context.Context, articleID uuid.UUID, reason string, rejectedBy uuid.UUID) error
	ReleaseArticle(ctx context.Context, articleID uuid.UUID, releasedBy uuid.UUID) error
	ResetArticle(ctx context.Context, articleID uuid.UUID) error

	// Query helpers - metadata and single article retrieval
	GetArticleForApproval(ctx context.Context, articleID uuid.UUID) (*domain.Article, error)
	CountByStatus(ctx context.Context) (map[domain.ApprovalStatus]int, error)
}
