const { app, BrowserWindow, dialog, ipcMain, electron } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const os = require('os');
const alert = require('alert'); 

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

    // Open links in systems default browser
    mainWindow.webContents.on('new-window', function(e, url) {
      e.preventDefault();
      electron.shell.openExternal(url);
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

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
    })
}

if (process.platform !== 'darwin') {
  const Menu = electron.Menu;
  Menu.setApplicationMenu(false);
}
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
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


// Electron Store
const Store = require('electron-store');
Store.initRenderer();

let env=Object.assign({},process.env);
  env.ELECTRON_RUN_AS_NODE=1;
  
  const exec = require('child_process').exec;
  

  function openTerminal(cmd, options) {
    if (os.platform() !== 'darwin') throw new Error('Not supported');
  
    const command = [
      `osascript -e 'tell application "Terminal" to activate'`, 
      `-e 'tell application "System Events" to tell process "Terminal" to keystroke "t" using command down'`, 
      `-e 'tell application "Terminal" to do script "${cmd}" in selected tab of the front window'`
    ].join(" ");
  
    const child = exec(command, options, (error, stdout, stderr) => {
      if (error) {
        console.error(error);
        alert("Unable to open Terminal window, see dev console for error.");
      }
    });
  
    child.on("exit", (code) => console.log("Open terminal exit"));
    return child;
  }

  
  //console.log("starting tor")
  let tor = openTerminal("tor", {
       detached: false,
        stdio: 'ignore'
  });
  
  //exec("tor", {
  //    detached: false,
  //    stdio: 'ignore',
  //    env: env
  //});
  
  /*
  , (error, stdout, stderr) => {
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
  */


  tor.stdout.on("data", function(data) {
    console.log("tor stdout: " + data.toString());
  });
  
  
  
  //console.log("starting tor-adapter");
  let electronPath                                                                                                                                                           
   
  
  let tor_adapter = openTerminal(`node ${__dirname}/tor-adapter/server/index.js&`,
    {
    detached: false,
    stdio: 'ignore',
    });
  
  
    /*
  exec(`node ${__dirname}/tor-adapter/server/index.js`, {
    detached: false,
    stdio: 'ignore',
    });
    */
    
    /*
    ,
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
  */




  app.on('exit', (error) => {
    //console.log("stopping tor-adapter");
    tor_adapter.kill("SIGINT");
    //console.log("stopping tor");
    tor.kill("SIGINT");
  });
  
