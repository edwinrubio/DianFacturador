# Phase 01: Foundation and Setup - Research

**Researched:** 2026-03-26
**Domain:** Docker-compose project scaffold, FastAPI + SQLAlchemy + PostgreSQL setup, React 19 + Vite 8 + shadcn/ui onboarding wizard, certificate file upload, NIT check digit validation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Onboarding wizard style is Claude's discretion (step-by-step wizard vs checklist — pick what's most practical)
- **D-02:** Application is BLOCKED until all configuration is complete. User cannot access any other functionality until setup is done. Show clear message explaining what's missing and why it's required.
- **D-03:** Setup only saves data — no real-time validation against DIAN during onboarding. Validation happens when user first attempts to create/send a document.

### Claude's Discretion

- **Visual style:** Claude decides look and feel. The app targets persona natural and microempresas in Colombia — should feel simple, approachable, not intimidating. shadcn/ui + Tailwind v4 is the stack.
- **Access control:** Claude decides whether to add login/password or leave as open access. Consider that the app handles sensitive data (digital certificates, NIT) but is single-tenant and typically local.
- **Idioma:** Claude decides. The app is for Colombian users but open source globally.
- **Onboarding wizard UX:** Claude decides the specific flow pattern (stepper, pages, sidebar checklist).

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFR-01 | Application runs via docker-compose (one command: docker-compose up) | Docker Compose v5, three-service setup (backend, postgres, nginx) pattern verified |
| INFR-02 | Application can be installed manually (clone repo, install deps, configure DB) | Standard FastAPI + npm install pattern; Alembic CLI docs cover manual migration |
| INFR-03 | PostgreSQL 16 as database with Alembic migrations | asyncpg 0.31.0 + SQLAlchemy 2.0.48 async + Alembic 1.18.4; startup migration pattern confirmed |
| INFR-04 | Application is fully open source | No research required — project license choice |
| CONF-01 | User can configure business profile (NIT, razón social, régimen fiscal, dirección, datos de contacto) | Business profile model fields mapped; single-row settings table pattern identified |
| CONF-02 | User can upload digital certificate (.p12 file + passphrase) for electronic signing | FastAPI UploadFile + Docker volume storage pattern confirmed; passphrase stored encrypted |
| CONF-03 | User can manage numbering resolutions (prefix, range start/end, technical key, expiry date) | Resolution model with active flag pattern; critical for Phase 3+ pipeline |
| CONF-04 | User can configure environment (habilitación test vs producción) | Single enum field on settings; ProfileExecutionID must be stored alongside |
| CONF-05 | User is guided through initial setup via onboarding wizard (step-by-step checklist) | shadcn/ui onboarding stepper block identified; 4-step flow designed |
| CONF-06 | System validates NIT check digit automatically | Module-11 algorithm with DIAN prime weights confirmed via python-stdnum source |
</phase_requirements>

---

## Summary

Phase 1 is the project foundation: everything that must exist before a single invoice can be contemplated. It encompasses three orthogonal concerns that must all ship together: (1) infrastructure scaffold — Docker Compose with FastAPI, PostgreSQL, and nginx in a working, production-like configuration; (2) backend data model — the company settings table, certificate storage, numbering resolution table, and JWT authentication layer; and (3) frontend onboarding wizard — a blocked-access React SPA that guides the user through all four required configuration steps before unlocking the rest of the application.

The research confirms this phase uses entirely well-documented standard patterns. The stack is FastAPI 0.128.8 (latest verified on this machine; CLAUDE.md documents 0.135.2 from research), SQLAlchemy 2.0.48, asyncpg 0.31.0, Alembic 1.18.4, and React 19 + Vite 8 + Tailwind v4 + shadcn/ui. No DIAN-specific integration occurs in this phase — the signing, XML, and SOAP layers are all Phase 3+. The only Colombia-specific algorithm in this phase is the NIT check digit (Module-11 with DIAN prime weights), which is fully verified.

The single discretionary decision with architectural impact: **add login/password protection**. The recommendation (documented below) is YES — a single-user bcrypt+JWT login is warranted because the app stores a live digital certificate (.p12 file) and passphrase on the filesystem. The risk of an exposed local network endpoint with no authentication is real even in a "local only" deployment.

**Primary recommendation:** Build this phase as three sequential streams — (A) Docker Compose scaffold + FastAPI skeleton with Alembic, (B) settings/certificate/resolution data model and REST API, (C) React SPA with the 4-step onboarding wizard and a route guard that blocks until setup is complete.

---

## Project Constraints (from CLAUDE.md)

Directives from `./CLAUDE.md` that the planner must enforce:

| Directive | Constraint |
|-----------|------------|
| Stack: Backend | Python 3.12+, FastAPI, Pydantic v2, Uvicorn, PostgreSQL |
| Stack: ORM | SQLAlchemy 2.0 (async), asyncpg, Alembic (never `Base.metadata.create_all()` in production) |
| Stack: Frontend | React 19, Vite 8, TypeScript 5, Tailwind CSS v4, shadcn/ui, TanStack Query v5, React Hook Form v7 + Zod |
| Stack: Auth | python-jose[cryptography] + passlib[bcrypt] |
| Stack: Certificate loading | `cryptography` library (pyOpenSSL removed, do not use) |
| Stack: Infrastructure | Docker + docker-compose v3.x, nginx alpine, PostgreSQL 16+ |
| Regulatory | Must comply 100% with DIAN normativa |
| Migrations | Use Alembic, run `alembic upgrade head` on container start |
| GSD Workflow | All file changes must go through a GSD command (`/gsd:execute-phase`) |

---

## Standard Stack

### Core — Backend

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Python | 3.12+ | Runtime | FastAPI officially recommends 3.12/3.13 for new projects |
| FastAPI | 0.128.8 (PyPI latest on this machine; project research documented 0.135.2) | REST API | Async-native, Pydantic v2, auto OpenAPI docs |
| Pydantic | v2 (ships with FastAPI) | Request/response validation | Rust-powered core, required for FastAPI |
| pydantic-settings | 2.x | Environment/config management | Official companion; reads .env, typed settings class |
| Uvicorn | 0.42.0 | ASGI server | Standard ASGI server for FastAPI; use `uvicorn[standard]` |
| SQLAlchemy | 2.0.48 | Async ORM | Only production-grade async ORM for Python; 2.0 stable series |
| asyncpg | 0.31.0 | PostgreSQL async driver | Required for SQLAlchemy async mode; fastest Python PG driver |
| Alembic | 1.18.4 | Database migrations | Only serious migration tool for SQLAlchemy |
| python-multipart | 0.0.x | File upload (UploadFile) | Required for FastAPI file uploads |
| python-jose[cryptography] | 3.5.0 | JWT token create/validate | Standard FastAPI JWT library |
| passlib[bcrypt] | 1.7.4 | Password hashing | Industry-standard bcrypt; note: passlib is maintenance-only (last release 2020) — it works but monitor for replacement |
| python-dotenv | latest | .env loading | Works with pydantic-settings |
| cryptography | 44.x | PKCS12 certificate loading | PyCA official; pyOpenSSL.crypto.load_pkcs12 was removed — do NOT use pyOpenSSL |

### Core — Frontend

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.4 | UI framework | Current stable; React 19 with concurrent features |
| Vite | 8.0.3 | Build tool + dev server | Current standard for React SPAs in 2026 |
| TypeScript | 6.0.2 | Type safety | Non-negotiable for financial software maintainability |
| Tailwind CSS | 4.2.2 | Styling | v4 production-ready; CSS-first config, Oxide engine |
| shadcn/ui | latest (CLI-installed) | UI components | Accessible components on Radix UI, full Tailwind v4 + React 19 support |
| react-router | 7.13.2 | Client-side routing | Current standard; v7 simplifies to single `react-router` package |
| TanStack Query | 5.95.2 | Server state / data fetching | Standard for React data fetching in 2025-2026 |
| React Hook Form | 7.72.0 | Form state management | Best performance for complex forms; minimal re-renders |
| Zod | 4.3.6 | Schema validation | Pairs with React Hook Form; defines field validation rules |
| axios | 1.13.6 | HTTP client | Widely used; works well with TanStack Query |

### Core — Infrastructure

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Docker | 29.2.1 (local) | Container runtime | Required by CLAUDE.md |
| Docker Compose | v5.0.2 (local) | Orchestration | `docker-compose up` as the primary install path |
| PostgreSQL | 16-alpine (image) | Database | CLAUDE.md requirement; ACID, free, mature |
| nginx | alpine (image) | Static file server + API proxy | Serves Vite `dist/`, proxies `/api` to FastAPI |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| python-jose | joserfc | joserfc is newer but less community adoption for FastAPI; python-jose is battle-tested |
| passlib | argon2-cffi directly | argon2-cffi is more modern but passlib provides a higher-level API; for this phase either works |
| react-router | TanStack Router | TanStack Router is excellent but shadcn/ui examples and community patterns lean on react-router |
| axios | fetch API | Both work; axios has better interceptor support for JWT token injection |

### Installation — Backend

```bash
# Backend (in /backend/)
pip install fastapi[standard] uvicorn[standard] sqlalchemy[asyncio] asyncpg alembic \
            pydantic-settings python-multipart \
            python-jose[cryptography] passlib[bcrypt] \
            cryptography python-dotenv
```

### Installation — Frontend

```bash
# Frontend (in /frontend/)
npm create vite@latest . -- --template react-ts
npm install
npm install react-router @tanstack/react-query react-hook-form zod axios

# shadcn/ui (init then add components as needed)
npx shadcn@latest init
npx shadcn@latest add button card form input label progress separator
```

**Version verification performed:** FastAPI 0.128.8 (pip index), SQLAlchemy 2.0.48 (pip index), Alembic 1.18.4 (web search confirmed), React 19.2.4 (npm view), Vite 8.0.3 (npm view), Tailwind 4.2.2 (npm view), react-router 7.13.2 (npm view), asyncpg 0.31.0 (web search), uvicorn 0.42.0 (web search).

Note: The CLAUDE.md stack document (from prior research) references FastAPI 0.135.2 — this version may be available on PyPI but was not the top result from `pip index` on this machine (returns 0.128.8). The planner should use `fastapi>=0.115.0` as the version constraint and let pip resolve the latest compatible version.

---

## Architecture Patterns

### Recommended Project Structure

```
dianFacturador/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   └── app/
│       ├── main.py              # FastAPI app + lifespan + CORS
│       ├── core/
│       │   ├── config.py        # pydantic-settings Settings class
│       │   ├── database.py      # create_async_engine, AsyncSession, get_db
│       │   └── security.py      # JWT create/verify, password hash/verify
│       ├── models/
│       │   ├── base.py          # DeclarativeBase
│       │   ├── settings.py      # CompanySettings ORM model (single row)
│       │   ├── resolution.py    # NumberingResolution ORM model
│       │   └── user.py          # User ORM model (single admin user)
│       ├── schemas/
│       │   ├── settings.py      # Pydantic request/response schemas
│       │   ├── resolution.py
│       │   └── auth.py
│       ├── routers/
│       │   ├── auth.py          # POST /auth/login, POST /auth/logout
│       │   ├── settings.py      # GET/PUT /settings, POST /settings/certificate
│       │   ├── resolutions.py   # CRUD /resolutions
│       │   └── setup_status.py  # GET /setup/status (onboarding gate check)
│       └── services/
│           ├── nit.py           # NIT check digit validation
│           └── certificate.py   # .p12 file save to volume, validate passphrase
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx              # Router setup, QueryClientProvider
│       ├── lib/
│       │   ├── api.ts           # axios instance with JWT interceptor
│       │   └── queryClient.ts
│       ├── hooks/
│       │   └── useSetupStatus.ts
│       ├── pages/
│       │   ├── LoginPage.tsx
│       │   ├── OnboardingPage.tsx   # Multi-step wizard
│       │   └── DashboardPage.tsx    # Post-setup landing (stub)
│       └── components/
│           ├── ProtectedRoute.tsx   # JWT guard → /login
│           ├── SetupGuard.tsx       # Setup complete guard → /onboarding
│           └── onboarding/
│               ├── StepBusiness.tsx
│               ├── StepCertificate.tsx
│               ├── StepResolution.tsx
│               └── StepEnvironment.tsx
└── nginx/
    └── nginx.conf               # Proxy /api → backend:8000, serve frontend dist/
```

### Pattern 1: Docker Compose with Health Checks and Startup Migration

**What:** Three-service compose file where postgres exposes a health check, backend depends on healthy postgres and runs `alembic upgrade head` before uvicorn, nginx depends on backend.

**When to use:** Always — this is the INFR-01 requirement pattern.

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 5s
      timeout: 5s
      retries: 10

  backend:
    build: ./backend
    command: bash -c "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"
    volumes:
      - cert_storage:/app/certs    # .p12 files stored here
    environment:
      - DATABASE_URL=postgresql+asyncpg://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      - SECRET_KEY=${SECRET_KEY}
      - CERT_STORAGE_PATH=/app/certs
    depends_on:
      postgres:
        condition: service_healthy
    env_file: .env

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres_data:
  cert_storage:
```

**Source:** CLAUDE.md stack document + berkkaraal.com FastAPI+Docker guide (Sep 2024) + community pattern (HIGH confidence)

### Pattern 2: Async SQLAlchemy Session with FastAPI Dependency

**What:** `create_async_engine` + `async_sessionmaker` + FastAPI `Depends(get_db)` pattern for all database access.

**When to use:** Every router that touches the database.

```python
# app/core/database.py
from sqlalchemy.ext.asyncio import (
    AsyncSession, async_sessionmaker, create_async_engine
)
from app.core.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_pre_ping=True,
)

async_session_maker = async_sessionmaker(
    engine, expire_on_commit=False
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session
```

**Source:** berkkaraal.com guide + SQLAlchemy 2.0 official docs (HIGH confidence)

### Pattern 3: pydantic-settings for Configuration

**What:** Single `Settings` class inheriting from `BaseSettings`, cached via `@lru_cache`, read from environment variables with `.env` file fallback.

**When to use:** All configuration — never hardcode values in application code.

```python
# app/core/config.py
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 8   # 8 hours
    cert_storage_path: str = "/app/certs"
    debug: bool = False

@lru_cache
def get_settings() -> Settings:
    return Settings()
```

**Source:** FastAPI official docs + pydantic-settings official docs (HIGH confidence)

### Pattern 4: NIT Check Digit Validation (Module-11 DIAN Algorithm)

**What:** Colombia's DIAN uses a Module-11 algorithm with a specific set of 15 prime weights. The algorithm multiplies NIT digits (reversed) by the weights, sums products, mods by 11, then maps the remainder through a lookup string.

**When to use:** CONF-06 — validate NIT during company profile setup.

```python
# app/services/nit.py
# Source: python-stdnum/stdnum/co/nit.py (verified via GitHub)

WEIGHTS = (3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71)
LOOKUP = "01987654321"  # maps remainder 0-10 to check digit

def calculate_check_digit(nit: str) -> str:
    """Calculate the DIAN check digit for a NIT number.

    Args:
        nit: NIT digits only (no hyphens, no check digit), 1-15 digits
    Returns:
        Single character check digit ('0'-'9')
    Raises:
        ValueError if nit contains non-digit characters
    """
    digits = nit.strip().replace(".", "").replace("-", "")
    if not digits.isdigit():
        raise ValueError(f"NIT must contain only digits, got: {nit}")

    remainder = sum(
        w * int(d)
        for w, d in zip(WEIGHTS, reversed(digits))
    ) % 11

    return LOOKUP[remainder]

def validate_nit(nit_with_check: str) -> bool:
    """Validate a full NIT including check digit (format: '900123456-7')."""
    clean = nit_with_check.strip().replace(".", "").replace(" ", "")
    if "-" in clean:
        base, check = clean.rsplit("-", 1)
    else:
        base, check = clean[:-1], clean[-1]
    return calculate_check_digit(base) == check
```

**Source:** python-stdnum source on GitHub (verified algorithm). Weights array [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71] confirmed. (HIGH confidence)

### Pattern 5: React Route Guard with JWT + Setup Gate

**What:** Two-layer guard system: (1) `ProtectedRoute` checks JWT token in localStorage and redirects to `/login` if absent; (2) `SetupGuard` checks setup status via API and redirects to `/onboarding` if any required step is incomplete.

**When to use:** D-02 (application blocked until setup complete).

```typescript
// src/components/ProtectedRoute.tsx
import { Navigate, Outlet } from "react-router";
import { useAuth } from "@/hooks/useAuth";

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

// src/components/SetupGuard.tsx
import { Navigate, Outlet } from "react-router";
import { useSetupStatus } from "@/hooks/useSetupStatus";

export function SetupGuard() {
  const { isComplete, isLoading } = useSetupStatus();
  if (isLoading) return <div>Cargando...</div>;
  return isComplete ? <Outlet /> : <Navigate to="/onboarding" replace />;
}

// src/App.tsx routing structure:
// /login            → LoginPage (public)
// /onboarding       → OnboardingPage (requires auth, bypasses SetupGuard)
// /* (protected)    → ProtectedRoute > SetupGuard > {app pages}
```

**Source:** react-router v7 docs + multiple 2025 community guides (HIGH confidence)

### Pattern 6: Onboarding Wizard with 4 Steps

**What:** Step-by-step wizard using shadcn/ui stepper pattern. 4 steps covering all CONF requirements. Each step validates before allowing advancement. Application is blocked (D-02) until all 4 steps complete.

**Steps:**
1. **Empresa** — NIT, razón social, régimen fiscal (Simplificado/Común), dirección, email, teléfono (CONF-01, CONF-06)
2. **Certificado Digital** — .p12 file upload + passphrase entry (CONF-02)
3. **Resolución de Facturación** — prefix, rango inicio/fin, clave técnica, fecha vencimiento (CONF-03)
4. **Entorno DIAN** — habilitación vs producción selection with clear explanation (CONF-04)

**Idioma decision:** Spanish UI throughout. The app is for Colombian users; Spanish is the only practical choice. Code comments and variable names in English.

**Auth decision:** Add login. A single admin user (username + bcrypt password) with JWT session tokens. Rationale: the app stores a live .p12 certificate and passphrase on disk — any HTTP exposure without auth is a security risk even on a local network. Single-tenant means the login is a one-time setup, not an ongoing burden.

```typescript
// Wizard step state pattern (no library needed — simple state)
const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
const totalSteps = 4;

// Each step is a separate form with React Hook Form + Zod
// Submission calls the API then advances step
```

**Source:** shadcn/ui onboarding stepper block docs + react-router v7 patterns (HIGH confidence)

### Pattern 7: Certificate File Upload and Storage

**What:** FastAPI `UploadFile` endpoint writes the .p12 file to the Docker volume at `/app/certs/`. The passphrase is stored encrypted in the database (using Fernet symmetric encryption from the `cryptography` library, keyed from `SECRET_KEY`). The filename on disk is fixed (`certificate.p12`) — one cert at a time.

**When to use:** CONF-02.

```python
# app/routers/settings.py
from fastapi import APIRouter, UploadFile, File, Form, Depends
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives.serialization import pkcs12
import aiofiles

router = APIRouter(prefix="/settings", tags=["settings"])

@router.post("/certificate")
async def upload_certificate(
    file: UploadFile = File(...),
    passphrase: str = Form(...),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    # 1. Read file content
    content = await file.read()

    # 2. Validate: attempt PKCS12 load with passphrase (D-03: no DIAN validation)
    try:
        pkcs12.load_key_and_certificates(content, passphrase.encode())
    except Exception:
        raise HTTPException(422, "Certificado inválido o contraseña incorrecta")

    # 3. Save .p12 to Docker volume
    cert_path = Path(settings.cert_storage_path) / "certificate.p12"
    async with aiofiles.open(cert_path, "wb") as f:
        await f.write(content)

    # 4. Store encrypted passphrase in database
    fernet = Fernet(settings.fernet_key)
    encrypted_passphrase = fernet.encrypt(passphrase.encode())
    await save_certificate_config(db, str(cert_path), encrypted_passphrase)

    return {"status": "ok"}
```

**Source:** FastAPI file upload docs + cryptography library docs (MEDIUM confidence — exact Fernet usage pattern is standard, but the encrypted-passphrase-in-DB approach is a common pattern for this type of problem)

### Anti-Patterns to Avoid

- **`Base.metadata.create_all()` in production:** Never. Always use `alembic upgrade head`. Tables created this way cannot be managed by Alembic. (Source: CLAUDE.md)
- **Storing .p12 passphrase in plaintext:** Store it Fernet-encrypted using the app's SECRET_KEY. Plaintext passphrase exposure in database is a critical security risk.
- **Using pyOpenSSL for PKCS12 loading:** `pyOpenSSL.crypto.load_pkcs12` was removed. Always use `cryptography.hazmat.primitives.serialization.pkcs12.load_key_and_certificates`. (Source: CLAUDE.md)
- **Wildcard CORS allow_origins in production:** Use the specific frontend origin. Wildcard with credentials=True is a browser security policy violation.
- **Default environment (habilitación vs producción):** The environment selection must be explicit — never hardcode a default. Pitfall 8 from PITFALLS.md. Display the current environment prominently in the UI at all times.
- **No depends_on health check:** Without `condition: service_healthy` on the postgres dependency, the backend container starts before Postgres accepts connections, causing `alembic upgrade head` to fail.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom hash function | `passlib[bcrypt]` | bcrypt has proper cost factor, salt, and timing-safe comparison built in |
| JWT creation/validation | Custom JWT | `python-jose[cryptography]` | JWT has edge cases (expiry, algorithm confusion attack); use a proven library |
| PKCS12 certificate loading | Custom ASN.1 parser | `cryptography` library `pkcs12.load_key_and_certificates()` | ASN.1 parsing is notoriously complex; cryptography library handles all variants |
| NIT check digit | Custom algorithm from a blog post | Implement from python-stdnum verified source (shown above) | The weights array [3,7,13,17,19,23,29,37,41,43,47,53,59,67,71] is confirmed correct; do not guess |
| Database migrations | Manual ALTER TABLE | Alembic | Schema drift, team collaboration, rollback support |
| Settings management | `os.environ.get()` scattered | pydantic-settings | Type safety, validation, .env support, single source of truth |
| File upload validation | MIME type string check | Attempt actual PKCS12 parse | Content-Type is client-controlled and meaningless for security; attempt the actual parse |
| Onboarding stepper | Custom multi-page routing | Simple `useState` step counter | The stepper is trivially simple with a counter; no library overhead needed |
| Passphrase encryption | XOR or base64 | `cryptography.Fernet` | Fernet provides authenticated encryption (AES-128-CBC + HMAC-SHA256); XOR/base64 is not encryption |

**Key insight:** This phase has no novel algorithmic problems. Every sub-problem (auth, JWT, file upload, migrations, settings) has a battle-tested Python library that handles it correctly. The risk is not in the algorithms — it is in wiring them together correctly (health checks, migration order, environment isolation).

---

## Common Pitfalls

### Pitfall 1: Alembic Migration Fails at Startup (Race Condition)

**What goes wrong:** Backend container starts, runs `alembic upgrade head`, fails with `could not connect to server` because PostgreSQL is still initializing.

**Why it happens:** `depends_on: postgres` without a health check only waits for the container to START, not for Postgres to accept connections. Postgres takes 2-5 seconds after container start to be ready.

**How to avoid:** Add a proper healthcheck to the postgres service with `pg_isready`. Use `depends_on: postgres: condition: service_healthy` in the backend service.

**Warning signs:** `psycopg2.OperationalError: could not connect to server` or `asyncpg.exceptions.ConnectionDoesNotExistError` in backend logs during startup.

### Pitfall 2: CORS Blocks API Calls in Development

**What goes wrong:** Frontend dev server (localhost:5173) gets blocked by browser CORS policy when calling backend API (localhost:8000 in dev, or /api via nginx in production).

**Why it happens:** In production, nginx proxies `/api` to the backend on the same origin — no CORS issue. But in development with `vite dev`, the frontend runs on port 5173 and the backend on 8000 — cross-origin.

**How to avoid:** In development, configure Vite proxy in `vite.config.ts`:
```typescript
server: {
  proxy: {
    '/api': { target: 'http://localhost:8000', changeOrigin: true }
  }
}
```
In production (docker-compose), nginx handles proxying — FastAPI's CORS middleware is configured to allow only `http://localhost` (the nginx-served frontend origin).

**Warning signs:** Browser console shows "CORS policy: No 'Access-Control-Allow-Origin' header".

### Pitfall 3: NIT Validation — Wrong Algorithm or Weights

**What goes wrong:** NIT check digit validation silently accepts invalid NITs or rejects valid ones, causing downstream DIAN rejections (FAJ43) when the NIT doesn't match RUT records.

**Why it happens:** Multiple blog posts and Stack Overflow answers describe slightly different weight arrays or lookup tables for the DIAN Module-11 algorithm. Some use weights [71, 67, 59...] (descending), others use [3, 7, 13...] (ascending applied to reversed digits) — these are mathematically equivalent but only when implemented correctly.

**How to avoid:** Use the exact implementation from python-stdnum (weights = `(3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71)`, applied to reversed digits, lookup string `"01987654321"`). Write tests against known NIT+DV pairs: `900123456-7`, `860069804-2`.

**Warning signs:** Backend returns different check digit from what the DIAN portal shows for the same NIT.

### Pitfall 4: .p12 Certificate Passphrase in Plaintext

**What goes wrong:** The passphrase is stored in plain text in the database or in an environment variable, exposing it to anyone with database access or who can read the container environment.

**Why it happens:** Developers store it as a plain varchar to "keep it simple."

**How to avoid:** Encrypt the passphrase with `cryptography.Fernet` using the app's `SECRET_KEY` before storing. The decrypted passphrase is only ever in memory when actively loading the certificate for signing.

**Warning signs:** `certificate_passphrase` column in database contains readable text.

### Pitfall 5: Single-Row Settings Table Not Enforced

**What goes wrong:** Multiple rows are inserted into the `company_settings` table, causing undefined behavior when the backend reads "the" company settings.

**Why it happens:** Standard ORM patterns allow arbitrary row insertion; developers forget to enforce the singleton constraint.

**How to avoid:** Add a PostgreSQL constraint: either a `CHECK (id = 1)` on the primary key, or a partial unique index on a boolean `is_active = true` column. Alternatively, use an upsert pattern on a fixed ID (1) in the API endpoint.

**Warning signs:** `SELECT * FROM company_settings` returns multiple rows.

### Pitfall 6: Setup Guard Causes Infinite Redirect Loop

**What goes wrong:** The `/onboarding` route is behind the `SetupGuard`, which redirects to `/onboarding` when setup is not complete — infinite loop.

**Why it happens:** Misconfigured route nesting puts the setup guard on the onboarding route itself.

**How to avoid:** The route structure must be: `/onboarding` requires `ProtectedRoute` only (NOT `SetupGuard`). The `SetupGuard` wraps all other protected routes. See Pattern 5.

**Warning signs:** Browser shows "ERR_TOO_MANY_REDIRECTS" on the onboarding page.

### Pitfall 7: Environment Field Has a Default

**What goes wrong:** The environment (habilitación vs producción) field in the settings model defaults to `habilitación`, and users inadvertently send real invoices to the test endpoint.

**Why it happens:** Developers add `default="habilitacion"` to be helpful during development.

**How to avoid:** No default. The field is required during onboarding Step 4. Display the selected environment prominently in the UI header/sidebar after setup. (Source: PITFALLS.md, Pitfall 8)

**Warning signs:** Database has `environment = 'habilitacion'` set on first app startup without user action.

---

## Code Examples

### SQLAlchemy Models for Phase 1 Tables

```python
# app/models/settings.py
# Source: SQLAlchemy 2.0 docs + project architecture pattern

import enum
from datetime import date
from sqlalchemy import String, Boolean, Enum as SAEnum, Date, Text, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base

class DIANEnvironment(str, enum.Enum):
    HABILITACION = "habilitacion"
    PRODUCCION = "produccion"

class FiscalRegime(str, enum.Enum):
    SIMPLIFICADO = "simplificado"   # Régimen simple de tributación
    COMUN = "comun"                  # Responsable de IVA

class CompanySettings(Base):
    __tablename__ = "company_settings"
    __table_args__ = (
        CheckConstraint("id = 1", name="single_row"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    nit: Mapped[str] = mapped_column(String(20), nullable=False)        # e.g., "900123456"
    check_digit: Mapped[str] = mapped_column(String(1), nullable=False) # e.g., "7"
    razon_social: Mapped[str] = mapped_column(String(255), nullable=False)
    fiscal_regime: Mapped[FiscalRegime] = mapped_column(SAEnum(FiscalRegime))
    address: Mapped[str] = mapped_column(Text, nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)

    # Certificate
    cert_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    cert_passphrase_encrypted: Mapped[bytes | None] = mapped_column(nullable=True)

    # DIAN environment
    dian_environment: Mapped[DIANEnvironment | None] = mapped_column(
        SAEnum(DIANEnvironment), nullable=True
    )

# app/models/resolution.py
class NumberingResolution(Base):
    __tablename__ = "numbering_resolutions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    prefix: Mapped[str] = mapped_column(String(10), nullable=False)    # e.g., "FE-"
    from_number: Mapped[int] = mapped_column(nullable=False)
    to_number: Mapped[int] = mapped_column(nullable=False)
    technical_key: Mapped[str] = mapped_column(String(255), nullable=False)  # Clave técnica DIAN
    valid_from: Mapped[date] = mapped_column(Date, nullable=False)
    valid_to: Mapped[date] = mapped_column(Date, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    current_number: Mapped[int] = mapped_column(nullable=True)   # tracks next to assign
    resolution_number: Mapped[str | None] = mapped_column(String(50), nullable=True)  # DIAN resolution ref
```

### Alembic env.py for Async Engine

```python
# alembic/env.py — critical: use run_sync for async compatibility
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context

config = context.config
target_metadata = Base.metadata

def run_migrations_online():
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async def do_run_migrations(connection):
        context.configure(connection=connection, target_metadata=target_metadata)
        async with context.begin_transaction():
            context.run_migrations()

    import asyncio
    asyncio.run(connectable.connect().__aenter__().__await__().send(None))
    # NOTE: Use the standard Alembic async template: `alembic init -t async alembic`
    # which generates the correct async env.py boilerplate
```

### Setup Status API Endpoint

```python
# app/routers/setup_status.py
# Returns a structured object the frontend uses to drive the SetupGuard

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db

router = APIRouter(prefix="/setup", tags=["setup"])

@router.get("/status")
async def get_setup_status(db: AsyncSession = Depends(get_db)):
    settings = await get_company_settings(db)
    resolutions = await get_active_resolutions(db)

    steps = {
        "business_profile": settings is not None and settings.razon_social is not None,
        "certificate": settings is not None and settings.cert_path is not None,
        "resolution": len(resolutions) > 0,
        "environment": settings is not None and settings.dian_environment is not None,
    }

    return {
        "is_complete": all(steps.values()),
        "steps": steps,
        "missing": [k for k, v in steps.items() if not v],
    }
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `react-router-dom` import | Import from `react-router` | v7 (Nov 2024) | `react-router-dom` is a re-export; use `react-router` directly |
| `pyOpenSSL.crypto.load_pkcs12` | `cryptography` `pkcs12.load_key_and_certificates()` | 2023 (pyOpenSSL removed the function) | Do NOT use pyOpenSSL for PKCS12 loading |
| Tailwind config via `tailwind.config.js` | CSS-first config in `@import "tailwindcss"` | Tailwind v4 (Jan 2025) | No separate JS config file needed |
| `SQLAlchemy 1.x` style session | SQLAlchemy 2.0 `Mapped` types + `mapped_column()` | SQLAlchemy 2.0 (2023, stable 2024) | New declarative style with full type inference |
| `create_engine` sync | `create_async_engine` with asyncpg | SQLAlchemy 2.0 | Required for FastAPI async compatibility |
| `vite create-react-app` | `npm create vite@latest` | Vite 3+ (2022 onward) | CRA is deprecated; Vite is the standard |
| Tailwind CSS v3 peer-deps | Tailwind CSS v4 Vite plugin | v4 (Jan 2025) | Different install: `@tailwindcss/vite` plugin, not PostCSS |

**Deprecated/outdated:**
- `python-dotenv` standalone: still works but pydantic-settings absorbs its functionality
- `Babel` in Vite: not needed for React Refresh in Vite 8+
- `SQLModel`: tempting (SQLAlchemy + Pydantic in one) but adds abstraction that can hide behavior; use SQLAlchemy 2.0 directly per CLAUDE.md

---

## Open Questions

1. **Passlib maintenance status**
   - What we know: passlib 1.7.4 was last released October 2020. It still works but is unmaintained.
   - What's unclear: Whether there are known CVEs or Python 3.12+ compatibility issues that would block usage.
   - Recommendation: Use passlib[bcrypt] for this phase (it works). Add a note to monitor; `argon2-cffi` is a drop-in alternative if passlib breaks. Several FastAPI docs and guides still recommend it as of March 2026.

2. **python-jose maintenance status**
   - What we know: python-jose 3.5.0 released May 2025. The underlying library has had security issues in the past (algorithm confusion).
   - What's unclear: Whether `joserfc` (the newer alternative) is stable enough to prefer.
   - Recommendation: Use `python-jose[cryptography]` for this phase per CLAUDE.md. The `[cryptography]` extra uses the `cryptography` library as the backend, which mitigates algorithm confusion attacks. Set `algorithms=["HS256"]` explicitly when decoding.

3. **Fernet key generation for passphrase encryption**
   - What we know: `cryptography.Fernet` requires a 32-byte URL-safe base64-encoded key.
   - What's unclear: Whether to derive the Fernet key from `SECRET_KEY` via HKDF or store a separate `FERNET_KEY` env var.
   - Recommendation: Use a separate `FERNET_KEY` env var generated at first install. Cleaner than deriving from SECRET_KEY and avoids coupling two independent security domains. Add `FERNET_KEY` generation to the setup documentation.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker | INFR-01 | Yes | 29.2.1 | — |
| Docker Compose | INFR-01 | Yes | v5.0.2 | — |
| Node.js | Frontend build | Yes | v24.12.0 | — |
| npm | Frontend build | Yes | 11.10.0 | — |
| Python 3 | Backend (local dev/testing) | Yes | 3.9.6 | Use Docker (Python 3.12 in image) |
| PostgreSQL (local) | Direct DB access | No | — | Use Docker service (correct approach) |
| Git | INFR-04 | Yes | 2.50.1 | — |

**Important:** Local Python is 3.9.6, but project requires Python 3.12+. This is fine — the backend runs in Docker with a Python 3.12 base image. Local Python 3.9.6 cannot run the backend directly without a venv with Python 3.12 installed. The docker-compose workflow is the primary path.

**Missing dependencies with no fallback:** None — all required tools are available.

**Missing dependencies with fallback:**
- Local Python 3.12+: Not installed locally, but Docker handles this (correct approach per CLAUDE.md).
- PostgreSQL local client (psql): Not installed locally; use `docker compose exec postgres psql` for direct DB access.

---

## Sources

### Primary (HIGH confidence)
- CLAUDE.md — project stack constraints and technology decisions
- `.planning/research/SUMMARY.md` — project architecture and phase rationale
- `.planning/research/PITFALLS.md` — DIAN-specific pitfalls affecting Phase 1 (Pitfalls 5, 8, 11)
- python-stdnum GitHub (arthurdejong/python-stdnum) — NIT check digit algorithm verification
- FastAPI official docs (fastapi.tiangolo.com) — CORS, file upload, security patterns
- SQLAlchemy 2.0 docs — async engine, Mapped types
- pydantic-settings docs — Settings class pattern

### Secondary (MEDIUM confidence)
- berkkaraal.com/blog — FastAPI + SQLAlchemy 2 + Alembic + Docker guide (Sep 2024)
- shadcn/ui official docs (ui.shadcn.com) — Tailwind v4, React 19, onboarding stepper block
- react-router changelog (reactrouter.com) — v7 package simplification
- npm view output — React 19.2.4, Vite 8.0.3, Tailwind 4.2.2, TypeScript 6.0.2, react-router 7.13.2

### Tertiary (LOW confidence, flagged)
- WebSearch results on python-jose/passlib maintenance status — confirm before production

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified via npm view and pip index; all major libraries are official stable releases
- Architecture: HIGH — standard FastAPI + docker-compose patterns from official docs and well-established guides
- NIT algorithm: HIGH — verified from python-stdnum source code (official library used by many Colombian tax tools)
- Pitfalls: HIGH — sourced from PITFALLS.md (which was based on official DIAN rejection codes and integrator wiki)
- Auth decision: MEDIUM — the recommendation to add login is based on security reasoning; the user could reasonably decide to skip it

**Research date:** 2026-03-26
**Valid until:** 2026-06-01 (90 days — stack is stable; Tailwind v4 and React 19 ecosystem are maturing but not changing rapidly)
