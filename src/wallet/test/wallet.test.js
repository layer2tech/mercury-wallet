/**
 * @jest-environment ./jest-environment-uint8array-27.js
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
} from "../";
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
  MAX_ACTIVITY_LOG_LENGTH,
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
import { ActivityLog, ActivityLogItem } from "../activity_log";
import { WALLET as WALLET_V_0_7_10_JSON } from "./data/test_wallet_3cb3c0b4-7679-49dd-8b23-bbc15dd09b67";
import { WALLET as WALLET_V_0_7_10_JSON_2 } from "./data/test_wallet_25485aff-d332-427d-a082-8d0a8c0509a7";
import { WALLET as WALLET_NOCOINS_JSON } from "./data/test_wallet_nocoins";
import { getFeeInfo } from "../mercury/info_api";
import { callSetStatecoinSpent } from "../../features/WalletDataSlice";
import { isExportDeclaration } from "typescript";
import { assert } from "console";

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

const name_store = new Storage(`wallets/wallet_names`);

let clearWallet = (wallet_name) => {
  name_store.clearWallet(wallet_name);
  const wallet_store = new Storage(`wallets/${wallet_name}/config`);
  wallet_store.clearWallet(wallet_name);
};

jest.mock("../../application/wrappedStore", () => jest.fn());

describe("Wallet", function () {
  let wallet;
  const WALLET_NAME_1 = "mock_e4c93acf-2f49-414f-b124-65c882eea7e8";
  const WALLET_NAME_1_BACKUP = WALLET_NAME_1 + "_backup";
  beforeEach(async () => {
    wallet = await Wallet.buildMock(
      bitcoin.networks.bitcoin,
      undefined,
      undefined,
      undefined,
      WALLET_NAME_1
    );
    clearWallet(WALLET_NAME_1);
    clearWallet(WALLET_NAME_1_BACKUP);
    wallet = await Wallet.buildMock(
      bitcoin.networks.bitcoin,
      undefined,
      undefined,
      undefined,
      WALLET_NAME_1
    );
    await wallet.save();
    return wallet;
  });

  test("wallet default network settings", async function () {
    //Check the default network settings
    expect(wallet.config.state_entity_endpoint).toEqual(
      NETWORK_CONFIG.mainnet_state_entity_endpoint
    );
    expect(wallet.config.swap_conductor_endpoint).toEqual(
      NETWORK_CONFIG.mainnet_swap_conductor_endpoint
    );
    expect(wallet.config.block_explorer_endpoint).toEqual(
      NETWORK_CONFIG.mainnet_block_explorer_endpoint
    );
    expect(wallet.config.electrum_config).toEqual(
      NETWORK_CONFIG.mainnet_electrum_config
    );

    //Check the default network settings for a testnet wallet
    let wallet_tn = await Wallet.buildMock(
      bitcoin.networks.testnet,
      undefined,
      undefined,
      undefined,
      WALLET_NAME_1 + "_2"
    );
    expect(wallet_tn.config.state_entity_endpoint).toEqual(
      NETWORK_CONFIG.testnet_state_entity_endpoint
    );
    expect(wallet_tn.config.swap_conductor_endpoint).toEqual(
      NETWORK_CONFIG.testnet_swap_conductor_endpoint
    );
    expect(wallet_tn.config.block_explorer_endpoint).toEqual(
      NETWORK_CONFIG.testnet_block_explorer_endpoint
    );
    expect(wallet_tn.config.electrum_config).toEqual(
      NETWORK_CONFIG.testnet_electrum_config
    );
  });

  test("genBtcAddress", async function () {
    let addr1 = await wallet.genBtcAddress();
    let addr2 = await wallet.genBtcAddress();
    expect(addr1).not.toEqual(addr2);
    expect(wallet.account.containsAddress(addr1));
    expect(wallet.account.containsAddress(addr2));
  });

  test("genProofKey", async function () {
    let proof_key_bip32 = await wallet.genProofKey();
    let bip32 = wallet.getBIP32forProofKeyPubKey(
      proof_key_bip32.publicKey.toString("hex")
    );
    // Ensure BIP32 is correclty returned
    expect(proof_key_bip32.privateKey).toEqual(bip32.privateKey);
    let addr_unknown = "bc1qglel9v4uqxdzw05s3l0mdn9vdh6rdlv7pfnlfu";
    //Check that an error is thrown for an unknown address
    expect(() => {
      wallet.getBIP32forBtcAddress(addr_unknown);
    }).toThrowError(
      `getBIP32forBtcAddress - did not find address ${addr_unknown} in wallet.account`
    );
  });

  test("getActivityLogItems", function () {
    wallet.initActivityLogItems(0);
    let activity_log = wallet.getActivityLogItems();
    expect(activity_log.length).toBe(0);
    wallet.initActivityLogItems(2);
    activity_log = wallet.getActivityLogItems();
    expect(activity_log.length).toBe(2);
    wallet.initActivityLogItems(10);
    activity_log = wallet.getActivityLogItems();
    expect(activity_log.length).toEqual(3);
    for (let i = 0; i < activity_log.length; i++) {
      expect(activity_log[i]).toEqual(
        expect.objectContaining({
          date: expect.any(Number),
          action: expect.any(String),
          value: expect.any(Number),
          funding_txid: expect.any(String),
        })
      );
    }
  });

  test("addActivityLogItem", function () {
    wallet.initActivityLogItems();
    let activity_log = wallet.getActivityLogItems();
    const initial_length = 3;
    expect(activity_log.length).toEqual(initial_length);
    const sk_id = wallet.statecoins.coins[0].shared_key_id;
    //Activity log item is not added for unknown shared key id
    wallet.addActivityLogItem(new ActivityLogItem("unknown_sk_id", "D"));
    expect(wallet.getActivityLogItems().length).toEqual(initial_length);
    //Activity log grows for known shared key id
    for (let i = 0; i < MAX_ACTIVITY_LOG_LENGTH - initial_length; i++) {
      expect(wallet.getActivityLogItems().length).toEqual(i + initial_length);
      wallet.addActivityLogItem(new ActivityLogItem(sk_id, "D"));
    }
    //Length does not exceed the maximum
    expect(wallet.getActivityLogItems().length).toEqual(
      MAX_ACTIVITY_LOG_LENGTH
    );
    wallet.addActivityLogItem(new ActivityLogItem(sk_id, "D"));
    expect(wallet.getActivityLogItems().length).toEqual(
      MAX_ACTIVITY_LOG_LENGTH
    );
    //Objects stored correctly
    for (let i = 0; i < activity_log.length; i++) {
      expect(activity_log[i]).toEqual(
        expect.objectContaining({
          date: expect.any(Number),
          action: expect.any(String),
          value: expect.any(Number),
          funding_txid: expect.any(String),
        })
      );
    }
  });

  test("addStatecoin", function () {
    let [coins_before_add, _total_before] = wallet.getUnspentStatecoins();
    wallet.initActivityLogItems(100);
    let activity_log_before_add_length = wallet.getActivityLogItems().length;
    wallet.addStatecoinFromValues(
      "861d2223-7d84-44f1-ba3e-4cd7dd418560",
      {
        public: { q: "", p2: "", p1: "", paillier_pub: {}, c_key: "" },
        private: "",
        chain_code: "",
      },
      0.1,
      "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41",
      0,
      "03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477",
      ACTION.DEPOSIT
    );
    let [coins_after_add, _total_after] = wallet.getUnspentStatecoins();
    let activity_log_after_add_length = wallet.getActivityLogItems().length;
    expect(coins_before_add.length).toEqual(coins_after_add.length - 1);
    expect(activity_log_before_add_length).toEqual(
      activity_log_after_add_length - 1
    );
  });

  test("resetSwapStates", async function () {
    // add a statecoin with swap status to 'IN_SWAP'
    let statecoin = new StateCoin(
      "001d2223-7d84-44f1-ba3e-4cd7dd418560",
      "003ad45a-00b9-449c-a804-aab5530efc90"
    );
    statecoin.proof_key =
      "aaaaaaaad651cd921fc490a6691f0dd1dcbf725510f1fbd80d7bf7abdfef7fea0e";
    statecoin.block = 10;
    statecoin.tx_backup = new Transaction();

    let list = [statecoin];
    wallet.block_height = 20;
    wallet.addStatecoin(statecoin);
    wallet.checkUnconfirmedCoinsStatus(list);

    // pre conditions
    wallet.statecoins.coins[0].status = STATECOIN_STATUS.IN_SWAP;
    wallet.statecoins.coins[0].ui_swap_status = UI_SWAP_STATUS.Phase5;
    wallet.statecoins.coins[0].swap_id = 20;
    wallet.statecoins.coins[0].swap_status = SWAP_STATUS.Phase3;

    expect(wallet.statecoins.coins[0].status).toBe(STATECOIN_STATUS.IN_SWAP);
    // run resetSwapStates code
    let saveStatecoinSpy = jest.spyOn(wallet, "saveStateCoin");
    let coins_length = wallet.statecoins.coins.filter((statecoin) => {
      return (
        statecoin.status === "IN_SWAP" &&
        statecoin.swap_status !== SWAP_STATUS.Phase4
      );
    }).length;
    expect(coins_length).toBeGreaterThan(0);
    expect(coins_length).not.toEqual(wallet.statecoins.length);
    wallet.resetSwapStates();
    expect(saveStatecoinSpy).toHaveBeenCalledTimes(coins_length);
    expect(wallet.statecoins.coins[0].status).toBe(STATECOIN_STATUS.AVAILABLE);
  });

  test("Set confirmed", async function () {
    let statecoin = new StateCoin(
      "001d2223-7d84-44f1-ba3e-4cd7dd418560",
      "003ad45a-00b9-449c-a804-aab5530efc90"
    );
    statecoin.proof_key =
      "aaaaaaaad651cd921fc490a6691f0dd1dcbf725510f1fbd80d7bf7abdfef7fea0e";
    statecoin.block = 10;
    statecoin.tx_backup = new Transaction();
    let list = [statecoin];
    wallet.block_height = 20;
    wallet.addStatecoin(statecoin);
    let saveStatecoinSpy = jest.spyOn(wallet, "saveStateCoin");
    expect(saveStatecoinSpy).not.toHaveBeenCalled();
    wallet.checkUnconfirmedCoinsStatus(list);
    expect(saveStatecoinSpy).not.toHaveBeenCalledTimes(1);

    expect(wallet.statecoins.coins[1].status).toBe(STATECOIN_STATUS.AVAILABLE);
  });

  test("initBlockTime", async () => {
    wallet.electrum_client = jest.genMockFromModule(
      "../mocks/mock_electrum.ts"
    );
    wallet.electrum_client.latestBlockHeader = jest.fn(async () => {
      return Promise.resolve([
        {
          block_height: 1000,
          height: 1000,
        },
      ]);
    });

    await expect(wallet.initBlockTime()).rejects.toThrowError(
      "Block height not updated"
    );

    const init_block_height = 800000;

    wallet.electrum_client.latestBlockHeader = jest.fn(async () => {
      return Promise.resolve([
        {
          block_height: init_block_height,
          height: init_block_height,
        },
      ]);
    });

    await wallet.initBlockTime();

    expect(wallet.block_height).toEqual(init_block_height);

    const new_block_height = init_block_height + 1;

    wallet.electrum_client.latestBlockHeader = jest.fn(async () => {
      return Promise.resolve([
        {
          block_height: new_block_height,
          height: new_block_height,
        },
      ]);
    });

    await wallet.initBlockTime();
    // Initial block height update already done. wallet.block_height should still be init_block_height.
    expect(wallet.block_height).toEqual(init_block_height);
  });

  test("initCoinLockTime", async () => {
    const init_block_height = 800000;
    wallet.electrum_client = jest.genMockFromModule(
      "../mocks/mock_electrum.ts"
    );
    wallet.electrum_client.latestBlockHeader = jest.fn(async () => {
      return Promise.resolve([
        {
          block_height: init_block_height,
          height: init_block_height,
        },
      ]);
    });

    let statecoin = wallet.statecoins.coins[0];
    expect(statecoin.init_locktime).toEqual(null);
    let saveSpy = jest.spyOn(wallet, "saveStateCoin");
    await wallet.initCoinLocktime(statecoin);
    expect(saveSpy).toHaveBeenCalledTimes(1);
    let fee_info = await getFeeInfo(wallet.http_client);
    expect(fee_info.initlock > 0).toEqual(true);
    expect(statecoin.init_locktime).toEqual(
      init_block_height + fee_info.initlock
    );

    // Expect the init_locktime not to be changed if already != null
    wallet.electrum_client.latestBlockHeader = jest.fn(async () => {
      return Promise.resolve([
        {
          block_height: init_block_height + 1,
          height: init_block_height + 1,
        },
      ]);
    });
    await wallet.initCoinLocktime(statecoin);
    expect(statecoin.init_locktime).toEqual(
      init_block_height + fee_info.initlock
    );
  });

  describe("segwitAddr", function () {
    let publicKeyStr =
      "027d73eafd92135741e28ce14e240ec2c5fdeb3ae8c123eafad774af277372bb5f";
    let addr_expected = "bc1qglel9v4uqxdzw05s3l0mdn9vdh6rdlv7pfnlfu";
    let publicKey = Buffer.from(publicKeyStr, "hex");
    let network = bitcoin.networks.bitcoin;
    let node1 = { publicKey: publicKey, network: network };
    let node2 = { network: network };
    let node3 = { publicKey: publicKey };

    test("node and network 1", function () {
      expect(`${segwitAddr(node3, network)}`).toEqual(addr_expected);
    });

    test("node and network 2", function () {
      expect(`${segwitAddr(node1, network)}`).toEqual(addr_expected);
    });

    test("node only. node includes network", function () {
      expect(`${segwitAddr(node1)}`).toEqual(addr_expected);
    });

    test("node only. pubkey undefined", function () {
      expect(() => {
        segwitAddr(node2);
      }).toThrow(Error(`wallet::segwitAddr: node.publicKey is ${undefined}`));
    });

    test("node only. network undefined", function () {
      expect(`${segwitAddr(node3)}`).toEqual(addr_expected);
    });
  });

  describe("bitcoin.address.fromOutputScript", function () {
    const http_mock = jest.genMockFromModule("../mocks/mock_http_client");
    const tx_backup = bitcoin.Transaction.fromHex(
      http_mock.TRANSFER_MSG3.tx_backup_psm.tx_hex
    );
    const addr_expected = "bc1q6xwt00hnwcrtlunvnz8u0xrtdxv5ztx7t5wxrj";

    let network = bitcoin.networks.bitcoin;
    test("Address from output script in bitcoin network", function () {
      let result = bitcoin.address.fromOutputScript(
        tx_backup.outs[0].script,
        network
      );
      expect(`${result}`).toEqual(addr_expected);
    });

    test("Address from output script for undefined network defaults to bitcoin network", function () {
      let result = bitcoin.address.fromOutputScript(
        tx_backup.outs[0].script,
        undefined
      );
      expect(`${result}`).toEqual(addr_expected);
    });

    test("Address from output script for undefined network does not default to testnet network", function () {
      let result = bitcoin.address.fromOutputScript(
        tx_backup.outs[0].script,
        undefined
      );
      let result_testnet = bitcoin.address.fromOutputScript(
        tx_backup.outs[0].script,
        bitcoin.networks.testnet
      );
      expect(`${result}`).not.toEqual(`${result_testnet}`);
    });
  });

  describe("bitcoin.ECPair.fromWIF", function () {
    const key_wif_mainnet =
      "5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ";
    const key_wif_testnet =
      "cTeNuT47BPk9P27coXveNQr4XyC4WMePhjAaazj4DbM14oyknYfB";
    let ecpair_mainnet = bitcoin.ECPair.fromWIF(
      key_wif_mainnet,
      bitcoin.networks.bitcoin
    );
    let ecpair_undefined = bitcoin.ECPair.fromWIF(key_wif_mainnet, undefined);
    let ecpair_testnet = bitcoin.ECPair.fromWIF(
      key_wif_testnet,
      bitcoin.networks.testnet
    );

    test("ECPair from WIF for undefined network", function () {
      expect(ecpair_mainnet).toEqual(ecpair_undefined);
    });

    test("ECPair from WIF for testnet network", function () {
      expect(ecpair_testnet).not.toEqual(ecpair_undefined);
    });
  });

  describe("TransactionBuilder", function () {
    test("TransactionBuilder for undefined network", function () {
      expect(new TransactionBuilder(bitcoin.networks.bitcoin)).toEqual(
        new TransactionBuilder(undefined)
      );
    });

    test("TransactionBuilder for testnet network", function () {
      expect(new TransactionBuilder(bitcoin.networks.testnet)).not.toEqual(
        new TransactionBuilder(undefined)
      );
    });
  });

  describe("addr_p2pkh", function () {
    let publicKeyStr =
      "027d73eafd92135741e28ce14e240ec2c5fdeb3ae8c123eafad774af277372bb5f";
    let publicKey = Buffer.from(publicKeyStr, "hex");
    let addr_expected = "17ZTDRm8sfy4zcemX8F8nB5TJCvVD6JcJT";

    test("addr_p2pkh for bitcoin network", function () {
      console.log(`p2pkh_addr_expected = ${addr_expected}`);
      expect(
        bitcoin.payments.p2pkh({
          pubkey: publicKey,
          network: bitcoin.networks.network,
        }).address
      ).toEqual(addr_expected);
    });

    test("addr_p2pkh for undefined network", function () {
      expect(bitcoin.networks.bitcoin).not.toEqual(undefined);
      console.log(`p2pkh_addr_expected = ${addr_expected}`);
      expect(
        bitcoin.payments.p2pkh({
          pubkey: publicKey,
          network: undefined,
        }).address
      ).toEqual(addr_expected);
    });
  });

  describe("bip32 from mnemonic", function () {
    const seed = bip39.mnemonicToSeedSync(MOCK_WALLET_MNEMONIC);
    const root = bip32.fromSeed(seed, bitcoin.networks.bitcoin);
    const root_undef = bip32.fromSeed(seed, undefined);
    const root_testnet = bip32.fromSeed(seed, bitcoin.networks.testnet);

    test("bip32 root for undefined network", function () {
      expect(root_undef).toEqual(root);
    });

    test("bip32 root for testnet network", function () {
      expect(root_testnet).not.toEqual(root);
    });
  });

  describe("xpub from mnemonic", function () {
    test("correct xpub returned", function () {
      expect(getXpub(MOCK_WALLET_MNEMONIC, bitcoin.networks.bitcoin)).toBe(
        MOCK_WALLET_XPUB
      );
    });
  });

  describe("pubKeyToBtcAddr", function () {
    let publicKeyStr =
      "027d73eafd92135741e28ce14e240ec2c5fdeb3ae8c123eafad774af277372bb5f";
    let addr_expected = "bc1qglel9v4uqxdzw05s3l0mdn9vdh6rdlv7pfnlfu";

    test("Address from pubKeyToBtcAddr for bitcoin network", function () {
      expect(
        `${pubKeyTobtcAddr(publicKeyStr, bitcoin.networks.bitcoin)}`
      ).toEqual(addr_expected);
    });

    test("Address from pubKeyToBtcAddr for undefined network", function () {
      expect(bitcoin.networks["bitcoin"]).toEqual(bitcoin.networks.bitcoin);
      expect(bitcoin.networks["bitcoin"]).not.toEqual(undefined);
      expect(`${pubKeyTobtcAddr(publicKeyStr, undefined)}`).toEqual(
        addr_expected
      );
    });
  });

  describe("Storage 1", function () {
    const WALLET_NAME_1 = "mock_e4c93acf-2f49-414f-b124-65c882eea7e8";
    const WALLET_NAME_1_BACKUP = WALLET_NAME_1 + "_backup";
    let wallet;
    beforeEach(async () => {
      try {
        clearWallet(WALLET_NAME_1);
        clearWallet(WALLET_NAME_1_BACKUP);
      } catch (err) {
        console.log(`${err}`);
      }
      wallet = await Wallet.buildMock(
        bitcoin.networks.bitcoin,
        undefined,
        undefined,
        undefined,
        WALLET_NAME_1
      );
      await wallet.save();
      return wallet;
    });

    afterAll(() => {
      try {
        clearWallet(WALLET_NAME_1);
        clearWallet(WALLET_NAME_1_BACKUP);
      } catch (err) {
        console.log(`${err}`);
      }
    });

    test("save/load", async function () {
      await expect(async () => {
        let _ = await Wallet.load(
          WALLET_NAME_1,
          MOCK_WALLET_PASSWORD + " ",
          true
        );
      }).rejects.toThrow("Incorrect password.");

      await expect(async () => {
        let _ = await Wallet.load(WALLET_NAME_1, "", true);
      }).rejects.toThrow("Incorrect password.");

      delete wallet.backupTxUpdateLimiter;

      let loaded_wallet = await await Wallet.load(
        WALLET_NAME_1,
        MOCK_WALLET_PASSWORD,
        true
      );
      delete loaded_wallet.backupTxUpdateLimiter;
      expect(JSON.stringify(wallet.statecoins)).toEqual(
        JSON.stringify(loaded_wallet.statecoins)
      );
      delete loaded_wallet.activityLogItems;
      delete wallet.activityLogItems;
      expect(JSON.stringify(wallet.activity.getItems())).toEqual(
        JSON.stringify(loaded_wallet.activity.getItems())
      );
      delete loaded_wallet.activity;
      delete wallet.activity;
      expect(JSON.stringify(wallet)).toEqual(JSON.stringify(loaded_wallet));
    });

    test("load, edit network settings, save and reload", async function () {
      //Check the default network settings
      expect(wallet.config.state_entity_endpoint).toEqual(
        NETWORK_CONFIG.mainnet_state_entity_endpoint
      );
      expect(wallet.config.swap_conductor_endpoint).toEqual(
        NETWORK_CONFIG.mainnet_swap_conductor_endpoint
      );
      expect(wallet.config.block_explorer_endpoint).toEqual(
        NETWORK_CONFIG.mainnet_block_explorer_endpoint
      );
      expect(wallet.config.electrum_config).toEqual(
        NETWORK_CONFIG.mainnet_electrum_config
      );

      //Edit the network settings
      const test_state_entity_endpoint = "test SEE";
      const test_swap_conductor_endpoint = "test SCE";
      const test_block_explorer_endpoint = "test BEE";
      const test_electrum_config = {
        host: "test EC host",
        port: 123456789,
        protocol: "tcp",
        type: "test EC type",
      };
      const test_blocks = wallet.config.electrum_fee_estimation_blocks + 1;

      wallet.config.state_entity_endpoint = test_state_entity_endpoint;
      wallet.config.swap_conductor_endpoint = test_swap_conductor_endpoint;
      wallet.config.block_explorer_endpoint = test_block_explorer_endpoint;
      wallet.config.electrum_config = test_electrum_config;
      wallet.config.electrum_fee_estimation_blocks = test_blocks;

      //Stop wallet
      await wallet.stop();

      //Confirm settings are edited
      delete wallet.backupTxUpdateLimiter;
      delete wallet.activityLogItems;
      delete wallet.activity;
      const wallet_mod_str = JSON.stringify(wallet);
      const wallet_mod_json = JSON.parse(wallet_mod_str);
      expect(wallet_mod_json.config.state_entity_endpoint).toEqual(
        test_state_entity_endpoint
      );
      expect(wallet_mod_json.config.swap_conductor_endpoint).toEqual(
        test_swap_conductor_endpoint
      );
      expect(wallet_mod_json.config.block_explorer_endpoint).toEqual(
        test_block_explorer_endpoint
      );
      expect(wallet_mod_json.config.electrum_config).toEqual(
        test_electrum_config
      );
      expect(wallet_mod_json.config.electrum_fee_estimation_blocks).toEqual(
        test_blocks
      );

      //Save wallet
      await wallet.save();

      //Confirm that the reloaded wallet has the altered settings
      let loaded_wallet = await Wallet.load(
        WALLET_NAME_1,
        MOCK_WALLET_PASSWORD,
        true
      );
      delete loaded_wallet.backupTxUpdateLimiter;
      delete loaded_wallet.activityLogItems;
      delete loaded_wallet.activity;
      loaded_wallet.stop();
      const loaded_wallet_str = JSON.stringify(loaded_wallet);
      const loaded_wallet_json = JSON.parse(loaded_wallet_str);
      expect(loaded_wallet_json.electrum_fee_estimation_blocks).toEqual(
        wallet_mod_json.electrum_fee_estimation_blocks
      );
      expect(wallet_mod_str).toEqual(loaded_wallet_str);
    });

    test("saveItem saves an item in the wallet store", async function () {
      const key = "test_item_key";
      const value = "test_item_value";
      const dest = `${wallet.name}.${key}`;
      expect(wallet.storage.store.get(dest)).toEqual(undefined);
      wallet[key] = value;
      await wallet.saveItem(key);
      expect(wallet.storage.store.get(dest)).toEqual(value);
      delete wallet[key];
      wallet.storage.store.delete(dest);
      expect(wallet.storage.store.get(dest)).toEqual(undefined);
      expect(wallet[key]).toEqual(undefined);
    });
  });

  describe("Storage 2", function () {
    let wallet;
    const WALLET_NAME_2 = "mock_e4c93acf-2f49-414f-b124-65c882eea7e9";
    const WALLET_NAME_2_BACKUP = WALLET_NAME_2 + "_backup";
    beforeEach(async () => {
      clearWallet(WALLET_NAME_2);
      clearWallet(WALLET_NAME_2_BACKUP);
      await expect(
        Wallet.load(WALLET_NAME_2, MOCK_WALLET_PASSWORD, true)
      ).rejects.toThrowError(`No wallet called ${WALLET_NAME_2} stored.`);
      await expect(
        Wallet.load(WALLET_NAME_2_BACKUP, MOCK_WALLET_PASSWORD, true)
      ).rejects.toThrowError(
        `No wallet called ${WALLET_NAME_2_BACKUP} stored.`
      );
      wallet = await Wallet.buildMock(
        bitcoin.networks.bitcoin,
        undefined,
        undefined,
        undefined,
        WALLET_NAME_2
      );
      await wallet.save();
      return wallet;
    });

    afterAll(() => {
      clearWallet(WALLET_NAME_2);
      clearWallet(WALLET_NAME_2_BACKUP);
    });

    test("toJSON", function () {
      let json_wallet = JSON.parse(JSON.stringify(wallet));
      let invalid_json_wallet = JSON.parse("{}");

      expect(() => {
        Wallet.fromJSON(invalid_json_wallet, true);
      }).toThrow("Invalid wallet");

      json_wallet.password = MOCK_WALLET_PASSWORD;
      // redefine password as hashing passwords is one-way
      let from_json = Wallet.fromJSON(json_wallet, true);
      // check wallets serialize to same values (since deep equal on recursive objects is messy)

      delete wallet.backupTxUpdateLimiter;
      delete from_json.backupTxUpdateLimiter;
      wallet.activityLogItems = [];
      from_json.active = true;

      expect(JSON.stringify(from_json)).toEqual(JSON.stringify(wallet));
    });

    test("saveName", async function () {
      let wallet_names = name_store.getWalletNames();
      if (wallet_names.filter((w) => w.name === wallet.name).length !== 0) {
        throw Error(
          "Do not expect wallet name to be in wallet_names until saveName() is called"
        );
      }
      await wallet.saveName();
      wallet_names = name_store.getWalletNames();
      if (wallet_names.filter((w) => w.name === wallet.name).length !== 1) {
        throw Error(
          "Expect wallet name to be in wallet_names after saveName() is called"
        );
      }
      await wallet.saveName();
      wallet_names = name_store.getWalletNames();
      if (wallet_names.filter((w) => w.name === wallet.name).length !== 1) {
        throw Error(
          "Do not expect duplicates in wallet_names after saveName() is called for a second time"
        );
      }
    });

    describe("parseBackupData", function () {
      let json_wallet;
      const WALLET_NAME_3 = "mock_e4c93acf-2f49-414f-b124-65c882eea7f0";
      const WALLET_NAME_3_BACKUP = WALLET_NAME_3 + "_backup";
      beforeAll(async () => {
        let wallet = await Wallet.buildMock(
          bitcoin.networks.bitcoin,
          undefined,
          undefined,
          undefined,
          WALLET_NAME_3
        );
        clearWallet(WALLET_NAME_3);
        clearWallet(WALLET_NAME_3_BACKUP);
        wallet = await Wallet.buildMock(
          bitcoin.networks.bitcoin,
          undefined,
          undefined,
          undefined,
          WALLET_NAME_3
        );
        await wallet.save();
        let store = new Storage(`wallets/${WALLET_NAME_3}/config`);
        let wallet_encrypted = store.getWallet(WALLET_NAME_3);
        json_wallet = JSON.stringify(wallet_encrypted);
      });

      required_fields.forEach((field) => {
        test(`missing required field ${field} results in an error`, () => {
          let wallet = JSON.parse(json_wallet);
          delete wallet[field];
          expect(wallet[field]).toEqual(undefined);
          expect(() => {
            parseBackupData(JSON.stringify(wallet));
          }).toThrowError(
            `parsing wallet backup data: invalid: missing field \"${field}\"`
          );
        });
      });

      test(`incorrect wallet format results in an error`, () => {
        expect(() => {
          parseBackupData("*");
        }).toThrowError(
          `parsing wallet backup data: Unexpected token * in JSON at position 0`
        );
      });
    });

    test("load from backup and save", async function () {
      let store = new Storage(`wallets/${WALLET_NAME_2}/config`);
      let wallet_encrypted = store.getWallet(WALLET_NAME_2);
      let json_wallet = JSON.parse(JSON.stringify(wallet_encrypted));
      json_wallet.name = WALLET_NAME_2_BACKUP;

      await expect(async () => {
        let _ = await Wallet.loadFromBackup(
          json_wallet,
          MOCK_WALLET_PASSWORD + " ",
          true
        );
      }).rejects.toThrow("Incorrect password.");

      await expect(async () => {
        let _ = await Wallet.loadFromBackup(json_wallet, "", true);
      }).rejects.toThrow("Incorrect password.");

      await expect(async () => {
        await Wallet.loadFromBackup("", "", true);
      }).rejects.toThrow("Something went wrong with backup file!");

      let loaded_wallet_from_backup = await Wallet.loadFromBackup(
        json_wallet,
        MOCK_WALLET_PASSWORD,
        true
      );
      loaded_wallet_from_backup.storage.loadStatecoins(
        loaded_wallet_from_backup
      );

      await loaded_wallet_from_backup.save();

      let loaded_wallet_mod = await Wallet.load(
        WALLET_NAME_2,
        MOCK_WALLET_PASSWORD,
        true
      );
      await loaded_wallet_mod.save();
      let loaded_wallet_backup = await Wallet.load(
        WALLET_NAME_2_BACKUP,
        MOCK_WALLET_PASSWORD,
        true
      );
      await loaded_wallet_backup.save();
      delete wallet.backupTxUpdateLimiter;
      delete loaded_wallet_mod.backupTxUpdateLimiter;
      delete wallet.activityLogItems;
      delete loaded_wallet_mod.activityLogItems;
      expect(JSON.stringify(wallet.activity.getItems())).toEqual(
        JSON.stringify(loaded_wallet_mod.activity.getItems())
      );
      expect(JSON.stringify(loaded_wallet_backup.activity.getItems())).toEqual(
        JSON.stringify(loaded_wallet_mod.activity.getItems())
      );
      delete wallet.activity;
      delete loaded_wallet_mod.activity;
      expect(Object.keys(wallet)).toEqual(Object.keys(loaded_wallet_mod));
      Object.keys(wallet).forEach((key) => {
        expect(JSON.stringify(wallet[key])).toEqual(
          JSON.stringify(loaded_wallet_mod[key])
        );
      });

      //The mock and mock_backup wallets should be the same except for name and storage
      loaded_wallet_mod.name = WALLET_NAME_2_BACKUP;
      loaded_wallet_mod.storage = loaded_wallet_backup.storage;
      delete loaded_wallet_backup.backupTxUpdateLimiter;
      delete loaded_wallet_backup.activityLogItems;
      delete loaded_wallet_backup.activity;

      expect(Object.keys(loaded_wallet_mod)).toEqual(
        Object.keys(loaded_wallet_backup)
      );
      Object.keys(loaded_wallet_mod)
        .filter((key) => key !== "statecoins")
        .forEach((key) => {
          expect(JSON.stringify(loaded_wallet_mod[key])).toEqual(
            JSON.stringify(loaded_wallet_backup[key])
          );
        });
      expect(loaded_wallet_mod.statecoins.coins.length).toEqual(2);
      expect(loaded_wallet_backup.statecoins.coins.length).toEqual(2);
      let lwb_coins_set = new Set(loaded_wallet_backup.statecoins.coins);
      let lw_coins_set = new Set(loaded_wallet_mod.statecoins.coins);
      expect(loaded_wallet_mod.statecoins.coins).toEqual(
        loaded_wallet_backup.statecoins.coins
      );
    });

    test("decrypt mnemonic", async function () {
      let store = new Storage(`wallets/${WALLET_NAME_2}/config`);
      let wallet_encrypted = store.getWallet(WALLET_NAME_2);
      let json_wallet = JSON.parse(JSON.stringify(wallet_encrypted));
      console.log(`json wallet: ${JSON.stringify(json_wallet)}`);
      let mnemonic = decryptAES(json_wallet.mnemonic, MOCK_WALLET_PASSWORD);
      expect(mnemonic).toEqual(MOCK_WALLET_MNEMONIC);
    });

    test("save coins list", async function () {
      let num_coins_before = cloneDeep(wallet.statecoins.coins.length);

      // new coin
      wallet.addStatecoinFromValues(
        "103d2223-7d84-44f1-ba3e-4cd7dd418560",
        SHARED_KEY_DUMMY,
        0.1,
        "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41",
        0,
        "03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477",
        ACTION.DEPOSIT
      );
      // expect wallet coins list to have grown by 1
      expect(num_coins_before + 1).toEqual(wallet.statecoins.coins.length);
      await wallet.saveStateCoinsList();

      let loaded_wallet = await Wallet.load(
        WALLET_NAME_2,
        MOCK_WALLET_PASSWORD,
        true
      );
      let num_coins_after = cloneDeep(loaded_wallet.statecoins.coins.length);
      expect(num_coins_after).toEqual(num_coins_before + 1);
      delete wallet.backupTxUpdateLimiter;
      delete loaded_wallet.backupTxUpdateLimiter;
      delete wallet.activityLogItems;
      delete loaded_wallet.activityLogItems;
      expect(JSON.stringify(wallet.activity.getItems())).toEqual(
        JSON.stringify(loaded_wallet.activity.getItems())
      );
      delete wallet.activity;
      delete loaded_wallet.activity;
      expect(JSON.stringify(wallet)).toEqual(JSON.stringify(loaded_wallet));

      //check that wallet and loaded wallet have the same number of coins in the coins array
      expect(num_coins_after).toEqual(wallet.statecoins.coins.length);

      // check that statecoins_obj is saved and has the correct number of entries
      const coins_obj = loaded_wallet.storage.store.get(
        `${loaded_wallet.name}.statecoins_obj`
      );
      expect(Object.values(coins_obj).length).toEqual(num_coins_after);
    });

    test("setStateCoinSpent - swap", async function () {
      let num_coins_before = wallet.statecoins.coins.length;
      expect(num_coins_before).toBeGreaterThan(0);
      let saveSpy = jest.spyOn(wallet, "saveStateCoin");
      let saveLogSpy = jest.spyOn(wallet, "saveActivityLog");
      expect(wallet.statecoins.coins.length).toBeGreaterThan(0);
      await wallet.setStateCoinSpent(
        wallet.statecoins.coins[0].shared_key_id,
        ACTION.SWAP,
        undefined,
        true
      );
      let num_coins_after = wallet.statecoins.coins.length;
      expect(saveSpy).toHaveBeenCalledTimes(1);
      expect(saveLogSpy).toHaveBeenCalledTimes(1);
      expect(num_coins_after).toEqual(num_coins_before);
    });

    test("setStateCoinSpent - check swapped saved", async function () {
      let num_coins_before = wallet.statecoins.coins.length;
      let saveSpy = jest.spyOn(wallet, "saveStateCoin");
      let saveLogSpy = jest.spyOn(wallet, "saveActivityLog");
      const swappedCoins1 = wallet.storage.getSwappedCoins(wallet.name);
      expect(swappedCoins1.length).toEqual(0);
      let coin_id = wallet.statecoins.coins[0].shared_key_id;
      await wallet.setStateCoinSpent(
        wallet.statecoins.coins[0].shared_key_id,
        ACTION.SWAP
      );
      let num_coins_after = wallet.statecoins.coins.length;
      expect(saveSpy).toHaveBeenCalledTimes(1);
      expect(saveLogSpy).toHaveBeenCalledTimes(1);
      const swappedCoins2 = wallet.storage.getSwappedCoins(wallet.name);
      expect(swappedCoins2.length).toEqual(1);
      expect(num_coins_after).toEqual(num_coins_before);
    });
  });
});

describe("Storage 3", () => {
  test("save/load swapped coins", async () => {
    const WALLET_NAME_5 = "mock_s5c93acx-5f49-418f-b124-95c882eea7e4";

    let wallet = await Wallet.buildMock(
      bitcoin.networks.bitcoin,
      undefined,
      undefined,
      undefined,
      WALLET_NAME_5
    );

    // change the first statecoin status to swapped
    let statecoin = wallet.statecoins.coins[0];
    statecoin.status = STATECOIN_STATUS.SWAPPED;

    // expect there to be this statecoin inside statecoin.coins
    expect(
      wallet.statecoins.coins.filter((coin) => coin === statecoin)[0]
    ).toBe(statecoin);

    // save the wallet
    await wallet.save();

    // reload wallet
    let loaded_wallet = await Wallet.load(
      WALLET_NAME_5,
      MOCK_WALLET_PASSWORD,
      true
    );

    // expect there to be no swapped coin in statecoins.coins
    expect(
      loaded_wallet.statecoins.coins.filter(
        (coin) => coin.status === STATECOIN_STATUS.SWAPPED
      )[0]
    ).toBe(undefined);
  });
});

describe("getCoinBackupTxData", () => {
  it("shared_key_id doesnt exist", async () => {
    let wallet = await Wallet.buildMock(bitcoin.networks.bitcoin);
    expect(() => {
      wallet.getCoinBackupTxData("StateCoin does not exist.");
    }).toThrowError("does not exist");
  });
});

describe("createBackupTxCPFP", function () {
  let wallet;
  let cpfp_data;
  let cpfp_data_bad_address;
  let cpfp_data_bad_coin;
  let cpfp_data_bad_fee;
  let tx_backup;
  beforeAll(async () => {
    wallet = await Wallet.buildMock(bitcoin.networks.bitcoin);
    cpfp_data = {
      selected_coin: wallet.statecoins.coins[0].shared_key_id,
      cpfp_addr: await wallet.genBtcAddress(),
      fee_rate: 3,
    };
    cpfp_data_bad_address = {
      selected_coin: wallet.statecoins.coins[0].shared_key_id,
      cpfp_addr: "tc1aaldkjqoeihj87yuih",
      fee_rate: 3,
    };
    cpfp_data_bad_coin = {
      selected_coin: "c93ad45a-00b9-449c-a804-aab5530efc90",
      cpfp_addr: await wallet.genBtcAddress(),
      fee_rate: 3,
    };
    cpfp_data_bad_fee = {
      selected_coin: wallet.statecoins.coins[0].shared_key_id,
      cpfp_addr: await wallet.genBtcAddress(),
      fee_rate: "three",
    };
    tx_backup = txWithdrawBuild(
      bitcoin.networks.bitcoin,
      "86396620a21680f464142f9743caa14111dadfb512f0eb6b7c89be507b049f42",
      0,
      await wallet.genBtcAddress(),
      10000,
      await wallet.genBtcAddress(),
      10,
      1
    );
    wallet.statecoins.coins[0].tx_backup = tx_backup.buildIncomplete();
  });

  test("Throw on invalid value", async function () {
    await expect(
      wallet.createBackupTxCPFP(cpfp_data_bad_address)
    ).rejects.toThrowError("Invalid Bitcoin address entered.");
    await expect(
      wallet.createBackupTxCPFP(cpfp_data_bad_coin)
    ).rejects.toThrowError(
      "No coin found with id c93ad45a-00b9-449c-a804-aab5530efc90"
    );
    await expect(
      wallet.createBackupTxCPFP(cpfp_data_bad_fee)
    ).rejects.toThrowError("Fee rate not an integer");
  });

  test("createdBackupTxCPFP valid", async function () {
    const tx_cpfp_expected =
      '{"version":2,"locktime":0,"ins":[{"hash":{"type":"Buffer","data":[107,245,5,137,241,80,23,28,183,252,131,220,83,180,180,95,165,245,238,183,114,192,141,211,50,46,35,131,211,5,156,74]},"index":0,"script":{"type":"Buffer","data":[]},"sequence":4294967295,"witness":[{"type":"Buffer","data":[48,68,2,32,124,193,61,125,110,126,38,94,100,20,19,66,29,91,43,45,46,99,79,74,37,50,242,171,56,135,238,191,140,89,177,31,2,32,47,190,230,160,147,196,117,253,230,152,213,193,60,72,130,71,127,83,95,250,79,247,211,170,20,22,133,204,219,144,97,199,1]},{"type":"Buffer","data":[3,214,96,240,27,83,235,26,229,172,212,94,11,164,20,16,104,4,44,105,22,118,111,177,140,62,233,71,15,87,226,220,153]}]}],"outs":[{"script":{"type":"Buffer","data":[0,20,209,156,183,190,243,118,6,191,242,108,152,143,199,152,107,105,153,65,44,222]},"value":9152}]}';
    await expect(wallet.createBackupTxCPFP(cpfp_data)).resolves.toBe(true);
    expect(wallet.statecoins.coins[0].tx_cpfp.outs.length).toBe(1);
    expect(JSON.stringify(wallet.statecoins.coins[0].tx_cpfp)).toEqual(
      tx_cpfp_expected
    );
  });
});

describe("updateBackupTxStatus", function () {
  let wallet;
  beforeEach(async () => {
    wallet = await Wallet.buildMock(bitcoin.networks.bitcoin);
    wallet.electrum_client = jest.genMockFromModule(
      "../mocks/mock_electrum.ts"
    );
    wallet.electrum_client.broadcastTransaction = jest.fn(async (backup_tx) => {
      return Promise.resolve(
        "0000000000000000000000000000000000000000000000000000000000000000"
      );
    });
  });

  test("Swaplimit", async function () {
    // locktime = 1000, height = 100 SWAPLIMIT triggered
    let tx_backup = txBackupBuild(
      bitcoin.networks.bitcoin,
      "86396620a21680f464142f9743caa14111dadfb512f0eb6b7c89be507b049f42",
      0,
      await wallet.genBtcAddress(),
      10000,
      await wallet.genBtcAddress(),
      10,
      1000
    );
    wallet.statecoins.coins[0].tx_backup = tx_backup.buildIncomplete();
    wallet.block_height = 100;
    await wallet.updateBackupTxStatus(false);
    expect(wallet.statecoins.coins[0].status).toBe(STATECOIN_STATUS.SWAPLIMIT);
  });

  test("Expired", async function () {
    // locktime = 1000, height = 1000, EXPIRED triggered
    let tx_backup = txBackupBuild(
      bitcoin.networks.bitcoin,
      "86396620a21680f464142f9743caa14111dadfb512f0eb6b7c89be507b049f42",
      0,
      await wallet.genBtcAddress(),
      10000,
      await wallet.genBtcAddress(),
      10,
      1000
    );
    wallet.statecoins.coins[1].tx_backup = tx_backup.buildIncomplete();
    wallet.block_height = 1000;
    await wallet.updateBackupTxStatus(false);
    expect(wallet.statecoins.coins[1].status).toBe(STATECOIN_STATUS.EXPIRED);
    // verify tx in mempool
    expect(wallet.statecoins.coins[1].backup_status).toBe(
      BACKUP_STATUS.IN_MEMPOOL
    );
  });

  test("Confirmed", async function () {
    // blockheight 1001, backup tx confirmed, coin WITHDRAWN
    let tx_backup = txBackupBuild(
      bitcoin.networks.bitcoin,
      "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41",
      0,
      await wallet.genBtcAddress(),
      10000,
      await wallet.genBtcAddress(),
      10,
      1000
    );
    wallet.statecoins.coins[1].tx_backup = tx_backup.buildIncomplete();
    wallet.block_height = 1003;
    wallet.statecoins.coins[1].status = STATECOIN_STATUS.EXPIRED;
    wallet.statecoins.coins[1].backup_status = BACKUP_STATUS.IN_MEMPOOL;
    wallet.electrum_client.getTransaction = jest.fn(async (_txid) => {
      return { confirmations: 3 };
    });
    await wallet.updateBackupTxStatus();
    expect(wallet.statecoins.coins[1].status).toBe(STATECOIN_STATUS.EXPIRED);
    // verify tx confirmed
    expect(wallet.statecoins.coins[1].backup_status).toBe(
      BACKUP_STATUS.CONFIRMED
    );
  });

  test("Double spend", async function () {
    // blockheight 1001, backup tx double-spend, coin EXPIRED
    let tx_backup = txBackupBuild(
      bitcoin.networks.bitcoin,
      "01f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41",
      0,
      await wallet.genBtcAddress(),
      10000,
      await wallet.genBtcAddress(),
      10,
      1000
    );
    wallet.statecoins.coins[0].tx_backup = tx_backup.buildIncomplete();
    wallet.block_height = 1003;
    wallet.electrum_client.broadcastTransaction = jest.fn(
      async (_backup_tx) => {
        return "conflict";
      }
    );
    await wallet.updateBackupTxStatus(false);
    // verify tx already spent
    expect(wallet.statecoins.coins[0].backup_status).toBe(BACKUP_STATUS.TAKEN);
    expect(wallet.statecoins.coins[0].status).toBe(STATECOIN_STATUS.EXPIRED);
  });
});

describe("processTXBroadcastResponse", function () {
  let statecoin;
  let wallet;
  beforeAll(async () => {
    wallet = await Wallet.buildMock();
    statecoin = wallet.statecoins.coins[0];
  });
  beforeEach(() => {
    statecoin.backup_status = BACKUP_STATUS.UNBROADCAST;
    statecoin.status = STATECOIN_STATUS.AVAILABLE;
  });
  test("txn-already-in-mempool", () => {
    wallet.processTXBroadcastResponse(statecoin, "txn-already-in-mempool");
    expect(statecoin.backup_status).toEqual(BACKUP_STATUS.IN_MEMPOOL);
  });
  test("txn hash", () => {
    let txn_hash =
      "0000000000000000000000000000000000000000000000000000000000000000";
    wallet.processTXBroadcastResponse(statecoin, txn_hash);
    expect(statecoin.backup_status).toEqual(BACKUP_STATUS.IN_MEMPOOL);
  });
  test("already mempool", () => {
    wallet.processTXBroadcastResponse(statecoin, "already mempool");
    expect(statecoin.backup_status).toEqual(BACKUP_STATUS.IN_MEMPOOL);
  });
  test("in block xxx", () => {
    wallet.processTXBroadcastResponse(statecoin, "in block xxx");
    expect(statecoin.backup_status).toEqual(BACKUP_STATUS.CONFIRMED);
    expect(statecoin.status).toEqual(STATECOIN_STATUS.WITHDRAWN);
  });
  test("conflict", () => {
    wallet.processTXBroadcastResponse(statecoin, "conflict");
    expect(statecoin.backup_status).toEqual(BACKUP_STATUS.TAKEN);
    expect(statecoin.status).toEqual(STATECOIN_STATUS.EXPIRED);
  });
  test("missingorspent", () => {
    wallet.processTXBroadcastResponse(statecoin, "missingorspent");
    expect(statecoin.backup_status).toEqual(BACKUP_STATUS.TAKEN);
    expect(statecoin.status).toEqual(STATECOIN_STATUS.EXPIRED);
  });
  test("Missing", () => {
    wallet.processTXBroadcastResponse(statecoin, "Missing");
    expect(statecoin.backup_status).toEqual(BACKUP_STATUS.TAKEN);
    expect(statecoin.status).toEqual(STATECOIN_STATUS.EXPIRED);
  });
});

describe("processTXBroadcastError", function () {
  let statecoin;
  let wallet;
  beforeAll(async () => {
    wallet = await Wallet.buildMock();
    statecoin = wallet.statecoins.coins[0];
  });
  beforeEach(() => {
    statecoin.backup_status = BACKUP_STATUS.UNBROADCAST;
    statecoin.status = STATECOIN_STATUS.AVAILABLE;
  });
  test("already in mempool", () => {
    wallet.processTXBroadcastError(statecoin, Error("already mempool"));
    expect(statecoin.backup_status).toEqual(BACKUP_STATUS.IN_MEMPOOL);
  });
  test("already in block", () => {
    wallet.processTXBroadcastError(statecoin, Error("already block"));
    expect(statecoin.backup_status).toEqual(BACKUP_STATUS.CONFIRMED);
    expect(statecoin.status).toEqual(STATECOIN_STATUS.WITHDRAWN);
  });
  test("conflict", () => {
    wallet.processTXBroadcastError(statecoin, Error("conflict"));
    expect(statecoin.backup_status).toEqual(BACKUP_STATUS.TAKEN);
    expect(statecoin.status).toEqual(STATECOIN_STATUS.EXPIRED);
  });
  test("missing or spent", () => {
    wallet.processTXBroadcastError(statecoin, Error("missingorspent"));
    expect(statecoin.backup_status).toEqual(BACKUP_STATUS.TAKEN);
    expect(statecoin.status).toEqual(STATECOIN_STATUS.EXPIRED);
  });
  test("Missing", () => {
    wallet.processTXBroadcastError(statecoin, Error("Missing"));
    expect(statecoin.backup_status).toEqual(BACKUP_STATUS.TAKEN);
    expect(statecoin.status).toEqual(STATECOIN_STATUS.EXPIRED);
  });
});

describe("backupTxCheckRequired", function () {
  let statecoin;
  let reqBackupStatuses = new Set([
    BACKUP_STATUS.CONFIRMED,
    BACKUP_STATUS.TAKEN,
    BACKUP_STATUS.SPENT,
  ]);
  let reqStatuses = new Set([
    STATECOIN_STATUS.WITHDRAWN,
    STATECOIN_STATUS.WITHDRAWING,
    STATECOIN_STATUS.IN_TRANSFER,
    STATECOIN_STATUS.SWAPPED,
    STATECOIN_STATUS.DUPLICATE,
  ]);
  beforeAll(async () => {
    let wallet = await Wallet.buildMock();
    statecoin = wallet.statecoins.coins[0];
    statecoin.tx_backup = new Transaction();
  });
  beforeEach(() => {
    statecoin.backup_status = BACKUP_STATUS.UNBROADCAST;
    statecoin.status = STATECOIN_STATUS.AVAILABLE;
  });
  test("statecoin null or undefined", () => {
    expect(Wallet.backupTxCheckRequired(null)).toEqual(false);
    expect(Wallet.backupTxCheckRequired(undefined)).toEqual(false);
  });
  test("statecoin tx_backup null or undefined", () => {
    expect(Wallet.backupTxCheckRequired({ tx_backup: null })).toEqual(false);
    expect(Wallet.backupTxCheckRequired({ tx_backup: undefined })).toEqual(
      false
    );
  });
  test("backup statuses", () => {
    statecoin.status = STATECOIN_STATUS.IN_MEMPOOL;
    Object.values(BACKUP_STATUS).forEach((val) => {
      statecoin.backup_status = val;
      const check_required = Wallet.backupTxCheckRequired(statecoin);
      const has_status = reqBackupStatuses.has(val);
      console.log(`backup status: ${val}, check required: ${check_required}`);
      expect(check_required).not.toEqual(has_status);
    });
  });
  test("statecoin statuses", () => {
    Object.values(STATECOIN_STATUS).forEach((val) => {
      statecoin.status = val;
      expect(Wallet.backupTxCheckRequired(statecoin)).not.toEqual(
        reqStatuses.has(val)
      );
    });
  });
});

describe("checkLocktime", function () {
  let statecoin;
  let init_statecoin;
  let wallet;
  beforeAll(async () => {
    wallet = await Wallet.buildMock();
    wallet.config.swaplimit = 10;
    statecoin = wallet.statecoins.coins[0];
    statecoin.tx_backup = new Transaction();
  });
  beforeEach(() => {
    statecoin.backup_status = BACKUP_STATUS.UNBROADCAST;
    statecoin.status = STATECOIN_STATUS.AVAILABLE;
    init_statecoin = cloneDeep(statecoin);
  });
  test("before locktime", async () => {
    wallet.block_height = 0;
    statecoin.tx_backup.locktime =
      wallet.block_height + wallet.config.swaplimit;
    expect(await wallet.checkLocktime(statecoin)).toEqual(false);
    expect(statecoin.backup_status).toEqual(BACKUP_STATUS.PRE_LOCKTIME);
    expect(statecoin.status).toEqual(init_statecoin.status);
  });
  test("swap limit", async () => {
    wallet.block_height = 1;
    statecoin.tx_backup.locktime = wallet.block_height + 1;
    expect(await wallet.checkLocktime(statecoin)).toEqual(false);
    expect(statecoin.backup_status).toEqual(BACKUP_STATUS.PRE_LOCKTIME);
    expect(statecoin.status).toEqual(STATECOIN_STATUS.SWAPLIMIT);
  });
  test("at locktime", async () => {
    statecoin.tx_backup.locktime =
      wallet.block_height + wallet.config.swaplimit;
    wallet.block_height = statecoin.tx_backup.locktime;
    expect(await wallet.checkLocktime(statecoin)).toEqual(true);
    expect(statecoin.backup_status).toEqual(init_statecoin.backup_status);
    expect(statecoin.status).toEqual(init_statecoin.status);
  });
  test("after locktime", async () => {
    statecoin.tx_backup.locktime =
      wallet.block_height + wallet.config.swaplimit;
    wallet.block_height = statecoin.tx_backup.locktime + 1;
    expect(await wallet.checkLocktime(statecoin)).toEqual(true);
    expect(statecoin.backup_status).toEqual(init_statecoin.backup_status);
    expect(statecoin.status).toEqual(init_statecoin.status);
  });
});

describe("checkMempoolTx", function () {
  let statecoin;
  let init_statecoin;
  let wallet;
  let electrum_mock;
  beforeAll(async () => {
    wallet = await Wallet.buildMock();
    wallet.config.swaplimit = 10;
    electrum_mock = jest.genMockFromModule("../mocks/mock_electrum.ts");
    wallet.electrum_client = electrum_mock;
    statecoin = wallet.statecoins.coins[0];
    statecoin.tx_backup = new Transaction();
    statecoin.backup_status = BACKUP_STATUS.UNBROADCAST;
    statecoin.status = STATECOIN_STATUS.AVAILABLE;
    init_statecoin = cloneDeep(statecoin);
  });
  beforeEach(async () => {
    statecoin.backup_status = BACKUP_STATUS.UNBROADCAST;
    statecoin.status = STATECOIN_STATUS.AVAILABLE;
  });
  test("confirmations undefined", async () => {
    wallet.electrum_client.getTransaction = jest.fn(async (_txid) => {
      return { confirmations: undefined };
    });
    await wallet.checkMempoolTx(statecoin);
    expect(statecoin).toEqual(init_statecoin);
  });
  test("confirmations null", async () => {
    wallet.electrum_client.getTransaction = jest.fn(async (_txid) => {
      return { confirmations: null };
    });
    await wallet.checkMempoolTx(statecoin);
    expect(statecoin).toEqual(init_statecoin);
  });
  test("2 confirmations", async () => {
    wallet.electrum_client.getTransaction = jest.fn(async (_txid) => {
      return { confirmations: 2 };
    });
    await wallet.checkMempoolTx(statecoin);
    expect(statecoin).toEqual(init_statecoin);
  });
  test("3 confirmations", async () => {
    wallet.electrum_client.getTransaction = jest.fn(async (_txid) => {
      return { confirmations: 3 };
    });
    await wallet.checkMempoolTx(statecoin);
    expect(statecoin.backup_status).toEqual(BACKUP_STATUS.CONFIRMED);
    expect(statecoin.status).toEqual(STATECOIN_STATUS.WITHDRAWN);
  });
});

describe("checkElectrumNetwork", function () {
  let gen_txid =
    "d3ad39fa52a89997ac7381c95eeffeaf40b66af7a57e9eba144be0a175a12b11";
  let statecoin;
  let init_statecoin;
  let wallet;
  let electrum_mock;
  beforeAll(async () => {
    wallet = await Wallet.buildMock(bitcoin.networks.bitcoin);
    wallet.config.swaplimit = 10;
    electrum_mock = jest.genMockFromModule("../mocks/mock_electrum.ts");
    wallet.electrum_client = electrum_mock;
    statecoin = wallet.statecoins.coins[0];
    statecoin.backup_status = BACKUP_STATUS.UNBROADCAST;
    statecoin.status = STATECOIN_STATUS.AVAILABLE;
    init_statecoin = cloneDeep(statecoin);
  });
  beforeEach(async () => {
    statecoin.backup_status = BACKUP_STATUS.UNBROADCAST;
    statecoin.status = STATECOIN_STATUS.AVAILABLE;
  });
  test("testnet connection", async () => {
    let result = await wallet.checkElectrumNetwork();
    expect(result).toEqual(false);
  });
  test("mainnet connection", async () => {
    wallet.electrum_client.getTransaction = jest.fn(async (gen_txid) => {
      return { confirmed: true };
    });
    let result = await wallet.checkElectrumNetwork();
    expect(result).toEqual(true);
  });
});

describe("broadcastBackupTx", function () {
  let statecoin;
  let init_statecoin;
  let wallet;

  beforeEach(async () => {
    wallet = await Wallet.buildMock();
    wallet.config.swaplimit = 10;
    wallet.electrum_client = jest.genMockFromModule(
      "../mocks/mock_electrum.ts"
    );
    statecoin = wallet.statecoins.coins[0];
    statecoin.backup_status = BACKUP_STATUS.UNBROADCAST;
    statecoin.status = STATECOIN_STATUS.AVAILABLE;
    statecoin.tx_backup = new Transaction();
    init_statecoin = cloneDeep(statecoin);
  });
  test("broadcast ok", async () => {
    let response = "a transaction hash";
    wallet.electrum_client.broadcastTransaction = jest.fn(
      async (_backup_tx) => {
        return response;
      }
    );
    let spy = jest
      .spyOn(wallet, "processTXBroadcastResponse")
      .mockImplementation();
    await expect(wallet.broadcastBackupTx(statecoin)).resolves.toBe();
    expect(spy).toHaveBeenCalled();
  });
  test("broadcast error", async () => {
    wallet.electrum_client.broadcastTransaction = jest.fn(async (backup_tx) => {
      throw new Error(`failed to broadcast transaction: [an error message]`);
    });
    let spy = jest
      .spyOn(wallet, "processTXBroadcastError")
      .mockImplementation();
    wallet.broadcastBackupTx(statecoin).then(() => {
      expect(spy).toHaveBeenCalled();
    });
  });
});

describe("broadcastCPFP", function () {
  let statecoin;
  let init_statecoin;
  let wallet;
  beforeEach(async () => {
    wallet = await Wallet.buildMock();
    wallet.config.swaplimit = 10;
    wallet.electrum_client = jest.genMockFromModule(
      "../mocks/mock_electrum.ts"
    );
    statecoin = wallet.statecoins.coins[0];
    console.log(`statecoin: ${statecoin}`);
    statecoin.backup_status = BACKUP_STATUS.UNBROADCAST;
    statecoin.status = STATECOIN_STATUS.AVAILABLE;
    statecoin.tx_backup = new Transaction();
    statecoin.tx_cpfp = statecoin.tx_backup;
    init_statecoin = cloneDeep(statecoin);
  });
  test("broadcast ok", async () => {
    let response = "a transaction hash";
    wallet.electrum_client.broadcastTransaction = jest.fn(
      async (_backup_tx) => {
        return Promise.resolve(response);
      }
    );
    await expect(wallet.broadcastCPFP(statecoin)).resolves;
  });

  test("broadcast error", async () => {
    wallet.electrum_client.broadcastTransaction = jest.fn(async (backup_tx) => {
      throw new Error(`failed to broadcast transaction: [an error message]`);
    });
    let spy = jest
      .spyOn(wallet, "processTXBroadcastError")
      .mockImplementation();
    wallet.broadcastBackupTx(statecoin).then(() => {
      expect(spy).toHaveBeenCalled();
    });
  });
  test("broadcast error", async () => {
    const error = new Error(
      `failed to broadcast transaction: [an error message]`
    );
    wallet.electrum_client.broadcastTransaction = jest.fn(
      async (_backup_tx) => {
        throw error;
      }
    );
    statecoin.tx_cpfp = statecoin.tx_backup;
    wallet
      .broadcastCPFP(statecoin)
      .then((_result) => {
        expect(true).toEqual(false);
      })
      .catch((err) => {
        expect(err).toEqual(
          new Error(`failed to broadcast transaction: [an error message]`)
        );
      });
  });
});

describe("Statecoins/Coin", () => {
  let statecoins;
  beforeAll(async () => {
    statecoins = (await Wallet.buildMock()).statecoins;
  });

  test("to/from JSON", () => {
    var json = JSON.parse(JSON.stringify(statecoins));
    let from_json = StateCoinList.fromJSON(json);
    expect(statecoins).toEqual(from_json);
  });

  test("get/remove coin", () => {
    var json = JSON.parse(JSON.stringify(statecoins));
    statecoins = StateCoinList.fromJSON(json);
    let new_shared_key_id = "861d2223-7d84-44f1-ba3e-4cd7dd418560";

    // Check new_shared_key_id not already in coins list
    expect(
      statecoins.coins.filter((item) => {
        if (item.shared_key_id == new_shared_key_id) {
          return item;
        }
      }).length
    ).toEqual(0);

    // Add new coin to list
    statecoins.addNewCoin(new_shared_key_id, SHARED_KEY_DUMMY);
    expect(
      statecoins.coins.filter((item) => {
        if (item.shared_key_id == new_shared_key_id) {
          return item;
        }
      }).length
    ).toEqual(1);

    // Remove coin from list
    statecoins.removeCoin(new_shared_key_id, false);
    expect(
      statecoins.coins.filter((item) => {
        if (item.shared_key_id == new_shared_key_id) {
          return item;
        }
      }).length
    ).toEqual(0);
  });

  test("try remove confirmed coin", () => {
    var json = JSON.parse(JSON.stringify(statecoins));
    statecoins = StateCoinList.fromJSON(json);
    let new_shared_key_id = "861d2223-7d84-44f1-ba3e-4cd7dd418560";
    statecoins.addNewCoin(new_shared_key_id, SHARED_KEY_DUMMY);
    let coin = statecoins.getCoin(new_shared_key_id);
    coin.setInMempool();

    // Attempt to remove coin from list
    expect(() => {
      statecoins.removeCoin(new_shared_key_id, false);
    }).toThrowError(
      "Should not remove coin whose funding transaction has been broadcast."
    );
  });

  describe("getAllCoins", () => {
    it("Returns coins with correct data", () => {
      let coins = statecoins.getAllCoins();
      expect(coins.length).toBe(statecoins.coins.length);
      for (let i = 0; i < coins.length; i++) {
        expect(coins[i]).toEqual(
          expect.objectContaining({
            shared_key_id: expect.any(String),
            value: expect.any(Number),
            funding_txid: expect.any(String),
            funding_vout: expect.any(Number),
            timestamp: expect.any(Number),
            swap_rounds: expect.any(Number),
          })
        );
      }
    });
  });

  describe("getUnspentCoins", () => {
    it("Returns only unspent coins with correct data", () => {
      let coins = statecoins.getAllCoins();
      let num_coins = coins.length;
      statecoins.setCoinSpent(coins[0].shared_key_id, "W"); // set one spent
      expect(statecoins.getUnspentCoins().length).toBe(num_coins - 1);
      expect(coins.length).toBe(statecoins.coins.length);
    });
  });

  describe("getUnconfirmedCoinsData", () => {
    it("Returns only unconfirmed coins with correct data", () => {
      let coins = statecoins.getAllCoins();
      let num_coins = coins.length;
      let coin = statecoins.getCoin(coins[0].shared_key_id);
      coin.status = "UNCONFIRMED"; // set one unconfirmed
      statecoins.setCoinFinalized(coin);
      expect(statecoins.getUnconfirmedCoins().length).toBe(num_coins - 1);
      expect(coins.length).toBe(statecoins.coins.length);
    });
  });

  describe("calcExpiryDate", () => {
    it("Calculate expiry", () => {
      let coin = cloneDeep(statecoins.coins[0]);
      let tx_backup = new Transaction();
      let locktime = 24 * 6 * 30; // month locktime
      tx_backup.locktime = locktime;
      coin.tx_backup = tx_backup;
      expect(coin.getExpiryData(locktime - 1)).toEqual({
        blocks: 1,
        days: 0,
        months: 0,
        confirmations: 4321,
      }); // < 1 day to go
      expect(coin.getExpiryData(locktime + 1)).toEqual({
        blocks: 0,
        days: 0,
        months: 0,
        confirmations: 0,
      }); // locktime passed
      expect(coin.getExpiryData(locktime - 24 * 6 + 1)).toEqual({
        blocks: 24 * 6 - 1,
        days: 0,
        months: 0,
        confirmations: 4179,
      }); // 1 block from 1 day
      expect(coin.getExpiryData(locktime - 24 * 6)).toEqual({
        blocks: 24 * 6,
        days: 1,
        months: 0,
        confirmations: 4178,
      }); // 1 day
      expect(coin.getExpiryData(locktime - 2 * 24 * 6)).toEqual({
        blocks: 2 * 24 * 6,
        days: 2,
        months: 0,
        confirmations: 4034,
      }); // 2 days
      expect(coin.getExpiryData(locktime - 29 * 24 * 6)).toEqual({
        blocks: 29 * 24 * 6,
        days: 29,
        months: 0,
        confirmations: 146,
      }); // 29 days = 0 months
      expect(coin.getExpiryData(locktime - 30 * 24 * 6)).toEqual({
        blocks: 30 * 24 * 6,
        days: 30,
        months: 1,
        confirmations: 2,
      }); // 1 month
    });
    it("no backup tx", () => {
      let coin = statecoins.coins[0];
      coin.tx_backup = null;
      let expiry_data = coin.getExpiryData(999);
      expect(expiry_data.blocks).toBe(-1);
    });
  });
});

describe("Config", () => {
  var config = new Config(bitcoin.networks.bitcoin, true);
  let update = { min_anon_set: 20 };

  test("update", () => {
    expect(config.min_anon_set).not.toBe(20);
    config.update(update);
    expect(config.min_anon_set).toBe(20);
  });

  test("expect update invalid value to log a warning", () => {
    const configLog = require("../config").log;
    const logWarnSpy = jest.spyOn(configLog, "warn");
    config.update({ invalid: "" });
    expect(logWarnSpy).toHaveBeenCalled();
  });

  test("expect update of non-connection values to return 'false'", () => {
    let update = config.getConfig();
    update.testing_mode = !config.testing_mode;
    update.jest_testing_mode = !config.jest_testing_mode;
    update.required_confirmations = config.required_confirmations + 1;
    update.electrum_fee_estimation_blocks =
      config.electrum_fee_estimation_blocks + 1;
    update.min_anon_set = config.min_anon_set + 1;
    update.notifications = !config.notifications;
    update.singleSwapMode = !config.singleSwapMode;
    update.tutorials = !config.tutorials;
    update.swapLimit = config.swapLimit + 1;
    expect(config.update(update)).toEqual(false);
  });

  test("expect update of connection values to return 'true'", () => {
    let update = config.getConfig();
    update.electrum_config.type = `${config.type}_edited`;
    expect(config.update(update)).toEqual(true);
  });
});

describe("bip32", () => {
  const MNEMONIC =
    "similar leader virus polar vague grunt talk flavor kitten order call blood";
  const addresses = [
    "bc1qmn8ce5fcmkj58df76r7tvey6hgq3w0xzm3awe8",
    "bc1qqjv602v04glax49h2s46jwp5jhqta4pe8w3k8a",
    "bc1qs0l8u9xnk4rdr20wvjdwsd5jjrgj7lxhptw6u0",
  ];
  let account;

  beforeEach(() => {
    account = mnemonic_to_bip32_root_account(
      MNEMONIC,
      bitcoin.networks.bitcoin
    );
  });

  test("find generated addresses", async () => {
    for (let i = 0; i < addresses.length; i++) {
      account.nextChainAddress(0);
      expect(account.containsAddress(addresses[i])).toBe(true);
    }
  });

  test("do not find ungenerated addresses", async () => {
    for (let i = 0; i < addresses.length; i++) {
      expect(account.containsAddress(addresses[i])).toBe(false);
    }
  });

  test("find generated nodes using getBIP32forBtcAddress", async () => {
    for (let i = 0; i < addresses.length; i++) {
      account.nextChainAddress(0);
      expect(() => {
        getBIP32forBtcAddress(addresses[i], account);
      }).not.toThrowError();
    }
  });

  test("fail to ungenerated node using getBIP32forBtcAddress", async () => {
    expect(() => {
      getBIP32forBtcAddress(addresses[addresses.length - 1], account);
    }).toThrowError();
  });

  test("finding a node using getBIP32forBtcAddress leaves account unaltered", async () => {
    account.nextChainAddress(0);
    let account_orig = cloneDeep(account);
    getBIP32forBtcAddress(addresses[0], account);
    expect(account_orig).toEqual(account);
  });

  test("failing to find a node using getBIP32forBtcAddress leaves account unaltered", async () => {
    let account_orig = cloneDeep(account);
    expect(() => {
      getBIP32forBtcAddress(addresses[0], account);
    }).toThrowError();
    expect(account_orig).toEqual(account);
  });
});

describe("Post-swap functions", () => {
  const MNEMONIC =
    "similar leader virus polar vague grunt talk flavor kitten order call blood";
  // client side's mock
  let wasm_mock = jest.genMockFromModule("../mocks/mock_wasm");
  // server side's mock
  let http_mock = jest.genMockFromModule("../mocks/mock_http_client");
  let wallet;
  const CHAIN_LENGTH = 5;
  //Fatal swap error
  const swap_error = Error("Exiting swap.");
  let statecoin;
  let account_init;
  let setCoinSpentSpy;

  beforeEach(async () => {
    wallet = await Wallet.buildMock(
      bitcoin.networks.bitcoin,
      http_mock,
      wasm_mock,
      MNEMONIC
    );
    setCoinSpentSpy = jest.spyOn(wallet.statecoins, "setCoinSpent");
    wallet.statecoins.coins = [];
    wallet.addStatecoinFromValues(
      "861d2223-7d84-44f1-ba3e-4cd7dd418560",
      {
        public: { q: "", p2: "", p1: "", paillier_pub: {}, c_key: "" },
        private: "",
        chain_code: "",
      },
      0.1,
      "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41",
      0,
      "03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477",
      ACTION.DEPOSIT
    );
    statecoin = wallet.statecoins.coins[0];
    statecoin.swap_status = SWAP_STATUS.Init;
    for (let i = 0; i < CHAIN_LENGTH; i++) {
      wallet.account.nextChainAddress(0);
    }
    account_init = cloneDeep(wallet.account);
    wallet.handleSwapError(swap_error, statecoin);
    statecoin.status = STATECOIN_STATUS.SWAPPED;
    await wallet.doPostSwap(statecoin, null);
    return wallet;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("Post-swap and swap error handling functions do not alter wallet bip32 account", () => {
    expect(wallet.account).toEqual(account_init);
  });

  test("Confirm that setStateCoinSpent was not called if there is not a new statecoin", () => {
    expect(setCoinSpentSpy).not.toHaveBeenCalled();
  });

  test("Confirm that setStateCoinSpent was called if there is a new statecoin, and that saveStateCoin was called twice (once for each statecoin)", async () => {
    wallet.statecoins.coins = [];
    wallet.addStatecoinFromValues(
      "861d2223-7d84-44f1-ba3e-4cd7dd418560",
      {
        public: { q: "", p2: "", p1: "", paillier_pub: {}, c_key: "" },
        private: "",
        chain_code: "",
      },
      0.1,
      "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41",
      0,
      "03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477",
      ACTION.DEPOSIT
    );
    statecoin = wallet.statecoins.coins[0];
    statecoin.swap_status = SWAP_STATUS.Init;
    statecoin = wallet.statecoins.coins[0];
    expect(wallet.statecoins.coins.length).toEqual(1);
    let new_statecoin = cloneDeep(statecoin);
    new_statecoin.status = STATECOIN_STATUS.AVAILABLE;
    new_statecoin.shared_key_id = "new_shared_key_id";
    let saveSpy = jest.spyOn(wallet, "saveStateCoin");
    let setStateCoinSpentSpy = jest.spyOn(wallet, "setStateCoinSpent");
    let statecoin_got = wallet.statecoins.getCoin(statecoin.shared_key_id);
    expect(statecoin_got).not.toEqual(undefined);
    await wallet.doPostSwap(statecoin, new_statecoin);
    //confirm that the old statecoin has been set to spent
    expect(setStateCoinSpentSpy).toHaveBeenCalledTimes(1);
    expect(saveSpy).toHaveBeenCalledTimes(2);
  });
});

describe("Handle swap error", () => {
  const MNEMONIC =
    "similar leader virus polar vague grunt talk flavor kitten order call blood";
  // client side's mock
  let wasm_mock = jest.genMockFromModule("../mocks/mock_wasm");
  // server side's mock
  let http_mock = jest.genMockFromModule("../mocks/mock_http_client");
  let wallet;
  const CHAIN_LENGTH = 5;
  //Fatal swap error
  const swap_error = Error("Exiting swap.");
  let statecoin;
  let account_init;
  let setSwapDataToNullSpy;

  beforeEach(async () => {
    wallet = await Wallet.buildMock(
      bitcoin.networks.bitcoin,
      http_mock,
      wasm_mock,
      MNEMONIC
    );
    wallet.statecoins.coins = [];
    wallet.addStatecoinFromValues(
      "861d2223-7d84-44f1-ba3e-4cd7dd418560",
      {
        public: { q: "", p2: "", p1: "", paillier_pub: {}, c_key: "" },
        private: "",
        chain_code: "",
      },
      0.1,
      "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41",
      0,
      "03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477",
      ACTION.DEPOSIT
    );
    statecoin = wallet.statecoins.coins[0];
    statecoin.swap_status = SWAP_STATUS.Init;
    setSwapDataToNullSpy = jest.spyOn(statecoin, "setSwapDataToNull");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("Swap data set to null for transfer batch timeout error", () => {
    let error = Error("Transfer batch ended. Timeout");
    wallet.handleSwapError(error, statecoin);
    expect(setSwapDataToNullSpy).toHaveBeenCalled();
  });

  test('Swap data set to null for "Exiting swap" error', () => {
    let error = Error("Exiting swap.");
    wallet.handleSwapError(error, statecoin);
    expect(setSwapDataToNullSpy).toHaveBeenCalled();
  });

  test("Swap data set to null for transfer batch timeout error if statecoin is in swap phase 4", () => {
    let error = Error("Transfer batch ended. Timeout");
    statecoin.swap_status = SWAP_STATUS.Phase4;
    wallet.handleSwapError(error, statecoin);
    expect(setSwapDataToNullSpy).toHaveBeenCalled();
  });

  test('Swap data set to null for "Exiting swap" error if statecoin is in swap phase 4', () => {
    let error = Error("Exiting swap.");
    statecoin.swap_status = SWAP_STATUS.Phase4;
    wallet.handleSwapError(error, statecoin);
    expect(setSwapDataToNullSpy).toHaveBeenCalled();
  });

  test("Swap data set to null for all swap phases other than swap phase 4", () => {
    let error = Error("Misc error");
    let nCalls = 0;
    for (let s in SWAP_STATUS) {
      let sc = cloneDeep(statecoin);
      sc.swap_status = s;
      wallet.handleSwapError(error, sc);
      if (s != SWAP_STATUS.Phase4) {
        nCalls = nCalls + 1;
      }
      expect(setSwapDataToNullSpy).toHaveBeenCalledTimes(nCalls);
    }
  });

  test("setSwapDataToNull nullifies all swap data", () => {
    statecoin.status = STATECOIN_STATUS.IN_SWAP;
    statecoin.swap_id = {};
    statecoin.swap_info = {};
    statecoin.swap_address = {};
    statecoin.swap_my_bst_data = {};
    statecoin.swap_receiver_addr = {};
    statecoin.swap_transfer_msg = {};
    statecoin.swap_batch_data = {};
    statecoin.swap_transfer_msg_4 = {};
    statecoin.swap_transfer_msg_3_receiver = {};
    statecoin.swap_transfer_finalized_data = {};
    statecoin.ui_swap_status = UI_SWAP_STATUS.Phase8;
    statecoin.swap_error = {};

    expect(statecoin.status).not.toEqual(STATECOIN_STATUS.AVAILABLE);
    expect(statecoin.swap_status).not.toEqual(null);
    expect(statecoin.swap_id).not.toEqual(null);
    expect(statecoin.swap_address).not.toEqual(null);
    expect(statecoin.swap_info).not.toEqual(null);
    expect(statecoin.swap_my_bst_data).not.toEqual(null);
    expect(statecoin.swap_receiver_addr).not.toEqual(null);
    expect(statecoin.swap_transfer_msg).not.toEqual(null);
    expect(statecoin.swap_batch_data).not.toEqual(null);
    expect(statecoin.swap_transfer_msg_3_receiver).not.toEqual(null);
    expect(statecoin.swap_transfer_msg_4).not.toEqual(null);
    expect(statecoin.ui_swap_status).not.toEqual(null);
    expect(statecoin.swap_error).not.toEqual(null);
    expect(statecoin.swap_transfer_finalized_data).not.toEqual(null);

    statecoin.setSwapDataToNull(false);

    expect(statecoin.status).toEqual(STATECOIN_STATUS.AVAILABLE);
    expect(statecoin.swap_status).toEqual(null);
    expect(statecoin.swap_id).toEqual(null);
    expect(statecoin.swap_address).toEqual(null);
    expect(statecoin.swap_info).toEqual(null);
    expect(statecoin.swap_my_bst_data).toEqual(null);
    expect(statecoin.swap_receiver_addr).toEqual(null);
    expect(statecoin.swap_transfer_msg).toEqual(null);
    expect(statecoin.swap_batch_data).toEqual(null);
    expect(statecoin.swap_transfer_msg_3_receiver).toEqual(null);
    expect(statecoin.swap_transfer_msg_4).toEqual(null);
    expect(statecoin.ui_swap_status).toEqual(null);
    expect(statecoin.swap_error).toEqual(null);
    expect(statecoin.swap_transfer_finalized_data).not.toEqual(null);

    statecoin.setSwapDataToNull(true);

    expect(statecoin.status).toEqual(STATECOIN_STATUS.AVAILABLE);
    expect(statecoin.swap_status).toEqual(null);
    expect(statecoin.swap_id).toEqual(null);
    expect(statecoin.swap_address).toEqual(null);
    expect(statecoin.swap_info).toEqual(null);
    expect(statecoin.swap_my_bst_data).toEqual(null);
    expect(statecoin.swap_receiver_addr).toEqual(null);
    expect(statecoin.swap_transfer_msg).toEqual(null);
    expect(statecoin.swap_batch_data).toEqual(null);
    expect(statecoin.swap_transfer_msg_3_receiver).toEqual(null);
    expect(statecoin.swap_transfer_msg_4).toEqual(null);
    expect(statecoin.ui_swap_status).toEqual(null);
    expect(statecoin.swap_error).toEqual(null);
    expect(statecoin.swap_transfer_finalized_data).toEqual(null);
  });
});

describe("ActivityLog", function () {
  let log = new ActivityLog();
  let legacy_log = new Object();
  beforeAll(() => {
    legacy_log.items = [];
    Object.values(ACTION).forEach((action, i) => {
      log.addItem(`shared_key_id_${i}`, action);
      let lli = cloneDeep(log.items.slice(-1)[0]);
      //Rename shared_key_id field to statecoin_id in legacy log
      delete Object.assign(lli, { statecoin_id: lli.shared_key_id })[
        "shared_key_id"
      ];
      legacy_log.items.push(lli);
    });
  });

  test("legacy log has statecoin_id field", () => {
    expect(legacy_log.items[0]?.statecoin_id).not.toEqual(undefined);
  });

  test("legacy log does not have shared_key_id field", () => {
    expect(legacy_log.items[0]?.shared_key_id).toEqual(undefined);
  });

  test("log has shared_key_id field", () => {
    expect(log.items[0]?.shared_key_id).not.toEqual(undefined);
  });

  test("log does not have statecoin_id field", () => {
    expect(log.items[0]?.statecoin_id).toEqual(undefined);
  });

  test("fromJSON constructs the activity log", () => {
    let result = ActivityLog.fromJSON(log);
    expect(result).toEqual(log);
  });

  test("fromJSON from LegacyActivityLog constructs the same log", () => {
    let result = ActivityLog.fromJSON(legacy_log);
    expect(result).toEqual(log);
  });

  describe("display", () => {
    let alog;
    let wallet;
    let expected_date_merged;
    const http_mock = jest.genMockFromModule("../mocks/mock_http_client");
    const wasm_mock = jest.genMockFromModule("../mocks/mock_wasm");
    beforeEach(async () => {
      wallet = await Wallet.buildMock(
        bitcoin.networks.bitcoin,
        http_mock,
        wasm_mock
      );
      wallet.statecoins.coins[0].status = STATECOIN_STATUS.SWAPPED;
      wallet.statecoins.coins[1].status = STATECOIN_STATUS.SWAPPED;
      wallet.save();

      alog = ActivityLog.fromJSON({
        items: [
          {
            shared_key_id: wallet.statecoins.coins[0].shared_key_id,
            action: "D",
            date: 1647256708087,
          },
          {
            shared_key_id: wallet.statecoins.coins[0].shared_key_id,
            action: "I",
            date: 1647256645325,
          },
          {
            shared_key_id: wallet.statecoins.coins[1].shared_key_id,
            action: "G",
            date: 1647017677534,
          },
          {
            shared_key_id: wallet.statecoins.coins[1].shared_key_id,
            action: "R",
            date: 1647017656778,
          },
          {
            shared_key_id: wallet.statecoins.coins[0].shared_key_id,
            action: "T",
            date: 1647017641542,
          },
          {
            shared_key_id: wallet.statecoins.coins[0].shared_key_id,
            action: "D",
            date: 1647017616483,
          },
          {
            shared_key_id: wallet.statecoins.coins[1].shared_key_id,
            action: "I",
            date: 1647012970643,
          },
          {
            shared_key_id: wallet.statecoins.coins[0].shared_key_id,
            action: "G",
            date: 1647007584756,
          },
          {
            shared_key_id: wallet.statecoins.coins[1].shared_key_id,
            action: "S",
            date: 1647007539901,
          },
          {
            shared_key_id: wallet.statecoins.coins[0].shared_key_id,
            action: "S",
            date: 1647007456423,
          },
          {
            shared_key_id: wallet.statecoins.coins[1].shared_key_id,
            action: "R",
            date: 1647007210579,
          },
          {
            shared_key_id: wallet.statecoins.coins[0].shared_key_id,
            action: "T",
            date: 1647007194893,
          },
          {
            shared_key_id: wallet.statecoins.coins[0].shared_key_id,
            action: "R",
            date: 1647006777365,
          },
          {
            shared_key_id: wallet.statecoins.coins[1].shared_key_id,
            action: "T",
            date: 1647006754866,
          },
          {
            shared_key_id: wallet.statecoins.coins[1].shared_key_id,
            action: "D",
            date: 1647006314736,
          },
          {
            shared_key_id: wallet.statecoins.coins[1].shared_key_id,
            action: "I",
            date: 1647006282213,
          },
        ],
      });

      expected_date_merged = [
        alog.items.slice(0, 2),
        alog.items.slice(2, alog.length),
      ];
      return wallet;
    });

    test("getActivityLogItems returns all activity log items", () => {
      wallet.activity = cloneDeep(alog);
      expect(wallet.activity).toEqual(alog);
      wallet.initActivityLogItems(alog.items.length);
      let result = wallet.getActivityLogItems();
      expect(result.length).toEqual(alog.items.length);
    });

    test("getActivityLogItems(5) returns 5 activity log items", () => {
      wallet.activity = cloneDeep(alog);
      expect(wallet.activity).toEqual(alog);
      wallet.initActivityLogItems(5);
      let result = wallet.getActivityLogItems();
      expect(result.length).toEqual(5);
    });

    test("ActivityLog.mergeActivityByDate returns the expected value", () => {
      let result = ActivityLog.mergeActivityByDate(
        cloneDeep(alog.getItems(alog.items.length))
      );
      expect(result).toEqual(expected_date_merged);
    });

    test("ActivityLog.filterDuplicates removes duplicates", () => {
      let alog_dupes = ActivityLog.fromJSON({
        items: [cloneDeep(alog.items[0])],
      });
      alog_dupes.items.push(...alog.items);
      expect(alog_dupes.items.length).toEqual(alog.items.length + 1);
      alog_dupes.items = ActivityLog.filterDuplicates(alog_dupes.items);
      expect(alog_dupes.items.length).toEqual(alog.items.length);
      expect(alog_dupes).toEqual(alog);
    });
  });
});

describe("Storage 4", () => {
  const CURRENT_VERSION = require("../../../package.json").version;
  const WALLET_NAME_6 = "test_wallet_3cb3c0b4-7679-49dd-8b23-bbc15dd09b67";
  const WALLET_NAME_6_BACKUP = `${WALLET_NAME_6}_backup`;
  const WALLET_PASSWORD_6 = "aaaaaaaa";

  let wallet_10_json;
  let wallet_10;
  clearWallet(WALLET_NAME_6);
  clearWallet(WALLET_NAME_6_BACKUP);
  let loaded_wallet;

  beforeAll(async () => {
    wallet_10_json = WALLET_V_0_7_10_JSON;
    expect(wallet_10_json.name).toEqual(WALLET_NAME_6);
    wallet_10_json.name = WALLET_NAME_6_BACKUP;
    expect(wallet_10_json.statecoins.coins.length).toEqual(7);
    expect(
      wallet_10_json.statecoins.coins.filter(
        (item) => item.status === "SWAPPED"
      ).length
    ).toEqual(2);
    const non_swapped_coins = wallet_10_json.statecoins.coins.filter(
      (item) => item.status !== "SWAPPED"
    );
    expect(non_swapped_coins.length).toEqual(5);

    const coins_nodupes = Array.from(new Set(non_swapped_coins));
    expect(coins_nodupes.length).toEqual(5);

    wallet_10 = await Wallet.loadFromBackup(
      cloneDeep(wallet_10_json),
      WALLET_PASSWORD_6,
      true
    );
    wallet_10.storage.loadStatecoins(wallet_10);

    const non_swapped_coins_json = wallet_10_json.statecoins.coins.filter(
      (item) => item.status !== "SWAPPED"
    );
    const nsj_arr = non_swapped_coins_json.map((x) => x.shared_key_id);
    const nsj_set = new Set(nsj_arr);
    expect(non_swapped_coins_json.length).toEqual(5);
    expect(wallet_10.statecoins.coins.length).toEqual(5);
    const c_set = new Set(
      wallet_10.statecoins.coins.map((x) => x.shared_key_id)
    );

    const difference = new Set([...nsj_set].filter((x) => !c_set.has(x)));
    const missing_coin = non_swapped_coins_json.filter(
      (x) => x.shared_key_id == Array.from(difference)[0]
    )[0];
    console.log(missing_coin);
    console.log(nsj_arr);
    expect(difference).toEqual(new Set());
    expect(Array.from(difference).length).toEqual(0);
    expect(wallet_10.statecoins.coins.length).toEqual(5);

    //Make a coin SWAPPED
    //wallet_10.statecoins.coins[0].status=STATECOIN_STATUS.SWAPPED

    await wallet_10.save();
    await wallet_10.saveName();

    // Saveing removes the 2 SWAPPED coins from memory
    expect(wallet_10.statecoins.coins.length).toEqual(5);

    loaded_wallet = await Wallet.load(
      WALLET_NAME_6_BACKUP,
      WALLET_PASSWORD_6,
      true
    );
    expect(loaded_wallet.statecoins.coins.length).toEqual(5);
    return loaded_wallet;
  });

  afterAll(() => {
    //Cleanup
    clearWallet(WALLET_NAME_6);
    clearWallet(WALLET_NAME_6_BACKUP);
  });

  test("load/save wallet file from version 0.7.10", async () => {
    let wallet_10_json_mod = cloneDeep(wallet_10_json);
    let wallet_10_mod = cloneDeep(wallet_10);

    delete wallet_10_mod.config.testing_mode;
    delete wallet_10_mod.config.jest_testing_mode;
    delete wallet_10_mod.account;
    delete wallet_10_json_mod.account;
    delete wallet_10_json_mod.statecoins;
    delete wallet_10_mod.statecoins;
    delete wallet_10_mod.electrum_client;
    delete wallet_10_mod.http_client;
    delete wallet_10_json_mod.http_client;
    delete wallet_10_mod.saveMutex;
    delete wallet_10_json_mod.saveMutex;
    delete wallet_10_mod.storage;

    // active value is not saved to file
    wallet_10_json_mod.active = true;

    expect(JSON.stringify(wallet_10_mod.wallet_version)).toEqual(
      JSON.stringify(wallet_10_json_mod.wallet_version)
    );

    delete wallet_10_mod.version;
    delete wallet_10_json_mod.version;
    delete wallet_10_mod.activityLogItems;
    delete wallet_10_mod.swappedStatecoinsFundingOutpointMap;

    const skipped_keys = new Set([
      "version",
      "activityLogItems",
      "swappedStatecoinsFundingOutpointMap",
      "password",
      "mnemonic",
    ]);

    expect(Object.keys(wallet_10_mod)).toEqual(Object.keys(wallet_10_json_mod));
    Object.keys(wallet_10_mod)
      .filter((key) => {
        return !skipped_keys.has(key);
      })
      .forEach((key) => {
        expect(JSON.stringify(wallet_10_mod[key])).toEqual(
          JSON.stringify(wallet_10_json_mod[key])
        );
      });

    delete loaded_wallet.backupTxUpdateLimiter;

    // Swapped coins should be removed from the coins list in the saved file
    const s1 = wallet_10.statecoins.coins.filter((item) => {
      if (item.status !== STATECOIN_STATUS.SWAPPED) {
        return item;
      }
    });

    const s1_swapped = wallet_10.statecoins.coins.filter((item) => {
      if (item.status === STATECOIN_STATUS.SWAPPED) {
        return item;
      }
    });
    expect(s1_swapped.length).toEqual(0);
    expect(s1.length).toEqual(5);
    expect(wallet_10.statecoins.coins.length).toEqual(5);

    for (let i = 0; i < 5; i++) {
      console.log(
        `${wallet_10.statecoins.coins[i]?.shared_key_id}:${loaded_wallet.statecoins.coins[i]?.shared_key_id}`
      );
    }
    expect(wallet_10.statecoins.coins.length).toEqual(
      loaded_wallet.statecoins.coins.length
    );

    //Check that the swapped coins can be retrieved
    let swapped_coins = loaded_wallet.storage.getSwappedCoins(
      loaded_wallet.name
    );
    expect(swapped_coins.length).toEqual(2);

    //Check that a single swapped coin can be retrieved
    let swapped_coin = loaded_wallet.storage.getSwappedCoin(
      WALLET_NAME_6_BACKUP,
      swapped_coins[0].shared_key_id
    );
    expect(swapped_coin).toEqual(swapped_coins[0]);

    const outPoint = {
      txid: swapped_coins[0].funding_txid,
      vout: swapped_coins[0].funding_vout,
    };
    //Check that swapped statecoin shared key ids can be retrieved from outpoints
    let shared_key_ids = loaded_wallet.storage.getSwappedIds(
      loaded_wallet.name,
      outPoint
    );
    expect(shared_key_ids).toEqual(["89ee7160-0c27-4d0a-b10c-c7c3d7637d15"]);
    //Check that swapped statecoins can be retrieved from outpoints
    let swapped_coins_by_output =
      loaded_wallet.getSwappedStatecoinsByFundingOutPoint(outPoint, 1);
    expect(swapped_coins_by_output).toEqual([swapped_coins[0]]);

    //Check that trying to retrieve a non existent coin throws an error
    expect(() => {
      loaded_wallet.storage.getSwappedCoin(WALLET_NAME_6_BACKUP, "unknownID");
    }).toThrowError(
      "No swapped statecoin with shared key ID unknownID stored."
    );

    // Remove statecoin and confirm that statecoin is removed from file
    await loaded_wallet.removeStatecoin(s1[0].shared_key_id);
    loaded_wallet = await Wallet.load(
      WALLET_NAME_6_BACKUP,
      WALLET_PASSWORD_6,
      true
    );
    expect(loaded_wallet.statecoins.coins.length).toBe(s1.length - 1);

    const outPoint2 = { txid: "NON-EXISTENT-UTXO", vout: "8" };
    // OutPoint of coin that has not been swapped before

    let swapHistory = loaded_wallet.getSwappedStatecoinsByFundingOutPoint(
      outPoint2,
      1
    );

    expect(swapHistory).toStrictEqual([]);
  });
});

describe("Storage 5", () => {
  const WALLET_NAME_7 = "test_wallet_25485aff-d332-427d-a082-8d0a8c0509a7";
  const WALLET_NAME_7_BACKUP = `${WALLET_NAME_7}_backup`;
  const WALLET_PASSWORD_7 = "aaaaaaaa";

  let wallet_10_json;
  let wallet_10;
  clearWallet(WALLET_NAME_7_BACKUP);
  let loaded_wallet;

  beforeAll(async () => {
    wallet_10_json = WALLET_V_0_7_10_JSON_2;
    expect(wallet_10_json.name).toEqual(WALLET_NAME_7);
    wallet_10_json.name = WALLET_NAME_7_BACKUP;
    //wallet_10_json.password = WALLET_PASSWORD_7
    wallet_10 = await Wallet.loadFromBackup(
      wallet_10_json,
      WALLET_PASSWORD_7,
      true
    );
    wallet_10.storage.loadStatecoins(wallet_10);

    //Make a coin SWAPPED
    //wallet_10.statecoins.coins[0].status=STATECOIN_STATUS.SWAPPED

    await wallet_10.save();
    await wallet_10.saveName();

    loaded_wallet = await Wallet.load(
      WALLET_NAME_7_BACKUP,
      WALLET_PASSWORD_7,
      true
    );
    await loaded_wallet.save();
    await loaded_wallet.saveName();
    return loaded_wallet;
  });

  afterAll(() => {
    //Cleanup
    clearWallet(WALLET_NAME_7);
    clearWallet(WALLET_NAME_7_BACKUP);
  });

  test("load/save wallet file from version 0.7.10", async () => {
    let wallet_10_json_mod = cloneDeep(wallet_10_json);
    let wallet_10_mod = cloneDeep(wallet_10);

    delete wallet_10_mod.config.testing_mode;
    delete wallet_10_mod.config.jest_testing_mode;
    delete wallet_10_mod.account;
    delete wallet_10_json_mod.account;
    delete wallet_10_json_mod.statecoins;
    delete wallet_10_mod.statecoins;
    delete wallet_10_mod.electrum_client;
    delete wallet_10_mod.http_client;
    delete wallet_10_json_mod.http_client;
    delete wallet_10_mod.saveMutex;
    delete wallet_10_json_mod.saveMutex;
    delete wallet_10_mod.storage;

    // active value is not saved to file
    wallet_10_json_mod.active = true;

    expect(JSON.stringify(wallet_10_mod.wallet_version)).toEqual(
      JSON.stringify(wallet_10_json_mod.wallet_version)
    );

    delete wallet_10_mod.version;
    delete wallet_10_json_mod.version;
    //expect(JSON.stringify(wallet_10_mod)).toEqual(JSON.stringify(wallet_10_json_mod))

    delete loaded_wallet.backupTxUpdateLimiter;

    // Swapped coins should be removed from the coins list in the saved file

    const s1 = wallet_10.statecoins.coins.filter((item) => {
      if (item.status !== STATECOIN_STATUS.SWAPPED) {
        return item;
      }
    });
    expect(wallet_10.statecoins.coins.length).toEqual(7);
    expect(s1.length).toEqual(7);

    const s1_swapped = wallet_10.statecoins.coins.filter((item) => {
      if (item.status === STATECOIN_STATUS.SWAPPED) {
        return item;
      }
    });
    const s2 = loaded_wallet.statecoins.coins;
    expect(s1_swapped.length).toEqual(0);
    const ALL_COINS_EXPECTED = wallet_10_json.statecoins.coins;
    const SWAPPED_COINS_EXPECTED = ALL_COINS_EXPECTED.filter((item) => {
      if (item.status === STATECOIN_STATUS.SWAPPED) {
        return item;
      }
    });
    const NON_SWAPPED_COINS_EXPECTED = ALL_COINS_EXPECTED.filter((item) => {
      if (item.status !== STATECOIN_STATUS.SWAPPED) {
        return item;
      }
    });
    expect(JSON.stringify(s1)).toEqual(JSON.stringify(s2));
    expect(JSON.stringify(s1)).toEqual(
      JSON.stringify(NON_SWAPPED_COINS_EXPECTED)
    );

    wallet_10.statecoins.coins = s1;
    //expect(JSON.stringify(wallet_10)).toEqual(JSON.stringify(loaded_wallet))

    //Check that the swapped coins can be retrieved
    let swapped_coins = loaded_wallet.storage.getSwappedCoins(
      loaded_wallet.name
    );
    expect(swapped_coins.length).toEqual(2);

    expect(JSON.stringify(swapped_coins)).toEqual(
      JSON.stringify(SWAPPED_COINS_EXPECTED)
    );

    //Check that a single swapped coin can be retrieved
    let swapped_coin = loaded_wallet.storage.getSwappedCoin(
      WALLET_NAME_7_BACKUP,
      swapped_coins[0].shared_key_id
    );
    expect(swapped_coin).toEqual(swapped_coins[0]);

    //Check that wallet.getStatecoin also retrieves swapped coins
    let swapped_coin_2 = loaded_wallet.getStatecoin(
      swapped_coins[0].shared_key_id
    );
    expect(swapped_coin_2).toEqual(swapped_coin);

    //Check that wallet.getStatecoin returns undefined for unknown statecoin
    expect(loaded_wallet.getStatecoin("unknown_id")).toEqual(undefined);

    const outPoint = {
      txid: swapped_coins[0].funding_txid,
      vout: swapped_coins[0].funding_vout,
    };
    //Check that swapped statecoin shared key ids can be retrieved from outpoints
    let shared_key_ids = loaded_wallet.storage.getSwappedIds(
      loaded_wallet.name,
      outPoint
    );
    expect(shared_key_ids).toEqual(["e515da8d-9c4f-47c4-a8c0-8c6d00ef860c"]);
    //Check that swapped statecoins can be retrieved from outpoints
    let swapped_coins_by_output =
      loaded_wallet.getSwappedStatecoinsByFundingOutPoint(outPoint);
    expect(swapped_coins_by_output).toEqual([swapped_coins[0]]);

    //Check that trying to retrieve a non existent coin throws an error
    expect(() => {
      loaded_wallet.storage.getSwappedCoin(WALLET_NAME_7_BACKUP, "unknownID");
    }).toThrowError(
      "No swapped statecoin with shared key ID unknownID stored."
    );

    // Remove statecoin and confirm that statecoin is removed from file
    await loaded_wallet.removeStatecoin(s1[0].shared_key_id);
    expect(loaded_wallet.statecoins.coins.length).toBe(s1.length - 1);
    loaded_wallet = await Wallet.load(
      WALLET_NAME_7_BACKUP,
      WALLET_PASSWORD_7,
      true
    );
    expect(loaded_wallet.statecoins.coins.length).toBe(s1.length - 1);

    loaded_wallet.initActivityLogItems(10);
    let activityLogItems = loaded_wallet.getActivityLogItems();
    expect(activityLogItems.length === 10);

    let logMerged = ActivityLog.mergeActivityByDate(activityLogItems);
    expect(logMerged.length === 10);

    let nSwapped = 0;
    let tableData = [];
    let finalUtxos = [];
    logMerged.map((activityGroup, groupIndex) => {
      activityGroup.map((item, index) => {
        if (item.action === "S") {
          let swappedCoins =
            loaded_wallet.getSwappedStatecoinsByFundingOutPoint({
              txid: item.funding_txid,
              vout: item.funding_txvout,
            });
          nSwapped = nSwapped + 1;
          tableData = tableData.concat(swappedCoins);
          let finalUtxo =
            swappedCoins[0]?.swap_transfer_finalized_data?.state_chain_data
              ?.utxo;
          finalUtxos.push({
            txid: finalUtxo?.txid,
            vout: finalUtxo?.vout,
          });
        }
      });
    });

    expect(loaded_wallet.statecoins.coins.length).toEqual(6);
    expect(tableData.length).toEqual(2);
    expect(tableData[1].shared_key_id).toEqual(
      "6880cb2c-5d65-4100-99d3-db9dd15c2810"
    );
    expect(tableData[0].shared_key_id).toEqual(
      "e515da8d-9c4f-47c4-a8c0-8c6d00ef860c"
    );

    // Version 10 wallets did not store the swap_transfer_finalized_data for swapped coins.
    const finalUtxosExpected = [
      {
        txid: undefined,
        vout: undefined,
      },
      {
        txid: undefined,
        vout: undefined,
      },
    ];

    expect(finalUtxos).toEqual(finalUtxosExpected);

    //Remove all coins, save and reload wallet
    let all_coins = cloneDeep(loaded_wallet.statecoins.coins);
    expect(all_coins.length).toEqual(6);

    for (let i in all_coins) {
      const coin = all_coins[i];
      let length = loaded_wallet.statecoins.coins.length;
      await loaded_wallet.removeStatecoin(coin.shared_key_id);
      expect(loaded_wallet.statecoins.coins.length).toEqual(length - 1);
    }
    expect(loaded_wallet.statecoins.coins.length).toEqual(0);
    await loaded_wallet.save();
    expect(loaded_wallet.statecoins.coins.length).toEqual(0);
    loaded_wallet = await Wallet.load(
      WALLET_NAME_7_BACKUP,
      WALLET_PASSWORD_7,
      true
    );
    // Expect zero -length arrays for statecoin data
    expect(loaded_wallet.statecoins.coins.length).toEqual(0);

    const outPoint2 = { txid: "NON-EXISTENT-UTXO".funding_txid, vout: "8" };
    // OutPoint of coin that has not been swapped before

    let swapHistory = loaded_wallet.getSwappedStatecoinsByFundingOutPoint(
      outPoint2,
      1
    );

    expect(swapHistory).toStrictEqual([]);
  });
});

describe("Storage 6", () => {
  const WALLET_NAME_8 = "test_wallet_nocoins";
  const WALLET_NAME_8_BACKUP = `${WALLET_NAME_8}_backup`;
  const WALLET_PASSWORD_8 = "aaaaaaaa";

  let wallet_nocoins_json;
  let wallet_nocoins;
  clearWallet(WALLET_NAME_8_BACKUP);
  let loaded_wallet;

  beforeAll(async () => {
    wallet_nocoins_json = WALLET_NOCOINS_JSON;
    expect(wallet_nocoins_json.name).toEqual(WALLET_NAME_8);
    wallet_nocoins_json.name = WALLET_NAME_8_BACKUP;
    wallet_nocoins = await Wallet.loadFromBackup(
      wallet_nocoins_json,
      WALLET_PASSWORD_8,
      true
    );
    wallet_nocoins.storage.loadStatecoins(wallet_nocoins);

    await wallet_nocoins.save();
    await wallet_nocoins.saveName();

    loaded_wallet = await Wallet.load(
      WALLET_NAME_8_BACKUP,
      WALLET_PASSWORD_8,
      true
    );
    return loaded_wallet;
  });

  afterAll(() => {
    //Cleanup
    clearWallet(WALLET_NAME_8);
    clearWallet(WALLET_NAME_8_BACKUP);
  });

  test("loaded wallet with no statecoins has statecoins.coins array with length 0", async () => {
    expect(loaded_wallet.statecoins.coins.length).toEqual(0);

    const outPoint = { txid: "NON-EXISTENT-UTXO", vout: "0" };
    // OutPoint of coin that has not been swapped before

    let swapHistory = loaded_wallet.getSwappedStatecoinsByFundingOutPoint(
      outPoint,
      1
    );

    expect(swapHistory).toStrictEqual([]);
  });
});
