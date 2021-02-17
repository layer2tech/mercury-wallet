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
      port: 50004,
      protocol: 'wss',
    }
    let electrum_client = await new ElectrumClient(config);

    let output_script = bitcoin.address.toOutputScript("tb1qmkm6r7p02qx3lxawtkysjnclcdcqvqtayhth24", bitcoin.networks.testnet)

    let addr_subscribe = await electrum_client.getScriptHashListUnspent(output_script, console.log)
    console.log("addr_subscribe: ", addr_subscribe);
    // let headers_subscribe = await electrum_client.blockHeightSubscribe()
    // console.log("headers_subscribe: ", headers_subscribe);


  });



})
