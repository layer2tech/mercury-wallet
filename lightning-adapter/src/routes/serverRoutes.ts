import express from "express";
const router = express.Router();
import { closeConnections, validateInvoiceBody } from "../LDK/utils/ldk-utils";
import LDKClientFactory from "../LDK/init/LDKClientFactory";
import { convertToMillisats } from "../LDK/utils/utils";
import fs from "fs";

const createAllFolders = (walletName: string) => {
  const rootPath = "wallets/" + walletName + "/";

  if (!fs.existsSync(rootPath)) {
    fs.mkdirSync(rootPath);
  }

  if (!fs.existsSync(rootPath + "./.ldk")) {
    fs.mkdirSync(rootPath + "./.ldk");
  }

  if (!fs.existsSync(rootPath + "./.scorer")) {
    fs.mkdirSync(rootPath + "./.scorer");
  }

  if (!fs.existsSync(rootPath + "./channels")) {
    fs.mkdirSync(rootPath + "./channels");
  }

  if (!fs.existsSync(rootPath + "/channels/channel_lookup.json")) {
    fs.writeFileSync(rootPath + "/channels/channel_lookup.json", "[]");
  }
};

router.get("/status", async function (req, res) {
  // tells us if the LDK is on or off
  try {
    if (LDKClientFactory.isInitialized()) {
      res.status(200).json({ status: "on" });
    } else {
      res.status(200).json({ status: "off" });
    }
  } catch (e) {
    res.status(500).json({ status: "failed" });
  }
});

router.post("/startLDK", async function (req, res) {
  // initialize an LDK with the network set
  const { wallet_name, network } = req.body;

  // create folders that must exist for LDK to exist
  createAllFolders(wallet_name);

  console.log("wallet value is:", wallet_name);
  console.log("network value is:", network);

  // validate network values
  // validate network values
  const validNetworks = ["dev", "prod", "test", "mock"];

  if (!validNetworks.includes(network)) {
    res.status(500).json("Invalid network given for initLDK");
  }

  try {
    if (LDKClientFactory.isInitialized()) {
      res.status(500).json("LDK already intialized.");
    } else {
      console.log("[Server.ts]: Finished initialiseWasm");
      await LDKClientFactory.createLDKClient(wallet_name, network); // prod/test/dev
      console.log("[Server.ts]: Finished create LDK");
      const LightningClient = LDKClientFactory.getLDKClient();
      console.log("[Server.ts]: Starting LDK Client");
      await LightningClient.start();
      console.log("[Server.ts]: LDK Client started");
      res
        .status(200)
        .json(
          "Started LDK with network " +
            network +
            " LDK: " +
            LightningClient.getOurNodeId()
        );
    }
  } catch (e) {
    console.error(`Error occured setting up LDK \n ${e} \n`);
    res.status(500).json({ message: "Error occured when starting LDK: " + e });
  }
});

router.get("/closeLDK", async function (req, res) {
  // Closing all connections
  closeConnections();

  try {
    // Close all intervals
    const LightningClient = LDKClientFactory.getLDKClient();
    LightningClient.stop();
    LDKClientFactory.destroy();
  } catch (e) {
    console.error("Error occured stopping LDK");
  }

  res.status(200).json({ message: "Connections closed" });
});

router.post("/generateInvoice", async function (req, res) {
  try {
    let { amount_in_sats, invoice_expiry_secs, description } = req.body;
    amount_in_sats = Number(amount_in_sats);
    // make sure we have valid object
    validateInvoiceBody(amount_in_sats, invoice_expiry_secs, description);

    let invoice = await LDKClientFactory.getLDKClient().createInvoice(
      BigInt(convertToMillisats(amount_in_sats)),
      invoice_expiry_secs,
      description
    );
    res.status(201).json({ status: 200, invoice });
  } catch (err) {
    const err_msg = `Bad request: ${err}`;
    console.log(err_msg);
  }
});

router.post("/sendPayment", async function (req, res) {
  // send a payment with values posted into this route ->
  const invoice_str = req.body.invoice;
  try {
    const payment_res = await LDKClientFactory.getLDKClient().sendPayment(
      invoice_str
    );
    if (payment_res) {
      res.status(200).json({ message: "Payment successful" });
    } else {
      res.status(500).json({ error: "Payment failed" });
    }
  } catch (err: any) {
    // Handle the error
    console.log(err);
    res.status(500).json({ error: err });
  }
});

export default router;
