"use strict";

const isElectron = require("is-electron");

if (!isElectron()) {
  var network = process.argv[2];
  var isWin = process.platform === "win32";
  var isLinux = process.platform === "linux";
  var isMac = process.platform === "darwin";

  if (isWin) {
    if (network === "tor") {
      process.argv[2] = __dirname + "/resources/win/Tor/tor.exe";
    } else {
      process.argv[2] = __dirname + "/resources/win/i2pd.exe";
    }
  } else if (isLinux) {
    process.argv[2] = __dirname + `/resources/linux/${network}`;
  } else if (isMac) {
    process.argv[2] = __dirname + `/resources/mac/${network}`;
  }

  process.argv[3] = __dirname + "/resources/etc/torrc";
  process.argv[4] = __dirname + `/${network}`;
  process.argv[5] = __dirname + "/resources/win/Data/Tor/geoip";
  process.argv[6] = __dirname + "/resources/win/Data/Tor/geoip6";
} else{
  var network = process.argv[2].includes('tor') ? "tor" : "i2p";
}
const express = require("express");
var geoip = require("geoip-country");
var countries = require("i18n-iso-countries");
countries.registerLocale(require("i18n-iso-countries/langs/en.json"));
var bodyParser = require("body-parser");
var cors = require("cors");
var path = require("path");

const handle_error = require("./error").handle_error;
const { logger, log } = require("./logger");
const { GET_ROUTE, POST_ROUTE } = require("./routes");

var ElectrumClient = require("./electrum");
var EPSClient = require("./eps");
var AnonClient = require("./anon_client");
var CNClient = require("./cn_client");

/***
 *
 * Adapter starts Tor or I2P
 * - depends on binary name passed
 *
 ***/

const logDataDir = process.argv[4];
const start_cmd = process.argv[2];
const torrc = process.argv[3];
let geoIpFile = undefined;
let geoIpV6File = undefined;


if (process.argv.length > 5) {
  geoIpFile = process.argv[5];
}

if (process.argv.length > 6) {
  geoIpFile = process.argv[6];
}
if (process.argv.length > 7) {
  geoIpV6File = process.argv[7];
}


/**
 * • PORT 3001 for Tor
 * • PORT 3002 for I2P
 */

const PORT = network === "tor" ? 3001 : 3002;


console.log(`tor cmd: ${start_cmd}`);
console.log(`torrc: ${torrc}`);

const dataDir =
  network === "tor"
    ? path.join(logDataDir, "tor")
    : path.join(logDataDir, "i2p");


var Config = new require("./config");
const config = new Config(network);
const tpc = config.proxy;


// Hidden service indices for hidden service switching
let i_elect_hs = { i: 0 };
let i_merc_hs = { i: 0 };
let i_cond_hs = { i: 0 };

/**
 * STARTING SERVER ON PORT
 */

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.listen(PORT, () => {
  log(
    "info",
    `mercury-wallet-${network}-adapter listening at http://localhost:${PORT}`
  );
  log("info", `${network} data dir` + dataDir);
});


/**
 * Initialising Tor or I2P
 */

let anon_client;

if (config.proxy.ip === "mock") {
  anon_client = new CNClient();
} else {
  log("info", `init Anon Net Client...`);
  anon_client = new AnonClient(
    network,
    tpc.ip,
    tpc.port,
    tpc.controlPassword,
    tpc.controlPort,
    dataDir,
    geoIpFile,
    geoIpV6File,
    logger
  );
  log("info", `finished init Anon Net Client.`);
}

//Electrum personal server client
let epsClient = null;

//Electrs tcp client
let electrsLocalClient = null;

log("info", "starting anon network node... ");

anon_client.startNode(start_cmd, torrc, network);

log("info", "finished starting anon network node.");

async function get_endpoint(path, res, endpoint, i_hs) {
  if (endpoint === undefined) return;

  try {
    let result = await anon_client.get(path, undefined, endpoint[i_hs.i]);
    res.status(200).json(result);
  } catch (err) {
    i_hs["i"] = (i_hs.i + 1) % endpoint.length;
    handle_error(res, err);
  }
}

async function post_endpoint(path, body, res, endpoint, i_hs) {
  try {
    let result = await anon_client.post(path, body, endpoint[i_hs.i]);
    res.status(200).json(result);
  } catch (err) {
    i_hs["i"] = (i_hs.i + 1) % endpoint.length;
    handle_error(res, err);
  }
}

async function post_plain_endpoint(path, data, res, endpoint, i_hs) {
  try {
    let result = await anon_client.post_plain(path, data, endpoint[i_hs.i]);
    res.status(200).json(result);
  } catch (err) {
    i_hs["i"] = (i_hs.i + 1) % endpoint.length;
    handle_error(res, err);
  }
}

app.get("/newid", async function (req, res) {
  try {
    if (network === "tor") anon_client.newSocksAuthentication();
    res.status(200).json({});
  } catch (err) {
    const err_msg = `Get new tor id error: ${err}`;
    log("error", err_msg);
    res.status(500).json(err_msg);
  }
});

app.get("/newcircuit", async function (req, res) {
  try {
    let response;
    if (network === "tor") response = await anon_client.confirmNewTorCircuit();
    res.status(200).json(response);
  } catch (err) {
    const err_msg = `Get new tor id error: ${err}`;
    log("error", err_msg);
    res.status(500).json(err_msg);
  }
});

app.get("ping", async function (req, res) {
  log("info", `ping`);
  res.status(200).json({});
});

app.post("/tor_settings", async function (req, res) {
  try {
    log("info", `tor _settings ${JSON.stringify(req.body)}`);
    config.update(req.body);
    log("info", `tor _settings - config: ${JSON.stringify(config)}`);

    log("info", `stopping to node...`);
    await anon_client.stopTorNode();
    log("info", `setting tor config...`);
    anon_client.set(config.proxy);
    log("info", `starting tor node...`);
    await anon_client.startTorNode(start_cmd, torrc);
    log("info", `finished starting to node.`);
    let response = {
      tor_proxy: config.proxy,
      state_entity_endpoint: config.state_entity_endpoint,
      swap_conductor_endpoint: config.swap_conductor_endpoint,
      electrum_endpoint: config.electrum_endpoint,
    };
    res.status(200).json(response);
  } catch (err) {
    const err_msg = `Bad request: ${err}`;
    log("error", err_msg);
    log("info", `info - ${err_msg}`);
    handle_error(res, err);
  }
});

app.get("/tor_country/:id", function (req, res) {
  try {
    anon_client.control.getInfo(
      ["ip-to-country/" + req.params.id],
      function (err, status) {
        let circuit = status;
        let response = {
          circuit: circuit,
        };
        res.status(200).json(response);
      }
    );
  } catch (err) {
    const err_msg = `Error getting country info: ${err}`;
    log("error", err_msg);
    res.status(500).json(err_msg);
  }
});

// with the id  of the  current tor circuit, return further details
// TODO -  string data needs to be validated (yrArra)
app.get("/tor_circuit/:id", (req, res) => {
  try {
    anon_client.control.getInfo(["ns/id/" + req.params.id], (err, status) => {
      try {
        var rArray;
        var name;
        var ip;

        if (err) {
          name = "";
          ip = "";
          country = "";
          var retArray = {
            name,
            ip,
            country,
          };

          res.status(200).json(retArray);
          return;
        }
        if (status && status?.messages) {
          try {
            // split the string starting with r
            var rArray = status.messages[1].split(" ");
            var name = rArray[1];
            var ip = rArray[rArray.length - 3];
          } catch {
            name = "";
            ip = "";
          }
          var country = "";
          try {
            var geo = geoip.lookup(ip);
            country = countries.getName(geo.country, "en", {
              select: "official",
            });
            //countries.getName(geo.country, "en", {select: "official"})
          } catch {}
          // if(!country){
          //   country = "";
          // }
          var retArray = {
            name,
            ip,
            country,
          };
          res.status(200).json(retArray);
        }
      } catch (e) {
        const err_msg = `Error parsing tor circuit info: ${e}`;
        log("error", err_msg);
        res.status(500).json(err_msg);
      }
    });
  } catch (err) {
    const err_msg = `Error getting tor circuit info: ${err}`;
    log("error", err_msg);
    res.status(500).json(err_msg);
  }
});

// returns the ids of the current tor circuit
app.get("/tor_circuit/", (req, res) => {
  try {
    anon_client.control.getInfo(["circuit-status"], (err, status) => {
      // Get info like describe in chapter 3.9 in tor-control specs.
      try {
        if (!status && !status?.messages && err) {
          let response = {
            latest: "",
            circuitData: [],
          };
          res.status(200).json(response);
          const err_msg = `Error getting tor circuit status: ${err}`;
          log("error", err_msg);
          return;
        }
        if (status && status?.messages) {
          // cycle through messages until we get the latest value
          let circuitMessages = status?.messages;
          var len = circuitMessages.length;
          var latest;
          var circuitData;
          var circuitIds = [];
          try {
            if (len > 0) {
              // finding the highest number, and saving its index
              var highest = 0;
              var highestIndex = 0;
              for (var i = 0; i < len; i++) {
                // find the strings that start with a number
                if (!isNaN(circuitMessages[i].charAt(0))) {
                  var val = circuitMessages[i];
                  // now find the string that contains the highest number
                  var number = parseInt(val.substr(0, val.indexOf(" ")));
                  if (number > highest) {
                    highest = number;
                    highestIndex = i; // save this index
                  }
                }
              }

              // now that we have the highest, manipulate data from its string
              latest = circuitMessages[highestIndex];
              // now split the string into commas
              circuitData = latest.split(",");

              /* circuitData: Data looks like this
              [0] : 9 BUILT $31D270A38505D4BFBBCABF717E9FB4BCA6DDF2FF~Belgium,
              [1] : $CC8B218ED3615827A5DCF008FC62598DEF533B4F~mikrogravitation02,
              [2] : $14FAE5D6645A97DE054FBE4AA8D3931302E05ADC~Poznan BUILD_FLAGS=NEED_CAPACITY PURPOSE=GENERAL TIME_CREATED=2021-12-08T12:07:51.477355
              */

              // find the ids  which are between $ and ~
              for (var i = 0; i < circuitData.length; i++) {
                var circuitId = circuitData[i].substring(
                  circuitData[i].indexOf("$") + 1,
                  circuitData[i].lastIndexOf("~")
                );
                if (circuitId !== "") {
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
            latest = "";
            circuitData = [];
          }
          let response = {
            latest: latest,
            circuitData: circuitIds,
          };
          res.status(200).json(response);
        }
      } catch (e) {
        const err_msg = `Error parsing tor circuit status: ${e}`;
        log("error", err_msg);
        res.status(500).json(err_msg);
      }
    });
  } catch (err) {
    const err_msg = `Error getting tor circuit status: ${err}`;
    log("error", err_msg);
    let response = {
      latest: "",
      circuitData: [],
    };
    res.status(200).json(response);
  }
});

app.get("/tor_settings", function (req, res) {
  let response = {
    tor_proxy: config.proxy,
    state_entity_endpoint: config.state_entity_endpoint,
    swap_conductor_endpoint: config.swap_conductor_endpoint,
    electrum_endpoint: config.electrum_endpoint,
  };
  res.status(200).json(response);
});

app.post("/tor_endpoints", function (req, res) {
  try {
    log("debug", `setting endpoints: ${JSON.stringify(req.body)}`);
    config.update_endpoints(req.body);
    let response = {
      state_entity_endpoint: config.state_entity_endpoint,
      swap_conductor_endpoint: config.swap_conductor_endpoint,
      electrum_endpoint: config.electrum_endpoint,
    };
    log("debug", `setting endpoints response: ${JSON.stringify(response)}`);
    res.status(200).json(response);
  } catch (err) {
    const err_msg = `Error setting tor endpoints: ${err}`;
    log("error", err_msg);
    handle_error(res, err);
  }
});

app.get("/tor_endpoints", function (req, res) {
  let response = {
    state_entity_endpoint: config.state_entity_endpoint,
    swap_conductor_endpoint: config.swap_conductor_endpoint,
    electrum_endpoint: config.electrum_endpoint,
  };
  res.status(200).json(response);
});

process.once("SIGINT", async function (code) {
  const message = "SIGINT received...";
  console.log(message);
  log("info", message);
  await shutdown();
});

process.once("SIGTERM", async function (code) {
  const message = "SIGTERM received...";
  console.log(message);
  log("info", message);
  await shutdown();
});

async function shutdown() {
  try {
    await anon_client.stopTorNode();
  } catch (err) {
    const message = "error stopping tor node - sending the kill signal...";
    console.log(message);
    if (logger) {
      log("info", message);
    }
    anon_client.kill_proc();
  }
  process.exit(0);
}

app.get("/electrs/*", function (req, res) {
  let path = req.path.replace("/electrs", "");
  if (!config?.electrum_endpoint) {
    handle_error(res, "tor-adapter: get: config.electrum_endpoint not set");
  }
  get_endpoint(path, res, config.electrum_endpoint, i_elect_hs);
});

app.post("/electrs/*", function (req, res) {
  let path = req.path.replace("/electrs", "");
  let body = req.body;
  let data = body?.data ? body.data : "";
  if (!config?.electrum_endpoint) {
    handle_error(res, "tor-adapter: post: config.electrum_endpoint not set");
  }
  post_plain_endpoint(path, data, res, config.electrum_endpoint, i_elect_hs);
});

app.get("/swap/ping", function (req, res) {
  if (!config?.swap_conductor_endpoint) {
    handle_error(
      res,
      "tor-adapter: get /swap/ping: config.swap_conductor_endpoint not set"
    );
  }
  if (!Array.isArray(config.swap_conductor_endpoint)) {
    handle_error(
      res,
      "tor-adapter: get /swap/ping: config.swap_conductor_endpoint is not an array"
    );
  }
  get_endpoint("/ping", res, config.swap_conductor_endpoint, i_cond_hs);
});

app.get("/swap/*", function (req, res) {
  if (!config?.swap_conductor_endpoint) {
    handle_error(
      res,
      "tor-adapter: get: config.swap_conductor_endpoint not set"
    );
  }
  if (!Array.isArray(config.swap_conductor_endpoint)) {
    handle_error(
      res,
      "tor-adapter: get: config.swap_conductor_endpoint is not an array"
    );
  }
  get_endpoint(req.path, res, config.swap_conductor_endpoint, i_cond_hs);
});

app.post("/swap/*", function (req, res) {
  if (!config?.swap_conductor_endpoint) {
    handle_error(
      res,
      "tor-adapter: post: config.swap_conductor_endpoint not set"
    );
  }
  if (!Array.isArray(config.swap_conductor_endpoint)) {
    handle_error(
      res,
      "tor-adapter: post: config.swap_conductor_endpoint is not an array"
    );
  }
  post_endpoint(
    req.path,
    req.body,
    res,
    config.swap_conductor_endpoint,
    i_cond_hs
  );
});

app.post("/eps/config", async function (req, res) {
  try {
    let config = req.body.data;
    log("info", `eps/config: ${JSON.stringify(config)}`);
    epsClient = new EPSClient(config);
    epsClient
      .connect()
      .catch((error) => {
        log("error", `connecting EPS client: ${error.toString()}`);
        handle_error(res, err);
      })
      .then(() => {
        res.status(200).json(config);
      });
  } catch (err) {
    handle_error(res, err);
  }
});

app.get("/eps/ping", async function (req, res) {
  try {
    let response = await epsClient.ping();
    res.status(200).json(response);
  } catch (err) {
    const err_msg = `EPS ping failed: ${err}`;
    log("error", err_msg);
    handle_error(res, err);
  }
});

app.get("/eps/latest_block_header", async function (req, res) {
  try {
    let response = await epsClient.latestBlockHeader();
    res.status(200).json(response);
  } catch (err) {
    const err_msg = `EPS latestBlockHeader failed: ${err}`;
    log("error", err_msg);
    handle_error(res, err);
  }
});

app.get("/eps/tx/*$/", async function (req, res) {
  try {
    let response = await epsClient.getTransaction(path.parse(req.path).base);
    res.status(200).json(response);
  } catch (err) {
    handle_error(res, err);
  }
});

app.get("/eps/scripthash_history/*$/", async function (req, res) {
  try {
    let p = path.parse(req.path);
    let response = await epsClient.getScripthashHistory(p.base);
    res.status(200).json(response);
  } catch (err) {
    const err_msg = `EPS scripthash failed: ${err}`;
    log("error", err_msg);
    handle_error(res, err);
  }
});

app.get("/eps/get_scripthash_list_unspent/*$/", async function (req, res) {
  try {
    let scriptHash = path.parse(req.path).base;
    let response = await epsClient.getScriptHashListUnspent(scriptHash);
    res.status(200).json(response);
  } catch (err) {
    const err_msg = `EPS scripthash failed: ${err}`;
    log("error", err_msg);
    handle_error(res, err);
  }
});

app.get("/eps/fee-estimates", async function (req, res) {
  try {
    let response = await epsClient.getFeeHistogram(num_blocks);
    res.status(200).json(response);
  } catch (err) {
    const err_msg = `EPS fee-estimates failed: ${err}`;
    log("error", err_msg);
    handle_error(res, err);
  }
});

app.post("/eps/tx", async function (req, res) {
  try {
    let response = await epsClient.broadcastTransaction(req.body.data);
    res.status(200).json(response);
  } catch (err) {
    const err_msg = `EPS scripthash failed: ${err}`;
    log("error", err_msg);
    handle_error(res, err);
  }
});

app.post("/eps/import_addresses", async function (req, res) {
  try {
    let rescan_height = -1;
    if (req.body.rescan_height != undefined) {
      rescan_height = req.body.rescan_height;
    }
    let response = await epsClient.importAddresses([
      req.body.addresses,
      rescan_height,
    ]);
    res.status(200).json(response);
  } catch (err) {
    const err_msg = `importAddresses failed: ${err}`;
    log("error", err_msg);
    handle_error(res, err);
  }
});

app.post("/electrs_local/config", async function (req, res) {
  try {
    let config = req.body.data;
    log("info", `electrs_local/config: ${JSON.stringify(config)}`);
    electrsLocalClient = new ElectrumClient(config);
    electrsLocalClient.connect().catch((error) => {
      log("error", `connecting electrs_local client: ${error.toString()}`);
      handle_error(res, err);
    });
    res.status(200).json(config);
  } catch (err) {
    handle_error(res, err);
  }
});

app.get("/electrs_local/ping", async function (req, res) {
  try {
    let response = await electrsLocalClient.ping();
    res.status(200).json(response);
  } catch (err) {
    const err_msg = `electrs_local ping failed: ${err}`;
    log("error", err_msg);
    handle_error(res, err);
  }
});

app.get("/electrs_local/latest_block_header", async function (req, res) {
  try {
    let response = await electrsLocalClient.latestBlockHeader();
    res.status(200).json(response);
  } catch (err) {
    const err_msg = `electrs_local latestBlockHeader failed: ${err}`;
    log("error", err_msg);
    handle_error(res, err);
  }
});

app.get("/electrs_local/tx/*$/", async function (req, res) {
  try {
    const tx = path.parse(req.path).base;
    log("info", `getting transaction: ${tx}`);
    let response = await electrsLocalClient.getTransaction(tx);
    res.status(200).json(response);
  } catch (err) {
    log("error", err);
    handle_error(res, err);
  }
});

app.get("/electrs_local/scripthash_history/*$/", async function (req, res) {
  try {
    let p = path.parse(req.path);
    let response = await electrsLocalClient.getScripthashHistory(p.base);
    res.status(200).json(response);
  } catch (err) {
    const err_msg = `electrs_local scripthash failed: ${err}`;
    log("error", err_msg);
    handle_error(res, err);
  }
});

app.get(
  "/electrs_local/get_scripthash_list_unspent/*$/",
  async function (req, res) {
    try {
      let scriptHash = path.parse(req.path).base;
      log("info", `get_scripthash_list_unspent: ${scriptHash}`);
      let response = await electrsLocalClient.getScriptHashListUnspent(
        scriptHash
      );
      res.status(200).json(response);
    } catch (err) {
      const err_msg = `electrs_local scripthash failed: ${err}`;
      log("error", err_msg);
      handle_error(res, err);
    }
  }
);

app.get("/electrs_local/fee-estimates", async function (req, res) {
  try {
    let response = await electrsLocalClient.getFeeHistogram();
    res.status(200).json(response);
  } catch (err) {
    const err_msg = `electrs_local fee-estimates failed: ${err}`;
    log("error", err_msg);
    handle_error(res, err);
  }
});

app.post("/electrs_local/tx", async function (req, res) {
  try {
    log("info", `broadcastTransaction: ${req.body.data}`);
    let response = await electrsLocalClient.broadcastTransaction(req.body.data);
    log("info", `broadcastTransaction response: ${response}`);
    res.status(200).json(response);
  } catch (err) {
    log("error", `broadcastTransaction error: ${JSON.stringify(err)}`);
    handle_error(res, err);
  }
});

app.post("/electrs_local/import_addresses", async function (req, res) {
  try {
    let rescan_height = -1;
    if (req.body.rescan_height != undefined) {
      rescan_height = req.body.rescan_height;
    }
    let response = await electrsLocalClient.importAddresses([
      req.body.addresses,
      rescan_height,
    ]);
    res.status(200).json(response);
  } catch (err) {
    const err_msg = `importAddresses failed: ${err}`;
    log("error", err_msg);
    handle_error(res, err);
  }
});

app.get("*", function (req, res) {
  log("info", "get *");
  if (!config?.state_entity_endpoint) {
    handle_error(res, "tor-adapter: get: config.state_entity_endpoint not set");
  }
  if (!Array.isArray(config.state_entity_endpoint)) {
    handle_error(
      res,
      "tor-adapter: get: config.state_entity_endpoint is not an array"
    );
  }
  get_endpoint(req.path, res, config.state_entity_endpoint, i_merc_hs);
});

app.post("*", function (req, res) {
  log("info", "post *");
  if (!config?.state_entity_endpoint) {
    handle_error(
      res,
      "tor-adapter: post: config.state_entity_endpoint not set"
    );
  }
  if (!Array.isArray(config.state_entity_endpoint)) {
    handle_error(
      res,
      "tor-adapter: post: config.state_entity_endpoint is not an array"
    );
  }
  post_endpoint(
    req.path,
    req.body,
    res,
    config.state_entity_endpoint,
    i_merc_hs
  );
});

async function on_exit() {
  if (logger) {
    log("info", `on_exit - stopping tor node...`);
  }
  await anon_client.stopTorNode();
}

async function on_sig_int() {
  if (logger) {
    log("info", `on_sig_int - exiting...`);
  }
  process.exit();
}

process.on("exit", on_exit);
process.on("SIGINT", on_sig_int);