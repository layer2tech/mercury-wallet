import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import serverRoutes from "./routes/serverRoutes";
import peerRoutes from "./routes/peerRoutes";
import channelRoutes from "./routes/channelRoutes";
import { closeConnections } from "./LDK/utils/ldk-utils";
import initialiseWasm from "./LDK/init/initializeWasm";

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

// InitWASM route
app.post("/initWASM", async (req, res) => {
  const { path } = req.body;

  console.log("path received was:", path);

  if (!path) {
    res.status(400).json({ error: "Path is missing in the request body." });
    return;
  }

  try {
    await initialiseWasm(path);
    res.status(200).json({ message: "WASM initialized successfully." });
  } catch (error) {
    res.status(500).json({ error: "Failed to initialize WASM." + error });
  }
});

// Starting the express server
async function startServer() {
  // Check if the port is in use
  const net = await import("net");
  const socket = await net.createConnection(PORT);
  if (socket.connected) {
    console.log(`Port ${PORT} is in use. Force closing...`);
    socket.destroy();
  }

  // Start the express server
  app.listen(PORT, async () => {
    /* PRODUCTION CODE */
    console.log(
      `[Server.ts]: lightning-adapter listening at http://localhost:${PORT}`
    );
  });
}

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

// Force close the port if it is in use
const fs = await import("fs");
const path = await import("path");
const portFile = path.join(process.cwd(), "port.pid");
if (fs.existsSync(portFile)) {
  const pid = fs.readFileSync(portFile, "utf8").trim();
  if (pid) {
    console.log(`Killing process ${pid}`);
    try {
      process.kill(pid, "SIGKILL");
    } catch (error) {
      console.error("Error killing process:", error);
    }
  }
}

startServer();
