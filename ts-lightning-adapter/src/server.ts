import express from 'express';
import cors from 'cors';
import path from 'path';
import bodyParser from 'body-parser';
import fs from 'fs';


import * as ldk from 'lightningdevkit';
import LightningClient from './LDK/lightning.js';
import initLDK from './LDK/init/initLDK.js';
import initialiseWasm from './LDK/init/initialiseWasm.js';

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

  console.log(`lightning-adapter listening at http://localhost:${PORT}`);

  await initialiseWasm();
  
  const LightningClient = initLDK();
  await LightningClient.setBlockHeight();

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
