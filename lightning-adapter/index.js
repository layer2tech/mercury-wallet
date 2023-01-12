"use strict";

const { importLDK, LDKClient } = require("./lightningClient");
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
//const LightningClient = require("./lightning.mjs");

// Constants
const PORT = 3003;

// Routers
const getRoutes = require("./routes/getRoutes");
const postRoutes = require("./routes/postRoutes");
const channelRoutes = require("./routes/channelRoutes");

// Express app
const app = express();

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use("/", getRoutes);
app.use("/", postRoutes);
app.use("/channel", channelRoutes);

// Import LDK
//importLDK();

// Starting the server
app.listen(PORT, () => {
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
