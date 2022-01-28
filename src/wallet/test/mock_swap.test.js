import { makeTesterStatecoin } from './test_data.js'
import { SwapStepResult, SWAP_STATUS, UI_SWAP_STATUS, validateSwap } from "../swap/swap_utils";
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



let bitcoin = require('bitcoinjs-lib')

// // client side's mock
let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
// // server side's mock
let http_mock = jest.genMockFromModule('../mocks/mock_http_client');
// //electrum mock
let electrum_mock = jest.genMockFromModule('../mocks/mock_electrum.ts');

let walletName = `${MOCK_WALLET_NAME}_swap_tests`

let mockDoSwapPoll = jest.fn();

jest.mock( '../swap/swap', () => {
	return jest.fn().mockImplementation(() => {
		return {
			do_swap_poll: mockDoSwapPoll
		};
	});
})


beforeEach(() => {
  Swap.mockClear();
  mockDoSwapPoll.mockClear();
});

function getWallet() {
  let wallet = Wallet.buildMock(bitcoin.networks.bitcoin, walletName);
  wallet.config.min_anon_set = 3
  wallet.config.jest_testing_mode = true
  wallet.http_client = http_mock
  wallet.electrum_mock = electrum_mock
  wallet.wasm = wasm_mock
  return wallet
}

describe('Do Swap', function () {

  let wallet = getWallet()

  test('do_swap', async function () {

    http_mock.post = jest.fn().mockReset()
      .mockReturnValueOnce({ id: null })

    // if in swap phase 4 i.e. swap has timed out but still not complete, resume swap 
    // if in swap phases 0-3
    // test it joins swap

    const MAX_SWAP_SEMAPHORE_COUNT = 100;
    const swapSemaphore = new AsyncSemaphore(MAX_SWAP_SEMAPHORE_COUNT);
    const MAX_UPDATE_SWAP_SEMAPHORE_COUNT = 1;
    const updateSwapSemaphore = new AsyncSemaphore(MAX_UPDATE_SWAP_SEMAPHORE_COUNT);

    wallet.statecoins.coins[0] = setSwapDetails(wallet.statecoins.coins[0], 1)

    let swap = new Swap(wallet, wallet.statecoins.coins[0])

    expect(() => {
      validateSwap(wallet.statecoins.coins[0])
    }).toThrow(Error("Coin " + wallet.statecoins.coins[0].getTXIdAndOut() + " already in swap pool."))


    swap = new Swap(wallet, wallet.statecoins.coins[1])
    expect(validateSwap(wallet.statecoins.coins[1])).toBe()
    // Passes through checks

    await wallet.deRegisterSwapCoin(http_mock, wallet.statecoins.coins[0])
    // Should set all swap data to null e.g. (swap_status & ui_swap_status)
    expect(wallet.statecoins.coins[0].swap_status).toBe(null)
  })

})

describe('resume_swap', function () {

  let wallet = Wallet.buildMock(bitcoin.networks.bitcoin, http_mock, wasm_mock);

  wallet.config.update({ "jest_testing_mode": true })

  // For each phase, check expected output:
  // check statecoin && check new_statecoin

  test('Swap Break UI Phase 0', async function () {
    // do_swap_poll no error thrown && returns null new_statecoin
    // check statecoin returned with all swap values set to null ?

    mockDoSwapPoll = jest.fn(() => null)

    wallet.statecoins.coins[0] = setSwapDetails(wallet.statecoins.coins[0], 0)

    let statecoin = wallet.statecoins.coins[0]

    let new_statecoin = await wallet.resume_swap(statecoin)

    expect(new_statecoin).toBe(null)

    // Error thrown from do_swap_poll
    mockDoSwapPoll = jest.fn(() => {
      throw new Error()
    })

    wallet.statecoins.coins[0] = setSwapDetails(wallet.statecoins.coins[0], "Reset")

    wallet.statecoins.coins[0] = setSwapDetails(wallet.statecoins.coins[0], 0)

    // Test correct values set before fn call:
    expect(statecoin.status).toBe(STATECOIN_STATUS.AWAITING_SWAP)
    expect(statecoin.swap_status).toBe(SWAP_STATUS.Phase0)
    expect(statecoin.ui_swap_status).toBe(UI_SWAP_STATUS.Phase0)


    new_statecoin = await wallet.resume_swap(statecoin)

    expect(new_statecoin).toBe(null)

    statecoin = wallet.statecoins.coins[0]
    // Get statecoin value after function call

    expect(statecoin.status).toBe(STATECOIN_STATUS.AVAILABLE)
    expect(statecoin.swap_status).toBe(null)
    expect(statecoin.ui_swap_status).toBe(null)
  })
  test('Swap Break UI Phase 7', async function () {
    // do_swap_poll no error thrown && returns null new_statecoin
    // check statecoin returned with all swap values set to null ?
    mockDoSwapPoll = jest.fn(() => {
      return null
    })

    wallet.statecoins.coins[0] = setSwapDetails(wallet.statecoins.coins[0], 1)

    let statecoin = wallet.statecoins.coins[0]

    let new_statecoin = await wallet.resume_swap(statecoin)

    expect(new_statecoin).toBe(null)

    // Error thrown from do_swap_poll
    mockDoSwapPoll = jest.fn(() => {
      throw new Error()
    })

    wallet.statecoins.coins[0] = setSwapDetails(wallet.statecoins.coins[0], "Reset")

    wallet.statecoins.coins[0] = setSwapDetails(wallet.statecoins.coins[0], "7-Phase4")

    // Test correct values set before fn call:
    expect(statecoin.status).toBe(STATECOIN_STATUS.IN_SWAP)
    expect(statecoin.swap_status).toBe(SWAP_STATUS.Phase4)
    expect(statecoin.ui_swap_status).toBe(UI_SWAP_STATUS.Phase7)


    new_statecoin = await wallet.resume_swap(statecoin)

    expect(new_statecoin).toBe(null)

    let statecoin_out = wallet.statecoins.coins[0]
    // Get statecoin value after function call

    expect(statecoin_out.status).toBe(statecoin.status)
    expect(statecoin_out.swap_status).toBe(statecoin.swap_status)
    expect(statecoin_out.ui_swap_status).toBe(statecoin.ui_swap_status)
  })
  test('Swap Break UI Phase 8', async function () {
    // do_swap_poll no error thrown && returns null new_statecoin
    // check statecoin returned with all swap values set to null ?
    mockDoSwapPoll = jest.fn(() => {
      return null
    })

    wallet.statecoins.coins[0] = setSwapDetails(wallet.statecoins.coins[0], 8)

    let statecoin = wallet.statecoins.coins[0]

    let new_statecoin = await wallet.resume_swap(statecoin)

    expect(new_statecoin).toBe(null)

    // Error thrown from do_swap_poll
    mockDoSwapPoll = jest.fn(() => {
      throw new Error()
    })

    wallet.statecoins.coins[0] = setSwapDetails(wallet.statecoins.coins[0], "Reset")

    wallet.statecoins.coins[0] = setSwapDetails(wallet.statecoins.coins[0], 8)

    // Test correct values set before fn call:
    expect(statecoin.status).toBe(STATECOIN_STATUS.IN_SWAP)
    expect(statecoin.swap_status).toBe(SWAP_STATUS.Phase4)
    expect(statecoin.ui_swap_status).toBe(UI_SWAP_STATUS.Phase8)


    new_statecoin = await wallet.resume_swap(statecoin)

    expect(new_statecoin).toBe(null)

    let statecoin_out = wallet.statecoins.coins[0]
    // Get statecoin value after function call

    expect(statecoin_out.status).toBe(statecoin.status)
    expect(statecoin_out.swap_status).toBe(statecoin.swap_status)
    expect(statecoin_out.ui_swap_status).toBe(statecoin.ui_swap_status)

  })
})

describe('Resume Swap Successful', function () {
  let wallet = getWallet()
  test('Swap Successful', async function () {
    // New statecoin received:
    let returned_statecoin = makeTesterStatecoin()
    mockDoSwapPoll.mockClear()
    mockDoSwapPoll = jest.fn(() => {
      return returned_statecoin
    })


    wallet.statecoins.coins[0] = setSwapDetails(wallet.statecoins.coins[0], "End")
    let statecoin = wallet.statecoins.coins[0]

    let new_statecoin = await wallet.resume_swap(statecoin)

    expect(returned_statecoin).toBe(new_statecoin)

    expect(new_statecoin.status).toBe(returned_statecoin.status)

    // statecoin deposited by wallet received:

    // Check statecoin status set to SWAPPED
    wallet.statecoins.coins[0].status = STATECOIN_STATUS.AVAILABLE

    statecoin = wallet.statecoins.coins[0]

    new_statecoin = await wallet.resume_swap(statecoin)

    expect(wallet.statecoins.coins[0].status).toBe(STATECOIN_STATUS.SWAPPED)
    Swap.mockReset()
  })
})


describe('After Swaps Complete', function () {
  // client side's mock
  let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
  // server side's mock
  let http_mock = jest.genMockFromModule('../mocks/mock_http_client');

  let wallet = Wallet.buildMock(bitcoin.networks.bitcoin, http_mock, wasm_mock)

  let wallet_json = wallet.toEncryptedJSON()

  test('Auto-swap clicked after Join Group button', async function () {
    // let wallet_json = Wallet.buildMockToJSON(jest)

    // shared_key_id of statecoin in mock created wallet
    //add statecoin to wallet
    let statecoin = wallet_json.statecoins.coins[0]

    let store = configureStore({ reducer: reducers, })

    // test redux state before and after handleEndSwap
    // check: if swap_auto = true then the coin should be added to swapPendingGroup
    let setSwapLoad = jest.fn()
    let swapLoad = { join: false, swapCoin: "", leave: false }

    statecoin.swap_auto = true
    // Turn auto swap on for coin


    const { renderedObj } = render(store,
      <TestComponent
        wallet_json={wallet_json}
        dispatchUsed={true}
        fn={handleEndSwap}
        args={[statecoin.shared_key_id, { payload: statecoin }, setSwapLoad, swapLoad, fromSatoshi]}
      />
    )

    fireEvent(screen.getByText(/FireFunction/i), new MouseEvent('click', {
      bubbles: true,
      cancelable: true
    }))

    expect(store.getState().walletData.swapPendingCoins[0]).toBe(statecoin.shared_key_id)

  })

})


