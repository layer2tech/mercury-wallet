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

export default interface LightningClientInterface{
    feeEstimator: FeeEstimator;
    electrumClient: any; // give this a type later
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
    currentConnections: Array<any> ; // array of current peer connections
    blockHeight: number | undefined;
}