import { ClosureReason_CommitmentTxConfirmed, ClosureReason_CooperativeClosure, ClosureReason_CounterpartyForceClosed, ClosureReason_DisconnectedPeer, ClosureReason_HolderForceClosed, ClosureReason_OutdatedChannelManager, ClosureReason_ProcessingError, Event, EventHandlerInterface, Event_ChannelClosed, Event_FundingGenerationReady, Event_PaymentFailed, Event_PaymentForwarded, Event_PaymentPathFailed, Event_PaymentReceived, Event_PaymentSent, Event_PendingHTLCsForwardable, Event_SpendableOutputs,  PaymentPurpose_InvoicePayment,  PaymentPurpose_SpontaneousPayment,  Result_TransactionNoneZ,  Result_TransactionNoneZ_OK,  TxOut } from "lightningdevkit";
// import { bytesToHex, dispatchEvent, hexToBytes } from "./utils";
// import { MARKER_BROADCAST, MARKER_FUNDING_GENERATION_READY, MARKER_PAYMENT_FAILED, MARKER_PAYMENT_PATH_FAILED, MARKER_PAYMENT_RECEIVED, MARKER_PAYMENT_SENT, MARKER_PERSIST_MANAGER } from "../const";
// import { MARKER_CHANNEL_CLOSED, channel_manager, feerate_fast, keys_manager, networkGraphPath, refund_address_script } from "..";

// class YourEventHandler implements EventHandlerInterface {
//     handle_event(event: Event): void {
//         handleEvent(event);
//     }

//     persist_manager(channel_manager_bytes: Uint8Array | null){
//         if(channel_manager_bytes !== null) {
//             const params = {
//                 channel_manager_bytes: bytesToHex(channel_manager_bytes)
//             }
//             dispatchEvent(MARKER_PERSIST_MANAGER, params);
//         }

//     }

//     persist_network_graph( network_graph: Uint8Array ) {
//         console.log("LDK: presist_network_graph")
//         if( networkGraphPath !== "" && network_graph !== null){
//             // File(networkGraphPath).writeBytes(network_graph)
//             // new File(network_graph, networkGraphPath)
            
//             // FILL IN FILE FOR NETWORK GRAPH
//         }
//     }


// }


// function handleEvent(event: Event) {

//     if(event instanceof Event_SpendableOutputs){
//         console.log("LDK: trying to spend output");

//         const txResult = keys_manager?.spend_spendable_outputs(
//                 event.outputs,
//                 Array<TxOut>(),
//                 hexToBytes(refund_address_script),
//                 feerate_fast
//         );

//         if( txResult instanceof Result_TransactionNoneZ_OK){
//             const params = {
//                 txhex: bytesToHex(txResult.res)
//             }

//             dispatchEvent(MARKER_BROADCAST, params);
//         }
//     }


//     if (event instanceof Event_PaymentSent) {
//         console.log("LDK: payment sent, preimage: ", bytesToHex(event.payment_preimage));
        
//         const params = {
//             payment_preimage: bytesToHex(event.payment_preimage)
//         }
//         dispatchEvent(MARKER_PAYMENT_SENT, params);
//       }
  
//       if (event instanceof Event_PaymentPathFailed) {
//         console.log("LDK: payment path failed, payment_hash: " + bytesToHex(event.payment_hash));
//         if (channel_manager?.as_Payer() == null) {
//           //THIS SHOULD BE: channel_manager_constructor from const.tsx - doesn't appear to be on JS

//           console.log("LDK: abandoning payment");
//           // since we aparently dont sync graph, payment was probably initiated via trying to pay a specific route - and that route failed!
//           // so no reason to wait for a timeout, we abandon payment immediately
//           channel_manager?.abandon_payment(event.payment_id);
//         }

//         const params = {
//             payment_hash: bytesToHex(event.payment_hash),
//             rejected_by_dest: event.rejected_by_dest.toString()
//         }

//         dispatchEvent(MARKER_PAYMENT_PATH_FAILED, params)

//       }
  
//       if (event instanceof Event_PaymentFailed) {
//         console.log("LDK: payment failed, payment_hash: ", bytesToHex(event.payment_hash));

//         const params = {
//             payment_hash: bytesToHex(event.payment_hash),
//             payment_id: bytesToHex(event.payment_id)
//         }

//         dispatchEvent(MARKER_PAYMENT_FAILED, params);
//       }
  
//       if (event instanceof Event_PaymentReceived) {
//         console.log("LDK: payment received, payment_hash: " + bytesToHex(event.payment_hash));
//         var paymentPreimage: Uint8Array | null = null;
//         var paymentSecret: Uint8Array | null = null;
  
//         if (event.purpose instanceof PaymentPurpose_InvoicePayment) {
//           paymentPreimage = (event.purpose as PaymentPurpose_InvoicePayment).payment_preimage;
//           paymentSecret = (event.purpose as PaymentPurpose_InvoicePayment).payment_secret;
//           channel_manager?.claim_funds(paymentPreimage);
//         } else if (event.purpose instanceof PaymentPurpose_SpontaneousPayment) {
//           paymentPreimage = (event.purpose as PaymentPurpose_SpontaneousPayment).spontaneous_payment;
//           channel_manager?.claim_funds(paymentPreimage);
//         }

//         let params = {
//             payment_hash: bytesToHex(event.payment_hash),
//             amt: event.amount_msat.toString(),
//             payment_secret: paymentSecret ? bytesToHex(paymentSecret): null,
//             payment_preimage: paymentPreimage ? bytesToHex(paymentPreimage): null

//         }

//         dispatchEvent(MARKER_PAYMENT_RECEIVED, params);
//       }
  
//       if (event instanceof Event_PendingHTLCsForwardable) {
//         channel_manager?.process_pending_htlc_forwards();
//       }
  
//       if (event instanceof Event_FundingGenerationReady) {
//         console.log("LDK: FundingGenerationReady");
//         const funding_spk = event.output_script;
//         if (funding_spk.length == 34 && funding_spk[0] == 0 && funding_spk[1] == 32) {
          
//           const params = {
//             channel_value_satoshis: event.channel_value_satoshis.toString(),
//             output_script: bytesToHex(event.output_script),
//             temporary_channel_id: bytesToHex(event.temporary_channel_id),
//             user_channel_id: event.user_channel_id.toString()
//           }
          
//           dispatchEvent(MARKER_FUNDING_GENERATION_READY, params);

//         }
//       }
  
//       if (event instanceof Event_PaymentForwarded) {
//         // we don't route as we are a light mobile node
//       }
  
//       if (event instanceof Event_ChannelClosed) {
//         console.log("LDK: ChannelClosed");
//         const reason = event.reason;
//         var reasonEvaluated
//         var text

//         if (reason instanceof ClosureReason_CommitmentTxConfirmed) {
//             reasonEvaluated ="CommitmentTxConfirmed";
//           }
//           if (reason instanceof ClosureReason_CooperativeClosure) {
//             reasonEvaluated ="CooperativeClosure";
//           }
//           if (reason instanceof ClosureReason_CounterpartyForceClosed) {
//             reasonEvaluated ="CounterpartyForceClosed";
//           }
//           if (reason instanceof ClosureReason_DisconnectedPeer) {
//             reasonEvaluated ="DisconnectedPeer";
//           }
//           if (reason instanceof ClosureReason_HolderForceClosed) {
//             reasonEvaluated ="HolderForceClosed";
//           }
//           if (reason instanceof ClosureReason_OutdatedChannelManager) {
//             reasonEvaluated ="OutdatedChannelManager";
//           }
//           if (reason instanceof ClosureReason_ProcessingError) {
//             reasonEvaluated ="ProcessingError";
//             text = reason.err;
//           }
    



//         const params = {
//             channel_id: bytesToHex(event.channel_id),
//             user_channel_id: event.user_channel_id.toString(),
//             reason: reasonEvaluated,
//             text: text
//         }

//         dispatchEvent(MARKER_CHANNEL_CLOSED, params);

//     }
// }


// export default YourEventHandler;