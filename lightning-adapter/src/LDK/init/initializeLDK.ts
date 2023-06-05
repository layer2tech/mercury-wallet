import {
  PeerManager,
  FeeEstimator,
  Logger,
  BroadcasterInterface,
  Network,
  BestBlock,
  NetworkGraph,
  Persist,
  EventHandler,
  Filter,
  ChainMonitor,
  KeysManager,
  UserConfig,
  ChannelHandshakeConfig,
  ChainParameters,
  ChannelManager,
  IgnoringMessageHandler,
  Option_FilterZ,
  ProbabilisticScorer,
  ProbabilisticScoringParameters,
  ChannelMonitor,
  DefaultRouter,
  LockableScore,
  Persister,
  UtilMethods,
  TwoTuple_BlockHashChannelManagerZ,
  TwoTuple_BlockHashChannelMonitorZ,
  OutPoint,
  Result_OutPointDecodeErrorZ_OK,
  Result_OutPointDecodeErrorZ,
  Result_C2Tuple_BlockHashChannelManagerZDecodeErrorZ,
  Result_C2Tuple_BlockHashChannelManagerZDecodeErrorZ_OK,
  Result_C2Tuple_BlockHashChannelManagerZDecodeErrorZ_Err,
} from "lightningdevkit";

import fs from "fs";
import crypto from "crypto";

import MercuryFeeEstimator from "../structs/MercuryFeeEstimator.mjs";
import MercuryLogger from "../structs/MercuryLogger.js";
// @ts-ignore
import MercuryEventHandler from "../structs/MercuryEventHandler.js";
// import MercuryFilter from "../structs/MercuryFilter.js"; - removed
import LightningClientInterface from "../types/LightningClientInterface.js";
import ElectrumClient from "../bitcoin_clients/ElectrumClient.mjs";
import TorClient from "../bitcoin_clients/TorClient.mjs";
import MercuryPersist from "../structs/MercuryPersist.js";
import MercuryPersister from "../structs/MercuryPersister.js";
import EsploraSyncClient from "../sync/EsploraSyncClient.js";
import {
  ChannelMonitorRead,
  readChannelsFromDictionary,
} from "../utils/ldk-utils.js";
import { uint8ArrayToHexString } from "../utils/utils.js";

import { ChalkColor, Logger as UtilLogger } from "../../LDK/utils/Logger.js";
const DEBUG = new UtilLogger(ChalkColor.Blue, "initializeLDK.ts");

export async function initializeLDK(electrum: string = "prod") {
  try {
    DEBUG.log("started initializeLDK");

    // Initialize the LDK data directory if necessary.
    const ldk_data_dir = "./.ldk/";
    if (!fs.existsSync(ldk_data_dir)) {
      fs.mkdirSync(ldk_data_dir);
    }

    // Initialize our bitcoind client.
    let bitcoind_client: TorClient | ElectrumClient;
    DEBUG.logD("env for bitcoind_client: ", electrum);
    if (electrum === "prod") {
      DEBUG.log("Using TorClient for bitcoind_client");
      bitcoind_client = new TorClient();
    } else {
      DEBUG.log("Using ElectrumClient for bitcoind_client ");
      bitcoind_client = new ElectrumClient();
    }

    // Check that the bitcoind we've connected to is running the network we expect
    const network = Network.LDKNetwork_Regtest;

    // ## Setup
    // Step 1: Initialize the FeeEstimator
    DEBUG.log("Step 1: Initialize the FeeEstimator");
    const feeEstimator = FeeEstimator.new_impl(new MercuryFeeEstimator());

    // Step 2: Initialize the Logger
    DEBUG.log("Step 2: Initialize the Logger");
    const logger = Logger.new_impl(new MercuryLogger());

    // Step 3: broadcast interface
    DEBUG.log("Step 3: Initialize the BroadcasterInterface and broadcast");
    const txBroadcaster = BroadcasterInterface.new_impl({
      async broadcast_transaction(tx: Uint8Array) {
        DEBUG.log("Tx Broadcast: " + uint8ArrayToHexString(tx));
        await bitcoind_client.setTx(uint8ArrayToHexString(tx));
      },
    });
    const txBroadcasted = new Promise((resolve, reject) => {
      txBroadcaster.broadcast_transaction = async (tx: Uint8Array) => {
        DEBUG.log("Tx Broadcast: " + uint8ArrayToHexString(tx));
        await bitcoind_client.setTx(uint8ArrayToHexString(tx));
        resolve(tx);
      };
    });

    // Step 4: Initialize Persist
    DEBUG.log("Step 4: Initialize Persist");
    const persist = Persist.new_impl(new MercuryPersist());
    const persister = Persister.new_impl(new MercuryPersister());

    // Step 5: Initialize the ChainMonitor
    DEBUG.log("Step 5: Initialize the ChainMonitor, filter and sync client");
    // Our sync client
    const syncClient = new EsploraSyncClient(bitcoind_client);
    const filter = Filter.new_impl(syncClient);
    const chainMonitor: ChainMonitor = ChainMonitor.constructor_new(
      Option_FilterZ.constructor_some(filter),
      txBroadcaster,
      logger,
      feeEstimator,
      persist
    );
    const chainWatch = chainMonitor.as_Watch();

    // Step 6: Initialize the KeysManager
    DEBUG.log("Step 6: Initialize the KeysManager");
    const keys_seed_path = ldk_data_dir + "keys_seed";
    var seed: any;
    if (!fs.existsSync(keys_seed_path)) {
      seed = crypto.randomBytes(32);
      fs.writeFileSync(keys_seed_path, seed);
    } else {
      seed = fs.readFileSync(keys_seed_path);
    }

    const current_time = Date.now();
    const keysManager = KeysManager.constructor_new(
      seed,
      BigInt(Math.floor(Date.now() / 1000)),
      current_time.valueOf()
    );

    let entropy_source = keysManager.as_EntropySource();
    let node_signer = keysManager.as_NodeSigner();
    let signer_provider = keysManager.as_SignerProvider();

    // Step 7: Read ChannelMonitor state from disk
    DEBUG.log("Step 7: Read ChannelMonitor state from disk");
    DEBUG.log("reading channel monitor data...");
    let channel_monitor_data: ChannelMonitorRead[] = [];
    if (fs.existsSync("channels/channel_lookup.json")) {
      try {
        channel_monitor_data = readChannelsFromDictionary(
          "channels/channel_lookup.json"
        );
      } catch (e) {
        console.error("error:" + e);
      }
    }

    // Step 8: Poll for the best chain tip, which may be used by the channel manager & spv client
    DEBUG.log("Step 8: Poll for the best chain tip");

    // Step 9: Initialize Network Graph, routing ProbabilisticScorer
    DEBUG.log("Step 9: Initialize Network Graph, routing ProbabilisticScorer");
    const genesisBlock = BestBlock.constructor_from_network(network);
    const genesisBlockHash = genesisBlock.block_hash();
    const networkGraph = NetworkGraph.constructor_new(network, logger);

    const ldk_scorer_dir = "./.scorer/";
    if (!fs.existsSync(ldk_scorer_dir)) {
      fs.mkdirSync(ldk_scorer_dir);
    }
    let scorer_params = ProbabilisticScoringParameters.constructor_default();
    let scorer = ProbabilisticScorer.constructor_new(
      scorer_params,
      networkGraph,
      logger
    );

    let locked_score = LockableScore.new_impl({
      lock() {
        return scorer.as_Score();
      },
    });

    // Step 10: Create Router
    DEBUG.log("Step 10: Create Router");
    let default_router = DefaultRouter.constructor_new(
      networkGraph,
      logger,
      seed,
      locked_score
    );

    let router = default_router.as_Router();

    // Step 11: Initialize the ChannelManager
    DEBUG.log("Step 11: Initialize the ChannelManager");
    const config = UserConfig.constructor_default();

    DEBUG.log("Call GET block_height, block_hash, block_header");
    let block_height: number = await bitcoind_client.getBestBlockHeight();
    let block_hash: string = await bitcoind_client.getBestBlockHash();
    let block_header = await bitcoind_client.getBlockHeader(block_height);

    DEBUG.log("intiialize chain parameters");
    const params = ChainParameters.constructor_new(
      Network.LDKNetwork_Regtest,
      BestBlock.constructor_new(Buffer.from(block_hash, "hex"), block_height)
    );

    const channel_monitor_mut_references: ChannelMonitor[] = [];
    let channelManager: any;
    DEBUG.log("At ChannelManager create/restore");
    if (fs.existsSync("channel_manager_data.bin")) {
      DEBUG.log("Loading the channel manager from disk...");
      const f = fs.readFileSync(`channel_manager_data.bin`);
      DEBUG.log("create channel_monitor_references");
      channel_monitor_data.forEach((channel_monitor: ChannelMonitorRead) => {
        let val: any =
          UtilMethods.constructor_C2Tuple_BlockHashChannelMonitorZ_read(
            channel_monitor.bytes,
            entropy_source,
            signer_provider
          );
        if (val.is_ok()) {
          let read_channelMonitor: TwoTuple_BlockHashChannelMonitorZ = val.res;
          let channel_monitor = read_channelMonitor.get_b();
          channel_monitor_mut_references.push(channel_monitor);
        }
      });
      DEBUG.log("try and read the channel manager");
      let readManager: any;
      readManager =
        UtilMethods.constructor_C2Tuple_BlockHashChannelManagerZ_read(
          f,
          entropy_source,
          node_signer,
          signer_provider,
          feeEstimator,
          chainMonitor.as_Watch(),
          txBroadcaster,
          router,
          logger,
          config,
          channel_monitor_mut_references
        );
      DEBUG.log("read channel manager constructed successfully");
      if (
        readManager instanceof
          Result_C2Tuple_BlockHashChannelManagerZDecodeErrorZ_OK &&
        readManager.is_ok()
      ) {
        DEBUG.log("readManager is_ok");
        let read_channelManager: TwoTuple_BlockHashChannelManagerZ =
          readManager.res;
        channelManager = read_channelManager.get_b();
        DEBUG.log(
          "read_channelManager.get_b() passed as channelManager successfully"
        );
      } else if (
        readManager instanceof
        Result_C2Tuple_BlockHashChannelManagerZDecodeErrorZ_Err
      ) {
        DEBUG.log(
          "Error occured in reading channel manager received a Decode Error"
        );
        console.table(readManager.err);
      } else {
        throw Error("Couldn't recreate channel manager from disk \n");
      }
    } else {
      DEBUG.log("Create fresh channel manager");
      // fresh manager
      channelManager = ChannelManager.constructor_new(
        feeEstimator,
        chainWatch,
        txBroadcaster,
        router,
        logger,
        entropy_source,
        node_signer,
        signer_provider,
        config,
        params
      );
    }

    if (channelManager === undefined) {
      throw new Error("[initializeLDK.ts]: Channel Manager is still undefined");
    }

    const channelHandshakeConfig = ChannelHandshakeConfig.constructor_default();

    // Step 12: Sync ChainMonitor and ChannelManager to chain tip
    DEBUG.log("Step 12: Sync ChainMonitor and ChannelManager to chain tip");
    await syncClient.sync([
      channelManager.as_Confirm(),
      chainMonitor.as_Confirm(),
    ]);

    // Step 13: Give ChannelMonitors to ChainMonitor
    DEBUG.log("Step 13: Give ChannelMonitors to ChainMonitor");
    if (channel_monitor_mut_references.length > 0) {
      let outpoints_mut: OutPoint[] = [];

      channel_monitor_data.forEach((channel_monitor: ChannelMonitorRead) => {
        // Rebuild OutPoint from the first Uint8Array in the tuple
        const outpointResult: Result_OutPointDecodeErrorZ =
          OutPoint.constructor_read(channel_monitor.outpoint);
        if (outpointResult.is_ok()) {
          const outpoint: OutPoint = (<Result_OutPointDecodeErrorZ_OK>(
            outpointResult
          )).res;
          outpoints_mut.push(outpoint);
        }
      });

      // ensure outpoints_mut and channel_monitor_mut are the same length
      if (outpoints_mut.length !== channel_monitor_mut_references.length) {
        throw Error("No equal amounts of outpoints to channel monitor.");
      }

      // give chainWatch the output and serialized form of channel to watch
      for (let i = 0; i < outpoints_mut.length; i++) {
        const outpoint = outpoints_mut[i];
        const serializedByte = channel_monitor_mut_references[i];
        if (outpoint && serializedByte) {
          chainWatch.watch_channel(outpoint, serializedByte);
        }
      }
    }

    // Step 14: Optional: Initialize the P2PGossipSync
    DEBUG.log("Step 14: Optional: Initialize the P2PGossipSync - TODO");

    // Step 15: Initialize the PeerManager
    DEBUG.log("Step 15: Initialize the PeerManager");
    const routingMessageHandler =
      IgnoringMessageHandler.constructor_new().as_RoutingMessageHandler();
    let channelMessageHandler;
    if (channelManager) {
      channelMessageHandler = channelManager.as_ChannelMessageHandler();
    }
    const customMessageHandler =
      IgnoringMessageHandler.constructor_new().as_CustomMessageHandler();
    const onionMessageHandler =
      IgnoringMessageHandler.constructor_new().as_OnionMessageHandler();
    const nodeSecret = new Uint8Array(32);
    for (var i = 0; i < 32; i++) nodeSecret[i] = 42;
    const ephemeralRandomData = new Uint8Array(32);

    const peerManager =
      channelMessageHandler &&
      PeerManager.constructor_new(
        channelMessageHandler,
        routingMessageHandler,
        onionMessageHandler,
        Date.now(),
        ephemeralRandomData,
        logger,
        customMessageHandler,
        node_signer
      );

    // ## Running LDK
    // Step 16: Initialize networking
    DEBUG.log("Step 16: Initialize networking - TODO");

    // Step 17: Connect and Disconnect Blocks
    DEBUG.log("Step 17: Connect and Disconnect Blocks");
    let channel_manager_listener = channelManager;
    let chain_monitor_listener = chainMonitor;
    let bitcoind_block_source = bitcoind_client;

    /*
    const chain_poller = new ChainPoller(bitcoind_block_source, network);
    const chain_listener = [chain_monitor_listener, channel_manager_listener];
    const spv_client = new SpvClient(
      chain_tip,
      chain_poller,
      cache,
      chain_listener
    );
    
    setInterval(async () => {
      await spv_client.poll_best_tip();
    }, 1000);
    */

    // check on interval

    // Step 18: Handle LDK Events
    DEBUG.log("Step 18: Handle LDK Events");
    let eventHandler;

    if (channelManager) {
      let mercuryEventHandler = new MercuryEventHandler(channelManager);
      eventHandler = EventHandler.new_impl(mercuryEventHandler);
    }

    // Step 19: Persist ChannelManager and NetworkGraph
    DEBUG.log("Step 19: Persist ChannelManager and NetworkGraph");
    persister.persist_manager(channelManager);
    persister.persist_graph(networkGraph);

    // ************************************************************************************************
    // Step 20: Background Processing
    DEBUG.log("Step 20: Background Processing");

    // Regularly reconnect to channel peers.
    // peerManager?.timer_tick_occurred() - use this, checks for disconnected peers

    // Regularly broadcast our node_announcement. This is only required (or possible) if we have
    // some public channels, and is only useful if we have public listen address(es) to announce.
    // In a production environment, this should occur only after the announcement of new channels
    // to avoid churn in the global network graph.
    // peerManager?.broadcast_node_announcement()

    // ************************************************************************************************

    // Pass everything to initLDK
    if (chainMonitor && channelManager && peerManager && eventHandler) {
      const LDKInit: LightningClientInterface = {
        feeEstimator: feeEstimator,
        bitcoind_client: bitcoind_client,
        logger: logger,
        txBroadcasted: txBroadcasted,
        txBroadcaster: txBroadcaster,
        network: network,
        genesisBlock: genesisBlock,
        genesisBlockHash: genesisBlockHash,
        networkGraph: networkGraph,
        filter: filter,
        persist: persist,
        persister: persister,
        eventHandler: eventHandler,
        router: router,
        chainMonitor: chainMonitor,
        chainWatch: chainWatch,
        keysManager: keysManager,
        config: config,
        channelHandshakeConfig: channelHandshakeConfig,
        params: params,
        channelManager: channelManager,
        peerManager: peerManager,
        txdata: [],
        currentConnections: [],
        blockHeight: undefined,
        latestBlockHeader: undefined,
        netHandler: undefined,
        syncClient: syncClient,
      };
      return LDKInit;
    }

    // If we can't return a LDKInit then throw
    throw new Error(
      `Unable to initialize the LDK, check values-> chainMonitor:${chainMonitor}, channelManager:${channelManager}, peerManager:${peerManager}, eventHandler:${eventHandler} \n`
    );
  } catch (e) {
    throw new Error(
      `[initializeLDK.ts]: Unable to initalize the LDK, error occured \n ${e} \n`
    );
  }
}
