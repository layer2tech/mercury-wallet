let bitcoin = require('bitcoinjs-lib')

export class MockElectrum {

    latestBlockHeight() {
      return 12345
    }

    broadcastTransaction(raw_tx: string) {
      let tx = bitcoin.Transaction.fromHex(raw_tx);
      return tx.getId()
    }

    getTransaction(txHash: string) {
      return {
        txid: txHash,
        hash: txHash,
        size: 1223,
        vsize: 8774,
        version: 1,
        confirmations: 10,
        vin: [],
        vout: [],
        etc: "etc"
      }
    }
}
