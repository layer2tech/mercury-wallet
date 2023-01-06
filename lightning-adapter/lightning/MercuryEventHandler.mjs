import { EventHandler, EventsProvider } from "lightningdevkit";

class MercuryEventHandler extends EventHandler {
  // constructor(events) {
  //   // console.log('Constructor called!');
  //   super(events);
  // }
  

  handle_event(event) {
    // this.events.push(event);

    console.log(">>>>>>> Handling Event here <<<<<<<", e);
    if (e instanceof this.LDK.Event_FundingGenerationReady) {
      console.log('Event Funding Generation Ready!!')
      //console.log(e)
      var final_tx = 0;
      console.log(e.temporary_channel_id, e.counterparty_node_id, final_tx);
      //channel_manager.funding_transaction_generated(e.temporary_channel_id, e.counterparty_node_id, final_tx);
      // <insert code to handle this event>
    } else if (e instanceof Event.Event_PaymentReceived) {
      // Handle successful payment
      const event = e;
      assert(event.payment_preimage instanceof Option.payment_preimage);
      const payment_preimage = event.payment_preimage;
      assert(channel_manager.claim_funds(payment_preimage));
      // <insert code to handle this event>
    } else if (e instanceof Event.Event_PaymentSent) {
      // <insert code to handle this event>
    } else if (e instanceof Event.Event_PaymentPathFailed) {
      // <insert code to handle this event>
    } else if (e instanceof Event.Event_PendingHTLCsForwardable) {
      // <insert code to handle this event>
    } else if (e instanceof Event.Event_SpendableOutputs) {
      // <insert code to handle this event>
    } else if (e instanceof Event.Event_PaymentForwarded) {
      // <insert code to handle this event>
    } else if (e instanceof Event.Event_ChannelClosed) {
      // <insert code to handle this event>
    }
  }
}

export default MercuryEventHandler;
