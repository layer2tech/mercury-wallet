// import { Alert } from 'react-native';


import utils from './util';

import * as ldk from 'lightningdevkit';


import { BestBlock, BroadcasterInterface, ChainMonitor, ChainParameters, ChannelConfig, ChannelHandshakeConfig, ChannelHandshakeLimits, ChannelManager, ChannelManagerReadArgs, ChannelMonitor, FeeEstimator, Filter, KeysManager, Logger, MultiThreadedLockableScore, NetworkGraph, Option_FilterZ, PeerManager, Persist, UserConfig, Watch } from 'lightningdevkit';


import * as fs from "fs";
import { strict as assert } from "assert";
import YourFeeEstimator from './init/YourFeeEstimator';
import YourLogger from './init/YourLogger';
import YourBroadcaster from './init/YourBroadcaster';
import YourPersister from './init/YourPersister';
import YourEventHandler from './init/YourEventHandler';
import YourFilter from './init/YourFilter';

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

  /**
   * Fetches from network registered outputs, registered transactions and block tip
   * and feeds this into to native code, if necessary.
   * Should be called periodically.
   */
  
//   async checkBlockchain(progressCallback?: (progress: number) => void) {
//     if (!this.started) throw new Error('LDK not yet started');
//     this.logToGeneralLog('checkBlockchain() 1/x');
//     if (progressCallback) progressCallback(1 / 8);
//     await this.updateBestBlock();

//     this.logToGeneralLog('checkBlockchain() 1.5/x');
//     await this.saveNetworkGraph();
//     if (progressCallback) progressCallback(1.5 / 8);

//     this.logToGeneralLog('checkBlockchain() 2/x');
//     if (progressCallback) progressCallback(2 / 8);
//     await this.updateFeerate();

//     const confirmedBlocks: any = {};

//     // iterating all subscriptions for confirmed txid
//     this.logToGeneralLog('checkBlockchain() 3/x');
//     if (progressCallback) progressCallback(3 / 8);
//     for (const regTx of this.registeredTxs) {
//       let json;
//       try {
//         const response = await fetch('https://blockstream.info/api/tx/' + regTx.txid);
//         json = await response.json();
//       } catch (_) {}
//       if (json && json.status && json.status.confirmed && json.status.block_height) {
//         // success! tx confirmed, and we need to notify LDK about it

//         let jsonPos;
//         try {
//           const responsePos = await fetch('https://blockstream.info/api/tx/' + regTx.txid + '/merkle-proof');
//           jsonPos = await responsePos.json();
//         } catch (_) {}

//         if (jsonPos && jsonPos.merkle) {
//           confirmedBlocks[json.status.block_height + ''] = confirmedBlocks[json.status.block_height + ''] || {};
//           const responseHex = await fetch('https://blockstream.info/api/tx/' + regTx.txid + '/hex');
//           confirmedBlocks[json.status.block_height + ''][jsonPos.pos + ''] = await responseHex.text();
//         }
//       }
//     }

//     // iterating all scripts for spends
//     this.logToGeneralLog('checkBlockchain() 4/x');
//     if (progressCallback) progressCallback(4 / 8);
//     for (const regOut of this.registeredOutputs) {
//       let txs: any[] = [];
//       try {
//         const address = await this.script2address(regOut.script_pubkey);
//         const response = await fetch('https://blockstream.info/api/address/' + address + '/txs');
//         txs = await response.json();
//       } catch (_) {}
//       for (const tx of txs) {
//         if (tx && tx.status && tx.status.confirmed && tx.status.block_height) {
//           // got confirmed tx for that output!

//           let jsonPos;
//           try {
//             const responsePos = await fetch('https://blockstream.info/api/tx/' + tx.txid + '/merkle-proof');
//             jsonPos = await responsePos.json();
//           } catch (_) {}

//           if (jsonPos && jsonPos.merkle) {
//             const responseHex = await fetch('https://blockstream.info/api/tx/' + tx.txid + '/hex');
//             confirmedBlocks[tx.status.block_height + ''] = confirmedBlocks[tx.status.block_height + ''] || {};
//             confirmedBlocks[tx.status.block_height + ''][jsonPos.pos + ''] = await responseHex.text();
//           }
//         }
//       }
//     }

//     // now, got all data packed in `confirmedBlocks[block_number][tx_position]`
//     // lets feed it to LDK:

//     this.logToGeneralLog('confirmedBlocks=', confirmedBlocks);

//     this.logToGeneralLog('checkBlockchain() 5/x');
//     if (progressCallback) progressCallback(5 / 8);
//     for (const height of Object.keys(confirmedBlocks).sort((a, b) => parseInt(a, 10) - parseInt(b, 10))) {
//       for (const pos of Object.keys(confirmedBlocks[height]).sort((a, b) => parseInt(a, 10) - parseInt(b, 10))) {
//         await RnLdkNative.transactionConfirmed(await this.getHeaderHexByHeight(parseInt(height, 10)), parseInt(height, 10), parseInt(pos, 10), confirmedBlocks[height][pos]);
//       }
//     }

//     this.logToGeneralLog('checkBlockchain() 6/x');
//     if (progressCallback) progressCallback(6 / 8);
//     let txidArr = [];
//     try {
//       const jsonString = await RnLdkNative.getRelevantTxids();
//       this.logToGeneralLog('RnLdkNative.getRelevantTxids:', jsonString);
//       txidArr = JSON.parse(jsonString);
//     } catch (error: any) {
//       this.logToGeneralLog('getRelevantTxids:', error.message);
//       console.warn('getRelevantTxids:', error.message);
//     }

//     // we need to check if any of txidArr got unconfirmed, and then feed it back to LDK if they are unconf
//     this.logToGeneralLog('checkBlockchain() 7/x');
//     if (progressCallback) progressCallback(7 / 8);
//     for (const txid of txidArr) {
//       let confirmed = false;
//       try {
//         const response = await fetch('https://blockstream.info/api/tx/' + txid + '/merkle-proof');
//         const tx: any = await response.json();
//         if (tx && tx.block_height) confirmed = true;
//       } catch (_) {
//         confirmed = false;
//       }

//       if (!confirmed) await RnLdkNative.transactionUnconfirmed(txid);
//     }

//     this.logToGeneralLog('checkBlockchain() done');
//     if (progressCallback) progressCallback(8 / 8);

//     return true;
//   }

  /**
   * Starts the process of opening a channel
   * @param pubkey Remote noed pubkey
   * @param sat Channel value
   *
   * @returns string|false Either address to deposit sats to or false if smth went wrong
   */
//   async openChannelStep1(pubkey: string, sat: number): Promise<string | false> {
//     if (!this.started) throw new Error('LDK not yet started');
//     this.logToGeneralLog(`opening channel with ${pubkey} for ${sat} sat`);
//     this.fundingsReady = []; // reset it
//     const tempChannelId: string = await RnLdkNative.openChannelStep1(pubkey, sat);
//     if (!tempChannelId) return false;
//     let timer = 60;
//     while (timer-- > 0) {
//       await new Promise((resolve) => setTimeout(resolve, 500)); // sleep
//       if (this.fundingsReady.length > 0) {
//         const funding = this.fundingsReady.pop();
//         if (funding) {
//           return await this.script2address(funding.output_script);
//         }
//         break;
//       }

//       // what if our temp channel closed while we wait for the funding generation event? lets check it:
//       for (const closed of this.channelsClosed) {
//         if (42 === +closed.user_channel_id || closed.channel_id === tempChannelId) {
//           this.logToGeneralLog('channel closed while waiting for FundingGenerationReady event');
//           return false;
//         }
//       }
//     }

//     this.logToGeneralLog('timeout waiting for FundingGenerationReady event');
//     return false;
//   }

  /**
   * Finishes opening channel starter in `openChannelStep1()`. Once you created a transaction to address
   * generated by `openChannelStep1()` with the amount you specified, feed txhex to this method to
   * finalize opening a channel.
   *
   * @param txhex
   *
   * @returns boolean Success or not
   */
//   async openChannelStep2(txhex: string) {
//     if (!this.started) throw new Error('LDK not yet started');
//     console.warn('submitting to ldk', { txhex });
//     this.logToGeneralLog('submitting to ldk', { txhex });
//     return RnLdkNative.openChannelStep2(txhex);
//   }

//   async closeChannelCooperatively(channelIdHex: string) {
//     if (!this.started) throw new Error('LDK not yet started');
//     this.logToGeneralLog(`closing channel cooperatively, channel id: ${channelIdHex}`);
//     return RnLdkNative.closeChannelCooperatively(channelIdHex);
//   }

//   async closeChannelForce(channelIdHex: string) {
//     if (!this.started) throw new Error('LDK not yet started');
//     this.logToGeneralLog(`force-closing channel, channel id: ${channelIdHex}`);
//     return RnLdkNative.closeChannelForce(channelIdHex);
//   }

  /**
   * @returns node pubkey
   */
//   async getNodeId(): Promise<string> {
//     if (!this.started) throw new Error('LDK not yet started');
//     this.logToGeneralLog('getting node id');
//     return RnLdkNative.getNodeId();
//   }

//   /**
//    * @returns Array<{}>
//    */
//   async listUsableChannels() {
//     if (!this.started) throw new Error('LDK not yet started');
//     this.logToGeneralLog('listing usable channels');
//     const str = await RnLdkNative.listUsableChannels();
//     return JSON.parse(str);
//   }

//   /**
//    * @returns Array<{}>
//    */
//   async listChannels() {
//     if (!this.started) throw new Error('LDK not yet started');
//     this.logToGeneralLog('listing channels');
//     const str = await RnLdkNative.listChannels();
//     return JSON.parse(str);
//   }

//   async getMaturingBalance() {
//     return RnLdkNative.getMaturingBalance();
//   }

//   async getMaturingHeight() {
//     return RnLdkNative.getMaturingHeight();
//   }

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

//   private async updateFeerate() {
//     this.logToGeneralLog('updating feerate');
//     try {
//       const response = await fetch('https://blockstream.info/api/fee-estimates');
//       const json = await response.json();

//       const blockFast = '2'; // indexes in json object
//       const blockMedium = '6';
//       const blockSlow = '144';

//       if (json[blockFast] && json[blockMedium] && json[blockSlow]) {
//         const feerateFast = Math.round(json[blockFast]);
//         const feerateMedium = Math.round(json[blockMedium]);
//         const feerateSlow = Math.round(json[blockSlow]);
//         await this.setFeerate(Math.max(feerateFast, 2), Math.max(feerateMedium, 2), Math.max(feerateSlow, 2));
//       } else {
//         throw new Error('Invalid feerate data:' + JSON.stringify(json));
//       }
//     } catch (error) {
//       console.warn('updateFeerate() failed:', error);
//       this.logToGeneralLog('updateFeerate() failed:', error);
//     }
//   }

//   private async updateBestBlock() {
//     this.logToGeneralLog('updating best block');
//     const height = await this.getCurrentHeight();
//     const response2 = await fetch('https://blockstream.info/api/block-height/' + height);
//     const hash = await response2.text();
//     const response3 = await fetch('https://blockstream.info/api/block/' + hash + '/header');
//     const headerHex = await response3.text();
//     console.log('updateBestBlock():', { headerHex, height });
//     this.logToGeneralLog('updateBestBlock():', { headerHex, height });
//     return RnLdkNative.updateBestBlock(headerHex, height);
//   }

//   getVersion(): Promise<number> {
//     this.logToGeneralLog('getting version');
//     return RnLdkNative.getVersion();
//   }

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


  async start(entropyHex: string, writablePath: string = ''): Promise<boolean> {
    if (!this.storage) throw new Error('Storage is not yet set');
    if (this.started) throw new Error('LDK already started');
    this.logToGeneralLog('LDK starting...');
    this.started = true;
    const keys4monitors = (await this.getAllKeys()).filter((key: string) => key.startsWith(RnLdkImplementation.CHANNEL_PREFIX));
    const monitorHexes = [];
    this.logToGeneralLog('keys4monitors=', keys4monitors);
    for (const key of keys4monitors) {
      const hex = await this.getItem(key);
      if (hex) monitorHexes.push(hex);
    }

    const response = await fetch('https://blockstream.info/api/blocks/tip/height');
    const blockchainTipHeight = parseInt(await response.text(), 10);
    const response2 = await fetch('https://blockstream.info/api/block-height/' + blockchainTipHeight);
    const blockchainTipHashHex = await response2.text();

    const serializedChannelManagerHex = (await this.getItem(RnLdkImplementation.CHANNEL_MANAGER_PREFIX)) || '';
    this.logToGeneralLog('starting with', { blockchainTipHeight, blockchainTipHashHex, serializedChannelManagerHex, monitorHexes: monitorHexes.join(',') });
    
    // RnLdkNative.start(entropyHex, blockchainTipHeight, blockchainTipHashHex, serializedChannelManagerHex, monitorHexes.join(','), writablePath);
    
    let networkGraphPath

    if(writablePath !== ""){
        networkGraphPath = writablePath + "/network_graph.bin";
    }

    // INITIALIZE THE FEEESTIMATOR #################################################################
    // What it's used for: estimating fees for on-chain transactions that LDK wants broadcasted.
    const fee_estimator = FeeEstimator.new_impl(new YourFeeEstimator());

    // INITIALIZE THE LOGGER #######################################################################
    // What it's used for: LDK logging
    const logger = Logger.new_impl(new YourLogger());

    // INITIALIZE THE BROADCASTERINTERFACE #########################################################
    // What it's used for: broadcasting various lightning transactions
    const tx_broadcaster = BroadcasterInterface.new_impl(new YourBroadcaster())

    // INITIALIZE PERSIST ##########################################################################
    // What it's used for: persisting crucial channel data in a timely manner
    const persister = Persist.new_impl(new YourPersister);

    // now, initializing channel manager persister that is responsoble for backing up channel_manager bytes

    const channel_manager_persister = new YourEventHandler();
    // FILL THIS IN -- Struggle converting to JS version of handleEvent

    // INITIALIZE THE CHAINMONITOR #################################################################
    // What it's used for: monitoring the chain for lighting transactions that are relevant to our
    // node, and broadcasting force close transactions if need be

    // Filter allows LDK to let you know what transactions you should filter blocks for. This is
    // useful if you pre-filter blocks or use compact filters. Otherwise, LDK will need full blocks.

    const tx_filter: Filter = Filter.new_impl(new YourFilter());

    const filter = Option_FilterZ.constructor_some(tx_filter);
    // console.log("ReactNativeLDK: version " + ldk.get_ldk_java_bindings_version() + ", " + org.ldk.impl.bindings.get_ldk_c_bindings_version() + ", " + org.ldk.impl.bindings.get_ldk_version())
    chain_monitor = ChainMonitor.constructor_new(filter, tx_broadcaster, logger, fee_estimator, persister);

    // INITIALIZE THE KEYSMANAGER ##################################################################
    // What it's used for: providing keys for signing lightning transactions
    keys_manager = KeysManager.constructor_new(hexToBytes(entropyHex), BigInt(Date.now()/ 1000), Date.now() * 1000)

    // READ CHANNELMONITOR STATE FROM DISK #########################################################

    // Initialize the hashmap where we'll store the `ChannelMonitor`s read from disk.
    // This hashmap will later be given to the `ChannelManager` on initialization.

    var channelMonitors: Array<Uint8Array>
    
    if( monitorHexes.length !== 0 ) {
      console.log(`LDK: using network graph path: ${networkGraphPath}`)
      // let channel_monitor_list: Array<Uint8Array>;
      monitorHexes.forEach(item => {
        const channel_monitor_bytes = hexToBytes(item);
        channelMonitors.push(channel_monitor_bytes)
      })

    }


    // initialize graph sync #########################################################################

    // if(networkGraphPath !== ""){
    //   console.log(`LDK: using network graph path ${networkGraphPath}`);
    //   const f = File(networkGraphPath)

    // }



    // INITIALIZE THE CHANNELMANAGER ###############################################################
    // What it's used for: managing channel state

    const uc = UserConfig.constructor_default();
    const newChannelConfig = ChannelConfig.constructor_default();
    newChannelConfig.set_forwarding_fee_proportional_millionths(10000);
    newChannelConfig.set_forwarding_fee_base_msat(1000);
    // newChannelConfig.set_announced_channel(false) // New channels are private not available for TS

    const handshake = ChannelHandshakeConfig.constructor_default();
    handshake.set_minimum_depth(1);
    uc.set_channel_handshake_config(handshake);
    // ^^ above different from uc.set_own_channel_config(handshake)

    uc.set_channel_config(newChannelConfig);
    const newLim = ChannelHandshakeLimits.constructor_default();
    newLim.set_force_announced_channel_preference(true);

    uc.set_channel_handshake_limits(newLim);


    try{

      if(serializedChannelManagerHex !== ""){
        //loading from disk - Restarting channel manager

        // let channel_manager_file = fs.readFileSync(`${serializedChannelManagerHex}/manager`)

        // channel_manager_constructor = ChannelM
        // CHANNEL MANAGER CONSTRUCTOR NOT AVAILABLE ON TS


      } else{
        // Fresh Channel Manager
        let best_blockhash = hexToBytes(blockchainTipHashHex);
        let best_chain_height = blockchainTipHeight;
        
        let chain_params = ChainParameters.constructor_new(1, BestBlock.constructor_new(best_blockhash, best_chain_height));
        // let watch_channel = new Watch(chain_monitor.list_monitors()[0], chain_monitor)

        // let fresh_channel_manager = ChannelManager.constructor_new(
        //     fee_estimator, 
        //     tx_broadcaster,
        //     logger,
        //     keys_manager,
        //     uc,
        //     chain_params
        //   )

        // channel_manager_constructor = ChannelManager
        // ChannelM

      }
      Promise.resolve("hello ldk");

    } catch(e: any){
      console.error("LDK: can't start", e.message);
      Promise.reject(e.message);
    }



    return true
  }

  /**
   * In native code, purges in-memory network graph to file on disk
   */
//   async saveNetworkGraph() {
//     return RnLdkNative.saveNetworkGraph();
//   }

  /**
   * Tries to pay an invoice using our internal pathfinding, given that we enabled
   * graph sync on startup
   *
   * @param bolt11 Invoice string
   * @param amtSat Amount in sats in case it's a zero-amount invoice
   */
//   async payInvoice(bolt11: string, amtSat: number): Promise<boolean> {
//     return RnLdkNative.payInvoice(bolt11, amtSat);
//   }

  /**
   * Connects to other lightning node
   *
   * @param pubkeyHex Other node pubkey
   * @param hostname Other node ip
   * @param port Other node port
   *
   * @return boolean success or not
   */
//   connectPeer(pubkeyHex: string, hostname: string, port: number): Promise<boolean> {
//     if (!this.started) throw new Error('LDK not yet started');
//     this.logToGeneralLog(`connecting to peer ${pubkeyHex}@${hostname}:${port}`);
//     return RnLdkNative.connectPeer(pubkeyHex, hostname, port);
//   }

//   disconnectByNodeId(pubkeyHex: string): Promise<boolean> {
//     if (!this.started) throw new Error('LDK not yet started');
//     this.logToGeneralLog(`disconnecting peer ${pubkeyHex}`);
//     return RnLdkNative.disconnectByNodeId(pubkeyHex);
//   }

  /**
   * Returns list of other lightning nodes we are connected to
   *
   * @returns array
   */
//   async listPeers(): Promise<string[]> {
//     if (!this.started) throw new Error('LDK not yet started');
//     this.logToGeneralLog(`listing peers`);
//     const jsonString = await RnLdkNative.listPeers();
//     try {
//       return JSON.parse(jsonString);
//     } catch (error: any) {
//       this.logToGeneralLog(error.message);
//       console.warn(error.message);
//     }

//     return [];
//   }

  /**
   * Asks native code to emit test log event, which is supposed to land in this.logs
   */
  fireAnEvent(){
    dispatchEvent(MARKER_LOG, 'Test Event')
  }

  /**
   * Prodives LKD current feerate to use with all onchain transactions (like sweeps after forse-closures)
   *
   * @param newFeerateFast {number} Sat/b
   * @param newFeerateMedium {number} Sat/b
   * @param newFeerateSlow {number} Sat/b
   */
//   setFeerate(newFeerateFast: number, newFeerateMedium: number, newFeerateSlow: number): Promise<boolean> {
//     this.logToGeneralLog('setting feerate', { newFeerateFast, newFeerateMedium, newFeerateSlow });
//     return RnLdkNative.setFeerate(newFeerateFast * 250, newFeerateMedium * 250, newFeerateSlow * 250);
//   }

//   setRefundAddressScript(refundAddressScriptHex: string) {
//     this.logToGeneralLog(`setting refund script hex to ${refundAddressScriptHex}`);
//     return RnLdkNative.setRefundAddressScript(refundAddressScriptHex);
//   }

  /**
   * Method to set storage that will handle persistance. Should conform to the spec
   * (have methods setItem, getItem & getAllKeys)
   *
   * @param storage object
   */
//   setStorage(storage: any) {
//     if (!storage.setItem || !storage.getItem || !storage.getAllKeys) throw new Error('Bad provided storage');
//     this.storage = storage;
//   }

//   getStorage() {
//     return this.storage;
//   }

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

//   async addInvoice(amtMsat: number, description: string = '') {
//     if (!this.started) throw new Error('LDK not yet started');
//     this.logToGeneralLog(`adding invoice for ${amtMsat} msat, decription=${description}`);
//     return RnLdkNative.addInvoice(amtMsat, description);
//   }

//   async stop() {
//     this.logToGeneralLog(`stopping LDK`);
//     await RnLdkNative.stop();
//     this.started = false;
//   }

  private async decodeInvoice(bolt11: string): Promise<any> {
    if (this.injectedDecodeInvoice) {
      return this.injectedDecodeInvoice(bolt11);
    }
  
    const response = await fetch('https://lambda-decode-bolt11.herokuapp.com/decode/' + bolt11);
    return await response.json();
  }

  /**
   * Tries to pay an invoice using 3rd party server for routefinding
   *
   * @param bolt11 Invoice string
   * @param numSatoshis Amount in sats in case it's a zero-amount invoice
   */
//   async sendPayment(bolt11: string, numSatoshis: number = 666): Promise<boolean> {
//     if (!this.started) throw new Error('LDK not yet started');
//     this.logToGeneralLog('sendPayment():', { bolt11, numSatoshis });
//     await this.updateBestBlock();
//     const usableChannels = await this.listUsableChannels();
//     // const usableChannels = await this.listChannels(); // FIXME debug only
//     if (usableChannels.length === 0) throw new Error('No usable channels');

//     const decoded = await this.decodeInvoice(bolt11);
//     if (isNaN(parseInt(decoded.millisatoshis, 10))) {
//       decoded.millisatoshis = numSatoshis * 1000; // free amount invoice
//     }
//     let payment_hash = '';
//     let min_final_cltv_expiry = 144;
//     let payment_secret = '';
//     let shortChannelId = '';
//     let weAreGonaRouteThrough = '';

//     for (const tag of decoded.tags) {
//       if (tag.tagName === 'payment_hash') payment_hash = tag.data;
//       if (tag.tagName === 'min_final_cltv_expiry') min_final_cltv_expiry = parseInt(tag.data, 10);
//       if (tag.tagName === 'payment_secret') payment_secret = tag.data;
//       if (tag.tagName === 'min_final_cltv_expiry') min_final_cltv_expiry = parseInt(tag.data, 10);
//     }

//     if (!payment_hash) throw new Error('No payment_hash');
//     if (!payment_secret) throw new Error('No payment_secret');

//     for (const channel of usableChannels) {
//       if (parseInt(channel.outbound_capacity_msat, 10) >= parseInt(decoded.millisatoshis, 10)) {
//         if (channel.remote_node_id === decoded.payeeNodeKey) {
//           // we are paying to our direct neighbor
//           return RnLdkNative.sendPayment(decoded.payeeNodeKey, payment_hash, payment_secret, channel.short_channel_id, parseInt(decoded.millisatoshis, 10), min_final_cltv_expiry, '');
//         }

//         shortChannelId = channel.short_channel_id;
//         weAreGonaRouteThrough = channel.remote_node_id;
//         break;
//       }
//     }

//     if (shortChannelId === '') throw new Error('No usable channel with enough outbound capacity');

//     // otherwise lets plot a route from our neighbor we are going to pay through to destination
//     // using public queryroute api

//     const from = weAreGonaRouteThrough;
//     const to = decoded.payeeNodeKey;

//     let jsonRoutes;
//     let hopFees;
//     let url = '';
//     try {
//       const amtSat = Math.round(parseInt(decoded.millisatoshis, 10) / 1000);
//       url = `http://lndhub.herokuapp.com/queryroutes/${from}/${to}/${amtSat}`;
//       this.logToGeneralLog('querying route via', url);
//       let responseRoute = await fetch(url);
//       jsonRoutes = await responseRoute.json();
//       if (jsonRoutes && jsonRoutes.routes && jsonRoutes.routes[0] && jsonRoutes.routes[0].hops) {
//         for (let hop of jsonRoutes.routes[0].hops) {
//           const url2 = `https://lndhub.herokuapp.com/getchaninfo/${hop.chan_id}`;
//           hopFees = await (await fetch(url2)).json();
//           this.logToGeneralLog('hopFees=', hopFees, { url2 });
//           break;
//           // breaking because we assume that outgoing chan for our routing node gona have the same fee policy
//           // as our own channel with this routing node
//         }
//       } else throw new Error('Could not find route');
//     } catch (_) {
//       throw new Error('Could not find route');
//     }

//     const ldkRoute = utils.lndRoutetoLdkRoute(jsonRoutes, hopFees, shortChannelId, min_final_cltv_expiry);

//     this.logToGeneralLog('got route:', JSON.stringify(jsonRoutes, null, 2));
//     this.logToGeneralLog('got LDK route:', JSON.stringify(ldkRoute, null, 2));

//     return RnLdkNative.sendPayment(
//       decoded.payeeNodeKey /* not really needed in this scenario */,
//       payment_hash,
//       payment_secret,
//       shortChannelId /* not really needed in this scenario */,
//       parseInt(decoded.millisatoshis, 10),
//       min_final_cltv_expiry /* not really needed in this scenario */,
//       JSON.stringify(ldkRoute, null, 2)
//     );
//   }

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
