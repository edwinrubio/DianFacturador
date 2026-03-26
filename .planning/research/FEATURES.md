# Feature Landscape

**Domain:** Colombian electronic invoicing (facturación electrónica DIAN) — persona natural and microempresa
**Researched:** 2026-03-26
**Confidence:** HIGH for regulatory requirements (official DIAN sources), MEDIUM for competitor feature parity

---

## Context: What the Regulatory Floor Demands

Before listing features by business value, the DIAN regulatory framework forces certain features into existence. These are not product decisions — they are legal minimums:

- **XML UBL 2.1 generation** — Every document must be a valid UBL 2.1 XML
- **XAdES digital signature** — Must sign with a DIAN-accredited certificate (ONAC)
- **CUFE code generation** — 96-character SHA-384 hash on every factura de venta
- **CUDE code generation** — Equivalent unique code for notas crédito and notas débito
- **DIAN web service transmission** — Real-time send + response handling
- **DIAN validation response parsing** — Accept or reject from ~264 DIAN rules
- **PDF + QR representation** — Clients must receive a PDF with minimum 2cm QR code
- **Email delivery to receiver** — XML (signed) + PDF sent to client
- **Habilitación test set** — Software must pass DIAN's test suite (facturas, NC, ND) before production
- **Resolución de numeración** — Invoice ranges must be requested from MUISCA and associated with the software
- **Event handling** — Acuse de recibo, recibo de bien/servicio, aceptación, rechazo (ApplicationResponse)

These are non-negotiable for any legal Colombian e-invoicing software.

---

## Table Stakes

Features users expect. Missing = product feels incomplete or legally invalid.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Factura de venta (electronic) | Core document type, legally required for any sale | High | Full UBL 2.1 + XAdES + CUFE + DIAN transmission |
| Nota crédito (electronic) | Mandatory since 2023 for corrections/cancellations | High | References original invoice, generates CUDE |
| Nota débito (electronic) | Required for value increases on a sale | High | References original invoice, generates CUDE |
| Cotización (quote) | Users expect this before issuing real invoices | Low | NOT transmitted to DIAN — internal document only |
| PDF generation with QR | Required by DIAN; clients expect a readable document | Medium | QR must be minimum 2cm, CUFE/CUDE encoded |
| XML download | Clients and accountants need the signed XML | Low | Already generated; just needs download endpoint |
| Email delivery of XML + PDF to client | Every competitor and the regulation expects this | Medium | SMTP integration; needs templating |
| Digital certificate configuration | Users must upload their own DIAN-issued cert (.p12) | Medium | ONAC-accredited certs; user provides, software uses |
| Resolución de numeración management | User must configure their MUISCA-issued range | Medium | Prefix, range start/end, expiry date |
| Tax handling — IVA | 0%, 5%, 19% rates per line item | Medium | Configurable per product |
| Tax handling — Retenciones | Retefuente, ReteICA, Reteiva per client or product | Medium | Common for B2B; must appear on invoice XML |
| Client (third-party) catalog | Store NIT/CC, name, address, email per client | Low | Reuse on future invoices |
| Product/service catalog | Store code, description, price, tax config | Low | Reuse on future invoices |
| Document list / history | See all issued documents with status | Low | DIAN status: pending, accepted, rejected |
| DIAN status tracking | Know if document was accepted or rejected by DIAN | Medium | Parse ApplicationResponse from DIAN |
| Contingency handling | When DIAN or internet is down, issue paper with prior range | Medium | 48-hour window to retransmit; document contingency state |
| Habilitación test mode | Run against DIAN habilitación environment before going live | High | Required; DIAN test endpoint + SETT prefix |
| Settings / business profile | NIT, razón social, address, regime, email, logo | Low | Used in every document |

---

## Differentiators

Features that set this product apart. Not universally expected, but create real value.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| One-command Docker setup | No competitor offers self-hosted install; SaaS-only market | Low | docker-compose up — the whole point of this project |
| Zero monthly cost | Siigo starts at ~$108K COP/yr; Alegra at $17,900/mo for solo facturación | None | Open source model; differentiates completely |
| Own data / no vendor lock-in | SaaS solutions own your data; this puts the user in control | Low | PostgreSQL local — data stays with the user |
| Offline-capable architecture | SaaS goes down (DIAN reported outages Jan 2025); local app always runs | Medium | Contingency mode built-in; queue + retry when back online |
| Cotización → Factura conversion | Turn a quote into an invoice in one click | Low | Saves re-entry; high daily value for service businesses |
| Nota crédito linked to original | Pre-fill correction from original invoice without re-entering data | Low | Reduces errors; common pain point |
| Bulk product import (CSV/Excel) | Small businesses migrating from paper or spreadsheets | Medium | One-time migration assist |
| Document search and filters | Filter by date, status, client, amount | Low | Critical for >50 invoices |
| Resend email to client | Resend XML + PDF if client claims they didn't receive | Low | Very common support request |
| DIAN validation error display | Show human-readable error message when DIAN rejects | Medium | Competitors show raw error codes; translate to plain Spanish |
| Invoice preview before sending | See what the PDF will look like before transmitting to DIAN | Medium | Reduces mistakes |
| Customizable logo/header on PDF | Business identity on the graphical representation | Low | Alegra and Siigo offer this; expected for professionalism |
| Export to CSV/Excel | Accountant-friendly data export for tax filings | Low | Accountants work in Excel; high practical value |

---

## Anti-Features

Features to explicitly NOT build in this product.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Full accounting module | High complexity, specialized domain; not the target use case | Recommend Alegra/Siigo contabilidad for accounting |
| Nómina electrónica | Separate DIAN system, separate UBL spec, entirely different compliance domain | Out of scope per PROJECT.md |
| Multi-tenant (multiple businesses per install) | Multiplies complexity of data model, auth, and cert management | One install = one NIT — document this clearly |
| Payment processing | Gateway integration, PCI compliance, fraud — a different product entirely | Document accepts payment terms/methods as text |
| POS (point of sale) terminal | Cash drawer, barcode scanner, Documento Equivalente Electrónico — separate document type under Resolución 165/2023 | Focus on B2B/service invoicing; POS is a separate product |
| Banco/conciliación bancaria | Bank API integrations, reconciliation logic — accounting territory | Separate concern |
| Inventory management with cost tracking | COGS, stock valuation, warehouse management — ERP territory | Catalog of products (names/prices) is fine; deep inventory is not |
| Mobile native app | Web app works in mobile browsers; native adds deployment complexity | Responsive web UI covers mobile use |
| AI-generated invoice from WhatsApp | Alegra's differentiator; requires LLM pipeline, complex infrastructure | Not the UX target for this tool |
| CRM features | Contact history, sales pipeline, deal tracking — different product | Simple client directory is enough |
| Tax return filing | Declaraciones de renta, IVA, ICA — specialized accounting domain | Provide exports that help accountants file; don't file directly |
| Cloud hosting / multi-region SaaS | Competing with Siigo/Alegra on their turf; removes OSS benefit | Self-hosted is the moat |
| DIAN proveedor tecnológico registration | Becoming an authorized tech provider requires DIAN certification — massive compliance overhead | User registers as "software propio" (own software), not as a tech provider |
| Documento soporte (non-invoicing parties) | Separate document type for purchases from non-obligated invoicers | Out of scope for initial version |

---

## Feature Dependencies

```
Habilitación test mode
  └── requires: DIAN web service integration
  └── requires: XAdES digital signature
  └── requires: UBL 2.1 XML generation
  └── requires: Certificate (.p12) management
  └── requires: Resolución de numeración configuration

Factura de venta (production)
  └── requires: Habilitación passed
  └── requires: Client catalog
  └── requires: Product/service catalog
  └── requires: Tax configuration (IVA rates)
  └── requires: Business profile (NIT, razón social, address)
  └── requires: CUFE generation
  └── requires: DIAN transmission + response handling

Nota crédito
  └── requires: Factura de venta (references original)
  └── requires: CUDE generation
  └── requires: DIAN transmission

Nota débito
  └── requires: Factura de venta (references original)
  └── requires: CUDE generation
  └── requires: DIAN transmission

PDF + QR generation
  └── requires: Factura de venta / Nota crédito / Nota débito data
  └── required by: Email delivery

Email delivery
  └── requires: PDF generation
  └── requires: SMTP configuration
  └── requires: Client email in client catalog

Cotización
  └── requires: Client catalog
  └── requires: Product/service catalog
  └── optionally feeds: Factura de venta (conversion)

Contingency mode
  └── requires: Separate numeración range for contingency (from MUISCA)
  └── requires: Retry queue when DIAN connectivity restores

Document history / list
  └── requires: All document types stored in PostgreSQL
  └── requires: DIAN status tracking
```

---

## MVP Recommendation

The minimum viable product that is legally valid and usable:

**Prioritize (Phase 1 — must have before any document can be sent):**
1. Business profile setup (NIT, razón social, address, regime)
2. Digital certificate upload and configuration (.p12 + passphrase)
3. Resolución de numeración configuration (prefix, range, expiry)
4. Client catalog (CRUD)
5. Product/service catalog (CRUD)
6. Tax configuration (IVA rates: 0%, 5%, 19%)
7. UBL 2.1 XML generation for factura de venta
8. XAdES digital signature
9. CUFE generation
10. DIAN web service transmission (habilitación and production environments)
11. DIAN response parsing and display (human-readable errors)
12. PDF + QR generation
13. Email delivery of XML + PDF to client
14. Document history with DIAN status

**Prioritize (Phase 2 — complete the required document set):**
15. Nota crédito (with CUDE, references original invoice)
16. Nota débito (with CUDE, references original invoice)
17. Cotización (internal only, no DIAN transmission)
18. Cotización → Factura conversion

**Defer (Phase 3 — quality of life, not blocking):**
- Contingency mode (paper fallback + 48-hour retransmission)
- Bulk product import (CSV)
- Document search and filters
- Resend email to client
- Export to CSV/Excel
- Customizable PDF template (logo, colors)
- DIAN validation error translation to plain Spanish

---

## Competitive Landscape Summary

| Product | Price | Self-hosted | DIAN-integrated | Target |
|---------|-------|-------------|-----------------|--------|
| Alegra "Solo Facturación" | $17,900 COP/mo | No (SaaS) | Yes | SMB, pyme |
| Siigo Facturación | ~$108,900 COP/yr | No (SaaS) | Yes | SMB to enterprise |
| World Office | ~$20,000 COP/mo | No (SaaS + desktop) | Yes | SMB |
| Dataico | ~$20,000 COP/mo | No (SaaS) | Yes | Developer-friendly API |
| DIAN Gratuita | Free | No (DIAN portal) | Yes | Very basic, no API |
| **dianFacturador** | **Free** | **Yes** | **Yes** | **Persona natural, microempresa** |

The SaaS market is crowded but every player charges a monthly fee and holds user data. The self-hosted, zero-cost niche is completely empty.

---

## Sources

- [Alegra Colombia — Facturación Electrónica](https://www.alegra.com/colombia/facturacion-electronica/)
- [Alegra Precios Solo Facturación](https://www.alegra.com/colombia/facturacion-electronica/precios/)
- [Siigo Facturación Electrónica](https://www.siigo.com/facturacion-electronica/)
- [World Office Facturación Electrónica](https://worldoffice.com.co/facturacion-electronica/)
- [Dataico Funcionalidades](https://facturaelectronica.dataico.com/funcionalidades-publireportaje)
- [Dataico Guía Factura Electrónica Colombia 2026](https://www.dataico.com/2026/02/25/guia-factura-electronica-colombia-dian/)
- [DIAN Resolución 000012 de 2021 (Anexo Técnico UBL 2.1)](https://www.dian.gov.co/impuestos/factura-electronica/Documents/Anexo-Tecnico-Resolucion-000012-09022021.pdf)
- [DIAN Anexo Técnico Factura Electrónica v1.9](https://www.dian.gov.co/impuestos/factura-electronica/Documents/Anexo-Tecnico-Factura-Electronica-de-Venta-vr-1-9.pdf)
- [DIAN Facturación Gratuita](https://www.dian.gov.co/impuestos/factura-electronica/facturacion-gratuita/Paginas/default.aspx)
- [DIAN Proceso de Registro y Habilitación](https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/proceso-de-registro-y-habilitacion-como-facturador-electronico/)
- [IVA Calculator — Factura Electrónica DIAN Colombia](https://ivacalculator.com/colombia/factura-electronica-dian/)
- [ITS Contable — Tipos de Contingencia Factura Electrónica](https://www.itscontable.com/blog/todo-lo-que-debes-saber-sobre-los-tipos-de-contingencia-de-factura-electronica-2/)
- [The Factory HKA — Habilitación Facturador Electrónico DIAN](https://felcowiki.thefactoryhka.com.co/index.php/Habilitaci%C3%B3n_como_facturador_electr%C3%B3nico_en_el_portal_de_la_DIAN_(Validaci%C3%B3n_Previa))
- [Loggro — Software gratuito facturación Colombia pros y contras](https://loggro.com/blog/articulo/software-gratis-de-facturacion-electronica-en-colombia-pros-y-contras/)
- [GitHub Topics — factura-electronica](https://github.com/topics/factura-electronica)
