# Architecture Patterns: DIAN Electronic Invoicing

**Domain:** Colombian electronic invoicing (facturación electrónica)
**Researched:** 2026-03-26
**Confidence:** HIGH — sourced from DIAN official documentation, Resolution 165/2023 (Annex 1.9), and verified open-source implementations

---

## Recommended Architecture

A DIAN-compliant self-hosted invoicing system decomposes into six distinct layers. Each has hard compliance obligations. They cannot be reordered arbitrarily — the signing layer must receive a fully formed XML, and the DIAN communication layer must receive a signed document.

```
┌─────────────────────────────────────────────────────┐
│                    Web UI Layer                     │
│    (Invoice forms, document list, settings)         │
└────────────────────────┬────────────────────────────┘
                         │ HTTP (REST/tRPC)
┌────────────────────────▼────────────────────────────┐
│                 Application Layer                   │
│     (Business logic, orchestration, validation)     │
└──┬────────────┬────────────┬────────────┬───────────┘
   │            │            │            │
┌──▼──┐    ┌───▼───┐   ┌────▼───┐   ┌───▼────┐
│ XML │    │Signing│   │  DIAN  │   │  PDF   │
│ Gen │    │ Layer │   │ Client │   │  Gen   │
└──┬──┘    └───┬───┘   └────┬───┘   └───┬────┘
   │            │            │            │
┌──▼────────────▼────────────▼────────────▼───────────┐
│              Storage Layer (PostgreSQL)              │
│   (Documents, parties, numbering, events, files)    │
└─────────────────────────────────────────────────────┘
```

---

## Component Boundaries

### 1. Web UI Layer

**Responsibility:** Render invoice creation forms, document list, settings pages. Communicate exclusively with the Application Layer via HTTP.

**Does NOT:**
- Generate XML directly
- Access the database directly
- Call DIAN services

**Communicates with:** Application Layer only

**Key screens:**
- New invoice form (buyer, items, taxes, payment method)
- Document list with status badges (Borrador, Enviado, Validado, Rechazado)
- Credit note / debit note creation (references a prior invoice)
- Configuration (certificate upload, numbering ranges, company data)
- PDF preview / download

---

### 2. Application Layer

**Responsibility:** Orchestrate the invoice lifecycle. Receive user input, validate business rules, coordinate XML generation → signing → DIAN submission as a pipeline. Persist state after each step.

**Does NOT:**
- Know XML internals
- Perform cryptographic operations
- Render HTML

**Communicates with:** All other layers

**Key responsibilities:**
- CUFE/CUDE calculation (SHA-384 over concatenated invoice fields + technical key)
- Numbering range assignment and validation
- Invoice lifecycle state machine (see states below)
- Retry logic for failed DIAN submissions
- Delivering buyer notification (email with XML + PDF)

**Orchestration pipeline (per document submission):**
```
1. Validate form data (business rules)
2. Assign consecutive number from authorized range
3. Calculate CUFE / CUDE
4. Call XML Generation → receive signed-ready XML
5. Call Signing Layer → receive signed XML
6. Wrap in ZIP (AttachedDocument container)
7. Call DIAN Client → receive ApplicationResponse
8. Parse ApplicationResponse → update document state
9. Call PDF Generation → receive PDF bytes
10. Store XML + PDF in Storage Layer
11. Email XML + PDF to buyer
```

---

### 3. XML Generation Layer

**Responsibility:** Produce a fully compliant UBL 2.1 XML document from structured invoice data. Enforce DIAN field requirements per Technical Annex 1.9 (Resolution 165/2023).

**Does NOT:**
- Sign the document
- Know about DIAN endpoints
- Persist anything

**Input:** Structured invoice data (typed object)
**Output:** Unsigned UBL 2.1 XML string

**Document types it must handle:**
| UBL Type | DIAN Use | Unique ID Field |
|----------|----------|-----------------|
| `Invoice` | Factura de venta | CUFE |
| `CreditNote` | Nota crédito | CUDE |
| `DebitNote` | Nota débito | CUDE |
| `ApplicationResponse` | Evento de recepción / aceptación | — |
| `AttachedDocument` | Contenedor ZIP para envío | — |

Cotizaciones (quotes) are NOT a DIAN document type — they are generated as PDF only, without CUFE or DIAN submission.

**Critical CUFE formula:**
```
CUFE = SHA384(
  NumFac + FecFac + HorFac + ValFac + CodImp1 + ValImp1 +
  CodImp2 + ValImp2 + CodImp3 + ValImp3 + ValTot +
  NitOFE + NumAdq + ClTec
)
```
Where `ClTec` is the Technical Key (Clave Técnica) assigned by DIAN per numbering range.

---

### 4. Signing Layer

**Responsibility:** Apply XAdES-EPES digital signature to an unsigned XML document using the user's PKCS#12 certificate (.p12 / .pfx).

**Does NOT:**
- Generate XML content
- Know about DIAN services
- Store certificates in the database (certificate file is read from filesystem or encrypted config)

**Input:** Unsigned XML string + certificate path + certificate password
**Output:** Signed XML string (XAdES-EPES, enveloped signature)

**Compliance requirements (DIAN Annex 1.9):**
- Signature format: XAdES-EPES (adds signature policy reference to basic XAdES)
- Certificate must be issued by an ONAC-accredited certification authority (Certicámara, GSE, etc.)
- Signature policy document: DIAN publishes a signature policy; its SHA-256 digest must be embedded in the signature
- The `SignatureValue` element must be enveloped (inside the XML, not detached)
- Timestamp of signing must equal the invoice generation date per Annex 1.9 rule FAD09 variant

**Implementation note:** The Java library `xades4j` has proven successful for XAdES-EPES in the Colombian context. For Node.js/Python targets, `xml-crypto` (Node) or `signxml` (Python) handle the lower-level XMLDSig; an adapter is needed for the XAdES-EPES policy layer. This is the single highest-risk component in the system.

---

### 5. DIAN Communication Layer (DIAN Client)

**Responsibility:** Send signed documents to DIAN web services via SOAP and return structured responses. Abstract the SOAP/WSDL complexity from the rest of the system.

**Does NOT:**
- Generate or sign documents
- Know about invoicing business rules
- Persist responses (returns them to Application Layer)

**Communicates with:** DIAN SOAP web services (two environments)

**Web service methods:**
| Method | Purpose |
|--------|---------|
| `GetNumberingRange` | Query authorized numbering range + technical key by NIT and resolution number |
| `SendBillSync` | Submit a signed XML document (wrapped in ZIP) for prior validation |
| `GetStatus` | Poll status of a submitted document by trackId (asynchronous pattern) |
| `GetStatusZip` | Retrieve ApplicationResponse ZIP for a processed document |
| `SendTestSetAsync` | Send test documents during habilitación phase |

**Authentication:** Mutual TLS / digital certificate at the SOAP transport layer. Each DIAN participant has a `tokenEmpresa` (company token) and `tokenPassword` issued after habilitación.

**Environments:**
- Habilitación (testing): `https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc`
- Production: endpoint URL obtained from DIAN's Participant Catalog after habilitación completion; not publicly hardcoded

**Submission format:** Documents are sent as Base64-encoded ZIP files containing the signed XML. The ZIP filename follows DIAN naming convention: `{prefix}{NIT}{consecutive}.zip`.

**Response handling:** DIAN returns an `ApplicationResponse` XML. The system must parse the `cbc:ResponseCode` to determine ACCEPTED (code 00) vs REJECTED (codes 01-99). Rejection codes must be stored and surfaced to the user.

---

### 6. PDF Generation Layer

**Responsibility:** Render a graphic representation of the invoice (or credit/debit note) as a PDF file, including QR code.

**Does NOT:**
- Interact with DIAN
- Know about XML structure

**Input:** Invoice data object + CUFE
**Output:** PDF bytes

**Regulatory requirements (Resolution 000165/2023):**
- Must include: issuer name/NIT, buyer identification, invoice number + authorization range, issue date/time, itemized lines, subtotals, taxes (IVA, national consumption tax), CUFE, QR code
- QR code minimum size: 2 cm; must encode a DIAN-specified URL containing CUFE
- Must appear on every page
- Format: PDF (DOCX also technically permitted but PDF is standard)
- The graphic representation is delivered to the buyer; it does not replace the XML as the legal document

---

### 7. Storage Layer (PostgreSQL)

**Responsibility:** Persist all business data. Single database, single schema. No multi-tenant complexity.

**Core tables and relationships:**

```
company_config (1 row)
  id, nit, business_name, tax_regime, address, email
  certificate_path, certificate_password_encrypted
  dian_token_empresa, dian_token_password

numbering_ranges
  id, document_type, resolution_number, prefix
  from_number, to_number, technical_key
  valid_from, valid_to, current_consecutive

parties (buyers / contacts)
  id, identification_type, identification_number
  name, email, phone, address

documents (invoices, credit notes, debit notes)
  id, document_type, status, consecutive_number, prefix
  issue_date, due_date, cufe_or_cude
  buyer_id → parties
  numbering_range_id → numbering_ranges
  subtotal, total_tax, total, currency
  payment_method, payment_form
  dian_track_id, dian_response_code, dian_response_message
  xml_path, pdf_path, attached_doc_path
  created_at, updated_at

document_items (line items)
  id, document_id → documents
  description, quantity, unit_price, discount
  tax_percent, tax_amount, line_total

document_events (audit trail / ApplicationResponse events)
  id, document_id → documents
  event_type, event_code, event_description
  created_at, raw_response (XML text)

quotes (cotizaciones — not DIAN documents)
  id, status, issue_date, expiry_date
  buyer_id → parties, subtotal, total
  pdf_path, created_at
```

**Document status enum:**
```
DRAFT            → User is editing, not yet submitted
XML_GENERATED    → XML built, not yet signed
SIGNED           → Signed XML ready for submission
SENT             → ZIP submitted to DIAN, awaiting response (trackId stored)
VALIDATED        → DIAN accepted (ResponseCode = "00")
REJECTED         → DIAN rejected (ResponseCode ≠ "00")
ERROR            → System error during pipeline (retryable)
CANCELLED        → Voided (via credit note, not deletable)
```

---

## Data Flow: Invoice Creation to DIAN Validation

```
USER ACTION                    SYSTEM                              DIAN
─────────────────────────────────────────────────────────────────────────

1. Fill invoice form            Web UI collects:
   (buyer, items, taxes)        - buyer ID, address
                                - line items with quantities/prices
                                - tax codes (IVA 19%, etc.)
                                - payment method + form

2. Click "Emitir"               Application Layer:
                                - validate business rules
                                - assign next consecutive number
                                  from numbering_ranges
                                - calculate CUFE (SHA-384)
                                - persist document (status=DRAFT)

3.                              XML Generation Layer:
                                - build UBL 2.1 Invoice XML
                                  with all mandatory DIAN fields
                                - embed CUFE in XML
                                - return unsigned XML string
                                - persist (status=XML_GENERATED)

4.                              Signing Layer:
                                - load PKCS#12 certificate
                                - apply XAdES-EPES signature
                                  (enveloped, with policy reference)
                                - return signed XML string
                                - persist (status=SIGNED)

5.                              Application Layer:
                                - wrap signed XML in ZIP
                                  (AttachedDocument container)
                                - name file per DIAN convention

6.                              DIAN Client:               ──► SendBillSync
                                - authenticate via token             │
                                - send ZIP as Base64 SOAP body        │
                                                            ◄── ApplicationResponse
                                - parse ResponseCode

7a. ResponseCode = "00"         Application Layer:
    (ACCEPTED)                  - persist ApplicationResponse XML
                                - update status = VALIDATED
                                - store trackId

7b. ResponseCode ≠ "00"         Application Layer:
    (REJECTED)                  - persist rejection reason
                                - update status = REJECTED
                                - surface error to user

8.                              PDF Generation Layer:
                                - render invoice PDF with QR code
                                - QR encodes DIAN verification URL + CUFE
                                - store PDF bytes

9.                              Storage Layer:
                                - save signed XML file to disk
                                - save PDF file to disk
                                - update document record with file paths

10.                             Application Layer:
                                - email buyer: XML + PDF attached
                                - or expose download link in UI
```

---

## Suggested Build Order (Phase Dependencies)

The pipeline is strictly sequential: each layer depends on the output of the prior. Build order should follow this dependency chain.

### Phase 1 — Foundation: Storage + Configuration
Build the database schema, migrations, and company configuration module. Everything else depends on being able to persist state and read company config (NIT, numbering ranges, certificate path).

**Deliverables:** PostgreSQL schema, numbering range management, company config UI.

**Why first:** All other components write to or read from this layer. Configuration (numbering ranges, technical key) is required before CUFE can be calculated.

---

### Phase 2 — Document Model + Business Rules
Define the invoice data model (Application Layer entities), business validation rules, and CUFE calculation. No XML yet — just pure data modeling and the math.

**Deliverables:** Invoice/CreditNote/DebitNote entity models, CUFE formula implementation with tests, numbering range assignment logic.

**Why second:** XML generation needs a complete, validated data model as input. Getting the CUFE formula right before building XML prevents hard-to-diagnose errors later.

---

### Phase 3 — XML Generation
Build the UBL 2.1 XML generator for Invoice, CreditNote, and DebitNote. Validate against DIAN's XSD schemas. Test with DIAN's sample documents from the Technical Annex.

**Deliverables:** UBL Invoice XML generator, CreditNote/DebitNote generators, XSD validation tests.

**Why third:** Must have validated data model before building the serializer. XSD validation catches compliance issues before the signing layer makes them harder to debug.

---

### Phase 4 — Digital Signing
Implement XAdES-EPES signing. This is the highest-risk component — get it right in isolation before integrating with DIAN services.

**Deliverables:** XAdES-EPES signer, certificate loading (PKCS#12), signature verification test, integration with signing policy document.

**Why fourth:** Depends on having valid XML to sign. Isolated from DIAN communication so failures are attributable. Must be working before entering habilitación test set.

---

### Phase 5 — DIAN Communication + Habilitación
Implement the DIAN SOAP client. Send test documents through DIAN's habilitación environment. Complete the official habilitación process (10 test documents, all validated without error).

**Deliverables:** DIAN SOAP client (SendBillSync, GetNumberingRange, GetStatus), habilitación test harness, ZIP packaging per naming convention.

**Why fifth:** Requires signed XML. Habilitación must complete before production submissions are possible. This phase gates production readiness.

---

### Phase 6 — PDF Generation
Build the PDF renderer with QR code. This can actually be developed in parallel with Phases 3-5 since it reads from the data model, not from the XML/signing pipeline. Placed here because it is not blocking for DIAN validation.

**Deliverables:** PDF invoice template, QR code with DIAN verification URL, PDF storage.

**Why here:** Does not block DIAN validation. Can be shipped slightly after core compliance is proven.

---

### Phase 7 — Web UI
Build the user-facing interface. By this phase, all backend services are tested and working.

**Deliverables:** Invoice creation form, document list with status, credit/debit note flows, quote (cotización) module, configuration screens.

**Why last:** Depends on all service layers being stable. Building UI first creates integration risk — the underlying pipeline shape determines what the UI can expose.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing the Private Key in the Database
**What goes wrong:** Private key material stored in PostgreSQL (even encrypted) creates audit and compliance risk. A database dump exposes the signing credential.
**Instead:** Store the PKCS#12 file path in config. The file lives outside the database. In Docker deployments, mount it as a volume secret.

### Anti-Pattern 2: Generating PDF Before DIAN Validation
**What goes wrong:** If the PDF is sent to the buyer before DIAN validates, the buyer holds a document with a CUFE that DIAN may later reject. The PDF becomes legally void.
**Instead:** Generate and send PDF only after DIAN returns ResponseCode "00". Store a draft/preview PDF for internal display if needed.

### Anti-Pattern 3: Mutating a Submitted Invoice
**What goes wrong:** Once a document has status SENT or VALIDATED, modifying it changes the CUFE-committed data. DIAN's record and the local record diverge.
**Instead:** Mark submitted documents as immutable. Corrections go through CreditNote/DebitNote workflows.

### Anti-Pattern 4: Skipping the Habilitación Test Set
**What goes wrong:** Going directly to production submissions without completing the official 10-document test set means the software is not officially enabled. DIAN will reject all production submissions.
**Instead:** Build habilitación tooling as a first-class feature in Phase 5. Complete the test set before considering Phase 5 done.

### Anti-Pattern 5: Combining XML Generation and Signing in One Step
**What goes wrong:** Signing modifies the XML structure. If generation and signing are not cleanly separated, debugging a compliance failure becomes impossible — is the XML wrong, or the signature?
**Instead:** Maintain clean separation. Always validate the unsigned XML against DIAN's XSD before passing it to the signing layer.

### Anti-Pattern 6: Hardcoding Production DIAN Endpoint
**What goes wrong:** The production SOAP endpoint is assigned per participant from DIAN's Participant Catalog after habilitación. It is not a universal URL.
**Instead:** Store the endpoint URL in company configuration, populated during the habilitación completion step.

---

## Scalability Considerations

This is a single-tenant self-hosted system. Scalability concerns are minimal but still relevant for correctness.

| Concern | At 1-50 invoices/day | At 500+ invoices/day |
|---------|----------------------|----------------------|
| Database | Single PostgreSQL instance, no read replicas needed | Same — invoicing is write-heavy but low volume |
| DIAN submission | Synchronous (SendBillSync) per invoice is fine | Consider a queue (BullMQ/pgboss) for retry logic |
| File storage | Local filesystem with Docker volume | Same — documents are small, few GBs per year |
| PDF generation | Synchronous is fine | Async background job if PDF blocks UI response |
| Numbering | Single row lock on `numbering_ranges` is sufficient | Same — sequential numbering requires serialization |

For the target audience (persona natural / microempresa), synchronous pipeline is the correct approach. Introducing queues or async background jobs in the initial build adds complexity without benefit.

---

## Sources

- DIAN Technical Annex 1.9, Resolution 165 (2023): https://www.dian.gov.co/impuestos/factura-electronica/Documents/Anexo-Tecnico-Factura-Electronica-de-Venta-vr-1-9.pdf
- DIAN Web Services Guide: https://www.dian.gov.co/impuestos/factura-electronica/Documents/Guia-Herramienta-para-el-Consumo-de-Web-Services.pdf
- DIAN Required Knowledge Document: https://www.dian.gov.co/impuestos/factura-electronica/Documents/Conocimientos_requeridos_vp_face.pdf
- TheFactoryHKA Wiki — Web Service Integration FAQ: https://felcowiki.thefactoryhka.com.co/index.php/Preguntas_Frecuentes_de_Integraci%C3%B3n_con_servicio_Web_(Val._Previa)
- TheFactoryHKA Wiki — Annex 1.9 Integration Changes: https://felcowiki.thefactoryhka.com.co/index.php/Cambios_Integraci%C3%B3n_-Cambios_Integraci%C3%B3n_Anexo_V_1.9
- TheFactoryHKA Wiki — PDF Graphic Representation Requirements: https://felcowiki.thefactoryhka.com.co/index.php/Requisitos_m%C3%ADnimos_de_representaciones_gr%C3%A1ficas_de_documentos_de_Facturaci%C3%B3n_Electr%C3%B3nica
- facho (open source DIAN library, Python): https://github.com/bit4bit/facho
- xades4j XAdES-EPES DIAN issue thread: https://github.com/luisgoncalves/xades4j/issues/134
- DIAN Operation Model: https://msfacturaelectdian.azurewebsites.net/modelo-operacion-19.html
- EDICOM Colombia E-Invoicing: https://edicomgroup.com/electronic-invoicing/colombia
- MisFacturas document states: https://soporte.misfacturas.com.co/hc/es-419/articles/360061811771
- DIAN Habilitación Process: https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/proceso-de-registro-y-habilitacion-como-facturador-electronico/
