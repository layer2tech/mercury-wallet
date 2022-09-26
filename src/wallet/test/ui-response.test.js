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
import { Wallet } from '../';
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

function render(mockStore, ui){
    function Wrapper({children}) {
        return <Provider store={mockStore}><Router>{children}</Router></Provider>
    }


    return rtlRender(ui, {wrapper: Wrapper})

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
    walletSave.storage.loadStatecoins(walletSave);
    expect(walletSave.statecoins.coins.length).toEqual(9);
    walletSave.config.min_anon_set = 3;
    walletSave.config.jest_testing_mode = true;
    walletSave.http_client = http_mock;
    walletSave.electrum_mock = electrum_mock;
    walletSave.wasm = wasm_mock;
    await walletSave.save();
    await walletSave.saveName();
    expect(walletSave.statecoins.coins.length).toEqual(9);
    console.log('getWallet() finished.')
    return walletSave;
}

async function testClickTime(toButtonName, fromButtonName='Back') {
    // Go to receive page within the time limit
    await waitFor(() => expect(screen.getByText(toButtonName)).toBeTruthy(), { timeout: 10000 });
    expect(() => screen.getByText(fromButtonName)).toThrow();
    //let now = window.performance.now();
    const click_time = window.performance.now();
    fireEvent.click(screen.getByText(toButtonName));
    await waitFor(() => expect(screen.getByText(fromButtonName)).toBeTruthy(), { timeout: 10000 });
    return window.performance.now() - click_time;
}

async function testClickTimeAverage(toButtonName, fromButtonName='Back') {
    let outTotal = 0;
    let backTotal = 0;
    const n_iter = 10;
    const timeLimitOut = 250;
    const timeLimitBack = 250;
    for (let i = 0; i < n_iter; i++) {
        let result = await testClickTime(toButtonName, fromButtonName);
        outTotal += result;
        result = await testClickTime(fromButtonName, toButtonName);
        backTotal += result;
    }
    const outAverage = outTotal / n_iter;
    const backAverage = backTotal / n_iter;
    console.log(`testClickTimeAverage- result: ${toButtonName}: ${outAverage}: ${backAverage}`)
    expect(outAverage).toBeLessThan(timeLimitOut);
    expect(backAverage).toBeLessThan(timeLimitBack);
}

describe('UI performance', function () {

    beforeAll(async () => {
        let wallet = await getWallet();
        return wallet;
    })

    beforeEach(() => {
        let store = configureStore({ reducer: reducers, });
        const { renderedObj } = render(store, <App />, true);
    })


    afterAll(() => {
        //Cleanup
        clearWallet(walletName)
        clearWallet(walletNameBackup)
    })

    test('responsiveness of main buttons', async function(){
        expect(screen.getByText(/Welcome to Mercury/i)).toBeTruthy();
        //Check app opens to home page

        fireEvent(screen.getByText(/Load Existing Wallet/i), new MouseEvent('click', {
            bubbles: true,
            cancelable: true
        }))
        // Click on load existing wallet
        
        fireEvent(screen.getByText(/continue/i), new MouseEvent('click', {
            bubbles: true,
            cancelable: true
        }))
        // Click Continue
        
        expect(screen.getByText(/Select a wallet to load and input its password/i)).toBeTruthy();
        // Check continue click worked

        let options = screen.getAllByRole('option');
        // Options wallet name list
        
        let optionSelected = options.filter( option => option.value == walletNameBackup);
        
        fireEvent.change(options[0], {target: { selected: false }})
        fireEvent.change(optionSelected[0], {target: { selected: true }})
        
        fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: walletPassword } });

        fireEvent.submit(screen.getByTestId("form"));
        fireEvent.click(screen.getByText(/continue/i));

        // await waitForElementToBeRemoved(screen.getByText(/continue/i));

        await waitFor(() => expect(screen.getByText(/Bitcoin/i)).toBeTruthy(), {timeout: 10000});
        await waitFor(() => expect(screen.getByText(/Server/i)).toBeTruthy(), {timeout: 10000});
                
        //Test address generation
        await testClickTime('Receive');
        await waitFor(() => expect(screen.getByText('Back')).toBeTruthy(), { timeout: 10000 });
        await waitFor(() => expect(screen.getByText('GENERATE ADDRESS')).toBeTruthy(), { timeout: 10000 });

        //Get current address and measure time for new address to be generated and displayed
        const address1 = screen.getByTestId("Receive address").textContent;
        console.log(`Receive address 1: ${address1}`)
        const click_time = window.performance.now();
        fireEvent.click(screen.getByText('GENERATE ADDRESS'));
        await waitFor(() => expect(screen.getByTestId("Receive address").textContent).not.
            toEqual(address1), { timeout: 10000 });
        expect(window.performance.now() - click_time).toBeLessThan(250);
        
        //Go back to main page
        await testClickTime('Back');
        await waitFor(() => expect(screen.getByText('Receive')).toBeTruthy(), { timeout: 10000 });

        
        await testClickTimeAverage('Receive');
        await testClickTimeAverage('Send');
        await testClickTimeAverage('Swap');
        await testClickTimeAverage('Deposit');
        await testClickTimeAverage('Withdraw');         
    })    
})