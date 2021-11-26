const fs = require('fs');
const { join, dirname } = require('path');
const joinPath = join;
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const url = require('url');
const fixPath = require('fix-path');
const alert = require('alert');
const rootPath = require('electron-root-path').rootPath;
const axios = require('axios').default;
const process = require('process')
const fork = require('child_process').fork;
const exec = require('child_process').exec;
const execFile = require('child_process').execFile;

const getPlatform = () => {
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

let ta_process=undefined

let resourcesPath = undefined;
resourcesPath = joinPath(dirname(rootPath), 'mercury-wallet/resources');

let execPath = undefined;
let torrc = undefined;

execPath = joinPath(resourcesPath, getPlatform());
torrc = joinPath(resourcesPath, 'etc', 'torrc');

const tor_cmd = (getPlatform() === 'win') ? `${joinPath(execPath, 'Tor', 'tor')}`: `${joinPath(execPath, 'tor')}`;

let term_existing = false;
for(let i=0; i<process.argv.length;i++){
  if (process.argv[i].includes('term_existing')){
    term_existing=true
  }
}

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
          contextIsolation: false,
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
  });

    // Emitted when the window is closed.
    mainWindow.on('closed', async function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
    })



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

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  //Limit app to one instance
  if(!app.requestSingleInstanceLock() && !(term_existing && getPlatform() === 'win') ){
    alert('mercurywallet is ing. Not opening app.')
    app.quit()
  }

  terminate_mercurywallet_process(init_tor_adapter);
  createWindow()
  }
);

// Quit when all windows are closed.
app.on('window-all-closed', async function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    app.quit()
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

async function init_tor_adapter(){
  console.log("init tor adapter")
  fixPath();
  let tor_adapter_path = `${__dirname}/../tor-adapter/server/index.js`
  console.log(`starting tor adapter from: ${tor_adapter_path}`);
  console.log(`tor_cmd: ${tor_cmd}`);
  console.log(`torrc: ${torrc}`);
  let user_data_path = app.getPath('userData');
  console.log(`user data path: ${user_data_path}`);
  let tor_adapter_args=[tor_cmd, torrc, user_data_path];
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

// Terminate the parent process of any running mercurywallet processes.
function terminate_mercurywallet_process(init_new) {
  let command
  if(getPlatform() === 'win'){
    command = 'wmic process where name=\'mercurywallet.exe\' get ParentProcessId,ProcessId'
  } else {
    command = 'echo `ps axo \"pid,ppid,command\" | grep mercury | grep tor | grep -v grep`'
  }
  exec(command, (error, stdout, stderr) => {
    if(error) {
      console.error(`terminate_mercurywallet_process- exec error: ${error}`)
      console.log(`terminate_mercurywallet_process- exec error: ${error}`)
      return
    }
    if(stderr){
      console.log(`terminate_mercurywallet_process- error: ${stderr}`)
      return
    }
  
    let pid=null
    //Split by new line
    const pid_arr = stdout.split(/\r\n|\n\r|\n|\r/)
    //If windows check this is not the current process or one of its child processes
    if(getPlatform() === 'win'){
      for(i=1; i<pid_arr.length; i++){
        const tmp_arr = pid_arr[i].trim().replace(/\s+/g,' ').split(' ')
        const ppid = parseInt(tmp_arr[0])
        pid = parseInt(tmp_arr[1])
        if (ppid !== process.pid && pid !== process.pid) {
          break;
        } else {
          pid=null
        }
      }
    } else {
      pid_str=pid_arr[0].trim().replace(/\s+/g,' ').split(' ')[0]
      if(pid_str){
        pid=parseInt(pid_str)
      }
    }

    if(pid){
      console.log(`terminating existing mercurywallet process: ${pid}`)
      kill_process(pid, init_new)
      return
    } 

    init_new()
    return  
  })
}
  
async function on_exit(){
  await kill_tor();
}

async function kill_tor(){
    console.log("terminating the tor adapter process...")
    if(ta_process){
      await kill_process(ta_process.pid)
    }
}

async function kill_process(pid, init_new){
  console.log(`terminating process with pid ${pid}`)
  process.kill(pid, "SIGTERM")
  try {
    await new Promise(resolve => setTimeout(resolve, 1000))
    //check if still running
    process.kill(pid, 0)
    //if still running wait, check again and send the kill signal
    await new Promise(resolve => setTimeout(resolve, 1000))
    process.kill(pid, 0)
    await new Promise(resolve => setTimeout(resolve, 1000))
    process.kill(pid, 0)
    console.log("process still running - sending kill signal...")
    process.kill(pid, "SIGKILL")
  } catch (err) {
    console.log(err?.message)
  }
  if(init_new){
    init_new()
  }
}

process.on('SIGINT',on_exit);
process.on('SIGTERM',on_exit);
process.on('exit',on_exit);



