# ACI Authentication Specification

## Overview

The ACI backend uses JWT (JSON Web Tokens) for authentication with RS256 (RSA + SHA-256) signing. This document specifies the authentication flow, token management, and security requirements.

## Authentication Methods

| Method | Use Case | Implementation |
|--------|----------|----------------|
| JWT Bearer Token | User authentication for REST API | `Authorization: Bearer <token>` |
| JWT Query Parameter | WebSocket authentication | `?token=<token>` |
| HMAC Signature | n8n webhook authentication | `X-N8N-Signature: sha256=<sig>` |

## JWT Token Structure

### Access Token

**Algorithm**: RS256 (RSA with SHA-256)
**Expiry**: 15 minutes

#### Header
```json
{
  "alg": "RS256",
  "typ": "JWT"
}
```

#### Payload
```json
{
  "iss": "aci-backend",
  "sub": "123e4567-e89b-12d3-a456-426614174000",
  "aud": "aci-api",
  "exp": 1705315800,
  "iat": 1705314900,
  "jti": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "user"
}
```

| Claim | Type | Description |
|-------|------|-------------|
| `iss` | string | Token issuer (always "aci-backend") |
| `sub` | string (UUID) | User ID |
| `aud` | string | Intended audience (always "aci-api") |
| `exp` | number | Expiration timestamp (Unix) |
| `iat` | number | Issued at timestamp (Unix) |
| `jti` | string (UUID) | Unique token ID |
| `email` | string | User's email address |
| `name` | string | User's display name |
| `role` | string | User role ("user" or "admin") |

### Refresh Token

**Format**: Opaque (random 32-byte string, base64 encoded)
**Storage**: SHA-256 hash stored in database
**Expiry**: 7 days

```
Example: YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5
```

## Authentication Flows

### Login Flow

```
Client                              Server
   |                                   |
   |--- POST /auth/login ------------> |
   |    {email, password}              |
   |                                   |
   |    [Server validates credentials] |
   |    [Server generates tokens]      |
   |                                   |
   |<------------ 200 OK ------------- |
   |    {access_token, refresh_token,  |
   |     expires_in, token_type, user} |
   |                                   |
```

#### Request
```json
POST /v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

#### Response (Success)
```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5",
  "expires_in": 900,
  "token_type": "Bearer",
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  }
}
```

#### Response (Failure)
```json
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid email or password"
  }
}
```

### Token Refresh Flow

```
Client                              Server
   |                                   |
   |--- POST /auth/refresh ----------> |
   |    {refresh_token}                |
   |                                   |
   |    [Server validates token]       |
   |    [Server rotates refresh token] |
   |    [Server generates new access]  |
   |                                   |
   |<------------ 200 OK ------------- |
   |    {access_token, refresh_token,  |
   |     expires_in, token_type}       |
   |                                   |
```

**Important**: Refresh token rotation is enabled. Each refresh generates a new refresh token and invalidates the old one.

#### Request
```json
POST /v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5"
}
```

#### Response
```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "bmV3cmVmcmVzaHRva2VuaGVyZTEyMzQ1Njc4OTA=",
  "expires_in": 900,
  "token_type": "Bearer"
}
```

### Logout Flow

```
Client                              Server
   |                                   |
   |--- POST /auth/logout -----------> |
   |    Authorization: Bearer <token>  |
   |                                   |
   |    [Server revokes refresh token] |
   |                                   |
   |<------------ 204 No Content ----- |
   |                                   |
```

### Registration Flow

```
Client                              Server
   |                                   |
   |--- POST /auth/register ---------> |
   |    {email, password, name}        |
   |                                   |
   |    [Server validates input]       |
   |    [Server creates user]          |
   |    [Server generates tokens]      |
   |                                   |
   |<------------ 201 Created -------- |
   |    {access_token, refresh_token,  |
   |     expires_in, token_type, user} |
   |                                   |
```

## API Authentication

### Bearer Token

Include the access token in the `Authorization` header:

```http
GET /v1/articles HTTP/1.1
Host: api.aci.armor.com
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Validation

The server performs these validation steps:

1. **Parse JWT**: Decode the token and extract header/payload
2. **Verify Signature**: Validate RS256 signature with public key
3. **Check Algorithm**: MUST be RS256 (reject HS256 to prevent algorithm confusion attacks)
4. **Validate Claims**:
   - `iss` must equal "aci-backend"
   - `aud` must equal "aci-api"
   - `exp` must be in the future
   - `iat` must be in the past
5. **Check Revocation**: Verify token ID (`jti`) is not revoked

### Error Responses

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 401 | `TOKEN_EXPIRED` | Token has expired |
| 401 | `TOKEN_REVOKED` | Token has been revoked |
| 403 | `FORBIDDEN` | Valid token but insufficient permissions |

```json
HTTP/1.1 401 Unauthorized
Content-Type: application/json
WWW-Authenticate: Bearer error="invalid_token", error_description="Token has expired"

{
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Access token has expired. Please refresh your token.",
    "request_id": "req_abc123"
  }
}
```

## WebSocket Authentication

### Initial Connection

Pass the JWT token as a query parameter:

```
wss://api.aci.armor.com/ws?token=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Refresh During Connection

When the token is about to expire, the server sends a `token_expiring` message:

```json
{
  "type": "token_expiring",
  "id": "msg-123",
  "timestamp": "2024-01-15T10:44:00Z",
  "payload": {
    "expires_at": "2024-01-15T10:45:00Z",
    "expires_in_seconds": 60
  }
}
```

The client should:
1. Call `POST /v1/auth/refresh` to get new tokens
2. Send an `auth` message with the new access token

```json
{
  "type": "auth",
  "id": "msg-124",
  "timestamp": "2024-01-15T10:44:30Z",
  "payload": {
    "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## n8n Webhook Authentication

### HMAC Signature

Webhooks from n8n are authenticated using HMAC-SHA256 signatures:

```
X-N8N-Signature: sha256=5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d
```

### Signature Computation

```go
func computeSignature(body []byte, secret string) string {
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write(body)
    return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}
```

### Verification

```go
func verifySignature(body []byte, signature, secret string) bool {
    expected := computeSignature(body, secret)
    return hmac.Equal([]byte(expected), []byte(signature))
}
```

## Security Requirements

### Password Requirements

| Requirement | Value |
|-------------|-------|
| Minimum length | 8 characters |
| Maximum length | 128 characters |
| Complexity | At least 1 uppercase, 1 lowercase, 1 digit |
| Hashing | bcrypt with cost 12 |

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /auth/login` | 5 requests | 1 minute per IP |
| `POST /auth/refresh` | 10 requests | 1 minute per user |
| `POST /auth/register` | 3 requests | 1 minute per IP |

### Brute Force Protection

After 5 failed login attempts:
- Progressive delay: 1s, 2s, 4s, 8s, 16s
- After 10 failed attempts: Account locked for 30 minutes
- Send email notification to user

### Token Security

| Measure | Implementation |
|---------|----------------|
| Access token storage | Memory only (never localStorage) |
| Refresh token storage | httpOnly cookie or secure storage |
| Token transmission | HTTPS only |
| Algorithm restriction | RS256 only (reject HS256) |
| Key rotation | Every 90 days with 24-hour overlap |

### CSRF Protection

Not required for Bearer token authentication (tokens are not sent automatically by browsers).

## Key Management

### RSA Key Pair Generation

```bash
# Generate private key (2048-bit minimum, 4096-bit recommended)
openssl genrsa -out private.pem 4096

# Extract public key
openssl rsa -in private.pem -pubout -out public.pem

# Verify key pair
openssl rsa -in private.pem -check
```

### Key Rotation

1. Generate new key pair
2. Update server to accept both old and new public keys (24-hour overlap)
3. Start signing new tokens with new private key
4. After 24 hours (longer than access token lifetime), remove old public key

### Environment Variables

```bash
# Paths to key files
JWT_PRIVATE_KEY_PATH=/secrets/jwt/private.pem
JWT_PUBLIC_KEY_PATH=/secrets/jwt/public.pem

# Or inline (base64 encoded)
JWT_PRIVATE_KEY_BASE64=LS0tLS1CRUdJTi...
JWT_PUBLIC_KEY_BASE64=LS0tLS1CRUdJTi...
```

## Role-Based Access Control (RBAC)

### Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `user` | Standard user | Read articles, manage own alerts/bookmarks |
| `admin` | Administrator | All user permissions + manage sources, review articles |

### Permission Matrix

| Resource | Action | `user` | `admin` |
|----------|--------|--------|---------|
| Articles | Read | Yes | Yes |
| Articles | Create | No | Yes |
| Articles | Update | No | Yes |
| Articles | Delete | No | Yes |
| Alerts | CRUD own | Yes | Yes |
| Alerts | CRUD all | No | Yes |
| Users | Read own | Yes | Yes |
| Users | Read all | No | Yes |
| Sources | CRUD | No | Yes |
| Webhooks | Trigger | No | Yes |

### Middleware Implementation

```go
// RequireAuth ensures user is authenticated
func RequireAuth(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        user, err := GetUserFromContext(r.Context())
        if err != nil {
            response.Unauthorized(w, "Authentication required")
            return
        }
        next.ServeHTTP(w, r)
    })
}

// RequireRole ensures user has required role
func RequireRole(role string) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            user, _ := GetUserFromContext(r.Context())
            if user.Role != role {
                response.Forbidden(w, "Insufficient permissions")
                return
            }
            next.ServeHTTP(w, r)
        })
    }
}
```

## Go Implementation Example

### JWT Service

```go
package jwt

import (
    "crypto/rsa"
    "time"

    "github.com/golang-jwt/jwt/v5"
    "github.com/google/uuid"
)

type Service struct {
    privateKey *rsa.PrivateKey
    publicKey  *rsa.PublicKey
    issuer     string
    audience   string
    accessTTL  time.Duration
    refreshTTL time.Duration
}

type Claims struct {
    jwt.RegisteredClaims
    Email string `json:"email"`
    Name  string `json:"name"`
    Role  string `json:"role"`
}

func NewService(privateKey *rsa.PrivateKey, publicKey *rsa.PublicKey, cfg Config) *Service {
    return &Service{
        privateKey: privateKey,
        publicKey:  publicKey,
        issuer:     "aci-backend",
        audience:   "aci-api",
        accessTTL:  cfg.AccessTokenExpiry,
        refreshTTL: cfg.RefreshTokenExpiry,
    }
}

func (s *Service) GenerateAccessToken(user *domain.User) (string, error) {
    now := time.Now()
    claims := Claims{
        RegisteredClaims: jwt.RegisteredClaims{
            Issuer:    s.issuer,
            Subject:   user.ID.String(),
            Audience:  jwt.ClaimStrings{s.audience},
            ExpiresAt: jwt.NewNumericDate(now.Add(s.accessTTL)),
            IssuedAt:  jwt.NewNumericDate(now),
            ID:        uuid.New().String(),
        },
        Email: user.Email,
        Name:  user.Name,
        Role:  string(user.Role),
    }

    token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
    return token.SignedString(s.privateKey)
}

func (s *Service) ValidateAccessToken(tokenString string) (*Claims, error) {
    token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
        // Verify algorithm is RS256
        if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
            return nil, ErrInvalidAlgorithm
        }
        return s.publicKey, nil
    })

    if err != nil {
        return nil, err
    }

    claims, ok := token.Claims.(*Claims)
    if !ok || !token.Valid {
        return nil, ErrInvalidToken
    }

    // Validate issuer and audience
    if claims.Issuer != s.issuer {
        return nil, ErrInvalidIssuer
    }
    if !claims.VerifyAudience(s.audience, true) {
        return nil, ErrInvalidAudience
    }

    return claims, nil
}

func (s *Service) GenerateRefreshToken() (string, time.Time) {
    token := make([]byte, 32)
    rand.Read(token)
    expiresAt := time.Now().Add(s.refreshTTL)
    return base64.URLEncoding.EncodeToString(token), expiresAt
}
```

### Auth Middleware

```go
package middleware

import (
    "context"
    "net/http"
    "strings"
)

type contextKey string

const UserContextKey contextKey = "user"

func Auth(jwtService *jwt.Service) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // Extract token from Authorization header
            authHeader := r.Header.Get("Authorization")
            if authHeader == "" {
                response.Unauthorized(w, "Missing authorization header")
                return
            }

            parts := strings.SplitN(authHeader, " ", 2)
            if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
                response.Unauthorized(w, "Invalid authorization header format")
                return
            }

            tokenString := parts[1]

            // Validate token
            claims, err := jwtService.ValidateAccessToken(tokenString)
            if err != nil {
                switch {
                case errors.Is(err, jwt.ErrTokenExpired):
                    response.Error(w, http.StatusUnauthorized, "TOKEN_EXPIRED", "Access token has expired")
                default:
                    response.Unauthorized(w, "Invalid access token")
                }
                return
            }

            // Add claims to context
            ctx := context.WithValue(r.Context(), UserContextKey, claims)
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}

func GetUserFromContext(ctx context.Context) (*jwt.Claims, error) {
    claims, ok := ctx.Value(UserContextKey).(*jwt.Claims)
    if !ok {
        return nil, ErrNoUserInContext
    }
    return claims, nil
}
```

## Frontend Integration

### React Authentication Context

```typescript
// authContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshTokenValue, setRefreshTokenValue] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Refresh token before expiry
  const refreshToken = useCallback(async () => {
    if (!refreshTokenValue) return;

    try {
      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshTokenValue }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      setAccessToken(data.access_token);
      setRefreshTokenValue(data.refresh_token);

      // Schedule next refresh
      scheduleRefresh(data.expires_in);
    } catch (error) {
      // Refresh failed, logout user
      logout();
    }
  }, [refreshTokenValue]);

  const scheduleRefresh = (expiresIn: number) => {
    // Refresh 60 seconds before expiry
    const refreshTime = (expiresIn - 60) * 1000;
    setTimeout(refreshToken, refreshTime);
  };

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }

    const data = await response.json();
    setAccessToken(data.access_token);
    setRefreshTokenValue(data.refresh_token);
    setUser(data.user);

    scheduleRefresh(data.expires_in);
  };

  const logout = async () => {
    if (accessToken) {
      try {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      } catch (error) {
        // Ignore logout errors
      }
    }

    setAccessToken(null);
    setRefreshTokenValue(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        login,
        logout,
        refreshToken,
        isAuthenticated: !!accessToken,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### Axios Interceptor

```typescript
// api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

// Request interceptor to add auth header
api.interceptors.request.use((config) => {
  const accessToken = getAccessToken(); // Get from auth context/store
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await refreshToken(); // Call refresh from auth context
        const newAccessToken = getAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```
