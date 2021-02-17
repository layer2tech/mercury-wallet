import { ElectrumClient } from '../';
let bitcoin = require('bitcoinjs-lib')

const sleep = (ms) => new Promise((resolve, _) => setTimeout(() => resolve(), ms))

describe('Electrum', function() {
  test('Get latest block height', async function() {
    // wallet.mercurywallet.io:50002:s
    // let config = {
    //   host: 'electrumx-server.tbtc.network',
    //   port: 8443,
    //   protocol: 'wss',
    // }
    let config = {
      host: 'wallet.mercurywallet.io',
      port: 50002,
      protocol: 'ssl',
    }
    let electrum_client = await new ElectrumClient(config);

    //   let output_script = bitcoin.address.toOutputScript("tb1q8ux92etsg0w7m4ps4wj89n4k7msmdpw4z89cwl", bitcoin.networks.testnet)
    // let hash = bitcoin.crypto.sha256(output_script).toString("hex")
    //
    // let addr_subscribe = await electrum_client.addressSubscribe(hash)
    // console.log("addr_subscribe: ", addr_subscribe);
    let headers_subscribe = await electrum_client.blockHeightSubscribe()
    console.log("headers_subscribe: ", headers_subscribe);

    while (true) {
      // Keep connection alive.
      await sleep(1000)
      electrum_client.serverPing().then((item) => {console.log("ping: ", item)})
    }

  });



})
