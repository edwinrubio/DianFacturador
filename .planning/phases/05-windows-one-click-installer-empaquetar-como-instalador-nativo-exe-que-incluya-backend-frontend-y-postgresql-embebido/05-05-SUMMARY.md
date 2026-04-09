---
phase: 05-windows-one-click-installer
plan: 05
subsystem: ci-pipeline
tags: [github-actions, windows, nsis, pyinstaller, electron-builder, postgresql-portable, weasyprint]
dependency_graph:
  requires:
    - electron/package.json (from 05-01, electron-builder config with nsis.include reference)
    - backend/backend.spec (from 05-02, PyInstaller spec)
    - frontend/package.json (from 05-03, build:electron script)
  provides:
    - .github/workflows/build-windows.yml (CI pipeline — builds full NSIS installer on v* tag push)
    - electron/build/installer.nsh (NSIS customization — Spanish branding, SmartScreen warning)
  affects:
    - GitHub Releases (artifacts uploaded by workflow)
    - End users (installer branding and SmartScreen guidance)
tech_stack:
  added:
    - GitHub Actions (windows-latest runner)
    - msys2/setup-msys2@v2 (MSYS2 + MINGW64 GTK DLLs for WeasyPrint)
    - actions/setup-python@v5 (Python 3.12)
    - actions/setup-node@v4 (Node.js 24)
    - softprops/action-gh-release@v2 (GitHub Release upload)
    - PyInstaller 6.19.0
    - PostgreSQL 16.8 portable binaries (EDB download)
    - NSIS Unicode (via electron-builder default)
  patterns:
    - GTK DLL collection from MSYS2 into backend/gtk-dlls before PyInstaller run
    - PyInstaller --distpath dist --clean invocation pattern
    - EDB portable PostgreSQL zip download + selective copy (bin/lib/share)
    - NSIS MUI_*PAGE_* defines for Spanish localization
key_files:
  created:
    - .github/workflows/build-windows.yml
    - electron/build/installer.nsh
  modified: []
decisions:
  - "PyInstaller invoked as `pyinstaller backend.spec --distpath dist --clean` (matches backend/build_backend.bat pattern)"
  - "PostgreSQL 16.8 from EDB get.enterprisedb.com — latest 16.x stable as of April 2026; URL may need update at 16.9"
  - "NSIS strings use unaccented Spanish for maximum codepage compatibility (instalacion not instalación)"
  - "softprops/action-gh-release@v2 used for GitHub Release upload (supports pre-release auto-detection)"
  - "GH_TOKEN via secrets.GITHUB_TOKEN — automatically provided by GitHub Actions, no manual secret needed"
metrics:
  duration_minutes: 10
  completed_date: "2026-04-09"
  tasks_completed: 2
  files_created: 2
  files_modified: 0
---

# Phase 05 Plan 05: GitHub Actions CI Pipeline and NSIS Customization Summary

**One-liner:** GitHub Actions workflow builds the complete NSIS Windows installer on v* tag push — MSYS2 GTK DLLs, PyInstaller backend, Electron-mode frontend, PostgreSQL 16 portable binaries, electron-builder NSIS packaging, and GitHub Release upload.

## What Was Built

### Task 1: `.github/workflows/build-windows.yml`

A 11-step GitHub Actions workflow that runs on `windows-latest` whenever a `v*` tag is pushed:

1. **Checkout** — `actions/checkout@v4`
2. **MSYS2 + GTK DLLs** — `msys2/setup-msys2@v2` installs `mingw-w64-x86_64-pango`, `gdk-pixbuf2`, `cairo` for WeasyPrint
3. **Python 3.12** — `actions/setup-python@v5` with pip cache
4. **Python deps** — `pip install -r backend/requirements.txt` + PyInstaller 6.19.0
5. **Collect GTK DLLs** — PowerShell copies 17 DLLs from `C:\msys64\mingw64\bin\` into `backend\gtk-dlls\`
6. **PyInstaller** — `pyinstaller backend.spec --distpath dist --clean` in `backend/`
7. **Bundle GTK DLLs** — copies `backend\gtk-dlls\*` into `backend\dist\backend\gtk-dlls\`
8. **Node.js 24** — `actions/setup-node@v4`
9. **Frontend build** — `npm ci && npm run build:electron` in `frontend/`
10. **PostgreSQL 16 portable** — downloads `postgresql-16.8-1-windows-x64-binaries.zip` from EDB, extracts `bin/lib/share` into `electron/resources/pg16/`
11. **electron-builder** — `npm ci && npm run dist` in `electron/` with `GH_TOKEN`
12. **GitHub Release upload** — `softprops/action-gh-release@v2` uploads `electron/dist/*.exe` and `electron/dist/latest.yml`

`permissions: contents: write` is set at workflow level (required for the release upload step).

### Task 2: `electron/build/installer.nsh`

NSIS custom script referenced by `electron/package.json` `nsis.include: "build/installer.nsh"`. Defines three MUI page overrides in Spanish:

- **Welcome page:** Title "Bienvenido a DIAN Facturador" with product description
- **Finish page:** Title "Instalacion Completada" with SmartScreen bypass instructions for unsigned installers
- **Uninstall confirmation:** Notes that user data (facturas, clientes, productos) is preserved in userData folder

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 77a417a | feat(05-05): add GitHub Actions Windows installer build workflow |
| Restore | 67883bf | chore(05-05): restore Wave 1 output files deleted during worktree setup |
| Task 2 | 5a3f0b3 | feat(05-05): add NSIS custom installer script with Spanish branding |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Wave 1 output files deleted by git reset --soft worktree initialization**

- **Found during:** Task 1 commit
- **Issue:** The worktree was initialized via `git reset --soft 5b379b1...` which caused the working tree to stage all delta changes including deletions of Wave 1 files (electron/, backend/backend.spec, etc.) that were committed in earlier parallel agents
- **Fix:** After the Task 1 commit, restored all deleted files using `git checkout <commit> -- <path>` from their respective source commits, then committed the restorations in a chore commit
- **Files restored:** `electron/` (5 files), `backend/backend.spec`, `backend/build_backend.bat`, `backend/electron_entrypoint.py`, `frontend/.env.electron`, `frontend/package.json`, `frontend/src/lib/api.ts`, all phase 05 planning files
- **Commit:** 67883bf

This is the same pattern documented in the 05-01-SUMMARY.md as a known worktree initialization issue.

## Known Stubs

None — both files created in this plan are complete and functional with no placeholder content.

## Self-Check: PASSED

Files verified to exist:
- `.github/workflows/build-windows.yml` — FOUND
- `electron/build/installer.nsh` — FOUND

Commits verified:
- 77a417a — FOUND (feat(05-05): add GitHub Actions Windows installer build workflow)
- 67883bf — FOUND (chore(05-05): restore Wave 1 output files)
- 5a3f0b3 — FOUND (feat(05-05): add NSIS custom installer script with Spanish branding)

Key content verified:
- `windows-latest` runner — PASS
- `permissions: contents: write` — PASS
- MSYS2 GTK packages (pango, gdk-pixbuf2, cairo) — PASS
- PyInstaller 6.19.0 — PASS
- GTK DLL collection (17 DLLs) — PASS
- `pyinstaller backend.spec --distpath dist --clean` — PASS
- `npm run build:electron` — PASS
- PostgreSQL 16.8 EDB download — PASS
- `npm run dist` with GH_TOKEN — PASS
- `latest.yml` upload — PASS
- `softprops/action-gh-release@v2` — PASS
- `MUI_WELCOMEPAGE_TITLE` "Bienvenido a DIAN Facturador" — PASS
- `SmartScreen` warning on finish page — PASS
- Data preservation note on uninstall page — PASS
- `nsis.include: "build/installer.nsh"` cross-reference with package.json — PASS
