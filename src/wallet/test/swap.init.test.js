import {
  makeTesterStatecoin,
  STATECOIN_SWAP_DATA,
  SWAP_SHARED_KEY_OUT,
} from "./test_data.js";
import { SWAP_STATUS } from "../swap/swap_utils";
import Swap from "../swap/swap";
import { STATECOIN_STATUS } from "../statecoin";
import { REQUESTOR_CALC_S, MAKE_BST, POST_BST } from "../mocks/mock_wasm";
import { SWAP_SECOND_SCE_ADDRESS } from "../mocks/mock_http_client";
import * as MOCK_SERVER from "../mocks/mock_http_client";
import { GET_ROUTE, POST_ROUTE } from "../http_client";
import { Wallet, MOCK_WALLET_NAME, MOCK_WALLET_PASSWORD } from "../wallet";
import { ACTION } from "..";
import { Transaction } from "bitcoinjs-lib";
import { swapInit as swapInitSteps } from "../swap/swap.init";

let walletName = `${MOCK_WALLET_NAME}_swap_init_tests`;

let mock_http_client = require("../mocks/mock_http_client");

let mock_wasm = require("../mocks/mock_wasm");

let cloneDeep = require("lodash.clonedeep");

let bitcoin = require("bitcoinjs-lib");

let test_data = require("./test_data.js");

// client side's mock
let wasm_mock = jest.genMockFromModule("../mocks/mock_wasm");
// server side's mock
let http_mock = jest.genMockFromModule("../mocks/mock_http_client");

const post_error = (path, body) => {
  return new Error(`Error from POST request - path: ${path}, body: ${body}`);
};

const get_error = (path, params) => {
  return new Error(`Error from GET request - path: ${path}, params: ${params}`);
};

const wasm_err = (message) => {
  return new Error(`Error from wasm_mock: ${message}`);
};

const SHARED_KEY_DUMMY = {
  public: { q: "", p2: "", p1: "", paillier_pub: {}, c_key: "" },
  private: "",
  chain_code: "",
};

const WALLET_VERSION = require("../../../package.json").version.substring(1);

//Set a valid initial statecoin status for phase4
function get_statecoin_in() {
  let statecoin = makeTesterStatecoin();
  test_data.setSwapDetails(statecoin, "Reset");
  statecoin.status = STATECOIN_STATUS.AWAITING_SWAP;
  return statecoin;
}

function get_statecoin_out_expected() {
  let statecoin = makeTesterStatecoin();
  test_data.setSwapDetails(statecoin, 0);
  return statecoin;
}

function get_proof_key_der() {
  return bitcoin.ECPair.fromPrivateKey(
    Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D)
  );
}

const SWAP_SIZE =
  test_data.SIGNSWAPTOKEN_DATA[0].swap_token.statechain_ids.length;

async function swapInit(swap) {
  swap.setSwapSteps(swapInitSteps(swap));
  let result;
  for (let i = 0; i < swap.swap_steps.length; i++) {
    result = await swap.doNext();
    if (result.is_ok() === false) {
      return result;
    }
  }
  return result;
}

async function getWallet() {
  let wallet = await Wallet.buildMock(bitcoin.networks.bitcoin, walletName);
  wallet.config.min_anon_set = 3;
  wallet.http_client = http_mock;
  wallet.wasm = wasm_mock;
  return wallet;
}

describe("Swap init", function () {
  test("swapInit test 1 - invalid proof_key_der", async function () {
    let statecoin = get_statecoin_in();
    const INIT_STATECOIN = cloneDeep(statecoin);
    let wallet = await getWallet();
    let swap = new Swap(wallet, statecoin, undefined, null);

    await expect(swapInit(swap)).rejects.toThrowError(
      `checkProofKeyDer: proof_key_der type error: Error: Expected Buffer, got undefined`
    );

    let invalid_proof_key_der = { publicKey: Buffer.from("a buffer string") };

    swap = new Swap(wallet, statecoin, invalid_proof_key_der, null);

    await expect(swapInit(swap)).rejects.toThrowError(
      `checkProofKeyDer: proof_key_der type error: Error: Expected Function, got undefined`
    );

    expect(statecoin).toEqual(INIT_STATECOIN);
  });

  test("swapInit test 2 - invalid initial statecoin state", async function () {
    let statecoin = get_statecoin_in();
    //console.log(`swap status: ${JSON.stringify(statecoin.swap_status)}`)
    const INIT_STATECOIN = cloneDeep(statecoin);
    let wallet = await getWallet();
    let swap = new Swap(wallet, statecoin, undefined, null);

    const statecoin_status = Object.values(STATECOIN_STATUS).concat([null]);
    //Test invalid statecoin statuses
    for (let i = 0; i < statecoin_status.length; i++) {
      if (statecoin_status[i] !== STATECOIN_STATUS.AWAITING_SWAP) {
        const sc_status = statecoin_status[i];
        //console.log(`${sc_status}`)
        statecoin.status = cloneDeep(sc_status);
        let init_statecoin = cloneDeep(INIT_STATECOIN);
        init_statecoin.status = cloneDeep(sc_status);
        swap = new Swap(wallet, statecoin, undefined, null);
        await expect(swapInit(swap)).rejects.toThrowError(
          `phase Init:checkProofKeyDer: invalid statecoin status: ${statecoin.status}`
        );
        expect(statecoin).toEqual(init_statecoin);
        swap = new Swap(wallet, statecoin, undefined, null);
        await expect(swapInit(swap)).rejects.toThrow(Error);
        expect(statecoin).toEqual(init_statecoin);
      }
    }

    //Set valid statecoin status
    statecoin.status = INIT_STATECOIN.status;

    const swap_status = Object.values(SWAP_STATUS).concat([null]);
    //Test invalid statecoin swap statuses
    for (let i = 0; i < swap_status.length; i++) {
      if (swap_status[i] !== null && swap_status[i] !== SWAP_STATUS.Init) {
        const ss = SWAP_STATUS[i];
        statecoin.swap_status = cloneDeep(ss);
        let init_statecoin = cloneDeep(INIT_STATECOIN);
        init_statecoin.swap_status = cloneDeep(ss);

        swap = new Swap(wallet, statecoin, undefined, null);
        await expect(swapInit(swap)).rejects.toThrowError(
          `phase Init:checkProofKeyDer: invalid swap status: ${statecoin.swap_status}`
        );
        expect(statecoin).toEqual(init_statecoin);

        swap = new Swap(wallet, statecoin, undefined, null);
        await expect(swapInit(swap)).rejects.toThrow(Error);
        expect(statecoin).toEqual(init_statecoin);
      }
    }
  });

  test("swapInit test 3 - error registering utxo", async function () {
    let statecoin = get_statecoin_in();
    const INIT_STATECOIN = cloneDeep(statecoin);
    const proof_key_der = get_proof_key_der();

    POST_ROUTE.SWAP_REGISTER_UTXO;

    http_mock.post = jest.fn((path, body) => {
      if (path === POST_ROUTE.SWAP_REGISTER_UTXO) {
        throw post_error(path, JSON.stringify(body));
      }
    });

    let wallet = await getWallet();
    let swap = new Swap(wallet, statecoin, proof_key_der, null);

    let result = await swapInit(swap);
    expect(result.message).toEqual(
      'Error from POST request - path: swap/register-utxo, body: {"statechain_id":"","signature":{"purpose":"SWAP","data":"03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477","sig":"304402200594cf179e90dfb81b3f997c0cb0ff6c8181ed76a119884779dece35c22fa6ac022042c32b8228dd40f57f049197af59f1585b048bd4c12611bd34e5f3cd7ed3a5e1"},"swap_size":3,"wallet_version":"' +
        WALLET_VERSION +
        '"}'
    );
    expect(statecoin).toEqual(INIT_STATECOIN);

    swap = new Swap(wallet, statecoin, proof_key_der, null);
    result = await swapInit(swap);
    expect(result.is_ok()).toEqual(false);
    expect(statecoin).toEqual(INIT_STATECOIN);
  });

  test("swapInit test 4 - complete swapInit", async function () {
    let statecoin = get_statecoin_in();
    const proof_key_der = get_proof_key_der();
    let wallet = await getWallet();
    let swap = new Swap(wallet, statecoin, proof_key_der, null);

    POST_ROUTE.SWAP_REGISTER_UTXO;

    http_mock.post = jest.fn((path, body) => {
      if (path === POST_ROUTE.SWAP_REGISTER_UTXO) {
      }
    });

    let statecoin_out = get_statecoin_out_expected();

    await swapInit(swap);
    //Timestamps will differ
    statecoin_out.timestamp = statecoin.timestamp;
    expect(statecoin).toEqual(statecoin_out);
  });
});
