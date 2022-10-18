/**
 * @jest-environment jsdom
 */
import { makeTesterStatecoin } from "./test_data.js";
import { SWAP_STATUS } from "../swap/swap_utils";
import Swap from "../swap/swap";
import { STATECOIN_STATUS } from "../statecoin";
import * as MOCK_SERVER from "../mocks/mock_http_client";
import { Wallet, MOCK_WALLET_NAME } from "../wallet";
import { swapPhase1 as swapPhase1Steps } from "../swap/swap.phase1";
import { StateChainSig } from "../util";
let cloneDeep = require("lodash.clonedeep");
let walletName = `${MOCK_WALLET_NAME}_swap_phase1_tests`;

let bitcoin = require("bitcoinjs-lib");
// client side's mock
let wasm_mock = jest.genMockFromModule("../mocks/mock_wasm");
// server side's mock
let http_mock = jest.genMockFromModule("../mocks/mock_http_client");

// Ignore and do not import wrappedStore
jest.mock("../../application/wrappedStore", () => jest.fn());

const swapPhase1 = async (swap) => {
  swap.setSwapSteps(swapPhase1Steps(swap));
  let result;
  for (let i = 0; i < swap.swap_steps.length; i++) {
    result = await swap.doNext();
    if (result.is_ok() === false) {
      return result;
    }
  }
  return result;
};

const getWallet = async () => {
  let wallet = await Wallet.buildMock(bitcoin.networks.bitcoin, walletName);
  wallet.config.min_anon_set = 3;
  wallet.config.jest_testing_mode = true;
  wallet.http_client = http_mock;
  wallet.wasm = wasm_mock;
  return wallet;
};

describe("swapPhase1 test 1 - incorrect status", () => {
  // input /////////////////////////////////////////////////
  let statecoin = makeTesterStatecoin();
  let proof_key_der = bitcoin.ECPair.fromPrivateKey(
    Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D)
  );
  statecoin.status = null;

  //////////////////////////////////////////////////////////

  it("throws error on null status", async () => {
    let wallet = await getWallet();
    let swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der);

    const input = async () => {
      return await swapPhase1(swap);
    };
    const output = `phase Phase1:pollUtxo: invalid statecoin status: ${statecoin.status}`;

    expect(input()).rejects.toThrowError(output);
  });
});

describe("swapPhase1 test 2 - incorrect swap_status", () => {
  // input /////////////////////////////////////////////////
  let statecoin = makeTesterStatecoin();
  statecoin.status = STATECOIN_STATUS.IN_SWAP;
  //////////////////////////////////////////////////////////

  it("throws error on null swap_status", async () => {
    let wallet = await getWallet();
    let swap = new Swap(wallet, statecoin, null, null);

    const input = async () => {
      return await swapPhase1(swap);
    };
    const output = `phase Phase1:pollUtxo: invalid swap status: ${statecoin.swap_status}`;

    expect(input()).rejects.toThrowError(output);
  });
});

describe("swapPhase1 test 3 - incorrect swap id", () => {
  // input //////////////////////////////////////////////////////////
  let statecoin = makeTesterStatecoin();
  statecoin.status = STATECOIN_STATUS.IN_SWAP;
  // Set swap_status as if coin had already run Phase0
  statecoin.swap_status = SWAP_STATUS.Phase1;
  ///////////////////////////////////////////////////////////////////

  it("throws error on no swap id", async () => {
    let wallet = await getWallet();
    let swap = new Swap(wallet, statecoin, null, null);
    const input = async () => {
      return await swapPhase1(swap);
    };
    const output = "No Swap ID found. Swap ID should be set in Phase0.";
    expect(input()).rejects.toThrowError(output);
  });
});
