# ACI Backend API Specification

Version: 1.0.0
Last Updated: December 14, 2025

## Overview

The ACI (Advanced Cybersecurity Intelligence) Backend is a Go-based REST API for a cybersecurity news aggregation and threat intelligence platform (NEXUS). It provides endpoints for user authentication, article/threat management, bookmarks, alerts, and administrative functions.

## Base URL

```
http://localhost:8080/v1
```

### Environment-Specific URLs

- **Development**: `http://localhost:8080/v1`
- **Production**: `https://api.example.com/v1`

## Authentication

The API uses JWT (JSON Web Token) for authentication. All protected endpoints require a valid access token in the `Authorization` header.

### Authentication Flow

1. **Register** - Create a new user account
2. **Login** - Exchange credentials for access and refresh tokens
3. **Access Token** - Short-lived JWT token (validity: ~15 minutes)
4. **Refresh Token** - Long-lived token used to obtain new access tokens (validity: ~7 days)
5. **Token Refresh** - Use refresh token to get new access token without re-logging in

### Request Format

```bash
Authorization: Bearer {access_token}
```

### Token Claims

Access tokens contain the following claims:
- `sub` - User ID
- `email` - User email address
- `exp` - Token expiration time (Unix timestamp)
- `iat` - Token issued at time (Unix timestamp)
- `roles` - Array of user roles (e.g., ["user"], ["admin"])

## Response Format

All API responses follow a consistent JSON structure:

### Success Response (2xx)

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Example"
  },
  "meta": {
    "timestamp": "2025-12-14T10:30:00Z"
  }
}
```

### Error Response (4xx, 5xx)

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context if applicable"
    }
  },
  "meta": {
    "timestamp": "2025-12-14T10:30:00Z",
    "requestId": "req_abc123xyz"
  }
}
```

## Endpoints

### Authentication Endpoints

#### Register New User

**Endpoint**: `POST /auth/register`

**Description**: Create a new user account

**Authentication**: Not required

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123!",
  "full_name": "John Doe"
}
```

**Request Parameters**:
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| email | string | Yes | Valid email format, unique |
| password | string | Yes | Minimum 8 characters, must include uppercase, lowercase, number, special char |
| full_name | string | Yes | Maximum 255 characters |

**Success Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "full_name": "John Doe",
    "created_at": "2025-12-14T10:30:00Z"
  }
}
```

**Error Responses**:
- `400 Bad Request` - Invalid input or validation failed
  - Code: `INVALID_EMAIL` - Email format invalid
  - Code: `EMAIL_EXISTS` - Email already registered
  - Code: `WEAK_PASSWORD` - Password doesn't meet requirements
  - Code: `INVALID_REQUEST` - Missing required fields
- `429 Too Many Requests` - Rate limit exceeded for registrations
  - Code: `RATE_LIMIT_EXCEEDED` - Retry after indicated delay
- `500 Internal Server Error` - Server error
  - Code: `INTERNAL_ERROR` - Unexpected server error

**Example cURL**:
```bash
curl -X POST http://localhost:8080/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "full_name": "John Doe"
  }'
```

---

#### Login

**Endpoint**: `POST /auth/login`

**Description**: Authenticate user and receive access and refresh tokens

**Authentication**: Not required

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123!"
}
```

**Request Parameters**:
| Field | Type | Required |
|-------|------|----------|
| email | string | Yes |
| password | string | Yes |

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 900,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "full_name": "John Doe"
    }
  }
}
```

**Response Parameters**:
| Field | Type | Description |
|-------|------|-------------|
| access_token | string | JWT access token (valid for 15 minutes) |
| refresh_token | string | JWT refresh token (valid for 7 days) |
| token_type | string | Always "Bearer" |
| expires_in | integer | Access token expiry in seconds |
| user | object | User object with id, email, full_name |

**Error Responses**:
- `400 Bad Request` - Invalid input
  - Code: `INVALID_REQUEST` - Missing email or password
- `401 Unauthorized` - Authentication failed
  - Code: `INVALID_CREDENTIALS` - Email or password incorrect
- `429 Too Many Requests` - Rate limit exceeded
  - Code: `RATE_LIMIT_EXCEEDED` - Too many failed login attempts
- `500 Internal Server Error`
  - Code: `INTERNAL_ERROR` - Unexpected server error

**Example cURL**:
```bash
curl -X POST http://localhost:8080/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

---

#### Refresh Access Token

**Endpoint**: `POST /auth/refresh`

**Description**: Obtain a new access token using a refresh token

**Authentication**: Not required (uses refresh token in body)

**Request Body**:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Request Parameters**:
| Field | Type | Required |
|-------|------|----------|
| refresh_token | string | Yes |

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 900
  }
}
```

**Error Responses**:
- `400 Bad Request` - Invalid request
  - Code: `INVALID_REQUEST` - Missing refresh token
- `401 Unauthorized` - Token invalid or expired
  - Code: `INVALID_TOKEN` - Refresh token invalid or expired
- `500 Internal Server Error`
  - Code: `INTERNAL_ERROR` - Unexpected server error

**Example cURL**:
```bash
curl -X POST http://localhost:8080/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

---

#### Logout

**Endpoint**: `POST /auth/logout`

**Description**: Invalidate refresh token and end session

**Authentication**: Required (Bearer token)

**Request Headers**:
```
Authorization: Bearer {access_token}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "Successfully logged out"
  }
}
```

**Error Responses**:
- `401 Unauthorized` - Invalid or missing token
  - Code: `UNAUTHORIZED` - Missing or invalid authentication
- `500 Internal Server Error`
  - Code: `INTERNAL_ERROR` - Unexpected server error

**Example cURL**:
```bash
curl -X POST http://localhost:8080/v1/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### User Endpoints

#### Get Current User Profile

**Endpoint**: `GET /users/me`

**Description**: Retrieve authenticated user's profile information

**Authentication**: Required

**Query Parameters**: None

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "full_name": "John Doe",
    "created_at": "2025-12-14T10:30:00Z",
    "updated_at": "2025-12-14T10:30:00Z",
    "roles": ["user"]
  }
}
```

**Error Responses**:
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - User not found
- `500 Internal Server Error`

**Example cURL**:
```bash
curl -X GET http://localhost:8080/v1/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

#### Update User Profile

**Endpoint**: `PUT /users/me`

**Description**: Update authenticated user's profile

**Authentication**: Required

**Request Body**:
```json
{
  "full_name": "Jane Doe",
  "email": "newemail@example.com"
}
```

**Request Parameters**:
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| full_name | string | No | Maximum 255 characters |
| email | string | No | Valid email format, must be unique |

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "newemail@example.com",
    "full_name": "Jane Doe",
    "updated_at": "2025-12-14T11:30:00Z"
  }
}
```

**Error Responses**:
- `400 Bad Request` - Invalid input
  - Code: `EMAIL_EXISTS` - Email already taken
  - Code: `INVALID_EMAIL` - Invalid email format
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - User not found
- `500 Internal Server Error`

**Example cURL**:
```bash
curl -X PUT http://localhost:8080/v1/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Jane Doe"
  }'
```

---

#### Change Password

**Endpoint**: `POST /users/me/password`

**Description**: Change user password

**Authentication**: Required

**Request Body**:
```json
{
  "current_password": "OldPassword123!",
  "new_password": "NewPassword123!"
}
```

**Request Parameters**:
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| current_password | string | Yes | Current password (must be correct) |
| new_password | string | Yes | Minimum 8 characters, uppercase, lowercase, number, special char |

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "message": "Password updated successfully"
  }
}
```

**Error Responses**:
- `400 Bad Request` - Invalid input
  - Code: `WEAK_PASSWORD` - New password doesn't meet requirements
  - Code: `INVALID_PASSWORD` - Current password incorrect
- `401 Unauthorized` - Invalid or missing token
- `500 Internal Server Error`

**Example cURL**:
```bash
curl -X POST http://localhost:8080/v1/users/me/password \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "OldPassword123!",
    "new_password": "NewPassword123!"
  }'
```

---

### Article/Threat Endpoints

#### List Articles

**Endpoint**: `GET /articles`

**Description**: Retrieve list of articles with optional filtering and pagination

**Authentication**: Optional (returns user bookmarks if authenticated)

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number for pagination |
| limit | integer | 20 | Items per page (max: 100) |
| sort | string | published_at | Sort field: published_at, created_at, relevance_score |
| order | string | desc | Sort order: asc or desc |
| search | string | - | Full-text search in title and description |
| severity | string | - | Filter by severity: critical, high, medium, low |
| category_id | string | - | Filter by category UUID |
| source_id | string | - | Filter by source UUID |
| is_bookmarked | boolean | - | Filter bookmarked articles (requires auth) |

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Critical Vulnerability in OpenSSL",
      "slug": "critical-vulnerability-in-openssl",
      "description": "A new critical vulnerability affecting OpenSSL versions...",
      "content": "Full article content here...",
      "severity": "critical",
      "published_at": "2025-12-14T09:00:00Z",
      "source_id": "550e8400-e29b-41d4-a716-446655440001",
      "source_name": "Security Advisory",
      "category_id": "550e8400-e29b-41d4-a716-446655440002",
      "category_name": "Vulnerabilities",
      "relevance_score": 95,
      "is_bookmarked": false,
      "read_at": null,
      "created_at": "2025-12-14T08:00:00Z",
      "updated_at": "2025-12-14T08:00:00Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 145,
      "pages": 8
    },
    "timestamp": "2025-12-14T10:30:00Z"
  }
}
```

**Error Responses**:
- `400 Bad Request` - Invalid query parameters
  - Code: `INVALID_QUERY` - Invalid filter or pagination values
- `500 Internal Server Error`

**Example cURL**:
```bash
# Basic list
curl -X GET "http://localhost:8080/v1/articles?page=1&limit=20"

# With filters
curl -X GET "http://localhost:8080/v1/articles?severity=critical&category_id=550e8400-e29b-41d4-a716-446655440002"

# With search
curl -X GET "http://localhost:8080/v1/articles?search=openssl&severity=high"

# As authenticated user
curl -X GET "http://localhost:8080/v1/articles?is_bookmarked=true" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

#### Get Article Details

**Endpoint**: `GET /articles/{id}`

**Description**: Retrieve full details of a specific article

**Authentication**: Optional

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Article UUID |

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| mark_read | boolean | Mark article as read for authenticated user (default: true) |

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Critical Vulnerability in OpenSSL",
    "slug": "critical-vulnerability-in-openssl",
    "description": "A new critical vulnerability affecting OpenSSL versions...",
    "content": "Full article content with detailed analysis...",
    "severity": "critical",
    "published_at": "2025-12-14T09:00:00Z",
    "source_id": "550e8400-e29b-41d4-a716-446655440001",
    "source_name": "Security Advisory",
    "category_id": "550e8400-e29b-41d4-a716-446655440002",
    "category_name": "Vulnerabilities",
    "relevance_score": 95,
    "is_bookmarked": false,
    "read_at": "2025-12-14T10:30:00Z",
    "created_at": "2025-12-14T08:00:00Z",
    "updated_at": "2025-12-14T08:00:00Z",
    "enrichment": {
      "affected_products": ["OpenSSL 1.1.1", "OpenSSL 1.0.2"],
      "cvss_score": 9.8,
      "cwe_ids": ["CWE-123", "CWE-456"],
      "attack_vectors": ["Network", "Adjacent Network"]
    }
  }
}
```

**Error Responses**:
- `404 Not Found` - Article not found
- `500 Internal Server Error`

**Example cURL**:
```bash
curl -X GET "http://localhost:8080/v1/articles/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### Bookmark Endpoints

#### Create Bookmark

**Endpoint**: `POST /articles/{id}/bookmark`

**Description**: Bookmark an article

**Authentication**: Required

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Article UUID |

**Success Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "article_id": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2025-12-14T10:30:00Z",
    "message": "Article bookmarked successfully"
  }
}
```

**Error Responses**:
- `400 Bad Request` - Article already bookmarked
  - Code: `ALREADY_BOOKMARKED` - Article already in bookmarks
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - Article not found
- `500 Internal Server Error`

**Example cURL**:
```bash
curl -X POST "http://localhost:8080/v1/articles/550e8400-e29b-41d4-a716-446655440000/bookmark" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

#### Remove Bookmark

**Endpoint**: `DELETE /articles/{id}/bookmark`

**Description**: Remove article from bookmarks

**Authentication**: Required

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Article UUID |

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "article_id": "550e8400-e29b-41d4-a716-446655440000",
    "message": "Bookmark removed successfully"
  }
}
```

**Error Responses**:
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - Article or bookmark not found
- `500 Internal Server Error`

**Example cURL**:
```bash
curl -X DELETE "http://localhost:8080/v1/articles/550e8400-e29b-41d4-a716-446655440000/bookmark" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

#### Get User Bookmarks

**Endpoint**: `GET /users/me/bookmarks`

**Description**: Retrieve authenticated user's bookmarked articles

**Authentication**: Required

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number for pagination |
| limit | integer | 20 | Items per page (max: 100) |
| sort | string | bookmarked_at | Sort field: bookmarked_at, published_at |
| order | string | desc | Sort order: asc or desc |

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Critical Vulnerability in OpenSSL",
      "slug": "critical-vulnerability-in-openssl",
      "severity": "critical",
      "published_at": "2025-12-14T09:00:00Z",
      "source_name": "Security Advisory",
      "category_name": "Vulnerabilities",
      "is_bookmarked": true,
      "bookmarked_at": "2025-12-14T10:30:00Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 42,
      "pages": 3
    }
  }
}
```

**Error Responses**:
- `401 Unauthorized` - Invalid or missing token
- `400 Bad Request` - Invalid query parameters
- `500 Internal Server Error`

**Example cURL**:
```bash
curl -X GET "http://localhost:8080/v1/users/me/bookmarks?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### Category Endpoints

#### List Categories

**Endpoint**: `GET /categories`

**Description**: Retrieve all threat categories

**Authentication**: Not required

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| include_count | boolean | true | Include article count per category |
| sort | string | name | Sort field: name, article_count |
| order | string | asc | Sort order: asc or desc |

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "name": "Vulnerabilities",
      "slug": "vulnerabilities",
      "description": "Security vulnerabilities and CVEs",
      "icon": "icon_url",
      "color": "#FF0000",
      "article_count": 245,
      "created_at": "2025-12-14T08:00:00Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "name": "Malware",
      "slug": "malware",
      "description": "Malware analysis and threats",
      "icon": "icon_url",
      "color": "#FF6600",
      "article_count": 178,
      "created_at": "2025-12-14T08:00:00Z"
    }
  ],
  "meta": {
    "timestamp": "2025-12-14T10:30:00Z"
  }
}
```

**Error Responses**:
- `500 Internal Server Error`

**Example cURL**:
```bash
curl -X GET "http://localhost:8080/v1/categories"
```

---

#### Get Category Details

**Endpoint**: `GET /categories/{id}`

**Description**: Retrieve details of a specific category

**Authentication**: Not required

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Category UUID |

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "name": "Vulnerabilities",
    "slug": "vulnerabilities",
    "description": "Security vulnerabilities and CVEs",
    "icon": "icon_url",
    "color": "#FF0000",
    "article_count": 245,
    "created_at": "2025-12-14T08:00:00Z",
    "updated_at": "2025-12-14T08:00:00Z"
  }
}
```

**Error Responses**:
- `404 Not Found` - Category not found
- `500 Internal Server Error`

**Example cURL**:
```bash
curl -X GET "http://localhost:8080/v1/categories/550e8400-e29b-41d4-a716-446655440002"
```

---

### Alert Endpoints

#### List Alerts

**Endpoint**: `GET /alerts`

**Description**: Retrieve user's security alerts

**Authentication**: Required

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number for pagination |
| limit | integer | 20 | Items per page (max: 100) |
| status | string | - | Filter by status: active, resolved, dismissed |
| severity | string | - | Filter by severity: critical, high, medium, low |
| sort | string | created_at | Sort field: created_at, severity |
| order | string | desc | Sort order: asc or desc |

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "title": "Alert: Critical OpenSSL Vulnerability",
      "description": "A new critical vulnerability has been detected matching your alert criteria",
      "severity": "critical",
      "status": "active",
      "alert_rule_id": "550e8400-e29b-41d4-a716-446655440020",
      "alert_rule_name": "OpenSSL Vulnerabilities",
      "articles": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "title": "Critical Vulnerability in OpenSSL",
          "severity": "critical",
          "published_at": "2025-12-14T09:00:00Z"
        }
      ],
      "created_at": "2025-12-14T09:30:00Z",
      "resolved_at": null
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 8,
      "pages": 1
    }
  }
}
```

**Error Responses**:
- `401 Unauthorized` - Invalid or missing token
- `400 Bad Request` - Invalid query parameters
- `500 Internal Server Error`

**Example cURL**:
```bash
curl -X GET "http://localhost:8080/v1/alerts?status=active&severity=critical" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

#### Get Alert Details

**Endpoint**: `GET /alerts/{id}`

**Description**: Retrieve details of a specific alert

**Authentication**: Required

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Alert UUID |

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "title": "Alert: Critical OpenSSL Vulnerability",
    "description": "A new critical vulnerability has been detected matching your alert criteria",
    "severity": "critical",
    "status": "active",
    "alert_rule_id": "550e8400-e29b-41d4-a716-446655440020",
    "alert_rule_name": "OpenSSL Vulnerabilities",
    "alert_rule_query": "openssl AND (vulnerability OR CVE)",
    "articles": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "Critical Vulnerability in OpenSSL",
        "description": "A new critical vulnerability affecting OpenSSL versions...",
        "severity": "critical",
        "published_at": "2025-12-14T09:00:00Z",
        "category_name": "Vulnerabilities"
      }
    ],
    "created_at": "2025-12-14T09:30:00Z",
    "resolved_at": null
  }
}
```

**Error Responses**:
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - Alert not found
- `500 Internal Server Error`

**Example cURL**:
```bash
curl -X GET "http://localhost:8080/v1/alerts/550e8400-e29b-41d4-a716-446655440010" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

#### Create Alert Rule

**Endpoint**: `POST /alerts`

**Description**: Create a new alert rule for threat monitoring

**Authentication**: Required

**Request Body**:
```json
{
  "name": "OpenSSL Vulnerabilities",
  "description": "Alert on all OpenSSL vulnerabilities",
  "query": "openssl AND (vulnerability OR CVE)",
  "keywords": ["openssl", "vulnerability"],
  "severity_threshold": "high",
  "categories": ["550e8400-e29b-41d4-a716-446655440002"],
  "enabled": true
}
```

**Request Parameters**:
| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| name | string | Yes | Maximum 255 characters |
| description | string | No | Maximum 1000 characters |
| query | string | No | Search query syntax |
| keywords | array | No | Array of keyword strings |
| severity_threshold | string | No | Options: critical, high, medium, low |
| categories | array | No | Array of category UUIDs to filter |
| enabled | boolean | No | Default: true |

**Success Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440020",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "OpenSSL Vulnerabilities",
    "description": "Alert on all OpenSSL vulnerabilities",
    "query": "openssl AND (vulnerability OR CVE)",
    "severity_threshold": "high",
    "enabled": true,
    "created_at": "2025-12-14T10:30:00Z",
    "updated_at": "2025-12-14T10:30:00Z"
  }
}
```

**Error Responses**:
- `400 Bad Request` - Invalid input
  - Code: `INVALID_REQUEST` - Missing required fields
  - Code: `INVALID_QUERY` - Invalid search query syntax
- `401 Unauthorized` - Invalid or missing token
- `500 Internal Server Error`

**Example cURL**:
```bash
curl -X POST "http://localhost:8080/v1/alerts" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OpenSSL Vulnerabilities",
    "query": "openssl",
    "severity_threshold": "high",
    "enabled": true
  }'
```

---

#### Update Alert Rule

**Endpoint**: `PUT /alerts/{id}`

**Description**: Update an existing alert rule

**Authentication**: Required

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Alert UUID |

**Request Body**:
```json
{
  "name": "OpenSSL and Apache Vulnerabilities",
  "enabled": true
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440020",
    "name": "OpenSSL and Apache Vulnerabilities",
    "enabled": true,
    "updated_at": "2025-12-14T11:00:00Z"
  }
}
```

**Error Responses**:
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - Alert not found
- `500 Internal Server Error`

**Example cURL**:
```bash
curl -X PUT "http://localhost:8080/v1/alerts/550e8400-e29b-41d4-a716-446655440020" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OpenSSL and Apache Vulnerabilities"
  }'
```

---

#### Delete Alert Rule

**Endpoint**: `DELETE /alerts/{id}`

**Description**: Delete an alert rule

**Authentication**: Required

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Alert UUID |

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440020",
    "message": "Alert rule deleted successfully"
  }
}
```

**Error Responses**:
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - Alert not found
- `500 Internal Server Error`

**Example cURL**:
```bash
curl -X DELETE "http://localhost:8080/v1/alerts/550e8400-e29b-41d4-a716-446655440020" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

#### Resolve Alert

**Endpoint**: `POST /alerts/{id}/resolve`

**Description**: Mark an alert as resolved

**Authentication**: Required

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Alert UUID |

**Request Body**:
```json
{
  "note": "Issue has been addressed"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "status": "resolved",
    "resolved_at": "2025-12-14T11:30:00Z"
  }
}
```

**Error Responses**:
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - Alert not found
- `500 Internal Server Error`

**Example cURL**:
```bash
curl -X POST "http://localhost:8080/v1/alerts/550e8400-e29b-41d4-a716-446655440010/resolve" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "note": "Issue has been addressed"
  }'
```

---

### Article Approval Workflow Endpoints

The article approval workflow implements a 5-gate sequential approval process. Articles must pass through each gate in order before they can be released for publication.

#### Role-to-Gate Mapping

| User Role | Can Approve Gate | Status After Approval |
|-----------|------------------|----------------------|
| marketing | marketing | pending_branding |
| branding | branding | pending_soc_l1 |
| soc_level_1 | soc_l1 | pending_soc_l3 |
| soc_level_3 | soc_l3 | pending_ciso |
| ciso | ciso | approved |
| admin | Any gate | Advances to next |
| super_admin | Any gate | Advances to next |

#### Get Approval Queue

**Endpoint**: `GET /approvals/queue`

**Description**: Get articles pending approval at the gate corresponding to the authenticated user's role

**Authentication**: Required (approval role required)

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number (min: 1) |
| page_size | integer | 20 | Items per page (1-100) |
| sort_by | string | created_at | Sort field: created_at, severity, category |
| sort_order | string | desc | Sort order: asc, desc |
| category_id | uuid | - | Filter by category |
| severity | string | - | Filter: critical, high, medium, low, informational |
| date_from | datetime | - | Filter articles created after this date |
| date_to | datetime | - | Filter articles created before this date |

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Critical Zero-Day Vulnerability Discovered",
      "slug": "critical-zero-day-vulnerability-discovered",
      "summary": "A critical vulnerability has been found...",
      "category": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "Vulnerabilities",
        "slug": "vulnerabilities",
        "color": "#DC2626"
      },
      "severity": "critical",
      "approvalStatus": "pending_marketing",
      "rejected": false,
      "createdAt": "2025-01-15T10:00:00Z",
      "approvalProgress": {
        "completedGates": [],
        "currentGate": "marketing",
        "pendingGates": ["branding", "soc_l1", "soc_l3", "ciso"],
        "totalGates": 5,
        "completedCount": 0
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 45,
    "totalPages": 3
  },
  "meta": {
    "userRole": "marketing",
    "targetGate": "marketing",
    "queueCount": 45
  }
}
```

**Error Responses**:
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - Code: `INSUFFICIENT_ROLE` - User role does not have approval permissions

**Example cURL**:
```bash
curl -X GET "http://localhost:8080/v1/approvals/queue?page=1&page_size=20&severity=critical" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

#### Approve Article

**Endpoint**: `POST /articles/{id}/approve`

**Description**: Approve an article at the current gate, advancing it to the next gate

**Authentication**: Required (appropriate approval role required)

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | uuid | Article ID |

**Request Body** (optional):
```json
{
  "notes": "Reviewed and approved for publication"
}
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Article approved at marketing gate",
  "article": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "approvalStatus": "pending_branding",
    "rejected": false
  }
}
```

**Error Responses**:
- `400 Bad Request`
  - Code: `INVALID_GATE` - Article is not at your approval gate
  - Code: `ALREADY_REJECTED` - Article has already been rejected
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - Insufficient role for this gate
- `404 Not Found` - Article not found

**Example cURL**:
```bash
curl -X POST "http://localhost:8080/v1/articles/550e8400-e29b-41d4-a716-446655440000/approve" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Content verified and approved"}'
```

---

#### Reject Article

**Endpoint**: `POST /articles/{id}/reject`

**Description**: Reject an article from the approval pipeline with a mandatory reason

**Authentication**: Required (appropriate approval role required)

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | uuid | Article ID |

**Request Body** (required):
```json
{
  "reason": "Content does not meet branding guidelines. Please revise the headline and summary."
}
```

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| reason | string | 10-2000 chars | Mandatory rejection reason |

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Article rejected",
  "article": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "approvalStatus": "rejected",
    "rejected": true
  }
}
```

**Error Responses**:
- `400 Bad Request`
  - Code: `MISSING_REASON` - Rejection reason is required
  - Code: `ALREADY_REJECTED` - Article has already been rejected
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - Insufficient role for this gate
- `404 Not Found` - Article not found

**Example cURL**:
```bash
curl -X POST "http://localhost:8080/v1/articles/550e8400-e29b-41d4-a716-446655440000/reject" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Content does not meet security review standards"}'
```

---

#### Release Article

**Endpoint**: `POST /articles/{id}/release`

**Description**: Release a fully-approved article for public viewing

**Authentication**: Required (admin, ciso, or super_admin role required)

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | uuid | Article ID |

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Article released for publication",
  "article": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "approvalStatus": "released",
    "rejected": false
  }
}
```

**Error Responses**:
- `400 Bad Request` - Code: `NOT_FULLY_APPROVED` - Article must pass all approval gates before release
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - Only admin, ciso, or super_admin can release articles
- `404 Not Found` - Article not found

**Example cURL**:
```bash
curl -X POST "http://localhost:8080/v1/articles/550e8400-e29b-41d4-a716-446655440000/release" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

#### Reset Article

**Endpoint**: `POST /articles/{id}/reset`

**Description**: Reset a rejected article back to the initial pending_marketing state (admin only)

**Authentication**: Required (admin or super_admin role required)

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | uuid | Article ID |

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Article reset to pending_marketing",
  "article": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "approvalStatus": "pending_marketing",
    "rejected": false
  }
}
```

**Error Responses**:
- `400 Bad Request` - Article is not in rejected state
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - Only admin can reset articles
- `404 Not Found` - Article not found

**Example cURL**:
```bash
curl -X POST "http://localhost:8080/v1/articles/550e8400-e29b-41d4-a716-446655440000/reset" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

#### Get Approval History

**Endpoint**: `GET /articles/{id}/approval-history`

**Description**: Get the complete approval history for an article including all gate approvals and rejection details

**Authentication**: Required

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | uuid | Article ID |

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "articleId": "550e8400-e29b-41d4-a716-446655440000",
    "currentStatus": "pending_soc_l1",
    "rejected": false,
    "rejectionDetails": null,
    "releaseDetails": null,
    "approvals": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440010",
        "articleId": "550e8400-e29b-41d4-a716-446655440000",
        "gate": "marketing",
        "approvedBy": "550e8400-e29b-41d4-a716-446655440020",
        "approverName": "John Marketing",
        "approverEmail": "john@example.com",
        "approvedAt": "2025-01-15T11:00:00Z",
        "notes": "Content verified"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440011",
        "articleId": "550e8400-e29b-41d4-a716-446655440000",
        "gate": "branding",
        "approvedBy": "550e8400-e29b-41d4-a716-446655440021",
        "approverName": "Jane Branding",
        "approverEmail": "jane@example.com",
        "approvedAt": "2025-01-15T12:00:00Z",
        "notes": null
      }
    ],
    "progress": {
      "completedGates": ["marketing", "branding"],
      "currentGate": "soc_l1",
      "pendingGates": ["soc_l3", "ciso"],
      "totalGates": 5,
      "completedCount": 2
    }
  }
}
```

**Error Responses**:
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - Article not found

**Example cURL**:
```bash
curl -X GET "http://localhost:8080/v1/articles/550e8400-e29b-41d4-a716-446655440000/approval-history" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

#### Update User Role

**Endpoint**: `PUT /users/{id}/role`

**Description**: Update a user's role (admin only)

**Authentication**: Required (admin or super_admin role required)

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | uuid | User ID |

**Request Body** (required):
```json
{
  "role": "soc_level_1"
}
```

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| role | string | user, marketing, branding, soc_level_1, soc_level_3, ciso, admin, super_admin | New role to assign |

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440030",
    "email": "analyst@example.com",
    "name": "Security Analyst",
    "role": "soc_level_1",
    "updatedAt": "2025-01-15T14:00:00Z"
  }
}
```

**Error Responses**:
- `400 Bad Request` - Invalid role value
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - Only admin can change roles
- `404 Not Found` - User not found

**Example cURL**:
```bash
curl -X PUT "http://localhost:8080/v1/users/550e8400-e29b-41d4-a716-446655440030/role" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "soc_level_1"}'
```

---

### Admin Endpoints

#### Get System Health

**Endpoint**: `GET /health`

**Description**: Check API server and database health status

**Authentication**: Not required

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "timestamp": "2025-12-14T10:30:00Z",
    "services": {
      "database": {
        "status": "connected",
        "response_time_ms": 2
      },
      "cache": {
        "status": "connected",
        "response_time_ms": 1
      }
    },
    "uptime_seconds": 345600
  }
}
```

**Error Responses**:
- `503 Service Unavailable` - Service degraded
  - Code: `SERVICE_UNAVAILABLE` - One or more services are down

**Example cURL**:
```bash
curl -X GET "http://localhost:8080/v1/health"
```

---

#### Get Admin Dashboard Stats

**Endpoint**: `GET /admin/stats`

**Description**: Retrieve system statistics (admin only)

**Authentication**: Required (admin role required)

**Success Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "total_users": 1250,
    "total_articles": 15420,
    "total_alerts": 458,
    "active_alerts": 23,
    "articles_today": 145,
    "new_users_today": 12,
    "avg_articles_per_day": 78,
    "system_health": "healthy",
    "database_size_mb": 2450,
    "cache_hit_rate": 0.87
  }
}
```

**Error Responses**:
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - Insufficient permissions (non-admin user)
- `500 Internal Server Error`

**Example cURL**:
```bash
curl -X GET "http://localhost:8080/v1/admin/stats" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## Error Codes Reference

### Authentication Errors (4xx)

| Code | HTTP Status | Description |
|------|-------------|-------------|
| INVALID_REQUEST | 400 | Missing or invalid required fields |
| INVALID_EMAIL | 400 | Email format is invalid |
| EMAIL_EXISTS | 400 | Email already registered |
| WEAK_PASSWORD | 400 | Password doesn't meet security requirements |
| INVALID_CREDENTIALS | 401 | Email or password is incorrect |
| UNAUTHORIZED | 401 | Missing or invalid authentication token |
| INVALID_TOKEN | 401 | Token is invalid or expired |
| INSUFFICIENT_PERMISSIONS | 403 | User doesn't have required permissions |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests, please retry after delay |

### Resource Errors (4xx)

| Code | HTTP Status | Description |
|------|-------------|-------------|
| NOT_FOUND | 404 | Requested resource doesn't exist |
| ALREADY_BOOKMARKED | 400 | Article is already bookmarked |
| INVALID_QUERY | 400 | Invalid query parameters or filter values |

### Server Errors (5xx)

| Code | HTTP Status | Description |
|------|-------------|-------------|
| INTERNAL_ERROR | 500 | Unexpected server error |
| SERVICE_UNAVAILABLE | 503 | Service temporarily unavailable |
| DATABASE_ERROR | 500 | Database operation failed |

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

### Rate Limit Headers

All responses include rate limit information in headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1702569000
```

### Rate Limit Policies

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Authentication | 5 requests | Per minute per IP |
| Auth (login failures) | 5 attempts | Per 15 minutes |
| General API | 1000 requests | Per hour per user |
| Search | 100 requests | Per minute per user |

### Rate Limit Response

When rate limit exceeded:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please retry after 60 seconds.",
    "retry_after": 60
  }
}
```

---

## Common Query Patterns

### Search Articles for Specific Threat

```bash
curl -X GET "http://localhost:8080/v1/articles" \
  -G \
  --data-urlencode "search=ransomware" \
  --data-urlencode "severity=critical" \
  --data-urlencode "limit=50" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Get Recent Critical Articles

```bash
curl -X GET "http://localhost:8080/v1/articles" \
  -G \
  --data-urlencode "severity=critical" \
  --data-urlencode "sort=published_at" \
  --data-urlencode "order=desc" \
  --data-urlencode "limit=20"
```

### Get User's Bookmarked Articles by Category

```bash
curl -X GET "http://localhost:8080/v1/users/me/bookmarks" \
  -G \
  --data-urlencode "sort=bookmarked_at" \
  --data-urlencode "limit=30" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Monitor Active Alerts

```bash
curl -X GET "http://localhost:8080/v1/alerts" \
  -G \
  --data-urlencode "status=active" \
  --data-urlencode "sort=created_at" \
  --data-urlencode "order=desc" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Pagination

All list endpoints support pagination using `page` and `limit` query parameters:

```json
{
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 245,
      "pages": 13
    }
  }
}
```

- **page**: Current page number (starts at 1)
- **limit**: Items per page (default: 20, max: 100)
- **total**: Total number of items
- **pages**: Total number of pages

### Pagination Example

```bash
# Get page 2 with 30 items per page
curl -X GET "http://localhost:8080/v1/articles?page=2&limit=30"

# Get last page (calculate: total/limit)
curl -X GET "http://localhost:8080/v1/articles?page=13&limit=20"
```

---

## Webhook Support

Webhooks are available for alert notifications. See separate webhook documentation for integration details.

### Supported Events

- `alert.triggered` - Alert rule matched new article
- `article.published` - New article published
- `alert.resolved` - Alert marked as resolved

---

## API Versioning

The API uses URL versioning. Current version is `v1`:

```
Base URL: http://localhost:8080/v1
```

Future versions will be available at `/v2`, `/v3`, etc. Current version (`v1`) will be maintained for backward compatibility.

---

## Best Practices

### Authentication

- Store access tokens securely (e.g., httpOnly cookies, secure storage)
- Use refresh tokens to obtain new access tokens before expiration
- Never expose refresh tokens in client-side code
- Implement logout to invalidate refresh tokens

### Error Handling

- Always check `success` field in response
- Handle rate limiting with exponential backoff
- Log error codes for debugging
- Implement retry logic for 5xx errors

### Performance

- Use pagination for list endpoints
- Filter results server-side using query parameters
- Cache category data (changes infrequently)
- Implement pagination with limit up to 100 items

### Security

- Always use HTTPS in production
- Validate all user input on client side
- Never hardcode credentials in code
- Rotate API keys periodically
- Use strong passwords (minimum 8 characters)

---

### Enhanced Threat Intelligence Endpoints

#### Get Deep Dive Analysis

**Endpoint**: `GET /articles/{id}/deep-dive`

**Description**: Retrieve comprehensive threat intelligence analysis for an article. Premium/Enterprise subscribers receive full analysis; free users receive a preview with upgrade prompt.

**Authentication**: Required

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Article UUID |

**Success Response - Full Access** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440030",
    "article_id": "550e8400-e29b-41d4-a716-446655440000",
    "executive_summary": "This vulnerability represents a critical threat to systems running OpenSSL...",
    "technical_analysis": {
      "summary": "The vulnerability allows remote code execution...",
      "attack_chain": [
        "Attacker crafts malicious SSL handshake",
        "Exploit triggers buffer overflow",
        "Remote code execution achieved"
      ],
      "indicators": [
        "Unusual SSL handshake patterns",
        "Memory corruption indicators"
      ],
      "detection_methods": [
        "Monitor SSL/TLS handshake anomalies",
        "Deploy IDS signatures"
      ],
      "mitigation_strategies": [
        "Patch to OpenSSL 3.0.8 immediately",
        "Implement network segmentation"
      ],
      "tools_used": ["Custom exploit tools"],
      "vulnerabilities": ["CVE-2023-XXXX"]
    },
    "timeline": [
      {
        "date": "2023-02-01T00:00:00Z",
        "title": "Vulnerability discovered",
        "description": "Security researcher identified the flaw",
        "source": "Security Researcher"
      },
      {
        "date": "2023-02-15T00:00:00Z",
        "title": "Vendor notified",
        "description": "OpenSSL team received responsible disclosure",
        "source": "OpenSSL Project"
      }
    ],
    "mitre_techniques": [
      {
        "id": "T1190",
        "name": "Exploit Public-Facing Application",
        "tactic": "Initial Access",
        "description": "Exploiting SSL/TLS implementation flaw",
        "url": "https://attack.mitre.org/techniques/T1190"
      }
    ],
    "iocs": [
      {
        "type": "ip",
        "value": "192.168.1.100",
        "context": "Known C2 server"
      },
      {
        "type": "hash",
        "value": "abc123def456",
        "context": "Malicious payload hash"
      }
    ],
    "threat_actors": [
      {
        "name": "APT-XX",
        "aliases": ["Group-XX"],
        "motivation": "espionage",
        "origin": "Unknown",
        "target_sectors": ["Finance", "Healthcare"],
        "known_techniques": ["T1190", "T1071"],
        "first_seen": "2022-01-01T00:00:00Z",
        "last_seen": "2023-02-20T00:00:00Z"
      }
    ],
    "affected_products": [
      "OpenSSL 1.1.1",
      "OpenSSL 1.0.2"
    ],
    "related_threats": [
      "550e8400-e29b-41d4-a716-446655440001"
    ],
    "required_tier": "premium",
    "created_at": "2023-02-16T10:00:00Z",
    "updated_at": "2023-02-16T10:00:00Z"
  }
}
```

**Success Response - Preview Only** (402 Payment Required):
```json
{
  "error": "Subscription required",
  "message": "This content requires a premium subscription",
  "preview": {
    "preview": "This vulnerability represents a critical threat to systems running OpenSSL versions 1.1.1 and 1.0.2. The flaw allows remote attackers to execute arbitrary code through a crafted SSL handshake. Immediate patching is...",
    "required_tier": "premium",
    "upgrade_url": "https://example.com/pricing",
    "message": "Upgrade to access full threat intelligence analysis with technical details, timelines, and mitigation strategies."
  }
}
```

**Error Responses**:
- `401 Unauthorized` - Invalid or missing token
- `404 Not Found` - Article or deep dive not found
  - Code: `NOT_FOUND` - No deep dive analysis available for this article
- `500 Internal Server Error`

**Example cURL**:
```bash
# Premium user - full access
curl -X GET "http://localhost:8080/v1/articles/550e8400-e29b-41d4-a716-446655440000/deep-dive" \
  -H "Authorization: Bearer YOUR_PREMIUM_TOKEN"

# Free user - preview only
curl -X GET "http://localhost:8080/v1/articles/550e8400-e29b-41d4-a716-446655440000/deep-dive" \
  -H "Authorization: Bearer YOUR_FREE_TOKEN"
```

---

#### Enhanced Article Response Fields

The following fields have been added to article responses (both list and detail endpoints):

**List Endpoint - Additional Fields**:
```json
{
  "industries": [
    {
      "name": "Finance",
      "impact_level": "critical",
      "details": "Banking systems using vulnerable OpenSSL versions"
    },
    {
      "name": "Healthcare",
      "impact_level": "high",
      "details": "Medical devices with SSL/TLS implementations"
    }
  ],
  "has_deep_dive": true
}
```

**Detail Endpoint - Additional Fields**:
```json
{
  "external_references": [
    {
      "title": "CISA Advisory AA23-047A",
      "url": "https://www.cisa.gov/news-events/advisories/aa23-047a",
      "source": "CISA",
      "published_at": "2023-02-16T00:00:00Z"
    },
    {
      "title": "CVE-2023-XXXX",
      "url": "https://nvd.nist.gov/vuln/detail/CVE-2023-XXXX",
      "source": "NVD",
      "published_at": "2023-02-15T00:00:00Z"
    }
  ],
  "recommendations": [
    {
      "title": "Apply Security Patches Immediately",
      "description": "Upgrade to OpenSSL 3.0.8 or later versions that address this vulnerability",
      "priority": "immediate",
      "category": "patch"
    },
    {
      "title": "Monitor SSL/TLS Traffic",
      "description": "Implement enhanced monitoring for SSL/TLS handshake anomalies",
      "priority": "high",
      "category": "monitor"
    },
    {
      "title": "Network Segmentation",
      "description": "Isolate systems running vulnerable OpenSSL versions",
      "priority": "high",
      "category": "mitigate"
    }
  ]
}
```

**Query Parameters - Enhanced Filters**:

The `/articles` endpoint now supports additional filtering:

| Parameter | Type | Description |
|-----------|------|-------------|
| industry | string | Filter by affected industry name |
| has_deep_dive | boolean | Filter articles with deep dive analysis (true/false) |

**Example Queries**:
```bash
# Filter by industry
curl -X GET "http://localhost:8080/v1/articles?industry=Finance"

# Filter articles with deep dive
curl -X GET "http://localhost:8080/v1/articles?has_deep_dive=true"

# Combined filters
curl -X GET "http://localhost:8080/v1/articles?industry=Healthcare&has_deep_dive=true&severity=critical"
```

---

## Data Models

### Industry Object

```json
{
  "name": "string",
  "impact_level": "critical" | "high" | "medium" | "low",
  "details": "string"
}
```

### External Reference Object

```json
{
  "title": "string",
  "url": "string",
  "source": "string",
  "published_at": "ISO 8601 timestamp"
}
```

### Recommendation Object

```json
{
  "title": "string",
  "description": "string",
  "priority": "immediate" | "high" | "medium" | "low",
  "category": "patch" | "monitor" | "mitigate" | "investigate" | "configure" | "update"
}
```

### MITRE Technique Object

```json
{
  "id": "string",
  "name": "string",
  "tactic": "string",
  "description": "string",
  "url": "string"
}
```

### Timeline Event Object

```json
{
  "date": "ISO 8601 timestamp",
  "title": "string",
  "description": "string",
  "source": "string"
}
```

### Technical Analysis Object

```json
{
  "summary": "string",
  "attack_chain": ["string"],
  "indicators": ["string"],
  "detection_methods": ["string"],
  "mitigation_strategies": ["string"],
  "tools_used": ["string"],
  "vulnerabilities": ["string"]
}
```

### Threat Actor Profile Object

```json
{
  "name": "string",
  "aliases": ["string"],
  "motivation": "financial" | "espionage" | "hacktivism" | "terrorism" | "unknown",
  "origin": "string",
  "target_sectors": ["string"],
  "known_techniques": ["string"],
  "first_seen": "ISO 8601 timestamp",
  "last_seen": "ISO 8601 timestamp"
}
```

### Subscription Tiers

| Tier | Deep Dive Access | Additional Features |
|------|------------------|---------------------|
| free | Preview only (200 chars) | Basic threat intelligence |
| premium | Full access | Complete analysis, IOCs, MITRE techniques |
| enterprise | Full access | Priority support, custom integrations |

---

## Support

For API issues or questions:

- Documentation: `/docs/API.md`
- Issues: Report via GitHub Issues
- Email: api-support@example.com
- Status Page: https://status.example.com

---

## Changelog

### v1.1.0 (2025-12-15)

- **NEW**: Deep dive threat intelligence endpoint
- **NEW**: Enhanced article responses with industries, external references, recommendations
- **NEW**: Subscription-based access control for premium content
- **NEW**: Filter articles by industry and deep dive availability
- **NEW**: Comprehensive threat actor profiles
- **NEW**: MITRE ATT&CK technique mapping
- **NEW**: Timeline events for threat evolution tracking

### v1.0.0 (2025-12-14)

- Initial API release
- Authentication endpoints (register, login, refresh, logout)
- User profile management
- Article listing and search
- Bookmark management
- Alert rules and notifications
- Category browsing
- Admin statistics endpoint
- Rate limiting and error handling

