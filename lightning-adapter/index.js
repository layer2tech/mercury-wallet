"use strict";

const { LDKClient } = require("./lightningClient");
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

async function importLDK(){
  // const ldk = await import("lightningdevkit");
  // console.log("ldk: ", ldk);
  // console.log("initialize the wasm from fetch...");
  // const wasm_file = fs.readFileSync("node_modules/lightningdevkit/liblightningjs.wasm")
  // await ldk.initializeWasmFromBinary(wasm_file);
  // await ldk.initializeWasmWebFetch("liblightningjs.wasm");
  var LightningClient = (await import('./lightning.mjs')).default
  console.log('Lightning Client: ',LightningClient)
  const lightning_client = new LightningClient()
  return lightning_client
}

const ldk = importLDK();

// Routes
app.use("/", getRoutes);
app.use("/", postRoutes);
app.use("/channel", channelRoutes);

// Import LDK
//importLDK();

// Starting the server
app.listen(PORT, () => {
  console.log(`lightning-adapter listening at http://localhost:${PORT}`);


  app.post("/lightning/generate_invoice", async function (req, res) {
    try {
      let invoice_config = {
        amt_in_sats: req.body.amt_in_sats,
        invoice_expiry_secs: req.body.invoice_expiry_secs,
        description: req.body.description,
      }
      let invoice = (await ldk).create_invoice(invoice_config.amt_in_sats, invoice_config.invoice_expiry_secs, invoice_config.description);
      // log("info", `Generating Invoice`);
      let response = invoice;
      console.log(response)
      res.status(200).json(response);
    } catch (err) {
      const err_msg = `Bad request: ${err}`;
      console.log(err_msg)
      // log("error", err_msg);
      // log("info", `info - ${err_msg}`);
      // handle_error(res, err);
    }
  });
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
