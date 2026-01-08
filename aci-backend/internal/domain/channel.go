package domain

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

// ConnectionStatus represents the state of a channel connection
type ConnectionStatus string

const (
	StatusConnected    ConnectionStatus = "connected"
	StatusDisconnected ConnectionStatus = "disconnected"
	StatusError        ConnectionStatus = "error"
	StatusPending      ConnectionStatus = "pending"
)

// IsValid checks if the connection status is valid
func (s ConnectionStatus) IsValid() bool {
	switch s {
	case StatusConnected, StatusDisconnected, StatusError, StatusPending:
		return true
	default:
		return false
	}
}

// String returns the string representation of the connection status
func (s ConnectionStatus) String() string {
	return string(s)
}

// ChannelConnection represents an OAuth connection to a publishing platform
type ChannelConnection struct {
	ID                   uuid.UUID        `json:"id" db:"id"`
	TenantID             uuid.UUID        `json:"tenant_id" db:"tenant_id"`
	Channel              Channel          `json:"channel" db:"channel"`
	AccountName          string           `json:"account_name" db:"account_name"`
	AccountID            string           `json:"account_id" db:"account_id"`
	Status               ConnectionStatus `json:"status" db:"status"`
	CredentialsEncrypted []byte           `json:"-" db:"credentials_encrypted"` // Never serialize
	N8nCredentialID      string           `json:"-" db:"n8n_credential_id"`     // Internal use only
	Metadata             ChannelMetadata  `json:"metadata" db:"metadata"`
	LastUsedAt           *time.Time       `json:"last_used_at,omitempty" db:"last_used_at"`
	ExpiresAt            *time.Time       `json:"expires_at,omitempty" db:"expires_at"`
	CreatedAt            time.Time        `json:"created_at" db:"created_at"`
	UpdatedAt            time.Time        `json:"updated_at" db:"updated_at"`
}

// ChannelMetadata holds platform-specific connection metadata
type ChannelMetadata struct {
	ProfilePictureURL string     `json:"profile_picture_url,omitempty"`
	FollowerCount     int        `json:"follower_count,omitempty"`
	ConnectionCount   int        `json:"connection_count,omitempty"`
	ProfileURL        string     `json:"profile_url,omitempty"`
	Permissions       []string   `json:"permissions,omitempty"`
	Scopes            []string   `json:"scopes,omitempty"`
	LastError         string     `json:"last_error,omitempty"`
	LastErrorAt       *time.Time `json:"last_error_at,omitempty"`
}

// OAuthTokens holds decrypted OAuth credentials (in-memory only, never persisted in this form)
type OAuthTokens struct {
	AccessToken  string     `json:"access_token"`
	RefreshToken string     `json:"refresh_token,omitempty"`
	TokenType    string     `json:"token_type"`
	ExpiresAt    *time.Time `json:"expires_at,omitempty"`
	Scopes       []string   `json:"scopes,omitempty"`
}

// NewChannelConnection creates a new channel connection with defaults
func NewChannelConnection(tenantID uuid.UUID, channel Channel, accountName, accountID string) *ChannelConnection {
	now := time.Now()
	return &ChannelConnection{
		ID:          uuid.New(),
		TenantID:    tenantID,
		Channel:     channel,
		AccountName: accountName,
		AccountID:   accountID,
		Status:      StatusPending,
		Metadata:    ChannelMetadata{},
		CreatedAt:   now,
		UpdatedAt:   now,
	}
}

// Validate validates the channel connection
func (c *ChannelConnection) Validate() error {
	if c.TenantID == uuid.Nil {
		return fmt.Errorf("tenant_id is required")
	}

	if c.AccountName == "" {
		return fmt.Errorf("account name is required")
	}

	if c.AccountID == "" {
		return fmt.Errorf("account ID is required")
	}

	if !c.Channel.IsValid() {
		return fmt.Errorf("invalid channel: %s", c.Channel)
	}

	if !c.Status.IsValid() {
		return fmt.Errorf("invalid connection status: %s", c.Status)
	}

	return nil
}

// IsConnected returns true if the connection is active
func (c *ChannelConnection) IsConnected() bool {
	return c.Status == StatusConnected
}

// NeedsRefresh returns true if token is about to expire (within 1 hour)
func (c *ChannelConnection) NeedsRefresh() bool {
	if c.ExpiresAt == nil {
		return false
	}
	return time.Until(*c.ExpiresAt) < time.Hour
}

// IsExpired returns true if the token has expired
func (c *ChannelConnection) IsExpired() bool {
	if c.ExpiresAt == nil {
		return false
	}
	return c.ExpiresAt.Before(time.Now())
}

// MarkError updates the connection to error state with details
func (c *ChannelConnection) MarkError(errorMsg string) {
	c.Status = StatusError
	now := time.Now()
	c.Metadata.LastError = errorMsg
	c.Metadata.LastErrorAt = &now
	c.UpdatedAt = now
}

// MarkConnected updates the connection to connected state
func (c *ChannelConnection) MarkConnected() {
	c.Status = StatusConnected
	c.Metadata.LastError = ""
	c.Metadata.LastErrorAt = nil
	c.UpdatedAt = time.Now()
}

// MarkDisconnected updates the connection to disconnected state
func (c *ChannelConnection) MarkDisconnected() {
	c.Status = StatusDisconnected
	c.UpdatedAt = time.Now()
}

// UpdateMetadata updates the connection metadata
func (c *ChannelConnection) UpdateMetadata(metadata ChannelMetadata) {
	c.Metadata = metadata
	c.UpdatedAt = time.Now()
}

// UpdateLastUsed updates the last used timestamp
func (c *ChannelConnection) UpdateLastUsed() {
	now := time.Now()
	c.LastUsedAt = &now
	c.UpdatedAt = now
}

// ChannelInfo provides display information for a channel type
type ChannelInfo struct {
	Channel      Channel `json:"channel"`
	DisplayName  string  `json:"display_name"`
	Description  string  `json:"description"`
	IconURL      string  `json:"icon_url"`
	OAuthURL     string  `json:"oauth_url,omitempty"`
	IsSupported  bool    `json:"is_supported"`
	CharLimit    int     `json:"char_limit,omitempty"`
	MediaSupport bool    `json:"media_support"`
}

// GetChannelInfo returns display info for a channel
func GetChannelInfo(ch Channel) ChannelInfo {
	info := map[Channel]ChannelInfo{
		ChannelLinkedIn: {
			Channel:      ChannelLinkedIn,
			DisplayName:  "LinkedIn",
			Description:  "Professional networking and thought leadership",
			IconURL:      "/icons/linkedin.svg",
			IsSupported:  true,
			CharLimit:    3000,
			MediaSupport: true,
		},
		ChannelTwitter: {
			Channel:      ChannelTwitter,
			DisplayName:  "X (Twitter)",
			Description:  "Real-time updates and engagement",
			IconURL:      "/icons/twitter.svg",
			IsSupported:  true,
			CharLimit:    280,
			MediaSupport: true,
		},
		ChannelEmail: {
			Channel:      ChannelEmail,
			DisplayName:  "Email Newsletter",
			Description:  "Direct subscriber communication",
			IconURL:      "/icons/email.svg",
			IsSupported:  true,
			CharLimit:    0, // No limit
			MediaSupport: true,
		},
		ChannelBlog: {
			Channel:      ChannelBlog,
			DisplayName:  "Blog",
			Description:  "Long-form content publishing",
			IconURL:      "/icons/blog.svg",
			IsSupported:  false, // Deferred per spec
			CharLimit:    0,
			MediaSupport: true,
		},
		ChannelFacebook: {
			Channel:      ChannelFacebook,
			DisplayName:  "Facebook",
			Description:  "Social media engagement",
			IconURL:      "/icons/facebook.svg",
			IsSupported:  false, // Deferred per spec
			CharLimit:    63206,
			MediaSupport: true,
		},
		ChannelInstagram: {
			Channel:      ChannelInstagram,
			DisplayName:  "Instagram",
			Description:  "Visual content sharing",
			IconURL:      "/icons/instagram.svg",
			IsSupported:  false, // Deferred per spec
			CharLimit:    2200,
			MediaSupport: true,
		},
	}

	if i, ok := info[ch]; ok {
		return i
	}

	return ChannelInfo{
		Channel:     ch,
		DisplayName: string(ch),
		IsSupported: false,
	}
}

// GetSupportedChannels returns list of channels currently supported
func GetSupportedChannels() []ChannelInfo {
	allChannels := []Channel{ChannelLinkedIn, ChannelTwitter, ChannelEmail}
	result := make([]ChannelInfo, 0, len(allChannels))

	for _, ch := range allChannels {
		info := GetChannelInfo(ch)
		if info.IsSupported {
			result = append(result, info)
		}
	}

	return result
}

// ChannelConnectionFilter for listing connections
type ChannelConnectionFilter struct {
	TenantID uuid.UUID
	Channel  *Channel
	Status   *ConnectionStatus
	Page     int
	PageSize int
}

// Validate validates the filter
func (f *ChannelConnectionFilter) Validate() error {
	if f.TenantID == uuid.Nil {
		return fmt.Errorf("tenant_id is required")
	}

	if f.Channel != nil && !f.Channel.IsValid() {
		return fmt.Errorf("invalid channel: %s", *f.Channel)
	}

	if f.Status != nil && !f.Status.IsValid() {
		return fmt.Errorf("invalid status: %s", *f.Status)
	}

	if f.Page < 0 {
		return fmt.Errorf("page must be non-negative")
	}

	if f.PageSize < 0 {
		return fmt.Errorf("page_size must be non-negative")
	}

	if f.PageSize > 100 {
		return fmt.Errorf("page_size must not exceed 100")
	}

	return nil
}

// WithDefaults applies default values to the filter
func (f *ChannelConnectionFilter) WithDefaults() *ChannelConnectionFilter {
	if f.Page == 0 {
		f.Page = 1
	}

	if f.PageSize == 0 {
		f.PageSize = 20
	}

	return f
}

// Offset returns the offset for pagination
func (f *ChannelConnectionFilter) Offset() int {
	if f.Page < 1 {
		return 0
	}
	return (f.Page - 1) * f.PageSize
}

// Limit returns the limit for pagination
func (f *ChannelConnectionFilter) Limit() int {
	if f.PageSize < 1 {
		return 20
	}
	return f.PageSize
}
