import { ElectrumTxData } from './electrum';
import {HttpClient} from './http_client'
import { MockHttpClient } from './mocks/mock_http_client';
let bitcoin = require('bitcoinjs-lib')

class ElectrsClientError extends Error {
  constructor(message: string){
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
  //getFeeHistogram
  FEE_ESTIMATES: "/electrs/fee-estimates",
};
Object.freeze(GET_ROUTE);

export const POST_ROUTE = {
  //broadcast transaction
  TX: "/electrs/tx",
};
Object.freeze(POST_ROUTE);


export class ElectrsClient {
  //client: HttpClient | MockHttpClient
  scriptIntervals: Map<string,any>
  scriptStatus: Map<string,any>
  blockHeightLatest: any
  
  constructor(){
    //this.client = new HttpClient('http://localhost:3001', true);
    this.scriptIntervals = new Map()
    this.scriptStatus = new Map()
    this.blockHeightLatest = 0
  }

  async isClosed(): Promise<boolean>{
    let ping = await this.ping();
    let result = ping == false
    console.log(`ping: ${ping}, ${result}`)
    return result
  }

  // convert BTC address scipt to electrum script has
  static scriptToScriptHash(script: string) {
    let script_hash = bitcoin.crypto.sha256(script).toString("hex"); // hash
    return script_hash.match(/[a-fA-F0-9]{2}/g).join(''); // reverse  
  }

  //async getClient(): Promise<HttpClient>{
  //  return new HttpClient('http://localhost:3001', true)
  //}

  async connect() {
  }

  async ping(): Promise<boolean> {
    let client = new HttpClient('http://localhost:3001', true)
    try {
      await client.get(GET_ROUTE.BLOCKS_TIP_HEIGHT, {})
      return true
    } catch(err){
      return false
    }
  }

  // Get header of the latest mined block.
  async latestBlockHeader(): Promise<number> {
    let client = new HttpClient('http://localhost:3001', true);
    let latesthash = await client.get(GET_ROUTE.BLOCKS_TIP_HASH, {})
    let header = await client.get(`${GET_ROUTE.BLOCK}/${latesthash}/${GET_ROUTE.HEADER}`, {})
    console.log(`latestBlockHeader: ${header}`)
    let info = await client.get(`${GET_ROUTE.BLOCK}/${latesthash}`, {})
    info.header = header
    console.log(`latestBlockHeader: ${JSON.stringify(info)}`)
    return info
  }

  async getTransaction(txHash: string): Promise<any> {
    let client = new HttpClient('http://localhost:3001', true)
    let result = await client.get(`${GET_ROUTE.TX}/${txHash}`, {})
    console.log(`getTransaction: ${result}`)
    return result
  }

  async getScriptHashListUnspent(script: string): Promise<any> {
    let scriptHash = ElectrsClient.scriptToScriptHash(script)
    let client = new HttpClient('http://localhost:3001', true)
    let data: Array<any> = await client.get(`${GET_ROUTE.SCRIPTHASH}/${scriptHash}/${GET_ROUTE.UTXO}`, {})
    let result = new Array<ElectrumTxData>()

    data.forEach((item, index) => {
      result.push({"tx_hash":item.txid, 
                    "tx_pos":item.vout, 
                    "value":item.value,
                    "height":item.status.block_height})
    })
    console.log(`getScriptHashListUnspent: ${JSON.stringify(result)}`)
    return result
  }

  async getScriptHashStatus(scriptHash: string, callBack: any) {
    let client = new HttpClient('http://localhost:3001', true);
    console.log(`${GET_ROUTE.SCRIPTHASH}/${scriptHash}`)
    let status = await client.get(`${GET_ROUTE.SCRIPTHASH}/${scriptHash}`, {})
    if( status.chain_stats.tx_count > 0 || status.mempool_stats.tx_count > 0 ) {
      console.log("getScriptHashStatus")
      if (callBack) { 
        callBack()
      }
    }
  }

  async getLatestBlock(callBack: any): Promise<any> {
    let client: HttpClient = new HttpClient('http://localhost:3001', true)
    //this.connect()
    let blockHeight = await client.get(GET_ROUTE.BLOCKS_TIP_HEIGHT, {})
    console.log(`block height: ${blockHeight}`)
    if (this.blockHeightLatest != blockHeight){
      this.blockHeightLatest = blockHeight
      console.log(`blockHeightLatest: ${this.blockHeightLatest}`)
      callBack([{"height":blockHeight}])
    }
    return blockHeight
  }

  async scriptHashSubscribe(script: string, callBack: any): Promise<any> {
    let scriptHash = ElectrsClient.scriptToScriptHash(script)
    if ( this.scriptIntervals.has(scriptHash) ){
      throw new ElectrsClientError(`already subscribed to script: [${scriptHash}]`)
    }
    let timer = setInterval(this.getScriptHashStatus, 5000, scriptHash, callBack)
    this.scriptIntervals.set(scriptHash, timer)
    return timer
  }

  async scriptHashUnsubscribe(script: string) {
    let scriptHash = ElectrsClient.scriptToScriptHash(script)
    clearInterval(this.scriptIntervals.get(scriptHash))
  }

  async blockHeightSubscribe(callBack: any): Promise<any> {
    return setInterval(this.getLatestBlock, 5000, callBack)
  }

  async broadcastTransaction(rawTX: string): Promise<string> {
    let client = new HttpClient('http://localhost:3001', true)
    return client.post(GET_ROUTE.TX, rawTX)
  }

  async getFeeHistogram(num_blocks: number): Promise<any> {
    let client = new HttpClient('http://localhost:3001', true)
    return client.get(GET_ROUTE.FEE_ESTIMATES, {}).then((histo) => histo[`${num_blocks}`])
  }

}