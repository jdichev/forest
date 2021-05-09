const path = require("path");
const { app, BrowserWindow, shell } = require("electron");
const projectConfig = require("forestconfig");
const forestserver = require("forestserver").default;
const MenuBuilder = require("./menu");
// const pino = require("pino")({ level: "trace" });

function startServer() {
  forestserver.start();
  app.on("will-quit", () => {
    forestserver.stop();
  });
}

function createWindow() {
  // pino.debug("process.env.NODE_ENV");
  // pino.debug(process.env.NODE_ENV);
  // pino.debug("projectConfig.env.DEVELOPMENT");
  // pino.debug(projectConfig.env.DEVELOPMENT);

  if (process.env.NODE_ENV !== projectConfig.env.DEVELOPMENT) {
    startServer();
  }

  const win = new BrowserWindow({
    show: false,
    width: 1000,
    height: 680,
    titleBarStyle: "hidden",
  });

  win.webContents.on("ready-to-show", () => {
    if (!win) {
      throw new Error('"win" is not defined');
    }

    win.show();
    win.focus();
  });

  if (process.env.NODE_ENV === projectConfig.env.DEVELOPMENT) {
    // pino.warn("DEV mode");
    win.loadURL(`http://localhost:${projectConfig.devServerPort}`);
  } else {
    // pino.warn("PROD mode");
    win.loadFile(
      path.join("node_modules", "forestwebapp", "dist", "index.html")
    );
  }

  // Open urls in the user's browser
  win.webContents.on("new-window", (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

  const menuBuilder = new MenuBuilder(win);
  menuBuilder.buildMenu();
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
