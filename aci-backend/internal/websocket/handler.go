package websocket

import (
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/gorilla/websocket"
	jwtPkg "github.com/phillipboles/aci-backend/internal/pkg/jwt"
	"github.com/rs/zerolog/log"
)

// getAllowedOrigins returns the list of allowed origins from environment
// SEC-CRIT-004: WebSocket origin validation
func getAllowedOrigins() []string {
	// Support both CORS_ALLOWED_ORIGINS (preferred) and ALLOWED_ORIGINS (legacy)
	allowedOrigins := os.Getenv("CORS_ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		allowedOrigins = os.Getenv("ALLOWED_ORIGINS")
	}

	if allowedOrigins == "" {
		// Development fallback - only allow localhost
		return []string{
			"http://localhost:5173",
			"http://localhost:3000",
			"http://127.0.0.1:5173",
			"http://127.0.0.1:3000",
		}
	}

	// Parse comma-separated origins from environment
	var origins []string
	for _, origin := range strings.Split(allowedOrigins, ",") {
		trimmed := strings.TrimSpace(origin)
		if trimmed != "" {
			origins = append(origins, trimmed)
		}
	}
	return origins
}

// isOriginAllowed checks if the origin is in the allowed origins list
// SEC-CRIT-004: Validates WebSocket origin against allowed list
func isOriginAllowed(origin string, allowedOrigins []string) bool {
	for _, allowed := range allowedOrigins {
		if allowed == origin {
			return true
		}
	}
	return false
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// SEC-CRIT-004: Validate origin against allowed origins
		origin := r.Header.Get("Origin")

		// All WebSocket connections require authentication via JWT token in query param
		// The JWT validation in ServeWS is the primary security control
		// Origin validation provides defense-in-depth against CSWSH attacks

		if origin == "" {
			// SEC-CRIT-004: Reject requests without Origin header in production
			// to prevent CSRF via non-browser tools spoofing WebSocket connections
			// In development, Origin may be empty for local testing
			allowedOrigins := getAllowedOrigins()
			isDevelopment := false
			for _, o := range allowedOrigins {
				if strings.Contains(o, "localhost") || strings.Contains(o, "127.0.0.1") {
					isDevelopment = true
					break
				}
			}

			if isDevelopment {
				log.Debug().
					Str("remote_addr", r.RemoteAddr).
					Msg("WebSocket connection without Origin header - allowing in development")
				return true
			}

			log.Warn().
				Str("remote_addr", r.RemoteAddr).
				Msg("WebSocket connection rejected - Origin header required in production")
			return false
		}

		allowedOrigins := getAllowedOrigins()
		if isOriginAllowed(origin, allowedOrigins) {
			return true
		}

		log.Warn().
			Str("origin", origin).
			Str("remote_addr", r.RemoteAddr).
			Strs("allowed_origins", allowedOrigins).
			Msg("WebSocket connection rejected - origin not allowed")
		return false
	},
}

// Handler handles WebSocket upgrade requests
type Handler struct {
	hub        *Hub
	jwtService jwtPkg.Service
}

// NewHandler creates a new WebSocket handler
func NewHandler(hub *Hub, jwtService jwtPkg.Service) (*Handler, error) {
	if hub == nil {
		return nil, fmt.Errorf("hub is required")
	}

	if jwtService == nil {
		return nil, fmt.Errorf("jwt service is required")
	}

	return &Handler{
		hub:        hub,
		jwtService: jwtService,
	}, nil
}

// ServeWS handles WebSocket upgrade requests
// GET /ws?token=<jwt>
func (h *Handler) ServeWS(w http.ResponseWriter, r *http.Request) {
	// Extract JWT from query parameter
	tokenString := r.URL.Query().Get("token")
	if tokenString == "" {
		log.Warn().
			Str("remote_addr", r.RemoteAddr).
			Msg("WebSocket connection attempt without token")
		http.Error(w, "Token is required", http.StatusUnauthorized)
		return
	}

	// Validate JWT
	claims, err := h.jwtService.ValidateAccessToken(tokenString)
	if err != nil {
		log.Warn().
			Err(err).
			Str("remote_addr", r.RemoteAddr).
			Msg("Invalid JWT token for WebSocket")
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}

	// Check connection limit before upgrading
	if h.hub.GetConnectionCount(claims.UserID) >= h.hub.maxConnectionsPerUser {
		log.Warn().
			Str("user_id", claims.UserID.String()).
			Int("current_connections", h.hub.GetConnectionCount(claims.UserID)).
			Msg("Max connections per user reached")
		http.Error(w, "Max connections reached", http.StatusTooManyRequests)
		return
	}

	// Upgrade connection to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Error().
			Err(err).
			Str("remote_addr", r.RemoteAddr).
			Msg("Failed to upgrade WebSocket connection")
		return
	}

	// Extract token expiration
	tokenExp := claims.ExpiresAt.Time

	// Create new client
	client := NewClient(h.hub, conn, claims.UserID, claims.Email, claims.Role, tokenExp)

	// Register client with hub
	if err := h.hub.RegisterClient(client); err != nil {
		log.Error().
			Err(err).
			Str("user_id", claims.UserID.String()).
			Msg("Failed to register client")
		conn.Close()
		return
	}

	log.Info().
		Str("user_id", claims.UserID.String()).
		Str("email", claims.Email).
		Str("role", claims.Role).
		Str("remote_addr", r.RemoteAddr).
		Msg("WebSocket connection established")

	// Start read and write pumps in separate goroutines
	go client.WritePump()
	go client.ReadPump()
}

// ServeHTTP implements http.Handler interface for routing integration
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	h.ServeWS(w, r)
}
