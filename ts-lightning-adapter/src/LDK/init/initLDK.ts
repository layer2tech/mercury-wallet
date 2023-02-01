import {
  ChannelMessageHandler,
  CustomMessageHandler,
  OnionMessageHandler,
  PeerManager,
  RoutingMessageHandler,
  Event_FundingGenerationReady,
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
} from "lightningdevkit";

import fs from "fs";
import crypto from "crypto";

import MercuryFeeEstimator from "../structs/MercuryFeeEstimator.mjs";
import MercuryLogger from "../structs/MercuryLogger.js";
import MercuryPersister from "../structs/MercuryPersist.js";
// @ts-ignore
import MercuryEventHandler from "../structs/MercuryEventHandler.js";
import MercuryFilter from "../structs/MercuryFilter.js";
import MercuryRoutingMessageHandler from "../structs/MercuryRoutingMessageHandler.js";
import MercuryOnionMessageHandler from "../structs/MercuryOnionMessageHandler.js";
import MercuryCustomMessageHandler from "../structs/MercuryCustomMessageHandler.js";
import LightningClientInterface from "../types/LightningClientInterface.js";
import ElectrumClient from "../bitcoin_clients/ElectrumClient.mjs";
import LightningClient from "../lightning.js";
import TorClient from "../bitcoin_clients/TorClient.mjs";

export default function initLDK(electrum: string = "prod"){
  
  const initLDK = setUpLDK(electrum);

  return new LightningClient(initLDK)

}

function setUpLDK(electrum: string = "prod"){

  // Step 1
  const feeEstimator = FeeEstimator.new_impl(new MercuryFeeEstimator());


  // Step 2: logger
  const logger = Logger.new_impl(new MercuryLogger());

  const txBroadcaster = BroadcasterInterface.new_impl({
    // Need to call the sendrawtransaction call for the RPC service, loggin this for now to determined when to implement
    broadcast_transaction(tx) {
      console.log("Tx Broadcast: " + tx);

    },
  })


  // Step 3: broadcast interface
  const txBroadcasted = new Promise((resolve, reject) => {
    txBroadcaster.broadcast_transaction = (tx) => {
      // Need to call the sendrawtransaction call for the RPC service, loggin this for now to determined when to implement
      console.log("Tx Broadcast: " + tx);
      resolve(tx)
    }
  });

  // Step 4: network graph
  const network = Network.LDKNetwork_Regtest;

  // Set genesis block as first block used when wallet created
  const genesisBlock = BestBlock.constructor_from_genesis(network);

  const genesisBlockHash = genesisBlock.block_hash();

  const networkGraph = NetworkGraph.constructor_new(
    genesisBlockHash,
    logger
  );

  // Step 5: Persist
  const persist = Persist.new_impl(new MercuryPersister());

  // Step 6: Initialize the EventHandler
  // event_handler = EventHandler.new_impl(
  //   new MercuryEventHandler(
  //     ((data: any) => {
  //       handleEventCallback(data);
  //     }).bind(this.lightningClient)
  //   )
  // );

  const eventHandler = EventHandler.new_impl(
    new MercuryEventHandler()
  );

  // Step 7: Optional: Initialize the transaction filter
  // ------  tx filter: watches for tx on chain
  // ------  tx filter: watches for if output spent on-chain

  const filter = Filter.new_impl(new MercuryFilter());

  // Step 8: Initialize the ChainMonitor
  const chainMonitor = ChainMonitor.constructor_new(
    filter,
    txBroadcaster,
    logger,
    feeEstimator,
    persist
  );

  const chainWatch = chainMonitor.as_Watch();

  // // Step 9: Initialize the KeysManager
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

  // seed = nanoid(32);
  
  console.log("SEED: ", seed);

  const keysManager = KeysManager.constructor_new(seed, BigInt(42), 42);
  const keysInterface = keysManager.as_KeysInterface();

  const config = UserConfig.constructor_default();

  const channelHandshakeConfig = ChannelHandshakeConfig.constructor_default();

  const params = ChainParameters.constructor_new(
    Network.LDKNetwork_Regtest,
    BestBlock.constructor_new(
      Buffer.from(
        "1ea4db8e157e1522405e5849bce768c5b971f3ff9781be6cd26f5a6f1fdf5253",
        "hex"
      ),
      102
    )
  );

  // // Step 10: Read ChannelMonitor from disk
  // const channel_monitor_list = Persister.read_channel_monitors(keys_manager);

  // console.log("FEE ESTIMATOR IN CHANNEL MANAGER: ", fee_estimator);
  // // Step 11: Initialize the ChannelManager
  const channelManager = ChannelManager.constructor_new(
    feeEstimator,
    chainWatch,
    txBroadcaster,
    logger,
    keysInterface,
    config,
    params
  );

  // const channelMessageHandler = ChannelMessageHandler.new_impl(
  //   new MercuryChannelMessageHandler()
  // );

  // const routingMessageHandler = RoutingMessageHandler.new_impl(
  //   new MercuryRoutingMessageHandler()
  // );

  // const onionMessageHandler = OnionMessageHandler.new_impl(
  //   new MercuryOnionMessageHandler()
  // );

  // const customMessageHandler = CustomMessageHandler.new_impl(
  //   new MercuryCustomMessageHandler()
  // );

  const routingMessageHandler =
    IgnoringMessageHandler.constructor_new().as_RoutingMessageHandler();
  // const channelMessageHandler = ldk.ErroringMessageHandler.constructor_new().as_ChannelMessageHandler();
  const channelMessageHandler =
    channelManager.as_ChannelMessageHandler();
  const customMessageHandler =
    IgnoringMessageHandler.constructor_new().as_CustomMessageHandler();
  const onionMessageHandler =
    IgnoringMessageHandler.constructor_new().as_OnionMessageHandler();

  const nodeSecret = new Uint8Array(32);
  for (var i = 0; i < 32; i++) nodeSecret[i] = 42;

  const ephemeralRandomData = new Uint8Array(32);

  const peerManager = PeerManager.constructor_new(
    channelMessageHandler,
    routingMessageHandler,
    onionMessageHandler,
    nodeSecret,
    Date.now(),
    ephemeralRandomData,
    logger,
    customMessageHandler
  );

  let electrumClient
  console.log('INIT CLIENT: ', electrum)
  if(electrum === "prod"){
    console.log('Init TorClient')
    electrumClient = new TorClient('');
  } else {
    console.log('Init ElectrumClient')
    electrumClient = new ElectrumClient('');
  }
  
  const LDKInit: LightningClientInterface = {
    feeEstimator: feeEstimator,
    electrumClient: electrumClient, // Add this
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
    keysInterface: keysInterface,
    config: config,
    channelHandshakeConfig: channelHandshakeConfig,
    params: params,
    channelManager: channelManager,
    peerManager: peerManager,
    txdata: [], 
    currentConnections: [],
    blockHeight: undefined,
    latestBlockHeader: undefined,
    netHandler: undefined
  }

  return LDKInit
}