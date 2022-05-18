let bitcoin = require('bitcoinjs-lib')
import React from 'react';
import {
  Wallet, STATECOIN_STATUS
} from '../';

import { addRestoredCoinDataToWallet, groupRecoveredWithdrawalTransactions } from '../recovery';
import {
  RECOVERY_DATA, RECOVERY_DATA_C_KEY_CONVERTED, makeTesterStatecoins,
  BTC_ADDR, recovery_withdrawal_tx_batch, RECOVERY_DATA_WITHDRAWING_BATCH
} from './test_data';
import {
  RECOVERY_DATA_MSG_UNFINALIZED, RECOVERY_TRANSFER_FINALIZE_DATA_API,
  RECOVERY_STATECHAIN_DATA, TRANSFER_FINALIZE_DATA_FOR_RECOVERY,
  RECOVERY_KEY_GEN_FIRST, RECOVERY_KG_PARTY_ONE_2ND_MESSAGE,
  RECOVERY_MASTER_KEY, RECOVERY_KEY_GEN_2ND_MESSAGE,
  RECOVERY_CLIENT_RESP_KG_FIRST
} from '../mocks/mock_http_client';

import { getFinalizeDataForRecovery } from '../recovery';
import { configureStore } from '@reduxjs/toolkit';
import TestComponent, { render } from './test-utils';
import reducers from '../../reducers';
import { fireEvent, screen } from '@testing-library/react';
import { encodeSCEAddress } from '../util';
import { Transaction } from 'bitcoinjs-lib'
import { assert } from 'console';
import { WithdrawalTxBroadcastInfo } from '../statecoin';

let cloneDeep = require('lodash.clonedeep');

describe("Recovery", () => {
    // client side's mock
    let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
    // server side's mock
    let http_mock = jest.genMockFromModule('../mocks/mock_http_client');
    let wallet
    beforeAll(async () => {
      wallet = await Wallet.buildMock(bitcoin.networks.bitcoin, http_mock, wasm_mock);
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
      for (let i = 0; i < 50; i++) {
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
  
      await addRestoredCoinDataToWallet(wallet, wasm_mock, [rec]);
      expect(wallet.statecoins.coins.length).toBe(1);
      expect(wallet.statecoins.coins[0].status).toBe(STATECOIN_STATUS.AVAILABLE);
      expect(wallet.statecoins.coins[0].amount).toBe(RECOVERY_DATA.amount);
  
    });
  
})
  
describe("Recovery withdrawing", () => {
  let statecoins
  let transactions
  
  // client side's mock
  let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
  // server side's mock
  let http_mock = jest.genMockFromModule('../mocks/mock_http_client');
  let wallet
  beforeAll(async () => {
    wallet = await Wallet.buildMock(bitcoin.networks.bitcoin, http_mock, wasm_mock);
    wallet.statecoins.coins = [];
    await wallet.genProofKey();
    await wallet.genProofKey();
  })
  describe("groupRecoveredWithdrawalTransactions", () => {
    let withdrawal_tx_map
    let withdrawal_addr_map
    let skids = new Set()
    let statecoins_map = new Map()

    beforeEach(() => {
      statecoins = makeTesterStatecoins();
      transactions = new Array()
      statecoins.forEach((statecoin) => {
        transactions.push(statecoin.tx_backup)
        skids.add(statecoin.shared_key_id)
        statecoins_map.set(statecoin.shared_key_id, statecoin)
      })
      withdrawal_tx_map = new Map()
      withdrawal_addr_map = new Map()
    })
    
    test('single withdrawals', () => {
      statecoins.forEach((statecoin, i) => {
        withdrawal_tx_map.set(transactions[i], [statecoin.shared_key_id])
        withdrawal_addr_map.set(transactions[i].getId(), BTC_ADDR[i])
      })
      groupRecoveredWithdrawalTransactions(withdrawal_tx_map, withdrawal_addr_map, statecoins_map)

      expect(statecoins_map.size).toEqual(2)
      let vals = statecoins_map.values()
      let broadcast_infos = vals.next().value.tx_withdraw_broadcast
      expect(broadcast_infos.length).toEqual(1)
      expect(broadcast_infos[0].rec_addr).toEqual(BTC_ADDR[0])
      broadcast_infos = vals.next().value.tx_withdraw_broadcast
      expect(broadcast_infos.length).toEqual(1)
      expect(broadcast_infos[0].rec_addr).toEqual(BTC_ADDR[1])
     
    })

    test('batch withdrawal - wrong number of tx outputs', () => {
      withdrawal_tx_map.set(transactions[0], [statecoins[0].shared_key_id, statecoins[1].shared_key_id])
      withdrawal_addr_map.set(transactions[0].getId(), BTC_ADDR[2])
      groupRecoveredWithdrawalTransactions(withdrawal_tx_map, withdrawal_addr_map, statecoins_map)
      expect(statecoins_map.size).toEqual(0)
    })

    test('batch withdrawal', () => {
      console.log(recovery_withdrawal_tx_batch)
      let tx = Transaction.fromHex(recovery_withdrawal_tx_batch)
      withdrawal_tx_map.set(tx, [statecoins[0].shared_key_id, statecoins[1].shared_key_id])
      withdrawal_addr_map.set(tx.getId(), BTC_ADDR[2])
      groupRecoveredWithdrawalTransactions(withdrawal_tx_map, withdrawal_addr_map, statecoins_map)
      expect(statecoins_map.size).toEqual(2)
      let vals = statecoins_map.values()
      //for (let i = 0; i < statecoins_map.size; i++) {
      let broadcast_infos = vals.next().value.tx_withdraw_broadcast
      expect(broadcast_infos.length).toEqual(1)
      expect(broadcast_infos[0].rec_addr).toEqual(BTC_ADDR[2])
    })


    test('single/batch withdrawal', () => {
      console.log(recovery_withdrawal_tx_batch)
      let tx = Transaction.fromHex(recovery_withdrawal_tx_batch)
      withdrawal_tx_map.set(tx, [RECOVERY_DATA_WITHDRAWING_BATCH[0].shared_key_id, RECOVERY_DATA_WITHDRAWING_BATCH[1].shared_key_id])
      withdrawal_addr_map.set(tx.getId(), BTC_ADDR[2])
      statecoins.forEach((statecoin, i) => {
        withdrawal_tx_map.set(transactions[i], [statecoin.shared_key_id])
        withdrawal_addr_map.set(transactions[i].getId(), BTC_ADDR[i])
      })

      groupRecoveredWithdrawalTransactions(withdrawal_tx_map, withdrawal_addr_map, statecoins_map)
      expect(statecoins_map.size).toEqual(2)
      let vals = statecoins_map.values()
      //for (let i = 0; i < statecoins_map.size; i++) {
      let broadcast_infos = vals.next().value.tx_withdraw_broadcast
      expect(broadcast_infos.length).toEqual(1)
      expect(broadcast_infos[0].rec_addr).toEqual("tb1q6xwt00hnwcrtlunvnz8u0xrtdxv5ztx7pj44cp")
    })
  })  

})