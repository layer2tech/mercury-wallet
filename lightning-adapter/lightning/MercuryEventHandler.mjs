import {
  Event,
  EventHandler,
  EventsProvider,
  Event_FundingGenerationReady,
  Event_PaymentReceived,
  Event_PaymentSent,
  Event_PaymentPathFailed,
  Event_PendingHTLCsForwardable,
  Event_SpendableOutputs,
  Event_PaymentForwarded,
  Event_ChannelClosed,
  Event_OpenChannelRequest,
  Result_NoneAPIErrorZ,
  Result_NoneAPIErrorZ_OK,
} from "lightningdevkit";

import {
  BIP32Interface,
  Network,
  TransactionBuilder,
  crypto as crypto_btc,
  script,
  Transaction,
} from "bitcoinjs-lib";

const bitcoin = require("bitcoinjs-lib");
const regtest = bitcoin.networks.testnet;

class MercuryEventHandler {
  constructor(callbackFn) {
    this.callbackFn = callbackFn;
  }

  handle_event(e) {
    console.debug(">>>>>>> Handling Event here <<<<<<<", e);
    switch (e.constructor.name) {
      case "Event_FundingGenerationReady":
        handleFundingGenerationReadyEvent(e);
        break;
      case "Event_PaymentReceived":
        handlePaymentReceivedEvent(e);
        break;
      case "Event_PaymentSent":
        handlePaymentSentEvent(e);
        break;
      case "Event_PaymentPathFailed":
        handlePaymentPathFailedEvent(e);
        break;
      case "Event_PendingHTLCsForwardable":
        handlePendingHTLCsForwardableEvent(e);
        break;
      case "Event_SpendableOutputs":
        handleSpendableOutputsEvent(e);
        break;
      case "Event_PaymentForwarded":
        handlePaymentForwardedEvent(e);
        break;
      case "Event_OpenChannelRequest":
        handleOpenChannelRequestEvent(e);
        break;
      case "Event_ChannelClosed":
        handleChannelClosedEvent(e);
        break;
      default:
        console.debug("Event not handled: ", e);
    }
  }

  handleFundingGenerationReadyEvent(event) {
    const fundingTx = new bitcoin.TransactionBuilder(regtest);
    let transaction = new bitcoin.Transaction();
    transaction.setWitness(0, Buffer.from([0x1]));
    fundingTx.addInput(transaction, 0);
    //fundingTx.inputs[0].witness.push(Buffer.from([0x1])); // this doesn't work inputs doesn't exist on this version of bitcoinjs-lib
    fundingTx.addOutput(event.output_script, event.channel_value_satoshis);
    const funding = fundingTx.build();
    this.channelManager.funding_transaction_generated(
      event.temporary_channel_id,
      funding.toHex()
    );
  }

  handlePaymentReceivedEvent(e) {
    console.log(`Payment of ${e.amt} SAT received.`);
    this.channelManager.claim_funds(e.payment_preimage);
  }

  handlePaymentSentEvent(e) {
    console.log(
      `Payment with preimage '${event.payment_preimage.toString("hex")}' sent.`
    );
  }

  handlePaymentPathFailedEvent(e) {
    console.log(
      `Payment with payment hash '${event.payment_hash.toString(
        "hex"
      )}' failed.`
    );
  }

  handlePendingHTLCsForwardableEvent(e) {
    this.channelManager.process_pending_htlc_forwards();
  }

  handleSpendableOutputsEvent(e) {
    var tx = keyManager.spend_spendable_outputs(
      e.outputs,
      [],
      Hex.decode(refundAddress),
      feeEstimator.get_est_sat_per_1000_weight(
        ConfirmationTarget.LDKConfirmationTarget_HighPriority
      )
    );
    if (tx instanceof Result_TransactionNoneZ.Result_TransactionNoneZ_OK) {
      chainBackend.publish(tx.res);
    }
  }

  handlePaymentForwardedEvent(event) {
    const {
      prev_channel_id, //: Uint8Array;
      next_channel_id, //: Uint8Array;
      fee_earned_msat, //: Option_u64Z;
      claim_from_onchain_tx, //: boolean;
    } = event;

    console.log("Received payment forwarded event", event);
  }

  handleOpenChannelRequestEvent(event) {
    const {
      temporary_channel_id, // Uint8Array
      counterparty_node_id, // Uint8Array
      funding_satoshis, // bigint
      push_msat, // bigint
      channel_type, // ChannelTypeFeatures
    } = event;

    console.log("Received open channel request:", event);
  }
}

export default MercuryEventHandler;
