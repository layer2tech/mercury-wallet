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
} from "lightningdevkit";

class MercuryEventHandler {
  constructor(callbackFn) {
    // super(callbackFn);
    this.callbackFn = callbackFn;
  }

  handle_event(e) {
    console.log(">>>>>>> Handling Event here <<<<<<<", e);
    if (e instanceof Event_FundingGenerationReady) {
      this.callbackFn(e);
      // console.log('Event Funding Generation Ready!!')
      //console.log(e)
      // var final_tx = generateFundingTransaction(e.output_script, e.channel_value_satoshis);
      // // console.log(e.temporary_channel_id, e.counterparty_node_id, final_tx);

      // // console.log( 'Funding Generation Event: ',e );
      // // console.log('THIS: ', this);

      // this.channel_manager.funding_transaction_generated(e.temporary_channel_id, e.counterparty_node_id, final_tx);
      // //channel_manager.funding_transaction_generated(e.temporary_channel_id, e.counterparty_node_id, final_tx);
      // // <insert code to handle this event>
    } else if (e instanceof Event_PaymentReceived) {
      // Handle successful payment

      assert(event.payment_preimage instanceof Option.payment_preimage);
      const event = e;
      const payment_preimage = event.payment_preimage;
      assert(channel_manager.claim_funds(payment_preimage));
      // <insert code to handle this event>
    } else if (e instanceof Event_PaymentSent) {
      // <insert code to handle this event>
    } else if (e instanceof Event_PaymentPathFailed) {
      // <insert code to handle this event>
    } else if (e instanceof Event_PendingHTLCsForwardable) {
      // <insert code to handle this event>
    } else if (e instanceof Event_SpendableOutputs) {
      // <insert code to handle this event>
    } else if (e instanceof Event_PaymentForwarded) {
      // <insert code to handle this event>
    } else if (e instanceof Event_OpenChannelRequest) {
    } else if (e instanceof Event_ChannelClosed) {
      // <insert code to handle this event>
    }
  }
}

export default MercuryEventHandler;
