package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/phillipboles/aci-backend/internal/domain"
	domainerrors "github.com/phillipboles/aci-backend/internal/domain/errors"
)

// ApprovalRequestRepository implements repository.ApprovalRequestRepository for PostgreSQL
type ApprovalRequestRepository struct {
	db *DB
}

// NewApprovalRequestRepository creates a new PostgreSQL approval request repository
func NewApprovalRequestRepository(db *DB) *ApprovalRequestRepository {
	if db == nil {
		panic("database cannot be nil")
	}
	return &ApprovalRequestRepository{db: db}
}

// Create inserts a new approval request into the database
func (r *ApprovalRequestRepository) Create(ctx context.Context, request *domain.UserApprovalRequest) error {
	if request == nil {
		return fmt.Errorf("request cannot be nil")
	}

	if err := request.Validate(); err != nil {
		return fmt.Errorf("invalid request: %w", err)
	}

	query := `
		INSERT INTO user_approval_requests (id, user_id, status, reviewed_by, reviewed_at, rejection_reason, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	_, err := r.db.Pool.Exec(
		ctx,
		query,
		request.ID,
		request.UserID,
		request.Status,
		request.ReviewedBy,
		request.ReviewedAt,
		request.RejectionReason,
		request.CreatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create approval request: %w", err)
	}

	return nil
}

// GetByID retrieves an approval request by its ID
func (r *ApprovalRequestRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.UserApprovalRequest, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("request ID cannot be nil")
	}

	query := `
		SELECT r.id, r.user_id, r.status, r.reviewed_by, r.reviewed_at, r.rejection_reason, r.created_at,
		       COALESCE(u.email, '') as user_email,
		       COALESCE(u.name, '') as user_name,
		       COALESCE(reviewer.name, '') as reviewed_by_name
		FROM user_approval_requests r
		LEFT JOIN users u ON r.user_id = u.id
		LEFT JOIN users reviewer ON r.reviewed_by = reviewer.id
		WHERE r.id = $1
	`

	var request domain.UserApprovalRequest
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&request.ID,
		&request.UserID,
		&request.Status,
		&request.ReviewedBy,
		&request.ReviewedAt,
		&request.RejectionReason,
		&request.CreatedAt,
		&request.UserEmail,
		&request.UserName,
		&request.ReviewedByName,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, &domainerrors.NotFoundError{
				Resource: "approval_request",
				ID:       id.String(),
			}
		}
		return nil, fmt.Errorf("failed to get approval request by ID: %w", err)
	}

	return &request, nil
}

// GetByUserID retrieves an approval request by user ID
func (r *ApprovalRequestRepository) GetByUserID(ctx context.Context, userID uuid.UUID) (*domain.UserApprovalRequest, error) {
	if userID == uuid.Nil {
		return nil, fmt.Errorf("user ID cannot be nil")
	}

	query := `
		SELECT r.id, r.user_id, r.status, r.reviewed_by, r.reviewed_at, r.rejection_reason, r.created_at,
		       COALESCE(u.email, '') as user_email,
		       COALESCE(u.name, '') as user_name,
		       COALESCE(reviewer.name, '') as reviewed_by_name
		FROM user_approval_requests r
		LEFT JOIN users u ON r.user_id = u.id
		LEFT JOIN users reviewer ON r.reviewed_by = reviewer.id
		WHERE r.user_id = $1
	`

	var request domain.UserApprovalRequest
	err := r.db.Pool.QueryRow(ctx, query, userID).Scan(
		&request.ID,
		&request.UserID,
		&request.Status,
		&request.ReviewedBy,
		&request.ReviewedAt,
		&request.RejectionReason,
		&request.CreatedAt,
		&request.UserEmail,
		&request.UserName,
		&request.ReviewedByName,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, &domainerrors.NotFoundError{
				Resource: "approval_request",
				ID:       userID.String(),
			}
		}
		return nil, fmt.Errorf("failed to get approval request by user: %w", err)
	}

	return &request, nil
}

// Update updates an approval request
func (r *ApprovalRequestRepository) Update(ctx context.Context, request *domain.UserApprovalRequest) error {
	if request == nil {
		return fmt.Errorf("request cannot be nil")
	}

	if request.ID == uuid.Nil {
		return fmt.Errorf("request ID cannot be nil")
	}

	if err := request.Validate(); err != nil {
		return fmt.Errorf("invalid request: %w", err)
	}

	query := `
		UPDATE user_approval_requests
		SET status = $2, reviewed_by = $3, reviewed_at = $4, rejection_reason = $5
		WHERE id = $1
	`

	result, err := r.db.Pool.Exec(
		ctx,
		query,
		request.ID,
		request.Status,
		request.ReviewedBy,
		request.ReviewedAt,
		request.RejectionReason,
	)

	if err != nil {
		return fmt.Errorf("failed to update approval request: %w", err)
	}

	if result.RowsAffected() == 0 {
		return &domainerrors.NotFoundError{
			Resource: "approval_request",
			ID:       request.ID.String(),
		}
	}

	return nil
}

// ListPending retrieves pending approval requests with pagination
func (r *ApprovalRequestRepository) ListPending(ctx context.Context, limit, offset int) ([]*domain.UserApprovalRequest, int, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	// Count pending
	countQuery := `SELECT COUNT(*) FROM user_approval_requests WHERE status = 'pending'`
	var total int
	if err := r.db.Pool.QueryRow(ctx, countQuery).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count pending requests: %w", err)
	}

	// Get data
	query := `
		SELECT r.id, r.user_id, r.status, r.reviewed_by, r.reviewed_at, r.rejection_reason, r.created_at,
		       COALESCE(u.email, '') as user_email,
		       COALESCE(u.name, '') as user_name,
		       COALESCE(reviewer.name, '') as reviewed_by_name
		FROM user_approval_requests r
		LEFT JOIN users u ON r.user_id = u.id
		LEFT JOIN users reviewer ON r.reviewed_by = reviewer.id
		WHERE r.status = 'pending'
		ORDER BY r.created_at ASC
		LIMIT $1 OFFSET $2
	`

	rows, err := r.db.Pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list pending requests: %w", err)
	}
	defer rows.Close()

	var requests []*domain.UserApprovalRequest
	for rows.Next() {
		var req domain.UserApprovalRequest
		if err := rows.Scan(
			&req.ID,
			&req.UserID,
			&req.Status,
			&req.ReviewedBy,
			&req.ReviewedAt,
			&req.RejectionReason,
			&req.CreatedAt,
			&req.UserEmail,
			&req.UserName,
			&req.ReviewedByName,
		); err != nil {
			return nil, 0, fmt.Errorf("failed to scan request: %w", err)
		}
		requests = append(requests, &req)
	}

	return requests, total, nil
}

// Delete removes an approval request by ID
func (r *ApprovalRequestRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("request ID cannot be nil")
	}

	query := `DELETE FROM user_approval_requests WHERE id = $1`

	result, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete approval request: %w", err)
	}

	if result.RowsAffected() == 0 {
		return &domainerrors.NotFoundError{
			Resource: "approval_request",
			ID:       id.String(),
		}
	}

	return nil
}
