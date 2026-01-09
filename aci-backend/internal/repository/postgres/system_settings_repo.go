package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/phillipboles/aci-backend/internal/domain"
	domainerrors "github.com/phillipboles/aci-backend/internal/domain/errors"
)

// SystemSettingsRepository implements repository.SystemSettingsRepository for PostgreSQL
type SystemSettingsRepository struct {
	db *DB
}

// NewSystemSettingsRepository creates a new PostgreSQL system settings repository
func NewSystemSettingsRepository(db *DB) *SystemSettingsRepository {
	if db == nil {
		panic("database cannot be nil")
	}
	return &SystemSettingsRepository{db: db}
}

// Get retrieves a system setting by key
func (r *SystemSettingsRepository) Get(ctx context.Context, key string) (*domain.SystemSetting, error) {
	if key == "" {
		return nil, fmt.Errorf("key cannot be empty")
	}

	query := `
		SELECT key, value, description, updated_by, updated_at
		FROM system_settings
		WHERE key = $1
	`

	var setting domain.SystemSetting
	var valueJSON []byte
	err := r.db.Pool.QueryRow(ctx, query, key).Scan(
		&setting.Key,
		&valueJSON,
		&setting.Description,
		&setting.UpdatedBy,
		&setting.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, &domainerrors.NotFoundError{
				Resource: "system_setting",
				ID:       key,
			}
		}
		return nil, fmt.Errorf("failed to get system setting: %w", err)
	}

	// Parse JSON value
	if err := json.Unmarshal(valueJSON, &setting.Value); err != nil {
		return nil, fmt.Errorf("failed to parse setting value: %w", err)
	}

	return &setting, nil
}

// Set creates or updates a system setting
func (r *SystemSettingsRepository) Set(ctx context.Context, key string, value interface{}, updatedBy *uuid.UUID) error {
	if key == "" {
		return fmt.Errorf("key cannot be empty")
	}

	valueJSON, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal value: %w", err)
	}

	query := `
		INSERT INTO system_settings (key, value, updated_by, updated_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (key) DO UPDATE
		SET value = $2, updated_by = $3, updated_at = $4
	`

	_, err = r.db.Pool.Exec(ctx, query, key, valueJSON, updatedBy, time.Now())
	if err != nil {
		return fmt.Errorf("failed to set system setting: %w", err)
	}

	return nil
}

// GetSignupMode retrieves the current signup mode
func (r *SystemSettingsRepository) GetSignupMode(ctx context.Context) (domain.SignupMode, error) {
	setting, err := r.Get(ctx, "signup_mode")
	if err != nil {
		// Return default if not found
		var notFoundErr *domainerrors.NotFoundError
		if errors.As(err, &notFoundErr) {
			return domain.SignupModeOpen, nil
		}
		return "", err
	}

	// Value is stored as a JSON string
	modeStr, ok := setting.Value.(string)
	if !ok {
		return "", fmt.Errorf("invalid signup_mode value type")
	}

	mode := domain.SignupMode(modeStr)
	if !mode.IsValid() {
		return "", fmt.Errorf("invalid signup mode: %s", modeStr)
	}

	return mode, nil
}

// SetSignupMode updates the signup mode
func (r *SystemSettingsRepository) SetSignupMode(ctx context.Context, mode domain.SignupMode, updatedBy uuid.UUID) error {
	if !mode.IsValid() {
		return fmt.Errorf("invalid signup mode: %s", mode)
	}

	return r.Set(ctx, "signup_mode", string(mode), &updatedBy)
}

// GetAll retrieves all system settings
func (r *SystemSettingsRepository) GetAll(ctx context.Context) ([]*domain.SystemSetting, error) {
	query := `
		SELECT key, value, description, updated_by, updated_at
		FROM system_settings
		ORDER BY key
	`

	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to list system settings: %w", err)
	}
	defer rows.Close()

	var settings []*domain.SystemSetting
	for rows.Next() {
		var setting domain.SystemSetting
		var valueJSON []byte
		if err := rows.Scan(
			&setting.Key,
			&valueJSON,
			&setting.Description,
			&setting.UpdatedBy,
			&setting.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan setting: %w", err)
		}

		// Parse JSON value
		if err := json.Unmarshal(valueJSON, &setting.Value); err != nil {
			return nil, fmt.Errorf("failed to parse setting value: %w", err)
		}

		settings = append(settings, &setting)
	}

	return settings, nil
}
