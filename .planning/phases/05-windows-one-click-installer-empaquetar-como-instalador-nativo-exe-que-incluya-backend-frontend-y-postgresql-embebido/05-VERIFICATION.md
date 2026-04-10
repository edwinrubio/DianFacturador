---
phase: 05-windows-one-click-installer
verified: 2026-04-09T19:30:00Z
status: gaps_found
score: 6/9 must-haves verified
gaps:
  - truth: "Frontend Electron build uses VITE_API_BASE_URL=http://127.0.0.1:8765 for direct backend access"
    status: failed
    reason: "Plan 04 commit (fcaee69) reverted Plan 03's api.ts change. Current HEAD has hardcoded baseURL: \"/api\" — the Electron build cannot reach the backend."
    artifacts:
      - path: "frontend/src/lib/api.ts"
        issue: "baseURL is hardcoded to \"/api\" — VITE_API_BASE_URL env var is not read"
      - path: "frontend/package.json"
        issue: "build:electron script is missing — same commit reverted the scripts section"
    missing:
      - "Restore baseURL: import.meta.env.VITE_API_BASE_URL || \"/api\" in frontend/src/lib/api.ts"
      - "Restore \"build:electron\": \"vite build --mode electron\" in frontend/package.json scripts"
  - truth: "Default Docker build continues to use relative /api URL unchanged"
    status: partial
    reason: "Docker build still uses /api (which is correct), but only because the Electron wiring was reverted — not intentionally preserved. build:electron script is also missing so the CI workflow step npm run build:electron would fail."
    artifacts:
      - path: "frontend/package.json"
        issue: "build:electron script missing — CI pipeline step 9 (npm run build:electron) would fail at build time"
    missing:
      - "Re-add build:electron script — same fix as above gap"
  - truth: "Requirements INST-01 through INST-07 are defined in REQUIREMENTS.md and traceable"
    status: failed
    reason: "INST-xx requirement IDs referenced in all five PLANs do not exist anywhere in REQUIREMENTS.md. The REQUIREMENTS.md traceability table covers only Phase 1-4 requirement IDs (CONF, CATL, FACT, COTZ, REPR, GEST, INFR). Phase 5 has no corresponding entries."
    artifacts:
      - path: ".planning/REQUIREMENTS.md"
        issue: "No INST-01 through INST-07 definitions or traceability entries"
    missing:
      - "Add INST-01 through INST-07 requirement definitions to REQUIREMENTS.md under a new 'Instalador Windows' section"
      - "Add traceability entries mapping INST-xx to Phase 5"
human_verification:
  - test: "Run the NSIS installer on a real Windows 10/11 machine"
    expected: "Setup wizard appears in Spanish, installs successfully, creates desktop icon and Start Menu entry, app launches automatically in tray"
    why_human: "Cannot run Windows NSIS installer from macOS — requires physical Windows test"
  - test: "Launch the Electron app on Windows — verify PostgreSQL initializes and backend sidecar starts"
    expected: "App window opens within 30 seconds showing the DIAN Facturador login page. Tray icon appears."
    why_human: "Requires Windows runtime with the bundled pg16 binaries and PyInstaller exe"
  - test: "Test autostart toggle in settings"
    expected: "Toggling 'Iniciar con Windows' on/off persists to settings.json and the system tray confirms on next restart"
    why_human: "Requires Windows boot sequence and registry verification"
  - test: "Push a v* tag and verify GitHub Actions workflow completes"
    expected: "build-windows.yml triggers, runs all 11 steps, and produces .exe + latest.yml artifacts on GitHub Releases"
    why_human: "Requires GitHub Actions execution on windows-latest runner"
---

# Phase 5: Windows One-Click Installer Verification Report

**Phase Goal:** Package DIAN Facturador as a native Windows desktop application (.exe) using Electron. NSIS installer, auto-start tray (toggleable), auto-update via GitHub Releases. User downloads, double-clicks, and gets a working invoicing app.
**Verified:** 2026-04-09T19:30:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Electron main process starts PostgreSQL, spawns FastAPI sidecar, polls /health, then loads the SPA | VERIFIED | electron/main.js: startPostgres, startBackend, waitForBackend, BrowserWindow.loadFile all present and fully implemented |
| 2 | System tray icon appears with 'Abrir DIAN Facturador' and 'Salir' context menu | VERIFIED | electron/tray.js: createTray exports Menu.buildFromTemplate with exact Spanish labels, double-click handler present |
| 3 | Graceful shutdown kills sidecar and stops PostgreSQL before exit | VERIFIED | electron/main.js before-quit: killBackend (taskkill on win32, SIGTERM elsewhere) then stopPostgres (pg_ctl stop -m fast) then app.exit(0) |
| 4 | Secrets (SECRET_KEY, FERNET_KEY) are generated on first run and persisted in userData | VERIFIED | electron/secrets.js: getSecretKey uses crypto.randomBytes(32).toString('hex') with mode 0o600 write; getFernetKey uses base64url |
| 5 | Autostart is toggleable: reads preference from userData/settings.json | VERIFIED | electron/main.js: loadSettings reads settings.json with default {autostart:true}, ipcMain.handle('set-autostart') and get-autostart present |
| 6 | Frontend Electron build uses VITE_API_BASE_URL=http://127.0.0.1:8765 for direct backend access | FAILED | frontend/src/lib/api.ts at HEAD has baseURL: "/api" (hardcoded). frontend/package.json has no build:electron script. Plan 04 commit (fcaee69) reverted Plan 03's changes. |
| 7 | PyInstaller bundles FastAPI backend with all required hidden imports and data files | VERIFIED | backend/backend.spec: asyncpg.pgproto.pgproto, all uvicorn internals, alembic programmatic API, collect_submodules for cryptography/signxml/zeep/passlib, all datas (alembic/, alembic.ini, app/templates/, weasyprint, signxml, alembic) |
| 8 | GitHub Actions workflow builds the complete Windows installer on tag push (v*) | VERIFIED | .github/workflows/build-windows.yml: triggers on push tags v*, runs on windows-latest, all 11 steps including MSYS2, PyInstaller, npm run build:electron, PG16 download, electron-builder, GitHub Release upload. NOTE: npm run build:electron will fail at runtime because the script no longer exists in frontend/package.json. |
| 9 | NSIS installer has Spanish-language branding and SmartScreen warning | VERIFIED | electron/build/installer.nsh: MUI_WELCOMEPAGE_TITLE "Bienvenido a DIAN Facturador", finish page with SmartScreen text, uninstall data-preservation notice |

**Score:** 6/9 truths verified (gap in truth #6; truth #8 verified in config but will fail at CI runtime due to same root cause as #6)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `electron/package.json` | Electron workspace with NSIS config | VERIFIED | appId co.dianfacturador.app, nsis.include -> build/installer.nsh, electron-updater + auto-launch deps, extraResources for backend and pg16 |
| `electron/main.js` | Main process orchestrator | VERIFIED | 454 lines, full startup sequence, graceful shutdown, conditional autostart, IPC handlers |
| `electron/preload.js` | contextBridge IPC for renderer | VERIFIED | exposes getBackendUrl, onUpdateAvailable, onUpdateDownloaded, restartToUpdate, setAutostart, getAutostart |
| `electron/tray.js` | System tray icon and context menu | VERIFIED | createTray with Spanish menu, double-click handler, tooltip |
| `electron/secrets.js` | First-run secret key generation | VERIFIED | getSecretKey and getFernetKey with crypto.randomBytes, mode 0o600 |
| `electron/updater.js` | Auto-update logic via electron-updater | VERIFIED | setupAutoUpdater with checkForUpdatesAndNotify, autoDownload=true, IPC events |
| `backend/electron_entrypoint.py` | PyInstaller entry point | VERIFIED | sys._MEIPASS chdir, programmatic alembic.command.upgrade (no subprocess), uvicorn.run with env vars |
| `backend/backend.spec` | PyInstaller spec | VERIFIED | All hidden imports, all datas, upx=False, console=False |
| `backend/build_backend.bat` | Windows build script | VERIFIED | pip install, pyinstaller backend.spec, GTK DLL copy from MSYS2 |
| `frontend/.env.electron` | Electron-specific env vars | VERIFIED | Contains VITE_API_BASE_URL=http://127.0.0.1:8765 |
| `frontend/src/lib/api.ts` | Axios instance with configurable baseURL | FAILED | At HEAD: baseURL hardcoded to "/api" — VITE_API_BASE_URL not read. Reverted by commit fcaee69. |
| `frontend/package.json` | Contains build:electron script | FAILED | Script absent at HEAD. Reverted by commit fcaee69. |
| `.github/workflows/build-windows.yml` | CI pipeline for Windows installer | VERIFIED | All 11 steps present, permissions: contents: write, correct triggers |
| `electron/build/installer.nsh` | Custom NSIS script | VERIFIED | Spanish branding, SmartScreen warning, data preservation notice |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| electron/main.js | backend/dist/backend/backend.exe | child_process.spawn | VERIFIED | spawn(exePath, [], {env, ...}) with all required env vars |
| electron/main.js | pg16/bin/pg_ctl.exe | runCommand helper | VERIFIED | runCommand(pgCtl, ['start', '-D', pgData, ...]) |
| electron/main.js | userData/settings.json | loadSettings/saveSettings | VERIFIED | loadSettings reads, saveSettings writes JSON |
| electron/main.js | electron/updater.js | require('./updater') | VERIFIED | const { setupAutoUpdater } = require('./updater') at top of file |
| electron/updater.js | GitHub Releases | electron-updater publish config | VERIFIED | autoUpdater reads build.publish from package.json (provider: github) |
| electron/updater.js | electron/preload.js | mainWindow.webContents.send | VERIFIED | sends 'update-downloaded' and 'update-available' IPC events |
| frontend/src/lib/api.ts | http://127.0.0.1:8765 | VITE_API_BASE_URL env var | NOT WIRED | api.ts hardcoded to "/api" — env var not read at HEAD |
| .github/workflows/build-windows.yml | backend/backend.spec | pyinstaller backend.spec step | VERIFIED | working-directory: backend, run: pyinstaller backend.spec --distpath dist --clean |
| .github/workflows/build-windows.yml | electron/package.json | npm run dist step | VERIFIED | working-directory: electron, npm ci && npm run dist |
| .github/workflows/build-windows.yml | frontend/package.json | npm run build:electron | NOT WIRED | Script build:electron absent from frontend/package.json at HEAD — CI step will fail |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| frontend/src/lib/api.ts | baseURL | VITE_API_BASE_URL env var | No — hardcoded "/api" at HEAD | DISCONNECTED — env var connection reverted |
| electron/main.js | backendProcess env.SECRET_KEY | secrets.js getSecretKey | Yes — crypto.randomBytes(32) | FLOWING |
| electron/main.js | PG_PORT | isPortFree() check | Yes — net.createServer test | FLOWING |

---

## Behavioral Spot-Checks

Step 7b: SKIPPED — No runnable Electron entry point on macOS (Windows-only runtime). Node module check only:

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| electron/main.js exports valid JS | node -e "require('./electron/main.js')" | Cannot run (requires Electron runtime) | SKIP |
| electron/secrets.js exports functions | Verified via Read tool | getSecretKey and getFernetKey exported | PASS |
| frontend/package.json has build:electron | grep in file | Script absent | FAIL |
| api.ts reads VITE_API_BASE_URL | grep in file | Hardcoded "/api" — no env var | FAIL |

---

## Requirements Coverage

**Critical Finding:** Requirement IDs INST-01 through INST-07 referenced in all five PLANs do not exist in `.planning/REQUIREMENTS.md`. The REQUIREMENTS.md contains only: CONF-xx (Phase 1), CATL-xx (Phase 2), FACT-xx (Phase 3), COTZ-xx (Phase 3), REPR-xx (Phase 4), GEST-xx (Phase 4), INFR-xx (Phase 1). There is no "Instalador Windows" or "INST" section.

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| INST-01 | 05-01, 05-02 | Electron + PyInstaller sidecar architecture | ORPHANED | No INST-01 in REQUIREMENTS.md. Implementation exists but requirement undefined. |
| INST-02 | 05-05 | NSIS installer wizard | ORPHANED | No INST-02 in REQUIREMENTS.md. installer.nsh created. |
| INST-03 | 05-01 | System tray + autostart | ORPHANED | No INST-03 in REQUIREMENTS.md. Implemented in tray.js + main.js. |
| INST-04 | 05-04, 05-05 | Auto-update via GitHub Releases | ORPHANED | No INST-04 in REQUIREMENTS.md. updater.js implemented. |
| INST-05 | 05-01 | (Inferred from plan context) | ORPHANED | No INST-05 in REQUIREMENTS.md. |
| INST-06 | 05-01, 05-02 | (Inferred from plan context) | ORPHANED | No INST-06 in REQUIREMENTS.md. |
| INST-07 | 05-03 | Electron-specific Vite build target | ORPHANED | No INST-07 in REQUIREMENTS.md. Implementation is broken at HEAD. |

**All 7 INST requirements are ORPHANED** — they were planned and partially implemented but never registered in REQUIREMENTS.md.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| frontend/src/lib/api.ts | 4 | baseURL hardcoded to "/api" — Electron build will always hit nginx path instead of direct backend | BLOCKER | Electron app cannot communicate with the FastAPI sidecar at runtime |
| frontend/package.json | 7-10 | Missing build:electron script | BLOCKER | CI pipeline step "npm run build:electron" will fail, preventing installer build |
| .planning/REQUIREMENTS.md | — | INST-01 through INST-07 referenced in plans but undefined in requirements | WARNING | Traceability gap — phase work cannot be audited against formal requirements |
| electron/package.json | 25-27 | publish.owner is "YOUR_ORG" placeholder | WARNING | Auto-update will fail to find GitHub Releases until replaced with real org/repo |
| electron/build/ | — | icon.ico not present | INFO | Tray falls back to nativeImage.createEmpty() — app works but has no visible tray icon |

---

## Root Cause Analysis: The Plan 04 Regression

The `build:electron` script and `VITE_API_BASE_URL` wiring in `api.ts` were correctly implemented by Plan 03 in commit `3b6c70f`. However, Plan 04 (auto-update module, commit `fcaee69`) **reverted both changes** to `frontend/package.json` and `frontend/src/lib/api.ts`. The git diff for `fcaee69` shows:

- `frontend/src/lib/api.ts`: changed `baseURL: import.meta.env.VITE_API_BASE_URL || "/api"` back to `baseURL: "/api"`
- `frontend/package.json`: removed `"build:electron": "vite build --mode electron"` from scripts

This was caused by the worktree merge issue documented in the SUMMARY files — when Plan 04's worktree was initialized, it reset to a base commit that pre-dated Plan 03's changes, causing those changes to appear as deletions in Plan 04's diff.

The Plan 04 SUMMARY acknowledges a worktree reset issue and documents a restoration commit (`67883bf`), but `frontend/src/lib/api.ts` and `frontend/package.json` were NOT included in that restoration — only `frontend/.env.electron` was restored.

---

## Human Verification Required

### 1. Full Installation Test on Windows

**Test:** Download and run the NSIS installer on Windows 10 or 11
**Expected:** Setup wizard opens in Spanish, user clicks through, app installs to Program Files, desktop icon and Start Menu entry created, app launches to tray on next boot
**Why human:** Cannot run Windows .exe installer from macOS CI environment

### 2. PostgreSQL Initialization Test

**Test:** Launch Electron app on Windows for the first time (no existing userData)
**Expected:** PG_VERSION file created in userData/postgres-data, database dianfacturador created, backend responds at /health within 30 seconds, main window loads showing login page
**Why human:** Requires Windows runtime + bundled pg16 portable binaries

### 3. Autostart Toggle Verification

**Test:** Open app settings, toggle "Iniciar con Windows" off, reboot Windows, verify app does not launch
**Expected:** App respects settings.json autostart: false preference; after reboot app is not running in tray
**Why human:** Requires Windows registry and boot sequence observation

### 4. Auto-Update End-to-End Test

**Test:** Push v1.0.1 tag with a newer version, wait for CI, then test update from v1.0.0 installation
**Expected:** App detects new version in background, shows "Actualización disponible" notification, user clicks restart, app restarts to v1.0.1
**Why human:** Requires GitHub Actions + real GitHub Releases + two installed versions

---

## Gaps Summary

Two blockers prevent the phase goal from being fully achieved:

**Blocker 1 (Critical): Plan 04 regression reverted Plan 03's frontend wiring**

The Electron build cannot function because `frontend/src/lib/api.ts` does not read `VITE_API_BASE_URL` — when built for Electron, every API call goes to `/api` which does not exist without an nginx reverse proxy. The Electron sidecar architecture requires direct calls to `http://127.0.0.1:8765`. Additionally, the `build:electron` npm script is missing, so the CI pipeline step `npm run build:electron` would fail with "script not found."

Both issues were introduced by commit `fcaee69` (Plan 04) which overwrote the working-tree state of Plan 03's changes due to a worktree merge conflict.

**Fix required:**
1. `frontend/src/lib/api.ts` line 4: change `baseURL: "/api"` to `baseURL: import.meta.env.VITE_API_BASE_URL || "/api"`
2. `frontend/package.json` scripts: add `"build:electron": "vite build --mode electron"`

**Blocker 2 (Traceability): INST requirements missing from REQUIREMENTS.md**

All seven INST-xx requirement IDs referenced across five PLAN files are absent from `.planning/REQUIREMENTS.md`. This is not a runtime blocker but means the phase cannot be formally audited and the traceability coverage count in REQUIREMENTS.md is incorrect.

**Fix required:** Add INST-01 through INST-07 definitions and traceability rows to REQUIREMENTS.md.

---

_Verified: 2026-04-09T19:30:00Z_
_Verifier: Claude (gsd-verifier)_
