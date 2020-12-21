let ElectrumClientLib = require('@keep-network/electrum-client-js')

const config = {
  host: 'electrumx-server.tbtc.network',
  port: 8443,
  protocol: 'wss',
}

export class ElectrumClient {
  client = ElectrumClientLib;

  constructor() {
    this.client = new ElectrumClientLib(config.host, config.port, config.protocol)
  }

  // Connect to Electrum Server
  async connect() {
    // console.log("Connecting to electrum server...")
    await this.client.connect(
      "mercury-electrum-client-js",  // optional client name
      "1.4.2"                        // optional protocol version
    ).catch((err: any) => {
      throw new Error(`failed to connect: [${err}]`)
    })
  }

  // Disconnect from the ElectrumClientServer.
  async close() {
    // console.log("Closing connection to electrum server...")
    this.client.close()
  }


  async latestBlockHeight(): Promise<number> {
    await this.connect()
    // Get header of the latest mined block.
    const header = await this.client
      .blockchain_headers_subscribe()
      .catch((err: any) => {
        throw new Error(`failed to get block header: [${err}]`)
      })
    await this.close()
    return header.height
  }

  async getTransaction(txHash: string): Promise<any> {
    await this.connect()
    const tx = await this.client
      .blockchain_transaction_get(txHash, true)
        .catch((err: any) => {
          throw new Error(`failed to get transaction ${txHash}: [${err}]`)
        }
      )
    await this.close()
    return tx
  }

  async broadcastTransaction(rawTX: string): Promise<string> {
    await this.connect()
    const txHash = await this.client
      .blockchain_transaction_broadcast(rawTX)
      .catch((err: any) => {
        throw new Error(`failed to broadcast transaction: [${err}]`)
      })
    await this.close()
    return txHash
  }
}
