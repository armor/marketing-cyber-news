package main

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/phillipboles/aci-backend/internal/ai"
	"github.com/phillipboles/aci-backend/internal/api"
	"github.com/phillipboles/aci-backend/internal/api/handlers"
	"github.com/phillipboles/aci-backend/internal/config"
	"github.com/phillipboles/aci-backend/internal/crypto"
	"github.com/phillipboles/aci-backend/internal/n8n"
	"github.com/phillipboles/aci-backend/internal/pkg/jwt"
	"github.com/phillipboles/aci-backend/internal/repository/postgres"
	"github.com/phillipboles/aci-backend/internal/service"
	"github.com/phillipboles/aci-backend/internal/websocket"
)

func main() {
	// Configure logger
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})

	ctx := context.Background()

	// Load configuration from environment
	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to load configuration")
	}

	log.Info().
		Int("port", cfg.Server.Port).
		Str("log_level", cfg.Logger.Level).
		Msg("Configuration loaded")

	// Initialize database connection using pgxpool
	poolConfig, err := pgxpool.ParseConfig(cfg.Database.URL)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to parse database URL")
	}

	poolConfig.MaxConns = int32(cfg.Database.MaxConns)
	poolConfig.MinConns = int32(cfg.Database.MinConns)
	poolConfig.MaxConnLifetime = cfg.Database.MaxConnLifetime
	poolConfig.MaxConnIdleTime = cfg.Database.MaxConnIdleTime

	log.Info().
		Int("max_conns", cfg.Database.MaxConns).
		Int("min_conns", cfg.Database.MinConns).
		Dur("max_conn_lifetime", cfg.Database.MaxConnLifetime).
		Dur("max_conn_idle_time", cfg.Database.MaxConnIdleTime).
		Msg("Database pool configured")

	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to create database pool")
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatal().Err(err).Msg("Failed to ping database")
	}

	log.Info().Msg("Database connection established")

	// Create postgres.DB wrapper for pgx-based repositories
	db := &postgres.DB{Pool: pool}

	// Create database/sql connection for repositories that still require it
	// (article_read_repo, audit_log_repo, bookmark_repo)
	connString := stdlib.RegisterConnConfig(poolConfig.ConnConfig)
	sqlDB, err := sql.Open("pgx", connString)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to open sql.DB connection")
	}
	defer sqlDB.Close()

	if err := sqlDB.Ping(); err != nil {
		log.Fatal().Err(err).Msg("Failed to ping sql.DB connection")
	}

	// Create sqlx.DB wrapper for repositories that use sqlx (competitor repos)
	sqlxDB := sqlx.NewDb(sqlDB, "pgx")

	// Initialize JWT service
	jwtService, err := jwt.NewService(&jwt.Config{
		PrivateKeyPath: cfg.JWT.PrivateKeyPath,
		PublicKeyPath:  cfg.JWT.PublicKeyPath,
		Issuer:         "aci-backend",
	})
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to initialize JWT service")
	}

	log.Info().Msg("JWT service initialized")

	// Initialize AI client and enricher
	aiClient, err := ai.NewClient(ai.Config{
		APIKey: cfg.AI.AnthropicAPIKey,
		Model:  "claude-3-haiku-20240307",
	})
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to initialize AI client")
	}

	enricher := ai.NewEnricher(aiClient)
	log.Info().Msg("AI enrichment service initialized")

	// Initialize repositories
	// Repositories using postgres.DB (pgx-based)
	userRepo := postgres.NewUserRepository(db)
	tokenRepo := postgres.NewRefreshTokenRepository(db)
	articleRepo := postgres.NewArticleRepository(db)
	categoryRepo := postgres.NewCategoryRepository(db)
	sourceRepo := postgres.NewSourceRepository(db)
	webhookLogRepo := postgres.NewWebhookLogRepository(db)
	alertRepo := postgres.NewAlertRepository(db)
	alertMatchRepo := postgres.NewAlertMatchRepository(db)
	_ = postgres.NewApprovalRepository(db) // TODO: Wire up when article approval is implemented

	// Newsletter repositories (pgx-based)
	newsletterConfigRepo := postgres.NewNewsletterConfigRepository(db)
	segmentRepo := postgres.NewSegmentRepository(db)
	contactRepo := postgres.NewContactRepository(db)
	contentSourceRepo := postgres.NewContentSourceRepository(db)
	contentItemRepo := postgres.NewContentItemRepository(db)
	newsletterIssueRepo := postgres.NewNewsletterIssueRepository(db)
	newsletterBlockRepo := postgres.NewNewsletterBlockRepository(db)
	testVariantRepo := postgres.NewTestVariantRepository(db)
	engagementEventRepo := postgres.NewEngagementEventRepository(db)
	issueApprovalRepo := postgres.NewIssueApprovalRepository(db)
	claimsLibraryRepo := postgres.NewClaimsLibraryRepository(db)

	// Enhanced auth repositories (pgx-based)
	passwordResetTokenRepo := postgres.NewPasswordResetTokenRepository(db)

	// Marketing Autopilot repositories (pgx-based)
	campaignRepo := postgres.NewCampaignRepository(db)
	channelConnectionRepo := postgres.NewChannelConnectionRepository(db)
	brandStoreRepo := postgres.NewBrandStoreRepository(db)
	calendarEntryRepo := postgres.NewCalendarEntryRepository(db)

	// Competitor repositories (sqlx-based)
	competitorProfileRepo := postgres.NewCompetitorProfileRepo(sqlxDB)
	competitorContentRepo := postgres.NewCompetitorContentRepo(sqlxDB)
	competitorAlertRepo := postgres.NewCompetitorAlertRepo(sqlxDB)

	// Repositories still using *sql.DB
	bookmarkRepo := postgres.NewBookmarkRepository(sqlDB)
	articleReadRepo := postgres.NewArticleReadRepository(sqlDB)
	auditLogRepo := postgres.NewAuditLogRepository(sqlDB)

	log.Info().Msg("Repositories initialized")

	// Initialize WebSocket hub
	hub := websocket.NewHub(&websocket.HubConfig{
		MaxConnectionsPerUser: 5,
		MaxChannelsPerClient:  50,
	})

	// Start hub in background
	go hub.Run()
	log.Info().Msg("WebSocket hub started")

	// Initialize services
	authService := service.NewAuthService(userRepo, tokenRepo, jwtService)

	// Enhanced auth service with password reset support
	enhancedAuthService := service.NewEnhancedAuthService(
		userRepo,
		tokenRepo,
		jwtService,
		nil, // invitationRepo - not implemented yet
		nil, // verificationRepo - not implemented yet
		nil, // approvalRepo - not implemented yet
		nil, // loginAttemptRepo - not implemented yet
		nil, // settingsRepo - not implemented yet
		passwordResetTokenRepo,
		cfg.Auth,
	)

	articleService := service.NewArticleService(articleRepo, categoryRepo, sourceRepo, webhookLogRepo)
	alertService := service.NewAlertService(alertRepo, alertMatchRepo, articleRepo)
	searchService := service.NewSearchService(articleRepo)
	engagementService := service.NewEngagementService(bookmarkRepo, articleReadRepo, articleRepo)
	enrichmentService := service.NewEnrichmentService(enricher, articleRepo)
	articleApprovalService := service.NewArticleApprovalService()

	// Newsletter services
	newsletterConfigService := service.NewNewsletterConfigService(newsletterConfigRepo, auditLogRepo)
	segmentService := service.NewSegmentService(segmentRepo, contactRepo, auditLogRepo)
	contentService := service.NewContentService(contentItemRepo, contentSourceRepo, segmentRepo, newsletterConfigRepo, auditLogRepo)
	brandVoiceService := service.NewBrandVoiceService(newsletterConfigRepo)
	generationService := service.NewGenerationService(
		newsletterIssueRepo,
		newsletterBlockRepo,
		newsletterConfigRepo,
		segmentRepo,
		contentService,
		brandVoiceService,
		auditLogRepo,
		contactRepo,
		cfg.AI.WebinarResourceURL,
	)
	// SEC-003: Pass userRepo for tier-based approval validation
	// FR-100: 7-gate approval workflow with issue approval tracking
	newsletterApprovalService := service.NewApprovalService(newsletterIssueRepo, newsletterConfigRepo, auditLogRepo, userRepo, issueApprovalRepo)
	analyticsService := service.NewAnalyticsService(engagementEventRepo, newsletterIssueRepo, newsletterConfigRepo, segmentRepo)
	claimsLibraryService := service.NewClaimsLibraryService(claimsLibraryRepo, auditLogRepo)

	// n8n webhook URL and timeout from configuration (validated at startup)
	// TODO: Wire deliveryService when newsletter delivery is enabled
	_ = service.NewDeliveryService(
		newsletterIssueRepo,
		newsletterConfigRepo,
		contactRepo,
		cfg.N8N.WebhookURL,
		cfg.N8N.WebhookTimeoutSecs,
	)
	abTestService := service.NewABTestService(testVariantRepo, engagementEventRepo, contactRepo, newsletterConfigRepo)

	// Marketing Autopilot services (local mode - minimal dependencies)
	competitorService := service.NewCompetitorService(
		competitorProfileRepo,
		competitorContentRepo,
		competitorAlertRepo,
		campaignRepo,
	)

	marketingAnalyticsService := service.NewMarketingAnalyticsService(
		campaignRepo,
		calendarEntryRepo,
		contentItemRepo,
	)

	// Marketing Autopilot services with mock dependencies for local development
	n8nClient := n8n.NewNoOpClient()

	// Initialize crypto encryptor with development key (local mode)
	encryptor, err := crypto.NewEncryptor("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef")
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to initialize encryptor")
	}

	// Campaign service - uses n8n interface for workflow management
	// Note: competitorRepo passed as nil - competitor monitoring uses separate CompetitorService
	campaignService := service.NewCampaignService(
		campaignRepo,
		nil, // competitorRepo - not needed, competitors managed by CompetitorService
		channelConnectionRepo,
		n8nClient,
	)

	// Channel service - handles OAuth connections
	channelService := service.NewChannelService(
		channelConnectionRepo,
		encryptor,
		n8nClient,
		service.ChannelConfig{}, // Empty config for local mode (no OAuth credentials)
	)

	// Brand service mocks for local development
	mockVectorStore := service.NewMockVectorStore()
	mockEmbeddingGen := service.NewMockEmbeddingGenerator(384)
	mockDocParser := service.NewMockDocumentParser()
	mockLLMClient := service.NewMockLLMClient()

	brandService := service.NewBrandCenterService(
		brandStoreRepo,
		mockVectorStore,
		mockEmbeddingGen,
		mockDocParser,
		mockLLMClient,
		nil, // Use default config
	)

	// Content Studio service - uses brand validation and AI content generation
	mockContentStudioN8n := service.NewMockContentStudioN8nClient()
	contentStudioService := service.NewContentStudioService(
		contentItemRepo,
		calendarEntryRepo,
		brandService,
		mockLLMClient,
		channelConnectionRepo,
		mockContentStudioN8n,
	)

	log.Info().Msg("Marketing Autopilot services initialized with mock dependencies")

	// NOTE: AdminService initialization blocked due to interface mismatch
	// UserRepository expects domain.User but postgres.UserRepository uses entities.User
	// This needs to be resolved before AdminService can be initialized
	// adminService := service.NewAdminService(articleRepo, sourceRepo, userRepo, auditLogRepo)

	// TODO: Wire notificationService when notification features are enabled
	_, err = service.NewNotificationService(hub)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to initialize notification service")
	}

	log.Info().Msg("Services initialized")

	// Initialize WebSocket handler
	wsHandler, err := websocket.NewHandler(hub, jwtService)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to initialize WebSocket handler")
	}

	// Initialize HTTP handlers
	authHandler := handlers.NewEnhancedAuthHandler(authService, enhancedAuthService)
	articleHandler := handlers.NewArticleHandler(articleRepo, searchService, engagementService)
	alertHandler := handlers.NewAlertHandler(alertService)
	categoryHandler := handlers.NewCategoryHandler(categoryRepo, articleRepo)
	userHandler := handlers.NewUserHandler(engagementService, userRepo)
	webhookHandler := handlers.NewWebhookHandler(articleService, enrichmentService, webhookLogRepo, cfg.N8N.WebhookSecret)
	dashboardHandler := handlers.NewDashboardHandler(articleRepo)
	articleApprovalHandler := handlers.NewApprovalHandler(articleApprovalService, log.Logger)

	// Newsletter handlers
	newsletterConfigHandler := handlers.NewNewsletterConfigHandler(newsletterConfigService)
	segmentHandler := handlers.NewSegmentHandler(segmentService, log.Logger)
	contentHandler := handlers.NewContentHandler(contentService)
	issueHandler := handlers.NewIssueHandler(generationService, brandVoiceService, newsletterApprovalService, contactRepo)
	analyticsHandler := handlers.NewAnalyticsHandler(analyticsService, abTestService)
	claimsLibraryHandler := handlers.NewClaimsLibraryHandler(claimsLibraryService)

	// Get n8n webhook secret from environment for engagement handler
	n8nWebhookSecret := os.Getenv("N8N_WEBHOOK_SECRET")
	if n8nWebhookSecret == "" {
		log.Warn().Msg("N8N_WEBHOOK_SECRET not set, webhook validation will be disabled")
	}
	engagementHandler := handlers.NewEngagementHandler(engagementEventRepo, contactRepo, newsletterIssueRepo, n8nWebhookSecret)

	// Marketing Autopilot handlers (working services)
	calendarHandler := handlers.NewCalendarHandler(calendarEntryRepo, contentItemRepo)
	competitorHandler := handlers.NewCompetitorHandler(competitorService)
	marketingAnalyticsHandler := handlers.NewMarketingAnalyticsHandler(marketingAnalyticsService)

	// Marketing Autopilot handlers - now properly wired with services
	campaignAdapter := handlers.NewCampaignServiceAdapter(campaignService)
	campaignHandler := handlers.NewCampaignHandler(campaignAdapter)
	channelHandler := handlers.NewChannelHandler(channelService, log.Logger)
	brandHandler := handlers.NewBrandHandler(brandService)
	contentStudioHandler := handlers.NewContentStudioHandler(contentStudioService)

	// Initialize health handler with database for real health checks
	healthHandler := handlers.NewHealthHandler(db)

	// Initialize metrics handler for Prometheus
	metricsHandler := handlers.NewMetricsHandler()

	// NOTE: AdminHandler blocked until AdminService interface issue is resolved
	// adminHandler := handlers.NewAdminHandler(adminService)

	log.Info().Msg("Handlers initialized")

	// Create HTTP server
	// NOTE: adminHandler not available until UserRepository interface mismatch resolved
	apiHandlers := &api.Handlers{
		Auth:               authHandler,
		Article:            articleHandler,
		Alert:              alertHandler,
		Webhook:            webhookHandler,
		User:               userHandler,
		Admin:              nil, // TODO: Wire AdminHandler once UserRepository type mismatch is resolved
		Category:           categoryHandler,
		Dashboard:          dashboardHandler,
		Approval:           articleApprovalHandler,
		Content:            contentHandler,
		NewsletterConfig:   newsletterConfigHandler,
		Segment:            segmentHandler,
		Issue:              issueHandler,
		Analytics:          analyticsHandler,
		Engagement:         engagementHandler,
		Campaign:           campaignHandler,
		ContentStudio:      contentStudioHandler,
		Channel:            channelHandler,
		MarketingAnalytics: marketingAnalyticsHandler,
		Competitor:         competitorHandler,
		Brand:              brandHandler,
		Calendar:           calendarHandler,
		Health:             healthHandler,
		Metrics:            metricsHandler,
		ClaimsLibrary:      claimsLibraryHandler,
	}

	serverConfig := api.Config{
		Port:         cfg.Server.Port,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Create server with WebSocket handler wired
	server := api.NewServerWithWebSocket(serverConfig, apiHandlers, jwtService, wsHandler)

	log.Info().Msg("ACI Backend server starting...")

	// Start HTTP server in background
	serverErrChan := make(chan error, 1)
	go func() {
		if err := server.Start(); err != nil {
			serverErrChan <- err
		}
	}()

	// Graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	select {
	case err := <-serverErrChan:
		log.Fatal().Err(err).Msg("Server failed to start")
	case sig := <-sigChan:
		log.Info().Str("signal", sig.String()).Msg("Shutdown signal received, gracefully stopping...")
	}

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()

	// Shutdown HTTP server
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Error().Err(err).Msg("Server shutdown failed")
	}

	// Close database connections
	pool.Close()
	sqlDB.Close()
	log.Info().Msg("Database connections closed")

	// Hub cleanup happens automatically when goroutines finish

	<-shutdownCtx.Done()
	if shutdownCtx.Err() == context.DeadlineExceeded {
		log.Warn().Msg("Shutdown deadline exceeded")
	}

	log.Info().Msg("Server stopped")
	fmt.Println("Goodbye!")
}
