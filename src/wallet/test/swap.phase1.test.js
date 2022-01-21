import { makeTesterStatecoin } from './test_data.js'
import { SWAP_STATUS, Swap } from "../swap/swap";
import { STATECOIN_STATUS } from '../statecoin'
import * as MOCK_SERVER from '../mocks/mock_http_client'
import { Wallet, MOCK_WALLET_NAME } from '../wallet'

let walletName = `${MOCK_WALLET_NAME}_swap_phase1_tests`

let bitcoin = require('bitcoinjs-lib')
// client side's mock
let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
// server side's mock
let http_mock = jest.genMockFromModule('../mocks/mock_http_client');


async function swapPhase1(swap) {
    swap.next_step = 3
    let result
    for(let i=0; i< 3; i++){
      result =  await swap.doNext()
      if(result.is_ok() === false){
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
    wallet.wasm = wasm_mock
    return wallet
  }


describe('swapPhase1 test 1 - incorrect status', () => {
    // input /////////////////////////////////////////////////
    let statecoin = makeTesterStatecoin();
    let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));
    statecoin.status = null
    let swap = new Swap(getWallet(), statecoin, proof_key_der, proof_key_der) 
    //////////////////////////////////////////////////////////

    it('throws error on null status', async () => {
        const input = () => {
            return swapPhase1(swap);
        }
        const output = `phase Phase1:pollUtxo: invalid statecoin status: ${statecoin.status}`;

        await expect(input()).rejects.toThrowError(output);
    })
})

describe('swapPhase1 test 2 - incorrect swap_status', () => {
    // input /////////////////////////////////////////////////
    let statecoin = makeTesterStatecoin();
    statecoin.status = STATECOIN_STATUS.AWAITING_SWAP
    let swap = new Swap(getWallet(), statecoin, null, null) 
    //////////////////////////////////////////////////////////

    it('throws error on null swap_status', async () => {
        const input = () => {
            return swapPhase1(swap);
        }
        const output = `phase Phase1:pollUtxo: invalid swap status: ${statecoin.swap_status}`;

        await expect(input()).rejects.toThrowError(output);
    })
});

describe('swapPhase1 test 3 - incorrect swap id', () => {
    // input //////////////////////////////////////////////////////////
    let statecoin = makeTesterStatecoin();
    statecoin.status = STATECOIN_STATUS.AWAITING_SWAP;
    // Set swap_status as if coin had already run Phase0
    statecoin.swap_status = SWAP_STATUS.Phase1
    let swap = new Swap(getWallet(), statecoin, null, null) 
    ///////////////////////////////////////////////////////////////////

    it('throws error on no swap id', async () => {
        const input = () => {
            return swapPhase1(swap);
        }
        const output = "No Swap ID found. Swap ID should be set in Phase0.";

        await expect(input()).rejects.toThrowError(output);
    })
});


describe('swapPhase1 test 4 - incorrect swap info', () => {
    let statecoin = makeTesterStatecoin();
    statecoin.status = STATECOIN_STATUS.AWAITING_SWAP;
    // Set swap_status as if coin had already run Phase0
    statecoin.swap_status = SWAP_STATUS.Phase1
    statecoin.swap_id = "12345";
    let swap_info = {
        status: SWAP_STATUS.Phase1,
        swap_token: { id: "12345", amount: 10, time_out: 15, statechain_ids: [] },
        bst_sender_data: { x: "1", q: { x: "1", y: "1" }, k: "1", r_prime: { x: "1", y: "1" }, }
    }

    /*
    http_mock.post = jest.fn().mockReset()
        .mockReturnValueOnce({ id: "00000000-0000-0000-0000-000000000001" })    // return once a swap id => swap has started, polling utxo again
        .mockReturnValueOnce(null)    // return once null => swap has not started
        .mockReturnValueOnce(swap_info)
    */

    http_mock.post = jest.fn((path, body) => {
        if (path === POST_ROUTE.SWAP_POLL_SWAP) {
            return null
        }
    })


    /*
    it('expects swap_address and swap_my_bst to be null', async () => {
        // swap token not yet available
        await swapPhase1(swapPhaseClient, statecoin, proof_key_der, proof_key_der);
        expect(statecoin.swap_address).toBe(null)
        expect(statecoin.swap_my_bst_data).toBe(null)
    });

    it('expects swap_address and swap_my_bst to have values', async () => {
        // swap token available
        // await swapPhase1(http_mock, http_mock, wasm_mock, statecoin, proof_key_der, proof_key_der)
        // expect(statecoin.swap_address).toBe(SWAP_STATUS.Phase1);
        // expect(statecoin.swap_my_bst_data).toBe(swap_info);
        // expect(statecoin.swap_status).toBe(SWAP_STATUS.Phase2);
        // expect(statecoin.ui_swap_status).toBe(UI_SWAP_STATUS.Phase2)
    });*/
});

describe('swapPhase1 test 5 - incorrect statechain_id ', () => {
    let statecoin = makeTesterStatecoin();
    statecoin.status = STATECOIN_STATUS.AWAITING_SWAP;
    // Set swap_status as if coin had already run Phase0
    statecoin.swap_status = SWAP_STATUS.Phase1
    statecoin.swap_id = "12345";
    // purposely set statechain_id to null
    statecoin.statechain_id = null;

    /*
    it('throws error on invalid statechain_id', async () => {
        const input = () => {
            return swapPhase1(swapPhaseClient, statecoin, proof_key_der, proof_key_der);
        }
        const output = "statechain id is invalid";

        await expect(input()).rejects.toThrowError(output);
    })*/
})

describe('swapPhase1 test 6 - swap id returned', () => {
    let statecoin = makeTesterStatecoin();
    statecoin.status = STATECOIN_STATUS.AWAITING_SWAP;
    // Set swap_status as if coin had already run Phase0
    statecoin.swap_status = SWAP_STATUS.Phase1
    statecoin.swap_id = "12345";

    // save swap_id
    let original_swap_id = statecoin.swap_id;

    let swap_info = {
        status: SWAP_STATUS.Phase1,
        swap_token: { id: "12345", amount: 10, time_out: 15, statechain_ids: [] },
        bst_sender_data: { x: "1", q: { x: "1", y: "1" }, k: "1", r_prime: { x: "1", y: "1" }, }
    }

    /*
    http_mock.post = jest.fn().mockReset()
        .mockReturnValueOnce({ id: "00000000-0000-0000-0000-000000000001" })    // return once a swap id => swap has started, polling utxo again
        .mockReturnValueOnce(swap_info)
    */

    /*
    it('throws error on invalid statechain_id', async () => {
        await swapPhase1(swapPhaseClient, statecoin, proof_key_der, proof_key_der);
        expect(statecoin.swap_id).toBe(original_swap_id);
    })*/
})


describe('swapPhase1 test 7 - in phase 1 no swap id', () => {
    let statecoin = makeTesterStatecoin();
    let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));
    statecoin.status = STATECOIN_STATUS.AWAITING_SWAP;
    // Set swap_status as if coin had already run Phase0
    statecoin.swap_status = SWAP_STATUS.Phase1
    statecoin.swap_id = "12345";

    /*
    http_mock.post = jest.fn().mockReset()
        .mockReturnValueOnce({ id: "00000000-0000-0000-0000-000000000001" })    // return once a swap id => swap has started, polling utxo again
        .mockReturnValueOnce(null)
    */

    /*
    it('throws error on no swap_info passed', async () => {
        const input = () => {
            return swapPhase1(swapPhaseClient, statecoin, proof_key_der, proof_key_der);
        }
        const output = "In swap phase 1 - no swap ID found";

        await expect(input()).rejects.toThrowError(output);
    })*/
})