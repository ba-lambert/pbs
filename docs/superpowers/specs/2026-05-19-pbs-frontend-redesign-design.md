# PBS Frontend Redesign (Claude @file:pbs)

## Summary
Redesign the existing React frontend UI/UX to match the Claude design system in `@file:pbs` while keeping all current routes, backend API integrations, and workflows intact. The application will be **light-mode only**, using the **IBM Plex Sans/Mono** typography and the precise visual language defined in the Claude CSS (cards, tables, map controls, toolbar, drawers, and badges). Driver profiles will support photo upload and display.

## Goals
- Match the Claude `pbs` design language (layout, spacing, typography, component styles).
- Keep all current routes and backend integrations unchanged.
- Implement a single reusable table component and form wrapper aligned with the design.
- Map each feature screen to the corresponding Claude layout patterns.
- Add driver profile photo upload and display.
- Light/white mode only.

## Non-goals
- Replacing or changing backend API behavior (except for driver upload support).
- Rebuilding domain workflows or refactoring business logic.
- Adding new feature screens not already in scope.

## Source of Truth
Claude UI design files in `pbs/`:
- `styles.css`: tokens + full layout and component styles.
- `components.jsx`: UI primitives (Button, Card, Badge, Avatar, Modal/Drawer, Toolbar).
- `app.jsx` and `screens.jsx`: layout and per-screen structure.

## Design System Adoption
1. **CSS tokens**: Port `styles.css` into the client, but enforce **light theme only**. Remove dark theme toggles.
2. **Typography**: IBM Plex Sans for body, IBM Plex Mono for numeric/data-heavy UI.
3. **Components**: Implement shared UI primitives that mirror Claude components:
   - `Button`, `Card`, `Input`, `Select`, `Badge`, `Avatar`, `Toolbar`
   - `Modal` / `Drawer`
   - `DataTable` (single shared table)
   - `FormShell` (single shared form wrapper)
4. **App shell**: Sidebar + topbar layout matching Claude grid, spacing, and nav styles.

## Feature Mapping
The existing React routes remain unchanged, but each page is restyled to the Claude patterns:

### Auth
- Login page centered with branded card, consistent form field styling.

### Dashboard / Overview
- KPI cards and summary blocks using Claude card styles.

### Geography (Stops / Parks / Routes)
- Map-first layout using the Claude **Map Editor** pattern:
  - Floating tool palette (line/polygon/selection)
  - Overlay cards for form and meta info
  - Map overlays use light “glass” panels with soft borders
  - WKT generated automatically from drawn geometry

### Fleet (Companies, Buses, Drivers, Operators)
- Table + modal/drawer workflow for CRUD
- Status badges and quick action buttons per row

### Tracking
- Live tracking layout:
  - Status cards
  - Event feed
  - OSM map panel with branded markers

### Trips
- Table and schedule-style list layout using Claude table styles

## Driver Profile Photo Upload
Backend changes:
- Add `profile_image_url` (nullable) to `drivers` table.
- New upload endpoint: multipart form for driver create/update with optional image.
- Store files under backend `uploads/` folder.
- Serve files as static assets (`/uploads/...`) for frontend consumption.

Frontend changes:
- Driver form includes image picker + preview.
- Driver table cards show avatar image if provided; fallback to initials otherwise.

## Data Flow & Integration
- Existing API calls remain.
- Auth uses bearer tokens in headers.
- Uploads use multipart/form-data.
- No changes to routes or navigation schema.

## Accessibility & UX Details
- High-contrast labels and data table headers.
- Keyboard focus styling for inputs/buttons.
- Consistent empty/error/loading states.

## Risks & Mitigations
- **Mismatch between Claude layout and existing data model**: resolve by adapting component layouts to existing fields, not vice versa.
- **CSS conflicts**: migrate to Claude styles systematically and remove conflicting legacy styles.

## Implementation Plan (High-Level)
1. Apply Claude design system CSS and component primitives.
2. Redesign app shell (sidebar, topbar, layout).
3. Re-skin each feature page to match Claude patterns.
4. Implement driver photo upload end-to-end.
5. Integration pass and build verification.
