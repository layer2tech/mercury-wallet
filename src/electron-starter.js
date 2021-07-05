const { join, dirname } = require('path');
const joinPath = join;
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const fixPath = require('fix-path');
const alert = require('alert');
const rootPath = require('electron-root-path').rootPath;
const ipc = require('electron').ipcMain;
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

let resourcesPath = undefined;
resourcesPath = joinPath(dirname(rootPath), 'mercury-wallet/resources');

let execPath = undefined;
let torrc = undefined;

execPath = joinPath(resourcesPath, getPlatform());
torrc = joinPath(resourcesPath, 'etc', 'torrc');

const tor_cmd = (getPlatform() === 'win') ? `${joinPath(execPath, 'Tor', 'tor')}`: `${joinPath(execPath, 'tor')}`;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({width: 1200, height: 800,
      webPreferences:
        {
          nodeIntegration: true,
          webSecurity: false,
          enableRemoteModule: true,
          backgroundThrottling: false,
          preload: __dirname + '/preload.js'
        }
      }
    );

    if (process.platform !== 'darwin') {
	mainWindow.setMenu(null);
    }
    
    // Open links in systems default browser
    mainWindow.webContents.on('new-window', function(e, url) {
      e.preventDefault();
      shell.openExternal(url);
    });

    // and load the index.html of the app.
    const startUrl = process.env.ELECTRON_START_URL || url.format({
            pathname: path.join(__dirname, '/../build/index.html'),
            protocol: 'file:',
            slashes: true
        });
    mainWindow.loadURL(startUrl);
    // Open the DevTools.
    mainWindow.webContents.openDevTools();

  mainWindow.on('close', async function () {
        await kill_tor();
  });

    // Emitted when the window is closed.
    mainWindow.on('closed', async function () {
        await kill_tor();
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
    })
}


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', async function () {
    await kill_tor();
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow()
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

app.allowRendererProcessReuse = false;

app.commandLine.appendSwitch('ignore-certificate-errors');

// Electron Store
const Store = require('electron-store');
Store.initRenderer();

const fork = require('child_process').fork;

fixPath();
let tor_adapter_path = `${__dirname}/../tor-adapter/server/index.js`
console.log(`starting tor adapter from: ${tor_adapter_path}`);
console.log(`tor_cmd: ${tor_cmd}`);
console.log(`torrc: ${torrc}`);
let tor_data_path = joinPath(app.getPath('userData'),'tor');
console.log(`tor data path: ${tor_data_path}`);
let tor_adapter_args=[tor_cmd, torrc, tor_data_path];
if (getPlatform() === 'win'){
  tor_adapter_args.push(`${joinPath(execPath, 'Data', 'Tor', 'geoip')}`);
  tor_adapter_args.push(`${joinPath(execPath, 'Data', 'Tor', 'geoip6')}`);
}
fork(`${tor_adapter_path}`, tor_adapter_args,
{
detached: false,
stdio: 'ignore',
  },
  (error, stdout, _stderr)  => {
    if(error){
      app.exit(error);
    };
    //if(stdout){
    //  console.log(stdout);
    //};
  }
);
  
async function on_exit(){
  await kill_tor();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function kill_tor(){
    await execFile('curl', ['http://localhost:3001/shutdown/tor']);
}

process.on('SIGINT',on_exit);
process.on('exit',on_exit);



