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

import TestComponent, { render } from "./test-utils";

import { handleEndSwap, setSwapLoad } from "../../features/WalletDataSlice.js";
import { fromSatoshi } from "../util.ts";
import { fireEvent, screen } from "@testing-library/react";
import Semaphore from "semaphore-async-await";

let bitcoin = require("bitcoinjs-lib");

jest.mock("../swap/swap");

beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    Swap.mockClear();
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe("After Swaps Complete", function () {
    // client side's mock
    let wasm_mock = jest.genMockFromModule("../mocks/mock_wasm");
    // server side's mock
    let http_mock = jest.genMockFromModule("../mocks/mock_http_client");

    let wallet;
    let wallet_json;
    beforeAll(async () => {
        wallet = await Wallet.buildMock(
            bitcoin.networks["bitcoin"],
            http_mock,
            wasm_mock
        );
        expect(wallet.isActive()).toEqual(true);
        wallet_json = wallet.toEncryptedJSON();
        expect(wallet_json.active).toEqual(true);
        return wallet_json;
    });

    test("Auto-swap clicked after Join Group button", async function () {
        // shared_key_id of statecoin in mock created wallet
        //add statecoin to wallet
        let statecoin = wallet_json.statecoins.coins[0];
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
            />
        );

        await sleep(30000)

        let isPending = false;
        while (isPending == false) {
            console.log(`click...`)
            fireEvent(
                screen.getByText(/FireFunction/i),
                new MouseEvent("click", {
                    bubbles: true,
                    cancelable: true,
                })
            );
            console.log(`get state...`);
            const state = store.getState();
            console.log(`get pending coins...`)
            const pendingCoins = state.walletData.swapPendingCoins;
            console.log(`get isPending...`)
            isPending = pendingCoins.length > 0 ? true : false;
            console.log(`isPending: ${isPending}`)
            await sleep(3000)
        }
        

        
        console.log(`check pending coins length...`)
        expect(pendingCoins.length).toEqual(1);
        console.log(`expect shared key id...`)
        expect(pendingCoins[0]).toBe(
            statecoin.shared_key_id
        );
        console.log(`finished test.`)
    });
});