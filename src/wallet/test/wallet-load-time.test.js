let bitcoin = require('bitcoinjs-lib')

import { render as rtlRender, waitForElementToBeRemoved, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider, useDispatch } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import reducers from '../../reducers';
import App from '../../containers/App/App';
import { MockElectrumClient } from "../mocks/mock_electrum";

import { fireEvent, screen } from '@testing-library/dom';
import { delay } from '../mercury/info_api';
import { ACTIVITY_LOG, SWAPPED_IDS, SWAPPED_STATECOINS_OBJ } from './test_data';
// import { bitcoin } from 'bitcoinjs-lib/types/networks';
import { WALLET as LARGE_WALLET } from './data/test_wallet_41df35e8-f0e4-47bc-8003-29d8019b4c75';
import { Wallet } from '..';
import { Storage } from '../../store';

const { JSDOM } = require("jsdom")

const { window } = new JSDOM()

// client side's mock
let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
// server side's mock
let http_mock = jest.genMockFromModule('../mocks/mock_http_client');
// electrum mock
let electrum_mock = new MockElectrumClient;
let bip39 = require('bip39');

jest.setTimeout(70000);

let clearWallet = (wallet_name) => {
    const name_store = new Storage(`wallets/wallet_names`);
    name_store.clearWallet(wallet_name);
    const wallet_store = new Storage(`wallets/${wallet_name}/config`);
    wallet_store.clearWallet(wallet_name);
}

let walletName = "test_wallet_41df35e8-f0e4-47bc-8003-29d8019b4c75";
let walletNameBackup = `${walletName}_backup`;
let walletPassword = "aaaaaaaa";

async function getWallet() {
    clearWallet(walletNameBackup);
    let walletJSON = LARGE_WALLET;
    expect(walletJSON.name).toEqual(walletName);
    walletJSON.name = walletNameBackup;
    let walletSave = await Wallet.loadFromBackup(walletJSON, walletPassword, true);
    expect(walletSave.statecoins.coins.length).toEqual(9);
    return walletSave;
}


describe('Wallet load time', function () {

    afterAll(() => {
        //Cleanup
        clearWallet(walletName)
        clearWallet(walletNameBackup)
    })

    test('time to load wallet', async function(){
        const start_time = window.performance.now();
        await getWallet();
        const load_time = window.performance.now() - start_time;
        console.log(`wallet load time: ${load_time}`)
        expect(load_time).toBeLessThanOrEqual(10000);
    })
})