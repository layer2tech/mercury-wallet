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
    const {
      temporary_channel_id, //: Uint8Array;
      counterparty_node_id, //: Uint8Array;
      channel_value_satoshis, //: bigint;
      output_script, //: Uint8Array;
      user_channel_id, //: bigint;
    } = event;

    // The output is always a P2WSH:
    // console.assert(output_script.length === 34 && output_script[0] === 0 && output_script[1] === 32);

    // Generate the funding transaction for the channel based on the channel amount
    const bitcoin = require("bitcoinjs-lib");

    const network = bitcoin.networks.regtest; // change this

    let fundingTx = new bitcoin.TransactionBuilder(network);
    fundingTx.addInput(funding, 0);
    // Note that all inputs in the funding transaction MUST spend SegWit outputs
    // (and have witnesses)
    fundingTx.inputs[0].witness = bitcoin.script.compile([
      bitcoin.opcodes.OP_0,
      new Buffer.from([0x1]),
    ]);
    fundingTx.addOutput(
      bitcoin.script.compile(output_script),
      channel_value_satoshis
    );

    // Give the funding transaction back to the ChannelManager.
    let fundingRes = this.channel_manager.funding_transaction_generated(
      temporary_channel_id,
      fundingTx.build().toHex()
    );

    // funding_transaction_generated should only generate an error if the
    // transaction didn't meet the required format (or the counterparty already
    // closed the channel on us):
    // console.assert(fundingRes instanceof Result_NoneAPIErrorZ_OK);
  }

  /*
  handleFundingGenerationReadyEvent(event) {
    const fundingScriptPubkey = event.output_script;
    const outputValue = event.channel_value_satoshis;

    // Check that the output is a P2WSH
    
    if (
      fundingScriptPubkey.length !== 34 &&
      fundingScriptPubkey[0] !== 0 &&
      fundingScriptPubkey[1] !== 32
    ) {
      return;
    }

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
      funding_res instanceof Result_NoneAPIErrorZ_OK,
      "funding_transaction_generated did not meet the required format or the counterparty already closed the channel"
    );
  }*/

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
