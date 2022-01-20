import { SWAP_SECOND_SCE_ADDRESS } from '../mocks/mock_http_client'
import { GET_ROUTE, POST_ROUTE } from '../http_client';
import { makeTesterStatecoin } from './test_data.js'
import {
    SWAP_STATUS,
    SwapRetryError, UI_SWAP_STATUS, SwapPhaseClients
} from "../swap/swap";
import { STATECOIN_STATUS } from '../statecoin'
import * as MOCK_SERVER from '../mocks/mock_http_client'
import { swapPhase3 } from '../swap/swap.phase3';

let cloneDeep = require('lodash.clonedeep');
let bitcoin = require('bitcoinjs-lib')
let mock_http_client = require('../mocks/mock_http_client')

// client side's mock
let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
// server side's mock
let http_mock = jest.genMockFromModule('../mocks/mock_http_client');
//electrum mock
let electrum_mock = jest.genMockFromModule('../mocks/mock_electrum.ts');

let swapPhaseClient = new SwapPhaseClients(http_mock, wasm_mock, electrum_mock);


const post_error = (path, body) => {
    return new Error(`Error from POST request - path: ${path}, body: ${body}`)
}
const get_error = (path, params) => {
    return new Error(`Error from GET request - path: ${path}, params: ${params}`)
}
//Set a valid initial statecoin status for phase3
const init_phase3_status = (statecoin) => {
    //Set valid statecoin status
    statecoin.status = STATECOIN_STATUS.IN_SWAP
    //Set valid swap status
    statecoin.swap_status = SWAP_STATUS.Phase3
    //Set swap_id to some value
    statecoin.swap_id = "12345"
    //Set my_bst_data to some value
    statecoin.swap_my_bst_data = "a my bst data"
    //Set swap_info to some value
    statecoin.swap_info = "a swap info"
    //Set swap address from phase1
    statecoin.swap_address = "a swap address"
    // Set ui sstatus
    statecoin.ui_swap_status = UI_SWAP_STATUS.Phase5
    // Set swap receiver address to mock value
    statecoin.swap_receiver_addr = SWAP_SECOND_SCE_ADDRESS
}

describe('swapPhase3', () => {
    test('swapPhase3 test 1 - invalid initial statecoin state', async () => {

        let statecoin = makeTesterStatecoin();
        let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));

        //Test invalid statecoin statuses
        for (let i = 0; i < STATECOIN_STATUS.length; i++) {
            if (STATECOIN_STATUS[i] !== STATECOIN_STATUS.IN_SWAP) {
                const sc_status = STATECOIN_STATUS[i]
                statecoin.status = cloneDeep(sc_status)
                await expect(swapPhase3(swapPhaseClient, statecoin, null, proof_key_der, proof_key_der, null, null, null))
                    .rejects
                    .toThrowError(`Coin is not in this phase of the swap protocol. In phase: null`)
            }
        }

        //Set valid statecoin status
        statecoin.status = STATECOIN_STATUS.IN_SWAP

        //Test invalid statecoin swap statuses
        for (let i = 0; i < SWAP_STATUS.length; i++) {
            if (SWAP_STATUS[i] !== SWAP_STATUS.Phase3) {
                const swap_status = STATECOIN_STATUS[i]
                statecoin.swap_status = cloneDeep(swap_status)
                await expect(swapPhase3(swapPhaseClient, statecoin, null, proof_key_der, proof_key_der, null, null, null))
                    .rejects.toThrowError(`Coin is not in this phase of the swap protocol. In phase: ${swap_status}`)
            }
        }

        statecoin.swap_status = null
        await expect(swapPhase3(swapPhaseClient, statecoin, null, proof_key_der, proof_key_der, null, null, null))
            .rejects.toThrowError(`Coin is not in this phase of the swap protocol. In phase: ${null}`)

        //Set valid swap status
        statecoin.swap_status = SWAP_STATUS.Phase3

        //Test invalid swap_id and swap_my_bst_data
        statecoin.swap_id = null
        statecoin.swap_my_bst_data = null
        statecoin.swap_info = null

        await expect(swapPhase3(swapPhaseClient, statecoin, null, proof_key_der, proof_key_der, null, null, null))
            .rejects.toThrowError("No Swap ID found. Swap ID should be set in Phase0.")

        statecoin.swap_id = "a swap id"

        await expect(swapPhase3(swapPhaseClient, statecoin, null, proof_key_der, proof_key_der, null, null, null))
            .rejects.toThrowError("No swap info found for coin. Swap info should be set in Phase1.")

        statecoin.swap_info = mock_http_client.SWAP_INFO;

        await expect(swapPhase3(swapPhaseClient, statecoin, null, proof_key_der, proof_key_der, null, null, null))
            .rejects.toThrowError("No swap address found for coin. Swap address should be set in Phase1")

        statecoin.swap_address = "a swap address"

        await expect(swapPhase3(swapPhaseClient, statecoin, null, proof_key_der, proof_key_der, null, null, null))
            .rejects.toThrowError("No receiver address found for coin. Receiver address should be set in Phase1")

        statecoin.swap_receiver_addr = mock_http_client.SWAP_SECOND_SCE_ADDRESS;
    })

    test('swapPhase3 test 2 - server responds to pollSwap with miscellaneous error', async () => {

        const server_error = () => { return new Error("Misc server error") }
        http_mock.post = jest.fn((path, body) => {
            if (path === POST_ROUTE.SWAP_POLL_SWAP) {
                throw server_error()
            }
        })

        let statecoin = makeTesterStatecoin();
        let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));

        init_phase3_status(statecoin)

        const INIT_STATECOIN = cloneDeep(statecoin)
        const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)


        //A server error will now be throw from an API call
        //The error type should be SwapRetryError 
        await expect(swapPhase3(swapPhaseClient, statecoin, null, proof_key_der, proof_key_der, null, null, null))
            .rejects.toThrow(SwapRetryError)

        //The error should contain the message in server_error()
        await expect(swapPhase3(swapPhaseClient, statecoin, null, proof_key_der, proof_key_der, null, null, null))
            .rejects.toThrowError(`${server_error().message}`)

        //Expect statecoin and proof_key_der to be unchanged
        expect(statecoin).toEqual(INIT_STATECOIN)
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER)
    })

    test('swapPhase3 test 3 - server responds to pollSwap with null or invalid status', async () => {

        let statecoin = makeTesterStatecoin();
        let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));


        //Set valid statecoin status
        init_phase3_status(statecoin)

        const INIT_STATECOIN = cloneDeep(statecoin)
        const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)

        http_mock.post = jest.fn((path, body) => {
            if (path === POST_ROUTE.SWAP_POLL_SWAP) {
                return null
            }
        })
        await expect(swapPhase3(swapPhaseClient, statecoin, null, proof_key_der, proof_key_der, null, null, null))
            .rejects.toThrow(Error)
        await expect(swapPhase3(swapPhaseClient, statecoin, null, proof_key_der, proof_key_der, null, null, null))
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
                await expect(swapPhase3(swapPhaseClient, statecoin, null, proof_key_der, proof_key_der))
                    .rejects.toThrow(Error)
                await expect(swapPhase3(swapPhaseClient, statecoin, null, proof_key_der, proof_key_der))
                    .rejects.toThrowError(`Swap error: Expected swap phase3. Received: ${phase}`)
            }
        }

        //Expect statecoin and proof_key_der to be unchanged
        expect(statecoin).toEqual(INIT_STATECOIN)
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER)

    })

    test('swapPhase3 test 4 - server responds with Error to request getFeeInfo() in transferSender()', async () => {

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
        let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));

        //Set valid statecoin status
        init_phase3_status(statecoin);

        const INIT_STATECOIN = cloneDeep(statecoin);
        const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der);


        await expect(swapPhase3(swapPhaseClient, statecoin, null, proof_key_der, proof_key_der))
            .rejects.toThrow("Error from GET request - path: info/fee, params: undefined")
        await expect(swapPhase3(swapPhaseClient, statecoin, null, proof_key_der, proof_key_der))
            .rejects.toThrow(SwapRetryError)

        //Expect statecoin and proof_key_der to be unchanged
        expect(statecoin).toEqual(INIT_STATECOIN)
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER)
    })

    test('swapPhase3 test 5 - server responds with Error to request getStateCoin() in transferSender()', async () => {

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
        let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));

        //Set valid statecoin status
        init_phase3_status(statecoin)

        const INIT_STATECOIN = cloneDeep(statecoin)
        const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)

        await expect(swapPhase3(swapPhaseClient, statecoin, null, proof_key_der, proof_key_der))
            .rejects.toThrow("Error from GET request - path: info/statecoin, params: undefined")
        await expect(swapPhase3(swapPhaseClient, statecoin, null, proof_key_der, proof_key_der))
            .rejects.toThrow(SwapRetryError)

        //Expect statecoin and proof_key_der to be unchanged
        expect(statecoin).toEqual(INIT_STATECOIN)
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER)
    })

    test('swapPhase3 test 6 - server responds with error to POST_ROUTE.TRANSFER_SENDER', async () => {
        http_mock.post = jest.fn((path, body) => {
            if (path === POST_ROUTE.SWAP_POLL_SWAP) {
                return SWAP_STATUS.Phase4
            }
            if (path === POST_ROUTE.TRANSFER_SENDER) {
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
        })

        // todo
        let statecoin = makeTesterStatecoin();
        let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));

        //Set valid statecoin status
        init_phase3_status(statecoin)

        const INIT_STATECOIN = cloneDeep(statecoin)
        const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)

        await expect(swapPhase3(swapPhaseClient, statecoin, null, proof_key_der, proof_key_der))
            .rejects.toThrow(Error)
        await expect(swapPhase3(swapPhaseClient, statecoin, null, proof_key_der, proof_key_der))
            .rejects.toThrow(SwapRetryError)

        //Expect statecoin and proof_key_der to be unchanged
        expect(statecoin).toEqual(INIT_STATECOIN)
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER)
    })

    test('swapPhase3 test 7 - an invalid data type is returned from request for TRANSFER_SENDER', async () => {
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

        const transfer_missing_x1_error = () => { return new Error("Expected property \"x1\" of type Object, got undefined") }

        let statecoin = makeTesterStatecoin();
        let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));

        //Set valid statecoin status
        init_phase3_status(statecoin)

        const INIT_STATECOIN = cloneDeep(statecoin)
        const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)

        await expect(swapPhase3(swapPhaseClient, statecoin, null, proof_key_der, proof_key_der))
            .rejects.toThrow(Error);
        expect(statecoin).toEqual(INIT_STATECOIN);
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER);

        await expect(swapPhase3(swapPhaseClient, statecoin, null, proof_key_der, proof_key_der))
            .rejects.toThrowError(transfer_missing_x1_error());
        expect(statecoin).toEqual(INIT_STATECOIN);
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER);
    })

    test('swapPhase3 test 8 - server responds with error to POST.PREPARE_SIGN', async () => {
        http_mock.post = jest.fn((path, body) => {
            if (path === POST_ROUTE.SWAP_POLL_SWAP) {
                return SWAP_STATUS.Phase4
            }
            if (path === POST_ROUTE.TRANSFER_SENDER) {
                return MOCK_SERVER.TRANSFER_SENDER;
            }
            if (path === POST_ROUTE.PREPARE_SIGN) {
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
        })

        const expected_error = () => { return new Error("Expected property \"pubkey\" of type ?isPoint, got Buffer") }

        let statecoin = makeTesterStatecoin();
        let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));

        //Set valid statecoin status
        init_phase3_status(statecoin)

        const INIT_STATECOIN = cloneDeep(statecoin)
        const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)

        await expect(swapPhase3(swapPhaseClient, statecoin, null, proof_key_der, proof_key_der))
            .rejects.toThrow(Error);
        expect(statecoin).toEqual(INIT_STATECOIN);
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER);

        await expect(swapPhase3(swapPhaseClient, statecoin, null, proof_key_der, proof_key_der))
            .rejects.toThrowError(expected_error());
        expect(statecoin).toEqual(INIT_STATECOIN);
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER);
    })

    test('swapPhase3 test 9 - server responds with error to POST.SIGN_FIRST', async () => {
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
        })

        const expected_error = () => { return new Error("Expected property \"pubkey\" of type ?isPoint, got Buffer") }

        let statecoin = makeTesterStatecoin();
        let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));

        //Set valid statecoin status
        init_phase3_status(statecoin)

        const INIT_STATECOIN = cloneDeep(statecoin)
        const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)

        await expect(swapPhase3(swapPhaseClient, statecoin, null, proof_key_der, proof_key_der))
            .rejects.toThrow(Error);
        expect(statecoin).toEqual(INIT_STATECOIN);
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER);

        await expect(swapPhase3(swapPhaseClient, statecoin, null, proof_key_der, proof_key_der))
            .rejects.toThrowError(expected_error());
        expect(statecoin).toEqual(INIT_STATECOIN);
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER);
    })

    test('swapPhase3 test 10 - server responds with error to POST.SIGN_SECOND', async () => {
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
        })

        const expected_error = () => { return new Error("Expected property \"pubkey\" of type ?isPoint, got Buffer") }

        let statecoin = makeTesterStatecoin();
        let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));

        //Set valid statecoin status
        init_phase3_status(statecoin)

        const INIT_STATECOIN = cloneDeep(statecoin)
        const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)

        await expect(swapPhase3(swapPhaseClient, statecoin, null, proof_key_der, proof_key_der))
            .rejects.toThrow(Error);
        expect(statecoin).toEqual(INIT_STATECOIN);
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER);

        await expect(swapPhase3(swapPhaseClient, statecoin, null, proof_key_der, proof_key_der))
            .rejects.toThrowError(expected_error());
        expect(statecoin).toEqual(INIT_STATECOIN);
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER);
    })

    test('swapPhase3 test 11 - server responds with error to POST.TRANSFER_UPDATE_MSG', async () => {
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
        })

        const expected_error = () => { return new Error("Expected property \"pubkey\" of type ?isPoint, got Buffer") }

        let statecoin = makeTesterStatecoin();
        let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));

        //Set valid statecoin status
        init_phase3_status(statecoin)

        const INIT_STATECOIN = cloneDeep(statecoin)
        const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)

        await expect(swapPhase3(swapPhaseClient, statecoin, null, proof_key_der, proof_key_der))
            .rejects.toThrow(Error);
        expect(statecoin).toEqual(INIT_STATECOIN);
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER);

        await expect(swapPhase3(swapPhaseClient, statecoin, null, proof_key_der, proof_key_der))
            .rejects.toThrowError(expected_error());
        expect(statecoin).toEqual(INIT_STATECOIN);
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER);
    })

    test('swapPhase3 test 12 - check make_swap_commitment data', async () => {
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

        const expected_error = () => { return new Error("Expected property \"pubkey\" of type ?isPoint, got Buffer") }

        let statecoin = makeTesterStatecoin();
        let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));

        //Set valid statecoin status
        init_phase3_status(statecoin)

        const INIT_STATECOIN = cloneDeep(statecoin)
        const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)

        await expect(swapPhase3(swapPhaseClient, statecoin, null, proof_key_der, proof_key_der))
            .rejects.toThrow(Error);
        expect(statecoin).toEqual(INIT_STATECOIN);
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER);

        await expect(swapPhase3(swapPhaseClient, statecoin, null, proof_key_der, proof_key_der))
            .rejects.toThrowError(expected_error());
        expect(statecoin).toEqual(INIT_STATECOIN);
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER);

        // todo - add further checks to swap commitment data
        // check swap commitment
        expect(statecoin.swap_batch_data).toEqual(null);
    })

    test('swapPhase3 test 13 - server responds with error to POST.TRANSFER_GET_MSG in do_transfer_receiver', async () => {
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
            if (path === POST_ROUTE.TRANSFER_GET_MSG) {
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

        const expected_error = () => { return new Error("Expected property \"pubkey\" of type ?isPoint, got Buffer") }

        let statecoin = makeTesterStatecoin();
        let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));

        //Set valid statecoin status
        init_phase3_status(statecoin)

        const INIT_STATECOIN = cloneDeep(statecoin)
        const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der)

        await expect(swapPhase3(swapPhaseClient, statecoin, null, proof_key_der, proof_key_der))
            .rejects.toThrow(Error);
        expect(statecoin).toEqual(INIT_STATECOIN);
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER);

        await expect(swapPhase3(swapPhaseClient, statecoin, null, proof_key_der, proof_key_der))
            .rejects.toThrowError(expected_error());
        expect(statecoin).toEqual(INIT_STATECOIN);
        expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER);
    })

    test('swapPhase3 test 14 - server responds to error in transferReceiver', () => {
        // let statechain_data = await getStateChain(http_client, transfer_msg3.statechain_id);
        // let new_shared_key_id = await getOwner(http_client, transfer_msg3.statechain_id);
        // let fee_info: FeeInfo = await getFeeInfo(http_client);
        // let funding_tx_data = await electrum_client.getScriptHashListUnspent(out_script);
        // let tx_data: any = await electrum_client.getTransaction(statechain_data.utxo.txid);
        // let s1_pubkey = await http_client.post(POST_ROUTE.TRANSFER_PUBKEY, user_id);
        // let transfer_msg5: TransferMsg5 = await http_client.post(POST_ROUTE.TRANSFER_RECEIVER, transfer_msg4);
    })

    test('swapPhase3 test 15 - check finalized data for swap phase4', () => {
        /*
        if (transfer_finalized_data !== null) {
            // Update coin status
            statecoin.swap_transfer_finalized_data = transfer_finalized_data;
            statecoin.swap_status = SWAP_STATUS.Phase4;
            wallet.saveStateCoinsList()
            log.info("Swap Phase4: Coin " + statecoin.shared_key_id + " in Swap ", statecoin.swap_id, ".");
        }*/
    })
});