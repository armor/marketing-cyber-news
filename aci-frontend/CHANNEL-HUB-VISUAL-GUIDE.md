# Channel Hub Visual Guide

## Component Hierarchy

```
ChannelsPage
├─ Header Section
│  ├─ Breadcrumb Navigation
│  ├─ Page Title & Description
│  └─ Quick Stats (Connected Count, Error Count)
│
├─ ChannelHub (Main Content)
│  ├─ Header Bar
│  │  ├─ Title & Description
│  │  ├─ Connection Status Summary
│  │  └─ Refresh Button
│  │
│  ├─ Connected Channels Grid (3 columns)
│  │  └─ ChannelCard × N
│  │     ├─ Channel Icon (LinkedIn, Twitter, etc.)
│  │     ├─ Status Badge (Connected/Error/Pending)
│  │     ├─ Account Name
│  │     ├─ Error Message (if error)
│  │     ├─ ChannelStats
│  │     │  ├─ Health Indicator
│  │     │  ├─ Posts Count
│  │     │  ├─ Engagement Count
│  │     │  ├─ Engagement Rate
│  │     │  ├─ Last Post Date
│  │     │  └─ Impressions
│  │     ├─ Last Used Timestamp
│  │     └─ OAuthButton (Connect/Disconnect)
│  │
│  └─ Available Channels Section (Collapsible)
│     └─ Available Channel Cards × N
│        ├─ Channel Name
│        ├─ Description
│        └─ Connect Button
│
└─ Help Section
   └─ Getting Started Tips
```

## Visual States

### ChannelCard States

#### 1. Connected & Healthy
```
┌────────────────────────────────┐
│ 🔵 LinkedIn      [Connected ✓] │
│ @armor-security                 │
├────────────────────────────────┤
│ ╭─ Health: Healthy ──────────╮ │
│ │ Posts: 47    Engagement: 3.8k│
│ │ Avg Rate: 13.4%  Last: Dec 20│
│ ╰──────────────────────────────╯ │
│ Last used: Dec 20, 2025         │
│ [ Disconnect ]                  │
└────────────────────────────────┘
```

#### 2. Error State
```
┌────────────────────────────────┐
│ 🔵 Facebook      [⚠️ Error]    │
│ @armor-security-page            │
├────────────────────────────────┤
│ ⚠️ Token expired. Please       │
│    reconnect your account.      │
├────────────────────────────────┤
│ ╭─ Health: Failing ──────────╮ │
│ │ Posts: 32    Engagement: 1.8k│
│ │ Avg Rate: 4.4%   Last: Dec 10│
│ ╰──────────────────────────────╯ │
│ Last used: Dec 10, 2025         │
│ [ Disconnect ]                  │
└────────────────────────────────┘
```

#### 3. Disconnected
```
┌────────────────────────────────┐
│ 📧 Email      [Disconnected]   │
│ Email Marketing                 │
├────────────────────────────────┤
│ (No stats available)            │
│                                 │
│ [ Connect ]                     │
└────────────────────────────────┘
```

#### 4. Loading/Connecting
```
┌────────────────────────────────┐
│ 🐦 Twitter     [⏳ Pending]    │
│ Connecting...                   │
├────────────────────────────────┤
│ [ ⏳ Connecting... ]           │
└────────────────────────────────┘
```

## Color Scheme

### Channel Brand Colors
- **LinkedIn**: `#0077B5` (Professional Blue)
- **Twitter**: `#1DA1F2` (Sky Blue)
- **Facebook**: `#1877F2` (Facebook Blue)
- **Instagram**: `#E4405F` (Instagram Pink/Red)
- **Email**: `var(--color-brand-primary)` (Brand Primary)

### Status Badge Colors
- **Connected**: `var(--color-semantic-success)` (Green)
- **Disconnected**: `var(--color-stone)` (Gray)
- **Error**: `var(--color-semantic-error)` (Red)
- **Pending**: `var(--color-semantic-warning)` (Orange)

### Health Indicator Colors
- **Healthy**: `var(--color-semantic-success)` (Green)
- **Degraded**: `var(--color-semantic-warning)` (Orange)
- **Failing**: `var(--color-semantic-error)` (Red)

## Layout Breakpoints

### Desktop (lg: 1024px+)
- 3-column grid for channel cards
- Full sidebar navigation
- Expanded stats display

### Tablet (md: 768px - 1023px)
- 2-column grid for channel cards
- Collapsed sidebar
- Condensed stats

### Mobile (sm: < 768px)
- Single column layout
- Stacked channel cards
- Minimal stats display
- Touch-optimized buttons

## Interactive Elements

### Buttons

#### Connect Button (Primary)
```
┌─────────────────┐
│   🔗 Connect   │  ← Hover: Opacity 0.9
└─────────────────┘
Background: var(--color-brand-primary)
Color: var(--color-bg-elevated)
```

#### Disconnect Button (Destructive)
```
┌─────────────────┐
│   Disconnect   │  ← Hover: Darker red
└─────────────────┘
Border: var(--color-semantic-error)
Color: var(--color-semantic-error)
Background: transparent
```

#### Refresh Button (Secondary)
```
┌─────────────────┐
│  🔄 Refresh    │  ← Hover: Border highlight
└─────────────────┘
Border: var(--color-border-default)
Color: var(--color-text-primary)
```

### Loading States

#### Spinner Animation
- Refresh button icon rotates when `isFetching`
- OAuth button shows loading text + spinner
- Page-level loading shows centered spinner

#### Skeleton Screens
- Channel cards fade in on load
- Stats shimmer during data fetch

## Data Flow

```
User Action (Connect Button Click)
         ↓
useInitiateOAuth() Mutation
         ↓
POST /api/v1/channels/oauth/initiate
         ↓
Store state in sessionStorage
         ↓
Redirect to OAuth Provider
         ↓
User Authorizes
         ↓
Provider Redirects to /channels/oauth/callback
         ↓
Exchange code for token
         ↓
POST /api/v1/channels/connect
         ↓
React Query Cache Invalidation
         ↓
UI Auto-Refreshes with Connected State
```

## Page Layouts

### Empty State (No Channels)
```
╔═══════════════════════════════════════╗
║  Channel Hub                          ║
║  Manage your social media connections ║
║                                       ║
║  Connected: 0/0         [🔄 Refresh] ║
╠═══════════════════════════════════════╣
║                                       ║
║  ┌───────────────────────────────┐   ║
║  │  No channels connected         │   ║
║  │                                 │   ║
║  │  Connect your first channel to │   ║
║  │  start publishing content       │   ║
║  │                                 │   ║
║  │      [ + Connect Channel ]     │   ║
║  └───────────────────────────────┘   ║
║                                       ║
╚═══════════════════════════════════════╝
```

### Populated State (Multiple Channels)
```
╔═══════════════════════════════════════╗
║  Channel Hub                          ║
║  Manage your social media connections ║
║                                       ║
║  Connected: 3/4         [🔄 Refresh] ║
╠═══════════════════════════════════════╣
║                                       ║
║  ┌─────────┐  ┌─────────┐  ┌────────┐║
║  │LinkedIn │  │ Twitter │  │ Email  │║
║  │Connected│  │Connected│  │Connect │║
║  └─────────┘  └─────────┘  └────────┘║
║                                       ║
║  ┌─────────┐                          ║
║  │Facebook │                          ║
║  │ ⚠️ Error│                          ║
║  └─────────┘                          ║
║                                       ║
║  ▾ Available Channels                ║
║  ┌──────────────────────────────────┐║
║  │ Instagram    [+ Connect]          │║
║  └──────────────────────────────────┘║
╚═══════════════════════════════════════╝
```

## Accessibility Features

### Keyboard Navigation
- `Tab` - Navigate between cards and buttons
- `Enter` - Activate buttons
- `Esc` - Close modals (future)
- `Arrow Keys` - Grid navigation (future enhancement)

### Screen Reader Announcements
- Channel status changes announced
- Loading states announced
- Error messages read aloud
- Success/failure notifications

### Focus Management
- Visible focus rings on interactive elements
- Focus trap during OAuth flow
- Return focus after modal close

### ARIA Labels
```html
<button aria-label="Connect LinkedIn channel">Connect</button>
<div role="status" aria-live="polite">Channel connected</div>
<div role="alert" aria-live="assertive">Connection failed</div>
```

## Performance Metrics

### Target Metrics
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1

### Optimization Strategies
- Lazy load page component
- Debounce refresh actions (500ms)
- Cache API responses (30s stale time)
- Optimistic UI updates
- Image/icon sprite loading

## Error States & Messages

### Connection Errors
```
⚠️ Token expired. Please reconnect your account.
⚠️ OAuth authorization failed. Please try again.
⚠️ Rate limit exceeded. Try again in 15 minutes.
⚠️ Channel connection lost. Click refresh to reconnect.
```

### Network Errors
```
❌ Failed to load channels. Please check your connection.
❌ Unable to connect channel. Server error.
❌ Request timeout. Please try again.
```

### Success Messages (Toast)
```
✓ Channel connected successfully
✓ Channel disconnected
✓ Connection refreshed
```

---

**Visual Design:** Fortified Horizon Theme
**Component Library:** shadcn/ui + Radix UI
**Icons:** Lucide React
**Styling:** Tailwind CSS + Design Tokens
**Responsive:** Mobile-first approach
