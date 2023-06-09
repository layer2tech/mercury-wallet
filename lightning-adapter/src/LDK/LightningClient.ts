import {
  PeerManager,
  FeeEstimator,
  Logger,
  BroadcasterInterface,
  NetworkGraph,
  Persist,
  Filter,
  ChainMonitor,
  KeysManager,
  UserConfig,
  ChannelHandshakeConfig,
  ChainParameters,
  ChannelManager,
  Persister,
  ChannelDetails,
  Result_NoneAPIErrorZ,
  InFlightHtlcs,
  Result_RouteLightningErrorZ_OK,
  RouteParameters,
  PaymentParameters,
  Route,
  Option_u64Z_Some,
  Result_InvoiceParseOrSemanticErrorZ_OK,
  Result_InvoiceParseOrSemanticErrorZ_Err,
  Invoice,
  Router,
  UtilMethods,
  Option_u64Z,
  Option_u16Z,
  Result_InvoiceSignOrCreationErrorZ_OK,
  Result_InvoiceSignOrCreationErrorZ_Err,
  Result_InvoiceSignOrCreationErrorZ,
  EventHandler,
  RecipientOnionFields,
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
  checkIfChannelExists,
  savePeerAndChannelToDatabase,
} from "./utils/ldk-utils.js";
import MercuryEventHandler from "./structs/MercuryEventHandler.js";
import ElectrumClient from "./bitcoin_clients/ElectrumClient.mjs";
import TorClient from "./bitcoin_clients/TorClient.mjs";
import EsploraSyncClient from "./sync/EsploraSyncClient.js";
// @ts-ignore
import * as wif from "wif";

import { ChalkColor, Logger as UtilLogger } from "../LDK/utils/Logger.js";
const DEBUG = new UtilLogger(ChalkColor.bgCyan, "LightningClient.ts");

export default class LightningClient implements LightningClientInterface {
  feeEstimator: FeeEstimator;
  bitcoind_client: TorClient | ElectrumClient;
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
  txDatas: any;
  currentConnections: any[] = [];
  blockHeight: number | undefined;
  latestBlockHeader: Uint8Array | undefined;
  netHandler: NodeLDKNet;
  bestBlockHash: any;
  router: Router;
  syncClient: EsploraSyncClient;
  txdata: any;
  payment_address: any;
  // keep track of intervals to stop later
  eventInterval: any;
  syncInterval: any;

  constructor(props: LightningClientInterface) {
    this.feeEstimator = props.feeEstimator;
    this.bitcoind_client = props.bitcoind_client;
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
    this.router = props.router;
    this.syncClient = props.syncClient;
    this.netHandler = new NodeLDKNet(this.peerManager);
  }

  /*
    bitcoind Client Functions
    These functions when called update the values of the object and return the value
  */
  async updateBestBlockHeight() {
    this.blockHeight = await this.bitcoind_client.getBestBlockHeight();
    return this.blockHeight;
  }

  async updateBestBlockHash() {
    this.bestBlockHash = await this.bitcoind_client.getBestBlockHash();
    return this.bestBlockHash;
  }

  async updateLatestBlockHeader(height: number | undefined) {
    if (height) {
      let latestBlockHeader = await this.bitcoind_client.getBlockHeader(height);

      this.latestBlockHeader = hexToBytes(latestBlockHeader);
    } else {
      throw Error(": Block Height undefined");
    }
    return this.latestBlockHeader;
  }

  /*

  */
  async createInvoice(
    amount_sats: bigint,
    description: string,
    expiry_time_secs: number
  ) {
    let some_amount = Option_u64Z.constructor_some(amount_sats);

    // Create a new Date object representing the desired timestamp
    const timestamp = new Date();

    // Get the number of seconds since the UNIX epoch at the timestamp
    const secondsSinceEpoch = Math.floor(timestamp.getTime() / 1000);

    // Convert the number of seconds to a BigInt value
    const durationSinceEpoch = BigInt(secondsSinceEpoch);

    let min_final_cltv_expiry_delta = 36;
    let min_final_cltv_expiry = Option_u16Z.constructor_some(
      min_final_cltv_expiry_delta
    );

    let invoice:
      | Result_InvoiceSignOrCreationErrorZ_OK
      | Result_InvoiceSignOrCreationErrorZ_Err
      | Result_InvoiceSignOrCreationErrorZ =
      UtilMethods.constructor_create_invoice_from_channelmanager_and_duration_since_epoch(
        this.channelManager,
        this.keysManager.as_NodeSigner(),
        this.logger,
        this.network,
        some_amount,
        description,
        durationSinceEpoch,
        expiry_time_secs,
        min_final_cltv_expiry
      );

    if (invoice instanceof Result_InvoiceSignOrCreationErrorZ_Err) {
      DEBUG.log("invoice.err.to_str()", "createInvoice", invoice.err.to_str());
      throw new Error(":" + invoice.err.to_str());
    } else if (invoice instanceof Result_InvoiceSignOrCreationErrorZ_OK) {
      let successful_invoice: any =
        Result_InvoiceSignOrCreationErrorZ_OK.constructor_ok(invoice.res);
      let encoded_invoice: Invoice = successful_invoice.res;
      DEBUG.log("Encoded_invoice:", "createInvoice", encoded_invoice.to_str());

      return encoded_invoice.to_str();
    }

    throw new Error(
      "Error occured in [LightningClient.ts/createInvoiceUtil] method not in fail or success state"
    );
  }

  async setEventTxData(txid: any, payment_address: string) {
    this.txdata = await this.getTxData(txid);
    this.payment_address = payment_address;
    MercuryEventHandler.setInputTx(this.txdata, this.payment_address);
  }

  // probably should move to a utils file
  private isHex(str: string): boolean {
    const hexPattern = /^[0-9a-fA-F]+$/;
    return hexPattern.test(str);
  }

  async setPrivateKey(privateKey: string) {
    DEBUG.log("trying to decode private key", "setPrivateKey", privateKey);

    if (this.isHex(privateKey)) {
      MercuryEventHandler.privateKey = Buffer.from(privateKey, "hex");
    } else {
      // TODO add checks to see if this a wif encoded string
      MercuryEventHandler.privateKey = wif.decode(privateKey).privateKey;
    }
  }

  async getTxData(txid: any) {
    let txData = await this.bitcoind_client.getTxIdData(txid);
    return txData;
  }

  async sendPayment(invoiceStr: string) {
    if (invoiceStr === "") return;
    DEBUG.logD("Sending payment to", invoiceStr);

    const parsed_invoice = Invoice.constructor_from_str(invoiceStr);

    if (parsed_invoice instanceof Result_InvoiceParseOrSemanticErrorZ_OK) {
      const invoice = parsed_invoice.res;
      DEBUG.log("invoice", "sendPayment", invoice);

      let amt_msat: bigint = 0n;

      let invoiceSome = invoice.amount_milli_satoshis();
      if (invoiceSome instanceof Option_u64Z_Some) {
        amt_msat = invoiceSome.some;
        DEBUG.log("amount_msat", "sendPayment", amt_msat);
      }

      if (amt_msat === 0n) {
        throw Error(
          "[LightningClient.ts/sendPayment]: Invalid or zero value invoice"
        );
      }

      const recipient_onion = RecipientOnionFields.constructor_new(
        invoice.payment_secret(),
        invoice.payment_metadata()
      );

      let route: Route;

      let payment_params = PaymentParameters.constructor_from_node_id(
        invoice.recover_payee_pub_key(),
        Number(invoice.min_final_cltv_expiry_delta())
      );
      let route_params = RouteParameters.constructor_new(
        payment_params,
        amt_msat
      );

      DEBUG.log(
        "USABLE CHANNELS",
        "sendPayment",
        this.channelManager.list_usable_channels()
      );
      const route_res = this.router.find_route(
        this.channelManager.get_our_node_id(),
        route_params,
        this.channelManager.list_usable_channels(),
        InFlightHtlcs.constructor_new()
      );

      let payment_id = new Uint8Array(
        Array.from({ length: 32 }, () => Math.floor(Math.random() * 256))
      );

      if (route_res instanceof Result_RouteLightningErrorZ_OK) {
        route = route_res.res;
        DEBUG.log("route value", "sendPayment", route);
        const payment_res = this.channelManager.send_payment_with_route(
          route,
          invoice.payment_hash(),
          recipient_onion,
          payment_id
        );
        DEBUG.log("payment_res", "sendPayment", payment_res);
        return payment_res;
      }
    } else if (
      parsed_invoice instanceof Result_InvoiceParseOrSemanticErrorZ_Err
    ) {
      return parsed_invoice.err.to_str();
    }

    throw Error("Error occured in [LightningClient.ts/sendPayment] method");
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
        let result = await this.create_socket(peerDetails);
        if (result) {
          return true; // return true if the connection is successful
        } else {
          throw new Error("Unable to create socket");
        }
      } catch (e) {
        console.error(": error on create_socket", e);
        throw e; // re-throw the error to the parent function
      }
    } else {
      throw new Error("Was not able to convert pubkeyHex to a uint8array");
    }
  }

  // This function runs after createNewChannel->createChannel
  async createChannel(
    pubkey: Uint8Array,
    amount_sat: number,
    push_msat: number,
    channelType: boolean,
    funding_txid: string,
    payment_address: string,
    hostProperties: {
      host: string;
      port: number;
      channel_name: string;
      wallet_name: string;
      privkey: string;
    }
  ) {
    const { host, port, channel_name, wallet_name, privkey } = hostProperties;

    // Set the private key to check payments with
    this.setPrivateKey(privkey);
    // Set the txid of the channel
    this.setEventTxData(funding_txid, payment_address);

    // Update chain values
    await this.updateBestBlockHeight();
    await this.updateLatestBlockHeader(this.blockHeight);

    // Convert values
    let channelValSatoshis = BigInt(amount_sat);
    let pushMsat = BigInt(push_msat);
    let pubkeyHex = uint8ArrayToHexString(pubkey);

    // Create the override_config
    let override_config: UserConfig = UserConfig.constructor_default();
    override_config
      .get_channel_handshake_config()
      .set_announced_channel(channelType);

    let channelCreateResponse;
    DEBUG.log("Reached here ready to create channel...", "createChannel");
    try {
      const channelExists = await checkIfChannelExists(pubkeyHex);
      if (!channelExists) {
        const result = await savePeerAndChannelToDatabase(
          amount_sat,
          pubkeyHex,
          host,
          port,
          channel_name,
          wallet_name,
          channelType,
          privkey,
          false, // TODO: this needs to be updated by checking the txid status to confirmed
          payment_address
        );
        if (
          result &&
          result.status === 201 &&
          result.channel_id !== undefined
        ) {
          const userChannelId = BigInt(result.channel_id);
          channelCreateResponse = this.channelManager.create_channel(
            pubkey,
            channelValSatoshis,
            pushMsat,
            userChannelId,
            override_config
          );
        } else {
          throw new Error(
            "Channel couldn't be created error retrieving data from db exists"
          );
        }
      } else {
        throw new Error(
          "Channel already exists with this pubkey - " + pubkeyHex
        );
      }
    } catch (e) {
      if (pubkey.length !== 33) {
        DEBUG.log("Entered incorrect pubkey - ", "createChannel", e);
      } else {
        DEBUG.log(
          `: Lightning node with pubkey ${pubkeyHex} unreachable - `,
          "createChannel",
          e
        );
      }
    }

    // Update blocks for channelManager/chainMonitor
    if (this.blockHeight && this.latestBlockHeader) {
      for (let i = 0; i++; i <= this.blockHeight) {
        await this.updateLatestBlockHeader(i + 1);
        this.channelManager
          .as_Listen()
          .block_connected(this.latestBlockHeader, this.blockHeight);
        this.chainMonitor
          .as_Listen()
          .block_connected(this.latestBlockHeader, this.blockHeight);
      }
    }

    DEBUG.log(
      "Channel Create Response: ",
      "createChannel",
      channelCreateResponse
    );

    // Should return Ok response to display to user
    return true;
  }

  // Forces a channel to close
  forceCloseChannel(pubkey: string): boolean {
    const channels: ChannelDetails[] = this.getChannels();

    DEBUG.log("channels found->", "forceCloseChannel", channels);

    let channelClosed = false;

    for (const chn of channels) {
      const hexId = uint8ArrayToHexString(chn.get_channel_id());
      DEBUG.log("channelId found->", "forceCloseChannel", hexId);

      if (hexId === pubkey) {
        const result: Result_NoneAPIErrorZ =
          this.channelManager.force_close_broadcasting_latest_txn(
            chn.get_channel_id(),
            chn.get_counterparty().get_node_id()
          );

        if (result.is_ok()) {
          channelClosed = true;
          break;
        }
      }
    }

    if (channelClosed) {
      return true;
    } else {
      throw new Error("Trying to close a channel that doesn't exist on LDK");
    }
  }

  // Mutual close a channel
  mutualCloseChannel(pubkey: string): boolean {
    const channels: ChannelDetails[] = this.getChannels();

    DEBUG.log("channels found->", "mutualCloseChannel", channels);

    for (const chn of channels) {
      const hexId = uint8ArrayToHexString(chn.get_channel_id());
      DEBUG.log("channelId found->", "mutualCloseChannel", hexId);
      if (hexId === pubkey) {
        const result: Result_NoneAPIErrorZ = this.channelManager.close_channel(
          chn.get_channel_id(),
          chn.get_counterparty().get_node_id()
        );

        if (result.is_ok()) {
          return true;
        } else {
          return false;
        }
      }
    }

    throw new Error(
      "[LightningClient.ts/mutualCloseChannel]: Trying to close a channel that doesn't exist on LDK"
    );
  }

  async create_socket(peerDetails: PeerDetails): Promise<boolean> {
    // Create Socket for outbound connection: check NodeNet LDK docs for inbound
    const { pubkey, host, port } = peerDetails;
    try {
      await this.netHandler.connect_peer(host, port, pubkey);
    } catch (e) {
      DEBUG.log("Error connecting to peer: ", "create_socket", e);
      throw e;
    }

    let result = await new Promise<boolean>((resolve) => {
      // Wait until the peers are connected and have exchanged the initial handshake
      var timer: any;
      timer = setInterval(() => {
        if (this.peerManager.get_peer_node_ids().length == 1) {
          resolve(true);
          clearInterval(timer);
        }
      }, 1000);
    });
    return result;
  }

  getOurNodeId() {
    return this.channelManager.get_our_node_id();
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

  getUsableChannels() {
    return this.channelManager.list_usable_channels();
  }

  getTxBroadCaster() {
    return this.txBroadcasted;
  }

  listPeers() {
    return this.peerManager.get_peer_node_ids();
  }

  async sync() {
    // sync the client
    return await this.syncClient.sync([
      this.channelManager.as_Confirm(),
      this.chainMonitor.as_Confirm(),
    ]);
  }

  // starts the lightning LDK
  async start() {
    DEBUG.log("Calling ChannelManager's timer_tick_occurred on startup");
    this.channelManager.timer_tick_occurred();

    DEBUG.log("Listening for events");
    this.eventInterval = setInterval(async () => {
      // processes events on ChannelManager and ChainMonitor
      await this.processPendingEvents();
    }, 2000);

    // sync up LDK with chain every 10seconds
    this.syncInterval = setInterval(async () => {
      await this.sync();
    }, 10000);
  }

  async stop() {
    // Clear the intervals that are used to listen for events and sync up the LDK with the chain.
    clearInterval(this.eventInterval);
    clearInterval(this.syncInterval);
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

    // 60 seconds after start prune
  }
}
