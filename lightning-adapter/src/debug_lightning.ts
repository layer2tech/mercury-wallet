import initialiseWasm from "./LDK/init/initializeWasm.js";
import LDKClientFactory from "./LDK/init/LDKClientFactory.js";
import { hexToUint8Array } from "./LDK/utils/utils";
import crypto from "crypto";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import serverRoutes from "./routes/serverRoutes";
import peerRoutes from "./routes/peerRoutes";
import channelRoutes from "./routes/channelRoutes";
import {
  closeConnections,
  savePeerAndChannelToDatabase,
} from "./LDK/utils/ldk-utils";
import { ChannelDetails } from "lightningdevkit";
import { ChalkColor, Logger } from "./LDK/utils/Logger.js";
const DEBUG = new Logger(ChalkColor.Cyan, "debug_lightning.ts");
import dotenv from "dotenv";
dotenv.config();
import fs from "fs";

export async function debug_lightning() {
  DEBUG.log("initialiseWasm");
  await initialiseWasm();

  DEBUG.log("createLDKClient with dev");
  await LDKClientFactory.createLDKClient("dev");

  DEBUG.log("getLDKClient");
  const LightningClient = await LDKClientFactory.getLDKClient();

  DEBUG.log("start LDK");
  await LightningClient.start();

  DEBUG.log("call updateBestBlockHeight");
  let bestBlockHeight = await LightningClient.updateBestBlockHeight();
  DEBUG.log("bestBlockHeight:", "", bestBlockHeight);

  DEBUG.log("call updateBestBlockHash");
  let bestBlockHash = await LightningClient.updateBestBlockHash();
  DEBUG.log("bestBlockHash:", "", bestBlockHash);

  // Counterparty LND Node details
  const pubkeyHex = process.env["PUBKEY_HEX"];
  const hostname = process.env["HOSTNAME"];
  const portRead = process.env["PORT"];

  if (!pubkeyHex || !hostname || !portRead) {
    throw new Error("Required environment variables are not set.");
  }
  const port = parseInt(portRead);

  // Connect to the peer node
  DEBUG.log("Connect to Peer");
  await LightningClient.connectToPeer(pubkeyHex, hostname, port);

  // Connect to the channel
  let pubkey = hexToUint8Array(pubkeyHex);

  if (pubkey) {
    let privateKey = loadPrivateKeyFromFile("private_key.txt");
    if (privateKey === "") {
      privateKey = crypto.randomBytes(32).toString("hex");
    }

    let hostInfo = {
      host: pubkeyHex,
      port,
      channel_name: "Mercury Channel",
      wallet_name: "LightningWallet",
      privkey: privateKey,
    };

    // Set the TXID for the funding generation event
    // bcrt1qa0h3k6mfhjxedelag752k04lkj245e47kaullm
    // txid: 5557bd457de22fb0950cf6364da8ecb0d15ee9c478f874071e5a85fab0978a5f

    // MUST ONLY BE CALLED ONCE - calling it twice opens a new channel

    await LightningClient.createChannel(
      pubkey,
      100000,
      0,
      false,
      "511c7848172a3dba8d3e15c27f03ba3f94a7096f94772fef190867744698ce99",
      "bcrt1qa0h3k6mfhjxedelag752k04lkj245e47kaullm",
      hostInfo
    );

    // Sample create invoice
    const receiveInvoice = await LightningClient.createInvoice(
      BigInt(36900),
      "Lunch Meal",
      36000
    );
    DEBUG.log("Lightning Invoice for receiving: ", "", receiveInvoice);

    // Send a payment to an invoice
    /*
    DEBUG.log(
      "Sending payment to: lnbcrt500u1pjxcl69sp5ujmw5t5v962rczhk8l25fq76x46sx3l65gswp0gq9at78eps8xzqpp5y0pvvjn8jmj4dwkz5y950rd7mnl7tqhd05e769fpya4c3apwc8cqdqdx5cxkgrnv968xxqyjw5qcqp29qyysgqhq62thmesgkf79m2srntqslle04lvxr3tgchfcsgm5jgan67zzfjf7dxwuk7npv5u4ztfz6hs6u7jv8cdcv35mn4tr6rdkmjqe6alwgp3q77z2"
    );
    LightningClient.sendPayment(
      "lnbcrt500u1pjxcl69sp5ujmw5t5v962rczhk8l25fq76x46sx3l65gswp0gq9at78eps8xzqpp5y0pvvjn8jmj4dwkz5y950rd7mnl7tqhd05e769fpya4c3apwc8cqdqdx5cxkgrnv968xxqyjw5qcqp29qyysgqhq62thmesgkf79m2srntqslle04lvxr3tgchfcsgm5jgan67zzfjf7dxwuk7npv5u4ztfz6hs6u7jv8cdcv35mn4tr6rdkmjqe6alwgp3q77z2"
    );*/
  }

  // Close a channel
  //await LightningClient.forceCloseChannel("ef382090de601be8d62439d80def437503bb5a5e5c2ddc7a5aa27c4a7f3d3618");*/
}

const loadPrivateKeyFromFile = (privateKeyFilePath: string): string => {
  let privateKey: string = "";

  // Check if the private key file exists
  if (fs.existsSync(privateKeyFilePath)) {
    // Private key file exists, read the contents
    const privateKeyBuffer = fs
      .readFileSync(privateKeyFilePath)
      .toString("hex");
    privateKey = privateKeyBuffer;

    DEBUG.log("Private key:", "loadPrivateKeyFromFile", privateKey);
    DEBUG.log("privateKeyBuffer", "loadPrivateKeyFromFile", privateKeyBuffer);
  } else {
    console.error("private key file doesn't exist");
    return "";
  }
  return privateKey;
};

// Constants
const PORT = 3003;

// Express app
const app = express();

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use("/", serverRoutes);
app.use("/peer", peerRoutes);
app.use("/channel", channelRoutes);

// Starting the express server
app.listen(PORT, async () => {
  debug_lightning();
});

// Exit handlers
const onExit = () => {
  // code to be executed on exit, e.g. close connections, cleanup resources
  DEBUG.log("Exiting the application");
  closeConnections();
};

const onSigInt = () => {
  // code to be executed on sigint, e.g. close connections, cleanup resources
  DEBUG.log("Application interrupted");
  closeConnections();
  process.exit();
};

process.on("exit", onExit);
process.on("SIGINT", onSigInt);

export default app;
