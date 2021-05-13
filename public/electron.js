const { app, BrowserWindow, dialog, ipcMain} = require('electron');

const path = require('path');
const isDev = require('electron-is-dev');
const url = require('url');
const fs = require('fs');

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
  mainWindow.on('closed', () => mainWindow = null);
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

let env=Object.assign({},process.env);
  env.ELECTRON_RUN_AS_NODE=1;
  const execSync = require('child_process').execSync;
  const exec = require('child_process').exec;
  const fork = require('child_process').fork;
  
  console.log("starting tor")
  let tor = exec("tor", {
      detached: false,
      stdio: 'ignore',
      env: env
  }, (error, stdout, stderr) => {
    if (error) {
      console.error(`error: ${error.message}`);
      return;
    }
  
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
  
    console.log(`stdout:\n${stdout}`);
  });
  
  //tor.unref();

  tor.stdout.on("data", function(data) {
    console.log("tor stdout: " + data.toString());
  });
  
  
  
  console.log("starting tor-adapter");
  let electronPath                                                                                                                                                           
   
  /*
  try {                         
    // bundled app                                                                                                                                             
    electronPath = require(path.join(remoteProcess.resourcesPath, '/../node_modules/electron'))                                                                              
  } catch (_) {              
    // during developement                                                                                                                                                
    electronPath = require(path.join(app.getAppPath(), '/node_modules/electron'))                                                                                            
  }
  */
  
  
  let tor_adapter = exec(`node ${__dirname}/tor-adapter/server/index.js`, {
  
  //let tor_adapter = fork(`${__dirname}/tor-adapter/server/index.js`);
    detached: false,
    stdio: 'ignore',
   //   env: env
    },
    (error, stdout, stderr) => {
      if (error) {
        console.error(`error: ${error.message}`);
        return;
      }
    
      if (stderr) {
        console.error(`stderr: ${stderr}`);
        return;
      }
    
      console.log(`stdout:\n${stdout}`);
    });
  
  //tor_adapter.unref();

  //tor_adapter.stdout.on("data", function(data) {
//    console.log("tor-adapter stdout: " + data.toString());
  //});



  app.on('exit', (error) => {
    console.log("stopping tor-adapter");
    tor_adapter.kill("SIGINT");
    console.log("stopping tor");
    tor.kill("SIGINT");
  });
  
