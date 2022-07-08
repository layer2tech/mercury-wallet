/**
 * @jest-environment node
 */

import { HttpClient, GET_ROUTE, POST_ROUTE } from '../http_client';
import { ElectrsClient } from '../electrs';
import { assert } from 'console';
const handle_error = require('../../../tor-adapter/server/error').handle_error
const { join, dirname } = require('path');
const joinPath = join;
const rootPath = require('electron-root-path').rootPath;
const fork = require('child_process').fork;
const exec = require('child_process').exec;
const execSync = require('child_process').execSync;
var StatusCodeError = require('request-promise/errors').StatusCodeError
//const { expect } = require('chai')
//const { stub, match } = require('sinon')
const mockResponse = require('mock-req-res').mockResponse
//const proxyquire = require('proxyquire')

jest.setTimeout(60000);

let tor_config = {
  tor_proxy: {
    ip: 'localhost',
    port: 9060,
    controlPassword: '',
    controlPort: 9061
  },
  state_entity_endpoint: "",
  swap_conductor_endpoint: ""
}

let tor_endpoints = {
  state_entity_endpoint: "http://u3fi7yqrkv7jp5vwoui3e5rlgasnokbzg5uc42eltmsqbdqcxudsqjad.onion, http://lmfcwtytaxvfy6t6e7eumka3cvg3p7mhuybdj7iiaasndcqpskp5iwad.onion ",
  swap_conductor_endpoint: "http://u3fi7yqrkv7jp5vwoui3e5rlgasnokbzg5uc42eltmsqbdqcxudsqjad.onion, http://lmfcwtytaxvfy6t6e7eumka3cvg3p7mhuybdj7iiaasndcqpskp5iwad.onion ",
  electrum_endpoint: "https://blockstream.info/testnet/api"
}

async function set_config(client, config) {
  await client.post('tor_settings', config)
}

async function set_endpoints(client, config) {
  return await client.post('tor_endpoints', config)
}

async function get_endpoints(client, config) {
  return await client.get('tor_endpoints', {})
}

function get_port_pid(port) {
  const command = `lsof -i:${port}`
  console.log(`get_port_pid:`)
  let result = execSync(command);
  console.log(`result: ${result}`)
  result = result.toString().split(/\r?\n/)[1].split(/(\s+)/)[2];
  return result
}

async function kill_port_process(port) {
  const pid = get_port_pid(port)
  console.log(`killing pid: ${pid}`)
  if (pid != null) {
    try {
      process.kill(pid, "SIGTERM")
    } catch (err) {
      console.log(err?.message)
    }
  }
}

describe.skip('Tor', function () {

    let ta_process = undefined
    const bSkip = true

    if (bSkip == false) {
        beforeAll(async () => {
            let resourcesPath = joinPath(dirname(rootPath), 'mercury-wallet/resources');
            let execPath = joinPath(resourcesPath, 'linux');
            let torrc = joinPath(resourcesPath, 'etc', 'torrc');
            const tor_cmd = joinPath(execPath, 'tor');
            let tor_adapter_path = `${__dirname}/../../../tor-adapter/server/index.js`
            let user_data_path = `${__dirname}/data`
            let tor_adapter_args = [tor_cmd, torrc, user_data_path];
            console.log(`starting tor_adapter with args: ${tor_adapter_args.toString()}`)

            //let ta_process = exec("node /home/ldeacon/Projects/mercury-wallet/src /../tor-adapter/server/index.js/home/ldeacon/Projects/mercury-wallet/resources/linux/tor/home/ldeacon/Projects/mercury-wallet/resources/etc/torrc/home/ldeacon /.config/MercuryWallet/tor)
            ta_process = exec(`node ${tor_adapter_path} ${tor_cmd} ${torrc} ${user_data_path}`,
                {
                    detached: true,
                    stdio: 'ignore',
                },
                (error, stdout, _stderr) => {
                    if (error) {
                        console.log(`tor process error: ${error.toString()}`)
                    };
                }
            )
            const client = new HttpClient('http://localhost:3001');

            let result = await set_endpoints(client, tor_endpoints)
            console.log(`set tor endpoints: ${JSON.stringify(result)}`)
            expect(JSON.stringify(result)).toEqual(JSON.stringify({ "state_entity_endpoint": ["http://u3fi7yqrkv7jp5vwoui3e5rlgasnokbzg5uc42eltmsqbdqcxudsqjad.onion", " http://lmfcwtytaxvfy6t6e7eumka3cvg3p7mhuybdj7iiaasndcqpskp5iwad.onion "], "swap_conductor_endpoint": ["http://u3fi7yqrkv7jp5vwoui3e5rlgasnokbzg5uc42eltmsqbdqcxudsqjad.onion", " http://lmfcwtytaxvfy6t6e7eumka3cvg3p7mhuybdj7iiaasndcqpskp5iwad.onion "], "electrum_endpoint": ["https://blockstream.info/testnet/api"] }))

            return new Promise(resolve => setTimeout(resolve, 10000))
        })

        afterAll(async () => {
            await kill_port_process(3001)
            return new Promise(resolve => setTimeout(resolve, 0))
        })
    }
  describe('Tor server integration', function () {
    test('tor server get', async function () {
      const client = new HttpClient('http://localhost:3001');
      let result2 = undefined
      const n_tries = 10;
      let n = 0;
      while (result2 === undefined && n < n_tries) {
        try {
          result2 = await client.get(GET_ROUTE.FEES, {});
          console.log(`tor server get: ${JSON.stringify(result2)}`);
        } catch (err) {
          console.log(err.toString())
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      expect(JSON.stringify(result2)).toBe(JSON.stringify({ "address": "tb1qzvv6yfeg0navfkrxpqc0fjdsu9ey4qgqqsarq4", "deposit": 0, "withdraw": 50, "interval": 6, "initlock": 12960, "wallet_version": "0.6.5", "wallet_message": "" }))
    });

    test('tor server get unknown route', async function () {
      const client = new HttpClient('http://localhost:3001');

      try {
        await client.get('unknown route', {});
        expect().toBe(false);
      } catch (err) {
        expect(JSON.parse(err.message).statusCode).toBe(404);
      }
    });

    test('tor server post unknown route', async function () {
      const client = new HttpClient('http://localhost:3001');

      let transfer_msg1 = {
        shared_key_id: "00000000000000000000000000000000",
        statechain_sig: "00000000000000000000000000000000"
      }
      try {
        let result2 = await client.post('unknown route', transfer_msg1);
        expect().toBe(false);
      } catch (err) {
        console.log(`*****tpur: ${err}`)
        expect(JSON.parse(err.message).name).toBe("RequestError");
      }
    });

    test('tor server unprocessable request', async function () {
      const client = new HttpClient('http://localhost:3001');

      let transfer_msg1 = {
        shared_key_id: "00000000000000000000000000000000",
        statechain_sig: "00000000000000000000000000000000"
      }
      try {
        let result2 = await client.post(POST_ROUTE.TRANSFER_SENDER, transfer_msg1);
        expect().toBe(false);
      } catch (err) {
        console.log(`tor server unpro: ${err.message}`)
        expect(JSON.parse(err.message).statusCode).toBe(422);
      }
    });

    test('tor server post success', async function () {
      const client = new HttpClient('http://localhost:3001');

      let deposit_msg1 = {
        auth: "authstr",
        proof_key: String("029e95d1c597bd15eed0cd5fc15db25368202fc538a3a94a0b44753595f3aa4fc7")
      };

      let result = undefined
      const n_tries = 10
      let n = 0
      while (result === undefined && n < n_tries) {
        try {
          result = await client.post(POST_ROUTE.DEPOSIT_INIT, deposit_msg1);
          console.log(`***post success: ${result}`);
          return
        } catch (err) {
          console.log(err.toString())
        }
        n = n + 1;
      }
      throw Error("Expected result from deposit_init")
    });


    
    describe('electrs', function () {
      test('broadcast transaction', async function () {
        const electrsClient = new ElectrsClient('http://localhost:3001');
        const rawTX = "0100000000010159c2ae349c2dafd349253a9ac4f877c6e244b2ca8f6a5b8391e20a9323962f470000000000fdffffff021027000000000000160014e3c1f3b69ce67a7ab47b55749fe75162a62c341831db020000000000160014f796c0123e2924d09cc9cfb6007a534d85f306df0247304402201137cc0d643c04f2432deaad3d4f6e647e6c88486bacfb35fc2a2d491ce54e220220343787ff6e20aaa964e7aba34b6c270b39ced8446abd2ff892a1c5b50d4bafe5012102847c0858d0a5b5e78c3cb8096ee7d0fd08a3026f0b85c3f4122cb2420c50264e00000000"
        try {
          await electrsClient.broadcastTransaction(rawTX)
        } catch (err) {
          console.log(`*****bc: ${err}`)
          expect(JSON.parse(err.message).message.includes("Transaction already in block chain")).toEqual(true)
          return;
        }
        throw Error("Expected function to throw.")
      })

      test('get transaction', async function () {
        const electrsClient = new ElectrsClient('http://localhost:3001');
        const txid = "8197859978177a8f3cc41996cc59205eb9a7457e2a3bbd046e755ea71b3a6849"
        let response = await electrsClient.getTransaction(txid)
        expect(response).toEqual({ "txid": "8197859978177a8f3cc41996cc59205eb9a7457e2a3bbd046e755ea71b3a6849", "version": 2, "locktime": 2193559, "vin": [{ "txid": "7f782b5a741cdbac855f10c533da213e601b887ad314607465e96d962a12f4f4", "vout": 1, "prevout": { "scriptpubkey": "00146d75875954e6564f96ad5e1d80a3c5424c742e91", "scriptpubkey_asm": "OP_0 OP_PUSHBYTES_20 6d75875954e6564f96ad5e1d80a3c5424c742e91", "scriptpubkey_type": "v0_p2wpkh", "scriptpubkey_address": "tb1qd46cwk25uetyl94dtcwcpg79gfx8gt53r3j0np", "value": 9025000034 }, "scriptsig": "", "scriptsig_asm": "", "witness": ["304402204808b6478fe9a4e6ad74bf664a21ed6243493b7057d5af67735e9de84c5489a5022013cda421cbb9d8ddd826b67debfcfc364948ed3a084406545d5b235a9fa8044a01", "0339bf12d03b9b95bc30e7a462713e729e2dc93bc4b942f71b891f2a3066cc2a9d"], "is_coinbase": false, "sequence": 4294967294 }], "vout": [{ "scriptpubkey": "76a9143ee50e81f9793779652efcdbdc20fe084a82915e88ac", "scriptpubkey_asm": "OP_DUP OP_HASH160 OP_PUSHBYTES_20 3ee50e81f9793779652efcdbdc20fe084a82915e OP_EQUALVERIFY OP_CHECKSIG", "scriptpubkey_type": "p2pkh", "scriptpubkey_address": "mmFWb5pqUaKRaNJor7hF5var3tbAgieeDw", "value": 285655 }, { "scriptpubkey": "76a914c954cc7eab07d293129b99652933c4d9189c18b688ac", "scriptpubkey_asm": "OP_DUP OP_HASH160 OP_PUSHBYTES_20 c954cc7eab07d293129b99652933c4d9189c18b6 OP_EQUALVERIFY OP_CHECKSIG", "scriptpubkey_type": "p2pkh", "scriptpubkey_address": "mysVhY4gXeY1EGYAnKyLKNpvV17M5ZYUgL", "value": 9024699400 }], "size": 228, "weight": 585, "fee": 14979, "status": { "confirmed": true, "block_height": 2193560, "block_hash": "0000000000000026a0c8e16a6dbf7f954c93b7bd6b53e2a4307596efa6259f1b", "block_time": 1649241800 } })
      })
    })

   
  });

});


describe('tor-adapter handle_error', function () {

  test('handle StatusCodeError', function () {
    let res = mockResponse()
    let res_expected = mockResponse()
    let err = new StatusCodeError(401)
    res_expected.status(err.statusCode).json(JSON.stringify(err));
    handle_error(res, err)
    expect(JSON.stringify(res)).toEqual(JSON.stringify(res_expected))
  })

  test('handle error', function () {
    let res = mockResponse()
    let res_expected = mockResponse()
    let err = Error("a error")
    res_expected.status(400).json(JSON.stringify(err));
    handle_error(res, err)
    expect(JSON.stringify(res)).toEqual(JSON.stringify(res_expected))
  })

  

})

