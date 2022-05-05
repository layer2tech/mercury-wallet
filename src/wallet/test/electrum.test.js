import { ElectrumClient } from '../electrum';
import { Network } from "bitcoinjs-lib";
const W3CWebSocket = require('websocket').w3cwebsocket
const net = require('net')
let bitcoin = require('bitcoinjs-lib');
var execSync = require('child_process').execSync;
var exec = require('child_process').exec;
import { delay_s } from '../mercury/info_api';

jest.mock('axios', () => jest.fn())

function gen_blocks(address, n) {
    return execSync(`bitcoin-core.cli -conf=/home/ldeacon/bitcoin-regtest/bitcoin.conf -rpcport=18333 -rpcuser=username -rpcpassword=password generatetoaddress ${n} ${address}`,
        function (error, stdout, stderr) {
            console.log('stdout: ' + stdout);
            console.log('stderr: ' + stderr);
            if (error !== null) {
                console.log('exec error: ' + error);
            }
        })
}

describe('ElectrumClient', function () {

    let config = {
        host: "127.0.0.1", port: 50002, protocol: "tcp", type: ""}
    let client = new ElectrumClient(config);

    beforeEach(async () => {
        jest.setTimeout(5000)
        await client.connect()
    });

    test.skip('ping', async function () {
        let result = await client.ping()
        expect(result).toEqual(true)
    })

    test.skip('close', async function () {
        expect(client.isOpen()).toEqual(true)
        await client.close()
        expect(client.isClosed()).toEqual(true)
        let result = await client.ping()
        expect(result).toEqual(false)
        await expect(client.connect()).rejects.toThrow(Error("failed to connect: [Error: failed to connect to electrum server: [Error: connection not established]]"))
        await client.connect()
    })

    test('latestBlockHeader', async function () {
        let header = await client.latestBlockHeader()
        console.log(header)
    })

    test('getTransaction', async function () {
        let tx = await client.getTransaction("a92813241f4c4f77f05f43cb8b0f3c2abe91a6cf82cad877fb4d30db735fca96")
        console.log(tx)
    })

    test.skip('getFeeEstimation', async function () {
        let est = await client.getFeeEstimation(1)
        console.log(est)
    })

    test.skip('broadcastTransaction', async function () {
        await expect(client.broadcastTransaction("02000000000101e085b8dd418ff197a23894b8c9eb0676e9b06e46209cb1c140891c5db40e45c80000000000feffffff02809698000000000016001449c305de9b5a66993d295494917f5c649647ff1560359628010000001600143f68991a61a8570b5678e47e6df457b42047b2c40247304402201181577000eb235f5e92c654726dfa14df57a078ea274be23ecf23ef397b971a022076bab97acb1284ce669e62b0ebfd4f26571b7316a8a675984f83a36d5f01380f0121020f09ff840790a3dd5104fde477febc66661b439e2e1d1eb451e019d00b999d9b82000000")).
            rejects.toThrow(Error("failed to broadcast transaction: [Transaction already in block chain]"))
    })

    test.skip('getAddressListUnspent', async function () {
        let address = "bcrt1qq63afvq96tq7kyvvdyldtehhp5tgpsz8z0z0kq"
        let network = bitcoin.networks.regtest
        let result = await client.getAddressListUnspent(address, network)
        expect(result.length > 0).toEqual(true)
    })

    test.skip('addressSubscribe', async function () {
        let address = "bcrt1qq63afvq96tq7kyvvdyldtehhp5tgpsz8z0z0kq"
        let network = bitcoin.networks.regtest
        let callbackCalled = false
        let p_addr = undefined

        let result = await client.addressSubscribe(address, network, async (status) => {
            console.log(`Script hash status change: ${JSON.stringify(status)}`);
            callbackCalled = true
        })
        console.log(`addressSubscribe: ${result}`)
        let nBlocks = 10
        let child = gen_blocks(address, nBlocks)
        
        await delay_s(nBlocks)
        expect(callbackCalled).toEqual(true)
        
        //await callBackPromise
        //expect(callbackCalled).toEqual(true)
        //result = await client.addressUnsubscribe(address, network)
        //console.log(`addressUnsubscribe: ${result}`)
    })
    
    test.skip('blockHeightSubscribe', async function () {
        let address = "bcrt1qq63afvq96tq7kyvvdyldtehhp5tgpsz8z0z0kq"
        let init_block_height = -1
        let block_height = -1

        let callBackFunction = async (status) => {
            console.log(`block height status: ${JSON.stringify(status)}`)
            block_height = status[0].height
            if (init_block_height === -1) {
                init_block_height=status[0].height
            }
        }

        let result = await client.blockHeightSubscribe(callBackFunction)
        let nBlocks = 10
        let child = gen_blocks(address, nBlocks)

        await delay_s(nBlocks)

        expect(block_height > init_block_height).toEqual(true)
    })
    
});