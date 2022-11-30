import * as ldk from "lightningdevkit";
import * as fs from "fs";
import MercuryFeeEstimator from "./lightning/MercuryFeeEstimator";
import MercuryLogger from "./lightning/MercuryLogger";
import MercuryPersister from "./lightning/MercuryPersistor";

console.log("initialize the wasm from fetch...");
console.log("ldk", ldk);

// THIS BREAKS THE PROJECT but we need the ldk/wasm initialized  somehow
await ldk.initializeWasmWebFetch("liblightningjs.wasm");

export class LightningClient {
  fee_estimator;
  electrum_client;
  logger;
  tx_broadcasted;
  tx_broadcaster;
  persist;

  constructor(_electrumClient) {
    this.electrum_client = _electrumClient;

    console.log(
      "Lightning received an electrum_client of which ->",
      this.electrum_client
    );

    // Step 1: fee estimator
    this.fee_estimator = ldk.FeeEstimator.new_impl(new MercuryFeeEstimator());

    // Step 2: logger
    this.logger = ldk.Logger.new_impl(new MercuryLogger());

    // Step 3: broadcast interface
    this.tx_broadcasted = new Promise((resolve, reject) => {
      this.tx_broadcaster = ldk.BroadcasterInterface.new_impl({
        // Need to call the sendrawtransaction call for the RPC service, loggin this for now to determined when to implement
        broadcast_transaction(tx) {
          console.log("Tx Broadcast: " + tx);
          resolve(tx);
        },
      });
    });

    // Step 4: network graph
    var network = ldk.Network.LDKNetwork_Testnet;
    var genesisBlock = ldk.BestBlock.constructor_from_genesis(network);
    var genesis_block_hash = genesisBlock.block_hash();

    var networkGraph = ldk.NetworkGraph.constructor_new(
      genesis_block_hash,
      this.logger
    );

    console.group("network graph");
    console.log("network:", network);
    console.log("genesisBlock:", genesisBlock);
    console.log("genesis_block_hash:", genesis_block_hash);
    console.log("networkGraph:", networkGraph);
    console.groupEnd();

    // Step 5: Persist
    this.persist = ldk.Persist.new_impl(MercuryPersister());

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
    // const channel_monitor_list = persister.read_channel_monitors(keys_manager);

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
  }

  // starts the lightning LDK
  start() {
    setInterval(() => {
      //peer_manager.timer_tick_occurred();
      //peer_manager.process_events();
      channel_manager.as_EventsProvider().process_pending_events(event_handler);
      chain_monitor.as_EventsProvider().process_pending_events(event_handler);
    }, 2000);
  }
}
