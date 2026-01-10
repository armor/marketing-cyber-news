package postgres

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/phillipboles/aci-backend/internal/domain/voice"
	"github.com/phillipboles/aci-backend/internal/repository"
)

// =============================================================================
// Transformation Repository
// =============================================================================

type transformationRepository struct {
	db *DB
}

// NewTransformationRepository creates a new PostgreSQL transformation repository
func NewTransformationRepository(db *DB) repository.TransformationRepository {
	if db == nil {
		panic("database cannot be nil")
	}
	return &transformationRepository{db: db}
}

// Create creates a new text transformation record
func (r *transformationRepository) Create(ctx context.Context, t *voice.TextTransformation) error {
	if t == nil {
		return fmt.Errorf("transformation cannot be nil")
	}

	if err := t.Validate(); err != nil {
		return fmt.Errorf("invalid transformation: %w", err)
	}

	query := `
		INSERT INTO text_transformations (
			id, request_id, agent_id, original_text, transformed_text,
			transformation_index, total_options, agent_config_snapshot,
			entity_type, entity_id, field_path,
			transformed_by, selected_at, tokens_used, latency_ms
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
	`

	_, err := r.db.Pool.Exec(ctx, query,
		t.ID,
		t.RequestID,
		t.AgentID,
		t.OriginalText,
		t.TransformedText,
		t.TransformationIndex,
		t.TotalOptions,
		t.AgentConfigSnapshot,
		t.EntityType,
		t.EntityID,
		t.FieldPath,
		t.TransformedBy,
		t.SelectedAt,
		t.TokensUsed,
		t.LatencyMs,
	)

	if err != nil {
		return fmt.Errorf("failed to create transformation: %w", err)
	}

	return nil
}

// GetByID retrieves a transformation by ID
func (r *transformationRepository) GetByID(ctx context.Context, id uuid.UUID) (*voice.TextTransformation, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("transformation ID cannot be nil")
	}

	query := `
		SELECT
			id, request_id, agent_id, original_text, transformed_text,
			transformation_index, total_options, agent_config_snapshot,
			entity_type, entity_id, field_path,
			transformed_by, selected_at, tokens_used, latency_ms
		FROM text_transformations
		WHERE id = $1
	`

	t, err := r.scanTransformation(r.db.Pool.QueryRow(ctx, query, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("transformation not found: %w", err)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get transformation: %w", err)
	}

	return t, nil
}

// GetByRequestID retrieves all transformations for a request
func (r *transformationRepository) GetByRequestID(ctx context.Context, requestID uuid.UUID) ([]*voice.TextTransformation, error) {
	if requestID == uuid.Nil {
		return nil, fmt.Errorf("request ID cannot be nil")
	}

	query := `
		SELECT
			id, request_id, agent_id, original_text, transformed_text,
			transformation_index, total_options, agent_config_snapshot,
			entity_type, entity_id, field_path,
			transformed_by, selected_at, tokens_used, latency_ms
		FROM text_transformations
		WHERE request_id = $1
		ORDER BY transformation_index
	`

	rows, err := r.db.Pool.Query(ctx, query, requestID)
	if err != nil {
		return nil, fmt.Errorf("failed to get transformations by request: %w", err)
	}
	defer rows.Close()

	return r.scanTransformations(rows)
}

// List retrieves transformations with filtering and pagination
func (r *transformationRepository) List(ctx context.Context, filter *voice.TransformationFilter) ([]*voice.TextTransformation, int, error) {
	if filter == nil {
		filter = &voice.TransformationFilter{}
	}
	filter.WithDefaults()

	if err := filter.Validate(); err != nil {
		return nil, 0, fmt.Errorf("invalid filter: %w", err)
	}

	// Build dynamic query
	whereClause, args := r.buildWhereClause(filter)

	// Count query
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM text_transformations %s`, whereClause)
	var total int
	if err := r.db.Pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count transformations: %w", err)
	}

	// Data query with pagination
	argOffset := len(args) + 1
	args = append(args, filter.PageSize, filter.Offset())
	dataQuery := fmt.Sprintf(`
		SELECT
			id, request_id, agent_id, original_text, transformed_text,
			transformation_index, total_options, agent_config_snapshot,
			entity_type, entity_id, field_path,
			transformed_by, selected_at, tokens_used, latency_ms
		FROM text_transformations
		%s
		ORDER BY selected_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argOffset, argOffset+1)

	rows, err := r.db.Pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list transformations: %w", err)
	}
	defer rows.Close()

	transformations, err := r.scanTransformations(rows)
	if err != nil {
		return nil, 0, err
	}

	return transformations, total, nil
}

// CountByAgent counts transformations for a specific agent
func (r *transformationRepository) CountByAgent(ctx context.Context, agentID uuid.UUID) (int, error) {
	if agentID == uuid.Nil {
		return 0, fmt.Errorf("agent ID cannot be nil")
	}

	query := `SELECT COUNT(*) FROM text_transformations WHERE agent_id = $1`

	var count int
	if err := r.db.Pool.QueryRow(ctx, query, agentID).Scan(&count); err != nil {
		return 0, fmt.Errorf("failed to count transformations: %w", err)
	}

	return count, nil
}

// CountByUser counts transformations for a specific user
func (r *transformationRepository) CountByUser(ctx context.Context, userID uuid.UUID) (int, error) {
	if userID == uuid.Nil {
		return 0, fmt.Errorf("user ID cannot be nil")
	}

	query := `SELECT COUNT(*) FROM text_transformations WHERE transformed_by = $1`

	var count int
	if err := r.db.Pool.QueryRow(ctx, query, userID).Scan(&count); err != nil {
		return 0, fmt.Errorf("failed to count transformations: %w", err)
	}

	return count, nil
}

// GetRecentByUser retrieves recent transformations for a user
func (r *transformationRepository) GetRecentByUser(ctx context.Context, userID uuid.UUID, limit int) ([]*voice.TextTransformation, error) {
	if userID == uuid.Nil {
		return nil, fmt.Errorf("user ID cannot be nil")
	}

	if limit <= 0 {
		limit = 10
	}

	query := `
		SELECT
			id, request_id, agent_id, original_text, transformed_text,
			transformation_index, total_options, agent_config_snapshot,
			entity_type, entity_id, field_path,
			transformed_by, selected_at, tokens_used, latency_ms
		FROM text_transformations
		WHERE transformed_by = $1
		ORDER BY selected_at DESC
		LIMIT $2
	`

	rows, err := r.db.Pool.Query(ctx, query, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent transformations: %w", err)
	}
	defer rows.Close()

	return r.scanTransformations(rows)
}

// Helper methods

func (r *transformationRepository) buildWhereClause(filter *voice.TransformationFilter) (string, []interface{}) {
	conditions := make([]string, 0)
	args := make([]interface{}, 0)
	argIndex := 1

	if filter.AgentID != nil {
		conditions = append(conditions, fmt.Sprintf("agent_id = $%d", argIndex))
		args = append(args, *filter.AgentID)
		argIndex++
	}

	if filter.TransformedBy != nil {
		conditions = append(conditions, fmt.Sprintf("transformed_by = $%d", argIndex))
		args = append(args, *filter.TransformedBy)
		argIndex++
	}

	if filter.EntityType != nil && *filter.EntityType != "" {
		conditions = append(conditions, fmt.Sprintf("entity_type = $%d", argIndex))
		args = append(args, *filter.EntityType)
		argIndex++
	}

	if filter.EntityID != nil {
		conditions = append(conditions, fmt.Sprintf("entity_id = $%d", argIndex))
		args = append(args, *filter.EntityID)
		argIndex++
	}

	if filter.StartDate != nil {
		conditions = append(conditions, fmt.Sprintf("selected_at >= $%d", argIndex))
		args = append(args, *filter.StartDate)
		argIndex++
	}

	if filter.EndDate != nil {
		conditions = append(conditions, fmt.Sprintf("selected_at <= $%d", argIndex))
		args = append(args, *filter.EndDate)
		argIndex++
	}

	if len(conditions) == 0 {
		return "", args
	}

	return "WHERE " + strings.Join(conditions, " AND "), args
}

func (r *transformationRepository) scanTransformation(row pgx.Row) (*voice.TextTransformation, error) {
	t := &voice.TextTransformation{}

	err := row.Scan(
		&t.ID,
		&t.RequestID,
		&t.AgentID,
		&t.OriginalText,
		&t.TransformedText,
		&t.TransformationIndex,
		&t.TotalOptions,
		&t.AgentConfigSnapshot,
		&t.EntityType,
		&t.EntityID,
		&t.FieldPath,
		&t.TransformedBy,
		&t.SelectedAt,
		&t.TokensUsed,
		&t.LatencyMs,
	)

	if err != nil {
		return nil, err
	}

	return t, nil
}

func (r *transformationRepository) scanTransformationFromRows(rows pgx.Rows) (*voice.TextTransformation, error) {
	t := &voice.TextTransformation{}

	err := rows.Scan(
		&t.ID,
		&t.RequestID,
		&t.AgentID,
		&t.OriginalText,
		&t.TransformedText,
		&t.TransformationIndex,
		&t.TotalOptions,
		&t.AgentConfigSnapshot,
		&t.EntityType,
		&t.EntityID,
		&t.FieldPath,
		&t.TransformedBy,
		&t.SelectedAt,
		&t.TokensUsed,
		&t.LatencyMs,
	)

	if err != nil {
		return nil, err
	}

	return t, nil
}

func (r *transformationRepository) scanTransformations(rows pgx.Rows) ([]*voice.TextTransformation, error) {
	transformations := make([]*voice.TextTransformation, 0)
	for rows.Next() {
		t, err := r.scanTransformationFromRows(rows)
		if err != nil {
			return nil, fmt.Errorf("failed to scan transformation: %w", err)
		}
		transformations = append(transformations, t)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating transformations: %w", err)
	}

	return transformations, nil
}
