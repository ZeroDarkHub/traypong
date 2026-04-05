/**
 * electron/main.js
 * Main process for TrayPong - handles tray icon, window management,
 * and IPC between main and renderer.
 */

const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen } = require('electron');
const path = require('path');

// Keep global references to prevent GC
let tray = null;
let mainWindow = null;

// ─── Dev vs. production URL ───────────────────────────────────────────────────
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const RENDERER_URL = isDev
  ? 'http://localhost:3000'
  : `file://${path.join(__dirname, '../build/index.html')}`;

// ─── Window dimensions ────────────────────────────────────────────────────────
const WINDOW_WIDTH = 320;
const WINDOW_HEIGHT = 520;

// ─── Create the tray icon ─────────────────────────────────────────────────────
function createTray() {
  // Destroy existing tray if it exists
  if (tray) {
    tray.destroy();
    tray = null;
  }
  
  // Handle tray icon path differently in dev vs production
  let iconPath;
  if (isDev) {
    // Development: use public folder
    iconPath = path.join(__dirname, '../public/img/traypong.png');
  } else {
    // Production: use packaged resources
    iconPath = path.join(__dirname, '../build/img/traypong.png');
  }
  
  console.log('Loading tray icon from:', iconPath);
  console.log('Icon path exists:', require('fs').existsSync(iconPath));
  console.log('Is dev mode:', isDev);
  console.log('Current __dirname:', __dirname);
  
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 128, height: 128 });

  try {
    tray = new Tray(trayIcon);
    console.log('Tray icon loaded and resized from:', iconPath);
  } catch (error) {
    console.error('Failed to load tray icon:', error);
    // Fallback: create a simple colored rectangle as tray icon
    const fallbackIcon = nativeImage.createEmpty();
    tray = new Tray(fallbackIcon);
    console.log('Using fallback tray icon');
  }

  tray.setToolTip('TrayPong');

  tray.on('click', (event, bounds) => {
    console.log('Tray icon clicked');
    toggleWindow(bounds);
  });

  // Right-click context menu
  const contextMenu = Menu.buildFromTemplate([
    { label: 'TrayPong', enabled: false },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.on('right-click', () => {
    tray.popUpContextMenu(contextMenu);
  });
}

// ─── Create the main BrowserWindow ───────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: true,
    transparent: false,
    backgroundColor: '#0d0d0f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadURL(RENDERER_URL);

  // Pause game when focus is lost, but don't hide window
  mainWindow.on('blur', () => {
    if (mainWindow && mainWindow.isVisible()) {
      // Notify renderer to pause game only
      mainWindow.webContents.send('window-hidden');
    }
  });

  // Resume game when focus is regained
  mainWindow.on('focus', () => {
    if (mainWindow && mainWindow.isVisible()) {
      // Notify renderer to resume game
      mainWindow.webContents.send('window-shown');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // DevTools disabled for production
  // if (isDev) {
  //   mainWindow.webContents.openDevTools({ mode: 'detach' });
  // }
}

// ─── Toggle window visibility near the tray icon ─────────────────────────────
function toggleWindow(trayBounds) {
  if (!mainWindow) return;

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

// ─── Position the window below (or above) the tray icon ──────────────────────
function positionWindow(trayBounds) {
  const display = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = display.workAreaSize;
  const { x: trayX, y: trayY, width: trayWidth, height: trayHeight } = trayBounds;

  // Center horizontally on the tray icon
  let x = Math.round(trayX + trayWidth / 2 - WINDOW_WIDTH / 2);
  // Position below tray icon (macOS menu bar is at top)
  let y = Math.round(trayY + trayHeight + 4);

  // Keep within screen bounds
  x = Math.max(0, Math.min(x, screenWidth - WINDOW_WIDTH));
  y = Math.max(0, Math.min(y, screenHeight - WINDOW_HEIGHT));

  mainWindow.setPosition(x, y, false);
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────
ipcMain.on('close-window', () => {
  if (mainWindow) mainWindow.hide();
});

ipcMain.on('resize-window', (event, { width, height }) => {
  if (mainWindow) mainWindow.setSize(width, height);
});

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  // Required for macOS: hide dock icon so app lives only in menu bar
  if (app.dock) app.dock.hide();

  createTray();
  createWindow();
});

app.on('window-all-closed', () => {
  // Don't quit when all windows are closed — tray app stays alive
});

app.on('activate', () => {
  if (!mainWindow) createWindow();
});
