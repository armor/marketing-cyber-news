package handlers

import (
	"context"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/phillipboles/aci-backend/internal/api/middleware"
	"github.com/phillipboles/aci-backend/internal/api/response"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/domain/entities"
	"github.com/phillipboles/aci-backend/internal/repository"
)

// DeepDiveHandler handles deep dive threat intelligence requests
type DeepDiveHandler struct {
	articleRepo  repository.ArticleRepository
	deepDiveRepo DeepDiveRepository
	userRepo     repository.UserRepository
	config       *DeepDiveConfig
}

// DeepDiveConfig holds configuration for deep dive access
type DeepDiveConfig struct {
	UpgradeURL string
}

// DeepDiveRepository defines methods for accessing deep dive data
type DeepDiveRepository interface {
	GetByArticleID(ctx context.Context, articleID uuid.UUID) (*domain.DeepDive, error)
	ExistsByArticleID(ctx context.Context, articleID uuid.UUID) (bool, error)
}

// NewDeepDiveHandler creates a new deep dive handler instance
func NewDeepDiveHandler(
	articleRepo repository.ArticleRepository,
	deepDiveRepo DeepDiveRepository,
	userRepo repository.UserRepository,
	config *DeepDiveConfig,
) *DeepDiveHandler {
	if articleRepo == nil {
		panic("articleRepo cannot be nil")
	}
	if deepDiveRepo == nil {
		panic("deepDiveRepo cannot be nil")
	}
	if userRepo == nil {
		panic("userRepo cannot be nil")
	}
	if config == nil {
		panic("config cannot be nil")
	}

	return &DeepDiveHandler{
		articleRepo:  articleRepo,
		deepDiveRepo: deepDiveRepo,
		userRepo:     userRepo,
		config:       config,
	}
}

// GetDeepDive handles GET /v1/articles/{id}/deep-dive
// Returns full deep dive for premium users, preview for free users
func (h *DeepDiveHandler) GetDeepDive(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Parse article ID from URL
	idStr := chi.URLParam(r, "id")
	if idStr == "" {
		response.BadRequest(w, "Article ID is required")
		return
	}

	articleID, err := uuid.Parse(idStr)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("id", idStr).
			Msg("Invalid article ID format")
		response.BadRequest(w, "Invalid article ID format")
		return
	}

	// Check if deep dive exists for this article
	exists, err := h.deepDiveRepo.ExistsByArticleID(ctx, articleID)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("article_id", articleID.String()).
			Msg("Failed to check deep dive existence")
		response.InternalError(w, "Failed to check deep dive availability", requestID)
		return
	}

	if !exists {
		response.NotFound(w, "No deep dive analysis available for this article")
		return
	}

	// Get user from context (set by auth middleware)
	claims, ok := middleware.GetUserFromContext(ctx)
	if !ok {
		log.Error().
			Str("request_id", requestID).
			Msg("User claims not found in context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Get user details to check subscription tier
	user, err := h.userRepo.GetByID(ctx, claims.UserID)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("user_id", claims.UserID.String()).
			Msg("Failed to get user details")
		response.InternalError(w, "Failed to verify subscription status", requestID)
		return
	}

	// Get the deep dive
	deepDive, err := h.deepDiveRepo.GetByArticleID(ctx, articleID)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("article_id", articleID.String()).
			Msg("Failed to get deep dive")
		response.InternalError(w, "Failed to retrieve deep dive analysis", requestID)
		return
	}

	// Check if user has access based on subscription tier
	hasAccess := h.hasDeepDiveAccess(user.SubscriptionTier, deepDive.RequiredTier)

	if hasAccess {
		// Return full deep dive for premium/enterprise users
		response.Success(w, deepDive)
		return
	}

	// Return preview with upgrade prompt for free users
	preview := domain.NewDeepDivePreview(deepDive, h.config.UpgradeURL)
	w.WriteHeader(http.StatusPaymentRequired) // 402 Payment Required
	response.JSON(w, http.StatusPaymentRequired, map[string]interface{}{
		"error":   "Subscription required",
		"message": "This content requires a premium subscription",
		"preview": preview,
	})
}

// hasDeepDiveAccess checks if user's subscription tier allows access to deep dive
func (h *DeepDiveHandler) hasDeepDiveAccess(userTier entities.SubscriptionTier, requiredTier domain.SubscriptionTier) bool {
	// Define tier hierarchy - map both types to integers for comparison
	userTierLevel := map[entities.SubscriptionTier]int{
		entities.SubscriptionFree:       0,
		entities.SubscriptionPremium:    1,
		entities.SubscriptionEnterprise: 2,
	}

	requiredTierLevel := map[domain.SubscriptionTier]int{
		domain.SubscriptionFree:       0,
		domain.SubscriptionPremium:    1,
		domain.SubscriptionEnterprise: 2,
	}

	userLevel, userOk := userTierLevel[userTier]
	requiredLevel, requiredOk := requiredTierLevel[requiredTier]

	if !userOk || !requiredOk {
		return false
	}

	return userLevel >= requiredLevel
}

// CheckDeepDiveAccess is a helper that can be used by article handler
// to populate HasDeepDive field
func CheckDeepDiveAccess(ctx context.Context, deepDiveRepo DeepDiveRepository, articleID uuid.UUID) (bool, error) {
	if deepDiveRepo == nil {
		return false, fmt.Errorf("deepDiveRepo cannot be nil")
	}

	if articleID == uuid.Nil {
		return false, fmt.Errorf("articleID cannot be nil")
	}

	return deepDiveRepo.ExistsByArticleID(ctx, articleID)
}
