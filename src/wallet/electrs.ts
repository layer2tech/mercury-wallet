import {HttpClient} from './http_client'
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
  client: HttpClient
  scriptIntervals: Map<string,any>
  scriptStatus: Map<string,any>
  blockHeightLatest: any
  
  constructor(client: HttpClient){
    this.client = client
    this.scriptIntervals = new Map()
    this.scriptStatus = new Map()
    this.blockHeightLatest = 0
  }

  // convert BTC address scipt to electrum script has
  scriptToScriptHash(script: string) {
    let script_hash = bitcoin.crypto.sha256(script).toString("hex") // hash
      return script_hash.match(/[a-fA-F0-9]{2}/g).reverse().join(''); // reverse  
  }

  async connect() {
    
  }

  // Get header of the latest mined block.
  async latestBlockHeader(): Promise<number> {
    let latesthash = await this.client.get(GET_ROUTE.BLOCKS_TIP_HASH, null)
    let header = await this.client.get(`${GET_ROUTE.BLOCK}/${latesthash}/${GET_ROUTE.HEADER}`, null)
    return header
  }

  async getTransaction(txHash: string): Promise<any> {
    this.client.get(`${GET_ROUTE.TX}/${txHash}`, null)
  }

  async getScriptHashListUnspent(script: string): Promise<any> {
    let result: Promise<Array<any>> = this.client.get(`${GET_ROUTE.SCRIPTHASH}/${script}/${GET_ROUTE.UTXO}`, null)
    return result
  }

  async getScriptHashStatus(script: string, callBack: any) {
    let status = await this.client.get(`${GET_ROUTE.SCRIPTHASH}/${script}`, null)
    if( status == true ) {
      if (callBack) { 
        callBack()
      }
      clearInterval(this.scriptIntervals.get(script))
    }
  }

  async getLatestBlock(callBack: any): Promise<any> {
    let blockHeight = await this.client.get(GET_ROUTE.BLOCKS_TIP_HEIGHT, null)
    if (this.blockHeightLatest != blockHeight){
      this.blockHeightLatest = blockHeight
      callBack()
    }
    return blockHeight
  }

  async scriptHashSubscribe(script: string, callBack: any): Promise<any> {
    if ( this.scriptIntervals.has(script) ){
      throw new ElectrsClientError(`already subscribed to script: [${script}]`)
    }
    let timer = setInterval(this.getScriptHashStatus, 5000, script, callBack)
    this.scriptIntervals.set(script, timer)
    return timer
  }

  async scriptHashUnsubscribe(script: string) {
    clearInterval(this.scriptIntervals.get(script))
  }

  async blockHeightSubscribe(callBack: any): Promise<any> {
    return setInterval(this.getLatestBlock, 5000, callBack)
  }

  async broadcastTransaction(rawTX: string): Promise<string> {
    return this.client.post(GET_ROUTE.TX, rawTX)
  }

  async getFeeHistogram(num_blocks: number): Promise<any> {
    return this.client.get(GET_ROUTE.FEE_ESTIMATES, null).then((histo) => histo[`${num_blocks}`])
  }

}