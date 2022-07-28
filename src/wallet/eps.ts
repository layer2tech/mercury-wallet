'use strict';
import { ElectrumTxData } from '../wallet/electrum';
import { Mutex } from 'async-mutex'
import { MockHttpClient } from './mocks/mock_http_client';
let bitcoin = require('bitcoinjs-lib')
const axios = require('axios').default;
export const mutex = new Mutex();

class EPSClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EPSClientError";
  }
}

export const GET_ROUTE = {
  PING: "/eps/ping",
  //latestBlockHeader "/EPS/block/:hash/header",
  BLOCK: "/eps/block",
  HEADER: "header",
  LATEST_BLOCK_HEADER: "/eps/latest_block_header",
  //getTransaction /tx/:txid
  TX: "/eps/tx",
  //getScriptHashListUnspent /scripthash/:hash/utxo
  SCRIPTHASH: "/eps/scripthash",
  SCRIPTHASH_HISTORY: "/eps/scripthash_history",
  UTXO: "utxo",
  //getFeeHistogram
  FEE_ESTIMATES: "/eps/fee-estimates",
};
Object.freeze(GET_ROUTE);

export const POST_ROUTE = {
  //broadcast transaction
  TX: "/eps/tx",
  CONFIG: "/eps/config"
};
Object.freeze(POST_ROUTE);


export class EPSClient {
  endpoint: string
  //client: HttpClient | MockHttpClient
  scriptIntervals: Map<string, any>
  scriptStatus: Map<string, any>
  blockHeightLatest: any

  constructor(endpoint: string) {
    //this.client = new HttpClient('http://localhost:3001', true);
    this.endpoint = endpoint
    this.scriptIntervals = new Map()
    this.scriptStatus = new Map()
    this.blockHeightLatest = 0
  }

  enableBlockHeightSubscribe() {
  }

  disableBlockHeightSubscribe() {
  }

  static async get(endpoint: string, path: string, params: any) {
    const release = await mutex.acquire();
    try {
      const url = endpoint + "/" + (path + (Object.entries(params).length === 0 ? "" : "/" + params)).replace(/^\/+/, '');
      const config = {
        method: 'get',
        url: url,
        headers: { 'Accept': 'application/json' }
      };
      let res = await axios(config)
      let return_data = res.data

      release();
      return return_data

    } catch (err: any) {
      release();
      throw err;
    }
  }

  static async post(endpoint: string, path: string, body: any) {
    const release = await mutex.acquire();
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

      release();
      return return_data

    } catch (err: any) {
      release();
      throw err;
    }
  };

  async isClosed(): Promise<boolean> {
    let ping = await this.ping();
    let result = ping == false
    return result
  }

  // convert BTC address scipt to electrum script has
  static scriptToScriptHash(script: string) {
    let script_hash = bitcoin.crypto.sha256(script).toString("hex"); // hash
    return script_hash.match(/[a-fA-F0-9]{2}/g).reverse().join(''); // reverse  
  }

  //async getClient(): Promise<HttpClient>{
  //  return new HttpClient('http://localhost:3001', true)
  //}

  async connect(config = { protocol: "tcp", host: "127.0.0.1", port: "50001" }): Promise<any> {
    EPSClient.post(this.endpoint, POST_ROUTE.CONFIG, { "data": config })
  }

  async ping(): Promise<boolean> {
    try {
      await EPSClient.get(this.endpoint, GET_ROUTE.LATEST_BLOCK_HEADER, {})
      return true
    } catch (err) {
      return false
    }
  }

  // Get header of the latest mined block.
  async latestBlockHeader(): Promise<any> {
    let header = await EPSClient.get(this.endpoint, GET_ROUTE.LATEST_BLOCK_HEADER, {})
    header.height = header.block_height
    return header
  }

  async getTransaction(txHash: string): Promise<any> {
    let result = await EPSClient.get(this.endpoint, `${GET_ROUTE.TX}/${txHash}`, {})
    return result
  }

  async getScriptHashListUnspent(script: string): Promise<any> {
    let scriptHash = EPSClient.scriptToScriptHash(script)
    let result = await EPSClient.get(this.endpoint, `/eps/get_scripthash_list_unspent/${scriptHash}`, {})

    return result
  }

  async getScriptHashStatus(scriptHash: string, callBack: any, endpoint: string) {
    let history = null
    try {
      history = await EPSClient.get(endpoint, `${GET_ROUTE.SCRIPTHASH_HISTORY}/${scriptHash}`, {})
    } catch (err) {
    }
    if (history) {
      if (callBack) {
        callBack()
      }
    }
  }

  async getLatestBlock(callBack: any, endpoint: string): Promise<any> {
    //this.connect()
    let header = await EPSClient.get(endpoint, '/eps/latest_block_header', {})
    header.height = header.block_height
    if (this.blockHeightLatest != header.height) {
      this.blockHeightLatest = header.height
      callBack([header])
    }
    return header
  }

  async scriptHashSubscribe(script: string, callBack: any): Promise<any> {
    let scriptHash = EPSClient.scriptToScriptHash(script)
    if (this.scriptIntervals.has(scriptHash)) {
      throw new EPSClientError(`already subscribed to script: [${scriptHash}]`)
    }
    let timer = setInterval(this.getScriptHashStatus, 10000, scriptHash, callBack, this.endpoint)
    this.scriptIntervals.set(scriptHash, timer)
    return timer
  }

  async scriptHashUnsubscribe(script: string) {
    let scriptHash = EPSClient.scriptToScriptHash(script)
    clearInterval(this.scriptIntervals.get(scriptHash))
  }

  async blockHeightSubscribe(callBack: any): Promise<any> {
    return setInterval(this.getLatestBlock, 10000, callBack, this.endpoint)
  }

  async unsubscribeAll() {
    return
  }

  async broadcastTransaction(rawTX: string): Promise<string> {
    return EPSClient.post(this.endpoint, GET_ROUTE.TX, { "data": rawTX })
  }
  async importAddresses(addresses: [string], rescan_height: number = -1): Promise<string> {
    return EPSClient.post(this.endpoint, '/eps/import_addresses', { "addresses": addresses, "rescan_height": rescan_height })
  }

  async getFeeEstimation(num_blocks: number, net_config: string): Promise<any> {

    let url: string

    switch (net_config) {
      case "tb":
        url = "https://blockstream.info/testnet"
        break
      default:
        url = "https://blockstream.info/"
      //REMOVE TESTNET PART FOR MAIN NET
    }

    let result = await EPSClient.get(url, "api/fee-estimates", {}).then((histo) => histo[`${num_blocks}`])
    return result
  }

}
