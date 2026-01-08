package service

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/phillipboles/aci-backend/internal/crypto"
	"github.com/phillipboles/aci-backend/internal/domain"
	"github.com/phillipboles/aci-backend/internal/n8n"
	"github.com/phillipboles/aci-backend/internal/repository"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/linkedin"
)

// ChannelService handles OAuth connections and channel management
type ChannelService struct {
	channelRepo repository.ChannelConnectionRepository
	encryptor   *crypto.Encryptor
	n8nClient   n8n.N8nClient
	config      ChannelConfig
	httpClient  *http.Client
}

// ChannelConfig holds OAuth configuration for all channels
type ChannelConfig struct {
	LinkedInClientID     string
	LinkedInClientSecret string
	LinkedInRedirectURL  string
	TwitterClientID      string
	TwitterClientSecret  string
	TwitterRedirectURL   string
	BaseCallbackURL      string
}

// ChannelStatus represents the status of a channel for a tenant
type ChannelStatus struct {
	Channel     domain.Channel `json:"channel"`
	DisplayName string         `json:"display_name"`
	IsSupported bool           `json:"is_supported"`
	IsConnected bool           `json:"is_connected"`
	AccountName string         `json:"account_name,omitempty"`
	ExpiresAt   *time.Time     `json:"expires_at,omitempty"`
}

// AccountInfo holds account information fetched from OAuth providers
type AccountInfo struct {
	ID              string
	Name            string
	ProfileURL      string
	ProfileImageURL string
	FollowerCount   int
	ConnectionCount int
}

// NewChannelService creates a new channel service
func NewChannelService(
	channelRepo repository.ChannelConnectionRepository,
	encryptor *crypto.Encryptor,
	n8nClient n8n.N8nClient,
	config ChannelConfig,
) *ChannelService {
	if channelRepo == nil {
		panic("channelRepo cannot be nil")
	}
	if encryptor == nil {
		panic("encryptor cannot be nil")
	}
	if n8nClient == nil {
		panic("n8nClient cannot be nil")
	}
	return &ChannelService{
		channelRepo: channelRepo,
		encryptor:   encryptor,
		n8nClient:   n8nClient,
		config:      config,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// GetConnections returns all channel connections for a tenant
func (s *ChannelService) GetConnections(ctx context.Context, tenantID uuid.UUID) ([]*domain.ChannelConnection, error) {
	if tenantID == uuid.Nil {
		return nil, fmt.Errorf("tenant_id is required")
	}

	filter := &domain.ChannelConnectionFilter{
		TenantID: tenantID,
	}
	filter.WithDefaults()

	connections, _, err := s.channelRepo.List(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to list connections: %w", err)
	}

	return connections, nil
}

// GetConnection returns a specific channel connection
func (s *ChannelService) GetConnection(ctx context.Context, tenantID uuid.UUID, channel domain.Channel) (*domain.ChannelConnection, error) {
	if tenantID == uuid.Nil {
		return nil, fmt.Errorf("tenant_id is required")
	}

	if !channel.IsValid() {
		return nil, fmt.Errorf("invalid channel: %s", channel)
	}

	connection, err := s.channelRepo.GetByTenantAndChannel(ctx, tenantID, channel)
	if err != nil {
		return nil, fmt.Errorf("failed to get connection: %w", err)
	}

	return connection, nil
}

// InitiateOAuth starts the OAuth flow for a channel
// Returns the authorization URL to redirect the user to
func (s *ChannelService) InitiateOAuth(ctx context.Context, tenantID uuid.UUID, channel domain.Channel) (string, error) {
	if tenantID == uuid.Nil {
		return "", fmt.Errorf("tenant_id is required")
	}

	if !channel.IsValid() {
		return "", fmt.Errorf("invalid channel: %s", channel)
	}

	oauthConfig, err := s.getOAuthConfig(channel)
	if err != nil {
		return "", fmt.Errorf("failed to get OAuth config: %w", err)
	}

	// Generate state with tenant_id encoded
	state, err := s.generateState(tenantID, channel)
	if err != nil {
		return "", fmt.Errorf("failed to generate state: %w", err)
	}

	authURL := oauthConfig.AuthCodeURL(state, oauth2.AccessTypeOffline)

	return authURL, nil
}

// CompleteOAuth handles the OAuth callback
func (s *ChannelService) CompleteOAuth(ctx context.Context, channel domain.Channel, code string, state string) (*domain.ChannelConnection, error) {
	if !channel.IsValid() {
		return nil, fmt.Errorf("invalid channel: %s", channel)
	}

	if code == "" {
		return nil, fmt.Errorf("authorization code is required")
	}

	if state == "" {
		return nil, fmt.Errorf("state is required")
	}

	// Validate state and extract tenant_id
	tenantID, err := s.validateState(state, channel)
	if err != nil {
		return nil, fmt.Errorf("invalid state: %w", err)
	}

	oauthConfig, err := s.getOAuthConfig(channel)
	if err != nil {
		return nil, fmt.Errorf("failed to get OAuth config: %w", err)
	}

	// Exchange code for tokens
	token, err := oauthConfig.Exchange(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange code: %w", err)
	}

	// Fetch account info from platform
	accountInfo, err := s.fetchAccountInfo(ctx, channel, token)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch account info: %w", err)
	}

	// Create n8n credential
	n8nCredID, err := s.createN8nCredential(ctx, channel, token)
	if err != nil {
		return nil, fmt.Errorf("failed to create n8n credential: %w", err)
	}

	// Encrypt tokens for storage
	tokenData := &crypto.OAuthTokens{
		AccessToken:  token.AccessToken,
		RefreshToken: token.RefreshToken,
		TokenType:    token.TokenType,
	}

	if !token.Expiry.IsZero() {
		tokenData.ExpiresAt = token.Expiry.Unix()
	}

	encryptedCreds, err := s.encryptor.EncryptOAuthTokens(tokenData)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt credentials: %w", err)
	}

	// Check if connection already exists
	existingConn, err := s.channelRepo.GetByTenantAndChannel(ctx, tenantID, channel)
	if err == nil && existingConn != nil {
		// Update existing connection
		var expiresAt *time.Time
		if !token.Expiry.IsZero() {
			expiresAt = &token.Expiry
		}

		if err := s.channelRepo.UpdateCredentials(ctx, existingConn.ID, encryptedCreds, n8nCredID, expiresAt); err != nil {
			return nil, fmt.Errorf("failed to update credentials: %w", err)
		}

		existingConn.AccountName = accountInfo.Name
		existingConn.AccountID = accountInfo.ID
		existingConn.Status = domain.StatusConnected
		existingConn.Metadata = domain.ChannelMetadata{
			ProfilePictureURL: accountInfo.ProfileImageURL,
			FollowerCount:     accountInfo.FollowerCount,
			ConnectionCount:   accountInfo.ConnectionCount,
			ProfileURL:        accountInfo.ProfileURL,
		}

		if err := s.channelRepo.Update(ctx, existingConn); err != nil {
			return nil, fmt.Errorf("failed to update connection: %w", err)
		}

		return existingConn, nil
	}

	// Create new connection
	connection := domain.NewChannelConnection(tenantID, channel, accountInfo.Name, accountInfo.ID)
	connection.Status = domain.StatusConnected
	connection.CredentialsEncrypted = encryptedCreds
	connection.N8nCredentialID = n8nCredID
	connection.Metadata = domain.ChannelMetadata{
		ProfilePictureURL: accountInfo.ProfileImageURL,
		FollowerCount:     accountInfo.FollowerCount,
		ConnectionCount:   accountInfo.ConnectionCount,
		ProfileURL:        accountInfo.ProfileURL,
	}

	if !token.Expiry.IsZero() {
		connection.ExpiresAt = &token.Expiry
	}

	if err := connection.Validate(); err != nil {
		return nil, fmt.Errorf("connection validation failed: %w", err)
	}

	if err := s.channelRepo.Create(ctx, connection); err != nil {
		return nil, fmt.Errorf("failed to save connection: %w", err)
	}

	return connection, nil
}

// DisconnectChannel removes a channel connection
func (s *ChannelService) DisconnectChannel(ctx context.Context, tenantID uuid.UUID, channel domain.Channel) error {
	if tenantID == uuid.Nil {
		return fmt.Errorf("tenant_id is required")
	}

	if !channel.IsValid() {
		return fmt.Errorf("invalid channel: %s", channel)
	}

	connection, err := s.channelRepo.GetByTenantAndChannel(ctx, tenantID, channel)
	if err != nil {
		return fmt.Errorf("failed to get connection: %w", err)
	}

	// Delete n8n credential if exists
	if connection.N8nCredentialID != "" {
		if err := s.n8nClient.DeleteCredential(ctx, connection.N8nCredentialID); err != nil {
			// Log but don't fail - credential might already be deleted
			fmt.Printf("failed to delete n8n credential %s: %v\n", connection.N8nCredentialID, err)
		}
	}

	// Delete connection from database
	if err := s.channelRepo.Delete(ctx, connection.ID); err != nil {
		return fmt.Errorf("failed to delete connection: %w", err)
	}

	return nil
}

// TestConnection tests if a connection is still valid
func (s *ChannelService) TestConnection(ctx context.Context, tenantID uuid.UUID, channel domain.Channel) (bool, error) {
	if tenantID == uuid.Nil {
		return false, fmt.Errorf("tenant_id is required")
	}

	if !channel.IsValid() {
		return false, fmt.Errorf("invalid channel: %s", channel)
	}

	connection, err := s.channelRepo.GetByTenantAndChannel(ctx, tenantID, channel)
	if err != nil {
		return false, fmt.Errorf("failed to get connection: %w", err)
	}

	if !connection.IsConnected() {
		return false, nil
	}

	// Check if token is expired
	if connection.IsExpired() {
		return false, nil
	}

	// Decrypt and test actual API call
	tokens, err := s.encryptor.DecryptOAuthTokens(connection.CredentialsEncrypted)
	if err != nil {
		return false, fmt.Errorf("failed to decrypt credentials: %w", err)
	}

	// Make a test API call based on channel
	switch channel {
	case domain.ChannelLinkedIn:
		return s.testLinkedInConnection(ctx, tokens)
	case domain.ChannelTwitter:
		return s.testTwitterConnection(ctx, tokens)
	default:
		return false, fmt.Errorf("testing not implemented for channel: %s", channel)
	}
}

// RefreshExpiringTokens refreshes tokens that are about to expire
// Called by background job
func (s *ChannelService) RefreshExpiringTokens(ctx context.Context) error {
	connections, err := s.channelRepo.GetExpiringConnections(ctx, 24*time.Hour)
	if err != nil {
		return fmt.Errorf("failed to get expiring connections: %w", err)
	}

	for _, conn := range connections {
		if err := s.refreshConnection(ctx, conn); err != nil {
			fmt.Printf("failed to refresh connection %s: %v\n", conn.ID, err)
			conn.MarkError(fmt.Sprintf("token refresh failed: %v", err))
			if updateErr := s.channelRepo.Update(ctx, conn); updateErr != nil {
				fmt.Printf("failed to update connection status: %v\n", updateErr)
			}
		}
	}

	return nil
}

// GetSupportedChannels returns list of supported channels with their status
func (s *ChannelService) GetSupportedChannels(ctx context.Context, tenantID uuid.UUID) ([]ChannelStatus, error) {
	if tenantID == uuid.Nil {
		return nil, fmt.Errorf("tenant_id is required")
	}

	supportedChannels := domain.GetSupportedChannels()
	result := make([]ChannelStatus, 0, len(supportedChannels))

	// Get existing connections
	connections, err := s.GetConnections(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("failed to get connections: %w", err)
	}

	connMap := make(map[domain.Channel]*domain.ChannelConnection)
	for _, conn := range connections {
		connMap[conn.Channel] = conn
	}

	for _, info := range supportedChannels {
		status := ChannelStatus{
			Channel:     info.Channel,
			DisplayName: info.DisplayName,
			IsSupported: info.IsSupported,
			IsConnected: false,
		}

		if conn, exists := connMap[info.Channel]; exists {
			status.IsConnected = conn.IsConnected()
			status.AccountName = conn.AccountName
			status.ExpiresAt = conn.ExpiresAt
		}

		result = append(result, status)
	}

	return result, nil
}

// getOAuthConfig returns OAuth configuration for a channel
func (s *ChannelService) getOAuthConfig(channel domain.Channel) (*oauth2.Config, error) {
	switch channel {
	case domain.ChannelLinkedIn:
		if s.config.LinkedInClientID == "" || s.config.LinkedInClientSecret == "" {
			return nil, fmt.Errorf("LinkedIn OAuth not configured")
		}
		return &oauth2.Config{
			ClientID:     s.config.LinkedInClientID,
			ClientSecret: s.config.LinkedInClientSecret,
			RedirectURL:  s.config.LinkedInRedirectURL,
			Scopes:       []string{"r_liteprofile", "r_emailaddress", "w_member_social"},
			Endpoint:     linkedin.Endpoint,
		}, nil

	case domain.ChannelTwitter:
		if s.config.TwitterClientID == "" || s.config.TwitterClientSecret == "" {
			return nil, fmt.Errorf("Twitter OAuth not configured")
		}
		return &oauth2.Config{
			ClientID:     s.config.TwitterClientID,
			ClientSecret: s.config.TwitterClientSecret,
			RedirectURL:  s.config.TwitterRedirectURL,
			Scopes:       []string{"tweet.read", "tweet.write", "users.read"},
			Endpoint: oauth2.Endpoint{
				AuthURL:  "https://twitter.com/i/oauth2/authorize",
				TokenURL: "https://api.twitter.com/2/oauth2/token",
			},
		}, nil

	default:
		return nil, fmt.Errorf("OAuth not supported for channel: %s", channel)
	}
}

// fetchAccountInfo fetches account information from the OAuth provider
func (s *ChannelService) fetchAccountInfo(ctx context.Context, channel domain.Channel, token *oauth2.Token) (*AccountInfo, error) {
	switch channel {
	case domain.ChannelLinkedIn:
		return s.fetchLinkedInProfile(ctx, token)
	case domain.ChannelTwitter:
		return s.fetchTwitterProfile(ctx, token)
	default:
		return nil, fmt.Errorf("account info not supported for channel: %s", channel)
	}
}

// fetchLinkedInProfile fetches LinkedIn profile information
func (s *ChannelService) fetchLinkedInProfile(ctx context.Context, token *oauth2.Token) (*AccountInfo, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", "https://api.linkedin.com/v2/me", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+token.AccessToken)
	req.Header.Set("Accept", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch profile: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("LinkedIn API error (status %d): %s", resp.StatusCode, string(body))
	}

	var profile struct {
		ID        string `json:"id"`
		FirstName struct {
			Localized struct {
				EnUS string `json:"en_US"`
			} `json:"localized"`
		} `json:"firstName"`
		LastName struct {
			Localized struct {
				EnUS string `json:"en_US"`
			} `json:"localized"`
		} `json:"lastName"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&profile); err != nil {
		return nil, fmt.Errorf("failed to decode profile: %w", err)
	}

	name := fmt.Sprintf("%s %s",
		profile.FirstName.Localized.EnUS,
		profile.LastName.Localized.EnUS,
	)

	return &AccountInfo{
		ID:         profile.ID,
		Name:       name,
		ProfileURL: fmt.Sprintf("https://www.linkedin.com/in/%s", profile.ID),
	}, nil
}

// fetchTwitterProfile fetches Twitter profile information
func (s *ChannelService) fetchTwitterProfile(ctx context.Context, token *oauth2.Token) (*AccountInfo, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", "https://api.twitter.com/2/users/me", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+token.AccessToken)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch profile: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Twitter API error (status %d): %s", resp.StatusCode, string(body))
	}

	var result struct {
		Data struct {
			ID       string `json:"id"`
			Name     string `json:"name"`
			Username string `json:"username"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode profile: %w", err)
	}

	return &AccountInfo{
		ID:         result.Data.ID,
		Name:       result.Data.Name,
		ProfileURL: fmt.Sprintf("https://twitter.com/%s", result.Data.Username),
	}, nil
}

// createN8nCredential creates an n8n credential for the OAuth token
func (s *ChannelService) createN8nCredential(ctx context.Context, channel domain.Channel, token *oauth2.Token) (string, error) {
	credType := ""
	credData := make(map[string]interface{})

	switch channel {
	case domain.ChannelLinkedIn:
		credType = "linkedInOAuth2Api"
		credData["oauthTokenData"] = map[string]interface{}{
			"access_token":  token.AccessToken,
			"refresh_token": token.RefreshToken,
			"token_type":    token.TokenType,
		}

	case domain.ChannelTwitter:
		credType = "twitterOAuth2Api"
		credData["oauthTokenData"] = map[string]interface{}{
			"access_token":  token.AccessToken,
			"refresh_token": token.RefreshToken,
			"token_type":    token.TokenType,
		}

	default:
		return "", fmt.Errorf("n8n credential not supported for channel: %s", channel)
	}

	cred := &n8n.Credential{
		Name: fmt.Sprintf("%s OAuth", channel),
		Type: credType,
		Data: credData,
	}

	created, err := s.n8nClient.CreateCredential(ctx, cred)
	if err != nil {
		return "", fmt.Errorf("failed to create n8n credential: %w", err)
	}

	return created.ID, nil
}

// generateState generates a secure state parameter with tenant_id encoded
func (s *ChannelService) generateState(tenantID uuid.UUID, channel domain.Channel) (string, error) {
	randomBytes := make([]byte, 16)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", fmt.Errorf("failed to generate random bytes: %w", err)
	}

	state := fmt.Sprintf("%s:%s:%s", tenantID.String(), channel, base64.URLEncoding.EncodeToString(randomBytes))

	return base64.URLEncoding.EncodeToString([]byte(state)), nil
}

// validateState validates the state parameter and extracts tenant_id
func (s *ChannelService) validateState(state string, channel domain.Channel) (uuid.UUID, error) {
	decoded, err := base64.URLEncoding.DecodeString(state)
	if err != nil {
		return uuid.Nil, fmt.Errorf("failed to decode state: %w", err)
	}

	parts := strings.Split(string(decoded), ":")
	if len(parts) != 3 {
		return uuid.Nil, fmt.Errorf("invalid state format")
	}

	tenantID, err := uuid.Parse(parts[0])
	if err != nil {
		return uuid.Nil, fmt.Errorf("invalid tenant_id in state: %w", err)
	}

	if domain.Channel(parts[1]) != channel {
		return uuid.Nil, fmt.Errorf("channel mismatch in state")
	}

	return tenantID, nil
}

// refreshConnection refreshes OAuth tokens for a connection
func (s *ChannelService) refreshConnection(ctx context.Context, conn *domain.ChannelConnection) error {
	tokens, err := s.encryptor.DecryptOAuthTokens(conn.CredentialsEncrypted)
	if err != nil {
		return fmt.Errorf("failed to decrypt tokens: %w", err)
	}

	if tokens.RefreshToken == "" {
		return fmt.Errorf("no refresh token available")
	}

	oauthConfig, err := s.getOAuthConfig(conn.Channel)
	if err != nil {
		return fmt.Errorf("failed to get OAuth config: %w", err)
	}

	token := &oauth2.Token{
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		TokenType:    tokens.TokenType,
	}

	if tokens.ExpiresAt > 0 {
		token.Expiry = time.Unix(tokens.ExpiresAt, 0)
	}

	tokenSource := oauthConfig.TokenSource(ctx, token)
	newToken, err := tokenSource.Token()
	if err != nil {
		return fmt.Errorf("failed to refresh token: %w", err)
	}

	// Encrypt new tokens
	newTokenData := &crypto.OAuthTokens{
		AccessToken:  newToken.AccessToken,
		RefreshToken: newToken.RefreshToken,
		TokenType:    newToken.TokenType,
	}

	if !newToken.Expiry.IsZero() {
		newTokenData.ExpiresAt = newToken.Expiry.Unix()
	}

	encryptedCreds, err := s.encryptor.EncryptOAuthTokens(newTokenData)
	if err != nil {
		return fmt.Errorf("failed to encrypt new tokens: %w", err)
	}

	var expiresAt *time.Time
	if !newToken.Expiry.IsZero() {
		expiresAt = &newToken.Expiry
	}

	if err := s.channelRepo.UpdateCredentials(ctx, conn.ID, encryptedCreds, conn.N8nCredentialID, expiresAt); err != nil {
		return fmt.Errorf("failed to update credentials: %w", err)
	}

	return nil
}

// testLinkedInConnection tests LinkedIn connection validity
func (s *ChannelService) testLinkedInConnection(ctx context.Context, tokens *crypto.OAuthTokens) (bool, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", "https://api.linkedin.com/v2/me", nil)
	if err != nil {
		return false, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return false, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	return resp.StatusCode == http.StatusOK, nil
}

// testTwitterConnection tests Twitter connection validity
func (s *ChannelService) testTwitterConnection(ctx context.Context, tokens *crypto.OAuthTokens) (bool, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", "https://api.twitter.com/2/users/me", nil)
	if err != nil {
		return false, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return false, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	return resp.StatusCode == http.StatusOK, nil
}
