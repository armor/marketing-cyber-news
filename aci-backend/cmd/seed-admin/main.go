package main

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"strings"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"golang.org/x/term"

	"github.com/phillipboles/aci-backend/internal/config"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/domain/entities"
	"github.com/phillipboles/aci-backend/internal/pkg/crypto"
	"github.com/phillipboles/aci-backend/internal/repository/postgres"
)

func main() {
	// Configure logger
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})

	ctx := context.Background()

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to load configuration")
	}

	// Connect to database
	pool, err := pgxpool.New(ctx, cfg.Database.URL)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to database")
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatal().Err(err).Msg("Failed to ping database")
	}

	log.Info().Msg("Connected to database")

	// Create repository
	db := &postgres.DB{Pool: pool}
	userRepo := postgres.NewUserRepository(db)

	// Check if super_admin already exists
	count, err := userRepo.CountByRole(ctx, entities.RoleSuperAdmin)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to check for existing super admin")
	}

	if count > 0 {
		log.Info().Int("count", count).Msg("Super admin already exists. Exiting without changes.")
		fmt.Println("A super admin user already exists. No changes made.")
		os.Exit(0)
	}

	// Get credentials
	email, password, name, err := getCredentials()
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to get credentials")
	}

	// Validate email domain
	if err := domain.ValidateEmailDomain(email); err != nil {
		log.Fatal().Err(err).Msg("Invalid email domain")
	}

	// Validate password strength
	if err := domain.ValidatePassword(password); err != nil {
		log.Fatal().Err(err).Msg("Invalid password")
	}

	// Hash password
	passwordHash, err := crypto.HashPassword(password)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to hash password")
	}

	// Create super admin user
	now := time.Now()
	user := &entities.User{
		ID:                  uuid.New(),
		Email:               strings.ToLower(email),
		PasswordHash:        passwordHash,
		Name:                name,
		Role:                entities.RoleSuperAdmin,
		Status:              entities.UserStatusActive,
		SubscriptionTier:    entities.SubscriptionEnterprise,
		EmailVerified:       true,
		ForcePasswordChange: false,
		FailedLoginCount:    0,
		CreatedAt:           now,
		UpdatedAt:           now,
	}

	if err := userRepo.Create(ctx, user); err != nil {
		log.Fatal().Err(err).Msg("Failed to create super admin")
	}

	log.Info().
		Str("id", user.ID.String()).
		Str("email", user.Email).
		Str("name", user.Name).
		Msg("Super admin created successfully")

	fmt.Printf("\n✅ Super admin created successfully!\n")
	fmt.Printf("   ID:    %s\n", user.ID.String())
	fmt.Printf("   Email: %s\n", user.Email)
	fmt.Printf("   Name:  %s\n", user.Name)
	fmt.Printf("   Role:  super_admin\n")
}

func getCredentials() (email, password, name string, err error) {
	reader := bufio.NewReader(os.Stdin)

	// Try environment variables first
	email = os.Getenv("SEED_ADMIN_EMAIL")
	password = os.Getenv("SEED_ADMIN_PASSWORD")
	name = os.Getenv("SEED_ADMIN_NAME")

	// Prompt for missing values
	if email == "" {
		fmt.Print("Enter super admin email (@armor.com): ")
		email, err = reader.ReadString('\n')
		if err != nil {
			return "", "", "", fmt.Errorf("failed to read email: %w", err)
		}
		email = strings.TrimSpace(email)
	}

	if name == "" {
		fmt.Print("Enter super admin name: ")
		name, err = reader.ReadString('\n')
		if err != nil {
			return "", "", "", fmt.Errorf("failed to read name: %w", err)
		}
		name = strings.TrimSpace(name)
	}

	if password == "" {
		fmt.Print("Enter password (min 8 chars, 1 upper, 1 lower, 1 digit): ")
		bytePassword, err := term.ReadPassword(int(syscall.Stdin))
		if err != nil {
			return "", "", "", fmt.Errorf("failed to read password: %w", err)
		}
		password = string(bytePassword)
		fmt.Println() // Add newline after password input

		// Confirm password
		fmt.Print("Confirm password: ")
		byteConfirm, err := term.ReadPassword(int(syscall.Stdin))
		if err != nil {
			return "", "", "", fmt.Errorf("failed to read password confirmation: %w", err)
		}
		confirmPassword := string(byteConfirm)
		fmt.Println()

		if password != confirmPassword {
			return "", "", "", fmt.Errorf("passwords do not match")
		}
	}

	return email, password, name, nil
}
