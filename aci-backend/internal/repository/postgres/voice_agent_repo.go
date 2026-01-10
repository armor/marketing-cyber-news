package postgres

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/phillipboles/aci-backend/internal/domain/voice"
	"github.com/phillipboles/aci-backend/internal/repository"
)

// =============================================================================
// Voice Agent Repository
// =============================================================================

type voiceAgentRepository struct {
	db *DB
}

// NewVoiceAgentRepository creates a new PostgreSQL voice agent repository
func NewVoiceAgentRepository(db *DB) repository.VoiceAgentRepository {
	if db == nil {
		panic("database cannot be nil")
	}
	return &voiceAgentRepository{db: db}
}

// Create creates a new voice agent
func (r *voiceAgentRepository) Create(ctx context.Context, agent *voice.VoiceAgent) error {
	if agent == nil {
		return fmt.Errorf("agent cannot be nil")
	}

	if err := agent.Validate(); err != nil {
		return fmt.Errorf("invalid agent: %w", err)
	}

	query := `
		INSERT INTO voice_agents (
			id, name, description, system_prompt, temperature, max_tokens,
			status, version, created_by, created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`

	_, err := r.db.Pool.Exec(ctx, query,
		agent.ID,
		agent.Name,
		agent.Description,
		agent.SystemPrompt,
		agent.Temperature,
		agent.MaxTokens,
		agent.Status,
		agent.Version,
		agent.CreatedBy,
		agent.CreatedAt,
		agent.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create voice agent: %w", err)
	}

	return nil
}

// GetByID retrieves a voice agent by ID
func (r *voiceAgentRepository) GetByID(ctx context.Context, id uuid.UUID) (*voice.VoiceAgent, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("agent ID cannot be nil")
	}

	query := `
		SELECT
			id, name, description, system_prompt, temperature, max_tokens,
			status, version, created_by, created_at, updated_at, deleted_at
		FROM voice_agents
		WHERE id = $1 AND deleted_at IS NULL
	`

	agent, err := r.scanAgent(r.db.Pool.QueryRow(ctx, query, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("voice agent not found: %w", err)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get voice agent: %w", err)
	}

	return agent, nil
}

// GetByName retrieves a voice agent by name
func (r *voiceAgentRepository) GetByName(ctx context.Context, name string) (*voice.VoiceAgent, error) {
	if name == "" {
		return nil, fmt.Errorf("agent name cannot be empty")
	}

	query := `
		SELECT
			id, name, description, system_prompt, temperature, max_tokens,
			status, version, created_by, created_at, updated_at, deleted_at
		FROM voice_agents
		WHERE name = $1 AND deleted_at IS NULL
	`

	agent, err := r.scanAgent(r.db.Pool.QueryRow(ctx, query, name))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("voice agent not found: %w", err)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get voice agent: %w", err)
	}

	return agent, nil
}

// List retrieves voice agents with filtering and pagination
func (r *voiceAgentRepository) List(ctx context.Context, filter *voice.VoiceAgentFilter) ([]*voice.VoiceAgent, int, error) {
	if filter == nil {
		filter = &voice.VoiceAgentFilter{}
	}
	filter.WithDefaults()

	if err := filter.Validate(); err != nil {
		return nil, 0, fmt.Errorf("invalid filter: %w", err)
	}

	// Build dynamic query
	whereClause, args := r.buildWhereClause(filter)

	// Count query
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM voice_agents %s`, whereClause)
	var total int
	if err := r.db.Pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count voice agents: %w", err)
	}

	// Data query with pagination
	argOffset := len(args) + 1
	args = append(args, filter.PageSize, filter.Offset())
	dataQuery := fmt.Sprintf(`
		SELECT
			id, name, description, system_prompt, temperature, max_tokens,
			status, version, created_by, created_at, updated_at, deleted_at
		FROM voice_agents
		%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argOffset, argOffset+1)

	rows, err := r.db.Pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list voice agents: %w", err)
	}
	defer rows.Close()

	agents := make([]*voice.VoiceAgent, 0)
	for rows.Next() {
		agent, err := r.scanAgentFromRows(rows)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan voice agent: %w", err)
		}
		agents = append(agents, agent)
	}

	if err = rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating voice agents: %w", err)
	}

	return agents, total, nil
}

// Update updates an existing voice agent
func (r *voiceAgentRepository) Update(ctx context.Context, agent *voice.VoiceAgent) error {
	if agent == nil {
		return fmt.Errorf("agent cannot be nil")
	}

	if err := agent.Validate(); err != nil {
		return fmt.Errorf("invalid agent: %w", err)
	}

	query := `
		UPDATE voice_agents
		SET
			name = $2,
			description = $3,
			system_prompt = $4,
			temperature = $5,
			max_tokens = $6,
			status = $7,
			version = version + 1,
			updated_at = $8
		WHERE id = $1 AND deleted_at IS NULL
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query,
		agent.ID,
		agent.Name,
		agent.Description,
		agent.SystemPrompt,
		agent.Temperature,
		agent.MaxTokens,
		agent.Status,
		time.Now(),
	)

	if err != nil {
		return fmt.Errorf("failed to update voice agent: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("voice agent not found")
	}

	return nil
}

// Delete soft-deletes a voice agent
func (r *voiceAgentRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("agent ID cannot be nil")
	}

	query := `UPDATE voice_agents SET deleted_at = $2, updated_at = $2 WHERE id = $1 AND deleted_at IS NULL`

	now := time.Now()
	cmdTag, err := r.db.Pool.Exec(ctx, query, id, now)
	if err != nil {
		return fmt.Errorf("failed to delete voice agent: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("voice agent not found")
	}

	return nil
}

// ListActive retrieves all active voice agents
func (r *voiceAgentRepository) ListActive(ctx context.Context) ([]*voice.VoiceAgent, error) {
	query := `
		SELECT
			id, name, description, system_prompt, temperature, max_tokens,
			status, version, created_by, created_at, updated_at, deleted_at
		FROM voice_agents
		WHERE status = 'active' AND deleted_at IS NULL
		ORDER BY name
	`

	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to list active voice agents: %w", err)
	}
	defer rows.Close()

	return r.scanAgents(rows)
}

// UpdateStatus updates the status of a voice agent
func (r *voiceAgentRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status voice.VoiceAgentStatus) error {
	if id == uuid.Nil {
		return fmt.Errorf("agent ID cannot be nil")
	}

	if !status.IsValid() {
		return fmt.Errorf("invalid status: %s", status)
	}

	query := `
		UPDATE voice_agents
		SET status = $2, updated_at = $3
		WHERE id = $1 AND deleted_at IS NULL
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id, status, time.Now())
	if err != nil {
		return fmt.Errorf("failed to update voice agent status: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("voice agent not found")
	}

	return nil
}

// GetWithRulesAndExamples retrieves a voice agent with its style rules and examples
func (r *voiceAgentRepository) GetWithRulesAndExamples(ctx context.Context, id uuid.UUID) (*voice.VoiceAgent, error) {
	agent, err := r.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Fetch style rules
	rulesQuery := `
		SELECT id, agent_id, rule_type, rule_text, sort_order, created_at
		FROM voice_agent_style_rules
		WHERE agent_id = $1
		ORDER BY sort_order, created_at
	`

	rulesRows, err := r.db.Pool.Query(ctx, rulesQuery, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get style rules: %w", err)
	}
	defer rulesRows.Close()

	rules := make([]voice.StyleRule, 0)
	for rulesRows.Next() {
		var rule voice.StyleRule
		if err := rulesRows.Scan(
			&rule.ID,
			&rule.AgentID,
			&rule.RuleType,
			&rule.RuleText,
			&rule.SortOrder,
			&rule.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan style rule: %w", err)
		}
		rules = append(rules, rule)
	}
	if err = rulesRows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating style rules: %w", err)
	}
	agent.StyleRules = rules

	// Fetch examples
	examplesQuery := `
		SELECT id, agent_id, before_text, after_text, context, sort_order, created_at
		FROM voice_agent_examples
		WHERE agent_id = $1
		ORDER BY sort_order, created_at
	`

	examplesRows, err := r.db.Pool.Query(ctx, examplesQuery, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get examples: %w", err)
	}
	defer examplesRows.Close()

	examples := make([]voice.Example, 0)
	for examplesRows.Next() {
		var example voice.Example
		if err := examplesRows.Scan(
			&example.ID,
			&example.AgentID,
			&example.BeforeText,
			&example.AfterText,
			&example.Context,
			&example.SortOrder,
			&example.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan example: %w", err)
		}
		examples = append(examples, example)
	}
	if err = examplesRows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating examples: %w", err)
	}
	agent.Examples = examples

	return agent, nil
}

// Helper methods

func (r *voiceAgentRepository) buildWhereClause(filter *voice.VoiceAgentFilter) (string, []interface{}) {
	conditions := []string{"deleted_at IS NULL"}
	args := make([]interface{}, 0)
	argIndex := 1

	if filter.Status != nil {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, *filter.Status)
		argIndex++
	}

	if filter.SearchText != nil && *filter.SearchText != "" {
		conditions = append(conditions, fmt.Sprintf("name ILIKE $%d", argIndex))
		args = append(args, "%"+*filter.SearchText+"%")
		argIndex++
	}

	if filter.CreatedBy != nil {
		conditions = append(conditions, fmt.Sprintf("created_by = $%d", argIndex))
		args = append(args, *filter.CreatedBy)
		argIndex++
	}

	return "WHERE " + strings.Join(conditions, " AND "), args
}

func (r *voiceAgentRepository) scanAgent(row pgx.Row) (*voice.VoiceAgent, error) {
	agent := &voice.VoiceAgent{}

	err := row.Scan(
		&agent.ID,
		&agent.Name,
		&agent.Description,
		&agent.SystemPrompt,
		&agent.Temperature,
		&agent.MaxTokens,
		&agent.Status,
		&agent.Version,
		&agent.CreatedBy,
		&agent.CreatedAt,
		&agent.UpdatedAt,
		&agent.DeletedAt,
	)

	if err != nil {
		return nil, err
	}

	return agent, nil
}

func (r *voiceAgentRepository) scanAgentFromRows(rows pgx.Rows) (*voice.VoiceAgent, error) {
	agent := &voice.VoiceAgent{}

	err := rows.Scan(
		&agent.ID,
		&agent.Name,
		&agent.Description,
		&agent.SystemPrompt,
		&agent.Temperature,
		&agent.MaxTokens,
		&agent.Status,
		&agent.Version,
		&agent.CreatedBy,
		&agent.CreatedAt,
		&agent.UpdatedAt,
		&agent.DeletedAt,
	)

	if err != nil {
		return nil, err
	}

	return agent, nil
}

func (r *voiceAgentRepository) scanAgents(rows pgx.Rows) ([]*voice.VoiceAgent, error) {
	agents := make([]*voice.VoiceAgent, 0)
	for rows.Next() {
		agent, err := r.scanAgentFromRows(rows)
		if err != nil {
			return nil, err
		}
		agents = append(agents, agent)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return agents, nil
}

// =============================================================================
// Style Rule Repository
// =============================================================================

type styleRuleRepository struct {
	db *DB
}

// NewStyleRuleRepository creates a new PostgreSQL style rule repository
func NewStyleRuleRepository(db *DB) repository.StyleRuleRepository {
	if db == nil {
		panic("database cannot be nil")
	}
	return &styleRuleRepository{db: db}
}

// Create creates a new style rule
func (r *styleRuleRepository) Create(ctx context.Context, rule *voice.StyleRule) error {
	if rule == nil {
		return fmt.Errorf("rule cannot be nil")
	}

	if err := rule.Validate(); err != nil {
		return fmt.Errorf("invalid rule: %w", err)
	}

	query := `
		INSERT INTO voice_agent_style_rules (id, agent_id, rule_type, rule_text, sort_order, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`

	_, err := r.db.Pool.Exec(ctx, query,
		rule.ID,
		rule.AgentID,
		rule.RuleType,
		rule.RuleText,
		rule.SortOrder,
		rule.CreatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create style rule: %w", err)
	}

	return nil
}

// GetByID retrieves a style rule by ID
func (r *styleRuleRepository) GetByID(ctx context.Context, id uuid.UUID) (*voice.StyleRule, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("rule ID cannot be nil")
	}

	query := `
		SELECT id, agent_id, rule_type, rule_text, sort_order, created_at
		FROM voice_agent_style_rules
		WHERE id = $1
	`

	rule := &voice.StyleRule{}
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&rule.ID,
		&rule.AgentID,
		&rule.RuleType,
		&rule.RuleText,
		&rule.SortOrder,
		&rule.CreatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("style rule not found: %w", err)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get style rule: %w", err)
	}

	return rule, nil
}

// GetByAgentID retrieves all style rules for an agent
func (r *styleRuleRepository) GetByAgentID(ctx context.Context, agentID uuid.UUID) ([]voice.StyleRule, error) {
	if agentID == uuid.Nil {
		return nil, fmt.Errorf("agent ID cannot be nil")
	}

	query := `
		SELECT id, agent_id, rule_type, rule_text, sort_order, created_at
		FROM voice_agent_style_rules
		WHERE agent_id = $1
		ORDER BY sort_order, created_at
	`

	rows, err := r.db.Pool.Query(ctx, query, agentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get style rules: %w", err)
	}
	defer rows.Close()

	rules := make([]voice.StyleRule, 0)
	for rows.Next() {
		var rule voice.StyleRule
		if err := rows.Scan(
			&rule.ID,
			&rule.AgentID,
			&rule.RuleType,
			&rule.RuleText,
			&rule.SortOrder,
			&rule.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan style rule: %w", err)
		}
		rules = append(rules, rule)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating style rules: %w", err)
	}

	return rules, nil
}

// Update updates an existing style rule
func (r *styleRuleRepository) Update(ctx context.Context, rule *voice.StyleRule) error {
	if rule == nil {
		return fmt.Errorf("rule cannot be nil")
	}

	if err := rule.Validate(); err != nil {
		return fmt.Errorf("invalid rule: %w", err)
	}

	query := `
		UPDATE voice_agent_style_rules
		SET rule_type = $2, rule_text = $3, sort_order = $4
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query,
		rule.ID,
		rule.RuleType,
		rule.RuleText,
		rule.SortOrder,
	)

	if err != nil {
		return fmt.Errorf("failed to update style rule: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("style rule not found")
	}

	return nil
}

// Delete deletes a style rule
func (r *styleRuleRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("rule ID cannot be nil")
	}

	query := `DELETE FROM voice_agent_style_rules WHERE id = $1`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete style rule: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("style rule not found")
	}

	return nil
}

// DeleteByAgentID deletes all style rules for an agent
func (r *styleRuleRepository) DeleteByAgentID(ctx context.Context, agentID uuid.UUID) error {
	if agentID == uuid.Nil {
		return fmt.Errorf("agent ID cannot be nil")
	}

	query := `DELETE FROM voice_agent_style_rules WHERE agent_id = $1`

	_, err := r.db.Pool.Exec(ctx, query, agentID)
	if err != nil {
		return fmt.Errorf("failed to delete style rules: %w", err)
	}

	return nil
}

// BulkCreate creates multiple style rules
func (r *styleRuleRepository) BulkCreate(ctx context.Context, rules []voice.StyleRule) error {
	if len(rules) == 0 {
		return nil
	}

	batch := &pgx.Batch{}

	query := `
		INSERT INTO voice_agent_style_rules (id, agent_id, rule_type, rule_text, sort_order, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`

	for _, rule := range rules {
		if err := rule.Validate(); err != nil {
			return fmt.Errorf("invalid rule: %w", err)
		}
		batch.Queue(query, rule.ID, rule.AgentID, rule.RuleType, rule.RuleText, rule.SortOrder, rule.CreatedAt)
	}

	results := r.db.Pool.SendBatch(ctx, batch)
	defer results.Close()

	for i := 0; i < batch.Len(); i++ {
		_, err := results.Exec()
		if err != nil {
			return fmt.Errorf("failed to create style rule %d: %w", i, err)
		}
	}

	return nil
}

// UpdateSortOrder updates the sort order of multiple style rules
func (r *styleRuleRepository) UpdateSortOrder(ctx context.Context, agentID uuid.UUID, positions map[uuid.UUID]int) error {
	if len(positions) == 0 {
		return nil
	}

	batch := &pgx.Batch{}

	query := `UPDATE voice_agent_style_rules SET sort_order = $2 WHERE id = $1 AND agent_id = $3`

	for id, order := range positions {
		batch.Queue(query, id, order, agentID)
	}

	results := r.db.Pool.SendBatch(ctx, batch)
	defer results.Close()

	for i := 0; i < batch.Len(); i++ {
		_, err := results.Exec()
		if err != nil {
			return fmt.Errorf("failed to update sort order: %w", err)
		}
	}

	return nil
}

// =============================================================================
// Example Repository
// =============================================================================

type exampleRepository struct {
	db *DB
}

// NewExampleRepository creates a new PostgreSQL example repository
func NewExampleRepository(db *DB) repository.ExampleRepository {
	if db == nil {
		panic("database cannot be nil")
	}
	return &exampleRepository{db: db}
}

// Create creates a new example
func (r *exampleRepository) Create(ctx context.Context, example *voice.Example) error {
	if example == nil {
		return fmt.Errorf("example cannot be nil")
	}

	if err := example.Validate(); err != nil {
		return fmt.Errorf("invalid example: %w", err)
	}

	query := `
		INSERT INTO voice_agent_examples (id, agent_id, before_text, after_text, context, sort_order, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	_, err := r.db.Pool.Exec(ctx, query,
		example.ID,
		example.AgentID,
		example.BeforeText,
		example.AfterText,
		example.Context,
		example.SortOrder,
		example.CreatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create example: %w", err)
	}

	return nil
}

// GetByID retrieves an example by ID
func (r *exampleRepository) GetByID(ctx context.Context, id uuid.UUID) (*voice.Example, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("example ID cannot be nil")
	}

	query := `
		SELECT id, agent_id, before_text, after_text, context, sort_order, created_at
		FROM voice_agent_examples
		WHERE id = $1
	`

	example := &voice.Example{}
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&example.ID,
		&example.AgentID,
		&example.BeforeText,
		&example.AfterText,
		&example.Context,
		&example.SortOrder,
		&example.CreatedAt,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("example not found: %w", err)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get example: %w", err)
	}

	return example, nil
}

// GetByAgentID retrieves all examples for an agent
func (r *exampleRepository) GetByAgentID(ctx context.Context, agentID uuid.UUID) ([]voice.Example, error) {
	if agentID == uuid.Nil {
		return nil, fmt.Errorf("agent ID cannot be nil")
	}

	query := `
		SELECT id, agent_id, before_text, after_text, context, sort_order, created_at
		FROM voice_agent_examples
		WHERE agent_id = $1
		ORDER BY sort_order, created_at
	`

	rows, err := r.db.Pool.Query(ctx, query, agentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get examples: %w", err)
	}
	defer rows.Close()

	examples := make([]voice.Example, 0)
	for rows.Next() {
		var example voice.Example
		if err := rows.Scan(
			&example.ID,
			&example.AgentID,
			&example.BeforeText,
			&example.AfterText,
			&example.Context,
			&example.SortOrder,
			&example.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan example: %w", err)
		}
		examples = append(examples, example)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating examples: %w", err)
	}

	return examples, nil
}

// Update updates an existing example
func (r *exampleRepository) Update(ctx context.Context, example *voice.Example) error {
	if example == nil {
		return fmt.Errorf("example cannot be nil")
	}

	if err := example.Validate(); err != nil {
		return fmt.Errorf("invalid example: %w", err)
	}

	query := `
		UPDATE voice_agent_examples
		SET before_text = $2, after_text = $3, context = $4, sort_order = $5
		WHERE id = $1
	`

	cmdTag, err := r.db.Pool.Exec(ctx, query,
		example.ID,
		example.BeforeText,
		example.AfterText,
		example.Context,
		example.SortOrder,
	)

	if err != nil {
		return fmt.Errorf("failed to update example: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("example not found")
	}

	return nil
}

// Delete deletes an example
func (r *exampleRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("example ID cannot be nil")
	}

	query := `DELETE FROM voice_agent_examples WHERE id = $1`

	cmdTag, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete example: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		return fmt.Errorf("example not found")
	}

	return nil
}

// DeleteByAgentID deletes all examples for an agent
func (r *exampleRepository) DeleteByAgentID(ctx context.Context, agentID uuid.UUID) error {
	if agentID == uuid.Nil {
		return fmt.Errorf("agent ID cannot be nil")
	}

	query := `DELETE FROM voice_agent_examples WHERE agent_id = $1`

	_, err := r.db.Pool.Exec(ctx, query, agentID)
	if err != nil {
		return fmt.Errorf("failed to delete examples: %w", err)
	}

	return nil
}

// BulkCreate creates multiple examples
func (r *exampleRepository) BulkCreate(ctx context.Context, examples []voice.Example) error {
	if len(examples) == 0 {
		return nil
	}

	batch := &pgx.Batch{}

	query := `
		INSERT INTO voice_agent_examples (id, agent_id, before_text, after_text, context, sort_order, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	for _, example := range examples {
		if err := example.Validate(); err != nil {
			return fmt.Errorf("invalid example: %w", err)
		}
		batch.Queue(query, example.ID, example.AgentID, example.BeforeText, example.AfterText, example.Context, example.SortOrder, example.CreatedAt)
	}

	results := r.db.Pool.SendBatch(ctx, batch)
	defer results.Close()

	for i := 0; i < batch.Len(); i++ {
		_, err := results.Exec()
		if err != nil {
			return fmt.Errorf("failed to create example %d: %w", i, err)
		}
	}

	return nil
}

// UpdateSortOrder updates the sort order of multiple examples
func (r *exampleRepository) UpdateSortOrder(ctx context.Context, agentID uuid.UUID, positions map[uuid.UUID]int) error {
	if len(positions) == 0 {
		return nil
	}

	batch := &pgx.Batch{}

	query := `UPDATE voice_agent_examples SET sort_order = $2 WHERE id = $1 AND agent_id = $3`

	for id, order := range positions {
		batch.Queue(query, id, order, agentID)
	}

	results := r.db.Pool.SendBatch(ctx, batch)
	defer results.Close()

	for i := 0; i < batch.Len(); i++ {
		_, err := results.Exec()
		if err != nil {
			return fmt.Errorf("failed to update sort order: %w", err)
		}
	}

	return nil
}
