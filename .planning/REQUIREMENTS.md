# Requirements: DIAN Facturador

**Defined:** 2026-03-26
**Core Value:** Cualquier persona natural o microempresa puede facturar electrónicamente ante la DIAN sin depender de software costoso o complicado.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Configuración y Setup

- [x] **CONF-01**: User can configure business profile (NIT, razón social, régimen fiscal, dirección, datos de contacto)
- [ ] **CONF-02**: User can upload digital certificate (.p12 file + passphrase) for electronic signing
- [ ] **CONF-03**: User can manage numbering resolutions (prefix, range start/end, technical key, expiry date)
- [ ] **CONF-04**: User can configure environment (habilitación test vs producción)
- [ ] **CONF-05**: User is guided through initial setup via onboarding wizard (step-by-step checklist)
- [x] **CONF-06**: System validates NIT check digit automatically

### Catálogos

- [ ] **CATL-01**: User can create, edit, and delete clients (NIT/CC, nombre, dirección, email, teléfono)
- [ ] **CATL-02**: User can create, edit, and delete products/services (descripción, precio, código impuesto IVA, unidad de medida)
- [ ] **CATL-03**: User can select department/municipality from DANE geographic code dropdown with search
- [ ] **CATL-04**: User can import clients from CSV/Excel file
- [ ] **CATL-05**: User can import products/services from CSV/Excel file

### Facturación Electrónica

- [ ] **FACT-01**: User can create a factura de venta electrónica with line items, taxes, and totals
- [ ] **FACT-02**: System generates UBL 2.1 XML compliant with DIAN Anexo Técnico v1.9
- [ ] **FACT-03**: System calculates CUFE using SHA-384 per DIAN specification
- [ ] **FACT-04**: System applies XAdES-EPES digital signature to invoice XML
- [ ] **FACT-05**: System transmits signed XML to DIAN via SOAP web service (SendBillSync)
- [ ] **FACT-06**: System receives and stores DIAN ApplicationResponse (validated/rejected)
- [ ] **FACT-07**: User can create nota crédito referencing original invoice (CUDE calculation)
- [ ] **FACT-08**: User can create nota débito referencing original invoice (CUDE calculation)
- [ ] **FACT-09**: System handles IVA at 0%, 5%, and 19% per product configuration
- [ ] **FACT-10**: System handles retenciones (Retefuente, ReteICA, ReteIVA) per client/product configuration
- [ ] **FACT-11**: System uses Decimal arithmetic with NTC 3711 banker's rounding for all monetary calculations

### Cotizaciones

- [ ] **COTZ-01**: User can create cotización (quote) with line items, taxes, and totals
- [ ] **COTZ-02**: User can convert cotización to factura de venta in one click (pre-filled data)

### Representación Gráfica

- [ ] **REPR-01**: System generates PDF representation of each document with QR code (min 2cm, DIAN verification URL + CUFE)
- [ ] **REPR-02**: User can download signed XML and PDF for manual delivery to buyer
- [ ] **REPR-03**: PDF includes customizable business logo

### Gestión Documental

- [ ] **GEST-01**: User can view document history with DIAN status (draft, validated, rejected, error)
- [ ] **GEST-02**: User can complete DIAN habilitación process from within the application (test mode)
- [ ] **GEST-03**: User can search and filter documents by date, client, status, and amount
- [ ] **GEST-04**: User can export document list to CSV/Excel
- [ ] **GEST-05**: System displays DIAN rejection errors translated to plain Spanish

### Infraestructura

- [x] **INFR-01**: Application runs via docker-compose (one command: docker-compose up)
- [x] **INFR-02**: Application can be installed manually (clone repo, install deps, configure DB)
- [x] **INFR-03**: PostgreSQL 16 as database with Alembic migrations
- [x] **INFR-04**: Application is fully open source

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Comunicaciones

- **COMM-01**: System sends signed XML + PDF via email to buyer automatically
- **COMM-02**: User can resend documents to buyer via email

### Resiliencia

- **RESL-01**: System supports contingency mode (offline invoice generation + 48h retry queue)
- **RESL-02**: System alerts user when numbering range is close to expiry (15 business days)

### Catálogos Avanzados

- **CATL-06**: User can bulk edit products/services
- **CATL-07**: Advanced PDF template customization (multiple templates)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-tenant (varios negocios por instalación) | Single-tenant simplifica modelo de datos y seguridad |
| Empresas SAS/LTDA | Enfocado en persona natural y microempresas |
| App móvil nativa | Web-first, accesible desde cualquier navegador |
| Nómina electrónica | Solo documentos de facturación |
| Procesamiento de pagos | El software genera documentos, no procesa pagos |
| Módulo contable completo | Solo facturación, no contabilidad general |
| POS / punto de venta | No es un sistema POS |
| Inventario con costos | Solo catálogo de productos, no gestión de inventario |
| Cloud SaaS hosting | Self-hosted únicamente |
| AI invoice generation | Complejidad innecesaria para el alcance |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CONF-01 | Phase 1 | Complete |
| CONF-02 | Phase 1 | Pending |
| CONF-03 | Phase 1 | Pending |
| CONF-04 | Phase 1 | Pending |
| CONF-05 | Phase 1 | Pending |
| CONF-06 | Phase 1 | Complete |
| CATL-01 | Phase 2 | Pending |
| CATL-02 | Phase 2 | Pending |
| CATL-03 | Phase 2 | Pending |
| CATL-04 | Phase 2 | Pending |
| CATL-05 | Phase 2 | Pending |
| FACT-01 | Phase 3 | Pending |
| FACT-02 | Phase 3 | Pending |
| FACT-03 | Phase 3 | Pending |
| FACT-04 | Phase 3 | Pending |
| FACT-05 | Phase 3 | Pending |
| FACT-06 | Phase 3 | Pending |
| FACT-07 | Phase 3 | Pending |
| FACT-08 | Phase 3 | Pending |
| FACT-09 | Phase 3 | Pending |
| FACT-10 | Phase 3 | Pending |
| FACT-11 | Phase 3 | Pending |
| COTZ-01 | Phase 3 | Pending |
| COTZ-02 | Phase 3 | Pending |
| REPR-01 | Phase 4 | Pending |
| REPR-02 | Phase 4 | Pending |
| REPR-03 | Phase 4 | Pending |
| GEST-01 | Phase 4 | Pending |
| GEST-02 | Phase 3 | Pending |
| GEST-03 | Phase 4 | Pending |
| GEST-04 | Phase 4 | Pending |
| GEST-05 | Phase 3 | Pending |
| INFR-01 | Phase 1 | Complete |
| INFR-02 | Phase 1 | Complete |
| INFR-03 | Phase 1 | Complete |
| INFR-04 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 36 total
- Mapped to phases: 36
- Unmapped: 0

---
*Requirements defined: 2026-03-26*
*Last updated: 2026-03-26 after roadmap creation*
