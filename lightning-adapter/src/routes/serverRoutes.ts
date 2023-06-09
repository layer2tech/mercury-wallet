import express from "express";
const router = express.Router();
import { closeConnections, validateInvoiceBody } from "../LDK/utils/ldk-utils";
import LDKClientFactory from "../LDK/init/LDKClientFactory";
import { convertToMillisats } from "../LDK/utils/utils";

router.post("/startLDK", async function (req, res) {
  // initialize an LDK with the network set
  const { network } = req.body;

  // validate network values
  if (network !== "dev" || network !== "prod" || network !== "test") {
    res.status(500).json("Invalid network given for initLDK");
  }

  try {
    console.log("[Server.ts]: Finished initialiseWasm");
    await LDKClientFactory.createLDKClient(network); // prod/test/dev
    console.log("[Server.ts]: Finished create LDK");
    const LightningClient = LDKClientFactory.getLDKClient();
    console.log("[Server.ts]: Starting LDK Client");
    await LightningClient.start();
    console.log("[Server.ts]: LDK Client started");
  } catch (e) {
    console.error(`Error occured setting up LDK \n ${e} \n`);
  }
  res.status(200);
});

router.get("/closeLDK", async function (req, res) {
  // Closing all connections
  closeConnections();

  try {
    // Close all intervals
    const LightningClient = LDKClientFactory.getLDKClient();
    LightningClient.stop();
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
