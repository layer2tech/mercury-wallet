const { app, BrowserWindow, dialog, ipcMain} = require('electron');
const { join, dirname } = require('path');
const joinPath = join;
const url = require('url');
const fs = require('fs');
const fixPath = require('fix-path');
const alert = require('alert');
const rootPath = require('electron-root-path').rootPath;

function getPlatform(){
  console.log("platform: " + process.platform);
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

var execPath;
if(isDev) {
    execPath = joinPath(dirname(rootPath), 'bin');
} else {
    if(getPlatform() == 'linux') {
	execPath = joinPath(rootPath, '../../Resources/bin');
    } else {
	execPath = joinPath(rootPath, '../bin');
    }
}

const tor_cmd = `${joinPath(execPath, 'tor')}`;

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


const exec = require('child_process').exec;
const fork = require('child_process').fork;

fixPath();

let tor_adapter = fork(`${__dirname}/../node_modules/mercury-wallet-tor-adapter/server/index.js`,
{
detached: false,
stdio: 'ignore',
  },
  (error) => {
    if(error){
      app.exit(error);
    };
  }
);
  
//Check if tor is running
let isTorRunning=true;
let tor = undefined;
console.log("Checking if tor is running on port 9050...");
exec("curl --socks5 localhost:9050 --socks5-hostname localhost:9050 -s https://check.torproject.org/ | cat | grep -m 1 Congratulations | xargs", 
(_error, stdout, _stderr) => {
    if (stdout.length <= 2){
	console.log("tor is not running on port 9050");
	isTorRunning=false;
	console.log("starting tor...");
	tor = exec(tor_cmd, {
	    detached: false,
	    stdio: 'ignore',
	},  (error) => {
       if(error){
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


async function on_exit(){
  await kill_tor();
  process.exit(0)
}

async function kill_tor(){
  await process.kill(tor_adapter.pid,"SIGINT");
  if(tor){
    await process.kill(tor.pid,"SIGINT");
  }
}

process.on('SIGINT',on_exit);
process.on('exit',on_exit);
