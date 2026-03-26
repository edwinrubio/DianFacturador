# Domain Pitfalls: DIAN Facturación Electrónica

**Domain:** Colombian electronic invoicing (facturación electrónica) — persona natural and microempresas
**Researched:** 2026-03-26
**Overall confidence:** HIGH — multiple verified sources including official DIAN documentation, vendor wiki, and developer issue trackers

---

## Critical Pitfalls

Mistakes that cause rejections, require rewrites, or block DIAN enablement entirely.

---

### Pitfall 1: CUFE Calculation Errors (FAD06)

**What goes wrong:** The CUFE (Código Único de Factura Electrónica) is rejected by DIAN with error FAD06 — "Valor del CUFE no está calculado correctamente."

**Why it happens:** Developers underestimate the specificity of the CUFE formula. The CUFE is a 96-character hex string produced by SHA-384 over a precise concatenation of fields in an exact order: NumFac + FecFac + HorFac + ValFac + CodImp1 + ValImp1 + CodImp2 + ValImp2 + CodImp3 + ValImp3 + ValTot + NitOFE + NumAdq + ClaveAcceso + TipAmb. Common mistakes include:
- Using SHA-256 or SHA-1 instead of SHA-384
- Wrong field order in the concatenation string
- Including decimal separators (commas) instead of dots
- Using the formatted value instead of the raw numeric string
- Missing leading/trailing whitespace trimming inconsistencies

**Consequences:** Every invoice is rejected. Production cannot proceed.

**Prevention:** Implement CUFE calculation against the canonical formula in the Anexo Técnico v1.9. Write unit tests comparing output against known-good examples from DIAN's published test cases. The TechnicalKey used in CUFE must come from the authorized numbering range — it is not a static value.

**Detection:** FAD06 rejection from DIAN web service. Can also be pre-validated offline by recomputing and comparing before transmission.

**Phase:** Foundation/XML generation phase. Must be correct before any DIAN connectivity work begins.

---

### Pitfall 2: XAdES-EPES Signature Non-Compliance

**What goes wrong:** DIAN rejects the invoice with "Incorrecta: firma inconsistente o revocada" or "Valor de la firma inválido" (ZE02). The signature verifies locally but DIAN rejects it.

**Why it happens:** DIAN requires XAdES-EPES (not plain XAdES or XMLDSig) with very specific canonicalization and reference structure. Common implementation failures:
- DOM manipulation after signing — any change to the XML after signature (whitespace, encoding) invalidates the digest. The XML must be serialized ONCE, then signed, then never modified.
- Wrong canonicalization algorithm — DIAN requires Canonical XML 1.0 (C14N), not exclusive C14N.
- Signing the DOM in-memory before serialization instead of signing the serialized bytes.
- Using the xades4j generic library without the DIAN-specific configuration (reference structure differs from generic XAdES-EPES).
- Certificate chain not included in the KeyInfo element.
- SIGNPLGNS error when signature validation itself fails structurally.

**Consequences:** Every invoice is rejected at the signature validation step regardless of XML content correctness.

**Prevention:**
1. Serialize the complete XML to a stable byte representation (UTF-8, no BOM) BEFORE signing.
2. Use a library that has been validated against DIAN — the `andrea-xades` project (Java) is community-verified for DIAN compliance. PHP implementations must handle the ws-security SOAP envelope signing separately from the invoice XML signing.
3. Validate the certificate chain is complete (.p12/.pfx with full chain).
4. Test signature verification independently before submitting to DIAN.

**Detection:** ZE codes (ZE02 specifically). SIGNPLGNS in the DIAN response ApplicationResponse.

**Phase:** Digital signature phase. Must be a standalone, tested module before integration with DIAN web services.

---

### Pitfall 3: UBL 2.1 Structure Deviations

**What goes wrong:** The XML passes schema validation locally but is rejected by DIAN because Colombian UBL 2.1 has mandatory local extensions (UBLExtensions) that are not in the base UBL schema. Developers using generic UBL libraries produce technically valid UBL that DIAN rejects.

**Why it happens:**
- Colombia uses a customized profile: `ProfileID = "DIAN 2.1: Factura Electrónica de Venta"` and `ProfileExecutionID` must be 1 (production) or 2 (test). Using wrong values triggers FAD03/FAD04.
- The `UBLVersionID` must be exactly "UBL 2.1" (FAD01 rejects anything else).
- Colombian invoices require a `DianExtensions` block inside `UBLExtensions` containing the digital signature, the InvoiceControl (numbering authorization data), and the InvoiceSource.
- Error FAC03: only one UBLExtension group with `ds:Signature` is permitted — generic libraries sometimes add multiple signature nodes.
- The XML namespace declarations must follow the exact structure from the DIAN XSD schemas. Extra or reordered namespaces break canonicalization and thus signature validation.

**Consequences:** Systematic rejection of all invoices. Hard to debug because errors look like generic XML issues.

**Prevention:** Do not use a generic UBL library and try to adapt it. Start from DIAN's official XSD schemas and example XMLs from the Caja de Herramientas. Build the XML serializer against DIAN examples, not against UBL spec alone.

**Detection:** FAD01, FAD03, FAD04, FAC03 rejection codes. Compare namespace order and structure against official DIAN example files.

**Phase:** XML generation foundation. Must be locked down with integration tests against DIAN's test environment before advancing.

---

### Pitfall 4: Annexo Técnico Version Mismatch (v1.8 vs v1.9)

**What goes wrong:** The implementation targets Anexo Técnico v1.8 but DIAN requires v1.9 (mandatory from February 2, 2024). Several validation rules changed incompatibly.

**Why it happens:** Most online tutorials, blog posts, open source projects, and Stack Overflow answers reference v1.7 or v1.8. Developers copy working code from older projects without noticing the version difference.

**Key breaking changes in v1.9:**
- Date validation rules FAD09c/d replaced by FAD09e — the generation date must now equal the signature date (no longer a ±10-day window at the line level).
- `RoundingAmount` in `TaxTotal` nodes is no longer processed — using it causes incorrect tax total validation.
- Payment method (`PaymentMeans`) is now mandatory for BOTH cash and credit transactions, not just cash.
- Non-referenced credit notes are now mandatory for accepted invoices.
- Catalogs (unit of measure codes, tax codes, document type codes) moved out of the Annexo into a separate "Caja de Herramientas" — the old hardcoded values may be outdated.
- New operation codes 15 and 16 for currency buying/selling require `CustomizationID` in UBL extension.

**Consequences:** Invoices are rejected with validation errors that are hard to diagnose without knowing the version-specific rules.

**Prevention:** Pin the implementation explicitly to v1.9. Download the official Anexo Técnico v1.9 PDF from DIAN and the Caja de Herramientas tables. Do not copy code from any project that references v1.7 or v1.8 without auditing every field.

**Detection:** Systematic rejection with rules like FAS18 (no longer exists), FAD09c errors that don't match expected behavior, payment method rejections on credit sales.

**Phase:** XML generation foundation. Version must be confirmed before any field mapping begins.

---

### Pitfall 5: Consecutive Numbering and Authorization Range Violations

**What goes wrong:** Invoices are rejected with FAB05a/FAB05b (missing/invalid authorization range) or FAB07a/FAB08a (issue date outside authorization period).

**Why it happens:**
- The prefix and number range must match the active DIAN authorization (Resolución de Facturación). The authorization includes: prefix, from-number, to-number, start date, end date, and a TechnicalKey.
- Users confuse the habilitación numbering (SETT prefix, used only in testing) with production numbering.
- Authorizations expire — if the range's end date passes, every subsequent invoice is rejected.
- The consecutive number in the XML must match exactly what was submitted (e.g., FE-1001, not FE1001 if prefix is "FE-").
- FAB10a/FAB10b: prefix in the document doesn't match the authorized prefix.

**Consequences:** Invoices generate CUFE but are rejected — the number is consumed and cannot be reused in prior validation mode.

**Prevention:**
- Store the full authorization data (prefix, range, dates, TechnicalKey) in the database and validate before generation.
- Implement expiration warnings at least 15 business days before the authorization end date (the legal minimum for requesting renewal).
- Use the DIAN API to verify numbering status before generating invoices in production.
- The application must alert users when fewer than 10% of the authorized range remains.

**Detection:** FAB05, FAB07, FAB08, FAB10 rejection codes. Check the authorization table in the database against the invoice being generated.

**Phase:** Invoice generation logic. Numbering management must be a core feature, not an afterthought.

---

## Moderate Pitfalls

---

### Pitfall 6: Tax Calculation Precision and Rounding Errors

**What goes wrong:** Invoices are rejected with FAU14 (invoice total doesn't match sum of components), FAX07 (tax value differs from rate × base), or FAV06 (line total doesn't match quantity × unit price).

**Why it happens:**
- Floating-point arithmetic for currency — using `float` or `double` for monetary values accumulates rounding errors across line items.
- IVA rounding: Colombia uses NTC 3711 rounding (round-half-to-even, "banker's rounding") not standard round-half-up. Using wrong rounding produces values that differ by ±1 peso per line, which compounds at invoice level.
- DIAN allows a tolerance of ±$2 COP for monetary values and ±$5 for rounding to nearest $10, but this tolerance is narrow and not a license for imprecise arithmetic.
- Retenciones (withholdings) must separately match the sum of all `WithholdingTaxTotal` elements — one incorrect withholding line causes FAU06.
- Tax base must be reported correctly per item AND in aggregate; inconsistency between line totals and invoice totals is error FAS01A/FAS01B.

**Consequences:** Rejections that are numerically small but systematically fail a class of invoices (e.g., all invoices with discounts, or all multi-line invoices).

**Prevention:**
- Use `Decimal` type (arbitrary precision) for all monetary arithmetic, not float/double.
- Define rounding function explicitly using NTC 3711 rules and test against edge cases.
- Calculate line totals, tax totals, and invoice total using the same rounding function in the same order as specified in the Anexo Técnico.
- Write parameterized tests for invoices with: single item + IVA 19%, multiple items with mixed IVA rates, items with discount, items with retención en la fuente.

**Detection:** FAU14, FAX07, FAV06, FAS01A, FAS01B in DIAN responses. Pre-validate totals before submission using the same formula DIAN uses.

**Phase:** Invoice generation / tax calculation module.

---

### Pitfall 7: WS-Security SOAP Envelope Assembly Errors

**What goes wrong:** The DIAN web service returns authentication/authorization errors: "The security token could not be authenticated or authorized" or FAJ44 "NIT no autorizado a facturar electrónicamente."

**Why it happens:**
- DIAN's SOAP endpoints require WS-Security with X.509 token profile. Standard SOAP libraries add extra attributes or whitespace to the Security header that break the signature validation.
- The SOAP envelope itself must be signed (transport-level security) separately from the invoice XML (document-level XAdES signature). Developers confuse the two signing operations.
- SoftwareID and SoftwareSecurityCode must be included in the invoice XML's UBLExtensions. The SoftwareSecurityCode is SHA-1(SoftwareID + PIN + InvoiceNumber) — wrong concatenation order causes rejection.
- DIAN has two distinct environments with different endpoints and different software registrations: habilitación (https://vpfe-hab.dian.gov.co/) and producción (https://vpfe.dian.gov.co/). Sending production invoices to the testing endpoint (or vice versa) causes confusing failures.
- FAJ71: if the issuer's reception email is not configured in the DIAN portal, all invoices are rejected.

**Consequences:** Connection-level failures that produce SOAP faults rather than ApplicationResponse XML, making them harder to parse and log.

**Prevention:**
- Build the SOAP envelope manually using DOM/string templates rather than relying on SOAP libraries to auto-generate the security header.
- Test WS connectivity with SoapUI using DIAN's published WSDL before writing application code.
- Register the software (SoftwareID) in the DIAN portal before any SOAP calls. Each environment (habilitación, producción) requires separate registration.
- Verify the user's DIAN reception email is configured before submitting any invoice.
- Implement environment-aware URL configuration with explicit labels — never allow production URL to be the default.

**Detection:** SOAP faults (500 errors), FAJ44, FAJ71 in ApplicationResponse. DIAN portal shows software registration status.

**Phase:** DIAN web service integration phase.

---

### Pitfall 8: Testing Environment Misuse (Habilitación vs Producción)

**What goes wrong:** Developers submit real invoices to the habilitación environment, or submit test invoices to production. Test set passes but enablement fails. Invoices generated during testing are not legally valid.

**Why it happens:**
- The habilitación environment uses different endpoints, different SoftwareIDs, and a special test prefix "SETT". Mixing up endpoints or not switching ProfileExecutionID (1=production, 2=test) is a common mistake.
- The test set requires a minimum of: 2 facturas de venta, 1 nota crédito, 1 nota débito — all validated without error. Missing any document type means the set is incomplete.
- After passing the test set, the status change from "Registrado" to "Habilitado" must be manually confirmed in the portal — it is not automatic.
- Master data (clients, products, units of measure) created in the DEMO environment do NOT migrate to production. Developers who build their test data in DEMO expect it to carry over.
- Error: "Este modo de operación y documento electrónico carece de Set de Pruebas" — the test set must be regenerated if this appears.

**Consequences:** Wasted development time, re-testing cycles, or worse — invoices submitted to production during testing that cannot be cancelled.

**Prevention:**
- Make the environment (habilitación vs producción) a mandatory, explicitly-named configuration item with no default. Display prominently in the UI.
- Store ProfileExecutionID in the numbering authorization record — it changes per environment.
- Build a pre-flight checklist: (a) correct endpoint, (b) correct SoftwareID, (c) correct ProfileExecutionID, (d) numbering range matches environment.
- Document the full test set requirements in the app's onboarding/setup flow: 2 invoices + 1 credit note + 1 debit note.

**Detection:** "Carece de Set de Pruebas" error message. DIAN portal shows enablement status.

**Phase:** DIAN integration and testing phase. The test/production separation must be enforced by the application architecture from day one.

---

### Pitfall 9: Credit Note and Debit Note Reference Errors

**What goes wrong:** Credit notes and debit notes are rejected because the reference to the original invoice is missing, incorrect, or uses the wrong CUFE.

**Why it happens:**
- Credit notes with reference must include the prefix, number, CUFE, and date of the original invoice. Any mismatch (e.g., wrong date used to regenerate the CUFE lookup) causes rejection.
- In Anexo v1.9, non-referenced credit notes are mandatory for invoices that were accepted — the previous "reference optional" behavior changed.
- Debit notes technically require a new invoice to be issued (not just a debit note) to support the increased value for costs/deductions — developers implement debit notes without issuing the corresponding new invoice.
- Date range rules for credit notes: CAD09c/d require the note date to be within a valid window relative to the original invoice (5 days minimum, 10 days maximum in older annexos; v1.9 requires generation date = signature date).

**Consequences:** Notes are rejected, leaving invoices incorrectly reflected in both the issuer's and recipient's books. Regulatory risk for inaccuracy.

**Prevention:**
- Store the original invoice's CUFE and issuance date alongside each credit/debit note in the database.
- Validate that the referenced CUFE corresponds to a document in the system before submission.
- Implement debit note flow as: issue new invoice for the difference, then optionally reference the original.
- Test credit note and debit note flows as part of the minimum test set (DIAN requires them for enablement).

**Detection:** CAS/DAS series rejection codes, date validation errors on notes (CAD09).

**Phase:** Credit note and debit note implementation phase.

---

### Pitfall 10: XML File Size Limit (ZA01)

**What goes wrong:** Invoices with many line items are rejected with ZA01 — "XML file exceeds 500 KB limit."

**Why it happens:** DIAN imposes a hard 500 KB limit on XML file size. Invoices with 400+ line items routinely exceed this. Developers building for persona natural often don't test with large invoices because typical use cases are small.

**Consequences:** Rejection of valid large invoices with no workaround except splitting the invoice.

**Prevention:**
- Implement an XML size pre-check before submission. Warn users if an invoice will exceed ~450 KB (safety margin).
- Design the UI to warn when an invoice has more than 300 line items.
- Document this limitation clearly for users who do bulk invoicing.

**Detection:** ZA01 rejection code.

**Phase:** Invoice generation phase. Size check should be part of submission validation.

---

### Pitfall 11: RUT/NIT Status Issues (RUT01, FAJ43, FAJ44)

**What goes wrong:** Invoices are rejected because the issuer or recipient NIT is cancelled, suspended, or inactive in the RUT registry (RUT01), or the issuer NIT is not authorized for electronic invoicing (FAJ44), or NIT/business name doesn't match the RUT registry (FAJ43a/b — new in v1.9).

**Why it happens:**
- For persona natural, NIT is the cédula with check digit (e.g., 1234567890-1). Getting the check digit wrong is a common data entry mistake.
- FAJ43a/b (new in v1.9): the business name in the XML must match exactly what is in the RUT — abbreviations or slightly different names cause rejection.
- FAJ71: the reception email in the DIAN portal must be set before invoicing. First-time setup omission.

**Consequences:** Systematic rejection of all invoices until corrected in DIAN portal or RUT.

**Prevention:**
- Implement NIT check digit calculation and validate during setup configuration.
- Fetch and validate the user's RUT data during onboarding — display the exact name as it appears in RUT.
- Add a setup checklist that includes: RUT updated, reception email configured in portal, software registered.
- Provide clear error messages when RUT01, FAJ43, FAJ44 are returned — they require portal/administrative action, not code changes.

**Detection:** RUT01, FAJ43, FAJ44 in ApplicationResponse. These appear immediately on first invoice attempt.

**Phase:** Onboarding / setup phase. Must be resolved before any invoice submission.

---

## Minor Pitfalls

---

### Pitfall 12: Timezone and Date Format in XML

**What goes wrong:** Date/time fields use wrong timezone offset, causing FAD09 boundary violations or silent data inconsistencies.

**Why it happens:** Colombia is UTC-5 (no DST). XML datetime fields must use `-05:00` offset. Servers running in UTC generate timestamps with `+00:00` offset, which DIAN interprets as a different calendar date around midnight.

**Prevention:** Force all invoice datetime generation to use Colombia's timezone (America/Bogota, UTC-5) explicitly, not the server's system timezone. Validate in configuration that the system knows its timezone offset. DIAN warning FAD10 specifically flags timezone issues.

**Phase:** XML generation foundation.

---

### Pitfall 13: Geographic Codes (Departments and Municipalities)

**What goes wrong:** Invoices are rejected with FAK28, FAK29, FAK32, CDG01, FAK58 because department codes, municipality codes, or postal codes don't match the DIAN catalogs.

**Why it happens:** Colombia uses DANE codes for departments (2 digits) and municipalities (5 digits). The municipality code includes the department prefix. Postal codes must follow specific structural rules. Developers hardcode "Bogotá" as department code "11" and municipality "11001" but get the values wrong for other cities.

**Prevention:** Bundle the complete DANE department/municipality code catalog in the application. Provide a searchable UI dropdown for address fields that constrains valid codes. Do not allow free-text entry for department or municipality.

**Phase:** Address/client data model phase.

---

### Pitfall 14: Contingency Mode Not Implemented

**What goes wrong:** DIAN services go down (they use Azure and have documented outages, including January 2025) and the application has no fallback, leaving users unable to invoice.

**Why it happens:** Developers build the happy path only. DIAN contingency rules require the ability to generate and deliver invoices to customers even when DIAN validation is unavailable (Contingency Type 4).

**Prevention:** Implement a contingency mode where:
- The invoice XML is generated and signed normally.
- It is delivered to the customer without DIAN validation.
- It is queued for retransmission to DIAN within 48 hours once service is restored.
- The UI clearly marks invoices pending DIAN validation.

Five retry attempts at 2-minute intervals should be made before declaring a Type 4 contingency.

**Phase:** DIAN integration resilience phase (after basic integration works).

---

### Pitfall 15: Open Source Library Selection Pitfall

**What goes wrong:** Developers pick an existing open source DIAN library (GitHub), integrate it deeply, then discover it targets an outdated Anexo Técnico version, is abandoned, or has known DIAN rejection bugs that are unresolved.

**Why it happens:** Several GitHub projects exist (soenac/api-dian, bit4bit/facho, dkrimmer84/l10n_co_e-invoice) at various levels of completeness and maintenance. Without auditing against v1.9, it's impossible to know what works.

**Prevention:**
- Before adopting any library, verify: (a) last commit date, (b) which Anexo Técnico version it targets, (c) whether it has open DIAN rejection issues.
- Treat XML generation and signing as owned code, not as a library dependency — the DIAN-specific rules are narrow enough to implement directly.
- If using a library for UBL structure, validate ALL output against DIAN's published example XMLs from the Caja de Herramientas.

**Phase:** Foundation / library selection phase (pre-coding decision).

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| XML generation foundation | CUFE formula, UBL structure, namespace order, v1.9 compliance | Build against DIAN XSD + example files; implement CUFE unit tests immediately |
| Digital signature module | XAdES-EPES specifics, serialize-before-sign rule, certificate chain | Implement as isolated module with DIAN-specific test fixtures |
| Tax calculation | Float arithmetic, banker's rounding, line vs invoice total consistency | Use Decimal type; parameterized tests for all IVA/retención combinations |
| DIAN web service integration | SOAP envelope assembly, WS-Security, environment endpoints, SoftwareID | Manual XML envelope construction; separate habilitación and producción configs |
| Testing and enablement | Test set completeness, no data migration, ProfileExecutionID | Onboarding checklist in app; environment explicitly named in UI |
| Numbering management | Authorization expiry, prefix mismatch, range exhaustion | Store full authorization record in DB; expiration alerts at 15-day threshold |
| Credit/debit notes | CUFE reference, v1.9 mandatory non-reference rule | Store original CUFE with every note; test as part of required enablement set |
| Contingency handling | No offline mode when DIAN is down | Queue-and-retry architecture; 48-hour resubmission window |
| Address/client data | DANE codes, municipality-department relationship | Bundle DANE catalog; dropdown UI with code validation |
| Onboarding/setup | NIT check digit, RUT name match, reception email | Setup checklist with pre-flight validation before first invoice |

---

## Sources

- DIAN Anexo Técnico v1.9 (official): https://www.dian.gov.co/impuestos/factura-electronica/Documents/Anexo-Tecnico-Factura-Electronica-de-Venta-vr-1-9.pdf
- DIAN rejection rules wiki (The Factory HKA): https://felcowiki.thefactoryhka.com.co/index.php/Reglas_de_Rechazo_DIAN_-_Integraci%C3%B3n
- DIAN Anexo v1.9 changes summary: https://felcowiki.thefactoryhka.com.co/index.php/Cambios_Integraci%C3%B3n_-Cambios_Integraci%C3%B3n_Anexo_V_1.9
- DIAN contingency documentation: https://www.dian.gov.co/impuestos/factura-electronica/Documents/Contingencia_FE_T3_T4.PDF
- XAdES signature issues for DIAN (GitHub xades4j): https://github.com/luisgoncalves/xades4j/issues/191
- DIAN enablement process guide: https://felcowiki.thefactoryhka.com.co/index.php/Habilitaci%C3%B3n_como_facturador_electr%C3%B3nico_en_el_portal_de_la_DIAN_(Validaci%C3%B3n_Previa)
- Rejection rules (softwaremedico): https://softwaremedico.com.co/reglas-de-rechazo-en-la-facturacion-electronica-dian/
- DIAN rejection codes (aliaddo): https://factura-electronica.aliaddo.dev/errores-y-rechazos/codigos-de-rechazo-y-advertencia-de-la-dian/factura-dian
- DIAN SOAP web services guide: https://www.dian.gov.co/impuestos/factura-electronica/Documents/Guia-Herramienta-para-el-Consumo-de-Web-Services.pdf
- DIAN technical documentation portal: https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/documentacion-tecnica/
- Novasoft Anexo 1.9 changes summary: https://www.novasoft.com.co/resolucion-dian-000008-facturacion-electronica/
- Common errors Facele Colombia: https://facele.co/errores-frecuentes-al-emitir-factura-electronica-y-como-evitarlos/
