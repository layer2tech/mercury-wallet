import { ElectrumTxData } from '../wallet/electrum';
import {Mutex} from 'async-mutex'
let bitcoin = require('bitcoinjs-lib')
const axios = require('axios').default;
export const mutex = new Mutex();
const log = window.require('electron-log');

class ElectrsClientError extends Error {
  constructor(message: string){
    super(message);
    this.name = "ElectrsClientError";
  }
}

// Check if returned value from server is an error. Throw if so.
const checkForServerError = (return_val: any) => {
  if (typeof(return_val)==="string" && ( return_val.includes("Error") ||return_val.includes("error") )) {
    throw Error(return_val)
  }
}

export const GET_ROUTE = {
  PING: "/electrs/ping",
  //latestBlockHeader "/Electrs/block/:hash/header",
  BLOCK: "/electrs/block",
  BLOCKS_TIP_HASH: "/electrs/blocks/tip/hash",
  HEADER: "header",
  BLOCKS_TIP_HEIGHT: "/electrs/blocks/tip/height",
  //getTransaction /tx/:txid
  TX: "/electrs/tx",
  //getScriptHashListUnspent /scripthash/:hash/utxo
  SCRIPTHASH: "/electrs/scripthash",
  UTXO: "utxo",
  //getFeeEstimates
  FEE_ESTIMATES: "/electrs/fee-estimates",
};
Object.freeze(GET_ROUTE);

export const POST_ROUTE = {
  //broadcast transaction
  TX: "/electrs/tx",
};
Object.freeze(POST_ROUTE);


export class ElectrsClient {
  endpoint: string
  is_tor: boolean
  scriptIntervals: Map<string,any>
  scriptStatus: Map<string,any>
  blockHeightLatest: any
  
  constructor(endpoint: string, is_tor = true){
    this.endpoint = endpoint
    this.is_tor = is_tor
    this.scriptIntervals = new Map()
    this.scriptStatus = new Map()
    this.blockHeightLatest = 0
  }

  async new_tor_id() {
    if (this.is_tor) {
      await ElectrsClient.get(this.endpoint,'newid', {});
    }
  };

  static async get (endpoint: string, path: string, params: any){
    try {
      const url = endpoint + "/" + (path + (Object.entries(params).length === 0 ? "" : "/" + params)).replace(/^\/+/, '');
      const config = {
          method: 'get',
          url: url,
          headers: { 'Accept': 'application/json' }
      };
      let res = await axios(config)
      let return_data = res.data
      checkForServerError(return_data)

      return return_data

    } catch (err : any) {
      throw err;
    }
  }

  static async post (endpoint: string, path: string, body: any) {
    try {
      let url = endpoint + "/" + path.replace(/^\/+/, '');
      const config = {
          method: 'post',
          url: url,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          data: body,
      };
      let res = await axios(config)
      let return_data = res.data
      checkForServerError(return_data)

      return return_data

    } catch (err : any) {
      throw err;
    }
  };

  async isClosed(): Promise<boolean>{
    let ping = await this.ping();
    let result = ping == false
    return result
  }

  // convert BTC address scipt to electrum script has
  static scriptToScriptHash(script: string) {
    let script_hash = bitcoin.crypto.sha256(script).toString("hex"); // hash
    return script_hash.match(/[a-fA-F0-9]{2}/g).join(''); // reverse  
  }

  async connect() {
  }

  async ping(): Promise<boolean> {
    try {
      await ElectrsClient.get(this.endpoint,GET_ROUTE.BLOCKS_TIP_HEIGHT, {})
      return true
    } catch(err){
      return false
    }
  }

  // Get header of the latest mined block.
  async latestBlockHeader(): Promise<number> {
     let latesthash = await ElectrsClient.get(this.endpoint,GET_ROUTE.BLOCKS_TIP_HASH, {})
     let header = await ElectrsClient.get(this.endpoint,`${GET_ROUTE.BLOCK}/${latesthash}/${GET_ROUTE.HEADER}`, {})
     let info = await ElectrsClient.get(this.endpoint,`${GET_ROUTE.BLOCK}/${latesthash}`, {})
     info.header = header
     return info
  }

  async getTransaction(txHash: string): Promise<any> {
    let result = await ElectrsClient.get(this.endpoint,`${GET_ROUTE.TX}/${txHash}`, {})
    return result
  }

  async getScriptHashListUnspent(script: string): Promise<any> {
    let scriptHash = ElectrsClient.scriptToScriptHash(script)
    let data: Array<any> = await ElectrsClient.get(this.endpoint,`${GET_ROUTE.SCRIPTHASH}/${scriptHash}/${GET_ROUTE.UTXO}`, {})
    let result = new Array<ElectrumTxData>()

    data.forEach((item, index) => {
      result.push({"tx_hash":item.txid, 
                    "tx_pos":item.vout, 
                    "value":item.value,
                    "height":item.status.block_height})
    })
    return result
  }

  async getScriptHashStatus(scriptHash: string, callBack: any, endpoint: string) {
    let status = await ElectrsClient.get(endpoint,`${GET_ROUTE.SCRIPTHASH}/${scriptHash}`, {})
    if( status.chain_stats.tx_count > 0 || status.mempool_stats.tx_count > 0 ) {
      if (callBack) { 
        callBack()
      }
    }
  }

  async getLatestBlock(callBack: any, endpoint: string): Promise<any> {
    //this.connect()
    try{
    let blockHeight = await ElectrsClient.get(endpoint,GET_ROUTE.BLOCKS_TIP_HEIGHT, {})
    if (this.blockHeightLatest != blockHeight){
      this.blockHeightLatest = blockHeight
      callBack([{"height":blockHeight}])
    }
    return blockHeight
    } catch(err) {
      this.blockHeightLatest = null
      callBack([{"height":null}])
      let err_str = typeof err === 'string' ? err : err?.message
      if (err_str && err_str.includes('Network Error')){
        return null
      }
      throw err
    }
  }

  async scriptHashSubscribe(script: string, callBack: any): Promise<any> {
    let scriptHash = ElectrsClient.scriptToScriptHash(script)
    if ( this.scriptIntervals.has(scriptHash) ){
      throw new ElectrsClientError(`already subscribed to script: [${scriptHash}]`)
    }
    let timer = setInterval(this.getScriptHashStatus, 10000, scriptHash, callBack, this.endpoint)
    this.scriptIntervals.set(scriptHash, timer)
    return timer
  }

  async scriptHashUnsubscribe(script: string) {
    let scriptHash = ElectrsClient.scriptToScriptHash(script)
    clearInterval(this.scriptIntervals.get(scriptHash))
  }

  async blockHeightSubscribe(callBack: any): Promise<any> {
    return setInterval(
      (cb, ep) => {
        this.getLatestBlock(cb, ep)
      }, 
      10000, callBack, this.endpoint)
  }

  async broadcastTransaction(rawTX: string): Promise<string> {
    return ElectrsClient.post(this.endpoint,GET_ROUTE.TX, { "data": rawTX })
  }

  async getFeeEstimation(num_blocks: number): Promise<any> {
    //improvement: load 
    let result = await ElectrsClient.get(this.endpoint,GET_ROUTE.FEE_ESTIMATES, {}).then((histo) => histo[`${num_blocks}`])
    return result
  }

  async importAddresses(addresses: [string]): Promise<string> {
    return ""
  }  
}