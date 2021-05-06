var TorClient = require('./tor_client');
var bodyParser = require('body-parser');
var Config = new require('./config');
const config = new Config();
const tpc = config.tor_proxy;
const express = require("express");

const PORT = config.tor_proxy.serverPort;

const app = express();
app.use(bodyParser.json());

const tor = new TorClient(tpc.ip, tpc.port, tpc.controlPassword, tpc.controlPort);


app.listen(PORT);


async function get_endpoint(req, res, endpoint){
  try{
    let result = await tor.get(req.path,undefined, endpoint);
    res.json(result);
  } catch (err){
    res.status(err.statusCode).json(err);
  }
};

async function post_endpoint(req, res, endpoint) {
  try{
    let result = await tor.post(req.path,req.body, endpoint);
    res.json(result);
  } catch (err) {
    res.status(err.statusCode).json(err);
  }
};

app.get('*', async function(req,res) {
  get_endpoint(req, res, config.state_entity_endpoint)
});

app.post('*', async function(req,res) {
  post_endpoint(req, res, config.state_entity_endpoint)
});


app.get('/swap/*', async function(req,res) {
 get_endpoint(req, res, config.swap_conductor_endpoint)
});

app.post('/swap/*', async function(req,res) {
  post_endpoint(req, res, config.swap_conductor_endpoint)
});





