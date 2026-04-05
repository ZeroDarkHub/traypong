/**
 * electron/main.js
 * Main process for TrayPong - handles tray icon, window management,
 * and IPC between main and renderer.
 */

const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen } = require('electron');
const path = require('path');
const fs = require('fs');

// Enable live reload for Electron in development
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// ─── Create log file for debugging ───────────────────────────────────────────────
const logFile = path.join(require('os').tmpdir(), 'traypong-debug.log');
function logToFile(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  try {
    fs.appendFileSync(logFile, logMessage);
  } catch (e) {
    console.log('Failed to write to log file:', e.message);
  }
}

// Override console.log to also write to file
const originalConsoleLog = console.log;
console.log = function(...args) {
  originalConsoleLog.apply(console, args);
  logToFile(args.join(' '));
};

const originalConsoleError = console.error;
console.error = function(...args) {
  originalConsoleError.apply(console, args);
  logToFile('ERROR: ' + args.join(' '));
};

// Keep global references to prevent GC
let tray = null;
let mainWindow = null;

// ─── Dev vs. production URL ───────────────────────────────────────────────────
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
  
  console.log('=== CREATING TRAY ICON ===');
  
  // Try to load the tray icon with multiple fallbacks
  let trayIcon;
  let iconLoaded = false;
  
  // Method 1: Try resources path
  try {
    const resourcesPath = path.join(process.resourcesPath, 'img/traypong.png');
    console.log('Trying resources path:', resourcesPath);
    if (require('fs').existsSync(resourcesPath)) {
      trayIcon = nativeImage.createFromPath(resourcesPath).resize({ width: 128, height: 128 });
      iconLoaded = true;
      console.log('✅ SUCCESS: Loaded from resources path');
    }
  } catch (e) {
    console.log('❌ Resources path failed:', e.message);
  }
  
  // Method 2: Try build path
  if (!iconLoaded) {
    try {
      const buildPath = path.join(__dirname, '../build/img/traypong.png');
      console.log('Trying build path:', buildPath);
      if (require('fs').existsSync(buildPath)) {
        trayIcon = nativeImage.createFromPath(buildPath).resize({ width: 128, height: 128 });
        iconLoaded = true;
        console.log('✅ SUCCESS: Loaded from build path');
      }
    } catch (e) {
      console.log('❌ Build path failed:', e.message);
    }
  }
  
  // Method 3: Try development path
  if (!iconLoaded) {
    try {
      const devPath = path.join(__dirname, '../public/img/traypong.png');
      console.log('Trying dev path:', devPath);
      if (require('fs').existsSync(devPath)) {
        trayIcon = nativeImage.createFromPath(devPath).resize({ width: 128, height: 128 });
        iconLoaded = true;
        console.log('✅ SUCCESS: Loaded from dev path');
      }
    } catch (e) {
      console.log('❌ Dev path failed:', e.message);
    }
  }
  
  // Method 4: Create a simple colored square as fallback
  if (!iconLoaded) {
    console.log('⚠️ All paths failed, creating fallback icon');
    try {
      // Create a simple purple square using a small base64 image
      const purpleSquare = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      trayIcon = nativeImage.createFromDataURL(purpleSquare);
      iconLoaded = true;
      console.log('✅ SUCCESS: Created fallback icon');
    } catch (e) {
      console.log('❌ Fallback icon failed:', e.message);
      trayIcon = nativeImage.createEmpty();
      iconLoaded = true;
      console.log('✅ SUCCESS: Using empty icon (app will work but icon may not be visible)');
    }
  }
  
  // Create the tray
  try {
    tray = new Tray(trayIcon);
    tray.setToolTip('TrayPong');
    console.log('✅ TRAY CREATED SUCCESSFULLY');
    
    tray.on('click', (event, bounds) => {
      console.log('🖱️ Tray icon clicked');
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
    
  } catch (error) {
    console.error('❌ FAILED TO CREATE TRAY:', error);
    console.log('⚠️ Continuing without tray - app should still work');
  }
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
