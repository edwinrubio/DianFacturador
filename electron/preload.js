'use strict';

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose a safe, limited API surface to the renderer process.
 * The renderer cannot access Node.js directly (nodeIntegration: false, contextIsolation: true).
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Returns the backend base URL for the renderer to use for API calls.
   * @returns {string}
   */
  getBackendUrl: () => 'http://127.0.0.1:8765',

  /**
   * Register a callback for when an update is available.
   * @param {Function} callback
   */
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (_event, info) => callback(info));
  },

  /**
   * Register a callback for when an update has been downloaded and is ready to install.
   * @param {Function} callback
   */
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (_event, info) => callback(info));
  },

  /**
   * Trigger application restart to apply a downloaded update.
   */
  restartToUpdate: () => {
    ipcRenderer.send('restart-to-update');
  },

  /**
   * Set the autostart preference (start on Windows boot).
   * Persisted to userData/settings.json.
   * @param {boolean} enabled
   * @returns {Promise<boolean>}
   */
  setAutostart: (enabled) => ipcRenderer.invoke('set-autostart', enabled),

  /**
   * Get the current autostart preference.
   * @returns {Promise<boolean>}
   */
  getAutostart: () => ipcRenderer.invoke('get-autostart'),
});
