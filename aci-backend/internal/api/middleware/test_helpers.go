package middleware

import (
	"context"

	"github.com/google/uuid"
	"github.com/phillipboles/aci-backend/internal/pkg/jwt"
)

// ContextWithClaims creates a context with JWT claims for testing.
// This uses the same context key as the Auth middleware.
func ContextWithClaims(ctx context.Context, userID uuid.UUID, email, role string) context.Context {
	claims := &jwt.Claims{
		UserID: userID,
		Email:  email,
		Role:   role,
	}
	return context.WithValue(ctx, userClaimsKey, claims)
}
