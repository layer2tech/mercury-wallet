import { getTxFee } from "../util";
import {
  makeTesterStatecoins,
  recovery_withdrawal_tx,
  BTC_ADDR,
} from "./test_data";
import { StateCoinList } from "../";
import { Transaction } from "bitcoinjs-lib";
import { STATECOIN_STATUS } from "../statecoin";
import { ACTION } from "../activity_log";

// Ignore and do not import wrappedStore
jest.mock("../../application/wrappedStore", () => jest.fn());

describe("Statecoin", function () {
  let statecoins = new StateCoinList();
  let statecoin;
  let tx_fee;
  let tx = Transaction.fromHex(recovery_withdrawal_tx[0]);

  beforeEach(() => {
    statecoins.coins = makeTesterStatecoins();
    statecoin = statecoins.coins[0];
  });

  test("tx inputs length", () => {
    expect(tx.ins.length).toEqual(1);
  });

  test("getWithdrawalMaxTxFee", function () {
    tx_fee = getTxFee(1, 1);
    statecoins.setCoinWithdrawBroadcastTx(
      statecoin.shared_key_id,
      tx,
      tx_fee,
      { shared_key_ids: [statecoin.shared_key_id] },
      BTC_ADDR
    );
    statecoins.setCoinWithdrawBroadcastTx(
      statecoin.shared_key_id,
      tx,
      tx_fee + 1,
      { shared_key_ids: [statecoin.shared_key_id] },
      BTC_ADDR
    );
    statecoins.setCoinWithdrawBroadcastTx(
      statecoin.shared_key_id,
      tx,
      tx_fee + 2,
      { shared_key_ids: [statecoin.shared_key_id] },
      BTC_ADDR
    );
    statecoins.setCoinWithdrawBroadcastTx(
      statecoin.shared_key_id,
      tx,
      tx_fee + 3,
      { shared_key_ids: [statecoin.shared_key_id] },
      BTC_ADDR
    );
    expect(statecoin.getWithdrawalMaxTxFee()).toEqual(tx_fee + 3);
  });

  test("getWithdrawalMaxTxFee - no broadcast tx", function () {
    expect(statecoin.getWithdrawalMaxTxFee()).toEqual(-1);
  });

  test("setCoinSpent - swap", () => {
    expect(statecoins.coins[0].status).not.toEqual(STATECOIN_STATUS.SWAPPED);
    statecoins.setCoinSpent(statecoins.coins[0].shared_key_id, ACTION.SWAP);
    expect(statecoins.coins[0].status).toEqual(STATECOIN_STATUS.SWAPPED);
  });
});
