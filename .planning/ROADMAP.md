# Roadmap: DIAN Facturador

## Overview

DIAN Facturador is built in four phases that follow the natural dependency order of a compliance pipeline. The foundation (infrastructure and business configuration) must exist before data catalogs can be populated, and those catalogs must exist before invoices can be created. The compliance pipeline — CUFE calculation, UBL 2.1 XML generation, XAdES-EPES digital signing, and DIAN SOAP transmission — is delivered as one coherent phase because each layer is a direct prerequisite of the next. The final phase completes the user-facing experience with PDF graphic representations, document history, and management tools.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation and Setup** - Project infrastructure, database, business configuration, and onboarding
- [ ] **Phase 2: Data Catalogs** - Client and product/service catalogs with tax configuration
- [ ] **Phase 3: Compliance Pipeline** - Full invoice lifecycle: CUFE, XML, signing, DIAN SOAP, and document types
- [ ] **Phase 4: Documents and Output** - PDF generation, document management, search, and export

## Phase Details

### Phase 1: Foundation and Setup
**Goal**: The application is running and a business owner can fully configure it for electronic invoicing
**Depends on**: Nothing (first phase)
**Requirements**: INFR-01, INFR-02, INFR-03, INFR-04, CONF-01, CONF-02, CONF-03, CONF-04, CONF-05, CONF-06
**Success Criteria** (what must be TRUE):
  1. User can bring the application online with `docker-compose up` and reach the web UI
  2. User can complete the onboarding wizard and configure their business profile (NIT, razón social, régimen fiscal, dirección)
  3. User can upload their .p12 digital certificate and passphrase without error
  4. User can configure at least one numbering resolution (prefix, range, technical key, expiry)
  5. User can toggle between habilitación and producción environments from the settings screen
**Plans:** 4/5 plans executed

Plans:
- [x] 01-01-PLAN.md — Docker Compose infrastructure, FastAPI skeleton, Alembic async setup
- [x] 01-02-PLAN.md — Backend data models, JWT auth, NIT check digit service
- [x] 01-03-PLAN.md — React 19 + Vite 8 + shadcn/ui scaffold, login page
- [x] 01-04-PLAN.md — Backend API endpoints: settings, certificate, resolution, setup status
- [ ] 01-05-PLAN.md — Frontend onboarding wizard, setup guard, dashboard stub

**UI hint**: yes

### Phase 2: Data Catalogs
**Goal**: Users can manage the clients and products/services that appear on every invoice
**Depends on**: Phase 1
**Requirements**: CATL-01, CATL-02, CATL-03, CATL-04, CATL-05
**Success Criteria** (what must be TRUE):
  1. User can create, edit, and delete a client with NIT/CC, name, address, email, and phone
  2. User can create, edit, and delete a product/service with description, price, IVA tax code, and unit of measure
  3. User can select a department and municipality from a DANE geographic code dropdown with text search
  4. User can import clients from a CSV or Excel file and see them appear in the client list
  5. User can import products/services from a CSV or Excel file and see them appear in the product list
**Plans:** 5 plans

Plans:
- [ ] 02-01-PLAN.md — DANE reference tables + unit of measure seed data
- [ ] 02-02-PLAN.md — Client CRUD backend + frontend with DANE dropdowns
- [ ] 02-03-PLAN.md — Product/Service CRUD backend + frontend with IVA rates
- [ ] 02-04-PLAN.md — CSV/Excel import for clients and products
- [ ] 02-05-PLAN.md — Navigation sidebar + dashboard summary cards

**UI hint**: yes

### Phase 3: Compliance Pipeline
**Goal**: Users can create all electronic document types and have them validated by the DIAN
**Depends on**: Phase 2
**Requirements**: FACT-01, FACT-02, FACT-03, FACT-04, FACT-05, FACT-06, FACT-07, FACT-08, FACT-09, FACT-10, FACT-11, COTZ-01, COTZ-02
**Success Criteria** (what must be TRUE):
  1. User can create a factura de venta with line items, IVA taxes, and retenciones and receive a DIAN-validated response
  2. User can create a nota crédito and nota débito referencing an original validated invoice
  3. User can create a cotización and convert it to a factura de venta with one click (pre-filled data)
  4. DIAN rejection responses are displayed in plain Spanish so the user understands what to fix
  5. User can complete the DIAN habilitación process (test set) from within the application
**Plans**: TBD

### Phase 4: Documents and Output
**Goal**: Users can access, download, and manage all generated documents with full visibility into DIAN status
**Depends on**: Phase 3
**Requirements**: REPR-01, REPR-02, REPR-03, GEST-01, GEST-02, GEST-03, GEST-04, GEST-05
**Success Criteria** (what must be TRUE):
  1. User can download a PDF representation of any validated document containing a QR code with the DIAN verification URL and CUFE
  2. User can download the signed XML for any document
  3. User can view a document history list showing DIAN status (draft, validated, rejected, error) for each document
  4. User can search and filter documents by date, client, status, and amount
  5. User can export the document list to CSV or Excel
**Plans**: 3 plans

Plans:
- [ ] 04-01-PLAN.md — PDF generation: QR code service, Jinja2 HTML template, WeasyPrint rendering, /documents/:id/pdf endpoint
- [ ] 04-02-PLAN.md — CSV/Excel export endpoint + XML download for notes
- [ ] 04-03-PLAN.md — Frontend: PDF download buttons, export dropdown, DocumentActions component

**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation and Setup | 5/5 | Complete | 2026-03-28 |
| 2. Data Catalogs | 5/5 | Complete | 2026-03-29 |
| 3. Compliance Pipeline | 7/7 | Complete | 2026-03-30 |
| 4. Documents and Output | 3/3 | Complete | 2026-04-02 |
| 5. Windows One-Click Installer | 0/5 | Planning | — |

### Phase 5: Windows One-Click Installer — Empaquetar como instalador nativo .exe que incluya backend, frontend y PostgreSQL embebido

**Goal:** Non-technical Windows users can install and run DIAN Facturador with a single .exe installer — no Docker, no terminal, no manual database setup
**Requirements**: INST-01, INST-02, INST-03, INST-04, INST-05, INST-06, INST-07
**Depends on:** Phase 4
**Success Criteria** (what must be TRUE):
  1. User downloads an .exe installer from GitHub Releases, runs it, and gets a working DIAN Facturador app
  2. Embedded PostgreSQL initializes automatically on first launch with no user intervention
  3. App starts on Windows boot minimized to system tray, with a toggleable autostart setting
  4. App checks for updates from GitHub Releases and prompts "restart to apply" when ready
  5. Database migrations run automatically on every startup, preserving user data across updates
**Plans:** 5 plans

Plans:
- [ ] 05-01-PLAN.md — Electron workspace, main process orchestrator, tray, secrets
- [ ] 05-02-PLAN.md — PyInstaller backend bundle (spec file, entrypoint, build script)
- [ ] 05-03-PLAN.md — Frontend Electron build target (VITE_API_BASE_URL)
- [ ] 05-04-PLAN.md — Auto-update module (electron-updater + GitHub Releases)
- [ ] 05-05-PLAN.md — GitHub Actions CI pipeline + NSIS installer customization
