var Mutex = require('async-mutex').Mutex
let ElectrumClientLib = require('@keep-network/electrum-client-js')
let bitcoin = require('bitcoinjs-lib')
const W3CWebSocket = require('websocket').w3cwebsocket

const mutex = new Mutex();

/*
export interface ElectrumClientConfig {
  host: string,
  port: number | null,
  protocol: string
}
*/

class ElectrumClientError extends Error {
  constructor(message){
    super(message);
    this.name = "ElectrumClientError";
  }
}

class ElectrumClient {
  client = ElectrumClientLib;

  constructor(config) {
    this.client = new ElectrumClientLib(config.host, config.port, config.protocol)
  }

  // Connect to Electrum Server if not already connected or in the process of connecting
  async connect() {



    await mutex.runExclusive(async () => {

      
      await this.client.connect(
        //"mercury-electrum-client-js",  // optional client name
        //"1.4.2"                        // optional protocol version
      ).catch((err) => {
        throw new Error(`failed to connect: [${err}]`)
      })

    });
    


  }

  // Disconnect from the ElectrumClientServer.
  async close() {
    this.client.close()
  }

  async serverPing() {
    this.client.server_ping().catch( (err) => {
      throw err;
    });
  }

  isOpen() {
    return (this.client.status === W3CWebSocket.OPEN);
  }

  isConnecting() {
    return (this.client.status === W3CWebSocket.CONNECTING);
  }

  isClosed() {
    return (this.client.status ===W3CWebSocket.CLOSED);
  }

  isClosing() {
    return (this.client.status === W3CWebSocket.CLOSING);
  }

  // convert BTC address scipt to electrum script has
  scriptToScriptHash(script) {
    let script_hash = bitcoin.crypto.sha256(script).toString("hex") // hash
    return script_hash.match(/[a-fA-F0-9]{2}/g).reverse().join(''); // reverse
  }

  async ping() {
    if (this.isOpen()){
      await this.serverPing().catch((err) => {
        return false;
      });
      return true;
    }
    return false;
  }

  // Get header of the latest mined block.
  async latestBlockHeader() {
    await this.connect().catch((err)=> {
      console.error(err)
    });
    const header = await this.client
      .blockchain_headers_subscribe()
      .catch((err) => {
        throw new ElectrumClientError(`failed to get block header: [${err}]`)
      })
    return header
  }

  async getTransaction(txHash) {
    this.connect();
    const tx = await this.client
      .blockchain_transaction_get(txHash, true)
        .catch((err) => {
          throw new ElectrumClientError(`failed to get transaction ${txHash}: [${err}]`)
        }
      )
    return tx
  }

  async getScriptHashListUnspent(script_hash) {
    this.connect();
 
    const list_unspent = await this.client
      .blockchain_scripthash_listunspent(script_hash)
        .catch((err) => {
          let err_msg = `failed to get list unspent for script hash ${script_hash}: [${err}]`
          console.log(`${err_msg}`)
          throw new ElectrumClientError(err_msg)
        }
    )

    let result = new Array
    
    let header = null
    
    while (!header){
      header = await this.latestBlockHeader()
    }
    
    if (header){
      for (let i in list_unspent) {
        let item = list_unspent[i]
          result.push({"tx_hash":item.tx_hash, 
                      "tx_pos":item.tx_pos, 
                      "value":item.value * 100000000,
                      "height": header.block_height - item.confirmations})
      }
      return result
    }
    return null
  }

  async scriptHashSubscribe(script, callBack) {
    await this.connect();
    this.client.subscribe.on('blockchain.scripthash.subscribe', callBack)
    let script_hash = this.scriptToScriptHash(script)
    const addr_subscription = await this.client
      .blockchain_scripthash_subscribe(script_hash)
        .catch((err) => {
          throw new ElectrumClientError(`failed to subscribe to script ${script}: [${err}]`)
        }
      )
    return addr_subscription
  }

  async scriptHashUnsubscribe(script) {
    this.connect();
    let script_hash = this.scriptToScriptHash(script)
    this.client
      .blockchain_scripthash_unsubscribe(script_hash)
        .catch((err) => {
          throw new ElectrumClientError(`failed to subscribe to script ${script}: [${err}]`)
        }
      )
  }

  async blockHeightSubscribe(callBack) {
    this.connect();
    this.client.subscribe.on('blockchain.headers.subscribe', callBack)
    const headers_subscription = await this.client
      .blockchain_headers_subscribe()
        .catch((err) => {
          throw new ElectrumClientError(`failed to subscribe to headers: [${err}]`)
        }
      )
    return headers_subscription
  }

  async broadcastTransaction(rawTX) {
    this.connect();
    const txHash = await this.client
      .blockchain_transaction_broadcast(rawTX)
      .catch((err) => {
        throw new ElectrumClientError(`failed to broadcast transaction: [${err}]`)
      })
    return txHash
  }

  async getFeeHistogram(num_blocks) {
    this.connect();
  
    const fee_histogram = await this.client
      .request('mempool.get_fee_histogram')
      .catch((err) => {
          throw new ElectrumClientError(`failed to get fee estimation: [${err}]`)
        }
      )
  
    return fee_histogram
  }


  async getScripthashHistory(script_hash) {
    await this.connect().catch((err)=> {
      console.error(err)
    });
    const history = await this.client
      .blockchain_scripthash_getHistory(script_hash)
      .catch((err) => {
        //if (err.message.includes("close connect")){
        //  return null
        //}
        throw new ElectrumClientError(`failed to get scripthash  history: ${err.name}:${err.message}`)
      }
    )
    return history
  }

  async importAddresses(addresses) {
    await this.connect().catch((err)=> {
      console.error(err)
    });
    await this.client.request('import_addresses', addresses)
      .catch( (err) => {
        throw new ElectrumClientError(`failed to import addresses: ${err.name}:${err.message}`)
    })
  }
  
}

/*
interface ElectrumTxData {
  tx_hash: string,
  tx_pos: number,
  height: number,
  value: number
}
*/

module.exports = ElectrumClient;

