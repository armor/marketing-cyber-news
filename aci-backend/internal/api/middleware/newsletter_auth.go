package middleware

import (
	"fmt"
	"net/http"

	"github.com/rs/zerolog/log"

	"github.com/phillipboles/aci-backend/internal/api/response"
	"github.com/phillipboles/aci-backend/internal/domain"
)

// RequireNewsletterApprovalAccess validates user has permission to approve newsletters
// SEC-CRIT-003: Implements role-based authorization for newsletter approval
func RequireNewsletterApprovalAccess(tier domain.ApprovalTier) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			requestID := getRequestID(ctx)

			// Get user from context
			user, err := GetDomainUserFromContext(ctx)
			if err != nil {
				log.Warn().
					Err(err).
					Str("request_id", requestID).
					Msg("Failed to get user for newsletter approval authorization")
				response.Unauthorized(w, "Authentication required")
				return
			}

			// Check if user role has approval permission for the tier
			if !hasApprovalPermission(user.Role, tier) {
				log.Warn().
					Str("request_id", requestID).
					Str("user_id", user.ID.String()).
					Str("user_role", string(user.Role)).
					Str("required_tier", string(tier)).
					Msg("User lacks permission to approve newsletter at this tier")
				response.Forbidden(w, fmt.Sprintf("Insufficient permissions to approve %s tier newsletters", tier))
				return
			}

			log.Debug().
				Str("request_id", requestID).
				Str("user_id", user.ID.String()).
				Str("user_role", string(user.Role)).
				Str("tier", string(tier)).
				Msg("Newsletter approval authorization granted")

			next.ServeHTTP(w, r)
		})
	}
}

// RequireNewsletterManagementAccess validates user can manage newsletter configurations
// SEC-CRIT-003: Implements authorization for newsletter config management
func RequireNewsletterManagementAccess() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			requestID := getRequestID(ctx)

			// Get user from context
			user, err := GetDomainUserFromContext(ctx)
			if err != nil {
				log.Warn().
					Err(err).
					Str("request_id", requestID).
					Msg("Failed to get user for newsletter management authorization")
				response.Unauthorized(w, "Authentication required")
				return
			}

			// Only marketing, branding, admin, super_admin can manage newsletters
			allowedRoles := []domain.UserRole{
				domain.RoleMarketing,
				domain.RoleBranding,
				domain.RoleAdmin,
				domain.RoleSuperAdmin,
			}

			hasPermission := false
			for _, role := range allowedRoles {
				if user.Role == role {
					hasPermission = true
					break
				}
			}

			if !hasPermission {
				log.Warn().
					Str("request_id", requestID).
					Str("user_id", user.ID.String()).
					Str("user_role", string(user.Role)).
					Msg("User lacks permission to manage newsletters")
				response.Forbidden(w, "Insufficient permissions to manage newsletters")
				return
			}

			log.Debug().
				Str("request_id", requestID).
				Str("user_id", user.ID.String()).
				Str("user_role", string(user.Role)).
				Msg("Newsletter management authorization granted")

			next.ServeHTTP(w, r)
		})
	}
}

// hasApprovalPermission checks if a user role can approve newsletters at a given tier
func hasApprovalPermission(role domain.UserRole, tier domain.ApprovalTier) bool {
	// Tier-based approval permissions
	switch tier {
	case domain.ApprovalTierNone:
		// Anyone authenticated can approve tier-none (auto-approved)
		return true

	case domain.ApprovalTier1:
		// Tier 1: Marketing, Branding, CISO, Admin, Super Admin
		allowedRoles := []domain.UserRole{
			domain.RoleMarketing,
			domain.RoleBranding,
			domain.RoleCISO,
			domain.RoleAdmin,
			domain.RoleSuperAdmin,
		}
		return containsRole(allowedRoles, role)

	case domain.ApprovalTier2:
		// Tier 2: Branding, CISO, Admin, Super Admin (more restrictive)
		allowedRoles := []domain.UserRole{
			domain.RoleBranding,
			domain.RoleCISO,
			domain.RoleAdmin,
			domain.RoleSuperAdmin,
		}
		return containsRole(allowedRoles, role)

	case domain.ApprovalTier3:
		// Tier 3: CISO, Admin, Super Admin (most restrictive)
		allowedRoles := []domain.UserRole{
			domain.RoleCISO,
			domain.RoleAdmin,
			domain.RoleSuperAdmin,
		}
		return containsRole(allowedRoles, role)

	default:
		// Unknown tier - deny by default
		return false
	}
}

// containsRole checks if a role is in the list of allowed roles
func containsRole(allowedRoles []domain.UserRole, role domain.UserRole) bool {
	for _, allowed := range allowedRoles {
		if allowed == role {
			return true
		}
	}
	return false
}

