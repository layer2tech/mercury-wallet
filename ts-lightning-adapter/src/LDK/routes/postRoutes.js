import express from 'express';
const router = express.Router();

router.post("/generate_invoice", async function (req, res) {
  try {
    let invoice_config = {
      amt_in_sats: req.body.amt_in_sats,
      invoice_expiry_secs: req.body.invoice_expiry_secs,
      description: req.body.description,
    };
    // let invoice = createInvoice(
    //   invoice_config.amt_in_sats,
    //   invoice_config.invoice_expiry_secs,
    //   invoice_config.description
    // );
    // log("info", `Generating Invoice`);
    let response = invoice;
    console.log(response);
    res.status(200).json(response);
  } catch (err) {
    const err_msg = `Bad request: ${err}`;
    console.log(err_msg);
    // log("error", err_msg);
    // log("info", `info - ${err_msg}`);
    // handle_error(res, err);
  }
});

router.post("/sendPayment", async function (req, res) {
  // send a payment with values posted into this route ->
});

router.post("/receivePayment", async function (req, res) {
  // receive a payment
});

export default router
