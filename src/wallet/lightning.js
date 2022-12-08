import * as ldk from "lightningdevkit";
import MercuryFeeEstimator from "./lightning/MercuryFeeEstimator";
import MercuryLogger from "./lightning/MercuryLogger";
import MercuryPersister from "./lightning/MercuryPersistor";

console.log("initialize the wasm from fetch...");
console.log("ldk", ldk);

await ldk.initializeWasmWebFetch("liblightningjs.wasm");
import { nanoid } from "nanoid";

export class LightningClient {
  fee_estimator;
  electrum_client;
  logger;
  tx_broadcasted;
  tx_broadcaster;
  // step 4
  network;
  genesisBlock;
  genesis_block_hash;
  networkGraph;
  // step 5
  persist;
  // step 6
  event_handler;
  // step 8
  chain_monitor;
  chain_watch;

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
    this.network = ldk.Network.LDKNetwork_Testnet;
    this.genesisBlock = ldk.BestBlock.constructor_from_genesis(this.network);
    this.genesis_block_hash = this.genesisBlock.block_hash();
    this.networkGraph = ldk.NetworkGraph.constructor_new(
      this.genesis_block_hash,
      this.logger
    );

    console.group("network graph");
    console.log("network:", this.network);
    console.log("genesisBlock:", this.genesisBlock);
    console.log("genesis_block_hash:", this.genesis_block_hash);
    console.log("networkGraph:", this.networkGraph);
    console.groupEnd();

    // Step 5: Persist
    this.persist = ldk.Persist.new_impl(new MercuryPersister());

    // Step 6: Initialize the EventHandler
    this.event_handler = ldk.EventHandler.new_impl({
      handle_event: function (e) {
        console.log(">>>>>>> Handling Event here <<<<<<<", e);
        if (e instanceof ldk.Event_FundingGenerationReady) {
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
      },
    });

    // Step 7: Optional: Initialize the transaction filter

    // Step 8: Initialize the ChainMonitor
    this.chain_monitor = ldk.ChainMonitor.constructor_new(
      ldk.Option_FilterZ.constructor_none(),
      this.tx_broadcaster,
      this.logger,
      this.fee_estimator,
      this.persister
    );
    this.chain_watch = this.chain_monitor.as_Watch();

    // Step 9: Initialize the KeysManager
    const ldk_data_dir = "./.ldk/";
    // if (!fs.existsSync(ldk_data_dir)) {
    //   fs.mkdirSync(ldk_data_dir);
    // }
    // const keys_seed_path = ldk_data_dir + "keys_seed";

    var seed = null;
    // if (!fs.existsSync(keys_seed_path)) {
    //   seed = crypto.randomBytes(32);
    //   fs.writeFileSync(keys_seed_path, seed);
    // } else {
    //   seed = fs.readFileSync(keys_seed_path);
    // }

    seed = nanoid(32);

    this.keys_manager = ldk.KeysManager.constructor_new(seed, BigInt(42), 42);
    this.keys_interface = this.keys_manager.as_KeysInterface();
    this.config = ldk.UserConfig.constructor_default();
    this.ChannelHandshakeConfig =
      ldk.ChannelHandshakeConfig.constructor_default();
    this.params = ldk.ChainParameters.constructor_new(
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
    // const channel_monitor_list = persister.read_channel_monitors(this.keys_manager);

    // Step 11: Initialize the ChannelManager
    this.channel_manager = ldk.ChannelManager.constructor_new(
      this.fee_estimator,
      this.chain_watch,
      this.tx_broadcaster,
      this.logger,
      this.keys_interface,
      this.config,
      this.params
    );
  }

  // starts the lightning LDK
  start() {
    setInterval(() => {
      //peer_manager.timer_tick_occurred();
      //peer_manager.process_events();
      this.channel_manager
        .as_EventsProvider()
        .process_pending_events(this.event_handler);
      this.chain_monitor
        .as_EventsProvider()
        .process_pending_events(this.event_handler);
    }, 2000);
  }
}
