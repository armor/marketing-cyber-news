# Feature Specification: Armor-Dash Theme Integration

**Feature Branch**: `007-armor-dash-theme`
**Created**: 2025-01-09
**Status**: Complete
**Deployed**: 2026-01-09
**Input**: Apply Armor-Dash CSS, login page, and brand assets to n8n-cyber-news

## Overview

Integrate the Armor-Dash design system into the Armor Cyber News platform. This includes:
- Merging HSL-based color variables from Armor-Dash into the existing Fortified Horizon design token system
- Redesigning the login page with Armor-Dash's split-screen hero layout (tailored for internal newsletter platform)
- Applying consistent Armor-Dash styling to header, footer, and sidebar components
- Copying brand assets (logos, background images)

## User Scenarios & Testing

### User Story 1 - Login Experience (Priority: P1)

A user wants to access the Armor Cyber News platform via a professional, branded login page.

**Acceptance Scenarios**:
1. **Given** a user visits /login, **When** the page loads, **Then** they see a split-screen layout with hero on left (desktop) and form on right.
2. **Given** a user on mobile, **When** they view the login page, **Then** they see only the form with mobile logo.
3. **Given** a user in dark mode, **When** viewing the login page, **Then** colors adapt appropriately with white logo.
4. **Given** a user submitting valid credentials, **When** they click Sign In, **Then** the form shows loading state and redirects on success.
5. **Given** invalid credentials, **When** submitted, **Then** an error message appears styled consistently.

### User Story 2 - Theme Consistency (Priority: P1)

A user navigating the application expects consistent styling across all pages.

**Acceptance Scenarios**:
1. **Given** a logged-in user, **When** they navigate between pages, **Then** header/footer/sidebar styling is consistent.
2. **Given** dark mode enabled, **When** viewing any page, **Then** colors match the Armor-Dash dark palette.
3. **Given** any form input, **When** focused, **Then** it shows consistent focus ring styling.

## Requirements

### Functional Requirements

#### CSS System
- **FR-001**: System MUST support HSL-based color variables compatible with Armor-Dash
- **FR-002**: System MUST maintain backward compatibility with existing Tailwind classes
- **FR-003**: System MUST support both light and dark themes

#### Login Page
- **FR-004**: Login page MUST display split-screen layout on desktop (lg+)
- **FR-005**: Login page MUST show hero section with background image
- **FR-006**: Login page MUST display platform-specific features and messaging
- **FR-007**: Login page MUST be responsive (mobile-first)
- **FR-008**: Login page MUST show appropriate logo variant based on theme

#### Brand Assets
- **FR-009**: System MUST include Armor logo in black and white variants
- **FR-010**: System MUST include login background image
- **FR-011**: Logos MUST be SVG format for scalability

## Success Criteria

- **SC-001**: Login page loads in under 2 seconds
- **SC-002**: Background image is optimized (lazy loading, proper sizing)
- **SC-003**: All colors pass WCAG contrast requirements
- **SC-004**: Theme switching works without page reload
- **SC-005**: No visual regressions in existing components

## Out of Scope

- Animation/motion design enhancements
- Additional pages beyond login redesign
- New UI component library
- Typography changes (keeping existing font system)

## Dependencies

- Armor-Dash source: `~/Development/UI/UI-Uplift/submodules/armor-dash/`
- Existing design token system in `aci-frontend/src/styles/variables.css`
- Tailwind CSS v4 configuration

## Source Reference

**Armor-Dash Repository**: `~/Development/UI/UI-Uplift/submodules/armor-dash/`

### Key Source Files
| File | Purpose |
|------|---------|
| `app/globals.css` | Global CSS variables (HSL color system) |
| `tailwind.config.js` | Tailwind color mappings |
| `app/auth/login/page.tsx` | Login page component |
| `public/brand/` | Logo assets and background image |
| `components/navigation/dashboard-header.tsx` | Header component |
| `components/theme-provider.tsx` | Theme system |
