// import fs from 'fs';
// import ElectrumClient from "./electrum.mjs";
// const ldk = import('lightningdevkit');

// import SetUpLDK from "./main-operations/SetUpLDK.mjs";
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
    KeysInterface,
    UserConfig,
    ChannelHandshakeConfig,
    ChainParameters,
    ChannelManager,
    IgnoringMessageHandler,
  } from "lightningdevkit";
import MercuryFeeEstimator from './structs/MercuryFeeEstimator.mjs';
import LightningClientInterface from './types/LightningClientInterface.js';


export default class LightningClient implements LightningClientInterface{
    feeEstimator: FeeEstimator;
    electrumClient: any;
    logger: Logger;
    txBroadcasted: any;
    txBroadcaster: BroadcasterInterface;
    network: any;
    genesisBlock: any;
    genesisBlockHash: any;
    networkGraph: NetworkGraph;
    filter: Filter;
    persist: Persist;
    eventHandler: EventHandler;
    chainMonitor: ChainMonitor;
    chainWatch: any;
    keysManager: KeysManager;
    keysInterface: KeysInterface;
    config: UserConfig;
    channelHandshakeConfig: ChannelHandshakeConfig;
    params: ChainParameters;
    channelManager: ChannelManager;
    peerManager: PeerManager;
    txdata: any;
    currentConnections: any[] = [];
    blockHeight: number | undefined;

  constructor(props: LightningClientInterface){
      this.feeEstimator = props.feeEstimator
      this.electrumClient = props.electrumClient
      this.logger =  props.logger
      this.txBroadcasted = props.txBroadcasted
      this.txBroadcaster = props.txBroadcaster
      this.network = props.network
      this.genesisBlock = props.genesisBlock
      this.genesisBlockHash = props.genesisBlockHash
      this.networkGraph = props.networkGraph
      this.filter = props.filter
      this.persist =  props.persist// Maybe should be persisterpersist
      this.eventHandler = props.eventHandler
      this.chainMonitor = props.chainMonitor
      this.chainWatch = props.chainWatch
      this.keysManager = props.keysManager
      this.keysInterface = props.keysInterface
      this.config = props.config
      this.channelHandshakeConfig = props.channelHandshakeConfig
      this.params = props.params
      this.channelManager = props.channelManager
      this.peerManager = props.peerManager
  }

  async setBlockHeight(){
    this.blockHeight = await this.electrumClient.getBlockHeight();
    console.log('BlockHeight: ', this.blockHeight);
  }


}

