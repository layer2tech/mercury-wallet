"use strict";

const express = require("express");
var cors = require("cors");
var path = require("path");
const fs = require("fs");
var bodyParser = require("body-parser");
const LightningClient = require("./lightning.js");

/**
 * STARTING SERVER ON PORT
 */
const PORT = 3003;
const getRoutes = require("./getRoutes");
const postRoutes = require("./postRoutes");
const app = express();
app.use(cors());
app.use(bodyParser.json());

// get requests
app.use("/", getRoutes);
// post requests
app.use("/", postRoutes);

async function importLDK() {
  var LightningClient = (await import("./lightning.js")).default;
  console.log("Lightning Client: ", LightningClient);
  const lightning_client = new LightningClient();
  return lightning_client;
}

const LDK = importLDK();
module.exports = LDK;

app.listen(PORT, () => {
  console.log(
    `mercury-wallet-LDK-adapter listening at http://localhost:${PORT}`
  );
});

async function on_exit() {}

async function on_sig_int() {
  process.exit();
}

process.on("exit", on_exit);
process.on("SIGINT", on_sig_int);
