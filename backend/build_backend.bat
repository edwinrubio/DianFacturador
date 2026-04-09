@echo off
REM =============================================================================
REM build_backend.bat
REM Build the FastAPI backend as a standalone Windows .exe using PyInstaller.
REM
REM Prerequisites (Windows):
REM   - Python 3.12+ installed and on PATH
REM   - MSYS2 installed at C:\msys64 (for WeasyPrint GTK DLLs)
REM     Install MSYS2 from: https://www.msys2.org/
REM     Then run: pacman -S mingw-w64-x86_64-gtk3 mingw-w64-x86_64-pango
REM                         mingw-w64-x86_64-cairo mingw-w64-x86_64-gdk-pixbuf2
REM   - Run this script from the backend/ directory
REM
REM Output:
REM   dist\backend\backend.exe    — the sidecar executable
REM   dist\backend\gtk-dlls\      — WeasyPrint GTK DLLs (libpango, libcairo, etc.)
REM
REM The Electron main process (plan 05-03) sets WEASYPRINT_DLL_DIRECTORIES to
REM point at the gtk-dlls directory before spawning backend.exe.
REM =============================================================================

setlocal enabledelayedexpansion

echo [1/4] Installing Python dependencies...
pip install -r requirements.txt
if %ERRORLEVEL% neq 0 (
    echo ERROR: pip install failed with exit code %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)

pip install pyinstaller==6.19.0 pyinstaller-hooks-contrib
if %ERRORLEVEL% neq 0 (
    echo ERROR: PyInstaller install failed with exit code %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)

echo [2/4] Running PyInstaller...
pyinstaller backend.spec --distpath dist --clean
if %ERRORLEVEL% neq 0 (
    echo ERROR: PyInstaller failed with exit code %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)

echo [3/4] Copying GTK DLLs for WeasyPrint...
REM WeasyPrint requires Pango, Cairo, and GDK-Pixbuf DLLs from MSYS2.
REM These DLLs are NOT bundled by PyInstaller because they are not Python
REM extensions. They must be copied alongside the PyInstaller output.
REM
REM The Electron main process sets WEASYPRINT_DLL_DIRECTORIES to this directory
REM so WeasyPrint can find its native dependencies at runtime.

if not exist "dist\backend\gtk-dlls" mkdir dist\backend\gtk-dlls

REM Adjust MSYS2_BIN if MSYS2 is installed at a different path
set MSYS2_BIN=C:\msys64\mingw64\bin

if not exist "%MSYS2_BIN%" (
    echo WARNING: MSYS2 bin directory not found at %MSYS2_BIN%
    echo          WeasyPrint PDF generation will not work without GTK DLLs.
    echo          Install MSYS2 from https://www.msys2.org/ and run:
    echo          pacman -S mingw-w64-x86_64-gtk3 mingw-w64-x86_64-pango
    echo          pacman -S mingw-w64-x86_64-cairo mingw-w64-x86_64-gdk-pixbuf2
    goto :build_complete
)

REM Core WeasyPrint DLLs: Pango, Cairo, GDK-Pixbuf, and their transitive deps.
REM This list covers all DLLs required by WeasyPrint on Windows as determined
REM by WeasyPrint docs + community testing (MSYS2 mingw64 packages).
for %%d in (
    libpango-1.0-0.dll
    libpangocairo-1.0-0.dll
    libpangoft2-1.0-0.dll
    libcairo-2.dll
    libcairo-gobject-2.dll
    libgdk_pixbuf-2.0-0.dll
    libglib-2.0-0.dll
    libgobject-2.0-0.dll
    libgio-2.0-0.dll
    libharfbuzz-0.dll
    libfontconfig-1.dll
    libfreetype-6.dll
    zlib1.dll
    libffi-8.dll
    libbz2-1.dll
    libintl-8.dll
    libpcre2-8-0.dll
) do (
    if exist "%MSYS2_BIN%\%%d" (
        copy /Y "%MSYS2_BIN%\%%d" dist\backend\gtk-dlls\ >nul
        echo   Copied: %%d
    ) else (
        echo   WARNING: %%d not found in %MSYS2_BIN%
    )
)

:build_complete
echo [4/4] Build complete!
echo.
echo Output: dist\backend\backend.exe
echo.
if exist "dist\backend\backend.exe" (
    dir "dist\backend\backend.exe"
    echo.
    echo SUCCESS: backend.exe created.
) else (
    echo ERROR: dist\backend\backend.exe not found. Check PyInstaller output above.
    exit /b 1
)

endlocal
