import { makeTesterStatecoin, setSwapDetails } from "./test_data.js";
import { SWAP_STATUS } from "../swap/swap_utils";
import Swap from "../swap/swap";
import { STATECOIN_STATUS } from "../statecoin";
import { Wallet, MOCK_WALLET_NAME } from "../wallet";
import { swapPhase0 as swapPhase0Steps } from "../swap/swap.phase0";
import { POST_ROUTE } from "../http_client";

let bitcoin = require("bitcoinjs-lib");

let cloneDeep = require("lodash.clonedeep");

let walletName = `${MOCK_WALLET_NAME}_swap_phase0_tests`;

// client side's mock
let wasm_mock = jest.genMockFromModule("../mocks/mock_wasm");
// server side's mock
let http_mock = jest.genMockFromModule("../mocks/mock_http_client");

async function getWallet() {
  let wallet = await Wallet.buildMock(bitcoin.networks.bitcoin, walletName);
  wallet.config.min_anon_set = 3;
  wallet.config.jest_testing_mode = true;
  wallet.http_client = http_mock;
  wallet.wasm = wasm_mock;
  return wallet;
}

async function swapPhase0(swap) {
  swap.setSwapSteps(swapPhase0Steps(swap));
  let result;
  for (let i = 0; i < swap.swap_steps.length; i++) {
    result = await swap.doNext();
    if (result.is_ok() === false) {
      return result;
    }
  }
  return result;
}

describe("swapPhase0 test 1 - incorrect initial statecoin phase", () => {
  // input data ////////////////////////////////////
  const statecoin = makeTesterStatecoin();
  statecoin.status = STATECOIN_STATUS.AWAITING_SWAP;
  statecoin.swap_status = SWAP_STATUS.Phase1;
  //////////////////////////////////////////////////

  it("should throw coin is in wrong swap protocol", async () => {
    let wallet = await getWallet();
    let swap = new Swap(wallet, statecoin, null, null);

    const output = "phase Phase0:pollUtxo: invalid swap status: Phase1";
    await expect(swapPhase0(swap)).rejects.toThrowError(output);
  });
});

describe("swapPhase0 test 2 - correct initial statecoin phase", () => {
  // input data ////////////////////////////////////
  const statecoin = makeTesterStatecoin();
  statecoin.status = STATECOIN_STATUS.AWAITING_SWAP;
  statecoin.swap_status = SWAP_STATUS.Phase0;
  let swap_id = "12345";
  // swapPhase0 calls post to: swap/poll/utxo
  // which takes an id as parameter (the swap_id)
  // mockReturnValueOnce({...}) means: the first time give null to post
  // the second time give swap id to post
  http_mock.post = jest
    .fn()
    .mockReset()
    .mockReturnValueOnce({ id: null }) // return once null => swap has not started
    .mockReturnValueOnce({ id: swap_id }); // return once an id => swap has begun
  //////////////////////////////////////////////////

  let wallet;
  let swap;

  beforeAll(async () => {
    try {
      wallet = await getWallet();
      swap = new Swap(wallet, statecoin, null, null);
    } catch (e) {
      console.error(e);
    }
  });

  it("should have swap_status Phase0, swap_id null", async () => {
    try {
      // swap not yet begun
      await swapPhase0(swap);
      expect(statecoin.swap_status).toBe(SWAP_STATUS.Phase0);
      expect(statecoin.swap_id).toBe(null);
    } catch (e) {
      console.error(e);
    }
  });

  it("should have swap_status Phase1, swap_id not null", async () => {
    // swap begun
    try {
      await swapPhase0(swap);
      expect(statecoin.swap_status).toBe(SWAP_STATUS.Phase1);
      expect(statecoin.swap_id.id).toBe(swap_id);
    } catch (e) {}
  });
});

describe("swapPhase0 test 3 - coin is not awaiting swap", () => {
  // input data ////////////////////////////////////
  const statecoin = makeTesterStatecoin();
  statecoin.status = null;
  //////////////////////////////////////////////////
  let wallet;
  let swap;
  beforeAll(async () => {
    try {
      wallet = await getWallet();
      swap = new Swap(wallet, statecoin, null, null);
    } catch (e) {
      console.error(e);
    }
  });
  it("should throw phase Phase0:pollUtxo: invalid statecoin status: null", async () => {
    const input = () => {
      return swapPhase0(swap);
    };

    try {
      const output = "phase Phase0:pollUtxo: invalid statecoin status: null";
      await expect(input()).rejects.toThrowError(output);
    } catch (e) {
      console.error(e);
    }
  });
});

describe("swapPhase0 test 4 - poll with no swap_id", () => {
  // input data ////////////////////////////////////
  const statecoin = makeTesterStatecoin();
  statecoin.status = STATECOIN_STATUS.AWAITING_SWAP;
  statecoin.swap_status = SWAP_STATUS.Phase0;
  //////////////////////////////////////////////////

  let wallet;
  let swap;
  beforeAll(async () => {
    try {
      wallet = await getWallet();
      swap = new Swap(wallet, statecoin, null, null);
    } catch (e) {
      console.error(e);
    }
  });
  it("should return Retry status", async () => {
    const input = () => {
      return swapPhase0(swap);
    };
    try {
      let result = await input();
      await expect(result.is_ok()).toEqual(false);
    } catch (e) {
      console.error(e);
    }
  });
});

describe("swapPhase0 test 5 - incorrect statechain_id", () => {
  // input data ////////////////////////////////////
  const statecoin = makeTesterStatecoin();
  statecoin.status = STATECOIN_STATUS.AWAITING_SWAP;
  statecoin.swap_status = SWAP_STATUS.Phase0;
  statecoin.statechain_id = null;
  //////////////////////////////////////////////////

  let wallet;
  let swap;
  beforeAll(async () => {
    try {
      wallet = await getWallet();
      swap = new Swap(wallet, statecoin, null, null);
    } catch (e) {
      console.error(e);
    }
  });

  it("should throw error incorrect statechain_id", async () => {
    const input = () => {
      return swapPhase0(swap);
    };
    try {
      const output = "statechain id is invalid";
      await expect(input()).rejects.toThrow(output);
    } catch (e) {
      console.error(e);
    }
  });
});

describe("swapPhase0 test 6 - coin removed from swap pool", () => {
  // input data ////////////////////////////////////
  let statecoin = cloneDeep(makeTesterStatecoin());
  setSwapDetails(statecoin, 0);
  const initStatecoin = cloneDeep(statecoin);
  let final_statecoin = cloneDeep(statecoin);
  setSwapDetails(final_statecoin, 1);
  //////////////////////////////////////////////////

  let wallet;

  const post_err = Error(
    "statechain timed out or has not been requested for swap"
  );
  const swap_err = Error("coin removed from swap pool");

  beforeAll(async () => {
    try {
      wallet = await getWallet();
      wallet.http_client = jest.genMockFromModule("../mocks/mock_http_client");
      wallet.http_client.post = jest.fn((path, body) => {
        if (path === POST_ROUTE.SWAP_POLL_UTXO) {
          throw post_err;
        }
      });
    } catch (e) {
      console.error(e);
    }
  });

  it("swap Phase 0 should throw error", async () => {
    let swap = new Swap(wallet, statecoin, null, null);
    const input = () => {
      return swapPhase0(swap);
    };
    try {
      await expect(input()).rejects.toThrow(swap_err);
    } catch (e) {}
  });
});

describe("swapPhase0 test 7 - waiting for swap to begin...", () => {
  // input data ////////////////////////////////////
  let statecoin = cloneDeep(makeTesterStatecoin());
  setSwapDetails(statecoin, 0);
  const initStatecoin = cloneDeep(statecoin);
  let final_statecoin = cloneDeep(statecoin);
  setSwapDetails(final_statecoin, 1);
  //////////////////////////////////////////////////

  let wallet;
  beforeAll(async () => {
    try {
      wallet = await getWallet();
      wallet.http_client = jest.genMockFromModule("../mocks/mock_http_client");
      wallet.http_client.post = jest.fn((path, body) => {
        if (path === POST_ROUTE.SWAP_POLL_UTXO) {
          return { id: null };
        }
      });
    } catch (e) {
      console.error(e);
    }
  });

  it("swap Phase 0 should remain in phase 0 and not increment the n_retries counter past 1", async () => {
    let swap = new Swap(wallet, statecoin, null, null);
    expect(swap.n_retries).toEqual(0);
    const input = () => {
      return swapPhase0(swap);
    };
    try {
      for (let i = 0; i < 3; i++) {
        let result = await input();
        expect(result.is_ok()).toEqual(false);
        expect(result.includes("Waiting for swap to begin..."));
        expect(swap.n_retries).toEqual(1);
      }
    } catch (e) {}
  });
});

describe("swapPhase0 test 8 - proceed to phase 1", () => {
  // input data ////////////////////////////////////
  let statecoin = cloneDeep(makeTesterStatecoin());
  setSwapDetails(statecoin, 0);
  const initStatecoin = cloneDeep(statecoin);
  let final_statecoin = cloneDeep(statecoin);
  setSwapDetails(final_statecoin, 1);
  //////////////////////////////////////////////////

  let wallet;
  beforeAll(async () => {
    try {
      wallet = await getWallet();
      wallet.http_client = jest.genMockFromModule("../mocks/mock_http_client");
      wallet.http_client.post = jest.fn((path, body) => {
        if (path === POST_ROUTE.SWAP_POLL_UTXO) {
          return final_statecoin.swap_id;
        }
      });
    } catch (e) {
      console.error(e);
    }
  });

  it("swap Phase 0 should proceed to phase 1", async () => {
    let swap = new Swap(wallet, statecoin, null, null);
    const input = () => {
      console.log("call Input code()");
      return swapPhase0(swap);
    };

    try {
      console.log("call result code");
      let result = await input();
      expect(result.is_ok()).toEqual(true);
      expect(statecoin).toEqual(final_statecoin);
    } catch (e) {}
  });
});
