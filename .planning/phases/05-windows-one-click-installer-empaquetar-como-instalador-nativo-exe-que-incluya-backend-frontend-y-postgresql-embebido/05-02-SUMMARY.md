---
phase: "05"
plan: "02"
subsystem: "installer/backend-bundle"
tags: [pyinstaller, electron-sidecar, alembic, weasyprint, windows]
dependency_graph:
  requires: []
  provides:
    - PyInstaller entry point for FastAPI backend sidecar (electron_entrypoint.py)
    - PyInstaller spec file with all hidden imports and data files (backend.spec)
    - Windows build script for CI/CD and local dev (build_backend.bat)
  affects:
    - "05-03: Electron main process expects backend.exe at dist/backend/backend.exe"
    - "05-04: electron-builder extraResources bundles dist/backend/ into installer"
tech_stack:
  added:
    - "PyInstaller 6.19.0 (Windows build only — not a runtime dependency)"
    - "pyinstaller-hooks-contrib (community hooks for cryptography/signxml/zeep)"
    - "MSYS2 GTK DLLs (libpango, libcairo, libgdk-pixbuf) for WeasyPrint on Windows"
  patterns:
    - "PyInstaller onedir mode (--onedir) for sidecar use — avoids temp-dir extraction on each launch"
    - "Programmatic Alembic API (alembic.config.Config + alembic.command.upgrade) instead of subprocess — critical for PyInstaller bundles where sys.executable is the bundled .exe"
    - "sys._MEIPASS chdir pattern — relocates CWD to bundle root so all relative paths work"
key_files:
  created:
    - backend/electron_entrypoint.py
    - backend/backend.spec
    - backend/build_backend.bat
  modified: []
decisions:
  - "Programmatic Alembic API over subprocess: sys.executable inside PyInstaller bundle is backend.exe, not python.exe — subprocess.run([sys.executable, '-m', 'alembic']) would restart the app, not run migrations. alembic.command.upgrade() runs in-process with no this limitation."
  - "collect_data_files('alembic') added to datas: needed for programmatic Alembic API — Alembic's script template files are accessed internally when command.upgrade() is called."
  - "UPX disabled throughout (upx=False on both EXE and COLLECT): UPX-compressed executables trigger antivirus false positives significantly more often, which would create a poor first-run experience per D-04."
  - "console=False in EXE: backend runs as a hidden sidecar — showing a terminal window would confuse end users of the desktop app."
metrics:
  duration_minutes: 2
  completed_date: "2026-04-09"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 0
---

# Phase 5 Plan 02: PyInstaller Backend Bundle Summary

**One-liner:** PyInstaller onedir spec with programmatic Alembic migration entry point and MSYS2 GTK DLL collection script for the FastAPI Windows sidecar.

## What Was Built

Three files that together enable the FastAPI backend to be packaged as a standalone Windows executable for use as an Electron sidecar process:

**`backend/electron_entrypoint.py`** — The PyInstaller entry point. On startup it: (1) changes working directory to `sys._MEIPASS` so all relative file paths (alembic.ini, migrations, templates) resolve correctly inside the bundle; (2) runs `alembic upgrade head` programmatically using `alembic.config.Config` and `alembic.command.upgrade` — NOT via subprocess, which would be broken inside a PyInstaller bundle where `sys.executable` is `backend.exe`; (3) starts uvicorn on `BACKEND_HOST:BACKEND_PORT` (default `127.0.0.1:8765`).

**`backend/backend.spec`** — The PyInstaller spec file. Includes: all asyncpg Cython extensions (`asyncpg.pgproto.pgproto`, `asyncpg.protocol.protocol`); all 14 uvicorn internal plugin modules; SQLAlchemy postgresql dialect; Alembic programmatic API modules (`alembic`, `alembic.config`, `alembic.command`); `collect_submodules` for cryptography, signxml, zeep, and passlib; data files for alembic migrations, alembic.ini, Jinja2 templates, WeasyPrint CSS data, and signxml XSD schemas. UPX disabled, console=False.

**`backend/build_backend.bat`** — Windows build script for CI/CD. Installs requirements.txt, installs PyInstaller 6.19.0, runs `pyinstaller backend.spec --distpath dist --clean`, then copies all 17 required WeasyPrint GTK DLLs from MSYS2 `mingw64/bin` into `dist/backend/gtk-dlls/`.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Programmatic Alembic API (`command.upgrade`) | `sys.executable` inside a PyInstaller bundle points to `backend.exe`, not `python.exe`. Calling `subprocess.run([sys.executable, '-m', 'alembic'])` would restart the application, not run Alembic. The in-process API has no this limitation. |
| `collect_data_files('alembic')` in datas | Alembic's programmatic API accesses internal script template files; these are not Python modules so they aren't covered by `collect_submodules`. |
| UPX disabled | UPX compression significantly increases antivirus false positive rates on Windows. The ~200MB bundle size is acceptable per user constraint D-04. |
| `console=False` | Backend runs as a hidden sidecar — a visible terminal window would confuse desktop app end users. |
| MSYS2 DLLs copied post-build | PyInstaller only bundles Python extensions. WeasyPrint's GTK DLLs are native Windows DLLs that must be copied separately. Electron main process sets `WEASYPRINT_DLL_DIRECTORIES` to point at the `gtk-dlls/` directory. |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — these are build-time artifacts. The `backend.exe` itself will be produced by running `build_backend.bat` on a Windows machine with Python 3.12+ and MSYS2 installed. The spec and entry point are fully wired; no placeholder data flows to UI.

## Self-Check: PASSED

- backend/electron_entrypoint.py: FOUND
- backend/backend.spec: FOUND
- backend/build_backend.bat: FOUND
- Commit 6a68dbf (Task 1): FOUND
- Commit d29f62d (Task 2): FOUND
