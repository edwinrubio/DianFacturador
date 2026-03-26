# Project Research Summary

**Project:** dianFacturador — Colombian Electronic Invoicing (Self-Hosted)
**Domain:** DIAN facturación electrónica — persona natural and microempresa
**Researched:** 2026-03-26
**Confidence:** HIGH (regulatory requirements), MEDIUM (XAdES-EPES signature specifics)

---

## Executive Summary

dianFacturador is a self-hosted, open-source Colombian electronic invoicing system targeting the persona natural and microempresa segment — a niche that every existing SaaS player (Alegra, Siigo, Dataico) ignores in favor of monthly subscription revenue. The product must satisfy DIAN's full regulatory pipeline: UBL 2.1 XML generation, XAdES-EPES digital signing, CUFE/CUDE hash calculation, SOAP web service transmission, and PDF graphic representation delivery. This is not a simple CRUD app — it is a compliance pipeline with 6 distinct, sequentially dependent layers. No mature, maintained Python library exists for DIAN integration; the XML generation and signing layers must be built from scratch using lxml and signxml.

The recommended approach is a FastAPI (Python 3.12+) backend with a React 19 + Vite 8 + Tailwind v4 SPA frontend, all orchestrated via docker-compose with nginx as the reverse proxy. The architecture decomposes into clean layers: XML generation, digital signing, DIAN SOAP client, PDF generation, application orchestration, and PostgreSQL storage. Each layer has hard compliance obligations and must be built and validated in strict dependency order — database schema first, CUFE calculation second, XML generation third, signing fourth, DIAN connectivity fifth, PDF and UI last. This ordering is not a preference; it is dictated by the pipeline itself.

The single greatest risk is the XAdES-EPES digital signature layer. DIAN's specific namespace and policy requirements are exacting, and signature failures are invisible until hitting the DIAN web service. The second greatest risk is implementation drift toward the obsolete Anexo Técnico v1.8 — mandatory v1.9 rules (in effect since February 2024) broke backward compatibility in several fields. Both risks are manageable through isolation, extensive unit testing against DIAN's official test fixtures, and treating the signing module as a standalone verified component before integration.

---

## Key Findings

### Recommended Stack

The backend is Python 3.12+ with FastAPI 0.135.x, SQLAlchemy 2.0 (async mode via asyncpg), and Alembic for migrations. For DIAN-specific work: lxml for programmatic UBL 2.1 XML construction (never template-based), signxml 4.4.0 for XAdES-EPES signing, cryptography 44.x for PKCS#12 certificate loading (pyOpenSSL.crypto.load_pkcs12 was removed — do not use it), zeep 4.3.x for SOAP/WS-Security web service communication, and WeasyPrint 68.x for HTML-to-PDF invoice rendering. Authentication is handled by python-jose + passlib bcrypt — a stateless JWT session is sufficient for this single-tenant application.

The frontend is React 19 + Vite 8 + TypeScript 5 + Tailwind CSS v4 + shadcn/ui, with TanStack Query v5 for server state and React Hook Form v7 + Zod for complex invoice form validation. The entire stack ships as a docker-compose file with three services: a FastAPI backend container, an nginx container (serves the Vite static build and proxies /api), and a PostgreSQL 16 container.

**Core technologies:**
- Python 3.12 / FastAPI 0.135.x: async REST API, official recommendation, Pydantic v2 built-in
- SQLAlchemy 2.0.44 + asyncpg + Alembic: async ORM + migrations, only production-grade option
- lxml 5.x: programmatic UBL 2.1 XML construction — enforces well-formedness, no namespace bugs
- signxml 4.4.0: XAdES-EPES signing, actively maintained through 2026
- cryptography 44.x: PKCS#12 certificate loading — use instead of deprecated pyOpenSSL
- zeep 4.3.x: SOAP client with WS-Security BinarySignature, only viable Python SOAP option
- WeasyPrint 68.x: HTML+CSS to PDF, far simpler than ReportLab for invoice layout
- React 19 + Vite 8 + Tailwind v4 + shadcn/ui: standard self-hosted SPA stack, 2025-2026
- Docker + docker-compose + nginx: single-command deployment — the core product differentiator

---

### Expected Features

The regulatory floor is non-negotiable: every document must be UBL 2.1 XML with XAdES-EPES signature, CUFE/CUDE hash, DIAN SOAP transmission, and PDF delivery. These are legal requirements, not product choices. Beyond the floor, the must-have feature set for a usable MVP covers three document types (factura de venta, nota crédito, nota débito), full tax support (IVA 0%/5%/19%, retenciones), catalogs for clients and products, numbering range management with expiry alerts, habilitación test mode, and document history with DIAN status tracking.

**Must have (table stakes — legally required or practically mandatory):**
- Factura de venta electronica (UBL 2.1 + XAdES + CUFE + DIAN transmission)
- Nota crédito and nota débito (with CUDE, referencing original invoice)
- PDF graphic representation with QR code (2 cm minimum, DIAN verification URL)
- Email delivery of signed XML + PDF to buyer
- Digital certificate upload and configuration (.p12 + passphrase)
- Resolución de numeración management (prefix, range, technical key, expiry)
- IVA tax handling (0%, 5%, 19%) + retenciones (retefuente, ReteICA, ReteIVA)
- Client and product/service catalogs
- DIAN habilitación test mode (required before production use)
- Document history with DIAN status (validated, rejected, pending)
- Business profile (NIT, razón social, address, fiscal regime)

**Should have (differentiators):**
- One-command Docker setup — the entire product moat; no competitor offers this
- DIAN rejection error messages translated to plain Spanish (competitors show raw codes)
- Cotización (quote) module with one-click conversion to factura
- Invoice preview before DIAN transmission
- Contingency mode (offline invoice generation + 48-hour retry queue)
- Resend email to buyer
- Document search and filters (date, client, status, amount)
- Customizable PDF template with business logo
- Export to CSV/Excel (accountant-friendly)
- NIT check digit validation + setup onboarding checklist

**Defer (v2+):**
- Bulk product import (CSV/Excel)
- DANE geographic code catalog with searchable dropdowns
- Full contingency mode with queue-and-retry architecture
- Advanced PDF template customization

**Explicit anti-features (do not build):**
- Full accounting module, nómina electrónica, payment processing, POS
- Multi-tenant / multi-NIT support, inventory management with COGS
- Cloud SaaS hosting, mobile native app, AI invoice generation

---

### Architecture Approach

The system is a six-layer compliance pipeline where each layer has a single responsibility and hard input/output contracts. The pipeline is strictly sequential for document processing: Application Layer orchestrates → XML Generation Layer produces unsigned XML → Signing Layer produces signed XML → DIAN Client submits and receives ApplicationResponse → PDF Generation Layer renders the graphic representation → Storage Layer persists everything. The Web UI communicates only with the Application Layer. The Application Layer is the only component that knows the whole pipeline.

**Major components:**
1. **Web UI Layer** — React SPA; renders forms and document lists; communicates exclusively via REST
2. **Application Layer** — FastAPI orchestrator; owns the invoice lifecycle state machine (DRAFT → XML_GENERATED → SIGNED → SENT → VALIDATED/REJECTED); calculates CUFE/CUDE; assigns numbering
3. **XML Generation Layer** — lxml; produces UBL 2.1 Invoice/CreditNote/DebitNote XML from typed data objects; validates against DIAN XSD before passing downstream
4. **Signing Layer** — signxml + cryptography; applies XAdES-EPES enveloped signature using user's PKCS#12 cert; isolated module with no knowledge of DIAN endpoints
5. **DIAN Client Layer** — zeep SOAP client; sends signed ZIP to SendBillSync; handles ApplicationResponse parsing; manages habilitación vs production endpoints
6. **PDF Generation Layer** — WeasyPrint + Jinja2; renders HTML invoice template to PDF with QR code encoding DIAN verification URL; runs after DIAN acceptance only
7. **Storage Layer** — PostgreSQL 16; single schema, single tenant; stores documents, items, parties, numbering ranges, events, and file paths

**Key data model decisions:**
- Document status enum: DRAFT, XML_GENERATED, SIGNED, SENT, VALIDATED, REJECTED, ERROR, CANCELLED
- Private key / PKCS#12 file stored on filesystem (Docker volume), not in the database
- PDF is generated and emailed only after DIAN returns ResponseCode "00" — never before
- Submitted documents are immutable; corrections go through CreditNote/DebitNote

---

### Critical Pitfalls

1. **CUFE formula errors (FAD06)** — Use SHA-384 (not SHA-256), exact field concatenation order per Anexo v1.9, dot decimal separators, raw numeric strings. Write unit tests against DIAN's published test vectors before touching XML generation. This must be correct before any other DIAN work begins.

2. **XAdES-EPES signature non-compliance (ZE02)** — Serialize the complete XML to stable UTF-8 bytes ONCE before signing; never modify DOM after signature. Use Canonical XML 1.0 (C14N), not exclusive C14N. Include full certificate chain in KeyInfo. Validate the signature in isolation before integrating with DIAN SOAP calls. This is the highest-risk component in the system.

3. **Anexo Técnico v1.9 version drift** — All online tutorials, open-source projects, and Stack Overflow answers reference v1.7 or v1.8. v1.9 is mandatory since February 2024 with breaking changes: generation date must equal signature date (no window), PaymentMeans is mandatory for all transactions, RoundingAmount in TaxTotal is no longer processed. Pin explicitly to v1.9; audit every external reference.

4. **UBL structure deviations (FAD01/FAD03/FAD04/FAC03)** — Colombia's UBL profile includes mandatory DianExtensions, InvoiceControl, and InvoiceSource blocks inside UBLExtensions. Namespace declaration order matters for canonicalization. Build the XML serializer from DIAN's XSD schemas and official Caja de Herramientas example files — not from generic UBL libraries.

5. **Numbering range violations (FAB05/FAB07/FAB08/FAB10)** — Store the full authorization record (prefix, range, dates, TechnicalKey) in the database. Implement expiry alerts at 15 business days before end date. CUFE uses the TechnicalKey from the active range — wrong key produces wrong CUFE and wastes the consecutive number.

6. **Decimal arithmetic precision** — Use Python's `Decimal` type for all monetary values, never `float`. Apply NTC 3711 banker's rounding (round-half-to-even). Floating-point rounding errors across line items cause FAU14/FAX07/FAV06 systematic rejections.

7. **Habilitación/production environment mix-up** — Keep the two environments (habilitación: vpfe-hab.dian.gov.co, production: vpfe.dian.gov.co) as named first-class configuration items. ProfileExecutionID must be 2 (test) for habilitación and 1 (production) for production. The software must pass a minimum test set (2 facturas + 1 nota crédito + 1 nota débito) before DIAN enables production access.

---

## Implications for Roadmap

The architecture's strict pipeline dependency order directly dictates build sequence. There is no shortcut: CUFE cannot be calculated without a schema, XML cannot be built without a correct CUFE, XML cannot be signed without being fully formed, DIAN cannot receive a document without a valid signature. Each phase gates the next.

### Phase 1: Project Foundation and Configuration

**Rationale:** Everything reads from or writes to the database. Company config (NIT, regime), numbering ranges (prefix, TechnicalKey, expiry), and certificate location must exist before any invoice can be generated. This phase also establishes the docker-compose stack, project scaffolding, and CI baseline.

**Delivers:** Docker-compose with FastAPI + PostgreSQL + nginx; Alembic migrations for all core tables; company profile API and UI; numbering range management with expiry alerts; certificate file upload and encrypted storage; NIT check digit validation; environment (habilitación vs producción) configuration screen.

**Addresses:** Business profile, digital certificate configuration, resolución de numeración management, setup onboarding checklist

**Avoids:** Pitfall 5 (numbering violations), Pitfall 11 (NIT/RUT issues), environment mix-up (Pitfall 8)

**Research flag:** Standard patterns — docker-compose, SQLAlchemy, FastAPI setup is well-documented. No phase research needed.

---

### Phase 2: Client and Product Catalogs

**Rationale:** Every invoice requires buyer identification (NIT/CC, name, address, email) and line items (product/service descriptions, prices, tax codes). Catalogs must exist before invoice creation is possible. This phase also implements DANE geographic code lookup to prevent FAK28/FAK29 rejections.

**Delivers:** Clients (third parties) CRUD with DANE department/municipality dropdowns; products/services catalog with tax configuration (IVA rates, retención codes); basic React UI for both catalogs.

**Addresses:** Client catalog, product/service catalog, tax handling (IVA), geographic code correctness

**Avoids:** Pitfall 13 (DANE geographic code rejections), Pitfall 6 (tax config must be correct at data entry)

**Research flag:** Standard CRUD patterns. DANE code table needs to be bundled (static dataset). No deep research needed.

---

### Phase 3: Invoice Data Model and CUFE Calculation

**Rationale:** The CUFE formula is the mathematical core of the entire compliance pipeline. It must be implemented and unit-tested in complete isolation before XML generation begins. Getting it wrong causes systematic FAD06 rejections and is harder to diagnose once embedded in the XML pipeline. This phase defines the typed invoice data model that all downstream layers consume.

**Delivers:** Invoice/CreditNote/DebitNote entity models with full field mapping to Anexo v1.9; CUFE and CUDE calculation functions using SHA-384 with parameterized unit tests against DIAN test vectors; numbering assignment logic; Decimal-based monetary arithmetic with NTC 3711 rounding; invoice lifecycle state machine.

**Addresses:** CUFE generation, CUDE generation, IVA + retención calculation, document status tracking

**Avoids:** Pitfall 1 (CUFE errors), Pitfall 6 (decimal/rounding), Pitfall 4 (v1.9 version compliance)

**Research flag:** Needs phase research for exact CUFE test vectors and NTC 3711 rounding specification. DIAN Anexo v1.9 section on CUFE must be read carefully.

---

### Phase 4: UBL 2.1 XML Generation

**Rationale:** With a validated data model and correct CUFE, build the XML serializer. This layer has no dependencies on signing or DIAN connectivity — it can be fully tested offline against DIAN's published XSD schemas and Caja de Herramientas example files. Clean XML generation is the prerequisite for signing.

**Delivers:** lxml-based Invoice XML generator; CreditNote and DebitNote generators; DianExtensions / InvoiceControl / UBLExtensions block construction; XSD schema validation in tests; namespace order matching DIAN examples; offline test harness comparing output to official sample documents.

**Addresses:** Factura de venta XML, nota crédito XML, nota débito XML

**Avoids:** Pitfall 3 (UBL structure deviations), Pitfall 4 (v1.9 compliance), Pitfall 2 (must produce stable XML before signing layer receives it)

**Research flag:** Needs phase research for DIAN's Caja de Herramientas XSD files and example XML documents. The specific DianExtensions structure needs verification against official samples.

---

### Phase 5: Digital Signature (XAdES-EPES)

**Rationale:** The highest-risk component. Implement as a completely isolated module. The signing layer receives unsigned XML bytes and returns signed XML bytes — it has no knowledge of DIAN services. This isolation makes failures attributable. Do not attempt DIAN connectivity until signatures verify locally.

**Delivers:** PKCS#12 certificate loading via `cryptography` library; XAdES-EPES enveloped signer using signxml; C14N (not exclusive C14N) canonicalization; signature policy reference embedding; signature self-verification test; integration test with known certificate and known XML fixture.

**Addresses:** XAdES digital signature, digital certificate configuration (runtime use)

**Avoids:** Pitfall 2 (XAdES-EPES non-compliance), specifically: serialize-before-sign rule, correct canonicalization, certificate chain in KeyInfo

**Research flag:** Needs phase research. Whether signxml's XAdES-EPES output satisfies DIAN's exact namespace and policy requirements needs implementation-phase validation. May require falling back to lxml + cryptography direct implementation if signxml's output does not match DIAN's expected format.

---

### Phase 6: DIAN SOAP Client and Habilitación

**Rationale:** With signed XML available, integrate the DIAN SOAP layer. This phase gates production readiness — DIAN will not accept production invoices until habilitación (the official 10-document test set) is completed. Build habilitación as a first-class feature, not an afterthought. Complete the official enablement process before declaring this phase done.

**Delivers:** zeep-based SOAP client for SendBillSync, GetNumberingRange, GetStatus, SendTestSetAsync; ZIP packaging per DIAN naming convention; WS-Security BinarySignature authentication; ApplicationResponse parsing (ResponseCode "00" = accepted, else rejected); human-readable DIAN error translation; habilitación test mode in UI; environment-aware endpoint configuration (never a default); in-app onboarding checklist for habilitación prerequisites.

**Addresses:** DIAN web service transmission, DIAN response parsing, habilitación test mode, SoftwareID registration

**Avoids:** Pitfall 7 (WS-Security envelope errors), Pitfall 8 (environment mix-up), Pitfall 5 (numbering range verification via GetNumberingRange)

**Research flag:** Needs phase research for SoftwareSecurityCode calculation (SHA-1(SoftwareID + PIN + InvoiceNumber) concatenation order) and production endpoint assignment process post-habilitación. Verify DIAN portal prerequisites (reception email, software registration) before coding.

---

### Phase 7: PDF Generation and Email Delivery

**Rationale:** PDF generation has no dependency on the DIAN SOAP layer — it reads from the invoice data model. It is placed here because it is not blocking for DIAN validation, and by this phase the backend pipeline is fully proven. PDF must only be generated and sent after DIAN ResponseCode "00" to avoid delivering legally void documents.

**Delivers:** Jinja2 HTML invoice template with CSS print styles; WeasyPrint HTML-to-PDF renderer; QR code generation encoding DIAN verification URL + CUFE; SMTP integration for XML + PDF email delivery to buyer; file storage for signed XML and PDF; download endpoints in UI; resend email feature.

**Addresses:** PDF + QR generation, email delivery, XML download, customizable logo/header

**Avoids:** Pitfall anti-pattern (never send PDF before DIAN validation)

**Research flag:** Standard patterns. WeasyPrint setup with Docker system libraries (Pango, cairo) is documented. QR code library selection (qrcode or segno) is trivial. No deep research needed.

---

### Phase 8: Document Management UI and Remaining Features

**Rationale:** By this phase all backend services are tested and stable. Build the full user-facing interface with confidence that the underlying shapes are correct.

**Delivers:** Invoice creation form with line item management; document list with status badges and search/filters; credit note and debit note creation flows (pre-filled from original invoice); cotización (quote) module with convert-to-invoice action; export to CSV/Excel; document history with full DIAN event audit trail.

**Addresses:** Document history, nota crédito/débito linked to original, cotización → factura conversion, document search/filters, CSV export

**Avoids:** Pitfall 9 (credit/debit note reference errors — store original CUFE with every note)

**Research flag:** Standard patterns for React + TanStack Query + React Hook Form. No phase research needed.

---

### Phase 9: Resilience and Quality of Life

**Rationale:** Contingency mode (offline invoice generation + 48-hour DIAN retry queue) is a differentiator but not blocking for MVP. Ship it after the core pipeline is validated in production.

**Delivers:** Contingency mode (Type 4) — generate and sign invoice offline, deliver to buyer, queue for DIAN transmission on connectivity restore; retry logic (5 attempts at 2-minute intervals before declaring contingency); expiration warnings for numbering range (15-day threshold); XML size pre-check (warn at 450 KB, hard 500 KB DIAN limit); DANE geographic code catalog with dropdown UI.

**Addresses:** Contingency handling, numbering expiry alerts, XML file size (ZA01 pitfall), geographic codes

**Avoids:** Pitfall 14 (no offline fallback), Pitfall 10 (XML size limit), Pitfall 13 (DANE codes)

**Research flag:** Contingency mode architecture (queue and retry) may need research if pgboss or a similar Postgres-native queue is chosen. Otherwise, a simple polling loop is sufficient for the target volume.

---

### Phase Ordering Rationale

The dependency chain is non-negotiable: configuration data feeds CUFE calculation, correct CUFE feeds XML generation, valid XML feeds signing, signed XML feeds DIAN submission, DIAN acceptance feeds PDF delivery. Any phase that skips ahead creates debugging impossibility — is the XML wrong, the signature wrong, or the SOAP envelope wrong? Clean separation per phase makes failures attributable to exactly one layer.

Habilitación (Phase 6) gates production access. It must be completed — with all document types (2 invoices, 1 credit note, 1 debit note) — before the product is usable in production. The architecture must enforce the habilitación/production separation from day one, not as a retrofit.

---

### Research Flags Summary

| Phase | Research Needed | Reason |
|-------|----------------|--------|
| Phase 3 | YES | CUFE test vectors, NTC 3711 rounding spec, exact v1.9 field rules |
| Phase 4 | YES | DIAN Caja de Herramientas XSD + example XMLs, DianExtensions structure |
| Phase 5 | YES (HIGH PRIORITY) | signxml XAdES-EPES DIAN compliance validation; may need custom implementation |
| Phase 6 | YES | SoftwareSecurityCode formula, post-habilitación endpoint assignment, DIAN portal prerequisites |
| Phase 1 | No | Standard docker-compose + FastAPI + PostgreSQL setup |
| Phase 2 | No | Standard CRUD; DANE codes are a static dataset |
| Phase 7 | No | WeasyPrint + SMTP patterns are well-documented |
| Phase 8 | No | Standard React SPA patterns |
| Phase 9 | Possibly | pgboss/queue if contingency retry needs a proper queue |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official releases verified for all core libraries (FastAPI 0.135.2, SQLAlchemy 2.0.44, signxml 4.4.0, WeasyPrint 68.1, React 19, Vite 8). pyOpenSSL deprecation confirmed. |
| Features | HIGH | Regulatory requirements sourced directly from DIAN Resolución 165/2023 and Anexo v1.9. Competitor pricing from official vendor sites. |
| Architecture | HIGH | Six-layer decomposition validated by DIAN's own technical documentation and multiple open-source implementation analyses. Pipeline order is logically forced. |
| Pitfalls | HIGH | Rejection codes and root causes sourced from DIAN official docs, TheFactoryHKA wiki (authoritative integrator), and developer issue trackers with confirmed DIAN rejections. |

**Overall confidence:** HIGH for what to build and in what order. MEDIUM for exactly how to configure signxml for DIAN XAdES-EPES compliance — this is the one area that requires empirical validation during implementation.

### Gaps to Address

- **signxml XAdES-EPES DIAN profile:** Whether signxml 4.4.0 produces output that satisfies DIAN's exact namespace, canonicalization, and signature policy requirements is unverified. A fallback plan — implementing the XAdES-EPES envelope directly with lxml + cryptography — should be scoped in Phase 5. Do not assume signxml works until validated against the habilitación endpoint.

- **Production DIAN endpoint URL:** The production SOAP endpoint is not a universally hardcoded URL — it is assigned per participant from DIAN's Participant Catalog after habilitación completion. The application architecture must account for this: the endpoint URL is stored in configuration, populated after Phase 6 completes.

- **SoftwareSecurityCode concatenation order:** Confirmed as SHA-1(SoftwareID + PIN + InvoiceNumber) but the exact delimiter and encoding needs verification against official DIAN documentation during Phase 6 research.

- **Habilitación test set exact requirements:** Community sources say 2 facturas + 1 nota crédito + 1 nota débito minimum. This should be confirmed against official DIAN process documentation before building the habilitación flow.

---

## Sources

### Primary (HIGH confidence — official DIAN documentation)
- DIAN Anexo Técnico Factura Electrónica v1.9: https://www.dian.gov.co/impuestos/factura-electronica/Documents/Anexo-Tecnico-Factura-Electronica-de-Venta-vr-1-9.pdf
- DIAN Resolución 000165 de 2023: https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0165_2023.htm
- DIAN Guía Web Services: https://www.dian.gov.co/impuestos/factura-electronica/Documents/Guia-Herramienta-para-el-Consumo-de-Web-Services.pdf
- DIAN Habilitación Process: https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/proceso-de-registro-y-habilitacion-como-facturador-electronico/
- DIAN Contingency Documentation: https://www.dian.gov.co/impuestos/factura-electronica/Documents/Contingencia_FE_T3_T4.PDF

### Secondary (HIGH confidence — authoritative integrator and library docs)
- TheFactoryHKA Wiki (rejection rules, integration FAQ, Anexo v1.9 changes): https://felcowiki.thefactoryhka.com.co/
- signxml GitHub changelog (v4.4.0, March 2026): https://github.com/XML-Security/signxml/blob/main/Changes.rst
- FastAPI release notes (0.135.2): https://fastapi.tiangolo.com/release-notes/
- SQLAlchemy 2.0.44 blog: https://www.sqlalchemy.org/blog/2025/10/10/sqlalchemy-2.0.44-released/
- WeasyPrint GitHub releases (68.1, Feb 2026): https://github.com/Kozea/WeasyPrint/releases
- zeep WS-Security docs: https://docs.python-zeep.org/en/master/wsse.html
- pyca/cryptography PKCS12 docs: https://cryptography.io/en/latest/
- shadcn/ui Tailwind v4 docs: https://ui.shadcn.com/docs/tailwind-v4

### Secondary (MEDIUM confidence — community and vendor sources)
- Alegra Colombia pricing: https://www.alegra.com/colombia/facturacion-electronica/precios/
- Dataico 2026 guide: https://www.dataico.com/2026/02/25/guia-factura-electronica-colombia-dian/
- DIAN rejection codes (aliaddo): https://factura-electronica.aliaddo.dev/errores-y-rechazos/codigos-de-rechazo-y-advertencia-de-la-dian/factura-dian
- xades4j DIAN issue thread: https://github.com/luisgoncalves/xades4j/issues/134
- FastAPI Full Stack Template: https://github.com/fastapi/full-stack-fastapi-template

### Tertiary (context — abandoned projects confirmed unusable)
- soenac/api-dian (archived June 2023): https://github.com/soenac/api-dian
- bit4bit/facho (last commit Oct 2022): https://github.com/bit4bit/facho
- Crispancho93/facturacion-electronica-colombia (incomplete, no XAdES): https://github.com/Crispancho93/facturacion-electronica-colombia

---

*Research completed: 2026-03-26*
*Ready for roadmap: yes*
