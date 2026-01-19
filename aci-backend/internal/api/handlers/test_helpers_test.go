package handlers

import (
	"context"

	"github.com/google/uuid"
	"github.com/phillipboles/aci-backend/internal/api/middleware"
	"github.com/phillipboles/aci-backend/internal/domain"
)

// createTestContextWithUser creates a context with JWT claims for testing
func createTestContextWithUser(userID uuid.UUID, role domain.UserRole) context.Context {
	ctx := context.Background()
	ctx = middleware.ContextWithClaims(ctx, userID, "test@example.com", string(role))
	ctx = context.WithValue(ctx, "request_id", uuid.New().String())
	return ctx
}

// createTestContextWithUserAdmin creates a context with admin JWT claims for testing
func createTestContextWithUserAdmin(userID uuid.UUID) context.Context {
	ctx := context.Background()
	return middleware.ContextWithClaims(ctx, userID, "test@example.com", "admin")
}
