"""
PyInstaller entry point for the DIAN Facturador backend sidecar.

This module is the --entry-point used by backend.spec. When PyInstaller bundles
this into backend.exe (onedir mode), it sets sys._MEIPASS to the extracted
bundle directory. We chdir there so that all relative paths (alembic.ini,
alembic/, app/templates/) resolve correctly.

Key design decisions:
- Alembic migrations run BEFORE uvicorn starts, using the programmatic API.
  DO NOT use subprocess.run([sys.executable, '-m', 'alembic', ...]) inside a
  PyInstaller bundle — sys.executable points to backend.exe, not a Python
  interpreter, so that would re-launch the application instead of running
  Alembic.
- Port defaults to 8765 to avoid conflicts with other local services.
  Binding to 127.0.0.1 prevents Windows Firewall dialogs (0.0.0.0 triggers them).
- BACKEND_PORT and BACKEND_HOST are set by the Electron main process.
"""

import sys
import os

# PyInstaller sets sys._MEIPASS to the extracted bundle directory.
# Change to that directory so all relative file references (alembic.ini,
# alembic/ migrations, app/templates/) work correctly inside the bundle.
if hasattr(sys, '_MEIPASS'):
    os.chdir(sys._MEIPASS)


def run_migrations() -> None:
    """Run alembic upgrade head programmatically.

    Uses the in-process Alembic API (alembic.config.Config + alembic.command.upgrade)
    instead of subprocess. This is CRITICAL inside a PyInstaller onedir bundle because:
    - sys.executable is backend.exe, not a Python interpreter
    - Calling subprocess.run([sys.executable, '-m', 'alembic', ...]) would restart
      the application entry point, NOT invoke the Alembic CLI

    Raises on failure — the caller (Electron main process) should show an error
    dialog if migrations fail (per constraint D-07).
    """
    from alembic.config import Config
    from alembic import command

    alembic_cfg = Config(os.path.join(os.getcwd(), 'alembic.ini'))
    # Override script_location to be absolute, relative to bundle root.
    # This ensures Alembic finds migration scripts regardless of the working
    # directory at startup.
    alembic_cfg.set_main_option(
        'script_location',
        os.path.join(os.getcwd(), 'alembic')
    )
    command.upgrade(alembic_cfg, 'head')


if __name__ == '__main__':
    # Step 1: Run database migrations (Alembic upgrade head)
    run_migrations()

    # Step 2: Start the FastAPI application via uvicorn
    import uvicorn
    from app.main import app  # noqa: F401 — import must be after sys._MEIPASS chdir

    port = int(os.environ.get('BACKEND_PORT', '8765'))
    host = os.environ.get('BACKEND_HOST', '127.0.0.1')
    uvicorn.run(app, host=host, port=port, log_level='info')
