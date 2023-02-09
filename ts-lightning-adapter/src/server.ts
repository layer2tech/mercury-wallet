import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

import getRoutes from "./LDK/routes/getRoutes.js";
import postRoutes from "./LDK/routes/postRoutes.js";
import peerRoutes from "./LDK/routes/peerRoutes.js";
import channelRoutes from "./LDK/routes/channelRoutes.js";

import { closeConnections } from "./LDK/utils/ldk-utils.js";
import { debug_lightning } from "./debug_lightning.js";

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
app.use("/channel", channelRoutes);

// Starting the express server
app.listen(PORT, async () => {
  console.log(`lightning-adapter listening at http://localhost:${PORT}`);

  // moved to debug_lightning.ts file
  debug_lightning();
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
