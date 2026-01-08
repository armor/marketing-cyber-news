package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/phillipboles/aci-backend/internal/domain"
)

// NewMockVectorStore creates a new mock vector store
func NewMockVectorStore() *MockVectorStore {
	return &MockVectorStore{}
}

// NewMockEmbeddingGenerator creates a new mock embedding generator
func NewMockEmbeddingGenerator(vectorSize int) *MockEmbeddingGenerator {
	return &MockEmbeddingGenerator{VectorSize: vectorSize}
}

// NewMockDocumentParser creates a new mock document parser
func NewMockDocumentParser() *MockDocumentParser {
	return &MockDocumentParser{}
}

// MockVectorStore is a no-op implementation of VectorStore interface
type MockVectorStore struct{}

// Store stores text chunks with embeddings (no-op)
func (m *MockVectorStore) Store(ctx context.Context, collection string, id string, text string, embedding []float32, metadata map[string]interface{}) error {
	return nil
}

// Search performs semantic search and returns empty results
func (m *MockVectorStore) Search(ctx context.Context, collection string, queryEmbedding []float32, limit int) ([]VectorSearchResult, error) {
	return []VectorSearchResult{}, nil
}

// Delete deletes vectors from a collection (no-op)
func (m *MockVectorStore) Delete(ctx context.Context, collection string, id string) error {
	return nil
}

// CreateCollection creates a new collection (no-op)
func (m *MockVectorStore) CreateCollection(ctx context.Context, name string, vectorSize int) error {
	return nil
}

// DeleteCollection deletes an entire collection (no-op)
func (m *MockVectorStore) DeleteCollection(ctx context.Context, name string) error {
	return nil
}

// MockEmbeddingGenerator is a no-op implementation of EmbeddingGenerator interface
type MockEmbeddingGenerator struct {
	VectorSize int
}

// Generate generates an embedding vector for the given text (returns zero vector)
func (m *MockEmbeddingGenerator) Generate(ctx context.Context, text string) ([]float32, error) {
	if m.VectorSize <= 0 {
		m.VectorSize = 384 // Default size
	}

	// Return zero vector of specified size
	embedding := make([]float32, m.VectorSize)
	return embedding, nil
}

// MockDocumentParser is a no-op implementation of DocumentParser interface
type MockDocumentParser struct{}

// ParsePDF extracts text from PDF files (returns empty string)
func (m *MockDocumentParser) ParsePDF(ctx context.Context, content []byte) (string, error) {
	return "", nil
}

// ParseDOCX extracts text from DOCX files (returns empty string)
func (m *MockDocumentParser) ParseDOCX(ctx context.Context, content []byte) (string, error) {
	return "", nil
}

// MockLLMClient is a no-op implementation of LLMClient interface
type MockLLMClient struct{}

// NewMockLLMClient creates a new mock LLM client
func NewMockLLMClient() *MockLLMClient {
	return &MockLLMClient{}
}

// GenerateContent generates mock content
func (m *MockLLMClient) GenerateContent(ctx context.Context, prompt string, systemContext string) (string, error) {
	return "This is mock-generated content for: " + prompt, nil
}

// RefineContent refines content (returns same content)
func (m *MockLLMClient) RefineContent(ctx context.Context, originalContent string, action string) (string, error) {
	return "[Refined] " + originalContent, nil
}

// MockContentStudioN8nClient is a no-op implementation of N8nClient for ContentStudioService
type MockContentStudioN8nClient struct{}

// NewMockContentStudioN8nClient creates a new mock n8n client for content studio
func NewMockContentStudioN8nClient() *MockContentStudioN8nClient {
	return &MockContentStudioN8nClient{}
}

// TriggerPublish simulates publishing content
func (m *MockContentStudioN8nClient) TriggerPublish(ctx context.Context, contentID uuid.UUID, channel domain.Channel) (*PublishResult, error) {
	return &PublishResult{
		PublishedURL: "https://mock.example.com/" + contentID.String(),
		PublishedID:  "mock-" + contentID.String(),
		PublishedAt:  time.Now(),
	}, nil
}

// MockBrandService is a no-op implementation of BrandService interface for ContentStudioService
type MockBrandService struct{}

// NewMockBrandService creates a new mock brand service
func NewMockBrandService() *MockBrandService {
	return &MockBrandService{}
}

// GetBrandContext returns mock brand context
func (m *MockBrandService) GetBrandContext(ctx context.Context, tenantID uuid.UUID, topic string) (*domain.BrandContext, error) {
	return &domain.BrandContext{
		VoiceExamples:    []string{"Professional yet approachable", "Confident but not arrogant"},
		Guidelines:       []string{"Use active voice", "Be concise"},
		ApprovedTerms:    []string{"premium", "trusted", "innovative"},
		BannedTerms:      []domain.TermEntry{{Term: "cheap"}, {Term: "guarantee"}},
		ToneGuidelines:   "Maintain a professional, informative tone",
		TargetAudience:   "B2B professionals",
		BrandPersonality: "Innovative and reliable",
	}, nil
}

// ValidateContent validates content against brand rules (always passes)
func (m *MockBrandService) ValidateContent(ctx context.Context, tenantID uuid.UUID, content string) (*domain.BrandValidation, error) {
	return &domain.BrandValidation{
		Score:        95,
		Issues:       []domain.BrandIssue{},
		AutoFixed:    false,
		FixedContent: "",
		Warnings:     []string{},
	}, nil
}
