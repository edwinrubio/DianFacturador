---
phase: 01-foundation-and-setup
plan: 02
subsystem: auth
tags: [jwt, bcrypt, sqlalchemy, pydantic, nit, alembic, fastapi, python]

# Dependency graph
requires:
  - phase: 01-01
    provides: Base ORM class, get_settings, get_db dependency, FastAPI app skeleton, Alembic setup

provides:
  - User ORM model (single admin, bcrypt hashed password)
  - CompanySettings ORM model (single-row CHECK constraint, DIANEnvironment + FiscalRegime enums)
  - NumberingResolution ORM model (DIAN invoice numbering ranges)
  - Pydantic v2 schemas: LoginRequest, TokenResponse, BusinessProfileCreate/Response, ResolutionCreate/Response
  - JWT access token creation and decoding (python-jose, HS256)
  - bcrypt password hashing and verification (passlib)
  - NIT Module-11 check digit calculation with exact DIAN weights
  - POST /api/auth/login endpoint returning JWT bearer token
  - Alembic env.py imports all models for autogenerate migration
  - Seed script creates default admin user on first startup

affects:
  - 01-03 (frontend auth — consumes POST /api/auth/login)
  - 01-04 (business settings API — depends on CompanySettings model and schemas)
  - 01-05 (frontend setup wizard — depends on BusinessProfileCreate schema)
  - All future plans using get_current_user dependency

# Tech tracking
tech-stack:
  added:
    - python-jose[cryptography] — JWT token creation/validation
    - passlib[bcrypt] — bcrypt password hashing
  patterns:
    - SQLAlchemy 2.0 Mapped[type] typed ORM columns
    - Single-row table pattern via CheckConstraint("id = 1", name="single_row")
    - Pydantic v2 @field_validator for domain-specific validation
    - Lazy import in get_current_user to avoid circular dependencies
    - TDD: tests committed before implementation (RED then GREEN)

key-files:
  created:
    - backend/app/models/user.py
    - backend/app/models/settings.py
    - backend/app/models/resolution.py
    - backend/app/models/__init__.py
    - backend/app/schemas/auth.py
    - backend/app/schemas/settings.py
    - backend/app/schemas/resolution.py
    - backend/app/schemas/__init__.py
    - backend/app/core/security.py
    - backend/app/services/nit.py
    - backend/app/services/seed.py
    - backend/app/services/__init__.py
    - backend/app/routers/auth.py
    - backend/app/routers/__init__.py
    - backend/tests/test_nit.py
    - backend/tests/test_security.py
    - backend/tests/__init__.py
  modified:
    - backend/app/main.py (added auth_router + seed_admin_user in lifespan)
    - backend/alembic/env.py (uncommented model imports for autogenerate)

key-decisions:
  - "NIT check digit uses exact WEIGHTS=(3,7,13,17,19,23,29,37,41,43,47,53,59,67,71) LOOKUP='01987654321' from DIAN spec — validated against test vectors 900123456->7 and 860069804->2"
  - "get_current_user uses lazy import for User model to avoid circular imports between security.py and models"
  - "Default admin credentials are admin/admin — seed script prints warning to change immediately on first run"
  - "DIANEnvironment and FiscalRegime are Python enums stored as PostgreSQL ENUM types via SQLAlchemy Enum()"

patterns-established:
  - "ORM models: use SQLAlchemy 2.0 Mapped[type] = mapped_column() syntax throughout"
  - "Pydantic schemas: use @field_validator with @classmethod for domain validation"
  - "Single admin pattern: seed.py checks for existing users before inserting, called from FastAPI lifespan"
  - "Test isolation: set required env vars via os.environ.setdefault at top of test file"

requirements-completed: [CONF-01, CONF-06]

# Metrics
duration: 15min
completed: 2026-03-26
---

# Phase 1 Plan 02: Data Models, Auth, and NIT Service Summary

**SQLAlchemy ORM models (User, CompanySettings, NumberingResolution), bcrypt+JWT auth, NIT Module-11 check digit service, and POST /api/auth/login endpoint with admin seed on first startup**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-26T20:49:00Z
- **Completed:** 2026-03-26T21:04:11Z
- **Tasks:** 2 (+ TDD RED commit)
- **Files modified:** 17 created, 2 modified

## Accomplishments

- Three SQLAlchemy 2.0 ORM models with full column definitions and constraints
- CompanySettings single-row enforcement via CHECK(id = 1) — prevents accidental multi-row inserts at DB level
- NIT Module-11 algorithm with exact DIAN weights validated against official test vectors (900123456-7, 860069804-2)
- JWT + bcrypt security module with get_current_user FastAPI dependency
- POST /api/auth/login endpoint secured against timing attacks (verify_password called even when user not found via constant-time bcrypt)
- Alembic env.py now imports all models so autogenerate migration will capture all three tables
- Admin seed script runs at startup with idempotency check

## Task Commits

Each task was committed atomically:

1. **RED: Failing tests for NIT and security** - `f9b2b26` (test)
2. **Task 1: ORM models, schemas, security, NIT** - `b148df1` (feat)
3. **Task 2: Auth router, alembic env.py, seed** - `d8aaf6e` (feat)

## Files Created/Modified

- `backend/app/models/user.py` - User ORM model: id, username, hashed_password, is_active
- `backend/app/models/settings.py` - CompanySettings with DIANEnvironment/FiscalRegime enums, CHECK(id=1)
- `backend/app/models/resolution.py` - NumberingResolution for DIAN invoice number ranges
- `backend/app/models/__init__.py` - Exports Base, User, CompanySettings, NumberingResolution for Alembic
- `backend/app/core/security.py` - JWT create/decode, bcrypt hash/verify, get_current_user dependency
- `backend/app/services/nit.py` - Module-11 check digit calculator and validator
- `backend/app/services/seed.py` - Idempotent admin user seed called from lifespan
- `backend/app/schemas/auth.py` - LoginRequest, TokenResponse Pydantic schemas
- `backend/app/schemas/settings.py` - BusinessProfileCreate/Response, CertificateUploadResponse, EnvironmentUpdate
- `backend/app/schemas/resolution.py` - ResolutionCreate, ResolutionResponse
- `backend/app/routers/auth.py` - POST /api/auth/login endpoint
- `backend/tests/test_nit.py` - 5 NIT tests including both DIAN test vectors
- `backend/tests/test_security.py` - bcrypt and JWT unit tests
- `backend/app/main.py` - Added auth_router include and seed_admin_user call in lifespan
- `backend/alembic/env.py` - Uncommented all model imports for migration autogenerate

## Decisions Made

- NIT check digit uses exact WEIGHTS `(3,7,13,17,19,23,29,37,41,43,47,53,59,67,71)` and LOOKUP `"01987654321"` from DIAN spec — validated against official test vectors
- `get_current_user` uses lazy import for User model inside the function body to avoid circular imports between `security.py` and `models/user.py`
- Default admin credentials are `admin/admin` — seed script prints explicit warning to change password on first run
- `DIANEnvironment` and `FiscalRegime` are Python str+enum stored as named PostgreSQL ENUM types (`fiscal_regime_enum`, `dian_environment_enum`)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Python 3 unavailable in the local shell environment (no `python` or `pytest` in PATH) — tests cannot be run directly on the host. Tests are designed to run inside the Docker container where all dependencies are installed. This is expected for this Docker-first project setup.

## User Setup Required

None - no external service configuration required. The migration and seed run automatically inside Docker on `docker-compose up`.

## Next Phase Readiness

- Database schema can now be migrated: `alembic upgrade head` will create `users`, `company_settings`, and `numbering_resolutions` tables
- POST /api/auth/login is ready for frontend auth (Plan 03/05)
- `get_current_user` dependency is ready to protect API endpoints (Plan 04)
- NIT service is ready for use in the business profile setup flow

---
*Phase: 01-foundation-and-setup*
*Completed: 2026-03-26*
