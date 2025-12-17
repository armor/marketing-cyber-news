# Quickstart: NEXUS Frontend Dashboard

**Feature**: 002-nexus-frontend
**Date**: 2024-12-13

## Prerequisites

- Node.js 20+ (LTS recommended)
- npm 10+ or yarn 4+
- Backend API running (see `aci-backend/` or use mock server)

## Getting Started

### 1. Install Dependencies

```bash
cd aci-frontend
npm install
```

### 2. Configure Environment

Create `.env.local` in `aci-frontend/`:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_WS_URL=ws://localhost:8080/ws

# Feature Flags (development)
VITE_ENABLE_MSW=true  # Enable mock service worker
VITE_ENABLE_DEVTOOLS=true
```

### 3. Start Development Server

```bash
npm run dev
```

Open http://localhost:5173

### 4. Run Tests

```bash
# Unit tests
npm run test

# Unit tests with coverage
npm run test:coverage

# E2E tests (requires backend or MSW)
npm run test:e2e
```

## Development Workflow

### Adding shadcn/ui Components

```bash
# Add a new component
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
```

### Adding Reviz Charts

Charts are in `src/components/charts/`. Example:

```typescript
import { SeverityDonut } from '@/components/charts/SeverityDonut';

<SeverityDonut data={severityData} />
```

### Creating New Pages

1. Create page component in `src/pages/`
2. Add route in `src/App.tsx`
3. Add navigation link in `src/components/layout/Sidebar.tsx`

### WebSocket Integration

```typescript
import { useWebSocket } from '@/hooks/useWebSocket';

function MyComponent() {
  const { status, lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage?.type === 'threat:new') {
      // Handle new threat
    }
  }, [lastMessage]);
}
```

## Key Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run lint` | Lint code |
| `npm run format` | Format code with Prettier |

## Project Structure Quick Reference

```
src/
├── components/
│   ├── ui/           # shadcn/ui components
│   ├── charts/       # Reviz charts
│   ├── layout/       # Header, Sidebar, Footer
│   └── threat/       # ThreatCard, ThreatDetail, etc.
├── pages/            # Route components
├── services/         # API and WebSocket clients
├── hooks/            # Custom React hooks
├── stores/           # React Context providers
├── types/            # TypeScript definitions
└── utils/            # Helper functions
```

## Mock Server (MSW)

For development without backend:

```bash
# MSW is auto-enabled when VITE_ENABLE_MSW=true
npm run dev
```

Mock handlers are in `src/mocks/handlers.ts`.

## Troubleshooting

### API Connection Issues

1. Verify backend is running: `curl http://localhost:8080/health`
2. Check CORS: Backend should allow `localhost:5173`
3. Check cookies: Browser must accept HttpOnly cookies

### WebSocket Not Connecting

1. Check WebSocket URL in `.env.local`
2. Verify backend WebSocket endpoint is available
3. Check browser console for connection errors

### Build Errors

```bash
# Clear cache and reinstall
rm -rf node_modules .vite
npm install
```

## Next Steps

1. Review `research.md` for technology decisions
2. Check `data-model.md` for type definitions
3. See `plan.md` for implementation phases
