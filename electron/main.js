/**
 * electron/main.js
 * Main process for TrayPong - handles tray icon, window management,
 * and IPC between main and renderer.
 */

const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let tray = null;
let mainWindow = null;

// ─── Window dimensions ────────────────────────────────────────────────────────
const WINDOW_WIDTH = 320;
const WINDOW_HEIGHT = 520;

// ─── Renderer URL ───────────────────────────────────────────────────────────
// In production, load from the built files. In development, use dev server.
function getRendererURL() {
  if (isDev) {
    return 'http://localhost:3000';
  }
  // Production: load from the build directory inside the app bundle
  const buildPath = path.join(process.resourcesPath, 'build', 'index.html');
  return `file://${buildPath}`;
}

// ─── Tray icon path ───────────────────────────────────────────────────────────
// In production electron-builder copies extraResources next to the .app bundle.
// The safest cross-env approach is to try multiple known locations.
function getTrayIconPath() {
  console.log('🔍 Looking for tray icon...');
  console.log('📁 process.resourcesPath:', process.resourcesPath);
  console.log('📁 app.getAppPath():', app.getAppPath());
  console.log('📁 __dirname:', __dirname);
  
  const candidates = [
    // Development
    path.join(__dirname, '../public/img/traypong.png'),
    // Production — extraResources ends up at <app>.app/Contents/Resources/
    path.join(process.resourcesPath, 'img', 'traypong.png'),
    // Fallback inside asar
    path.join(app.getAppPath(), 'public', 'img', 'traypong.png'),
    path.join(app.getAppPath(), 'build', 'img', 'traypong.png'),
  ];

  for (const p of candidates) {
    try {
      console.log(`🔍 Checking path: ${p}`);
      if (fs.existsSync(p)) {
        console.log('✅ Tray icon found at:', p);
        return p;
      }
    } catch {}
  }

  console.warn('⚠️  Tray icon not found in any candidate path:', candidates);
  return null;
}

// ─── Create the tray ─────────────────────────────────────────────────────────
function createTray() {
  try {
    if (tray) { tray.destroy(); tray = null; }

    const iconPath = getTrayIconPath();
    let trayIcon;

    if (iconPath) {
      // Resize to 160x160 — maximum visibility in menu bar
      trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 160, height: 160 });
    } else {
      // Minimal 1×1 fallback so the app still launches
      trayIcon = nativeImage.createFromDataURL(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      );
    }

    tray = new Tray(trayIcon);
    tray.setToolTip('TrayPong');

    tray.on('click', (_event, bounds) => toggleWindow(bounds));

    tray.on('right-click', () => {
      tray.popUpContextMenu(Menu.buildFromTemplate([
        { label: 'TrayPong', enabled: false },
        { type: 'separator' },
        { label: 'Quit', click: () => app.quit() },
      ]));
    });

    console.log('✅ Tray created');
  } catch (err) {
    console.error('❌ createTray failed:', err);
  }
}

// ─── Create the BrowserWindow ─────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: true,
    backgroundColor: '#0d0d0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(getRendererURL());

  // Hide + notify renderer to pause when window loses focus
  mainWindow.on('blur', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
      mainWindow.webContents.send('window-hidden');
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─── Toggle window near tray icon ─────────────────────────────────────────────
function toggleWindow(trayBounds) {
  if (!mainWindow) createWindow();

  if (mainWindow.isVisible()) {
    mainWindow.hide();
    mainWindow.webContents.send('window-hidden');
    return;
  }

  positionWindow(trayBounds);
  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send('window-shown');
}

// ─── Position window below the tray icon (macOS menu bar is at the top) ───────
function positionWindow(trayBounds) {
  const display = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y });
  const { workArea } = display;

  // Center horizontally on the tray icon
  let x = Math.round(trayBounds.x + trayBounds.width / 2 - WINDOW_WIDTH / 2);
  // Place just below the menu bar
  let y = Math.round(trayBounds.y + trayBounds.height + 4);

  // Clamp so the window never goes off-screen
  x = Math.max(workArea.x, Math.min(x, workArea.x + workArea.width - WINDOW_WIDTH));
  y = Math.max(workArea.y, Math.min(y, workArea.y + workArea.height - WINDOW_HEIGHT));

  mainWindow.setPosition(x, y, false);
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────
ipcMain.on('close-window', () => {
  if (mainWindow) mainWindow.hide();
});

// ─── App lifecycle ────────────────────────────────────────────────────────────
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  console.error('Stack:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

app.whenReady().then(() => {
  console.log('🚀 App starting...');
  
  // Hide dock icon — this is a menu bar only app
  if (app.dock) app.dock.hide();
  
  try {
    createWindow();
    console.log('✅ Window created');
    
    createTray();
    console.log('✅ Tray created');
    
    console.log('🎉 App ready successfully!');
  } catch (error) {
    console.error('💥 Error during startup:', error);
    console.error('Stack:', error.stack);
  }
});

// Keep the app alive when all windows are closed (tray app behaviour)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
