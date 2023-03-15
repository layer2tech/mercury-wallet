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
  Router,
  ChannelMonitor,
} from "lightningdevkit";

import fs from "fs";
import crypto from "crypto";

import MercuryFeeEstimator from "../structs/MercuryFeeEstimator.mjs";
import MercuryLogger from "../structs/MercuryLogger.js";
import MercuryPersister from "../structs/MercuryPersist.js";
// @ts-ignore
import MercuryEventHandler from "../structs/MercuryEventHandler.js";
import MercuryFilter from "../structs/MercuryFilter.js";
import LightningClientInterface from "../types/LightningClientInterface.js";
import ElectrumClient from "../bitcoin_clients/ElectrumClient.mjs";
import LightningClient from "../lightning.js";
import TorClient from "../bitcoin_clients/TorClient.mjs";
import MercuryRouter from "../structs/MercuryRouter.js";

export default function initLDK(electrum: string = "prod") {
  const initLDK = setUpLDK(electrum);
  if (initLDK) {
    return new LightningClient(initLDK);
  }
  throw Error("Couldn't initialize LDK");
}

function setUpLDK(electrum: string = "prod") {
  // Initialize the LDK data directory if necessary.
  const ldk_data_dir = "./.ldk/";
  if (!fs.existsSync(ldk_data_dir)) {
    fs.mkdirSync(ldk_data_dir);
  }

  // Initialize our bitcoind client.
  let electrumClient;
  console.log("INIT CLIENT: ", electrum);
  if (electrum === "prod") {
    console.log("Init TorClient");
    electrumClient = new TorClient("");
  } else {
    console.log("Init ElectrumClient");
    electrumClient = new ElectrumClient("");
  }

  // Check that the bitcoind we've connected to is running the network we expect
  const network = Network.LDKNetwork_Regtest;

  // ## Setup
  // Step 1: Initialize the FeeEstimator
  const feeEstimator = FeeEstimator.new_impl(new MercuryFeeEstimator());

  // Step 2: Initialize the Logger
  const logger = Logger.new_impl(new MercuryLogger());

  // Step 3: Initialize the BroadcasterInterface
  const txBroadcaster = BroadcasterInterface.new_impl({
    // Need to call the sendrawtransaction call for the RPC service, loggin this for now to determined when to implement
    broadcast_transaction(tx) {
      console.log("Tx Broadcast: " + tx);
    },
  });

  // Step 3: broadcast interface
  const txBroadcasted = new Promise((resolve, reject) => {
    txBroadcaster.broadcast_transaction = (tx) => {
      // Need to call the sendrawtransaction call for the RPC service, loggin this for now to determined when to implement
      console.log("Tx Broadcast: " + tx);
      resolve(tx);
    };
  });

  // Step 4: Initialize Persist
  const persist = Persist.new_impl(new MercuryPersister());

  // Step 5: Initialize the ChainMonitor
  const filter = Filter.new_impl(new MercuryFilter());
  let chainMonitor;
  let chainWatch;
  try {
    chainMonitor = ChainMonitor.constructor_new(
      Option_FilterZ.constructor_some(filter),
      txBroadcaster,
      logger,
      feeEstimator,
      persist
    );
    chainWatch = chainMonitor.as_Watch();
  } catch (e) {
    console.log("Error:::::::", e);
  }

  // Step 6: Initialize the KeysManager
  const keys_seed_path = ldk_data_dir + "keys_seed";
  var seed = null;
  if (!fs.existsSync(keys_seed_path)) {
    seed = crypto.randomBytes(32);
    fs.writeFileSync(keys_seed_path, seed);
  } else {
    seed = fs.readFileSync(keys_seed_path);
  }
  const keysManager = KeysManager.constructor_new(seed, BigInt(42), 42);

  let entropy_source = keysManager.as_EntropySource();
  let node_signer = keysManager.as_NodeSigner();
  let signer_provider = keysManager.as_SignerProvider();

  // Step 7: Read ChannelMonitor state from disk
  //let mut channelmonitors =
  // persister
  //  .read_channelmonitors(keys_manager.clone(), keys_manager.clone())
  //  .unwrap();

  // Step 8: Poll for the best chain tip, which may be used by the channel manager & spv client

  // Step 9: Initialize Network Graph, routing ProbabilisticScorer
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

  keysManager;

  // Step 10: Create Router
  let router = Router.new_impl(new MercuryRouter());

  // Step 11: Initialize the ChannelManager
  const config = UserConfig.constructor_default();
  const params = ChainParameters.constructor_new(
    Network.LDKNetwork_Regtest,
    BestBlock.constructor_new(
      Buffer.from(
        "2d0283ee3b182e42653566427c9140562fe1358801f33ed4a17ebbb3c925418c",
        "hex"
      ),
      187
    )
  );
  let channelManager;
  if (chainWatch) {
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

  const channelHandshakeConfig = ChannelHandshakeConfig.constructor_default();

  // Step 12: Sync ChannelMonitors and ChannelManager to chain tip

  // Step 13: Give ChannelMonitors to ChainMonitor

  // Step 14: Optional: Initialize the P2PGossipSync

  // Step 15: Initialize the PeerManager
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

  // Step 17: Connect and Disconnect Blocks

  // Step 18: Handle LDK Events
  let eventHandler;
  if (channelManager) {
    let mercuryHandler = new MercuryEventHandler(channelManager);
    eventHandler = EventHandler.new_impl(mercuryHandler);
  }

  // Step 19: Persist ChannelManager and NetworkGraph

  // ************************************************************************************************
  // Step 20: Background Processing

  // Regularly reconnect to channel peers.

  // Regularly broadcast our node_announcement. This is only required (or possible) if we have
  // some public channels, and is only useful if we have public listen address(es) to announce.
  // In a production environment, this should occur only after the announcement of new channels
  // to avoid churn in the global network graph.

  // ************************************************************************************************

  // Pass everything to initLDK
  if (chainMonitor && channelManager && peerManager && eventHandler) {
    const LDKInit: LightningClientInterface = {
      feeEstimator: feeEstimator,
      electrumClient: electrumClient,
      logger: logger,
      txBroadcasted: txBroadcasted,
      txBroadcaster: txBroadcaster,
      network: network,
      genesisBlock: genesisBlock,
      genesisBlockHash: genesisBlockHash,
      networkGraph: networkGraph,
      filter: filter,
      persist: persist,
      eventHandler: eventHandler,
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
    };
    return LDKInit;
  }

  throw new Error(
    `Unable to initialize the LDK, check values-> chainMonitor:${chainMonitor}, channelManager:${channelManager}, peerManager:${peerManager}, eventHandler:${eventHandler}`
  );
}
