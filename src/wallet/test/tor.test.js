import { HttpClient, GET_ROUTE, POST_ROUTE } from '../http_client';
import { ElectrsClient } from '../electrs';
const handle_error = require('../../../tor-adapter/server/error').handle_error
const { join, dirname } = require('path');
const joinPath = join;
const rootPath = require('electron-root-path').rootPath;
const fork = require('child_process').fork;
const exec = require('child_process').exec;
var StatusCodeError = require('request-promise/errors').StatusCodeError
//const { expect } = require('chai')
//const { stub, match } = require('sinon')
const mockResponse = require('mock-req-res').mockResponse
//const proxyquire = require('proxyquire')

jest.setTimeout(30000);

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

describe('Tor', function () {

    let ta_process = undefined
    beforeEach(async () => {
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
        console.log(result)

        await new Promise(resolve => setTimeout(resolve, 500))
        console.log(`started tor child process: ${ta_process.pid}`);
    })

    afterEach(async () => {
        const pid = ta_process.pid
        try {
            if (pid === undefined) {
                return
            }
            process.kill(pid, "SIGTERM")
            await new Promise(resolve => setTimeout(resolve, 1000))
            //check if still running
            process.kill(pid, 0)
            //if still running wait, check again and send the kill signal
            await new Promise(resolve => setTimeout(resolve, 1000))
            process.kill(pid, 0)
            await new Promise(resolve => setTimeout(resolve, 1000))
            process.kill(pid, 0)
            console.log("process still running - sending kill signal...")
            process.kill(pid, "SIGKILL")
        } catch (err) {
            console.log(err?.message)
        }
    })


    describe('Tor server integration', function () {
        test('tor server get', async function () {
            const client = new HttpClient('http://localhost:3001');
            let result2 = undefined
            while (result2 === undefined) {
                try {
                    result2 = await client.get(GET_ROUTE.FEES, {});
                } catch (err) {
                    console.log(err.toString())
                }
            }
            console.log(result2.toString());
        });

        test.skip('tor server get unknown route', async function () {
            const client = new HttpClient('http://localhost:3001');

            try {
                await client.get('unknown route', {});
                expect().toBe(false);
            } catch (err) {
                console.log(err)
                expect(err.response.status).toBe(404);
            }
        });

        test.skip('tor server post unknown route', async function () {
            const client = new HttpClient('http://localhost:3001');

            let transfer_msg1 = {
                shared_key_id: "00000000000000000000000000000000",
                statechain_sig: "00000000000000000000000000000000"
            }
            try {
                let result2 = await client.post('unknown route', transfer_msg1);
                expect().toBe(false);
            } catch (err) {
                expect(err.response.status).toBe(400);
            }
        });

        test.skip('tor server unprocessable request', async function () {
            const client = new HttpClient('http://localhost:3001');

            let transfer_msg1 = {
                shared_key_id: "00000000000000000000000000000000",
                statechain_sig: "00000000000000000000000000000000"
            }
            try {
                let result2 = await client.post(POST_ROUTE.TRANSFER_SENDER, transfer_msg1);
                expect().toBe(false);
            } catch (err) {
                expect(err.response.status).toBe(422);
            }
        });

        test.skip('tor server post success', async function () {
            const client = new HttpClient('http://localhost:3001');

            let deposit_msg1 = {
                auth: "authstr",
                proof_key: String("029e95d1c597bd15eed0cd5fc15db25368202fc538a3a94a0b44753595f3aa4fc7")
            };

            let result = undefined
            while (result === undefined) {
                try {
                    result = await client.post(POST_ROUTE.DEPOSIT_INIT, deposit_msg1);
                    console.log(result);
                } catch (err) {
                    console.log(err.toString())
                }
            }
        });

        test('broadcast transaction with electrs', async function () {
            let electrsClient = new ElectrsClient('http://localhost:3001');
            const rawTX = "02000000000101f4f4122a966de965746014d37a881b603e21da33c5105f85acdb1c745a2b787f0100000000feffffff02d75b0400000000001976a9143ee50e81f9793779652efcdbdc20fe084a82915e88ac08fce919020000001976a914c954cc7eab07d293129b99652933c4d9189c18b688ac0247304402204808b6478fe9a4e6ad74bf664a21ed6243493b7057d5af67735e9de84c5489a5022013cda421cbb9d8ddd826b67debfcfc364948ed3a084406545d5b235a9fa8044a01210339bf12d03b9b95bc30e7a462713e729e2dc93bc4b942f71b891f2a3066cc2a9d97782100"
            let response = await electrsClient.broadcastTransaction(rawTX)
            console.log(response.toString())
        })


    });

    describe.skip('Tor server', function () {

        test.skip('set/get tor config', async function () {
            const client = new HttpClient('http://localhost:3001');

            let tor_config = {
                tor_proxy: {
                    ip: 'testipdfgvbcdgt',
                    port: 10000,
                    controlPassword: 'testPassworddfghbvfdc',
                    controlPort: 10020
                }
            }
            try {
                await set_config(client, tor_config);
            } catch (err) {
                console.log(err);
                expect().toBe(false);
            }

            let tor_config_resp = await client.get('tor_settings', {});
            console.log(JSON.stringify(tor_config_resp));
            expect(tor_config_resp.tor_proxy).toEqual(tor_config.tor_proxy);
        });



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



