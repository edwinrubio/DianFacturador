---
phase: 05-windows-one-click-installer
plan: 01
subsystem: electron-orchestrator
tags: [electron, desktop, postgresql-embedded, sidecar, autostart, tray]
dependency_graph:
  requires: []
  provides:
    - electron/package.json (Electron workspace, electron-builder NSIS config)
    - electron/main.js (main process orchestrator)
    - electron/preload.js (contextBridge IPC surface)
    - electron/tray.js (system tray with Spanish menu)
    - electron/secrets.js (first-run key generation)
  affects:
    - Phase 05 plans 02-05 (all depend on the electron/ workspace created here)
tech_stack:
  added:
    - electron@41.2.0
    - electron-builder@26.8.1
    - electron-updater (latest)
    - electron-log (latest)
    - auto-launch@5.0.6
  patterns:
    - Sidecar lifecycle management via child_process.spawn
    - Health check polling (http.get with 500ms interval, 30s timeout)
    - Conditional autostart via auto-launch + settings.json preference
    - contextBridge IPC (no nodeIntegration, contextIsolation: true)
    - First-run secret generation persisted with mode 0o600
key_files:
  created:
    - electron/package.json
    - electron/.gitignore
    - electron/build/ (empty, for icon.ico later)
    - electron/main.js
    - electron/preload.js
    - electron/tray.js
    - electron/secrets.js
  modified: []
decisions:
  - "Backend port 8765 (not 8000) to avoid conflicts; binds to 127.0.0.1 only — prevents Windows Firewall dialog"
  - "PG_PORT 5432 with fallback 5433: port availability checked via net.createServer; orphan cleanup on crash recovery"
  - "Window close hides to tray (not quit); actual quit only via tray menu or app.quit()"
  - "Secrets persisted as separate .secret_key/.fernet_key files in userData with mode 0o600 (not combined config)"
  - "auto-launch configured conditionally: reads settings.autostart from userData/settings.json, defaults to true"
  - "updater.js loaded dynamically with try/catch so Plan 01 works standalone before Plan 04 implements it"
metrics:
  duration_minutes: 3
  completed_date: "2026-04-09"
  tasks_completed: 2
  files_created: 7
  files_modified: 0
---

# Phase 05 Plan 01: Electron Workspace and Main Process Orchestrator Summary

**One-liner:** Electron main process with embedded PostgreSQL init/start, PyInstaller sidecar spawn with health polling, system tray, toggleable autostart via IPC, and first-run cryptographic secret generation.

## What Was Built

This plan creates the `electron/` workspace that replaces `docker-compose.yml` as the desktop orchestrator. The main process handles the complete startup sequence:

1. Port selection (5432, fallback 5433) with orphan cleanup for crash recovery
2. PostgreSQL cluster initialization (`initdb`) on first run and `pg_ctl start` on subsequent runs
3. Application database creation (`createdb dianfacturador`) — idempotent
4. PyInstaller backend sidecar spawn with correct env vars (DATABASE_URL, SECRET_KEY, FERNET_KEY, CERT_STORAGE_PATH, WEASYPRINT_DLL_DIRECTORIES)
5. Health check polling (`http://127.0.0.1:8765/health`) with 30s timeout
6. BrowserWindow creation serving `frontend/dist/index.html`
7. System tray with Spanish menu (Abrir / Salir) and double-click show/focus
8. Conditional autostart via `auto-launch` based on `userData/settings.json`
9. IPC handlers for `set-autostart` and `get-autostart` for the settings UI

Graceful shutdown (before-quit) kills the backend sidecar (taskkill on Windows, SIGTERM elsewhere) and runs `pg_ctl stop -m fast` before calling `app.exit(0)`.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 1943044 | feat(05-01): initialize Electron workspace with package.json and dependencies |
| Restore | af610a1 | chore(05-01): restore phase 05 planning files accidentally deleted by reset |
| Task 2 | 937dbc0 | feat(05-01): create Electron main process, preload, tray, and secrets modules |

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written with one operational deviation:

**1. [Rule 1 - Bug] Plan files accidentally deleted during git reset --soft**
- **Found during:** Task 1 setup
- **Issue:** `git reset --soft a48f28a` staged all unstaged changes from the worktree delta, causing phase plan files to be included in the Task 1 commit as deletions
- **Fix:** Restored files from base commit via `git checkout a48f28a -- .planning/phases/05-.../`, committed restoration separately
- **Files modified:** All 05-*.md planning files in phase directory
- **Commit:** af610a1

### Design Choices Made During Implementation

- **updater.js dynamic require:** The plan references `setupAutoUpdater(mainWindow)` from `updater.js` (Plan 04). Rather than creating an empty stub that could confuse later implementers, used a `try/catch require` that logs a message when `updater.js` is missing. This is a forward-compatible pattern that allows Plan 01 to stand alone.
- **Platform-specific backend kill:** The plan specifies "SIGTERM on Unix, taskkill on Windows" — implemented with `process.platform === 'win32'` check and `taskkill /PID {pid} /T /F` (kills process tree).

## Known Stubs

- `electron/build/icon.ico` — directory exists but icon file is not yet present. The `tray.js` gracefully falls back to `nativeImage.createEmpty()` when the file is missing, so this does not block functionality.
- `electron/updater.js` — referenced by main.js but not implemented until Plan 05-04. The dynamic require with try/catch means the app runs fine without it.

## Self-Check: PASSED

Files verified to exist:
- electron/package.json — FOUND
- electron/.gitignore — FOUND
- electron/main.js — FOUND
- electron/preload.js — FOUND
- electron/tray.js — FOUND
- electron/secrets.js — FOUND

Commits verified:
- 1943044 — FOUND
- af610a1 — FOUND
- 937dbc0 — FOUND

Key content verified:
- appId: co.dianfacturador.app — PASS
- nsis.include -> build/installer.nsh — PASS
- electron-updater dependency — PASS
- auto-launch@5.0.6 dependency — PASS
- startPostgres, startBackend, waitForBackend functions — PASS
- before-quit graceful shutdown — PASS
- window close -> hide to tray — PASS
- 127.0.0.1 binding only (no 0.0.0.0) — PASS
- loadSettings/saveSettings with settings.json — PASS
- set-autostart / get-autostart IPC handlers — PASS
- contextBridge with getBackendUrl, setAutostart, getAutostart — PASS
- createTray with "Abrir DIAN Facturador" and "Salir" — PASS
- getSecretKey with crypto.randomBytes(32).toString('hex') — PASS
- getFernetKey with base64url encoding — PASS
