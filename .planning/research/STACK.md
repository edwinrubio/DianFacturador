# Technology Stack

**Project:** DIAN Facturador — Colombian Electronic Invoicing
**Researched:** 2026-03-26
**Domain:** DIAN electronic invoicing (facturación electrónica), Colombia

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Python | 3.12+ | Runtime | FastAPI officially recommends 3.12/3.13 for new projects in 2026. Mature ecosystem for XML processing, cryptography, and SOAP. |
| FastAPI | 0.135.x | REST API backend | Current standard for Python APIs. Async-native, Pydantic v2 built-in, excellent OpenAPI docs auto-generation. Actively maintained (0.135.2 released March 2026). |
| Pydantic | v2 | Data validation | Ships with FastAPI. v2 has Rust-powered core for ~10x validation performance. Required for request/response schemas. |
| Uvicorn | latest | ASGI server | The standard ASGI server for FastAPI. Use `uvicorn[standard]` for production (includes uvloop + httptools). |

**Confidence: HIGH** — FastAPI+Pydantic v2+Uvicorn is the consensus Python backend stack in 2025-2026, confirmed by official FastAPI template and docs.

---

### Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| PostgreSQL | 16+ | Primary data store | Already chosen by project owner. Correct choice for transactional financial data: ACID guarantees, mature, free. |
| SQLAlchemy | 2.0.x (stable) | ORM + query builder | SQLAlchemy 2.0 is the current stable series (2.0.44, Oct 2025). Version 2.1.0b1 is in beta — use 2.0.x for production. Full async support via `create_async_engine`. |
| asyncpg | latest | Async PostgreSQL driver | Required for SQLAlchemy async mode. Fastest Python PostgreSQL driver. |
| Alembic | latest | Database migrations | The only serious migration tool for SQLAlchemy. Run `alembic upgrade head` on container start to auto-migrate. Never use `Base.metadata.create_all()` in production. |

**Confidence: HIGH** — SQLAlchemy 2.0 + asyncpg + Alembic is the recommended combination in official FastAPI template and all 2024-2025 production guides.

---

### Frontend

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React | 19.x | UI framework | Current stable version (released Dec 2024). Self-hosted SPA fits this project perfectly — no SSR needed for an internal invoicing app. |
| Vite | 8.x | Build tool + dev server | Current standard for React SPAs in 2026 (v8.0.x as of March 2026). Much faster than webpack/CRA. No Babel needed for React Refresh in v8+. |
| TypeScript | 5.x | Type safety | Non-negotiable for maintainability in financial software. Catches errors early. |
| Tailwind CSS | 4.x | Styling | v4 is production-ready as of January 2025. CSS-first config (no tailwind.config.js), Rust-based Oxide engine. Use for all utility classes. |
| shadcn/ui | latest | UI component library | Not a package — vendored components built on Radix UI. Full Tailwind v4 + React 19 support. Provides accessible form components, tables, dialogs critical for an invoice form UI. |
| TanStack Query | v5 | Server state management | Standard for data fetching in React 2025. Handles caching, loading states, and refetching for invoice list/detail views. |
| React Hook Form | v7 | Form state management | Best-in-class performance for complex forms (invoice line items). Minimal re-renders. Integrates with Zod for schema validation. |
| Zod | v3 | Frontend validation schema | Pairs with React Hook Form. Defines invoice field validation rules. Share schemas between frontend validation and API communication. |

**Confidence: HIGH** — React + Vite + Tailwind v4 + shadcn/ui is the dominant 2025-2026 stack for internal tool dashboards. Confirmed by multiple sources including shadcn/ui official docs.

---

### DIAN-Specific: UBL 2.1 XML Generation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| lxml | 5.x | XML document construction | The gold standard for XML in Python. Fast libxml2/libxslt bindings. Use `lxml.etree` to programmatically build UBL 2.1 XML trees with proper namespaces. Better than Jinja2 templates for XML because it enforces well-formedness and handles namespace prefixes correctly. |
| Jinja2 | 3.x | PDF HTML templates | Use for invoice PDF HTML templates ONLY — not for XML generation. XML via templates is fragile (escaping bugs, namespace errors). |

**Recommendation for UBL XML:** Build XML programmatically using `lxml.etree.Element` and `lxml.etree.SubElement`, not from string templates. This prevents namespace corruption, character escaping bugs, and ensures the output is always well-formed XML before signing.

**Why not use existing DIAN libraries:**
- `soenac/api-dian` (PHP/Laravel, **archived June 2023**) — abandoned, PHP-only
- `bit4bit/facho` (Python, last commit Oct 2022, 11 stars) — dead, incomplete
- `django-dian` (Python/Django, last commit Nov 2019, 8 stars) — dead
- `Crispancho93/facturacion-electronica-colombia` (Python/FastAPI, Jan 2025, 8 stars) — too early stage, no XAdES

**Conclusion:** No mature, maintained, DIAN-compliant Python library exists. Build the XML generation layer from scratch with lxml. This is the correct approach — the DIAN Anexo Tecnico v1.9 XML structure is well-documented and not excessively complex.

**Confidence: MEDIUM** — lxml recommendation is HIGH confidence. The decision to build vs use a library is MEDIUM confidence (based on lack of viable alternatives found after thorough search, but the Colombian Python/DIAN ecosystem has limited visibility).

---

### DIAN-Specific: Digital Signature (XAdES-EPES)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| signxml | 4.4.0 | XML digital signature (XAdES) | Latest release March 1, 2026. Python XML Signature + XAdES library. Actively maintained through 2026. Supports XAdES properties. Used for XMLDSig enveloped signatures as required by DIAN. |
| cryptography | 44.x+ | PKCS12 / certificate loading | The official Python Cryptography Authority (PyCA) library. **Use this instead of pyOpenSSL** — pyOpenSSL.crypto.load_pkcs12 was removed after deprecation. `cryptography` provides `pkcs12.load_key_and_certificates()` to load the user's `.p12` certificate file. |

**DIAN signature requirements (verified from official sources):**
- Format: XAdES-EPES (enveloped signature embedded in the XML document)
- Standard: ETSI TS 101 903, versions 1.2.2, 1.3.2, 1.4.1
- Algorithm: RSA-SHA256 for the signature, SHA384 for CUFE hash
- Certificate: X.509 issued by ONAC-authorized certification entity (e.g., Certicámara, GSE)
- The digital certificate is user-supplied — the software must accept a `.p12` / `.pfx` file + password

**Important caveat:** signxml's XAdES support was added in v3.0.0 (2022) and improved through v4.4.0. DIAN's XAdES-EPES profile has specific namespace and policy requirements. Phase research will be needed to verify exact signxml configuration for DIAN compliance vs writing a custom enveloped signer using lxml + cryptography directly.

**Confidence: MEDIUM** — signxml is the best available Python XAdES library (verified, actively maintained). Whether its XAdES-EPES output satisfies DIAN's exact namespace/policy requirements needs validation during implementation. Flag for phase-specific deep research.

---

### DIAN-Specific: SOAP Web Service Communication

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| zeep | 4.3.x | SOAP client | The only actively maintained Python SOAP client. Supports WS-Security `BinarySignature` (X.509 certificate embedded in SOAP header), which is exactly what DIAN requires. |

**DIAN web service endpoints (confirmed):**
- Habilitación (testing): `https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc?wsdl`
- Producción: `https://vpfe.dian.gov.co/WcfDianCustomerServices.svc?wsdl`

**Authentication method:** WS-Security BinarySecurityToken (X.509 certificate). Use `zeep.wsse.BinarySignature(key_file, cert_file)`.

**Operations exposed by DIAN web service:**
- `SendBillSync` — send XML invoice for prior validation
- `SendNominaSync` — (out of scope, nómina)
- `GetStatusZip` — check processing status of a batch
- `GetStatus` — query status by CUFE/CUDE

**Why not suds:** Development stalled years ago on the original project. Suds-jurko fork gives Python 3 support but is barely maintained.

**Confidence: MEDIUM-HIGH** — zeep WS-Security BinarySignature is confirmed by its documentation. DIAN endpoint URLs are confirmed by community sources (l10n_co_e-invoice Odoo module, SOENAC documentation). Verify endpoint URLs against official DIAN technical guide before implementation.

---

### PDF Generation (Representación Gráfica)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| WeasyPrint | 68.1 | HTML+CSS to PDF | Latest release February 6, 2026. Converts Jinja2-rendered HTML invoice templates to PDF. This is the right approach: design invoice layout in HTML/CSS (familiar, flexible), then convert to PDF. Far simpler than ReportLab's programmatic approach. |
| Jinja2 | 3.x | Invoice HTML template | Already a FastAPI dependency. Define `plantilla_factura.html` with CSS print styles. |

**Note:** WeasyPrint requires system libraries (Pango, cairo, GDK). Must be included in Docker image. See: `apt-get install -y weasyprint` or install Python package with system deps pre-installed.

**Confidence: HIGH** — WeasyPrint 68.x is actively maintained (2026) and is the clear winner for HTML-to-PDF invoice generation in Python.

---

### Authentication & Security

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| python-jose[cryptography] | 3.x | JWT token creation/validation | Standard FastAPI JWT library. Used for session tokens protecting the web UI. Single-tenant app — simple JWT auth is sufficient. |
| passlib[bcrypt] | 1.x | Password hashing | Industry-standard bcrypt hashing. Required for the admin user login. |
| python-dotenv | latest | Environment config | Load `.env` file for secrets (DB URL, JWT secret). Works with Pydantic Settings. |

**Note:** This is a single-tenant self-hosted app. One user (the business owner). A simple username/password login protecting all routes is sufficient. No OAuth2, no multi-user management needed in MVP.

**Confidence: HIGH** — python-jose + passlib is the FastAPI tutorial's own recommended combination, widely adopted.

---

### Infrastructure & DevOps

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Docker | latest | Container runtime | Required by PROJECT.md. |
| docker-compose | v3.x | Multi-container orchestration | `docker-compose up` as the primary install path. Define `backend`, `frontend` (nginx serving static build), and `postgres` services. |
| nginx | alpine | Frontend static server + reverse proxy | Serve Vite's `dist/` build. Proxy `/api` to the FastAPI backend. All on one compose file. Single port (80/443) exposed to user. |
| pytest + httpx | latest | Backend testing | pytest is the Python standard. httpx is the async HTTP client required for testing FastAPI with `AsyncClient`. |
| pytest-asyncio | latest | Async test support | Required when testing async FastAPI endpoints. |

**Confidence: HIGH** — nginx + docker-compose for self-hosted SPA+API is the proven deployment pattern. FastAPI + pytest + httpx is officially recommended.

---

## Alternatives Considered and Rejected

| Category | Recommended | Alternative Rejected | Why Rejected |
|----------|-------------|---------------------|--------------|
| Backend language | Python | PHP | PHP is the dominant language in existing DIAN libraries, but those libraries are abandoned. Python has better async support, better cryptography libraries, and better long-term maintainability for open source. The project constraint says backend is flexible. |
| Backend language | Python | Node.js/TypeScript | No DIAN-specific TypeScript library exists at all. The XAdES ecosystem in JS (xadesjs) is significantly less mature than Python's signxml. Node.js SOAP (node-soap) is less battle-tested for WS-Security than zeep. |
| Frontend framework | React + Vite | Next.js | This is a self-hosted SPA with a separate FastAPI backend. Next.js adds SSR complexity and works best on Vercel. For a self-hosted app with a Python API, a plain React SPA served by nginx is simpler, faster to build, and easier to deploy via docker-compose. |
| ORM | SQLAlchemy | Tortoise ORM / SQLModel | SQLModel (SQLAlchemy + Pydantic wrapper) is tempting but introduces an abstraction layer over SQLAlchemy that can hide behavior. SQLAlchemy 2.0 directly is better for complex financial queries and migrations. Tortoise ORM is less mature. |
| SOAP client | zeep | httpx (manual SOAP) | Manual SOAP construction with raw XML is error-prone, especially with WS-Security. zeep handles WSDL parsing, type coercion, and WS-Security plugin architecture correctly. |
| XML signature | signxml | xades4j (Java) | Java would require a sidecar service, adding deployment complexity. signxml is a native Python library maintained through 2026. |
| PDF | WeasyPrint | ReportLab | ReportLab requires programmatic layout (canvas-based), essentially re-implementing CSS layout in Python. WeasyPrint takes an HTML/CSS template and renders it — much faster to develop and easier to maintain. |
| XML generation | lxml (programmatic) | Jinja2 XML templates | Template-based XML generation is fragile: manual XML escaping of values (names with &, accents, special chars), namespace prefix drift across templates, no structural validation before signing. lxml enforces well-formedness. |
| Migration | Alembic | Django migrations | Django is not in the stack. Alembic is the standard migration tool for SQLAlchemy. |
| Auth | python-jose JWT | Full OAuth2 / Keycloak | Single-tenant app. One user. A stateless JWT session token is all that's needed. OAuth2 is overkill and adds deployment complexity. |

---

## Installation Reference

```bash
# Backend dependencies
pip install fastapi==0.135.2 \
            uvicorn[standard] \
            sqlalchemy==2.0.44 \
            asyncpg \
            alembic \
            pydantic[email] \
            python-jose[cryptography] \
            passlib[bcrypt] \
            python-dotenv \
            lxml \
            signxml \
            cryptography \
            zeep \
            weasyprint \
            jinja2 \
            httpx

# Dev dependencies
pip install pytest pytest-asyncio httpx

# System dependencies (in Dockerfile / docker image)
# RUN apt-get install -y libpango-1.0-0 libcairo2 libgdk-pixbuf2.0-0
# (Required by WeasyPrint)
```

```bash
# Frontend dependencies
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install \
  @tanstack/react-query \
  react-hook-form \
  zod \
  @hookform/resolvers \
  axios

# shadcn/ui (CLI-installed — components are vendored into src/)
npx shadcn@latest init

# Dev dependencies
npm install -D tailwindcss @tailwindcss/vite typescript
```

---

## Key Version Summary

| Component | Version | Confirmed Via |
|-----------|---------|--------------|
| FastAPI | 0.135.2 | WebSearch + PyPI (March 2026) |
| SQLAlchemy | 2.0.44 (stable) | Official SQLAlchemy blog (Oct 2025) |
| signxml | 4.4.0 | GitHub changelog (March 2026) |
| WeasyPrint | 68.1 | GitHub releases (Feb 2026) |
| React | 19.0 | React blog (Dec 2024) |
| Vite | 8.x | npm + WebSearch (March 2026) |
| Tailwind CSS | 4.x | Official announcement (Jan 2025) |
| shadcn/ui | latest (supports Tailwind v4 + React 19) | Official docs |
| Python | 3.12+ | FastAPI recommendation (2026) |
| PostgreSQL | 16+ | Project constraint |

---

## DIAN Technical Requirements Confirmed

| Requirement | Value | Source |
|-------------|-------|--------|
| XML standard | UBL 2.1 | Resolución 000165/2023, Anexo Técnico v1.9 |
| Signature format | XAdES-EPES (enveloped) | ETSI TS 101 903 v1.2.2-1.4.1 |
| CUFE algorithm | SHA-384 | DIAN Anexo Técnico v1.9 |
| Web service protocol | SOAP + WS-Security (BinarySecurityToken) | DIAN Guía Web Services |
| Testing endpoint | `https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc?wsdl` | Community-confirmed |
| Production endpoint | `https://vpfe.dian.gov.co/WcfDianCustomerServices.svc?wsdl` | Community-confirmed |
| Document types in scope | Invoice (FC), CreditNote (NC), DebitNote (ND) | Resolución 000165/2023 |
| Current annex version | 1.9 (mandatory since Feb 1, 2024) | Resolución 000165/2023 |

---

## Confidence Assessment by Area

| Area | Confidence | Reason |
|------|------------|--------|
| Core backend (FastAPI, SQLAlchemy, PostgreSQL) | HIGH | Official docs, actively maintained 2026 |
| Frontend (React, Vite, shadcn/ui) | HIGH | Official releases, community consensus |
| UBL XML generation (lxml) | HIGH | lxml is the definitive Python XML library |
| DIAN regulatory requirements | HIGH | Official DIAN documentation, resolution text |
| XAdES-EPES signature (signxml) | MEDIUM | Library is maintained; DIAN-specific profile needs implementation-phase validation |
| SOAP/DIAN web service (zeep) | MEDIUM-HIGH | zeep WS-Security confirmed; endpoint URLs from community sources, not official PDF |
| CUFE/CUDE generation | HIGH | SHA-384 requirement confirmed by multiple sources |

---

## Sources

- [DIAN Documentación Técnica](https://www.dian.gov.co/impuestos/factura-electronica/documentacion/Paginas/documentacion-tecnica.aspx)
- [Anexo Técnico Factura Electrónica v1.9 (PDF)](https://www.dian.gov.co/impuestos/factura-electronica/Documents/Anexo-Tecnico-Factura-Electronica-de-Venta-vr-1-9.pdf)
- [Resolución 000165 de 2023 — DIAN](https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0165_2023.htm)
- [signxml GitHub — Changes.rst](https://github.com/XML-Security/signxml/blob/main/Changes.rst)
- [FastAPI release notes](https://fastapi.tiangolo.com/release-notes/)
- [SQLAlchemy 2.0.44 blog post](https://www.sqlalchemy.org/blog/2025/10/10/sqlalchemy-2.0.44-released/)
- [WeasyPrint GitHub releases](https://github.com/Kozea/WeasyPrint/releases)
- [shadcn/ui Tailwind v4 docs](https://ui.shadcn.com/docs/tailwind-v4)
- [zeep WS-Security docs](https://docs.python-zeep.org/en/master/wsse.html)
- [soenac/api-dian GitHub (archived)](https://github.com/soenac/api-dian)
- [Crispancho93/facturacion-electronica-colombia](https://github.com/Crispancho93/facturacion-electronica-colombia)
- [DIAN Guía Web Services (PDF)](https://www.dian.gov.co/impuestos/factura-electronica/Documents/Guia-Herramienta-para-el-Consumo-de-Web-Services.pdf)
- [FastAPI Full Stack Template](https://github.com/fastapi/full-stack-fastapi-template)
- [Setup FastAPI + Async SQLAlchemy 2 + Alembic + PostgreSQL + Docker](https://berkkaraal.com/blog/2024/09/19/setup-fastapi-project-with-async-sqlalchemy-2-alembic-postgresql-and-docker/)
- [pyca/cryptography PKCS12](https://cryptography.io/en/latest/)
