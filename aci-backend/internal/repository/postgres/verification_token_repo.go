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

// VerificationTokenRepository implements repository.VerificationTokenRepository for PostgreSQL
type VerificationTokenRepository struct {
	db *DB
}

// NewVerificationTokenRepository creates a new PostgreSQL verification token repository
func NewVerificationTokenRepository(db *DB) *VerificationTokenRepository {
	if db == nil {
		panic("database cannot be nil")
	}
	return &VerificationTokenRepository{db: db}
}

// Create inserts a new verification token into the database
func (r *VerificationTokenRepository) Create(ctx context.Context, token *domain.EmailVerificationToken) error {
	if token == nil {
		return fmt.Errorf("token cannot be nil")
	}

	if err := token.Validate(); err != nil {
		return fmt.Errorf("invalid token: %w", err)
	}

	query := `
		INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at, verified_at, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`

	_, err := r.db.Pool.Exec(
		ctx,
		query,
		token.ID,
		token.UserID,
		token.TokenHash,
		token.ExpiresAt,
		token.VerifiedAt,
		token.CreatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create verification token: %w", err)
	}

	return nil
}

// GetByToken retrieves a valid verification token by its token hash
func (r *VerificationTokenRepository) GetByToken(ctx context.Context, tokenHash string) (*domain.EmailVerificationToken, error) {
	if tokenHash == "" {
		return nil, fmt.Errorf("token hash cannot be empty")
	}

	query := `
		SELECT id, user_id, token_hash, expires_at, verified_at, created_at
		FROM email_verification_tokens
		WHERE token_hash = $1
		  AND expires_at > NOW()
		  AND verified_at IS NULL
	`

	var token domain.EmailVerificationToken
	err := r.db.Pool.QueryRow(ctx, query, tokenHash).Scan(
		&token.ID,
		&token.UserID,
		&token.TokenHash,
		&token.ExpiresAt,
		&token.VerifiedAt,
		&token.CreatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, &domainerrors.NotFoundError{
				Resource: "verification_token",
				ID:       "token",
			}
		}
		return nil, fmt.Errorf("failed to get verification token: %w", err)
	}

	return &token, nil
}

// GetByUserID retrieves the most recent valid verification token for a user
func (r *VerificationTokenRepository) GetByUserID(ctx context.Context, userID uuid.UUID) (*domain.EmailVerificationToken, error) {
	if userID == uuid.Nil {
		return nil, fmt.Errorf("user ID cannot be nil")
	}

	query := `
		SELECT id, user_id, token_hash, expires_at, verified_at, created_at
		FROM email_verification_tokens
		WHERE user_id = $1
		  AND expires_at > NOW()
		  AND verified_at IS NULL
		ORDER BY created_at DESC
		LIMIT 1
	`

	var token domain.EmailVerificationToken
	err := r.db.Pool.QueryRow(ctx, query, userID).Scan(
		&token.ID,
		&token.UserID,
		&token.TokenHash,
		&token.ExpiresAt,
		&token.VerifiedAt,
		&token.CreatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, &domainerrors.NotFoundError{
				Resource: "verification_token",
				ID:       userID.String(),
			}
		}
		return nil, fmt.Errorf("failed to get verification token by user: %w", err)
	}

	return &token, nil
}

// MarkVerified marks a verification token as verified
func (r *VerificationTokenRepository) MarkVerified(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("token ID cannot be nil")
	}

	now := time.Now()
	query := `
		UPDATE email_verification_tokens
		SET verified_at = $2
		WHERE id = $1 AND verified_at IS NULL
	`

	result, err := r.db.Pool.Exec(ctx, query, id, now)
	if err != nil {
		return fmt.Errorf("failed to mark token as verified: %w", err)
	}

	if result.RowsAffected() == 0 {
		return &domainerrors.NotFoundError{
			Resource: "verification_token",
			ID:       id.String(),
		}
	}

	return nil
}

// DeleteForUser removes all verification tokens for a user
func (r *VerificationTokenRepository) DeleteForUser(ctx context.Context, userID uuid.UUID) error {
	if userID == uuid.Nil {
		return fmt.Errorf("user ID cannot be nil")
	}

	query := `DELETE FROM email_verification_tokens WHERE user_id = $1`

	_, err := r.db.Pool.Exec(ctx, query, userID)
	if err != nil {
		return fmt.Errorf("failed to delete verification tokens for user: %w", err)
	}

	return nil
}

// DeleteExpired removes expired and unverified tokens
func (r *VerificationTokenRepository) DeleteExpired(ctx context.Context) (int, error) {
	query := `
		DELETE FROM email_verification_tokens
		WHERE expires_at < NOW()
		  AND verified_at IS NULL
	`

	result, err := r.db.Pool.Exec(ctx, query)
	if err != nil {
		return 0, fmt.Errorf("failed to delete expired tokens: %w", err)
	}

	return int(result.RowsAffected()), nil
}
