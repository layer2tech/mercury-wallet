import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import serverRoutes from "./routes/serverRoutes";
import peerRoutes from "./routes/peerRoutes";
import channelRoutes from "./routes/channelRoutes";
import { closeConnections } from "./LDK/utils/ldk-utils";
import initialiseWasm from "./LDK/init/initializeWasm";
import LDKClientFactory from "./LDK/init/LDKClientFactory";

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
  /* PRODUCTION CODE */
  console.log(
    `[Server.ts]: lightning-adapter listening at http://localhost:${PORT}`
  );

  try {
    await initialiseWasm();
    console.log("[Server.ts]: Finished initialiseWasm");
    await LDKClientFactory.createLDKClient("dev"); // prod or dev
    console.log("[Server.ts]: Finished create LDK");
    const LightningClient = LDKClientFactory.getLDKClient();
    console.log("[Server.ts]: Starting LDK Client");
    await LightningClient.start();
    console.log("[Server.ts]: LDK Client started");
  } catch (e) {
    console.error(`Error occured setting up LDK \n ${e} \n`);
  }
});

// Exit handlers
const onExit = () => {
  // code to be executed on exit, e.g. close connections, cleanup resources
  console.log("[Server.ts]: Exiting the application");
  closeConnections();
};

const onSigInt = () => {
  // code to be executed on sigint, e.g. close connections, cleanup resources
  console.log("[Server.ts]: Application interrupted");
  closeConnections();
  process.exit();
};

process.on("exit", onExit);
process.on("SIGINT", onSigInt);

export { app };
