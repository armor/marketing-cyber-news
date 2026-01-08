package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
)

// Encryptor provides AES-256-GCM encryption operations
type Encryptor struct {
	key []byte
}

// OAuthTokens represents stored OAuth credentials
type OAuthTokens struct {
	AccessToken  string   `json:"access_token"`
	RefreshToken string   `json:"refresh_token,omitempty"`
	TokenType    string   `json:"token_type"`
	ExpiresAt    int64    `json:"expires_at,omitempty"` // Unix timestamp
	Scopes       []string `json:"scopes,omitempty"`
}

const (
	aes256KeySize = 32 // AES-256 requires 32-byte key
	gcmNonceSize  = 12 // GCM standard nonce size
)

// NewEncryptor creates an encryptor from a hex-encoded key
// Key should be 32 bytes (64 hex chars) for AES-256
func NewEncryptor(hexKey string) (*Encryptor, error) {
	if hexKey == "" {
		return nil, fmt.Errorf("encryption key cannot be empty")
	}

	key, err := hex.DecodeString(hexKey)
	if err != nil {
		return nil, fmt.Errorf("failed to decode hex key: %w", err)
	}

	if len(key) != aes256KeySize {
		return nil, fmt.Errorf("invalid key size: got %d bytes, need %d bytes for AES-256", len(key), aes256KeySize)
	}

	return &Encryptor{key: key}, nil
}

// NewEncryptorFromEnv creates an encryptor from CREDENTIAL_ENCRYPTION_KEY env var
func NewEncryptorFromEnv() (*Encryptor, error) {
	hexKey := os.Getenv("CREDENTIAL_ENCRYPTION_KEY")
	if hexKey == "" {
		return nil, fmt.Errorf("CREDENTIAL_ENCRYPTION_KEY environment variable not set")
	}

	return NewEncryptor(hexKey)
}

// Encrypt encrypts data using AES-256-GCM
// Returns base64-encoded ciphertext with IV prepended
func (e *Encryptor) Encrypt(plaintext []byte) ([]byte, error) {
	if len(plaintext) == 0 {
		return nil, fmt.Errorf("plaintext cannot be empty")
	}

	block, err := aes.NewCipher(e.key)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCM: %w", err)
	}

	// Generate random nonce
	nonce := make([]byte, gcmNonceSize)
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, fmt.Errorf("failed to generate nonce: %w", err)
	}

	// Encrypt and authenticate
	ciphertext := gcm.Seal(nonce, nonce, plaintext, nil)

	// Encode to base64 for storage
	encoded := make([]byte, base64.StdEncoding.EncodedLen(len(ciphertext)))
	base64.StdEncoding.Encode(encoded, ciphertext)

	return encoded, nil
}

// Decrypt decrypts AES-256-GCM encrypted data
func (e *Encryptor) Decrypt(ciphertext []byte) ([]byte, error) {
	if len(ciphertext) == 0 {
		return nil, fmt.Errorf("ciphertext cannot be empty")
	}

	// Decode from base64
	decoded := make([]byte, base64.StdEncoding.DecodedLen(len(ciphertext)))
	n, err := base64.StdEncoding.Decode(decoded, ciphertext)
	if err != nil {
		return nil, fmt.Errorf("failed to decode base64: %w", err)
	}
	decoded = decoded[:n]

	block, err := aes.NewCipher(e.key)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCM: %w", err)
	}

	if len(decoded) < gcmNonceSize {
		return nil, fmt.Errorf("ciphertext too short: need at least %d bytes", gcmNonceSize)
	}

	// Extract nonce and ciphertext
	nonce := decoded[:gcmNonceSize]
	encryptedData := decoded[gcmNonceSize:]

	// Decrypt and verify authentication tag
	plaintext, err := gcm.Open(nil, nonce, encryptedData, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt: %w", err)
	}

	return plaintext, nil
}

// EncryptJSON encrypts a JSON-serializable struct
func (e *Encryptor) EncryptJSON(v interface{}) ([]byte, error) {
	if v == nil {
		return nil, fmt.Errorf("value cannot be nil")
	}

	plaintext, err := json.Marshal(v)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal JSON: %w", err)
	}

	encrypted, err := e.Encrypt(plaintext)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt: %w", err)
	}

	return encrypted, nil
}

// DecryptJSON decrypts and unmarshals into a struct
func (e *Encryptor) DecryptJSON(ciphertext []byte, v interface{}) error {
	if v == nil {
		return fmt.Errorf("destination cannot be nil")
	}

	plaintext, err := e.Decrypt(ciphertext)
	if err != nil {
		return fmt.Errorf("failed to decrypt: %w", err)
	}

	if err := json.Unmarshal(plaintext, v); err != nil {
		return fmt.Errorf("failed to unmarshal JSON: %w", err)
	}

	return nil
}

// EncryptOAuthTokens encrypts OAuth tokens for storage
func (e *Encryptor) EncryptOAuthTokens(tokens *OAuthTokens) ([]byte, error) {
	if tokens == nil {
		return nil, fmt.Errorf("tokens cannot be nil")
	}

	if tokens.AccessToken == "" {
		return nil, fmt.Errorf("access token cannot be empty")
	}

	return e.EncryptJSON(tokens)
}

// DecryptOAuthTokens decrypts stored OAuth tokens
func (e *Encryptor) DecryptOAuthTokens(ciphertext []byte) (*OAuthTokens, error) {
	var tokens OAuthTokens

	if err := e.DecryptJSON(ciphertext, &tokens); err != nil {
		return nil, fmt.Errorf("failed to decrypt OAuth tokens: %w", err)
	}

	if tokens.AccessToken == "" {
		return nil, fmt.Errorf("decrypted tokens missing access token")
	}

	return &tokens, nil
}

// GenerateKey generates a new random 32-byte key for AES-256
// Returns hex-encoded key suitable for environment variable
func GenerateKey() (string, error) {
	key := make([]byte, aes256KeySize)

	if _, err := io.ReadFull(rand.Reader, key); err != nil {
		return "", fmt.Errorf("failed to generate random key: %w", err)
	}

	hexKey := hex.EncodeToString(key)

	return hexKey, nil
}
