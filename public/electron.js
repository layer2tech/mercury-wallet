const { app, BrowserWindow, dialog, ipcMain, shell} = require('electron');
const { join, dirname } = require('path');
const joinPath = join;
const url = require('url');
const fs = require('fs');
const fixPath = require('fix-path');
const alert = require('alert');
const rootPath = require('electron-root-path').rootPath;
const axios = require('axios').default;
const process = require('process')
const fork = require('child_process').fork;

function getPlatform(){
  switch (process.platform) {
    case 'aix':
    case 'freebsd':
    case 'linux':
    case 'openbsd':
    case 'android':
      return 'linux';
    case 'darwin':
    case 'sunos':
      return 'mac';
    case 'win32':
      return 'win';
  }

}

const isDev = (process.env.NODE_ENV == 'development');

let ta_process=undefined

let resourcesPath = undefined;
if(getPlatform() == 'linux') {
    resourcesPath = joinPath(dirname(rootPath), 'mercury-wallet', 'resources');
} else {
   resourcesPath = joinPath(dirname(rootPath), 'resources');
}
let execPath = undefined;
let torrc = undefined;
if(isDev) {
    execPath = joinPath(resourcesPath, getPlatform());
    torrc = joinPath(resourcesPath, 'etc', 'torrc');
} else {
    if(getPlatform() == 'linux') {
        execPath = joinPath(rootPath, '..', '..', 'Resources', 'bin');
    } else {
        console.log("root path: " + rootPath);
        execPath = joinPath(rootPath, '..', 'bin');
    }
    torrc = joinPath(execPath, '..', 'etc', 'torrc');
}

const tor_cmd = (getPlatform() === 'win') ? `${joinPath(execPath, 'Tor', 'tor')}`: `${joinPath(execPath, 'tor')}`;
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: "./icons/mercury-symbol-tri-color.png",
    webPreferences:
      {
        nodeIntegration: true,
        webSecurity: false,
        enableRemoteModule: true,
        preload: __dirname + '/preload.js'
      }
    });

  if (process.platform !== 'darwin') {
        mainWindow.setMenu(null);
  }
    
  // Open links in systems default browser
  mainWindow.webContents.on('new-window', function(e, url) {
    e.preventDefault();
    shell.openExternal(url);
  });

  const startUrl = url.format({
          pathname: joinPath(__dirname, '/../build/index.html'),
          protocol: 'file:',
          slashes: true
      });
  mainWindow.loadURL(isDev ? 'http://localhost:3000' : startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
  
  mainWindow.on('close', async () => {
  });

  mainWindow.on('closed', async () => {
    mainWindow = null;
  });
}

async function getTorAdapter(path) {
  const url = `http://localhost:3001${path}`
  const config = {
    method: 'get',
    url: url,
    headers: { 'Accept': 'application/json' }
  };
  await axios(config)
}

app.on('ready', () => {
  
    //Limit app to one instance
    if(!app.requestSingleInstanceLock()){
      alert("Cannot start mercury wallet - an instance of the app is already running.")
      app.quit();
    }
  
    init_tor_adapter();

    createWindow();
  }
);

app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.on('select-dirs', async (event, arg) => {
  const options = {
    title: "Save new file as...",
    defaultPath : `Backup-File-${new Date().toGMTString()}.json`,
    filters: [
      {name: 'JSON File', extensions: ['json']}
    ]
  }

let saveDialog = dialog.showSaveDialog(mainWindow, options);
  saveDialog.then(function(saveTo) {
    fs.writeFile(saveTo.filePath, JSON.stringify(arg) , (err) => {
        if(err){
          console.log("An error ocurred creating the file "+ err.message)
        }
        console.log("The file has been succesfully saved");
    });
  })
});

ipcMain.on('select-backup-file', async (event, arg) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'JSON File', extensions: ['json']}]
  });
  fs.readFile(result.filePaths[0], 'utf8', function (err, data) {
    if (err) return console.log(err);
    mainWindow.webContents.send('received-backup-data', data)
  });
});

 // You can use 'before-quit' instead of (or with) the close event
 app.on('before-quit', async function () {
});

app.commandLine.appendSwitch('ignore-certificate-errors');

// Electron Store
const Store = require('electron-store');
Store.initRenderer();

async function init_tor_adapter() {
  fixPath();
  console.log(tor_cmd);
  console.log(torrc);
  let user_data_path = app.getPath('userData');
  console.log(user_data_path);
  let tor_adapter_path=joinPath(__dirname,"..", "node_modules", "mercury-wallet-tor-adapter", "server", "index.js");
  let tor_adapter_args = [tor_cmd, torrc, user_data_path];
  if (getPlatform() === 'win'){
    tor_adapter_args.push(`${joinPath(execPath, 'Data', 'Tor', 'geoip')}`);
    tor_adapter_args.push(`${joinPath(execPath, 'Data', 'Tor', 'geoip6')}`);
  }
  ta_process = fork(`${tor_adapter_path}`, tor_adapter_args,
  {
    detached: false,
    stdio: 'ignore',
  },
  (error, stdout, _stderr)  => {
      if(error){
        app.exit(error);
      };
    }
  );
}
  
async function on_exit(){
  await kill_tor();
}

async function kill_tor(){
  console.log("terminating the tor adapter process...")
  await kill_process(ta_process.pid)
}

async function kill_process(pid){
  console.log(`terminating process with pid ${pid}`)
  process.kill(pid, "SIGTERM")
  try {
    //check if still running
    process.kill(pid, 0)
    //if still running wait, check again and send the kill signal
    console.log("process still running - waiting 1 second...")
    await new Promise(resolve => setTimeout(resolve, 1000))
    process.kill(pid, 0)
    console.log("process still running - waiting 1 second...")
    await new Promise(resolve => setTimeout(resolve, 1000))
    process.kill(pid, 0)
    console.log("process still running - sending kill signal...")
    process.kill(pid, "SIGKILL")
  } catch (err) {
    console.log(err?.message)
  }
}

process.on('SIGINT',on_exit);
process.on('SIGTERM',on_exit);
process.on('exit',on_exit);
