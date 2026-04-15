const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');

// ===== State =====
let overlayWindow = null;
let toolbarWindow = null;
let settingsWindow = null;
let tray = null;
let isPresentationMode = false;
let isDrawingEnabled = false;

// Drawing settings (synced from toolbar)
let drawSettings = { color: '#FF6B35', lineWidth: 5, mode: 'pen' };

// ===== Settings file =====
const SETTINGS_DIR = path.join(process.env.APPDATA || '', 'mouse-spotlight');
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'settings.json');

const DEFAULT_SETTINGS = {
  shortcutPresentation: 'CommandOrControl+Alt+D',
  shortcutDrawing: 'Insert',
  fadeDuration: 2000,
};

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      return { ...DEFAULT_SETTINGS, ...data };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettingsFile(settings) {
  try {
    if (!fs.existsSync(SETTINGS_DIR)) {
      fs.mkdirSync(SETTINGS_DIR, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('Failed to save settings:', e);
    return false;
  }
}

let appSettings = loadSettings();

// ===== Single instance =====
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) app.quit();
app.on('second-instance', () => { if (overlayWindow) overlayWindow.show(); });

// ===== Window helpers =====

function getWindowBounds() {
  const displays = screen.getAllDisplays();
  let minX = 0, minY = 0, maxX = 0, maxY = 0;
  displays.forEach(d => {
    const { x, y, width, height } = d.bounds;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  });
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function createOverlayWindow() {
  const bounds = getWindowBounds();

  overlayWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    hasShadow: false,
    show: false,
    focusable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload', 'overlay-preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // Use 'floating' level so toolbar ('pop-up-menu') stays above
  overlayWindow.setAlwaysOnTop(true, 'floating');
  overlayWindow.setIgnoreMouseEvents(true);
  // Prevent overlay from ever stealing focus/z-order from toolbar
  overlayWindow.on('focus', () => { if (toolbarWindow) toolbarWindow.focus(); });
  overlayWindow.loadFile(path.join(__dirname, 'renderer', 'overlay', 'index.html'));
  overlayWindow.on('closed', () => { overlayWindow = null; });
}

function createToolbarWindow() {
  toolbarWindow = new BrowserWindow({
    width: 800,
    height: 120,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload', 'toolbar-preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // Highest z-level to always stay above overlay
  toolbarWindow.setAlwaysOnTop(true, 'pop-up-menu');
  toolbarWindow.setIgnoreMouseEvents(false);
  toolbarWindow.loadFile(path.join(__dirname, 'renderer', 'toolbar', 'index.html'));

  // Auto-position: center horizontally at top after content loads
  toolbarWindow.webContents.on('did-finish-load', () => {
    centerToolbar();
  });

  toolbarWindow.on('closed', () => { toolbarWindow = null; });
}

function centerToolbar() {
  if (!toolbarWindow) return;
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;

  toolbarWindow.webContents.executeJavaScript(
    '({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight })'
  ).then(({ w, h }) => {
    const finalW = Math.min(w + 4, screenWidth);
    const finalH = Math.min(h + 4, 200);
    toolbarWindow.setSize(finalW, finalH);
    toolbarWindow.setPosition(Math.floor((screenWidth - finalW) / 2), 12);
    sendToolbarBounds();
  }).catch(() => {
    toolbarWindow.setSize(600, 90);
    toolbarWindow.setPosition(Math.floor((screenWidth - 600) / 2), 12);
    sendToolbarBounds();
  });
}

function sendToolbarBounds() {
  if (!toolbarWindow || !overlayWindow) return;
  const bounds = toolbarWindow.getBounds();
  overlayWindow.webContents.send('toolbar-bounds', bounds);
}

// ===== Tray =====

function createTray() {
  const { nativeImage } = require('electron');

  // Build a 16x16 opaque bitmap for Windows tray (no transparency)
  const size = 16;
  const rgba = Buffer.alloc(size * size * 4);

  // Colors (RGBA)
  const ORANGE = [255, 107, 53, 255];   // #FF6B35
  const WHITE  = [255, 255, 255, 255];
  const DARK   = [210, 75, 25, 255];    // darker orange for edge

  // 16x16 pixel art: rounded orange square with white pen icon
  const pixels = [
    '................',
    '...OOOOOOOOO....',
    '..OOOOOOOOOOO...',
    '.OOOOOOOOOOOOO..',
    '.OOOWWWOOOOOOO..',
    '.OOOWWOOOOOOOO..',
    '.OOOWWOOOOOOOO..',
    '.OOOOOWWOOOOOO..',
    '.OOOOOOWWOOOOO..',
    '.OOOOOOOWWOOOO..',
    '.OOOOOOOOWWOOO..',
    '.OOOOOOOOOWWOO..',
    '.OOOOOOOOOWWOO..',
    '.OOOOOOOOOOOOO..',
    '..OOOOOOOOOOO...',
    '...OOOOOOOOO....',
  ];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const ch = pixels[y] ? pixels[y][x] : '.';
      if (ch === 'O') {
        rgba[i] = ORANGE[0]; rgba[i+1] = ORANGE[1]; rgba[i+2] = ORANGE[2]; rgba[i+3] = 255;
      } else if (ch === 'W') {
        rgba[i] = WHITE[0]; rgba[i+1] = WHITE[1]; rgba[i+2] = WHITE[2]; rgba[i+3] = 255;
      } else {
        // Transparent area - fill with dark for visibility
        rgba[i] = 30; rgba[i+1] = 30; rgba[i+2] = 30; rgba[i+3] = 0;
      }
    }
  }

  const icon = nativeImage.createFromBitmap(rgba, { width: size, height: size });

  tray = new Tray(icon);
  tray.setToolTip('Mouse Spotlight');

  updateTrayMenu();
  tray.on('double-click', () => togglePresentationMode());
}

function updateTrayMenu() {
  const contextMenu = Menu.buildFromTemplate([
    { label: '切换演示模式', click: () => togglePresentationMode() },
    { type: 'separator' },
    { label: '设置', click: () => openSettingsWindow() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() }
  ]);
  if (tray) tray.setContextMenu(contextMenu);
}

// ===== Mode management =====

function broadcastMode() {
  const state = { presentation: isPresentationMode, drawing: isDrawingEnabled };
  if (overlayWindow) overlayWindow.webContents.send('mode-changed', state);
  if (toolbarWindow) toolbarWindow.webContents.send('mode-changed', state);
}

function updateOverlayCapture() {
  if (!overlayWindow) return;
  overlayWindow.setIgnoreMouseEvents(!isDrawingEnabled);
}

function ensureToolbarOnTop() {
  if (!toolbarWindow) return;
  // Force toolbar above overlay
  toolbarWindow.moveTop();
}

function togglePresentationMode() {
  isPresentationMode = !isPresentationMode;

  if (isPresentationMode) {
    isDrawingEnabled = false;
    updateOverlayCapture();
    if (overlayWindow && !overlayWindow.isVisible()) overlayWindow.show();
    if (toolbarWindow && !toolbarWindow.isVisible()) toolbarWindow.show();
  } else {
    isDrawingEnabled = false;
    updateOverlayCapture();
    if (toolbarWindow) toolbarWindow.hide();
  }

  broadcastMode();
}

function toggleDrawingMode() {
  if (!isPresentationMode) {
    isPresentationMode = true;
    if (overlayWindow && !overlayWindow.isVisible()) overlayWindow.show();
    if (toolbarWindow && !toolbarWindow.isVisible()) toolbarWindow.show();
  }

  isDrawingEnabled = !isDrawingEnabled;
  updateOverlayCapture();
  ensureToolbarOnTop();
  broadcastMode();
}

// ===== Settings window =====

function openSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 400,
    height: 320,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: 'Mouse Spotlight 设置',
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload', 'settings-preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  settingsWindow.loadFile(path.join(__dirname, 'renderer', 'settings', 'index.html'));
  settingsWindow.on('closed', () => { settingsWindow = null; });
}

// ===== Shortcuts =====

function registerShortcuts() {
  globalShortcut.unregisterAll();

  const s1 = globalShortcut.register(appSettings.shortcutPresentation, () => {
    togglePresentationMode();
  });
  if (!s1) console.error('Failed to register presentation shortcut:', appSettings.shortcutPresentation);

  const s2 = globalShortcut.register(appSettings.shortcutDrawing, () => {
    toggleDrawingMode();
  });
  if (!s2) console.error('Failed to register drawing shortcut:', appSettings.shortcutDrawing);
}

// ===== IPC handlers =====

ipcMain.handle('get-screen-bounds', () => getWindowBounds());
ipcMain.handle('get-presentation-state', () => isPresentationMode);
ipcMain.handle('get-drawing-state', () => isDrawingEnabled);
ipcMain.handle('get-fade-duration', () => appSettings.fadeDuration);
ipcMain.handle('toggle-presentation', () => togglePresentationMode());
ipcMain.handle('toggle-drawing', () => toggleDrawingMode());
ipcMain.handle('open-settings', () => openSettingsWindow());

ipcMain.handle('get-draw-settings', () => drawSettings);
ipcMain.on('set-draw-settings', (_, s) => {
  drawSettings = { ...drawSettings, ...s };
  // Forward to overlay
  if (overlayWindow) overlayWindow.webContents.send('draw-settings-changed', drawSettings);
});

ipcMain.handle('get-settings', () => appSettings);
ipcMain.handle('save-settings', (_, newSettings) => {
  appSettings = { ...DEFAULT_SETTINGS, ...newSettings };
  const ok = saveSettingsFile(appSettings);
  if (ok) registerShortcuts(); // Re-register with new shortcuts
  // Forward fade duration to overlay
  if (overlayWindow) overlayWindow.webContents.send('fade-duration-changed', appSettings.fadeDuration);
  return ok;
});

ipcMain.on('close-settings', () => {
  if (settingsWindow) settingsWindow.close();
});

// ===== Lifecycle =====

app.whenReady().then(() => {
  createOverlayWindow();
  createToolbarWindow();
  createTray();
  registerShortcuts();
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => {});
app.on('before-quit', () => { if (tray) tray.destroy(); });
