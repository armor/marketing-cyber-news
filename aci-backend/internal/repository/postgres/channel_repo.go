package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/repository"
)

type channelConnectionRepository struct {
	db *DB
}

// NewChannelConnectionRepository creates a new PostgreSQL channel connection repository
func NewChannelConnectionRepository(db *DB) repository.ChannelConnectionRepository {
	if db == nil {
		panic("database cannot be nil")
	}
	return &channelConnectionRepository{db: db}
}

// Create creates a new channel connection
func (r *channelConnectionRepository) Create(ctx context.Context, connection *domain.ChannelConnection) error {
	if connection == nil {
		return fmt.Errorf("connection cannot be nil")
	}

	if err := connection.Validate(); err != nil {
		return fmt.Errorf("invalid connection: %w", err)
	}

	metadataJSON, err := json.Marshal(connection.Metadata)
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}

	query := `
		INSERT INTO channel_connections (
			id, tenant_id, channel, account_name, account_id, status,
			credentials_encrypted, n8n_credential_id, metadata,
			last_used_at, expires_at, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
		)
	`

	_, err = r.db.Pool.Exec(ctx, query,
		connection.ID,
		connection.TenantID,
		connection.Channel,
		connection.AccountName,
		connection.AccountID,
		connection.Status,
		connection.CredentialsEncrypted,
		connection.N8nCredentialID,
		metadataJSON,
		connection.LastUsedAt,
		connection.ExpiresAt,
		connection.CreatedAt,
		connection.UpdatedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create channel connection: %w", err)
	}

	return nil
}

// GetByID retrieves a channel connection by ID
func (r *channelConnectionRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.ChannelConnection, error) {
	if id == uuid.Nil {
		return nil, fmt.Errorf("connection ID cannot be nil")
	}

	query := `
		SELECT
			id, tenant_id, channel, account_name, account_id, status,
			credentials_encrypted, n8n_credential_id, metadata,
			last_used_at, expires_at, created_at, updated_at
		FROM channel_connections
		WHERE id = $1
	`

	var connection domain.ChannelConnection
	var metadataJSON []byte

	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&connection.ID,
		&connection.TenantID,
		&connection.Channel,
		&connection.AccountName,
		&connection.AccountID,
		&connection.Status,
		&connection.CredentialsEncrypted,
		&connection.N8nCredentialID,
		&metadataJSON,
		&connection.LastUsedAt,
		&connection.ExpiresAt,
		&connection.CreatedAt,
		&connection.UpdatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("connection not found: %s", id)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to query connection: %w", err)
	}

	if len(metadataJSON) > 0 {
		if err := json.Unmarshal(metadataJSON, &connection.Metadata); err != nil {
			return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
		}
	}

	return &connection, nil
}

// GetByTenantAndChannel retrieves a channel connection by tenant and channel
func (r *channelConnectionRepository) GetByTenantAndChannel(ctx context.Context, tenantID uuid.UUID, channel domain.Channel) (*domain.ChannelConnection, error) {
	if tenantID == uuid.Nil {
		return nil, fmt.Errorf("tenant ID cannot be nil")
	}

	if !channel.IsValid() {
		return nil, fmt.Errorf("invalid channel: %s", channel)
	}

	query := `
		SELECT
			id, tenant_id, channel, account_name, account_id, status,
			credentials_encrypted, n8n_credential_id, metadata,
			last_used_at, expires_at, created_at, updated_at
		FROM channel_connections
		WHERE tenant_id = $1 AND channel = $2
		ORDER BY created_at DESC
		LIMIT 1
	`

	var connection domain.ChannelConnection
	var metadataJSON []byte

	err := r.db.Pool.QueryRow(ctx, query, tenantID, channel).Scan(
		&connection.ID,
		&connection.TenantID,
		&connection.Channel,
		&connection.AccountName,
		&connection.AccountID,
		&connection.Status,
		&connection.CredentialsEncrypted,
		&connection.N8nCredentialID,
		&metadataJSON,
		&connection.LastUsedAt,
		&connection.ExpiresAt,
		&connection.CreatedAt,
		&connection.UpdatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("connection not found for tenant %s and channel %s", tenantID, channel)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to query connection: %w", err)
	}

	if len(metadataJSON) > 0 {
		if err := json.Unmarshal(metadataJSON, &connection.Metadata); err != nil {
			return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
		}
	}

	return &connection, nil
}

// List retrieves channel connections with filtering and pagination
func (r *channelConnectionRepository) List(ctx context.Context, filter *domain.ChannelConnectionFilter) ([]*domain.ChannelConnection, int, error) {
	if filter == nil {
		return nil, 0, fmt.Errorf("filter cannot be nil")
	}

	if err := filter.Validate(); err != nil {
		return nil, 0, fmt.Errorf("invalid filter: %w", err)
	}

	filter = filter.WithDefaults()

	// Build WHERE clause
	where := []string{"tenant_id = $1"}
	args := []interface{}{filter.TenantID}
	argCount := 1

	if filter.Channel != nil {
		argCount++
		where = append(where, fmt.Sprintf("channel = $%d", argCount))
		args = append(args, *filter.Channel)
	}

	if filter.Status != nil {
		argCount++
		where = append(where, fmt.Sprintf("status = $%d", argCount))
		args = append(args, *filter.Status)
	}

	whereClause := strings.Join(where, " AND ")

	// Count total matching connections
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM channel_connections
		WHERE %s
	`, whereClause)

	var total int
	err := r.db.Pool.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count connections: %w", err)
	}

	if total == 0 {
		return []*domain.ChannelConnection{}, 0, nil
	}

	// Query connections with pagination
	query := fmt.Sprintf(`
		SELECT
			id, tenant_id, channel, account_name, account_id, status,
			credentials_encrypted, n8n_credential_id, metadata,
			last_used_at, expires_at, created_at, updated_at
		FROM channel_connections
		WHERE %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argCount+1, argCount+2)

	args = append(args, filter.Limit(), filter.Offset())

	rows, err := r.db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query connections: %w", err)
	}
	defer rows.Close()

	connections := make([]*domain.ChannelConnection, 0)
	for rows.Next() {
		connection, err := r.scanConnection(rows)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan connection: %w", err)
		}
		connections = append(connections, connection)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating rows: %w", err)
	}

	return connections, total, nil
}

// Update updates an existing channel connection
func (r *channelConnectionRepository) Update(ctx context.Context, connection *domain.ChannelConnection) error {
	if connection == nil {
		return fmt.Errorf("connection cannot be nil")
	}

	if connection.ID == uuid.Nil {
		return fmt.Errorf("connection ID cannot be nil")
	}

	if err := connection.Validate(); err != nil {
		return fmt.Errorf("invalid connection: %w", err)
	}

	metadataJSON, err := json.Marshal(connection.Metadata)
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}

	query := `
		UPDATE channel_connections
		SET
			account_name = $1,
			account_id = $2,
			status = $3,
			credentials_encrypted = $4,
			n8n_credential_id = $5,
			metadata = $6,
			last_used_at = $7,
			expires_at = $8,
			updated_at = $9
		WHERE id = $10
	`

	connection.UpdatedAt = time.Now()

	result, err := r.db.Pool.Exec(ctx, query,
		connection.AccountName,
		connection.AccountID,
		connection.Status,
		connection.CredentialsEncrypted,
		connection.N8nCredentialID,
		metadataJSON,
		connection.LastUsedAt,
		connection.ExpiresAt,
		connection.UpdatedAt,
		connection.ID,
	)

	if err != nil {
		return fmt.Errorf("failed to update connection: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("connection not found: %s", connection.ID)
	}

	return nil
}

// Delete deletes a channel connection by ID
func (r *channelConnectionRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("connection ID cannot be nil")
	}

	query := `
		DELETE FROM channel_connections
		WHERE id = $1
	`

	result, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete connection: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("connection not found: %s", id)
	}

	return nil
}

// UpdateStatus updates the connection status
func (r *channelConnectionRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.ConnectionStatus) error {
	if id == uuid.Nil {
		return fmt.Errorf("connection ID cannot be nil")
	}

	if !status.IsValid() {
		return fmt.Errorf("invalid status: %s", status)
	}

	query := `
		UPDATE channel_connections
		SET status = $1, updated_at = $2
		WHERE id = $3
	`

	result, err := r.db.Pool.Exec(ctx, query, status, time.Now(), id)
	if err != nil {
		return fmt.Errorf("failed to update connection status: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("connection not found: %s", id)
	}

	return nil
}

// UpdateCredentials updates the encrypted credentials and expiration
func (r *channelConnectionRepository) UpdateCredentials(ctx context.Context, id uuid.UUID, encryptedCreds []byte, n8nCredID string, expiresAt *time.Time) error {
	if id == uuid.Nil {
		return fmt.Errorf("connection ID cannot be nil")
	}

	if len(encryptedCreds) == 0 {
		return fmt.Errorf("encrypted credentials cannot be empty")
	}

	query := `
		UPDATE channel_connections
		SET
			credentials_encrypted = $1,
			n8n_credential_id = $2,
			expires_at = $3,
			updated_at = $4
		WHERE id = $5
	`

	result, err := r.db.Pool.Exec(ctx, query, encryptedCreds, n8nCredID, expiresAt, time.Now(), id)
	if err != nil {
		return fmt.Errorf("failed to update credentials: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("connection not found: %s", id)
	}

	return nil
}

// UpdateLastUsed updates the last used timestamp
func (r *channelConnectionRepository) UpdateLastUsed(ctx context.Context, id uuid.UUID) error {
	if id == uuid.Nil {
		return fmt.Errorf("connection ID cannot be nil")
	}

	now := time.Now()

	query := `
		UPDATE channel_connections
		SET last_used_at = $1, updated_at = $2
		WHERE id = $3
	`

	result, err := r.db.Pool.Exec(ctx, query, now, now, id)
	if err != nil {
		return fmt.Errorf("failed to update last used: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("connection not found: %s", id)
	}

	return nil
}

// GetExpiringConnections retrieves connections expiring within the specified duration
func (r *channelConnectionRepository) GetExpiringConnections(ctx context.Context, within time.Duration) ([]*domain.ChannelConnection, error) {
	if within <= 0 {
		return nil, fmt.Errorf("within duration must be positive")
	}

	expiryThreshold := time.Now().Add(within)

	query := `
		SELECT
			id, tenant_id, channel, account_name, account_id, status,
			credentials_encrypted, n8n_credential_id, metadata,
			last_used_at, expires_at, created_at, updated_at
		FROM channel_connections
		WHERE expires_at IS NOT NULL
		  AND expires_at <= $1
		  AND status = $2
		ORDER BY expires_at ASC
	`

	rows, err := r.db.Pool.Query(ctx, query, expiryThreshold, domain.StatusConnected)
	if err != nil {
		return nil, fmt.Errorf("failed to query expiring connections: %w", err)
	}
	defer rows.Close()

	connections := make([]*domain.ChannelConnection, 0)
	for rows.Next() {
		connection, err := r.scanConnection(rows)
		if err != nil {
			return nil, fmt.Errorf("failed to scan connection: %w", err)
		}
		connections = append(connections, connection)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %w", err)
	}

	return connections, nil
}

// scanConnection scans a row into a ChannelConnection
func (r *channelConnectionRepository) scanConnection(row pgx.Row) (*domain.ChannelConnection, error) {
	var connection domain.ChannelConnection
	var metadataJSON []byte

	err := row.Scan(
		&connection.ID,
		&connection.TenantID,
		&connection.Channel,
		&connection.AccountName,
		&connection.AccountID,
		&connection.Status,
		&connection.CredentialsEncrypted,
		&connection.N8nCredentialID,
		&metadataJSON,
		&connection.LastUsedAt,
		&connection.ExpiresAt,
		&connection.CreatedAt,
		&connection.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	if len(metadataJSON) > 0 {
		if err := json.Unmarshal(metadataJSON, &connection.Metadata); err != nil {
			return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
		}
	}

	return &connection, nil
}
