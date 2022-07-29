/**
 * @jest-environment jsdom
 */
import { SWAP_SECOND_SCE_ADDRESS } from '../mocks/mock_http_client'
import { GET_ROUTE, POST_ROUTE } from '../http_client';
import { makeTesterStatecoin, SWAP_TRANSFER_MSG } from './test_data.js'
import {
    SWAP_STATUS,
    UI_SWAP_STATUS
} from "../swap/swap_utils";
import { STATECOIN_STATUS } from '../statecoin'
import { Wallet, MOCK_WALLET_NAME } from '../wallet'
import * as MOCK_SERVER from '../mocks/mock_http_client'
import Swap from '../swap/swap'
import { swapPhase3 as swapPhase3Steps } from '../swap/swap.phase3'
import { COMMITMENT_DATA } from './test_data.js'

let walletName = `${MOCK_WALLET_NAME}_swap_phase3_tests`;
let cloneDeep = require('lodash.clonedeep');
let bitcoin = require('bitcoinjs-lib');
let mock_http_client = require('../mocks/mock_http_client');
let mock_wasm = require('../mocks/mock_wasm');

// client side's mock
let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
// server side's mock
let http_mock = jest.genMockFromModule('../mocks/mock_http_client');
//electrum mock
let electrum_mock = jest.genMockFromModule('../mocks/mock_electrum.ts');


const post_error = (path, body) => {
    return new Error(`Error from POST request - path: ${path}, body: ${body}`);
}
const get_error = (path, params) => {
    return new Error(`Error from GET request - path: ${path}, params: ${params}`);
}
const wasm_err = (message) => {
    return new Error(`Error from wasm_client: ${message}`);
}
//Set a valid initial statecoin status for phase3
const init_phase3_status = (statecoin) => {
    //Set valid statecoin status
    statecoin.status = STATECOIN_STATUS.IN_SWAP;
    //Set valid swap status
    statecoin.swap_status = SWAP_STATUS.Phase3;
    //Set swap_id to some value
    statecoin.swap_id = { "id": "f7ac71c1-0937-4718-bc9b-7f4d77321981" };
    //Set my_bst_data to some value
    statecoin.swap_my_bst_data = "a my bst data";
    //Set swap_info to some value
    statecoin.swap_info = mock_http_client.SWAP_INFO;
    //Set swap address from phase1
    statecoin.swap_address = "a swap address";
    // Set ui status
    statecoin.ui_swap_status = UI_SWAP_STATUS.Phase5;
    // Set swap receiver address to mock value
    statecoin.swap_receiver_addr = SWAP_SECOND_SCE_ADDRESS;
}

const proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));

const swapPhase3 = async (swap) => {
    swap.setSwapSteps(swapPhase3Steps(swap));
    let result;
    for (let i = 0; i < swap.swap_steps.length; i++) {
        result = await swap.doNext();
        if (result.is_ok() !== true) {
            console.log(`retry at step: ${swap.getNextStep().description()}`);
            return result;
        }
    }
    return result;
}

const getWallet = async () => {
    let wallet = await Wallet.buildMock(bitcoin.networks.bitcoin, walletName);
    wallet.config.min_anon_set = 3;
    wallet.config.jest_testing_mode = true;
    wallet.http_client = http_mock;
    wallet.electrum_mock = electrum_mock;
    wallet.wasm = wasm_mock;
    return wallet;
}

const checkRetryMessage = (swapStepResult, message) => {
    expect(swapStepResult.is_ok()).toEqual(false);
    expect(swapStepResult.message).toEqual(message);
}



describe('swapPhase3', () => {
    test('swapPhase3 test 1 - SwapStep1: invalid initial statecoin state', async () => {

        let statecoin = makeTesterStatecoin();
        let wallet = await getWallet();
        let swap;

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
    });

    test('swapPhase3 test 2 - SwapStep1: server responds to pollSwap with miscellaneous error', async () => {

        const server_error = () => { return new Error("Misc server error") }
        http_mock.post = jest.fn((path, _body) => {
            if (path === POST_ROUTE.SWAP_POLL_SWAP) {
                throw server_error()
            }
        })

        let statecoin = makeTesterStatecoin();
        init_phase3_status(statecoin)

        const INIT_STATECOIN = cloneDeep(statecoin)
        const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)

        let wallet = await getWallet()
        let swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der)

        checkRetryMessage(await swapPhase3(swap),
            `${server_error().message}`)

        //Expect statecoin and proof_key_der to be unchanged
        expect(statecoin).toEqual(INIT_STATECOIN)
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER)
    });
    
});