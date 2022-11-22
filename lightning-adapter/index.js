import * as ldk from "lightningdevkit";
import * as fs from "fs";
import { strict as assert } from "assert";
import MercuryFeeEstimator from "./lib/MercuryFeeEstimator.js";
import MercuryLogger from "./lib/MercuryLogger.js";
import crypto from "crypto";
import MercuryPersister from "./lib/MercuryPersistor.js";

const wasm_file = fs.readFileSync(
  "node_modules/lightningdevkit/liblightningjs.wasm"
);

await ldk.initializeWasmFromBinary(wasm_file);

// example way of using this and getting a reference to ElectrumClient

/*
class LDK {
  electrum_client : ElectrumClient;
  constructor(ElectrumClient){

  }
}*/

class LDK {
  electrum_client;
  fee_estimator;
  logger;

  constructor(_electrumclient) {
    this.electrum_client = _electrumclient;
  }

  start() {
    // Step 1: fee estimator
    const fee_estimator = ldk.FeeEstimator.new_impl(new MercuryFeeEstimator());
    // Step 2: logger
    const logger = ldk.Logger.new_impl(new MercuryLogger());

    // Step 3: broadcast interface
    var tx_broadcaster;
    const tx_broadcasted = new Promise((resolve, reject) => {
      tx_broadcaster = ldk.BroadcasterInterface.new_impl({
        // Need to call the sendrawtransaction call for the RPC service, loggin this for now to determined when to implement
        broadcast_transaction(tx) {
          console.log("Tx Broadcast: " + tx);
          resolve(tx);
        },
      });
    });

    // Step 4: Optional: Initialize the NetworkGraph

    // Step 5: Initialize Persist
    const persister = ldk.Persist.new_impl(new MercuryPersister());

    // Step 6: Initialize the EventHandler
    let event_handler = ldk.EventHandler.new_impl({
      handle_event: function (e) {
        console.log(">>>>>>> Handling Event here <<<<<<<", e);
        if (e instanceof ldk.Event_FundingGenerationReady) {
          //console.log(e)
          var final_tx = 0;
          console.log(e.temporary_channel_id, e.counterparty_node_id, final_tx);
          //channel_manager.funding_transaction_generated(e.temporary_channel_id, e.counterparty_node_id, final_tx);
          // <insert code to handle this event>
        } else if (e instanceof Event.Event_PaymentReceived) {
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
      },
    });

    // Step 7: Optional: Initialize the transaction filter

    // Step 8: Initialize the ChainMonitor
    const chain_monitor = ldk.ChainMonitor.constructor_new(
      ldk.Option_FilterZ.constructor_none(),
      tx_broadcaster,
      logger,
      fee_estimator,
      persister
    );
    const chain_watch = chain_monitor.as_Watch();

    // Step 9: Initialize the KeysManager
    const ldk_data_dir = "./.ldk/";
    if (!fs.existsSync(ldk_data_dir)) {
      fs.mkdirSync(ldk_data_dir);
    }
    const keys_seed_path = ldk_data_dir + "keys_seed";

    var seed = null;
    if (!fs.existsSync(keys_seed_path)) {
      seed = crypto.randomBytes(32);
      fs.writeFileSync(keys_seed_path, seed);
    } else {
      seed = fs.readFileSync(keys_seed_path);
    }

    const keys_manager = ldk.KeysManager.constructor_new(seed, BigInt(42), 42);
    const keys_interface = keys_manager.as_KeysInterface();
    const config = ldk.UserConfig.constructor_default();
    const ChannelHandshakeConfig =
      ldk.ChannelHandshakeConfig.constructor_default();
    const params = ldk.ChainParameters.constructor_new(
      ldk.Network.LDKNetwork_Regtest,
      ldk.BestBlock.constructor_new(
        Buffer.from(
          "000000000000000000054099d5b8e51ab3604a70dfc0d48b23c8e391b076ef1b",
          "hex"
        ),
        764157
      )
    );

    // Step 10: Read ChannelMonitor from disk

    // Step 11: Initialize the ChannelManager
    const channel_manager = ldk.ChannelManager.constructor_new(
      fee_estimator,
      chain_watch,
      tx_broadcaster,
      logger,
      keys_interface,
      config,
      params
    );

    // Step 12: Sync ChannelMonitors and ChannelManager to chain tip - needs electrum

    // Step 13: Optional: Bind a listening port

    // Step 14: Keep LDK Up-to-date with chain info
  }
}
