import express from "express";
const router = express.Router();
import { 
  Invoice, 
  Result_InvoiceParseOrSemanticErrorZ_OK, 
  Option_u64Z_Some, 
  PaymentParameters,
  Route,
  RouteParameters,
  Result_RouteLightningErrorZ_OK,
  InFlightHtlcs,
} from "lightningdevkit";
import { getLDKClient } from "../LDK/init/importLDK.js";


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
    //let response = invoice;
    //console.log(response);
    //res.status(200).json(response);
  } catch (err) {
    const err_msg = `Bad request: ${err}`;
    console.log(err_msg);
    // log("error", err_msg);
    // log("info", `info - ${err_msg}`);
    // handle_error(res, err);
  }
});

router.get("/sendPayment", async function (req, res) {
  // send a payment with values posted into this route ->
  const invoice_str = "lnbcrt10u1pjpry0lpp5mugfd7m3pcnkre060uqkmjmwn73pyamw2qhq462aepegj85jvwxsdqqcqzpgxqyz5vqsp5p64gfsrp4s9t29t7exs8f4x88jqm46q4ftpm2263pergqxms5gcs9qyyssql6pa9tnhrwg2wwmwtxc6lxs5krfewfeysdc0kuqd90ruqnchu7xygn2g3u2s7u0f7hlx95g35ruq5x5m9atd2z57y4n04lg3zme6crcq8ljjjl";
  const parsed_invoice = Invoice.constructor_from_str(invoice_str);
  
  if (parsed_invoice instanceof Result_InvoiceParseOrSemanticErrorZ_OK) {
    const invoice = parsed_invoice.res;
    console.log(invoice); // this will log the Invoice object

    let amt_msat = 0;

    if (invoice.amount_milli_satoshis() instanceof Option_u64Z_Some) {
      amt_msat = invoice.amount_milli_satoshis().some;
      console.log(amt_msat)
    }

    if (amt_msat == 0) {
      res.status(500).json({ error: "Invalid or zero value invoice" });
    }
    
    let route : Route;
    
    let payment_params = PaymentParameters.constructor_from_node_id(invoice.recover_payee_pub_key(), Number(invoice.min_final_cltv_expiry_delta()));
    let route_params = RouteParameters.constructor_new(payment_params, BigInt(amt_msat))

    try {
      const route_res = getLDKClient().router.find_route(
        getLDKClient().channelManager.get_our_node_id(),
        route_params,
        getLDKClient().channelManager.list_usable_channels(),
        InFlightHtlcs.constructor_new()
      );
      
      let payment_id = new Uint8Array(32);

      if (route_res instanceof Result_RouteLightningErrorZ_OK) {
        route =  route_res.res;
        const payment_res = getLDKClient().channelManager.send_payment(route, invoice.payment_hash(), invoice.payment_secret(), payment_id);
        console.log(payment_res)
      }
    } catch (err: any) {
      // Handle the error
      console.log(err)
      res.status(500).json({ error: err });
    }
  }
});

router.post("/receivePayment", async function (req, res) {
  // receive a payment
});

export default router;
