package api

import (
	"net/http"

	"github.com/phillipboles/aci-backend/internal/api/handlers"
	"github.com/phillipboles/aci-backend/internal/api/middleware"
	"github.com/phillipboles/aci-backend/internal/api/response"

	"github.com/go-chi/chi/v5"
)

// WebSocketHandler interface for WebSocket upgrade handling
type WebSocketHandler interface {
	ServeHTTP(w http.ResponseWriter, r *http.Request)
}

// SetupRoutes configures all API routes and middleware
func (s *Server) SetupRoutes() {
	s.setupRoutesWithWebSocket(nil)
}

// SetupRoutesWithWebSocket configures all API routes with optional WebSocket handler
func (s *Server) SetupRoutesWithWebSocket(wsHandler WebSocketHandler) {
	s.setupRoutesWithWebSocket(wsHandler)
}

// setupRoutesWithWebSocket is the internal implementation for route setup
func (s *Server) setupRoutesWithWebSocket(wsHandler WebSocketHandler) {
	// Apply global middleware in order
	s.router.Use(middleware.RequestID)
	s.router.Use(middleware.Logger)
	s.router.Use(middleware.Recoverer)
	s.router.Use(middleware.SecurityHeaders)     // MED-003: Security headers
	s.router.Use(middleware.CORSWithEnv())       // Use environment-configured CORS
	s.router.Use(middleware.GlobalRateLimiter()) // SEC-001: Apply global rate limiter

	// Health endpoints (no authentication required)
	// Use HealthHandler if available (with real dependency checks)
	// Otherwise fall back to legacy standalone functions
	if s.handlers.Health != nil {
		s.router.Get("/health", s.handlers.Health.HealthCheck)
		s.router.Get("/ready", s.handlers.Health.ReadinessCheck)
	} else {
		s.router.Get("/health", handlers.HealthCheck)
		s.router.Get("/ready", handlers.ReadinessCheck)
	}

	// Metrics endpoint for Prometheus (no authentication required)
	if s.handlers.Metrics != nil {
		s.router.Handle("/metrics", s.handlers.Metrics)
	}

	// WebSocket endpoint (authentication handled in handler via query param token)
	if wsHandler != nil {
		s.router.Get("/ws", wsHandler.ServeHTTP)
	}

	// API v1 routes
	s.router.Route("/v1", func(r chi.Router) {
		// Auth routes (no authentication required but rate limited)
		r.Route("/auth", func(r chi.Router) {
			r.Use(middleware.AuthRateLimiter()) // SEC-001: Strict rate limiting for auth endpoints
			r.Post("/register", s.handlers.Auth.RegisterWithMode)
			r.Post("/login", s.handlers.Auth.LoginEnhanced)
			r.Post("/refresh", s.handlers.Auth.Refresh)
			r.Post("/logout", s.handlers.Auth.Logout)

			// Enhanced auth endpoints
			r.Get("/signup-mode", s.handlers.Auth.GetSignupMode)
			r.Post("/verify-email", s.handlers.Auth.VerifyEmail)
			r.Post("/register/invitation", s.handlers.Auth.RegisterFromInvitation)
		})

		// Category routes (no authentication required)
		r.Route("/categories", func(r chi.Router) {
			r.Get("/", s.handlers.Category.List)
			r.Get("/{slug}", s.handlers.Category.GetBySlug)
		})

		// Webhook routes (HMAC validation handled in handler)
		// HIGH-004: Apply rate limiting to prevent webhook abuse
		r.Route("/webhooks", func(r chi.Router) {
			r.Use(middleware.N8NWebhookRateLimiter())
			r.Post("/n8n", s.handlers.Webhook.HandleN8nWebhook)
			r.Post("/trigger-enrichment", s.handlers.Webhook.TriggerEnrichment)

			// Competitor content webhook (called by n8n workflows)
			if s.handlers.Competitor != nil {
				r.Post("/competitor-content", s.handlers.Competitor.SaveCompetitorContentWebhook)
			}
		})

		// Protected routes (authentication required)
		r.Group(func(r chi.Router) {
			r.Use(middleware.Auth(s.jwtService))
			// SEC-CRIT-001: CSRF protection for state-changing operations
			// NOTE: CSRF is disabled until frontend implements token handling
			// TODO: Enable CSRF once frontend sends X-CSRF-Token header
			// r.Use(middleware.CSRF(middleware.CSRFConfig{
			// 	ExemptedPaths: []string{
			// 		"/v1/engagement/webhook", // Uses HMAC auth instead
			// 	},
			// 	Secure: true, // Set to false in development if not using HTTPS
			// }))

			// Dashboard routes
			r.Route("/dashboard", func(r chi.Router) {
				// Handle case where Dashboard handler is not initialized
				if s.handlers.Dashboard == nil {
					r.HandleFunc("/*", func(w http.ResponseWriter, req *http.Request) {
						response.ServiceUnavailable(w, "Dashboard service is not available")
					})
					return
				}

				r.Get("/summary", s.handlers.Dashboard.GetSummary)
				r.Get("/recent-activity", s.handlers.Dashboard.GetRecentActivity)
			})

			// Article routes
			r.Route("/articles", func(r chi.Router) {
				r.Get("/", s.handlers.Article.List)
				r.Get("/search", s.handlers.Article.Search)
				r.Get("/{id}", s.handlers.Article.GetByID)
				r.Get("/slug/{slug}", s.handlers.Article.GetBySlug)

				// Deep dive route
				r.Get("/{id}/deep-dive", s.handlers.DeepDive.GetDeepDive)

				// Article engagement routes
				r.Post("/{id}/bookmark", s.handlers.Article.AddBookmark)
				r.Delete("/{id}/bookmark", s.handlers.Article.RemoveBookmark)
				r.Post("/{id}/read", s.handlers.Article.MarkRead)

				// Approval workflow routes (requires Approval handler)
				if s.handlers.Approval != nil {
					// Approval actions - authentication required, gate access checked in service layer
					r.Post("/{id}/approve", s.handlers.Approval.Approve)
					r.Post("/{id}/reject", s.handlers.Approval.Reject)

					// Release requires release permission
					r.With(middleware.RequireReleaseAccess()).Post("/{id}/release", s.handlers.Approval.Release)

					// Reset requires admin access
					r.With(middleware.RequireAdminAccess()).Post("/{id}/reset", s.handlers.Approval.Reset)

					// History - anyone authenticated can view
					r.Get("/{id}/approval-history", s.handlers.Approval.GetHistory)
				}
			})

			// Approval queue routes (separate from article routes)
			if s.handlers.Approval != nil {
				r.Route("/approvals", func(r chi.Router) {
					r.Use(middleware.RequireApprovalAccess())
					r.Get("/queue", s.handlers.Approval.GetQueue)
				})
			}

			// Alert routes
			r.Route("/alerts", func(r chi.Router) {
				r.Get("/", s.handlers.Alert.List)
				r.Post("/", s.handlers.Alert.Create)
				r.Get("/{id}", s.handlers.Alert.GetByID)
				r.Patch("/{id}", s.handlers.Alert.Update)
				r.Delete("/{id}", s.handlers.Alert.Delete)
				r.Get("/{id}/matches", s.handlers.Alert.ListMatches)
			})

			// User routes
			r.Route("/users", func(r chi.Router) {
				r.Get("/me", s.handlers.User.GetCurrentUser)
				r.Patch("/me", s.handlers.User.UpdateCurrentUser)
				r.Get("/me/bookmarks", s.handlers.User.GetBookmarks)
				r.Get("/me/history", s.handlers.User.GetReadingHistory)
				r.Get("/me/stats", s.handlers.User.GetStats)
				r.Post("/me/change-password", s.handlers.Auth.ChangePassword)
			})

			// Admin routes (require admin role)
			r.Route("/admin", func(r chi.Router) {
				r.Use(middleware.RequireAdmin())

				// Handle case where Admin handler is not initialized
				if s.handlers.Admin == nil {
					r.HandleFunc("/*", func(w http.ResponseWriter, req *http.Request) {
						response.ServiceUnavailable(w, "Admin service is not available")
					})
					return
				}

				// Article management
				r.Put("/articles/{id}", s.handlers.Admin.UpdateArticle)
				r.Delete("/articles/{id}", s.handlers.Admin.DeleteArticle)

				// Source management
				r.Get("/sources", s.handlers.Admin.ListSources)
				r.Post("/sources", s.handlers.Admin.CreateSource)
				r.Put("/sources/{id}", s.handlers.Admin.UpdateSource)
				r.Delete("/sources/{id}", s.handlers.Admin.DeleteSource)

				// User management (legacy - kept for backwards compatibility)
				r.Get("/users", s.handlers.Admin.ListUsers)
				r.Put("/users/{id}", s.handlers.Admin.UpdateUser)
				r.Delete("/users/{id}", s.handlers.Admin.DeleteUser)

				// Audit logs
				r.Get("/audit-logs", s.handlers.Admin.ListAuditLogs)

				// Enhanced User Administration (requires UserAdmin handler)
				if s.handlers.UserAdmin != nil {
					// User CRUD
					r.Get("/user-management", s.handlers.UserAdmin.ListUsers)
					r.Post("/user-management", s.handlers.UserAdmin.CreateUser)
					r.Get("/user-management/{id}", s.handlers.UserAdmin.GetUser)
					r.Put("/user-management/{id}", s.handlers.UserAdmin.UpdateUser)
					r.Delete("/user-management/{id}", s.handlers.UserAdmin.DeleteUser)

					// User actions
					r.Post("/user-management/{id}/deactivate", s.handlers.UserAdmin.DeactivateUser)
					r.Post("/user-management/{id}/role", s.handlers.UserAdmin.AssignRole)
					r.Post("/user-management/{id}/reset-password", s.handlers.UserAdmin.ResetUserPassword)
					r.Post("/user-management/{id}/unlock", s.handlers.UserAdmin.UnlockUser)
					r.Post("/user-management/{id}/revoke-sessions", s.handlers.UserAdmin.RevokeUserSessions)

					// Invitations
					r.Get("/invitations", s.handlers.UserAdmin.ListInvitations)
					r.Post("/invitations", s.handlers.UserAdmin.CreateInvitation)
					r.Delete("/invitations/{id}", s.handlers.UserAdmin.RevokeInvitation)

					// Approval requests
					r.Get("/approvals", s.handlers.UserAdmin.ListPendingApprovals)
					r.Post("/approvals/{id}/approve", s.handlers.UserAdmin.ApproveUser)
					r.Post("/approvals/{id}/reject", s.handlers.UserAdmin.RejectUser)

					// System settings (super_admin only enforced in handler)
					r.Get("/settings/signup-mode", s.handlers.UserAdmin.GetSignupMode)
					r.Put("/settings/signup-mode", s.handlers.UserAdmin.SetSignupMode)
				}
			})

			// Newsletter routes
			r.Route("/newsletter", func(r chi.Router) {
				// Handle case where Content handler is not initialized
				if s.handlers.Content == nil {
					r.HandleFunc("/*", func(w http.ResponseWriter, req *http.Request) {
						response.ServiceUnavailable(w, "Newsletter service is not available")
					})
					return
				}

				// Content Sources
				r.Route("/content-sources", func(r chi.Router) {
					r.Get("/", s.handlers.Content.ListContentSources)
					r.Post("/", s.handlers.Content.CreateContentSource)
					r.Get("/{id}", s.handlers.Content.GetContentSource)
					r.Put("/{id}", s.handlers.Content.UpdateContentSource)
					r.Delete("/{id}", s.handlers.Content.DeleteContentSource)

					// Test feed endpoint
					r.Post("/test-feed", s.handlers.Content.TestFeed)

					// Polling status endpoint
					r.Get("/{id}/status", s.handlers.Content.GetPollingStatus)
				})

				// Content Items
				r.Route("/content-items", func(r chi.Router) {
					r.Get("/", s.handlers.Content.ListContentItems)
					r.Post("/", s.handlers.Content.CreateContentItem)
					r.Get("/{id}", s.handlers.Content.GetContentItem)
					r.Put("/{id}", s.handlers.Content.UpdateContentItem)
					r.Delete("/{id}", s.handlers.Content.DeleteContentItem)
				})

				// Content Selection
				r.Post("/content/select", s.handlers.Content.GetContentForSegment)
				r.Get("/content/fresh", s.handlers.Content.GetFreshContent)
			})

			// Newsletter Configuration routes
			r.Route("/newsletter-configs", func(r chi.Router) {
				// Handle case where NewsletterConfig handler is not initialized
				if s.handlers.NewsletterConfig == nil {
					r.HandleFunc("/*", func(w http.ResponseWriter, req *http.Request) {
						response.ServiceUnavailable(w, "Newsletter config service is not available")
					})
					return
				}

				r.Get("/", s.handlers.NewsletterConfig.List)
				r.Post("/", s.handlers.NewsletterConfig.Create)
				r.Get("/{id}", s.handlers.NewsletterConfig.GetByID)
				r.Put("/{id}", s.handlers.NewsletterConfig.Update)
				r.Delete("/{id}", s.handlers.NewsletterConfig.Delete)
			})

			// Newsletter Issue routes
			r.Route("/newsletter-issues", func(r chi.Router) {
				// Handle case where Issue handler is not initialized
				if s.handlers.Issue == nil {
					r.HandleFunc("/*", func(w http.ResponseWriter, req *http.Request) {
						response.ServiceUnavailable(w, "Newsletter issue service is not available")
					})
					return
				}

				r.Get("/", s.handlers.Issue.ListIssues)
				r.Post("/", s.handlers.Issue.CreateIssue)
				r.Get("/{id}", s.handlers.Issue.GetIssue)
				r.Put("/{id}", s.handlers.Issue.UpdateIssue)
				r.Delete("/{id}", s.handlers.Issue.DeleteIssue)

				// Workflow actions
				r.Get("/{id}/preview", s.handlers.Issue.PreviewIssue)
				r.Post("/{id}/submit", s.handlers.Issue.SubmitForApproval)
				r.Post("/{id}/approve", s.handlers.Issue.ApproveIssue)
				r.Post("/{id}/reject", s.handlers.Issue.RejectIssue)
				r.Get("/pending", s.handlers.Issue.GetPendingApprovals)

				// Brand voice validation
				r.Post("/{id}/validate", s.handlers.Issue.ValidateBrandVoice)
				r.Post("/{id}/select-subject-line", s.handlers.Issue.SelectSubjectLine)
				r.Post("/{id}/regenerate-subject-lines", s.handlers.Issue.RegenerateSubjectLines)
			})

			// Segment routes
			r.Route("/segments", func(r chi.Router) {
				// Handle case where Segment handler is not initialized
				if s.handlers.Segment == nil {
					r.HandleFunc("/*", func(w http.ResponseWriter, req *http.Request) {
						response.ServiceUnavailable(w, "Segment service is not available")
					})
					return
				}

				r.Get("/", s.handlers.Segment.List)
				r.Post("/", s.handlers.Segment.Create)
				r.Get("/{id}", s.handlers.Segment.GetByID)
				r.Put("/{id}", s.handlers.Segment.Update)
				r.Delete("/{id}", s.handlers.Segment.Delete)

				// Segment contacts
				r.Get("/{id}/contacts", s.handlers.Segment.GetContacts)
				r.Post("/{id}/recalculate", s.handlers.Segment.RecalculateContacts)
			})

			// Engagement tracking routes (webhook for ESP callbacks)
			r.Route("/engagement", func(r chi.Router) {
				// Handle case where Engagement handler is not initialized
				if s.handlers.Engagement == nil {
					r.HandleFunc("/*", func(w http.ResponseWriter, req *http.Request) {
						response.ServiceUnavailable(w, "Engagement service is not available")
					})
					return
				}

				// HIGH-004: Apply rate limiting to prevent webhook abuse
				// Webhook for ESP callbacks (HubSpot, Mailchimp, SendGrid)
				r.With(middleware.WebhookRateLimiter()).Post("/webhook", s.handlers.Engagement.HandleWebhook)
			})

			// Campaign routes (Marketing Autopilot)
			r.Route("/campaigns", func(r chi.Router) {
				// Handle case where Campaign handler is not initialized
				if s.handlers.Campaign == nil {
					r.HandleFunc("/*", func(w http.ResponseWriter, req *http.Request) {
						response.ServiceUnavailable(w, "Campaign service is not available")
					})
					return
				}

				r.Get("/", s.handlers.Campaign.List)
				r.Post("/", s.handlers.Campaign.Create)
				r.Post("/recommendations", s.handlers.Campaign.GetRecommendations)

				r.Get("/{id}", s.handlers.Campaign.GetByID)
				r.Put("/{id}", s.handlers.Campaign.Update)
				r.Delete("/{id}", s.handlers.Campaign.Delete)

				// Campaign lifecycle actions
				r.Post("/{id}/launch", s.handlers.Campaign.Launch)
				r.Post("/{id}/pause", s.handlers.Campaign.Pause)
				r.Post("/{id}/resume", s.handlers.Campaign.Resume)
				r.Post("/{id}/stop", s.handlers.Campaign.Stop)

				// Campaign data
				r.Get("/{id}/stats", s.handlers.Campaign.GetStats)

				// Competitor management
				if s.handlers.Competitor != nil {
					r.Get("/{id}/competitors", s.handlers.Competitor.GetCompetitors)
					r.Post("/{id}/competitors", s.handlers.Competitor.AddCompetitor)
					r.Delete("/{id}/competitors/{competitorId}", s.handlers.Competitor.RemoveCompetitor)

					// Competitor content and analysis
					r.Get("/{id}/competitors/{competitorId}/content", s.handlers.Competitor.GetCompetitorContent)
					r.Get("/{id}/competitors/{competitorId}/analysis", s.handlers.Competitor.GetCompetitorAnalysis)
					r.Post("/{id}/competitors/{competitorId}/fetch", s.handlers.Competitor.FetchCompetitorContent)

					// Competitor alerts
					r.Get("/{id}/alerts", s.handlers.Competitor.GetAlerts)
					r.Post("/{id}/alerts/{alertId}/read", s.handlers.Competitor.MarkAlertRead)
					r.Post("/{id}/alerts/read-all", s.handlers.Competitor.MarkAllAlertsRead)
				}
			})

			// Content Studio routes (Marketing Autopilot)
			r.Route("/content-studio", func(r chi.Router) {
				// Handle case where ContentStudio handler is not initialized
				if s.handlers.ContentStudio == nil {
					r.HandleFunc("/*", func(w http.ResponseWriter, req *http.Request) {
						response.ServiceUnavailable(w, "Content Studio service is not available")
					})
					return
				}

				r.Post("/generate", s.handlers.ContentStudio.GenerateContent)
				r.Get("/{id}", s.handlers.ContentStudio.GetContent)
				r.Post("/{id}/refine", s.handlers.ContentStudio.RefineContent)
				r.Post("/{id}/validate", s.handlers.ContentStudio.ValidateContent)
				r.Post("/{id}/schedule", s.handlers.ContentStudio.ScheduleContent)
				r.Post("/{id}/publish", s.handlers.ContentStudio.PublishContent)
			})

			// Channel Connection routes (Marketing Autopilot)
			r.Route("/channels", func(r chi.Router) {
				// Handle case where Channel handler is not initialized
				if s.handlers.Channel == nil {
					r.HandleFunc("/*", func(w http.ResponseWriter, req *http.Request) {
						response.ServiceUnavailable(w, "Channel service is not available")
					})
					return
				}

				r.Get("/", s.handlers.Channel.ListChannels)
				r.Get("/{channel}", s.handlers.Channel.GetConnection)
				r.Post("/{channel}/oauth/initiate", s.handlers.Channel.InitiateOAuth)
				r.Get("/{channel}/oauth/callback", s.handlers.Channel.OAuthCallback)
				r.Delete("/{channel}", s.handlers.Channel.DisconnectChannel)
				r.Post("/{channel}/test", s.handlers.Channel.TestConnection)
			})

			// Marketing Analytics routes
			r.Route("/marketing/analytics", func(r chi.Router) {
				// Handle case where MarketingAnalytics handler is not initialized
				if s.handlers.MarketingAnalytics == nil {
					r.HandleFunc("/*", func(w http.ResponseWriter, req *http.Request) {
						response.ServiceUnavailable(w, "Marketing analytics service is not available")
					})
					return
				}

				// Campaign analytics
				r.Get("/campaigns/{id}", s.handlers.MarketingAnalytics.GetCampaignAnalytics)

				// Channel performance
				r.Get("/channels", s.handlers.MarketingAnalytics.GetChannelPerformance)

				// Content performance
				r.Get("/content", s.handlers.MarketingAnalytics.GetContentPerformance)

				// Engagement trends
				r.Get("/trends", s.handlers.MarketingAnalytics.GetEngagementTrends)

				// Audience growth
				r.Get("/audience", s.handlers.MarketingAnalytics.GetAudienceGrowth)
			})

			// Newsletter Analytics routes
			r.Route("/newsletter-analytics", func(r chi.Router) {
				// Handle case where Analytics handler is not initialized
				if s.handlers.Analytics == nil {
					r.HandleFunc("/*", func(w http.ResponseWriter, req *http.Request) {
						response.ServiceUnavailable(w, "Analytics service is not available")
					})
					return
				}

				// Overview analytics
				r.Get("/overview", s.handlers.Analytics.GetOverview)

				// Segment analytics
				r.Get("/segments/{segmentId}", s.handlers.Analytics.GetSegmentAnalytics)

				// Top performing newsletters
				r.Get("/top", s.handlers.Analytics.GetTopPerforming)

				// Trend data
				r.Get("/trends", s.handlers.Analytics.GetTrendData)

				// A/B test results
				r.Get("/tests/{issueId}", s.handlers.Analytics.GetTestResults)
			})

			// Brand Center routes (Marketing Autopilot)
			r.Route("/brand", func(r chi.Router) {
				// Handle case where Brand handler is not initialized
				if s.handlers.Brand == nil {
					r.HandleFunc("/*", func(w http.ResponseWriter, req *http.Request) {
						response.ServiceUnavailable(w, "Brand service is not available")
					})
					return
				}

				r.Get("/", s.handlers.Brand.GetBrandStore)
				r.Post("/assets", s.handlers.Brand.UploadBrandAsset)
				r.Post("/learn", s.handlers.Brand.LearnFromContent)
				r.Get("/health", s.handlers.Brand.GetBrandHealth)
				r.Get("/terminology", s.handlers.Brand.GetTerminology)
				r.Put("/terminology", s.handlers.Brand.UpdateTerminology)
				r.Put("/settings", s.handlers.Brand.UpdateSettings)
				r.Post("/validate", s.handlers.Brand.ValidateContent)
				r.Get("/context", s.handlers.Brand.GetBrandContext)
			})

			// Content Calendar routes (Marketing Autopilot)
			r.Route("/calendar", func(r chi.Router) {
				// Handle case where Calendar handler is not initialized
				if s.handlers.Calendar == nil {
					r.HandleFunc("/*", func(w http.ResponseWriter, req *http.Request) {
						response.ServiceUnavailable(w, "Calendar service is not available")
					})
					return
				}

				r.Get("/", s.handlers.Calendar.GetCalendar)
				r.Put("/{id}", s.handlers.Calendar.UpdateCalendarEntry)
				r.Delete("/{id}", s.handlers.Calendar.CancelCalendarEntry)
			})
		})
	})
}
