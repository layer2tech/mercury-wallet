var path = require('path');
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
if (process.argv.length > cd6) {
  geoIpV6File = process.argv[6];
}
console.log(`tor cmd: ${tor_cmd}`);
console.log(`torrc: ${torrc}`);

const GET_ROUTE = {
  PING: "/eps/ping",
  //latestBlockHeader "/Electrs/block/:hash/header",
  BLOCK: "/eps/block",
  HEADER: "header",
  //getTransaction /tx/:txid
  TX: "/eps/tx",
  //getScriptHashListUnspent /scripthash/:hash/utxo
  SCRIPTHASH: "/eps/scripthash",
  UTXO: "utxo",
  //getFeeHistogram
  FEE_ESTIMATES: "/eps/fee-estimates",
};
Object.freeze(GET_ROUTE);

const POST_ROUTE = {
  //broadcast transaction
  TX: "/eps/tx",
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
epsClient.connect()

//epsClient.importAddresses([['tb1qfe3kfstrdk0u4zhp6rhljcnlpgekrr3a88y9tv','tb1q8w7s57a2acyhy6zz7mp4hvlgqehfdp4ecxw8a5'],-1])

tor.startTorNode(tor_cmd, torrc);

function close_timeout(t_secs=10) {
  return setTimeout(function () {
    //on_exit()
  }, t_secs*1000)
}

function restart_close_timeout(timeout, t_secs=10) {
  if(timeout){
    clearTimeout(timeout)
  }
  return close_timeout(t_secs)
}

let timeout = close_timeout(30)

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

async function post_plain_endpoint(path, data, res, endpoint) {
  try{
    let result = await tor.post_plain(path,data, endpoint);
    res.status(200).json(result);
  } catch (err) {
    let statusCode = err.stateCode == undefined ? 400 : err.statusCode;
    res.status(statusCode).json(err);
  }
};

app.get('/newid', async function(req,res) {
  try{
    timeout = restart_close_timeout(timeout)
    console.log("getting new tor id...")
    let response=await tor.confirmNewTorConnection();
    console.log(`got new tor id: ${JSON.stringify(response)}`)
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
    timeout = restart_close_timeout(timeout)
    let response=await tor.confirmNewTorConnection();
    console.log(response);
    res.status(200).json(response);
  } catch(err) {
    res.status(400).json(err);
  }
});


app.get('/ping', async function(req,res) {
  timeout = restart_close_timeout(timeout)
  res.status(200).json({});
});

app.post('/tor_settings', async function(req,res) {
  try {
    timeout = restart_close_timeout(timeout)
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
    timeout = restart_close_timeout(timeout)
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
  timeout = restart_close_timeout(timeout)
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
   let body = req.body
   let data = body.data
   post_plain_endpoint(path, data, res, config.electrum_endpoint)
 });

app.get('/swap/*', function(req,res) {
  timeout = restart_close_timeout(timeout)
  get_endpoint(req.path, res, config.swap_conductor_endpoint)
 });
 
 app.post('/swap/*', function(req,res) {
  timeout = restart_close_timeout(timeout)
   post_endpoint(req.path, req.body, res, config.swap_conductor_endpoint)
 });



app.get('/eps/ping', async function(req, res) {
  try {
    let response = await epsClient.ping();
    res.status(200).json(response);
  } catch (err) {
    res.status(400).json(`EPS ping failed: ${err}`);
  }
})

app.get('/eps/latest_block_header', async function(req, res) {
  try{
    let response = await epsClient.latestBlockHeader() 
    res.status(200).json(response);
  } catch (err) {
    res.status(400).json(`EPS latestBlockHeader failed: ${err}`);
  }
})

app.get('/eps/tx/*$/', async function(req, res) {
  try{
    let response = await epsClient.getTransaction(path.parse(req.path).base) 
    res.status(200).json(response);
  } catch (err) {
    res.status(400).json(`EPS get tx failed: ${err}`);
  }
})

app.get('/eps/scripthash_history/*$/', async function(req, res) {
  try{
    let p = path.parse(req.path)
    let response = await epsClient.getScripthashHistory(p.base)
    //await epsClient.getScriptHashListUnspent(path.parse(req.path).base)
    res.status(200).json(response);
  } catch (err) {
    res.status(400).json(`EPS scripthash failed: ${err}`);
  }
})

app.get('/eps/get_scripthash_list_unspent/*$/', async function(req, res) {
  try{
    let scriptHash = path.parse(req.path).base
    let response = await epsClient.getScriptHashListUnspent(scriptHash)
    res.status(200).json(response);
  } catch (err) {
    res.status(400).json(`EPS scripthash failed: ${err}`);
  }
})

app.get('/eps/fee-estimates', async function(req, res) {
  try{
    let response  = await epsClient.getFeeHistogram(num_blocks)
    res.status(200).json(response);
  } catch (err) {
    res.status(400).json(`EPS fee-estimates failed: ${err}`);
  }
})

app.post('/eps/tx', async function(req, res) {
  try{
    let response = await epsClient.broadcastTransaction(req.body.data)
    res.status(200).json(response)
  } catch (err) {
    res.status(400).json(`EPS scripthash failed: ${err}`);
  }
})

app.post('/eps/import_addresses', async function(req, res) {
  try{
    let rescan_height = -1
    if (req.body.rescan_height != undefined){
        rescan_height = req.body.rescan_height
    }
    let response = await epsClient.importAddresses([req.body.addresses, rescan_height])
    res.status(200).json(response)
  } catch (err) {
    res.status(400).json(`importAddresses failed: ${err}`);
  }
})


app.get('*', function(req,res) {
  timeout = restart_close_timeout(timeout)
   get_endpoint(req.path, res, config.state_entity_endpoint)
});

app.post('*', function(req,res) {
  timeout = restart_close_timeout(timeout)
   post_endpoint(req.path, req.body, res, config.state_entity_endpoint)
});

async function on_exit(){
  await tor.stopTorNode();
  process.exit();
}

process.on('exit',on_exit);
process.on('SIGINT',on_exit);
