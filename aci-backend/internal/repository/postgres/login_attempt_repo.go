package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/phillipboles/aci-backend/internal/domain"
)

// LoginAttemptRepository implements repository.LoginAttemptRepository for PostgreSQL
type LoginAttemptRepository struct {
	db *DB
}

// NewLoginAttemptRepository creates a new PostgreSQL login attempt repository
func NewLoginAttemptRepository(db *DB) *LoginAttemptRepository {
	if db == nil {
		panic("database cannot be nil")
	}
	return &LoginAttemptRepository{db: db}
}

// Create inserts a new login attempt into the database
func (r *LoginAttemptRepository) Create(ctx context.Context, attempt *domain.LoginAttempt) error {
	if attempt == nil {
		return fmt.Errorf("attempt cannot be nil")
	}

	query := `
		INSERT INTO login_attempts (id, email, ip_address, user_agent, success, attempted_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`

	_, err := r.db.Pool.Exec(
		ctx,
		query,
		attempt.ID,
		attempt.Email,
		attempt.IPAddress,
		attempt.UserAgent,
		attempt.Success,
		attempt.AttemptedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create login attempt: %w", err)
	}

	return nil
}

// GetRecentFailures counts failed login attempts for an email since a given time
func (r *LoginAttemptRepository) GetRecentFailures(ctx context.Context, email string, since time.Time) (int, error) {
	if email == "" {
		return 0, fmt.Errorf("email cannot be empty")
	}

	query := `
		SELECT COUNT(*)
		FROM login_attempts
		WHERE email = $1
		  AND success = false
		  AND attempted_at >= $2
	`

	var count int
	err := r.db.Pool.QueryRow(ctx, query, email, since).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count failed attempts: %w", err)
	}

	return count, nil
}

// GetRecentFailuresByIP counts failed login attempts from an IP since a given time
func (r *LoginAttemptRepository) GetRecentFailuresByIP(ctx context.Context, ipAddress string, since time.Time) (int, error) {
	if ipAddress == "" {
		return 0, fmt.Errorf("IP address cannot be empty")
	}

	query := `
		SELECT COUNT(*)
		FROM login_attempts
		WHERE ip_address = $1
		  AND success = false
		  AND attempted_at >= $2
	`

	var count int
	err := r.db.Pool.QueryRow(ctx, query, ipAddress, since).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count failed attempts by IP: %w", err)
	}

	return count, nil
}

// DeleteOld removes login attempts older than the specified time
func (r *LoginAttemptRepository) DeleteOld(ctx context.Context, before time.Time) (int, error) {
	query := `DELETE FROM login_attempts WHERE attempted_at < $1`

	result, err := r.db.Pool.Exec(ctx, query, before)
	if err != nil {
		return 0, fmt.Errorf("failed to delete old attempts: %w", err)
	}

	return int(result.RowsAffected()), nil
}
