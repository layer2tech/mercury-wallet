let bitcoin = require('bitcoinjs-lib')

export class MockElectrumClient {

    async connect() {}

    latestBlockHeight() {
      return 1000
    }

    async broadcastTransaction(raw_tx: string): Promise<string> {
      let txid = bitcoin.Transaction.fromHex(raw_tx).getId();

      console.log(txid);

      if (txid === "d21633ba23f70118185227be58a63527675641ad37967e2aa461559f577aec43") {
        return txid
      } else if (txid === "14ea0a52fe5b9d23f109dd11053a15cfe17632143d11db7857737524d7c65d4e") {
        return "tx already in blockchain"
      } else {
        return "inputs-missingorspent"
      }
    }

    getTransaction(_txHash: string) {
      return new Promise(function(resolve) {resolve({ txid:
         'c33c88b149ec86eb99f1b5d6177ccd198833b07735bfd3049d2dd90c9c0328fc',
        hash:
         '47cb606ed7f772a6fbc0e41f3a084e4e54f2ceafffef51c2349ce663ff3095ed',
        version: 1,
        size: 208,
        vsize: 181,
        weight: 724,
        locktime: 0,
        vin:
         [ { coinbase:
              '03238b1d255c20444d47424c4f434b434841494e205c000000008e5373053f687aabe5e90f0b2e874a00',
             sequence: 0 } ],
        vout:
         [ { value: 0.09946406, n: 0, scriptPubKey: [Object] },
           { value: 0, n: 1, scriptPubKey: [Object] } ],
        hex:
         '010000000001010000000000000000000000000000000000000000000000000000000000000000ffffffff2a03238b1d255c20444d47424c4f434b434841494e205c000000008e5373053f687aabe5e90f0b2e874a00000000000226c597000000000017a9141fd814800f2ab24cbfd0500ed647de4dcb2a7a9f870000000000000000266a24aa21a9ed8fc48c645e0004f8f3c8e771d55a761b14102477ba1c66a58fa70c3069f3cb540120000000000000000000000000000000000000000000000000000000000000000000000000',
        blockhash:
         '0000000000011ff22e58f08aa4b0f4ab891fd60ba97818237105d10670ecae0c',
        confirmations: 120,
        time: 1613408329,
        blocktime: 1613408329 })
      })
    }

    async getScriptHashListUnspent(_script: string): Promise<any> {
      return [ { tx_hash:
            "794610eff71928df4d6814843945dbe51d8d11cdbcbeb11eb1c42e8199298494",
          tx_pos: 0,
          height: 1936508,
          value: 500000 } ]
    }

    async blockHeightSubscribe(callback: any): Promise<any> {
      console.log("ELECTRON MOCK: subscribed to block height ")
      callback([{
        height: 1936508
      }])
      return {
          height: 1936508
        }
    }

    async scriptHashSubscribe(_script: string, callback: any): Promise<any> {
      callback(); // calling callback alerts wallet that script hash status has changed
    }
    async scriptHashUnsubscribe(_script: string): Promise<any> {
    }
    async getFeeHistogram(_num_blocks: number): Promise<any> {
    }

    async close(): Promise<any>{      
    }

    async serverPing(): Promise<any>{
    }

    isOpen(): boolean {
      return true;
    }
  
    isConnecting(): boolean {
      return false;
    }
  
    isClosed(): boolean {
      return false;
    }
  
    isClosing(): boolean {
      return false;
    }

    async importAddresses(addresses: [string]): Promise<string> {
      return ""
    }
}
