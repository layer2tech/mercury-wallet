/**
 * @jest-environment jsdom
 */
let bitcoin = require("bitcoinjs-lib");
import {
  Wallet,
  StateCoin,
  StateCoinList,
  ACTION,
  Config,
  STATECOIN_STATUS,
  BACKUP_STATUS,
  decryptAES,
} from "..";
import {
  segwitAddr,
  MOCK_WALLET_PASSWORD,
  MOCK_WALLET_MNEMONIC,
  mnemonic_to_bip32_root_account,
  getBIP32forBtcAddress,
  parseBackupData,
  required_fields,
  getXpub,
  MOCK_WALLET_XPUB,
} from "../wallet";
import { Transaction, TransactionBuilder } from "bitcoinjs-lib";
import {
  txWithdrawBuild,
  txBackupBuild,
  pubKeyTobtcAddr,
  encryptAES,
} from "../util";
import { Storage } from "../../store";
import { SWAP_STATUS, UI_SWAP_STATUS } from "../swap/swap_utils";
import { ActivityLog } from "../activity_log";
import { WALLET, WALLET as WALLET_V_0_7_10_JSON } from "./data/test_wallet_3cb3c0b4-7679-49dd-8b23-bbc15dd09b67";
import { WALLET as WALLET_V_0_7_10_JSON_2 } from "./data/test_wallet_25485aff-d332-427d-a082-8d0a8c0509a7";
import { WALLET as WALLET_NOCOINS_JSON } from "./data/test_wallet_nocoins";
import { getFeeInfo } from "../mercury/info_api";
import { callSetStatecoinSpent } from "../../features/WalletDataSlice";
import { isExportDeclaration } from "typescript";
import { WrappedStore } from "../../application/wrappedStore"
import { FormText } from "react-bootstrap";

let log = require("electron-log");
let cloneDeep = require("lodash.clonedeep");
let bip32 = require("bip32");
let bip39 = require("bip39");

const fs = require("fs");
const path = require("path");
const process = require("process");

const NETWORK_CONFIG = require("../../network.json");
const SHARED_KEY_DUMMY = {
  public: { q: "", p2: "", p1: "", paillier_pub: {}, c_key: "" },
  private: "",
  chain_code: "",
};

describe("Wallet", function () {

  let store = new WrappedStore(`WALLET_STORE_1`);

  describe("set", () => {
    test("save wallet", async function () {
      store.set(WALLET_V_0_7_10_JSON.name, WALLET_V_0_7_10_JSON)
      let walletInfo = store.get(WALLET_V_0_7_10_JSON.name);
      expect(walletInfo).toEqual(WALLET_V_0_7_10_JSON);
    });

    test("save login", async function () {
      store.set("logins." + WALLET_V_0_7_10_JSON.name, MOCK_WALLET_PASSWORD);
      let storeLoginPwd = store.get("logins." + WALLET_V_0_7_10_JSON.name);
      expect(storeLoginPwd).toEqual(MOCK_WALLET_PASSWORD);
    });

    test("save account", async function () {
      store.set(WALLET_V_0_7_10_JSON.name + ".account", WALLET_V_0_7_10_JSON.account)
      let accountInfo = store.get(WALLET_V_0_7_10_JSON.name + ".account");
      expect(accountInfo).toEqual(WALLET_V_0_7_10_JSON.account);
    });

    test("save activity", async function () {
      store.set(WALLET_V_0_7_10_JSON.name + ".activity", WALLET_V_0_7_10_JSON.activity)
      let activityInfo = store.get(WALLET_V_0_7_10_JSON.name + ".activity");
      expect(activityInfo).toEqual(WALLET_V_0_7_10_JSON.activity);
    });

    test("save statecoins", async function () {
      let statecoinsInfo;
      store.set(WALLET_V_0_7_10_JSON.name + ".statecoins", WALLET_V_0_7_10_JSON.statecoins);
      statecoinsInfo = store.get(WALLET_V_0_7_10_JSON.name + ".statecoins");
      expect(statecoinsInfo).toEqual(WALLET_V_0_7_10_JSON.statecoins);
    });

    test("save statecoin object", async function() {
      let statecoinObjInfo;      
      store.set(WALLET_V_0_7_10_JSON.name + ".statecoins_obj", WALLET_V_0_7_10_JSON_2.statecoins.coins[8]);
      statecoinObjInfo = store.get(WALLET_V_0_7_10_JSON.name + ".statecoins_obj");
      expect(statecoinObjInfo).toEqual(WALLET_V_0_7_10_JSON_2.statecoins.coins[8]);
    });
  });
});
