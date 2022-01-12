import React from 'react';
import {makeTesterStatecoin, SIGNSWAPTOKEN_DATA, COMMITMENT_DATA, setSwapDetails} from './test_data.js'
import {swapInit, swapPhase0, swapPhase1, SWAP_STATUS, POLL_UTXO, SwapToken, make_swap_commitment, checkEligibleForSwap, asyncSemaphoreRun} from "../swap/swap";
import {STATECOIN_STATUS} from '../statecoin'
import * as swap from "../swap/swap"

import reducers from '../../reducers';
import { configureStore } from '@reduxjs/toolkit';

import * as MOCK_SERVER from '../mocks/mock_http_client'

import  TestComponent, { render } from './test-utils'

import { handleEndSwap } from '../../features/WalletDataSlice.js';
import { fromSatoshi } from '../util.ts';
import { fireEvent, screen } from '@testing-library/dom';
import { Wallet } from '../wallet.ts';

import { AsyncSemaphore } from "@esfx/async-semaphore";
import { ACTION } from '../activity_log.ts';


import { encryptAES } from '../util.ts';

let bitcoin = require('bitcoinjs-lib')

// client side's mock
let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
// server side's mock
let http_mock = jest.genMockFromModule('../mocks/mock_http_client');
//electrum mock
let electrum_mock = jest.genMockFromModule('../mocks/mock_electrum.ts');


describe('swapToken', function() {
  test('Gen and Verify', async function() {
    SIGNSWAPTOKEN_DATA.forEach(data => {
      let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(data.priv, "hex"));
      expect(proof_key_der.publicKey.toString('hex')).toBe(data.pub);
      let st = data.swap_token;
      let st_cls = new SwapToken(st.id, st.amount, st.time_out, st.statechain_ids);

      let swap_sig = st_cls.sign(proof_key_der,data.swap_token, data.priv);
      expect(swap_sig).toBe(data.swap_token_sig);
    })
  });

  describe('commitment', function() {
    test('Gen and Verify', async function() {
      wasm_mock.Commitment.make_commitment = jest.fn(() => JSON.stringify(COMMITMENT_DATA[0].batch_data));
       COMMITMENT_DATA.forEach(data => {
         let batch_data = make_swap_commitment(data.statecoin, data.swap_info, wasm_mock);
         expect(batch_data.commitment).toBe(data.batch_data.commitment);
       })
     });
  })
});

describe('Do Swap', function(){

  test('do_swap', async function(){

    http_mock.post = jest.fn().mockReset()
    .mockReturnValueOnce({id: null})  

    let wallet = Wallet.buildMock(bitcoin.networks.bitcoin, http_mock, wasm_mock);

    // if in swap phase 4 i.e. swap has timed out but still not complete, resume swap 
    // if in swap phases 0-3
    // test it joins swap

    const MAX_SWAP_SEMAPHORE_COUNT=100;
    const swapSemaphore = new AsyncSemaphore(MAX_SWAP_SEMAPHORE_COUNT);
    const MAX_UPDATE_SWAP_SEMAPHORE_COUNT=1;
    const updateSwapSemaphore = new AsyncSemaphore(MAX_UPDATE_SWAP_SEMAPHORE_COUNT);

    wallet.statecoins.coins[0] = setSwapDetails(wallet.statecoins.coins[0],1)
  
    expect(() => {
      checkEligibleForSwap(wallet.statecoins.coins[0])
    }).toThrow("Coin "+wallet.statecoins.coins[0].getTXIdAndOut()+" already in swap pool.")


    expect(checkEligibleForSwap(wallet.statecoins.coins[1])).toBe()
    // Passes through checks

    await wallet.deRegisterSwapCoin(http_mock, wallet.statecoins.coins[0])
    // Should set all swap data to null e.g. (swap_status & ui_swap_status)
    expect(wallet.statecoins.coins[0].swap_status).toBe(null)

  })

})

describe('resume_swap', function(){

  let wallet = Wallet.buildMock(bitcoin.networks.bitcoin, http_mock, wasm_mock);
    
  wallet.config.update({"jest_testing_mode": true})
  
  const spy = jest.spyOn(swap, 'do_swap_poll');
  
  // For each phase, check expected output:
  // check statecoin && check new_statecoin

  test('Swap Break UI Phase 0', async function() {    
    // do_swap_poll no error thrown && returns null new_statecoin
    // check statecoin returned with all swap values set to null ?
    spy.mockReset().mockReturnValueOnce(null)
    
    wallet.statecoins.coins[0] = setSwapDetails(wallet.statecoins.coins[0],0)
    
    let statecoin = wallet.statecoins.coins[0]
    
    let new_statecoin = await wallet.resume_swap(statecoin)

    expect(new_statecoin).toBe(null)

    // Error thrown from do_swap_poll
    spy.mockReset().mockImplementation(() => {
      throw new Error()
    })

    wallet.statecoins.coins[0] = setSwapDetails( wallet.statecoins.coins[0] , "Reset" )

    wallet.statecoins.coins[0] = setSwapDetails(wallet.statecoins.coins[0],0)

    // Test correct values set before fn call:
    expect(statecoin.status).toBe(STATECOIN_STATUS.AWAITING_SWAP)
    expect(statecoin.swap_status).toBe(SWAP_STATUS.Phase0)
    expect(statecoin.ui_swap_status).toBe(swap.UI_SWAP_STATUS.Phase0)

    
    new_statecoin = await wallet.resume_swap(statecoin)
    
    expect(new_statecoin).toBe(null)

    statecoin = wallet.statecoins.coins[0]
    // Get statecoin value after function call

    expect(statecoin.status).toBe(STATECOIN_STATUS.AVAILABLE)
    expect(statecoin.swap_status).toBe(null)
    expect(statecoin.ui_swap_status).toBe(null)
  })
  test('Swap Break UI Phase 7', async function() {    
    // do_swap_poll no error thrown && returns null new_statecoin
    // check statecoin returned with all swap values set to null ?
    spy.mockReset().mockReturnValueOnce(null)
    
    wallet.statecoins.coins[0] = setSwapDetails(wallet.statecoins.coins[0],1)
    
    let statecoin = wallet.statecoins.coins[0]
    
    let new_statecoin = await wallet.resume_swap(statecoin)

    expect(new_statecoin).toBe(null)

    // Error thrown from do_swap_poll
    spy.mockReset().mockImplementation(() => {
      throw new Error()
    })

    wallet.statecoins.coins[0] = setSwapDetails( wallet.statecoins.coins[0] , "Reset" )

    wallet.statecoins.coins[0] = setSwapDetails(wallet.statecoins.coins[0],"7-Phase4")

    // Test correct values set before fn call:
    expect(statecoin.status).toBe(STATECOIN_STATUS.IN_SWAP)
    expect(statecoin.swap_status).toBe(SWAP_STATUS.Phase4)
    expect(statecoin.ui_swap_status).toBe(swap.UI_SWAP_STATUS.Phase7)

    
    new_statecoin = await wallet.resume_swap(statecoin)
    
    expect(new_statecoin).toBe(null)

    let statecoin_out = wallet.statecoins.coins[0]
    // Get statecoin value after function call

    expect(statecoin_out.status).toBe(statecoin.status)
    expect(statecoin_out.swap_status).toBe(statecoin.swap_status)
    expect(statecoin_out.ui_swap_status).toBe(statecoin.ui_swap_status)
  })
  test('Swap Break UI Phase 8', async function() {    
    // do_swap_poll no error thrown && returns null new_statecoin
    // check statecoin returned with all swap values set to null ?
    spy.mockReset().mockReturnValueOnce(null)

    wallet.statecoins.coins[0] = setSwapDetails(wallet.statecoins.coins[0],8)
    
    let statecoin = wallet.statecoins.coins[0]
    
    let new_statecoin = await wallet.resume_swap(statecoin)

    expect(new_statecoin).toBe(null)

    // Error thrown from do_swap_poll
    spy.mockReset().mockImplementation(() => {
      throw new Error()
    })

    wallet.statecoins.coins[0] = setSwapDetails( wallet.statecoins.coins[0] , "Reset" )

    wallet.statecoins.coins[0] = setSwapDetails(wallet.statecoins.coins[0],8)

    // Test correct values set before fn call:
    expect(statecoin.status).toBe(STATECOIN_STATUS.IN_SWAP)
    expect(statecoin.swap_status).toBe(SWAP_STATUS.Phase4)
    expect(statecoin.ui_swap_status).toBe(swap.UI_SWAP_STATUS.Phase8)

    
    new_statecoin = await wallet.resume_swap(statecoin)
    
    expect(new_statecoin).toBe(null)

    let statecoin_out = wallet.statecoins.coins[0]
    // Get statecoin value after function call

    expect(statecoin_out.status).toBe(statecoin.status)
    expect(statecoin_out.swap_status).toBe(statecoin.swap_status)
    expect(statecoin_out.ui_swap_status).toBe(statecoin.ui_swap_status)

  })
  test('Swap Successful', async function(){
    // New statecoin received:
    let returned_statecoin = makeTesterStatecoin()

    spy.mockReset().mockReturnValueOnce(returned_statecoin)

    wallet.statecoins.coins[0] = setSwapDetails(wallet.statecoins.coins[0],"End")
    let statecoin = wallet.statecoins.coins[0]

    let new_statecoin = await wallet.resume_swap(statecoin)

    expect(returned_statecoin).toBe(new_statecoin)

    expect(new_statecoin.status).toBe(returned_statecoin.status)

    // statecoin deposited by wallet received:
    
    // Check statecoin status set to SWAPPED
    spy.mockReset().mockReturnValueOnce(returned_statecoin)

    wallet.statecoins.coins[0].status = STATECOIN_STATUS.AVAILABLE

    statecoin = wallet.statecoins.coins[0]

    new_statecoin = await wallet.resume_swap(statecoin)

    expect(wallet.statecoins.coins[0].status).toBe(STATECOIN_STATUS.SWAPPED)
    
    spy.mockRestore()
  })
  // test for statecoin.setSwapDataToNull()
})

describe('Swaps', function() {
  test('swapInit', async function() {
    http_mock.post = jest.fn().mockReset()
      .mockReturnValueOnce()
    let statecoin = makeTesterStatecoin();
    let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));
    statecoin.status = STATECOIN_STATUS.AVAILABLE

    let init = await swapInit(http_mock, statecoin, proof_key_der, 10)
    expect(statecoin.swap_status).toBe(SWAP_STATUS.Phase0)

    // try again with swap_status != null
    await expect(swapInit(http_mock, statecoin, proof_key_der, 10))
      .rejects
      .toThrowError("Coin is already involved in a swap. Swap status: Phase0");
  })

  test('swapPhase0', async function() {
    let swap_id = "12345";
    http_mock.post = jest.fn().mockReset()
      .mockReturnValueOnce({id: null})    // return once null => swap has not started
      .mockReturnValueOnce({id: swap_id}) // return once an id => swap has begun

    let statecoin = makeTesterStatecoin();

    // try first without swap_status == Phase0
    statecoin.status = STATECOIN_STATUS.AWAITING_SWAP
    await expect(swapPhase0(http_mock, statecoin))
      .rejects
      .toThrowError("Coin is not yet in this phase of the swap protocol. In phase: null");

    // set swap_status as if coin had already run swapInit
    statecoin.swap_status = SWAP_STATUS.Phase0

    // swap not yet begun
    await swapPhase0(http_mock, statecoin)
    expect(statecoin.swap_status).toBe(SWAP_STATUS.Phase0)
    expect(statecoin.swap_id).toBe(null)
    // swap begun
    await swapPhase0(http_mock, statecoin)
    expect(statecoin.swap_status).toBe(SWAP_STATUS.Phase1)
    expect(statecoin.swap_id.id).toBe(swap_id)
  })

  test('swapPhase1', async function() {
    let swap_info = {
      status: SWAP_STATUS.Phase1,
      swap_token: { id: "12345", amount: 10, time_out: 15, statechain_ids: [] },
      bst_sender_data: {x: "1",q: {x:"1",y:"1"},k: "1",r_prime: {x:"1",y:"1"},}
    }
    http_mock.post = jest.fn().mockReset()
      .mockReturnValueOnce({ id: "00000000-0000-0000-0000-000000000001" })    // return once a swap id => swap has started, polling utxo again
      .mockReturnValueOnce(null)    // return once null => swap has not started
      .mockReturnValueOnce(swap_info) // return once an id => swap has begun

    let statecoin = makeTesterStatecoin();
    let proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));

    // try first without swap_status == Phase0
    statecoin.status = STATECOIN_STATUS.AWAITING_SWAP
    await expect(swapPhase1(http_mock, wasm_mock, statecoin, proof_key_der, proof_key_der))
      .rejects
      .toThrowError("Coin is not in this phase of the swap protocol. In phase: null");

    // Set swap_status as if coin had already run Phase0
    statecoin.swap_status = SWAP_STATUS.Phase1
    await expect(swapPhase1(http_mock, wasm_mock, statecoin, proof_key_der, proof_key_der))
      .rejects
      .toThrowError("No Swap ID found. Swap ID should be set in Phase0.");

    // Set swap_id as if coin had already run Phase0
    statecoin.swap_id = "12345"

    // swap token not yet available
    await swapPhase1(http_mock, wasm_mock, statecoin, proof_key_der, proof_key_der);
    expect(statecoin.swap_status).toBe(SWAP_STATUS.Phase1)
    expect(statecoin.swap_address).toBe(null)
    expect(statecoin.swap_my_bst_data).toBe(null)
    // swap token available
    // await swapPhase1(http_mock, http_mock, wasm_mock, statecoin, proof_key_der, proof_key_der)
    // expect(statecoin.swap_address).toBe(SWAP_STATUS.Phase1)
    // expect(statecoin.swap_my_bst_data).toBe(swap_info)
  })
})


describe('After Swaps Complete', function() {
  // client side's mock
  let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
  // server side's mock
  let http_mock = jest.genMockFromModule('../mocks/mock_http_client');

  let wallet = Wallet.buildMock(bitcoin.networks.bitcoin, http_mock, wasm_mock)

  let wallet_json = wallet.toEncryptedJSON()

  test('Auto-swap clicked after Join Group button', async function(){
    // let wallet_json = Wallet.buildMockToJSON(jest)

    // shared_key_id of statecoin in mock created wallet
    //add statecoin to wallet
    let statecoin = wallet_json.statecoins.coins[0]

    let store = configureStore({reducer: reducers,})

    // test redux state before and after handleEndSwap
    // check: if swap_auto = true then the coin should be added to swapPendingGroup
    let setSwapLoad = jest.fn()
    let swapLoad = {join: false,swapCoin: "", leave:false}

    statecoin.swap_auto = true
    // Turn auto swap on for coin


    const { renderedObj }  = render( store,
      <TestComponent
      wallet_json = {wallet_json}
      dispatchUsed = {true} 
      fn = {handleEndSwap} 
      args = {[statecoin.shared_key_id, { payload: statecoin }, setSwapLoad, swapLoad, fromSatoshi]}
      />
    )

    fireEvent(screen.getByText(/FireFunction/i), new MouseEvent ('click', {
      bubbles: true,
      cancelable: true
    }))

    expect(store.getState().walletData.swapPendingCoins[0]).toBe(statecoin.shared_key_id)

  })

})

