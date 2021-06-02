const { app, BrowserWindow, dialog, ipcMain} = require('electron');
const { join, dirname } = require('path');
const joinPath = join;
const url = require('url');
const fs = require('fs');
const fixPath = require('fix-path');
const alert = require('alert');
const rootPath = require('electron-root-path').rootPath;

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
    resourcesPath = joinPath(dirname(rootPath), 'mercury-wallet/resources');
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
        execPath = joinPath(rootPath, '../../Resources/bin');
    } else {
        console.log("root path: " + rootPath);
        execPath = joinPath(rootPath, '../bin');
    }
    torrc = joinPath(execPath, '../etc/torrc');
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
    electron.shell.openExternal(url);
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
}

app.on('ready', createWindow);

app.on('window-all-closed', async () => {
  await kill_tor();
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

// Electron Store
const Store = require('electron-store');
Store.initRenderer();

const fork = require('child_process').fork;
const exec = require('child_process').exec;

fixPath();
console.log(tor_cmd);
console.log(torrc);
let user_data_path = app.getPath('userData');
console.log(user_data_path);
console.log(`${__dirname}/../node_modules/mercury-wallet-tor-adapter/server/index.js`);
//Don't start tor adapter
/*
fork(`${__dirname}/../node_modules/mercury-wallet-tor-adapter/server/index.js`, [tor_cmd, torrc, user_data_path],
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
*/
  
async function on_exit(){
  await kill_tor();
  process.exit(0)
}

async function kill_tor(){
  await exec('curl localhost:3001/shutdown');
}

process.on('SIGINT',on_exit);
process.on('exit',on_exit);
