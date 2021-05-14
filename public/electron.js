const { app, BrowserWindow, dialog, ipcMain} = require('electron');

const path = require('path');
const isDev = require('electron-is-dev');
const url = require('url');
const fs = require('fs');
const os = require('os');
const fixPath = require('fix-path');
const alert = require('alert'); 

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

  // Open links in systems default browser
  mainWindow.webContents.on('new-window', function(e, url) {
    e.preventDefault();
    electron.shell.openExternal(url);
  });

  const startUrl = url.format({
          pathname: path.join(__dirname, '/../build/index.html'),
          protocol: 'file:',
          slashes: true
      });
  mainWindow.loadURL(isDev ? 'http://localhost:3000' : startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
  mainWindow.on('closed', () => {
    mainWindow = null;
    tor.kill();
    tor_adapter.kill();
  });
}

if (process.platform !== 'darwin') {
  const Menu = electron.Menu;
  Menu.setApplicationMenu(false);
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
  tor.kill();
  tor_adapter.kill();
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

const exec = require('child_process').exec;

  fixPath();
  
  let tor = exec("tor", {
       detached: true,
        stdio: 'ignore',
  });
  tor.unref()

  tor.stdout.on("data", function(data) {
    console.log("tor stdout: " + data.toString());
  });
  
  
    
  let tor_adapter = exec(`npm --prefix ${__dirname}/tor-adapter start`,
    {
    detached: true,
    stdio: 'ignore',
      });
    tor_adapter.unref();

    tor_adapter.stdout.on("data", function(data) {
      console.log("tor adapter stdout: " + data.toString());
    });
  
  app.on('exit', (error) => {
      tor_adapter.kill();
      tor.kill();
  });

  app.on('close', (error) => {
      tor_adapter.kill();
      tor.kill();
  });
  
