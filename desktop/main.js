const { app, BrowserWindow, nativeTheme, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

// Theme-aware colors matching your CSS variables
const THEME = {
    dark: {
        bg: '#0a0b0d', // --background dark
        symbol: '#9ca3af', // muted-foreground dark
    },
    light: {
        bg: '#f8f9fc', // --background light (≈ oklch 0.98)
        symbol: '#64748b', // muted-foreground light
    },
};

function getThemeColors() {
    return nativeTheme.shouldUseDarkColors ? THEME.dark : THEME.light;
}

let win;

function createWindow() {
    const colors = getThemeColors();

    win = new BrowserWindow({
        width: 1200,
        height: 800,
        backgroundColor: colors.bg,
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: colors.bg,
            symbolColor: colors.symbol,
            height: 32,
        },
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    if (isDev) {
        win.loadURL('http://localhost:5173');
        console.log('Running in development mode (Vite dev server)');
    } else {
        const indexPath = path.join(__dirname, '../frontend/dist/index.html');
        if (fs.existsSync(indexPath)) {
            win.loadFile(indexPath);
        } else {
            console.error('Could not find index.html at:', indexPath);
            console.error('Run "cd frontend && npm run build" first.');
        }
    }
}

// Update title bar overlay when OS/app theme changes
nativeTheme.on('updated', () => {
    if (!win) return;
    const colors = getThemeColors();
    win.setTitleBarOverlay({
        color: colors.bg,
        symbolColor: colors.symbol,
        height: 32,
    });
});

// Allow the React app to notify Electron when the user manually toggles theme
ipcMain.on('theme-changed', (_event, isDark) => {
    if (!win) return;
    const colors = isDark ? THEME.dark : THEME.light;
    win.setTitleBarOverlay({
        color: colors.bg,
        symbolColor: colors.symbol,
        height: 32,
    });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
