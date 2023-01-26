import LightningClient from "../lightning.mjs";

// import * as ldk from "lightningdevkit";
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

import MercuryFeeEstimator from "../structs/MercuryFeeEstimator";
import MercuryLogger from "../structs/MercuryLogger";
import MercuryPersister from "../structs/MercuryPersist";
// @ts-ignore
import MercuryEventHandler from "../structs/MercuryEventHandler";
import MercuryFilter from "../structs/MercuryFilter";

import MercuryRoutingMessageHandler from "../structs/MercuryRoutingMessageHandler";
import MercuryOnionMessageHandler from "../structs/MercuryOnionMessageHandler";
import MercuryCustomMessageHandler from "../structs/MercuryCustomMessageHandler";

class SetUpLDK {
    private lightningClient: LightningClient;
    
    constructor(lightningClient: LightningClient){
        this.lightningClient = lightningClient;
    }

    async setupLDK() {
        // const ldk = await import("lightningdevkit");
        // const wasm_file = fs.readFileSync(
        //   "node_modules/lightningdevkit/liblightningjs.wasm"
        // );
        // await ldk.initializeWasmFromBinary(wasm_file);
    
        // Step 1
        this.lightningClient.fee_estimator = FeeEstimator.new_impl(new MercuryFeeEstimator());
    
        // Step 2: logger
        this.lightningClient.logger = Logger.new_impl(new MercuryLogger());
    
        // Step 3: broadcast interface
        this.lightningClient.tx_broadcasted = new Promise((resolve, reject) => {
          this.lightningClient.tx_broadcaster = BroadcasterInterface.new_impl({
            // Need to call the sendrawtransaction call for the RPC service, loggin this for now to determined when to implement
            broadcast_transaction(tx) {
              console.log("Tx Broadcast: " + tx);
              resolve(tx);
            },
          });
        });
    
        // Step 4: network graph
        this.lightningClient.network = Network.LDKNetwork_Regtest;
    
        // Set genesis block as first block used when wallet created
        this.lightningClient.genesisBlock = BestBlock.constructor_from_genesis(this.lightningClient.network);
    
        this.lightningClient.genesis_block_hash = this.lightningClient.genesisBlock.block_hash();
    
        this.lightningClient.networkGraph = NetworkGraph.constructor_new(
          this.lightningClient.genesis_block_hash,
          this.lightningClient.logger
        );
    
        // console.group("network graph");
        // console.log("network:", this.lightningClient.network);
        // console.log("networkGraph:", this.lightningClient.networkGraph);
        // console.groupEnd();
    
        // Step 5: Persist
        this.lightningClient.persist = Persist.new_impl(new MercuryPersister());
    
        // Step 6: Initialize the EventHandler
        // this.lightningClient.event_handler = EventHandler.new_impl(
        //   new MercuryEventHandler(
        //     ((data: any) => {
        //       this.lightningClient.handleEventCallback(data);
        //     }).bind(this.lightningClient)
        //   )
        // );
        this.lightningClient.event_handler = EventHandler.new_impl(
          new MercuryEventHandler(
            ((data: any) => {
              return this.lightningClient
            }).bind(this.lightningClient)
          )
        );
    
        // Step 7: Optional: Initialize the transaction filter
        // ------  tx filter: watches for tx on chain
        // ------  tx filter: watches for if output spent on-chain
    
        this.lightningClient.filter = Filter.new_impl(new MercuryFilter());
    
        // Step 8: Initialize the ChainMonitor
        this.lightningClient.chain_monitor = ChainMonitor.constructor_new(
          this.lightningClient.filter,
          this.lightningClient.tx_broadcaster,
          this.lightningClient.logger,
          this.lightningClient.fee_estimator,
          this.lightningClient.persist
        );
    
        this.lightningClient.chain_watch = this.lightningClient.chain_monitor.as_Watch();
    
        // // Step 9: Initialize the KeysManager
        const ldk_data_dir = "./.ldk/";
        // if (!fs.existsSync(ldk_data_dir)) {
        //   fs.mkdirSync(ldk_data_dir);
        // }
        // const keys_seed_path = ldk_data_dir + "keys_seed";
    
        // var seed = null;
        // if (!fs.existsSync(keys_seed_path)) {
        //   seed = crypto.randomBytes(32);
        //   fs.writeFileSync(keys_seed_path, seed);
        // } else {
        //   seed = fs.readFileSync(keys_seed_path);
        // }
    
        // seed = nanoid(32);
        
        // console.log("SEED: ", seed);
    
        // this.lightningClient.keys_manager = KeysManager.constructor_new(seed, BigInt(42), 42);
        this.lightningClient.keys_interface = this.lightningClient.keys_manager.as_KeysInterface();
    
        this.lightningClient.config = UserConfig.constructor_default();
    
        this.lightningClient.channelHandshakeConfig = ChannelHandshakeConfig.constructor_default();
    
        this.lightningClient.params = ChainParameters.constructor_new(
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
        // const channel_monitor_list = Persister.read_channel_monitors(this.lightningClient.keys_manager);
    
        // console.log("FEE ESTIMATOR IN CHANNEL MANAGER: ", this.lightningClient.fee_estimator);
        // // Step 11: Initialize the ChannelManager
        this.lightningClient.channel_manager = ChannelManager.constructor_new(
          this.lightningClient.fee_estimator,
          this.lightningClient.chain_watch,
          this.lightningClient.tx_broadcaster,
          this.lightningClient.logger,
          this.lightningClient.keys_interface,
          this.lightningClient.config,
          this.lightningClient.params
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
          this.lightningClient.channel_manager.as_ChannelMessageHandler();
        const customMessageHandler =
          IgnoringMessageHandler.constructor_new().as_CustomMessageHandler();
        const onionMessageHandler =
          IgnoringMessageHandler.constructor_new().as_OnionMessageHandler();
    
        const nodeSecret = new Uint8Array(32);
        for (var i = 0; i < 32; i++) nodeSecret[i] = 42;
    
        const ephemeralRandomData = new Uint8Array(32);
    
        this.lightningClient.peerManager = PeerManager.constructor_new(
          channelMessageHandler,
          routingMessageHandler,
          onionMessageHandler,
          nodeSecret,
          Date.now(),
          ephemeralRandomData,
          this.lightningClient.logger,
          customMessageHandler
        );
      }
}

export default SetUpLDK;