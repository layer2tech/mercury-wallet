import express from 'express';
import cors from 'cors';
import path from 'path';
import bodyParser from 'body-parser';
import fs from 'fs';

import getRoutes from './LDK/routes/getRoutes.js';
import postRoutes from './LDK/routes/postRoutes.js';
import peerRoutes from './LDK/routes/peerRoutes.js';

import initialiseWasm from './LDK/init/initialiseWasm.js';
import { getLDKClient, importLDK } from './LDK/init/importLDK.js';
import { closeConnections } from './LDK/utils/ldk-utils.js';

// Constants
const PORT = 3003;

// Routers



// Express app
const app = express();

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Routes

app.use("/", getRoutes);
app.use("/", postRoutes);
app.use("/", peerRoutes);
// app.use("/channel", channelRoutes);

// Starting the express server
app.listen(PORT, async () => {

  console.log(`lightning-adapter listening at http://localhost:${PORT}`);

  await initialiseWasm();
  
  await importLDK('dev');

  const LightningClient = getLDKClient();

  await LightningClient.connectToPeer('039927ed52e4cdcd215e1a806b3eb00af3c3ba6c89543bba508a85b326efe125db', '127.0.0.1', 9735);

});

// Exit handlers
const onExit = () => {
  // code to be executed on exit, e.g. close connections, cleanup resources
  console.log("Exiting the application");
  closeConnections();
};

const onSigInt = () => {
  // code to be executed on sigint, e.g. close connections, cleanup resources
  console.log("Application interrupted");
  closeConnections();
  process.exit();
};

process.on("exit", onExit);
process.on("SIGINT", onSigInt);
