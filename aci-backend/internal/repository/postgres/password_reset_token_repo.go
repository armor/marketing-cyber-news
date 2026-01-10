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

// PasswordResetTokenRepository implements repository.PasswordResetTokenRepository for PostgreSQL
type PasswordResetTokenRepository struct {
	db *DB
}

// NewPasswordResetTokenRepository creates a new PostgreSQL password reset token repository
func NewPasswordResetTokenRepository(db *DB) *PasswordResetTokenRepository {
	if db == nil {
		panic("database cannot be nil")
	}
	return &PasswordResetTokenRepository{db: db}
}

// Create inserts a new password reset token into the database
func (r *PasswordResetTokenRepository) Create(ctx context.Context, token *domain.PasswordResetToken) error {
	if token == nil {
		return fmt.Errorf("token cannot be nil")
	}

	if err := token.Validate(); err != nil {
		return fmt.Errorf("invalid token: %w", err)
	}

	// Delete any existing unused tokens for this user first
	if err := r.DeleteForUser(ctx, token.UserID); err != nil {
		return fmt.Errorf("failed to delete existing tokens: %w", err)
	}

	query := `
		INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`

	_, err := r.db.Pool.Exec(
		ctx,
		query,
		token.ID,
		token.UserID,
		token.TokenHash,
		token.ExpiresAt,
		token.UsedAt,
		token.CreatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create password reset token: %w", err)
	}

	return nil
}

// GetByToken retrieves a valid password reset token by its token hash
func (r *PasswordResetTokenRepository) GetByToken(ctx context.Context, tokenHash string) (*domain.PasswordResetToken, error) {
	if tokenHash == "" {
		return nil, fmt.Errorf("token hash cannot be empty")
	}

	query := `
		SELECT id, user_id, token_hash, expires_at, used_at, created_at
		FROM password_reset_tokens
		WHERE token_hash = $1
		  AND expires_at > NOW()
		  AND used_at IS NULL
	`

	var token domain.PasswordResetToken
	err := r.db.Pool.QueryRow(ctx, query, tokenHash).Scan(
		&token.ID,
		&token.UserID,
		&token.TokenHash,
		&token.ExpiresAt,
		&token.UsedAt,
		&token.CreatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, &domainerrors.NotFoundError{
				Resource: "password_reset_token",
				ID:       "token",
			}
		}
		return nil, fmt.Errorf("failed to get password reset token: %w", err)
	}

	return &token, nil
}

// GetByUserID retrieves the most recent valid password reset token for a user
func (r *PasswordResetTokenRepository) GetByUserID(ctx context.Context, userID uuid.UUID) (*domain.PasswordResetToken, error) {
	if userID == uuid.Nil {
		return nil, fmt.Errorf("user ID cannot be nil")
	}

	query := `
		SELECT id, user_id, token_hash, expires_at, used_at, created_at
		FROM password_reset_tokens
		WHERE user_id = $1
		  AND expires_at > NOW()
		  AND used_at IS NULL
		ORDER BY created_at DESC
		LIMIT 1
	`

	var token domain.PasswordResetToken
	err := r.db.Pool.QueryRow(ctx, query, userID).Scan(
		&token.ID,
		&token.UserID,
		&token.TokenHash,
		&token.ExpiresAt,
		&token.UsedAt,
		&token.CreatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, &domainerrors.NotFoundError{
				Resource: "password_reset_token",
				ID:       userID.String(),
			}
		}
		return nil, fmt.Errorf("failed to get password reset token by user: %w", err)
	}

	return &token, nil
}

// MarkUsed marks a password reset token as used
func (r *PasswordResetTokenRepository) MarkUsed(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("token ID cannot be nil")
	}

	now := time.Now()
	query := `
		UPDATE password_reset_tokens
		SET used_at = $2
		WHERE id = $1 AND used_at IS NULL
	`

	result, err := r.db.Pool.Exec(ctx, query, id, now)
	if err != nil {
		return fmt.Errorf("failed to mark token as used: %w", err)
	}

	if result.RowsAffected() == 0 {
		return &domainerrors.NotFoundError{
			Resource: "password_reset_token",
			ID:       id.String(),
		}
	}

	return nil
}

// DeleteForUser removes all password reset tokens for a user
func (r *PasswordResetTokenRepository) DeleteForUser(ctx context.Context, userID uuid.UUID) error {
	if userID == uuid.Nil {
		return fmt.Errorf("user ID cannot be nil")
	}

	query := `DELETE FROM password_reset_tokens WHERE user_id = $1`

	_, err := r.db.Pool.Exec(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to delete password reset tokens for user: %w", err)
	}

	return nil
}

// DeleteExpired removes expired and unused tokens
func (r *PasswordResetTokenRepository) DeleteExpired(ctx context.Context) (int, error) {
	query := `
		DELETE FROM password_reset_tokens
		WHERE expires_at < NOW()
		  AND used_at IS NULL
	`

	result, err := r.db.Pool.Exec(ctx, query)
	if err != nil {
		return 0, fmt.Errorf("failed to delete expired tokens: %w", err)
	}

	return int(result.RowsAffected()), nil
}
