import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import serverRoutes from "./routes/serverRoutes.js";
import peerRoutes from "./routes/peerRoutes.js";
import channelRoutes from "./routes/channelRoutes.js";
import { closeConnections } from "./LDK/utils/ldk-utils.js";
import initialiseWasm from "./LDK/init/initialiseWasm.js";
import { getLDKClient, createLDK } from "./LDK/init/getLDK.js";
import LightningClient from "./LDK/LightningClient.js";

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
  console.log(`lightning-adapter listening at http://localhost:${PORT}`);
  await initialiseWasm();
  console.log("import LDK");
  await createLDK("prod"); // prod or dev
  console.log("finished import LDK");
  const LightningClient: LightningClient = getLDKClient();
  await LightningClient.start();
  console.log("Started LDK Client");
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
