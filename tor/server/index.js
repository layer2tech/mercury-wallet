var TorClient = require('./tor_client');
const express = require("express");

const PORT = process.env.PORT || 3001;

const app = express();

password='tijf5631';

const tor = new TorClient('localhost', 9050, password, 9051, 'http://zo63hfpdcmonu52pcvflmeo62s47cqdabmibeejm7bhrfxmino3fl5qd.onion');

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});

app.get('*', async function(req,res) {
  try{
    //console.log(JSON.stringify(req));
    let result = await tor.get(req.path,undefined);
    res.json(result);
  } catch (err){
    console.log("get err: "+ err);
    res.status(err.statusCode).json(err);
  }
});

app.post('*', async function(req,res) {
  try{
    let result = await tor.post(req.path,req.body);
    console.log("result: ")
    res.json(result);
  } catch (err) {
    console.log("post err: "+ err);
    res.status(err.statusCode).json(err);
  }
});


