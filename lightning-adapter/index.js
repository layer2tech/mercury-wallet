"use strict";

const { importLDK, LDKClient } = require("./lightningClient");
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const LightningClient = require("./lightning.js");

// Constants
const PORT = 3003;

// Routers
const getRoutes = require("./getRoutes");
const postRoutes = require("./postRoutes");

// Express app
const app = express();

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use("/", getRoutes);
app.use("/", postRoutes);

// Starting the server
app.listen(PORT, () => {
  console.log(`lightning-adapter listening at http://localhost:${PORT}`);
});

// Import LDK
importLDK();

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
