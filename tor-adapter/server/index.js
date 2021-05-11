var TorClient = require('./tor_client');
var bodyParser = require('body-parser');
var Config = new require('./config');
const config = new Config();
const tpc = config.tor_proxy;
const express = require("express");


const PORT = 3001;

const app = express();
app.use(bodyParser.json());

const tor = new TorClient(tpc.ip, tpc.port, tpc.controlPassword, tpc.controlPort);

app.listen(PORT);

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

app.post('/tor_settings', function(req,res) {
  try {
    config.update(req.body);
    tor.set(config.tor_proxy);
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














