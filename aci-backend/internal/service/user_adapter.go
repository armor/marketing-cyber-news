package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/phillipboles/aci-backend/internal/domain/entities"
)

// UserRepoInterface defines what we need from user repository
// This works around the mismatch between repository.UserRepository (uses domain.User)
// and the actual postgres implementation (uses entities.User)
type UserRepoInterface interface {
	Create(ctx context.Context, user *entities.User) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.User, error)
	GetByEmail(ctx context.Context, email string) (*entities.User, error)
	Update(ctx context.Context, user *entities.User) error
	UpdateLastLogin(ctx context.Context, id uuid.UUID) error
	UpdatePassword(ctx context.Context, id uuid.UUID, passwordHash string) error
	UpdateStatus(ctx context.Context, id uuid.UUID, status entities.UserStatus) error
	UpdateLockout(ctx context.Context, id uuid.UUID, lockedUntil *time.Time, failedCount int) error
	List(ctx context.Context, search string, role *entities.UserRole, status *entities.UserStatus, limit, offset int) ([]*entities.User, int, error)
	Delete(ctx context.Context, id uuid.UUID) error
	CountByRole(ctx context.Context, role entities.UserRole) (int, error)
	SetForcePasswordChange(ctx context.Context, id uuid.UUID, force bool) error
}
