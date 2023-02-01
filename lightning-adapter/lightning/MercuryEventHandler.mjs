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

import * as bitcoinjs from "bitcoinjs-lib";
import bech32 from "bech32";
const network = bitcoinjs.networks.testnet;

class MercuryEventHandler {
  constructor(callbackFn) {
    this.callbackFn = callbackFn;
  }

  setChannelManager(manager) {
    this.channel_manager = manager;
  }

  handle_event(e) {
    console.log(">>>>>>> Handling Event here <<<<<<<", e);

    switch (e.constructor.name) {
      case "Event_FundingGenerationReady":
        this.handleFundingGenerationReadyEvent(e);
        break;
      case "Event_PaymentReceived":
        this.handlePaymentReceivedEvent(e);
        break;
      case "Event_PaymentSent":
        this.handlePaymentSentEvent(e);
        break;
      case "Event_PaymentPathFailed":
        this.handlePaymentPathFailedEvent(e);
        break;
      case "Event_PendingHTLCsForwardable":
        this.handlePendingHTLCsForwardableEvent(e);
        break;
      case "Event_SpendableOutputs":
        this.handleSpendableOutputsEvent(e);
        break;
      case "Event_PaymentForwarded":
        this.handlePaymentForwardedEvent(e);
        break;
      case "Event_OpenChannelRequest":
        this.handleOpenChannelRequestEvent(e);
        break;
      case "Event_ChannelClosed":
        this.handleChannelClosedEvent(e);
        break;
      default:
        console.debug("Event not handled: ", e);
    }
  }

  handleFundingGenerationReadyEvent(event) {
    const {
      temporary_channel_id,
      counterparty_node_id,
      channel_value_satoshis,
      output_script,
    } = event;

    // create funding transaction
    const witness_pos = output_script.length + 58;
    const funding_tx = new Uint8Array(witness_pos + 7);
    funding_tx[0] = 2; // 4-byte tx version 2
    funding_tx[4] = 0;
    funding_tx[5] = 1; // segwit magic bytes
    funding_tx[6] = 1; // 1-byte input count 1
    // 36 bytes previous outpoint all-0s
    funding_tx[43] = 0; // 1-byte input script length 0
    funding_tx[44] = 0xff;
    funding_tx[45] = 0xff;
    funding_tx[46] = 0xff;
    funding_tx[47] = 0xff; // 4-byte nSequence
    funding_tx[48] = 1; // one output
    const channelValueBuffer = Buffer.alloc(8);
    const channelValueNumber = parseInt(channel_value_satoshis.toString(), 10);
    channelValueBuffer.writeUInt32LE(channelValueNumber, 0);
    funding_tx.set(channelValueBuffer, 49);
    funding_tx[57] = output_script.length; // 1-byte output script length
    funding_tx.set(output_script, 58);
    funding_tx[witness_pos] = 1;
    funding_tx[witness_pos + 1] = 1;
    funding_tx[witness_pos + 2] = 0xff; // one witness element of size 1 with contents 0xff
    funding_tx[witness_pos + 3] = 0;
    funding_tx[witness_pos + 4] = 0;
    funding_tx[witness_pos + 5] = 0;
    funding_tx[witness_pos + 6] = 0; // lock time 0

    console.log("funding_tx", funding_tx);

    let fund = this.channel_manager.funding_transaction_generated(
      temporary_channel_id,
      counterparty_node_id,
      funding_tx
    );

    console.log("fund", fund);

    /*
    //const network = bitcoin.networks.testnet;
    const witnessProgram = Buffer.from(output_script, "hex");
    console.log("witnessProgram", witnessProgram);
    const addr = bech32.encode("tc", 0, witnessProgram);
    console.log("addr", addr);
    const outputs = [
      {
        [addr]: Number(channel_value_satoshis) / 100000000,
      },
    ];
    console.log("outputs", outputs);

    const tx = new bitcoinjs.Transaction();
    for (let i = 0; i < outputs[0].length; i++) {
      const output = outputs[0][i];
      tx.addOutput(output.address, output.value);
    }
    const funding_transaction = tx.toHex();

    console.log("funding_transaction:", funding_transaction);

    // Sign the final funding transaction and broadcast it.
    //const keyPair = // need to define key pair
    //const p2wpkh = bitcoinjs.payments.p2wpkh({ pubkey: keyPair.publicKey });
    //const signer = bitcoinjs.Transaction.signer({ prevTx, vin: 0, pubkey: keyPair.publicKey, witnessValue: channel_value_satoshis });
    //const signedTx = signer.sign(keyPair.privateKey);

    console.log("channelManager is equal to?", this.channel_manager);
    //console.log("this.callbackFn", this.callbackFn);

    let fund = this.channel_manager.funding_transaction_generated(
      event.temporary_channel_id,
      event.counterparty_node_id,
      funding_transaction
    );

    console.log("fund????", fund);*/
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

  handleChannelClosedEvent(event) {
    console.log("close channel event", event);

    let listChannels = this.channel_manager.list_channels();
    console.log("list_channels():", listChannels);

    this.channel_manager.force_close_all_channels_without_broadcasting_txn();
  }
}

export default MercuryEventHandler;
