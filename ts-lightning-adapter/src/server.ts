const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const wasmFn = require('./LDK/initialiseWasm');
const initLDK = require('./LDK/initLDKClient');
// import express = require('express');
// import cors = require('cors');
// import path = require('path');
// import bodyParser = require('body-parser');
// import express from 'express';
// import cors from 'cors';
// import path from 'path';
// import bodyParser from 'body-parser';
// import initialiseWasm from './LDK/initialiseWasm.mjs';

// import LightningClient from "./LDK/lightning.mjs";

// Constants
const PORT = 3003;

// Routers



// Express app
const app = express();

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Routes
// app.use("/", getRoutes);
// app.use("/", postRoutes);
// app.use("/channel", channelRoutes);

// Starting the express server
app.listen(PORT, async () => {
  const { initialiseWasm } = wasmFn
  console.log('Initialise Wasm: ', initialiseWasm);
  await initialiseWasm();

  const {importLDK, LDKClient} = initLDK;
  console.log('initLDK: ',importLDK);

  await importLDK();

  // const {importLDK, LDKClient} = initClient

  // await importLDK();
  // console.log('Lightning CLient: ',LightningClient);
  // await initialiseWasm();
  // await initLDKClient();

  console.log(`lightning-adapter listening at http://localhost:${PORT}`);
  
});

// Exit handlers
const onExit = () => {
  // code to be executed on exit, e.g. close connections, cleanup resources
  console.log("Exiting the application");
};

const onSigInt = () => {
  // code to be executed on sigint, e.g. close connections, cleanup resources
  console.log("Application interrupted");
  process.exit();
};

process.on("exit", onExit);
process.on("SIGINT", onSigInt);
