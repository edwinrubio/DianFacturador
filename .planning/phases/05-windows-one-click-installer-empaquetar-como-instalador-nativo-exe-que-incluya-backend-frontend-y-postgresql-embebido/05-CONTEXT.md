# Phase 5: Windows One-Click Installer - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Package DIAN Facturador as a native Windows desktop application (.exe) using Electron. The end user downloads an NSIS installer, double-clicks it, and gets a fully working invoicing app — no Docker, no terminal, no manual database setup. The Electron shell wraps the existing React SPA, launches the FastAPI backend as a sidecar process (PyInstaller-bundled), and manages an embedded PostgreSQL instance. Auto-updates via GitHub Releases keep the app current.

</domain>

<decisions>
## Implementation Decisions

### Packaging Strategy
- **D-01:** Electron + sidecar architecture. Electron wraps the React 19 frontend (Chromium-based). FastAPI backend is bundled as a standalone .exe via PyInstaller and launched as a child/sidecar process. PostgreSQL runs as an embedded portable binary.
- **D-02:** NSIS installer wizard for distribution. Classic Windows installer (Next > Next > Install). Creates Start Menu shortcut, desktop icon, and Add/Remove Programs entry. No portable ZIP option in v1.
- **D-03:** App starts automatically on Windows boot, minimized to system tray. User clicks tray icon to open the main window. This behavior is toggleable in settings.
- **D-04:** Estimated bundle size ~200-250MB. Acceptable for a desktop installer that replaces Docker + 3 containers.

### Update Mechanism
- **D-05:** Auto-update via electron-updater with GitHub Releases as the update source. App checks for updates in background, downloads silently, and prompts "Update available — restart to apply."
- **D-06:** GitHub Releases is the sole distribution and update hosting platform. Open source friendly, free, and natively supported by electron-updater.
- **D-07:** Database migrations run automatically on startup via Alembic (`alembic upgrade head`), same pattern as the Docker deployment. If migration fails, app shows error to user. User data is always preserved across updates.

### Claude's Discretion
- Database embedding approach: Claude decides whether to use PostgreSQL portable binaries, pg_embed, or an alternative. Must be transparent to the user — no manual DB setup.
- WeasyPrint native dependencies: Claude decides how to handle libpango/libcairo on Windows (bundled DLLs, MSYS2, or alternative PDF engine for Windows builds).
- Electron main process architecture: Claude decides IPC patterns, sidecar lifecycle management, health checks, and graceful shutdown sequence.
- Code signing: Claude decides whether to implement Windows code signing in Phase 5 or defer to a later phase.
- System tray UX: Claude decides tray icon design, right-click menu options, and notification patterns.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Infrastructure
- `docker-compose.yml` — Current 3-service architecture (postgres, backend, frontend) that the installer must replicate
- `backend/Dockerfile` — Backend dependencies including WeasyPrint system libs (libpango, libcairo)
- `frontend/Dockerfile` — Frontend build pipeline (npm ci + vite build)
- `backend/requirements.txt` — Full Python dependency list including native extensions (lxml, cryptography, signxml, weasyprint)

### Project Definition
- `.planning/PROJECT.md` — Core value: easy invoicing for personas naturales and microempresas
- `.planning/REQUIREMENTS.md` — v1 requirements (Phase 5 extends INFR requirements with Windows install path)

### Prior Phase Context
- `.planning/phases/01-foundation-and-setup/01-CONTEXT.md` — Foundation decisions (auth, onboarding, certificate handling)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/alembic/` — Migration system already in place, same pattern reused for desktop auto-migration
- `backend/app/main.py` — FastAPI entry point, will be the PyInstaller entry point
- `frontend/dist/` — Vite build output, served directly by Electron instead of nginx
- `docker-compose.yml` — Reference for service orchestration that Electron main process must replicate

### Established Patterns
- Alembic `upgrade head` on startup — already the pattern in docker-compose command
- Environment variables for config (DATABASE_URL, SECRET_KEY, FERNET_KEY, CERT_STORAGE_PATH)
- PostgreSQL 16 as the database — must remain PostgreSQL (not SQLite) for compatibility

### Integration Points
- Electron main process replaces docker-compose as the orchestrator
- PyInstaller bundle replaces the backend Docker container
- Embedded PostgreSQL replaces the postgres Docker container
- Electron's Chromium replaces nginx serving static files
- `CERT_STORAGE_PATH` must map to a user-writable Windows directory (e.g., `%APPDATA%/dian-facturador/certs/`)

</code_context>

<specifics>
## Specific Ideas

- Target audience is non-technical Windows users in Colombia (personas naturales, microempresas) — the install experience must be as simple as any other Windows app
- The app already works via Docker; this phase adds a native Windows path as an alternative, not a replacement
- Docker deployment remains the primary path for servers/advanced users

</specifics>

<deferred>
## Deferred Ideas

- macOS installer (.dmg) — could be a future phase
- Linux AppImage/Flatpak — could be a future phase
- Portable ZIP distribution — user chose NSIS only for v1, could add later
- Beta/canary update channel — start with stable-only channel
- Code signing with EV certificate — evaluate cost/benefit in future phase

</deferred>

---

*Phase: 05-windows-one-click-installer*
*Context gathered: 2026-04-09*
