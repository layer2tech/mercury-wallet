var ElectrumClient = require('./electrum');
var TorClient = require('./tor_client');
var CNClient = require('./cn_client');
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

export const GET_ROUTE = {
  PING: "/electrs/ping",
  //latestBlockHeader "/Electrs/block/:hash/header",
  BLOCK: "/electrs/block",
  BLOCKS_TIP_HASH: "/electrs/blocks/tip/hash",
  HEADER: "header",
  BLOCKS_TIP_HEIGHT: "/electrs/blocks/tip/height",
  //getTransaction /tx/:txid
  TX: "/electrs/tx",
  //getScriptHashListUnspent /scripthash/:hash/utxo
  SCRIPTHASH: "/electrs/scripthash",
  UTXO: "utxo",
  //getFeeHistogram
  FEE_ESTIMATES: "/electrs/fee-estimates",
};
Object.freeze(GET_ROUTE);

export const POST_ROUTE = {
  //broadcast transaction
  TX: "/electrs/tx",
};
Object.freeze(POST_ROUTE);

const PORT = 3001;

const app = express();
app.use(bodyParser.json());

app.listen(PORT, () => {
     console.log(`mercury-wallet-tor-adapter listening at http://localhost:${PORT}`);
     console.log("control port password: " + tpc.controlPassword);
     console.log("tor data dir: " + dataDir);
});

let tor;

if(config.tor_proxy.ip === 'mock'){
  tor = new CNClient();
} else {
  tor = new TorClient(tpc.ip, tpc.port, tpc.controlPassword, tpc.controlPort, dataDir, geoIpFile, geoIpV6File);
}


//let epsConfig = { protocol: "tcp", host: "127.0.0.1", port: "50002" }
let epsConfig = { protocol: "ssl", host: "127.0.0.1", port: "50002" }
//Electrum personal server client
let epsClient = new ElectrumClient(epsConfig)

async function epsTest() {
  await epsClient.connect()
  await epsClient.ping()
  let head = await epsClient.latestBlockHeader()
  console.log(head)
}

epsTest()

tor.startTorNode(tor_cmd, torrc);

async function get_endpoint(path, res, endpoint){
  try{
    let result = await tor.get(path,undefined, endpoint);
    res.status(200).json(result);
  } catch (err){
    let statusCode = err.stateCode == undefined ? 400 : err.statusCode;
    res.status(statusCode).json(err);
  }
};

async function post_endpoint(path, body, res, endpoint) {
  try{
    let result = await tor.post(path,body, endpoint);
    res.status(200).json(result);
  } catch (err) {
    let statusCode = err.stateCode == undefined ? 400 : err.statusCode;
    res.status(statusCode).json(err);
  }
};

app.get('/newid', async function(req,res) {
  try{
    console.log("getting new tor id...")
    let response=await tor.confirmNewTorConnection();
    console.log(`got new tor id: ${JSON.stringify(response)}`)
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
    swap_conductor_endpoint: config.swap_conductor_endpoint,
    electrum_endpoint: config.electrum_endpoint
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
      swap_conductor_endpoint: config.swap_conductor_endpoint,
      electrum_endpoint: config.electrum_endpoint
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
    swap_conductor_endpoint: config.swap_conductor_endpoint,
    electrum_endpoint: config.electrum_endpoint
  };
  res.status(200).json(response);
});

app.post('/tor_endpoints', function(req,res) {
  try {
    console.log(`setting endpoints: ${JSON.stringify(req.body)}`)
    config.update_endpoints(req.body);
    let response = {
      state_entity_endpoint: config.state_entity_endpoint,
      swap_conductor_endpoint: config.swap_conductor_endpoint,
      electrum_endpoint: config.electrum_endpoint
    };
    console.log(`setting endpoints response: ${JSON.stringify(response)}`)
    res.status(200).json(response);
  } catch (err) {
    res.status(400).json(`Bad request: ${err}`);
  }
});

app.get('/tor_endpoints', function(req,res) {

 let response = {
    state_entity_endpoint: config.state_entity_endpoint,
    swap_conductor_endpoint: config.swap_conductor_endpoint,
    electrum_endpoint: config.electrum_endpoint
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

app.get('/electrs/*', function(req,res) {
  let path = req.path.replace('\/electrs','') 
  get_endpoint(path, res, config.electrum_endpoint)
 });
 
 app.post('/electrs/*', function(req,res) {
   let path = req.path.replace('\/electrs','') 
   post_endpoint(path, req.body, res, config.electrum_endpoint)
 });

app.get('/swap/*', function(req,res) {
  get_endpoint(req.path, res, config.swap_conductor_endpoint)
 });
 
 app.post('/swap/*', function(req,res) {
   post_endpoint(req.path, req.body, res, config.swap_conductor_endpoint)
 });

 app.get('*', function(req,res) {
   get_endpoint(req.path, res, config.state_entity_endpoint)
});

app.post('*', function(req,res) {
   post_endpoint(req.path, req.body, res, config.state_entity_endpoint)
});

app.get('/eps/ping', function(req, res) {
  try {
    let response = await epsClient.ping();
    res.status(200).json(response);
    process.exit();
  } catch (err) {
    res.status(400).json(`EPS ping failed: ${err}`);
  }
})

app.get('latest_block_header', function(req, res) {
  try{
    let response = await epsClient.latestBlockHeader() 
    res.status(200).json(response);
  } catch (err) {
    res.status(400).json(`EPS latestBlockHeader failed: ${err}`);
  }
})

app.get('/eps/tx/*$/', function(req, res) {
  try{
    let response = await epsClient.getTransaction(req.path.basename()) 
    res.status(200).json(response);
  } catch (err) {
    res.status(400).json(`EPS get tx failed: ${err}`);
  }
})

app.get('/eps/get_scripthash_list_unspent/*$/', function(req, res) {
  try{
    let response = await epsClient.getScriptHashListUnspent(req.path.basename())
    res.status(200).json(response);
  } catch (err) {
    res.status(400).json(`EPS scripthash failed: ${err}`);
  }
})

app.get('/eps/scripthash_subscribe', function(req, res) {
  try{
    res = await epsClient.
  } catch (err) {
    res.status(400).json(`EPS scripthash failed: ${err}`);
  }
})

app.get('/eps/fee-estimates', function(req, res) {
  try{
    let response  = await epsClient.getFeeHistogram(num_blocks)
    res.status(200).json(response);
  } catch (err) {
    res.status(400).json(`EPS fee-estimates failed: ${err}`);
  }
})

app.post('/eps/tx', function(req, res) {
  try{
    res = await epsClient.broadcastTransaction(req.body)
  } catch (err) {
    res.status(400).json(`EPS scripthash failed: ${err}`);
  }
})

async function on_exit(){
  await tor.stopTorNode();
  process.exit();
}

process.on('exit',on_exit);
process.on('SIGINT',on_exit);
