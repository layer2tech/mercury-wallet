let bitcoin = require('bitcoinjs-lib')

let ElectrumClient = require('@keep-network/electrum-client-js')

const config = {
  host: 'electrumx-server.tbtc.network',
  port: 8443,
  protocol: 'wss',
}

export class Electrum {
  client = ElectrumClient;

  constructor() {
    this.client = new ElectrumClient(config.host, config.port, config.protocol)
  }

  // Connect to ElectrumServer
  async connect() {
    // console.log("Connecting to electrum server...")
    await this.client.connect(
      "mercury-electrum-client-js",  // optional client name
      "1.4.2"                        // optional protocol version
    ).catch((err: any) => {
      throw new Error(`failed to connect: [${err}]`)
    })
  }

  // Disconnect from the ElectrumServer.
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

  broadcast_transaction(raw_tx: string) {
    let tx = bitcoin.Transaction.fromHex(raw_tx);
    return tx.getId()
  }

  get_transaction_conf_status(_tx_hash: string, _merkle: string) {
    return {
      in_active_chain: true,
      confirmations: 2,
      blocktime: 123456789,
    }
  }
}
