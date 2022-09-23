/**
 * @jest-environment jsdom
 */

// This file contains test for the main swap function with Swap class mocked

import { makeTesterStatecoin } from "./test_data.js";
import { SWAP_STATUS, UI_SWAP_STATUS } from "../swap/swap_utils";
import Swap from "../swap/swap";
import { STATECOIN_STATUS } from "../statecoin";
import { Wallet, MOCK_WALLET_NAME } from "../wallet";
import React from "react";
import { setSwapDetails } from "./test_data.js";
import reducers from "../../reducers";
import { configureStore } from "@reduxjs/toolkit";

import TestComponent, { render, semaphore } from "./test-utils";

import { handleEndSwap, setSwapLoad } from "../../features/WalletDataSlice.js";
import { fromSatoshi } from "../util.ts";
import { fireEvent, screen } from "@testing-library/react";
import Semaphore from "semaphore-async-await";
import { WALLET as LARGE_WALLET } from './data/test_wallet_41df35e8-f0e4-47bc-8003-29d8019b4c75';

let bitcoin = require("bitcoinjs-lib");

jest.mock("../swap/swap");

beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    Swap.mockClear();
});

jest.setTimeout(5000)

describe("After Swaps Complete", function () {
    // client side's mock
    //let wasm_mock = jest.genMockFromModule("../mocks/mock_wasm");
    // server side's mock
    //let http_mock = jest.genMockFromModule("../mocks/mock_http_client");

    //let wallet;
    let wallet_json = LARGE_WALLET;
    /*
    beforeAll(async () => {
        wallet = await Wallet.buildMock(
            bitcoin.networks["bitcoin"],
            http_mock,
            wasm_mock
        );
        expect(wallet.isActive()).toEqual(true);
        wallet_json = wallet.toEncryptedJSON();
        return wallet_json;
    });
    */
    

    test("Auto-swap clicked after Join Group button", async function () {
        // shared_key_id of statecoin in mock created wallet
        //add statecoin to wallet
        let statecoin = wallet_json.statecoins.coins[0];
        expect(statecoin != null).toBe(true);
        console.log(`${JSON.stringify(statecoin)}`)
        let store = configureStore({ reducer: reducers });

        // test redux state before and after handleEndSwap
        // check: if swap_auto = true then the coin should be added to swapPendingGroup
        console.log(`get swap load...`)
        let swapLoad = store.getState().swapLoad;

        statecoin.swap_auto = true;
        // Turn auto swap on for coin

        console.log(`render...`)
        const { renderedObj } = render(
            store,
            <TestComponent
                wallet_json={wallet_json}
                dispatchUsed={true}
                fn={handleEndSwap}
                args={[
                    statecoin.shared_key_id,
                    { payload: statecoin },
                    setSwapLoad,
                    swapLoad,
                    fromSatoshi,
                ]}
                password={"aaaaaaaa"}
            />
        );

        let pendingCoinsLength = 0;
        console.log(`click...`)
        //while (pendingCoinsLength === 0) {
            fireEvent(
                screen.getByText(/FireFunction/i),
                new MouseEvent("click", {
                    bubbles: true,
                    cancelable: true,
                })
            );

        await semaphore.acquire();
        semaphore.release();
        
            console.log(`get state...`);
            const state = store.getState();
            console.log(`get pending coins...`)
        
        
            pendingCoinsLength = state.walletData.swapPendingCoins.length;
        //} 
        const pendingCoins = state.walletData.swapPendingCoins;
        console.log(`check pending coins length...`)
        expect(pendingCoinsLength).toEqual(1);
        console.log(`expect shared key id...`)
        expect(pendingCoins[0]).toBe(
            statecoin.shared_key_id
        );
        console.log(`finished test.`)
    });
});