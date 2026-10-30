const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    isElectron: () => ipcRenderer.invoke("is-electron"),
    getCloseToTray: () => ipcRenderer.invoke("get-close-to-tray"),
    setCloseToTray: (value) => ipcRenderer.invoke("set-close-to-tray", value),
    getScreenSources: () => ipcRenderer.invoke("get-desktop-sources"),
    onOpenScreenPicker: (callback) => ipcRenderer.on("open-screen-picker", callback),
    selectScreenSource: (sourceId) => ipcRenderer.send("screen-picker-result", sourceId),
    notifyAppReady: () => ipcRenderer.send("app-fully-loaded")
});