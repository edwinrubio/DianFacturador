# Phase 5: Windows One-Click Installer - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 05-windows-one-click-installer
**Areas discussed:** Packaging strategy, Update mechanism

---

## Packaging Strategy

### Core packaging approach

| Option | Description | Selected |
|--------|-------------|----------|
| Tauri + sidecar | Tauri wraps React (WebView2, ~5MB). Python backend as PyInstaller sidecar. ~50-80MB total. | |
| Electron + sidecar | Electron wraps React (Chromium ~120MB). Python backend as child process. ~200-250MB. Battle-tested. | ✓ |
| PyInstaller standalone | No desktop wrapper. FastAPI serves React static files. User opens browser. Tray icon + browser tab. | |
| Docker Desktop wrapper | Installer includes Docker Desktop + docker-compose. Wraps existing containers. | |

**User's choice:** Electron + sidecar
**Notes:** User chose the battle-tested approach despite larger size. Familiarity of Electron ecosystem (VS Code, Slack) was likely a factor.

### Installer distribution format

| Option | Description | Selected |
|--------|-------------|----------|
| NSIS installer | Classic Windows installer wizard (Next > Next > Install). Start Menu, desktop icon, Add/Remove Programs. | ✓ |
| Portable ZIP | No install needed — extract and run. No Start Menu, no uninstaller. | |
| Both options | Offer both NSIS and portable ZIP downloads. | |

**User's choice:** NSIS installer (Recommended)
**Notes:** Most familiar format for target audience (Windows users in Colombia).

### Autostart behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, with tray icon | App starts minimized to system tray on boot. Always ready. Toggleable in settings. | ✓ |
| No autostart | User must launch manually from Start Menu or desktop shortcut. | |
| Ask during install | Installer asks checkbox. User decides. | |

**User's choice:** Yes, with tray icon (Recommended)
**Notes:** None — straightforward selection.

---

## Update Mechanism

### Update delivery method

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-update with electron-updater | Checks GitHub Releases. Downloads in background. "Update available — restart to apply." Alembic migrations auto-run on restart. | ✓ |
| Manual re-download | User downloads new .exe from GitHub/website and re-installs. | |
| Check + notify only | Shows notification with download link, user downloads manually. | |

**User's choice:** Auto-update with electron-updater (Recommended)
**Notes:** Seamless update experience like VS Code/Slack.

### Update hosting

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub Releases | Free hosting. Native electron-updater support. Open source friendly. | ✓ |
| Self-hosted server | Custom update server. More control but requires infrastructure. | |
| Both GitHub + mirror | Primary on GitHub, optional mirror for corporate firewalls. | |

**User's choice:** GitHub Releases (Recommended)
**Notes:** None — natural fit for open source project.

### Database migration strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-migrate on startup | Alembic upgrade head runs automatically. Same as Docker setup. Shows error if fails. | ✓ |
| Backup + migrate with prompt | Auto-backup before migration. Progress UI. Auto-restore on failure. | |
| You decide | Claude picks best approach. | |

**User's choice:** Auto-migrate on startup (Recommended)
**Notes:** Consistent with existing Docker deployment pattern.

---

## Claude's Discretion

- Database embedding approach (PostgreSQL portable vs pg_embed vs alternative)
- WeasyPrint native dependencies on Windows
- Electron main process architecture (IPC, sidecar lifecycle, health checks)
- Code signing strategy
- System tray UX details

## Deferred Ideas

- macOS installer (.dmg) — future phase
- Linux AppImage/Flatpak — future phase
- Portable ZIP distribution — NSIS only for v1
- Beta/canary update channel — stable-only for now
- Code signing with EV certificate — evaluate later
