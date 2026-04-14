const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overlayAPI', {
  onModeChanged: (cb) => ipcRenderer.on('mode-changed', (_, s) => cb(s)),
  onDrawSettingsChanged: (cb) => ipcRenderer.on('draw-settings-changed', (_, s) => cb(s)),
  onFadeDurationChanged: (cb) => ipcRenderer.on('fade-duration-changed', (_, ms) => cb(ms)),
  onToolbarBounds: (cb) => ipcRenderer.on('toolbar-bounds', (_, b) => cb(b)),
  getDrawingState: () => ipcRenderer.invoke('get-drawing-state'),
  getPresentationState: () => ipcRenderer.invoke('get-presentation-state'),
  getFadeDuration: () => ipcRenderer.invoke('get-fade-duration'),
});
