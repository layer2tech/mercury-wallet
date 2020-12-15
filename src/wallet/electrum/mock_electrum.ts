let bitcoin = require('bitcoinjs-lib')

export class MockElectrum {

    latestBlockHeight() {
      return 12345
    }

    broadcast_transaction(raw_tx: string) {
      let tx = bitcoin.Transaction.fromHex(raw_tx);
      return tx.getId()
    }

    get_transaction_conf_status(_tx_hash: string, _merkle: boolean) {
      return {
        in_active_chain: true,
        confirmations: 2,
        blocktime: 123456789,
      }
    }
}
