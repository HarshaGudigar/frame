const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    if (isDev) {
        win.loadURL('http://localhost:3000');
        // win.webContents.openDevTools();
        console.log('Running in development mode');
    } else {
        // In production, load the index.html from the webapp export
        // Assuming the webapp 'out' directory is copied to 'resources/app/out' or similar
        // For this setup, we'll look for it relative to the main.js or resources
        const indexPath = path.join(__dirname, '../webapp/out/index.html');

        // Check if file exists to avoid errors
        if (fs.existsSync(indexPath)) {
            win.loadFile(indexPath);
            console.log('Loaded static file from:', indexPath);
            // Open DevTools in production for debugging
            // win.webContents.openDevTools();
        } else {
            console.error('Could not find index.html at:', indexPath);
            // Fallback or error handling
        }
    }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
