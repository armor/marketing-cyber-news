# Frontend API Client Contract

**Feature**: 002-nexus-frontend
**Date**: 2024-12-13

## Overview

This document defines the contract for the frontend API client that communicates with the aci-backend Go service.

## Base Configuration

```typescript
// src/services/api/client.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const apiClient = {
  baseUrl: API_BASE_URL,
  credentials: 'include', // For HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
};
```

## Authentication Endpoints

### Login
```
POST /auth/login
Request:
  { email: string, password: string }
Response:
  { user: User, access_token: string, refresh_token: string, expires_at: string }
Cookie: access_token (HttpOnly, Secure, SameSite=Strict)
```

### Register
```
POST /auth/register
Request:
  { email: string, password: string, name: string }
Response:
  { user: User, access_token: string, refresh_token: string, expires_at: string }
```

### Logout
```
POST /auth/logout
Request:
  { refresh_token?: string, all_devices?: boolean }
Response:
  { message: string }
```

### Refresh Token
```
POST /auth/refresh
Request:
  { refresh_token: string }
Response:
  { access_token: string, refresh_token: string, expires_at: string }
```

## Threat Endpoints

### List Threats
```
GET /threats
Query Parameters:
  - page: number (default: 1)
  - page_size: number (default: 20, max: 100)
  - severity: string[] (critical, high, medium, low)
  - category: string[] (category slugs)
  - source: string[] (source slugs)
  - date_from: string (ISO 8601)
  - date_to: string (ISO 8601)
  - search: string (full-text search)
  - sort_by: string (published_at, severity, title)
  - sort_order: string (asc, desc)
Response:
  {
    data: Threat[],
    pagination: {
      page: number,
      page_size: number,
      total_items: number,
      total_pages: number,
      has_next: boolean,
      has_previous: boolean
    }
  }
```

### Get Threat
```
GET /threats/:id
Response:
  { data: Threat }
```

### Search Threats (Full-text)
```
GET /threats/search
Query Parameters:
  - q: string (required)
  - limit: number (default: 10)
Response:
  { data: Threat[] }
```

## Bookmark Endpoints

### List Bookmarks
```
GET /bookmarks
Response:
  { data: Bookmark[] }
```

### Create Bookmark
```
POST /bookmarks
Request:
  { threat_id: string }
Response:
  { data: Bookmark }
```

### Delete Bookmark
```
DELETE /bookmarks/:id
Response:
  { message: string }
```

## Alert Endpoints

### List Alerts
```
GET /alerts
Response:
  { data: Alert[] }
```

### Create Alert
```
POST /alerts
Request:
  {
    name: string,
    criteria: {
      keywords?: string[],
      severities?: string[],
      categories?: string[],
      sources?: string[]
    },
    enabled?: boolean
  }
Response:
  { data: Alert }
```

### Update Alert
```
PUT /alerts/:id
Request:
  { name?: string, criteria?: AlertCriteria, enabled?: boolean }
Response:
  { data: Alert }
```

### Delete Alert
```
DELETE /alerts/:id
Response:
  { message: string }
```

## Dashboard Endpoints

### Get Dashboard Summary
```
GET /dashboard/summary
Query Parameters:
  - time_range: string (24h, 7d, 30d, 90d)
Response:
  {
    data: {
      total_threats: number,
      critical_count: number,
      new_today: number,
      active_alerts: number,
      severity_distribution: { critical, high, medium, low },
      category_distribution: CategoryCount[],
      recent_activity: ActivityItem[],
      timeline_data: TimelinePoint[]
    }
  }
```

## Analytics Endpoints

### Get Threat Trends
```
GET /analytics/trends
Query Parameters:
  - time_range: string (24h, 7d, 30d, 90d)
  - granularity: string (hour, day, week)
Response:
  { data: TimelinePoint[] }
```

### Get Category Breakdown
```
GET /analytics/categories
Query Parameters:
  - time_range: string
Response:
  { data: CategoryCount[] }
```

### Get Source Analysis
```
GET /analytics/sources
Query Parameters:
  - time_range: string
Response:
  { data: SourceCount[] }
```

## Admin Endpoints

### List Pending Content
```
GET /admin/review-queue
Response:
  { data: PendingContent[] }
```

### Approve Content
```
POST /admin/review/:id/approve
Response:
  { data: Threat }
```

### Reject Content
```
POST /admin/review/:id/reject
Request:
  { reason?: string }
Response:
  { message: string }
```

## Error Response Format

All error responses follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error message",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ],
    "request_id": "uuid-for-tracing"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

## Frontend API Client Implementation

```typescript
// src/services/api/threats.ts
export const threatsApi = {
  list: async (params: ThreatListParams): Promise<PaginatedResponse<Threat>> => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', String(params.page));
    if (params.pageSize) searchParams.set('page_size', String(params.pageSize));
    // ... other params

    const response = await fetch(
      `${API_BASE_URL}/threats?${searchParams}`,
      { credentials: 'include' }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error);
    }

    return response.json();
  },

  get: async (id: string): Promise<Threat> => {
    const response = await fetch(
      `${API_BASE_URL}/threats/${id}`,
      { credentials: 'include' }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error);
    }

    const { data } = await response.json();
    return data;
  },
};
```
