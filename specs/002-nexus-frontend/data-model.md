# Data Model: NEXUS Frontend Dashboard

**Feature**: 002-nexus-frontend
**Date**: 2024-12-13

## Frontend Type Definitions

These TypeScript interfaces represent the data structures used in the frontend. They mirror the backend API responses with frontend-specific additions.

### Core Entities

#### Threat

```typescript
interface Threat {
  id: string;                    // UUID
  title: string;                 // Threat title
  summary: string;               // Brief summary (2-3 sentences)
  content: string;               // Full markdown content
  severity: SeverityLevel;       // critical | high | medium | low
  category: Category;            // Threat classification
  source: Source;                // Intelligence source
  cves: CVE[];                   // Associated CVE IDs
  tags: string[];                // Searchable tags
  armorCta?: string;             // Armor solution call-to-action
  publishedAt: string;           // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
  isBookmarked?: boolean;        // Frontend-enriched field
}

type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

interface CVE {
  id: string;                    // CVE-YYYY-NNNNN format
  score?: number;                // CVSS score (0-10)
  severity?: SeverityLevel;      // Derived from CVSS
}
```

#### Category

```typescript
interface Category {
  id: string;
  name: string;                  // Display name
  slug: string;                  // URL-safe identifier
  description?: string;
  count?: number;                // Number of threats
}

// Predefined categories
const CATEGORIES = [
  'vulnerabilities',
  'ransomware',
  'data-breaches',
  'malware',
  'phishing',
  'threat-actors',
] as const;
```

#### Source

```typescript
interface Source {
  id: string;
  name: string;                  // Display name (e.g., "CISA")
  slug: string;                  // URL-safe identifier
  url?: string;                  // Source website
  logo?: string;                 // Logo URL
  count?: number;                // Number of threats
}
```

#### User

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  emailVerified: boolean;
  lastLoginAt?: string;
  preferences?: UserPreferences;
}

type UserRole = 'user' | 'admin' | 'analyst' | 'viewer';

interface UserPreferences {
  preferredCategories: string[]; // Category IDs
  notificationFrequency: NotificationFrequency;
  emailNotifications: boolean;
  timezone: string;
}

type NotificationFrequency = 'realtime' | 'hourly' | 'daily' | 'weekly' | 'never';
```

#### Bookmark

```typescript
interface Bookmark {
  id: string;
  threatId: string;
  userId: string;
  createdAt: string;
  threat?: Threat;               // Populated on list queries
}
```

#### Alert

```typescript
interface Alert {
  id: string;
  userId: string;
  name: string;                  // User-defined name
  criteria: AlertCriteria;
  enabled: boolean;
  matchCount: number;            // Total matches
  lastTriggeredAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface AlertCriteria {
  keywords?: string[];           // Text matches
  severities?: SeverityLevel[];  // Severity filter
  categories?: string[];         // Category IDs
  sources?: string[];            // Source IDs
}
```

### API Response Types

#### Paginated Response

```typescript
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}
```

#### Dashboard Summary

```typescript
interface DashboardSummary {
  totalThreats: number;
  criticalCount: number;
  newToday: number;
  activeAlerts: number;
  severityDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  categoryDistribution: CategoryCount[];
  recentActivity: ActivityItem[];
  timelineData: TimelinePoint[];
}

interface CategoryCount {
  category: string;
  count: number;
  change?: number;               // Change from previous period
}

interface ActivityItem {
  id: string;
  type: 'threat' | 'alert' | 'system';
  severity?: SeverityLevel;
  title: string;
  timestamp: string;
}

interface TimelinePoint {
  date: string;                  // ISO 8601 date
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}
```

### UI State Types

#### Filter State

```typescript
interface ThreatFilters {
  severities: SeverityLevel[];
  categories: string[];
  sources: string[];
  dateRange: DateRange;
  search: string;
  sortBy: ThreatSortField;
  sortOrder: 'asc' | 'desc';
}

interface DateRange {
  start: string;                 // ISO 8601
  end: string;                   // ISO 8601
}

type ThreatSortField = 'publishedAt' | 'severity' | 'title';
```

#### WebSocket Message Types

```typescript
type WebSocketMessage =
  | { type: 'threat:new'; payload: Threat }
  | { type: 'threat:updated'; payload: Threat }
  | { type: 'alert:triggered'; payload: { alertId: string; threatId: string } }
  | { type: 'notification:new'; payload: Notification }
  | { type: 'connection:ping' }
  | { type: 'connection:pong' };

interface Notification {
  id: string;
  type: 'threat' | 'alert' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}
```

#### Auth State

```typescript
interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  refresh: () => Promise<void>;
}
```

### Chart Data Types

#### Severity Donut Chart

```typescript
interface SeverityDonutData {
  name: SeverityLevel;
  value: number;
  color: string;
  percentage: number;
}
```

#### Threat Timeline Chart

```typescript
interface TimelineChartData {
  date: Date;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

type TimeRange = '24h' | '7d' | '30d' | '90d';
```

#### Category Bar Chart

```typescript
interface CategoryBarData {
  category: string;
  count: number;
  change: number;
  percentage: number;
}
```

## Validation Rules

### Threat Filters

| Field | Validation |
|-------|------------|
| search | Max 200 characters |
| dateRange.start | Valid ISO 8601, before end |
| dateRange.end | Valid ISO 8601, after start |
| pageSize | 10, 20, 50, or 100 |

### Alert Criteria

| Field | Validation |
|-------|------------|
| name | 1-100 characters, required |
| keywords | Max 10 keywords, each max 50 chars |
| severities | At least one if no other criteria |
| categories | Valid category IDs |

## State Transitions

### WebSocket Connection

```
DISCONNECTED → CONNECTING → CONNECTED → DISCONNECTED
                   ↓              ↓
              RECONNECTING ← ERROR ←
```

### Notification State

```
UNREAD → READ → DISMISSED
```

### Alert State

```
DRAFT → ACTIVE ← → PAUSED → DELETED
```
