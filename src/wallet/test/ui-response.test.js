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

jest.setTimeout(20000);

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
    let store = new Storage(`wallets/wallet_names`);
    store.clearWallet(walletNameBackup);
    let walletJSON = LARGE_WALLET;
    expect(walletJSON.name).toEqual(walletName);
    walletJSON.name = walletNameBackup;
    let walletSave = await Wallet.loadFromBackup(walletJSON, walletPassword, true);
    walletSave.config.min_anon_set = 3;
    walletSave.config.jest_testing_mode = true;
    walletSave.http_client = http_mock;
    walletSave.electrum_mock = electrum_mock;
    walletSave.wasm = wasm_mock;
    expect(walletSave.statecoins.coins.length).toEqual(8);
    await walletSave.save();
    await walletSave.saveName();
}

async function testClickTime(buttonName, outTime, backTime) {
    // Go to receive page within the time limit
    await waitFor(() => expect(screen.getByText(buttonName)).toBeTruthy(), { timeout: 10000 });
    expect(() => screen.getByText('Back')).toThrow();
    //let now = window.performance.now();
    const click_time = window.performance.now();
    fireEvent.click(screen.getByText(buttonName));
    await waitFor(() => expect(screen.getByText('Back')).toBeTruthy(), { timeout: 10000 });
    expect(window.performance.now() - click_time).toBeLessThanOrEqual(outTime);

    // Go back to the home page within the time limit
    expect(screen.getByText('Back')).toBeTruthy();
    const click_back_time = window.performance.now();
    fireEvent.click(screen.getByText('Back'));
    await waitFor(() => expect(screen.getByText(buttonName)).toBeTruthy(), { timeout: 10000 });
    expect(window.performance.now() - click_back_time).toBeLessThanOrEqual(backTime);
    expect(() => screen.getByText('Back')).toThrow();
}

describe('UI performance', function () {

    beforeAll(async () => {
        await getWallet();
    })

    beforeEach(() => {
        let store = configureStore({reducer: reducers, });
        const { renderedObj } = render(store, <App />, true);
    })

    afterAll(() => {
        //Cleanup
        let store = new Storage(`wallets/wallet_names`);
        store.clearWallet(walletName)
        store.clearWallet(walletNameBackup)
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
                
        const timeLimit1 = 300;
        const timeLimit2 = 300;

        for (let i = 0; i < 10; i++){
            await testClickTime('Receive', timeLimit1, timeLimit2);
            await testClickTime('Send',timeLimit1, timeLimit2);       
            await testClickTime('Swap', timeLimit1, timeLimit2);       
            await testClickTime('Deposit', timeLimit1, timeLimit2);       
            await testClickTime('Withdraw', timeLimit1, timeLimit2);           
        }
        
    })
    
})