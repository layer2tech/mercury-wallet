const { app, BrowserWindow, dialog, ipcMain, electron } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const fixPath = require('fix-path');
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

    if (process.platform !== 'darwin') {
	mainWindow.setMenu(null);
    }
    
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

  mainWindow.on('close', function () {
        kill_tor();
  });

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        kill_tor();
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
app.on('window-all-closed', function () {
    kill_tor();
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


const exec = require('child_process').exec;

fixPath();
console.log(`starting tor adapter from: ${__dirname}`);
//let tor_adapter = exec(`npm --prefix ${__dirname}/../node_modules/mercury-wallet-tor-adapter start`,
let tor_adapter = exec(`node ${__dirname}/../node_modules/mercury-wallet-tor-adapter/server/index.js`,
{
detached: false,
stdio: 'ignore',
  },
  (error) => {
    if(error){
      //alert(`${error}`);
      app.exit(error);
    };
  }
);


tor_adapter.stdout.on("data", function(data) {
  console.log("tor adapter stdout: " + data.toString());
});

tor_adapter.stderr.on("data", function(data) {
  console.log("tor adapter stderr: " + data.toString());
});
  
//Check if tor is running
let isTorRunning=true;
let tor=undefined;
console.log("Checking if tor is running on port 9050...");
exec("curl --socks5 localhost:9050 --socks5-hostname localhost:9050 -s https://check.torproject.org/ | cat | grep -m 1 Congratulations | xargs", 
(_error, stdout, _stderr) => {
    if (stdout.length <= 2){
	console.log("tor is not running on port 9050");
	isTorRunning=false;
	console.log("starting tor...");
	tor = exec("tor", {
	    detached: false,
	    stdio: 'ignore',
	},  (error) => {
       if(error){
         alert(`${error}`);
         app.exit(error);
       };
    });
   
   tor.stdout.on("data", function(data) {
   console.log("tor stdout: " + data.toString());  
   }
		);
 
   tor.stderr.on("data", function(data) {
     console.log("tor stderr: " + data.toString());
   });
	} else {
	    console.log("tor is running on port 9050");
	}

});

function on_exit(){
  kill_tor();
  process.exit(0)
}

function kill_tor(){
  process.kill(tor_adapter.pid,"SIGINT");
  if(tor){
    process.kill(tor.pid,"SIGINT");
  }
}

process.on('SIGINT',on_exit);
process.on('exit',on_exit);



