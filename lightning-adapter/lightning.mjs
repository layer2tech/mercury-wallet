// const nanoid = import("nanoid");

import ElectrumClient from "./electrum.mjs";
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
  Persister,
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
import { networks, Psbt, payments, Transaction, script } from 'bitcoinjs-lib';

import * as tinysecp from "tiny-secp256k1";

class LightningClient {
  fee_estimator;
  electrum_client;
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
    this.initElectrum();

    this.setupLDK().then(() => {
      //   console.log('Finished setup.');
      //   console.log('Starting LDK...');

      this.startLDK();
    });

    // this.generateFundingTransaction();
  }

  async initElectrum() {
    this.electrum_client = new ElectrumClient("");
  }

  async handleEventCallback(e) {
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

      // await this.addTxData(Buffer.from(final_tx).toString('hex'))
      // console.log('txid data: ', this.txdata)

      // this.chain_monitor.block_connected(this.latest_block_header, this.txdata, this.block_height);
    } catch (e) {
      console.log("error: ", e);
    }
  }

  async setBlockHeight() {
    this.block_height = await this.electrum_client.getBlockHeight();
  }

  async setLatestBlockHeader(height) {
    function hexToBytes(hex) {
      let bytes = [];
      for (let c = 0; c < hex.length; c += 2) {
        bytes.push(parseInt(hex.substr(c, 2), 16));
      }
      return bytes;
    }
    let latest_block_header = await this.electrum_client.getLatestBlockHeader(
      height
    );
    this.latest_block_header = hexToBytes(latest_block_header);
    console.log("latest block header: ", this.latest_block_header);
  }

  async addTxData(txid) {
    let txData = await this.electrum_client.getTxIdData(txid);

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
          "1ea4db8e157e1522405e5849bce768c5b971f3ff9781be6cd26f5a6f1fdf5253",
          "hex"
        ),
        102
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

  async connectToPeer(pubkey, host, port) {
    console.log("found->", pubkey, host, port);

    // store this connection into a dictionary/array of connections
    const newConnection = {
      pubkey,
      host,
      port,
      id: currentConnections.length + 1,
    };
    currentConnections = [...currentConnections, newConnection];

    // connect to the peer then let event handler handle with -> Event_OpenChannelRequest
  }

  async startLDK() {
    this.start();

    const channelManagerA = this.channel_manager;
    await this.setBlockHeight();
    await this.setLatestBlockHeader(this.block_height);

    console.log("Connecting...");
    await this.create_socket();

    let channelValSatoshis = BigInt(1000000);
    let pushMsat = BigInt(400);
    let userChannelId = BigInt(1);

    // PubKey of PolarLightning Regtest Node
    const pubkeyHex =
      "034866ff4ecbf2bbfad90415562e53ef7b73d3f619c0bb33adf0810f6986537a0b";
    const pubkey = new Uint8Array(
      pubkeyHex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
    );

    await this.setBlockHeight();
    await this.setLatestBlockHeader(this.block_height);

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
    } catch(e) {
      if (pubkey.length !== 33) {
        console.log("Entered incorrect pubkey - ", e);
      } else {
        console.log(`Lightning node with pubkey ${pubkeyHex} unreachable - `, e);
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

    console.log('Complete channel list: ',this.channel_manager.list_channels().length);
  }

  list_peers() {
    return this.peerManager.get_peer_node_ids();
  }

  async create_socket() {
    const NodeLDKNet = (await import("./lightning/NodeLDKNet.mjs")).NodeLDKNet;

    
    this.a_net_handler = new NodeLDKNet(this.peerManager);
    var port = 9937;
    
    // 031b9eeb5f23939ed0565f49a1343b26a948a3486ae48e7db5c97ebb2b93fc8c1d@127.0.0.1:9735
    const pubkeyHex =
    "034866ff4ecbf2bbfad90415562e53ef7b73d3f619c0bb33adf0810f6986537a0b";
    const pubkey = new Uint8Array(
      pubkeyHex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
      );
    await this.a_net_handler.connect_peer("127.0.0.1", port, pubkey);
    
    console.log("CONNECTED: ", `${pubkeyHex}@127.0.0.1:${port}`);
      
    // THIS SECTION FOR INBOUND CONNECTIONS:

    // Node key corresponding to all 42
    // const node_a_pk = new Uint8Array([3, 91, 229, 233, 71, 130, 9, 103, 74, 150, 230, 15, 31, 3, 127, 97, 118, 84, 15, 208, 1, 250, 29, 100, 105, 71, 112, 197, 106, 119, 9, 196, 44]);
    // port = 9732
    // for (; port < 11000; port++) {
    //   try {
    //     // Try ports until we find one we can bind to.
    //     // mainly for listening to incoming connections, not what's listed below

    //     // if port doesn't work, 9735 does work
    //     await this.a_net_handler.bind_listener("127.0.0.1", port);

    //     break;
    //   } catch (_) {}
    // }
    // if (port >= 11000) {
    //   throw new Error("No port available for connection");
    // }

    // this.a_net_handler.stop();

    await new Promise((resolve) => {
      // Would be good to add a timeout of 20 seconds or this is an infinite loop if connection unsuccessful
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
    // b_net_handler.stop();
  }

  create_invoice(amtInSats, invoiceExpirysecs, description) {
    let mSats = this.LDK.Option_u64Z.constructor_some(BigInt(amtInSats * 1000));

    let invoice = this.channel_manager.create_inbound_payment(
      mSats,
      invoiceExpirysecs
    );

    let payment_hash = invoice.res.get_a();
    let payment_secret = invoice.res.get_b();

    let encodedInvoice = lightningPayReq.encode({
      satoshis: amtInSats,
      timestamp: Date.now(),
      tags: [
        {
          tagName: "payment_hash",
          data: payment_hash,
        },
        {
          tagName: "payment_secret",
          data: payment_secret,
        },
        {
          tagName: "description",
          data: description,
        },
      ],
    });

    // Hardcoded for now, needs to be changed
    let privateKeyHex =
      "e126f68f7eafcc8b74f54d269fe206be715000f94dac067d1c04a8ca3b2db734";
    let signedInvoice = lightningPayReq.sign(encodedInvoice, privateKeyHex);
    return signedInvoice;
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
  // generateFundingTransaction(){
    // (very) manually create a funding transaction:

    const witness_pos = outputScript.length + 58;
    const funding_tx = new Uint8Array(witness_pos + 7);
    funding_tx[0] = 2; // 4-byte tx version 2
    funding_tx[4] = 0;
    funding_tx[5] = 1; // segwit magic bytes
    funding_tx[6] = 1; // 1-byte input count 1
    // 36 bytes previous outpoint all-0s
    funding_tx[43] = 0; // 1-byte input script length 0
    funding_tx[44] = 0xff;
    funding_tx[45] = 0xff;
    funding_tx[46] = 0xff;
    funding_tx[47] = 0xff; // 4-byte nSequence
    funding_tx[48] = 1; // one output
    // funding_tx[49] = parseInt(channelValue;
    this.assign_u64(funding_tx, 49, channelValue)
    // assign_u64(funding_tx, 49, channelValue);
    funding_tx[57] = outputScript.length; // 1-byte output script length
    console.log('Output Script Length: ',outputScript.length)
    funding_tx.set(outputScript, 58);
    funding_tx[witness_pos] = 1;
    funding_tx[witness_pos + 1] = 1;
    funding_tx[witness_pos + 2] = 0xff; // one witness element of size 1 with contents 0xff
    funding_tx[witness_pos + 3] = 0;
    funding_tx[witness_pos + 4] = 0;
    funding_tx[witness_pos + 5] = 0;
    funding_tx[witness_pos + 6] = 0; // lock time 0

    // Very manually create transaction finished//
    


    // ***** Create transaction using bitcoin js lib *****


    // const ECPair = ECPairFactory(tinysecp);

    // // Private key hardcoded as all 42s
    // // corresponding hex: 035be5e9478209674a96e60f1f037f6176540fd001fa1d64694770c56a7709c42c

    // // create node secret
    // // const nodeSecret = new Uint8Array(32);
    // // for (var i = 0; i < 32; i++) nodeSecret[i] = 42;

    // // // Public Key corresponding to priv key ^^
    // const node_a_pk = new Uint8Array([3, 91, 229, 233, 71, 130, 9, 103, 74, 150, 230, 15, 31, 3, 127, 97, 118, 84, 15, 208, 1, 250, 29, 100, 105, 71, 112, 197,   106, 119, 9, 196, 44]);

    // // Wallet with private key used to create PeerManager
    
    // const bjsWallet = ECPair.fromWIF(Buffer.from(bs58.encode(node_a_pk)).toString('hex'));
    
    // // for randomly creating keypair
    // // let keyPair = ECPair.makeRandom(networks.regtest)

    // // manual keypair creation
    // const keyPair = {
    //   publicKey: Buffer.from(node_a_pk),
    //   privateKey: Buffer.from(nodeSecret)
    // }
    // console.log('Key Pair: ', keyPair);

    // // init transaction builder
    // const txb = new Psbt(networks.regtest);

    // // SegWit input
    // const input = {
    //   hash: '0000000000000000000000000000000000000000000000000000000000000000',
    //   index: 0,
    //   witnessUtxo: {
    //     script: Buffer.from(outputScript, 'hex'),
    //     value: 0
    //   }
    // };

    // // Add input
    // txb.addInput(input);
    // console.log('Added input: ', txb);


    // const redeemScript = payments.p2sh({
    //   redeem: {
    //     output: keyPair.publicKey,
    //     network: networks.regtest
    //   }
    // }).output;

    // const p2sh = payments.p2sh({
    //   redeem: {
    //     network: networks.regtest,
    //     output: redeemScript
    //   }
    // });

    // const output = {
    //   script: p2sh.output,
    //   value: channelValue - 7500
    // };


    // txb.addOutput(output);
    // console.log('Added Output: ', txb);

    // txb.signInput(0, bjsWallet);
    // txb.validateSignaturesOfInput(0);
    // console.log('Input Signed!!');

    // txb.finalizeAllInputs();
    
    // txb.extractTransaction().toBuffer();
    // console.log('Transaction Finalized: ', txb);

    // return txb;

    return funding_tx

  }

  assign_u64(arr, offset, value) {
    arr[offset + 0] = Number((value >> BigInt(8 * 0)) & BigInt(0xff));
    arr[offset + 1] = Number((value >> BigInt(8 * 1)) & BigInt(0xff));
    arr[offset + 2] = Number((value >> BigInt(8 * 2)) & BigInt(0xff));
    arr[offset + 3] = Number((value >> BigInt(8 * 3)) & BigInt(0xff));
    arr[offset + 4] = Number((value >> BigInt(8 * 4)) & BigInt(0xff));
    arr[offset + 5] = Number((value >> BigInt(8 * 5)) & BigInt(0xff));
    arr[offset + 6] = Number((value >> BigInt(8 * 6)) & BigInt(0xff));
    arr[offset + 7] = Number((value >> BigInt(8 * 7)) & BigInt(0xff));
  }
}

export default LightningClient;
