# Implementation Plan: Armor-Dash Theme Integration

## Summary

Apply Armor-Dash styling to the n8n-cyber-news project, including:
- Merge CSS color systems (map Armor-Dash HSL colors to existing Fortified Horizon variables)
- Redesign login page with Armor-Dash split-screen hero layout
- Update header styling while keeping sidebar layout
- Copy logo assets

## Scope

- **CSS**: Merge Armor-Dash HSL colors into existing design tokens
- **Login Page**: Full redesign with hero section (tailored for internal newsletter platform)
- **Layout**: Keep sidebar, apply Armor-Dash styling to header/footer
- **Assets**: Copy logo images and background

---

## Step 1: Copy Brand Assets

### Files to Copy
**Source**: `~/Development/UI/UI-Uplift/submodules/armor-dash/public/brand/`
**Destination**: `/aci-frontend/public/branding/`

| Source File | Destination |
|-------------|-------------|
| `armor-logo-black.svg` | `branding/logos/armor-black-logo.svg` |
| `armor-logo-white.svg` | `branding/logos/armor-white-logo.svg` |
| `login-bg.jpg` | `branding/login-bg.jpg` |

---

## Step 2: Merge CSS Color Systems

### File to Modify
`/aci-frontend/src/styles/variables.css`

### Changes
Add Armor-Dash HSL colors as aliases to the existing Fortified Horizon system:

```css
:root {
  /* Armor-Dash Light Mode Colors (HSL) */
  --background: 0 0% 92%;
  --foreground: 0 0% 3%;
  --card: 0 0% 100%;
  --card-foreground: 0 0% 3%;
  --primary: 222 47% 11%;           /* Dark navy */
  --primary-foreground: 0 0% 100%;
  --secondary: 0 0% 85%;
  --muted: 0 0% 85%;
  --muted-foreground: 0 0% 10%;
  --border: 0 0% 85%;
  --input: 0 0% 85%;
  --ring: 0 0% 60%;
  --destructive: 0 84% 60%;

  /* Chart colors */
  --chart-1: 217 91% 50%;   /* Blue */
  --chart-2: 142 76% 32%;   /* Green */
  --chart-3: 38 92% 45%;    /* Amber */
  --chart-4: 0 84% 55%;     /* Red */
  --chart-5: 262 83% 52%;   /* Purple */
}

.dark {
  --background: 0 0% 5%;
  --foreground: 0 0% 98%;
  --card: 0 0% 10%;
  --card-foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --primary-foreground: 0 0% 5%;
  --secondary: 0 0% 15%;
  --muted: 0 0% 15%;
  --muted-foreground: 0 0% 65%;
  --border: 0 0% 25%;
  --input: 0 0% 15%;
  --ring: 0 0% 84%;
  --destructive: 0 63% 31%;
}
```

### Tailwind Config Update
**File**: `/aci-frontend/tailwind.config.ts`

Ensure colors map to HSL variables:
```typescript
colors: {
  background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',
  primary: {
    DEFAULT: 'hsl(var(--primary))',
    foreground: 'hsl(var(--primary-foreground))',
  },
  // ... etc
}
```

---

## Step 3: Redesign Login Page

### File to Modify
`/aci-frontend/src/pages/Login.tsx`

### Design Structure
```
┌────────────────────────────────────────────────────────┐
│ Left Side (Desktop)          │ Right Side             │
│ ----------------------------- │ ---------------------- │
│ Background: login-bg.jpg      │ bg-background/85       │
│ Overlay: bg-black/50          │ backdrop-blur-sm       │
│                               │                        │
│ [Armor Logo]                  │ [Mobile Logo]          │
│                               │                        │
│ "AI-Powered Cyber News"       │ "Welcome to Armor"     │
│ "Intelligence Platform"       │ "Sign in to access..." │
│ (gradient text)               │                        │
│                               │ [Email Input]          │
│ Features:                     │ [Password Input]       │
│ • Curated Threat Intel        │ [Sign In Button]       │
│ • AI Content Generation       │                        │
│ • Multi-channel Delivery      │ "Don't have account?"  │
│ • Approval Workflows          │ [Request Access]       │
│                               │                        │
│ Stats:                        │ Security badges        │
│ • X articles/month            │ (internal tool)        │
│ • X newsletters sent          │                        │
└────────────────────────────────────────────────────────┘
```

### Key Styling Classes (from Armor-Dash)
```tsx
// Container
className="min-h-screen flex relative"

// Background image
className="absolute inset-0 bg-cover bg-center bg-no-repeat"
style={{ backgroundImage: `url('/branding/login-bg.jpg')` }}

// Left hero (desktop only)
className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden"

// Dark overlay
className="absolute inset-0 bg-black/50"

// Gradient text
className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300"

// Right form side
className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 sm:p-12 bg-background/85 backdrop-blur-sm"

// Input fields
className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary"

// Submit button
className="w-full bg-primary text-primary-foreground px-4 py-3 rounded-lg font-semibold"
```

### Tailored Content for Internal Newsletter Platform
- **Title**: "AI-Powered Cyber News" / "Intelligence Platform"
- **Features**:
  - "Curated Threat Intelligence"
  - "AI-Generated Newsletter Content"
  - "Multi-Channel Delivery (Email, HubSpot)"
  - "Human-in-the-Loop Approval"
  - "Engagement Analytics"
- **Remove**: External links, version numbers, compliance badges (internal tool)

---

## Step 4: Update Header Styling

### File to Modify
`/aci-frontend/src/components/layout/Header.tsx`

### Changes
Apply Armor-Dash styling to existing header component:
- Use `border-b border-border` for bottom border
- Use Tailwind classes instead of inline CSS variables
- Add consistent spacing: `px-4 py-2`
- User menu styling from Armor-Dash

---

## Step 5: Update Footer Styling

### File to Modify
`/aci-frontend/src/components/layout/Footer.tsx`

### Changes
Apply consistent Armor-Dash styling:
```tsx
<footer className="border-t border-border py-4 text-center text-sm text-muted-foreground">
  <p>© {new Date().getFullYear()} Armor. All rights reserved.</p>
</footer>
```

---

## Step 6: Update Sidebar Styling (AppSidebar)

### File to Modify
`/aci-frontend/src/components/layout/AppSidebar.tsx`

### Changes
Apply Armor-Dash colors while keeping sidebar structure:
- Navigation items: `hover:bg-accent` on hover
- Active state: `bg-accent text-foreground`
- Icons: `text-muted-foreground`
- Logo: Already using theme-aware logos (keep as-is)

---

## Step 7: Global CSS Updates

### File to Modify
`/aci-frontend/src/index.css`

### Add Armor-Dash Utilities
```css
@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}

@layer utilities {
  .backdrop-blur-lg {
    -webkit-backdrop-filter: blur(16px);
    backdrop-filter: blur(16px);
  }
}
```

---

## Files Modified Summary

| File | Change Type |
|------|-------------|
| `aci-frontend/public/branding/logos/armor-black-logo.svg` | Copy from Armor-Dash |
| `aci-frontend/public/branding/logos/armor-white-logo.svg` | Copy from Armor-Dash |
| `aci-frontend/public/branding/login-bg.jpg` | Copy from Armor-Dash |
| `aci-frontend/src/styles/variables.css` | Add HSL color variables |
| `aci-frontend/tailwind.config.ts` | Update color mappings |
| `aci-frontend/src/index.css` | Add base layer styles |
| `aci-frontend/src/pages/Login.tsx` | Full redesign |
| `aci-frontend/src/components/layout/Header.tsx` | Style updates |
| `aci-frontend/src/components/layout/Footer.tsx` | Style updates |
| `aci-frontend/src/components/layout/AppSidebar.tsx` | Style updates |

---

## Verification Checklist

- [x] Login page displays correctly with hero section
- [x] Background image loads
- [x] Dark/light theme switching works
- [x] Gradient text displays correctly
- [x] Form validation works
- [x] Header styling consistent with Armor-Dash
- [x] Sidebar navigation still functional
- [x] Footer displays correctly
- [x] All logos load (black/white variants)
- [x] Responsive design works (mobile + desktop)

## Implementation Complete: 2025-01-09
