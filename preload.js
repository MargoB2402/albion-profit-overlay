const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    // Конфиг
    getConfig:  () => ipcRenderer.invoke('get-config'),
    saveConfig: (cfg) => ipcRenderer.invoke('save-config', cfg),

    // Управление окном
    moveWindow:   (delta) => ipcRenderer.send('window-move', delta),
    resizeWindow: (size)  => ipcRenderer.send('window-resize', size),
    closeWindow:  ()      => ipcRenderer.send('window-close'),

    // API прокси — без CORS
    apiFetch: (opts) => ipcRenderer.invoke('api-fetch', opts),

    // OCR
    ocrAlbion: () => ipcRenderer.invoke('ocr-albion'),

    // Minimize / restore window
    setMinimized: (mini) => ipcRenderer.send('window-minimize-toggle', mini),

    // Price contribution signing (HMAC lives in main process)
    signPriceReport: (payload) => ipcRenderer.invoke('sign-price-report', payload),

    // Update check (для баннера)
    checkGithubUpdate: () => ipcRenderer.invoke('check-github-update'),

    // Debug mode (OCR screenshots)
    getDebugMode: ()               => ipcRenderer.invoke('get-debug-mode'),
    setDebugMode: (enable, pass)   => ipcRenderer.invoke('set-debug-mode', { enable, password: pass }),

    // Платформа
    platform: process.platform,
});
