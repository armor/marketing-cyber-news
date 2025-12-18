package middleware

import (
	"context"
	"fmt"
	"net/http"

	"github.com/google/uuid"
	"github.com/phillipboles/aci-backend/internal/api/response"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/rs/zerolog/log"
)

// GetDomainUserFromContext retrieves user information as domain.User from context
func GetDomainUserFromContext(ctx context.Context) (*domain.User, error) {
	claims, ok := GetUserFromContext(ctx)
	if !ok {
		return nil, fmt.Errorf("user claims not found in context")
	}

	if claims == nil {
		return nil, fmt.Errorf("user claims are nil")
	}

	// Build domain user from JWT claims
	user := &domain.User{
		ID:    claims.UserID,
		Email: claims.Email,
		Role:  domain.UserRole(claims.Role),
	}

	return user, nil
}

// GetUserRoleFromContext retrieves user role from context
func GetUserRoleFromContext(ctx context.Context) (domain.UserRole, error) {
	user, err := GetDomainUserFromContext(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get user from context: %w", err)
	}

	if user.Role == "" {
		return "", fmt.Errorf("user role is empty")
	}

	return user.Role, nil
}

// GetUserIDFromContext retrieves user ID from context
func GetUserIDFromContext(ctx context.Context) (uuid.UUID, error) {
	user, err := GetDomainUserFromContext(ctx)
	if err != nil {
		return uuid.Nil, fmt.Errorf("failed to get user from context: %w", err)
	}

	if user.ID == uuid.Nil {
		return uuid.Nil, fmt.Errorf("user ID is nil")
	}

	return user.ID, nil
}

// RequireRoles checks if user has one of the allowed roles
func RequireRoles(roles ...domain.UserRole) func(http.Handler) http.Handler {
	if len(roles) == 0 {
		panic("at least one role must be specified")
	}

	// Validate all roles
	for _, role := range roles {
		if err := role.IsValid(); err != nil {
			panic(fmt.Sprintf("invalid role specified: %s", role))
		}
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user, err := GetDomainUserFromContext(r.Context())
			if err != nil {
				log.Warn().
					Err(err).
					Str("path", r.URL.Path).
					Msg("User not found in context")
				response.Unauthorized(w, "Authentication required")
				return
			}

			// Check if user has any of the allowed roles
			hasRole := false
			for _, allowedRole := range roles {
				if user.Role == allowedRole {
					hasRole = true
					break
				}
			}

			if !hasRole {
				log.Warn().
					Str("user_id", user.ID.String()).
					Str("user_role", string(user.Role)).
					Interface("required_roles", roles).
					Str("path", r.URL.Path).
					Msg("Insufficient permissions")
				response.Forbidden(w, "Insufficient permissions for this operation")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RequireApprovalAccess checks if user can access approval queue
// Allows: marketing, branding, soc_level_1, soc_level_3, ciso, admin, super_admin
// Denies: user role
func RequireApprovalAccess() func(http.Handler) http.Handler {
	allowedRoles := []domain.UserRole{
		domain.RoleMarketing,
		domain.RoleBranding,
		domain.RoleSocLevel1,
		domain.RoleSocLevel3,
		domain.RoleCISO,
		domain.RoleAdmin,
		domain.RoleSuperAdmin,
	}

	return RequireRoles(allowedRoles...)
}

// RequireGateAccess checks if user can approve articles at a specific gate
func RequireGateAccess(gate domain.ApprovalGate) func(http.Handler) http.Handler {
	if !gate.IsValid() {
		panic(fmt.Sprintf("invalid approval gate: %s", gate))
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user, err := GetDomainUserFromContext(r.Context())
			if err != nil {
				log.Warn().
					Err(err).
					Str("path", r.URL.Path).
					Msg("User not found in context")
				response.Unauthorized(w, "Authentication required")
				return
			}

			// Check if user's role can approve this gate
			if !user.Role.CanApproveGate(gate) {
				log.Warn().
					Str("user_id", user.ID.String()).
					Str("user_role", string(user.Role)).
					Str("required_gate", string(gate)).
					Str("path", r.URL.Path).
					Msg("Insufficient permissions for gate")
				response.Forbidden(w, "Insufficient permissions for this operation")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RequireReleaseAccess checks if user can release approved articles
// Only CISO, admin, and super_admin can release
func RequireReleaseAccess() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user, err := GetDomainUserFromContext(r.Context())
			if err != nil {
				log.Warn().
					Err(err).
					Str("path", r.URL.Path).
					Msg("User not found in context")
				response.Unauthorized(w, "Authentication required")
				return
			}

			// Check if user can release articles
			if !user.Role.CanRelease() {
				log.Warn().
					Str("user_id", user.ID.String()).
					Str("user_role", string(user.Role)).
					Str("path", r.URL.Path).
					Msg("Insufficient permissions to release articles")
				response.Forbidden(w, "Insufficient permissions for this operation")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RequireAdminAccess checks if user has admin or super_admin role
// Used for role management and article reset
func RequireAdminAccess() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user, err := GetDomainUserFromContext(r.Context())
			if err != nil {
				log.Warn().
					Err(err).
					Str("path", r.URL.Path).
					Msg("User not found in context")
				response.Unauthorized(w, "Authentication required")
				return
			}

			// Check if user is admin or super_admin
			if user.Role != domain.RoleAdmin && user.Role != domain.RoleSuperAdmin {
				log.Warn().
					Str("user_id", user.ID.String()).
					Str("user_role", string(user.Role)).
					Str("path", r.URL.Path).
					Msg("Admin access required")
				response.Forbidden(w, "Insufficient permissions for this operation")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RequireResetAccess checks if user can reset rejected articles
// Only admin and super_admin can reset articles
func RequireResetAccess() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user, err := GetDomainUserFromContext(r.Context())
			if err != nil {
				log.Warn().
					Err(err).
					Str("path", r.URL.Path).
					Msg("User not found in context")
				response.Unauthorized(w, "Authentication required")
				return
			}

			// Check if user can reset articles
			if !user.Role.CanResetArticle() {
				log.Warn().
					Str("user_id", user.ID.String()).
					Str("user_role", string(user.Role)).
					Str("path", r.URL.Path).
					Msg("Insufficient permissions to reset articles")
				response.Forbidden(w, "Insufficient permissions for this operation")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
