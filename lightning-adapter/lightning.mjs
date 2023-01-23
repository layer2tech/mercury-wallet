// const nanoid = import("nanoid");

import TorClient from "./torClient.mjs";
import * as ldk from "lightningdevkit";
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
import { nanoid } from "nanoid";

import MercuryFeeEstimator from "./lightning/MercuryFeeEstimator.mjs";
import MercuryLogger from "./lightning/MercuryLogger.mjs";
import MercuryPersister from "./lightning/MercuryPersister.mjs";
import MercuryEventHandler from "./lightning/MercuryEventHandler.mjs";
import MercuryFilter from "./lightning/MercuryFilter.mjs";
import MercuryChannelMessageHandler from "./lightning/MercuryChannelMessageHandler.mjs";
import MercuryRoutingMessageHandler from "./lightning/MercuryRoutingMessageHandler.mjs";
import MercuryOnionMessageHandler from "./lightning/MercuryOnionMessageHandler.mjs";
import MercuryCustomMessageHandler from "./lightning/MercuryCustomMessageHandler.mjs";

import * as lightningPayReq from "bolt11";

import { ECPairFactory } from "ecpair";
// import { networks, Psbt,PsbtTxInput, script, crypto, Transaction } from 'bitcoinjs-lib';

import * as tinysecp from "tiny-secp256k1";

class LightningClient {
  fee_estimator;
  tor_client;
  logger;
  tx_broadcasted;
  tx_broadcaster;
  // step 4
  network;
  genesisBlock;
  genesis_block_hash;
  networkGraph;
  // step 5
  persister;
  // step 6
  event_handler;
  // step 8
  chain_monitor;
  chain_watch;

  socketDescriptor;
  socket;
  peerManager;
  txdata;

  LDK;

  // array of current peer connections
  currentConnections = [];

  constructor() {
    this.initTorClient();

    this.setupLDK().then(() => {
      //   console.log('Finished setup.');
      //   console.log('Starting LDK...');

      this.startLDK();
    });
  }

  async initTorClient() {
    this.tor_client = new TorClient("");
  }

  handleEventCallback(e) {
    console.log(">>>>>>> Handling Event here <<<<<<<");
    // if (e instanceof this.LDK.Event.Event_FundingGenerationReady) {
    console.log("Event Funding Generation Ready!!");

    var final_tx = this.generateFundingTransaction(
      e.output_script,
      e.channel_value_satoshis
    );

    console.log("Length Channel ID: ", e.temporary_channel_id);

    try {
      const fundingTx = this.channel_manager.funding_transaction_generated(
        e.temporary_channel_id,
        e.counterparty_node_id,
        final_tx
      );
      console.log("Funding Tx: ", fundingTx);
    } catch (e) {
      console.log("error: ", e);
    }
  }

  async setBlockHeight() {
    this.block_height = await this.tor_client.getBlockHeight();
  }

  async setLatestBlockHeader(height) {
    function hexToBytes(hex) {
      if (hex === undefined) return;
      let bytes = [];
      for (let c = 0; c < hex.length; c += 2) {
        bytes.push(parseInt(hex.substr(c, 2), 16));
      }
      return bytes;
    }
    let latest_block_header = await this.tor_client.getLatestBlockHeader(
      height
    );
    this.latest_block_header = hexToBytes(latest_block_header);
    console.log("latest block header: ", this.latest_block_header);
  }

  async addTxData(txid) {
    let txData = await this.tor_client.getTxIdData(txid);

    this.txdata.push(txData);
  }

  async setupLDK() {
    // const ldk = await import("lightningdevkit");
    const wasm_file = fs.readFileSync(
      "node_modules/lightningdevkit/liblightningjs.wasm"
    );
    await ldk.initializeWasmFromBinary(wasm_file);

    // Step 1
    this.fee_estimator = FeeEstimator.new_impl(new MercuryFeeEstimator());

    // Step 2: logger
    this.logger = Logger.new_impl(new MercuryLogger());

    // Step 3: broadcast interface
    this.tx_broadcasted = new Promise((resolve, reject) => {
      this.tx_broadcaster = BroadcasterInterface.new_impl({
        // Need to call the sendrawtransaction call for the RPC service, loggin this for now to determined when to implement
        broadcast_transaction(tx) {
          console.log("Tx Broadcast: " + tx);
          resolve(tx);
        },
      });
    });

    // Step 4: network graph
    this.network = Network.LDKNetwork_Regtest;

    // Set genesis block as first block used when wallet created
    this.genesisBlock = BestBlock.constructor_from_genesis(this.network);

    this.genesis_block_hash = this.genesisBlock.block_hash();

    this.networkGraph = NetworkGraph.constructor_new(
      this.genesis_block_hash,
      this.logger
    );

    // console.group("network graph");
    // console.log("network:", this.network);
    // console.log("networkGraph:", this.networkGraph);
    // console.groupEnd();

    // Step 5: Persist
    this.persister = Persist.new_impl(new MercuryPersister());

    // Step 6: Initialize the EventHandler
    this.event_handler = EventHandler.new_impl(
      new MercuryEventHandler(
        ((data) => {
          this.handleEventCallback(data);
        }).bind(this)
      )
    );

    // Step 7: Optional: Initialize the transaction filter
    // ------  tx filter: watches for tx on chain
    // ------  tx filter: watches for if output spent on-chain

    this.filter = Filter.new_impl(new MercuryFilter());

    // Step 8: Initialize the ChainMonitor
    this.chain_monitor = ChainMonitor.constructor_new(
      this.filter,
      this.tx_broadcaster,
      this.logger,
      this.fee_estimator,
      this.persister
    );

    this.chain_watch = this.chain_monitor.as_Watch();

    // // Step 9: Initialize the KeysManager
    const ldk_data_dir = "./.ldk/";
    if (!fs.existsSync(ldk_data_dir)) {
      fs.mkdirSync(ldk_data_dir);
    }
    const keys_seed_path = ldk_data_dir + "keys_seed";

    var seed = null;
    // if (!fs.existsSync(keys_seed_path)) {
    //   seed = crypto.randomBytes(32);
    //   fs.writeFileSync(keys_seed_path, seed);
    // } else {
    //   seed = fs.readFileSync(keys_seed_path);
    // }

    seed = nanoid(32);

    console.log("SEED: ", seed);

    this.keys_manager = KeysManager.constructor_new(seed, BigInt(42), 42);
    this.keys_interface = this.keys_manager.as_KeysInterface();

    this.config = UserConfig.constructor_default();

    this.ChannelHandshakeConfig = ChannelHandshakeConfig.constructor_default();

    this.params = ChainParameters.constructor_new(
      Network.LDKNetwork_Regtest,
      BestBlock.constructor_new(
        Buffer.from(
          "0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206",
          "hex"
        ),
        1
      )
    );

    // // Step 10: Read ChannelMonitor from disk
    // const channel_monitor_list = Persister.read_channel_monitors(this.keys_manager);

    // console.log("FEE ESTIMATOR IN CHANNEL MANAGER: ", this.fee_estimator);
    // // Step 11: Initialize the ChannelManager
    this.channel_manager = ChannelManager.constructor_new(
      this.fee_estimator,
      this.chain_watch,
      this.tx_broadcaster,
      this.logger,
      this.keys_interface,
      this.config,
      this.params
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
      this.channel_manager.as_ChannelMessageHandler();
    const customMessageHandler =
      IgnoringMessageHandler.constructor_new().as_CustomMessageHandler();
    const onionMessageHandler =
      IgnoringMessageHandler.constructor_new().as_OnionMessageHandler();

    const nodeSecret = new Uint8Array(32);
    for (var i = 0; i < 32; i++) nodeSecret[i] = 42;

    // const nodeSecret2 = new Uint8Array(32);
    // for (var i = 0; i < 32; i++) nodeSecret2[i] = 43;

    const ephemeralRandomData = new Uint8Array(32);

    this.peerManager = PeerManager.constructor_new(
      channelMessageHandler,
      routingMessageHandler,
      onionMessageHandler,
      nodeSecret,
      Date.now(),
      ephemeralRandomData,
      this.logger,
      customMessageHandler
    );
  }

  async connectToPeer(pubkeyHex, host, port) {
    console.log("found->", pubkeyHex, host, port);

    const pubkey = new Uint8Array(
      pubkeyHex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
    );
    // store this connection into a dictionary/array of connections
    const newConnection = {
      pubkey,
      host,
      port,
      id: this.currentConnections.length + 1,
    };
    this.currentConnections = [...this.currentConnections, newConnection];

    // connect to the peer
    console.log("Connecting...");
    await this.create_socket(newConnection);

    // let event handler handle with -> Event_OpenChannelRequest
  }

  async createChannel(pubkey, amount, push_msat, channelId) {

    const channelManagerA = this.channel_manager;
    await this.setBlockHeight();
    await this.setLatestBlockHeader(this.block_height);

    let channelValSatoshis = BigInt(amount);
    let pushMsat = BigInt(push_msat);
    let userChannelId = BigInt(channelId);

    let channelCreateResponse;
    console.log("Reached here ready to create channel...");
    try {
      channelCreateResponse = channelManagerA.create_channel(
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
        console.log(
          `Lightning node with pubkey ${pubkeyHex} unreachable - `,
          e
        );
      }
    }
    for (let i = 0; i++; i <= this.block_height) {
      await this.setLatestBlockHeader(i + 1);
      this.channel_manager
        .as_Listen()
        .block_connected(this.latest_block_header, this.block_height);
    }

    // this.chain_monitor.block_connected(this.latest_block_header, this.txdata, this.block_height);

    console.log("Channel Create Response: ", channelCreateResponse);

    console.log(
      "Channel List A - Channel ID: ",
      channelManagerA.list_channels()[0].get_channel_id()
    );
    console.log(
      "Channel List A - Funding TXO: ",
      channelManagerA.list_channels()[0].get_funding_txo().get_txid()
    );
  }

  async startLDK() {
    this.start();

  }

  list_peers() {
    return this.peerManager.get_peer_node_ids();
  }

  async create_socket(newConnection) {
    const NodeLDKNet = (await import("./lightning/NodeLDKNet.mjs")).NodeLDKNet;
    const { pubkey, host, port } = newConnection;

    // Node key corresponding to all 42
    // const node_a_pk = new Uint8Array([3, 91, 229, 233, 71, 130, 9, 103, 74, 150, 230, 15, 31, 3, 127, 97, 118, 84, 15, 208, 1, 250, 29, 100, 105, 71, 112, 197, 106, 119, 9, 196, 44]);
    this.a_net_handler = new NodeLDKNet(this.peerManager);

    for (; port < 11000; port++) {
      try {
        // Try ports until we find one we can bind to.
        // mainly for listening to incoming connections, not what's listed below

        // if port doesn't work, 9735 does work
        await this.a_net_handler.connect_peer(host, port, pubkey);
        console.log("CONNECTED");

        break;
      } catch (_) {}
    }
    if (port >= 11000) {
      throw new Error("No port available for connection");
    }

    await new Promise((resolve) => {
      // Wait until the peers are connected and have exchanged the initial handshake
      var timer;
      timer = setInterval(
        function () {
          console.log("Node IDs", this.peerManager.get_peer_node_ids());
          if (this.peerManager.get_peer_node_ids().length == 1) {
            // && this.peerManager2.get_peer_node_ids().length == 1

            console.log("Length is Equal to 1");
            resolve();
            clearInterval(timer);
          }
        }.bind(this),
        500
      );
    });

    // a_net_handler.stop();
    // b_net_handler.stop();
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
    this.channel_manager
      .as_EventsProvider()
      .process_pending_events(this.event_handler);

    this.chain_monitor
      .as_EventsProvider()
      .process_pending_events(this.event_handler);
  }

  generateFundingTransaction(outputScript, channelValue) {
    // (very) manually create a funding transaction
    // const witness_pos = outputScript.length + 58;
    // const funding_tx = new Uint8Array(witness_pos + 7);
    // funding_tx[0] = 2; // 4-byte tx version 2
    // funding_tx[4] = 0;
    // funding_tx[5] = 1; // segwit magic bytes
    // funding_tx[6] = 1; // 1-byte input count 1
    // // 36 bytes previous outpoint all-0s
    // funding_tx[43] = 0; // 1-byte input script length 0
    // funding_tx[44] = 0xff;
    // funding_tx[45] = 0xff;
    // funding_tx[46] = 0xff;
    // funding_tx[47] = 0xff; // 4-byte nSequence
    // funding_tx[48] = 1; // one output
    // // funding_tx[49] = parseInt(channelValue;
    // console.log('Channel Value: ', channelValue)
    // let bigIntValue = BigInt(channelValue);
    // let dataView = new DataView(new ArrayBuffer(8));
    // dataView.setBigInt64(0,bigIntValue);
    // let valueArray = new Uint8Array(dataView.buffer);
    // funding_tx.set(valueArray, 49);
    // // assign_u64(funding_tx, 49, channelValue);
    // funding_tx[57] = outputScript.length; // 1-byte output script length
    // console.log('Output Script Length: ',outputScript.length)
    // funding_tx.set(outputScript, 58);
    // funding_tx[witness_pos] = 1;
    // funding_tx[witness_pos + 1] = 1;
    // funding_tx[witness_pos + 2] = 0xff; // one witness element of size 1 with contents 0xff
    // funding_tx[witness_pos + 3] = 0;
    // funding_tx[witness_pos + 4] = 0;
    // funding_tx[witness_pos + 5] = 0;
    // funding_tx[witness_pos + 6] = 0; // lock time 0

    // let txb = new Psbt(networks.regtest);
    // // let tx = new Transaction();
    // const ECPair = ECPairFactory(tinysecp);

    // const keyPair = ECPair.makeRandom();

    // const input = txb.addInput(new PsbtTxInput());

    // txb.addOutput({
    //   script: Buffer.from(outputScript),
    //   value: parseInt(channelValue)
    // });

    // // const fee = txb.getFee();

    // txb.addOutput({
    //   address: keyPair.address,
    //   value: parseInt(channelValue) - 253
    // })

    // txb.signInput(0, keyPair);

    // txb.finalizeAllInputs();

    // const tx = txb.extractTransaction();

    // const tx = Transaction();

    // tx.version = 2;

    // tx.ins = [{
    //   hash: Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex'),
    // index: 0xffffffff,
    // sequence: 0xffffffff,
    // witness: [Buffer.from([1, 1, 0xff])]
    // }]

    // tx.addInput(Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex'), 0xffffffff, 0xffffffff, Buffer.from([1, 1, 0xff]));

    // console.log('Is Segwit? : ', txb.isSegwit)

    // tx.addOutput(Buffer.from(outputScript), parseInt(channelValue));;
    // let funding_tx = new Uint8Array(tx.toBuffer());

    // let scriptArray = tx.outs[0].script

    // console.log('scriptArray: ', scriptArray);

    // let funding_tx = new Uint8Array(scriptArray);

    // console.log('Funding Array: ', funding_tx);

    // return funding_tx;

    let regtest = networks.regtest;

    let ECPair = ECPairFactory(tinysecp);
    let keyPair = ECPair.makeRandom({
      network: regtest,
    });

    let privateKey = keyPair.toWIF();
    let publicKey = keyPair.getPublicKey();
  }
}

export default LightningClient;
