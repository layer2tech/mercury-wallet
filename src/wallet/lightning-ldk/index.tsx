// import { Alert } from 'react-native';


import utils from './util';

// import * as ldk from 'lightningdevkit';


import ldk,{ BestBlock, 
  BroadcasterInterface,
  ChainMonitor,
  ChainParameters, 
  ChannelConfig, 
  ChannelHandshakeConfig, 
  ChannelHandshakeLimits, 
  ChannelManager, 
  FeeEstimator, 
  Filter, 
  KeysManager, 
  Logger, 
  MultiThreadedLockableScore, 
  NetworkGraph, 
  Option_FilterZ, 
  PeerManager, 
  Persist, 
  UserConfig 
} from 'lightningdevkit';


import * as fs from "fs";
import { strict as assert } from "assert";
import YourFeeEstimator from './init/YourFeeEstimator';
import YourLogger from './init/YourLogger';
import YourBroadcaster from './init/YourBroadcaster';
import YourPersister from './init/YourPersister';
// import YourEventHandler from './init/YourEventHandler';
// import YourFilter from './init/YourFilter';

import { 
  RegisterOutputMsg,
  RegisterTxMsg,
  FundingGenerationReadyMsg,
  PaymentFailedMsg,
  PaymentReceivedMsg,
  PaymentPathFailedMsg,
  PaymentSentMsg,
  LogMsg,
  PersistMsg,
  PersistManagerMsg,
  BroadcastMsg,
  MARKER_BROADCAST,
  MARKER_REGISTER_TX,
  MARKER_REGISTER_OUTPUT,
  MARKER_LOG
} from './const';
import { dispatchEvent, hexToBytes } from './init/utils';

const wasm_file = fs.readFileSync("../../node_modules/lightningdevkit/liblightningjs.wasm")
ldk.initializeWasmFromBinary(wasm_file);

const pckg = require('../../package.json');



type ClosureReason = 'ProcessingError' | 'OutdatedChannelManager' | 'HolderForceClosed' | 'DisconnectedPeer' | 'CounterpartyForceClosed' | 'CooperativeClosure' | 'CommitmentTxConfirmed';
export const MARKER_CHANNEL_CLOSED = 'channel_closed';
interface ChannelClosedMsg {
  reason: ClosureReason;
  channel_id: string;
  user_channel_id: number;
  text?: string;
}
// 
export var feerate_fast = 7500; // estimate fee rate in BTC/kB
export var feerate_medium = 7500; // estimate fee rate in BTC/kB
export var feerate_slow = 7500; // estimate fee rate in BTC/kB

export var refund_address_script = "76a91419129d53e6319baf19dba059bead166df90ab8f588ac";

// export var nio_peer_handler: NioPeerHandler | null = null;
export var channel_manager: ChannelManager | null = null;

export var peer_manager: PeerManager | null = null;
export var chain_monitor: ChainMonitor | null = null;
export var temporary_channel_id: Uint8Array | null = null;
export var keys_manager: KeysManager | null = null;

// export var channel_manager_constructor: ChannelManagerConstructor | null = null;

export var router: NetworkGraph | null = null; // optional, used only in graph sync; if null - no sync
export var scorer: MultiThreadedLockableScore | null = null; // optional, used only in graph sync; if null - no sync

export var networkGraphPath = "";



class RnLdkImplementation {
  static CHANNEL_MANAGER_PREFIX = 'channel_manager';
  static CHANNEL_PREFIX = 'channel_monitor_';

  private storage: any = false;
  private registeredOutputs: RegisterOutputMsg[] = [];
  private registeredTxs: RegisterTxMsg[] = [];
  private fundingsReady: FundingGenerationReadyMsg[] = [];

  sentPayments: PaymentSentMsg[] = [];
  receivedPayments: PaymentReceivedMsg[] = [];
  failedPayments: PaymentFailedMsg[] = [];
  failedPathPayments: PaymentPathFailedMsg[] = [];
  channelsClosed: ChannelClosedMsg[] = [];
  logs: LogMsg[] = [];


  private started = false;

  private injectedScript2address: ((scriptHex: string) => Promise<string>) | null = null;
  private injectedDecodeInvoice: ((bolt11: string) => Promise<object>) | null = null;

  provideScript2addressFunc(func: (scriptHex: string) => Promise<string>) {
    this.injectedScript2address = func;
  }

  provideDecodeInvoiceFunc(func: (bolt11: string) => Promise<object>) {
    this.injectedDecodeInvoice = func;
  }

  /**
   * Called by native code when LDK successfully sent payment.
   * Should not be called directly.
   *
   * @param event
   */
  _paymentSent(event: PaymentSentMsg) {
    // TODO: figure out what to do with it
    console.warn('payment sent:', event);
    this.logToGeneralLog('payment sent:', event);
    this.sentPayments.push(event);
  }

  /**
   * Called by native code when LDK received payment
   * Should not be called directly.
   *
   * @param event
   */
  _paymentReceived(event: PaymentReceivedMsg) {
    // TODO: figure out what to do with it
    console.warn('payment received:', event);
    this.logToGeneralLog('payment received:', event);
    this.receivedPayments.push(event);
  }

  /**
   * Called by native code when LDK failed to send payment.
   * Should not be called directly.
   *
   * @param event
   */
  _paymentFailed(event: PaymentFailedMsg) {
    // TODO: figure out what to do with it
    console.warn('payment failed:', event);
    this.logToGeneralLog('payment failed:', event);
    this.failedPayments.push(event);
  }

  /**
   * Called by native code when LDK failed to send payment _to_a_path_.
   * Should not be called directly.
   *
   * @param event
   */
  _paymentPathFailed(event: PaymentPathFailedMsg) {
    // TODO: figure out what to do with it
    console.warn('payment path failed:', event);
    this.logToGeneralLog('payment path failed:', event);
    this.failedPathPayments.push(event);
  }

  /**
   * Caled by native code when LDK passes log message.
   * Should not be called directly.
   *
   * @param event
   */
  _log(event: LogMsg) {
    console.log('ldk log:', event);
    if (!event.ts) event.ts = new Date().toISOString().replace('T', ' ');
    this.logs.push(event);
  }

  logToGeneralLog(...args: any[]) {
    const str = JSON.stringify(args);
    console.log('js log:', str);
    const msg: LogMsg = {
      ts: new Date().toISOString().replace('T', ' '),
      line: str,
    };

    this.logs.push(msg);
  }

  /**
   * Called when native code sends us an output we should keep an eye on
   * and notify native code if there is some movement there.
   * Should not be called directly.
   *
   * @param event
   */
  _registerOutput(event: RegisterOutputMsg) {
    this.logToGeneralLog('registerOutput', event);
    this.registeredOutputs.push(event);
  }

  /**
   * Called when native code sends us a transaction we should keep an eye on
   * and notify native code if there is some movement there.
   * Should not be called directly.
   *
   * @param event
   */
  _registerTx(event: RegisterTxMsg) {
    event.txid = this.reverseTxid(event.txid); // achtung, little-endian
    this.logToGeneralLog('registerTx', event);
    this.registeredTxs.push(event);
  }

  _fundingGenerationReady(event: FundingGenerationReadyMsg) {
    this.logToGeneralLog('funding generation ready:', event);
    this.fundingsReady.push(event);
  }

  _channelClosed(event: ChannelClosedMsg) {
    this.logToGeneralLog('channel closed:', event);
    this.channelsClosed.push(event);
  }

  /**
   * Called when native code sends us channel-specific backup data bytes we should
   * save to persistent storage.
   * Should not be called directly.
   *
   * @param event
   */

  
  async _persist(event: PersistMsg) {
    return this.setItem(RnLdkImplementation.CHANNEL_PREFIX + event.id, event.data);
  }

  _persistManager(event: PersistManagerMsg) {
    return this.setItem(RnLdkImplementation.CHANNEL_MANAGER_PREFIX, event.channel_manager_bytes);
  }

  /**
   * Called when native code wants us to broadcast some transaction.
   * Should not be called directly.
   *
   * @param event
   */
  async _broadcast(event: BroadcastMsg) {
    this.logToGeneralLog('broadcasting', event);
    const response = await fetch('https://blockstream.info/api/tx', {
      method: 'POST',
      body: event.txhex,
    });

    return await response.text();
  }

  private reverseTxid(hex: string): string {
    if (hex.length % 2 !== 0) throw new Error('incorrect hex ' + hex);
    const matched = hex.match(/[a-fA-F0-9]{2}/g);
    if (matched) {
      return matched.reverse().join('');
    }
    return '';
  }

  private async script2address(scriptHex: string): Promise<string> {
    if (this.injectedScript2address) {
      return await this.injectedScript2address(scriptHex);
    }

    const response = await fetch('https://runkit.io/overtorment/output-script-to-address/branches/master/' + scriptHex);
    return response.text();
  }



  private async getHeaderHexByHeight(height: number) {
    const response2 = await fetch('https://blockstream.info/api/block-height/' + height);
    const hash = await response2.text();
    const response3 = await fetch('https://blockstream.info/api/block/' + hash + '/header');
    return response3.text();
  }

  private async getCurrentHeight() {
    const response = await fetch('https://blockstream.info/api/blocks/tip/height');
    return parseInt(await response.text(), 10);
  }


  getPackageVersion(): string {
    return pckg.version;
  }

  /**
   * Spins up the node. Should be called before anything else.
   * Assumes storage is provided.
   *
   * @param entropyHex 256 bit entropy, basically a private key for a node, e.g. 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
   * @param writablePath A local fs dir that's writable and persists - network graph shall be stored there. If default value is used - then no graph sync will be attempted
   *
   * @returns boolean TRUE if all went well
   */


  // async start(entropyHex: string, writablePath: string = ''): Promise<boolean> {
  //   if (!this.storage) throw new Error('Storage is not yet set');
  //   if (this.started) throw new Error('LDK already started');
  //   this.logToGeneralLog('LDK starting...');
  //   this.started = true;
  //   const keys4monitors = (await this.getAllKeys()).filter((key: string) => key.startsWith(RnLdkImplementation.CHANNEL_PREFIX));
  //   const monitorHexes = [];
  //   this.logToGeneralLog('keys4monitors=', keys4monitors);
  //   for (const key of keys4monitors) {
  //     const hex = await this.getItem(key);
  //     if (hex) monitorHexes.push(hex);
  //   }

  //   const response = await fetch('https://blockstream.info/api/blocks/tip/height');
  //   const blockchainTipHeight = parseInt(await response.text(), 10);
  //   const response2 = await fetch('https://blockstream.info/api/block-height/' + blockchainTipHeight);
  //   const blockchainTipHashHex = await response2.text();

  //   const serializedChannelManagerHex = (await this.getItem(RnLdkImplementation.CHANNEL_MANAGER_PREFIX)) || '';
  //   this.logToGeneralLog('starting with', { blockchainTipHeight, blockchainTipHashHex, serializedChannelManagerHex, monitorHexes: monitorHexes.join(',') });
    
  //   // RnLdkNative.start(entropyHex, blockchainTipHeight, blockchainTipHashHex, serializedChannelManagerHex, monitorHexes.join(','), writablePath);
    
  //   let networkGraphPath

  //   if(writablePath !== ""){
  //       networkGraphPath = writablePath + "/network_graph.bin";
  //   }

  //   // INITIALIZE THE FEEESTIMATOR #################################################################
  //   // What it's used for: estimating fees for on-chain transactions that LDK wants broadcasted.
  //   const fee_estimator = FeeEstimator.new_impl(new YourFeeEstimator());

  //   // INITIALIZE THE LOGGER #######################################################################
  //   // What it's used for: LDK logging
  //   const logger = Logger.new_impl(new YourLogger());

  //   // INITIALIZE THE BROADCASTERINTERFACE #########################################################
  //   // What it's used for: broadcasting various lightning transactions
  //   const tx_broadcaster = BroadcasterInterface.new_impl(new YourBroadcaster())

  //   // INITIALIZE PERSIST ##########################################################################
  //   // What it's used for: persisting crucial channel data in a timely manner
  //   const persister = Persist.new_impl(new YourPersister);

  //   // now, initializing channel manager persister that is responsoble for backing up channel_manager bytes

  //   const channel_manager_persister = new YourEventHandler();
  //   // FILL THIS IN -- Struggle converting to JS version of handleEvent

  //   // INITIALIZE THE CHAINMONITOR #################################################################
  //   // What it's used for: monitoring the chain for lighting transactions that are relevant to our
  //   // node, and broadcasting force close transactions if need be

  //   // Filter allows LDK to let you know what transactions you should filter blocks for. This is
  //   // useful if you pre-filter blocks or use compact filters. Otherwise, LDK will need full blocks.

  //   const tx_filter: Filter = Filter.new_impl(new YourFilter());

  //   const filter = Option_FilterZ.constructor_some(tx_filter);
  //   // console.log("ReactNativeLDK: version " + ldk.get_ldk_java_bindings_version() + ", " + org.ldk.impl.bindings.get_ldk_c_bindings_version() + ", " + org.ldk.impl.bindings.get_ldk_version())
  //   chain_monitor = ChainMonitor.constructor_new(filter, tx_broadcaster, logger, fee_estimator, persister);

  //   // INITIALIZE THE KEYSMANAGER ##################################################################
  //   // What it's used for: providing keys for signing lightning transactions
  //   keys_manager = KeysManager.constructor_new(hexToBytes(entropyHex), BigInt(Date.now()/ 1000), Date.now() * 1000)

  //   // READ CHANNELMONITOR STATE FROM DISK #########################################################

  //   // Initialize the hashmap where we'll store the `ChannelMonitor`s read from disk.
  //   // This hashmap will later be given to the `ChannelManager` on initialization.

  //   var channelMonitors: Array<Uint8Array>
    
  //   if( monitorHexes.length !== 0 ) {
  //     console.log(`LDK: using network graph path: ${networkGraphPath}`)
  //     // let channel_monitor_list: Array<Uint8Array>;
  //     monitorHexes.forEach(item => {
  //       const channel_monitor_bytes = hexToBytes(item);
  //       channelMonitors.push(channel_monitor_bytes)
  //     })

  //   }


  //   // initialize graph sync #########################################################################

  //   // if(networkGraphPath !== ""){
  //   //   console.log(`LDK: using network graph path ${networkGraphPath}`);
  //   //   const f = File(networkGraphPath)

  //   // }



  //   // INITIALIZE THE CHANNELMANAGER ###############################################################
  //   // What it's used for: managing channel state

  //   const uc = UserConfig.constructor_default();
  //   const newChannelConfig = ChannelConfig.constructor_default();
  //   newChannelConfig.set_forwarding_fee_proportional_millionths(10000);
  //   newChannelConfig.set_forwarding_fee_base_msat(1000);
  //   // newChannelConfig.set_announced_channel(false) // New channels are private not available for TS

  //   const handshake = ChannelHandshakeConfig.constructor_default();
  //   handshake.set_minimum_depth(1);
  //   uc.set_channel_handshake_config(handshake);
  //   // ^^ above different from uc.set_own_channel_config(handshake)

  //   uc.set_channel_config(newChannelConfig);
  //   const newLim = ChannelHandshakeLimits.constructor_default();
  //   newLim.set_force_announced_channel_preference(true);

  //   uc.set_channel_handshake_limits(newLim);


  //   try{

  //     if(serializedChannelManagerHex !== ""){
  //       //loading from disk - Restarting channel manager

  //       // let channel_manager_file = fs.readFileSync(`${serializedChannelManagerHex}/manager`)

  //       // channel_manager_constructor = ChannelM
  //       // CHANNEL MANAGER CONSTRUCTOR NOT AVAILABLE ON TS


  //     } else{
  //       // Fresh Channel Manager
  //       let best_blockhash = hexToBytes(blockchainTipHashHex);
  //       let best_chain_height = blockchainTipHeight;
        
  //       let chain_params = ChainParameters.constructor_new(1, BestBlock.constructor_new(best_blockhash, best_chain_height));
  //       // let watch_channel = new Watch(chain_monitor.list_monitors()[0], chain_monitor)

  //       // let fresh_channel_manager = ChannelManager.constructor_new(
  //       //     fee_estimator, 
  //       //     tx_broadcaster,
  //       //     logger,
  //       //     keys_manager,
  //       //     uc,
  //       //     chain_params
  //       //   )

  //       // channel_manager_constructor = ChannelManager
  //       // ChannelM

  //     }
  //     Promise.resolve("hello ldk");

  //   } catch(e: any){
  //     console.error("LDK: can't start", e.message);
  //     Promise.reject(e.message);
  //   }



  //   return true
  // }



  /**
   * Asks native code to emit test log event, which is supposed to land in this.logs
   */
  fireAnEvent(){
    dispatchEvent(MARKER_LOG, 'Test Event')
  }


  /**
   * Wrapper for provided storage
   *
   * @param key
   * @param value
   */
  async setItem(key: string, value: string) {
    if (!this.storage) throw new Error('No storage');
    this.logToGeneralLog(`persisting ${key}`);
    console.log('::::::::::::::::: saving to disk', key, '=', value);
    return this.storage.setItem(key, value);
  }

  /**
   * Wrapper for provided storage
   *
   * @param key
   */
  async getItem(key: string) {
    if (!this.storage) throw new Error('No storage');
    this.logToGeneralLog(`reading from storage ${key}`);
    console.log('::::::::::::::::: reading from disk', key);
    const ret = await this.storage.getItem(key);
    console.log('::::::::::::::::: --------------->>', JSON.stringify(ret));
    return ret;
  }

  /**
   * Wrapper for provided storage
   *
   * @returns string[]
   */
  async getAllKeys() {
    if (!this.storage) throw new Error('No storage');
    return this.storage.getAllKeys();
  }



  private async decodeInvoice(bolt11: string): Promise<any> {
    if (this.injectedDecodeInvoice) {
      return this.injectedDecodeInvoice(bolt11);
    }
  
    const response = await fetch('https://lambda-decode-bolt11.herokuapp.com/decode/' + bolt11);
    return await response.json();
  }


  static assertEquals(a: any, b: any) {
    if (a !== b) throw new Error('RnLdk: Assertion failed that ' + a + ' equals ' + b);
  }

  /**
   * self test function that is supposed to run in RN runtime to verify everything is set up correctly
   */
  async selftest(skipTestEvents = false){
    const decoded = await this.decodeInvoice(
      'lnbc2220n1psvm6rhpp53pxqkcq4j9hxjy5vtsll0rhykqzyjch2gkvlfv5mfdsyul5rnk5sdqqcqzpgsp5qwfm205gklcnf5jqnvpdl22p48adr4hkpscxedrltr7yc29tfv7s9qyyssqeff7chcx08ndxl3he8vgmy7up3z8drd7j0xn758gwkjyfk6ncqesa4hj36r26q68jfpvj0555fr77hhvhtczhh0h9rahdhgtcpj2fpgplfsqg0'
    );
    RnLdkImplementation.assertEquals(decoded.millisatoshis, '222000');
    RnLdkImplementation.assertEquals(decoded.payeeNodeKey, '02e89ca9e8da72b33d896bae51d20e7e6675aa971f7557500b6591b15429e717f1');
    let payment_hash = '';
    let min_final_cltv_expiry = 0;
    let payment_secret = '';
    for (const tag of decoded.tags) {
      if (tag.tagName === 'payment_hash') payment_hash = tag.data;
      if (tag.tagName === 'min_final_cltv_expiry') min_final_cltv_expiry = parseInt(tag.data, 10);
      if (tag.tagName === 'payment_secret') payment_secret = tag.data;
      if (tag.tagName === 'min_final_cltv_expiry') min_final_cltv_expiry = parseInt(tag.data, 10);
    }
    RnLdkImplementation.assertEquals(payment_hash, '884c0b6015916e69128c5c3ff78ee4b0044962ea4599f4b29b4b604e7e839da9');
    RnLdkImplementation.assertEquals(payment_secret, '0393b53e88b7f134d2409b02dfa941a9fad1d6f60c306cb47f58fc4c28ab4b3d');
    RnLdkImplementation.assertEquals(min_final_cltv_expiry, 40);

    //

    RnLdkImplementation.assertEquals(await this.script2address('0020ff3eee58d5a55baa44dc10862ebd50bc16e4aade5501a0339c5c20c64478dc0f'), 'bc1qlulwukx454d653xuzzrza02shstwf2k725q6qvuutssvv3rcms8sarxvad');
    RnLdkImplementation.assertEquals(await this.script2address('00143ada446d4196f67e4a83a9168dd751f9c69c2f94'), 'bc1q8tdygm2pjmm8uj5r4ytgm463l8rfctu5d50yyu');

    //
    if (skipTestEvents) return true;

    this.logs = [];
    RnLdk.fireAnEvent();
    await new Promise((resolve) => setTimeout(resolve, 200)); // sleep
    if (!this.logs.find((el) => el.line === 'test')) throw new Error('Cant find test log event: ' + JSON.stringify(RnLdk.logs));

    return true;
  }

//   getLogs() {
//     return this.logs;
//   }

//   cleanLogs() {
//     this.logs = [];
//   }
}

const RnLdk = new RnLdkImplementation();

// event type LogMsg throws err
window.addEventListener(MARKER_LOG, (event: any) => {
  RnLdk._log(event);
});

// event  type RegisterOutputMsg throws err
// window.addEventListener(MARKER_REGISTER_OUTPUT, (event: any) => {
//     RnLdk._registerOutput(event);
// })


// event type RegisterTxMsg throw err

window.addEventListener(MARKER_REGISTER_TX, (event: any) => {
  RnLdk._registerTx(event);
});

// event type BroadcastMsg throws err
window.addEventListener(MARKER_BROADCAST, (event: any) => {
  RnLdk._broadcast(event).then(console.log);
});

// const channelPersisterTimeouts: any = {};

// event type PersistMsg throws err
// window.addEventListener(MARKER_PERSIST, async (event: any) => {
//   // dumb way to dedup bulk updates:
//   if (channelPersisterTimeouts[event.id]) {
//     console.log('deduping channel monitor persist events');
//     clearTimeout(channelPersisterTimeouts[event.id]);
//   }
//   channelPersisterTimeouts[event.id] = setTimeout(async () => {
//     channelPersisterTimeouts[event.id] = null;
//     try {
//       if (!event.id || !event.data) throw new Error('Unexpected data passed for persister: ' + JSON.stringify(event));
//       await RnLdk._persist(event);
//     } catch (error: any) {
//       console.error(error.message);
//     //   Alert.alert('persister: ' + error.message);
//     }
//   }, 1000);
// });

// let managerPersisterTimeout: NodeJS.Timeout | null;
// //event type PersistManagerMsg throws err
// window.addEventListener(MARKER_PERSIST_MANAGER, async (event: any) => {
//   // dumb way to dedup bulk updates:
//   if (managerPersisterTimeout) {
//     console.log('deduping channel manager persist events');
//     clearTimeout(managerPersisterTimeout);
//   }
//   managerPersisterTimeout = setTimeout(async () => {
//     managerPersisterTimeout = null;
//     try {
//       if (!event.channel_manager_bytes) throw new Error('Unexpected data passed for manager persister: ' + JSON.stringify(event));
//       await RnLdk._persistManager(event);
//     } catch (error: any) {
//       console.error(error.message);
//     //   Alert.alert('manager persister: ' + error.message);
//     }
//   }, 1000);
// });

// // event type PaymentFailedMsg throws err
// window.addEventListener(MARKER_PAYMENT_FAILED, (event: any) => {
//   RnLdk._paymentFailed(event);
// });

// // event type PaymentPathFailedMsg throws err
// window.addEventListener(MARKER_PAYMENT_PATH_FAILED, (event: any) => {
//   RnLdk._paymentPathFailed(event);
// });

// // event type PaymentReceivedMsg throws err
// window.addEventListener(MARKER_PAYMENT_RECEIVED, (event: any) => {
//   RnLdk._paymentReceived(event);
// });

// // event type PaymentSentMsg throws err
// window.addEventListener(MARKER_PAYMENT_SENT, (event: any) => {
//     RnLdk._paymentSent(event);
// });

// // event type FundingGenerationReadyMsg throws err
// window.addEventListener(MARKER_FUNDING_GENERATION_READY, (event: any) => {
//     RnLdk._fundingGenerationReady(event);
// });

// // event type ChannelClosedMsg throws err
// window.addEventListener(MARKER_CHANNEL_CLOSED, (event: any) => {
//   RnLdk._channelClosed(event);
// });

export default RnLdkImplementation;
