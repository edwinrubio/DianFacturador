# DIAN Facturador

## What This Is

Software open source de facturación electrónica para Colombia, diseñado para personas naturales y microempresas. Permite generar facturas de venta, notas crédito, notas débito y cotizaciones con integración directa a los servicios web de la DIAN. Self-hosted — cada usuario lo instala en su máquina local o servidor.

## Core Value

Cualquier persona natural o microempresa puede facturar electrónicamente ante la DIAN sin depender de software costoso o complicado.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Facturación electrónica con integración DIAN (UBL 2.1, firma digital, web services)
- [ ] Generación de facturas de venta
- [ ] Generación de notas crédito
- [ ] Generación de notas débito
- [ ] Generación de cotizaciones
- [ ] Base de datos para control y consulta de documentos generados
- [ ] Interfaz web fácil de usar
- [ ] Instalación via Docker (docker-compose up)
- [ ] Instalación manual como alternativa
- [ ] Open source — código abierto

### Out of Scope

- Multi-tenant (múltiples negocios por instalación) — cada instalación es un solo negocio, simplifica el modelo de datos y seguridad
- Empresas SAS/LTDA — enfocado en persona natural y microempresas
- App móvil nativa — web-first, accesible desde cualquier navegador
- Nómina electrónica — fuera del alcance inicial, solo documentos de facturación
- Pagos en línea — el software genera documentos, no procesa pagos

## Context

- **Regulación DIAN:** Colombia exige facturación electrónica bajo resolución 000012 de 2021. Los documentos deben generarse en formato XML UBL 2.1, firmados digitalmente, y enviarse a los web services de la DIAN para validación.
- **Público objetivo:** Personas naturales y microempresas que hoy no facturan o usan herramientas costosas/complicadas (Siigo, Alegra, World Office).
- **Filosofía:** Extremadamente fácil de usar. Si alguien puede llenar un formulario, puede facturar.
- **Despliegue:** Docker como opción principal (docker-compose up), instalación manual como alternativa. Una instalación = un negocio.

## Constraints

- **Stack:** Backend/frontend a definir por investigación (usuario flexible), PostgreSQL como base de datos
- **Regulatorio:** Debe cumplir 100% con la normativa DIAN de facturación electrónica
- **Certificado digital:** El usuario debe tener su propio certificado de firma digital
- **Resolución de facturación:** El usuario debe tener autorización de numeración vigente de la DIAN

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Open source | Democratizar acceso a facturación electrónica para pequeños negocios | — Pending |
| PostgreSQL | Robusta, relacional, gratis — ideal para datos transaccionales | — Pending |
| Single-tenant | Simplifica modelo de datos, seguridad y despliegue | — Pending |
| Docker + manual install | Docker para facilidad, manual como alternativa para entornos sin Docker | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-26 after initialization*
