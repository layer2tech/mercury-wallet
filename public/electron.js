const { app, BrowserWindow, dialog, ipcMain, shell} = require('electron');
const { join, dirname } = require('path');
const joinPath = join;
const url = require('url');
const fs = require('fs');
const fixPath = require('fix-path');
const alert = require('alert');
const rootPath = require('electron-root-path').rootPath;
const axios = require('axios').default;
const execFile = require('child_process').execFile;

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
    await kill_tor();
  });

  mainWindow.on('closed', async () => {
    await kill_tor();
    mainWindow = null;
  });

  setInterval(async function() {
    await pingTorAdapter().catch((err) => {
      console.log(`Failed to ping tor adapter: ${err}`);
    });
  }, 5000);
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

async function pingTorAdapter() {
  await getTorAdapter('/tor_adapter/ping')
}

app.on('ready', () => {
  
    //Limit app to one instance
    if(!app.requestSingleInstanceLock()){
      alert("Cannot start mercury wallet - an instance of the app is already running.")
      app.quit();
    }
  
    init_tor_adapter();
  
    setInterval(async function() {
      await pingTorAdapter()
    }, 5000);


    createWindow();
  }
);

app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    await kill_tor();
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
  await kill_tor();
});

app.commandLine.appendSwitch('ignore-certificate-errors');

// Electron Store
const Store = require('electron-store');
Store.initRenderer();

async function check_tor_adapter(){
  const awaitTimeout = (delay, reason) =>
  new Promise((resolve, reject) =>
    setTimeout(
      () => (reason === undefined ? resolve() : reject(reason)),
      delay
    )
  );

  const wrapPromise = (promise, delay, reason) =>
    Promise.race([promise, awaitTimeout(delay, reason)]);

    console.log(`Requesting shutdown of existing tor adapter process, if any`)
    await wrapPromise(getTorAdapter('/tor_adapter/shutdown'), 10000, {
        reason: 'Fetch timeout',
      }).catch(data => {
        console.log(`Tor adapter shutdown failed with reason: ${data.reason}`);
      }
    );
}

async function init_tor_adapter() {
  await check_tor_adapter();

  const fork = require('child_process').fork;

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
  fork(`${tor_adapter_path}`, tor_adapter_args,
  {
    detached: false,
    stdio: 'ignore',
  },
  (error) => {
    if(error){
      console.log(error);
      app.exit(error);
    };
    }
  );
}
  
async function on_exit(){
  await kill_tor();
}

async function kill_tor(){
  await execFile('curl', ['http://localhost:3001/tor_adapter/shutdown/tor']);
}

process.on('SIGINT',on_exit);
process.on('exit',on_exit);
