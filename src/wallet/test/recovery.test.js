/**
 * @jest-environment jest-environment-jsdom-fifteen
 */
let bitcoin = require('bitcoinjs-lib')
import React from 'react';
import {
  Wallet, STATECOIN_STATUS
} from '../';

import { addRestoredCoinDataToWallet, groupRecoveredWithdrawalTransactions, recoverCoins } from '../recovery';
import {
  RECOVERY_DATA, RECOVERY_DATA_C_KEY_CONVERTED, makeTesterStatecoins,
  BTC_ADDRS, recovery_withdrawal_tx_batch, RECOVERY_DATA_WITHDRAWING_BATCH,
  RECOVERY_DATA_WITHDRAWING_BATCH_2,
  RECOVERY_DATA_WITHDRAWING, RECOVERY_DATA_WITHDRAWING_MIXED
} from './test_data';
import {
  RECOVERY_DATA_MSG_UNFINALIZED, RECOVERY_TRANSFER_FINALIZE_DATA_API,
  RECOVERY_STATECHAIN_DATA, TRANSFER_FINALIZE_DATA_FOR_RECOVERY,
  RECOVERY_KEY_GEN_FIRST, RECOVERY_KG_PARTY_ONE_2ND_MESSAGE,
  RECOVERY_MASTER_KEY, RECOVERY_KEY_GEN_2ND_MESSAGE,
  RECOVERY_CLIENT_RESP_KG_FIRST,
  FEE_INFO
} from '../mocks/mock_http_client';

import { getFinalizeDataForRecovery } from '../recovery';
import { configureStore } from '@reduxjs/toolkit';
import TestComponent, { render } from './test-utils';
import reducers from '../../reducers';
import { fireEvent, screen } from '@testing-library/react';
import { encodeSCEAddress } from '../util';
import { Transaction } from 'bitcoinjs-lib'
import { walletFromMnemonic } from '../../features/WalletDataSlice';

describe("Recovery", () => {
    // client side's mock
    let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
    // server side's mock
    let http_mock = jest.genMockFromModule('../mocks/mock_http_client');
    let wallet
    beforeAll(async () => {
      wallet = await Wallet.buildMock(bitcoin.networks.bitcoin, http_mock, wasm_mock);
      wallet.config.jest_testing_mode = true
      wallet.statecoins.coins = [];
      await wallet.genProofKey();
      await wallet.genProofKey();
    })
  
    test('run recovery', async () => {

      http_mock.post = jest.fn().mockReset()
      .mockReturnValueOnce(RECOVERY_DATA)
      .mockReturnValue([]);
      // Create mock HTTP client for

      wasm_mock.convert_bigint_to_client_curv_version = jest.fn(() => RECOVERY_DATA_C_KEY_CONVERTED);
      // Mock wasm client
      
      expect(wallet.statecoins.coins.length).toBe(0);
      // Check no statecoins in Mock wallet
      
      let wallet_json = wallet.toEncryptedJSON()
      // Get encrypted JSON file

      let store = configureStore({ reducer: reducers, });
      // Load state

      render(store,
        <TestComponent
          wallet_json={wallet_json}
          fn={addRestoredCoinDataToWallet}
          args={[wallet, wasm_mock, RECOVERY_DATA]}
        />
      )
      // Test component rendered so wallet loaded to state when function called
      
      
      fireEvent(screen.getByText(/FireFunction/i), new MouseEvent('click', {
        bubbles: true,
        cancelable: true
      }))
      // Firing this event, fires the function
      
      expect(wallet.statecoins.coins.length).toBe(1);
      expect(wallet.statecoins.coins[0].status).toBe(STATECOIN_STATUS.AVAILABLE);
      expect(wallet.statecoins.coins[0].value).toBe(RECOVERY_DATA[0].amount);
      expect(wallet.statecoins.coins[0].sc_address).toBe(encodeSCEAddress(RECOVERY_DATA[0].proof_key));
    });
  })

describe("Recovery unfinalized", () => {
    const MNEMONIC = "similar leader virus polar vague grunt talk flavor kitten order call blood"
    // client side's mock
    let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
    // server side's mock
    let http_mock = jest.genMockFromModule('../mocks/mock_http_client');
    let wallet
    beforeAll(async () => {
      wallet = await Wallet.buildMock(bitcoin.networks.bitcoin, http_mock, wasm_mock, MNEMONIC);
      wallet.statecoins.coins = [];
      await wallet.genProofKey();
      await wallet.genProofKey();
      for (let i = 0; i < 205; i++) {
        wallet.account.nextChainAddress(0);
      }
    })
  
    test('recover finalize data', async () => {
      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(RECOVERY_TRANSFER_FINALIZE_DATA_API)
        .mockReturnValueOnce(RECOVERY_STATECHAIN_DATA)
  
  
      expect(wallet.statecoins.coins.length).toBe(0);
  
      let rec = RECOVERY_DATA_MSG_UNFINALIZED
  
  
  
      let data = await getFinalizeDataForRecovery(wallet, wasm_mock, rec);
  
      expect(data).toEqual(TRANSFER_FINALIZE_DATA_FOR_RECOVERY)
  
    });
  
    test('recover unfinalized', async () => {
      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(RECOVERY_TRANSFER_FINALIZE_DATA_API)
        .mockReturnValueOnce(RECOVERY_STATECHAIN_DATA)
  
      http_mock.post = jest.fn().mockReset()
        .mockReturnValueOnce(RECOVERY_KEY_GEN_FIRST)
        .mockReturnValueOnce(RECOVERY_KG_PARTY_ONE_2ND_MESSAGE);
  
      wasm_mock.KeyGen.first_message = jest.fn(() => JSON.stringify(RECOVERY_CLIENT_RESP_KG_FIRST));
      wasm_mock.KeyGen.second_message = jest.fn(() => JSON.stringify(RECOVERY_KEY_GEN_2ND_MESSAGE));
      wasm_mock.KeyGen.set_master_key = jest.fn(() => JSON.stringify(RECOVERY_MASTER_KEY));
  
      expect(wallet.statecoins.coins.length).toBe(0);
  
      let rec = RECOVERY_DATA_MSG_UNFINALIZED
      wallet.config.jest_testing_mode = true
      await addRestoredCoinDataToWallet(wallet, wasm_mock, [rec]);
      expect(wallet.statecoins.coins.length).toBe(1);
      expect(wallet.statecoins.coins[0].status).toBe(STATECOIN_STATUS.AVAILABLE);
      expect(wallet.statecoins.coins[0].amount).toBe(RECOVERY_DATA.amount);
  
    });
  
})
  
describe("Recovery withdrawing utils", () => {
  let statecoins
  let transactions
  let transaction_hexs
  
  // client side's mock
  let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
  // server side's mock
  let http_mock = jest.genMockFromModule('../mocks/mock_http_client');
  let wallet
 
  describe("groupRecoveredWithdrawalTransactions", () => {
    let withdrawal_tx_map
    let withdrawal_tx_id_map
    let withdrawal_addr_map
    let skids = new Set()
    let statecoins_map = new Map()

    beforeEach(async () => {
      wallet = await Wallet.buildMock(bitcoin.networks.bitcoin, http_mock, wasm_mock);
      wallet.statecoins.coins = [];
      await wallet.genProofKey();
      await wallet.genProofKey();
      statecoins = makeTesterStatecoins();
      transaction_hexs = new Array()
      transactions = new Array()
      statecoins.forEach((statecoin) => {
        transaction_hexs.push(statecoin.tx_backup.toHex())
        transactions.push(statecoin.tx_backup)
        skids.add(statecoin.shared_key_id)
        statecoins_map.set(statecoin.shared_key_id, statecoin)
      })
      withdrawal_tx_map = new Map()
      withdrawal_tx_id_map = new Map()
      withdrawal_addr_map = new Map()
    })
    
    test('single withdrawals', () => {
      statecoins.forEach((statecoin, i) => {
        withdrawal_tx_id_map.set(transactions[i].getId(), transactions[i])
        withdrawal_tx_map.set(transactions[i].getId(), [statecoin.shared_key_id])
        withdrawal_addr_map.set(transactions[i].getId(), BTC_ADDRS[i])
      })
      groupRecoveredWithdrawalTransactions(withdrawal_tx_map, withdrawal_tx_id_map, withdrawal_addr_map, statecoins_map)

      expect(statecoins_map.size).toEqual(2)
      let vals = statecoins_map.values()
      let broadcast_infos = vals.next().value.tx_withdraw_broadcast
      expect(broadcast_infos.length).toEqual(1)
      expect(broadcast_infos[0].rec_addr).toEqual(BTC_ADDRS[0])
      broadcast_infos = vals.next().value.tx_withdraw_broadcast
      expect(broadcast_infos.length).toEqual(1)
      expect(broadcast_infos[0].rec_addr).toEqual(BTC_ADDRS[1])
     
    })

    test('batch withdrawal - wrong number of tx outputs', () => {
      withdrawal_tx_id_map.set(transactions[0].getId(), transactions[0])
      withdrawal_tx_map.set(transactions[0].getId(), [statecoins[0].shared_key_id, statecoins[1].shared_key_id])
      withdrawal_addr_map.set(transactions[0].getId(), BTC_ADDRS[2])
      groupRecoveredWithdrawalTransactions(withdrawal_tx_map, withdrawal_tx_id_map, withdrawal_addr_map, statecoins_map)
      expect(statecoins_map.size).toEqual(0)
    })

    test('batch withdrawal', () => {
      console.log(recovery_withdrawal_tx_batch)
      let tx = Transaction.fromHex(recovery_withdrawal_tx_batch)
      withdrawal_tx_id_map.set(tx.getId(), tx)
      withdrawal_tx_map.set(tx.getId(), [statecoins[0].shared_key_id, statecoins[1].shared_key_id])
      withdrawal_addr_map.set(tx.getId(), BTC_ADDRS[2])
      groupRecoveredWithdrawalTransactions(withdrawal_tx_map, withdrawal_tx_id_map, withdrawal_addr_map, statecoins_map)
      expect(statecoins_map.size).toEqual(2)
      let vals = statecoins_map.values()
      //for (let i = 0; i < statecoins_map.size; i++) {
      let broadcast_infos = vals.next().value.tx_withdraw_broadcast
      expect(broadcast_infos.length).toEqual(1)
      expect(broadcast_infos[0].rec_addr).toEqual(BTC_ADDRS[2])
    })

    test('batch withdrawal 2', () => {
      const tx_hex = RECOVERY_DATA_WITHDRAWING_BATCH_2[0].withdrawing.tx_hex
      console.log(tx_hex)
      let tx = Transaction.fromHex(tx_hex)
      withdrawal_tx_id_map.set(tx.getId(), tx)
      withdrawal_tx_map.set(tx.getId(), [statecoins[0].shared_key_id, statecoins[1].shared_key_id])
      withdrawal_addr_map.set(tx.getId(), BTC_ADDRS[2])
      groupRecoveredWithdrawalTransactions(withdrawal_tx_map, withdrawal_tx_id_map, withdrawal_addr_map, statecoins_map)
      expect(statecoins_map.size).toEqual(2)
      let vals = statecoins_map.values()
      //for (let i = 0; i < statecoins_map.size; i++) {
      let broadcast_infos = vals.next().value.tx_withdraw_broadcast
      expect(broadcast_infos.length).toEqual(1)
      expect(broadcast_infos[0].rec_addr).toEqual(BTC_ADDRS[2])
    })


    test('single/batch withdrawal', () => {
      console.log(recovery_withdrawal_tx_batch)
      let tx = Transaction.fromHex(recovery_withdrawal_tx_batch)
      withdrawal_tx_id_map.set(tx.getId(), tx)
      withdrawal_tx_map.set(tx.getId(), [RECOVERY_DATA_WITHDRAWING_BATCH[0].shared_key_id, RECOVERY_DATA_WITHDRAWING_BATCH[1].shared_key_id])
      withdrawal_addr_map.set(tx.getId(), BTC_ADDRS[2])
      statecoins.forEach((statecoin, i) => {
        withdrawal_tx_id_map.set(transactions[i].getId(), transactions[i])
        withdrawal_tx_map.set(transactions[i].getId(), [statecoin.shared_key_id])
        withdrawal_addr_map.set(transactions[i].getId(), BTC_ADDRS[i])
      })

      groupRecoveredWithdrawalTransactions(withdrawal_tx_map, withdrawal_tx_id_map, withdrawal_addr_map, statecoins_map)
      expect(statecoins_map.size).toEqual(2)
      let vals = statecoins_map.values()
      //for (let i = 0; i < statecoins_map.size; i++) {
      let broadcast_infos = vals.next().value.tx_withdraw_broadcast
      expect(broadcast_infos.length).toEqual(1)
      expect(broadcast_infos[0].rec_addr).toEqual("tb1q6xwt00hnwcrtlunvnz8u0xrtdxv5ztx7pj44cp")
    })

    test('single/batch withdrawal 2', () => {
      console.log(recovery_withdrawal_tx_batch)
      let tx = Transaction.fromHex(recovery_withdrawal_tx_batch)
      withdrawal_tx_id_map.set(tx.getId(), tx)
      withdrawal_tx_map.set(tx.getId(), [RECOVERY_DATA_WITHDRAWING_BATCH_2[0].shared_key_id, RECOVERY_DATA_WITHDRAWING_BATCH_2[1].shared_key_id])
      withdrawal_addr_map.set(tx.getId(), BTC_ADDRS[2])
      statecoins.forEach((statecoin, i) => {
        withdrawal_tx_id_map.set(transactions[i].getId(), transactions[i])
        withdrawal_tx_map.set(transactions[i].getId(), [statecoin.shared_key_id])
        withdrawal_addr_map.set(transactions[i].getId(), BTC_ADDRS[i])
      })

      groupRecoveredWithdrawalTransactions(withdrawal_tx_map, withdrawal_tx_id_map, withdrawal_addr_map, statecoins_map)
      expect(statecoins_map.size).toEqual(2)
      let vals = statecoins_map.values()
      //for (let i = 0; i < statecoins_map.size; i++) {
      let broadcast_infos = vals.next().value.tx_withdraw_broadcast
      expect(broadcast_infos.length).toEqual(1)
      expect(broadcast_infos[0].rec_addr).toEqual("tb1q6xwt00hnwcrtlunvnz8u0xrtdxv5ztx7pj44cp")
    })
   

  })
})

describe("Recovery withdrawing", () => {
  // client side's mock
  let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
  // server side's mock
  let http_mock = jest.genMockFromModule('../mocks/mock_http_client');
  let wallet
  beforeEach(async () => {
    wallet = await Wallet.buildMock(bitcoin.networks.bitcoin, http_mock, wasm_mock);
    wallet.statecoins.coins = [];
    await wallet.genProofKey();
    await wallet.genProofKey();
  })

  test('run recovery withdrawing', async () => {

    http_mock.post = jest.fn().mockReset()
      .mockReturnValueOnce(RECOVERY_DATA_WITHDRAWING)
      .mockReturnValue([]);
    // Create mock HTTP client for

    wasm_mock.convert_bigint_to_client_curv_version = jest.fn(() => RECOVERY_DATA_C_KEY_CONVERTED);
    // Mock wasm client

    expect(wallet.statecoins.coins.length).toBe(0);
    // Check no statecoins in Mock wallet

    let wallet_json = wallet.toEncryptedJSON()
    // Get encrypted JSON file

    let store = configureStore({ reducer: reducers, });
    // Load state

    render(store,
      <TestComponent
        wallet_json={wallet_json}
        fn={addRestoredCoinDataToWallet}
        args={[wallet, wasm_mock, RECOVERY_DATA_WITHDRAWING]}
      />
    )
    // Test component rendered so wallet loaded to state when function called


    fireEvent(screen.getByText(/FireFunction/i), new MouseEvent('click', {
      bubbles: true,
      cancelable: true
    }))
    // Firing this event, fires the function

    expect(wallet.statecoins.coins.length).toBe(2);
    expect(wallet.statecoins.coins[0].status).toBe(STATECOIN_STATUS.WITHDRAWING);
    
    expect(wallet.statecoins.coins[0].value).toBe(RECOVERY_DATA_WITHDRAWING[0].amount);
    expect(wallet.statecoins.coins[0].sc_address).toBe(encodeSCEAddress(RECOVERY_DATA_WITHDRAWING[0].proof_key));
    expect(wallet.statecoins.coins[0].tx_withdraw_broadcast.length).toBe(1)
    expect(wallet.statecoins.coins[0].tx_withdraw_broadcast[0].rec_addr).toEqual(BTC_ADDRS[0])
    expect(wallet.statecoins.coins[0].tx_withdraw_broadcast[0].tx_fee).toEqual(226)
    expect(wallet.statecoins.coins[0].tx_withdraw_broadcast[0].tx.toHex()).toEqual(RECOVERY_DATA_WITHDRAWING[0].withdrawing.tx_hex)
    expect(wallet.statecoins.coins[0].tx_withdraw_broadcast[0].txid).toEqual(Transaction.fromHex(RECOVERY_DATA_WITHDRAWING[0].withdrawing.tx_hex).getId())
    expect(wallet.statecoins.coins[0].tx_withdraw_broadcast[0].withdraw_msg_2).toEqual({ shared_key_ids: [RECOVERY_DATA_WITHDRAWING[0].shared_key_id]})

    expect(wallet.statecoins.coins[1].status).toBe(STATECOIN_STATUS.WITHDRAWING);
    expect(wallet.statecoins.coins[1].value).toBe(RECOVERY_DATA_WITHDRAWING[1].amount);
    expect(wallet.statecoins.coins[1].sc_address).toBe(encodeSCEAddress(RECOVERY_DATA_WITHDRAWING[1].proof_key));
    expect(wallet.statecoins.coins[1].tx_withdraw_broadcast[0].rec_addr).toEqual(BTC_ADDRS[1])
    expect(wallet.statecoins.coins[1].tx_withdraw_broadcast[0].tx_fee).toEqual(226)
    expect(wallet.statecoins.coins[1].tx_withdraw_broadcast[0].tx.toHex()).toEqual(RECOVERY_DATA_WITHDRAWING[1].withdrawing.tx_hex)
    expect(wallet.statecoins.coins[1].tx_withdraw_broadcast[0].txid).toEqual(Transaction.fromHex(RECOVERY_DATA_WITHDRAWING[1].withdrawing.tx_hex).getId())
    expect(wallet.statecoins.coins[1].tx_withdraw_broadcast[0].withdraw_msg_2).toEqual({ shared_key_ids: [RECOVERY_DATA_WITHDRAWING[1].shared_key_id] })
  });

  
})

describe("Recovery withdrawing batch", () => {
  // client side's mock
  let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
  // server side's mock
  let http_mock = jest.genMockFromModule('../mocks/mock_http_client');
  let wallet
  beforeEach(async () => {
    wallet = await Wallet.buildMock(bitcoin.networks.bitcoin, http_mock, wasm_mock);
    wallet.statecoins.coins = [];
    await wallet.genProofKey();
    await wallet.genProofKey();
  });

  test('run recovery withdrawing batch', async () => {

    http_mock.post = jest.fn().mockReset()
      .mockReturnValueOnce(RECOVERY_DATA_WITHDRAWING_BATCH)
      .mockReturnValue([]);
    // Create mock HTTP client for

    wasm_mock.convert_bigint_to_client_curv_version = jest.fn(() => RECOVERY_DATA_C_KEY_CONVERTED);
    // Mock wasm client

    expect(wallet.statecoins.coins.length).toBe(0);
    // Check no statecoins in Mock wallet

    let wallet_json = wallet.toEncryptedJSON()
    // Get encrypted JSON file

    let store = configureStore({ reducer: reducers, });
    // Load state

    render(store,
      <TestComponent
        wallet_json={wallet_json}
        fn={addRestoredCoinDataToWallet}
        args={[wallet, wasm_mock, RECOVERY_DATA_WITHDRAWING_BATCH]}
      />
    )
    // Test component rendered so wallet loaded to state when function called


    fireEvent(screen.getByText(/FireFunction/i), new MouseEvent('click', {
      bubbles: true,
      cancelable: true
    }))
    // Firing this event, fires the function

    expect(wallet.statecoins.coins.length).toBe(2);
    expect(wallet.statecoins.coins[0].status).toBe(STATECOIN_STATUS.WITHDRAWING);

    expect(wallet.statecoins.coins[0].value).toBe(RECOVERY_DATA_WITHDRAWING_BATCH[0].amount);
    expect(wallet.statecoins.coins[0].sc_address).toBe(encodeSCEAddress(RECOVERY_DATA_WITHDRAWING_BATCH[0].proof_key));
    expect(wallet.statecoins.coins[0].tx_withdraw_broadcast.length).toBe(1)
    expect(wallet.statecoins.coins[0].tx_withdraw_broadcast[0].rec_addr).toEqual(BTC_ADDRS[2])
    expect(wallet.statecoins.coins[0].tx_withdraw_broadcast[0].tx_fee).toEqual(515)
    expect(wallet.statecoins.coins[0].tx_withdraw_broadcast[0].tx.toHex()).toEqual(RECOVERY_DATA_WITHDRAWING_BATCH[0].withdrawing.tx_hex)
    expect(wallet.statecoins.coins[0].tx_withdraw_broadcast[0].txid).toEqual(Transaction.fromHex(RECOVERY_DATA_WITHDRAWING_BATCH[0].withdrawing.tx_hex).getId())
    expect(wallet.statecoins.coins[0].tx_withdraw_broadcast[0].withdraw_msg_2).toEqual({
      shared_key_ids:
        [RECOVERY_DATA_WITHDRAWING_BATCH[0].shared_key_id,
          RECOVERY_DATA_WITHDRAWING_BATCH[1].shared_key_id]
    })

    expect(wallet.statecoins.coins[1].status).toBe(STATECOIN_STATUS.WITHDRAWING);
    expect(wallet.statecoins.coins[1].value).toBe(RECOVERY_DATA_WITHDRAWING_BATCH[1].amount);
    expect(wallet.statecoins.coins[1].sc_address).toBe(encodeSCEAddress(RECOVERY_DATA_WITHDRAWING_BATCH[1].proof_key));
    expect(wallet.statecoins.coins[1].tx_withdraw_broadcast[0].rec_addr).toEqual(BTC_ADDRS[2])
    expect(wallet.statecoins.coins[1].tx_withdraw_broadcast[0].tx_fee).toEqual(515)
    expect(wallet.statecoins.coins[1].tx_withdraw_broadcast[0].tx.toHex()).toEqual(RECOVERY_DATA_WITHDRAWING_BATCH[1].withdrawing.tx_hex)
    expect(wallet.statecoins.coins[1].tx_withdraw_broadcast[0].txid).toEqual(Transaction.fromHex(RECOVERY_DATA_WITHDRAWING_BATCH[1].withdrawing.tx_hex).getId())
    expect(wallet.statecoins.coins[1].tx_withdraw_broadcast[0].withdraw_msg_2).toEqual({
      shared_key_ids:
        [RECOVERY_DATA_WITHDRAWING_BATCH[0].shared_key_id,
          RECOVERY_DATA_WITHDRAWING_BATCH[1].shared_key_id]
    })
  });
})

describe("Recovery withdrawing mixed", () => {
  // client side's mock
  let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
  // server side's mock
  let http_mock = jest.genMockFromModule('../mocks/mock_http_client');
  let wallet
  beforeEach(async () => {
    wallet = await Wallet.buildMock(bitcoin.networks.bitcoin, http_mock, wasm_mock);
    wallet.statecoins.coins = [];
    await wallet.genProofKey();
    await wallet.genProofKey();
  });

  test('run recovery withdrawing mixed', async () => {

    http_mock.post = jest.fn().mockReset()
      .mockReturnValueOnce(RECOVERY_DATA_WITHDRAWING_MIXED)
      .mockReturnValue([]);
    // Create mock HTTP client for

    wasm_mock.convert_bigint_to_client_curv_version = jest.fn(() => RECOVERY_DATA_C_KEY_CONVERTED);
    // Mock wasm client

    expect(wallet.statecoins.coins.length).toBe(0);
    // Check no statecoins in Mock wallet

    let wallet_json = wallet.toEncryptedJSON()
    // Get encrypted JSON file

    let store = configureStore({ reducer: reducers, });
    // Load state

    render(store,
      <TestComponent
        wallet_json={wallet_json}
        fn={addRestoredCoinDataToWallet}
        args={[wallet, wasm_mock, RECOVERY_DATA_WITHDRAWING_MIXED]}
      />
    )
    // Test component rendered so wallet loaded to state when function called


    fireEvent(screen.getByText(/FireFunction/i), new MouseEvent('click', {
      bubbles: true,
      cancelable: true
    }))
    // Firing this event, fires the function

    expect(wallet.statecoins.coins.length).toBe(4);

    expect(wallet.statecoins.coins[0].status).toBe(STATECOIN_STATUS.WITHDRAWING);
    expect(wallet.statecoins.coins[0].value).toBe(RECOVERY_DATA_WITHDRAWING_MIXED[0].amount);
    expect(wallet.statecoins.coins[0].sc_address).toBe(encodeSCEAddress(RECOVERY_DATA_WITHDRAWING_MIXED[0].proof_key));
    expect(wallet.statecoins.coins[0].tx_withdraw_broadcast.length).toBe(1)
    expect(wallet.statecoins.coins[0].tx_withdraw_broadcast[0].rec_addr).toEqual(BTC_ADDRS[0])
    expect(wallet.statecoins.coins[0].tx_withdraw_broadcast[0].tx_fee).toEqual(226)
    expect(wallet.statecoins.coins[0].tx_withdraw_broadcast[0].tx.toHex()).toEqual(RECOVERY_DATA_WITHDRAWING_MIXED[0].withdrawing.tx_hex)
    expect(wallet.statecoins.coins[0].tx_withdraw_broadcast[0].txid).toEqual(Transaction.fromHex(RECOVERY_DATA_WITHDRAWING_MIXED[0].withdrawing.tx_hex).getId())
    expect(wallet.statecoins.coins[0].tx_withdraw_broadcast[0].withdraw_msg_2).toEqual({ shared_key_ids: [RECOVERY_DATA_WITHDRAWING_MIXED[0].shared_key_id] })

    expect(wallet.statecoins.coins[1].status).toBe(STATECOIN_STATUS.WITHDRAWING);
    expect(wallet.statecoins.coins[1].value).toBe(RECOVERY_DATA_WITHDRAWING_MIXED[1].amount);
    expect(wallet.statecoins.coins[1].sc_address).toBe(encodeSCEAddress(RECOVERY_DATA_WITHDRAWING_MIXED[1].proof_key));
    expect(wallet.statecoins.coins[1].tx_withdraw_broadcast[0].rec_addr).toEqual(BTC_ADDRS[1])
    expect(wallet.statecoins.coins[1].tx_withdraw_broadcast[0].tx_fee).toEqual(226)
    expect(wallet.statecoins.coins[1].tx_withdraw_broadcast[0].tx.toHex()).toEqual(RECOVERY_DATA_WITHDRAWING_MIXED[1].withdrawing.tx_hex)
    expect(wallet.statecoins.coins[1].tx_withdraw_broadcast[0].txid).toEqual(Transaction.fromHex(RECOVERY_DATA_WITHDRAWING_MIXED[1].withdrawing.tx_hex).getId())
    expect(wallet.statecoins.coins[1].tx_withdraw_broadcast[0].withdraw_msg_2).toEqual({ shared_key_ids: [RECOVERY_DATA_WITHDRAWING_MIXED[1].shared_key_id] })

    expect(wallet.statecoins.coins[2].status).toBe(STATECOIN_STATUS.WITHDRAWING);
    expect(wallet.statecoins.coins[2].value).toBe(RECOVERY_DATA_WITHDRAWING_MIXED[2].amount);
    expect(wallet.statecoins.coins[2].sc_address).toBe(encodeSCEAddress(RECOVERY_DATA_WITHDRAWING_MIXED[2].proof_key));
    expect(wallet.statecoins.coins[2].tx_withdraw_broadcast.length).toBe(1)
    expect(wallet.statecoins.coins[2].tx_withdraw_broadcast[0].rec_addr).toEqual(BTC_ADDRS[2])
    expect(wallet.statecoins.coins[2].tx_withdraw_broadcast[0].tx_fee).toEqual(515)
    expect(wallet.statecoins.coins[2].tx_withdraw_broadcast[0].tx.toHex()).toEqual(RECOVERY_DATA_WITHDRAWING_MIXED[2].withdrawing.tx_hex)
    expect(wallet.statecoins.coins[2].tx_withdraw_broadcast[0].txid).toEqual(Transaction.fromHex(RECOVERY_DATA_WITHDRAWING_MIXED[2].withdrawing.tx_hex).getId())
    expect(wallet.statecoins.coins[2].tx_withdraw_broadcast[0].withdraw_msg_2).toEqual({
      shared_key_ids:
        [RECOVERY_DATA_WITHDRAWING_MIXED[2].shared_key_id,
        RECOVERY_DATA_WITHDRAWING_MIXED[3].shared_key_id]
    })

    expect(wallet.statecoins.coins[3].status).toBe(STATECOIN_STATUS.WITHDRAWING);
    expect(wallet.statecoins.coins[3].value).toBe(RECOVERY_DATA_WITHDRAWING_MIXED[3].amount);
    expect(wallet.statecoins.coins[3].sc_address).toBe(encodeSCEAddress(RECOVERY_DATA_WITHDRAWING_MIXED[3].proof_key));
    expect(wallet.statecoins.coins[3].tx_withdraw_broadcast[0].rec_addr).toEqual(BTC_ADDRS[2])
    expect(wallet.statecoins.coins[3].tx_withdraw_broadcast[0].tx_fee).toEqual(515)
    expect(wallet.statecoins.coins[3].tx_withdraw_broadcast[0].tx.toHex()).toEqual(RECOVERY_DATA_WITHDRAWING_MIXED[3].withdrawing.tx_hex)
    expect(wallet.statecoins.coins[3].tx_withdraw_broadcast[0].txid).toEqual(Transaction.fromHex(RECOVERY_DATA_WITHDRAWING_MIXED[3].withdrawing.tx_hex).getId())
    expect(wallet.statecoins.coins[3].tx_withdraw_broadcast[0].withdraw_msg_2).toEqual({
      shared_key_ids:
        [RECOVERY_DATA_WITHDRAWING_MIXED[2].shared_key_id,
        RECOVERY_DATA_WITHDRAWING_MIXED[3].shared_key_id]
    })
  });
})


describe("Recovery withdrawing batch 2", () => {
  const MNEMONIC = "jar coyote eyebrow tell world curious breeze text beef lawn then clump"
  // client side's mock
  let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
  // server side's mock
  let http_mock = jest.genMockFromModule('../mocks/mock_http_client');
  let wallet
  beforeAll(async () => {
    wallet = await Wallet.buildMock(bitcoin.networks.bitcoin, http_mock, wasm_mock, MNEMONIC);
    wallet.statecoins.coins = [];
    //await wallet.genProofKey();
    
    for (let i = 0; i < 5; i++) {
      //wallet.account.nextChainAddress(0);
      await wallet.genProofKey();
    }
  })


  test('withdrawal tx compare', () => {
    const tx0 = Transaction.fromHex(RECOVERY_DATA_WITHDRAWING_BATCH_2[0].withdrawing.tx_hex)
    const tx1 = Transaction.fromHex(RECOVERY_DATA_WITHDRAWING_BATCH_2[1].withdrawing.tx_hex)
    expect(tx0.getId()).toEqual(tx1.getId())
    expect(tx0.getHash()).toEqual(tx1.getHash())
  })

  test('run recovery withdrawing batch 2', async () => {

    http_mock.post = jest.fn().mockReset()
      .mockReturnValueOnce(RECOVERY_DATA_WITHDRAWING_BATCH_2)
      .mockReturnValue([]);
    // Create mock HTTP client for

    wasm_mock.convert_bigint_to_client_curv_version = jest.fn(() => RECOVERY_DATA_C_KEY_CONVERTED);
    // Mock wasm client

    expect(wallet.statecoins.coins.length).toBe(0);
    // Check no statecoins in Mock wallet

    let wallet_json = wallet.toEncryptedJSON()
    // Get encrypted JSON file

    let store = configureStore({ reducer: reducers, });
    // Load state

    render(store,
      <TestComponent
        wallet_json={wallet_json}
        fn={addRestoredCoinDataToWallet}
        args={[wallet, wasm_mock, RECOVERY_DATA_WITHDRAWING_BATCH_2]}
      />
    )
    // Test component rendered so wallet loaded to state when function called


    fireEvent(screen.getByText(/FireFunction/i), new MouseEvent('click', {
      bubbles: true,
      cancelable: true
    }))
    // Firing this event, fires the function

    expect(wallet.statecoins.coins.length).toBe(2);
    expect(wallet.statecoins.coins[0].status).toBe(STATECOIN_STATUS.WITHDRAWING);

    expect(wallet.statecoins.coins[0].value).toBe(RECOVERY_DATA_WITHDRAWING_BATCH_2[0].amount);
    expect(wallet.statecoins.coins[0].sc_address).toBe(encodeSCEAddress(RECOVERY_DATA_WITHDRAWING_BATCH_2[0].proof_key));
    expect(wallet.statecoins.coins[0].tx_withdraw_broadcast.length).toBe(1)
    expect(wallet.statecoins.coins[0].tx_withdraw_broadcast[0].rec_addr).toEqual(RECOVERY_DATA_WITHDRAWING_BATCH_2[0].withdrawing.rec_addr)
    expect(wallet.statecoins.coins[0].tx_withdraw_broadcast[0].tx_fee).toEqual(515)
    expect(wallet.statecoins.coins[0].tx_withdraw_broadcast[0].tx.getId()).toEqual(Transaction.fromHex(RECOVERY_DATA_WITHDRAWING_BATCH_2[0].withdrawing.tx_hex).getId())
    expect(wallet.statecoins.coins[0].tx_withdraw_broadcast[0].txid).toEqual(Transaction.fromHex(RECOVERY_DATA_WITHDRAWING_BATCH_2[0].withdrawing.tx_hex).getId())
    expect(wallet.statecoins.coins[0].tx_withdraw_broadcast[0].withdraw_msg_2).toEqual({
      shared_key_ids:
        [RECOVERY_DATA_WITHDRAWING_BATCH_2[0].shared_key_id,
        RECOVERY_DATA_WITHDRAWING_BATCH_2[1].shared_key_id]
    })

    expect(wallet.statecoins.coins[1].status).toBe(STATECOIN_STATUS.WITHDRAWING);
    expect(wallet.statecoins.coins[1].value).toBe(RECOVERY_DATA_WITHDRAWING_BATCH_2[1].amount);
    expect(wallet.statecoins.coins[1].sc_address).toBe(encodeSCEAddress(RECOVERY_DATA_WITHDRAWING_BATCH_2[1].proof_key));
    expect(wallet.statecoins.coins[1].tx_withdraw_broadcast[0].rec_addr).toEqual(RECOVERY_DATA_WITHDRAWING_BATCH_2[1].withdrawing.rec_addr)
    expect(wallet.statecoins.coins[1].tx_withdraw_broadcast[0].tx_fee).toEqual(515)
    expect(wallet.statecoins.coins[1].tx_withdraw_broadcast[0].tx.getId()).toEqual(Transaction.fromHex(RECOVERY_DATA_WITHDRAWING_BATCH_2[1].withdrawing.tx_hex).getId())
    expect(wallet.statecoins.coins[1].tx_withdraw_broadcast[0].txid).toEqual(Transaction.fromHex(RECOVERY_DATA_WITHDRAWING_BATCH_2[1].withdrawing.tx_hex).getId())
    expect(wallet.statecoins.coins[1].tx_withdraw_broadcast[0].withdraw_msg_2).toEqual({
      shared_key_ids:
        [RECOVERY_DATA_WITHDRAWING_BATCH_2[0].shared_key_id,
        RECOVERY_DATA_WITHDRAWING_BATCH_2[1].shared_key_id]
    })
  });


})

describe('Retry Recovery', function () {
  let wallet

  // client side's mock
  let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
  // server side's mock
  let http_mock = jest.genMockFromModule('../mocks/mock_http_client');

  let resetSwapStates;
  let set_tor_endpoints;
  let initElectrumClient;
  let recoverCoinsMock;
  let WalletMock;
  let stopMock;
  let router = [];

  let store = configureStore({ reducer: reducers, });
  // Load state
  
  afterEach(() => {
    // WalletMock = jest.spyOn(Wallet, 'fromMnemonic').mockImplementation(() => {
    //   return Wallet.fromMnemonic
    // })
    jest.restoreAllMocks();
    router = [];
  })
  
  beforeEach(async () => {
    wallet = await Wallet.buildMock(bitcoin.networks.testnet, http_mock);

    // Set Mocks for walletFromMnemonic call
    resetSwapStates = jest.spyOn(wallet, 'resetSwapStates').mockImplementation();
    set_tor_endpoints = jest.spyOn(wallet, 'set_tor_endpoints').mockImplementation();
    initElectrumClient = jest.spyOn(wallet, 'initElectrumClient').mockImplementation();
    stopMock = jest.spyOn(wallet, 'stop').mockImplementation();

    WalletMock = jest.spyOn(Wallet, 'fromMnemonic').mockImplementation(() => {
      return wallet
    })

  })

  test('Success',async () => {

    wallet.recoverCoinsFromServer = jest.fn()

    await walletFromMnemonic(store.dispatch, wallet.name, wallet.password, wallet.mnemonic, router, true, 200, 0);
    
    expect(router[0]).toBe("/home")

  })

  test('Failure',async () => {

    let recoverCoinMock = jest.spyOn(wallet, 'recoverCoinsFromServer').mockImplementation(() => {
      throw new Error("Network Error");
    })

    try{
      await walletFromMnemonic(store.dispatch, wallet.name, wallet.password, wallet.mnemonic, router, true, 200, 0);

    } catch{

    }

    let errorMessage = store.getState().walletData.error_dialogue.msg;

    
    expect(errorMessage).toBe('Error in Recovery: Network Error');


  })

  test('Fails 3 times then passes', async ()=> {

    let recoverCoinMock = jest.spyOn(wallet, 'recoverCoinsFromServer')
      .mockReturnValueOnce(() => {
        throw new Error("Network Error")
      })
      .mockReturnValueOnce(() => {
        throw new Error("Network Error")
      })
      .mockReturnValueOnce(() => {
        throw new Error("Network Error")
      })
      .mockReturnValueOnce();

    try{
      await walletFromMnemonic(store.dispatch, wallet.name, wallet.password, wallet.mnemonic, router, true, 200);

    } catch{

    }

    let progressMsg = store.getState().walletData.progress.msg;

    
    expect(progressMsg).toBe("");

    expect(router[0]).toBe("/home");

  })

  test('Wallet account reset after each retry', async () => {

    wallet.http_client.post = jest.fn().mockReset()
      .mockImplementation(() => {
        return []
      });

    wallet.http_client.get = jest.fn().mockReset()
      .mockImplementation(() => {
        return FEE_INFO
      });

    let gap_start = 0;
    let gap_limit = 200;
      

    await recoverCoins(wallet, gap_limit, gap_start, store.dispatch);
    
    await recoverCoins(wallet, gap_limit, gap_start, store.dispatch);
    
    expect(wallet.account.chains[0].k).toBe(200);


  })

})