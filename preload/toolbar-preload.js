const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('toolbarAPI', {
  onModeChanged: (cb) => ipcRenderer.on('mode-changed', (_, s) => cb(s)),
  togglePresentation: () => ipcRenderer.invoke('toggle-presentation'),
  toggleDrawing: () => ipcRenderer.invoke('toggle-drawing'),
  getPresentationState: () => ipcRenderer.invoke('get-presentation-state'),
  getDrawingState: () => ipcRenderer.invoke('get-drawing-state'),
  openSettings: () => ipcRenderer.invoke('open-settings'),
  // Drawing settings
  getDrawSettings: () => ipcRenderer.invoke('get-draw-settings'),
  setDrawSettings: (s) => ipcRenderer.send('set-draw-settings', s),
});
