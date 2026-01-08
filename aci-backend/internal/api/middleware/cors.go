package middleware

import (
	"fmt"
	"net/http"
	"os"
	"strings"
)

// CORSConfig holds CORS configuration options
type CORSConfig struct {
	AllowedOrigins   []string
	AllowedMethods   []string
	AllowedHeaders   []string
	ExposedHeaders   []string
	MaxAge           int
	AllowCredentials bool
}

// DefaultCORSConfig returns the default CORS configuration for development
// SEC-002: Uses localhost origins only - NOT for production use
// WARNING: Do not use this in production. Use ProductionCORSConfig() instead.
func DefaultCORSConfig() CORSConfig {
	return CORSConfig{
		// SEC-002: Use specific localhost origins instead of wildcard
		// to allow credentials while maintaining security
		AllowedOrigins: []string{
			"http://localhost:5173",
			"http://localhost:3000",
			"http://127.0.0.1:5173",
			"http://127.0.0.1:3000",
		},
		AllowedMethods: []string{
			http.MethodGet,
			http.MethodPost,
			http.MethodPut,
			http.MethodPatch,
			http.MethodDelete,
			http.MethodOptions,
		},
		AllowedHeaders: []string{
			"Authorization",
			"Content-Type",
			"X-Request-ID",
		},
		ExposedHeaders: []string{
			"X-Request-ID",
		},
		MaxAge:           300,
		AllowCredentials: true,
	}
}

// ProductionCORSConfig returns a secure CORS configuration using environment variables
// SEC-002: Reads CORS_ALLOWED_ORIGINS from environment, falls back to development defaults
func ProductionCORSConfig() CORSConfig {
	// Support both CORS_ALLOWED_ORIGINS (preferred) and ALLOWED_ORIGINS (legacy)
	allowedOrigins := os.Getenv("CORS_ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		allowedOrigins = os.Getenv("ALLOWED_ORIGINS")
	}
	var origins []string

	if allowedOrigins == "" {
		// Development fallback - only allow localhost
		origins = []string{
			"http://localhost:5173",
			"http://localhost:3000",
			"http://127.0.0.1:5173",
			"http://127.0.0.1:3000",
		}
	} else {
		// Parse comma-separated origins from environment
		for _, origin := range strings.Split(allowedOrigins, ",") {
			trimmed := strings.TrimSpace(origin)
			if trimmed != "" {
				origins = append(origins, trimmed)
			}
		}
	}

	// Validate that we don't have wildcard with credentials
	hasWildcard := false
	for _, origin := range origins {
		if origin == "*" {
			hasWildcard = true
			break
		}
	}

	return CORSConfig{
		AllowedOrigins: origins,
		AllowedMethods: []string{
			http.MethodGet,
			http.MethodPost,
			http.MethodPut,
			http.MethodPatch,
			http.MethodDelete,
			http.MethodOptions,
		},
		AllowedHeaders: []string{
			"Authorization",
			"Content-Type",
			"X-Request-ID",
		},
		ExposedHeaders: []string{
			"X-Request-ID",
		},
		MaxAge: 300,
		// SEC-002: Only allow credentials when not using wildcard origin
		AllowCredentials: !hasWildcard,
	}
}

// CORS is a middleware that handles Cross-Origin Resource Sharing
// Deprecated: Use CORSWithEnv for production deployments
func CORS(next http.Handler) http.Handler {
	return CORSWithConfig(DefaultCORSConfig())(next)
}

// CORSWithEnv returns a CORS middleware configured from environment variables
// SEC-002: Use this for production deployments to ensure proper origin restrictions
func CORSWithEnv() func(http.Handler) http.Handler {
	return CORSWithConfig(ProductionCORSConfig())
}

// CORSWithConfig returns a CORS middleware with custom configuration
func CORSWithConfig(config CORSConfig) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")

			// Check if origin is allowed
			if origin != "" && isOriginAllowed(origin, config.AllowedOrigins) {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			} else if len(config.AllowedOrigins) == 1 && config.AllowedOrigins[0] == "*" {
				w.Header().Set("Access-Control-Allow-Origin", "*")
			}

			// Set other CORS headers
			if len(config.AllowedMethods) > 0 {
				w.Header().Set("Access-Control-Allow-Methods", strings.Join(config.AllowedMethods, ", "))
			}

			if len(config.AllowedHeaders) > 0 {
				w.Header().Set("Access-Control-Allow-Headers", strings.Join(config.AllowedHeaders, ", "))
			}

			if len(config.ExposedHeaders) > 0 {
				w.Header().Set("Access-Control-Expose-Headers", strings.Join(config.ExposedHeaders, ", "))
			}

			if config.AllowCredentials {
				w.Header().Set("Access-Control-Allow-Credentials", "true")
			}

			if config.MaxAge > 0 {
				w.Header().Set("Access-Control-Max-Age", fmt.Sprintf("%d", config.MaxAge))
			}

			// Handle preflight request
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// isOriginAllowed checks if the origin is in the allowed origins list
func isOriginAllowed(origin string, allowedOrigins []string) bool {
	for _, allowed := range allowedOrigins {
		if allowed == "*" || allowed == origin {
			return true
		}
	}
	return false
}
