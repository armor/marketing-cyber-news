package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/phillipboles/aci-backend/internal/domain/entities"
	domainerrors "github.com/phillipboles/aci-backend/internal/domain/errors"
)

// UserRepository implements repository.UserRepository for PostgreSQL
type UserRepository struct {
	db *DB
}

// NewUserRepository creates a new PostgreSQL user repository
func NewUserRepository(db *DB) *UserRepository {
	if db == nil {
		panic("database cannot be nil")
	}
	return &UserRepository{db: db}
}

// Create inserts a new user into the database
func (r *UserRepository) Create(ctx context.Context, user *entities.User) error {
	if user == nil {
		return fmt.Errorf("user cannot be nil")
	}

	if user.ID == uuid.Nil {
		return fmt.Errorf("user ID cannot be nil")
	}

	if user.Email == "" {
		return fmt.Errorf("user email is required")
	}

	query := `
		INSERT INTO users (id, email, password_hash, name, role, status, subscription_tier, email_verified,
		                   force_password_change, locked_until, failed_login_count, created_at, updated_at, last_login_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
	`

	_, err := r.db.Pool.Exec(
		ctx,
		query,
		user.ID,
		user.Email,
		user.PasswordHash,
		user.Name,
		user.Role,
		user.Status,
		user.SubscriptionTier,
		user.EmailVerified,
		user.ForcePasswordChange,
		user.LockedUntil,
		user.FailedLoginCount,
		user.CreatedAt,
		user.UpdatedAt,
		user.LastLoginAt,
	)

	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) {
			// Unique constraint violation (23505)
			if pgErr.Code == "23505" {
				if pgErr.ConstraintName == "users_email_key" {
					return &domainerrors.ConflictError{
						Resource: "user",
						Field:    "email",
						Value:    user.Email,
					}
				}
				return fmt.Errorf("user already exists: %w", domainerrors.ErrConflict)
			}
		}
		return fmt.Errorf("failed to create user: %w", err)
	}

	return nil
}

// GetByID retrieves a user by their ID
func (r *UserRepository) GetByID(ctx context.Context, id uuid.UUID) (*entities.User, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("user ID cannot be nil")
	}

	query := `
		SELECT id, email, password_hash, name, role, status, subscription_tier, email_verified,
		       force_password_change, locked_until, failed_login_count, created_at, updated_at, last_login_at
		FROM users
		WHERE id = $1
	`

	var user entities.User
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.Name,
		&user.Role,
		&user.Status,
		&user.SubscriptionTier,
		&user.EmailVerified,
		&user.ForcePasswordChange,
		&user.LockedUntil,
		&user.FailedLoginCount,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLoginAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, &domainerrors.NotFoundError{
				Resource: "user",
				ID:       id.String(),
			}
		}
		return nil, fmt.Errorf("failed to get user by ID: %w", err)
	}

	return &user, nil
}

// GetByEmail retrieves a user by their email address
func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*entities.User, error) {
	if email == "" {
		return nil, fmt.Errorf("email cannot be empty")
	}

	query := `
		SELECT id, email, password_hash, name, role, status, subscription_tier, email_verified,
		       force_password_change, locked_until, failed_login_count, created_at, updated_at, last_login_at
		FROM users
		WHERE email = $1
	`

	var user entities.User
	err := r.db.Pool.QueryRow(ctx, query, email).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.Name,
		&user.Role,
		&user.Status,
		&user.SubscriptionTier,
		&user.EmailVerified,
		&user.ForcePasswordChange,
		&user.LockedUntil,
		&user.FailedLoginCount,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLoginAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, &domainerrors.NotFoundError{
				Resource: "user",
				ID:       email,
			}
		}
		return nil, fmt.Errorf("failed to get user by email: %w", err)
	}

	return &user, nil
}

// Update updates an existing user's information
func (r *UserRepository) Update(ctx context.Context, user *entities.User) error {
	if user == nil {
		return fmt.Errorf("user cannot be nil")
	}

	if user.ID == uuid.Nil {
		return fmt.Errorf("user ID cannot be nil")
	}

	user.UpdatedAt = time.Now()

	query := `
		UPDATE users
		SET name = $2, email_verified = $3, updated_at = $4, role = $5, status = $6,
		    force_password_change = $7, locked_until = $8, failed_login_count = $9
		WHERE id = $1
	`

	result, err := r.db.Pool.Exec(
		ctx,
		query,
		user.ID,
		user.Name,
		user.EmailVerified,
		user.UpdatedAt,
		user.Role,
		user.Status,
		user.ForcePasswordChange,
		user.LockedUntil,
		user.FailedLoginCount,
	)

	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	if result.RowsAffected() == 0 {
		return &domainerrors.NotFoundError{
			Resource: "user",
			ID:       user.ID.String(),
		}
	}

	return nil
}

// UpdateLastLogin updates the user's last login timestamp
func (r *UserRepository) UpdateLastLogin(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("user ID cannot be nil")
	}

	now := time.Now()
	query := `
		UPDATE users
		SET last_login_at = $2
		WHERE id = $1
	`

	result, err := r.db.Pool.Exec(ctx, query, id, now)
	if err != nil {
		return fmt.Errorf("failed to update last login: %w", err)
	}

	if result.RowsAffected() == 0 {
		return &domainerrors.NotFoundError{
			Resource: "user",
			ID:       id.String(),
		}
	}

	return nil
}

// Delete removes a user from the database
func (r *UserRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("user ID cannot be nil")
	}

	query := `DELETE FROM users WHERE id = $1`

	result, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}

	if result.RowsAffected() == 0 {
		return &domainerrors.NotFoundError{
			Resource: "user",
			ID:       id.String(),
		}
	}

	return nil
}

// List retrieves users with filtering and pagination
func (r *UserRepository) List(ctx context.Context, search string, role *entities.UserRole, status *entities.UserStatus, limit, offset int) ([]*entities.User, int, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	// Build WHERE clause
	conditions := []string{"1=1"}
	args := []interface{}{}
	argNum := 1

	if search != "" {
		conditions = append(conditions, fmt.Sprintf("(name ILIKE $%d OR email ILIKE $%d)", argNum, argNum))
		args = append(args, "%"+search+"%")
		argNum++
	}

	if role != nil {
		conditions = append(conditions, fmt.Sprintf("role = $%d", argNum))
		args = append(args, *role)
		argNum++
	}

	if status != nil {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argNum))
		args = append(args, *status)
		argNum++
	}

	whereClause := "WHERE " + conditions[0]
	for i := 1; i < len(conditions); i++ {
		whereClause += " AND " + conditions[i]
	}

	// Count query
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM users %s", whereClause)
	var total int
	if err := r.db.Pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count users: %w", err)
	}

	// Data query
	args = append(args, limit, offset)
	query := fmt.Sprintf(`
		SELECT id, email, password_hash, name, role, status, subscription_tier, email_verified,
		       force_password_change, locked_until, failed_login_count, created_at, updated_at, last_login_at
		FROM users
		%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argNum, argNum+1)

	rows, err := r.db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list users: %w", err)
	}
	defer rows.Close()

	var users []*entities.User
	for rows.Next() {
		var user entities.User
		if err := rows.Scan(
			&user.ID,
			&user.Email,
			&user.PasswordHash,
			&user.Name,
			&user.Role,
			&user.Status,
			&user.SubscriptionTier,
			&user.EmailVerified,
			&user.ForcePasswordChange,
			&user.LockedUntil,
			&user.FailedLoginCount,
			&user.CreatedAt,
			&user.UpdatedAt,
			&user.LastLoginAt,
		); err != nil {
			return nil, 0, fmt.Errorf("failed to scan user: %w", err)
		}
		users = append(users, &user)
	}

	return users, total, nil
}

// UpdatePassword updates a user's password hash
func (r *UserRepository) UpdatePassword(ctx context.Context, id uuid.UUID, passwordHash string) error {
	if id == uuid.Nil {
		return fmt.Errorf("user ID cannot be nil")
	}

	if passwordHash == "" {
		return fmt.Errorf("password hash cannot be empty")
	}

	query := `
		UPDATE users
		SET password_hash = $2, updated_at = $3, force_password_change = false
		WHERE id = $1
	`

	result, err := r.db.Pool.Exec(ctx, query, id, passwordHash, time.Now())
	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	if result.RowsAffected() == 0 {
		return &domainerrors.NotFoundError{
			Resource: "user",
			ID:       id.String(),
		}
	}

	return nil
}

// UpdateStatus updates a user's status
func (r *UserRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status entities.UserStatus) error {
	if id == uuid.Nil {
		return fmt.Errorf("user ID cannot be nil")
	}

	query := `
		UPDATE users
		SET status = $2, updated_at = $3
		WHERE id = $1
	`

	result, err := r.db.Pool.Exec(ctx, query, id, status, time.Now())
	if err != nil {
		return fmt.Errorf("failed to update status: %w", err)
	}

	if result.RowsAffected() == 0 {
		return &domainerrors.NotFoundError{
			Resource: "user",
			ID:       id.String(),
		}
	}

	return nil
}

// SetForcePasswordChange sets the force password change flag
func (r *UserRepository) SetForcePasswordChange(ctx context.Context, id uuid.UUID, force bool) error {
	if id == uuid.Nil {
		return fmt.Errorf("user ID cannot be nil")
	}

	query := `
		UPDATE users
		SET force_password_change = $2, updated_at = $3
		WHERE id = $1
	`

	result, err := r.db.Pool.Exec(ctx, query, id, force, time.Now())
	if err != nil {
		return fmt.Errorf("failed to set force password change: %w", err)
	}

	if result.RowsAffected() == 0 {
		return &domainerrors.NotFoundError{
			Resource: "user",
			ID:       id.String(),
		}
	}

	return nil
}

// UpdateLockout updates the lockout status of a user
func (r *UserRepository) UpdateLockout(ctx context.Context, id uuid.UUID, lockedUntil *time.Time, failedCount int) error {
	if id == uuid.Nil {
		return fmt.Errorf("user ID cannot be nil")
	}

	query := `
		UPDATE users
		SET locked_until = $2, failed_login_count = $3, updated_at = $4
		WHERE id = $1
	`

	result, err := r.db.Pool.Exec(ctx, query, id, lockedUntil, failedCount, time.Now())
	if err != nil {
		return fmt.Errorf("failed to update lockout: %w", err)
	}

	if result.RowsAffected() == 0 {
		return &domainerrors.NotFoundError{
			Resource: "user",
			ID:       id.String(),
		}
	}

	return nil
}

// CountByRole counts users with a specific role
func (r *UserRepository) CountByRole(ctx context.Context, role entities.UserRole) (int, error) {
	query := `SELECT COUNT(*) FROM users WHERE role = $1`

	var count int
	if err := r.db.Pool.QueryRow(ctx, query, role).Scan(&count); err != nil {
		return 0, fmt.Errorf("failed to count users by role: %w", err)
	}

	return count, nil
}
