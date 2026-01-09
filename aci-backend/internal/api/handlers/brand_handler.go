package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/phillipboles/aci-backend/internal/api/response"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/service"
)

// BrandHandler handles brand store HTTP requests
type BrandHandler struct {
	brandService *service.BrandCenterService
}

// NewBrandHandler creates a new brand handler
func NewBrandHandler(brandService *service.BrandCenterService) *BrandHandler {
	if brandService == nil {
		panic("brandService cannot be nil")
	}

	return &BrandHandler{
		brandService: brandService,
	}
}

// GetBrandStore handles GET /v1/brand - Get brand store
func (h *BrandHandler) GetBrandStore(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get user ID from context (acts as tenant ID in single-tenant-per-user model)
	userID := getUserIDFromContext(ctx)
	if userID == uuid.Nil {
		log.Error().
			Str("request_id", requestID).
			Msg("User not authenticated")
		response.Unauthorized(w, "User not authenticated")
		return
	}
	tenantID := userID

	// Get brand store
	store, err := h.brandService.GetBrandStore(ctx, tenantID)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("tenant_id", tenantID.String()).
			Msg("Failed to get brand store")
		response.InternalError(w, "Failed to retrieve brand store", requestID)
		return
	}

	response.Success(w, store)
}

// UploadBrandAsset handles POST /v1/brand/upload - Upload brand asset (PDF/DOCX)
func (h *BrandHandler) UploadBrandAsset(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get tenant ID from context
	userID := getUserIDFromContext(ctx)
	if userID == uuid.Nil {
		log.Error().
			Str("request_id", requestID).
			Msg("User not authenticated")
		response.Unauthorized(w, "User not authenticated")
		return
	}
	tenantID := userID

	// Parse multipart form
	err := r.ParseMultipartForm(10 << 20) // 10 MB max
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to parse multipart form")
		response.BadRequest(w, "Failed to parse upload form")
		return
	}

	// Get uploaded file
	file, header, err := r.FormFile("file")
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to get file from form")
		response.BadRequest(w, "File is required")
		return
	}
	defer file.Close()

	// Validate file type
	filename := header.Filename
	lowerFilename := strings.ToLower(filename)
	if !strings.HasSuffix(lowerFilename, ".pdf") && !strings.HasSuffix(lowerFilename, ".docx") {
		response.BadRequest(w, "Only PDF and DOCX files are supported")
		return
	}

	// Validate file size (max 10 MB)
	if header.Size > 10<<20 {
		response.BadRequest(w, "File size exceeds 10 MB limit")
		return
	}

	// Read file content
	content, err := io.ReadAll(file)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to read file content")
		response.InternalError(w, "Failed to read uploaded file", requestID)
		return
	}

	if len(content) == 0 {
		response.BadRequest(w, "Uploaded file is empty")
		return
	}

	// Ingest the asset
	err = h.brandService.IngestBrandAsset(ctx, tenantID, filename, content)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("filename", filename).
			Msg("Failed to ingest brand asset")
		response.InternalError(w, fmt.Sprintf("Failed to process brand asset: %s", err.Error()), requestID)
		return
	}

	log.Info().
		Str("filename", filename).
		Int64("size", header.Size).
		Str("tenant_id", tenantID.String()).
		Msg("Brand asset uploaded successfully")

	response.SuccessWithMessage(w, map[string]interface{}{
		"filename": filename,
		"size":     header.Size,
	}, "Brand asset uploaded and processed successfully")
}

// LearnRequest represents a request to learn from content
type LearnRequest struct {
	Content string `json:"content"`
	Score   int    `json:"score"`
}

// LearnFromContent handles POST /v1/brand/learn - Train from example content
func (h *BrandHandler) LearnFromContent(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get tenant ID from context
	userID := getUserIDFromContext(ctx)
	if userID == uuid.Nil {
		log.Error().
			Str("request_id", requestID).
			Msg("User not authenticated")
		response.Unauthorized(w, "User not authenticated")
		return
	}
	tenantID := userID

	// Parse request body
	var req LearnRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to parse request body")
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Validate request
	if req.Content == "" {
		response.BadRequest(w, "Content is required")
		return
	}

	if req.Score < 0 || req.Score > 100 {
		response.BadRequest(w, "Score must be between 0 and 100")
		return
	}

	// Learn from content
	err := h.brandService.LearnFromContent(ctx, tenantID, req.Content, req.Score)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to learn from content")
		response.InternalError(w, fmt.Sprintf("Failed to learn from content: %s", err.Error()), requestID)
		return
	}

	log.Info().
		Int("score", req.Score).
		Int("content_length", len(req.Content)).
		Str("tenant_id", tenantID.String()).
		Msg("Learned from content successfully")

	response.SuccessWithMessage(w, nil, "Voice example learned successfully")
}

// GetBrandHealth handles GET /v1/brand/health - Get brand health
func (h *BrandHandler) GetBrandHealth(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get tenant ID from context
	userID := getUserIDFromContext(ctx)
	if userID == uuid.Nil {
		log.Error().
			Str("request_id", requestID).
			Msg("User not authenticated")
		response.Unauthorized(w, "User not authenticated")
		return
	}
	tenantID := userID

	// Get brand health
	health, err := h.brandService.GetBrandHealth(ctx, tenantID)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("tenant_id", tenantID.String()).
			Msg("Failed to get brand health")
		response.InternalError(w, "Failed to retrieve brand health", requestID)
		return
	}

	response.Success(w, health)
}

// GetTerminology handles GET /v1/brand/terminology - Get terminology
func (h *BrandHandler) GetTerminology(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get tenant ID from context
	userID := getUserIDFromContext(ctx)
	if userID == uuid.Nil {
		log.Error().
			Str("request_id", requestID).
			Msg("User not authenticated")
		response.Unauthorized(w, "User not authenticated")
		return
	}
	tenantID := userID

	// Get brand store
	store, err := h.brandService.GetBrandStore(ctx, tenantID)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("tenant_id", tenantID.String()).
			Msg("Failed to get brand store")
		response.InternalError(w, "Failed to retrieve terminology", requestID)
		return
	}

	// Return terminology
	terminology := map[string]interface{}{
		"approved_terms": store.ApprovedTerms,
		"banned_terms":   store.BannedTerms,
	}

	response.Success(w, terminology)
}

// UpdateTerminologyRequest represents a request to update terminology
type UpdateTerminologyRequest struct {
	ApprovedTerms []string           `json:"approved_terms"`
	BannedTerms   []domain.TermEntry `json:"banned_terms"`
}

// UpdateTerminology handles PUT /v1/brand/terminology - Update terminology
func (h *BrandHandler) UpdateTerminology(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get tenant ID from context
	userID := getUserIDFromContext(ctx)
	if userID == uuid.Nil {
		log.Error().
			Str("request_id", requestID).
			Msg("User not authenticated")
		response.Unauthorized(w, "User not authenticated")
		return
	}
	tenantID := userID

	// Parse request body
	var req UpdateTerminologyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to parse request body")
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Ensure non-nil slices
	if req.ApprovedTerms == nil {
		req.ApprovedTerms = []string{}
	}
	if req.BannedTerms == nil {
		req.BannedTerms = []domain.TermEntry{}
	}

	// Update terminology
	err := h.brandService.UpdateTerminology(ctx, tenantID, req.ApprovedTerms, req.BannedTerms)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to update terminology")
		response.InternalError(w, fmt.Sprintf("Failed to update terminology: %s", err.Error()), requestID)
		return
	}

	log.Info().
		Int("approved_count", len(req.ApprovedTerms)).
		Int("banned_count", len(req.BannedTerms)).
		Str("tenant_id", tenantID.String()).
		Msg("Terminology updated successfully")

	response.SuccessWithMessage(w, nil, "Terminology updated successfully")
}

// UpdateSettingsRequest represents a request to update brand settings
type UpdateSettingsRequest struct {
	Strictness  float64 `json:"strictness"`
	AutoCorrect bool    `json:"auto_correct"`
}

// UpdateSettings handles PUT /v1/brand/settings - Update settings
func (h *BrandHandler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get tenant ID from context
	userID := getUserIDFromContext(ctx)
	if userID == uuid.Nil {
		log.Error().
			Str("request_id", requestID).
			Msg("User not authenticated")
		response.Unauthorized(w, "User not authenticated")
		return
	}
	tenantID := userID

	// Parse request body
	var req UpdateSettingsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to parse request body")
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Validate strictness
	if req.Strictness < 0 || req.Strictness > 1 {
		response.BadRequest(w, "Strictness must be between 0 and 1")
		return
	}

	// Update settings
	err := h.brandService.UpdateSettings(ctx, tenantID, req.Strictness, req.AutoCorrect)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to update settings")
		response.InternalError(w, fmt.Sprintf("Failed to update settings: %s", err.Error()), requestID)
		return
	}

	log.Info().
		Float64("strictness", req.Strictness).
		Bool("auto_correct", req.AutoCorrect).
		Str("tenant_id", tenantID.String()).
		Msg("Brand settings updated successfully")

	response.SuccessWithMessage(w, nil, "Brand settings updated successfully")
}

// ValidateContentRequest represents a request to validate content
type ValidateContentRequest struct {
	Content string `json:"content"`
}

// ValidateContent handles POST /v1/brand/validate - Validate content against brand
func (h *BrandHandler) ValidateContent(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get tenant ID from context
	userID := getUserIDFromContext(ctx)
	if userID == uuid.Nil {
		log.Error().
			Str("request_id", requestID).
			Msg("User not authenticated")
		response.Unauthorized(w, "User not authenticated")
		return
	}
	tenantID := userID

	// Parse request body
	var req ValidateContentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to parse request body")
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Validate request
	if req.Content == "" {
		response.BadRequest(w, "Content is required")
		return
	}

	// Validate content
	validation, err := h.brandService.ValidateContent(ctx, tenantID, req.Content)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to validate content")
		response.InternalError(w, fmt.Sprintf("Failed to validate content: %s", err.Error()), requestID)
		return
	}

	log.Info().
		Int("score", validation.Score).
		Int("issues_count", len(validation.Issues)).
		Bool("auto_fixed", validation.AutoFixed).
		Str("tenant_id", tenantID.String()).
		Msg("Content validated successfully")

	response.Success(w, validation)
}

// GetBrandContextRequest represents a request to get brand context
type GetBrandContextRequest struct {
	Topic string `json:"topic"`
}

// GetBrandContext handles POST /v1/brand/context - Get brand context for LLM
func (h *BrandHandler) GetBrandContext(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	requestID := getRequestID(ctx)

	// Get tenant ID from context
	userID := getUserIDFromContext(ctx)
	if userID == uuid.Nil {
		log.Error().
			Str("request_id", requestID).
			Msg("User not authenticated")
		response.Unauthorized(w, "User not authenticated")
		return
	}
	tenantID := userID

	// Parse request body
	var req GetBrandContextRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Msg("Failed to parse request body")
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Validate request
	if req.Topic == "" {
		response.BadRequest(w, "Topic is required")
		return
	}

	// Get brand context
	brandContext, err := h.brandService.GetBrandContext(ctx, tenantID, req.Topic)
	if err != nil {
		log.Error().
			Err(err).
			Str("request_id", requestID).
			Str("topic", req.Topic).
			Msg("Failed to get brand context")
		response.InternalError(w, fmt.Sprintf("Failed to get brand context: %s", err.Error()), requestID)
		return
	}

	log.Info().
		Str("topic", req.Topic).
		Int("voice_examples_count", len(brandContext.VoiceExamples)).
		Int("guidelines_count", len(brandContext.Guidelines)).
		Str("tenant_id", tenantID.String()).
		Msg("Brand context retrieved successfully")

	response.Success(w, brandContext)
}
