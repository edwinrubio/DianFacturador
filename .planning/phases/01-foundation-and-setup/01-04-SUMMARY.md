---
phase: 01-foundation-and-setup
plan: 04
subsystem: backend-api
tags: [fastapi, settings, certificate, resolution, onboarding, dian]
dependency_graph:
  requires: ["01-02"]
  provides: ["settings-api", "resolution-api", "setup-status-api"]
  affects: ["01-05"]
tech_stack:
  added: ["aiofiles", "cryptography.fernet", "cryptography.hazmat.primitives.serialization.pkcs12"]
  patterns: ["router-per-resource", "upsert-singleton-row", "fernet-encrypted-secrets"]
key_files:
  created:
    - backend/app/routers/settings.py
    - backend/app/routers/resolutions.py
    - backend/app/routers/setup_status.py
    - backend/app/services/certificate.py
  modified:
    - backend/app/main.py
decisions:
  - "Certificate passphrase encrypted with Fernet symmetric key stored in env — not plain text in DB"
  - "PKCS12 validation only checks parse success (private_key + certificate present) — no DIAN validation at upload time"
  - "Business profile uses upsert pattern on id=1 (single-row CheckConstraint)"
  - "DIAN environment has no default — user must explicitly choose (per Pitfall 7 in research)"
  - "Setup status returns structured object with is_complete, steps dict, and missing list for wizard UX"
metrics:
  duration: "~2 minutes"
  completed_date: "2026-03-26T21:11:08Z"
  tasks_completed: 2
  files_created: 4
  files_modified: 1
requirements_satisfied:
  - CONF-01
  - CONF-02
  - CONF-03
  - CONF-04
  - CONF-05
---

# Phase 1 Plan 4: Configuration API Endpoints Summary

**One-liner:** FastAPI settings/resolution/setup-status REST API with PKCS12 validation and Fernet-encrypted passphrase storage.

## What Was Built

All backend REST API endpoints needed by the onboarding wizard (Plan 05):

### Settings Router (`/api/settings`)
- `GET /api/settings` — returns company business profile or 404 if unconfigured
- `PUT /api/settings/profile` — upserts CompanySettings (id=1 singleton) with NIT Module-11 check digit auto-calculation
- `POST /api/settings/certificate` — accepts `.p12` file + passphrase via multipart, validates PKCS12 parse, saves file to cert volume, encrypts passphrase with Fernet
- `PUT /api/settings/environment` — sets `habilitacion` or `produccion` with no default value

### Certificate Service (`app/services/certificate.py`)
- `validate_pkcs12(content, passphrase)` — uses `cryptography.hazmat.primitives.serialization.pkcs12.load_key_and_certificates()`; raises `ValueError` if invalid
- `save_certificate_file(content, storage_path)` — async file write via `aiofiles` to `/app/certs/certificate.p12`
- `encrypt_passphrase(passphrase, fernet_key)` — Fernet symmetric encryption
- `decrypt_passphrase(encrypted, fernet_key)` — Fernet decryption (for use in Phase 3 signing)

### Resolutions Router (`/api/resolutions`)
- `GET /api/resolutions` — list all, ordered by id DESC
- `POST /api/resolutions` — create with `from_number < to_number` validation, sets `current_number = from_number`, `is_active = True`
- `GET /api/resolutions/{id}` — get single resolution or 404
- `PUT /api/resolutions/{id}` — update all fields with same `from < to` validation
- `DELETE /api/resolutions/{id}` — hard delete

### Setup Status Router (`/api/setup/status`)
- `GET /api/setup/status` — returns:
  ```json
  {
    "is_complete": false,
    "steps": {
      "business_profile": true,
      "certificate": false,
      "resolution": false,
      "environment": true
    },
    "missing": ["certificate", "resolution"]
  }
  ```

### main.py Updates
All 4 routers (`auth`, `settings`, `resolutions`, `setup_status`) are wired via `include_router`.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 — Settings router + certificate service | c2ae8b4 | feat(01-04): add settings router and certificate service |
| 2 — Resolution CRUD + setup status + wire | 6731100 | feat(01-04): add resolution CRUD, setup status, wire all routers |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all endpoints are fully wired to the database.

## Self-Check: PASSED

Files verified:
- backend/app/routers/settings.py — FOUND (4 route handlers)
- backend/app/routers/resolutions.py — FOUND (5 route handlers)
- backend/app/routers/setup_status.py — FOUND
- backend/app/services/certificate.py — FOUND (4 functions)
- backend/app/main.py — modified with 3 new include_router calls

Commits verified:
- c2ae8b4 — FOUND
- 6731100 — FOUND
