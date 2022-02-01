import { makeTesterStatecoin } from './test_data.js'
import { SWAP_STATUS, UI_SWAP_STATUS, SwapStep, SWAP_RETRY } from "../swap/swap_utils";
import Swap from "../swap/swap"
import { STATECOIN_STATUS } from '../statecoin'
import { Wallet, MOCK_WALLET_NAME } from '../wallet'
import React from 'react';
import { SIGNSWAPTOKEN_DATA, COMMITMENT_DATA, setSwapDetails } from './test_data.js'
import { SwapToken } from "../swap/swap_utils";
import reducers from '../../reducers';
import { configureStore } from '@reduxjs/toolkit';

import * as MOCK_SERVER from '../mocks/mock_http_client'

import TestComponent, { render } from './test-utils'

import { handleEndSwap } from '../../features/WalletDataSlice.js';
import { fromSatoshi } from '../util.ts';
import { fireEvent, screen } from '@testing-library/dom';
import { AsyncSemaphore } from '@esfx/async-semaphore';

let cloneDeep = require('lodash.clonedeep');

let bitcoin = require('bitcoinjs-lib')

// // client side's mock
let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
// // server side's mock
let http_mock = jest.genMockFromModule('../mocks/mock_http_client');
// //electrum mock
let electrum_mock = jest.genMockFromModule('../mocks/mock_electrum.ts');

let walletName = `${MOCK_WALLET_NAME}_swap_tests`

function getWallet() {
    let wallet = Wallet.buildMock(bitcoin.networks.bitcoin, walletName);
    wallet.config.min_anon_set = 3
    wallet.config.jest_testing_mode = true
    wallet.http_client = http_mock
    wallet.electrum_mock = electrum_mock
    wallet.wasm = wasm_mock
    return wallet
}

const swap_steps = (swap) => {
  return [
  new SwapStep(
      SWAP_STATUS.Phase0, "pollUtxo",
      () => {return swap.statecoin.status === STATECOIN_STATUS.AWAITING_SWAP},
      () => {return swap.statecoin.swap_status === SWAP_STATUS.Phase0},
      () => {
        if (swap.statecoin.statechain_id === null || 
          swap.statecoin.statechain_id === undefined) throw Error("statechain id is invalid");
        return true
      },
      swap.pollUtxo
    )
]}

describe('Swap Checks', function () {
  let wallet = getWallet()

  test('test checkNRetries', function () {
    wallet.statecoins.coins[0] = setSwapDetails(wallet.statecoins.coins[0], 1)
    const statecoin = wallet.statecoins.coins[0]
    let swap = new Swap(wallet, statecoin)
    swap.n_retries = 0
    swap.checkNRetries()
    
    swap.n_retries = SWAP_RETRY.MAX_REPS_PER_PHASE
    expect(() => {
      swap.checkNRetries()
    }).toThrow(Error(`Number of tries exceeded in phase ${statecoin.swap_status}`))

    swap.n_retries = SWAP_RETRY.MAX_REPS_PHASE4 - 1
    wallet.statecoins.coins[0] = setSwapDetails(wallet.statecoins.coins[0], "7-Phase4")
    swap.checkNRetries()

    swap.n_retries = SWAP_RETRY.MAX_REPS_PHASE4
    expect(() => {
      swap.checkNRetries()
    }).toThrow(Error(`Number of tries exceeded in phase ${statecoin.swap_status}`))
  })

  test('test checkSwapLoopStatus', async () => {
    wallet.statecoins.coins[0] = setSwapDetails(wallet.statecoins.coins[0], "Reset")

    let statecoin = wallet.statecoins.coins[0]
    statecoin.status = STATECOIN_STATUS.AVAILABLE
    let swap = new Swap(wallet, statecoin)
    await expect(swap.checkSwapLoopStatus()).rejects.toThrow(Error("Coin removed from swap pool"))

    setSwapDetails(statecoin, 0)
    let statecoin_expected = cloneDeep(statecoin)
    await expect(swap.checkSwapLoopStatus()).resolves
    expect(statecoin).toStrictEqual(statecoin_expected)

    //Expect statecoin swap status to be reset after 
    // SWAP_RETRY.INIT_RETRY_AFTER retries in phase 0
    swap.swap0_count = SWAP_RETRY.INIT_RETRY_AFTER
    setSwapDetails(statecoin_expected, 0)
    await expect(swap.checkSwapLoopStatus()).resolves
    expect(swap.statecoin).toStrictEqual(statecoin_expected)
  })

  test('test checkStepStatus', async () => {
    wallet.statecoins.coins[0] = setSwapDetails(wallet.statecoins.coins[0], 0)
    let statecoin = wallet.statecoins.coins[0]
    let swap = new Swap(wallet, statecoin)
    swap.swap_steps = swap_steps(swap)
    expect(swap.checkStepStatus()).toBe()
  })

  test('test checkStatecoinStatus', async () => {
    wallet.statecoins.coins[0] = setSwapDetails(wallet.statecoins.coins[0], 0)
    let statecoin = wallet.statecoins.coins[0]
    let swap = new Swap(wallet, statecoin)
    swap.swap_steps = swap_steps(swap)
    expect(swap.checkStatecoinStatus(swap.getNextStep())).toBe()
    swap.statecoin.status = STATECOIN_STATUS.AVAILABLE
    const step = swap.getNextStep()
    expect(() => {
      swap.checkStatecoinStatus(step)
    }).toThrow(Error(`${step.description()}: invalid statecoin status: ${statecoin.status}`))
  })

  test('test checkSwapStatus', async () => {
    wallet.statecoins.coins[0] = setSwapDetails(wallet.statecoins.coins[0], 0)
    let statecoin = wallet.statecoins.coins[0]
    let swap = new Swap(wallet, statecoin)
    swap.swap_steps = swap_steps(swap)
    let step = swap.getNextStep()
    expect(swap.checkSwapStatus(step)).toBe()
    swap.statecoin.swap_status = SWAP_STATUS.Phase1
    expect(() => {
      swap.checkSwapStatus(step)
    }).toThrow(Error(`${step.description()}: invalid swap status: ${statecoin.swap_status}`))
  })

  test('test checkStatecoinProperties', async () => {
    wallet.statecoins.coins[0] = setSwapDetails(wallet.statecoins.coins[0], 0)
    let statecoin = wallet.statecoins.coins[0]
    let swap = new Swap(wallet, statecoin)
    swap.swap_steps = swap_steps(swap)
    const step = swap.getNextStep()
    expect(swap.checkStatecoinProperties(step)).toBe()
    statecoin.statechain_id = null
    expect(() => {
      swap.checkStatecoinProperties(step)
    }).toThrow(Error(`statechain id is invalid`))
    statecoin.statechain_id = undefined
    expect(() => {
      let step = swap.getNextStep()
      swap.checkStatecoinProperties(step)
    }).toThrow(Error(`statechain id is invalid`))
  })

  test('validate swap', function () {
    wallet.statecoins.coins[0] = setSwapDetails(wallet.statecoins.coins[0], 1)

    const statecoin = wallet.statecoins.coins[0]

    let swap = new Swap(wallet, statecoin)
    let err = Error("Coin " + statecoin.getTXIdAndOut() + " already in swap pool.")
    const checkValidateSwap = (swap, statecoin, err) => {
      expect(() => {
        swap.validate()
      }).toThrow(err)
      expect(() => {
        statecoin.validateSwap()
      }).toThrow(err)
    }

    checkValidateSwap(swap,statecoin,err)
 
    statecoin.status = STATECOIN_STATUS.IN_SWAP
    swap = new Swap(wallet, statecoin)
    err = Error("Coin " + statecoin.getTXIdAndOut() + " already involved in swap.")
    checkValidateSwap(swap,statecoin,err)

    statecoin.status = STATECOIN_STATUS.SPENT
    swap = new Swap(wallet, statecoin)
    err = Error("Coin " + statecoin.getTXIdAndOut() + " not available for swap.")
    checkValidateSwap(swap,statecoin,err)

    statecoin.status = STATECOIN_STATUS.AVAILABLE
    statecoin.swap_status = SWAP_STATUS.Phase4
    swap = new Swap(wallet, statecoin)
    err = Error(`Coin ${statecoin.shared_key_id} is in swap phase 4. Swap must be resumed.`)
    checkValidateSwap(swap,statecoin,err)

    statecoin.status = STATECOIN_STATUS.AVAILABLE
    statecoin.swap_status = null
    swap = new Swap(wallet, statecoin)
    expect(swap.validate()).toBe()
    expect(statecoin.validateSwap()).toBe()
  })

  test('validate resume swap', function () {
    setSwapDetails(wallet.statecoins.coins[0], 0)
    const statecoin = wallet.statecoins.coins[0]

    const checkValidateResumeSwap = (swap, statecoin, err) => {
      expect(() => {
        swap.validate()
      }).toThrow(err)
      expect(() => {
        statecoin.validateResumeSwap()
      }).toThrow(err)
    }

    let swap = new Swap(wallet, statecoin, null, null, true)
    swap.resume = true
    let err = Error("Cannot resume coin " + statecoin.shared_key_id + " - not in swap.");
    checkValidateResumeSwap(swap,statecoin,err)

    statecoin.status = STATECOIN_STATUS.IN_SWAP
    swap = new Swap(wallet, statecoin)
    swap.resume = true

    err = Error("Cannot resume coin " + statecoin.shared_key_id + " - swap status: " + statecoin.swap_status);
    checkValidateResumeSwap(swap,statecoin,err)

    statecoin.swap_status = SWAP_STATUS.Phase4
    swap = new Swap(wallet, statecoin)
    swap.resume = true
    expect(swap.validate()).toBe()
    expect(statecoin.validateResumeSwap()).toBe()
  })


})

describe('swapToken', function () {
  test('Gen and Verify', async function () {
    SIGNSWAPTOKEN_DATA.forEach(data => {
      let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(data.priv, "hex"));
      expect(proof_key_der.publicKey.toString('hex')).toBe(data.pub);
      let st = data.swap_token;
      let st_cls = new SwapToken(st.id, st.amount, st.time_out, st.statechain_ids);

      let swap_sig = st_cls.sign(proof_key_der, data.swap_token, data.priv);
      expect(swap_sig).toBe(data.swap_token_sig);
    })
  });

  describe('commitment', function () {
    test('Gen and Verify', async function () {
      wasm_mock.Commitment.make_commitment = jest.fn(() => JSON.stringify(COMMITMENT_DATA[0].batch_data));
      COMMITMENT_DATA.forEach(async data => {
        data.statecoin.swap_info = data.swap_info
        let swap = new Swap(getWallet(), data.statecoin)
        let batch_data = await swap.make_swap_commitment();
        expect(batch_data.commitment).toBe(data.batch_data.commitment);
      })
    });
  })
});


describe('Do Swap Poll', function () {
    let wallet = getWallet()
    // loading test wallet

    wallet.config.update({"jest_testing_mode": true})

    let mock_proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));


    test('Preparing Statecoin for Swap', async function () {
        // Test prev phase changes correctly
        // Prev Phase changes to Init:

        let statecoin = wallet.statecoins.coins[0]

        statecoin.swap_id = { id: "000-000-00-00" };
    

        let swap = new Swap(wallet, statecoin, mock_proof_key_der);


        swap.prepare_statecoin()

        expect(statecoin.swap_status).toBe(SWAP_STATUS.Init)
        expect(statecoin.ui_swap_status).toBe(UI_SWAP_STATUS.Init)
        expect(statecoin.swap_id).toBe(null)
        // Check swap details initialised to null
        
        statecoin = setSwapDetails(wallet.statecoins.coins[0], 8)
        swap = new Swap(wallet, statecoin, mock_proof_key_der, null, true);

        swap.prepare_statecoin()
        
        expect(statecoin.swap_status).toBe(SWAP_STATUS.Phase4)
        expect(statecoin.ui_swap_status).toBe(UI_SWAP_STATUS.Phase8)
        // Check Phase 4 Statecoin Unchanged
        
        swap.resume = false
        expect(() => swap.prepare_statecoin()).toThrow(`Coin ${statecoin.shared_key_id} is in swap phase 4. Swap must be resumed.`)
        // Don't wipe swap Phase 4 details


    })

  test('do_swap_poll successful', async function () {


    let swap_size = 5 // swap size constant

    let test_statecoin = makeTesterStatecoin()

    let statecoin = wallet.statecoins.coins[0]

    statecoin = setSwapDetails(statecoin, "Reset")

    let swap = new Swap(wallet, statecoin, mock_proof_key_der);

    let spy = jest.spyOn(swap, 'do_swap_steps').mockImplementation(() => {
        swap.statecoin_out = test_statecoin
    });
    
    await swap.do_swap_poll()
    
    expect(test_statecoin).toEqual(swap.statecoin_out)

    // statecoin = setSwapDetails(statecoin, "Reset")


    // let new_statecoin = await swap_lib.do_swap_poll(http_mock, electrum_mock, wasm_mock, bitcoin.networks.bitcoin, statecoin, proof_key_der, swap_size, proof_key_der, 3, wallet)

  })
})