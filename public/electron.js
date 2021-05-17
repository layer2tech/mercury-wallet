const { app, BrowserWindow, dialog, ipcMain} = require('electron');

const path = require('path');
const isDev = require('electron-is-dev');
const url = require('url');
const fs = require('fs');
const fixPath = require('fix-path');

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

let tor_adapter = exec(`npm --prefix ${__dirname}/..//public/tor-adapter start`,
{
detached: true,
stdio: 'ignore',
  },
  (error) => {
    if(error){
      alert(`${error}`);
      app.exit(error);
    };
  }
);
tor_adapter.unref();

tor_adapter.stdout.on("data", function(data) {
  console.log("tor adapter stdout: " + data.toString());
});

tor_adapter.stderr.on("data", function(data) {
  console.log("tor adapter stderr: " + data.toString());
});
  
//Check if tor is running
let isTorRunning=true;
let tor;
console.log("Checking if tor is running on port 9050...");
exec("curl --socks5 localhost:9050 --socks5-hostname localhost:9050 -s https://check.torproject.org/ | cat | grep -m 1 Congratulations | xargs", 
(_error, stdout, _stderr) => {
    if (stdout.length <= 2){
	console.log("tor is not running on port 9050");
	isTorRunning=false;
	console.log("starting tor...");
	tor = exec("tor", {
	    detached: true,
	    stdio: 'ignore',
	},  (error) => {
       if(error){
         alert(`${error}`);
         app.exit(error);
       };
    });
   tor.unref();
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

app.on('exit', (error) => {
  console.log('calling exit');
  tor_adapter.kill();
  if(!isTorRunning){
    tor.kill();
  }
});

app.on('close', (error) => {
  console.log('calling close');
  tor_adapter.kill();
  if(!isTorRunning){
    tor.kill();
  }
});

  
