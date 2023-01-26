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

const bitcoin = require("bitcoinjs-lib");

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
    const fundingScriptPubkey = event.output_script;
    const outputValue = event.channel_value_satoshis;

    // Check that the output is a P2WSH
    /*
    if (
      fundingScriptPubkey.length !== 34 &&
      fundingScriptPubkey[0] !== 0 &&
      fundingScriptPubkey[1] !== 32
    ) {
      return;
    }*/

    console.assert(
      funding_scriptpubkey.length == 34 &&
        funding_scriptpubkey[0] == 0 &&
        funding_scriptpubkey[1] == 32,
      "Check that the output is a P2WSH"
    );

    // Create a new transaction
    const fundingTx = new bitcoin.Transaction();

    // Add input to the transaction
    fundingTx.addInput(
      new bitcoin.Transaction.Input({
        prevTxId: funding,
        script: new bitcoin.Script(),
      })
    );

    // Add witness to the input
    fundingTx.inputs[0].witness.push(Buffer.from([0x1]));

    // Add output to the transaction
    fundingTx.addOutput(
      bitcoin.Script.fromBuffer(fundingScriptPubkey),
      outputValue
    );

    // let funding_res = new Result_NoneAPIErrorZ;

    // Give the funding transaction back to the ChannelManager
    let funding_res = this.channel_manager.funding_transaction_generated(
      event.temporary_channel_id,
      fundingTx.toHex()
    );

    // funding_transaction_generated should only generate an error if the
    // transaction didn't meet the required format (or the counterparty already
    // closed the channel on us):

    console.assert(
      funding_res instanceof Result_NoneAPIErrorZ.Result_NoneAPIErrorZ_OK,
      "funding_transaction_generated did not meet the required format or the counterparty already closed the channel"
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

  handlePaymentForwardedEvent(e) {}

  handleOpenChannelRequestEvent(e) {}
}

export default MercuryEventHandler;
