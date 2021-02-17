let ElectrumClientLib = require('@keep-network/electrum-client-js')
let bitcoin = require('bitcoinjs-lib')

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
    await this.client.connect()
    this.client.server_ping()
  }


  // Get header of the latest mined block.
  async latestBlockHeight(): Promise<number> {
    const header = await this.client
      .blockchain_headers_subscribe()
      .catch((err: any) => {
        throw new Error(`failed to get block header: [${err}]`)
      })
    return header.height
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

  async scriptHashSubscribe(script: string, callBack: any): Promise<any> {
    await this.client.connect();
    this.client.subscribe.on('blockchain.scripthash.subscribe', callBack)

    let script_hash = bitcoin.crypto.sha256(script).toString("hex")
    const addr_subscription = await this.client
      .blockchain_scripthash_subscribe(script_hash)
        .catch((err: any) => {
          throw new Error(`failed to subscribe to script ${script}: [${err}]`)
        }
      )
    return addr_subscription
  }

  async blockHeightSubscribe(callBack: any): Promise<any> {
    await this.client.connect()
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
}
