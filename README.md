# DIAN Facturador

Software open source de facturacion electronica para Colombia. Permite generar facturas de venta, notas credito, notas debito y cotizaciones con integracion directa a los servicios web de la DIAN.

Diseñado para **personas naturales y microempresas** que necesitan facturar electronicamente sin depender de software costoso o complicado.

## Caracteristicas

- Facturacion electronica con XML UBL 2.1 y firma digital XAdES-EPES
- Envio directo a la DIAN via SOAP (habilitacion y produccion)
- Facturas de venta, notas credito, notas debito y cotizaciones
- Generacion de PDF con QR y codigo CUFE
- Calculo automatico de CUFE/CUDE (SHA-384)
- Validacion de NIT con digito de verificacion
- Catalogos de clientes y productos con codigos DANE
- Importacion de datos desde CSV/Excel
- Busqueda y exportacion de documentos
- Instalacion con un solo comando (`docker-compose up`)
- Instalador nativo para Windows (.exe) — sin Docker ni terminal

## Requisitos previos

Antes de usar DIAN Facturador necesitas:

1. **Certificado digital (.p12 o .pfx)** — Emitido por una entidad certificadora autorizada por la ONAC (ej. Certicamara, GSE). Es el certificado de firma electronica de tu negocio.

2. **Resolucion de facturacion de la DIAN** — Autorizacion de numeracion vigente con prefijo, rango de inicio/fin, clave tecnica y fecha de vencimiento.

3. **NIT activo** — Tu Numero de Identificacion Tributaria como persona natural o microempresa.

## Instalacion

### Opcion 1: Docker (recomendado para servidores)

Requisitos: [Docker](https://docs.docker.com/get-docker/) y [Docker Compose](https://docs.docker.com/compose/install/).

```bash
# 1. Clonar el repositorio
git clone https://github.com/edwinrubio/DianFacturador.git
cd dian-facturador

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores:
#   DB_USER, DB_PASSWORD, DB_NAME
#   SECRET_KEY (generar con: openssl rand -hex 32)
#   FERNET_KEY (generar con: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")

# 3. Iniciar la aplicacion
docker-compose up -d

# 4. Abrir en el navegador
# http://localhost
```

La aplicacion levanta 3 servicios:
- **PostgreSQL 16** — Base de datos
- **FastAPI** — Backend API (migraciones Alembic se ejecutan automaticamente al iniciar)
- **Nginx** — Sirve el frontend React y hace proxy al backend

### Opcion 2: Instalador Windows (.exe)

Para usuarios que no quieren usar Docker ni terminal.

1. Descarga el instalador `.exe` desde [GitHub Releases](https://github.com/edwinrubio/DianFacturador/releases)
2. Ejecuta el instalador (Next > Next > Install)
3. La aplicacion se abre automaticamente

El instalador incluye todo: PostgreSQL embebido, backend Python y frontend React. No necesitas instalar nada mas. La aplicacion se inicia automaticamente con Windows (minimizada en la bandeja del sistema).

Las actualizaciones se descargan automaticamente desde GitHub Releases.

### Opcion 3: Instalacion manual

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
# Configurar DATABASE_URL, SECRET_KEY, FERNET_KEY como variables de entorno
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Frontend
cd frontend
npm install
npm run build
# Servir dist/ con nginx u otro servidor estatico
```

## Configuracion inicial

Al acceder por primera vez, la aplicacion te guia paso a paso:

1. **Login** — Usuario por defecto: `admin` / `admin` (cambiar inmediatamente)
2. **Perfil del negocio** — NIT, razon social, regimen fiscal, direccion
3. **Certificado digital** — Subir archivo .p12 y contraseña
4. **Resoluciones de numeracion** — Prefijo, rango, clave tecnica, vencimiento
5. **Ambiente DIAN** — Elegir entre habilitacion (pruebas) o produccion

La aplicacion queda bloqueada hasta completar todos los pasos de configuracion.

## Stack tecnologico

| Componente | Tecnologia |
|------------|------------|
| Backend | Python 3.12+, FastAPI, SQLAlchemy 2.0, Alembic |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4, shadcn/ui |
| Base de datos | PostgreSQL 16 |
| XML | lxml (UBL 2.1) |
| Firma digital | signxml (XAdES-EPES), cryptography |
| SOAP | zeep (WS-Security) |
| PDF | WeasyPrint + Jinja2 |
| Desktop | Electron + PyInstaller |
| CI/CD | GitHub Actions |

## Estructura del proyecto

```
dian-facturador/
├── backend/                 # API FastAPI
│   ├── app/
│   │   ├── main.py          # Punto de entrada FastAPI
│   │   ├── models/          # Modelos SQLAlchemy
│   │   ├── routers/         # Endpoints API
│   │   ├── schemas/         # Schemas Pydantic
│   │   ├── services/        # Logica de negocio
│   │   └── templates/       # Plantillas Jinja2 (PDF)
│   ├── alembic/             # Migraciones de base de datos
│   ├── tests/               # Tests pytest
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                # SPA React
│   ├── src/
│   │   ├── components/      # Componentes React + shadcn/ui
│   │   ├── pages/           # Paginas de la aplicacion
│   │   ├── hooks/           # Custom hooks (TanStack Query)
│   │   └── lib/             # Utilidades (API client, helpers)
│   ├── package.json
│   └── Dockerfile
├── electron/                # Empaquetado desktop Windows
│   ├── main.js              # Proceso principal Electron
│   ├── updater.js           # Auto-actualizacion
│   ├── tray.js              # Icono bandeja del sistema
│   └── package.json         # Config electron-builder + NSIS
├── docker-compose.yml       # Orquestacion Docker
├── .env.example             # Variables de entorno de ejemplo
└── .github/workflows/       # CI: build Windows installer
```

## Normativa DIAN

Este software cumple con:

- **Resolucion 000165 de 2023** — Facturacion electronica
- **Anexo Tecnico v1.9** — Especificacion tecnica (obligatorio desde Feb 2024)
- **UBL 2.1** — Formato XML de documentos electronicos
- **XAdES-EPES** — Firma digital (ETSI TS 101 903)
- **SHA-384** — Algoritmo para calculo de CUFE/CUDE
- **SOAP + WS-Security** — Comunicacion con servicios web DIAN

## Desarrollo

```bash
# Backend (modo desarrollo)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (modo desarrollo)
cd frontend
npm install
npm run dev    # Vite dev server en http://localhost:5173

# Tests
cd backend && pytest
cd frontend && npm test
```

## Contribuir

1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/mi-feature`)
3. Haz tus cambios y escribe tests
4. Commit (`git commit -m "feat: descripcion del cambio"`)
5. Push (`git push origin feature/mi-feature`)
6. Abre un Pull Request

## Licencia

Open source. Ver archivo LICENSE para detalles.

---

**DIAN Facturador** — Facturacion electronica para todos.
