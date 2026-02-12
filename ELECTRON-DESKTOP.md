# Bringing the Books App to Desktop with Electron

This document outlines the steps required to package the Books reading list (Angular frontend + Node/Express backend) as a desktop application using Electron. **These steps have been implemented** in this repo.

## Quick start

- **Run desktop app (after building once):**  
  `npm run build:prod && npm run electron`  
  or: `npm run electron:run`
- **Build installers:**  
  `npm run pack` (all platforms) or `npm run pack:win` / `npm run pack:mac` / `npm run pack:linux`

Data in desktop mode is stored under your user data directory (e.g. `%AppData%/books-reading-list/BooksData` on Windows), not in the project `data/` folder.

## Current Architecture

- **Frontend**: Angular 17, built to `dist/books-reading-list`, uses relative `/api/*` URLs.
- **Backend**: Express on port 3000, reads/writes JSON under `data/` (e.g. `data/Test.json`).
- **Dev**: `ng serve` proxies `/api` to the Express server.

For desktop, the same backend must run inside the app and store data in the user’s app data directory, and the Angular app must be served from the same origin as the API so `/api` keeps working.

---

## Steps Required

### 1. Install Electron and packaging tools

```bash
npm install --save-dev electron electron-builder
```

- **electron**: Runs the app in a desktop window.
- **electron-builder**: Builds installers (e.g. Windows `.exe`/MSI, macOS `.dmg`, Linux).

### 2. Make the backend configurable and servable by Electron

**2a. Use environment variables in `server.js`**

- **Data directory**: So Electron can point to `app.getPath('userData')` (e.g. `%AppData%/books-reading-list` on Windows).
- **Port**: So Electron can pick a fixed port (e.g. `3010`) and avoid conflicts.

In `server.js`:

- Replace fixed `DATA_DIR` and `PORT` with something like:

  ```js
  const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
  const PORT = parseInt(process.env.PORT || '3000', 10);
  ```

- Keep the rest of the API logic unchanged.

**2b. Serve the Angular build from Express when running in Electron**

When running inside Electron, Express should serve the built Angular app so the app is loaded from `http://localhost:<PORT>` and `/api` stays on the same origin.

In `server.js`, after the existing middleware and **before** defining API routes:

- If `process.env.STATIC_PATH` is set, add:

  ```js
  if (process.env.STATIC_PATH) {
    app.use(express.static(process.env.STATIC_PATH));
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.env.STATIC_PATH, 'index.html'));
    });
  }
  ```

  (Or only add the catch-all `app.get('*', ...)` if you prefer to serve static files only for known paths; the important part is that the SPA is served from the same host/port as `/api`.)

- Ensure API routes are registered **before** this catch-all so `/api/*` still hit Express.

Result: In Electron you’ll set `STATIC_PATH` to the path of `dist/books-reading-list`; in normal dev you won’t set it, so existing `ng serve` + proxy behavior is unchanged.

### 3. Electron main process

Add an Electron main entry point (e.g. `electron/main.js` or `main.js` in the project root).

- Use `app.getPath('userData')` to define the data directory (e.g. `path.join(app.getPath('userData'), 'BooksData')`).
- Set `DATA_DIR`, `PORT` (e.g. `3010`), and `STATIC_PATH` (path to `dist/books-reading-list`) in `process.env` **before** requiring `server.js`.
- Start the Express server by requiring your server (e.g. `require('./server.js')`). The server must **not** call `app.listen()` at the bottom when run by Electron; instead it should export a `startServer()` (or similar) that returns a promise and resolves when listening, and the bottom of `server.js` should only call `startServer()` when not required by Electron (e.g. when `require.main === module` or when a specific env like `RUN_STANDALONE` is set).
- Once the server is listening, create a `BrowserWindow` and load `http://localhost:<PORT>` (same port you set in `PORT`).
- Handle window close (e.g. `window.on('closed', () => app.quit())` and optionally prevent multiple main windows).

So:

- **Refactor `server.js`**: Export `app` and a `startServer()` that does `ensureDataDirectory()` then `app.listen(PORT, ...)` and resolves a promise. At the bottom, call `startServer()` only when the file is run directly (e.g. `node server.js`), not when required by Electron.
- **Electron main**: Set env → require server and call `startServer()` → on success, create `BrowserWindow` and `loadURL('http://localhost:3010')`.

### 4. Angular build for Electron

- Build the app so it can be served from Express:

  ```bash
  ng build --configuration production
  ```

- Use the default base href (`/`) so that when the app is served at `http://localhost:3010/`, assets and `/api` work. No code changes are needed in the Angular app if it already uses relative `/api` URLs.

- Optional: Add an npm script that builds Angular then runs Electron, e.g.:

  ```json
  "electron": "electron .",
  "build:electron": "ng build --configuration production && npm run electron"
  ```

  So “desktop run” is: build once, then start Electron (which starts Express with `STATIC_PATH` and opens the window).

### 5. Packaging and installers (electron-builder)

- In `package.json`, add a `"main"` entry point for Electron (e.g. `"main": "electron/main.js"` or `"main": "main.js"`).
- Add an `electron-builder` config (in `package.json` or `electron-builder.yml`) to:
  - Include the Angular output (e.g. `dist/books-reading-list`) and the server (e.g. `server.js` and any needed node modules) in the packaged app.
  - Set the correct `files`/`extraResources` so that the built app has:
    - The Electron main script.
    - The Express server and its dependencies.
    - The `dist/books-reading-list` folder (or whatever path you set as `STATIC_PATH` at runtime).
- Ensure the packaged app, when run, sets `STATIC_PATH` to the path inside the package (e.g. `path.join(__dirname, 'dist', 'books-reading-list')` or `path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'books-reading-list')` depending on how you pack the app).
- Add a script to build the Angular app and then run electron-builder, e.g.:

  ```json
  "pack": "ng build --configuration production && electron-builder",
  "pack:win": "ng build --configuration production && electron-builder --win",
  "pack:mac": "ng build --configuration production && electron-builder --mac"
  ```

Result: Running `npm run pack` (or platform-specific commands) produces installers that install the desktop app; on first run, the app uses the user’s app data directory for `data/` and serves the Angular UI from the same process so `/api` works.

### 6. Optional improvements

- **Single instance**: Use `app.requestSingleInstanceLock()` so only one app instance runs.
- **Tray icon**: Optional system tray icon with “Quit” and “Open” if you minimize to tray.
- **Dev experience**: A script that runs `ng build --watch` and restarts Electron on change, or loads `http://localhost:4200` in dev (with API proxy) and `http://localhost:3010` in packaged mode.
- **Security**: In the Electron renderer (Angular), avoid enabling Node integration; keep `nodeIntegration: false` and `contextIsolation: true` so the frontend stays a normal web app talking to the local API.

---

## Summary checklist

| Step | Action |
|------|--------|
| 1 | Install `electron` and `electron-builder` as dev dependencies. |
| 2a | In `server.js`, use `process.env.DATA_DIR` and `process.env.PORT`. |
| 2b | In `server.js`, when `process.env.STATIC_PATH` is set, serve that folder and SPA fallback. |
| 3 | Refactor `server.js` to export `startServer()` and only auto-start when run standalone. |
| 4 | Add Electron main script: set env (userData, PORT, STATIC_PATH), start server, then open `BrowserWindow` to `http://localhost:<PORT>`. |
| 5 | Add `main` in `package.json` and electron-builder config; add `pack` script that builds Angular then runs electron-builder. |
| 6 | (Optional) Single instance lock, tray, and secure renderer settings. |

After these steps, you can run the app locally with Electron and produce desktop installers for Windows, macOS, and Linux that use the same codebase and store data in the user’s app data directory.
