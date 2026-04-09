'use strict';

const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { execFile } = require('child_process');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const net = require('net');
const log = require('electron-log');

const { getSecretKey, getFernetKey } = require('./secrets');
const { createTray } = require('./tray');
const { setupAutoUpdater } = require('./updater');

// ─── Constants ────────────────────────────────────────────────────────────────

const BACKEND_PORT = 8765;
const BACKEND_HOST = '127.0.0.1';
const HEALTH_URL = `http://${BACKEND_HOST}:${BACKEND_PORT}/health`;

// Default PG port; may fall back to 5433 if 5432 is occupied
let PG_PORT = 5432;

// ─── Module-level state ───────────────────────────────────────────────────────

let backendProcess = null;
let mainWindow = null;
let isQuitting = false;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Return the path to bundled resources.
 * In packaged builds: process.resourcesPath (set by Electron).
 * In development: {__dirname}/resources
 */
function getResourcesPath() {
  return app.isPackaged
    ? process.resourcesPath
    : path.join(__dirname, 'resources');
}

/**
 * Return the userData directory (persisted across updates, not deleted on uninstall).
 */
function getUserData() {
  return app.getPath('userData');
}

/**
 * Promisified execFile wrapper with electron-log output.
 * @param {string} cmd - executable path
 * @param {string[]} args - arguments
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    log.info(`[runCommand] ${cmd} ${args.join(' ')}`);
    execFile(cmd, args, { windowsHide: true }, (err, stdout, stderr) => {
      if (stdout) log.info(`[runCommand stdout] ${stdout}`);
      if (stderr) log.warn(`[runCommand stderr] ${stderr}`);
      if (err) {
        reject(new Error(`${err.message}\nstderr: ${stderr}`));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

/**
 * Check if a TCP port is available (not in use).
 * @param {number} port
 * @returns {Promise<boolean>} true if port is free
 */
function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

/**
 * Load settings from userData/settings.json.
 * Returns default settings if file is missing or corrupt.
 * @returns {{ autostart: boolean }}
 */
function loadSettings() {
  const settingsFile = path.join(getUserData(), 'settings.json');
  try {
    if (fs.existsSync(settingsFile)) {
      const raw = fs.readFileSync(settingsFile, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    log.warn('[settings] Failed to read settings.json, using defaults:', e.message);
  }
  return { autostart: true };
}

/**
 * Persist settings to userData/settings.json.
 * @param {{ autostart: boolean }} settings
 */
function saveSettings(settings) {
  const settingsFile = path.join(getUserData(), 'settings.json');
  fs.mkdirSync(getUserData(), { recursive: true });
  fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf8');
}

// ─── PostgreSQL lifecycle ─────────────────────────────────────────────────────

/**
 * Attempt orphan cleanup: if PG_PORT is in use, try stopping the existing cluster.
 * Handles crash-recovery case (avoids "port already in use" on restart).
 */
async function cleanupOrphanPostgres() {
  const free = await isPortFree(PG_PORT);
  if (!free) {
    log.warn(`[postgres] Port ${PG_PORT} already in use — attempting orphan pg_ctl stop`);
    const pgBin = path.join(getResourcesPath(), 'pg16', 'bin', 'pg_ctl.exe');
    const pgData = path.join(getUserData(), 'postgres-data');
    try {
      await runCommand(pgBin, ['stop', '-D', pgData, '-m', 'fast']);
      log.info('[postgres] Orphan cluster stopped');
    } catch (e) {
      log.warn('[postgres] Could not stop orphan cluster (may be unrelated process):', e.message);
    }
  }
}

/**
 * Select PG_PORT: prefer 5432, fall back to 5433 if occupied.
 */
async function selectPgPort() {
  if (await isPortFree(5432)) {
    PG_PORT = 5432;
  } else {
    // Try to recover orphan first
    await cleanupOrphanPostgres();
    if (await isPortFree(5432)) {
      PG_PORT = 5432;
    } else {
      PG_PORT = 5433;
      log.info(`[postgres] Port 5432 occupied — falling back to ${PG_PORT}`);
    }
  }
}

/**
 * Initialize and start the embedded PostgreSQL cluster.
 * On first run: calls initdb to create the cluster.
 * Subsequent runs: calls pg_ctl start.
 */
async function startPostgres() {
  const pgData = path.join(getUserData(), 'postgres-data');
  const pgLog = path.join(getUserData(), 'postgres.log');
  const pgBin = path.join(getResourcesPath(), 'pg16', 'bin');
  const pgCtl = path.join(pgBin, 'pg_ctl.exe');
  const initdb = path.join(pgBin, 'initdb.exe');

  // Initialize cluster on first run (PG_VERSION file marks an initialized cluster)
  if (!fs.existsSync(path.join(pgData, 'PG_VERSION'))) {
    log.info('[postgres] First run — initializing cluster with initdb');
    await runCommand(initdb, ['-D', pgData, '-U', 'postgres', '-A', 'trust', '-E', 'UTF8']);
    log.info('[postgres] Cluster initialized');
  }

  // Start the cluster
  log.info(`[postgres] Starting cluster on port ${PG_PORT}`);
  await runCommand(pgCtl, [
    'start',
    '-D', pgData,
    '-l', pgLog,
    '-o', `-F -p ${PG_PORT} -h ${BACKEND_HOST}`,
  ]);
  log.info('[postgres] Cluster started');
}

/**
 * Stop the embedded PostgreSQL cluster (fast shutdown).
 */
async function stopPostgres() {
  const pgData = path.join(getUserData(), 'postgres-data');
  const pgCtl = path.join(getResourcesPath(), 'pg16', 'bin', 'pg_ctl.exe');
  log.info('[postgres] Stopping cluster');
  await runCommand(pgCtl, ['stop', '-D', pgData, '-m', 'fast']).catch((e) => {
    log.warn('[postgres] Stop failed (may already be stopped):', e.message);
  });
}

/**
 * Create the application database if it does not already exist.
 */
async function createDatabase() {
  const createdb = path.join(getResourcesPath(), 'pg16', 'bin', 'createdb.exe');
  log.info('[postgres] Creating database dianfacturador (if not exists)');
  try {
    await runCommand(createdb, [
      '-U', 'postgres',
      '-h', BACKEND_HOST,
      '-p', String(PG_PORT),
      'dianfacturador',
    ]);
    log.info('[postgres] Database created');
  } catch (e) {
    // Database likely already exists — this is fine
    log.info('[postgres] Database may already exist:', e.message.split('\n')[0]);
  }
}

// ─── Backend sidecar lifecycle ────────────────────────────────────────────────

/**
 * Spawn the PyInstaller-bundled FastAPI backend as a child process.
 * Binds to 127.0.0.1 only to avoid Windows Firewall dialogs.
 */
function startBackend() {
  const userData = getUserData();
  const resourcesPath = getResourcesPath();

  const exePath = app.isPackaged
    ? path.join(resourcesPath, 'backend', 'backend.exe')
    : path.join(__dirname, '..', 'backend', 'dist', 'backend', 'backend.exe');

  log.info(`[backend] Spawning sidecar: ${exePath}`);

  const env = {
    ...process.env,
    DATABASE_URL: `postgresql+asyncpg://postgres@${BACKEND_HOST}:${PG_PORT}/dianfacturador`,
    SECRET_KEY: getSecretKey(userData),
    FERNET_KEY: getFernetKey(userData),
    CERT_STORAGE_PATH: path.join(userData, 'certs'),
    BACKEND_PORT: String(BACKEND_PORT),
    BACKEND_HOST: BACKEND_HOST,
    WEASYPRINT_DLL_DIRECTORIES: path.join(resourcesPath, 'backend', 'gtk-dlls'),
  };

  backendProcess = spawn(exePath, [], {
    env,
    stdio: 'pipe',
    windowsHide: true,
  });

  backendProcess.stdout.on('data', (data) => {
    log.info('[backend]', data.toString().trimEnd());
  });

  backendProcess.stderr.on('data', (data) => {
    log.warn('[backend:stderr]', data.toString().trimEnd());
  });

  backendProcess.on('exit', (code, signal) => {
    if (!isQuitting) {
      log.error(`[backend] Exited unexpectedly — code: ${code}, signal: ${signal}`);
    }
  });

  backendProcess.on('error', (err) => {
    log.error('[backend] Failed to spawn:', err.message);
  });
}

/**
 * Poll the backend /health endpoint until it responds 200 or the timeout expires.
 * @param {number} maxWaitMs - maximum time to wait in milliseconds
 * @returns {Promise<boolean>} true if healthy within timeout
 */
async function waitForBackend(maxWaitMs = 30000) {
  const start = Date.now();
  log.info(`[backend] Polling ${HEALTH_URL} (max ${maxWaitMs}ms)`);

  while (Date.now() - start < maxWaitMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(HEALTH_URL, (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            reject(new Error(`status ${res.statusCode}`));
          }
          res.resume(); // consume response body to free memory
        });
        req.on('error', reject);
        req.setTimeout(1000, () => {
          req.destroy();
          reject(new Error('request timed out'));
        });
      });
      log.info('[backend] Health check passed');
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  log.error('[backend] Health check timed out');
  return false;
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────

/**
 * Kill the backend sidecar process.
 */
function killBackend() {
  if (!backendProcess) return;
  log.info('[backend] Sending termination signal');
  if (process.platform === 'win32') {
    // On Windows, SIGTERM is not reliably delivered — use taskkill
    const { execSync } = require('child_process');
    try {
      execSync(`taskkill /PID ${backendProcess.pid} /T /F`, { windowsHide: true });
    } catch (e) {
      log.warn('[backend] taskkill failed:', e.message);
    }
  } else {
    backendProcess.kill('SIGTERM');
  }
  backendProcess = null;
}

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.on('before-quit', async (e) => {
  if (isQuitting) return;
  e.preventDefault();
  isQuitting = true;
  log.info('[app] Before-quit: initiating graceful shutdown');
  killBackend();
  await stopPostgres();
  log.info('[app] Graceful shutdown complete');
  app.exit(0);
});

app.on('window-all-closed', (e) => {
  // On macOS, keep app alive in tray even with no windows
  // On Windows, we handle this via the tray; do NOT call app.quit() here
  e.preventDefault();
});

app.whenReady().then(async () => {
  log.info('[app] App ready — starting services');

  try {
    // 1. Determine which PG port to use (5432 or fallback 5433)
    await selectPgPort();

    // 2. Initialize and start PostgreSQL
    await startPostgres();

    // 3. Create the application database if it doesn't exist
    await createDatabase();

    // 4. Spawn the FastAPI backend sidecar
    startBackend();

    // 5. Poll the health endpoint until healthy (or timeout)
    const healthy = await waitForBackend(30000);

    if (!healthy) {
      dialog.showErrorBox(
        'DIAN Facturador — Error de inicio',
        'El servicio de backend no respondió en 30 segundos.\n\n' +
          'Revisa los logs en: ' + path.join(getUserData(), 'logs') + '\n\n' +
          'La aplicación se cerrará.'
      );
      app.quit();
      return;
    }

    // 6. Create the main browser window
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      title: 'DIAN Facturador',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });

    // Load the Vite SPA from the bundled frontend/dist
    const indexPath = app.isPackaged
      ? path.join(__dirname, 'frontend', 'dist', 'index.html')
      : path.join(__dirname, '..', 'frontend', 'dist', 'index.html');

    mainWindow.loadFile(indexPath);

    // Closing the window hides to tray instead of quitting
    mainWindow.on('close', (e) => {
      if (!isQuitting) {
        e.preventDefault();
        mainWindow.hide();
      }
    });

    // 7. Create system tray icon and context menu
    createTray(mainWindow);

    // 8. Configure autostart conditionally based on userData/settings.json (per D-03)
    const AutoLaunch = require('auto-launch');
    const autoLauncher = new AutoLaunch({
      name: 'DIAN Facturador',
      isHidden: true,
    });

    const settings = loadSettings();
    if (settings.autostart !== false) {
      autoLauncher.enable().catch((e) => log.warn('[autostart] enable failed:', e.message));
    } else {
      autoLauncher.disable().catch((e) => log.warn('[autostart] disable failed:', e.message));
    }

    // 9. IPC handler: toggle autostart preference from renderer (settings UI)
    ipcMain.handle('set-autostart', async (_event, enabled) => {
      const current = loadSettings();
      current.autostart = enabled;
      saveSettings(current);
      if (enabled) {
        await autoLauncher.enable();
      } else {
        await autoLauncher.disable();
      }
      log.info(`[autostart] Set to: ${enabled}`);
      return enabled;
    });

    ipcMain.handle('get-autostart', async () => {
      const current = loadSettings();
      return current.autostart !== false;
    });

    // 10. Set up auto-updater (placeholder — implemented in Plan 04)
    setupAutoUpdater(mainWindow);

    log.info('[app] Application started successfully');
  } catch (err) {
    log.error('[app] Startup failed:', err);
    dialog.showErrorBox(
      'DIAN Facturador — Error fatal',
      `Ocurrió un error durante el inicio:\n\n${err.message}\n\n` +
        'Revisa los logs para más detalles.'
    );
    app.quit();
  }
});
