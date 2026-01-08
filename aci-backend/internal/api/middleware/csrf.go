package middleware

import (
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"sync"
	"time"

	"github.com/phillipboles/aci-backend/internal/api/response"
	"github.com/rs/zerolog/log"
)

// CSRFConfig holds CSRF middleware configuration
type CSRFConfig struct {
	TokenLength   int
	TokenLifetime time.Duration
	CookieName    string
	HeaderName    string
	ExemptedPaths []string
	Secure        bool // Set to true for production (HTTPS)
}

// DefaultCSRFConfig returns sensible defaults for CSRF protection
func DefaultCSRFConfig() CSRFConfig {
	return CSRFConfig{
		TokenLength:   32,
		TokenLifetime: 24 * time.Hour,
		CookieName:    "csrf_token",
		HeaderName:    "X-CSRF-Token",
		ExemptedPaths: []string{},
		Secure:        true,
	}
}

// tokenEntry stores token with expiry time
type tokenEntry struct {
	token     string
	expiresAt time.Time
}

// csrfStore manages CSRF tokens with thread-safe access
type csrfStore struct {
	mu     sync.RWMutex
	tokens map[string]tokenEntry
}

func newCSRFStore() *csrfStore {
	store := &csrfStore{
		tokens: make(map[string]tokenEntry),
	}
	// Start cleanup goroutine
	go store.cleanup()
	return store
}

func (s *csrfStore) store(token string, lifetime time.Duration) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.tokens[token] = tokenEntry{
		token:     token,
		expiresAt: time.Now().Add(lifetime),
	}
}

func (s *csrfStore) validate(token string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()

	entry, exists := s.tokens[token]
	if !exists {
		return false
	}

	return time.Now().Before(entry.expiresAt)
}

func (s *csrfStore) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	for range ticker.C {
		s.mu.Lock()
		now := time.Now()
		for token, entry := range s.tokens {
			if now.After(entry.expiresAt) {
				delete(s.tokens, token)
			}
		}
		s.mu.Unlock()
	}
}

// CSRF returns a middleware that protects against Cross-Site Request Forgery
// SEC-CRIT-001: Implements CSRF token validation for state-changing operations
func CSRF(config CSRFConfig) func(http.Handler) http.Handler {
	if config.TokenLength == 0 {
		config.TokenLength = 32
	}
	if config.TokenLifetime == 0 {
		config.TokenLifetime = 24 * time.Hour
	}
	if config.CookieName == "" {
		config.CookieName = "csrf_token"
	}
	if config.HeaderName == "" {
		config.HeaderName = "X-CSRF-Token"
	}

	store := newCSRFStore()

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Check if path is exempted (webhooks, etc.)
			for _, path := range config.ExemptedPaths {
				if r.URL.Path == path {
					next.ServeHTTP(w, r)
					return
				}
			}

			// For GET/HEAD/OPTIONS requests, generate and set CSRF token
			if r.Method == http.MethodGet || r.Method == http.MethodHead || r.Method == http.MethodOptions {
				token := generateCSRFToken(config.TokenLength)
				store.store(token, config.TokenLifetime)

				http.SetCookie(w, &http.Cookie{
					Name:     config.CookieName,
					Value:    token,
					Path:     "/",
					MaxAge:   int(config.TokenLifetime.Seconds()),
					HttpOnly: true,
					Secure:   config.Secure,
					SameSite: http.SameSiteStrictMode,
				})

				next.ServeHTTP(w, r)
				return
			}

			// For state-changing methods (POST, PUT, PATCH, DELETE), validate token
			if r.Method == http.MethodPost || r.Method == http.MethodPut ||
				r.Method == http.MethodPatch || r.Method == http.MethodDelete {

				headerToken := r.Header.Get(config.HeaderName)
				if headerToken == "" {
					log.Warn().
						Str("path", r.URL.Path).
						Str("method", r.Method).
						Str("remote_addr", r.RemoteAddr).
						Msg("CSRF: Missing token in header")
					response.Forbidden(w, "CSRF token missing")
					return
				}

				cookie, err := r.Cookie(config.CookieName)
				if err != nil {
					log.Warn().
						Str("path", r.URL.Path).
						Str("method", r.Method).
						Str("remote_addr", r.RemoteAddr).
						Msg("CSRF: Missing token cookie")
					response.Forbidden(w, "CSRF token cookie missing")
					return
				}

				// Verify header token matches cookie
				if headerToken != cookie.Value {
					log.Warn().
						Str("path", r.URL.Path).
						Str("method", r.Method).
						Str("remote_addr", r.RemoteAddr).
						Msg("CSRF: Token mismatch")
					response.Forbidden(w, "CSRF token mismatch")
					return
				}

				// Verify token is valid and not expired
				if !store.validate(headerToken) {
					log.Warn().
						Str("path", r.URL.Path).
						Str("method", r.Method).
						Str("remote_addr", r.RemoteAddr).
						Msg("CSRF: Invalid or expired token")
					response.Forbidden(w, "CSRF token invalid or expired")
					return
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}

// generateCSRFToken creates a cryptographically secure random token
func generateCSRFToken(length int) string {
	b := make([]byte, length)
	if _, err := rand.Read(b); err != nil {
		log.Error().Err(err).Msg("Failed to generate CSRF token")
		return ""
	}
	return base64.URLEncoding.EncodeToString(b)
}
