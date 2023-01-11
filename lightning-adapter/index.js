"use strict";

const express = require("express");
var cors = require("cors");
var path = require("path");
const fs = require("fs");

// const { logger, log } = require("./logger");

// const logDataDir = process.argv[4];

const PORT = 3003;
var bodyParser = require("body-parser");
// const dataDir = path.join(logDataDir, "ldk")

/**
 * STARTING SERVER ON PORT
 */

const app = express();
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

app.listen(PORT, () => {
  // log(
  //   "info",
  //   `mercury-wallet-LDK-adapter listening at http://localhost:${PORT}`
  // );
  console.log(
    `mercury-wallet-LDK-adapter listening at http://localhost:${PORT}`
  )
  // log("info", `${network} data dir` + dataDir);
});


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


async function on_exit() {
  // if (logger) {
  //   log("info", `on_exit - stopping tor node...`);
  // }
  // await anon_client.stopTorNode();
}

async function on_sig_int() {
  // if (logger) {
  //   log("info", `on_sig_int - exiting...`);
  // }
  process.exit();
}

process.on("exit", on_exit);
process.on("SIGINT", on_sig_int);