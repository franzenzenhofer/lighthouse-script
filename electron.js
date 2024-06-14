import { app, BrowserWindow } from 'electron';
import { main } from './main.js';


let mainWindow;

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true
        }
    });

    // Load the URL of the Express server
    const url = 'http://localhost:3000'; // Make sure the port matches with the Express server
    mainWindow.loadURL(url);

    // Open the DevTools for debugging
    // mainWindow.webContents.openDevTools();

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

// Call the main function from main.js to start the Express server and other initializations
app.on('ready', () => {
    main().then(() => {
        createWindow();
    });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    // On macOS, re-create a window if the app is activated and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    }
});
