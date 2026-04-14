const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getScreenBounds: () => ipcRenderer.invoke('get-screen-bounds'),
  togglePresentation: () => ipcRenderer.invoke('toggle-presentation'),
  getPresentationState: () => ipcRenderer.invoke('get-presentation-state'),
  getDrawingState: () => ipcRenderer.invoke('get-drawing-state'),
  onModeChanged: (callback) => {
    ipcRenderer.on('mode-changed', (event, state) => callback(state));
  },
  setIgnoreMouseEvents: (ignore, forward = true) => {
    ipcRenderer.send('set-ignore-mouse-events', { ignore, forward });
  }
});
