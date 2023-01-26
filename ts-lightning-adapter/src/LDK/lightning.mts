import ElectrumClient from "./electrum.mjs";

// import SetUpLDK from "./main-operations/SetUpLDK.mjs";

export default class LightningClient{

    fee_estimator: any; //FeeEstimator
    electrum_client: any; // give this a type later
    logger: any; //Logger
    tx_broadcasted: any;
    tx_broadcaster: any; //BroadcasterInterface
    //step 4
    network: any; // NetworkInterface
    genesisBlock: any;
    genesis_block_hash: any;
    networkGraph: any;// NetworkGraphInterface
    filter: any; // Filter
    // step 5
    persist: any; //Persist
    // step 6

    // LDK function that
    event_handler: any;//EventHandler

    // step 8
    chain_monitor: any; // ChainMonitor interface
    chain_watch: any;

    keys_manager: any; // KeysManager
    keys_interface: any;//KeysInterface

    config: any; //UserConfig
    channelHandshakeConfig: any; //ChannelHandshakeConfig

    params: any; // ChainParameters

    channel_manager: any; // ChannelManager
    peerManager: any; // PeerManager
    txdata: any;
    // array of current peer connections
    currentConnections: Array<any> = [];


    constructor(){
        // Initialise Electrum Client
        this.initElectrum();
        // const SetUpAgent = new SetUpLDK(this);
        // SetUpAgent.setupLDK().then(()=> {
    
        // })
    }
    async initElectrum(){
        console.log('Creating Electrum Client ')
        this.electrum_client = new ElectrumClient("");
    }
}

