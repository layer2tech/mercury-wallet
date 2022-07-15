import { makeTesterStatecoin, STATECOIN_SWAP_DATA, SWAP_SHARED_KEY_OUT } from './test_data.js'
import {
  SWAP_STATUS,
  SwapRetryError, UI_SWAP_STATUS
} from "../swap/swap_utils";
import Swap from "../swap/swap"
import { STATECOIN_STATUS } from '../statecoin'
import { REQUESTOR_CALC_S, MAKE_BST, POST_BST } from '../mocks/mock_wasm'
import { SWAP_SECOND_SCE_ADDRESS } from '../mocks/mock_http_client';
import * as MOCK_SERVER from '../mocks/mock_http_client'
import { GET_ROUTE, POST_ROUTE } from '../http_client';
import { Wallet, MOCK_WALLET_NAME, MOCK_WALLET_PASSWORD } from '../wallet';
import { ACTION } from '..';
import { Transaction } from 'bitcoinjs-lib';
import { swapPhase4 as swapPhase4Steps } from '../swap/swap.phase4'
import {
  SWAP_STATECHAIN_INFO_AFTER_TRANSFER, TRANSFER_FINALIZED_DATA,
  TRANSFER_MSG_4, STATECOIN_AMOUNT, setSwapDetails, SWAP_INFO
} from './test_data.js'
import {MockElectrumClient} from '../mocks/mock_electrum'

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

let electrum_mock = new MockElectrumClient()

const post_error = (path, body) => {
  return new Error(`Error from POST request - path: ${path}, body: ${body}`)
}

const get_error = (path, params) => {
  return new Error(`Error from GET request - path: ${path}, params: ${params}`)
}

const wasm_err = (message) => {
  return new Error(`Error from wasm_client: ${message}`)
}

const SHARED_KEY_DUMMY = { public: { q: "", p2: "", p1: "", paillier_pub: {}, c_key: "", }, private: "", chain_code: "" };

//Set a valid initial statecoin status for phase4
function get_statecoin_in() {
  let statecoin = cloneDeep(makeTesterStatecoin());
  setSwapDetails(statecoin, 6)
  let tm3 = cloneDeep(mock_http_client.TRANSFER_MSG3)
  tm3.statechain_id = statecoin.swap_info.swap_token.statechain_ids[0]
  tm3.tx_backup_psm.shared_key_id = cloneDeep(MOCK_SERVER.TRANSFER_RECEIVER.new_shared_key_id)
  statecoin.swap_transfer_msg_3_receiver = tm3
  statecoin.anon_set = 5
  return statecoin
}

function get_statecoin_after_transfer_receiver(statecoin) {
  let sc = cloneDeep(statecoin)
  setSwapDetails(sc, 7)
  sc.ui_swap_status = UI_SWAP_STATUS.Phase7
  sc.swap_transfer_finalized_data = cloneDeep(TRANSFER_FINALIZED_DATA)
  sc.swap_transfer_msg_4 = cloneDeep(TRANSFER_MSG_4)
  sc.swap_transfer_finalized_data.tx_backup_psm = sc.swap_transfer_msg_3_receiver.tx_backup_psm
  return sc
}

function get_statecoin_out_expected(statecoin_out, smt_proof = null) {
  //let statecoin_out_expected = 
  //setSwapDetails(statecoin_out_expected, 8)
  let statecoin_out_expected = get_statecoin_after_transfer_receiver(get_statecoin_in())
  statecoin_out_expected.value = STATECOIN_AMOUNT
  statecoin_out_expected.swap_rounds = 1
  statecoin_out_expected.swap_status = null
  statecoin_out_expected.swap_address = null
  statecoin_out_expected.swap_batch_data = null
  statecoin_out_expected.swap_receiver_addr = null
  statecoin_out_expected.swap_transfer_msg = null
  statecoin_out_expected.ui_swap_status = null
  statecoin_out_expected.anon_set = statecoin_out_expected.anon_set + SWAP_INFO.swap_token.statechain_ids.length
  statecoin_out_expected.swap_transfer_finalized_data = null
  statecoin_out_expected.status = STATECOIN_STATUS.AVAILABLE
  statecoin_out_expected.shared_key_id = TRANSFER_FINALIZED_DATA.new_shared_key_id
  statecoin_out_expected.statechain_id = TRANSFER_FINALIZED_DATA.statechain_id
  statecoin_out_expected.funding_txid = SWAP_STATECHAIN_INFO_AFTER_TRANSFER.utxo.txid
  statecoin_out_expected.is_new = true
  statecoin_out_expected.proof_key = "028a9b66d0d2c6ef7ff44a103d44d4e9222b1fa2fd34cd5de29a54875c552abd41",
    statecoin_out_expected.sc_address = "sc1q29fkeks6trw7ll5fggr63x5ay3zk8azl56v6h0znf2gwhz49275zn69cks",
    statecoin_out_expected.shared_key = SWAP_SHARED_KEY_OUT
  statecoin_out_expected.swap_my_bst_data = null
  statecoin_out_expected.swap_id = null
  statecoin_out_expected.swap_info = null
  statecoin_out_expected.timestamp = statecoin_out.timestamp
  statecoin_out_expected.tx_backup = Transaction.fromHex(
    TRANSFER_FINALIZED_DATA.tx_backup_psm.tx_hex);
  statecoin_out_expected.swap_transfer_msg_4 = null
  statecoin_out_expected.swap_transfer_msg_3_receiver = null

  statecoin_out_expected.smt_proof = smt_proof
  return statecoin_out_expected;
}

const copy_t2 = (sc1, sc2) => {
  if (sc1?.swap_transfer_msg_4 && sc2?.swap_transfer_msg_4) {
    sc2.swap_transfer_msg_4.t2 = cloneDeep(sc1.swap_transfer_msg_4.t2)
  }
}

const proof_key_der = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D));
const proof_key_der_new = bitcoin.ECPair.fromPrivateKey(Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER_AFTER_TRANSFER.__D));

const checkRetryMessage = (swapStepResult, message) => {
  expect(swapStepResult.is_ok()).toEqual(false);
  expect(swapStepResult.message).toEqual(message);
}

async function swapPhase4(swap) {
  swap.setSwapSteps(swapPhase4Steps(swap))
  let result
  for (let i = 0; i < swap.swap_steps.length; i++) {
    result = await swap.doNext()
    if (result.is_ok() === false) {
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
  wallet.electrum_client = electrum_mock
  return wallet
}

function getSwap(wallet, statecoin, pkd = proof_key_der, new_pkd = proof_key_der_new) {
  let swap = new Swap(wallet, statecoin, pkd, new_pkd, false, false)
  return swap
}


const transferReceiverGet = (path, params, statecoin) => {
  if (path === GET_ROUTE.STATECHAIN) {
    return SWAP_STATECHAIN_INFO_AFTER_TRANSFER;
  }
  if (path === GET_ROUTE.FEES) {
    return MOCK_SERVER.FEE_INFO;
  }
}

const transferReceiverPost = (path, params) => {
  if (path === POST_ROUTE.TRANSFER_RECEIVER) {
    console.log(`######## TR POST`)
    return MOCK_SERVER.TRANSFER_RECEIVER
  }
  if (path === POST_ROUTE.TRANSFER_PUBKEY) {
    console.log(`######## TPK POST`)
    return MOCK_SERVER.TRANSFER_PUBKEY
  }
}

describe('Swap phase 4', function () {
  jest.setTimeout(10000)
  test('swapPhase4 test 1 - invalid initial statecoin state', async function () {

    let statecoin = get_statecoin_in()
    const INIT_STATECOIN = cloneDeep(statecoin)

    let wallet = await getWallet()
    let swap


    http_mock.get = jest.fn((path, params) => {
      if (path === GET_ROUTE.STATECHAIN) {
        return SWAP_STATECHAIN_INFO_AFTER_TRANSFER;
      }
    })

    //Test invalid statecoin statuses
    for (let i = 0; i < STATECOIN_STATUS.length; i++) {
      if (STATECOIN_STATUS[i] !== STATECOIN_STATUS.IN_SWAP) {
        const sc_status = STATECOIN_STATUS[i]
        statecoin.status = cloneDeep(sc_status)
        swap = getSwap(wallet, statecoin)
        await expect(swapPhase4(swap)).rejects.toThrowError(`Coin status is not IN_SWAP. Status: ${sc_status}`)
      }
    }

    //Set valid statecoin status
    statecoin.status = STATECOIN_STATUS.IN_SWAP


    //Test invalid statecoin swap statuses
    for (let i = 0; i < SWAP_STATUS.length; i++) {
      if (SWAP_STATUS[i] !== SWAP_STATUS.Phase4) {
        const swap_status = STATECOIN_STATUS[i]
        statecoin.swap_status = cloneDeep(swap_status)
        swap = getSwap(wallet, statecoin)
        await expect(swapPhase4(swap))
          .rejects.toThrowError(`phase Phase4:transferReceiver: invalid swap status: ${statecoin.swap_status}`);
        expect(statecoin).toEqual(INIT_STATECOIN)

        swap = getSwap(wallet, statecoin)
        await expect(swapPhase4(swap))
          .rejects.toThrow(Error);
        expect(statecoin).toEqual(INIT_STATECOIN)
      }
    }

    statecoin.swap_status = null
    swap = getSwap(wallet, statecoin)
    await expect(swapPhase4(swap))
      .rejects.toThrowError(`phase Phase4:transferReceiver: invalid swap status: ${statecoin.swap_status}`)
    let sc_null_swap_status = cloneDeep(INIT_STATECOIN)
    sc_null_swap_status.swap_status = null
    expect(statecoin).toEqual(sc_null_swap_status)

    swap = getSwap(wallet, statecoin)
    await expect(swapPhase4(swap))
      .rejects.toThrow(Error)
    expect(statecoin).toEqual(sc_null_swap_status)

    //Set valid swap status
    statecoin = get_statecoin_in()
    statecoin.swap_status = SWAP_STATUS.Phase4

    //Test invalid swap_id and swap_my_bst_data
    statecoin.swap_id = null
    statecoin.swap_info = null
    statecoin.swap_transfer_finalized_data = null
    statecoin.swap_transfer_msg_3_receiver = null

    swap = getSwap(wallet, statecoin)
    await expect(swapPhase4(swap))
      .rejects.toThrowError("No Swap ID found. Swap ID should be set in Phase0.")

    //Set swap_id to some value
    statecoin.swap_id = INIT_STATECOIN.swap_id

    swap = getSwap(wallet, statecoin)
    await expect(swapPhase4(swap))
      .rejects.toThrowError("No swap info found for coin. Swap info should be set in Phase1.")

    statecoin.swap_transfer_msg_3_receiver = mock_http_client.TRANSFER_MSG3
    swap = getSwap(wallet, statecoin)
    await expect(swapPhase4(swap))
      .rejects.toThrowError("No swap info found for coin. Swap info should be set in Phase1.")

  })

  test('swapPhase4 test 2 - server responds to pollSwap with miscellaneous error', async function () {

    const server_error = () => { return new Error("Misc server error") }
    http_mock.post = jest.fn((path, body) => {
      if (path === POST_ROUTE.SWAP_POLL_SWAP) {
        throw server_error()
      }
      return transferReceiverPost(path, body)
    })

    let statecoin = get_statecoin_in()
    console.log(`################## statecoin in tf data: ${JSON.stringify(statecoin.swap_transfer_finalized_data)}`)

    http_mock.get = jest.fn((path, params) => {
      return transferReceiverGet(path, params, statecoin)
    })

    let EXPECTED_STATECOIN = get_statecoin_after_transfer_receiver(statecoin)
    console.log(`################## expected tf data: ${JSON.stringify(EXPECTED_STATECOIN.swap_transfer_finalized_data)}`)
    
    let wallet = await getWallet()
    let swap = getSwap(wallet, statecoin)

    let result = await swapPhase4(swap)
    expect(result.is_ok()).toEqual(false)
    expect(result.message).toEqual(`${server_error().message}`)

    copy_t2(statecoin, EXPECTED_STATECOIN)
    //Expect statecoin and to be unchanged
    expect(statecoin).toEqual(EXPECTED_STATECOIN)
  })

  test('swapPhase4 test 3 - server responds to pollSwap with invalid status', async function () {

    let statecoin = get_statecoin_in()

    let EXPECTED_STATECOIN = get_statecoin_after_transfer_receiver(statecoin)

    http_mock.get = jest.fn((path, params) => {
      return transferReceiverGet(path, params, statecoin)
    })

    //Test unexpected phases
    for (let i = 0; i < SWAP_STATUS.length; i++) {
      const phase = SWAP_STATUS[i]
      http_mock.post = jest.fn((path, body) => {
        if (path === POST_ROUTE.SWAP_POLL_SWAP) {
          return phase
        }
        return transferReceiverPost(path, body)
      })

      if (phase !== SWAP_STATUS.Phase4 && phase !== null) {
        await expect(swapPhase4(http_mock, null, statecoin, null))
          .rejects.toThrow(Error)
        copy_t2(statecoin, EXPECTED_STATECOIN)
        expect(statecoin).toEqual(EXPECTED_STATECOIN)
        await expect(swapPhase4(http_mock, null, statecoin, null))
          .rejects.toThrowError(`Swap error: Expected swap phase4. Received: ${phase}`)
        expect(statecoin).toEqual(EXPECTED_STATECOIN)
      }

    }
  })

  test('swapPhase4 test 4 - error requesting keygen first in transferReceiverFinalize', async function () {

    let statecoin = get_statecoin_in()

    let updated_statecoin = get_statecoin_after_transfer_receiver(statecoin)
    updated_statecoin.ui_swap_status = UI_SWAP_STATUS.Phase8
    updated_statecoin.swap_error = { error: true, msg: "statecoin c93ad45a-00b9-449c-a804-aab5530efc90 waiting for completion of batch transfer in swap ID c7207feb-c575-482f-8612-307c3d4cd133" }
    let UPDATED_STATECOIN = cloneDeep(updated_statecoin)

    let valid_phases = [SWAP_STATUS.Phase4, null]

    for (let i = 0; i < valid_phases.length; i++) {
      http_mock.post = jest.fn((path, body) => {
        if (path === POST_ROUTE.SWAP_POLL_SWAP) {
          return valid_phases[i]
        }
        if (path === POST_ROUTE.KEYGEN_FIRST) {
          throw post_error(path, JSON.stringify(body))
        }
        return transferReceiverPost(path, body)
      })

      http_mock.get = jest.fn((path, params) => {
        if (path === GET_ROUTE.TRANSFER_BATCH) {
          return {
            "state_chains": ["sc1", "sc2"],
            "finalized": false,
          }
        }
        return transferReceiverGet(path, params, statecoin)
      })

      let wallet = await getWallet()
      let swap = getSwap(wallet, statecoin)

      let result = await swapPhase4(swap)

      expect(result.is_ok()).toEqual(false)
      expect(result.message).toEqual(`statecoin ${statecoin.shared_key_id} waiting for completion of batch transfer in swap ID ${statecoin.swap_id.id}`)
      copy_t2(statecoin, UPDATED_STATECOIN)
      expect(statecoin).toEqual(UPDATED_STATECOIN)
    }
  })

  test('swapPhase4 test 5 - error from client keygen first message transferReceiverFinalize', async function () {
    let statecoin = get_statecoin_in()

    let updated_statecoin = get_statecoin_after_transfer_receiver(statecoin)
    updated_statecoin.ui_swap_status = UI_SWAP_STATUS.Phase8
    let UPDATED_STATECOIN = cloneDeep(updated_statecoin)

    let valid_phases = [SWAP_STATUS.Phase4, null]

    wasm_mock.KeyGen.first_message = jest.fn((_secret_key) => {
      throw wasm_err("KeyGen.keygen_first")
    })

    let wallet = await getWallet()
    let wasm = await wallet.getWasm()
    wasm.KeyGen.first_message = jest.fn((_secret_key) => {
      throw wasm_err("KeyGen.keygen_first")
    })

    http_mock.get = jest.fn((path, params) => {
      return transferReceiverGet(path, params, statecoin)
    })

    for (let i = 0; i < valid_phases.length; i++) {
      http_mock.post = jest.fn((path, body) => {
        if (path === POST_ROUTE.SWAP_POLL_SWAP) {
          return valid_phases[i]
        }
        if (path === POST_ROUTE.KEYGEN_FIRST) {
          return mock_http_client.KEYGEN_FIRST
        }
        if (path === POST_ROUTE.KEYGEN_SECOND) {
          return mock_http_client.KEYGEN_SECOND
        }
        return transferReceiverPost(path, body)
      })

      let swap = getSwap(wallet, statecoin)
      let result = await swapPhase4(swap)
      expect(result.is_ok()).toEqual(false)
      expect(result.message).toEqual(wasm_err("KeyGen.keygen_first").message)
      copy_t2(statecoin, UPDATED_STATECOIN)
      expect(statecoin).toEqual(UPDATED_STATECOIN)
    }
  })

  test('swapPhase4 test 6 - error requesting keygen second in transferReceiverFinalize', async function () {
    let statecoin = get_statecoin_in()

    let updated_statecoin = get_statecoin_after_transfer_receiver(statecoin)
    updated_statecoin.ui_swap_status = UI_SWAP_STATUS.Phase8
    let UPDATED_STATECOIN = cloneDeep(updated_statecoin)

    let valid_phases = [SWAP_STATUS.Phase4, null]

    wasm_mock.KeyGen.first_message = jest.fn((_secret_key) => {
      return mock_wasm.KEYGEN_FIRST
    })

    let wallet = await getWallet()

    http_mock.get = jest.fn((path, params) => {
      return transferReceiverGet(path, params, statecoin)
    })

    for (let i = 0; i < valid_phases.length; i++) {
      http_mock.post = jest.fn((path, body) => {
        if (path === POST_ROUTE.SWAP_POLL_SWAP) {
          return valid_phases[i]
        }
        if (path === POST_ROUTE.KEYGEN_FIRST) {
          return mock_http_client.KEYGEN_FIRST
        }
        if (path === POST_ROUTE.KEYGEN_SECOND) {
          throw post_error(path)
        }
        return transferReceiverPost(path, body)
      })

      let swap = getSwap(wallet, statecoin)
      let result = await swapPhase4(swap)
      expect(result.is_ok()).toEqual(false)
      expect(result.message).toEqual(post_error(POST_ROUTE.KEYGEN_SECOND).message)
      copy_t2(statecoin, UPDATED_STATECOIN)
      expect(statecoin).toEqual(UPDATED_STATECOIN)
    }
  })

  test('swapPhase4 test 7 - error requesting keygen second in transferReceiverFinalize', async function () {
    let statecoin = get_statecoin_in()

    let updated_statecoin = get_statecoin_after_transfer_receiver(statecoin)
    updated_statecoin.ui_swap_status = UI_SWAP_STATUS.Phase8
    let UPDATED_STATECOIN = cloneDeep(updated_statecoin)

    let valid_phases = [SWAP_STATUS.Phase4, null]

    wasm_mock.KeyGen.first_message = jest.fn((_secret_key) => {
      return mock_wasm.KEYGEN_FIRST
    })

    http_mock.get = jest.fn((path, params) => {
      return transferReceiverGet(path, params, statecoin)
    })

    let wallet = await getWallet()

    for (let i = 0; i < valid_phases.length; i++) {
      http_mock.post = jest.fn((path, body) => {
        if (path === POST_ROUTE.SWAP_POLL_SWAP) {
          return valid_phases[i]
        }
        if (path === POST_ROUTE.KEYGEN_FIRST) {
          return mock_http_client.KEYGEN_FIRST
        }
        if (path === POST_ROUTE.KEYGEN_SECOND) {
          throw post_error(path)
        }
        return transferReceiverPost(path, body)
      })

      let swap = getSwap(wallet, statecoin)
      let result = await swapPhase4(swap)
      expect(result.is_ok()).toEqual(false)
      expect(result.message).toEqual(post_error(POST_ROUTE.KEYGEN_SECOND).message)
      copy_t2(statecoin, UPDATED_STATECOIN)
      expect(statecoin).toEqual(UPDATED_STATECOIN)
    }
  })

  test('swapPhase4 test 8 - error client keygen second in transferReceiverFinalize', async function () {
    let statecoin = get_statecoin_in()

    let updated_statecoin = get_statecoin_after_transfer_receiver(statecoin)
    updated_statecoin.ui_swap_status = UI_SWAP_STATUS.Phase8
    let UPDATED_STATECOIN = cloneDeep(updated_statecoin)

    let valid_phases = [SWAP_STATUS.Phase4, null]

    wasm_mock.KeyGen.first_message = jest.fn((_secret_key) => {
      return mock_wasm.KEYGEN_FIRST
    })

    wasm_mock.KeyGen.second_message = jest.fn((_param1, _param2) => {
      throw wasm_err("KeyGen.second_message")
    })

    let wallet = await getWallet()

    http_mock.get = jest.fn((path, params) => {
      return transferReceiverGet(path, params, statecoin)
    })

    for (let i = 0; i < valid_phases.length; i++) {
      http_mock.post = jest.fn((path, body) => {
        if (path === POST_ROUTE.SWAP_POLL_SWAP) {
          return valid_phases[i]
        }
        if (path === POST_ROUTE.KEYGEN_FIRST) {
          return mock_http_client.KEYGEN_FIRST
        }
        if (path === POST_ROUTE.KEYGEN_SECOND) {
          return mock_http_client.KEYGEN_SECOND
        }
        return transferReceiverPost(path, body)
      })

      let swap = getSwap(wallet, statecoin)
      let result = await swapPhase4(swap)
      expect(result.is_ok()).toEqual(false)
      expect(result.message).toEqual(wasm_err("KeyGen.second_message").message)
      copy_t2(statecoin, UPDATED_STATECOIN)
      expect(statecoin).toEqual(UPDATED_STATECOIN)
    }
  })

  test('swapPhase4 test 9 - error from client set master key in transferReceiverFinalize', async function () {
    let statecoin = get_statecoin_in()

    let updated_statecoin = get_statecoin_after_transfer_receiver(statecoin)
    updated_statecoin.ui_swap_status = UI_SWAP_STATUS.Phase8
    let UPDATED_STATECOIN = cloneDeep(updated_statecoin)

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

    let wallet = await getWallet()

    http_mock.get = jest.fn((path, params) => {
      return transferReceiverGet(path, params, statecoin)
    })

    for (let i = 0; i < valid_phases.length; i++) {
      http_mock.post = jest.fn((path, body) => {
        if (path === POST_ROUTE.SWAP_POLL_SWAP) {
          return valid_phases[i]
        }
        if (path === POST_ROUTE.KEYGEN_FIRST) {
          return mock_http_client.KEYGEN_FIRST
        }
        if (path === POST_ROUTE.KEYGEN_SECOND) {
          return mock_http_client.KEYGEN_SECOND
        }
        return transferReceiverPost(path, body)
      })

      let swap = getSwap(wallet, statecoin)
      let result = await swapPhase4(swap)
      expect(result.is_ok()).toEqual(false)
      expect(result.message).toEqual(wasm_err("KeyGen.set_master_key").message)
      copy_t2(statecoin, UPDATED_STATECOIN)
      expect(statecoin).toEqual(UPDATED_STATECOIN)
    }
  })

  test('swapPhase4 test 10 - error getting SMT root', async function () {
    let statecoin = get_statecoin_in()

    let updated_statecoin = get_statecoin_after_transfer_receiver(statecoin)
    updated_statecoin.ui_swap_status = UI_SWAP_STATUS.End
    updated_statecoin.swap_status = SWAP_STATUS.End
    let UPDATED_STATECOIN = cloneDeep(updated_statecoin)

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

    http_mock.get = jest.fn((path, params) => {
      return transferReceiverGet(path, params, statecoin)
    })

    for (let i = 0; i < valid_phases.length; i++) {
      http_mock.post = jest.fn((path, body) => {
        if (path === POST_ROUTE.SWAP_POLL_SWAP) {
          return valid_phases[i]
        }
        if (path === POST_ROUTE.KEYGEN_FIRST) {
          return mock_http_client.KEYGEN_FIRST
        }
        if (path === POST_ROUTE.KEYGEN_SECOND) {
          return mock_http_client.KEYGEN_SECOND
        }
        if (path === POST_ROUTE.SMT_PROOF) {
          throw post_error(path)
        }
        return transferReceiverPost(path, body)
      })

      let sc_clone_1 = cloneDeep(statecoin)

      let wallet = await getWallet();
      wallet.addStatecoinFromValues("c93ad45a-00b9-449c-a804-aab5530efc90",
        SHARED_KEY_DUMMY, 0.1,
        "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41",
        0, "03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477",
        ACTION.DEPOSIT)
      wallet.config.update({ "jest_testing_mode": true })

      let swap = getSwap(wallet, sc_clone_1)
      let result = await swapPhase4(swap);
      expect(result.is_ok()).toEqual(true)
      copy_t2(sc_clone_1, UPDATED_STATECOIN)
      expect(sc_clone_1).toEqual(UPDATED_STATECOIN)

      let statecoin_out_expected = get_statecoin_out_expected(swap.statecoin_out);
      expect(swap.statecoin_out).toEqual(statecoin_out_expected)
    }
  })

  test('swapPhase4 test 11 - error getting SMT proof', async function () {
    let statecoin = get_statecoin_in()

    let updated_statecoin = get_statecoin_after_transfer_receiver(statecoin)
    updated_statecoin.ui_swap_status = UI_SWAP_STATUS.End
    updated_statecoin.swap_status = SWAP_STATUS.End
    let UPDATED_STATECOIN = cloneDeep(updated_statecoin)

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

    for (let i = 0; i < valid_phases.length; i++) {
      http_mock.post = jest.fn((path, body) => {
        if (path === POST_ROUTE.SWAP_POLL_SWAP) {
          return valid_phases[i]
        }
        if (path === POST_ROUTE.KEYGEN_FIRST) {
          return mock_http_client.KEYGEN_FIRST
        }
        if (path === POST_ROUTE.KEYGEN_SECOND) {
          return mock_http_client.KEYGEN_SECOND
        }
        if (path === POST_ROUTE.SMT_PROOF) {
          throw post_error(path)
        }
        return transferReceiverPost(path, body)
      })

      http_mock.get = jest.fn((path, params) => {
        if (path === GET_ROUTE.ROOT) {
          return mock_http_client.ROOT_INFO
        }
        if (path === GET_ROUTE.STATECHAIN) {
          return SWAP_STATECHAIN_INFO_AFTER_TRANSFER;
        }
        return transferReceiverGet(path, params, statecoin)
      })

      let sc_clone_1 = cloneDeep(statecoin)

      let wallet = await getWallet();
      wallet.addStatecoinFromValues("c93ad45a-00b9-449c-a804-aab5530efc90",
        SHARED_KEY_DUMMY, 0.1,
        "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41",
        0, "03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477",
        ACTION.DEPOSIT)
      wallet.config.update({ "jest_testing_mode": true })

      let swap = getSwap(wallet, sc_clone_1)
      let result = await swapPhase4(swap);
      expect(result.is_ok()).toEqual(true)
      copy_t2(sc_clone_1, UPDATED_STATECOIN)
      expect(sc_clone_1).toEqual(UPDATED_STATECOIN)

      let statecoin_out_expected = get_statecoin_out_expected(swap.statecoin_out)
      expect(swap.statecoin_out).toEqual(statecoin_out_expected)
    }
  })

  test('swapPhase4 test 12 - error verifying SMT root', async function () {
    let statecoin = get_statecoin_in()

    let updated_statecoin = get_statecoin_after_transfer_receiver(statecoin)
    updated_statecoin.ui_swap_status = UI_SWAP_STATUS.End
    updated_statecoin.swap_status = SWAP_STATUS.End
    let UPDATED_STATECOIN = cloneDeep(updated_statecoin)

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

    for (let i = 0; i < valid_phases.length; i++) {
      http_mock.post = jest.fn((path, body) => {
        if (path === POST_ROUTE.SWAP_POLL_SWAP) {
          return valid_phases[i]
        }
        if (path === POST_ROUTE.KEYGEN_FIRST) {
          return mock_http_client.KEYGEN_FIRST
        }
        if (path === POST_ROUTE.KEYGEN_SECOND) {
          return mock_http_client.KEYGEN_SECOND
        }
        if (path === POST_ROUTE.SMT_PROOF) {
          return mock_http_client.SMT_PROOF
        }
        return transferReceiverPost(path, body)
      })

      http_mock.get = jest.fn((path, params) => {
        if (path === GET_ROUTE.STATECHAIN) {
          return SWAP_STATECHAIN_INFO_AFTER_TRANSFER;
        }
        if (path === GET_ROUTE.ROOT) {
          return mock_http_client.ROOT_INFO
        }
        return transferReceiverGet(path, params, statecoin)
      })

      let sc_clone_1 = cloneDeep(statecoin)

      let wallet = await getWallet();
      wallet.addStatecoinFromValues("c93ad45a-00b9-449c-a804-aab5530efc90",
        SHARED_KEY_DUMMY, 0.1,
        "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41",
        0, "03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477",
        ACTION.DEPOSIT)
      wallet.config.update({ "jest_testing_mode": true })

      let swap = getSwap(wallet, sc_clone_1)
      let result = await swapPhase4(swap);
      expect(result.is_ok()).toEqual(true)
      copy_t2(sc_clone_1, UPDATED_STATECOIN)
      expect(sc_clone_1).toEqual(UPDATED_STATECOIN)

      let statecoin_out_expected = get_statecoin_out_expected(swap.statecoin_out, mock_http_client.SMT_PROOF)
      expect(swap.statecoin_out).toEqual(statecoin_out_expected)
    }
  })

  test('swapPhase4 test 13 - no errors', async function () {
    let statecoin = get_statecoin_in()

    let updated_statecoin = get_statecoin_after_transfer_receiver(statecoin)
    updated_statecoin.ui_swap_status = UI_SWAP_STATUS.End
    updated_statecoin.swap_status = SWAP_STATUS.End
    let UPDATED_STATECOIN = cloneDeep(updated_statecoin)

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

    for (let i = 0; i < valid_phases.length; i++) {
      http_mock.post = jest.fn((path, body) => {
        if (path === POST_ROUTE.SWAP_POLL_SWAP) {
          return valid_phases[i]
        }
        if (path === POST_ROUTE.KEYGEN_FIRST) {
          return mock_http_client.KEYGEN_FIRST
        }
        if (path === POST_ROUTE.KEYGEN_SECOND) {
          return mock_http_client.KEYGEN_SECOND
        }
        if (path === POST_ROUTE.SMT_PROOF) {
          return mock_http_client.SMT_PROOF
        }
        return transferReceiverPost(path, body)
      })

      http_mock.get = jest.fn((path, params) => {
        if (path === GET_ROUTE.STATECHAIN) {
          return SWAP_STATECHAIN_INFO_AFTER_TRANSFER;
        }
        if (path === GET_ROUTE.ROOT) {
          return mock_http_client.ROOT_INFO
        }
        return transferReceiverGet(path, params, statecoin)
      })

      let sc_clone_1 = cloneDeep(statecoin)

      let wallet = await getWallet();
      wallet.addStatecoinFromValues("c93ad45a-00b9-449c-a804-aab5530efc90",
        SHARED_KEY_DUMMY, 0.1,
        "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41",
        0, "03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477",
        ACTION.DEPOSIT)
      wallet.config.update({ "jest_testing_mode": true })

      let swap = getSwap(wallet, sc_clone_1)
      let result = await swapPhase4(swap);

      expect(result.is_ok()).toEqual(true)
      copy_t2(sc_clone_1, UPDATED_STATECOIN)
      expect(sc_clone_1).toEqual(UPDATED_STATECOIN)

      let statecoin_out_expected = get_statecoin_out_expected(swap.statecoin_out, mock_http_client.SMT_PROOF)
      expect(swap.statecoin_out).toEqual(statecoin_out_expected)
    }
  })

  test('swapPhase4 test 14 - error from client keygen first message transferReceiverFinalize - No data for identifier', async function () {
    let statecoin = get_statecoin_in()

    let updated_statecoin = get_statecoin_after_transfer_receiver(statecoin)
    updated_statecoin.ui_swap_status = UI_SWAP_STATUS.Phase8
    updated_statecoin.swap_error = { error: true, msg: "statecoin c93ad45a-00b9-449c-a804-aab5530efc90 waiting for completion of batch transfer in swap ID c7207feb-c575-482f-8612-307c3d4cd133" }
    let UPDATED_STATECOIN = cloneDeep(updated_statecoin)

    let valid_phases = [SWAP_STATUS.Phase4, null]


    for (let i = 0; i < valid_phases.length; i++) {
      http_mock.post = jest.fn((path, body) => {
        if (path === POST_ROUTE.SWAP_POLL_SWAP) {
          return valid_phases[i]
        }
        if (path === POST_ROUTE.KEYGEN_FIRST) {
          throw new Error("No data for identifier")
        }
        return transferReceiverPost(path, body)
      })

      http_mock.get = jest.fn((path, params) => {
        if (path === GET_ROUTE.STATECHAIN) {
          return SWAP_STATECHAIN_INFO_AFTER_TRANSFER;
        }
        if (path === GET_ROUTE.TRANSFER_BATCH) {
          return {
            "state_chains": ["sc1", "sc2"],
            "finalized": false,
          }
        }
        return transferReceiverGet(path, params, statecoin)
      })

      let wallet = await getWallet();
      let swap = getSwap(wallet, statecoin)
      let result = await swapPhase4(swap)
      expect(result.is_ok()).toEqual(false)
      expect(result.message).toEqual(`statecoin ${UPDATED_STATECOIN.shared_key_id} waiting for completion of batch transfer in swap ID ${UPDATED_STATECOIN.swap_id.id}`)
      copy_t2(statecoin, UPDATED_STATECOIN)
      expect(statecoin).toEqual(UPDATED_STATECOIN)
    }
  })

  test('swapPhase4 test 15 - error from client keygen first message transferReceiverFinalize - batch transfer status: not finalized', async function () {
    let statecoin = get_statecoin_in()

    let updated_statecoin = get_statecoin_after_transfer_receiver(statecoin)
    updated_statecoin.ui_swap_status = UI_SWAP_STATUS.Phase8
    updated_statecoin.swap_error = { error: true, msg: "statecoin c93ad45a-00b9-449c-a804-aab5530efc90 waiting for completion of batch transfer in swap ID c7207feb-c575-482f-8612-307c3d4cd133" }

    let UPDATED_STATECOIN = cloneDeep(updated_statecoin)

    http_mock.post = jest.fn((path, body) => {
      if (path === POST_ROUTE.SWAP_POLL_SWAP) {
        return null
      }
      if (path === POST_ROUTE.KEYGEN_FIRST) {
        throw new Error("keygen first error")
      }
      return transferReceiverPost(path, body)
    })

    http_mock.get = jest.fn((path, params) => {
      if (path === GET_ROUTE.STATECHAIN) {
        return SWAP_STATECHAIN_INFO_AFTER_TRANSFER;
      }
      if (path === GET_ROUTE.TRANSFER_BATCH) {
        return {
          "state_chains": ["sc1", "sc2"],
          "finalized": false,
        }
      }
      return transferReceiverGet(path, params, statecoin)
    })

    let wallet = await getWallet()
    let swap = getSwap(wallet, statecoin)

    let result = await swapPhase4(swap)
    expect(result.is_ok()).toEqual(false)
    expect(result.message).toEqual(`statecoin ${UPDATED_STATECOIN.shared_key_id} waiting for completion of batch transfer in swap ID ${UPDATED_STATECOIN.swap_id.id}`)
    copy_t2(statecoin, UPDATED_STATECOIN)
    expect(statecoin).toEqual(UPDATED_STATECOIN)
  })

  test('swapPhase4 test 16 - error from client keygen first message transferReceiverFinalize - batch transfer status: finalized', async function () {
    let statecoin = get_statecoin_in()

    let updated_statecoin = get_statecoin_after_transfer_receiver(statecoin)
    updated_statecoin.ui_swap_status = UI_SWAP_STATUS.Phase8
    let UPDATED_STATECOIN = cloneDeep(updated_statecoin)

    http_mock.post = jest.fn((path, body) => {
      if (path === POST_ROUTE.SWAP_POLL_SWAP) {
        return null
      }
      if (path === POST_ROUTE.KEYGEN_FIRST) {
        throw new Error("keygen first error")
      }
      return transferReceiverPost(path, body)
    })

    http_mock.get = jest.fn((path, params) => {
      if (path === GET_ROUTE.STATECHAIN) {
        return SWAP_STATECHAIN_INFO_AFTER_TRANSFER;
      }
      if (path === GET_ROUTE.TRANSFER_BATCH) {
        return {
          "state_chains": ["sc1", "sc2"],
          "finalized": true,
        }
      }
      return transferReceiverGet(path, params, statecoin)
    })

    let wallet = await getWallet()
    let swap = getSwap(wallet, statecoin)

    let result = await swapPhase4(swap)
    expect(result.is_ok()).toEqual(false)
    expect(result.message).toEqual(`keygen first error: statecoin ${statecoin.shared_key_id} - batch transfer complete for swap ID ${statecoin.swap_id.id}`)
    copy_t2(statecoin, UPDATED_STATECOIN)
    expect(statecoin).toEqual(UPDATED_STATECOIN)
  })

  test('swapPhase4 test 17 - batch transfer timeout', async function () {
    let statecoin = get_statecoin_in()

    let updated_statecoin = get_statecoin_after_transfer_receiver(statecoin)
    updated_statecoin.ui_swap_status = UI_SWAP_STATUS.Phase8
    let UPDATED_STATECOIN = cloneDeep(updated_statecoin)

    http_mock.post = jest.fn((path, body) => {
      if (path === POST_ROUTE.SWAP_POLL_SWAP) {
        return null
      }
      if (path === POST_ROUTE.KEYGEN_FIRST) {
        throw new Error("keygen first error")
      }
      return transferReceiverPost(path, body)
    })

    http_mock.get = jest.fn((path, params) => {
      if (path === GET_ROUTE.STATECHAIN) {
        return SWAP_STATECHAIN_INFO_AFTER_TRANSFER;
      }
      if (path === GET_ROUTE.TRANSFER_BATCH) {
        throw new Error("Transfer batch ended. Timeout")
      }
      return transferReceiverGet(path, params, statecoin)
    })

    let wallet = await getWallet()
    let swap = getSwap(wallet, statecoin)

    await expect(swapPhase4(swap))
      .rejects.toThrow(Error)
    copy_t2(statecoin, UPDATED_STATECOIN)
    expect(statecoin).toEqual(UPDATED_STATECOIN)

    swap = getSwap(wallet, statecoin)
    await expect(swapPhase4(swap))
      .rejects.toThrowError(
        `swap id: ${UPDATED_STATECOIN.swap_id.id}, shared key id: ${UPDATED_STATECOIN.shared_key_id} - swap failed at phase 4/4`
      )
    expect(statecoin).toEqual(UPDATED_STATECOIN)
  })
  test('swapPhase4 test 18 - await transferReceiver, server responds with  error to getStateChain() in  transferReceiver()', async () => {
    let wallet = await getWallet();
    let statecoin = get_statecoin_in();
    let swap = getSwap(wallet, statecoin)
    const step_filter = (step) => {
      return step.subPhase === "transferReceiver"
    }
    let steps = swapPhase4Steps(swap).filter(step_filter)

    swap.setSwapSteps(steps)
    let commitment_data = { "commitment": "7aef2a9771923a485161095ae2314b2a374d223ec1ff67f7602398b3118b445d", "nonce": [118, 94, 232, 150, 99, 240, 44, 21, 13, 91, 170, 84, 58, 234, 242, 220, 184, 197, 137, 219, 179, 125, 111, 165, 233, 100, 228, 21, 79, 170, 3, 238] };
    swap.statecoin.swap_batch_data = commitment_data;
    http_mock.get = jest.fn((path, params) => {
      if (path === GET_ROUTE.STATECHAIN) {
        throw get_error(path)
      }
      return transferReceiverGet(path, params, statecoin)
    })

    http_mock.post = jest.fn((path, body) => {
      return transferReceiverPost(path, body)
    })

    checkRetryMessage(await swap.doNext(),
      `transferReceiver: Error from GET request - path: info/statechain, params: undefined - batch transfer status: statecoin c93ad45a-00b9-449c-a804-aab5530efc90 waiting for completion of batch transfer in swap ID ${statecoin.swap_id.id}`)
  });

  test('swapPhase4 test 19 - await transferReceiver, server responds with invalid swap coin', async () => {
    let wallet = await getWallet();
    let statecoin = get_statecoin_in();
    let swap = getSwap(wallet, statecoin)
    const step_filter = (step) => {
      return step.subPhase === "transferReceiver"
    }
    let steps = swapPhase4Steps(swap).filter(step_filter)
    let tm3 = cloneDeep(mock_http_client.TRANSFER_MSG3)
    tm3.statechain_id = statecoin.swap_info.swap_token.statechain_ids[0]
    const tm3_const = tm3
    swap.statecoin.swap_transfer_msg_3_receiver = tm3_const
    swap.statecoin.swap_transfer_msg = tm3
    swap.setSwapSteps(steps)
    let commitment_data = { "commitment": "7aef2a9771923a485161095ae2314b2a374d223ec1ff67f7602398b3118b445d", "nonce": [118, 94, 232, 150, 99, 240, 44, 21, 13, 91, 170, 84, 58, 234, 242, 220, 184, 197, 137, 219, 179, 125, 111, 165, 233, 100, 228, 21, 79, 170, 3, 238] };
    swap.statecoin.swap_batch_data = commitment_data;
    http_mock.get = jest.fn((path, params) => {
      if (path === GET_ROUTE.STATECHAIN) {
        let sci = cloneDeep(SWAP_STATECHAIN_INFO_AFTER_TRANSFER)
        //sci.amount = 0
        return sci;
      }
      return transferReceiverGet(path, params, statecoin)
    })

    http_mock.post = jest.fn((path, body) => {
      return transferReceiverPost(path, body)
    })

    swap.statecoin.value = 0
    checkRetryMessage(await swap.doNext(),
      `transferReceiver: Swapped coin value invalid. Expected ${STATECOIN_AMOUNT}, got 0 - batch transfer status: statecoin c93ad45a-00b9-449c-a804-aab5530efc90 waiting for completion of batch transfer in swap ID ${statecoin.swap_id.id}`)
  });

  test('swapPhase4 test 20 - repetition of transferReceiver', async () => {
    let wallet = await getWallet();
    let statecoin = get_statecoin_in();
    let swap = getSwap(wallet, statecoin)
    const step_filter = (step) => {
      return step.subPhase === "transferReceiver"
    }
    let steps = swapPhase4Steps(swap).filter(step_filter)
    let tm3 = cloneDeep(mock_http_client.TRANSFER_MSG3)
    tm3.statechain_id = statecoin.swap_info.swap_token.statechain_ids[0]
    const tm3_const = tm3
    swap.statecoin.swap_transfer_msg_3_receiver = tm3_const
    swap.statecoin.swap_transfer_msg = tm3
    swap.setSwapSteps(steps)
    let commitment_data = { "commitment": "7aef2a9771923a485161095ae2314b2a374d223ec1ff67f7602398b3118b445d", "nonce": [118, 94, 232, 150, 99, 240, 44, 21, 13, 91, 170, 84, 58, 234, 242, 220, 184, 197, 137, 219, 179, 125, 111, 165, 233, 100, 228, 21, 79, 170, 3, 238] };
    swap.statecoin.swap_batch_data = commitment_data;
    http_mock.get = jest.fn((path, params) => {
      if (path === GET_ROUTE.STATECHAIN) {
        return SWAP_STATECHAIN_INFO_AFTER_TRANSFER;
      }
      if (path === GET_ROUTE.FEES) {
        return MOCK_SERVER.FEE_INFO;
      }
      return transferReceiverGet(path, params, statecoin)
    })

    http_mock.post = jest.fn((path, params) => {
      if (path === POST_ROUTE.TRANSFER_RECEIVER) {
        return MOCK_SERVER.TRANSFER_RECEIVER
      }
      if (path === POST_ROUTE.TRANSFER_PUBKEY) {
        return MOCK_SERVER.TRANSFER_PUBKEY
      }
      return transferReceiverPost(path, params, statecoin)
    })

    const do_transfer_receiver = async (expected = TRANSFER_FINALIZED_DATA) => {
      let result = await swap.doNext();
      expect(result.is_ok()).toEqual(true)
      expect(swap.statecoin.swap_transfer_finalized_data).toEqual(expected)
      swap.next_step = swap.next_step - 1
    }

    //Statecoin transfer finalized data is initially null
    expect(swap.statecoin.swap_transfer_finalized_data === null)
    await do_transfer_receiver()
    //Repeat transfer_receiver and expect the same statecoin transfer_finalized_data
    swap.statecoin.swap_transfer_finalized_data = null
    await do_transfer_receiver()
    await do_transfer_receiver()

    //Expect to resuse the cached value
    let test_val = "test val"
    swap.statecoin.swap_transfer_finalized_data = test_val
    await do_transfer_receiver(test_val)

  });


  test('swapPhase4 test 21 - await transferReceiver, invalid backup tx amount', async () => {
    let wallet = await getWallet();
    let statecoin = get_statecoin_in();
    let swap = getSwap(wallet, statecoin)
    const step_filter = (step) => {
      return step.subPhase === "transferReceiver"
    }
    let steps = swapPhase4Steps(swap).filter(step_filter)
    let tm3 = cloneDeep(mock_http_client.TRANSFER_MSG3)
    tm3.statechain_id = statecoin.swap_info.swap_token.statechain_ids[0]
    const tm3_const = tm3
    swap.statecoin.swap_transfer_msg_3_receiver = tm3_const
    swap.statecoin.swap_transfer_msg = tm3
    swap.setSwapSteps(steps)
    let commitment_data = { "commitment": "7aef2a9771923a485161095ae2314b2a374d223ec1ff67f7602398b3118b445d", "nonce": [118, 94, 232, 150, 99, 240, 44, 21, 13, 91, 170, 84, 58, 234, 242, 220, 184, 197, 137, 219, 179, 125, 111, 165, 233, 100, 228, 21, 79, 170, 3, 238] };
    swap.statecoin.swap_batch_data = commitment_data;
    http_mock.get = jest.fn((path, params) => {
      if (path === GET_ROUTE.STATECHAIN) {
        let sci = cloneDeep(SWAP_STATECHAIN_INFO_AFTER_TRANSFER)
        sci.amount = 0
        return sci;
      }
      return transferReceiverGet(path, params, statecoin)
    })

    http_mock.post = jest.fn((path, params) => {
      return transferReceiverPost(path, params, statecoin)
    })

    checkRetryMessage(await swap.doNext(),
      `transferReceiver: Backup tx invalid amount. Expected 0, got ${STATECOIN_AMOUNT} - batch transfer status: statecoin c93ad45a-00b9-449c-a804-aab5530efc90 waiting for completion of batch transfer in swap ID ${statecoin.swap_id.id}`)
  });

  test('swapPhase4 test 22 - invalid statecoin status in swapPhase4PollSwap', async () => {
    let wallet = await getWallet();
    let statecoin = get_statecoin_in();
    get_statecoin_after_transfer_receiver(statecoin)

    const step_filter = (step) => {
      return step.subPhase === "swapPhase4PollSwap"
    }

    statecoin.status = null
    let swap = getSwap(wallet, statecoin)
    let step = swapPhase4Steps(swap).filter(step_filter)[0]
    expect(step.statecoin_status()).toBe(false)

    statecoin.status = STATECOIN_STATUS.IN_SWAP;
    swap = getSwap(wallet, statecoin)
    step = swapPhase4Steps(swap).filter(step_filter)[0]
    expect(step.statecoin_status()).toBe(true)

    statecoin.swap_status = null;
    swap = getSwap(wallet, statecoin)
    step = swapPhase4Steps(swap).filter(step_filter)[0]
    expect(step.swap_status()).toBe(false)

    statecoin.swap_status = SWAP_STATUS.Phase4;
    swap = getSwap(wallet, statecoin)
    step = swapPhase4Steps(swap).filter(step_filter)[0]
    expect(step.swap_status()).toBe(true)

    statecoin.swap_transfer_finalized_data = 
    swap = getSwap(wallet, statecoin)
    step = swapPhase4Steps(swap).filter(step_filter)[0]
    step.statecoin_properties()

    statecoin.swap_transfer_finalized_data = null
    swap = getSwap(wallet, statecoin);
    step = swapPhase4Steps(swap).filter(step_filter)[0]
    
    expect(step.statecoin_properties).toThrowError("No transfer finalize data found for coin. Transfer finalize data should be set in Phase1. Exiting swap.")

    statecoin.swap_info = null
    swap = getSwap(wallet, statecoin)
    step = swapPhase4Steps(swap).filter(step_filter)[0]
    expect(step.statecoin_properties).toThrowError("No swap info found for coin. Swap info should be set in Phase1. Exiting swap.");

    statecoin.swap_id = null
    swap = getSwap(wallet, statecoin)
    step = swapPhase4Steps(swap).filter(step_filter)[0]
    expect(step.statecoin_properties).toThrowError("No Swap ID found. Swap ID should be set in Phase0. Exiting swap.");
  })

})
