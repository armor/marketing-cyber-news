package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/phillipboles/aci-backend/internal/api/dto"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/pkg/crypto"
	"github.com/phillipboles/aci-backend/internal/repository/postgres"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestData holds pre-created test data for newsletter block tests
type TestData struct {
	UserID          uuid.UUID
	ContentSourceID uuid.UUID
	SegmentID       uuid.UUID
	ConfigID        uuid.UUID
	IssueID         uuid.UUID
	ContentItemIDs  []uuid.UUID
}

// setupNewsletterTestData creates test data in the database for newsletter block tests
func setupNewsletterTestData(t *testing.T, testDB *TestDB, userRole string) *TestData {
	t.Helper()
	ctx := context.Background()

	// Create test user
	userID := uuid.New()
	passwordHash, err := crypto.HashPassword("TestPass123!")
	require.NoError(t, err)

	_, err = testDB.DB.Pool.Exec(ctx,
		`INSERT INTO users (id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)`,
		userID, fmt.Sprintf("user-%s@test.com", userID.String()[:8]), passwordHash, "Test User", userRole)
	require.NoError(t, err)

	// Create content source
	sourceID := uuid.New()
	_, err = testDB.DB.Pool.Exec(ctx,
		`INSERT INTO content_sources (id, name, source_type, is_active, created_by) VALUES ($1, $2, $3, $4, $5)`,
		sourceID, "Test Source", "manual", true, userID)
	require.NoError(t, err)

	// Create segment
	segmentID := uuid.New()
	_, err = testDB.DB.Pool.Exec(ctx,
		`INSERT INTO segments (id, name, is_active, created_by) VALUES ($1, $2, $3, $4)`,
		segmentID, "Test Segment", true, userID)
	require.NoError(t, err)

	// Create newsletter configuration
	configID := uuid.New()
	_, err = testDB.DB.Pool.Exec(ctx,
		`INSERT INTO newsletter_configurations (id, name, segment_id, is_active, created_by) VALUES ($1, $2, $3, $4, $5)`,
		configID, "Test Newsletter", segmentID, true, userID)
	require.NoError(t, err)

	// Create newsletter issue in draft status
	issueID := uuid.New()
	_, err = testDB.DB.Pool.Exec(ctx,
		`INSERT INTO newsletter_issues
			(id, configuration_id, segment_id, issue_number, issue_date, subject_lines, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		issueID, configID, segmentID, 1, time.Now(), `["Test Subject"]`, "draft")
	require.NoError(t, err)

	// Create content items
	contentItemIDs := make([]uuid.UUID, 3)
	for i := 0; i < 3; i++ {
		contentItemIDs[i] = uuid.New()
		_, err = testDB.DB.Pool.Exec(ctx,
			`INSERT INTO content_items
				(id, source_id, title, url, content_type, topic_tags, publish_date, is_active)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			contentItemIDs[i], sourceID,
			fmt.Sprintf("Test Article %d", i+1),
			fmt.Sprintf("https://example.com/article-%s", contentItemIDs[i].String()[:8]),
			"news",
			[]string{"security", "compliance"},
			time.Now(),
			true)
		require.NoError(t, err)
	}

	return &TestData{
		UserID:          userID,
		ContentSourceID: sourceID,
		SegmentID:       segmentID,
		ConfigID:        configID,
		IssueID:         issueID,
		ContentItemIDs:  contentItemIDs,
	}
}

// TestBulkAddBlocks_HappyPath tests successful bulk block creation
func TestBulkAddBlocks_HappyPath(t *testing.T) {
	// Setup
	db := SetupTestDB(t)
	defer TeardownTestDB(t, db)

	server := SetupTestServer(t, db)
	defer TeardownTestServer(t, server)

	// Create test data with marketing role
	testData := setupNewsletterTestData(t, db, "marketing")

	// Generate JWT token
	tokens, err := server.JWTService.GenerateTokenPair(
		testData.UserID,
		fmt.Sprintf("user-%s@test.com", testData.UserID.String()[:8]),
		"marketing",
	)
	require.NoError(t, err)

	// Prepare request
	reqBody := dto.BulkAddBlocksRequest{
		ContentItemIDs: testData.ContentItemIDs,
		BlockType:      "news",
	}
	bodyJSON, err := json.Marshal(reqBody)
	require.NoError(t, err)

	// Make request
	url := fmt.Sprintf("%s/v1/newsletter-issues/%s/blocks/bulk", server.BaseURL, testData.IssueID)
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(bodyJSON))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	// Read response body first for debugging
	respBody := ReadResponseBody(t, resp)
	t.Logf("Response status: %d, body: %s", resp.StatusCode, respBody)

	// Verify response status
	assert.Equal(t, http.StatusCreated, resp.StatusCode, "expected 201 Created")

	// Parse response - account for API envelope {data: ...}
	var apiResp struct {
		Data dto.BulkAddBlocksResponse `json:"data"`
	}
	err = json.Unmarshal([]byte(respBody), &apiResp)
	require.NoError(t, err, "failed to unmarshal response")
	bulkResp := apiResp.Data

	// Verify response content
	assert.Equal(t, 3, bulkResp.CreatedCount, "should have created 3 blocks")
	assert.Equal(t, 0, bulkResp.SkippedCount, "no blocks should be skipped")
	assert.Len(t, bulkResp.Blocks, 3, "response should contain 3 blocks")

	// Verify blocks were created in database with correct positions
	ctx := context.Background()
	var dbBlocks []struct {
		ID            uuid.UUID
		ContentItemID uuid.UUID
		Position      int
		BlockType     string
	}

	rows, err := db.DB.Pool.Query(ctx,
		`SELECT id, content_item_id, position, block_type
		FROM newsletter_blocks
		WHERE issue_id = $1
		ORDER BY position ASC`,
		testData.IssueID)
	require.NoError(t, err)
	defer rows.Close()

	for rows.Next() {
		var block struct {
			ID            uuid.UUID
			ContentItemID uuid.UUID
			Position      int
			BlockType     string
		}
		err := rows.Scan(&block.ID, &block.ContentItemID, &block.Position, &block.BlockType)
		require.NoError(t, err)
		dbBlocks = append(dbBlocks, block)
	}

	// Verify database state
	assert.Len(t, dbBlocks, 3, "should have 3 blocks in database")

	// Verify positions are sequential starting from 0
	for i, block := range dbBlocks {
		assert.Equal(t, i, block.Position, "position should be sequential")
		assert.Equal(t, "news", block.BlockType, "block type should match")
	}
}

// TestBulkAddBlocks_DuplicateContent tests handling of duplicate content items
func TestBulkAddBlocks_DuplicateContent(t *testing.T) {
	// Setup
	db := SetupTestDB(t)
	defer TeardownTestDB(t, db)

	server := SetupTestServer(t, db)
	defer TeardownTestServer(t, server)

	testData := setupNewsletterTestData(t, db, "marketing")

	// Generate JWT token
	tokens, err := server.JWTService.GenerateTokenPair(
		testData.UserID,
		fmt.Sprintf("user-%s@test.com", testData.UserID.String()[:8]),
		"marketing",
	)
	require.NoError(t, err)

	// First, add one content item as a block directly
	ctx := context.Background()
	existingBlockID := uuid.New()
	_, err = db.DB.Pool.Exec(ctx,
		`INSERT INTO newsletter_blocks
			(id, issue_id, content_item_id, block_type, position, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		existingBlockID, testData.IssueID, testData.ContentItemIDs[0], "news", 0, time.Now(), time.Now())
	require.NoError(t, err)

	// Request to add all 3 content items (1 duplicate, 2 new)
	reqBody := dto.BulkAddBlocksRequest{
		ContentItemIDs: testData.ContentItemIDs,
		BlockType:      "news",
	}
	bodyJSON, err := json.Marshal(reqBody)
	require.NoError(t, err)

	url := fmt.Sprintf("%s/v1/newsletter-issues/%s/blocks/bulk", server.BaseURL, testData.IssueID)
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(bodyJSON))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	// Should succeed with 201
	assert.Equal(t, http.StatusCreated, resp.StatusCode, "expected 201 Created")

	// Parse response - account for API envelope {data: ...}
	respBody := ReadResponseBody(t, resp)
	var apiResp struct {
		Data dto.BulkAddBlocksResponse `json:"data"`
	}
	err = json.Unmarshal([]byte(respBody), &apiResp)
	require.NoError(t, err, "failed to unmarshal response")
	bulkResp := apiResp.Data

	// Verify response
	assert.Equal(t, 2, bulkResp.CreatedCount, "should have created 2 new blocks")
	assert.Equal(t, 1, bulkResp.SkippedCount, "should have skipped 1 duplicate")
	assert.Len(t, bulkResp.SkippedIDs, 1, "should have 1 skipped ID")
	assert.Equal(t, testData.ContentItemIDs[0], bulkResp.SkippedIDs[0], "skipped ID should match")

	// Verify database has 3 blocks total (1 existing + 2 new)
	var totalBlocks int
	err = db.DB.Pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM newsletter_blocks WHERE issue_id = $1`,
		testData.IssueID).Scan(&totalBlocks)
	require.NoError(t, err)
	assert.Equal(t, 3, totalBlocks, "should have 3 total blocks")

	// Verify positions: existing at 0, new at 1 and 2
	rows, err := db.DB.Pool.Query(ctx,
		`SELECT content_item_id, position
		FROM newsletter_blocks
		WHERE issue_id = $1
		ORDER BY position ASC`,
		testData.IssueID)
	require.NoError(t, err)
	defer rows.Close()

	positions := make(map[uuid.UUID]int)
	for rows.Next() {
		var contentID uuid.UUID
		var pos int
		err := rows.Scan(&contentID, &pos)
		require.NoError(t, err)
		positions[contentID] = pos
	}

	assert.Equal(t, 0, positions[testData.ContentItemIDs[0]], "existing block should be at position 0")
	// New blocks should be at positions 1 and 2
	for _, id := range testData.ContentItemIDs[1:] {
		pos, ok := positions[id]
		assert.True(t, ok, "new content item should have a block")
		assert.True(t, pos == 1 || pos == 2, "new block should be at position 1 or 2")
	}
}

// TestBulkAddBlocks_AllDuplicates tests handling when all content items are duplicates
func TestBulkAddBlocks_AllDuplicates(t *testing.T) {
	db := SetupTestDB(t)
	defer TeardownTestDB(t, db)

	server := SetupTestServer(t, db)
	defer TeardownTestServer(t, server)

	testData := setupNewsletterTestData(t, db, "marketing")

	tokens, err := server.JWTService.GenerateTokenPair(
		testData.UserID,
		fmt.Sprintf("user-%s@test.com", testData.UserID.String()[:8]),
		"marketing",
	)
	require.NoError(t, err)

	// Pre-create all blocks
	ctx := context.Background()
	for i, contentID := range testData.ContentItemIDs {
		_, err := db.DB.Pool.Exec(ctx,
			`INSERT INTO newsletter_blocks
				(id, issue_id, content_item_id, block_type, position, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			uuid.New(), testData.IssueID, contentID, "news", i, time.Now(), time.Now())
		require.NoError(t, err)
	}

	// Try to add same items
	reqBody := dto.BulkAddBlocksRequest{
		ContentItemIDs: testData.ContentItemIDs,
		BlockType:      "news",
	}
	bodyJSON, _ := json.Marshal(reqBody)

	url := fmt.Sprintf("%s/v1/newsletter-issues/%s/blocks/bulk", server.BaseURL, testData.IssueID)
	req, _ := http.NewRequest(http.MethodPost, url, bytes.NewReader(bodyJSON))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	// Should return 409 Conflict
	assert.Equal(t, http.StatusConflict, resp.StatusCode, "expected 409 Conflict")
}

// TestBulkAddBlocks_NonDraftIssue tests rejection when issue is not in draft status
func TestBulkAddBlocks_NonDraftIssue(t *testing.T) {
	db := SetupTestDB(t)
	defer TeardownTestDB(t, db)

	server := SetupTestServer(t, db)
	defer TeardownTestServer(t, server)

	testData := setupNewsletterTestData(t, db, "marketing")

	// Update issue to non-draft status
	ctx := context.Background()
	_, err := db.DB.Pool.Exec(ctx,
		`UPDATE newsletter_issues SET status = 'pending_approval' WHERE id = $1`,
		testData.IssueID)
	require.NoError(t, err)

	tokens, err := server.JWTService.GenerateTokenPair(
		testData.UserID,
		fmt.Sprintf("user-%s@test.com", testData.UserID.String()[:8]),
		"marketing",
	)
	require.NoError(t, err)

	reqBody := dto.BulkAddBlocksRequest{
		ContentItemIDs: testData.ContentItemIDs[:1],
		BlockType:      "news",
	}
	bodyJSON, _ := json.Marshal(reqBody)

	url := fmt.Sprintf("%s/v1/newsletter-issues/%s/blocks/bulk", server.BaseURL, testData.IssueID)
	req, _ := http.NewRequest(http.MethodPost, url, bytes.NewReader(bodyJSON))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusBadRequest, resp.StatusCode, "expected 400 Bad Request")
}

// TestBulkAddBlocks_IssueNotFound tests handling of non-existent issue
func TestBulkAddBlocks_IssueNotFound(t *testing.T) {
	db := SetupTestDB(t)
	defer TeardownTestDB(t, db)

	server := SetupTestServer(t, db)
	defer TeardownTestServer(t, server)

	testData := setupNewsletterTestData(t, db, "marketing")

	tokens, err := server.JWTService.GenerateTokenPair(
		testData.UserID,
		fmt.Sprintf("user-%s@test.com", testData.UserID.String()[:8]),
		"marketing",
	)
	require.NoError(t, err)

	reqBody := dto.BulkAddBlocksRequest{
		ContentItemIDs: testData.ContentItemIDs[:1],
		BlockType:      "news",
	}
	bodyJSON, _ := json.Marshal(reqBody)

	// Use non-existent issue ID
	nonExistentID := uuid.New()
	url := fmt.Sprintf("%s/v1/newsletter-issues/%s/blocks/bulk", server.BaseURL, nonExistentID)
	req, _ := http.NewRequest(http.MethodPost, url, bytes.NewReader(bodyJSON))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusNotFound, resp.StatusCode, "expected 404 Not Found")
}

// TestBulkAddBlocks_UnauthorizedRole tests rejection for unauthorized roles
func TestBulkAddBlocks_UnauthorizedRole(t *testing.T) {
	db := SetupTestDB(t)
	defer TeardownTestDB(t, db)

	server := SetupTestServer(t, db)
	defer TeardownTestServer(t, server)

	// Create test data with regular user role
	testData := setupNewsletterTestData(t, db, "user")

	tokens, err := server.JWTService.GenerateTokenPair(
		testData.UserID,
		fmt.Sprintf("user-%s@test.com", testData.UserID.String()[:8]),
		"user",
	)
	require.NoError(t, err)

	reqBody := dto.BulkAddBlocksRequest{
		ContentItemIDs: testData.ContentItemIDs[:1],
		BlockType:      "news",
	}
	bodyJSON, _ := json.Marshal(reqBody)

	url := fmt.Sprintf("%s/v1/newsletter-issues/%s/blocks/bulk", server.BaseURL, testData.IssueID)
	req, _ := http.NewRequest(http.MethodPost, url, bytes.NewReader(bodyJSON))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusForbidden, resp.StatusCode, "expected 403 Forbidden")
}

// TestBulkAddBlocks_AdminAccess tests that admin role can add blocks
func TestBulkAddBlocks_AdminAccess(t *testing.T) {
	db := SetupTestDB(t)
	defer TeardownTestDB(t, db)

	server := SetupTestServer(t, db)
	defer TeardownTestServer(t, server)

	// Create test data with admin role
	testData := setupNewsletterTestData(t, db, "admin")

	tokens, err := server.JWTService.GenerateTokenPair(
		testData.UserID,
		fmt.Sprintf("user-%s@test.com", testData.UserID.String()[:8]),
		"admin",
	)
	require.NoError(t, err)

	reqBody := dto.BulkAddBlocksRequest{
		ContentItemIDs: testData.ContentItemIDs[:1],
		BlockType:      "news",
	}
	bodyJSON, _ := json.Marshal(reqBody)

	url := fmt.Sprintf("%s/v1/newsletter-issues/%s/blocks/bulk", server.BaseURL, testData.IssueID)
	req, _ := http.NewRequest(http.MethodPost, url, bytes.NewReader(bodyJSON))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusCreated, resp.StatusCode, "admin should be able to add blocks")
}

// TestBulkAddBlocks_InvalidBlockType tests rejection of invalid block type
func TestBulkAddBlocks_InvalidBlockType(t *testing.T) {
	db := SetupTestDB(t)
	defer TeardownTestDB(t, db)

	server := SetupTestServer(t, db)
	defer TeardownTestServer(t, server)

	testData := setupNewsletterTestData(t, db, "marketing")

	tokens, err := server.JWTService.GenerateTokenPair(
		testData.UserID,
		fmt.Sprintf("user-%s@test.com", testData.UserID.String()[:8]),
		"marketing",
	)
	require.NoError(t, err)

	reqBody := dto.BulkAddBlocksRequest{
		ContentItemIDs: testData.ContentItemIDs[:1],
		BlockType:      "invalid_type",
	}
	bodyJSON, _ := json.Marshal(reqBody)

	url := fmt.Sprintf("%s/v1/newsletter-issues/%s/blocks/bulk", server.BaseURL, testData.IssueID)
	req, _ := http.NewRequest(http.MethodPost, url, bytes.NewReader(bodyJSON))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusBadRequest, resp.StatusCode, "invalid block type should return 400")
}

// TestBulkAddBlocks_EmptyContentItems tests rejection of empty content items array
func TestBulkAddBlocks_EmptyContentItems(t *testing.T) {
	db := SetupTestDB(t)
	defer TeardownTestDB(t, db)

	server := SetupTestServer(t, db)
	defer TeardownTestServer(t, server)

	testData := setupNewsletterTestData(t, db, "marketing")

	tokens, err := server.JWTService.GenerateTokenPair(
		testData.UserID,
		fmt.Sprintf("user-%s@test.com", testData.UserID.String()[:8]),
		"marketing",
	)
	require.NoError(t, err)

	reqBody := dto.BulkAddBlocksRequest{
		ContentItemIDs: []uuid.UUID{},
		BlockType:      "news",
	}
	bodyJSON, _ := json.Marshal(reqBody)

	url := fmt.Sprintf("%s/v1/newsletter-issues/%s/blocks/bulk", server.BaseURL, testData.IssueID)
	req, _ := http.NewRequest(http.MethodPost, url, bytes.NewReader(bodyJSON))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusBadRequest, resp.StatusCode, "empty content items should return 400")
}

// TestBulkAddBlocks_Unauthenticated tests rejection without authentication
func TestBulkAddBlocks_Unauthenticated(t *testing.T) {
	db := SetupTestDB(t)
	defer TeardownTestDB(t, db)

	server := SetupTestServer(t, db)
	defer TeardownTestServer(t, server)

	testData := setupNewsletterTestData(t, db, "marketing")

	reqBody := dto.BulkAddBlocksRequest{
		ContentItemIDs: testData.ContentItemIDs[:1],
		BlockType:      "news",
	}
	bodyJSON, _ := json.Marshal(reqBody)

	url := fmt.Sprintf("%s/v1/newsletter-issues/%s/blocks/bulk", server.BaseURL, testData.IssueID)
	req, _ := http.NewRequest(http.MethodPost, url, bytes.NewReader(bodyJSON))
	req.Header.Set("Content-Type", "application/json")
	// No Authorization header

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode, "unauthenticated request should return 401")
}

// TestBulkAddBlocks_ContentItemNotFound tests handling of non-existent content items
func TestBulkAddBlocks_ContentItemNotFound(t *testing.T) {
	db := SetupTestDB(t)
	defer TeardownTestDB(t, db)

	server := SetupTestServer(t, db)
	defer TeardownTestServer(t, server)

	testData := setupNewsletterTestData(t, db, "marketing")

	tokens, err := server.JWTService.GenerateTokenPair(
		testData.UserID,
		fmt.Sprintf("user-%s@test.com", testData.UserID.String()[:8]),
		"marketing",
	)
	require.NoError(t, err)

	// Mix valid and invalid IDs
	reqBody := dto.BulkAddBlocksRequest{
		ContentItemIDs: []uuid.UUID{
			testData.ContentItemIDs[0],
			uuid.New(), // Non-existent
		},
		BlockType: "news",
	}
	bodyJSON, _ := json.Marshal(reqBody)

	url := fmt.Sprintf("%s/v1/newsletter-issues/%s/blocks/bulk", server.BaseURL, testData.IssueID)
	req, _ := http.NewRequest(http.MethodPost, url, bytes.NewReader(bodyJSON))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusBadRequest, resp.StatusCode, "non-existent content items should return 400")
}

// TestBulkAddBlocks_PositionPersistence tests that block positions persist after reload
func TestBulkAddBlocks_PositionPersistence(t *testing.T) {
	db := SetupTestDB(t)
	defer TeardownTestDB(t, db)

	server := SetupTestServer(t, db)
	defer TeardownTestServer(t, server)

	testData := setupNewsletterTestData(t, db, "marketing")

	tokens, err := server.JWTService.GenerateTokenPair(
		testData.UserID,
		fmt.Sprintf("user-%s@test.com", testData.UserID.String()[:8]),
		"marketing",
	)
	require.NoError(t, err)

	// Add blocks
	reqBody := dto.BulkAddBlocksRequest{
		ContentItemIDs: testData.ContentItemIDs,
		BlockType:      "news",
	}
	bodyJSON, _ := json.Marshal(reqBody)

	url := fmt.Sprintf("%s/v1/newsletter-issues/%s/blocks/bulk", server.BaseURL, testData.IssueID)
	req, _ := http.NewRequest(http.MethodPost, url, bytes.NewReader(bodyJSON))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	require.NoError(t, err)
	resp.Body.Close()
	require.Equal(t, http.StatusCreated, resp.StatusCode)

	// Query directly from database to verify persistence
	ctx := context.Background()
	rows, err := db.DB.Pool.Query(ctx,
		`SELECT position FROM newsletter_blocks WHERE issue_id = $1 ORDER BY position`,
		testData.IssueID)
	require.NoError(t, err)
	defer rows.Close()

	var positions []int
	for rows.Next() {
		var pos int
		require.NoError(t, rows.Scan(&pos))
		positions = append(positions, pos)
	}

	// Verify positions are 0, 1, 2
	assert.Equal(t, []int{0, 1, 2}, positions, "positions should persist correctly")
}

// TestBulkAddBlocks_Repository_BulkCreateWithLock tests the repository directly
func TestBulkAddBlocks_Repository_BulkCreateWithLock(t *testing.T) {
	db := SetupTestDB(t)
	defer TeardownTestDB(t, db)

	ctx := context.Background()

	// Create test user
	userID := uuid.New()
	passwordHash, _ := crypto.HashPassword("TestPass123!")
	_, err := db.DB.Pool.Exec(ctx,
		`INSERT INTO users (id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5)`,
		userID, "repo-test@test.com", passwordHash, "Repo Test User", "marketing")
	require.NoError(t, err)

	// Create content source
	sourceID := uuid.New()
	_, err = db.DB.Pool.Exec(ctx,
		`INSERT INTO content_sources (id, name, source_type, is_active, created_by) VALUES ($1, $2, $3, $4, $5)`,
		sourceID, "Test Source", "manual", true, userID)
	require.NoError(t, err)

	// Create segment
	segmentID := uuid.New()
	_, err = db.DB.Pool.Exec(ctx,
		`INSERT INTO segments (id, name, is_active, created_by) VALUES ($1, $2, $3, $4)`,
		segmentID, "Test Segment", true, userID)
	require.NoError(t, err)

	// Create configuration
	configID := uuid.New()
	_, err = db.DB.Pool.Exec(ctx,
		`INSERT INTO newsletter_configurations (id, name, segment_id, is_active, created_by) VALUES ($1, $2, $3, $4, $5)`,
		configID, "Test Config", segmentID, true, userID)
	require.NoError(t, err)

	// Create issue
	issueID := uuid.New()
	_, err = db.DB.Pool.Exec(ctx,
		`INSERT INTO newsletter_issues
			(id, configuration_id, segment_id, issue_number, issue_date, subject_lines, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		issueID, configID, segmentID, 1, time.Now(), `["Test"]`, "draft")
	require.NoError(t, err)

	// Create repository
	repo := postgres.NewNewsletterBlockRepository(db.DB)

	// Create blocks
	now := time.Now()
	title1 := "Test Block 1"
	title2 := "Test Block 2"
	blocks := []*domain.NewsletterBlock{
		{
			ID:        uuid.New(),
			IssueID:   issueID,
			BlockType: domain.BlockTypeNews,
			Title:     &title1,
			CreatedAt: now,
			UpdatedAt: now,
		},
		{
			ID:        uuid.New(),
			IssueID:   issueID,
			BlockType: domain.BlockTypeNews,
			Title:     &title2,
			CreatedAt: now,
			UpdatedAt: now,
		},
	}

	// Call BulkCreateWithLock
	err = repo.BulkCreateWithLock(ctx, issueID, blocks)
	require.NoError(t, err)

	// Verify positions were assigned
	assert.Equal(t, 0, blocks[0].Position, "first block should be at position 0")
	assert.Equal(t, 1, blocks[1].Position, "second block should be at position 1")

	// Verify in database
	var count int
	err = db.DB.Pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM newsletter_blocks WHERE issue_id = $1`,
		issueID).Scan(&count)
	require.NoError(t, err)
	assert.Equal(t, 2, count, "should have 2 blocks in database")
}

// StringPtr is a helper for creating string pointers (re-export from handlers for tests)
func StringPtr(s string) *string {
	return &s
}
