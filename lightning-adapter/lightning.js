
// const nanoid = import("nanoid");

const fs = require('fs');
// const MercurySocketDescriptor = import("./lightning/MercurySocketDescriptor");

// const { NodeLDKNet } = import("./lightning/NodeLDKNet.ts");

const lightningPayReq = require('bolt11');


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

  LDK;

  constructor() {
    // this.LDK = ldk
    this.setupLDK().then(()=> {
      console.log('Finished setup.')

      console.log('Starting LDK...')
      this.startLDK();
    });
    // this.electrum_client = _electrumClient;
    // console.log(
    //   "Lightning received an electrum_client of which ->",
    //   this.electrum_client
    // );


  }

  async setupLDK(){
    const ldk = await import("lightningdevkit");
    const wasm_file = fs.readFileSync("node_modules/lightningdevkit/liblightningjs.wasm")
    await ldk.initializeWasmFromBinary(wasm_file);

    this.LDK = ldk

    const nanoid = await import("nanoid");
    const MercuryFeeEstimator = (await import("./lightning/MercuryFeeEstimator.mjs")).default;
    const MercuryLogger = (await import("./lightning/MercuryLogger.mjs")).default;
    const MercuryPersister = (await import("./lightning/MercuryPersister.mjs")).default;
    const MercuryChannelMessageHandler = (await import("./lightning/MercuryChannelMessageHandler.mjs")).default;
    const MercuryRoutingMessageHandler = (await import("./lightning/MercuryRoutingMessageHandler.mjs")).default;
    const MercuryOnionMessageHandler = (await import("./lightning/MercuryOnionMessageHandler.mjs")).default;
    const MercuryCustomMessageHandler = (await import("./lightning/MercuryCustomMessageHandler.mjs")).default;
    
    const { ChannelMessageHandler, CustomMessageHandler, OnionMessageHandler, PeerManager, RoutingMessageHandler } = this.LDK;
    console.log('PEER MANAGER: ', PeerManager)

    // Step 1
    this.fee_estimator = this.LDK.FeeEstimator.new_impl( new MercuryFeeEstimator());

    // Step 2: logger
    this.logger = this.LDK.Logger.new_impl(new MercuryLogger());

    // Step 3: broadcast interface
    this.tx_broadcasted = new Promise((resolve, reject) => {
      this.tx_broadcaster = this.LDK.BroadcasterInterface.new_impl({
        // Need to call the sendrawtransaction call for the RPC service, loggin this for now to determined when to implement
        broadcast_transaction(tx) {
          console.log("Tx Broadcast: " + tx);
          resolve(tx);
        },
      });
    });

    // Step 4: network graph
    this.network = this.LDK.Network.LDKNetwork_Regtest;

    this.genesisBlock = this.LDK.BestBlock.constructor_from_genesis(this.network);
    
    this.genesis_block_hash = this.genesisBlock.block_hash();

    this.networkGraph = this.LDK.NetworkGraph.constructor_new(
      this.genesis_block_hash,
      this.logger
    );

    console.group("network graph");
    console.log("network:", this.network);
    console.log("networkGraph:", this.networkGraph);
    console.groupEnd();

    // Step 5: Persist
    this.persister = this.LDK.Persist.new_impl(new MercuryPersister());


    // Step 6: Initialize the EventHandler
    this.event_handler = this.LDK.EventHandler.new_impl({
      handle_event: function (e) {
        console.log(">>>>>>> Handling Event here <<<<<<<", e);
        if (e instanceof this.LDK.Event_FundingGenerationReady) {

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
    this.chain_monitor = this.LDK.ChainMonitor.constructor_new(
      this.LDK.Option_FilterZ.constructor_none(),
      this.tx_broadcaster,
      this.logger,
      this.fee_estimator,
      this.persister
    );

    
    this.chain_watch = this.chain_monitor.as_Watch();

    // // Step 9: Initialize the KeysManager
    const ldk_data_dir = "./.ldk/";
    // // if (!fs.existsSync(ldk_data_dir)) {
    // //   fs.mkdirSync(ldk_data_dir);
    // // }
    const keys_seed_path = ldk_data_dir + "keys_seed";

    var seed = null;
    // // if (!fs.existsSync(keys_seed_path)) {
    // //   seed = crypto.randomBytes(32);
    // //   fs.writeFileSync(keys_seed_path, seed);
    // // } else {
    // //   seed = fs.readFileSync(keys_seed_path);
    // // }

    seed = nanoid.nanoid(32);

    this.keys_manager = this.LDK.KeysManager.constructor_new(seed, BigInt(42), 42);
    this.keys_interface = this.keys_manager.as_KeysInterface();

    this.config = this.LDK.UserConfig.constructor_default();

    this.ChannelHandshakeConfig =
      this.LDK.ChannelHandshakeConfig.constructor_default();

    this.params = this.LDK.ChainParameters.constructor_new(
      this.LDK.Network.LDKNetwork_Regtest,
      this.LDK.BestBlock.constructor_new(
        Buffer.from(
          "000000000000000000054099d5b8e51ab3604a70dfc0d48b23c8e391b076ef1b",
          "hex"
        ),
        764157
      )
    );


    // // Step 10: Read ChannelMonitor from disk
    // const channel_monitor_list = Persister.read_channel_monitors(this.keys_manager);

          

    // // Step 11: Initialize the ChannelManager
    this.channel_manager = this.LDK.ChannelManager.constructor_new(
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

    const routingMessageHandler = ldk.IgnoringMessageHandler.constructor_new().as_RoutingMessageHandler();
    const channelMessageHandler = ldk.ErroringMessageHandler.constructor_new().as_ChannelMessageHandler();
    const customMessageHandler = ldk.IgnoringMessageHandler.constructor_new().as_CustomMessageHandler();
    const onionMessageHandler = ldk.IgnoringMessageHandler.constructor_new().as_OnionMessageHandler();

    const nodeSecret = new Uint8Array(32);
    for (var i = 0; i < 32; i++) nodeSecret[i] = 42;

    const nodeSecret2 = new Uint8Array(32);
    for (var i = 0; i < 32; i++) nodeSecret2[i] = 43;

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

    this.peerManager2 = PeerManager.constructor_new(
      channelMessageHandler,
      routingMessageHandler,
      onionMessageHandler,
      nodeSecret2,
      Date.now(),
      ephemeralRandomData,
      this.logger,
      customMessageHandler
      );

    console.log('Peer Manager: ', this.peerManager);
    console.log('Peer Manager: ', this.peerManager2);

  }


  async startLDK(){

    const { InitFeatures, NetAddress, Option_NetAddressZ, Init } = this.LDK

    // start a lightning node here
    this.start();


    // this.this.create_invoice();

    const channelManagerA = this.channel_manager;

    // console.log('Channel Manager A: ', channelManagerA);
    // All kinds of InitFeature options check set_*_ functions
    console.log('Channel Manager Node ID: ',channelManagerA.get_our_node_id());
    
    const initFeatures = InitFeatures.constructor_empty();
    initFeatures.set_data_loss_protect_required();
    initFeatures.set_initial_routing_sync_optional();
    initFeatures.set_upfront_shutdown_script_required();
    initFeatures.set_gossip_queries_optional();
    initFeatures.set_static_remote_key_optional();

    
    // const byteArray = initFeatures.write();
    const hostname = Uint8Array.from([127, 0, 0 , 1]);

    // const hostname = "0231c73de91ea0851f506745e07c8e89e69ad6e0d2356a4fc8405d2dc16e0d7c19@127.0.0.1"
    
    const netAddress = NetAddress.constructor_ipv4( hostname, 9836)
    
    const optionalAddress = Option_NetAddressZ.constructor_some(netAddress);


    // let nodeIDCalc = "0231c73de91ea0851f506745e07c8e89e69ad6e0d2356a4fc8405d2dc16e0d7c19"
    // nodeIDCalc = nodeIDCalc.match(/.{1,2}/g);
    
    // let nodeID;

    // if(nodeIDCalc){
    //   nodeID = new Uint8Array( nodeIDCalc.map((byte) => parseInt(byte, 16))) ;
    

      
    // channelManagerB
    // .as_ChannelMessageHandler()
    // .peer_connected(
    //   channelManagerA.get_our_node_id(),
    //   Init.constructor_new(initFeatures, optionalAddress)
    //   );
        
    // const channelError = channelManagerA.create_channel(
    //   channelManagerB.get_our_node_id(),
    //   BigInt(0),
    //   BigInt(400),
    //   BigInt(0),
    //   lightningClient2.config
    //   );
          
    await this.create_socket();

    // let nodeID = this.list_peers()[0];

    // if(nodeID instanceof Uint8Array){
    //   const resChanA = channelManagerA
    //   .as_ChannelMessageHandler()
    //   .peer_connected(
    //     nodeID,
    //     Init.constructor_new(initFeatures, this.optionAddress)
    //     );
      
    //   console.log('Connect: ',resChanA)
    // }

    // console.log('NODE ID: ', nodeID);

    // if( nodeID ){
    //   let initial_send = this.peerManager.new_outbound_connection(
    //     nodeID,
    //     this.socketDescriptor,
    //     optionalAddress
    //   )
    //   console.log('Initial Send: ', initial_send);
        
      // this.socket.onmessage = (event: any) => {
      //   console.log("we got something back from the socket");
      //   console.log(event.data);
      //   event.data.arrayBuffer().then((buffer: any) => {
      //     const result = new Uint8Array(buffer);
      //     const event_result = this.peerManager.read_event(this.socketDescriptor, result);
      //     console.log(
      //       "Printing out the results from Result_boolPeerHandleErrorZ below:"
      //     );
      //     console.log(event_result);
      //   });
      // }


      // if(initial_send instanceof Result_CVec_u8ZPeerHandleErrorZ_OK){
      //   const response = this.socketDescriptor.send_data(initial_send.res)

      //   console.log('Response socketDescriptor: ',response);

      // }
      // *** HANDLING ERROR IN CHANNEL CREATION:::::

      // if (chanCreateError.is_ok()) return false;
      // if (!(chanCreateError instanceof Result__u832APIErrorZ_Err)) return false;
      // if (!(chanCreateError instanceof APIError_APIMisuseError)) return false;
      // if (
      //   chanCreateError.err.err !=
      //   "Channel value must be at least 1000 satoshis. It was 0"
      // )
      //   return false;


      let channelValSatoshis = BigInt(1000000);
      let pushMsat = BigInt(400);
      let userChannelId = BigInt(1);

      // console.log('Channel Value Satoshis: ', channelValSatoshis);
      // console.log('Push Msat: ', pushMsat);
      // console.log('User Channel ID: ', userChannelId);

      // console.log('At BigInt 0: ', BigInt(0));



      // console.log('Peer List: ',this.list_peers());


      const channelCreateResponse = channelManagerA.create_channel(
        this.list_peers()[0],
        channelValSatoshis,
        pushMsat,
        userChannelId,
        this.config
      );

      console.log('Channel Create Response: ', channelCreateResponse);

      // if (!chanCreateRes.is_ok()) return false;

      // const events = [];

      // channelManagerA.as_EventsProvider().process_pending_events(this.event_handler);


    // }
  }

  list_peers(){
    return this.peerManager.get_peer_node_ids();
  }

  async create_socket(){
    const NodeLDKNet = (await import("./lightning/NodeLDKNet.mjs")).NodeLDKNet;

    // Node key corresponding to all 42
    const node_a_pk = new Uint8Array([3, 91, 229, 233, 71, 130, 9, 103, 74, 150, 230, 15, 31, 3, 127, 97, 118, 84, 15, 208, 1, 250, 29, 100, 105, 71, 112, 197, 106, 119, 9, 196, 44]);




    this.a_net_handler = new NodeLDKNet(this.peerManager);
    var port = 10000;
    for (; port < 11000; port++) {
      try {
        // Try ports until we find one we can bind to.
        console.log(port)
        this.a_net_handler.bind_listener("127.0.0.1", port)
        break;
      } catch(_) {}
    }
    
    this.b_net_handler = new NodeLDKNet(this.peerManager2);
    await this.b_net_handler.connect_peer("127.0.0.1", port, node_a_pk);

    try {
      // Ensure we get an error if we try to bind the same port twice.
      await this.a_net_handler.bind_listener("127.0.0.1", port);
      console.assert(false);
    } catch(_) {}


  await new Promise(resolve => {
    // Wait until the peers are connected and have exchanged the initial handshake
    var timer
    timer = setInterval(function() {
      console.log()
      console.log('Interval PeerManager',this.peerManager)
      if (this.peerManager.get_peer_node_ids().length == 1 && this.peerManager2.get_peer_node_ids().length == 1) {
        console.log('Length is Equal to 1');
        resolve();
        clearInterval(timer);
      }
    }.bind(this), 500);
  });

  console.log('Listing Peers: ',this.list_peers()[0]);
  console.log('Servers from A Net Handler: ', this.a_net_handler.servers);

  this.optionAddress = NodeLDKNet.get_addr_from_socket(this.a_net_handler.servers[0])
  // this.peerManager2.disconnect_by_node_id(node_a_pk, false);
  // await new Promise(resolve => {
  //   // Wait until A learns the connection is closed from the socket closure
  //   var timer;
  //   timer = setInterval(function() {
  //     if (this.peerManager.get_peer_node_ids().length == 0 && this.peerManager2.get_peer_node_ids().length == 0) {
  //       console.log('Length is Equal to 0');
  //       resolve();
  //       clearInterval(timer);
  //     }
  //   }.bind(this), 500);
  // });

  // a_net_handler.stop();
  // b_net_handler.stop();



  }

  

  create_invoice(amtInSats, invoiceExpirysecs, description) {
    let mSats = this.LDK.Option_u64Z.constructor_some(BigInt(amtInSats*1000));
    
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

    // Hardcoded for now, needs to be changed
    let privateKeyHex = 'e126f68f7eafcc8b74f54d269fe206be715000f94dac067d1c04a8ca3b2db734';
    let signedInvoice = lightningPayReq.sign(encodedInvoice, privateKeyHex);
    return signedInvoice;
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
}


module.exports = LightningClient;