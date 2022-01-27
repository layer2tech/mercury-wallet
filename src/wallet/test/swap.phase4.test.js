import {makeTesterStatecoin, STATECOIN_SWAP_DATA, SWAP_SHARED_KEY_OUT} from './test_data.js'
import { SWAP_STATUS,
   SwapRetryError, UI_SWAP_STATUS} from "../swap/swap_utils";
import Swap from "../swap/swap"
import {STATECOIN_STATUS} from '../statecoin'
import { REQUESTOR_CALC_S, MAKE_BST, POST_BST } from '../mocks/mock_wasm'
import { SWAP_SECOND_SCE_ADDRESS } from '../mocks/mock_http_client';
import * as MOCK_SERVER from '../mocks/mock_http_client'
import { GET_ROUTE, POST_ROUTE } from '../http_client';
import { Wallet, MOCK_WALLET_NAME, MOCK_WALLET_PASSWORD } from '../wallet';
import { ACTION } from '..';
import { Transaction } from 'bitcoinjs-lib';
import { swapPhase4 as swapPhase4Steps } from '../swap/swap.phase4'

// Logger import.
// Node friendly importing required for Jest tests.
let log;
try {
  log = window.require('electron-log');
} catch (e) {
  log = require('electron-log');
}

let walletName = `${MOCK_WALLET_NAME}_phase4_tests`

let mock_http_client = require('../mocks/mock_http_client')

let mock_wasm = require('../mocks/mock_wasm')

let cloneDeep = require('lodash.clonedeep');

let bitcoin = require('bitcoinjs-lib')

// client side's mock
let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
// server side's mock
let http_mock = jest.genMockFromModule('../mocks/mock_http_client');

const post_error = (path, body) => { 
  return new Error(`Error from POST request - path: ${path}, body: ${body}`)
}

const get_error = (path, params) => { 
  return new Error(`Error from GET request - path: ${path}, params: ${params}`)
}

const wasm_err = (message) => {
  return new Error(`Error from wasm_mock: ${message}`)
}

const SHARED_KEY_DUMMY = {public:{q: "",p2: "",p1: "",paillier_pub: {},c_key: "",},private: "",chain_code: ""};

//Set a valid initial statecoin status for phase4
function get_statecoin_in() {
  let statecoin = makeTesterStatecoin();
  statecoin.status = STATECOIN_STATUS.IN_SWAP
  statecoin.swap_status = SWAP_STATUS.Phase4
  statecoin.swap_id = { "id": "a swap id" }
  statecoin.swap_my_bst_data = "a my bst data"
  statecoin.swap_info = mock_http_client.SWAP_INFO
  statecoin.swap_transfer_finalized_data = mock_http_client.TRANSFER_FINALIZE_DATA
  return statecoin
}

function get_statecoin_out_expected(statecoin_out, smt_proof = null){
  let statecoin_out_expected = get_statecoin_in()
  statecoin_out_expected.value = 100000
  statecoin_out_expected.swap_rounds = 1
  statecoin_out_expected.anon_set = 5
  statecoin_out_expected.swap_status = null
  statecoin_out_expected.swap_transfer_finalized_data = null
  statecoin_out_expected.status = STATECOIN_STATUS.AVAILABLE
  statecoin_out_expected.shared_key_id = mock_http_client.TRANSFER_FINALIZE_DATA.new_shared_key_id
  statecoin_out_expected.statechain_id = mock_http_client.TRANSFER_FINALIZE_DATA.statechain_id
  statecoin_out_expected.funding_txid = mock_http_client.RECOVERY_STATECHAIN_DATA.utxo.txid
  statecoin_out_expected.is_new = true
  statecoin_out_expected.proof_key = 
    mock_http_client.RECOVERY_STATECHAIN_DATA.chain[mock_http_client.RECOVERY_STATECHAIN_DATA.chain.length-1].data
  statecoin_out_expected.sc_address = "sc1qvl2s57h77wr93wjvtgdtkzetv2ypjw67k8qysz82zltvjgds29vq3ahfez"
  statecoin_out_expected.shared_key = SWAP_SHARED_KEY_OUT
  statecoin_out_expected.swap_my_bst_data = null
  statecoin_out_expected.swap_id = null
  statecoin_out_expected.swap_info = null
  statecoin_out_expected.timestamp = statecoin_out.timestamp
  statecoin_out_expected.tx_backup =  Transaction.fromHex(
    mock_http_client.TRANSFER_FINALIZE_DATA.tx_backup_psm.tx_hex);
  statecoin_out_expected.smt_proof = smt_proof
  return statecoin_out_expected;
}

async function swapPhase4(swap) {
  swap.setSwapSteps(swapPhase4Steps(swap))
  let result
  for(let i=0; i< swap.swap_steps.length; i++){
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

describe('Swap phase 4', function() {
  test('swapPhase4 test 1 - invalid initial statecoin state', async function() {
    
  let statecoin = get_statecoin_in()
  const INIT_STATECOIN = cloneDeep(statecoin)

  let wallet = getWallet()
  let swap

  //Test invalid statecoin statuses
  for (let i=0; i< STATECOIN_STATUS.length; i++){
    if(STATECOIN_STATUS[i] !== STATECOIN_STATUS.IN_SWAP){
      const sc_status = STATECOIN_STATUS[i]
      statecoin.status=cloneDeep(sc_status)
      swap = new Swap(wallet, statecoin, null, null) 
      await expect(swapPhase4(swap)).rejects.toThrowError(`Coin status is not IN_SWAP. Status: ${sc_status}`)
    }
  }
  
  //Set valid statecoin status
  statecoin.status = STATECOIN_STATUS.IN_SWAP

  //Test invalid statecoin swap statuses
  for (let i=0; i< SWAP_STATUS.length; i++){
    if(SWAP_STATUS[i] !== SWAP_STATUS.Phase4){
      const swap_status = STATECOIN_STATUS[i]
      statecoin.swap_status=cloneDeep(swap_status)
        swap = new Swap(wallet, statecoin, null, null) 
        await expect(swapPhase4(swap))
        .rejects.toThrowError(`phase Phase4:swapPhase4PollSwap: invalid swap status: ${statecoin.swap_status}`);
        expect(statecoin).toEqual(INIT_STATECOIN)
        
        swap = new Swap(wallet, statecoin, null, null) 
        await expect(swapPhase4(swap))
        .rejects.toThrow(Error);
        expect(statecoin).toEqual(INIT_STATECOIN)
    }
  }

  statecoin.swap_status=null
  swap = new Swap(wallet, statecoin, null, null) 
  await expect(swapPhase4(swap))
    .rejects.toThrowError(`phase Phase4:swapPhase4PollSwap: invalid swap status: ${statecoin.swap_status}`)
    let sc_null_swap_status=cloneDeep(INIT_STATECOIN)
    sc_null_swap_status.swap_status=null
    expect(statecoin).toEqual(sc_null_swap_status)
    
  swap = new Swap(wallet, statecoin, null, null) 
  await expect(swapPhase4(swap))
    .rejects.toThrow(Error)
    expect(statecoin).toEqual(sc_null_swap_status)
      
  //Set valid swap status
  statecoin.swap_status = SWAP_STATUS.Phase4

  //Test invalid swap_id and swap_my_bst_data
  statecoin.swap_id=null
  statecoin.swap_info=null
  statecoin.swap_transfer_finalized_data=null

  swap = new Swap(wallet, statecoin, null, null) 
  await expect(swapPhase4(swap))
    .rejects.toThrowError("No Swap ID found. Swap ID should be set in Phase0.")

  //Set swap_id to some value
  statecoin.swap_id = { "id": "a swap id" }

  swap = new Swap(wallet, statecoin, null, null) 
  await expect(swapPhase4(swap))
    .rejects.toThrowError("No swap info found for coin. Swap info should be set in Phase1.")

  statecoin.swap_info = "a swap info"

  swap = new Swap(wallet, statecoin, null, null) 
  await expect(swapPhase4(swap))
    .rejects.toThrowError("No transfer finalize data found for coin. Transfer finalize data should be set in Phase1.")

})
      
test('swapPhase4 test 2 - server responds to pollSwap with miscellaneous error', async function() {
    
  const server_error = () => { return new Error("Misc server error")}
  http_mock.post = jest.fn((path, body) => {
    if(path === POST_ROUTE.SWAP_POLL_SWAP){
      throw server_error()
    }
  })

  let statecoin = get_statecoin_in()
 
  const INIT_STATECOIN = cloneDeep(statecoin)
   
  let wallet = getWallet()
  let swap = new Swap(wallet, statecoin, null, null) 

  let result = await swapPhase4(swap)
  expect(result.is_ok()).toEqual(false)
  expect(result.message).toEqual(`${server_error().message}`)

  //Expect statecoin and to be unchanged
  expect(statecoin).toEqual(INIT_STATECOIN)  
  })

  test('swapPhase4 test 3 - server responds to pollSwap with invalid status', async function() {
    
    let statecoin = get_statecoin_in()
  
    const INIT_STATECOIN = cloneDeep(statecoin)
    
    //Test unexpected phases
    for(let i=0; i<SWAP_STATUS.length; i++){
      const phase = SWAP_STATUS[i]
      http_mock.post = jest.fn((path, body) => {
        if(path === POST_ROUTE.SWAP_POLL_SWAP){
            return phase
          }
        })
        if (phase !== SWAP_STATUS.Phase4 && phase !== null){
          await expect(swapPhase4(http_mock, null, statecoin, null))
            .rejects.toThrow(Error)
            expect(statecoin).toEqual(INIT_STATECOIN)
          await expect(swapPhase4(http_mock, null, statecoin, null))
            .rejects.toThrowError(`Swap error: Expected swap phase4. Received: ${phase}`)
            expect(statecoin).toEqual(INIT_STATECOIN)
        } 
    }
  })

  test('swapPhase4 test 4 - error requesting keygen first in transferReceiverFinalize', async function() {
    
    let statecoin = get_statecoin_in()
   
    let updated_statecoin = cloneDeep(statecoin)
    updated_statecoin.ui_swap_status = UI_SWAP_STATUS.Phase8
    const UPDATED_STATECOIN = cloneDeep(updated_statecoin)
  
    let valid_phases = [SWAP_STATUS.Phase4, null]

    for (let i=0; i < valid_phases.length; i++) {
      http_mock.post = jest.fn((path, body) => {
        if(path === POST_ROUTE.SWAP_POLL_SWAP){
          return valid_phases[i]
        }
        if(path === POST_ROUTE.KEYGEN_FIRST){
          throw post_error(path,JSON.stringify(body))
        }
      })

      http_mock.get = jest.fn((path, param) => {
        if(path === GET_ROUTE.TRANSFER_BATCH) {
          return {
            "state_chains": ["sc1", "sc2"],
            "finalized": false,
          }
        }
      })

      let wallet = getWallet()
      let swap = new Swap(wallet, statecoin, null, null) 

      let result = await swapPhase4(swap)
      expect(result.is_ok()).toEqual(false)
      expect(result.message).toEqual(`statecoin ${statecoin.shared_key_id} waiting for completion of batch transfer in swap ID ${statecoin.swap_id.id}`)
      expect(statecoin).toEqual(UPDATED_STATECOIN)
    }
  })

  test('swapPhase4 test 5 - error from client keygen first message transferReceiverFinalize', async function() {
    let statecoin = get_statecoin_in()
   
    let updated_statecoin = cloneDeep(statecoin)
    updated_statecoin.ui_swap_status = UI_SWAP_STATUS.Phase8
    const UPDATED_STATECOIN = cloneDeep(updated_statecoin)
  
    let valid_phases = [SWAP_STATUS.Phase4, null]

    wasm_mock.KeyGen.first_message = jest.fn((_secret_key) => {
      throw wasm_err("KeyGen.keygen_first")
    })

    let wallet = getWallet()

    for (let i=0; i < valid_phases.length; i++) {
      http_mock.post = jest.fn((path, body) => {
        if(path === POST_ROUTE.SWAP_POLL_SWAP){
          return valid_phases[i]
        }
        if(path === POST_ROUTE.KEYGEN_FIRST){
          return mock_http_client.KEYGEN_FIRST
        }
        if(path === POST_ROUTE.KEYGEN_SECOND){
          throw post_error(path)
        }
      })

      let swap = new Swap(wallet, statecoin, null, null) 
      let result = await swapPhase4(swap)
      expect(result.is_ok()).toEqual(false)
      expect(result.message).toEqual(`wasm_client.KeyGen.first_message: Error: Error from wasm_mock: KeyGen.keygen_first`)
      expect(statecoin).toEqual(UPDATED_STATECOIN)
    }
  })

  test('swapPhase4 test 6 - error requesting keygen second in transferReceiverFinalize', async function() {
    let statecoin = get_statecoin_in()
       
    let updated_statecoin = cloneDeep(statecoin)
    updated_statecoin.ui_swap_status = UI_SWAP_STATUS.Phase8
    const UPDATED_STATECOIN = cloneDeep(updated_statecoin)
  
    let valid_phases = [SWAP_STATUS.Phase4, null]

    wasm_mock.KeyGen.first_message = jest.fn((_secret_key) => {
      return mock_wasm.KEYGEN_FIRST
    })

    let wallet = getWallet()

    for (let i=0; i < valid_phases.length; i++) {
      http_mock.post = jest.fn((path, body) => {
        if(path === POST_ROUTE.SWAP_POLL_SWAP){
          return valid_phases[i]
        }
        if(path === POST_ROUTE.KEYGEN_FIRST){
          return mock_http_client.KEYGEN_FIRST
        }
        if(path === POST_ROUTE.KEYGEN_SECOND){
          throw post_error(path)
        }
      })

      let swap = new Swap(wallet, statecoin, null, null)
      let result = await swapPhase4(swap)
      expect(result.is_ok()).toEqual(false)
      expect(result.message).toEqual(`ecdsa/keygen/second: Error: ${post_error(POST_ROUTE.KEYGEN_SECOND).message}`)
      expect(statecoin).toEqual(UPDATED_STATECOIN)
    }
  })

  test('swapPhase4 test 7 - error requesting keygen second in transferReceiverFinalize', async function() {
    let statecoin = get_statecoin_in()
   
    let updated_statecoin = cloneDeep(statecoin)
    updated_statecoin.ui_swap_status = UI_SWAP_STATUS.Phase8
    const UPDATED_STATECOIN = cloneDeep(updated_statecoin)
  
    let valid_phases = [SWAP_STATUS.Phase4, null]

    wasm_mock.KeyGen.first_message = jest.fn((_secret_key) => {
      return mock_wasm.KEYGEN_FIRST
    })

    let wallet = getWallet()

    for (let i=0; i < valid_phases.length; i++) {
      http_mock.post = jest.fn((path, body) => {
        if(path === POST_ROUTE.SWAP_POLL_SWAP){
          return valid_phases[i]
        }
        if(path === POST_ROUTE.KEYGEN_FIRST){
          return mock_http_client.KEYGEN_FIRST
        }
        if(path === POST_ROUTE.KEYGEN_SECOND){
          throw post_error(path)
        }
      })

      let swap = new Swap(wallet, statecoin, null, null)
      let result = await swapPhase4(swap)
      expect(result.is_ok()).toEqual(false)
      expect(result.message).toEqual(`ecdsa/keygen/second: Error: ${post_error(POST_ROUTE.KEYGEN_SECOND).message}`)
      expect(statecoin).toEqual(UPDATED_STATECOIN)
    }
  })

  test('swapPhase4 test 8 - error client keygen second in transferReceiverFinalize', async function() {
    let statecoin = get_statecoin_in()
   
    let updated_statecoin = cloneDeep(statecoin)
    updated_statecoin.ui_swap_status = UI_SWAP_STATUS.Phase8
    const UPDATED_STATECOIN = cloneDeep(updated_statecoin)
  
    let valid_phases = [SWAP_STATUS.Phase4, null]

    wasm_mock.KeyGen.first_message = jest.fn((_secret_key) => {
      return mock_wasm.KEYGEN_FIRST
    })

    wasm_mock.KeyGen.second_message = jest.fn((_param1, _param2) => {
      throw wasm_err("KeyGen.second_message")
    })

    let wallet = getWallet()

    for (let i=0; i < valid_phases.length; i++) {
      http_mock.post = jest.fn((path, body) => {
        if(path === POST_ROUTE.SWAP_POLL_SWAP){
          return valid_phases[i]
        }
        if(path === POST_ROUTE.KEYGEN_FIRST){
          return mock_http_client.KEYGEN_FIRST
        }
        if(path === POST_ROUTE.KEYGEN_SECOND){
          return mock_http_client.KEYGEN_SECOND
        }
      })

      let swap = new Swap(wallet, statecoin, null, null)
      let result = await swapPhase4(swap)
      expect(result.is_ok()).toEqual(false)
      expect(result.message).toEqual(`wasm_client.KeyGen.second_message: Error: ${wasm_err("KeyGen.second_message").message}`)
      expect(statecoin).toEqual(UPDATED_STATECOIN)
    }
  })

  test('swapPhase4 test 9 - error from client set master key in transferReceiverFinalize', async function() {
    let statecoin = get_statecoin_in()
   
    let updated_statecoin = cloneDeep(statecoin)
    updated_statecoin.ui_swap_status = UI_SWAP_STATUS.Phase8
    const UPDATED_STATECOIN = cloneDeep(updated_statecoin)
  
    let valid_phases = [SWAP_STATUS.Phase4, null]

    wasm_mock.KeyGen.first_message = jest.fn((_secret_key) => {
      return mock_wasm.KEYGEN_FIRST
    })

    wasm_mock.KeyGen.second_message = jest.fn((_param1, _param2) => {
      return mock_wasm.KEYGEN_SECOND
    })

    wasm_mock.KeyGen.set_master_key = jest.fn((_param1, _param2, _param3) => {
      throw wasm_err("KeyGen.set_master_key")
    })

    let wallet = getWallet()

    for (let i=0; i < valid_phases.length; i++) {
      http_mock.post = jest.fn((path, body) => {
        if(path === POST_ROUTE.SWAP_POLL_SWAP){
          return valid_phases[i]
        }
        if(path === POST_ROUTE.KEYGEN_FIRST){
          return mock_http_client.KEYGEN_FIRST
        }
        if(path === POST_ROUTE.KEYGEN_SECOND){
          return mock_http_client.KEYGEN_SECOND
        }
      })

      let swap = new Swap(wallet, statecoin, null, null)
      let result = await swapPhase4(swap)
      expect(result.is_ok()).toEqual(false)
      expect(result.message).toEqual(`wasm_client.KeyGen.set_master_key: Error: ${wasm_err("KeyGen.set_master_key").message}`)
      expect(statecoin).toEqual(UPDATED_STATECOIN)
    }
  })

  test('swapPhase4 test 10 - error getting SMT root', async function() {
    let statecoin = get_statecoin_in()
   
    let updated_statecoin = cloneDeep(statecoin)
    updated_statecoin.ui_swap_status = UI_SWAP_STATUS.End
    updated_statecoin.swap_status = SWAP_STATUS.End
    const UPDATED_STATECOIN = cloneDeep(updated_statecoin)
  
    let valid_phases = [SWAP_STATUS.Phase4, null]

    wasm_mock.KeyGen.first_message = jest.fn((_secret_key) => {
      return mock_wasm.KEYGEN_FIRST
    })

    wasm_mock.KeyGen.second_message = jest.fn((_param1, _param2) => {
      return mock_wasm.KEYGEN_SECOND
    })

    wasm_mock.KeyGen.set_master_key = jest.fn((_param1, _param2, _param3) => {
      return mock_wasm.KEYGEN_SET_MASTER_KEY
    })

    for (let i=0; i < valid_phases.length; i++) {
      http_mock.post = jest.fn((path, body) => {
        if(path === POST_ROUTE.SWAP_POLL_SWAP){
          return valid_phases[i]
        }
        if(path === POST_ROUTE.KEYGEN_FIRST){
          return mock_http_client.KEYGEN_FIRST
        }
        if(path === POST_ROUTE.KEYGEN_SECOND){
          return mock_http_client.KEYGEN_SECOND
        }
        if(path === POST_ROUTE.SMT_PROOF){
          throw post_error(path)
        }
      })

      http_mock.get = jest.fn((path, params) => {
        if(path === GET_ROUTE.ROOT){
          throw get_error(path)
        }
      })

      let sc_clone_1 = cloneDeep(statecoin)
  
      let wallet = getWallet();
      wallet.addStatecoinFromValues("c93ad45a-00b9-449c-a804-aab5530efc90", 
        SHARED_KEY_DUMMY, 0.1, 
        "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41", 
        0, "03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477", 
        ACTION.DEPOSIT)
      wallet.config.update({"jest_testing_mode": true})

      let swap = new Swap(wallet, sc_clone_1, null, null)
      let result = await swapPhase4(swap);
      expect(result.is_ok()).toEqual(true)
      expect(sc_clone_1).toEqual(UPDATED_STATECOIN)
    
      let statecoin_out_expected = get_statecoin_out_expected(swap.statecoin_out);
  
      expect(swap.statecoin_out).toEqual(statecoin_out_expected)
    }
  })

  test('swapPhase4 test 11 - error getting SMT proof', async function() {
    let statecoin = get_statecoin_in()
   
    let updated_statecoin = cloneDeep(statecoin)
    updated_statecoin.ui_swap_status = UI_SWAP_STATUS.End
    updated_statecoin.swap_status = SWAP_STATUS.End
    const UPDATED_STATECOIN = cloneDeep(updated_statecoin)
  
    let valid_phases = [SWAP_STATUS.Phase4, null]

    wasm_mock.KeyGen.first_message = jest.fn((_secret_key) => {
      return mock_wasm.KEYGEN_FIRST
    })

    wasm_mock.KeyGen.second_message = jest.fn((_param1, _param2) => {
      return mock_wasm.KEYGEN_SECOND
    })

    wasm_mock.KeyGen.set_master_key = jest.fn((_param1, _param2, _param3) => {
      return mock_wasm.KEYGEN_SET_MASTER_KEY
    })

    for (let i=0; i < valid_phases.length; i++) {
      http_mock.post = jest.fn((path, body) => {
        if(path === POST_ROUTE.SWAP_POLL_SWAP){
          return valid_phases[i]
        }
        if(path === POST_ROUTE.KEYGEN_FIRST){
          return mock_http_client.KEYGEN_FIRST
        }
        if(path === POST_ROUTE.KEYGEN_SECOND){
          return mock_http_client.KEYGEN_SECOND
        }
        if(path === POST_ROUTE.SMT_PROOF){
          throw post_error(path)
        }
      })

      http_mock.get = jest.fn((path, params) => {
        return mock_http_client.ROOT_INFO
      })

      let sc_clone_1 = cloneDeep(statecoin)
  
      let wallet = getWallet();
      wallet.addStatecoinFromValues("c93ad45a-00b9-449c-a804-aab5530efc90", 
        SHARED_KEY_DUMMY, 0.1, 
        "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41", 
        0, "03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477", 
        ACTION.DEPOSIT)
      wallet.config.update({"jest_testing_mode": true})

      let swap = new Swap(wallet, sc_clone_1, null, null)
      let result = await swapPhase4(swap);
      expect(result.is_ok()).toEqual(true)
      expect(sc_clone_1).toEqual(UPDATED_STATECOIN)
    
      let statecoin_out_expected = get_statecoin_out_expected(swap.statecoin_out)
      
      expect(swap.statecoin_out).toEqual(statecoin_out_expected)
    }
  })

  test('swapPhase4 test 12 - error verifying SMT root', async function() {
    let statecoin = get_statecoin_in()
   
    let updated_statecoin = cloneDeep(statecoin)
    updated_statecoin.ui_swap_status = UI_SWAP_STATUS.End
    updated_statecoin.swap_status = SWAP_STATUS.End
    const UPDATED_STATECOIN = cloneDeep(updated_statecoin)
  
    let valid_phases = [SWAP_STATUS.Phase4, null]

    wasm_mock.KeyGen.first_message = jest.fn((_secret_key) => {
      return mock_wasm.KEYGEN_FIRST
    })

    wasm_mock.KeyGen.second_message = jest.fn((_param1, _param2) => {
      return mock_wasm.KEYGEN_SECOND
    })

    wasm_mock.KeyGen.set_master_key = jest.fn((_param1, _param2, _param3) => {
      return mock_wasm.KEYGEN_SET_MASTER_KEY
    })

    wasm_mock.verify_statechain_smt = jest.fn((_param1, _param2, _param3) => {
      return false
    })

    for (let i=0; i < valid_phases.length; i++) {
      http_mock.post = jest.fn((path, body) => {
        if(path === POST_ROUTE.SWAP_POLL_SWAP){
          return valid_phases[i]
        }
        if(path === POST_ROUTE.KEYGEN_FIRST){
          return mock_http_client.KEYGEN_FIRST
        }
        if(path === POST_ROUTE.KEYGEN_SECOND){
          return mock_http_client.KEYGEN_SECOND
        }
        if(path === POST_ROUTE.SMT_PROOF){
          return mock_http_client.SMT_PROOF
        }
      })

      http_mock.get = jest.fn((path, params) => {
        if(path === GET_ROUTE.ROOT){
          return mock_http_client.ROOT_INFO
        }
      })

      let sc_clone_1 = cloneDeep(statecoin)
  
      let wallet = getWallet();
      wallet.addStatecoinFromValues("c93ad45a-00b9-449c-a804-aab5530efc90", 
        SHARED_KEY_DUMMY, 0.1, 
        "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41", 
        0, "03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477", 
        ACTION.DEPOSIT)
      wallet.config.update({"jest_testing_mode": true})

      let swap = new Swap(wallet, sc_clone_1, null, null)
      let result = await swapPhase4(swap);
      expect(result.is_ok()).toEqual(true)
      expect(sc_clone_1).toEqual(UPDATED_STATECOIN)
    
      let statecoin_out_expected = get_statecoin_out_expected(swap.statecoin_out, mock_http_client.SMT_PROOF)
      
      expect(swap.statecoin_out).toEqual(statecoin_out_expected)
    }
  })

  test('swapPhase4 test 13 - no errors', async function() {
    let statecoin = get_statecoin_in()
   
    let updated_statecoin = cloneDeep(statecoin)
    updated_statecoin.ui_swap_status = UI_SWAP_STATUS.End
    updated_statecoin.swap_status = SWAP_STATUS.End
    const UPDATED_STATECOIN = cloneDeep(updated_statecoin)
  
    let valid_phases = [SWAP_STATUS.Phase4, null]

    wasm_mock.KeyGen.first_message = jest.fn((_secret_key) => {
      return mock_wasm.KEYGEN_FIRST
    })

    wasm_mock.KeyGen.second_message = jest.fn((_param1, _param2) => {
      return mock_wasm.KEYGEN_SECOND
    })

    wasm_mock.KeyGen.set_master_key = jest.fn((_param1, _param2, _param3) => {
      return mock_wasm.KEYGEN_SET_MASTER_KEY
    })

    wasm_mock.verify_statechain_smt = jest.fn((_param1, _param2, _param3) => {
      return true
    })

    for (let i=0; i < valid_phases.length; i++) {
      http_mock.post = jest.fn((path, body) => {
        if(path === POST_ROUTE.SWAP_POLL_SWAP){
          return valid_phases[i]
        }
        if(path === POST_ROUTE.KEYGEN_FIRST){
          return mock_http_client.KEYGEN_FIRST
        }
        if(path === POST_ROUTE.KEYGEN_SECOND){
          return mock_http_client.KEYGEN_SECOND
        }
        if(path === POST_ROUTE.SMT_PROOF){
          return mock_http_client.SMT_PROOF
        }
      })

      http_mock.get = jest.fn((path, params) => {
        if(path === GET_ROUTE.ROOT){
          return mock_http_client.ROOT_INFO
        }
      })

      let sc_clone_1 = cloneDeep(statecoin)
  
      let wallet = getWallet();
      wallet.addStatecoinFromValues("c93ad45a-00b9-449c-a804-aab5530efc90", 
        SHARED_KEY_DUMMY, 0.1, 
        "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41", 
        0, "03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477", 
        ACTION.DEPOSIT)
      wallet.config.update({"jest_testing_mode": true})

      let swap = new Swap(wallet, sc_clone_1, null, null)
      let result = await swapPhase4(swap);

      expect(result.is_ok()).toEqual(true)
      expect(sc_clone_1).toEqual(UPDATED_STATECOIN)
    
      let statecoin_out_expected = get_statecoin_out_expected(swap.statecoin_out, mock_http_client.SMT_PROOF)
      
      expect(swap.statecoin_out).toEqual(statecoin_out_expected)
    }
  })

  test('swapPhase4 test 14 - error from client keygen first message transferReceiverFinalize - No data for identifier', async function() {
    let statecoin = get_statecoin_in()
   
    let updated_statecoin = cloneDeep(statecoin)
    updated_statecoin.ui_swap_status = UI_SWAP_STATUS.Phase8
    const UPDATED_STATECOIN = cloneDeep(updated_statecoin)
  
    let valid_phases = [SWAP_STATUS.Phase4, null]


    for (let i=0; i < valid_phases.length; i++) {
      http_mock.post = jest.fn((path, body) => {
        if(path === POST_ROUTE.SWAP_POLL_SWAP){
          return valid_phases[i]
        }
        if(path === POST_ROUTE.KEYGEN_FIRST){
          throw new Error("No data for identifier")
        }
      })

      http_mock.get = jest.fn((path, params) => {
        if(path === GET_ROUTE.TRANSFER_BATCH){
          return {
            "state_chains": ["sc1","sc2"],
            "finalized": false,
          }
        }
      })

      let wallet = getWallet();
      let swap = new Swap(wallet, statecoin, null, null)
      let result = await swapPhase4(swap)
      expect(result.is_ok()).toEqual(false)
      expect(result.message).toEqual(`statecoin ${UPDATED_STATECOIN.shared_key_id} waiting for completion of batch transfer in swap ID ${UPDATED_STATECOIN.swap_id.id}`)
      expect(statecoin).toEqual(UPDATED_STATECOIN)
    }
  })

  test('swapPhase4 test 15 - error from client keygen first message transferReceiverFinalize - batch transfer status: not finalized', async function() {
    let statecoin = get_statecoin_in()
   
    let updated_statecoin = cloneDeep(statecoin)
    updated_statecoin.ui_swap_status = UI_SWAP_STATUS.Phase8
    const UPDATED_STATECOIN = cloneDeep(updated_statecoin)
  
      http_mock.post = jest.fn((path, body) => {
        if(path === POST_ROUTE.SWAP_POLL_SWAP){
          return null
        }
        if(path === POST_ROUTE.KEYGEN_FIRST){
          throw new Error("keygen first error")
        }
      })

      http_mock.get = jest.fn((path, params) => {
        if(path === GET_ROUTE.TRANSFER_BATCH){
          return {
            "state_chains": ["sc1", "sc2"],
            "finalized": false,
          }
        }
      })

      let wallet = getWallet()
      let swap = new Swap(wallet, statecoin, null, null)

      let result = await swapPhase4(swap)
      expect(result.is_ok()).toEqual(false)
      expect(result.message).toEqual(`statecoin ${UPDATED_STATECOIN.shared_key_id} waiting for completion of batch transfer in swap ID ${UPDATED_STATECOIN.swap_id.id}`)
      expect(statecoin).toEqual(UPDATED_STATECOIN)
  })

  test('swapPhase4 test 16 - error from client keygen first message transferReceiverFinalize - batch transfer status: finalized', async function() {
    let statecoin = get_statecoin_in()
   
    let updated_statecoin = cloneDeep(statecoin)
    updated_statecoin.ui_swap_status = UI_SWAP_STATUS.Phase8
    const UPDATED_STATECOIN = cloneDeep(updated_statecoin)
  
      http_mock.post = jest.fn((path, body) => {
        if(path === POST_ROUTE.SWAP_POLL_SWAP){
          return null
        }
        if(path === POST_ROUTE.KEYGEN_FIRST){
          throw new Error("keygen first error")
        }
      })

      http_mock.get = jest.fn((path, params) => {
        if(path === GET_ROUTE.TRANSFER_BATCH){
          return {
            "state_chains": ["sc1", "sc2"],
            "finalized": true,
          }
        }
      })

      let wallet = getWallet()
      let swap = new Swap(wallet, statecoin, null, null)

      let result = await swapPhase4(swap)
      expect(result.is_ok()).toEqual(false)
      expect(result.message).toEqual(`keygen first error: statecoin ${statecoin.shared_key_id} - batch transfer complete for swap ID ${statecoin.swap_id.id}`)
      expect(statecoin).toEqual(UPDATED_STATECOIN)
  })

  test('swapPhase4 test 17 - batch transfer timeout', async function() {
    let statecoin = get_statecoin_in()
   
    let updated_statecoin = cloneDeep(statecoin)
    updated_statecoin.ui_swap_status = UI_SWAP_STATUS.Phase8
    const UPDATED_STATECOIN = cloneDeep(updated_statecoin)
  
      http_mock.post = jest.fn((path, body) => {
        if(path === POST_ROUTE.SWAP_POLL_SWAP){
          return null
        }
        if(path === POST_ROUTE.KEYGEN_FIRST){
          throw new Error("keygen first error")
        }
      })

      http_mock.get = jest.fn((path, params) => {
        if(path === GET_ROUTE.TRANSFER_BATCH){
          throw new Error("Transfer batch ended. Timeout")
        }
      })

      let wallet = getWallet()
      let swap = new Swap(wallet, statecoin, null, null)

      await expect(swapPhase4(swap))
        .rejects.toThrow(Error)
        expect(statecoin).toEqual(UPDATED_STATECOIN)

      swap = new Swap(wallet, statecoin, null, null)
      await expect(swapPhase4(swap))
        .rejects.toThrowError(
          `swap id: ${UPDATED_STATECOIN.swap_id.id}, shared key id: ${UPDATED_STATECOIN.shared_key_id} - swap failed at phase 4/4`
        ) 
      expect(statecoin).toEqual(UPDATED_STATECOIN)
  })

})
  