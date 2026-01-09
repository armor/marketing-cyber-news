package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/repository"
)

// VectorStore defines the interface for vector database operations (Qdrant)
type VectorStore interface {
	// Store stores text chunks with embeddings
	Store(ctx context.Context, collection string, id string, text string, embedding []float32, metadata map[string]interface{}) error
	// Search performs semantic search and returns relevant text chunks
	Search(ctx context.Context, collection string, queryEmbedding []float32, limit int) ([]VectorSearchResult, error)
	// Delete deletes vectors from a collection
	Delete(ctx context.Context, collection string, id string) error
	// CreateCollection creates a new collection
	CreateCollection(ctx context.Context, name string, vectorSize int) error
	// DeleteCollection deletes an entire collection
	DeleteCollection(ctx context.Context, name string) error
}

// VectorSearchResult represents a vector search result
type VectorSearchResult struct {
	ID       string
	Text     string
	Score    float32
	Metadata map[string]interface{}
}

// EmbeddingGenerator generates embeddings for text
type EmbeddingGenerator interface {
	// Generate generates an embedding vector for the given text
	Generate(ctx context.Context, text string) ([]float32, error)
}

// DocumentParser extracts text from documents
type DocumentParser interface {
	// ParsePDF extracts text from PDF files
	ParsePDF(ctx context.Context, content []byte) (string, error)
	// ParseDOCX extracts text from DOCX files
	ParseDOCX(ctx context.Context, content []byte) (string, error)
}

// BrandCenterService handles brand store and validation operations
// Implements the BrandService interface defined in content_studio_service.go
type BrandCenterService struct {
	brandRepo           repository.BrandStoreRepository
	vectorStore         VectorStore
	embeddingGen        EmbeddingGenerator
	docParser           DocumentParser
	llmClient           LLMClient // Uses LLMClient interface from content_studio_service.go
	chunkSize           int
	chunkOverlap        int
	embeddingVectorSize int
}

// BrandServiceConfig holds configuration for the brand service
type BrandServiceConfig struct {
	ChunkSize           int
	ChunkOverlap        int
	EmbeddingVectorSize int
}

// NewBrandCenterService creates a new brand center service
func NewBrandCenterService(
	brandRepo repository.BrandStoreRepository,
	vectorStore VectorStore,
	embeddingGen EmbeddingGenerator,
	docParser DocumentParser,
	llmClient LLMClient,
	config *BrandServiceConfig,
) *BrandCenterService {
	if brandRepo == nil {
		panic("brandRepo cannot be nil")
	}
	if vectorStore == nil {
		panic("vectorStore cannot be nil")
	}
	if embeddingGen == nil {
		panic("embeddingGen cannot be nil")
	}
	if docParser == nil {
		panic("docParser cannot be nil")
	}
	if llmClient == nil {
		panic("llmClient cannot be nil")
	}
	if config == nil {
		config = &BrandServiceConfig{
			ChunkSize:           500,
			ChunkOverlap:        50,
			EmbeddingVectorSize: 384,
		}
	}

	return &BrandCenterService{
		brandRepo:           brandRepo,
		vectorStore:         vectorStore,
		embeddingGen:        embeddingGen,
		docParser:           docParser,
		llmClient:           llmClient,
		chunkSize:           config.ChunkSize,
		chunkOverlap:        config.ChunkOverlap,
		embeddingVectorSize: config.EmbeddingVectorSize,
	}
}

// GetBrandStore returns the brand store for a tenant
func (s *BrandCenterService) GetBrandStore(ctx context.Context, tenantID uuid.UUID) (*domain.BrandStore, error) {
	if tenantID == uuid.Nil {
		return nil, fmt.Errorf("tenant ID is required")
	}

	store, err := s.brandRepo.GetByTenantID(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get brand store: %w", err)
	}

	return store, nil
}

// GetBrandContext retrieves context for LLM prompt injection
func (s *BrandCenterService) GetBrandContext(ctx context.Context, tenantID uuid.UUID, topic string) (*domain.BrandContext, error) {
	if tenantID == uuid.Nil {
		return nil, fmt.Errorf("tenant ID is required")
	}

	if topic == "" {
		return nil, fmt.Errorf("topic is required")
	}

	// Get brand store
	store, err := s.brandRepo.GetByTenantID(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get brand store: %w", err)
	}

	// Generate embedding for topic
	topicEmbedding, err := s.embeddingGen.Generate(ctx, topic)
	if err != nil {
		return nil, fmt.Errorf("failed to generate topic embedding: %w", err)
	}

	// Search for relevant voice examples
	voiceCollection := fmt.Sprintf("%svoice", store.QdrantCollectionPrefix)
	voiceResults, err := s.vectorStore.Search(ctx, voiceCollection, topicEmbedding, 5)
	if err != nil {
		log.Warn().
			Err(err).
			Str("collection", voiceCollection).
			Msg("Failed to search voice examples, continuing without them")
		voiceResults = []VectorSearchResult{}
	}

	// Search for relevant guidelines
	guidelinesCollection := fmt.Sprintf("%sguidelines", store.QdrantCollectionPrefix)
	guidelineResults, err := s.vectorStore.Search(ctx, guidelinesCollection, topicEmbedding, 3)
	if err != nil {
		log.Warn().
			Err(err).
			Str("collection", guidelinesCollection).
			Msg("Failed to search guidelines, continuing without them")
		guidelineResults = []VectorSearchResult{}
	}

	// Build brand context
	brandContext := &domain.BrandContext{
		VoiceExamples: make([]string, 0, len(voiceResults)),
		Guidelines:    make([]string, 0, len(guidelineResults)),
		ApprovedTerms: store.ApprovedTerms,
		BannedTerms:   store.BannedTerms,
	}

	// Extract voice example text
	for _, result := range voiceResults {
		if result.Text != "" {
			brandContext.VoiceExamples = append(brandContext.VoiceExamples, result.Text)
		}
	}

	// Extract guideline text
	for _, result := range guidelineResults {
		if result.Text != "" {
			brandContext.Guidelines = append(brandContext.Guidelines, result.Text)
		}
	}

	// Extract tone guidelines from metadata if available
	if len(guidelineResults) > 0 && guidelineResults[0].Metadata != nil {
		if tone, ok := guidelineResults[0].Metadata["tone"].(string); ok {
			brandContext.ToneGuidelines = tone
		}
		if audience, ok := guidelineResults[0].Metadata["audience"].(string); ok {
			brandContext.TargetAudience = audience
		}
		if personality, ok := guidelineResults[0].Metadata["personality"].(string); ok {
			brandContext.BrandPersonality = personality
		}
	}

	return brandContext, nil
}

// ValidateContent scores content against brand rules
func (s *BrandCenterService) ValidateContent(ctx context.Context, tenantID uuid.UUID, content string) (*domain.BrandValidation, error) {
	if tenantID == uuid.Nil {
		return nil, fmt.Errorf("tenant ID is required")
	}

	if content == "" {
		return nil, fmt.Errorf("content is required")
	}

	// Get brand store
	store, err := s.brandRepo.GetByTenantID(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get brand store: %w", err)
	}

	validation := &domain.BrandValidation{
		Score:     100,
		Issues:    make([]domain.BrandIssue, 0),
		AutoFixed: false,
		Warnings:  make([]string, 0),
	}

	// Check for banned terms
	bannedIssues := s.checkBannedTerms(content, store.BannedTerms)
	validation.Issues = append(validation.Issues, bannedIssues...)

	// Deduct points for each banned term found
	validation.Score -= len(bannedIssues) * 10

	// Check tone and voice using LLM if strictness is high enough
	if store.Strictness >= 0.5 && store.VoiceExamplesCount > 0 {
		toneIssues, err := s.checkToneWithLLM(ctx, tenantID, content, store.Strictness)
		if err != nil {
			log.Warn().
				Err(err).
				Msg("Failed to check tone with LLM, skipping tone validation")
		} else {
			validation.Issues = append(validation.Issues, toneIssues...)
			// Deduct points for tone issues based on severity
			for _, issue := range toneIssues {
				if issue.Severity == domain.SeverityError {
					validation.Score -= 15
				} else if issue.Severity == domain.SeverityWarning {
					validation.Score -= 5
				}
			}
		}
	}

	// Auto-correct if enabled and score is below threshold
	if store.AutoCorrect && validation.Score < 70 && len(validation.Issues) > 0 {
		fixedContent, err := s.autoCorrectContent(ctx, content, validation.Issues, store.BannedTerms)
		if err != nil {
			log.Warn().
				Err(err).
				Msg("Failed to auto-correct content")
		} else {
			validation.AutoFixed = true
			validation.FixedContent = fixedContent
			validation.Score = 85 // Bump score after auto-correction
		}
	}

	// Ensure score is within bounds
	if validation.Score < 0 {
		validation.Score = 0
	}
	if validation.Score > 100 {
		validation.Score = 100
	}

	return validation, nil
}

// IngestBrandAsset processes uploaded PDF/DOCX files
func (s *BrandCenterService) IngestBrandAsset(ctx context.Context, tenantID uuid.UUID, filename string, content []byte) error {
	if tenantID == uuid.Nil {
		return fmt.Errorf("tenant ID is required")
	}

	if filename == "" {
		return fmt.Errorf("filename is required")
	}

	if len(content) == 0 {
		return fmt.Errorf("content is required")
	}

	// Get brand store
	store, err := s.brandRepo.GetByTenantID(ctx, tenantID)
	if err != nil {
		return fmt.Errorf("failed to get brand store: %w", err)
	}

	// Extract text based on file type
	var text string
	lowerFilename := strings.ToLower(filename)

	if strings.HasSuffix(lowerFilename, ".pdf") {
		text, err = s.docParser.ParsePDF(ctx, content)
		if err != nil {
			return fmt.Errorf("failed to parse PDF: %w", err)
		}
	} else if strings.HasSuffix(lowerFilename, ".docx") {
		text, err = s.docParser.ParseDOCX(ctx, content)
		if err != nil {
			return fmt.Errorf("failed to parse DOCX: %w", err)
		}
	} else {
		return fmt.Errorf("unsupported file type: %s (only PDF and DOCX supported)", filename)
	}

	if text == "" {
		return fmt.Errorf("no text extracted from document")
	}

	// Chunk the text
	chunks := s.chunkText(text)

	if len(chunks) == 0 {
		return fmt.Errorf("no text chunks created from document")
	}

	// Store chunks in vector database
	collection := fmt.Sprintf("%sguidelines", store.QdrantCollectionPrefix)

	// Ensure collection exists
	err = s.vectorStore.CreateCollection(ctx, collection, s.embeddingVectorSize)
	if err != nil {
		log.Warn().
			Err(err).
			Str("collection", collection).
			Msg("Collection may already exist, continuing")
	}

	// Store each chunk
	storedCount := 0
	for i, chunk := range chunks {
		// Generate embedding
		embedding, err := s.embeddingGen.Generate(ctx, chunk)
		if err != nil {
			log.Error().
				Err(err).
				Int("chunk_index", i).
				Msg("Failed to generate embedding for chunk, skipping")
			continue
		}

		// Store in vector database
		chunkID := fmt.Sprintf("%s_%s_%d", store.ID.String(), filename, i)
		metadata := map[string]interface{}{
			"filename":    filename,
			"chunk_index": i,
			"type":        "guideline",
		}

		err = s.vectorStore.Store(ctx, collection, chunkID, chunk, embedding, metadata)
		if err != nil {
			log.Error().
				Err(err).
				Int("chunk_index", i).
				Msg("Failed to store chunk, skipping")
			continue
		}

		storedCount++
	}

	if storedCount == 0 {
		return fmt.Errorf("failed to store any chunks in vector database")
	}

	// Update counts in database
	newGuidelinesCount := store.GuidelinesCount + storedCount
	err = s.brandRepo.UpdateCounts(ctx, store.ID, store.VoiceExamplesCount, newGuidelinesCount, store.TerminologyCount, store.CorrectionsCount)
	if err != nil {
		return fmt.Errorf("failed to update guideline count: %w", err)
	}

	// Recalculate and update health score
	store.GuidelinesCount = newGuidelinesCount
	newScore := store.CalculateHealthScore()
	err = s.brandRepo.UpdateHealthScore(ctx, store.ID, newScore)
	if err != nil {
		log.Error().
			Err(err).
			Msg("Failed to update health score")
	}

	log.Info().
		Str("filename", filename).
		Int("chunks_stored", storedCount).
		Int("new_guidelines_count", newGuidelinesCount).
		Msg("Brand asset ingested successfully")

	return nil
}

// LearnFromContent trains on pasted example content
func (s *BrandCenterService) LearnFromContent(ctx context.Context, tenantID uuid.UUID, content string, score int) error {
	if tenantID == uuid.Nil {
		return fmt.Errorf("tenant ID is required")
	}

	if content == "" {
		return fmt.Errorf("content is required")
	}

	if score < 0 || score > 100 {
		return fmt.Errorf("score must be between 0 and 100")
	}

	// Get brand store
	store, err := s.brandRepo.GetByTenantID(ctx, tenantID)
	if err != nil {
		return fmt.Errorf("failed to get brand store: %w", err)
	}

	// Generate embedding
	embedding, err := s.embeddingGen.Generate(ctx, content)
	if err != nil {
		return fmt.Errorf("failed to generate embedding: %w", err)
	}

	// Store in voice examples collection
	collection := fmt.Sprintf("%svoice", store.QdrantCollectionPrefix)

	// Ensure collection exists
	err = s.vectorStore.CreateCollection(ctx, collection, s.embeddingVectorSize)
	if err != nil {
		log.Warn().
			Err(err).
			Str("collection", collection).
			Msg("Collection may already exist, continuing")
	}

	// Store with score as metadata
	exampleID := fmt.Sprintf("%s_voice_%d", store.ID.String(), time.Now().Unix())
	metadata := map[string]interface{}{
		"score":      score,
		"type":       "voice_example",
		"created_at": time.Now().Unix(),
	}

	err = s.vectorStore.Store(ctx, collection, exampleID, content, embedding, metadata)
	if err != nil {
		return fmt.Errorf("failed to store voice example: %w", err)
	}

	// Update counts
	newVoiceExamplesCount := store.VoiceExamplesCount + 1
	err = s.brandRepo.UpdateCounts(ctx, store.ID, newVoiceExamplesCount, store.GuidelinesCount, store.TerminologyCount, store.CorrectionsCount)
	if err != nil {
		return fmt.Errorf("failed to update voice examples count: %w", err)
	}

	// Update last trained timestamp
	now := time.Now()
	err = s.brandRepo.UpdateLastTrained(ctx, store.ID, now)
	if err != nil {
		log.Error().
			Err(err).
			Msg("Failed to update last_trained_at")
	}

	// Recalculate and update health score
	store.VoiceExamplesCount = newVoiceExamplesCount
	newScore := store.CalculateHealthScore()
	err = s.brandRepo.UpdateHealthScore(ctx, store.ID, newScore)
	if err != nil {
		log.Error().
			Err(err).
			Msg("Failed to update health score")
	}

	log.Info().
		Int("score", score).
		Int("new_voice_examples_count", newVoiceExamplesCount).
		Msg("Voice example learned successfully")

	return nil
}

// GetBrandHealth returns brand store health metrics
func (s *BrandCenterService) GetBrandHealth(ctx context.Context, tenantID uuid.UUID) (*domain.BrandHealth, error) {
	if tenantID == uuid.Nil {
		return nil, fmt.Errorf("tenant ID is required")
	}

	store, err := s.brandRepo.GetByTenantID(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get brand store: %w", err)
	}

	// Recalculate health score
	score := store.CalculateHealthScore()

	health := &domain.BrandHealth{
		Score:              score,
		VoiceExamplesCount: store.VoiceExamplesCount,
		GuidelinesCount:    store.GuidelinesCount,
		TerminologyCount:   store.TerminologyCount,
		CorrectionsCount:   store.CorrectionsCount,
		Strictness:         store.Strictness,
		Recommendations:    store.GetRecommendations(),
		LastTrainedAt:      store.LastTrainedAt,
	}

	return health, nil
}

// UpdateTerminology updates approved/banned terms
func (s *BrandCenterService) UpdateTerminology(ctx context.Context, tenantID uuid.UUID, approved []string, banned []domain.TermEntry) error {
	if tenantID == uuid.Nil {
		return fmt.Errorf("tenant ID is required")
	}

	// Get brand store to get the ID
	store, err := s.brandRepo.GetByTenantID(ctx, tenantID)
	if err != nil {
		return fmt.Errorf("failed to get brand store: %w", err)
	}

	// Normalize approved terms (trim whitespace, lowercase)
	normalizedApproved := make([]string, 0, len(approved))
	for _, term := range approved {
		trimmed := strings.TrimSpace(term)
		if trimmed != "" {
			normalizedApproved = append(normalizedApproved, trimmed)
		}
	}

	// Normalize banned terms
	normalizedBanned := make([]domain.TermEntry, 0, len(banned))
	for _, entry := range banned {
		trimmed := strings.TrimSpace(entry.Term)
		if trimmed != "" {
			normalizedBanned = append(normalizedBanned, domain.TermEntry{
				Term:        trimmed,
				Replacement: strings.TrimSpace(entry.Replacement),
				Category:    strings.TrimSpace(entry.Category),
			})
		}
	}

	// Update in database
	err = s.brandRepo.UpdateTerminology(ctx, store.ID, normalizedApproved, normalizedBanned)
	if err != nil {
		return fmt.Errorf("failed to update terminology: %w", err)
	}

	// Update terminology count
	newTerminologyCount := len(normalizedApproved) + len(normalizedBanned)
	err = s.brandRepo.UpdateCounts(ctx, store.ID, store.VoiceExamplesCount, store.GuidelinesCount, newTerminologyCount, store.CorrectionsCount)
	if err != nil {
		log.Error().
			Err(err).
			Msg("Failed to update terminology count")
	}

	// Recalculate health score
	store.TerminologyCount = newTerminologyCount
	newScore := store.CalculateHealthScore()
	err = s.brandRepo.UpdateHealthScore(ctx, store.ID, newScore)
	if err != nil {
		log.Error().
			Err(err).
			Msg("Failed to update health score")
	}

	return nil
}

// UpdateSettings updates strictness and auto-correct settings
func (s *BrandCenterService) UpdateSettings(ctx context.Context, tenantID uuid.UUID, strictness float64, autoCorrect bool) error {
	if tenantID == uuid.Nil {
		return fmt.Errorf("tenant ID is required")
	}

	if strictness < 0 || strictness > 1 {
		return fmt.Errorf("strictness must be between 0 and 1")
	}

	// Get brand store to get the ID
	store, err := s.brandRepo.GetByTenantID(ctx, tenantID)
	if err != nil {
		return fmt.Errorf("failed to get brand store: %w", err)
	}

	// Update settings
	err = s.brandRepo.UpdateSettings(ctx, store.ID, strictness, autoCorrect)
	if err != nil {
		return fmt.Errorf("failed to update settings: %w", err)
	}

	return nil
}

// Private helper methods

// chunkText splits text into overlapping chunks
func (s *BrandCenterService) chunkText(text string) []string {
	// Split by sentences (simple approach)
	sentences := strings.Split(text, ".")
	chunks := make([]string, 0)
	currentChunk := ""

	for _, sentence := range sentences {
		sentence = strings.TrimSpace(sentence)
		if sentence == "" {
			continue
		}

		// Add sentence to current chunk
		if currentChunk == "" {
			currentChunk = sentence
		} else {
			currentChunk = currentChunk + ". " + sentence
		}

		// If chunk is large enough, save it
		if len(currentChunk) >= s.chunkSize {
			chunks = append(chunks, currentChunk)
			// Start new chunk with overlap
			words := strings.Fields(currentChunk)
			if len(words) > s.chunkOverlap/10 {
				overlapWords := words[len(words)-(s.chunkOverlap/10):]
				currentChunk = strings.Join(overlapWords, " ")
			} else {
				currentChunk = ""
			}
		}
	}

	// Add remaining text as final chunk
	if currentChunk != "" {
		chunks = append(chunks, currentChunk)
	}

	return chunks
}

// checkBannedTerms finds banned terms in content
func (s *BrandCenterService) checkBannedTerms(content string, bannedTerms []domain.TermEntry) []domain.BrandIssue {
	issues := make([]domain.BrandIssue, 0)
	lowerContent := strings.ToLower(content)

	for _, entry := range bannedTerms {
		lowerTerm := strings.ToLower(entry.Term)
		if strings.Contains(lowerContent, lowerTerm) {
			// Find position
			index := strings.Index(lowerContent, lowerTerm)
			position := &domain.TextPosition{
				Start: index,
				End:   index + len(entry.Term),
			}

			suggestion := fmt.Sprintf("Remove or replace '%s'", entry.Term)
			if entry.Replacement != "" {
				suggestion = fmt.Sprintf("Replace '%s' with '%s'", entry.Term, entry.Replacement)
			}

			issues = append(issues, domain.BrandIssue{
				Type:       domain.IssueTerminology,
				Severity:   domain.SeverityError,
				Message:    fmt.Sprintf("Banned term detected: %s", entry.Term),
				Suggestion: suggestion,
				Position:   position,
				Term:       entry.Term,
			})
		}
	}

	return issues
}

// checkToneWithLLM uses LLM to analyze tone and voice consistency
func (s *BrandCenterService) checkToneWithLLM(ctx context.Context, tenantID uuid.UUID, content string, strictness float64) ([]domain.BrandIssue, error) {
	// Get brand context
	brandContext, err := s.GetBrandContext(ctx, tenantID, content)
	if err != nil {
		return nil, fmt.Errorf("failed to get brand context: %w", err)
	}

	// Build prompt for LLM
	systemContext := "You are a brand voice expert. Analyze the following content for tone and voice consistency."
	if len(brandContext.VoiceExamples) > 0 {
		systemContext += "\n\nExamples of our brand voice:\n" + strings.Join(brandContext.VoiceExamples, "\n\n")
	}
	if len(brandContext.Guidelines) > 0 {
		systemContext += "\n\nBrand guidelines:\n" + strings.Join(brandContext.Guidelines, "\n\n")
	}

	prompt := fmt.Sprintf("Analyze this content for brand voice consistency (strictness: %.2f):\n\n%s\n\nList any tone or voice issues.", strictness, content)

	// Call LLM
	response, err := s.llmClient.GenerateContent(ctx, prompt, systemContext)
	if err != nil {
		return nil, fmt.Errorf("LLM call failed: %w", err)
	}

	// Parse LLM response into issues
	issues := s.parseLLMResponseToIssues(response)

	return issues, nil
}

// parseLLMResponseToIssues converts LLM response to brand issues
func (s *BrandCenterService) parseLLMResponseToIssues(response string) []domain.BrandIssue {
	issues := make([]domain.BrandIssue, 0)

	// Simple parsing: look for lines that seem like issues
	lines := strings.Split(response, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// If line contains keywords like "issue", "problem", "warning", treat as issue
		lowerLine := strings.ToLower(line)
		if strings.Contains(lowerLine, "issue") || strings.Contains(lowerLine, "problem") || strings.Contains(lowerLine, "warning") {
			severity := domain.SeverityWarning
			if strings.Contains(lowerLine, "critical") || strings.Contains(lowerLine, "must") {
				severity = domain.SeverityError
			}

			issues = append(issues, domain.BrandIssue{
				Type:     domain.IssueTone,
				Severity: severity,
				Message:  line,
			})
		}
	}

	return issues
}

// autoCorrectContent attempts to fix content using LLM
func (s *BrandCenterService) autoCorrectContent(ctx context.Context, content string, issues []domain.BrandIssue, bannedTerms []domain.TermEntry) (string, error) {
	fixedContent := content

	// Auto-fix banned terms first
	for _, entry := range bannedTerms {
		if entry.Replacement != "" {
			fixedContent = strings.ReplaceAll(fixedContent, entry.Term, entry.Replacement)
		}
	}

	// Use LLM for tone fixes if there are tone issues
	hasToneIssues := false
	for _, issue := range issues {
		if issue.Type == domain.IssueTone {
			hasToneIssues = true
			break
		}
	}

	if hasToneIssues {
		action := "Fix the tone and voice issues while matching brand voice and preserving meaning."

		corrected, err := s.llmClient.RefineContent(ctx, fixedContent, action)
		if err != nil {
			log.Warn().
				Err(err).
				Msg("Failed to use LLM for tone correction")
			return fixedContent, nil
		}

		fixedContent = corrected
	}

	return fixedContent, nil
}
