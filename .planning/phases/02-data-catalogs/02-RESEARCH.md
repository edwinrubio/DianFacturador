# Phase 2: Data Catalogs - Research

**Researched:** 2026-03-27
**Domain:** Client/product CRUD, DIAN code tables, DANE geographic codes, CSV/Excel import
**Confidence:** HIGH

## Summary

Phase 2 builds the client (tercero/adquiriente) and product/service catalogs that Phase 3 will reference when creating invoices. The DIAN's UBL 2.1 schema (Anexo Técnico v1.9) mandates specific fields and code tables for both clients and products — these must be stored correctly from the catalog phase to avoid rework later.

The key technical challenges are: (1) mapping DIAN identification document types, fiscal responsibilities, and tax regime codes into the client model; (2) seeding ~1,125 DANE DIVIPOLA municipality codes for the geographic dropdown; (3) implementing IVA tax codes and UNECE Rec. 20 unit of measure codes for products; and (4) providing CSV/Excel bulk import with validation.

**Primary recommendation:** Model clients and products with all DIAN-required UBL fields from day one. Use openpyxl (not pandas) for Excel parsing to keep dependencies lightweight. Seed DANE codes as a static reference table via Alembic data migration.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CATL-01 | User can create, edit, and delete clients (NIT/CC, nombre, dirección, email, teléfono) | DIAN document type codes, AccountingCustomerParty UBL fields, fiscal responsibilities |
| CATL-02 | User can create, edit, and delete products/services (descripción, precio, código impuesto IVA, unidad de medida) | DIAN tax codes (IVA 01), UNECE unit of measure codes, TaxScheme mapping |
| CATL-03 | User can select department/municipality from DANE geographic code dropdown with search | DANE DIVIPOLA dataset: 33 departments, ~1,125 municipalities, official Excel download |
| CATL-04 | User can import clients from CSV/Excel file | openpyxl for .xlsx, csv stdlib for .csv, FastAPI UploadFile pattern |
| CATL-05 | User can import products/services from CSV/Excel file | Same import infrastructure as CATL-04, shared validation service |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Stack:** FastAPI + SQLAlchemy 2.0 async + PostgreSQL (backend), React 19 + Vite 8 + shadcn/ui (frontend)
- **ORM:** SQLAlchemy 2.0.x with `Mapped[]` type annotations, `mapped_column()`, async sessions
- **Migrations:** Alembic only — never `Base.metadata.create_all()` in production
- **Auth:** JWT via python-jose, all endpoints require `get_current_user` dependency
- **Schemas:** Pydantic v2 with `model_config = {"from_attributes": True}`
- **Router pattern:** `APIRouter(prefix="/api/{resource}", tags=["{resource}"])`
- **XML generation:** lxml (programmatic) — NOT Jinja2 templates for XML
- **Monetary values:** Decimal arithmetic with NTC 3711 banker's rounding (FACT-11, Phase 3)

## Standard Stack

### Core (already installed — no new dependencies needed for CRUD)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| FastAPI | 0.135.x | REST API | Already in stack |
| SQLAlchemy | 2.0.x | ORM | Already in stack |
| Pydantic | v2 | Validation | Already in stack |
| Alembic | latest | Migrations | Already in stack |

### New Dependencies for Phase 2

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| openpyxl | 3.1.x | Excel (.xlsx) file parsing | Lightweight, no heavy deps like pandas. Read-only for import. MIT license. |
| python-multipart | latest | File upload support | Already in requirements.txt. Required for `UploadFile`. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| openpyxl | pandas | pandas pulls numpy + 50MB of deps. Overkill for reading a simple spreadsheet. openpyxl is ~3MB. |
| openpyxl | xlrd | xlrd only supports .xls (legacy format), not .xlsx |
| Static DANE seed | API call to DANE | DANE data changes extremely rarely (~once per decade). A static seed table is simpler, faster, and works offline. |

**Installation:**
```bash
pip install openpyxl
```

## Architecture Patterns

### Recommended Project Structure (Phase 2 additions)

```
backend/app/
├── models/
│   ├── client.py          # Client ORM model
│   ├── product.py         # Product/Service ORM model
│   └── dane.py            # Department + Municipality reference tables
├── schemas/
│   ├── client.py          # ClientCreate, ClientUpdate, ClientResponse
│   ├── product.py         # ProductCreate, ProductUpdate, ProductResponse
│   ├── dane.py            # DepartmentResponse, MunicipalityResponse
│   └── imports.py         # ImportResult schema
├── routers/
│   ├── clients.py         # /api/clients CRUD + import
│   ├── products.py        # /api/products CRUD + import
│   └── dane.py            # /api/dane/departments, /api/dane/municipalities
├── services/
│   ├── import_service.py  # CSV/Excel parsing + validation logic
│   └── dane_service.py    # DANE lookup queries
└── scripts/
    └── seed_dane.py       # DANE DIVIPOLA data seeder (run via Alembic data migration)
```

### Pattern 1: CRUD Router (follow existing resolution pattern)

**What:** Standard CRUD endpoints following the established pattern in `routers/resolutions.py`
**When to use:** All catalog entities (clients, products)

```python
# Follow exact pattern from resolutions.py
router = APIRouter(prefix="/api/clients", tags=["clients"])

@router.get("", response_model=list[ClientResponse])
async def list_clients(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Client).order_by(Client.id.desc())
    )
    return result.scalars().all()
```

### Pattern 2: File Import Endpoint

**What:** Accept CSV or Excel file via `UploadFile`, parse, validate each row, return results
**When to use:** CATL-04 and CATL-05

```python
from fastapi import UploadFile, File

@router.post("/import", response_model=ImportResult)
async def import_clients(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in [
        "text/csv",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]:
        raise HTTPException(400, "Formato no soportado. Use CSV o Excel (.xlsx)")

    content = await file.read()
    result = await import_service.process_client_file(content, file.content_type, db)
    return result
```

### Pattern 3: DANE Geographic Lookup with Search

**What:** Searchable dropdown backed by pre-seeded reference table
**When to use:** CATL-03

```python
@router.get("/municipalities", response_model=list[MunicipalityResponse])
async def search_municipalities(
    q: str = Query("", min_length=0),
    department_code: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Municipality)
    if department_code:
        stmt = stmt.where(Municipality.department_code == department_code)
    if q:
        stmt = stmt.where(Municipality.name.ilike(f"%{q}%"))
    stmt = stmt.limit(50)
    result = await db.execute(stmt)
    return result.scalars().all()
```

### Anti-Patterns to Avoid

- **Don't store DANE codes as enums:** 1,125 municipalities as a Python enum is unmaintainable. Use a database table.
- **Don't use pandas for import:** Adds ~50MB dependency for a task that openpyxl + csv stdlib handle perfectly.
- **Don't skip DIAN code validation:** Client document types, tax codes, and unit of measure codes must be validated against DIAN's official tables. Invalid codes cause DIAN rejection at invoice time.
- **Don't use String for monetary amounts:** Use `Numeric(precision=18, scale=2)` for prices. This is critical for Phase 3 decimal arithmetic.

## DIAN Code Tables Reference

### Document Type Codes (Tabla 13.2.1 — cbc:CompanyID@schemeName)

These are the identification document types for clients (adquirientes):

| Code | Description | Common Name |
|------|-------------|-------------|
| 11 | Registro civil de nacimiento | Registro Civil |
| 12 | Tarjeta de identidad | TI |
| 13 | Cédula de ciudadanía | CC |
| 21 | Tarjeta de extranjería | TE |
| 22 | Cédula de extranjería | CE |
| 31 | NIT | NIT |
| 41 | Pasaporte | Pasaporte |
| 42 | Documento de identificación extranjero | DIE |
| 47 | PEP (Permiso Especial de Permanencia) | PEP |
| 48 | PPT (Permiso Protección Temporal) | PPT (new in v1.9) |
| 50 | NIT de otro país | NIT Extranjero |
| 91 | NUIP | NUIP (only for buyers) |

**For this project (persona natural / microempresa):** The most commonly used are **13 (CC)**, **31 (NIT)**, **22 (CE)**, **41 (Pasaporte)**, and **50 (NIT de otro país)**. Store the full table but highlight these in the UI.

### Fiscal Responsibility Codes (Tabla 13.2.6)

| Code | Description |
|------|-------------|
| O-13 | Gran contribuyente |
| O-15 | Autorretenedor |
| O-23 | Agente de retención IVA |
| O-47 | Régimen simple de tributación |
| R-99-PN | No responsable (régimen ordinario/común/especial) |

**Usage:** Each client can have one or more fiscal responsibilities. For most persona natural clients, the value will be `R-99-PN`. Store as a comma-separated string or a separate junction table.

### Tax Regime Codes

| Code | Description |
|------|-------------|
| 04 | Simplificado (No Responsable IVA) |
| 05 | Ordinario / Común |
| 48 | Impuesto sobre las ventas — IVA (Responsable) |
| 49 | No responsable |

**For UBL:** Maps to `cac:TaxScheme` within the `AccountingCustomerParty` section.

### Tax/Tribute Codes (Tabla 13.2.11 — for products)

| Code | Name | Rates | Scope |
|------|------|-------|-------|
| 01 | IVA | 0%, 5%, 19% | Main tax — required for every invoice line |
| 04 | INC | 2%, 4%, 8%, 16% | National consumption tax (restaurants, telecom) |
| 05 | ReteIVA | various | IVA withholding |
| 06 | ReteRenta (Retefuente) | various | Income withholding |
| 07 | ReteICA | various | ICA withholding |

**For Phase 2 scope:** Focus on IVA (01) with rates 0%, 5%, 19%. Withholdings (05, 06, 07) are part of FACT-10 in Phase 3 but the product model should have a field for the default IVA rate.

### Unit of Measure Codes (UNECE Rec. 20 — Tabla 13.3.6)

Most commonly used for Colombian invoicing:

| Code | Description | Typical Use |
|------|-------------|-------------|
| 94 | Unidad | General products, default |
| EA | Cada uno (Each) | Individual items |
| NAR | Número de artículos | Count-based items |
| KGM | Kilogramo | Weight-based |
| GRM | Gramo | Small weight |
| LTR | Litro | Liquid volume |
| MTR | Metro | Length |
| MTK | Metro cuadrado | Area |
| MTQ | Metro cúbico | Volume |
| HUR | Hora | Time-based services |
| DAY | Día | Daily services |
| MON | Mes | Monthly services |
| ANN | Año | Annual services |
| GLL | Galón | Fuel/liquid |
| DZN | Docena | Dozen |
| ZZ | Mutuamente definido | Custom/other |

**Recommendation:** Store the ~30 most common codes as a seed table. Let the user select from a dropdown. The full UNECE Rec. 20 list has 1,800+ codes — only seed the ones relevant to Colombian commerce.

## Client (Tercero/Adquiriente) Data Model

### Required Fields for UBL 2.1 AccountingCustomerParty

Based on DIAN Anexo Técnico v1.9:

| Field | UBL Element | Required | Type | Notes |
|-------|-------------|----------|------|-------|
| Document type | `cbc:CompanyID@schemeName` | YES | Code (see table above) | e.g., "13" for CC, "31" for NIT |
| Document number | `cbc:CompanyID` | YES | String | The actual NIT/CC number |
| Check digit (DV) | `cbc:CompanyID@schemeID` | Conditional | String(1) | Required when doc type = 31 (NIT) |
| Business/person name | `cbc:RegistrationName` | YES | String | Razón social or full name |
| Trade name | `cbc:Name` (PartyName) | NO | String | Nombre comercial (optional) |
| Email | `cac:Contact/cbc:ElectronicMail` | YES | String | DIAN requires for delivery |
| Phone | `cac:Contact/cbc:Telephone` | NO | String | Optional |
| Address line | `cac:AddressLine/cbc:Line` | YES | String | Street address |
| City code | `cbc:ID` (in Address) | YES | String(5) | DANE municipality code |
| City name | `cbc:CityName` | YES | String | Municipality name |
| Department code | `cbc:CountrySubentityCode` | YES | String(2) | DANE department code |
| Department name | `cbc:CountrySubentity` | YES | String | Department name |
| Country code | `cbc:IdentificationCode` | YES | String(2) | "CO" for Colombia |
| Postal code | `cbc:PostalZone` | NO | String | Optional but recommended |
| Fiscal responsibilities | `cbc:TaxLevelCode` | YES | Code | O-13, O-15, O-23, O-47, or R-99-PN |
| Tax regime | `cbc:TaxScheme/Name` | YES | Code | See tax regime codes above |

### Recommended SQLAlchemy Model

```python
class Client(Base):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # Identification
    document_type: Mapped[str] = mapped_column(String(5), nullable=False)  # DIAN code: 13, 31, etc.
    document_number: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    check_digit: Mapped[str | None] = mapped_column(String(1), nullable=True)  # DV, only for NIT

    # Name
    business_name: Mapped[str] = mapped_column(String(255), nullable=False)  # Razón social
    trade_name: Mapped[str | None] = mapped_column(String(255), nullable=True)  # Nombre comercial

    # Contact
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)

    # Address
    address_line: Mapped[str] = mapped_column(Text, nullable=False)
    department_code: Mapped[str] = mapped_column(String(2), nullable=False)  # DANE code
    municipality_code: Mapped[str] = mapped_column(String(5), nullable=False)  # DANE code
    postal_code: Mapped[str | None] = mapped_column(String(10), nullable=True)

    # Fiscal
    fiscal_responsibilities: Mapped[str] = mapped_column(String(50), nullable=False, default="R-99-PN")
    tax_regime: Mapped[str] = mapped_column(String(10), nullable=False, default="49")

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
```

## Product/Service Data Model

### Required Fields for UBL 2.1 InvoiceLine

| Field | UBL Element | Required | Type | Notes |
|-------|-------------|----------|------|-------|
| Description | `cbc:Description` | YES | String | Product/service description |
| Seller code | `cac:SellersItemIdentification/cbc:ID` | YES | String | Internal product code |
| Standard code | `cac:StandardItemIdentification/cbc:ID` | NO | String | e.g., UNSPSC code (optional) |
| Unit price | `cbc:PriceAmount` | YES | Decimal | Unit price before tax |
| Unit of measure | `cbc:UnitCode` | YES | Code | UNECE Rec. 20 code |
| IVA tax code | `cac:TaxScheme/cbc:ID` | YES | Code | "01" for IVA |
| IVA rate | `cbc:Percent` | YES | Decimal | 0.00, 5.00, or 19.00 |

### Recommended SQLAlchemy Model

```python
class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # Identification
    internal_code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # Pricing
    unit_price: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)

    # Tax
    tax_code: Mapped[str] = mapped_column(String(5), nullable=False, default="01")  # 01 = IVA
    tax_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=Decimal("19.00"))

    # Unit of measure
    unit_measure_code: Mapped[str] = mapped_column(String(5), nullable=False, default="94")  # 94 = Unidad

    # Optional
    standard_code: Mapped[str | None] = mapped_column(String(50), nullable=True)  # UNSPSC or similar

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
```

## DANE Geographic Data

### Structure

Colombia's DIVIPOLA (División Político-Administrativa) system:
- **33 departments** (including Bogotá D.C.)
- **~1,125 municipalities**
- Each municipality has a 5-digit code: first 2 digits = department, last 3 = municipality within department

### Data Source

Official DANE download: `https://geoportal.dane.gov.co/descargas/divipola/DIVIPOLA_Municipios.xlsx`

Also available as open data: `https://www.datos.gov.co/Mapas-Nacionales/DIVIPOLA-C-digos-municipios/gdxc-w37w` (JSON/CSV API)

### Storage Strategy

**Use two reference tables seeded via Alembic data migration:**

```python
class Department(Base):
    __tablename__ = "dane_departments"
    code: Mapped[str] = mapped_column(String(2), primary_key=True)  # "05", "08", etc.
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # "Antioquia", "Atlántico"

class Municipality(Base):
    __tablename__ = "dane_municipalities"
    code: Mapped[str] = mapped_column(String(5), primary_key=True)  # "05001", "08001"
    department_code: Mapped[str] = mapped_column(String(2), ForeignKey("dane_departments.code"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # "Medellín", "Barranquilla"
```

**Seeding approach:** Download the DANE Excel file once, extract the data, and embed it as a Python dict in an Alembic data migration. This ensures the data is always available without external dependencies at runtime.

### Query Pattern for Searchable Dropdown

Frontend sends `GET /api/dane/municipalities?q=med&department_code=05` → Backend does `ILIKE '%med%'` → Returns `[{code: "05001", name: "Medellín", department_code: "05"}]`

Limit results to 50 to keep the dropdown responsive. The frontend should use a searchable combobox (shadcn/ui `<Combobox>` component).

## CSV/Excel Import

### File Format Support

| Format | Library | Content-Type |
|--------|---------|--------------|
| CSV | `csv` (stdlib) | `text/csv` |
| Excel (.xlsx) | `openpyxl` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |

### Import Flow

1. User uploads file via `POST /api/clients/import` (or `/api/products/import`)
2. Backend reads file content into memory (files are small — max ~10,000 rows)
3. Parse header row, validate column names match expected template
4. For each data row:
   a. Validate required fields present
   b. Validate document type code against DIAN table
   c. Validate municipality code against DANE table (for clients)
   d. Validate tax code and unit of measure (for products)
   e. Check for duplicate document_number (for clients) or internal_code (for products)
5. Return `ImportResult` with counts and row-level errors

### Import Result Schema

```python
class ImportRowError(BaseModel):
    row: int
    field: str
    message: str

class ImportResult(BaseModel):
    total_rows: int
    imported: int
    skipped: int
    errors: list[ImportRowError]
```

### Template Columns

**Client CSV/Excel template:**
```
tipo_documento | numero_documento | digito_verificacion | razon_social | nombre_comercial | email | telefono | direccion | codigo_departamento | codigo_municipio | responsabilidad_fiscal | regimen_tributario
```

**Product CSV/Excel template:**
```
codigo_interno | descripcion | precio_unitario | codigo_impuesto | tarifa_impuesto | unidad_medida
```

### Parsing Pattern

```python
import csv
import io
from openpyxl import load_workbook

def parse_file(content: bytes, content_type: str) -> list[dict]:
    if content_type == "text/csv":
        text = content.decode("utf-8-sig")  # Handle BOM from Excel-exported CSV
        reader = csv.DictReader(io.StringIO(text))
        return list(reader)
    else:
        wb = load_workbook(filename=io.BytesIO(content), read_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
        headers = [str(h).strip().lower() for h in rows[0]]
        return [dict(zip(headers, row)) for row in rows[1:]]
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Excel parsing | Custom binary parser | openpyxl | Excel format is complex; openpyxl handles all edge cases |
| NIT check digit | — | Existing `services/nit.py` | Already built in Phase 1 |
| Geographic dropdown | Hardcoded list | DANE DIVIPOLA seed table | Official source, updatable |
| Searchable select | Custom component | shadcn/ui Combobox | Accessible, keyboard navigable, virtualized |
| Data table with pagination | Custom table | shadcn/ui DataTable + TanStack Table | Sorting, filtering, pagination built-in |

## Common Pitfalls

### Pitfall 1: Missing Check Digit for NIT Clients
**What goes wrong:** DIAN rejects invoices if NIT clients don't have a valid DV (dígito de verificación)
**Why it happens:** Developers make DV optional for all document types instead of required-when-NIT
**How to avoid:** Conditional validation — if `document_type == "31"`, require `check_digit` and validate with existing NIT service
**Warning signs:** NIT clients saved without DV

### Pitfall 2: Wrong DANE Code Format
**What goes wrong:** Municipality code stored as integer loses leading zeros (e.g., "05001" becomes "5001")
**Why it happens:** Excel and CSV parsers may auto-convert to int
**How to avoid:** Always store DANE codes as `String`, not `Integer`. When parsing imports, zero-pad to 5 digits.
**Warning signs:** Join queries fail, DIAN rejects address codes

### Pitfall 3: Decimal Precision for Prices
**What goes wrong:** Floating point arithmetic causes rounding errors in invoice totals
**Why it happens:** Using `Float` column type instead of `Numeric`
**How to avoid:** Use `Numeric(18, 2)` in SQLAlchemy, `Decimal` in Python. Never use `float` for money.
**Warning signs:** Invoice totals off by fractions of a peso

### Pitfall 4: CSV Encoding Issues
**What goes wrong:** Import fails on Spanish characters (ñ, á, é, etc.)
**Why it happens:** File saved with Latin-1 encoding instead of UTF-8
**How to avoid:** Try UTF-8 first (with BOM detection via `utf-8-sig`), fall back to `latin-1`
**Warning signs:** Names appear garbled or import throws UnicodeDecodeError

### Pitfall 5: Consumidor Final Special Case
**What goes wrong:** Invoices to "consumidor final" (anonymous buyer) fail
**Why it happens:** No special client entry for anonymous sales
**How to avoid:** Seed a default "Consumidor Final" client with NIT `222222222222` and document type `13`. This is DIAN's official placeholder.
**Warning signs:** User can't create invoice without selecting a client

### Pitfall 6: Fiscal Responsibility as Single Value
**What goes wrong:** A client can have MULTIPLE fiscal responsibilities (e.g., O-13 AND O-15)
**Why it happens:** Storing as a single enum instead of allowing multiple values
**How to avoid:** Store as semicolon-separated string (DIAN convention: `"O-13;O-15"`) or use a junction table
**Warning signs:** Large taxpayers who are also self-withholders can't be properly represented

## Code Examples

### Alembic Migration for DANE Seed Data

```python
# alembic/versions/xxx_seed_dane_data.py
from alembic import op
import sqlalchemy as sa

# Embed a subset — full list has ~1,125 entries
DEPARTMENTS = [
    ("05", "Antioquia"),
    ("08", "Atlántico"),
    ("11", "Bogotá, D.C."),
    ("13", "Bolívar"),
    # ... all 33 departments
]

MUNICIPALITIES = [
    ("05001", "05", "Medellín"),
    ("05002", "05", "Abejorral"),
    ("08001", "08", "Barranquilla"),
    ("11001", "11", "Bogotá, D.C."),
    # ... all ~1,125 municipalities
]

def upgrade():
    # Create tables first (if not done in a prior migration)
    departments = sa.table("dane_departments",
        sa.column("code", sa.String),
        sa.column("name", sa.String),
    )
    municipalities = sa.table("dane_municipalities",
        sa.column("code", sa.String),
        sa.column("department_code", sa.String),
        sa.column("name", sa.String),
    )

    op.bulk_insert(departments, [{"code": c, "name": n} for c, n in DEPARTMENTS])
    op.bulk_insert(municipalities, [{"code": c, "department_code": d, "name": n} for c, d, n in MUNICIPALITIES])
```

### Pydantic Schema with Conditional Validation

```python
from pydantic import BaseModel, model_validator

class ClientCreate(BaseModel):
    document_type: str  # DIAN code: "13", "31", etc.
    document_number: str
    check_digit: str | None = None
    business_name: str
    trade_name: str | None = None
    email: str
    phone: str | None = None
    address_line: str
    department_code: str
    municipality_code: str
    postal_code: str | None = None
    fiscal_responsibilities: str = "R-99-PN"
    tax_regime: str = "49"

    @model_validator(mode="after")
    def validate_nit_check_digit(self):
        if self.document_type == "31" and not self.check_digit:
            raise ValueError("Dígito de verificación es obligatorio para NIT")
        return self
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pandas for all file parsing | openpyxl for Excel, csv stdlib for CSV | 2024+ | Lighter dependencies, faster startup |
| DANE codes hardcoded in frontend | Database-seeded reference table | Standard practice | Updatable, queryable, shared across frontend/backend |
| Single fiscal responsibility | Multiple responsibilities (semicolon-separated) | DIAN Anexo v1.8+ (Aug 2020) | Must support multi-value fiscal responsibilities |
| PPT document type | Added code 48 (PPT) | DIAN Anexo v1.9 (Feb 2024) | Must include in document type dropdown |

## Open Questions

1. **UNSPSC Standard Item Code**
   - What we know: DIAN accepts `StandardItemIdentification` with UNSPSC codes (schemeID="001")
   - What's unclear: Is it mandatory for any document type, or always optional?
   - Recommendation: Make it optional in the product model. Not required for basic invoicing.

2. **Consumidor Final auto-seed**
   - What we know: DIAN uses "222222222222" for anonymous buyers
   - What's unclear: Should this be auto-seeded as a default client, or left for the user to create?
   - Recommendation: Auto-seed via Alembic migration. Almost every business needs this.

3. **Multiple Tax Codes per Product**
   - What we know: A product could theoretically have IVA + INC
   - What's unclear: How common is this for persona natural / microempresa target users?
   - Recommendation: Keep it simple for Phase 2 — one tax code per product (IVA). Phase 3 can add INC support if needed.

## Sources

### Primary (HIGH confidence)
- [DIAN Anexo Técnico v1.9 (PDF)](https://www.dian.gov.co/impuestos/factura-electronica/Documents/Anexo-Tecnico-Factura-Electronica-de-Venta-vr-1-9.pdf) — UBL field requirements, code tables
- [DIAN Documentación Técnica](https://www.dian.gov.co/impuestos/factura-electronica/documentacion/Paginas/documentacion-tecnica.aspx) — Official portal
- [DANE DIVIPOLA Download](https://geoportal.dane.gov.co/descargas/divipola/DIVIPOLA_Municipios.xlsx) — Official municipality dataset
- [DANE Datos Abiertos - DIVIPOLA](https://www.datos.gov.co/Mapas-Nacionales/DIVIPOLA-C-digos-municipios/gdxc-w37w) — Open data API

### Secondary (MEDIUM confidence)
- [The Factory HKA Wiki — Code Tables](https://felcowiki.thefactoryhka.com.co/index.php/Tablas_de_c%C3%B3digos_de_propiedades_para_emisi%C3%B3n_de_documentos_-_Indice_Manual_Integraci%C3%B3n_Directa) — Community-maintained code table reference, cross-verified with DIAN annexes
- [MisFacturas - Minimum Client Info](https://soporte.misfacturas.com.co/hc/es-419/articles/42939445936532) — Third-party invoicing platform requirements guide
- [Asesorías Tributarias — Unit Codes](https://asesoriastributarias.com.co/conozca-los-codigos-dian-para-las-unidades-de-medida/) — Unit of measure reference
- [Gerencie — Fiscal Responsibility Codes](https://www.gerencie.com/codigo-de-las-responsabilidades-tributarias-que-puede-tener-un-contribuyente-en-el-rut.html) — RUT responsibility codes

### Tertiary (LOW confidence)
- None — all findings verified with at least two sources

## Metadata

**Confidence breakdown:**
- DIAN client fields: HIGH — verified against Anexo Técnico v1.9 + third-party implementations
- DIAN product/tax codes: HIGH — verified against Anexo Técnico v1.9 + community wiki
- DANE geographic data: HIGH — official DANE dataset with known structure
- CSV/Excel import: HIGH — standard Python libraries, well-documented patterns
- Architecture patterns: HIGH — follows established Phase 1 codebase conventions

**Research date:** 2026-03-27
**Valid until:** 2026-06-27 (DIAN code tables are stable; DANE data changes rarely)
