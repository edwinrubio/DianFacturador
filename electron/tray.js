'use strict';

const { app, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

let tray = null;

/**
 * Create the system tray icon and context menu.
 * @param {import('electron').BrowserWindow} mainWindow
 */
function createTray(mainWindow) {
  // Use the icon if it exists, otherwise fall back to an empty image
  const iconPath = path.join(__dirname, 'build', 'icon.ico');
  let trayIcon;
  try {
    const fs = require('fs');
    if (fs.existsSync(iconPath)) {
      trayIcon = nativeImage.createFromPath(iconPath);
    } else {
      trayIcon = nativeImage.createEmpty();
    }
  } catch {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('DIAN Facturador');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Abrir DIAN Facturador',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Salir',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Double-click on tray icon shows and focuses the window
  tray.on('double-click', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  return tray;
}

module.exports = { createTray };
