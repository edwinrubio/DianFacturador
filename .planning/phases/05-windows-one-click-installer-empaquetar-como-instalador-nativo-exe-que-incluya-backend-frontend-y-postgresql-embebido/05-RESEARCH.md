# Phase 5: Windows One-Click Installer - Research

**Researched:** 2026-04-09
**Domain:** Electron desktop packaging, PyInstaller, embedded PostgreSQL, NSIS installer, auto-update
**Confidence:** MEDIUM (core patterns well-established; WeasyPrint Windows DLL bundling is the primary HIGH-RISK area)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Electron + sidecar architecture. Electron wraps the React 19 frontend (Chromium-based). FastAPI backend is bundled as a standalone .exe via PyInstaller and launched as a child/sidecar process. PostgreSQL runs as an embedded portable binary.
- **D-02:** NSIS installer wizard for distribution. Classic Windows installer (Next > Next > Install). Creates Start Menu shortcut, desktop icon, and Add/Remove Programs entry. No portable ZIP option in v1.
- **D-03:** App starts automatically on Windows boot, minimized to system tray. User clicks tray icon to open the main window. This behavior is toggleable in settings.
- **D-04:** Estimated bundle size ~200-250MB. Acceptable for a desktop installer that replaces Docker + 3 containers.
- **D-05:** Auto-update via electron-updater with GitHub Releases as the update source. App checks for updates in background, downloads silently, and prompts "Update available — restart to apply."
- **D-06:** GitHub Releases is the sole distribution and update hosting platform.
- **D-07:** Database migrations run automatically on startup via Alembic (`alembic upgrade head`). If migration fails, app shows error to user. User data is always preserved across updates.

### Claude's Discretion
- Database embedding approach: Claude decides whether to use PostgreSQL portable binaries, pg_embed, or an alternative. Must be transparent to the user — no manual DB setup.
- WeasyPrint native dependencies: Claude decides how to handle libpango/libcairo on Windows (bundled DLLs, MSYS2, or alternative PDF engine for Windows builds).
- Electron main process architecture: Claude decides IPC patterns, sidecar lifecycle management, health checks, and graceful shutdown sequence.
- Code signing: Claude decides whether to implement Windows code signing in Phase 5 or defer to a later phase.
- System tray UX: Claude decides tray icon design, right-click menu options, and notification patterns.

### Deferred Ideas (OUT OF SCOPE)
- macOS installer (.dmg) — could be a future phase
- Linux AppImage/Flatpak — could be a future phase
- Portable ZIP distribution — user chose NSIS only for v1, could add later
- Beta/canary update channel — start with stable-only channel
- Code signing with EV certificate — evaluate cost/benefit in future phase
</user_constraints>

---

## Summary

Phase 5 replaces the Docker deployment with a native Windows `.exe` installer. The architecture has three embedded components that Electron's main process must orchestrate: (1) a PyInstaller-bundled FastAPI backend running as a sidecar child process, (2) a portable PostgreSQL 16 binary cluster stored in `%APPDATA%`, and (3) the React 19 SPA served directly via Electron's Chromium renderer (no nginx needed). The NSIS installer, built by electron-builder, handles Start Menu/desktop shortcuts, Add/Remove Programs registration, and autostart registry entry.

The primary technical risks are: (a) WeasyPrint's GTK/Pango/Cairo DLLs on Windows require MSYS2 binaries bundled alongside the PyInstaller output — this is the most complex packaging step in the phase; (b) PyInstaller antivirus false positives are expected without code signing — deferring code signing (as allowed by CONTEXT.md) means first-time users will see a SmartScreen warning; (c) the `embedded-postgres` npm package (v18.3.0-beta.16) is still in beta and downloads binaries from npm at install time, making it unsuitable as the primary PostgreSQL embedding strategy.

**Primary recommendation:** Use portable EDB PostgreSQL 16 binaries bundled via electron-builder `extraResources`. The main process initializes (`initdb`) and starts (`pg_ctl start`) the cluster on first launch, storing data in `app.getPath('userData')/postgres-data`. For WeasyPrint, bundle the required MSYS2 GTK DLLs (libpango, libcairo, libgdk-pixbuf, and ~30 transitive DLLs) as `extraResources` alongside the PyInstaller onedir output, and set `WEASYPRINT_DLL_DIRECTORIES` in the sidecar's environment before spawning.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Electron | 41.2.0 | Desktop shell + Chromium renderer | Current stable (verified via npm registry April 2026). Serves React SPA directly — eliminates nginx from the deployment. Node.js runtime in main process controls sidecar lifecycle. |
| electron-builder | 26.8.1 | NSIS packaging + auto-update artifacts | The standard solution for packaging and distributing Electron apps. Generates NSIS installer, `latest.yml` for electron-updater, and handles `extraResources` bundling. Verified via npm registry April 2026. |
| electron-updater | bundled with electron-builder | Auto-update from GitHub Releases | Ships as part of electron-builder ecosystem. Handles checking, downloading, and applying updates. Works with unsigned builds (shows SmartScreen; acceptable per D-05 deferral). |
| PyInstaller | 6.19.0 | Bundle FastAPI/uvicorn backend as .exe | Current version (verified PyPI April 2026). `--onedir` mode is mandatory for the Electron sidecar use case (avoids antivirus false positives and temp-dir extraction delay). |
| auto-launch | 5.x | Windows autostart registry key | npm package that manages `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`. Works with the `isHidden: true` option to start minimized to tray. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pyinstaller-hooks-contrib | latest | Community hooks for difficult packages | Required — provides hooks for `cryptography`, `lxml`, `signxml`, `zeep`. Installed automatically as PyInstaller dependency. |
| electron-log | latest | Logging in main and renderer process | Use for auto-updater diagnostic logging. Writes to `%APPDATA%/dian-facturador/logs/`. |
| node-fetch / built-in fetch | Node 18+ built-in | Health check polling against FastAPI | Poll `http://127.0.0.1:8765/health` before showing the window. Node 24 has `fetch` built-in. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Portable EDB PG binaries (recommended) | `embedded-postgres` npm package | `embedded-postgres` v18.3.0-beta.16 is still in beta and performs npm-time binary downloads — not suitable for offline use after installation. The EDB zip approach bundles binaries directly via `extraResources`, fully offline. |
| Portable EDB PG binaries | SQLite | CONTEXT.md explicitly requires PostgreSQL 16 (INFR-03). SQLite is out of scope. |
| PyInstaller onedir | PyInstaller onefile | `--onefile` extracts to a temp directory on every launch, is slower to start, causes more antivirus false positives, and leaves temp files on crash. `--onedir` is strongly preferred for sidecar use. |
| MSYS2 GTK DLLs for WeasyPrint | xhtml2pdf or ReportLab | WeasyPrint is already in requirements.txt and used by Phases 3/4. Switching PDF engines just for Windows would diverge Docker and Windows behavior. Use MSYS2 DLLs. |

**Installation (Electron workspace):**
```bash
# In a new electron/ workspace directory
npm init -y
npm install --save-dev electron@41.2.0 electron-builder@26.8.1
npm install electron-updater electron-log auto-launch
```

**Installation (Python build environment — Windows CI or dev machine):**
```bash
pip install pyinstaller==6.19.0
pip install pyinstaller-hooks-contrib
```

**Version verification:**
```bash
npm view electron version          # 41.2.0 (April 2026)
npm view electron-builder version  # 26.8.1 (April 2026)
```

---

## Architecture Patterns

### Recommended Project Structure
```
dian-facturador/
├── electron/                    # New: Electron workspace
│   ├── package.json             # Electron + electron-builder config
│   ├── main.js                  # Main process: orchestrator
│   ├── preload.js               # Contextbridge for renderer IPC
│   ├── tray.js                  # System tray logic
│   ├── updater.js               # Auto-update logic
│   ├── build/                   # electron-builder resources
│   │   └── icon.ico             # App icon (Windows)
│   └── resources/               # Bundled at build time
│       └── pg16/                # EDB PostgreSQL 16 portable binaries (extracted)
│           ├── bin/             # pg_ctl.exe, postgres.exe, initdb.exe, psql.exe
│           ├── lib/             # Postgres runtime libraries
│           └── share/           # locale, timezone data
├── backend/
│   ├── electron_entrypoint.py   # New: PyInstaller entry point for sidecar
│   ├── build_backend.bat        # New: CI script to run PyInstaller on Windows
│   ├── backend.spec             # New: PyInstaller spec file
│   └── dist/backend/            # PyInstaller onedir output (git-ignored)
│       ├── backend.exe
│       └── ...                  # All DLLs, Python runtime, GTK DLLs
├── frontend/                    # Existing (unchanged — Vite build output consumed)
│   └── dist/                    # Served by Electron renderer directly
└── docker-compose.yml           # Existing (Docker path unchanged)
```

### Pattern 1: Sidecar Lifecycle Management in Electron Main Process

**What:** The Electron main process spawns the PyInstaller backend `.exe` as a child process, polls its `/health` endpoint, then loads the SPA. Graceful shutdown kills the sidecar and stops PostgreSQL before Electron exits.

**When to use:** Always — this is the core orchestration pattern for this phase.

**Port selection:** Use a non-standard port (e.g., `8765`) to avoid conflicts with other local services. Bind to `127.0.0.1` only — this prevents Windows Firewall from showing a dialog (confirmed via community research: binding to localhost does NOT trigger firewall prompts; binding to `0.0.0.0` does).

```javascript
// Source: established Electron child_process pattern + community research
const { app, BrowserWindow, Tray, Menu, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const BACKEND_PORT = 8765;
const BACKEND_HOST = '127.0.0.1';
const HEALTH_URL = `http://${BACKEND_HOST}:${BACKEND_PORT}/health`;

let backendProcess = null;
let pgProcess = null; // managed via pg_ctl, not a Node child_process

function getResourcesPath() {
  // process.resourcesPath is set by Electron in packaged builds
  // In dev, fall back to project root
  return app.isPackaged
    ? process.resourcesPath
    : path.join(__dirname, 'resources');
}

async function startPostgres() {
  const pgBin = path.join(getResourcesPath(), 'pg16', 'bin', 'pg_ctl.exe');
  const pgData = path.join(app.getPath('userData'), 'postgres-data');
  const pgLog = path.join(app.getPath('userData'), 'postgres.log');

  // Initialize cluster on first run
  const fs = require('fs');
  if (!fs.existsSync(path.join(pgData, 'PG_VERSION'))) {
    const initdb = path.join(getResourcesPath(), 'pg16', 'bin', 'initdb.exe');
    await runCommand(initdb, ['-D', pgData, '-U', 'postgres', '-A', 'trust', '-E', 'UTF8']);
  }

  // Start PostgreSQL
  await runCommand(pgBin, ['start', '-D', pgData, '-l', pgLog, '-o', `-F -p 5432 -h ${BACKEND_HOST}`]);
}

async function stopPostgres() {
  const pgBin = path.join(getResourcesPath(), 'pg16', 'bin', 'pg_ctl.exe');
  const pgData = path.join(app.getPath('userData'), 'postgres-data');
  await runCommand(pgBin, ['stop', '-D', pgData, '-m', 'fast']).catch(() => {});
}

function startBackend() {
  const exePath = app.isPackaged
    ? path.join(process.resourcesPath, 'backend', 'backend.exe')
    : path.join(__dirname, '..', 'backend', 'dist', 'backend', 'backend.exe');

  const userData = app.getPath('userData');
  const env = {
    ...process.env,
    DATABASE_URL: `postgresql+asyncpg://postgres@${BACKEND_HOST}:5432/dianfacturador`,
    SECRET_KEY: getOrCreateSecret(userData),
    FERNET_KEY: getOrCreateFernetKey(userData),
    CERT_STORAGE_PATH: path.join(userData, 'certs'),
    BACKEND_PORT: String(BACKEND_PORT),
    BACKEND_HOST,
    // WeasyPrint DLL location (DLLs bundled alongside backend.exe)
    WEASYPRINT_DLL_DIRECTORIES: path.join(process.resourcesPath, 'backend', 'gtk-dlls'),
  };

  backendProcess = spawn(exePath, [], { env, stdio: 'pipe' });
  backendProcess.stdout.on('data', (d) => log.info('[backend]', d.toString()));
  backendProcess.stderr.on('data', (d) => log.warn('[backend:stderr]', d.toString()));
  backendProcess.on('exit', (code) => {
    if (code !== 0) log.error(`[backend] exited with code ${code}`);
  });
}

async function waitForBackend(maxWaitMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(HEALTH_URL, (res) => {
          if (res.statusCode === 200) resolve();
          else reject(new Error(`status ${res.statusCode}`));
        });
        req.on('error', reject);
        req.setTimeout(1000, () => req.destroy());
      });
      return true; // healthy
    } catch {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  return false; // timed out
}

app.on('before-quit', async (e) => {
  e.preventDefault();
  if (backendProcess) { backendProcess.kill('SIGTERM'); }
  await stopPostgres();
  app.exit(0);
});
```

### Pattern 2: PyInstaller Spec File for FastAPI Sidecar

**What:** A `.spec` file that correctly bundles FastAPI, uvicorn, SQLAlchemy async, asyncpg, lxml, signxml, cryptography, zeep, and WeasyPrint into a `--onedir` output.

**When to use:** During the CI/CD Windows build step.

```python
# Source: pyinstaller docs + community findings for FastAPI/asyncpg
# backend/backend.spec
import sys
from PyInstaller.utils.hooks import collect_submodules, collect_data_files

block_cipher = None

# Critical hidden imports for the stack
hidden_imports = [
    # asyncpg — not auto-detected by PyInstaller
    'asyncpg.pgproto.pgproto',
    'asyncpg.protocol.protocol',
    # uvicorn — internal plugins use string-based imports
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.loops.asyncio',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.http.h11_impl',
    'uvicorn.protocols.http.httptools_impl',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'uvicorn.lifespan.off',
    # SQLAlchemy dialects
    'sqlalchemy.dialects.postgresql',
    # email validation used by FastAPI/pydantic
    'email_validator',
    # signxml / lxml
    'lxml._elementpath',
    'lxml.etree',
]

# Collect all submodules of packages that use dynamic imports
hidden_imports += collect_submodules('cryptography')
hidden_imports += collect_submodules('signxml')
hidden_imports += collect_submodules('zeep')
hidden_imports += collect_submodules('passlib')

# Data files: alembic migrations and templates
datas = [
    ('../alembic', 'alembic'),
    ('../alembic.ini', '.'),
    ('../app/templates', 'app/templates'),
]
datas += collect_data_files('weasyprint')
datas += collect_data_files('signxml')

a = Analysis(
    ['electron_entrypoint.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=hidden_imports,
    hookspath=['hooks'],  # custom hooks dir in backend/
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'PyQt5', 'wx'],
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz, a.scripts, [],
    exclude_binaries=True,
    name='backend',
    icon='../electron/build/icon.ico',
    console=False,   # no terminal window — backend runs as hidden sidecar
    bootloader_ignore_signals=False,
)

coll = COLLECT(
    exe, a.pure, a.zipfiles, a.datas, *a.binaries,
    strip=False,
    upx=False,   # UPX increases AV false positives — leave disabled
    name='backend',
)
```

```python
# backend/electron_entrypoint.py — PyInstaller entry point
import sys
import os
import uvicorn

# PyInstaller sets sys._MEIPASS for the extracted bundle location
# Use this for loading templates, alembic, etc.
if hasattr(sys, '_MEIPASS'):
    os.chdir(sys._MEIPASS)

from app.main import app

if __name__ == '__main__':
    port = int(os.environ.get('BACKEND_PORT', '8765'))
    host = os.environ.get('BACKEND_HOST', '127.0.0.1')
    uvicorn.run(app, host=host, port=port, log_level='info')
```

### Pattern 3: electron-builder Configuration

**What:** `electron/package.json` `build` key that produces an NSIS installer with embedded resources.

```json
{
  "name": "dian-facturador",
  "version": "1.0.0",
  "main": "main.js",
  "build": {
    "appId": "co.dianfacturador.app",
    "productName": "DIAN Facturador",
    "copyright": "Copyright (C) 2026",
    "publish": {
      "provider": "github",
      "owner": "YOUR_ORG",
      "repo": "dian-facturador",
      "releaseType": "release"
    },
    "win": {
      "target": [{ "target": "nsis", "arch": ["x64"] }],
      "icon": "build/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": false,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "menuCategory": "DIAN Facturador",
      "include": "build/installer.nsh"
    },
    "extraResources": [
      {
        "from": "../backend/dist/backend",
        "to": "backend",
        "filter": ["**/*"]
      },
      {
        "from": "resources/pg16",
        "to": "pg16",
        "filter": ["**/*"]
      }
    ],
    "files": [
      "main.js",
      "preload.js",
      "tray.js",
      "updater.js",
      "node_modules/**/*",
      { "from": "../frontend/dist", "to": "frontend/dist" }
    ]
  }
}
```

**Key insight:** The `extraResources` destination is accessible at runtime via `process.resourcesPath`. In the packaged app:
- Backend exe: `path.join(process.resourcesPath, 'backend', 'backend.exe')`
- PostgreSQL bin: `path.join(process.resourcesPath, 'pg16', 'bin', 'pg_ctl.exe')`

### Pattern 4: WeasyPrint Windows DLL Resolution

**What:** WeasyPrint on Windows requires ~30-40 DLLs from the GTK/Pango/Cairo ecosystem. These must be bundled alongside the PyInstaller output and discovered via the `WEASYPRINT_DLL_DIRECTORIES` environment variable.

**Source of DLLs:** Install MSYS2 on the CI/build machine, run `pacman -S mingw-w64-x86_64-pango mingw-w64-x86_64-gdk-pixbuf2 mingw-w64-x86_64-cairo`. Copy the required DLLs from `C:\msys64\mingw64\bin\` into a `backend/gtk-dlls/` directory that gets included in the PyInstaller `--add-binary` entries or as a separate `extraResources` folder.

**Critical DLLs required (partial list):**
- `libpango-1.0-0.dll`
- `libpangocairo-1.0-0.dll`
- `libpangoft2-1.0-0.dll`
- `libcairo-2.dll`
- `libcairo-gobject-2.dll`
- `libgdk_pixbuf-2.0-0.dll`
- `libglib-2.0-0.dll`
- `libgobject-2.0-0.dll`
- `libgio-2.0-0.dll`
- `libharfbuzz-0.dll`
- `libfontconfig-1.dll`
- `libfreetype-6.dll`
- `zlib1.dll`

Set this in the sidecar env before spawning:
```javascript
WEASYPRINT_DLL_DIRECTORIES: path.join(process.resourcesPath, 'backend', 'gtk-dlls')
```

**Alternative if GTK bundling proves unworkable:** Switch PDF generation to `xhtml2pdf` (pure Python, no native DLLs) for the Windows build, while keeping WeasyPrint for Docker. This would require a conditional import in `pdf_service.py`. Mark this as a fallback — only implement if MSYS2 DLL bundling fails during implementation.

### Anti-Patterns to Avoid

- **Binding FastAPI sidecar to `0.0.0.0`:** Will trigger Windows Firewall dialog on first launch. Always bind to `127.0.0.1` (localhost).
- **Using PyInstaller `--onefile` for a sidecar:** Causes extraction delay on every launch, leaves temp files on crash, higher AV false positive rate. Always use `--onedir`.
- **Using UPX compression with PyInstaller:** `upx=True` in the spec file dramatically increases antivirus false positive rate. Leave `upx=False`.
- **Storing secrets in the app bundle:** SECRET_KEY, FERNET_KEY must be generated on first run and stored in `app.getPath('userData')`, not hardcoded in the installer.
- **Spawning the sidecar from the renderer process:** IPC must go through the main process via `ipcMain`/`ipcRenderer` + `contextBridge`. Never use `require('child_process')` in the renderer.
- **Loading `frontend/dist` as a file:// URL:** Use `win.loadFile(path.join(__dirname, 'frontend/dist/index.html'))`. The React app will make API calls to `http://127.0.0.1:8765` — ensure `VITE_API_BASE_URL` is set correctly for the Electron build target.
- **Not waiting for the sidecar before loading the window:** Show a loading screen and poll the `/health` endpoint before calling `win.loadFile()`. Without this, the React app will show API errors immediately on startup.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| NSIS installer generation | Custom NSIS scripts from scratch | electron-builder NSIS target | electron-builder handles all the boilerplate: uninstaller, shortcut creation, Add/Remove Programs, file associations, upgrade detection |
| Auto-update mechanism | Polling GitHub API + manual download | electron-updater (ships with electron-builder) | Handles version comparison, differential updates, download resume, signature verification, and the restart flow |
| Python bundling | Custom zip extraction scripts | PyInstaller 6.x with spec file | PyInstaller handles Python runtime, dependency resolution, import hooks, and binary discovery |
| Autostart registry | Direct registry writes via regedit | `auto-launch` npm package | Handles both `HKCU Run` key (user-level, no UAC) and app name changes across updates |
| Process health waiting | Exponential backoff from scratch | Simple polling loop with `http.get` to `/health` | A 500ms polling loop to a local endpoint is sufficient; no need for a library |
| Electron IPC | Direct `require` in renderer | `contextBridge` + `ipcRenderer`/`ipcMain` | Required by Electron's security model. Renderer runs in sandbox; direct Node.js access is disabled |

**Key insight:** The entire lifecycle orchestration (PostgreSQL init + start → sidecar spawn → health check → window load → tray) is custom code in `main.js`. This is intentional — it's the core responsibility of this phase and cannot be delegated to a library.

---

## Common Pitfalls

### Pitfall 1: WeasyPrint DLL Hell on Windows
**What goes wrong:** The PyInstaller bundle launches, the backend starts, but any PDF generation call crashes with `OSError: cannot load library 'libpango-1.0-0.dll': error 0x7e`.
**Why it happens:** WeasyPrint uses `ctypes` to load GTK libraries at runtime. PyInstaller does not auto-detect `ctypes`-loaded DLLs. The DLLs are not in `PATH` after packaging.
**How to avoid:** (1) Collect DLLs from `C:\msys64\mingw64\bin\` on the build machine. (2) Place them in a known subdirectory of `extraResources`. (3) Set `WEASYPRINT_DLL_DIRECTORIES` in the sidecar environment before spawning. (4) Test PDF generation specifically in the packaged build, not just in dev.
**Warning signs:** Backend starts and responds on `/health` but `/api/invoices/{id}/pdf` returns 500.

### Pitfall 2: Alembic Cannot Find Migrations at Runtime
**What goes wrong:** Backend starts but crashes on `alembic upgrade head` because `alembic/` directory is not found.
**Why it happens:** `sys._MEIPASS` is the extracted bundle directory; relative paths like `./alembic` break because the working directory is not set correctly.
**How to avoid:** In `electron_entrypoint.py`, set `os.chdir(sys._MEIPASS)` before importing the app. Also ensure `alembic.ini` has `script_location = alembic` (relative, not absolute). Include both `alembic/` and `alembic.ini` in the spec file `datas`.
**Warning signs:** `FileNotFoundError` or `CommandError: No config file 'alembic.ini' found` in backend stderr.

### Pitfall 3: PostgreSQL initdb Runs Every Launch
**What goes wrong:** On every app start, `initdb` is called, which wipes existing data.
**Why it happens:** Missing check for whether the cluster has already been initialized.
**How to avoid:** Check for the existence of `path.join(pgData, 'PG_VERSION')` before calling `initdb`. This file is created by PostgreSQL on successful initialization and never deleted unless the data directory is manually wiped.
**Warning signs:** User data disappears on every restart.

### Pitfall 4: Port Conflict With Existing PostgreSQL Installation
**What goes wrong:** The app's embedded PostgreSQL fails to start because port 5432 is already in use by an existing PostgreSQL installation.
**Why it happens:** Many developer machines have PostgreSQL installed at the system level.
**How to avoid:** Use a non-standard port (e.g., `5433`) for the embedded PostgreSQL instance. Pass `-o "-p 5433"` to `pg_ctl start`. Update `DATABASE_URL` to match: `postgresql+asyncpg://postgres@127.0.0.1:5433/dianfacturador`.
**Warning signs:** `pg_ctl start` exits with error code, or `FATAL: could not create lock file "/tmp/.s.PGSQL.5432.lock": Address already in use`.

### Pitfall 5: Windows SmartScreen Blocks the Installer
**What goes wrong:** First-time users see "Windows protected your PC" SmartScreen warning and cannot easily run the installer.
**Why it happens:** The installer is unsigned. Windows Defender SmartScreen blocks unsigned executables from unknown publishers by default.
**How to avoid (deferred):** Code signing with an EV certificate eliminates this. For v1, include installation instructions warning users to click "More info" → "Run anyway". Document this prominently in the GitHub Releases notes.
**Warning signs:** Users report not being able to install. This is expected behavior for unsigned builds.

### Pitfall 6: Antivirus Flags the PyInstaller Backend
**What goes wrong:** Antivirus software quarantines `backend.exe` during installation or first run.
**Why it happens:** PyInstaller's bootloader + self-extracting pattern is a behavioral signature that heuristic AV engines associate with malware. `--onefile` is worse than `--onedir`. UPX compression worsens it significantly.
**How to avoid:** Use `--onedir` (mandatory). Keep `upx=False` in spec. Submit false positive reports to major AV vendors (Microsoft, AVG, Malwarebytes) after first release. Code signing (deferred to future phase) is the long-term fix.
**Warning signs:** VirusTotal shows 3+ detections on the backend.exe.

### Pitfall 7: asyncpg Not Found at Runtime
**What goes wrong:** Backend crashes on startup with `ModuleNotFoundError: No module named 'asyncpg.pgproto.pgproto'`.
**Why it happens:** asyncpg uses a C extension (`pgproto.so`/`pgproto.pyd`) that PyInstaller misses because it is not imported explicitly in Python code.
**How to avoid:** Explicitly add `'asyncpg.pgproto.pgproto'` and `'asyncpg.protocol.protocol'` to `hiddenimports` in the spec file.
**Warning signs:** Import error in backend stderr immediately on startup.

### Pitfall 8: React App Cannot Reach the API
**What goes wrong:** Electron loads the SPA but all API calls fail with network errors.
**Why it happens:** The Vite build was built with `VITE_API_BASE_URL` pointing to the Docker backend URL (e.g., empty string, relying on nginx proxy). In Electron, there is no proxy — the SPA must call `http://127.0.0.1:8765` directly.
**How to avoid:** Add an Electron-specific Vite build config or environment that sets `VITE_API_BASE_URL=http://127.0.0.1:8765`. Alternatively, inject the backend URL at runtime via the Electron preload script using `contextBridge`.
**Warning signs:** Browser devtools in Electron show `net::ERR_CONNECTION_REFUSED` or `Failed to fetch` for all API calls.

### Pitfall 9: Sidecar Process Survives App Crash
**What goes wrong:** User force-kills Electron; `backend.exe` and `postgres.exe` keep running in the background, consuming resources and blocking port on next launch.
**Why it happens:** Child processes are not automatically killed when the parent process crashes.
**How to avoid:** Use `process.kill(backendProcess.pid, 0)` + the `pg_ctl stop -m immediate` approach. On Electron startup, check if a `backend.exe` is already running on the expected port and kill it before starting a new one. On Windows, use `taskkill /F /IM postgres.exe` as a cleanup step.
**Warning signs:** Second app launch fails because ports are already in use.

---

## Code Examples

### Auto-Update Integration

```javascript
// electron/updater.js
// Source: electron-builder auto-update docs + electron-log pattern
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function setupAutoUpdater(mainWindow) {
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update-available', info.version);
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update-downloaded');
    // User will see a dialog in the renderer: "Restart to apply update"
  });
}

module.exports = { setupAutoUpdater };
```

### System Tray Pattern

```javascript
// electron/tray.js
// Source: Electron Tray API docs
const { Tray, Menu, app, nativeImage } = require('electron');
const path = require('path');

let tray = null;

function createTray(mainWindow) {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'build', 'icon.ico'));
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Abrir DIAN Facturador',
      click: () => { mainWindow.show(); mainWindow.focus(); }
    },
    { type: 'separator' },
    {
      label: 'Salir',
      click: () => { app.quit(); }
    }
  ]);

  tray.setToolTip('DIAN Facturador');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => { mainWindow.show(); mainWindow.focus(); });
}

module.exports = { createTray };
```

### Secret Key Bootstrap

```javascript
// Generate or load persistent secrets on first run
// Source: established Electron userData pattern
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function getOrCreateSecret(userData, filename, generator) {
  const keyFile = path.join(userData, filename);
  if (fs.existsSync(keyFile)) {
    return fs.readFileSync(keyFile, 'utf8').trim();
  }
  const secret = generator();
  fs.mkdirSync(userData, { recursive: true });
  fs.writeFileSync(keyFile, secret, { mode: 0o600 });
  return secret;
}

function getSecretKey(userData) {
  return getOrCreateSecret(userData, '.secret_key', () =>
    crypto.randomBytes(32).toString('hex')
  );
}

function getFernetKey(userData) {
  return getOrCreateSecret(userData, '.fernet_key', () =>
    // Fernet key must be 32 URL-safe base64-encoded bytes
    require('buffer').Buffer.from(crypto.randomBytes(32)).toString('base64url').slice(0, 44)
  );
}
```

### GitHub Actions CI for Windows Build

```yaml
# .github/workflows/build-windows.yml
name: Build Windows Installer
on:
  push:
    tags: ['v*']

jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install MSYS2 (for WeasyPrint DLLs)
        uses: msys2/setup-msys2@v2
        with:
          msystem: MINGW64
          install: mingw-w64-x86_64-pango mingw-w64-x86_64-gdk-pixbuf2 mingw-w64-x86_64-cairo

      - name: Set up Python 3.12
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install Python deps + PyInstaller
        run: |
          pip install -r backend/requirements.txt
          pip install pyinstaller==6.19.0 pyinstaller-hooks-contrib
        working-directory: .

      - name: Collect GTK DLLs for WeasyPrint
        run: |
          mkdir -p backend/gtk-dlls
          # Copy required DLLs from MSYS2 (partial list — expand as needed)
          $dlls = @('libpango-1.0-0.dll','libpangocairo-1.0-0.dll','libcairo-2.dll',
                    'libgdk_pixbuf-2.0-0.dll','libglib-2.0-0.dll','libgobject-2.0-0.dll',
                    'libgio-2.0-0.dll','libharfbuzz-0.dll','libfontconfig-1.dll',
                    'libfreetype-6.dll','zlib1.dll','libpangoft2-1.0-0.dll',
                    'libffi-8.dll','libbz2-1.dll','libintl-8.dll','libpcre2-8-0.dll')
          foreach ($dll in $dlls) {
            Copy-Item "C:\msys64\mingw64\bin\$dll" -Destination "backend\gtk-dlls\" -ErrorAction SilentlyContinue
          }
        shell: pwsh

      - name: Build PyInstaller backend
        run: pyinstaller backend/backend.spec --distpath backend/dist
        env:
          WEASYPRINT_DLL_DIRECTORIES: ${{ github.workspace }}\backend\gtk-dlls

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '24'

      - name: Build frontend
        run: |
          npm ci
          npm run build:electron
        working-directory: frontend

      - name: Build Electron installer
        run: |
          npm ci
          npm run dist
        working-directory: electron
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `--onefile` PyInstaller | `--onedir` for sidecars | Best practice emerged ~2022 | Faster startup, fewer AV flags, no temp extraction |
| Manual NSIS scripts | electron-builder NSIS target | Widely adopted 2018-present | Dramatically less boilerplate, handles upgrade logic |
| Manual update check | electron-updater with `checkForUpdatesAndNotify()` | Stable since electron-builder 20.x | One-line integration with differential download |
| `pyOpenSSL.crypto.load_pkcs12` | `cryptography.pkcs12.load_key_and_certificates()` | pyOpenSSL deprecated 2023 | Already handled in requirements.txt; PyInstaller must bundle `cryptography` |
| Hardcoded secrets in .env | Generated secrets in userData on first run | Desktop app best practice | Required for auto-update safety (bundle can be replaced by update) |

**Deprecated / outdated:**
- `openssl` system binary calls for certificate handling — not applicable (uses `cryptography` library directly)
- Squirrel.Windows auto-updater — replaced by electron-updater in modern Electron apps
- electron-packager — superseded by electron-builder which handles NSIS, publishing, and signing in one tool

---

## Open Questions

1. **Complete GTK DLL list for WeasyPrint bundling**
   - What we know: Core DLLs are libpango, libcairo, libgdk-pixbuf, libglib, libgobject, libgio, libharfbuzz, libfontconfig, libfreetype, zlib1; ~30-40 total transitive deps
   - What's unclear: The exact minimal set of DLLs required varies by WeasyPrint version and Windows version. The full list must be empirically determined by running WeasyPrint PDF generation in the packaged build and adding any missing DLLs reported in the error.
   - Recommendation: During Wave 1, build a test PyInstaller bundle that calls `weasyprint.HTML(string='<h1>Test</h1>').write_pdf()` and iterate until it succeeds. Document the final DLL list.

2. **Fernet key format compatibility**
   - What we know: The existing Docker deployment generates a Fernet key using Python's `cryptography.fernet.Fernet.generate_key()`, which returns URL-safe base64 (44 chars). The JavaScript bootstrap above generates a compatible format.
   - What's unclear: Whether the desktop and Docker databases will ever need to share the same Fernet key (they won't — they are separate deployments with separate databases), so key format only needs to be Fernet-compatible.
   - Recommendation: Generate the Fernet key in Python at first run using the existing mechanism, not in JavaScript. Run a small Python script at first startup to generate both keys.

3. **PostgreSQL non-standard port (5432 vs 5433)**
   - What we know: Using 5433 avoids conflicts with developer PostgreSQL installations.
   - What's unclear: Whether target users (personas naturales, microempresas) are likely to have PostgreSQL already installed. Probably not for most users.
   - Recommendation: Default to port 5432 but implement a port-availability check at startup; if 5432 is occupied, fall back to 5433 and store the chosen port in a config file in userData.

4. **Vite build target for Electron vs Docker**
   - What we know: The React app currently makes API calls to `/api/...` (relative URL, proxied by nginx). In Electron there is no nginx proxy.
   - What's unclear: Whether the current `vite.config.ts` dev proxy config is also used in the production build or only in dev mode.
   - Recommendation: Add a separate Vite build script `build:electron` that sets `VITE_API_BASE_URL=http://127.0.0.1:8765` via `.env.electron`. The default `build` target remains unchanged for Docker.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Electron main process build | Yes (dev machine) | v24.1.0 | — |
| npm | Package management | Yes | 11.7.0 | — |
| Python 3.12+ | PyInstaller build | Yes (dev machine) | 3.13.4 | — |
| PyInstaller | Backend bundling | Not installed (dev machine) | 6.19.0 (PyPI) | Install in CI via pip |
| Electron (npm) | Electron shell | Not installed in project | 41.2.0 | Install via npm |
| electron-builder | NSIS packaging | Not installed in project | 26.8.1 | Install via npm |
| MSYS2 + GTK | WeasyPrint DLLs (Windows) | Not available on macOS dev machine | — | Must run on Windows CI (windows-latest GHA runner) |
| Windows OS | NSIS build + exe testing | Not available (macOS dev machine) | — | Use GitHub Actions `windows-latest` runner for build + packaging |

**Missing dependencies with no fallback:**
- Windows OS: The NSIS installer and PyInstaller `.exe` can ONLY be built on Windows. All build steps for Phase 5 must run on a GitHub Actions `windows-latest` runner or a Windows CI machine.
- MSYS2 / GTK DLLs: Required for WeasyPrint. Only available on Windows (via MSYS2). No macOS equivalent.

**Missing dependencies with fallback:**
- PyInstaller: Not installed locally, but trivially installed via pip in CI. Not blocking.
- electron / electron-builder: Not in project yet, installed via `npm ci` in the new `electron/` workspace.

---

## Sources

### Primary (HIGH confidence)
- [electron-builder NSIS docs](https://www.electron.build/nsis.html) — NSIS configuration options, oneClick, shortcuts
- [electron-builder Auto Update docs](https://www.electron.build/auto-update.html) — electron-updater events, GitHub Releases integration
- [WeasyPrint First Steps docs (v68.1)](https://doc.courtbouillon.org/weasyprint/stable/first_steps.html) — Windows MSYS2 install, WEASYPRINT_DLL_DIRECTORIES
- [Portable PostgreSQL 16 on Windows (2024)](https://notepad.onghu.com/2024/portable-postgresql-on-windows-without-installation-pg16/) — initdb, pg_ctl commands, environment variables
- [embedded-postgres npm package](https://github.com/leinelissen/embedded-postgres) — API, Windows support, beta status

### Secondary (MEDIUM confidence)
- [PyInstaller FastAPI packaging guide](https://pipoupiwam.github.io/cirriculum/articles/fast_api/fast_api_executable.html) — asyncpg hidden import requirement, entry point structure
- [iancleary/pyinstaller-fastapi](https://github.com/iancleary/pyinstaller-fastapi) — Windows-targeted PyInstaller + FastAPI project structure
- [Electron child_process community issues](https://github.com/electron/electron/issues/23694) — lifecycle management patterns
- [Simon Willison: Python inside Electron](https://til.simonwillison.net/electron/python-inside-electron) — process.resourcesPath pattern, extraResources
- [npm: electron@41.2.0](https://www.npmjs.com/package/electron) — current version verified
- [npm: electron-builder@26.8.1](https://www.npmjs.com/package/electron-builder) — current version verified
- [PyPI: pyinstaller@6.19.0](https://pypi.org/project/pyinstaller/) — current version verified

### Tertiary (LOW confidence — needs validation during implementation)
- Community findings on complete GTK DLL list for WeasyPrint PyInstaller bundles — empirical validation required
- PyInstaller antivirus false positive rate in 2026 — may have improved or worsened since research

---

## Metadata

**Confidence breakdown:**
- Standard stack (Electron, electron-builder, PyInstaller versions): HIGH — verified via npm registry and PyPI April 2026
- Electron sidecar lifecycle pattern: MEDIUM — core Node.js child_process is solid; specific health-check pattern is established but not from official Electron docs
- PyInstaller FastAPI hidden imports: MEDIUM — asyncpg and uvicorn entries confirmed by community; full list requires empirical validation during build
- Portable PostgreSQL (EDB binaries + pg_ctl): HIGH — well-documented, multiple sources, same binary approach used by established projects
- WeasyPrint Windows DLL bundling: LOW-MEDIUM — MSYS2 approach is the documented path, but exact DLL list requires empirical determination on a Windows build machine
- NSIS/electron-builder config: HIGH — official docs confirm all options used
- electron-updater GitHub Releases: HIGH — official docs, straightforward configuration

**Research date:** 2026-04-09
**Valid until:** 2026-10-09 (stable ecosystem; Electron major versions every ~3 months but breaking changes are rare in these APIs)
