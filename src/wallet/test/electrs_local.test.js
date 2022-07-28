import { ElectrsLocalClient } from '../electrs_local';
let bitcoin = require('bitcoinjs-lib');
var execSync = require('child_process').execSync;
var execFileSync = require('child_process').execFileSync;
var fork = require('child_process').fork;
//import { delay_s } from '../mercury/info_api';

const delay_s = (s) => {
    return delay(s * 1000)
}

const delay = (ms) => {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    })
}

const testnet_command = "bitcoin-core.cli -conf=/home/ldeacon/bitcoin-testnet-conf/bitcoin.conf -rpcport=18334 -rpcuser=username -rpcpassword=password"
const regtest_command = "bitcoin-core.cli -conf=/home/ldeacon/bitcoin-regtest/bitcoin.conf -rpcport=18333 -rpcuser=username -rpcpassword=password"
const regtest_umbrel_2 = "/media/ldeacon/Elements/umbrel_regtest/bin/bitcoin-cli"
const regtest_umbrel = "bitcoin-core.cli -conf=/media/ldeacon/Elements/umbrel_regtest//bitcoin.conf -rpcport=18443 -rpcuser=umbrel -rpcpassword=WiEh1Ufmfl3JlTSeAnwO3CQi0B0dDz1lmqvgigwPiHc="

function bitcoin_command(command) {
    let cmd = command.split()
    console.log(`cmd: ${cmd.toString()}`)

    let result = execSync(`${regtest_command} ${command}`, { shell: "/bin/bash" },
        function (error, stdout, stderr) {
            console.log('stdout: ' + stdout);
            console.log('stderr: ' + stderr);
            if (error !== null) {
                console.log('exec error: ' + error);
            }
        }
    )
    result = result.toString().replace(/\s+/g, '').replace(/\n|\r/g, '')
    console.log(`command: ${command}\nresult: ${result}`)
    return result
}

async function init_tor_adapter() {
    const tor_adapter_path = `/home/ldeacon/Projects/mercury-wallet/src/../tor-adapter/server/index.js`
    const tor_adapter_args = [
        '/home/ldeacon/Projects/mercury-wallet/resources/linux/tor',
        '/home/ldeacon/Projects/mercury-wallet/resources/etc/torrc',
        '/home/ldeacon/.config/MercuryWallet/tor'
    ]
    return fork(tor_adapter_path, tor_adapter_args,
        {
            detached: false,
            stdio: 'ignore'
        },
        function (error, stdout, stderr) {
            console.log('init_tor_adapter - stdout: ' + stdout);
            console.log('init_tor_adapter - stderr: ' + stderr);
            if (error !== null) {
                console.log('init_tor_adapter - exec error: ' + error);
            }
        })
}

function create_wallet(walletName) {
    return bitcoin_command(`createwallet ${walletName}`)
}

function load_wallet(walletName) {
    return bitcoin_command(`loadwallet ${walletName}`)
}

function gen_blocks(address, n) {
    return bitcoin_command(`generatetoaddress ${n} ${address}`)
}

function sendtoaddress(address, amount) {
    return bitcoin_command(`sendtoaddress ${address} ${amount}`)
}

function getnewaddress() {
    return bitcoin_command(`getnewaddress`)
}

function sendrawtransaction(tx) {
    return bitcoin_command(`sendrawtransaction ${tx}`)
}

function abandontransaction(tx) {
    return bitcoin_command(`abandontransaction ${tx}`)
}

describe.skip('ElectrsLocalClient', function () {

    let client = new ElectrsLocalClient('http://localhost:3001', true);
    let ta_process
    let addresses

    const network = bitcoin.networks.regtest

    beforeAll(async () => {
        jest.setTimeout(10000)
        if (ta_process?.pid != null) {
            process.kill(ta_process?.pid, 'SIGTERM')
        }
        ta_process = await init_tor_adapter()
        //create_wallet("testwallet")
        //load_wallet("testwallet")
        const address = await getnewaddress()
        console.log(address)
        const address2 = await getnewaddress()
        addresses = [address, address2]
        await gen_blocks(address, 10)
        await gen_blocks(address2, 10)
        await client.connect({ protocol: "tcp", host: "127.0.0.1", port: "50002" })
    });

    afterAll(async () => {
        console.log(`killing child process: ${ta_process.pid}`)
        await process.kill(ta_process.pid, 'SIGTERM')
        //await ta_process.kill()
    })

    test('ping', async function () {
        let result = await client.ping()
        expect(result).toEqual(true)
    })


    test('latestBlockHeader', async function () {
        let header = await client.latestBlockHeader()
        console.log(`latest block header: ${JSON.stringify(header)}`)
        header = await client.latestBlockHeader()
        console.log(`latest block header: ${JSON.stringify(header)}`)
    })

    test('getTransaction', async function () {
        jest.setTimeout(10000)
        let address = await getnewaddress()
        let txid = await sendtoaddress(address, "0.1")
        await gen_blocks(addresses[0], 10)
        console.log(`getting transaction ${txid}`)
        let tx = await client.getTransaction(txid)
        console.log(tx)
    })

    test('getFeeEstimation', async function () {
        jest.setTimeout(20000)
        let est = await client.getFeeEstimation(1, "tb")
        console.log(`fee estimation: ${est}`)
    })

    test('broadcastTransaction', async function () {
        jest.setTimeout(20000)

        let address = await getnewaddress()
        let txid = await sendtoaddress(address, "0.1")
        await gen_blocks(addresses[0], 10)
        let tx = await client.getTransaction(txid)
        let tx_hex = tx.hex

        await expect(client.broadcastTransaction(tx_hex)).
            rejects.toThrow(Error("\"Transaction already in block chain\""))
    })

    test('getAddressListUnspent', async function () {
        let result = await client.getAddressListUnspent(addresses[0], network)
        console.log(result)
        expect(result.length > 0).toEqual(true)
    })

    test('addressSubscribe', async function () {
        jest.setTimeout(20000)
        let callbackCalled = false

        let result = await client.addressSubscribe(addresses[1], network, async (status) => {
            callbackCalled = true
        })
        console.log(`addressSubscribe: ${result}`)


        await gen_blocks(addresses[1], 1)

        await delay_s(10)
        console.log(`callbackCalled: ${callbackCalled}`)
        expect(callbackCalled).toEqual(true)

    })

    test('blockHeightSubscribe', async function () {
        jest.setTimeout(30000)
        let block_height = -1

        await client.blockHeightSubscribe(async (status) => {
            block_height = status[0].height
        })

        await gen_blocks(addresses[0], 1)

        await delay_s(10)

        expect(block_height > 0).toEqual(true)
    })

});