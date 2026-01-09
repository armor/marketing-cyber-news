package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/phillipboles/aci-backend/internal/domain"
	domainerrors "github.com/phillipboles/aci-backend/internal/domain/errors"
)

// InvitationRepository implements repository.InvitationRepository for PostgreSQL
type InvitationRepository struct {
	db *DB
}

// NewInvitationRepository creates a new PostgreSQL invitation repository
func NewInvitationRepository(db *DB) *InvitationRepository {
	if db == nil {
		panic("database cannot be nil")
	}
	return &InvitationRepository{db: db}
}

// Create inserts a new invitation into the database
func (r *InvitationRepository) Create(ctx context.Context, invitation *domain.UserInvitation) error {
	if invitation == nil {
		return fmt.Errorf("invitation cannot be nil")
	}

	if err := invitation.Validate(); err != nil {
		return fmt.Errorf("invalid invitation: %w", err)
	}

	query := `
		INSERT INTO user_invitations (id, email, invited_by, role, token_hash, expires_at, accepted_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`

	_, err := r.db.Pool.Exec(
		ctx,
		query,
		invitation.ID,
		invitation.Email,
		invitation.InvitedBy,
		invitation.Role,
		invitation.TokenHash,
		invitation.ExpiresAt,
		invitation.AcceptedAt,
		invitation.CreatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create invitation: %w", err)
	}

	return nil
}

// GetByID retrieves an invitation by its ID
func (r *InvitationRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.UserInvitation, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("invitation ID cannot be nil")
	}

	query := `
		SELECT i.id, i.email, i.invited_by, i.role, i.token_hash, i.expires_at, i.accepted_at, i.created_at,
		       COALESCE(u.name, '') as invited_by_name
		FROM user_invitations i
		LEFT JOIN users u ON i.invited_by = u.id
		WHERE i.id = $1
	`

	var invitation domain.UserInvitation
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&invitation.ID,
		&invitation.Email,
		&invitation.InvitedBy,
		&invitation.Role,
		&invitation.TokenHash,
		&invitation.ExpiresAt,
		&invitation.AcceptedAt,
		&invitation.CreatedAt,
		&invitation.InvitedByName,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, &domainerrors.NotFoundError{
				Resource: "invitation",
				ID:       id.String(),
			}
		}
		return nil, fmt.Errorf("failed to get invitation by ID: %w", err)
	}

	return &invitation, nil
}

// GetByToken retrieves a valid invitation by its token hash
func (r *InvitationRepository) GetByToken(ctx context.Context, tokenHash string) (*domain.UserInvitation, error) {
	if tokenHash == "" {
		return nil, fmt.Errorf("token hash cannot be empty")
	}

	query := `
		SELECT i.id, i.email, i.invited_by, i.role, i.token_hash, i.expires_at, i.accepted_at, i.created_at,
		       COALESCE(u.name, '') as invited_by_name
		FROM user_invitations i
		LEFT JOIN users u ON i.invited_by = u.id
		WHERE i.token_hash = $1
		  AND i.expires_at > NOW()
		  AND i.accepted_at IS NULL
	`

	var invitation domain.UserInvitation
	err := r.db.Pool.QueryRow(ctx, query, tokenHash).Scan(
		&invitation.ID,
		&invitation.Email,
		&invitation.InvitedBy,
		&invitation.Role,
		&invitation.TokenHash,
		&invitation.ExpiresAt,
		&invitation.AcceptedAt,
		&invitation.CreatedAt,
		&invitation.InvitedByName,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, &domainerrors.NotFoundError{
				Resource: "invitation",
				ID:       "token",
			}
		}
		return nil, fmt.Errorf("failed to get invitation by token: %w", err)
	}

	return &invitation, nil
}

// GetByEmail retrieves a pending invitation by email
func (r *InvitationRepository) GetByEmail(ctx context.Context, email string) (*domain.UserInvitation, error) {
	if email == "" {
		return nil, fmt.Errorf("email cannot be empty")
	}

	query := `
		SELECT i.id, i.email, i.invited_by, i.role, i.token_hash, i.expires_at, i.accepted_at, i.created_at,
		       COALESCE(u.name, '') as invited_by_name
		FROM user_invitations i
		LEFT JOIN users u ON i.invited_by = u.id
		WHERE i.email = $1
		  AND i.expires_at > NOW()
		  AND i.accepted_at IS NULL
		ORDER BY i.created_at DESC
		LIMIT 1
	`

	var invitation domain.UserInvitation
	err := r.db.Pool.QueryRow(ctx, query, email).Scan(
		&invitation.ID,
		&invitation.Email,
		&invitation.InvitedBy,
		&invitation.Role,
		&invitation.TokenHash,
		&invitation.ExpiresAt,
		&invitation.AcceptedAt,
		&invitation.CreatedAt,
		&invitation.InvitedByName,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, &domainerrors.NotFoundError{
				Resource: "invitation",
				ID:       email,
			}
		}
		return nil, fmt.Errorf("failed to get invitation by email: %w", err)
	}

	return &invitation, nil
}

// MarkAccepted marks an invitation as accepted
func (r *InvitationRepository) MarkAccepted(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("invitation ID cannot be nil")
	}

	now := time.Now()
	query := `
		UPDATE user_invitations
		SET accepted_at = $2
		WHERE id = $1 AND accepted_at IS NULL
	`

	result, err := r.db.Pool.Exec(ctx, query, id, now)
	if err != nil {
		return fmt.Errorf("failed to mark invitation as accepted: %w", err)
	}

	if result.RowsAffected() == 0 {
		return &domainerrors.NotFoundError{
			Resource: "invitation",
			ID:       id.String(),
		}
	}

	return nil
}

// DeleteExpired removes expired and unaccepted invitations
func (r *InvitationRepository) DeleteExpired(ctx context.Context) (int, error) {
	query := `
		DELETE FROM user_invitations
		WHERE expires_at < NOW()
		  AND accepted_at IS NULL
	`

	result, err := r.db.Pool.Exec(ctx, query)
	if err != nil {
		return 0, fmt.Errorf("failed to delete expired invitations: %w", err)
	}

	return int(result.RowsAffected()), nil
}

// List retrieves all invitations with pagination
func (r *InvitationRepository) List(ctx context.Context, limit, offset int) ([]*domain.UserInvitation, int, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	// Count total
	countQuery := `SELECT COUNT(*) FROM user_invitations`
	var total int
	if err := r.db.Pool.QueryRow(ctx, countQuery).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count invitations: %w", err)
	}

	// Get data
	query := `
		SELECT i.id, i.email, i.invited_by, i.role, i.token_hash, i.expires_at, i.accepted_at, i.created_at,
		       COALESCE(u.name, '') as invited_by_name
		FROM user_invitations i
		LEFT JOIN users u ON i.invited_by = u.id
		ORDER BY i.created_at DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := r.db.Pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list invitations: %w", err)
	}
	defer rows.Close()

	var invitations []*domain.UserInvitation
	for rows.Next() {
		var inv domain.UserInvitation
		if err := rows.Scan(
			&inv.ID,
			&inv.Email,
			&inv.InvitedBy,
			&inv.Role,
			&inv.TokenHash,
			&inv.ExpiresAt,
			&inv.AcceptedAt,
			&inv.CreatedAt,
			&inv.InvitedByName,
		); err != nil {
			return nil, 0, fmt.Errorf("failed to scan invitation: %w", err)
		}
		invitations = append(invitations, &inv)
	}

	return invitations, total, nil
}

// ListPending retrieves pending (not accepted, not expired) invitations
func (r *InvitationRepository) ListPending(ctx context.Context, limit, offset int) ([]*domain.UserInvitation, int, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	// Count pending
	countQuery := `
		SELECT COUNT(*) FROM user_invitations
		WHERE accepted_at IS NULL AND expires_at > NOW()
	`
	var total int
	if err := r.db.Pool.QueryRow(ctx, countQuery).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count pending invitations: %w", err)
	}

	// Get data
	query := `
		SELECT i.id, i.email, i.invited_by, i.role, i.token_hash, i.expires_at, i.accepted_at, i.created_at,
		       COALESCE(u.name, '') as invited_by_name
		FROM user_invitations i
		LEFT JOIN users u ON i.invited_by = u.id
		WHERE i.accepted_at IS NULL AND i.expires_at > NOW()
		ORDER BY i.created_at DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := r.db.Pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list pending invitations: %w", err)
	}
	defer rows.Close()

	var invitations []*domain.UserInvitation
	for rows.Next() {
		var inv domain.UserInvitation
		if err := rows.Scan(
			&inv.ID,
			&inv.Email,
			&inv.InvitedBy,
			&inv.Role,
			&inv.TokenHash,
			&inv.ExpiresAt,
			&inv.AcceptedAt,
			&inv.CreatedAt,
			&inv.InvitedByName,
		); err != nil {
			return nil, 0, fmt.Errorf("failed to scan invitation: %w", err)
		}
		invitations = append(invitations, &inv)
	}

	return invitations, total, nil
}

// Delete removes an invitation by ID
func (r *InvitationRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("invitation ID cannot be nil")
	}

	query := `DELETE FROM user_invitations WHERE id = $1`

	result, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete invitation: %w", err)
	}

	if result.RowsAffected() == 0 {
		return &domainerrors.NotFoundError{
			Resource: "invitation",
			ID:       id.String(),
		}
	}

	return nil
}
