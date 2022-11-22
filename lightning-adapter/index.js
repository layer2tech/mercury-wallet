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

const ldk_data_dir = "./.ldk/";
if (!fs.existsSync(ldk_data_dir)) {
  fs.mkdirSync(ldk_data_dir);
}
const keys_seed_path = ldk_data_dir + "keys_seed";
const channelStoragePath = ldk_data_dir + "account";
const accountStoragePath = ldk_data_dir + "channel";


class LDK {
  electrum_client;
  fee_estimator;
  logger;

  constructor(_electrumclient) {
    this.electrum_client = _electrumclient;
  }

  async start() {
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

    const confRes = await this.initConfig(true, false,ChannelHandshakeConfig, false, 1) //TODO Verify correct min - maybe not 1

    // Step 12: Sync ChannelMonitors and ChannelManager to chain tip - needs electrum

    // Step 13: Optional: Bind a listening port

    // Step 14: Keep LDK Up-to-date with chain info
  }

  async initConfig(acceptInboundChannels, manuallyAcceptInboundChannels, ChannelHandshakeConfig, announcedChannels, minChannelHandshakeDepth, promise){
  //   if (userConfig !== null) {
  //     // return handleReject(promise, LdkErrors.already_init)
  // }

    let userConfig = ldk.UserConfig.constructor_default()
    if(!userConfig){
      throw 'Error'
    }

    userConfig.set_accept_inbound_channels(acceptInboundChannels)
    userConfig.set_manually_accept_inbound_channels(manuallyAcceptInboundChannels)

    const channelConfig = ldk.ChannelConfig.constructor_default()
    userConfig.set_channel_config(channelConfig)

    ChannelHandshakeConfig.set_minimum_depth(parseInt(minChannelHandshakeDepth))
    ChannelHandshakeConfig.set_announced_channel(announcedChannels)

    userConfig.set_channel_handshake_config(ChannelHandshakeConfig)

    const channelHandshakeLimits = ldk.ChannelHandshakeLimits.constructor_default()
    channelHandshakeLimits.set_force_announced_channel_preference(true)
    channelHandshakeLimits.set_max_minimum_depth(parseInt(minChannelHandshakeDepth))
    userConfig.set_channel_handshake_limits(channelHandshakeLimits)

    // handleResolve(promise, LdkCallbackResponses.config_init_success)
  }

//   initChannelManager(network, blockHash, blockHeight, chainMonitor, keysManager, promise) {
//     // if (channelManager !== null) {
//     //     // return handleReject(promise, LdkErrors.already_init)
//     //     throw 'Error'
//     // }

//     // chainMonitor ?: return handleReject(promise, LdkErrors.init_chain_monitor)
//     // keysManager ?: return handleReject(promise, LdkErrors.init_keys_manager)
//     // userConfig ?: return handleReject(promise, LdkErrors.init_user_config)
//     // networkGraph ?: return handleReject(promise, LdkErrors.init_network_graph)

//     if (accountStoragePath == "") {
//       throw 'Account storage Error'
//         // return handleReject(promise, LdkErrors.init_storage_path)
//     }
//     if (channelStoragePath == "") {
//       throw 'Channel Storage Error'
//         // return handleReject(promise, LdkErrors.init_storage_path)
//     }

//     let ldkNetwork;
//     let ldkCurrency;

//     switch (network) {
//       case "regtest":
//         ldkNetwork = ldk.Network.LDKNetwork_Regtest
//         ldkCurrency = ldk.Currency.LDKCurrency_Regtest
//         break
//       case "testnet":
//         ldkNetwork = ldk.Network.LDKNetwork_Testnet
//         ldkCurrency = ldk.Currency.LDKCurrency_BitcoinTestnet
//         break
//       case "mainnet": 
//         ldkNetwork = ldk.Network.LDKNetwork_Bitcoin
//         ldkCurrency = ldk.Currency.LDKCurrency_Bitcoin
//         break
//       default:
//           // return handleReject(promise, LdkErrors.invalid_network)
//           throw 'error'
//     }
    
//     var channelManagerSerialized = null
//     var channelManagerFile = accountStoragePath + "/" + "channel_manager.bin"

//     if (fs.existsSync(channelManagerFile)) {
//       channelManagerSerialized = fs.readFile(channelManagerFile)
//     }
    

//     try {
//         if (channelManagerSerialized != null) {
//             //Restoring node
//             LdkEventEmitter.send(EventTypes.native_log, "Restoring node from disk")
//             var channelMonitors = arrayListOf()
//             Files.walk(Paths.get(channelStoragePath))
//                 .filter { Files.isRegularFile(it) }
//                 .forEach {
//                     LdkEventEmitter.send(EventTypes.native_log, "Loading channel from file " + it.fileName)
//                     channelMonitors.add(it.toFile().readBytes())
//                 }

            
//             const channelManagerConstructor = ldk.ChannelManager.constructor_new(
//               fee_estimator,
//               chain_watch,
//               tx_broadcaster,
//               logger,
//               keys_interface,
//               config,
//               params
//             );
//         } else {
//             //New node
//             LdkEventEmitter.send(EventTypes.native_log, "Creating new channel manager")
//             channelManagerConstructor = ChannelManagerConstructor(
//                 ldkNetwork,
//                 userConfig,
//                 blockHash.hexa(),
//                 blockHeight.toInt(),
//                 keysManager!!.as_KeysInterface(),
//                 feeEstimator.feeEstimator,
//                 chainMonitor,
//                 networkGraph!!,
//                 broadcaster.broadcaster,
//                 logger.logger,
//             )
//         }
//     } catch (e: Exception) {
//         return handleReject(promise, LdkErrors.unknown_error, Error(e))
//     }

//     channelManager = channelManagerConstructor!!.channel_manager

//     //Scorer setup
//     val params = ProbabilisticScoringParameters.with_default()
//     val default_scorer = ProbabilisticScorer.of(params, networkGraph, logger.logger)
//     val score_res = ProbabilisticScorer.read(
//         default_scorer.write(), params, networkGraph,
//         logger.logger
//     )
//     if (!score_res.is_ok) {
//         return handleReject(promise, LdkErrors.init_scorer_failed)
//     }
//     val score = (score_res as Result_ProbabilisticScorerDecodeErrorZ_OK).res.as_Score()
//     val scorer = MultiThreadedLockableScore.of(score)

//     channelManagerConstructor!!.chain_sync_completed(channelManagerPersister, scorer)
//     peerManager = channelManagerConstructor!!.peer_manager

//     peerHandler = channelManagerConstructor!!.nio_peer_handler
//     invoicePayer = channelManagerConstructor!!.payer

//     handleResolve(promise, LdkCallbackResponses.channel_manager_init_success)
// }

}

new LDK().start();
