const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    downloadVideo: (url, options) => ipcRenderer.invoke('download-video', url, options),
    onDownloadProgress: (callback) => ipcRenderer.on('download-progress', callback),
    onDownloadStatus: (callback) => ipcRenderer.on('download-status', callback),
    onDownloadWarning: (callback) => ipcRenderer.on('download-warning', callback),
    onDownloadError: (callback) => ipcRenderer.on('download-error', callback),
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    getDesktopPath: () => ipcRenderer.invoke('get-desktop-path'),
});