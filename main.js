const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require("electron");
const path = require("path");
const Store = require("electron-store");

const store = new Store();

let mainWindow = null;
let tray = null;
let isQuitting = false;

const APP_URL = "https://lightcall.ca";

function getCloseToTraySetting() {
    return store.get("closeToTray", true);
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        icon: path.join(__dirname, process.env.NODE_ENV === "development" ? "icon-dev.png" : "icon.png"),
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, "preload.js"),
            permissions: ["media"]
        },
        autoHideMenuBar: true,
        backgroundColor: "#111111"
    });

    mainWindow.loadURL(APP_URL);

    mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        const allowed = ["media", "camera", "microphone", "notifications", "clipboard-read", "clipboard-write"];
        callback(allowed.includes(permission));
    });

    mainWindow.on("close", (event) => {
        if (!isQuitting && getCloseToTraySetting()) {
            event.preventDefault();
            mainWindow.hide();
        }
        return false;
    });
}

function createTray() {
    const icon = nativeImage.createFromPath(path.join(__dirname, process.env.NODE_ENV === "development" ? "icon-dev.png" : "icon.png"));
    tray = new Tray(icon.resize({ width: 16, height: 16 }));

    const contextMenu = Menu.buildFromTemplate([
        {
            label: "Ouvrir LightCall",
            click: () => {
                mainWindow.show();
                mainWindow.focus();
            }
        },
        { type: "separator" },
        {
            label: "Quitter",
            click: () => {
                isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setToolTip("LightCall");
    tray.setContextMenu(contextMenu);

    tray.on("double-click", () => {
        mainWindow.show();
        mainWindow.focus();
    });
}

ipcMain.handle("get-close-to-tray", () => {
    return getCloseToTraySetting();
});

ipcMain.handle("set-close-to-tray", (event, value) => {
    store.set("closeToTray", value);
    return true;
});

ipcMain.handle("is-electron", () => true);

app.whenReady().then(() => {
    createWindow();
    createTray();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
        else mainWindow.show();
    });
});

app.on("window-all-closed", (event) => {
    event.preventDefault();
});

app.on("before-quit", () => {
    isQuitting = true;
});