# -*- mode: python ; coding: utf-8 -*-
# backend/backend.spec
#
# PyInstaller spec file for the DIAN Facturador FastAPI backend sidecar.
#
# Build command (run from backend/ directory on Windows):
#   pyinstaller backend.spec --distpath dist --clean
#
# Output: dist/backend/ (onedir bundle)
#   dist/backend/backend.exe   — main executable
#   dist/backend/*.dll         — Python runtime + all native extensions
#
# WeasyPrint GTK DLLs (libpango, libcairo, etc.) are NOT bundled here.
# The build_backend.bat script copies them into dist/backend/gtk-dlls/
# after PyInstaller completes. The Electron main process sets
# WEASYPRINT_DLL_DIRECTORIES before spawning this sidecar.
#
# UPX is explicitly disabled — UPX-compressed .exe files trigger antivirus
# false positives more frequently. The ~200MB bundle size is acceptable per D-04.

import sys
from PyInstaller.utils.hooks import collect_submodules, collect_data_files

block_cipher = None

# ---------------------------------------------------------------------------
# Hidden imports
# These packages use dynamic/string-based imports that PyInstaller's static
# analysis cannot detect automatically.
# ---------------------------------------------------------------------------

hidden_imports = [
    # asyncpg — Cython extension modules not auto-detected by PyInstaller
    'asyncpg.pgproto.pgproto',
    'asyncpg.protocol.protocol',

    # uvicorn — internal plugins loaded via string-based import (importlib)
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.loops.asyncio',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.http.h11_impl',
    'uvicorn.protocols.http.httptools_impl',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'uvicorn.lifespan.off',

    # SQLAlchemy dialects — asyncpg uses 'postgresql+asyncpg' dialect
    'sqlalchemy.dialects.postgresql',

    # Alembic — needed for programmatic migration API in electron_entrypoint.py
    'alembic',
    'alembic.config',
    'alembic.command',
    'alembic.runtime.migration',
    'alembic.runtime.environment',
    'alembic.script',
    'alembic.op',

    # FastAPI / Pydantic — email validation used by pydantic EmailStr fields
    'email_validator',

    # lxml — Cython extensions not auto-detected
    'lxml._elementpath',
    'lxml.etree',
]

# Packages that rely heavily on dynamic imports / plugin systems.
# collect_submodules walks the installed package and adds every submodule.
hidden_imports += collect_submodules('cryptography')
hidden_imports += collect_submodules('signxml')
hidden_imports += collect_submodules('zeep')
hidden_imports += collect_submodules('passlib')
hidden_imports += collect_submodules('alembic')

# ---------------------------------------------------------------------------
# Data files
# These non-Python files must be included in the bundle for the app to work.
# Paths are relative to the spec file location (backend/).
# ---------------------------------------------------------------------------

datas = [
    # Alembic migration scripts — needed at runtime for programmatic upgrade
    ('../alembic', 'alembic'),

    # Alembic configuration — electron_entrypoint.py reads this for script_location
    ('../alembic.ini', '.'),

    # Jinja2 invoice templates — used by pdf_service.py (WeasyPrint)
    ('../app/templates', 'app/templates'),
]

# WeasyPrint bundles CSS user-agent stylesheet and other data files
datas += collect_data_files('weasyprint')

# signxml bundles XSD schemas for XML validation
datas += collect_data_files('signxml')

# Alembic bundles script templates (needed when programmatic API generates scripts)
datas += collect_data_files('alembic')

# ---------------------------------------------------------------------------
# Analysis
# ---------------------------------------------------------------------------

a = Analysis(
    ['electron_entrypoint.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=hidden_imports,
    hookspath=['hooks'],    # custom hooks directory in backend/hooks/ (can be empty)
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter',          # GUI toolkit — not needed for backend sidecar
        'PyQt5',            # Qt GUI toolkit — not needed
        'wx',               # wxPython GUI toolkit — not needed
        'matplotlib',       # plotting — not needed
        'numpy',            # numerical — not needed (WeasyPrint uses Pillow instead)
        'scipy',            # scientific — not needed
        'IPython',          # REPL — not needed
        'notebook',         # Jupyter — not needed
        'sphinx',           # docs — not needed
        'docutils',         # docs — not needed
        'pytest',           # testing — not needed in production bundle
    ],
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='backend',
    icon='../electron/build/icon.ico',  # created in plan 05-03
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,      # UPX disabled — reduces antivirus false positives
    console=False,  # no terminal window — backend runs as hidden sidecar
)

coll = COLLECT(
    exe,
    a.pure,
    a.zipfiles,
    a.datas,
    *a.binaries,
    strip=False,
    upx=False,      # UPX disabled — consistent with EXE setting above
    upx_exclude=[],
    name='backend',
)
