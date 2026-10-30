const path = require("path");
const Store = require("electron-store");
const { autoUpdater } = require("electron-updater");
const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, session, desktopCapturer } = require("electron");

const store = new Store();

let mainWindow = null;
let tray = null;
let isQuitting = false;
let splashWindow = null;

const APP_URL = "https://lightcall.ca";

function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width: 300,
        height: 300,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        skipTaskbar: true,
        webPreferences: { contextIsolation: true, nodeIntegration: false }
    });
    splashWindow.loadFile(path.join(__dirname, "splash.html"));
}

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
        backgroundColor: "#111111",
        show: false
    });

    mainWindow.loadURL(APP_URL);
    mainWindow.webContents.session.clearCache();
    // FIX : ferme le splash dès que la page a complètement fini de charger
    mainWindow.webContents.once("did-finish-load", () => {
        setTimeout(() => {
            if (splashWindow) {
                splashWindow.close();
                splashWindow = null;
            }
            mainWindow.show();
            mainWindow.focus();
        }, 500);
    });

    mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        const allowed = ["media", "camera", "microphone", "notifications", "clipboard-read", "clipboard-write", "fullscreen"];
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
    createSplashWindow();
    createWindow();

    // Récupère la liste des écrans/fenêtres partageables
    ipcMain.handle("get-desktop-sources", async () => {
        const sources = await desktopCapturer.getSources({
            types: ["window", "screen"],
            thumbnailSize: { width: 300, height: 200 }
        });
        return sources.map(s => ({
            id: s.id,
            name: s.name,
            thumbnail: s.thumbnail.toDataURL()
        }));
    });

    // Intercepte les demandes de partage d'écran pour afficher NOTRE popup au lieu de celui de Chrome
    session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
        mainWindow.webContents.send("open-screen-picker");

        ipcMain.once("screen-picker-result", async (event, sourceId) => {
            if (!sourceId) {
                callback({});
                return;
            }
            const sources = await desktopCapturer.getSources({ types: ["window", "screen"] });
            const source = sources.find(s => s.id === sourceId);
            callback({ video: source });
        });
    }, { useSystemPicker: false });

    createTray();
    autoUpdater.checkForUpdatesAndNotify();

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