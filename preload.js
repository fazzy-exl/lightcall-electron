const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    isElectron: () => ipcRenderer.invoke("is-electron"),
    getCloseToTray: () => ipcRenderer.invoke("get-close-to-tray"),
    setCloseToTray: (value) => ipcRenderer.invoke("set-close-to-tray", value)
});