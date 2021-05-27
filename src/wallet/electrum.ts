let ElectrumClientLib = require('@keep-network/electrum-client-js')
let bitcoin = require('bitcoinjs-lib')
const W3CWebSocket = require('websocket').w3cwebsocket

export interface ElectrumClientConfig {
  host: string,
  port: number,
  protocol: string
}


export class ElectrumClient {
  client = ElectrumClientLib;

  constructor(config: ElectrumClientConfig) {
    this.client = new ElectrumClientLib(config.host, config.port, config.protocol)
  }

  // Connect to Electrum Server
  async connect() {
    await this.client.connect(
      "mercury-electrum-client-js",  // optional client name
      "1.4.2"                        // optional protocol version
    ).catch((err: any) => {
      throw new Error(`failed to connect: [${err}]`)
    })
  }

  // Disconnect from the ElectrumClientServer.
  async close() {
    this.client.close()
  }

  async serverPing() {
    this.client.server_ping().catch( (err: any) => {
      throw err;
    });
  }

  hasConnected() {
    return (this.client.status !== 0);
  }

  isOpen() {
    console.log(`isOpen: ${this.client.status}, ${W3CWebSocket.OPEN}`)
    return (this.client.status === W3CWebSocket.OPEN);
  }

  isConnecting() {
    return (this.client.status === W3CWebSocket.CONNECTING);
  }

  isClosed() {
    console.log(`isClosed: ${this.client.status}, ${W3CWebSocket.CLOSED}, ${(this.client.status ===W3CWebSocket.CLOSED)}`)
    return (this.client.status ===W3CWebSocket.CLOSED);
  }

  isClosing() {
    return (this.client.status === W3CWebSocket.CLOSING);
  }

  // convert BTC address scipt to electrum script has
  scriptToScriptHash(script: string) {
    let script_hash = bitcoin.crypto.sha256(script).toString("hex") // hash
    return script_hash.match(/[a-fA-F0-9]{2}/g).reverse().join(''); // reverse
  }


  // Get header of the latest mined block.
  async latestBlockHeader(): Promise<number> {
    const header = await this.client
      .blockchain_headers_subscribe()
      .catch((err: any) => {
        throw new Error(`failed to get block header: [${err}]`)
      })
    return header
  }

  async getTransaction(txHash: string): Promise<any> {
    const tx = await this.client
      .blockchain_transaction_get(txHash, true)
        .catch((err: any) => {
          throw new Error(`failed to get transaction ${txHash}: [${err}]`)
        }
      )
    return tx
  }

  async getScriptHashListUnspent(script: string): Promise<any> {
    let script_hash_rev = this.scriptToScriptHash(script);
    const list_unspent = await this.client
      .blockchain_scripthash_listunspent(script_hash_rev)
        .catch((err: any) => {
          throw new Error(`failed to get list unspent for script ${script}: [${err}]`)
        }
      )
    return list_unspent
  }

  async scriptHashSubscribe(script: string, callBack: any): Promise<any> {;
    this.client.subscribe.on('blockchain.scripthash.subscribe', callBack)
    let script_hash = this.scriptToScriptHash(script)
    const addr_subscription = await this.client
      .blockchain_scripthash_subscribe(script_hash)
        .catch((err: any) => {
          throw new Error(`failed to subscribe to script ${script}: [${err}]`)
        }
      )
    return addr_subscription
  }

  async scriptHashUnsubscribe(script: string): Promise<any> {
    let script_hash = this.scriptToScriptHash(script)
    this.client
      .blockchain_scripthash_unsubscribe(script_hash)
        .catch((err: any) => {
          throw new Error(`failed to subscribe to script ${script}: [${err}]`)
        }
      )
  }

  async blockHeightSubscribe(callBack: any): Promise<any> {
    this.client.subscribe.on('blockchain.headers.subscribe', callBack)
    const headers_subscription = await this.client
      .blockchain_headers_subscribe()
        .catch((err: any) => {
          throw new Error(`failed to subscribe to headers: [${err}]`)
        }
      )
    return headers_subscription
  }

  async broadcastTransaction(rawTX: string): Promise<string> {
    const txHash = await this.client
      .blockchain_transaction_broadcast(rawTX)
      .catch((err: any) => {
        throw new Error(`failed to broadcast transaction: [${err}]`)
      })
    return txHash
  }

  async getFeeHistogram(num_blocks: number): Promise<any> {
    const fee_histogram = await this.client
      .blockchainEstimatefee(num_blocks)
        .catch((err: any) => {
          throw new Error(`failed to get fee estimation: [${err}]`)
        }
      )
    return fee_histogram
  }
}


export interface ElectrumTxData {
  tx_hash: string,
  tx_pos: number,
  height: number,
  value: number
}
