package handlers

import (
	"net/http"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/collectors"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// MetricsHandler handles Prometheus metrics endpoints
type MetricsHandler struct {
	registry *prometheus.Registry
	handler  http.Handler
}

// Newsletter-specific metrics
var (
	// NewslettersGenerated counts newsletter generation events
	NewslettersGenerated = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "newsletter_generated_total",
			Help: "Total number of newsletters generated",
		},
		[]string{"status", "segment"},
	)

	// NewsletterApprovalLatency tracks time from generation to approval
	NewsletterApprovalLatency = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "newsletter_approval_latency_seconds",
			Help:    "Time from newsletter generation to approval",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"tier"},
	)

	// ContentSourceRequests tracks content source API requests
	ContentSourceRequests = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "content_source_requests_total",
			Help: "Total number of content source requests",
		},
		[]string{"source", "status"},
	)

	// ABTestVariantsAssigned tracks A/B test variant assignments
	ABTestVariantsAssigned = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "ab_test_variants_assigned_total",
			Help: "Total number of A/B test variant assignments",
		},
		[]string{"test_id", "variant"},
	)

	// EngagementEvents tracks newsletter engagement events
	EngagementEvents = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "newsletter_engagement_events_total",
			Help: "Total number of newsletter engagement events",
		},
		[]string{"event_type", "segment"},
	)

	// HTTPRequestsTotal tracks HTTP requests
	HTTPRequestsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests",
		},
		[]string{"method", "endpoint", "status"},
	)

	// HTTPRequestDuration tracks HTTP request latency
	HTTPRequestDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "HTTP request latency in seconds",
			Buckets: prometheus.DefBuckets,
		},
		[]string{"method", "endpoint"},
	)

	// DatabasePoolStats tracks database connection pool statistics
	DatabasePoolSize = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "database_pool_connections",
			Help: "Number of database connections by state",
		},
		[]string{"state"},
	)

	// WebSocketConnections tracks active WebSocket connections
	WebSocketConnections = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "websocket_connections_active",
			Help: "Number of active WebSocket connections",
		},
	)
)

// NewMetricsHandler creates a new metrics handler with registered collectors
func NewMetricsHandler() *MetricsHandler {
	// Create a new registry with standard Go collectors
	registry := prometheus.NewRegistry()

	// Register standard Go runtime metrics
	registry.MustRegister(collectors.NewGoCollector())
	registry.MustRegister(collectors.NewProcessCollector(collectors.ProcessCollectorOpts{}))

	// Register custom metrics
	registry.MustRegister(NewslettersGenerated)
	registry.MustRegister(NewsletterApprovalLatency)
	registry.MustRegister(ContentSourceRequests)
	registry.MustRegister(ABTestVariantsAssigned)
	registry.MustRegister(EngagementEvents)
	registry.MustRegister(HTTPRequestsTotal)
	registry.MustRegister(HTTPRequestDuration)
	registry.MustRegister(DatabasePoolSize)
	registry.MustRegister(WebSocketConnections)

	return &MetricsHandler{
		registry: registry,
		handler:  promhttp.HandlerFor(registry, promhttp.HandlerOpts{}),
	}
}

// ServeHTTP implements http.Handler for the metrics endpoint
func (m *MetricsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	m.handler.ServeHTTP(w, r)
}

// GetRegistry returns the prometheus registry for additional registrations
func (m *MetricsHandler) GetRegistry() *prometheus.Registry {
	return m.registry
}
