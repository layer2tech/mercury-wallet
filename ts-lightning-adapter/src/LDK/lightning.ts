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
  Event,
} from "lightningdevkit";
import MercuryFeeEstimator from "./structs/MercuryFeeEstimator.mjs";
import { NodeLDKNet } from "./structs/NodeLDKNet.mjs";
import LightningClientInterface from "./types/LightningClientInterface.js";
import PeerDetails from "./types/PeerDetails.js";
import {
  hexToBytes,
  hexToUint8Array,
  uint8ArrayToHexString,
} from "./utils/utils.js";

import * as bitcoin from "bitcoinjs-lib";

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

  /**
   * Connects to Peer for outbound channel
   * @param pubkeyHex
   * @param host
   * @param port
   */

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

    await this.netHandler.connect_peer(host, port, pubkey);
    console.log("CONNECTED");

    await new Promise<void>((resolve) => {
      // Wait until the peers are connected and have exchanged the initial handshake
      var timer: any;
      timer = setInterval(() => {
        console.log("Node IDs", this.peerManager.get_peer_node_ids());
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
    channelId: number
  ) {
    await this.setBlockHeight();
    await this.setLatestBlockHeader(this.blockHeight);

    let channelValSatoshis = BigInt(amount);
    let pushMsat = BigInt(push_msat);
    let userChannelId = BigInt(channelId);

    let channelCreateResponse;
    console.log("Reached here ready to create channel...");
    try {
      channelCreateResponse = this.channelManager.create_channel(
        pubkey,
        channelValSatoshis,
        pushMsat,
        userChannelId,
        this.config
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
