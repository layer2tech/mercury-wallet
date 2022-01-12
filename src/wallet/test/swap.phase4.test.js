import {makeTesterStatecoin, STATECOIN_SWAP_DATA, SWAP_SHARED_KEY_OUT} from './test_data.js'
import {swapPhase4, SWAP_STATUS,
   SwapRetryError, UI_SWAP_STATUS} from "../swap/swap";
import {STATECOIN_STATUS} from '../statecoin'
import { REQUESTOR_CALC_S, MAKE_BST, POST_BST } from '../mocks/mock_wasm'
import { SWAP_SECOND_SCE_ADDRESS } from '../mocks/mock_http_client';
import * as MOCK_SERVER from '../mocks/mock_http_client'
import { GET_ROUTE, POST_ROUTE } from '../http_client';
import { Wallet, MOCK_WALLET_NAME, MOCK_WALLET_PASSWORD } from '../wallet';
import { ACTION } from '../';
import { Transaction } from 'bitcoinjs-lib';

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
function init_phase4_status(statecoin) {
  statecoin.status = STATECOIN_STATUS.IN_SWAP
  statecoin.swap_status = SWAP_STATUS.Phase4
  statecoin.swap_id = "a swap id"
  statecoin.swap_my_bst_data = "a my bst data"
  statecoin.swap_info = mock_http_client.SWAP_INFO
  statecoin.swap_transfer_finalized_data = mock_http_client.TRANSFER_FINALIZE_DATA
}

describe('Swap phase 4', function() {
  test('swapPhase4 test 1 - invalid initial statecoin state', async function() {
    
  let statecoin = makeTesterStatecoin();
  statecoin.status = STATECOIN_STATUS.IN_SWAP
  const INIT_STATECOIN = cloneDeep(statecoin)

  //Test invalid statecoin statuses
  for (let i=0; i< STATECOIN_STATUS.length; i++){
    if(STATECOIN_STATUS[i] !== STATECOIN_STATUS.IN_SWAP){
      const sc_status = STATECOIN_STATUS[i]
      statecoin.status=cloneDeep(sc_status)
      await expect(swapPhase4(http_mock, null, statecoin, null)).rejects.toThrowError(`Coin status is not IN_SWAP. Status: ${sc_status}`)
    }
  }
  
  //Set valid statecoin status
  statecoin.status = STATECOIN_STATUS.IN_SWAP

  //Test invalid statecoin swap statuses
  for (let i=0; i< SWAP_STATUS.length; i++){
    if(SWAP_STATUS[i] !== SWAP_STATUS.Phase4){
      const swap_status = STATECOIN_STATUS[i]
      statecoin.swap_status=cloneDeep(swap_status)
        await expect(swapPhase4(http_mock, null, statecoin, null))
        .rejects.toThrowError(`Coin is not in this phase of the swap protocol. In phase: ${statecoin.swap_status}`);
        expect(statecoin).toEqual(INIT_STATECOIN)
        
        await expect(swapPhase4(http_mock, null, statecoin, null))
        .rejects.toThrow(Error);
        expect(statecoin).toEqual(INIT_STATECOIN)
    }
  }

  statecoin.swap_status=null
  await expect(swapPhase4(http_mock, null, statecoin, null))
    .rejects.toThrowError(`Coin is not in this phase of the swap protocol. In phase: ${statecoin.swap_status}`)
    expect(statecoin).toEqual(INIT_STATECOIN)
    
  await expect(swapPhase4(http_mock, null, statecoin, null))
    .rejects.toThrow(Error)
    expect(statecoin).toEqual(INIT_STATECOIN)
      
  //Set valid swap status
  statecoin.swap_status = SWAP_STATUS.Phase4

  //Test invalid swap_id and swap_my_bst_data
  statecoin.swap_id=null
  statecoin.swap_info=null
  statecoin.swap_transfer_finalized_data=null

  await expect(swapPhase4(http_mock, null, statecoin, null))
    .rejects.toThrowError("No Swap ID found. Swap ID should be set in Phase0.")

  //Set swap_id to some value
  statecoin.swap_id = "a swap id"

  await expect(swapPhase4(http_mock, null, statecoin, null))
    .rejects.toThrowError("No swap info found for coin. Swap info should be set in Phase1.")

  statecoin.swap_info = "a swap info"

  await expect(swapPhase4(http_mock, null, statecoin, null))
    .rejects.toThrowError("No transfer finalize data found for coin. Transfer finalize data should be set in Phase1.")

})
      
test('swapPhase4 test 2 - server responds to pollSwap with miscellaneous error', async function() {
    
  const server_error = () => { return new Error("Misc server error")}
  http_mock.post = jest.fn((path, body) => {
    if(path === POST_ROUTE.SWAP_POLL_SWAP){
      throw server_error()
    }
  })

  let statecoin = makeTesterStatecoin();
  init_phase4_status(statecoin)
 
  const INIT_STATECOIN = cloneDeep(statecoin)
   
  //A server error will now be throw from an API call
  //The error type should be SwapRetryError 
  await expect(swapPhase4(http_mock, null, statecoin, null))
    .rejects.toThrow(SwapRetryError)

  //Expect statecoin and to be unchanged
  expect(statecoin).toEqual(INIT_STATECOIN)
  
  //The error should contain the message in server_error()
  await expect(swapPhase4(http_mock, null, statecoin, null))
    .rejects.toThrowError(`Phase4 pollSwap error: ${server_error().message}`)

  //Expect statecoin and to be unchanged
  expect(statecoin).toEqual(INIT_STATECOIN)
  
  })

  test('swapPhase4 test 3 - server responds to pollSwap with invalid status', async function() {
    
    let statecoin = makeTesterStatecoin();
    init_phase4_status(statecoin);
  
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
    
    let statecoin = makeTesterStatecoin();
    init_phase4_status(statecoin);
   
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

      await expect(swapPhase4(http_mock, null, statecoin, null))
        .rejects.toThrow(SwapRetryError)
        expect(statecoin).toEqual(UPDATED_STATECOIN)

      await expect(swapPhase4(http_mock, null, statecoin, null))
        .rejects.toThrowError(`Phase4 transferFinalize error: ${post_error(POST_ROUTE.KEYGEN_FIRST,JSON.stringify({
          shared_key_id: statecoin.swap_transfer_finalized_data.new_shared_key_id,
          protocol: "Transfer",
          solution: null,
      })).message}`)
        expect(statecoin).toEqual(UPDATED_STATECOIN)
    }
  })

  test('swapPhase4 test 5 - error from client keygen first message transferReceiverFinalize', async function() {
    let statecoin = makeTesterStatecoin();
    init_phase4_status(statecoin);
   
    let updated_statecoin = cloneDeep(statecoin)
    updated_statecoin.ui_swap_status = UI_SWAP_STATUS.Phase8
    const UPDATED_STATECOIN = cloneDeep(updated_statecoin)
  
    let valid_phases = [SWAP_STATUS.Phase4, null]

    wasm_mock.KeyGen.first_message = jest.fn((_secret_key) => {
      throw wasm_err("KeyGen.keygen_first")
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
          throw post_error(path)
        }
      })

      await expect(swapPhase4(http_mock, wasm_mock, statecoin, null))
        .rejects.toThrow(SwapRetryError)
        expect(statecoin).toEqual(UPDATED_STATECOIN)

      await expect(swapPhase4(http_mock, wasm_mock, statecoin, null))
        .rejects.toThrowError(`Phase4 transferFinalize error: ${wasm_err("KeyGen.keygen_first").message}`)
        expect(statecoin).toEqual(UPDATED_STATECOIN)
    }
  })

  test('swapPhase4 test 6 - error requesting keygen second in transferReceiverFinalize', async function() {
    let statecoin = makeTesterStatecoin();
    init_phase4_status(statecoin);
       
    let updated_statecoin = cloneDeep(statecoin)
    updated_statecoin.ui_swap_status = UI_SWAP_STATUS.Phase8
    const UPDATED_STATECOIN = cloneDeep(updated_statecoin)
  
    let valid_phases = [SWAP_STATUS.Phase4, null]

    wasm_mock.KeyGen.first_message = jest.fn((_secret_key) => {
      return mock_wasm.KEYGEN_FIRST
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
          throw post_error(path)
        }
      })

      await expect(swapPhase4(http_mock, wasm_mock, statecoin, null))
        .rejects.toThrow(SwapRetryError)
        expect(statecoin).toEqual(UPDATED_STATECOIN)

      await expect(swapPhase4(http_mock, wasm_mock, statecoin, null))
        .rejects.toThrowError(`Phase4 transferFinalize error: ${post_error(POST_ROUTE.KEYGEN_SECOND).message}`)
        expect(statecoin).toEqual(UPDATED_STATECOIN)
    }
  })

  test('swapPhase4 test 7 - error requesting keygen second in transferReceiverFinalize', async function() {
    let statecoin = makeTesterStatecoin();
    init_phase4_status(statecoin);
   
    let updated_statecoin = cloneDeep(statecoin)
    updated_statecoin.ui_swap_status = UI_SWAP_STATUS.Phase8
    const UPDATED_STATECOIN = cloneDeep(updated_statecoin)
  
    let valid_phases = [SWAP_STATUS.Phase4, null]

    wasm_mock.KeyGen.first_message = jest.fn((_secret_key) => {
      return mock_wasm.KEYGEN_FIRST
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
          throw post_error(path)
        }
      })

      await expect(swapPhase4(http_mock, wasm_mock, statecoin, null))
        .rejects.toThrow(SwapRetryError)
        expect(statecoin).toEqual(UPDATED_STATECOIN)

      await expect(swapPhase4(http_mock, wasm_mock, statecoin, null))
        .rejects.toThrowError(`Phase4 transferFinalize error: ${post_error(POST_ROUTE.KEYGEN_SECOND).message}`)
        expect(statecoin).toEqual(UPDATED_STATECOIN)
    }
  })

  test('swapPhase4 test 8 - error client keygen second in transferReceiverFinalize', async function() {
    let statecoin = makeTesterStatecoin();
    init_phase4_status(statecoin);
   
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

      await expect(swapPhase4(http_mock, wasm_mock, statecoin, null))
        .rejects.toThrow(SwapRetryError)
        expect(statecoin).toEqual(UPDATED_STATECOIN)

      await expect(swapPhase4(http_mock, wasm_mock, statecoin, null))
        .rejects.toThrowError(`Phase4 transferFinalize error: ${wasm_err("KeyGen.second_message").message}`)
        expect(statecoin).toEqual(UPDATED_STATECOIN)
    }
  })

  test('swapPhase4 test 9 - error from client set master key in transferReceiverFinalize', async function() {
    let statecoin = makeTesterStatecoin();
    init_phase4_status(statecoin);
   
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

      await expect(swapPhase4(http_mock, wasm_mock, statecoin, null))
        .rejects.toThrow(SwapRetryError)
        expect(statecoin).toEqual(UPDATED_STATECOIN)

      await expect(swapPhase4(http_mock, wasm_mock, statecoin, null))
        .rejects.toThrowError(`Phase4 transferFinalize error: ${wasm_err("KeyGen.set_master_key").message}`)
        expect(statecoin).toEqual(UPDATED_STATECOIN)
    }
  })

  test('swapPhase4 test 10 - error from getRoot', async function() {
    let statecoin = makeTesterStatecoin();
    init_phase4_status(statecoin);
   
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
  
      let wallet = Wallet.buildMock(bitcoin.networks.bitcoin);
      wallet.addStatecoinFromValues("c93ad45a-00b9-449c-a804-aab5530efc90", 
        SHARED_KEY_DUMMY, 0.1, 
        "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41", 
        0, "03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477", 
        ACTION.DEPOSIT)
      wallet.saveStateCoinsList();

      let statecoin_out = await swapPhase4(http_mock, wasm_mock, sc_clone_1, wallet);
      expect(sc_clone_1).toEqual(UPDATED_STATECOIN)
    
      let statecoin_out_expected = cloneDeep(statecoin);
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
  
      expect(statecoin_out).toEqual(statecoin_out_expected)
    }
  })
})
  