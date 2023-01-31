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
import ElectrumClient from "../bitcoin_clients/ElectrumClient.mjs";
import TorClient from "../bitcoin_clients/TorClient.mjs";

export default interface LightningClientInterface{
    feeEstimator: FeeEstimator;
    electrumClient: TorClient | ElectrumClient; // Electrum for dev, Tor for prod
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
    latestBlockHeader: Uint8Array | undefined;
    netHandler: any
}