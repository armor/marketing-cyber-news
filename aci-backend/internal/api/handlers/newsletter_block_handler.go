package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/rs/zerolog/log"

	"github.com/phillipboles/aci-backend/internal/api/dto"
	"github.com/phillipboles/aci-backend/internal/api/middleware"
	"github.com/phillipboles/aci-backend/internal/api/response"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/repository"
)

// Configuration constants for bulk operations
const (
	// MaxBulkBlocksPerRequest defines the maximum number of blocks that can be
	// added in a single bulk operation. This limit prevents memory exhaustion
	// and ensures reasonable request processing times.
	MaxBulkBlocksPerRequest = 20

	// DefaultCTALabel is the default call-to-action text used for newsletter
	// blocks when no custom label is specified.
	DefaultCTALabel = "Read More"
)

// NewsletterBlockHandler handles newsletter block HTTP requests
type NewsletterBlockHandler struct {
	blockRepo       repository.NewsletterBlockRepository
	issueRepo       repository.NewsletterIssueRepository
	contentItemRepo repository.ContentItemRepository
}

// NewNewsletterBlockHandler creates a new newsletter block handler
func NewNewsletterBlockHandler(
	blockRepo repository.NewsletterBlockRepository,
	issueRepo repository.NewsletterIssueRepository,
	contentItemRepo repository.ContentItemRepository,
) *NewsletterBlockHandler {
	if blockRepo == nil {
		panic("blockRepo cannot be nil")
	}
	if issueRepo == nil {
		panic("issueRepo cannot be nil")
	}
	if contentItemRepo == nil {
		panic("contentItemRepo cannot be nil")
	}

	return &NewsletterBlockHandler{
		blockRepo:       blockRepo,
		issueRepo:       issueRepo,
		contentItemRepo: contentItemRepo,
	}
}

// BulkAddBlocks handles POST /v1/newsletters/{issueId}/blocks/bulk
// Adds multiple content items as newsletter blocks in a single atomic operation
func (h *NewsletterBlockHandler) BulkAddBlocks(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get user from context and validate role
	user, err := middleware.GetDomainUserFromContext(ctx)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to get user from context")
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Check authorization - only marketing or admin can add blocks
	if user.Role != domain.RoleMarketing && user.Role != domain.RoleAdmin {
		log.Warn().
			Str("request_id", requestID).
			Str("user_id", user.ID.String()).
			Str("role", string(user.Role)).
			Msg("Unauthorized attempt to add blocks")
		response.Forbidden(w, "User lacks permission to add blocks to this newsletter")
		return
	}

	// Extract issue ID from URL
	issueIDStr := chi.URLParam(r, "id")
	issueID, err := uuid.Parse(issueIDStr)
	if err != nil {
		response.BadRequest(w, "Invalid issue ID format")
		return
	}

	// Decode request body
	var req dto.BulkAddBlocksRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to decode request body")
		response.BadRequest(w, "Invalid JSON in request body")
		return
	}

	// Validate request
	if len(req.ContentItemIDs) == 0 {
		response.BadRequest(w, "content_item_ids is required and cannot be empty")
		return
	}

	if len(req.ContentItemIDs) > MaxBulkBlocksPerRequest {
		response.BadRequest(w, "Maximum 20 items allowed per request")
		return
	}

	// Validate block type
	blockType := domain.BlockType(req.BlockType)
	if !blockType.IsValid() {
		response.BadRequest(w, "Invalid block_type. Must be one of: hero, news, content, events, spotlight")
		return
	}

	// Check if issue exists and is in draft status
	issue, err := h.issueRepo.GetByID(ctx, issueID)
	if err != nil {
		// Distinguish between "not found" and actual database errors
		if errors.Is(err, pgx.ErrNoRows) || strings.Contains(err.Error(), "not found") {
			response.NotFound(w, "Newsletter issue not found")
			return
		}
		log.Error().Err(err).Str("request_id", requestID).Str("issue_id", issueID.String()).Msg("Failed to get issue")
		response.InternalError(w, "Failed to retrieve newsletter issue", requestID)
		return
	}

	if issue.Status != domain.IssueStatusDraft {
		response.BadRequest(w, "Newsletter issue is not in draft status")
		return
	}

	// Check for duplicate content items already in the issue
	existingIDs, err := h.blockRepo.GetExistingContentItemIDs(ctx, issueID, req.ContentItemIDs)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to check for duplicates")
		response.InternalError(w, "Failed to check for duplicate content", requestID)
		return
	}

	// Build set of existing IDs for fast lookup
	existingIDSet := make(map[uuid.UUID]bool)
	for _, id := range existingIDs {
		existingIDSet[id] = true
	}

	// Filter out duplicates
	var contentItemIDsToAdd []uuid.UUID
	var skippedIDs []uuid.UUID
	for _, id := range req.ContentItemIDs {
		if existingIDSet[id] {
			skippedIDs = append(skippedIDs, id)
		} else {
			contentItemIDsToAdd = append(contentItemIDsToAdd, id)
		}
	}

	// If all items are duplicates, return 409 Conflict
	if len(contentItemIDsToAdd) == 0 {
		response.Conflict(w, "All content items already exist in this newsletter issue")
		return
	}

	// Fetch content items to get their metadata
	contentItems, err := h.contentItemRepo.GetByIDs(ctx, contentItemIDsToAdd)
	if err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to fetch content items")
		response.InternalError(w, "Failed to fetch content items", requestID)
		return
	}

	// Verify all content items were found
	if len(contentItems) != len(contentItemIDsToAdd) {
		// Identify which content items are missing for better debugging
		foundIDs := make(map[uuid.UUID]bool)
		for _, item := range contentItems {
			foundIDs[item.ID] = true
		}
		var missingIDs []string
		for _, id := range contentItemIDsToAdd {
			if !foundIDs[id] {
				missingIDs = append(missingIDs, id.String())
			}
		}
		response.BadRequest(w, "Content items not found: "+strings.Join(missingIDs, ", "))
		return
	}

	// Build content item map for quick lookup
	contentItemMap := make(map[uuid.UUID]*domain.ContentItem)
	for _, item := range contentItems {
		contentItemMap[item.ID] = item
	}

	// Create newsletter blocks from content items
	now := time.Now()
	blocks := make([]*domain.NewsletterBlock, 0, len(contentItemIDsToAdd))
	for _, contentID := range contentItemIDsToAdd {
		item := contentItemMap[contentID]
		if item == nil {
			// This should never happen given the validation above, but log if it does
			log.Warn().
				Str("request_id", requestID).
				Str("content_id", contentID.String()).
				Msg("Content item unexpectedly nil in map - possible data race")
			continue
		}

		block := &domain.NewsletterBlock{
			ID:            uuid.New(),
			IssueID:       issueID,
			ContentItemID: &item.ID,
			BlockType:     blockType,
			Position:      0, // Will be set by BulkCreateWithLock
			Title:         &item.Title,
			Teaser:        item.Summary,
			CTALabel:      blockStringPtr(DefaultCTALabel),
			CTAURL:        &item.URL,
			IsPromotional: false,
			TopicTags:     item.TopicTags,
			Clicks:        0,
			CreatedAt:     now,
			UpdatedAt:     now,
		}
		blocks = append(blocks, block)
	}

	// Create blocks with pessimistic locking for position assignment
	if err := h.blockRepo.BulkCreateWithLock(ctx, issueID, blocks); err != nil {
		log.Error().Err(err).Str("request_id", requestID).Msg("Failed to create blocks")
		response.InternalError(w, "Failed to create newsletter blocks", requestID)
		return
	}

	// Build response
	blockDTOs := make([]dto.NewsletterBlockDTO, 0, len(blocks))
	for _, block := range blocks {
		blockDTOs = append(blockDTOs, toBlockDTO(block))
	}

	resp := dto.BulkAddBlocksResponse{
		Blocks:       blockDTOs,
		CreatedCount: len(blocks),
		SkippedCount: len(skippedIDs),
		SkippedIDs:   skippedIDs,
	}

	log.Info().
		Str("request_id", requestID).
		Str("user_id", user.ID.String()).
		Str("issue_id", issueID.String()).
		Int("created_count", resp.CreatedCount).
		Int("skipped_count", resp.SkippedCount).
		Msg("Bulk added blocks to newsletter")

	response.Created(w, resp)
}

// toBlockDTO converts a domain.NewsletterBlock to dto.NewsletterBlockDTO
func toBlockDTO(block *domain.NewsletterBlock) dto.NewsletterBlockDTO {
	return dto.NewsletterBlockDTO{
		ID:            block.ID,
		IssueID:       block.IssueID,
		ContentItemID: block.ContentItemID,
		BlockType:     string(block.BlockType),
		Position:      block.Position,
		Title:         block.Title,
		Teaser:        block.Teaser,
		CTALabel:      block.CTALabel,
		CTAURL:        block.CTAURL,
		IsPromotional: block.IsPromotional,
		TopicTags:     block.TopicTags,
		Clicks:        block.Clicks,
		CreatedAt:     block.CreatedAt.Format(time.RFC3339),
		UpdatedAt:     block.UpdatedAt.Format(time.RFC3339),
	}
}

// blockStringPtr returns a pointer to the given string
func blockStringPtr(s string) *string {
	return &s
}
