package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/repository"
)

type issueApprovalRepository struct {
	db *DB
}

// NewIssueApprovalRepository creates a new PostgreSQL issue approval repository
func NewIssueApprovalRepository(db *DB) repository.IssueApprovalRepository {
	if db == nil {
		panic("database cannot be nil")
	}
	return &issueApprovalRepository{db: db}
}

// Create creates a new issue approval record
func (r *issueApprovalRepository) Create(ctx context.Context, approval *domain.IssueApproval) error {
	if approval == nil {
		return fmt.Errorf("approval cannot be nil")
	}

	if err := approval.Validate(); err != nil {
		return fmt.Errorf("invalid approval: %w", err)
	}

	query := `
		INSERT INTO issue_approvals (
			id, issue_id, gate, approved_by, approved_at, notes
		)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (issue_id, gate)
		DO UPDATE SET
			approved_by = EXCLUDED.approved_by,
			approved_at = EXCLUDED.approved_at,
			notes = EXCLUDED.notes
	`

	_, err := r.db.Pool.Exec(ctx, query,
		approval.ID,
		approval.IssueID,
		approval.Gate,
		approval.ApprovedBy,
		approval.ApprovedAt,
		approval.Notes,
	)

	if err != nil {
		return fmt.Errorf("failed to create issue approval: %w", err)
	}

	return nil
}

// GetByIssueID retrieves all approvals for a specific issue
func (r *issueApprovalRepository) GetByIssueID(ctx context.Context, issueID uuid.UUID) ([]*domain.IssueApproval, error) {
	if issueID == uuid.Nil {
		return nil, fmt.Errorf("issue ID cannot be nil")
	}

	query := `
		SELECT
			ia.id, ia.issue_id, ia.gate, ia.approved_by, ia.approved_at, ia.notes,
			COALESCE(u.name, '') as approver_name,
			COALESCE(u.email, '') as approver_email
		FROM issue_approvals ia
		LEFT JOIN users u ON ia.approved_by = u.id
		WHERE ia.issue_id = $1
		ORDER BY ia.approved_at ASC
	`

	rows, err := r.db.Pool.Query(ctx, query, issueID)
	if err != nil {
		return nil, fmt.Errorf("failed to get issue approvals: %w", err)
	}
	defer rows.Close()

	approvals := make([]*domain.IssueApproval, 0)
	for rows.Next() {
		approval, err := r.scanApprovalFromRows(rows)
		if err != nil {
			return nil, fmt.Errorf("failed to scan approval: %w", err)
		}
		approvals = append(approvals, approval)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating approvals: %w", err)
	}

	return approvals, nil
}

// GetByGate retrieves all approvals for a specific gate
func (r *issueApprovalRepository) GetByGate(ctx context.Context, gate domain.ApprovalGate) ([]*domain.IssueApproval, error) {
	if !gate.IsValid() {
		return nil, fmt.Errorf("invalid approval gate: %s", gate)
	}

	query := `
		SELECT
			ia.id, ia.issue_id, ia.gate, ia.approved_by, ia.approved_at, ia.notes,
			COALESCE(u.name, '') as approver_name,
			COALESCE(u.email, '') as approver_email
		FROM issue_approvals ia
		LEFT JOIN users u ON ia.approved_by = u.id
		WHERE ia.gate = $1
		ORDER BY ia.approved_at DESC
	`

	rows, err := r.db.Pool.Query(ctx, query, gate)
	if err != nil {
		return nil, fmt.Errorf("failed to get approvals by gate: %w", err)
	}
	defer rows.Close()

	approvals := make([]*domain.IssueApproval, 0)
	for rows.Next() {
		approval, err := r.scanApprovalFromRows(rows)
		if err != nil {
			return nil, fmt.Errorf("failed to scan approval: %w", err)
		}
		approvals = append(approvals, approval)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating approvals: %w", err)
	}

	return approvals, nil
}

// Delete deletes an approval by ID
func (r *issueApprovalRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("approval ID cannot be nil")
	}

	query := `DELETE FROM issue_approvals WHERE id = $1`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete approval: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("approval not found")
	}

	return nil
}

// DeleteByIssueID deletes all approvals for an issue
func (r *issueApprovalRepository) DeleteByIssueID(ctx context.Context, issueID uuid.UUID) error {
	if issueID == uuid.Nil {
		return fmt.Errorf("issue ID cannot be nil")
	}

	query := `DELETE FROM issue_approvals WHERE issue_id = $1`

	_, err := r.db.Pool.Exec(ctx, query, issueID)
	if err != nil {
		return fmt.Errorf("failed to delete issue approvals: %w", err)
	}

	return nil
}

// GetLatestByIssueAndGate retrieves the latest approval for a specific issue and gate
func (r *issueApprovalRepository) GetLatestByIssueAndGate(ctx context.Context, issueID uuid.UUID, gate domain.ApprovalGate) (*domain.IssueApproval, error) {
	if issueID == uuid.Nil {
		return nil, fmt.Errorf("issue ID cannot be nil")
	}
	if !gate.IsValid() {
		return nil, fmt.Errorf("invalid approval gate: %s", gate)
	}

	query := `
		SELECT
			ia.id, ia.issue_id, ia.gate, ia.approved_by, ia.approved_at, ia.notes,
			COALESCE(u.name, '') as approver_name,
			COALESCE(u.email, '') as approver_email
		FROM issue_approvals ia
		LEFT JOIN users u ON ia.approved_by = u.id
		WHERE ia.issue_id = $1 AND ia.gate = $2
	`

	row := r.db.Pool.QueryRow(ctx, query, issueID, gate)

	approval := &domain.IssueApproval{}
	err := row.Scan(
		&approval.ID,
		&approval.IssueID,
		&approval.Gate,
		&approval.ApprovedBy,
		&approval.ApprovedAt,
		&approval.Notes,
		&approval.ApproverName,
		&approval.ApproverEmail,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil // Not an error, just no approval yet
	}

	if err != nil {
		return nil, fmt.Errorf("failed to get approval: %w", err)
	}

	return approval, nil
}

// Helper methods

func (r *issueApprovalRepository) scanApprovalFromRows(rows pgx.Rows) (*domain.IssueApproval, error) {
	approval := &domain.IssueApproval{}

	err := rows.Scan(
		&approval.ID,
		&approval.IssueID,
		&approval.Gate,
		&approval.ApprovedBy,
		&approval.ApprovedAt,
		&approval.Notes,
		&approval.ApproverName,
		&approval.ApproverEmail,
	)

	if err != nil {
		return nil, err
	}

	return approval, nil
}
