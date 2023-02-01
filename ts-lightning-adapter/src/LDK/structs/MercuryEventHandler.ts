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

class MercuryEventHandler implements EventHandlerInterface{
  channelManager: any;

  handle_event(e: any) {
    console.log(">>>>>>> Handling Event here <<<<<<<", e);

    switch (true) {
      case e instanceof Event_FundingGenerationReady:
        this.handleFundingGenerationReadyEvent(e);
        break;
      case e instanceof  Event_PaymentReceived:
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

  handleFundingGenerationReadyEvent(event: Event_FundingGenerationReady) {
    // REDO with psbt
  }

  handlePaymentReceivedEvent(e: Event_PaymentReceived) {
    console.log(`Payment of ${e.amount_msat} SAT received.`);
    this.channelManager.claim_funds(e.payment_hash);
  }

  handlePaymentSentEvent(e: Event_PaymentSent) {
    
    console.log(
      `Payment with preimage '${uint8ArrayToHexString(e.payment_preimage)}' sent.`
    );
  }

  handlePaymentPathFailedEvent(e: Event_PaymentPathFailed) {
    console.log(
      `Payment with payment hash '${uint8ArrayToHexString(e.payment_hash)}' failed.`
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

    console.log("Event Channel Closed!")
  }
}

export default MercuryEventHandler;
