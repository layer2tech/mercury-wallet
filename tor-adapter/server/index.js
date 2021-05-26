var TorClient = require('./tor_client');
var bodyParser = require('body-parser');
var Config = new require('./config');
const config = new Config();
const tpc = config.tor_proxy;
const express = require("express");
const { join, dirname } = require('path');
const joinPath = join;
const exec = require('child_process').exec;
const execSync = require('child_process').execSync;
const fork = require('child_process').fork;
const rootPath = require('electron-root-path').rootPath;
let resourcesPath = undefined;
if(getPlatform() == 'linux') {
    resourcesPath = joinPath(dirname(rootPath), 'mercury-wallet/resources');
} else {
   resourcesPath = joinPath(dirname(rootPath), 'resources');
}
let execPath = undefined;
let torrc = undefined;
if(process.env.NODE_ENV == 'development') {
    console.log("dev mode");
    execPath = joinPath(resourcesPath, getPlatform());
    torrc = joinPath(resourcesPath, 'etc', 'torrc');
} else {
    if(getPlatform() == 'linux') {
        console.log("linux prod");
        execPath = joinPath(rootPath, '../../Resources/bin');
    } else {
        console.log("mac prod");
        execPath = joinPath(rootPath, '../../../bin');
    }
    torrc = joinPath(execPath, '../etc/torrc');
}

console.log("torrc: " + torrc);
const tor_cmd = (getPlatform() === 'win') ? `${joinPath(execPath, 'Tor', 'tor')}`: `${joinPath(execPath, 'tor')}`;
console.log("tor_cmd: " + tor_cmd);


function getPlatform() {
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

const PORT = 3001;

const app = express();
app.use(bodyParser.json());

app.listen(PORT, () => {
     console.log(`mercury-wallet-tor-adapter listening at http://localhost:${PORT}`);
     console.log("control port password: " + tpc.controlPassword);
     console.log("tor data dir: " + process.argv[2]);
});

const tor = new TorClient(tpc.ip, tpc.port, tpc.controlPassword, tpc.controlPort, process.argv[2]);

//tor.startTorNode(tor_cmd, torrc);

        let isTorRunning=true;
        let tor_proc=undefined;

                
        //Get the password hash
exec(`${tor_cmd} --hash-password ${tpc.controlPassword}`,
     (_error, stdout, _stderr) => {
         let hashedPassword = stdout;
	 console.log("hashed password: " + hashedPassword);
          
         console.log("starting tor...");
         this.tor_proc = exec(`${tor_cmd} -f ${torrc} SOCKSPort ${tpc.port} ControlPort ${tpc.controlPort} HashedControlPassword ${hashedPassword}`, {
             detached: false,
             stdio: 'ignore',
         },  (error) => {
             if(error){
		 conssole.log(error);
                 throw error;
             };
         });
           
         this.tor_proc.stdout.on("data", function(data) {
             console.log("tor stdout: " + data.toString());  
         });
         
         this.tor_proc.stderr.on("data", function(data) {
             console.log("tor stderr: " + data.toString());
         });
     });




async function get_endpoint(req, res, endpoint){
  try{
    let result = await tor.get(req.path,undefined, endpoint);
    res.status(200).json(result);
  } catch (err){
    let statusCode = err.stateCode == undefined ? 400 : err.statusCode;
    res.status(statusCode).json(err);
  }
};

async function post_endpoint(req, res, endpoint) {
  try{
    let result = await tor.post(req.path,req.body, endpoint);
    res.status(200).json(result);
  } catch (err) {
    let statusCode = err.stateCode == undefined ? 400 : err.statusCode;
    res.status(statusCode).json(err);
  }
};

app.get('/newid', async function(req,res) {
  let response = {
    tor_proxy: config.tor_proxy,
    state_entity_endpoint: config.state_entity_endpoint,
    swap_conductor_endpoint: config.swap_conductor_endpoint
  };
  try{
    let response=await tor.confirmNewTorConnection();
    console.log(response);
    res.status(200).json(response);
  } catch(err) {
    res.status(400).json(err);
  }
});

app.get('/', async function(req,res) {
  let response = {
    tor_proxy: config.tor_proxy,
    state_entity_endpoint: config.state_entity_endpoint,
    swap_conductor_endpoint: config.swap_conductor_endpoint
  };
  try{
    let response=await tor.confirmNewTorConnection();
    console.log(response);
    res.status(200).json(response);
  } catch(err) {
    res.status(400).json(err);
  }
});


app.post('/tor_settings', async function(req,res) {
  try {
    config.update(req.body);
    await tor.stopTorNode();
    tor.set(config.tor_proxy);
    await tor.startTorNode();
    let response = {
      tor_proxy: config.tor_proxy,
      state_entity_endpoint: config.state_entity_endpoint,
      swap_conductor_endpoint: config.swap_conductor_endpoint
    };
    res.status(200).json(response);
  
  } catch (err) {
    res.status(400).json(`Bad request: ${err}`);
  }
});

app.get('/tor_settings', function(req,res) {
  let response = {
    tor_proxy: config.tor_proxy,
    state_entity_endpoint: config.state_entity_endpoint,
    swap_conductor_endpoint: config.swap_conductor_endpoint
  };
  res.status(200).json(response);
});


app.get('/shutdown', async function(req,res) {
  try {
    let response = await tor.stopTorNode();
    res.status(200).json(response);
    process.exit();
  } catch (err) {
    res.status(400).json(`Shutdown failed: ${err}`);
  }
});


app.get('/swap/*', function(req,res) {
  get_endpoint(req, res, config.swap_conductor_endpoint)
 });
 
 app.post('/swap/*', function(req,res) {
   post_endpoint(req, res, config.swap_conductor_endpoint)
 });

 app.get('*', function(req,res) {
   get_endpoint(req, res, config.state_entity_endpoint)
});

app.post('*', function(req,res) {
   post_endpoint(req, res, config.state_entity_endpoint)
});

async function on_exit(){
  await tor.stopTorNode();
  process.exit();
}

process.on('exit',on_exit);
process.on('SIGINT',on_exit);
