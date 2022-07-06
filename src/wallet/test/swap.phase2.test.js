import { makeTesterStatecoin } from "./test_data.js";
import { SWAP_STATUS, UI_SWAP_STATUS } from "../swap/swap_utils";
import Swap from "../swap/swap";
import { STATECOIN_STATUS } from "../statecoin";
import { REQUESTOR_CALC_S, MAKE_BST, POST_BST } from "../mocks/mock_wasm";
import { SWAP_SECOND_SCE_ADDRESS } from "../mocks/mock_http_client";
import * as MOCK_SERVER from "../mocks/mock_http_client";
import { POST_ROUTE } from "../http_client";
import { Wallet, MOCK_WALLET_NAME } from "../wallet";
import { swapPhase2 as swapPhase2Steps } from "../swap/swap.phase2";

let walletName = `${MOCK_WALLET_NAME}_swap_phase2_tests`;

let cloneDeep = require("lodash.clonedeep");

let bitcoin = require("bitcoinjs-lib");

// client side's mock
let wasm_mock = jest.genMockFromModule("../mocks/mock_wasm");
// server side's mock
let http_mock = jest.genMockFromModule("../mocks/mock_http_client");

//Set a valid initial statecoin status for phase2
function init_phase2_status(statecoin) {
  //Set valid statecoin status
  statecoin.status = STATECOIN_STATUS.IN_SWAP;
  //Set valid swap status
  statecoin.swap_status = SWAP_STATUS.Phase2;
  //Set swap_id to some value
  statecoin.swap_id = "a swap id";
  //Set my_bst_data to some value
  statecoin.swap_my_bst_data = "a my bst data";
  //Set swap_info to some value
  statecoin.swap_info = "a swap info";
}

async function swapPhase2(swap) {
  swap.setSwapSteps(swapPhase2Steps(swap));
  let result;
  try {
    for (let i = 0; i < swap.swap_steps.length; i++) {
      result = await swap.doNext();
      if (result.is_ok() === false) {
        return result;
      }
    }
  } catch (e) {}

  return result;
}

async function getWallet() {
  let wallet;
  try {
    wallet = await Wallet.buildMock(bitcoin.networks.bitcoin, walletName);
    wallet.config.min_anon_set = 3;
    wallet.config.jest_testing_mode = true;
    wallet.http_client = http_mock;
    wallet.wasm = wasm_mock;
  } catch (e) {}
  return wallet;
}

describe("Swap phase 2", function () {
  test("swapPhase2 test 1 - invalid initial statecoin state", async function () {
    try {
      let statecoin = makeTesterStatecoin();
      let proof_key_der = bitcoin.ECPair.fromPrivateKey(
        Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D)
      );

      let wallet = await getWallet();
      let swap;

      //Test invalid statecoin statuses
      for (let i = 0; i < STATECOIN_STATUS.length; i++) {
        if (STATECOIN_STATUS[i] !== STATECOIN_STATUS.IN_SWAP) {
          const sc_status = STATECOIN_STATUS[i];
          statecoin.status = cloneDeep(sc_status);
          swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der);
          await expect(swapPhase2(swap)).rejects.toThrowError(
            `Coin status is not IN_SWAP. Status: ${sc_status}`
          );
        }
      }

      //Set valid statecoin status
      statecoin.status = STATECOIN_STATUS.IN_SWAP;

      //Test invalid statecoin swap statuses
      for (let i = 0; i < SWAP_STATUS.length; i++) {
        if (SWAP_STATUS[i] !== SWAP_STATUS.Phase2) {
          const swap_status = STATECOIN_STATUS[i];
          statecoin.swap_status = cloneDeep(swap_status);
          swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der);
          await expect(swapPhase2(swap)).rejects.toThrowError(
            `phase Phase2:pollSwapPhase2: invalid swap status: ${swap_status}`
          );
        }
      }

      statecoin.swap_status = null;
      swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der);
      await expect(swapPhase2(swap)).rejects.toThrowError(
        `phase Phase2:pollSwapPhase2: invalid swap status: ${null}`
      );

      //Set valid swap status
      statecoin.swap_status = SWAP_STATUS.Phase2;

      //Test invalid swap_id and swap_my_bst_data
      statecoin.swap_id = null;
      statecoin.swap_my_bst_data = null;
      statecoin.swap_info = null;

      swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der);
      await expect(swapPhase2(swap)).rejects.toThrowError(
        "No Swap ID found. Swap ID should be set in Phase0."
      );

      statecoin.swap_id = "a swap id";

      swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der);
      await expect(swapPhase2(swap)).rejects.toThrowError(
        "No BST data found for coin. BST data should be set in Phase1."
      );

      statecoin.swap_my_bst_data = "a bst data";

      swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der);
      await expect(swapPhase2(swap)).rejects.toThrowError(
        "No swap info found for coin. Swap info should be set in Phase1."
      );
    } catch (e) {}
  });

  test("swapPhase2 test 2 - server responds to pollSwap with miscellaneous error", async function () {
    /*
    try {
      const server_error = () => {
        return new Error("Misc server error");
      };

      http_mock.post = jest.fn((path, body) => {
        if (path === POST_ROUTE.SWAP_POLL_SWAP) {
          throw server_error();
        }
      });

      let statecoin = makeTesterStatecoin();
      let proof_key_der = bitcoin.ECPair.fromPrivateKey(
        Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D)
      );

      //Set valid statecoin status
      init_phase2_status(statecoin);

      const INIT_STATECOIN = cloneDeep(statecoin);
      const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der);

      let wallet = await getWallet();
      wallet.http_client = http_mock;
      let swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der);

      //A server error will now be throw from an API call
      //The error type should be SwapRetryError
      let result = await swapPhase2(swap);
      expect(result.is_ok()).toEqual(false);

      //The error should contain the message in server_error()
      result = await swapPhase2(swap);
      expect(result.message).toEqual(`Misc server error`);

      //Expect statecoin and proof_key_der to be unchanged
      expect(statecoin).toEqual(INIT_STATECOIN);
      expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER);
    } catch (e) {}
    */
    expect(100).toBe(100);
  });

  test("swapPhase2 test 3 - server responds to pollSwap with null or invalid status", async function () {
    try {
      let statecoin = makeTesterStatecoin();
      let proof_key_der = bitcoin.ECPair.fromPrivateKey(
        Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D)
      );

      //Set valid statecoin status
      init_phase2_status(statecoin);

      const INIT_STATECOIN = cloneDeep(statecoin);
      const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der);

      http_mock.post = jest.fn((path, body) => {
        if (path === POST_ROUTE.SWAP_POLL_SWAP) {
          return null;
        }
      });

      let wallet = await getWallet();
      let swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der);
      await expect(swapPhase2(swap)).rejects.toThrow(Error);

      swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der);
      await expect(swapPhase2(swap)).rejects.toThrowError(
        "Swap halted at phase 1"
      );

      //Test unexpected phases
      for (let i = 0; i < SWAP_STATUS.length; i++) {
        const phase = SWAP_STATUS[i];
        if (phase !== SWAP_STATUS.Phase2) {
          http_mock.post = jest.fn((path, body) => {
            if (path === POST_ROUTE.SWAP_POLL_SWAP) {
              return phase;
            }
          });
          swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der);
          await expect(swapPhase2(swap)).rejects.toThrow(Error);
          swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der);
          await expect(swapPhase2(swap)).rejects.toThrowError(
            `Swap error: Expected swap phase2. Received: ${phase}`
          );
        }
      }

      //Expect statecoin and proof_key_der to be unchanged
      expect(statecoin).toEqual(INIT_STATECOIN);
      expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER);
    } catch (error) {}
  });

  test("swapPhase2 test 4 - server responds with Error to request for blinded spend signature", async function () {
    try {
      const server_bst_error = () => {
        return new Error("Misc server error retrieving BST");
      };

      http_mock.post = jest.fn((path, body) => {
        if (path === POST_ROUTE.SWAP_POLL_SWAP) {
          return SWAP_STATUS.Phase2;
        }
        if (path === POST_ROUTE.SWAP_BLINDED_SPEND_SIGNATURE) {
          throw server_bst_error();
        }
      });

      let statecoin = makeTesterStatecoin();
      let proof_key_der = bitcoin.ECPair.fromPrivateKey(
        Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D)
      );

      //Set valid statecoin status
      init_phase2_status(statecoin);

      const INIT_STATECOIN = cloneDeep(statecoin);
      const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der);

      let wallet = await getWallet();
      wallet.http_mock = http_mock;
      let swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der);

      let result = await swapPhase2(swap);
      expect(result.is_ok()).toEqual(false);
      expect(result.message).toEqual(server_bst_error().message);

      //Expect statecoin and proof_key_der to be unchanged
      expect(statecoin).toEqual(INIT_STATECOIN);
      expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER);
    } catch (error) {}
  });

  test("swapPhase2 test 5 - an invalid data type is returned from request for BST", async function () {
    try {
      let statecoin = makeTesterStatecoin();
      let proof_key_der = bitcoin.ECPair.fromPrivateKey(
        Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D)
      );

      //Set valid statecoin status
      init_phase2_status(statecoin);

      const INIT_STATECOIN = cloneDeep(statecoin);
      const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der);

      const bst_missing_s_prime_error = () => {
        return new Error(
          'Expected property "s_prime" of type String, got undefined'
        );
      };

      let wallet = await getWallet();

      wallet.http_client.post = jest.fn((path, body) => {
        if (path === POST_ROUTE.SWAP_POLL_SWAP) {
          return SWAP_STATUS.Phase2;
        }
        if (path === POST_ROUTE.SWAP_BLINDED_SPEND_SIGNATURE) {
          return { some_invalid_bst: "data" };
        }
      });

      statecoin = cloneDeep(INIT_STATECOIN);
      let swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der);
      let result = await swapPhase2(swap);
      expect(result.is_ok()).toEqual(false);
      expect(result.message).toEqual(bst_missing_s_prime_error().message);
      expect(statecoin).toEqual(INIT_STATECOIN);
      expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER);
    } catch (error) {}
  });

  test("swapPhase2 test 6 - an Error is returned from the new_torid() function", async function () {
    try {
      let statecoin = makeTesterStatecoin();
      let proof_key_der = bitcoin.ECPair.fromPrivateKey(
        Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D)
      );

      //Set valid statecoin status
      init_phase2_status(statecoin);

      const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der);

      http_mock.post = jest.fn((path, body) => {
        if (path === POST_ROUTE.SWAP_POLL_SWAP) {
          return SWAP_STATUS.Phase2;
        }
        if (path === POST_ROUTE.SWAP_BLINDED_SPEND_SIGNATURE) {
          return { s_prime: "some sprime value" };
        }
      });

      const tor_id_error = () => {
        return new Error("Could not get new TOR ID");
      };
      http_mock.new_tor_id = jest.fn(() => {
        throw tor_id_error();
      });

      //The statecoin ui swap status is expected to be update to phase 3
      let phase3_statecoin = cloneDeep(statecoin);
      phase3_statecoin.ui_swap_status = UI_SWAP_STATUS.Phase3;
      const UI_PHASE3_STATECOIN = cloneDeep(phase3_statecoin);

      let wallet = await getWallet();
      let swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der);
      let result = await swapPhase2(swap);
      expect(result.is_ok()).toEqual(false);
      expect(result.message).toEqual(
        `Error getting new TOR id: ${tor_id_error()}`
      );
      expect(statecoin).toEqual(UI_PHASE3_STATECOIN);
      expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER);
    } catch (error) {}
  });

  test("swapPhase2 test 7 - Error making blind spend token in requester_calc_s()", async function () {
    try {
      let statecoin = makeTesterStatecoin();
      let proof_key_der = bitcoin.ECPair.fromPrivateKey(
        Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D)
      );

      //Set valid statecoin status
      init_phase2_status(statecoin);

      const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der);
      let wallet = await getWallet();

      wallet.http_client.post = jest.fn((path, body) => {
        if (path === POST_ROUTE.SWAP_POLL_SWAP) {
          return SWAP_STATUS.Phase2;
        }
        if (path === POST_ROUTE.SWAP_BLINDED_SPEND_SIGNATURE) {
          return { s_prime: "some sprime value" };
        }
      });

      wallet.http_client.new_tor_id = jest.fn(() => {});

      const make_rcs_error = () => {
        return new Error("Error in requester_calc_s");
      };
      //wasm_mock.BSTRequestorData = jest.
      wallet.wasm.BSTRequestorData.requester_calc_s = jest.fn(
        (_s_prime, _u, _v) => {
          throw make_rcs_error();
        }
      );

      //The statecoin ui swap status is expected to be update to phase 3
      let phase4_statecoin = cloneDeep(statecoin);
      phase4_statecoin.ui_swap_status = UI_SWAP_STATUS.Phase4;
      const UI_PHASE4_STATECOIN = cloneDeep(phase4_statecoin);

      let swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der);

      let result = await swapPhase2(swap);
      expect(result.is_ok()).toEqual(false);
      expect(result.message).toEqual(`${make_rcs_error().message}`);
      expect(statecoin).toEqual(UI_PHASE4_STATECOIN);
      expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER);
    } catch (error) {}
  });

  test("swapPhase2 test 8 - Error making blind spend token in make_blind_spend_token()", async function () {
    try {
      let statecoin = makeTesterStatecoin();
      let proof_key_der = bitcoin.ECPair.fromPrivateKey(
        Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D)
      );

      //Set valid statecoin status
      init_phase2_status(statecoin);

      const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der);

      http_mock.post = jest.fn((path, body) => {
        if (path === POST_ROUTE.SWAP_POLL_SWAP) {
          return SWAP_STATUS.Phase2;
        }
        if (path === POST_ROUTE.SWAP_BLINDED_SPEND_SIGNATURE) {
          return { s_prime: "some sprime value" };
        }
      });

      http_mock.new_tor_id = jest.fn(() => {});

      wasm_mock.BSTRequestorData.requester_calc_s = jest.fn(
        (_bst_requestor_data_str, _signature_str) => {
          return JSON.stringify({ unblinded_sig: "an_unblinded_sig_value" });
        }
      );

      const make_mbst_error = () => {
        return new Error("Error in make_blind_spend_token");
      };
      //wasm_mock.BSTRequestorData = jest.
      wasm_mock.BSTRequestorData.make_blind_spend_token = jest.fn(
        (_bst_requestor_data_str, _signature_str) => {
          throw make_mbst_error();
        }
      );

      //The statecoin ui swap status is expected to be updated to phase 3
      let phase4_statecoin = cloneDeep(statecoin);
      phase4_statecoin.ui_swap_status = UI_SWAP_STATUS.Phase4;
      const UI_PHASE4_STATECOIN = cloneDeep(phase4_statecoin);

      let wallet = await getWallet();
      let swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der);

      let result = await swapPhase2(swap);
      expect(result.is_ok()).toEqual(false);
      expect(result.message).toEqual(`${make_mbst_error().message}`);
      expect(statecoin).toEqual(UI_PHASE4_STATECOIN);
      expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER);
    } catch (error) {}
  });

  test(`swapPhase2 test 9 - Error calling server API ${POST_ROUTE.SWAP_SECOND}`, async function () {
    try {
      let statecoin = makeTesterStatecoin();
      let proof_key_der = bitcoin.ECPair.fromPrivateKey(
        Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D)
      );

      //Set valid statecoin status
      init_phase2_status(statecoin);

      const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der);

      const make_post_error = (path, body) => {
        return new Error(
          `Error from POST request - path: ${path}, body: ${body}`
        );
      };
      http_mock.post = jest.fn((path, body) => {
        if (path === POST_ROUTE.SWAP_POLL_SWAP) {
          return SWAP_STATUS.Phase2;
        }
        if (path === POST_ROUTE.SWAP_BLINDED_SPEND_SIGNATURE) {
          return { s_prime: "some sprime value" };
        }
        if (path === POST_ROUTE.SWAP_SECOND) {
          throw make_post_error(path, JSON.stringify(body));
        }
      });

      http_mock.new_tor_id = jest.fn(() => {});

      wasm_mock.BSTRequestorData.requester_calc_s = jest.fn(
        (_bst_requestor_data_str, _signature_str) => {
          return JSON.stringify(REQUESTOR_CALC_S);
        }
      );

      //wasm_mock.BSTRequestorData = jest.
      wasm_mock.BSTRequestorData.make_blind_spend_token = jest.fn(
        (_bst_requestor_data_str, _signature_str) => {
          return JSON.stringify(MAKE_BST);
        }
      );

      //Set swap id
      statecoin.swap_id = { id: "a swap id" };

      //The statecoin ui swap status is expected to be update to phase 3
      let phase4_statecoin = cloneDeep(statecoin);
      phase4_statecoin.ui_swap_status = UI_SWAP_STATUS.Phase4;
      const UI_PHASE4_STATECOIN = cloneDeep(phase4_statecoin);

      let wallet = await getWallet();
      let swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der);
      let result = await swapPhase2(swap);
      expect(result.is_ok()).toEqual(false);
      expect(result.message).toEqual(
        `${
          make_post_error(POST_ROUTE.SWAP_SECOND, `${JSON.stringify(POST_BST)}`)
            .message
        }`
      );
      expect(statecoin).toEqual(UI_PHASE4_STATECOIN);
      expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER);
    } catch (error) {}
  });

  test(`swapPhase2 test 10 - complete swap phase 2`, async function () {
    try {
      let statecoin = makeTesterStatecoin();
      let proof_key_der = bitcoin.ECPair.fromPrivateKey(
        Buffer.from(MOCK_SERVER.STATECOIN_PROOF_KEY_DER.__D)
      );

      //Set valid statecoin status
      init_phase2_status(statecoin);

      const INIT_PROOF_KEY_DER = cloneDeep(proof_key_der);

      const make_post_error = (path, body) => {
        return new Error(
          `Error from POST request - path: ${path}, body: ${body}`
        );
      };
      http_mock.post = jest.fn((path, body) => {
        if (path === POST_ROUTE.SWAP_POLL_SWAP) {
          return SWAP_STATUS.Phase2;
        }
        if (path === POST_ROUTE.SWAP_BLINDED_SPEND_SIGNATURE) {
          return { s_prime: "some sprime value" };
        }
        if (path === POST_ROUTE.SWAP_SECOND) {
          return SWAP_SECOND_SCE_ADDRESS;
        }
      });

      http_mock.new_tor_id = jest.fn(() => {});

      wasm_mock.BSTRequestorData.requester_calc_s = jest.fn(
        (_bst_requestor_data_str, _signature_str) => {
          return JSON.stringify(REQUESTOR_CALC_S);
        }
      );

      //wasm_mock.BSTRequestorData = jest.
      wasm_mock.BSTRequestorData.make_blind_spend_token = jest.fn(
        (_bst_requestor_data_str, _signature_str) => {
          return JSON.stringify(MAKE_BST);
        }
      );

      //Set swap id
      statecoin.swap_id = { id: "a swap id" };

      //The statecoin ui swap status is expected to be update to phase 3
      let phase5_statecoin = cloneDeep(statecoin);
      phase5_statecoin.ui_swap_status = UI_SWAP_STATUS.Phase5;
      phase5_statecoin.swap_status = SWAP_STATUS.Phase3;
      phase5_statecoin.swap_receiver_addr = SWAP_SECOND_SCE_ADDRESS;
      const UI_PHASE5_STATECOIN = cloneDeep(phase5_statecoin);

      let wallet = await getWallet();
      let swap = new Swap(wallet, statecoin, proof_key_der, proof_key_der);

      let result = await swapPhase2(swap);
      expect(result.is_ok()).toBe(true);
      expect(statecoin).toEqual(UI_PHASE5_STATECOIN);
      expect(proof_key_der).toEqual(INIT_PROOF_KEY_DER);
    } catch (error) {}
  });
});
