const isPackaged =
  require.main.filename.replace(/\\/g, "/").indexOf("app/build/electron.js") !==
  -1;
const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  shell,
  nativeTheme,
  session,
} = require("electron");
const { join, dirname } = require("path");
const joinPath = join;
const url = require("url");
const fs = require("fs");
const fixPath = require("fix-path");
const alert = require("alert");
const rootPath = require("electron-root-path").rootPath;
const axios = require("axios").default;
const process = require("process");
const fork = require("child_process").fork;
const exec = require("child_process").exec;

// set to testnet mode for testing
if (
  isPackaged ||
  !require(joinPath(rootPath, "src", "settings.json")).testing_mode
) {
  require("@electron/remote/main").initialize();
}

app.disableHardwareAcceleration();

function getPlatform() {
  switch (process.platform) {
    case "aix":
    case "freebsd":
    case "linux":
    case "openbsd":
    case "android":
      return "linux";
    case "darwin":
    case "sunos":
      return "mac";
    case "win32":
      return "win";
  }
}

const isDev = process.env.NODE_ENV == "development";

let ta_process = undefined;
let la_process = undefined;
let i2p_process = undefined;
let resourcesPath = undefined;
let iconPath = undefined;
let execPath = undefined;
let torrc = undefined;
let anon_adapter_path = undefined;
let lightning_adapter_path = undefined;

if (isPackaged === true) {
  if (getPlatform() == "linux") {
    resourcesPath = joinPath(dirname(rootPath), "mercury-wallet", "resources");
  } else {
    resourcesPath = joinPath(dirname(rootPath), "resources");
  }

  if (getPlatform() == "linux") {
    execPath = joinPath(rootPath, "..", "..", "Resources", "bin");
    iconPath = joinPath(
      rootPath,
      "..",
      "..",
      "resources",
      "app",
      "build",
      "icons",
      "mercury-symbol-tri-color.png"
    );
  } else {
    execPath = joinPath(rootPath, "..", "bin");
  }
  torrc = joinPath(execPath, "..", "etc", "torrc");
  anon_adapter_path = joinPath(
    __dirname,
    "..",
    "node_modules",
    "mercury-wallet-tor-adapter",
    "server",
    "index.js"
  );
  lightning_adapter_path = joinPath(
    __dirname,
    "..",
    "node_modules",
    "mercury-wallet-ts-lightning-adapter",
    "src",
    "server.ts"
  );
} else {
  resourcesPath = joinPath(rootPath, "resources");
  execPath = joinPath(resourcesPath, getPlatform());
  iconPath = joinPath(
    rootPath,
    "build",
    "icons",
    "mercury-symbol-tri-color.png"
  );
  torrc = joinPath(resourcesPath, "etc", "torrc");
  anon_adapter_path = joinPath(
    rootPath,
    "node_modules",
    "mercury-wallet-tor-adapter",
    "server",
    "index.js"
  );
  lightning_adapter_path = joinPath(
    __dirname,
    "..",
    "node_modules",
    "mercury-wallet-ts-lightning-adapter",
    "src",
    "server.ts"
  );
}

const tor_cmd =
  getPlatform() === "win"
    ? `${joinPath(execPath, "Tor", "tor")}`
    : `${joinPath(execPath, "tor")}`;

const i2p_cmd = `${joinPath(execPath, "i2pd")}`;

let term_existing = false;
for (let i = 0; i < process.argv.length; i++) {
  if (process.argv[i].includes("term_existing")) {
    term_existing = true;
  }
}

let mainWindow = null;

function createWindow() {
  let windowSpec = {
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false,
      enableRemoteModule: true,
      backgroundThrottling: false,
      contextIsolation: false,
      preload: __dirname + "/preload.js",
    },
  };
  if (iconPath) {
    windowSpec.icon = iconPath;
  }

  // Get "testnet" setting
  ipcMain.handle("testnet-mode", async () => {
    for (let i = 0; i < process.argv.length; i++) {
      if (process.argv[i].includes("testnet")) {
        return true;
      }
    }
    return false;
  });

  // Add function to change Main Window DarkMode
  ipcMain.handle("dark-mode:on", () => {
    nativeTheme.themeSource = "dark";
    return nativeTheme.shouldUseDarkColors;
  });

  // Add function to change Main Window DarkMode to System settings
  ipcMain.handle("dark-mode:off", () => {
    nativeTheme.themeSource = "light";
  });

  if (mainWindow == null) {
    mainWindow = new BrowserWindow(windowSpec);
  }

  require("@electron/remote/main").enable(mainWindow.webContents);

  if (process.platform !== "darwin") {
    mainWindow.setMenu(null);
  }

  // Open links in systems default browser
  mainWindow.webContents.on("new-window", function (e, url) {
    e.preventDefault();
    shell.openExternal(url);
  });

  const envStartUrl = isPackaged ? null : process.env.ELECTRON_START_URL;
  const startUrl =
    envStartUrl ||
    url.format({
      pathname: joinPath(__dirname, "..", "build", "index.html"),
      protocol: "file:",
      slashes: true,
    });
  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("close", async () => {
    mainWindow.removeAllEventListeners();
  });

  mainWindow.on("closed", async () => {
    mainWindow = null;
  });

  if (isDev) {
    // Using require
    const {
      default: installExtension,
      REACT_DEVELOPER_TOOLS,
      REDUX_DEVTOOLS,
    } = require("electron-devtools-installer");

    installExtension(REACT_DEVELOPER_TOOLS)
      .then((name) => {
        console.log(`Added Extension:  ${name}`);
      })
      .catch((err) => {
        console.log("An error occurred: ", err);
      });
    installExtension(REDUX_DEVTOOLS)
      .then((name) => {
        console.log(`Added Extension:  ${name}`);
      })
      .catch((err) => {
        console.log("An error occurred: ", err);
      });
  }
}

async function getTorAdapter(path) {
  const url = `http://localhost:3001${path}`;
  const config = {
    method: "get",
    url: url,
    headers: { Accept: "application/json" },
  };
  await axios(config);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  //Limit app to one instance
  if (
    !app.requestSingleInstanceLock() &&
    !(term_existing && getPlatform() === "win")
  ) {
    alert("mercurywallet is already running. Not opening app.");
    app.quit();
  }

  // Clears cookie storage
  // Persisted web store must be wiped for electron in case redux store has changed
  //session.defaultSession.clearStorageData([], data => {})

  terminate_tor_process();
  terminate_mercurywallet_process(null, "tor");
  terminate_mercurywallet_process(init_adapter, "i2p");
  // TO DO: Uncomment line below
  // terminate_mercurywallet_process(init_lightning_adapter, null);
  createWindow();
});

app.on("window-all-closed", async () => {
  terminate_tor_process(); // ensure the tor processes are closed after s
  terminate_mercurywallet_process(null, "i2p");
  // TO DO: Uncomment line below
  // terminate_mercurywallet_process(init_lightning_adapter, null);
  app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.on("select-dirs", async (event, arg) => {
  let dateString = new Date()
    .toGMTString()
    .replace(/,/g, "")
    .replace(/:/g, "-");
  const options = {
    title: "Save new file as...",
    defaultPath: `Backup-File-${dateString}.json`,
    filters: [{ name: "JSON File", extensions: ["json"] }],
  };

  let saveDialog = dialog.showSaveDialog(mainWindow, options);
  saveDialog.then(function (saveTo) {
    fs.writeFile(saveTo.filePath, JSON.stringify(arg), (err) => {
      if (err) {
        console.log("An error ocurred creating the file " + err.message);
      }
      console.log("The file has been succesfully saved");
    });
  });
});

ipcMain.on("select-backup-file", async (event, arg) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [{ name: "JSON File", extensions: ["json"] }],
  });
  fs.readFile(result.filePaths[0], "utf8", function (err, data) {
    if (err) return console.log(err);
    mainWindow.webContents.send("received-backup-data", data);
  });
});

// You can use 'before-quit' instead of (or with) the close event
app.on("before-quit", async function () {
  terminate_mercurywallet_process(null, "i2p");
  terminate_mercurywallet_process(null, "tor");
  // TO DO: Uncomment line below
  // terminate_mercurywallet_process(init_lightning_adapter, null);
});

app.allowRendererProcessReuse = false;
app.commandLine.appendSwitch("ignore-certificate-errors");

// Electron Store
const Store = require("electron-store");
Store.initRenderer();

async function init_adapter() {
  fixPath();

  let user_data_path = app.getPath("userData");

  let adapter_args = [torrc, user_data_path];

  let tor_adapter_args = adapter_args;

  if (getPlatform() === "win") {
    tor_adapter_args.push(`${joinPath(execPath, "Data", "Tor", "geoip")}`);
    tor_adapter_args.push(`${joinPath(execPath, "Data", "Tor", "geoip6")}`);
  }

  ta_process = fork(
    `${anon_adapter_path}`,
    [tor_cmd, ...tor_adapter_args],
    {
      detached: false,
      stdio: "ignore",
    },
    (error, stdout, _stderr) => {
      if (error) {
        app.exit(error);
      }
    }
  );

  i2p_process = fork(
    `${anon_adapter_path}`,
    [i2p_cmd, ...adapter_args],
    {
      detached: false,
      stdio: "ignore",
    },
    (error, stdout, _stderr) => {
      if (error) {
        app.exit(error);
      }
    }
  );
}

async function init_lightning_adapter() {
  // la_process = fork(lightning_adapter_path, ['start'],
  //   {
  //     detached: false,
  //     stdio: 'ignore',
  //   },
  //   (error, stdout, _stderr) => {
  //     if (error) {
  //       app.exit(error);
  //     };
  //   }
  // );
  la_process = fork(
    lightning_adapter_path,
    {
      execArgv: ["--loader", "ts-node/esm"],
      cwd: lightning_adapter_path.replace("/src/server.ts", ""),
    },
    (error, stdout, _stderr) => {
      err = error;
      stdout1 = stdout;
      console.log("stdout: ", stdout);
      if (error) {
      }
    }
  );
}

const terminate_tor_process = () => {
  // remove tor from windows processes and mercury wallet if it exists.
  if (getPlatform() === "win") {
    exec(
      'get-process | where {$_.ProcessName -Like "tor*"}',
      { shell: "powershell.exe" },
      (error, stdout, stderr) => {
        if (error) {
          console.error(`terminate_tor_process- exec error: ${error}`);
          console.log(`terminate_tor_process- exec error: ${error}`);
          return;
        }
        if (stderr) {
          console.log(`terminate_tor_process- error: ${stderr}`);
          return;
        }

        // must be a tor process found
        if (stdout.length > 0) {
          exec(
            "taskkill /f /t /im tor.exe",
            { shell: "powershell.exe" },
            (err2, stdout2, stderr2) => {
              // log to file
              if (err2) {
                console.error(`terminate_tor_process- exec error: ${err2}`);
                console.log(`terminate_tor_process- exec error: ${err2}`);
                return;
              }
              if (stderr2) {
                console.log(`terminate_tor_process- error: ${stderr2}`);
                return;
              }
            }
          );
        } else {
          // TODO: check if mercurywallet.exe exists
          // TODO: check if network was lost
        }
      }
    );
  }
};

// Terminate the parent process of any running mercurywallet processes.
function terminate_mercurywallet_process(init_new, network) {
  let command;
  if (getPlatform() === "win") {
    if (isDev) {
      command =
        "wmic process where name='electron.exe' get ParentProcessId,ProcessId";
    } else {
      command =
        "wmic process where name='mercurywallet.exe' get ParentProcessId,ProcessId";
    }
  } else {
    if (network === "tor") {
      command =
        'echo `ps axo "pid,ppid,command" | grep mercury | grep tor | grep -v grep`';
    } else {
      command =
        'echo `ps axo "pid,ppid,command" | grep mercury | grep i2p | grep -v grep`';
    }
  }

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`terminate_mercurywallet_process- exec error: ${error}`);
      console.log(`terminate_mercurywallet_process- exec error: ${error}`);
      return;
    }
    if (stderr) {
      console.log(`terminate_mercurywallet_process- error: ${stderr}`);
      return;
    }

    let pid = null;

    //Split by new line
    const pid_arr = stdout.split(/\r\n|\n\r|\n|\r/);
    //If windows check this is not the current process or one of its child processes
    if (getPlatform() === "win") {
      for (i = 1; i < pid_arr.length; i++) {
        const tmp_arr = pid_arr[i].trim().replace(/\s+/g, " ").split(" ");
        const ppid = parseInt(tmp_arr[0]);
        pid = parseInt(tmp_arr[1]);
        if (ppid !== process.pid && pid !== process.pid) {
          break;
        } else {
          pid = null;
        }
      }
    } else {
      pid_str = pid_arr[0].trim().replace(/\s+/g, " ").split(" ")[0];
      if (pid_str) {
        pid = parseInt(pid_str);
      }
    }

    if (pid) {
      console.log(`terminating existing mercurywallet process: ${pid}`);
      kill_process(pid, init_new);
      return;
    }

    if (init_new) {
      init_new();
    }
    return;
  });
}

async function on_exit() {
  await kill_tor();
  await kill_i2p();
}

async function kill_tor() {
  if (ta_process) {
    console.log("terminating the tor adapter process...");
    await kill_process(ta_process.pid);
  }
}

async function kill_i2p() {
  if (i2p_process) {
    console.log("terminating the i2p adapter process...");
    await kill_process(i2p_process.pid);
  }
}

async function kill_process(pid, init_new) {
  console.log(`terminating process with pid ${pid}`);
  process.kill(pid, "SIGTERM");
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    //check if still running
    process.kill(pid, 0);
    //if still running wait, check again and send the kill signal
    await new Promise((resolve) => setTimeout(resolve, 1000));
    process.kill(pid, 0);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    process.kill(pid, 0);
    console.log("process still running - sending kill signal...");
    process.kill(pid, "SIGKILL");
  } catch (err) {
    console.log(err?.message);
  }
  if (init_new) {
    init_new();
  }
}

process.on("SIGINT", on_exit);
process.on("SIGTERM", on_exit);
process.on("exit", on_exit);
