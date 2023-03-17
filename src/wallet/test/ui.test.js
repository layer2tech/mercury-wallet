let bitcoin = require("bitcoinjs-lib");

import {
  render as rtlRender,
  waitForElementToBeRemoved,
  waitFor,
} from "@testing-library/react";
import { BrowserRouter as Router } from "react-router-dom";
import { Provider, useDispatch } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import reducers from "../../reducers";
import App from "../../containers/App/App";
import { MockElectrumClient } from "../mocks/mock_electrum";

import { fireEvent, screen } from "@testing-library/dom";
import { MOCK_WALLET_NAME, MOCK_WALLET_PASSWORD, Wallet } from "../wallet";
import { delay } from "../mercury/info_api";
import { ACTIVITY_LOG, SWAPPED_IDS, SWAPPED_STATECOINS_OBJ } from "./test_data";
// import { bitcoin } from 'bitcoinjs-lib/types/networks';

// client side's mock
let wasm_mock = jest.genMockFromModule("../mocks/mock_wasm");
// server side's mock
let http_mock = jest.genMockFromModule("../mocks/mock_http_client");
// electrum mock
let electrum_mock = new MockElectrumClient();
// Ignore and do not import webStore
jest.mock("../../application/webStore", () => jest.fn());

let bip39 = require("bip39");

function render(mockStore, ui) {
  function Wrapper({ children }) {
    return (
      <Provider store={mockStore}>
        <Router>{children}</Router>
      </Provider>
    );
  }

  return rtlRender(ui, { wrapper: Wrapper });
}

let walletName = `${MOCK_WALLET_NAME}_ui_tests`;
const mnemonic = bip39.generateMnemonic();

async function getWallet() {
  let wallet = await Wallet.buildMock(
    bitcoin.networks.bitcoin,
    http_mock,
    wasm_mock,
    mnemonic,
    walletName
  );
  wallet.config.min_anon_set = 3;
  wallet.config.jest_testing_mode = true;
  wallet.http_client = http_mock;
  wallet.electrum_mock = electrum_mock;
  wallet.wasm = wasm_mock;
  return wallet;
}

jest.setTimeout(60000);

describe("Wallet Load - Large Swapped IDs Storage", function () {
  beforeEach(async () => {
    let wallet = await getWallet();

    wallet.activity = ACTIVITY_LOG;

    let swapArr = [];

    swapArr =
      SWAPPED_IDS[
        "f248181cdd052d8cb8d6dc1fd4f9af8a000fb834442b9c97b45f593f9f62c9da:1"
      ];
    for (let i = 0; i < 5; i++) {
      swapArr = swapArr.concat(swapArr);
      // Make large swap array for single coin
    }
    let swapIds = SWAPPED_IDS;
    swapIds[
      "f248181cdd052d8cb8d6dc1fd4f9af8a000fb834442b9c97b45f593f9f62c9da:1"
    ] = swapArr;
    // assign large array to coin

    wallet.swapped_ids = swapIds;
    wallet.swapped_statecoins_obj = SWAPPED_STATECOINS_OBJ;

    await wallet.saveActivityLog();
    await wallet.save();
    await wallet.saveName();
  });

  beforeEach(() => {
    let store = configureStore({ reducer: reducers });

    const { renderedObj } = render(store, <App />, true);
  });

  test("App opens", async function () {
    expect(screen.getByText(/Welcome to Mercury/i)).toBeTruthy();
    //Check app opens to home page

    fireEvent(
      screen.getByText(/Load Existing Wallet/i),
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      })
    );
    // Click on load existing wallet

    fireEvent(
      screen.getByText(/continue/i),
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      })
    );
    // Click Continue

    expect(
      screen.getByText(/Select a wallet to load and input its password/i)
    ).toBeTruthy();
    // Check continue click worked
  });
  test("Open Wallet - large file", async function () {
    expect(
      screen.getByText(/Select a wallet to load and input its password/i)
    ).toBeTruthy();
    // App at position last test finished

    let options = screen.getAllByRole("option");
    // Options wallet name list

    let optionSelected = options.filter((option) => option.value == walletName);

    fireEvent.change(options[0], { target: { selected: false } });
    fireEvent.change(optionSelected[0], { target: { selected: true } });

    fireEvent.change(screen.getByPlaceholderText(/Password/i), {
      target: { value: MOCK_WALLET_PASSWORD },
    });

    fireEvent.submit(screen.getByTestId("form"));
    fireEvent.click(screen.getByText(/continue/i));

    await waitForElementToBeRemoved(screen.getByText(/continue/i));

    await waitFor(() => expect(screen.getByText(/Bitcoin/i)).toBeTruthy(), {
      timeout: 10000,
    });
    await waitFor(() => expect(screen.getByText(/Server/i)).toBeTruthy(), {
      timeout: 10000,
    });
  });
});
