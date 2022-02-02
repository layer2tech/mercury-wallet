import { SWAP_SECOND_SCE_ADDRESS } from '../mocks/mock_http_client'
import { GET_ROUTE, POST_ROUTE } from '../http_client';
import { makeTesterStatecoin } from './test_data.js'
import {
    SWAP_STATUS,
    SwapRetryError, UI_SWAP_STATUS
} from "../swap/swap_utils";
import { STATECOIN_STATUS } from '../statecoin'
import { Wallet, MOCK_WALLET_NAME } from '../wallet'
import * as MOCK_SERVER from '../mocks/mock_http_client'
import Swap from '../swap/swap'
import { swapPhase3 as swapPhase3Steps } from '../swap/swap.phase3'
import { COMMITMENT_DATA, SWAP_SHARED_KEY_OUT } from './test_data.js'

let walletName = `${MOCK_WALLET_NAME}_swap_phase3_tests`

let cloneDeep = require('lodash.clonedeep');
let bitcoin = require('bitcoinjs-lib')


let mock_http_client = require('../mocks/mock_http_client')
let mock_wasm = require('../mocks/mock_wasm')


// client side's mock
let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
// server side's mock
let http_mock = jest.genMockFromModule('../mocks/mock_http_client');
//electrum mock
let electrum_mock = jest.genMockFromModule('../mocks/mock_electrum.ts');

const post_error = (path, body) => {
    return new Error(`Error from POST request - path: ${path}, body: ${body}`)
}
const get_error = (path, params) => {
    return new Error(`Error from GET request - path: ${path}, params: ${params}`)
}
const wasm_err = (message) => {
    return new Error(`Error from wasm_client: ${message}`)
}

//Set a valid initial statecoin status for phase3
const init_phase3_status = (statecoin) => {
    //Set valid statecoin status
    statecoin.status = STATECOIN_STATUS.IN_SWAP
    //Set valid swap status
    statecoin.swap_status = SWAP_STATUS.Phase3
    //Set swap_id to some value
    statecoin.swap_id = { "id": "a swap id" }


    //Set my_bst_data to some value
    statecoin.swap_my_bst_data = "a my bst data"
    //Set swap_info to some value
    statecoin.swap_info = mock_http_client.SWAP_INFO
    //Set swap address from phase1
    statecoin.swap_address = "a swap address"
    // Set ui sstatus
    statecoin.ui_swap_status = UI_SWAP_STATUS.Phase5
    // Set swap receiver address to mock value
    statecoin.swap_receiver_addr = SWAP_SECOND_SCE_ADDRESS

    // check this - which phase was it added ?
    statecoin.shared_key = SWAP_SHARED_KEY_OUT
}

const proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));


async function swapPhase3(swap) {
    swap.setSwapSteps(swapPhase3Steps(swap))
    let result
    for (let i = 0; i < swap.swap_steps.length; i++) {
        result = await swap.doNext()
        if (result.is_ok() !== true) {
            console.log(`retry at step: ${swap.getNextStep().description()}`)
            return result
        }
    }
    return result
}

function getWallet() {
    let wallet = Wallet.buildMock(bitcoin.networks.bitcoin, walletName);
    wallet.config.min_anon_set = 3
    wallet.config.jest_testing_mode = true
    wallet.http_client = http_mock
    wallet.electrum_mock = electrum_mock
    wallet.wasm = wasm_mock
    return wallet
}

function checkRetryMessage(swapStepResult, message) {
    expect(swapStepResult.is_ok()).toEqual(false)
    expect(swapStepResult.message).toEqual(message)
}

describe('swapPhase3', () => {
    test('swapPhase3 test 1 - SwapStep1: invalid initial statecoin state', async () => {

        let statecoin = makeTesterStatecoin();
        let wallet = getWallet()
        let swap

        //Test invalid statecoin statuses
        for (let i = 0; i < STATECOIN_STATUS.length; i++) {
            if (STATECOIN_STATUS[i] !== STATECOIN_STATUS.IN_SWAP) {
                const sc_status = STATECOIN_STATUS[i]
                statecoin.status = cloneDeep(sc_status)
                swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der)
                await expect(swapPhase3(swap))
                    .rejects
                    .toThrowError(`phase Phase3:pollSwapPhase3: invalid swap status: ${statecoin.swap_status}`)
            }
        }

        //Set valid statecoin status
        statecoin.status = STATECOIN_STATUS.IN_SWAP

        //Test invalid statecoin swap statuses
        for (let i = 0; i < SWAP_STATUS.length; i++) {
            if (SWAP_STATUS[i] !== SWAP_STATUS.Phase3) {
                const swap_status = STATECOIN_STATUS[i]
                statecoin.swap_status = cloneDeep(swap_status)
                swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der)
                await expect(swapPhase3(swap))
                    .rejects.toThrowError(`phase Phase3:pollSwapPhase3: invalid swap status: ${statecoin.swap_status}`)
            }
        }

        statecoin.swap_status = null
        swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der)
        await expect(swapPhase3(swap))
            .rejects.toThrowError(`phase Phase3:pollSwapPhase3: invalid swap status: ${statecoin.swap_status}`)

        //Set valid swap status
        statecoin.swap_status = SWAP_STATUS.Phase3

        //Test invalid swap_id and swap_my_bst_data
        statecoin.swap_id = null
        statecoin.swap_my_bst_data = null
        statecoin.swap_info = null
        swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der)

        await expect(swapPhase3(swap))
            .rejects.toThrowError("No Swap ID found. Swap ID should be set in Phase0.")

        statecoin.swap_id = "a swap id"
        swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der)

        await expect(swapPhase3(swap))
            .rejects.toThrowError("No swap info found for coin. Swap info should be set in Phase1.")

        statecoin.swap_info = mock_http_client.SWAP_INFO;
        swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der)

        await expect(swapPhase3(swap))
            .rejects.toThrowError("No swap address found for coin. Swap address should be set in Phase1")

        statecoin.swap_address = "a swap address"
        swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der)

        await expect(swapPhase3(swap))
            .rejects.toThrowError("No receiver address found for coin. Receiver address should be set in Phase1")

        statecoin.swap_receiver_addr = mock_http_client.SWAP_SECOND_SCE_ADDRESS;
    })

    test('swapPhase3 test 2 - SwapStep1: server responds to pollSwap with miscellaneous error', async () => {

        const server_error = () => { return new Error("Misc server error") }
        http_mock.post = jest.fn((path, body) => {
            if (path === POST_ROUTE.SWAP_POLL_SWAP) {
                throw server_error()
            }
        })

        let statecoin = makeTesterStatecoin();

        init_phase3_status(statecoin)

        const INIT_STATECOIN = cloneDeep(statecoin)
        const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)

        let wallet = getWallet()
        let swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der)

        checkRetryMessage(await swapPhase3(swap),
            `${server_error().message}`)

        //Expect statecoin and proof_key_der to be unchanged
        expect(statecoin).toEqual(INIT_STATECOIN)
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER)
    })

    test('swapPhase3 test 3 - SwapStep1: server responds to pollSwap with null or invalid status', async () => {

        let statecoin = makeTesterStatecoin();

        //Set valid statecoin status
        init_phase3_status(statecoin)

        const INIT_STATECOIN = cloneDeep(statecoin)
        const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)

        http_mock.post = jest.fn((path, body) => {
            if (path === POST_ROUTE.SWAP_POLL_SWAP) {
                return null
            }
        })

        let wallet = getWallet()
        let swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der)

        await expect(swapPhase3(swap))
            .rejects.toThrow(Error)
        await expect(swapPhase3(swap))
            .rejects.toThrowError("Swap halted at phase 3")

        //Test unexpected phases
        for (let i = 0; i < SWAP_STATUS.length; i++) {
            const phase = SWAP_STATUS[i]
            if (phase !== SWAP_STATUS.Phase3) {
                http_mock.post = jest.fn((path, body) => {
                    if (path === POST_ROUTE.SWAP_POLL_SWAP) {
                        return phase
                    }
                })
                await expect(swapPhase3(swap))
                    .rejects.toThrow(Error)
                await expect(swapPhase3(swap))
                    .rejects.toThrowError(`Swap error: Expected swap phase3. Received: ${phase}`)
            }
        }

        //Expect statecoin and proof_key_der to be unchanged
        expect(statecoin).toEqual(INIT_STATECOIN)
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER)

    })

    test('swapPhase3 test 4 - SwapStep2: server responds with Error to request getFeeInfo() in transferSender()', async () => {

        http_mock.post = jest.fn((path, body) => {
            if (path === POST_ROUTE.SWAP_POLL_SWAP) {
                return SWAP_STATUS.Phase4
            }
        })

        http_mock.get = jest.fn((path, params) => {
            if (path === GET_ROUTE.FEES) {
                throw get_error(path)
            }
        })

        let statecoin = makeTesterStatecoin();

        //Set valid statecoin status
        init_phase3_status(statecoin);

        const INIT_STATECOIN = cloneDeep(statecoin);
        const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der);

        let wallet = getWallet()
        let swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der)

        checkRetryMessage(await swapPhase3(swap),
            "Error from GET request - path: info/fee, params: undefined")

        //Expect statecoin and proof_key_der to be unchanged
        expect(statecoin).toEqual(INIT_STATECOIN)
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER)
    })

    test('swapPhase3 test 5 - SwapStep2: server responds with Error to request getStateCoin() in transferSender()', async () => {

        http_mock.post = jest.fn((path, body) => {
            if (path === POST_ROUTE.SWAP_POLL_SWAP) {
                return SWAP_STATUS.Phase4
            }
        })

        http_mock.get = jest.fn((path, params) => {
            if (path === GET_ROUTE.FEES) {
                return MOCK_SERVER.FEE_INFO;
            }
            if (path === GET_ROUTE.STATECOIN) {
                throw get_error(path)
            }
        })

        let statecoin = makeTesterStatecoin();

        //Set valid statecoin status
        init_phase3_status(statecoin)

        const INIT_STATECOIN = cloneDeep(statecoin)
        const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)

        let wallet = getWallet()
        let swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der)

        checkRetryMessage(await swapPhase3(swap),
            "Error from GET request - path: info/statecoin, params: undefined")


        //Expect statecoin and proof_key_der to be unchanged
        expect(statecoin).toEqual(INIT_STATECOIN)
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER)
    })

    test('swapPhase3 test 6 - SwapStep2: server responds with error to POST_ROUTE.TRANSFER_SENDER in transferSender()', async () => {
        http_mock.post = jest.fn((path, body) => {
            if (path === POST_ROUTE.SWAP_POLL_SWAP) {
                return SWAP_STATUS.Phase4
            }
            if (path === POST_ROUTE.TRANSFER_SENDER) {
                throw post_error(path);
            }
        })

        http_mock.get = jest.fn((path, params) => {
            if (path === GET_ROUTE.FEES) {
                return MOCK_SERVER.FEE_INFO;
            }
            if (path === GET_ROUTE.STATECOIN) {
                return MOCK_SERVER.STATECOIN_INFO;
            }
        })

        // todo
        let statecoin = makeTesterStatecoin();

        //Set valid statecoin status
        init_phase3_status(statecoin)

        const INIT_STATECOIN = cloneDeep(statecoin)
        const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)

        let wallet = getWallet()
        let swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der)

        checkRetryMessage(await swapPhase3(swap),
            `${post_error(POST_ROUTE.TRANSFER_SENDER).message}`)

        //Expect statecoin and proof_key_der to be unchanged
        expect(statecoin).toEqual(INIT_STATECOIN)
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER)
    })

    test('swapPhase3 test 7 - SwapStep2: an invalid data type is returned from request for POST.TRANSFER_SENDER in transferSender()', async () => {
        http_mock.post = jest.fn((path, body) => {
            if (path === POST_ROUTE.SWAP_POLL_SWAP) {
                return SWAP_STATUS.Phase4
            }
            if (path === POST_ROUTE.TRANSFER_SENDER) {
                return { invalid_transfer_sender: "some transfer sender" };
            }
        })

        http_mock.get = jest.fn((path, params) => {
            if (path === GET_ROUTE.FEES) {
                return MOCK_SERVER.FEE_INFO;
            }
            if (path === GET_ROUTE.STATECOIN) {
                return MOCK_SERVER.STATECOIN_INFO;
            }
        })

        const transfer_missing_x1_error = "Expected property \"x1\" of type Object, got undefined";

        let statecoin = makeTesterStatecoin();

        //Set valid statecoin status
        init_phase3_status(statecoin)

        const INIT_STATECOIN = cloneDeep(statecoin)
        const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)

        let wallet = getWallet()
        let swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der)

        checkRetryMessage(await swapPhase3(swap),
            transfer_missing_x1_error)

        expect(statecoin).toEqual(INIT_STATECOIN);
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER);
    })

    test('swapPhase3 test 8 - SwapStep2: server responds with error to POST.PREPARE_SIGN in transferSender()', async () => {
        http_mock.post = jest.fn((path, body) => {
            if (path === POST_ROUTE.SWAP_POLL_SWAP) {
                return SWAP_STATUS.Phase4
            }
            if (path === POST_ROUTE.TRANSFER_SENDER) {
                return MOCK_SERVER.TRANSFER_SENDER;
            }
            if (path === POST_ROUTE.PREPARE_SIGN) {
                throw post_error(path);
            }
        })

        http_mock.get = jest.fn((path, params) => {
            if (path === GET_ROUTE.FEES) {
                return MOCK_SERVER.FEE_INFO;
            }
            if (path === GET_ROUTE.STATECOIN) {
                return MOCK_SERVER.STATECOIN_INFO;
            }
        })

        let statecoin = makeTesterStatecoin();

        //Set valid statecoin status
        init_phase3_status(statecoin)

        const INIT_STATECOIN = cloneDeep(statecoin)
        const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)

        let wallet = getWallet()
        let swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der)


        checkRetryMessage(await swapPhase3(swap),
            "Error from POST request - path: prepare-sign, body: undefined")

        expect(statecoin).toEqual(INIT_STATECOIN);
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER);
    })

    test('swapPhase3 test 9 - SwapStep2: server responds with error to POST.SIGN_FIRST in transferSender()', async () => {
        http_mock.post = jest.fn((path, body) => {
            if (path === POST_ROUTE.SWAP_POLL_SWAP) {
                return SWAP_STATUS.Phase4
            }
            if (path === POST_ROUTE.TRANSFER_SENDER) {
                return MOCK_SERVER.TRANSFER_SENDER;
            }
            if (path === POST_ROUTE.PREPARE_SIGN) {
                return MOCK_SERVER.PREPARE_SIGN;
            }
            if (path === POST_ROUTE.TRANSFER_PUBKEY) {
                return MOCK_SERVER.TRANSFER_PUBKEY;
            }
            if (path === POST_ROUTE.SIGN_FIRST) {
                throw post_error(path);
            }
        })

        http_mock.get = jest.fn((path, params) => {
            if (path === GET_ROUTE.FEES) {
                return MOCK_SERVER.FEE_INFO;
            }
            if (path === GET_ROUTE.STATECOIN) {
                return MOCK_SERVER.STATECOIN_INFO;
            }
        })

        wasm_mock.Sign.first_message = jest.fn((_secret_key) => {
            throw wasm_err("Sign.first_message");
        })

        wasm_mock.KeyGen.first_message = jest.fn((_secret_key) => {
            throw wasm_err("KeyGen.first_message");
        })

        let statecoin = makeTesterStatecoin();

        //Set valid statecoin status
        init_phase3_status(statecoin)

        const INIT_STATECOIN = cloneDeep(statecoin)
        const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)

        let wallet = getWallet()
        let swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der)

        checkRetryMessage(await swapPhase3(swap),
            "Error from wasm_client: Sign.first_message")

        expect(statecoin).toEqual(INIT_STATECOIN);
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER);
    })

    test('swapPhase3 test 10 - SwapStep2: server responds with error to POST.SIGN_SECOND in transferSender()', async () => {
        http_mock.post = jest.fn((path, body) => {
            if (path === POST_ROUTE.SWAP_POLL_SWAP) {
                return SWAP_STATUS.Phase4
            }
            if (path === POST_ROUTE.TRANSFER_SENDER) {
                return MOCK_SERVER.TRANSFER_SENDER;
            }
            if (path === POST_ROUTE.PREPARE_SIGN) {
                return MOCK_SERVER.PREPARE_SIGN;
            }
            if (path === POST_ROUTE.SIGN_FIRST) {
                return MOCK_SERVER.SIGN_FIRST;
            }
            if (path === POST_ROUTE.SIGN_SECOND) {
                throw post_error(path);
            }
        })

        http_mock.get = jest.fn((path, params) => {
            if (path === GET_ROUTE.FEES) {
                return MOCK_SERVER.FEE_INFO;
            }
            if (path === GET_ROUTE.STATECOIN) {
                return MOCK_SERVER.STATECOIN_INFO;
            }
        })

        wasm_mock.Sign.first_message = jest.fn((_secret_key) => {
            return mock_wasm.SIGN_FIRST
        })

        wasm_mock.Sign.second_message = jest.fn((_secret_key) => {
            return mock_wasm.SIGN_SECOND
        })

        wasm_mock.KeyGen.first_message = jest.fn((_secret_key) => {
            return mock_wasm.KEYGEN_FIRST;
        })

        let statecoin = makeTesterStatecoin();

        //Set valid statecoin status
        init_phase3_status(statecoin)

        const INIT_STATECOIN = cloneDeep(statecoin)
        const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)

        let wallet = getWallet()
        let swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der)


        checkRetryMessage(await swapPhase3(swap),
            "Error from POST request - path: ecdsa/sign/second, body: undefined");

        expect(statecoin).toEqual(INIT_STATECOIN);
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER);
    })

    test('swapPhase3 test 11 - SwapStep2: server responds with error to POST.TRANSFER_UPDATE_MSG in transferSender()', async () => {
        http_mock.post = jest.fn((path, body) => {
            if (path === POST_ROUTE.SWAP_POLL_SWAP) {
                return SWAP_STATUS.Phase4
            }
            if (path === POST_ROUTE.TRANSFER_SENDER) {
                return MOCK_SERVER.TRANSFER_SENDER;
            }
            if (path === POST_ROUTE.PREPARE_SIGN) {
                return MOCK_SERVER.PREPARE_SIGN;
            }
            if (path === POST_ROUTE.SIGN_FIRST) {
                return MOCK_SERVER.SIGN_FIRST;
            }
            if (path === POST_ROUTE.SIGN_SECOND) {
                return MOCK_SERVER.SIGN_SECOND;
            }
            if (path === POST_ROUTE.TRANSFER_UPDATE_MSG) {
                throw post_error(path);
            }
        })

        http_mock.get = jest.fn((path, params) => {
            if (path === GET_ROUTE.FEES) {
                return MOCK_SERVER.FEE_INFO;
            }
            if (path === GET_ROUTE.STATECOIN) {
                return MOCK_SERVER.STATECOIN_INFO;
            }
        })

        wasm_mock.Sign.first_message = jest.fn((_secret_key) => {
            return mock_wasm.SIGN_FIRST
        })

        wasm_mock.Sign.second_message = jest.fn((_secret_key) => {
            return mock_wasm.SIGN_SECOND
        })

        wasm_mock.Commitment.make_commitment = jest.fn(() => JSON.stringify(COMMITMENT_DATA[0].batch_data));

        const jsdomAlert = window.alert;
        window.alert = () => { };

        let statecoin = makeTesterStatecoin();

        //Set valid statecoin status
        init_phase3_status(statecoin)

        const INIT_STATECOIN = cloneDeep(statecoin)
        const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)

        let wallet = getWallet()
        let swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der)


        /*
        checkRetryMessage(await swapPhase3(swap),
            "Error from POST request - path: transfer/update_msg, body: undefined.")*/

        // TODO
        // This test needs to check for a warning rather than an ERROR - specifically the line below:
        // const warning = `Warning: failed to send the transfer message to the server due to error: ${err_msg}. Please send it to the statecoin recipient manually.`

        expect(statecoin).toEqual(INIT_STATECOIN);
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER);

        // restore
        window.alert = jsdomAlert;
    })

    test('swapPhase3 test 12 - SwapStep3: check make_swap_commitment data', async () => {
        http_mock.post = jest.fn((path, body) => {
            if (path === POST_ROUTE.SWAP_POLL_SWAP) {
                return SWAP_STATUS.Phase4
            }
            if (path === POST_ROUTE.TRANSFER_SENDER) {
                return MOCK_SERVER.TRANSFER_SENDER;
            }
            if (path === POST_ROUTE.PREPARE_SIGN) {
                return MOCK_SERVER.PREPARE_SIGN;
            }
            if (path === POST_ROUTE.SIGN_FIRST) {
                return MOCK_SERVER.SIGN_FIRST;
            }
            if (path === POST_ROUTE.SIGN_SECOND) {
                return MOCK_SERVER.SIGN_SECOND;
            }
            if (path === POST_ROUTE.TRANSFER_UPDATE_MSG) {
                return MOCK_SERVER.TRANSFER_UPDATE_MSG;
            }
        })

        http_mock.get = jest.fn((path, params) => {
            if (path === GET_ROUTE.FEES) {
                return MOCK_SERVER.FEE_INFO;
            }
            if (path === GET_ROUTE.STATECOIN) {
                return MOCK_SERVER.STATECOIN_INFO;
            }
        })

        wasm_mock.Sign.first_message = jest.fn((_secret_key) => {
            return mock_wasm.SIGN_FIRST
        })

        wasm_mock.Sign.second_message = jest.fn((_secret_key) => {
            return mock_wasm.SIGN_SECOND
        })

        wasm_mock.Commitment.make_commitment = jest.fn(() => JSON.stringify(COMMITMENT_DATA[0].batch_data));

        const jsdomAlert = window.alert;
        window.alert = () => { };

        let statecoin = makeTesterStatecoin();

        //Set valid statecoin status
        init_phase3_status(statecoin)

        const INIT_STATECOIN = cloneDeep(statecoin)
        const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)

        let wallet = getWallet()
        let swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der)

        await swapPhase3(swap);

        // expect statecoin and proof key to change
        expect(INIT_STATECOIN).not.toEqual(statecoin);
        expect(INIT_PROOF_KEY_DER).not.toEqual(proof_key_der);

        // check UI changed from Phase5 to Phase6
        expect(statecoin.ui_swap_status).toEqual(UI_SWAP_STATUS.Phase6);

        let expected_swap_batch_data = { "commitment": "7aef2a9771923a485161095ae2314b2a374d223ec1ff67f7602398b3118b445d", "nonce": [118, 94, 232, 150, 99, 240, 44, 21, 13, 91, 170, 84, 58, 234, 242, 220, 184, 197, 137, 219, 179, 125, 111, 165, 233, 100, 228, 21, 79, 170, 3, 238] };
        // check swap commitment
        expect(statecoin.swap_batch_data).toEqual(expected_swap_batch_data);

        // restore
        window.alert = jsdomAlert;
    })

    test('swapPhase3 test 13 - SwapStep4: server responds with error to GET TRANSFER_GET_MSG_ADDR in do_transfer_receiver()', async () => {
        http_mock.post = jest.fn((path, body) => {
            if (path === POST_ROUTE.SWAP_POLL_SWAP) {
                return SWAP_STATUS.Phase4
            }
            if (path === POST_ROUTE.TRANSFER_SENDER) {
                return MOCK_SERVER.TRANSFER_SENDER;
            }
            if (path === POST_ROUTE.PREPARE_SIGN) {
                return MOCK_SERVER.PREPARE_SIGN;
            }
            if (path === POST_ROUTE.SIGN_FIRST) {
                return MOCK_SERVER.SIGN_FIRST;
            }
            if (path === POST_ROUTE.SIGN_SECOND) {
                return MOCK_SERVER.SIGN_SECOND;
            }
            if (path === POST_ROUTE.TRANSFER_UPDATE_MSG) {
                return MOCK_SERVER.TRANSFER_UPDATE_MSG;
            }
        })

        http_mock.get = jest.fn((path, params) => {
            if (path === GET_ROUTE.FEES) {
                return MOCK_SERVER.FEE_INFO;
            }
            if (path === GET_ROUTE.STATECOIN) {
                return MOCK_SERVER.STATECOIN_INFO;
            }
            if (path === GET_ROUTE.TRANSFER_GET_MSG_ADDR) {
                return get_error(path);
            }
        })

        wasm_mock.Sign.first_message = jest.fn((_secret_key) => {
            return mock_wasm.SIGN_FIRST
        })

        wasm_mock.Sign.second_message = jest.fn((_secret_key) => {
            return mock_wasm.SIGN_SECOND
        })

        wasm_mock.Commitment.make_commitment = jest.fn(() => JSON.stringify(COMMITMENT_DATA[0].batch_data));

        const jsdomAlert = window.alert;
        window.alert = () => { };

        let statecoin = makeTesterStatecoin();

        //Set valid statecoin status
        init_phase3_status(statecoin)

        const INIT_STATECOIN = cloneDeep(statecoin)
        const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)

        let wallet = getWallet()
        let swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der)

        checkRetryMessage(await swapPhase3(swap),
            `${server_error().message}`)

        // expect statecoin and proof key to change
        expect(INIT_STATECOIN).not.toEqual(statecoin);
        expect(INIT_PROOF_KEY_DER).not.toEqual(proof_key_der);

        // check UI changed from Phase5 to Phase6
        expect(statecoin.ui_swap_status).toEqual(UI_SWAP_STATUS.Phase6);

        let expected_swap_batch_data = { "commitment": "7aef2a9771923a485161095ae2314b2a374d223ec1ff67f7602398b3118b445d", "nonce": [118, 94, 232, 150, 99, 240, 44, 21, 13, 91, 170, 84, 58, 234, 242, 220, 184, 197, 137, 219, 179, 125, 111, 165, 233, 100, 228, 21, 79, 170, 3, 238] };
        // check swap commitment
        expect(statecoin.swap_batch_data).toEqual(expected_swap_batch_data);

        // restore
        window.alert = jsdomAlert;
    })

    test('swapPhase3 test 14 - SwapStep4: await transferReceiver, server responds with  error to getStateChain', async () => {
        // let statechain_data = await getStateChain(http_client, transfer_msg3.statechain_id);
        // let new_shared_key_id = await getOwner(http_client, transfer_msg3.statechain_id);
        // let fee_info: FeeInfo = await getFeeInfo(http_client);
        // let funding_tx_data = await electrum_client.getScriptHashListUnspent(out_script);
        // let tx_data: any = await electrum_client.getTransaction(statechain_data.utxo.txid);
        // let s1_pubkey = await http_client.post(POST_ROUTE.TRANSFER_PUBKEY, user_id);
        // let transfer_msg5: TransferMsg5 = await http_client.post(POST_ROUTE.TRANSFER_RECEIVER, transfer_msg4);

        http_mock.post = jest.fn((path, body) => {
            if (path === POST_ROUTE.SWAP_POLL_SWAP) {
                return SWAP_STATUS.Phase4
            }
            if (path === POST_ROUTE.TRANSFER_SENDER) {
                return MOCK_SERVER.TRANSFER_SENDER;
            }
            if (path === POST_ROUTE.PREPARE_SIGN) {
                return MOCK_SERVER.PREPARE_SIGN;
            }
            if (path === POST_ROUTE.SIGN_FIRST) {
                return MOCK_SERVER.SIGN_FIRST;
            }
            if (path === POST_ROUTE.SIGN_SECOND) {
                return MOCK_SERVER.SIGN_SECOND;
            }
            if (path === POST_ROUTE.TRANSFER_UPDATE_MSG) {
                return MOCK_SERVER.TRANSFER_UPDATE_MSG;
            }
        })

        http_mock.get = jest.fn((path, params) => {
            if (path === GET_ROUTE.FEES) {
                return MOCK_SERVER.FEE_INFO;
            }
            if (path === GET_ROUTE.STATECOIN) {
                return MOCK_SERVER.STATECOIN_INFO;
            }
            if (path === GET_ROUTE.TRANSFER_GET_MSG_ADDR) {
                return MOCK_SERVER.TRANSFER_GET_MSG_ADDR;
            }
            if (path === GET_ROUTE.STATECHAIN) {
                return get_error(path);
            }
        })

        let statecoin = makeTesterStatecoin();

        //Set valid statecoin status
        init_phase3_status(statecoin)

        const INIT_STATECOIN = cloneDeep(statecoin)
        const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)

        let wallet = getWallet()
        let swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der)

        /*
        checkRetryMessage(await swapPhase3(swap),
            "Expected property \"pubkey\" of type ?isPoint, got Buffer")
        */

        expect(statecoin).toEqual(INIT_STATECOIN);
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER);
    })

    test('swapPhase3 test 15 - SwapStep4: await transferReceiver, server responds with error to getOwner', async () => {
        http_mock.post = jest.fn((path, body) => {
            if (path === POST_ROUTE.SWAP_POLL_SWAP) {
                return SWAP_STATUS.Phase4
            }
            if (path === POST_ROUTE.TRANSFER_SENDER) {
                return MOCK_SERVER.TRANSFER_SENDER;
            }
            if (path === POST_ROUTE.PREPARE_SIGN) {
                return MOCK_SERVER.PREPARE_SIGN;
            }
            if (path === POST_ROUTE.SIGN_FIRST) {
                return MOCK_SERVER.SIGN_FIRST;
            }
            if (path === POST_ROUTE.SIGN_SECOND) {
                return MOCK_SERVER.SIGN_SECOND;
            }
            if (path === POST_ROUTE.TRANSFER_UPDATE_MSG) {
                return MOCK_SERVER.TRANSFER_UPDATE_MSG;
            }
        })

        http_mock.get = jest.fn((path, params) => {
            if (path === GET_ROUTE.FEES) {
                return MOCK_SERVER.FEE_INFO;
            }
            if (path === GET_ROUTE.STATECOIN) {
                return MOCK_SERVER.STATECOIN_INFO;
            }
            if (path === GET_ROUTE.TRANSFER_GET_MSG_ADDR) {
                return MOCK_SERVER.TRANSFER_GET_MSG_ADDR;
            }
            if (path === GET_ROUTE.STATECHAIN) {
                return MOCK_SERVER.STATECHAIN_INFO;
            }
            if (path === GET_ROUTE.ROOT) {
                return get_error(path);
            }
        })

        let statecoin = makeTesterStatecoin();

        //Set valid statecoin status
        init_phase3_status(statecoin)

        const INIT_STATECOIN = cloneDeep(statecoin)
        const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)

        let wallet = getWallet()
        let swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der)

        /*
        checkRetryMessage(await swapPhase3(swap),
            "Expected property \"pubkey\" of type ?isPoint, got Buffer")
        */

        expect(statecoin).toEqual(INIT_STATECOIN);
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER);
    })

    test('swapPhase3 test 16 - SwapStep4: - await transferReceiver, server responds with error to getFeeInfo', async () => {
        http_mock.post = jest.fn((path, body) => {
            if (path === POST_ROUTE.SWAP_POLL_SWAP) {
                return SWAP_STATUS.Phase4
            }
            if (path === POST_ROUTE.TRANSFER_SENDER) {
                return MOCK_SERVER.TRANSFER_SENDER;
            }
            if (path === POST_ROUTE.PREPARE_SIGN) {
                return MOCK_SERVER.PREPARE_SIGN;
            }
            if (path === POST_ROUTE.SIGN_FIRST) {
                return MOCK_SERVER.SIGN_FIRST;
            }
            if (path === POST_ROUTE.SIGN_SECOND) {
                return MOCK_SERVER.SIGN_SECOND;
            }
            if (path === POST_ROUTE.TRANSFER_UPDATE_MSG) {
                return MOCK_SERVER.TRANSFER_UPDATE_MSG;
            }
        })

        let firstTry = true;
        http_mock.get = jest.fn((path, params) => {
            if (path === GET_ROUTE.FEES && firstTry) {
                firstTry = false;
                return MOCK_SERVER.FEE_INFO;
            } else if (path === GET_ROUTE.FEES && !firstTry) {
                // on second attempt of GetFeeInfo -> error
                return get_error(path);
            }
            if (path === GET_ROUTE.STATECOIN) {
                return MOCK_SERVER.STATECOIN_INFO;
            }
            if (path === GET_ROUTE.TRANSFER_GET_MSG_ADDR) {
                return MOCK_SERVER.TRANSFER_GET_MSG_ADDR;
            }
            if (path === GET_ROUTE.STATECHAIN) {
                return MOCK_SERVER.STATECHAIN_INFO;
            }
            if (path === GET_ROUTE.ROOT) {
                return MOCK_SERVER.ROOT_INFO;
            }
        })

        let statecoin = makeTesterStatecoin();

        //Set valid statecoin status
        init_phase3_status(statecoin)

        const INIT_STATECOIN = cloneDeep(statecoin)
        const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)

        let wallet = getWallet()
        let swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der)

        /*
        checkRetryMessage(await swapPhase3(swap),
            "Expected property \"pubkey\" of type ?isPoint, got Buffer")
        */

        expect(statecoin).toEqual(INIT_STATECOIN);
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER);
    })

    test('swapPhase3 test 17 - SwapStep4: await transferReceiver, server responds with error to POST.TRANSFER_PUBKEY', async () => {
        http_mock.post = jest.fn((path, body) => {
            if (path === POST_ROUTE.SWAP_POLL_SWAP) {
                return SWAP_STATUS.Phase4
            }
            if (path === POST_ROUTE.TRANSFER_SENDER) {
                return MOCK_SERVER.TRANSFER_SENDER;
            }
            if (path === POST_ROUTE.PREPARE_SIGN) {
                return MOCK_SERVER.PREPARE_SIGN;
            }
            if (path === POST_ROUTE.SIGN_FIRST) {
                return MOCK_SERVER.SIGN_FIRST;
            }
            if (path === POST_ROUTE.SIGN_SECOND) {
                return MOCK_SERVER.SIGN_SECOND;
            }
            if (path === POST_ROUTE.TRANSFER_UPDATE_MSG) {
                return MOCK_SERVER.TRANSFER_UPDATE_MSG;
            }
            if (path === POST_ROUTE.TRANSFER_PUBKEY) {
                return post_error(path);
            }
        })

        http_mock.get = jest.fn((path, params) => {
            if (path === GET_ROUTE.FEES) {
                return MOCK_SERVER.FEE_INFO;
            }
            if (path === GET_ROUTE.STATECOIN) {
                return MOCK_SERVER.STATECOIN_INFO;
            }
            if (path === GET_ROUTE.TRANSFER_GET_MSG_ADDR) {
                return MOCK_SERVER.TRANSFER_GET_MSG_ADDR;
            }
            if (path === GET_ROUTE.STATECHAIN) {
                return MOCK_SERVER.STATECHAIN_INFO;
            }
            if (path === GET_ROUTE.ROOT) {
                return MOCK_SERVER.ROOT_INFO;
            }
        })

        let statecoin = makeTesterStatecoin();

        //Set valid statecoin status
        init_phase3_status(statecoin)

        const INIT_STATECOIN = cloneDeep(statecoin)
        const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)

        let wallet = getWallet()
        let swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der)

        /*
        checkRetryMessage(await swapPhase3(swap),
            "Expected property \"pubkey\" of type ?isPoint, got Buffer")
        */

        expect(statecoin).toEqual(INIT_STATECOIN);
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER);
    })

    test('swapPhase3 test 18 - SwapStep4 - await transferReceiver, server responds with error to POST.TRANSFER_RECEIVER', async () => {
        http_mock.post = jest.fn((path, body) => {
            if (path === POST_ROUTE.SWAP_POLL_SWAP) {
                return SWAP_STATUS.Phase4
            }
            if (path === POST_ROUTE.TRANSFER_SENDER) {
                return MOCK_SERVER.TRANSFER_SENDER;
            }
            if (path === POST_ROUTE.PREPARE_SIGN) {
                return MOCK_SERVER.PREPARE_SIGN;
            }
            if (path === POST_ROUTE.SIGN_FIRST) {
                return MOCK_SERVER.SIGN_FIRST;
            }
            if (path === POST_ROUTE.SIGN_SECOND) {
                return MOCK_SERVER.SIGN_SECOND;
            }
            if (path === POST_ROUTE.TRANSFER_UPDATE_MSG) {
                return MOCK_SERVER.TRANSFER_UPDATE_MSG;
            }
            if (path === POST_ROUTE.TRANSFER_PUBKEY) {
                return MOCK_SERVER.TRANSFER_PUBKEY;
            }
            if (path === POST_ROUTE.TRANSFER_RECEIVER) {
                throw post_error(path);
            }
        })

        http_mock.get = jest.fn((path, params) => {
            if (path === GET_ROUTE.FEES) {
                return MOCK_SERVER.FEE_INFO;
            }
            if (path === GET_ROUTE.STATECOIN) {
                return MOCK_SERVER.STATECOIN_INFO;
            }
            if (path === GET_ROUTE.TRANSFER_GET_MSG_ADDR) {
                return MOCK_SERVER.TRANSFER_GET_MSG_ADDR;
            }
            if (path === GET_ROUTE.STATECHAIN) {
                return MOCK_SERVER.STATECHAIN_INFO;
            }
            if (path === GET_ROUTE.ROOT) {
                return MOCK_SERVER.ROOT_INFO;
            }
        })

        let statecoin = makeTesterStatecoin();

        //Set valid statecoin status
        init_phase3_status(statecoin)

        const INIT_STATECOIN = cloneDeep(statecoin)
        const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)

        let wallet = getWallet()
        let swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der)

        /*
        checkRetryMessage(await swapPhase3(swap),
            "Expected property \"pubkey\" of type ?isPoint, got Buffer")
        */

        expect(statecoin).toEqual(INIT_STATECOIN);
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER);
    })

    test('swapPhase3 test 19 - check finalized data for swap phase4', async () => {
        http_mock.post = jest.fn((path, body) => {
            if (path === POST_ROUTE.SWAP_POLL_SWAP) {
                return SWAP_STATUS.Phase4
            }
            if (path === POST_ROUTE.TRANSFER_SENDER) {
                return MOCK_SERVER.TRANSFER_SENDER;
            }
            if (path === POST_ROUTE.PREPARE_SIGN) {
                return MOCK_SERVER.PREPARE_SIGN;
            }
            if (path === POST_ROUTE.SIGN_FIRST) {
                return MOCK_SERVER.SIGN_FIRST;
            }
            if (path === POST_ROUTE.SIGN_SECOND) {
                return MOCK_SERVER.SIGN_SECOND;
            }
            if (path === POST_ROUTE.TRANSFER_UPDATE_MSG) {
                return MOCK_SERVER.TRANSFER_UPDATE_MSG;
            }
            if (path === POST_ROUTE.TRANSFER_PUBKEY) {
                return MOCK_SERVER.TRANSFER_PUBKEY;
            }
            if (path === POST_ROUTE.TRANSFER_RECEIVER) {
                return MOCK_SERVER.TRANSFER_RECEIVER;
            }
        })

        http_mock.get = jest.fn((path, params) => {
            if (path === GET_ROUTE.FEES) {
                return MOCK_SERVER.FEE_INFO;
            }
            if (path === GET_ROUTE.STATECOIN) {
                return MOCK_SERVER.STATECOIN_INFO;
            }
            if (path === GET_ROUTE.TRANSFER_GET_MSG_ADDR) {
                return MOCK_SERVER.TRANSFER_GET_MSG_ADDR;
            }
            if (path === GET_ROUTE.STATECHAIN) {
                return MOCK_SERVER.STATECHAIN_INFO;
            }
            if (path === GET_ROUTE.ROOT) {
                return MOCK_SERVER.ROOT_INFO;
            }
        })

        let statecoin = makeTesterStatecoin();

        //Set valid statecoin status
        init_phase3_status(statecoin)

        const INIT_STATECOIN = cloneDeep(statecoin)
        const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)

        let wallet = getWallet()
        let swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der)

        /*
        const error_pubkey = "Expected property \"pubkey\" of type ?isPoint, got Buffer";
        checkRetryMessage(await swapPhase3(swap),
            error_pubkey)
        */

        expect(statecoin).toEqual(INIT_STATECOIN);
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER);
    })
});