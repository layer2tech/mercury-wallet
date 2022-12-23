import * as ldk from "lightningdevkit";
import MercuryFeeEstimator from "./lightning/MercuryFeeEstimator";
import MercuryLogger from "./lightning/MercuryLogger";
import MercuryPersister from "./lightning/MercuryPersister";

console.log("initialize the wasm from fetch...");
console.log("ldk", ldk);

await ldk.initializeWasmWebFetch("liblightningjs.wasm");
import { nanoid } from "nanoid";
import { ChannelMessageHandler, CustomMessageHandler, OnionMessageHandler, Option_u64Z, PeerManager, RoutingMessageHandler, SocketDescriptor, TwoTuple_PaymentHashPaymentSecretZ } from "lightningdevkit";
import MercurySocketDescriptor from "./lightning/MercurySocketDescriptor";
import MercuryChannelMessageHandler from "./lightning/MercuryChannelMessageHandler";
import MercuryRoutingMessageHandler from "./lightning/MercuryRoutingMessageHandler";
import MercuryOnionMessageHandler from "./lightning/MercuryOnionMessageHandler";
import MercuryCustomMessageHandler from "./lightning/MercuryCustomMessageHandler";

const lightningPayReq = require('bolt11')

export class LightningClient {
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

  constructor(_electrumClient) {
    this.electrum_client = _electrumClient;

    console.log(
      "Lightning received an electrum_client of which ->",
      this.electrum_client
    );

    // Step 1: fee estimator
    this.fee_estimator = ldk.FeeEstimator.new_impl(new MercuryFeeEstimator());
    
    // Step 2: logger
    this.logger = ldk.Logger.new_impl(new MercuryLogger());

    // Step 3: broadcast interface
    this.tx_broadcasted = new Promise((resolve, reject) => {
      this.tx_broadcaster = ldk.BroadcasterInterface.new_impl({
        // Need to call the sendrawtransaction call for the RPC service, loggin this for now to determined when to implement
        broadcast_transaction(tx) {
          console.log("Tx Broadcast: " + tx);
          resolve(tx);
        },
      });
    });

    // Step 4: network graph
    this.network = ldk.Network.LDKNetwork_Regtest;

    this.genesisBlock = ldk.BestBlock.constructor_from_genesis(this.network);
    
    this.genesis_block_hash = this.genesisBlock.block_hash();

    this.networkGraph = ldk.NetworkGraph.constructor_new(
      this.genesis_block_hash,
      this.logger
    );

    console.group("network graph");
    console.log("network:", this.network);
    console.log("networkGraph:", this.networkGraph);
    console.groupEnd();

    // Step 5: Persist
    this.persister = ldk.Persist.new_impl(new MercuryPersister());


    // Step 6: Initialize the EventHandler
    this.event_handler = ldk.EventHandler.new_impl({
      handle_event: function (e) {
        console.log(">>>>>>> Handling Event here <<<<<<<", e);
        if (e instanceof ldk.Event_FundingGenerationReady) {

          console.log('LDK FUNDING GENERATION READY BABY')
          //console.log(e)
          var final_tx = 0;
          console.log(e.temporary_channel_id, e.counterparty_node_id, final_tx);
          //channel_manager.funding_transaction_generated(e.temporary_channel_id, e.counterparty_node_id, final_tx);
          // <insert code to handle this event>
        } else if (e instanceof Event.Event_PaymentReceived) {
          // Handle successful payment
          const event = e;
          assert(event.payment_preimage instanceof Option.payment_preimage);
          const payment_preimage = event.payment_preimage;
          assert(channel_manager.claim_funds(payment_preimage));
          // <insert code to handle this event>
        } else if (e instanceof Event.Event_PaymentSent) {
          // <insert code to handle this event>
        } else if (e instanceof Event.Event_PaymentPathFailed) {
          // <insert code to handle this event>
        } else if (e instanceof Event.Event_PendingHTLCsForwardable) {
          // <insert code to handle this event>
        } else if (e instanceof Event.Event_SpendableOutputs) {
          // <insert code to handle this event>
        } else if (e instanceof Event.Event_PaymentForwarded) {
          // <insert code to handle this event>
        } else if (e instanceof Event.Event_ChannelClosed) {
          // <insert code to handle this event>
        }
      },
    });


    // Step 7: Optional: Initialize the transaction filter

    // Step 8: Initialize the ChainMonitor
    this.chain_monitor = ldk.ChainMonitor.constructor_new(
      ldk.Option_FilterZ.constructor_none(),
      this.tx_broadcaster,
      this.logger,
      this.fee_estimator,
      this.persister
    );

    
    this.chain_watch = this.chain_monitor.as_Watch();

    // Step 9: Initialize the KeysManager
    const ldk_data_dir = "./.ldk/";
    // if (!fs.existsSync(ldk_data_dir)) {
    //   fs.mkdirSync(ldk_data_dir);
    // }
    // const keys_seed_path = ldk_data_dir + "keys_seed";

    var seed = null;
    // if (!fs.existsSync(keys_seed_path)) {
    //   seed = crypto.randomBytes(32);
    //   fs.writeFileSync(keys_seed_path, seed);
    // } else {
    //   seed = fs.readFileSync(keys_seed_path);
    // }

    seed = nanoid(32);

    this.keys_manager = ldk.KeysManager.constructor_new(seed, BigInt(42), 42);
    this.keys_interface = this.keys_manager.as_KeysInterface();

    this.config = ldk.UserConfig.constructor_default();

    this.ChannelHandshakeConfig =
      ldk.ChannelHandshakeConfig.constructor_default();

    this.params = ldk.ChainParameters.constructor_new(
      ldk.Network.LDKNetwork_Regtest,
      ldk.BestBlock.constructor_new(
        Buffer.from(
          "000000000000000000054099d5b8e51ab3604a70dfc0d48b23c8e391b076ef1b",
          "hex"
        ),
        764157
      )
    );


    // Step 10: Read ChannelMonitor from disk
    // const channel_monitor_list = Persister.read_channel_monitors(this.keys_manager);

          

    // Step 11: Initialize the ChannelManager
    this.channel_manager = ldk.ChannelManager.constructor_new(
      this.fee_estimator,
      this.chain_watch,
      this.tx_broadcaster,
      this.logger,
      this.keys_interface,
      this.config,
      this.params
    );
    
    
    const channelMessageHandler = ChannelMessageHandler.new_impl(
      new MercuryChannelMessageHandler()
    );

    const routingMessageHandler = RoutingMessageHandler.new_impl(
      new MercuryRoutingMessageHandler()
    );

    const onionMessageHandler = OnionMessageHandler.new_impl(
      new MercuryOnionMessageHandler()
    );


    const customMessageHandler = CustomMessageHandler.new_impl(
      new MercuryCustomMessageHandler()
    );

    const nodeSecret = new Uint8Array(32);

    const ephemeralRandomData = new Uint8Array(32);

    this.peerManager = PeerManager.constructor_new(
      channelMessageHandler,
      routingMessageHandler,
      onionMessageHandler,
      nodeSecret.fill(4, 1, 3),
      Date.now(),
      ephemeralRandomData,
      this.logger,
      customMessageHandler
      );
    

  }

  create_socket(){

    // this.socket = new URL('http://127.0.0.1:8080/proxy');
    this.socket = new WebSocket('ws://127.0.0.1:8080');

    console.log('This.Soket; ', this.socket)

    this.socket.onopen = () => {
      console.log('Connected to the server!');
    };

    this.socket.onerror = (error) => {
      console.error(`Error: ${error.message}`);
    };

    const socketDescriptor = SocketDescriptor.new_impl(
      new MercurySocketDescriptor(this.socket)
    )

    this.socketDescriptor = socketDescriptor;

    // this.socket = new Socket.server({port: 8080});

    // this.socket.on('connection', function(ws) {
    //   console.log('Connected to the server!');

    // });

    // this.socket.on('error', function(err){
    //   console.error(`Error: ${err.message}`);

    // });

    // this.socket.listen(8080, function(){
    //   console.log('server listening')
    // })

    // const socketDescriptor = SocketDescriptor.new_impl(
    //   new MercurySocketDescriptor(this.socket)
    // )

    // this.socketDescriptor = socketDescriptor;
  }

  create_invoice() {
    const number = BigInt(2000);
    let first = Option_u64Z.constructor_some(number);
    
    let invoice = this.channel_manager.create_inbound_payment(
      first,
      Date.now()
    );

    let payment_hash = invoice.res.get_a();
    let payment_secret = invoice.res.get_b();

    // If you need it in words
    // let decode =  bech32.decode(sce_address)
    // SCEAddress = Buffer.from(bech32.fromWords(decode.words)).toString('hex')


    // let invoice = this.channel_manager.

  }

  // starts the lightning LDK
  start() {
    setInterval(() => {
      //peer_manager.timer_tick_occurred();
      //peer_manager.process_events();
      this.channel_manager
        .as_EventsProvider()
        .process_pending_events(this.event_handler);
      this.chain_monitor
        .as_EventsProvider()
        .process_pending_events(this.event_handler);
    }, 2000);
  }

  create_invoice(amtInSats, invoiceExpirysecs, description) {
    let mSats = Option_u64Z.constructor_some(BigInt(amtInSats*1000));
    
    let invoice = this.channel_manager.create_inbound_payment(
      mSats,
      invoiceExpirysecs,
    );

    let payment_hash = invoice.res.get_a();
    let payment_secret = invoice.res.get_b();

    let encodedInvoice = lightningPayReq.encode({
      "satoshis": amtInSats,
      "timestamp": Date.now(),
      "tags": [
        {
          "tagName": "payment_hash",
          "data": payment_hash
        },
        {
          "tagName": "payment_secret",
          "data": payment_secret
        },
        {
          "tagName": "description",
          "data": description
        }
      ]
    });

    let privateKeyHex = 'e126f68f7eafcc8b74f54d269fe206be715000f94dac067d1c04a8ca3b2db734';
    let signedInvoice = lightningPayReq.sign(encodedInvoice, privateKeyHex);
    return signedInvoice;
  }
}
