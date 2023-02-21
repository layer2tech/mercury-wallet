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
  KeysInterface,
  UserConfig,
  ChannelHandshakeConfig,
  ChainParameters,
  ChannelManager,
  ConfirmationTarget,
} from "lightningdevkit";
import { NodeLDKNet } from "./structs/NodeLDKNet.mjs";
import LightningClientInterface from "./types/LightningClientInterface.js";
import PeerDetails from "./types/PeerDetails.js";
import {
  hexToBytes,
  hexToUint8Array,
  uint8ArrayToHexString,
} from "./utils/utils.js";
import MercuryEventHandler from "./structs/MercuryEventHandler.js";

export default class LightningClient implements LightningClientInterface {
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
  txdata: any; // TODO: Specify this type
  currentConnections: any[] = [];
  blockHeight: number | undefined;
  latestBlockHeader: Uint8Array | undefined;
  netHandler: any;

  constructor(props: LightningClientInterface) {
    this.feeEstimator = props.feeEstimator;
    this.electrumClient = props.electrumClient;
    this.logger = props.logger;
    this.txBroadcasted = props.txBroadcasted;
    this.txBroadcaster = props.txBroadcaster;
    this.network = props.network;
    this.genesisBlock = props.genesisBlock;
    this.genesisBlockHash = props.genesisBlockHash;
    this.networkGraph = props.networkGraph;
    this.filter = props.filter;
    this.persist = props.persist; // Maybe should be persisterpersist
    this.eventHandler = props.eventHandler;
    this.chainMonitor = props.chainMonitor;
    this.chainWatch = props.chainWatch;
    this.keysManager = props.keysManager;
    this.keysInterface = props.keysInterface;
    this.config = props.config;
    this.channelHandshakeConfig = props.channelHandshakeConfig;
    this.params = props.params;
    this.channelManager = props.channelManager;
    this.peerManager = props.peerManager;
  }

  /*
    Electrum Client Functions
  */

  async setBlockHeight() {
    // Gets the block height from client and assigns to class paramater
    this.blockHeight = await this.electrumClient.getBlockHeight();
  }

  async setLatestBlockHeader(height: number | undefined) {
    if (height) {
      let latestBlockHeader = await this.electrumClient.getLatestBlockHeader(
        height
      );

      this.latestBlockHeader = hexToBytes(latestBlockHeader);
    } else {
      throw Error("Block Height undefined");
    }
  }

  async addTxData(txid: any) {
    let txData = await this.electrumClient.getTxIdData(txid);
    this.txdata.push(txData);
  }

  setInputTx(privateKey: string, txid: string, vout: number, value: number) {
    let mercuryHandler = new MercuryEventHandler(this.channelManager);
    mercuryHandler.setInputTx(privateKey, txid, vout, value);
    const eventHandler = EventHandler.new_impl(mercuryHandler);
  }

  async connectToPeerAndCreateChannel(
    privkey: string, // Private key from txid address
    txid: string, // txid of input for channel
    vout: number, // index of input
    pubkeyHex: string,
    host: string,
    port: number,
    amount: number,
    push_msat: number,
    channelType: boolean
  ) {
    try {
      console.log("Input Tx .");

      this.setInputTx(
        privkey,
        txid,
        vout,
        amount +
          this.feeEstimator.get_est_sat_per_1000_weight(
            ConfirmationTarget.LDKConfirmationTarget_Normal
          )
      ); // TODO : needs to be properly referenced and set with UI with mercury fee estimator
      console.log("Input Tx √");
    } catch (e) {
      throw new Error(`Input Tx Error: ${e}`);
    }
    try {
      console.log("Connect to Peer .");
      await this.connectToPeer(pubkeyHex, host, port);
      console.log("Connect to Peer √");
    } catch (e) {
      throw new Error(`Connect Peer Error: ${e}`);
    }

    let pubkeyArray = hexToUint8Array(pubkeyHex);

    try {
      console.log("Connect to channel .");

      let override_config: UserConfig = UserConfig.constructor_default();
      override_config
        .get_channel_handshake_config()
        .set_announced_channel(channelType); // public channel

      // TODO: Add function to change this.config for public/private at top of this fn
      await this.createChannel(pubkeyArray, amount, push_msat, override_config);
      console.log("Connect to channel √");
    } catch (e) {
      console.log("Error: ", e);
      throw new Error(`Connect Channel Error: ${e}`);
    }
  }

  async connectToPeer(pubkeyHex: string, host: string, port: number) {
    console.log("Host: ", pubkeyHex, "@", host, ":", port);

    let pubkey = hexToUint8Array(pubkeyHex);
    if (pubkey) {
      const peerDetails: PeerDetails = {
        pubkey,
        host,
        port,
        id: this.currentConnections.length + 1,
      };

      console.log("Connecting...");
      await this.create_socket(peerDetails);
      // let event handler handle with -> Event_OpenChannelRequest
    }
  }

  previousLog: any = "";
  logWithoutRepeats(...args: any) {
    const log = args.join(" ");
    if (log !== this.previousLog) {
      console.log(args);
      this.previousLog = log;
    }
  }

  /**
   * Create Socket for Outbound channel creation
   * @param peerDetails
   */

  async create_socket(peerDetails: PeerDetails) {
    // Create Socket for outbound connection: check NodeNet LDK docs for inbound

    const { pubkey, host, port } = peerDetails;

    // Node key corresponding to all 42
    // const node_a_pk = new Uint8Array([3, 91, 229, 233, 71, 130, 9, 103, 74, 150, 230, 15, 31, 3, 127, 97, 118, 84, 15, 208, 1, 250, 29, 100, 105, 71, 112, 197, 106, 119, 9, 196, 44]);
    this.netHandler = new NodeLDKNet(this.peerManager);

    try {
      console.log("Peer Details: ", peerDetails);

      await this.netHandler.connect_peer(host, port, pubkey);
      console.log("CONNECTED");
    } catch (e) {
      console.log("Error: ", e);
      throw new Error(`PEER CONNECT ERR: ${e}`);
    }

    await new Promise<void>((resolve) => {
      // Wait until the peers are connected and have exchanged the initial handshake
      var timer: any;
      timer = setInterval(() => {
        this.logWithoutRepeats(
          "Node IDs",
          this.peerManager.get_peer_node_ids()
        );
        if (this.peerManager.get_peer_node_ids().length == 1) {
          // && this.peerManager2.get_peer_node_ids().length == 1

          console.log("Length is Equal to 1");
          resolve();
          clearInterval(timer);
        }
      }, 500);
    });

    // a_net_handler.stop();
    // b_net_handler.stop();
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

  async createChannel(
    pubkey: Uint8Array,
    amount: number,
    push_msat: number,
    override_config: UserConfig
  ) {
    await this.setBlockHeight();
    await this.setLatestBlockHeader(this.blockHeight);

    let channelValSatoshis = BigInt(amount);
    let pushMsat = BigInt(push_msat);
    //let userChannelId = BigInt(channelId);

    let lastChannelId = BigInt(this.currentConnections.length);

    let channelCreateResponse;
    console.log("Reached here ready to create channel...");
    try {
      channelCreateResponse = this.channelManager.create_channel(
        pubkey,
        channelValSatoshis,
        pushMsat,
        lastChannelId,
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
  }

  /**
   * @returns connected peers
   */
  list_peers() {
    return this.peerManager.get_peer_node_ids();
  }

  // starts the lightning LDK
  async start() {
    setInterval(async () => {
      // processes events on ChannelManager and ChainMonitor
      await this.processPendingEvents();

      // await this.setBlockHeight();
      // await this.setLatestBlockHeader();

      // this.channel_manager.as_Listen().block_disconnected(this.previous_block_header, this.block_height);
      // this.chain_monitor.block_disconnected(this.previous_block_header, this.block_height);

      // For each connected and disconnected block, and in chain-order, call these
      // methods.
      // If you're using BIP 157/158, then `txdata` below should always include any
      // transactions and/our outputs spends registered through the `Filter` interface,
      // Transactions and outputs are registered both on startup and as new relevant
      // transactions/outputs are created.

      // header is a []byte type, height is `int`, txdata is a
      // TwoTuple_usizeTransactionZ[], where the 0th element is the transaction's
      // position in the block (with the coinbase transaction considered position 0)
      // and the 1st element is the transaction bytes

      // Get the Header, TxData and Height
      // TwoTuple_usizeTransactionZ
      // console.log('Latest Block Header: ',this.latest_block_header)
      // this.channel_manager.as_Listen().block_connected(this.latest_block_header, this.block_height);
      // this.chain_monitor.block_connected(this.latest_block_header, this.txdata, this.block_height);
    }, 2000);
  }

  async processPendingEvents() {
    this.channelManager
      .as_EventsProvider()
      .process_pending_events(this.eventHandler);

    this.chainMonitor
      .as_EventsProvider()
      .process_pending_events(this.eventHandler);
  }
}
