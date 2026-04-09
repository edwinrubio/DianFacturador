'use strict';

const { autoUpdater } = require('electron-updater');
const { ipcMain } = require('electron');
const log = require('electron-log');

// Configure logging — updater events appear in the same electron-log output
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// Download silently in background; install automatically when the app quits
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

/**
 * Set up the auto-updater for the given BrowserWindow.
 * Called once after the main window is created.
 * Checks GitHub Releases for a newer version, downloads silently, and
 * notifies the renderer so the user can restart when ready.
 *
 * @param {import('electron').BrowserWindow} mainWindow
 */
function setupAutoUpdater(mainWindow) {
  // Check for updates non-blocking — errors are logged but do not crash the app
  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    log.warn('[updater] Auto-update check failed:', err.message);
  });

  autoUpdater.on('update-available', (info) => {
    log.info('[updater] Update available:', info.version);
    mainWindow.webContents.send('update-available', info.version);
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('[updater] Update downloaded:', info.version);
    mainWindow.webContents.send('update-downloaded', info.version);
  });

  autoUpdater.on('error', (err) => {
    log.error('[updater] Auto-updater error:', err.message);
  });

  // Handle restart request from renderer (triggered by user clicking "Reiniciar" in UI)
  ipcMain.on('restart-to-update', () => {
    log.info('[updater] Restarting to apply update');
    autoUpdater.quitAndInstall();
  });
}

module.exports = { setupAutoUpdater };
