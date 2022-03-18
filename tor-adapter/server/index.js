var path = require('path');
var ElectrumClient = require('./electrum');
var TorClient = require('./tor_client');
var CNClient = require('./cn_client');
var bodyParser = require('body-parser');
var Config = new require('./config');
var fs = require('fs')
const config = new Config();
const tpc = config.tor_proxy;
const express = require("express");
const winston = require('winston');
var geoip = require('geoip-country');
var countries = require("i18n-iso-countries");
countries.registerLocale(require("i18n-iso-countries/langs/en.json"));

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

// Hidden service indices for hidden service switching
let i_elect_hs={i:0}
let i_merc_hs={i:0}
let i_cond_hs={i:0}

var errors = require('request-promise/errors');

//const logDir = path.join(dataDir,'tor-adapter', 'log')
const torDataDir = path.join(dataDir, 'tor')
const logDir = path.join(dataDir, 'tor-adapter-log')
console.log(`logDir: ${logDir}`)
if (!fs.existsSync(logDir.toString())){
  fs.mkdirSync(logDir.toString())
}

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.json(),
  defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.File({ filename: path.join(logDir, 'info.log'), level: 'info' }),
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logDir, 'debug.log'), level: 'debug' }),
    new winston.transports.File({ filename: path.join(logDir, 'combined.log') }),
  ]
})

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
    logger.info(`mercury-wallet-tor-adapter listening at http://localhost:${PORT}`);
    logger.info("tor data dir: " + torDataDir);
});

let tor;

if(config.tor_proxy.ip === 'mock'){
  tor = new CNClient();
} else {
  tor = new TorClient(tpc.ip, tpc.port, tpc.controlPassword, tpc.controlPort, torDataDir, geoIpFile, geoIpV6File);
}


//let epsConfig = { protocol: "tcp", host: "127.0.0.1", port: "50002" }
let epsConfig = { protocol: "ssl", host: "127.0.0.1", port: "50002" }
//Electrum personal server client
let epsClient = new ElectrumClient(epsConfig)
epsClient.connect()

//epsClient.importAddresses([['tb1qfe3kfstrdk0u4zhp6rhljcnlpgekrr3a88y9tv','tb1q8w7s57a2acyhy6zz7mp4hvlgqehfdp4ecxw8a5'],-1])

tor.startTorNode(tor_cmd, torrc);

async function get_endpoint(path, res, endpoint, i_hs){
  try{
    let result = await tor.get(path, undefined, endpoint[i_hs.i]);
    res.status(200).json(result);
  } catch (err){
    i_hs['i'] = (i_hs.i + 1) % endpoint.length
      	logger.log('debug',`get_endpoint - new i_hs: ${i_hs.i}`)
      if (err instanceof errors.StatusCodeError){
	  const err_msg =  `Get endpoint error: - path: ${path} endpoint: ${endpoint} err: ${err}`;
	  logger.error(err_msg);
	  res.status(err.statusCode).json(err_msg);
      } else {
	
	if (err instanceof errors.RequestError){
      		res.json(JSON.parse(err?.cause ? err?.cause : "Error"));
    	} else {
      		res.json(JSON.parse(err ? err : "Error"));
    	}
     }
  }
};

async function post_endpoint(path, body, res, endpoint, i_hs) {
  try{
    let result = await tor.post(path,body, endpoint[i_hs.i]);
    res.status(200).json(result);
  } catch (err){
    i_hs['i'] = (i_hs.i + 1) % endpoint.length
      	logger.log('debug',`get_endpoint - new i_hs: ${i_hs.i}`)
      if (err instanceof errors.StatusCodeError){
	  const err_msg =  `Post endpoint error: - path: ${path} endpoint: ${endpoint} err: ${err}`;
	  logger.error(err_msg);
	  res.status(err.statusCode).json(err_msg);
    } else {

	if (err instanceof errors.RequestError){
      		res.json(JSON.parse(err?.cause ? err?.cause : "Error"));
    	} else {
      		res.json(JSON.parse(err ? err : "Error"));
    	}
    }
   }
};

async function post_plain_endpoint(path, data, res, endpoint, i_hs) {
  try{
    let result = await tor.post_plain(path,data, endpoint[i_hs.i]);
    res.status(200).json(result);
  } catch (err){
    i_hs['i'] = (i_hs.i + 1) % endpoint.length
      	logger.log('debug',`get_endpoint - new i_hs: ${i_hs.i}`)
      if (err instanceof errors.StatusCodeError){
	  const err_msg =  `Post plain endpoint error: - path: ${path} endpoint: ${endpoint} err: ${err?.message ? err.message : err}`;
	  logger.error(err_msg)
	  res.status(200).json(err_msg);
    } else {

	if (err instanceof errors.RequestError){
          res.json(JSON.parse(err?.cause ? err?.cause : "RequestError"));
        } else {
           res.json(JSON.parse(err ? err : "Error"));
         }
     }  
   }
};

app.get('/newid', async function(req,res) {
  try{
    console.log("getting new tor id...")
    let response=await tor.confirmNewTorConnection();
    console.log(`got new tor id: ${JSON.stringify(response)}`)
    res.status(200).json(response);
  } catch(err) {
      const err_msg = `Get new tor id error: ${err}`;
      logger.error(err_msg);
      res.status(500).json(err_msg);
  }
});

app.get('lsof -i', async function(req,res) {
  res.status(200).json({});
});

app.post('/tor_settings', async function(req,res) {
  try {
    logger.log('debug',`tor _settings ${JSON.stringify(req.body)}`)
    config.update(req.body);
    logger.log('debug',`tor _settings - config: ${JSON.stringify(config)}`)

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
    const err_msg = `Bad request: ${err}`;
    logger.error(err_msg);
    res.status(400).json(err_msg);
  }
});

app.get('/tor_country/:id', function(req, res) {
  try {
    tor.control.getInfo(['ip-to-country/'+req.params.id], function(err, status) {
      let circuit = status;
      let response = {
        circuit: circuit
      };
      res.status(200).json(response);
    })
  } catch(err){
    const err_msg = `Error getting country info: ${err}`;
    logger.error(err_msg);
    res.status(500).json(err_msg);
  }
})


// with the id  of the  current tor circuit, return further details
// TODO -  string data needs to be validated (yrArra)
app.get('/tor_circuit/:id', (req,res) => {
  try{
    tor.control.getInfo(['ns/id/'+req.params.id], (err, status) => {
      try{
        var rArray
        var name
        var ip

        if (err) {
          name = ""
          ip = ""
          country = ""
          var retArray = { 
            name,
            ip,
            country
          };
          
          res.status(200).json(retArray);
          return
        }
        if(status && status?.messages){
          try{
            // split the string starting with r
            var rArray =  status.messages[1].split(' ');
            var name = rArray[1];
            var ip = rArray[rArray.length-3];
          } catch{
            name = ""
            ip = ""
          }
          var country = "" 
          try{
            var geo = geoip.lookup(ip);
            country = countries.getName(geo.country, "en", {select: "official"})
            //countries.getName(geo.country, "en", {select: "official"})
      
          } catch { }
          // if(!country){
          //   country = "";
          // }
          var retArray = { 
            name,
            ip,
            country
          };
          res.status(200).json(retArray);
        }

      } catch(e){
        const err_msg = `Error parsing tor circuit info: ${e}`;
        logger.error(err_msg);
        res.status(500).json(err_msg);
      }
    });
  } catch(err){
    const err_msg = `Error getting tor circuit info: ${err}`;
    logger.error(err_msg);
    res.status(500).json(err_msg);
  }
})

// returns the ids of the current tor circuit
app.get('/tor_circuit/',  (req,res) => {
  try{
    tor.control.getInfo(['circuit-status'], (err, status) => { // Get info like describe in chapter 3.9 in tor-control specs.
      try{
         if (!status && !status?.messages && err) {
	    let response = {
		latest: "",
		circuitData: []
            };
            res.status(200).json(response);	      
            const err_msg = `Error getting tor circuit status: ${err}`;
            logger.error(err_msg);
            return
         }
        if(status && status?.messages){
          // cycle through messages until we get the latest value
          let circuitMessages = status?.messages;
          var len = circuitMessages.length;
          var latest
          var circuitData
          var circuitIds =  [];
        try{
          if(len > 0) {
            // finding the highest number, and saving its index
            var highest = 0;
            var highestIndex = 0;
            for(var i=0; i<len; i++){
              // find the strings that start with a number
              if (!isNaN(circuitMessages[i].charAt(0))){
                var val = circuitMessages[i];
                // now find the string that contains the highest number
                var number = parseInt(val.substr(0,val.indexOf(' ')));
                if(number > highest){
                  highest = number;
                  highestIndex = i; // save this index
                }
              }
            }
        
            // now that we have the highest, manipulate data from its string
            latest = circuitMessages[highestIndex];
            // now split the string into commas
            circuitData = latest.split(',');
        
            /* circuitData: Data looks like this
            [0] : 9 BUILT $31D270A38505D4BFBBCABF717E9FB4BCA6DDF2FF~Belgium,
            [1] : $CC8B218ED3615827A5DCF008FC62598DEF533B4F~mikrogravitation02,
            [2] : $14FAE5D6645A97DE054FBE4AA8D3931302E05ADC~Poznan BUILD_FLAGS=NEED_CAPACITY PURPOSE=GENERAL TIME_CREATED=2021-12-08T12:07:51.477355
            */
        
            // find the ids  which are between $ and ~
            for(var i=0;  i<circuitData.length; i++){
              var circuitId = circuitData[i].substring(
                circuitData[i].indexOf("$") + 1, 
                circuitData[i].lastIndexOf("~")
              );
              if(circuitId !== ""){
                circuitIds.push(circuitId);
              }
            }
        
            /*  circuitIds: looks like this
              [0]: "31D270A38505D4BFBBCABF717E9FB4BCA6DDF2FF",
              [1]: "A5FF60CEAC8154C851AEFDAD40B421CFC97297A4",
              [2]: "ADB98B27D7A3FB5732068FD23602A1BCB3BE9F38"
            */
          }
        } catch {
          latest = ""
          circuitData = []
        }
        let response = {
            latest: latest,
            circuitData: circuitIds
          };
        res.status(200).json(response);
      }
        
      } catch(e){
        const err_msg = `Error parsing tor circuit status: ${e}`;
        logger.error(err_msg);
        res.status(500).json(err_msg);
      }
  
    });
  } catch(err){
    const err_msg = `Error getting tor circuit status: ${err}`;
      logger.error(err_msg);
      	    let response = {
		latest: "",
		circuitData: []
            };
            res.status(200).json(response);	      
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
    logger.log('debug',`setting endpoints: ${JSON.stringify(req.body)}`)
    config.update_endpoints(req.body);
    let response = {
      state_entity_endpoint: config.state_entity_endpoint,
      swap_conductor_endpoint: config.swap_conductor_endpoint,
      electrum_endpoint: config.electrum_endpoint
    };
    logger.log('debug',`setting endpoints response: ${JSON.stringify(response)}`)
    res.status(200).json(response);
  } catch (err) {
    const err_msg = `Error setting tor endpoints: ${err}`;
    logger.error(err_msg);
    res.status(400).json(err_msg);
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

process.once('SIGINT', async function (code) {
  console.log('SIGINT received...');
  await shutdown()
});

process.once('SIGTERM', async function (code) {
  console.log('SIGTERM received...');
  await shutdown()
});


async function shutdown() {
  try{
    await tor.stopTorNode();
  } catch (err) {
    console.log('error stopping tor node - sending the kill signal...');
    tor.kill_proc()
  }
  process.exit(0);
}

app.get('/electrs/*', function(req,res) {
  let path = req.path.replace('\/electrs','')
  get_endpoint(path, res, config.electrum_endpoint, i_elect_hs)
 });
 
 app.post('/electrs/*', function(req,res) {
   let path = req.path.replace('\/electrs','') 
   let body = req.body
   let data = body?.data ? body.data : ""
   post_plain_endpoint(path, data, res, config.electrum_endpoint, i_elect_hs)
 });


 app.get('/swap/ping', function(req,res) {
  get_endpoint('/ping', res, config.swap_conductor_endpoint, i_cond_hs)
 });

 app.get('/swap/*', function(req,res) {
  get_endpoint(req.path, res, config.swap_conductor_endpoint, i_cond_hs)
 });

 app.post('/swap/*', function(req,res) {
   post_endpoint(req.path, req.body, res, config.swap_conductor_endpoint, i_cond_hs)
 });




app.get('/eps/ping', async function(req, res) {
  try {
    let response = await epsClient.ping();
    res.status(200).json(response);
  } catch (err) {
    const err_msg = `EPS ping failed: ${err}`;
    logger.error(err_msg);
    res.status(400).json(err_msg);
  }
})

app.get('/eps/latest_block_header', async function(req, res) {
  try{
    let response = await epsClient.latestBlockHeader() 
    res.status(200).json(response);
  } catch (err) {
    const err_msg = `EPS latestBlockHeader failed: ${err}`;
    logger.error(err_msg);
    res.status(400).json(err_msg);
  }
})

app.get('/eps/tx/*$/', async function(req, res) {
  try{
    let response = await epsClient.getTransaction(path.parse(req.path).base) 
    res.status(200).json(response);
  } catch (err) {
    const err_msg = `EPS get tx failed: ${err}`;
    logger.error(err_msg);
    res.status(400).json(err_msg);
  }
})

app.get('/eps/scripthash_history/*$/', async function(req, res) {
  try{
    let p = path.parse(req.path)
    let response = await epsClient.getScripthashHistory(p.base)
    //await epsClient.getScriptHashListUnspent(path.parse(req.path).base)
    res.status(200).json(response);
  } catch (err) {
    const err_msg = `EPS scripthash failed: ${err}`;
    logger.error(err_msg);
    res.status(400).json(err_msg);
  }
})

app.get('/eps/get_scripthash_list_unspent/*$/', async function(req, res) {
  try{
    let scriptHash = path.parse(req.path).base
    let response = await epsClient.getScriptHashListUnspent(scriptHash)
    res.status(200).json(response);
  } catch (err) {
    const err_msg = `EPS scripthash failed: ${err}`;
    logger.error(err_msg);
    res.status(400).json(err_msg);
  }
})

app.get('/eps/fee-estimates', async function(req, res) {
  try{
    let response  = await epsClient.getFeeHistogram(num_blocks)
    res.status(200).json(response);
  } catch (err) {
    const err_msg = `EPS fee-estimates failed: ${err}`;
    logger.error(err_msg);
    res.status(400).json(err_msg);
  }
})

app.post('/eps/tx', async function(req, res) {
  try{
    let response = await epsClient.broadcastTransaction(req.body.data)
    res.status(200).json(response)
  } catch (err) {
    const err_msg = `EPS scripthash failed: ${err}`;
    logger.error(err_msg);
    res.status(400).json(err_msg);
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
    const err_msg = `importAddresses failed: ${err}`;
    logger.error(err_msg);
    res.status(400).json(err_msg);
  }
})

app.get('*', function(req,res) {
  get_endpoint(req.path, res, config.state_entity_endpoint, i_merc_hs)
});

app.post('*', function(req,res) {
  post_endpoint(req.path, req.body, res, config.state_entity_endpoint, i_merc_hs)
});


async function on_exit(){
  await tor.stopTorNode();
  process.exit();
}

process.on('exit',on_exit);
process.on('SIGINT',on_exit);
