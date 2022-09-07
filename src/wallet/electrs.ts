'use strict';
import { checkForServerError, handlePromiseRejection } from './error';
import { ElectrumTxData } from '../wallet/electrum';
import { semaphore, TIMEOUT } from './http_client'
import { log } from './swap/swap_utils';
import axios, { AxiosRequestConfig } from 'axios'
import { handleErrors } from '../error'
let bitcoin = require('bitcoinjs-lib')

class ElectrsClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ElectrsClientError";
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
  scriptIntervals: Map<string, any>
  scriptStatus: Map<string, any>
  blockHeightLatest: any
  block_height_interval: any
  script_hash_subscriptions: string[]
  bEnableBlockHeightSubscribe: boolean


  constructor(endpoint: string, is_tor = true) {
    this.endpoint = endpoint
    this.is_tor = is_tor
    this.scriptIntervals = new Map()
    this.scriptStatus = new Map()
    this.blockHeightLatest = 0
    this.script_hash_subscriptions = []
    this.block_height_interval = null
    this.bEnableBlockHeightSubscribe = true
  }

  enableBlockHeightSubscribe() {
    this.bEnableBlockHeightSubscribe = true
  }

  disableBlockHeightSubscribe() {
    this.bEnableBlockHeightSubscribe = false
  }

  async new_tor_id() {
    if (this.is_tor) {
      await ElectrsClient.get(this.endpoint, 'newid', {});
    }
  };

  async new_tor_circuit() {
    if (this.is_tor) {
      await ElectrsClient.get(this.endpoint, 'newcircuit', {});
    }
  };



  static async get(endpoint: string, path: string,
    params: any, timeout_ms: number = TIMEOUT) {

    const url = endpoint + "/" + (path + (Object.entries(params).length === 0 ? "" : "/" + params)).replace(/^\/+/, '');
    const config: AxiosRequestConfig = {
      method: 'get',
      url: url,
      headers: { 'Accept': 'application/json' },
      timeout: timeout_ms
    };
    await semaphore.wait()
    return axios(config).catch((err: any) => {
      handlePromiseRejection(err, "Electrum API request timed out")
    }).finally(() => { semaphore.release() })
      .then(
        (res: any) => {
          checkForServerError(res)
          return res?.data
        })

  }

  static async post(endpoint: string, path: string, body: any, timeout_ms: number = TIMEOUT) {

    let url = endpoint + "/" + path.replace(/^\/+/, '');
    const config: AxiosRequestConfig = {
      method: 'post',
      url: url,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      data: body,
      timeout: timeout_ms
    };
    await semaphore.wait()
    return axios(config).catch((err: any) => {
      handlePromiseRejection(err, "Electrum API request timed out")
    }).finally(() => { semaphore.release() })
      .then(
        (res: any) => {
          checkForServerError(res)
          return res?.data
        })
  }

  async isClosed(): Promise<boolean> {
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
      await ElectrsClient.get(this.endpoint, GET_ROUTE.BLOCKS_TIP_HEIGHT, {})
      return true
    } catch (err) {
      return false
    }
  }

  // Get header of the latest mined block.
  async latestBlockHeader(): Promise<number> {
    let latesthash = await ElectrsClient.get(this.endpoint, GET_ROUTE.BLOCKS_TIP_HASH, {})
    let header = await ElectrsClient.get(this.endpoint, `${GET_ROUTE.BLOCK}/${latesthash}/${GET_ROUTE.HEADER}`, {})
    let info = await ElectrsClient.get(this.endpoint, `${GET_ROUTE.BLOCK}/${latesthash}`, {})
    info.header = header
    return info
  }

  async getTransaction(txHash: string): Promise<any> {
    let result = await ElectrsClient.get(this.endpoint, `${GET_ROUTE.TX}/${txHash}`, {})
    return result
  }

  async getScriptHashListUnspent(script: string): Promise<any> {
    let scriptHash = ElectrsClient.scriptToScriptHash(script)
    let data: Array<any> = await ElectrsClient.get(this.endpoint, `${GET_ROUTE.SCRIPTHASH}/${scriptHash}/${GET_ROUTE.UTXO}`, {})
    let result = new Array<ElectrumTxData>()

    data.forEach((item, index) => {
      result.push({
        "tx_hash": item.txid,
        "tx_pos": item.vout,
        "value": item.value,
        "height": item.status.block_height
      })
    })
    return result
  }

  async getScriptHashStatus(scriptHash: string, callBack: any, endpoint: string) {
    let status = await ElectrsClient.get(endpoint, `${GET_ROUTE.SCRIPTHASH}/${scriptHash}`, {})
    if (status.chain_stats.tx_count > 0 || status.mempool_stats.tx_count > 0) {
      if (callBack) {
        callBack()
      }
    }
  }

  async getLatestBlock(callBack: any, endpoint: string): Promise<any> {
    //this.connect()
    try {
      let blockHeight = await ElectrsClient.get(endpoint, GET_ROUTE.BLOCKS_TIP_HEIGHT, {})
      if (this.blockHeightLatest != blockHeight) {
        this.blockHeightLatest = blockHeight
        callBack([{ "height": blockHeight }])
      }
      return blockHeight
    } catch (err: any) {
      this.blockHeightLatest = null
      callBack([{ "height": null }])
      handleErrors(err)
    }
  }

  scriptHashSubscribe(script: string, callBack: any): any {
    this.script_hash_subscriptions.push(script)
    let scriptHash = ElectrsClient.scriptToScriptHash(script)
    if (this.scriptIntervals.has(scriptHash)) {
      throw new ElectrsClientError(`already subscribed to script: [${scriptHash}]`)
    }
    let timer = setInterval(this.getScriptHashStatus, 5000, scriptHash, callBack, this.endpoint)
    this.scriptIntervals.set(scriptHash, timer)
    return timer
  }

  scriptHashUnsubscribe(script: string) {
    let scriptHash = ElectrsClient.scriptToScriptHash(script)
    clearInterval(this.scriptIntervals.get(scriptHash))
  }

  async blockHeightSubscribe(callBack: any) {
    if (this.block_height_interval != null) return;
    this.block_height_interval = setInterval(
      async (cb, ep) => {
        await this.getLatestBlock(cb, ep)
      },
      5000, callBack, this.endpoint)
  }

  blockHeightUnsubscribe() {
    clearInterval(this.block_height_interval);
    this.block_height_interval = null;
  }

  unsubscribeAll() {
    this.blockHeightUnsubscribe()
    this.scriptIntervals.forEach(async function (value, _key) {
      clearInterval(value)
    })
  }

  async broadcastTransaction(rawTX: string): Promise<string> {
    return ElectrsClient.post(this.endpoint, GET_ROUTE.TX, { "data": rawTX })
  }

  async getFeeEstimation(num_blocks: number): Promise<any> {
    //improvement: load 
    let result = await ElectrsClient.get(this.endpoint, GET_ROUTE.FEE_ESTIMATES, {}).then((histo) => histo[`${num_blocks}`])
    return result
  }

  async importAddresses(addresses: [string]): Promise<string> {
    return ""
  }
}