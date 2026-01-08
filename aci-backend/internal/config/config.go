package config

import (
	"fmt"
	"os"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	JWT      JWTConfig
	N8N      N8NConfig
	AI       AIConfig
	Redis    RedisConfig
	Logger   LoggerConfig
}

type ServerConfig struct {
	Port int
}

type DatabaseConfig struct {
	URL                string
	MaxConns           int
	MinConns           int
	MaxConnLifetime    time.Duration
	MaxConnIdleTime    time.Duration
}

type JWTConfig struct {
	PrivateKeyPath       string
	PublicKeyPath        string
	AccessTokenExpiry    time.Duration
	RefreshTokenExpiry   time.Duration
}

type N8NConfig struct {
	WebhookSecret      string
	WebhookURL         string
	WebhookTimeoutSecs int
}

type AIConfig struct {
	AnthropicAPIKey    string
	TimeoutSecs        int
	WebinarResourceURL string
}

type RedisConfig struct {
	URL string
}

type LoggerConfig struct {
	Level string
}

// Load loads configuration from environment variables
func Load() (*Config, error) {
	// Load .env file if exists (optional)
	_ = godotenv.Load()

	cfg := &Config{
		Server: ServerConfig{
			Port: getEnvInt("SERVER_PORT", 8080),
		},
		Database: DatabaseConfig{
			URL:                os.Getenv("DATABASE_URL"),
			MaxConns:           getEnvInt("DB_MAX_CONNS", 25),
			MinConns:           getEnvInt("DB_MIN_CONNS", 5),
			MaxConnLifetime:    getEnvDuration("DB_MAX_CONN_LIFETIME", time.Hour),
			MaxConnIdleTime:    getEnvDuration("DB_MAX_CONN_IDLE_TIME", 30*time.Minute),
		},
		JWT: JWTConfig{
			PrivateKeyPath:     os.Getenv("JWT_PRIVATE_KEY_PATH"),
			PublicKeyPath:      os.Getenv("JWT_PUBLIC_KEY_PATH"),
			AccessTokenExpiry:  getEnvDuration("JWT_ACCESS_TOKEN_EXPIRY", 15*time.Minute),
			RefreshTokenExpiry: getEnvDuration("JWT_REFRESH_TOKEN_EXPIRY", 168*time.Hour),
		},
		N8N: N8NConfig{
			WebhookSecret:      os.Getenv("N8N_WEBHOOK_SECRET"),
			WebhookURL:         os.Getenv("N8N_WEBHOOK_URL"),
			WebhookTimeoutSecs: getEnvInt("N8N_WEBHOOK_TIMEOUT_SECS", 30),
		},
		AI: AIConfig{
			AnthropicAPIKey:    os.Getenv("ANTHROPIC_API_KEY"),
			TimeoutSecs:        getEnvInt("AI_TIMEOUT_SECS", 60),
			WebinarResourceURL: getEnvString("WEBINAR_RESOURCE_URL", ""),
		},
		Redis: RedisConfig{
			URL: os.Getenv("REDIS_URL"),
		},
		Logger: LoggerConfig{
			Level: getEnvString("LOG_LEVEL", "info"),
		},
	}

	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("invalid configuration: %w", err)
	}

	return cfg, nil
}

// Validate validates the configuration
func (c *Config) Validate() error {
	if c.Database.URL == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}

	if c.JWT.PrivateKeyPath == "" {
		return fmt.Errorf("JWT_PRIVATE_KEY_PATH is required")
	}

	if c.JWT.PublicKeyPath == "" {
		return fmt.Errorf("JWT_PUBLIC_KEY_PATH is required")
	}

	if c.N8N.WebhookSecret == "" {
		return fmt.Errorf("N8N_WEBHOOK_SECRET is required")
	}

	if c.AI.AnthropicAPIKey == "" {
		return fmt.Errorf("ANTHROPIC_API_KEY is required")
	}

	if c.N8N.WebhookURL == "" {
		return fmt.Errorf("N8N_WEBHOOK_URL is required")
	}

	if c.Database.MaxConns <= 0 {
		return fmt.Errorf("DB_MAX_CONNS must be greater than 0")
	}

	if c.Database.MinConns < 0 {
		return fmt.Errorf("DB_MIN_CONNS must be non-negative")
	}

	if c.Database.MinConns > c.Database.MaxConns {
		return fmt.Errorf("DB_MIN_CONNS cannot exceed DB_MAX_CONNS")
	}

	if c.N8N.WebhookTimeoutSecs <= 0 {
		return fmt.Errorf("N8N_WEBHOOK_TIMEOUT_SECS must be greater than 0")
	}

	if c.AI.TimeoutSecs <= 0 {
		return fmt.Errorf("AI_TIMEOUT_SECS must be greater than 0")
	}

	return nil
}

func getEnvInt(key string, defaultVal int) int {
	if val := os.Getenv(key); val != "" {
		var i int
		if _, err := fmt.Sscanf(val, "%d", &i); err == nil {
			return i
		}
	}
	return defaultVal
}

func getEnvDuration(key string, defaultVal time.Duration) time.Duration {
	if val := os.Getenv(key); val != "" {
		if d, err := time.ParseDuration(val); err == nil {
			return d
		}
	}
	return defaultVal
}

func getEnvString(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
