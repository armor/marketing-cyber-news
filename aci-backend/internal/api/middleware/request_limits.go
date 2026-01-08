package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/phillipboles/aci-backend/internal/api/response"
)

// RequestBodyLimit limits the size of request bodies to prevent memory exhaustion attacks
// SEC-HIGH-002: Implements request body size limits
func RequestBodyLimit(maxBytes int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Limit request body size
			r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
			next.ServeHTTP(w, r)
		})
	}
}

// RequireJSONContentType validates that requests have correct Content-Type header
// SEC-HIGH-004: Implements Content-Type validation
func RequireJSONContentType(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip GET requests and OPTIONS (preflight)
		if r.Method == http.MethodGet || r.Method == http.MethodOptions {
			next.ServeHTTP(w, r)
			return
		}

		ct := r.Header.Get("Content-Type")
		if ct == "" {
			response.BadRequest(w, "Content-Type header is required")
			return
		}

		// Accept application/json or application/json; charset=utf-8
		if ct != "application/json" && !strings.HasPrefix(ct, "application/json;") {
			response.BadRequest(w, fmt.Sprintf("Content-Type must be application/json, got: %s", ct))
			return
		}

		next.ServeHTTP(w, r)
	})
}

// SecurityHeaders adds security-related HTTP headers
// SEC-MED: Implements security headers
func SecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Prevent MIME type sniffing
		w.Header().Set("X-Content-Type-Options", "nosniff")

		// Prevent clickjacking
		w.Header().Set("X-Frame-Options", "DENY")

		// Enable XSS protection in browsers
		w.Header().Set("X-XSS-Protection", "1; mode=block")

		// Restrict referrer information
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

		// Content Security Policy for API (restrictive)
		w.Header().Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")

		// Enforce HTTPS (if behind proxy)
		w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

		next.ServeHTTP(w, r)
	})
}

// Standard request body limits for different endpoint types
const (
	// BodyLimitWebhook for webhook payloads (100KB)
	BodyLimitWebhook = 100 * 1024

	// BodyLimitSmall for small requests (256KB)
	BodyLimitSmall = 256 * 1024

	// BodyLimitMedium for medium requests (1MB)
	BodyLimitMedium = 1 * 1024 * 1024

	// BodyLimitLarge for large content uploads (5MB)
	BodyLimitLarge = 5 * 1024 * 1024
)
