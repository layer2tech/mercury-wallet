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
  Persister,
  Router,
} from "lightningdevkit";
import ElectrumClient from "../bitcoin_clients/ElectrumClient.mjs";
import TorClient from "../bitcoin_clients/TorClient.mjs";
import MercuryEventHandler from "../structs/MercuryEventHandler";
import EsploraSyncClient from "../sync/EsploraSyncClient.js";

export default interface LightningClientInterface {
  walletName: string;
  feeEstimator: FeeEstimator;
  bitcoind_client: TorClient | ElectrumClient; // Electrum for dev, Tor for prod
  logger: Logger;
  txBroadcasted: any;
  txBroadcaster: BroadcasterInterface;
  network: any;
  genesisBlock: any;
  genesisBlockHash: any;
  networkGraph: NetworkGraph;
  filter: Filter;
  persist: Persist;
  persister: Persister;
  eventHandler: EventHandler;
  chainMonitor: ChainMonitor;
  chainWatch: any;
  keysManager: KeysManager;
  config: UserConfig;
  channelHandshakeConfig: ChannelHandshakeConfig;
  params: ChainParameters;
  channelManager: ChannelManager;
  peerManager: PeerManager;
  txdata: any;
  router: Router;
  currentConnections: Array<any>; // array of current peer connections
  blockHeight: number | undefined;
  latestBlockHeader: Uint8Array | undefined;
  netHandler: any;
  syncClient: EsploraSyncClient;
}
