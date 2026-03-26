---
phase: 01-foundation-and-setup
plan: 01
subsystem: infrastructure
tags: [docker, fastapi, postgresql, alembic, sqlalchemy, nginx]
dependency_graph:
  requires: []
  provides:
    - docker-compose three-service orchestration
    - FastAPI app skeleton with CORS and health endpoint
    - async SQLAlchemy engine and session factory
    - pydantic-settings configuration
    - Alembic async migration environment
    - nginx reverse proxy for SPA + API
  affects:
    - All subsequent plans depend on this infrastructure
tech_stack:
  added:
    - FastAPI 0.115+
    - SQLAlchemy 2.0 async
    - asyncpg
    - Alembic
    - pydantic-settings
    - uvicorn[standard]
    - python-jose[cryptography]
    - passlib[bcrypt]
    - cryptography 44+
    - python-multipart
    - aiofiles
    - httpx
    - PostgreSQL 16 (docker)
    - nginx alpine (docker)
    - node 22 alpine (docker build stage)
  patterns:
    - async_engine_from_config for Alembic async migrations
    - async_session_maker with expire_on_commit=False
    - lru_cache on get_settings() for singleton config
    - alembic upgrade head in docker-compose backend command
    - env_file required: false for .env optional loading
key_files:
  created:
    - docker-compose.yml
    - .env.example
    - .gitignore
    - backend/Dockerfile
    - backend/requirements.txt
    - backend/app/__init__.py
    - backend/app/main.py
    - backend/app/core/__init__.py
    - backend/app/core/config.py
    - backend/app/core/database.py
    - backend/app/models/__init__.py
    - backend/app/models/base.py
    - backend/alembic.ini
    - backend/alembic/env.py
    - backend/alembic/script.py.mako
    - backend/alembic/versions/.gitkeep
    - frontend/Dockerfile
    - frontend/nginx.conf
    - nginx/nginx.conf
  modified: []
decisions:
  - "env_file marked required: false in docker-compose so the app validates without a .env file present (copy .env.example to .env before running)"
  - "version attribute removed from docker-compose.yml — obsolete in Docker Compose v2+ and causes warnings"
  - "nginx.conf duplicated to both nginx/ (project reference) and frontend/ (used by Dockerfile COPY)"
  - "Alembic offline mode uses sync URL (strips +asyncpg) while online mode uses full asyncpg URL"
metrics:
  duration: 2 minutes
  completed_date: "2026-03-26"
  tasks_completed: 2
  tasks_total: 2
  files_created: 19
  files_modified: 0
---

# Phase 01 Plan 01: Docker Compose Infrastructure and FastAPI Skeleton Summary

**One-liner:** Docker Compose three-service stack (postgres 16, FastAPI backend, nginx frontend) with async SQLAlchemy 2.0, pydantic-settings config, and async Alembic migration environment.

## What Was Built

This plan establishes the entire project scaffold from zero. The result is a fully runnable docker-compose configuration where:

1. PostgreSQL 16 starts with a health check before the backend is allowed to start
2. The backend container runs `alembic upgrade head` then `uvicorn` on startup
3. The frontend nginx container proxies `/api/` to the backend and serves the React SPA with a fallback to `index.html`

### Infrastructure Files

- `docker-compose.yml` — Three services with health check dependency chain. `.env` loading is optional (`required: false`) so `docker-compose config` validates without a `.env` file present.
- `.env.example` — Documents all required environment variables: `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `SECRET_KEY`, `FERNET_KEY`, `DEBUG`.
- `.gitignore` — Covers Python (`__pycache__`, `.venv`), Node (`node_modules`, `dist`), environment (`.env`), certificates (`.p12`, `.pfx`), IDE, and OS files.

### Backend Application

- `backend/Dockerfile` — `python:3.12-slim` base with WeasyPrint system dependencies (libpango, libcairo, libgdk-pixbuf).
- `backend/requirements.txt` — All Phase 1 dependencies: fastapi, uvicorn, sqlalchemy[asyncio], asyncpg, alembic, pydantic-settings, python-jose[cryptography], passlib[bcrypt], cryptography 44+, and development/utility packages.
- `backend/app/core/config.py` — pydantic-settings `Settings` class with `@lru_cache` singleton. Reads from `.env` with `case_sensitive=False`.
- `backend/app/core/database.py` — `create_async_engine` with `pool_pre_ping=True`, `async_sessionmaker` with `expire_on_commit=False`, `get_db()` async generator dependency.
- `backend/app/models/base.py` — `DeclarativeBase` for all future models.
- `backend/app/main.py` — FastAPI app with `CORSMiddleware` (localhost + localhost:5173), lifespan context manager, and `/api/health` endpoint returning `{"status": "ok"}`.

### Alembic Async Migration Setup

- `backend/alembic.ini` — `sqlalchemy.url` intentionally empty (overridden by env.py at runtime).
- `backend/alembic/env.py` — Async pattern using `async_engine_from_config`. Offline mode strips `+asyncpg` for sync compatibility. Online mode uses full asyncpg URL. Commented import stubs for models that will be added in Plan 02.
- `backend/alembic/script.py.mako` — Standard Alembic migration template.
- `backend/alembic/versions/.gitkeep` — Tracks the versions directory in git.

### Frontend and Nginx

- `frontend/Dockerfile` — Multi-stage: node:22-alpine builds the Vite SPA, then nginx:alpine serves the `dist/` output.
- `nginx/nginx.conf` and `frontend/nginx.conf` — Identical nginx configuration: proxies `/api/` to `http://backend:8000/api/`, SPA fallback `try_files $uri $uri/ /index.html`, 10MB upload limit, 60s timeout.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1: Infrastructure | `2dadcf4` | feat(01-01): create Docker Compose infrastructure |
| Task 2: FastAPI skeleton | `f11704c` | feat(01-01): create FastAPI skeleton with async database and Alembic |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed docker-compose env_file causing validation failure**
- **Found during:** Overall verification (`docker-compose config`)
- **Issue:** `env_file: .env` causes docker-compose config to exit with error when `.env` file doesn't exist (expected for new clones before setup)
- **Fix:** Changed `env_file: .env` to `env_file: [{path: .env, required: false}]` so docker-compose validates without a `.env` file. All env vars are also specified inline under `environment:` so the compose file is self-documenting.
- **Files modified:** `docker-compose.yml`
- **Commit:** `f11704c` (included in Task 2 commit)

**2. [Rule 1 - Bug] Removed obsolete `version:` attribute from docker-compose.yml**
- **Found during:** Overall verification
- **Issue:** `version: "3.9"` produces a deprecation warning in Docker Compose v2+ and is an obsolete attribute
- **Fix:** Removed the `version:` line entirely — Docker Compose v2 does not require it
- **Files modified:** `docker-compose.yml`
- **Commit:** `f11704c` (included in Task 2 commit)

## Known Stubs

None. This plan creates infrastructure scaffolding only — no UI rendering, no data stubs.

## Verification Results

All plan success criteria met:

- `docker-compose config` validates without errors
- `grep -c "service_healthy" docker-compose.yml` returns 1
- `grep "proxy_pass" nginx/nginx.conf` shows `proxy_pass http://backend:8000/api/`
- `backend/app/main.py` has `/api/health` endpoint
- `backend/alembic/env.py` uses `async_engine_from_config` pattern
- All `__init__.py` files exist for proper Python package structure

## Self-Check: PASSED
