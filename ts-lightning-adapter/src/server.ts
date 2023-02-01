import express from "express";
import cors from "cors";
import path from "path";
import bodyParser from "body-parser";
import fs from "fs";

import getRoutes from "./LDK/routes/getRoutes.js";
import postRoutes from "./LDK/routes/postRoutes.js";
import peerRoutes from "./LDK/routes/peerRoutes.js";

import initialiseWasm from "./LDK/init/initialiseWasm.js";
import { getLDKClient, importLDK } from "./LDK/init/importLDK.js";
import { closeConnections } from "./LDK/utils/ldk-utils.js";
import { hexToUint8Array } from "./LDK/utils/utils.js";

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

  console.log('import LDK')
  
  await importLDK("dev");
  console.log('finisehd import LDK')

  const LightningClient = getLDKClient();

  await LightningClient.start();
  //025817585dc79c2fff719e764e30fdc28a5bda9d03e11a56b155bc4a243264d7cb@127.0.0.1:9937
  let pubkeyHex =
    "025817585dc79c2fff719e764e30fdc28a5bda9d03e11a56b155bc4a243264d7cb";
  let hostname = "127.0.0.1";
  let port = 9937;

  // 022bd8cece1f8bee57833662c461ca86484fbede65e71a7e54723610608739a493@127.0.0.1:9936

  //@127.0.0.1:9737
  //02bba84e9fb2a28a7763ccd1865a09e09606cd2a1f23669a9ff764237a2e25afa1@127.0.0.1:9735

  console.log("Connect to Peer");
  await LightningClient.connectToPeer(pubkeyHex, hostname, port);

  let pubkey = hexToUint8Array(pubkeyHex);

  console.log("Connect to channel");
  if (pubkey) {
    await LightningClient.createChannel(pubkey, 1000000, 0, 1);
  }
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
