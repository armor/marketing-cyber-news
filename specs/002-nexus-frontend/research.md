# Research: NEXUS Frontend Dashboard

**Feature**: 002-nexus-frontend
**Date**: 2024-12-13

## Technology Decisions

### 1. UI Component Library: shadcn/ui

**Decision**: Use shadcn/ui as the primary component library

**Rationale**:
- Built on Radix UI primitives - accessible by default
- Tailwind CSS integration matches existing setup
- Components are copied into project (not a dependency) - full customization control
- Excellent dark theme support
- Growing ecosystem with active community

**Alternatives Considered**:
- **Chakra UI**: Good accessibility but heavier bundle, different styling approach
- **Material UI**: Mature but opinionated design language doesn't match brand
- **Ant Design**: Already included as fallback for complex components (Tables, DatePickers)

### 2. Chart Library: Reviz

**Decision**: Use Reviz for data visualizations

**Rationale**:
- React-native chart library with declarative API
- Excellent TypeScript support
- Lightweight compared to alternatives
- Built for modern React patterns (hooks, composition)
- Good animation support

**Alternatives Considered**:
- **Recharts**: Popular but larger bundle size
- **Victory**: Good but more complex API
- **D3 direct**: Too low-level for this scope
- **Chart.js**: Not React-native, requires wrapper

### 3. State Management: React Context + TanStack Query

**Decision**: Use React Context for UI state, TanStack Query for server state

**Rationale**:
- React Context sufficient for UI state (theme, auth, notifications)
- TanStack Query handles caching, background refetching, optimistic updates
- Reduces boilerplate compared to Redux
- Better separation of concerns (UI state vs server state)

**Alternatives Considered**:
- **Redux Toolkit**: Overkill for this application size
- **Zustand**: Good option but Context is simpler for our needs
- **Jotai/Recoil**: Atomic state not needed for this use case

### 4. WebSocket Client: Native WebSocket + Custom Reconnection

**Decision**: Use native WebSocket API with custom reconnection logic

**Rationale**:
- Native API is sufficient for our needs
- Custom reconnection gives us full control over backoff strategy
- Smaller bundle than socket.io
- Backend uses standard WebSocket protocol

**Alternatives Considered**:
- **Socket.io**: Feature-rich but unnecessary overhead
- **ws**: Server-side only
- **reconnecting-websocket**: Good library but we want custom backoff

### 5. Authentication: HttpOnly Cookies (Backend-Managed)

**Decision**: JWT tokens in HttpOnly cookies set by backend

**Rationale**:
- XSS protection - JavaScript cannot access tokens
- CSRF protection via SameSite cookie attribute
- Automatic inclusion in requests (no manual header management)
- Aligns with security-first constitution principle

**Alternatives Considered**:
- **localStorage**: XSS vulnerable
- **sessionStorage**: Still XSS vulnerable, lost on tab close
- **Memory-only**: Poor UX on refresh

### 6. Routing: react-router-dom v7

**Decision**: Use react-router-dom for client-side routing

**Rationale**:
- De facto standard for React SPAs
- Excellent TypeScript support in v7
- Supports nested routes, route guards
- Built-in scroll restoration

**Alternatives Considered**:
- **TanStack Router**: Newer, but less ecosystem support
- **Wouter**: Lighter but missing features we need

### 7. Testing Strategy

**Decision**: Three-tier testing approach

| Tier | Tool | Coverage Target |
|------|------|----------------|
| Unit | Vitest + React Testing Library | Components, hooks, utils - 80% |
| Integration | React Testing Library | User flows - critical paths |
| E2E | Playwright | Happy paths - 10-15 tests |

**Rationale**:
- Vitest is fast and Vite-native
- React Testing Library enforces good testing practices
- Playwright for reliable cross-browser E2E

### 8. Observability: OpenTelemetry + SigNoz

**Decision**: OpenTelemetry instrumentation with SigNoz backend

**Rationale**:
- Team already uses SigNoz for backend monitoring
- Vendor-neutral instrumentation
- Can trace requests end-to-end (frontend → backend)
- Console logging sufficient for development phase

**Implementation**:
- Use `@opentelemetry/api` for manual spans
- Browser performance API for metrics
- Error boundary for error tracking

## API Integration Patterns

### REST API Client

```typescript
// Pattern: TanStack Query with typed fetch wrapper
const api = {
  threats: {
    list: (params: ThreatListParams) =>
      fetch(`/api/v1/threats?${new URLSearchParams(params)}`),
    get: (id: string) =>
      fetch(`/api/v1/threats/${id}`),
  },
  // ... other resources
};

// Usage in components
const { data, isLoading } = useQuery({
  queryKey: ['threats', params],
  queryFn: () => api.threats.list(params),
});
```

### WebSocket Client

```typescript
// Pattern: Custom hook with reconnection
function useWebSocket(url: string) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>('connecting');

  useEffect(() => {
    const ws = new WebSocket(url);
    // Reconnection with exponential backoff
    // ...
  }, [url]);

  return { socket, status, send };
}
```

## Component Architecture

### Component Hierarchy

```
App
├── AuthProvider (Context)
├── ThemeProvider (Context)
├── QueryClientProvider (TanStack Query)
├── WebSocketProvider (Context)
└── Router
    ├── Layout (Header, Sidebar)
    │   ├── Dashboard
    │   │   ├── MetricCards
    │   │   ├── SeverityChart
    │   │   ├── ThreatTimeline
    │   │   └── ActivityFeed
    │   ├── Threats
    │   │   ├── FilterPanel
    │   │   ├── ThreatList
    │   │   └── ThreatCard
    │   └── ... other pages
    └── ThreatDetail (modal/page)
```

### Component Patterns

1. **Compound Components**: For complex UI like filters
2. **Render Props**: For reusable data fetching patterns
3. **Custom Hooks**: For stateful logic reuse
4. **Composition**: Prefer composition over inheritance

## Performance Optimizations

### Bundle Size

| Strategy | Target |
|----------|--------|
| Code splitting by route | < 100KB per route |
| Tree shaking unused components | Remove unused shadcn/ui |
| Dynamic imports for charts | Load on demand |
| Image optimization | WebP with fallbacks |

### Runtime Performance

| Strategy | Implementation |
|----------|---------------|
| Virtual scrolling | For threat lists > 100 items |
| Debounced search | 300ms debounce on input |
| Memoization | React.memo for expensive renders |
| Skeleton loading | Prevent layout shift |

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Backend API not ready | Use MSW for mocking during development |
| WebSocket reliability | Implement robust reconnection with user feedback |
| Bundle size growth | Set up size budget alerts in CI |
| Browser compatibility | Playwright cross-browser tests |
