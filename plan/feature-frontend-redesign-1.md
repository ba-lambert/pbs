---
goal: "Redesign PBS frontend to match Claude @file:pbs UI while preserving backend workflows"
version: "1.0"
date_created: "2026-05-19"
last_updated: "2026-05-19"
owner: "PBS Team"
status: "Planned"
tags: [feature, design, frontend, ui, ux]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan defines the steps to replace the current frontend UI/UX with the Claude design from `pbs/`, keeping all existing routes and API integrations intact, and adding driver profile photo upload support.

## 1. Requirements & Constraints

- **REQ-001**: Use the Claude design in `/Users/macbookpro/Documents/workspace/sided/python/fastapi/pbs/pbs` as the visual source of truth.
- **REQ-002**: Preserve current routes and API wiring (no workflow changes).
- **REQ-003**: Use **IBM Plex Sans/Mono** (as defined in Claude `styles.css`).
- **REQ-004**: Enforce **light/white mode only**; remove dark/theme toggles.
- **REQ-005**: Provide one reusable table component and one reusable form wrapper for all screens.
- **REQ-006**: Geometry drawing UX remains map-first and continues generating WKT for backend.
- **REQ-007**: Driver profile picture upload and display must be supported end-to-end.
- **CON-001**: Do not introduce new frontend routes; use existing `/dashboard/*` paths.
- **CON-002**: Backend changes limited to driver profile image upload and static serving.
- **PAT-001**: Use feature-based React architecture (`src/app`, `src/features`, `src/shared`).

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Apply Claude design system and app shell.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Port `pbs/styles.css` into `client/src/index.css`, remove dark theme tokens, enforce light mode only. |  |  |
| TASK-002 | Update shared UI primitives in `client/src/shared/ui/*` to match Claude styles (Button, Card, Input, Badge, Avatar, Toolbar, Modal/Drawer). |  |  |
| TASK-003 | Restyle layouts in `client/src/app/layouts/*` (sidebar, topbar, spacing) to match `pbs/app.jsx`. |  |  |
| TASK-004 | Restyle login page `client/src/features/auth/pages/login-page.tsx` to Claude form/card layout. |  |  |

### Implementation Phase 2

- GOAL-002: Redesign feature pages to Claude layouts.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-005 | Map Geography page to Claude Map Editor layout using overlay cards and tool palettes; update `client/src/features/geography/*`. |  |  |
| TASK-006 | Redesign companies/users/buses/drivers pages with Claude table + modal/drawer patterns in `client/src/features/operations/*`. |  |  |
| TASK-007 | Redesign tracking and trips pages using Claude live tracking and schedule patterns in `client/src/features/tracking/*` and trips page. |  |  |
| TASK-008 | Ensure reusable `DataTable` and `FormShell` are used across all CRUD screens. |  |  |

### Implementation Phase 3

- GOAL-003: Add driver photo upload backend and frontend integration.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-009 | Add `profile_image_url` column to drivers table (SQLAlchemy + Alembic). File: `models/entities.py`, new migration in `alembic/versions/`. |  |  |
| TASK-010 | Add upload endpoint and static file serving in FastAPI (`api/v1/routes/fleet.py`, `api/app.py`), store files in `uploads/`. |  |  |
| TASK-011 | Update driver create/update UI to accept image upload and preview in `client/src/features/operations/pages/fleet-page.tsx`. |  |  |
| TASK-012 | Render driver avatars in tables/cards using image URLs with fallback initials. |  |  |

### Implementation Phase 4

- GOAL-004: Integration and verification.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-013 | Run `pnpm build` in `client/` and fix any TypeScript/CSS issues. |  |  |
| TASK-014 | Run backend compile and verify upload endpoint via `curl` (multipart). |  |  |

## 3. Alternatives

- **ALT-001**: Recreate Claude screens 1:1 and adjust backend to fit — rejected due to workflow disruption.
- **ALT-002**: Rebuild UI with new Tailwind token system — rejected to preserve fidelity to Claude CSS.

## 4. Dependencies

- **DEP-001**: Claude design source in `/Users/macbookpro/Documents/workspace/sided/python/fastapi/pbs/pbs`.
- **DEP-002**: Backend FastAPI running with uploads folder accessible for static files.

## 5. Files

- **FILE-001**: `client/src/index.css` (design tokens and base styles).
- **FILE-002**: `client/src/shared/ui/*` (UI primitives).
- **FILE-003**: `client/src/app/layouts/*` (sidebar/topbar layout).
- **FILE-004**: `client/src/features/geography/*`
- **FILE-005**: `client/src/features/operations/*`
- **FILE-006**: `client/src/features/tracking/*`
- **FILE-007**: `client/src/features/auth/pages/login-page.tsx`
- **FILE-008**: `models/entities.py`, `alembic/versions/*` (driver photo field).
- **FILE-009**: `api/v1/routes/fleet.py`, `api/app.py` (upload endpoint + static files).

## 6. Testing

- **TEST-001**: `pnpm build` in `client/` must pass.
- **TEST-002**: `python3 -m compileall -q api models scripts main.py` must pass.
- **TEST-003**: Upload endpoint accepts image and returns URL; driver list renders avatar.

## 7. Risks & Assumptions

- **RISK-001**: CSS conflicts with existing Tailwind classes; mitigate by replacing component class usage consistently.
- **RISK-002**: Upload static serving misconfigured; mitigate with explicit FastAPI static mount and URL checks.
- **ASSUMPTION-001**: Backend can store files in a local `uploads/` folder accessible to API server.

## 8. Related Specifications / Further Reading

- `docs/superpowers/specs/2026-05-19-pbs-frontend-redesign-design.md`
