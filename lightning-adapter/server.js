"use strict";

const { startLDK } = require("./lightningClient");
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");

// Constants
const PORT = 3003;

// Routers
const getRoutes = require("./routes/getRoutes");
const postRoutes = require("./routes/postRoutes");
const peerRoutes = require("./routes/peerRoutes");
const channelRoutes = require("./routes/channelRoutes");
const { closeConnections } = require("./lightningUtils");

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

// Start the LDK adapter - its globally accessible through LDKClient
startLDK();

// 0242a4ae0c5bef18048fbecf995094b74bfb0f7391418d71ed394784373f41e4f3@3.124.63.44:9735

// Starting the express server
app.listen(PORT, () => {
  console.log(`lightning-adapter listening at http://localhost:${PORT}`);
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
