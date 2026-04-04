/**
 * electron/preload.js
 * Exposes a safe, minimal API to the renderer process via contextBridge.
 * This keeps Node.js APIs out of the renderer while allowing controlled IPC.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Send messages to main process
  closeWindow: () => ipcRenderer.send('close-window'),

  // Listen for events from main process
  onWindowHidden: (callback) => {
    ipcRenderer.on('window-hidden', callback);
    // Return cleanup function
    return () => ipcRenderer.removeListener('window-hidden', callback);
  },
  onWindowShown: (callback) => {
    ipcRenderer.on('window-shown', callback);
    return () => ipcRenderer.removeListener('window-shown', callback);
  },

  // Check if running inside Electron
  isElectron: true,
});
