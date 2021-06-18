var TorClient = require('./tor_client');
var bodyParser = require('body-parser');
var Config = new require('./config');
const config = new Config();
const tpc = config.tor_proxy;
const express = require("express");

const tor_cmd = process.argv[2];
const torrc = process.argv[3];
const dataDir = process.argv[4];
let geoIpFile = undefined;
let geoIpV6File = undefined;
if (process.argv.length > 5) {
  geoIpFile = process.argv[5];
}
if (process.argv.length > 6) {
  geoIpV6File = process.argv[6];
}
console.log(`tor cmd: ${tor_cmd}`);
console.log(`torrc: ${torrc}`);

const PORT = 3001;

const app = express();
app.use(bodyParser.json());

app.listen(PORT, () => {
     console.log(`mercury-wallet-tor-adapter listening at http://localhost:${PORT}`);
     console.log("control port password: " + tpc.controlPassword);
     console.log("tor data dir: " + dataDir);
});

const tor = new TorClient(tpc.ip, tpc.port, tpc.controlPassword, tpc.controlPort, dataDir, geoIpFile, geoIpV6File);

tor.startTorNode(tor_cmd, torrc);

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
    await tor.startTorNode(tor_cmd, torrc);
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

app.get('/shutdown/tor', async function(req,res) {
  try {
    let response = await tor.stopTorNode();
    res.status(200).json(response);
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
