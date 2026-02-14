const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    if (isDev) {
        // In development, load from the Vite dev server
        win.loadURL('http://localhost:5173');
        // win.webContents.openDevTools();
        console.log('Running in development mode (Vite dev server)');
    } else {
        // In production, load the static build from frontend/dist
        const indexPath = path.join(__dirname, '../frontend/dist/index.html');

        if (fs.existsSync(indexPath)) {
            win.loadFile(indexPath);
            console.log('Loaded static file from:', indexPath);
        } else {
            console.error('Could not find index.html at:', indexPath);
            console.error('Run "cd frontend && npm run build" first.');
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
