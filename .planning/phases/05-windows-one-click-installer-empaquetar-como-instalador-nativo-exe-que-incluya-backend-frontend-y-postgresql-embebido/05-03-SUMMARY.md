---
phase: 05-windows-one-click-installer
plan: 03
subsystem: frontend
tags: [electron, vite, build-config, api-client]
requirements: [INST-07]

dependency_graph:
  requires: []
  provides:
    - frontend/src/lib/api.ts reads VITE_API_BASE_URL for configurable API base
    - frontend/.env.electron sets VITE_API_BASE_URL=http://127.0.0.1:8765 for Electron builds
    - npm run build:electron produces dist/ with direct backend URL baked in
  affects:
    - All frontend API calls (via api.ts Axios instance)

tech_stack:
  added: []
  patterns:
    - Vite mode-based env file loading (.env.[mode] convention)
    - import.meta.env for build-time environment variable injection

key_files:
  created:
    - frontend/.env.electron
  modified:
    - frontend/src/lib/api.ts
    - frontend/package.json

decisions:
  - "VITE_API_BASE_URL defaults to /api (Docker/nginx path) when not set — no env var = Docker behavior, no config needed for Docker users"
  - "vite.config.ts left unchanged — proxy config is dev-only and does not affect Electron builds"
  - "build:electron uses vite build only (no tsc -b) because Electron packaging handles TypeScript separately"

metrics:
  duration: "< 5 minutes"
  completed: "2026-04-09"
  tasks_completed: 1
  files_created: 1
  files_modified: 2
---

# Phase 05 Plan 03: Electron Build Target and Configurable API Base URL Summary

**One-liner:** Vite mode-based env file splits Docker (nginx /api proxy) and Electron (direct http://127.0.0.1:8765) API routing with zero config for Docker users.

## What Was Built

Added an Electron-specific Vite build target so the React SPA calls the FastAPI backend directly at `http://127.0.0.1:8765` instead of relying on an nginx reverse proxy (which does not exist in the Electron packaging context).

Three targeted changes:

1. **`frontend/.env.electron`** — new file with `VITE_API_BASE_URL=http://127.0.0.1:8765`. Vite loads this automatically when built with `--mode electron`.

2. **`frontend/src/lib/api.ts`** — changed hardcoded `baseURL: "/api"` to `baseURL: import.meta.env.VITE_API_BASE_URL || "/api"`. Docker builds (where `VITE_API_BASE_URL` is not set) fall back to `/api` unchanged.

3. **`frontend/package.json`** — added `"build:electron": "vite build --mode electron"` script.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add Electron build target and update api.ts base URL | 3b6c70f | frontend/.env.electron, frontend/src/lib/api.ts, frontend/package.json |

## Decisions Made

- **VITE_API_BASE_URL or /api fallback** — Using `|| "/api"` means Docker users never need to set any env var; the behavior is identical to before this change. Only the Electron build path sets the env var.
- **`vite.config.ts` untouched** — The `/api` dev proxy is dev-server-only and has no effect on production builds. No change needed.
- **`build:electron` omits `tsc -b`** — The Electron packager (in plan 05-04) handles its own TypeScript compilation. The `vite build` alone produces the `dist/` assets needed.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. The `VITE_API_BASE_URL` is fully wired: `.env.electron` provides it at build time, `api.ts` reads it at runtime. No placeholder data flows to the UI.

## Self-Check

Verified before writing this summary:
- `frontend/.env.electron` exists with correct content: PASS
- `frontend/src/lib/api.ts` contains `import.meta.env.VITE_API_BASE_URL`: PASS
- `frontend/package.json` contains `build:electron` script: PASS
- `frontend/vite.config.ts` not modified: PASS
- Commit 3b6c70f exists: PASS

## Self-Check: PASSED
