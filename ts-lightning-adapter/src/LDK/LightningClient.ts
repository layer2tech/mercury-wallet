import {
  PeerManager,
  FeeEstimator,
  Logger,
  BroadcasterInterface,
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
  Persister,
  ChannelManagerReadArgs,
} from "lightningdevkit";
import { NodeLDKNet } from "./structs/NodeLDKNet.mjs";
import LightningClientInterface from "./types/LightningClientInterface.js";
import PeerDetails from "./types/PeerDetails.js";
import {
  hexToBytes,
  hexToUint8Array,
  uint8ArrayToHexString,
} from "./utils/utils.js";
import {
  createNewPeer,
  createNewChannel,
  insertTxData,
} from "./utils/ldk-utils.js";
import MercuryEventHandler from "./structs/MercuryEventHandler.js";
import { getLDKClient } from "./init/getLDK.js";

export default class LightningClient implements LightningClientInterface {
  feeEstimator: FeeEstimator;
  bitcointd_client: any;
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
  txdata: any; // TODO: Specify this type
  currentConnections: any[] = [];
  blockHeight: number | undefined;
  latestBlockHeader: Uint8Array | undefined;
  netHandler: NodeLDKNet;

  constructor(props: LightningClientInterface) {
    this.feeEstimator = props.feeEstimator;
    this.bitcointd_client = props.bitcointd_client;
    this.logger = props.logger;
    this.txBroadcasted = props.txBroadcasted;
    this.txBroadcaster = props.txBroadcaster;
    this.network = props.network;
    this.genesisBlock = props.genesisBlock;
    this.genesisBlockHash = props.genesisBlockHash;
    this.networkGraph = props.networkGraph;
    this.filter = props.filter;
    this.persist = props.persist;
    this.persister = props.persister;
    this.eventHandler = props.eventHandler;
    this.chainMonitor = props.chainMonitor;
    this.chainWatch = props.chainWatch;
    this.keysManager = props.keysManager;
    this.config = props.config;
    this.channelHandshakeConfig = props.channelHandshakeConfig;
    this.params = props.params;
    this.channelManager = props.channelManager;
    this.peerManager = props.peerManager;
    this.netHandler = new NodeLDKNet(this.peerManager);
  }

  /*
    Electrum Client Functions
  */

  async setBlockHeight() {
    // Gets the block height from client and assigns to class paramater
    this.blockHeight = await this.bitcointd_client.getBlockHeight();
  }

  async setLatestBlockHeader(height: number | undefined) {
    if (height) {
      let latestBlockHeader = await this.bitcointd_client.getLatestBlockHeader(
        height
      );

      this.latestBlockHeader = hexToBytes(latestBlockHeader);
    } else {
      throw Error("Block Height undefined");
    }
  }

  async addTxData(txid: any) {
    let txData = await this.bitcointd_client.getTxIdData(txid);
    this.txdata.push(txData);
  }

  setInputTx(privateKey: Buffer, txid: string, vout: number) {
    let mercuryHandler = new MercuryEventHandler(this.channelManager);
    mercuryHandler.setInputTx(privateKey, txid, vout);
    this.eventHandler = EventHandler.new_impl(mercuryHandler);
  }

  /**
   * Connects to Peer for outbound channel
   * @param pubkeyHex
   * @param host
   * @param port
   */

  // This function is called from peerRoutes.ts /create-channel request
  async createPeerAndChannel(
    amount: number,
    pubkey: string,
    host: string,
    port: number,
    channel_name: string,
    wallet_name: string,
    channelType: boolean,
    privkey: string, // Private key from txid address
    paid: boolean,
    payment_address: string // index of input
  ) {
    // Connect to the peer
    try {
      const result = await createNewPeer(host, port, pubkey);
      var peer_id = result.peer_id;
      if (!peer_id) throw "PEER_ID undefined";
    } catch (err) {
      console.log(err);
      throw err;
    }

    console.log("Peer created, connected to", peer_id);

    // Create the channel
    try {
      const result = await createNewChannel(
        pubkey,
        channel_name,
        amount,
        0,
        channelType,
        wallet_name,
        peer_id,
        privkey,
        paid,
        payment_address
      );
      console.log(result);
      var channel_id = result.channel_id;
    } catch (err) {
      console.log(err);
      throw err;
    }

    console.log("Channel Created, connected to", channel_id);
  }

  async openChannel(
    amount: number,
    paid: boolean,
    txid: string,
    vout: number,
    addr: string
  ) {
    try {
      const result = await insertTxData(amount, paid, txid, vout, addr);
      console.log("Input Tx .");
      this.setInputTx(hexToUint8Array(result.priv_key), txid, vout);
      console.log("Input Tx √");
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  // This function runs after createNewPeer->connectToPeer
  async connectToPeer(pubkeyHex: string, host: string, port: number) {
    let pubkey = hexToUint8Array(pubkeyHex);
    if (pubkey) {
      const peerDetails: PeerDetails = {
        pubkey,
        host,
        port,
        id: this.currentConnections.length + 1,
      };
      try {
        await this.create_socket(peerDetails);
        return true; // return true if the connection is successful
      } catch (e) {
        console.error("error on create_socket", e);
        throw e; // re-throw the error to the parent function
      }
    }
  }

  // This function runs after createNewChannel->connectToChannel
  async connectToChannel(
    pubkey: Uint8Array,
    amount: number,
    push_msat: number,
    channelId: number,
    channelType: boolean
  ) {
    console.log("pubkey found:", pubkey);

    await this.setBlockHeight();
    await this.setLatestBlockHeader(this.blockHeight);

    let channelValSatoshis = BigInt(amount);
    let pushMsat = BigInt(push_msat);
    let userChannelId = BigInt(channelId);

    // create the override_config
    let override_config: UserConfig = UserConfig.constructor_default();
    override_config
      .get_channel_handshake_config()
      .set_announced_channel(channelType);

    let channelCreateResponse;
    console.log("Reached here ready to create channel...");
    try {
      channelCreateResponse = this.channelManager.create_channel(
        pubkey,
        channelValSatoshis,
        pushMsat,
        userChannelId,
        override_config
      );
    } catch (e) {
      if (pubkey.length !== 33) {
        console.log("Entered incorrect pubkey - ", e);
      } else {
        var pubkeyHex = uint8ArrayToHexString(pubkey);
        console.log(
          `Lightning node with pubkey ${pubkeyHex} unreachable - `,
          e
        );
      }
    }
    if (this.blockHeight && this.latestBlockHeader) {
      for (let i = 0; i++; i <= this.blockHeight) {
        await this.setLatestBlockHeader(i + 1);
        this.channelManager
          .as_Listen()
          .block_connected(this.latestBlockHeader, this.blockHeight);
      }
      // this.chain_monitor.block_connected(this.latest_block_header, this.txdata, this.block_height);
    }

    console.log("Channel Create Response: ", channelCreateResponse);
    // Should return Ok response to display to user
    return true;
  }

  /**
   * Create Socket for Outbound channel creation
   * @param peerDetails
   */

  async create_socket(peerDetails: PeerDetails) {
    // Create Socket for outbound connection: check NodeNet LDK docs for inbound
    const { pubkey, host, port } = peerDetails;
    try {
      await this.netHandler.connect_peer(host, port, pubkey);
    } catch (e) {
      console.log("Error connecting to peer: ", e);
      throw e; // or handle the error in a different way
    }

    await new Promise<void>((resolve) => {
      // Wait until the peers are connected and have exchanged the initial handshake
      var timer: any;
      timer = setInterval(() => {
        if (this.peerManager.get_peer_node_ids().length == 1) {
          resolve();
          clearInterval(timer);
        }
      }, 1000);
    });
  }

  getChainMonitor(): ChainMonitor {
    return this.chainMonitor;
  }

  getPeerManager(): PeerManager {
    return this.peerManager;
  }

  getChannels() {
    return this.channelManager.list_channels();
  }

  getActiveChannels() {
    return this.channelManager.list_usable_channels();
  }

  getTxBroadCaster() {
    return this.txBroadcasted;
  }

  /**
   * @returns connected peers
   */
  list_peers() {
    return this.peerManager.get_peer_node_ids();
  }

  // starts the lightning LDK
  async start() {
    console.log("Calling ChannelManager's timer_tick_occurred on startup");
    this.channelManager.timer_tick_occurred();

    setInterval(async () => {
      // processes events on ChannelManager and ChainMonitor
      await this.processPendingEvents();
    }, 2000);
  }

  async processPendingEvents() {
    this.channelManager
      .as_EventsProvider()
      .process_pending_events(this.eventHandler);

    this.chainMonitor
      .as_EventsProvider()
      .process_pending_events(this.eventHandler);

    this.peerManager.process_events();

    // every 100 milli seconds persist channel manager to disk
    setInterval(async () => {
      this.persister.persist_manager(this.channelManager);
    }, 100);

    setInterval(async () => {
      this.peerManager.timer_tick_occurred();
    }, 10000);

    // 60 seconds after start prune
  }
}
