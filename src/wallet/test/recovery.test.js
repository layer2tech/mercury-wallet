let bitcoin = require('bitcoinjs-lib')
import React from 'react';
import {
  Wallet, STATECOIN_STATUS
} from '../';

import { addRestoredCoinDataToWallet } from '../recovery';
import { RECOVERY_DATA, RECOVERY_DATA_C_KEY_CONVERTED } from './test_data';
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