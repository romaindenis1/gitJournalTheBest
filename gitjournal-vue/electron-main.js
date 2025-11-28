const { app, BrowserWindow } = require("electron");
const path = require("path");
const startServer = require("../server/server"); // Importe ton backend

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, "public/icon.png"), // Assure-toi d'avoir une icône
  });

  // En PROD (dans le .exe), on charge le fichier index.html buildé
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, "dist", "index.html"));
  } else {
    // En DEV, on charge l'URL de Vite
    mainWindow.loadURL("http://localhost:5173");
  }
}

app.whenReady().then(() => {
  // 1. On récupère le chemin "AppData" sécurisé de l'utilisateur
  const userDataPath = app.getPath("userData");

  // 2. On démarre le Backend en lui donnant ce chemin
  startServer(userDataPath);

  // 3. On ouvre la fenêtre Frontend
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
