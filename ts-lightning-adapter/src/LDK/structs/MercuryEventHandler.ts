import {
  Event,
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
  EventHandlerInterface,
  ChannelManager,
} from "lightningdevkit";

import * as bitcoin from "bitcoinjs-lib";
import LightningClient from "../lightning.js";
import { uint8ArrayToHexString } from "../utils/utils.js";

const regtest = bitcoin.networks.testnet;

class MercuryEventHandler implements EventHandlerInterface {
  channelManager: any;

  handle_event(e: any) {
    console.log(">>>>>>> Handling Event here <<<<<<<", e);

    switch (true) {
      case e instanceof Event_FundingGenerationReady:
        this.handleFundingGenerationReadyEvent(e);
        break;
      case e instanceof Event_PaymentReceived:
        this.handlePaymentReceivedEvent(e);
        break;
      case e instanceof Event_PaymentSent:
        this.handlePaymentSentEvent(e);
        break;
      case e instanceof Event_PaymentPathFailed:
        this.handlePaymentPathFailedEvent(e);
        break;
      case e instanceof Event_PendingHTLCsForwardable:
        this.handlePendingHTLCsForwardableEvent(e);
        break;
      case e instanceof Event_SpendableOutputs:
        this.handleSpendableOutputsEvent(e);
        break;
      case e instanceof Event_PaymentForwarded:
        this.handlePaymentForwardedEvent(e);
        break;
      case e instanceof Event_OpenChannelRequest:
        this.handleOpenChannelRequestEvent(e);
        break;
      case e instanceof Event_ChannelClosed:
        // this.handleChannelClosedEvent(e);
        break;
      default:
        console.debug("Event not handled: ", e);
    }
  }

  setChannelManager(channelManager: ChannelManager) {
    this.channelManager = channelManager;
  }

  handleFundingGenerationReadyEvent(event: Event_FundingGenerationReady) {
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

    let fund = this.channelManager.funding_transaction_generated(
      temporary_channel_id,
      counterparty_node_id,
      funding_tx
    );
  }

  handlePaymentReceivedEvent(e: Event_PaymentReceived) {
    console.log(`Payment of ${e.amount_msat} SAT received.`);
    this.channelManager.claim_funds(e.payment_hash);
  }

  handlePaymentSentEvent(e: Event_PaymentSent) {
    console.log(
      `Payment with preimage '${uint8ArrayToHexString(
        e.payment_preimage
      )}' sent.`
    );
  }

  handlePaymentPathFailedEvent(e: Event_PaymentPathFailed) {
    console.log(
      `Payment with payment hash '${uint8ArrayToHexString(
        e.payment_hash
      )}' failed.`
    );
  }

  handlePendingHTLCsForwardableEvent(e: Event_PendingHTLCsForwardable) {
    this.channelManager.process_pending_htlc_forwards();
  }

  handleSpendableOutputsEvent(e: Event_SpendableOutputs) {
    // var tx = this.keyManager.spend_spendable_outputs(
    //   e.outputs,
    //   [],
    //   Hex.decode(refundAddress),
    //   feeEstimator.get_est_sat_per_1000_weight(
    //     ConfirmationTarget.LDKConfirmationTarget_HighPriority
    //   )
    // );
    // if (tx instanceof Result_TransactionNoneZ.Result_TransactionNoneZ_OK) {
    //   chainBackend.publish(tx.res);
    // }
  }

  handlePaymentForwardedEvent(event: Event_PaymentForwarded) {
    const {
      prev_channel_id, //: Uint8Array;
      next_channel_id, //: Uint8Array;
      fee_earned_msat, //: Option_u64Z;
      claim_from_onchain_tx, //: boolean;
    } = event;

    console.log("Received payment forwarded event", event);
  }

  handleOpenChannelRequestEvent(event: Event_OpenChannelRequest) {
    const {
      temporary_channel_id, // Uint8Array
      counterparty_node_id, // Uint8Array
      funding_satoshis, // bigint
      push_msat, // bigint
      channel_type, // ChannelTypeFeatures
    } = event;

    console.log("Received open channel request:", event);
  }

  handleChannelClosedEvent(event: Event_ChannelClosed) {
    console.log("Event Channel Closed!");
  }
}

export default MercuryEventHandler;
