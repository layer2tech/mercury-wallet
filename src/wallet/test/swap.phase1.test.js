import { makeTesterStatecoin } from './test_data.js'
import { SWAP_STATUS } from "../swap/swap_utils";
import Swap from "../swap/swap"
import { STATECOIN_STATUS } from '../statecoin'
import * as MOCK_SERVER from '../mocks/mock_http_client'
import { Wallet, MOCK_WALLET_NAME } from '../wallet'
import { swapPhase1 as swapPhase1Steps } from '../swap/swap.phase1'
import { StateChainSig } from  '../util'
let cloneDeep = require('lodash.clonedeep');
let walletName = `${MOCK_WALLET_NAME}_swap_phase1_tests`

let bitcoin = require('bitcoinjs-lib')
// client side's mock
let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
// server side's mock
let http_mock = jest.genMockFromModule('../mocks/mock_http_client');

async function swapPhase1(swap) {
    swap.setSwapSteps(swapPhase1Steps(swap))
    let result
    for(let i=0; i< swap.swap_steps.length; i++){
      result =  await swap.doNext()
      if(result.is_ok() === false){
          return result
      }
    }
    return result
  }


async function getWallet() {
    let wallet = await Wallet.buildMock(bitcoin.networks.bitcoin, walletName);
    wallet.config.min_anon_set = 3
    wallet.config.jest_testing_mode = true
    wallet.http_client = http_mock
    wallet.wasm = wasm_mock
    return wallet
  }


describe('swapPhase1 test 1 - incorrect status', async () => {
    // input /////////////////////////////////////////////////
    let statecoin = makeTesterStatecoin();
    let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));
    statecoin.status = null
    let swap = new Swap(await getWallet(), statecoin, proof_key_der, proof_key_der) 
    //////////////////////////////////////////////////////////

    it('throws error on null status', async () => {
        const input = () => {
            return swapPhase1(swap);
        }
        const output = `phase Phase1:pollUtxo: invalid statecoin status: ${statecoin.status}`;

        await expect(input()).rejects.toThrowError(output);
    })
})

describe('swapPhase1 test 2 - incorrect swap_status', async () => {
    // input /////////////////////////////////////////////////
    let statecoin = makeTesterStatecoin();
    statecoin.status = STATECOIN_STATUS.IN_SWAP
    let swap = new Swap(await getWallet(), statecoin, null, null) 
    //////////////////////////////////////////////////////////

    it('throws error on null swap_status', async () => {
        const input = () => {
            return swapPhase1(swap);
        }
        const output = `phase Phase1:pollUtxo: invalid swap status: ${statecoin.swap_status}`;

        await expect(input()).rejects.toThrowError(output);
    })
});

describe('swapPhase1 test 3 - incorrect swap id', async () => {
    // input //////////////////////////////////////////////////////////
    let statecoin = makeTesterStatecoin();
    statecoin.status = STATECOIN_STATUS.IN_SWAP;
    // Set swap_status as if coin had already run Phase0
    statecoin.swap_status = SWAP_STATUS.Phase1
    let swap = new Swap(await getWallet(), statecoin, null, null) 
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

describe('swap first message', () => {
    test.skip('get_swap_msg_1', async () => {
    let statecoin = makeTesterStatecoin();
    statecoin.swap_id = { id: "12345"};
    let swap_info = {
        status: SWAP_STATUS.Phase1,
        swap_token: { id: "12345", amount: 10, time_out: 15, statechain_ids: [] },
        bst_sender_data: { x: "1", q: { x: "1", y: "1" }, k: "1", r_prime: { x: "1", y: "1" }, }
    }
    let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));
    let transfer_batch_sig = StateChainSig.new_transfer_batch_sig(proof_key_der, 
        statecoin.swap_id.id, statecoin.statechain_id);
    let address = {
        "tx_backup_addr": null,
        "proof_key": proof_key_der.publicKey.toString("hex"),
    };
    
    wasm_mock.BSTRequestorData.setup = jest.fn((_r_prime_str, _m) => {
        //throw wasm_err("KeyGen.keygen_first")
        return JSON.stringify({
            "u": "u",
            "v": "v",
            "r": {"x":"x", "y":"y"},
            "e_prime": "e_prime",
            "m": "m"
        })
      })

    let msg1 = await get_swap_msg_1(
        statecoin,
        wasm_mock,
        swap_info,
        statecoin.statechain_id,
        transfer_batch_sig,
        address,
        proof_key_der
    )
    console.log(`${JSON.stringify(msg1)}`)

    let msg1_expected = {"swap_id":"12345","statechain_id":"","swap_token_sig":"3045022100f6349dd199eee2e8d81f3fa942d94ccbb90812839e2eac69be49394b349e5d8c0220320285381753cf015619e52d124ffaee59ccae987a01ae399d9c10ab235af5b6","transfer_batch_sig":{"purpose":"TRANSFER_BATCH:12345","data":"","sig":"304402202cf1b4dadf78ec8b5aff690bd3478cf89405848fd4bb82a3e08b6e9e8a7e8f4602206e4015d1c6f72e1ea05b9a87bf50ed53b84656795525b5cd60b7e868b5d92e9b"},"address":{"tx_backup_addr":null,"proof_key":"03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477"},"bst_e_prime":"e_prime"}

    expect(msg1).toEqual(msg1_expected)

    wasm_mock.BSTRequestorData.setup = jest.fn((_r_prime_str, _m) => {
        //throw wasm_err("KeyGen.keygen_first")
        return JSON.stringify({
            "u": "u_2",
            "v": "v_2",
            "r": {"x":"x_2", "y":"y_2"},
            "e_prime": "e_prime_2",
            "m": "m_2"
        })
      })

    //Call again with statecoin only - epxecte to get same result
    let msg1_1 = await get_swap_msg_1(
        statecoin,
        wasm_mock,
        swap_info,
        statecoin.statechain_id,
        transfer_batch_sig,
        address,
        proof_key_der
    )

    expect(msg1_1).toEqual(msg1_expected)

    statecoin.swap_my_bst_data = null
    //Call again with statecoin only - bst_data null - expect to get updated result
    let msg1_2 = await get_swap_msg_1(
        statecoin,
        wasm_mock,
        swap_info,
        statecoin.statechain_id,
        transfer_batch_sig,
        address,
        proof_key_der
    )

    let msg1_expected_2 = cloneDeep(msg1_expected)
    msg1_expected_2.bst_e_prime="e_prime_2"

    expect(msg1_2).toEqual(msg1_expected_2)


  wasm_mock.BSTRequestorData.setup = jest.fn((_r_prime_str, _m) => {
        //throw wasm_err("KeyGen.keygen_first")
        return JSON.stringify({
            "u": "u_3",
            "v": "v_3",
            "r": {"x":"x_3", "y":"y_3"},
            "e_prime": "e_prime_3",
            "m": "m_3"
        })
      })

      let msg1_expected_3 = cloneDeep(msg1_expected)
    msg1_expected_3.bst_e_prime="e_prime_3"

    //Call again with statecoin only - address changed - expect to get updated result after address update
    let msg1_3 = await get_swap_msg_1(
        statecoin,
        wasm_mock,
        swap_info,
        statecoin.statechain_id,
        transfer_batch_sig,
        address,
        proof_key_der
    )

    expect(msg1_3).toEqual(msg1_expected_2)

    let address_2 = cloneDeep(address)
    address_2.proof_key.replace("a","b") 

    let msg1_4 = await get_swap_msg_1(
        statecoin,
        wasm_mock,
        swap_info,
        statecoin.statechain_id,
        transfer_batch_sig,
        address_2,
        proof_key_der
    )

    expect(msg1_4).toEqual(msg1_expected_3)

    })
})
