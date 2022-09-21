/**
 * @jest-environment jsdom
 */

// This file contains test for the main swap function with Swap class mocked

import Swap from "../swap/swap";
import { Wallet, MOCK_WALLET_NAME } from "../wallet";
import reducers from "../../reducers";
import { configureStore } from "@reduxjs/toolkit";

import TestComponent, { render } from "./test-utils";

import { handleEndSwap, setSwapLoad } from "../../features/WalletDataSlice.js";
import { fromSatoshi } from "../util.ts";
import { fireEvent, screen } from "@testing-library/react";

let bitcoin = require("bitcoinjs-lib");

// // client side's mock
let wasm_mock = jest.genMockFromModule("../mocks/mock_wasm");
// // server side's mock
let http_mock = jest.genMockFromModule("../mocks/mock_http_client");
// //electrum mock
let electrum_mock = jest.genMockFromModule("../mocks/mock_electrum.ts");

let walletName = `${MOCK_WALLET_NAME}_swap_tests`;

export async function getWallet() {
    let wallet = await Wallet.buildMock(bitcoin.networks.bitcoin, walletName);
    wallet.config.min_anon_set = 3;
    wallet.config.jest_testing_mode = true;
    wallet.http_client = http_mock;
    wallet.electrum_mock = electrum_mock;
    wallet.wasm = wasm_mock;
    return wallet;
}

jest.mock("../swap/swap");

beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    Swap.mockClear();
});

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
        wallet_json = wallet.toEncryptedJSON();
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
        console.log(`check pending coins length...`)
        expect(pendingCoins.length).toEqual(1);
        console.log(`expect shared key id...`)
        expect(pendingCoins[0]).toBe(
            statecoin.shared_key_id
        );
        console.log(`finished test.`)
    });
});