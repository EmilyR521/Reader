const { app, BrowserWindow } = require('electron');
const path = require('path');

const PORT = 3010;

// Set env before requiring server so server.js uses these values
function setEnv() {
  process.env.DATA_DIR = path.join(app.getPath('userData'), 'BooksData');
  process.env.PORT = String(PORT);
  // Angular build output (relative to project root when running "electron .")
  process.env.STATIC_PATH = path.join(__dirname, '..', 'dist', 'books-reading-list');
}

let mainWindow = null;

function createWindow() {
  // Use favicon from Angular build output (same location as static app)
  const iconPath = path.join(__dirname, '..', 'dist', 'books-reading-list', 'favicon.ico');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    title: "Books – Reading List"
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startApp() {
  setEnv();
  const { startServer } = require('../server');

  startServer()
    .then(() => {
      createWindow();
    })
    .catch((err) => {
      console.error('Failed to start server:', err);
      app.exit(1);
    });
}

// Single instance lock – focus existing window if user opens app again
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  return;
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(startApp);

app.on('window-all-closed', () => {
  app.quit();
});
