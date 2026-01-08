package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/phillipboles/aci-backend/internal/api/response"
	"github.com/rs/zerolog/log"
)

const version = "1.0.0"

// HealthChecker interface for checking dependency health
type HealthChecker interface {
	Ping(ctx context.Context) error
}

// N8NHealthChecker interface for checking n8n connectivity
type N8NHealthChecker interface {
	Health(ctx context.Context) error
}

// QdrantHealthChecker interface for checking Qdrant connectivity
type QdrantHealthChecker interface {
	HealthCheck(ctx context.Context) error
}

// HealthHandler handles health check endpoints
type HealthHandler struct {
	db     HealthChecker
	n8n    N8NHealthChecker    // Optional - marketing feature
	qdrant QdrantHealthChecker // Optional - marketing feature
}

// HealthHandlerOption for optional dependencies
type HealthHandlerOption func(*HealthHandler)

// WithN8N adds n8n health checking
func WithN8N(n8n N8NHealthChecker) HealthHandlerOption {
	return func(h *HealthHandler) {
		h.n8n = n8n
	}
}

// WithQdrant adds Qdrant health checking
func WithQdrant(qdrant QdrantHealthChecker) HealthHandlerOption {
	return func(h *HealthHandler) {
		h.qdrant = qdrant
	}
}

// NewHealthHandler creates a new health handler with database dependency
func NewHealthHandler(db HealthChecker, opts ...HealthHandlerOption) *HealthHandler {
	h := &HealthHandler{
		db: db,
	}

	for _, opt := range opts {
		opt(h)
	}

	return h
}

// HealthCheck returns the health status of the service (liveness probe)
// GET /health
// This endpoint always returns 200 if the service is running
func (h *HealthHandler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	healthData := map[string]interface{}{
		"status":    "healthy",
		"version":   version,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	}

	response.Success(w, healthData)
}

// ReadinessCheck returns the readiness status of the service (readiness probe)
// GET /ready
// This endpoint checks all dependencies and returns 503 if any are unhealthy
func (h *HealthHandler) ReadinessCheck(w http.ResponseWriter, r *http.Request) {
	logger := log.With().Str("endpoint", "/ready").Logger()
	logger.Info().Msg("Health check requested")

	// Use a timeout context for health checks
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	checks := make(map[string]interface{})
	allHealthy := true

	// Check database connection (required)
	dbCheck := h.checkDatabase(ctx)
	checks["database"] = dbCheck
	if dbCheck["status"] != "ok" {
		allHealthy = false
		logger.Warn().Msg("Database health check failed")
	}

	// Check n8n connection (optional for marketing features)
	if h.n8n != nil {
		n8nCheck := h.checkN8N(ctx)
		checks["n8n"] = n8nCheck
		if n8nCheck["status"] != "ok" {
			// n8n is optional, so we log but don't fail readiness
			logger.Warn().Msg("n8n health check failed (non-critical)")
		}
	}

	// Check Qdrant connection (optional for brand features)
	if h.qdrant != nil {
		qdrantCheck := h.checkQdrant(ctx)
		checks["qdrant"] = qdrantCheck
		if qdrantCheck["status"] != "ok" {
			// Qdrant is optional, so we log but don't fail readiness
			logger.Warn().Msg("Qdrant health check failed (non-critical)")
		}
	}

	// Prepare response
	status := "ready"
	if !allHealthy {
		status = "not_ready"
	}

	readinessData := map[string]interface{}{
		"status":    status,
		"checks":    checks,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	}

	if allHealthy {
		logger.Info().Msg("Health check passed")
		response.Success(w, readinessData)
	} else {
		logger.Error().Msg("Health check failed")
		// Return 503 Service Unavailable for unhealthy state with health details
		response.JSON(w, 503, readinessData)
	}
}

// checkDatabase verifies database connectivity
func (h *HealthHandler) checkDatabase(ctx context.Context) map[string]interface{} {
	result := map[string]interface{}{
		"status": "ok",
	}

	if h.db == nil {
		log.Warn().Msg("Health check: database not configured")
		result["status"] = "unconfigured"
		// SEC: Don't leak internal details to response
		result["message"] = "database unavailable"
		return result
	}

	start := time.Now()
	if err := h.db.Ping(ctx); err != nil {
		// SEC: Log the actual error internally but don't expose to response
		log.Error().Err(err).Msg("Health check: database ping failed")
		result["status"] = "error"
		// SEC: Generic message to avoid leaking connection details
		result["message"] = "database unavailable"
		result["latency_ms"] = time.Since(start).Milliseconds()
		return result
	}

	result["latency_ms"] = time.Since(start).Milliseconds()
	return result
}

// checkN8N verifies n8n connectivity
func (h *HealthHandler) checkN8N(ctx context.Context) map[string]interface{} {
	result := map[string]interface{}{
		"status":  "ok",
		"feature": "marketing",
	}

	if h.n8n == nil {
		result["status"] = "unconfigured"
		result["message"] = "n8n not configured"
		return result
	}

	start := time.Now()
	if err := h.n8n.Health(ctx); err != nil {
		log.Error().Err(err).Msg("Health check: n8n health check failed")
		result["status"] = "error"
		result["message"] = "n8n unavailable"
		result["latency_ms"] = time.Since(start).Milliseconds()
		return result
	}

	result["latency_ms"] = time.Since(start).Milliseconds()
	return result
}

// checkQdrant verifies Qdrant connectivity
func (h *HealthHandler) checkQdrant(ctx context.Context) map[string]interface{} {
	result := map[string]interface{}{
		"status":  "ok",
		"feature": "brand",
	}

	if h.qdrant == nil {
		result["status"] = "unconfigured"
		result["message"] = "qdrant not configured"
		return result
	}

	start := time.Now()
	if err := h.qdrant.HealthCheck(ctx); err != nil {
		log.Error().Err(err).Msg("Health check: qdrant health check failed")
		result["status"] = "error"
		result["message"] = "qdrant unavailable"
		result["latency_ms"] = time.Since(start).Milliseconds()
		return result
	}

	result["latency_ms"] = time.Since(start).Milliseconds()
	return result
}

// Legacy standalone functions for backwards compatibility
// These will be deprecated once all routes are migrated to use HealthHandler

// HealthCheck returns the health status of the service
// GET /health
// Deprecated: Use HealthHandler.HealthCheck instead
func HealthCheck(w http.ResponseWriter, r *http.Request) {
	healthData := map[string]interface{}{
		"status":    "healthy",
		"version":   version,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	}

	response.Success(w, healthData)
}

// ReadinessCheck returns the readiness status of the service
// GET /ready
// Deprecated: Use HealthHandler.ReadinessCheck instead
func ReadinessCheck(w http.ResponseWriter, r *http.Request) {
	// Legacy implementation without actual health checks
	// This is kept for backwards compatibility but should not be used in production
	log.Warn().Msg("Using legacy ReadinessCheck without real dependency checks")

	readinessData := map[string]interface{}{
		"status": "ready",
		"checks": map[string]string{
			"database": "ok",
			"redis":    "ok",
		},
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"warning":   "legacy endpoint - use HealthHandler for real health checks",
	}

	response.Success(w, readinessData)
}
