/**
 * @jest-environment jsdom
 */


 import { decryptAES, encryptAES } from '../util';
 import TEST_WALLET from './data/test_config.json';
 const bitcoin = require("bitcoinjs-lib");
 let cloneDeep = require("lodash.clonedeep");
 import { json_wallet_to_bip32_root_account, Wallet, MAX_ACTIVITY_LOG_LENGTH } from '../wallet';
 import { StateCoinList } from '../statecoin';
 import { WALLET as WALLET_V_0_7_10_JSON } from "./data/test_wallet_3cb3c0b4-7679-49dd-8b23-bbc15dd09b67";
 import { WALLET as WALLET_V_0_7_10_JSON_2 } from "./data/test_wallet_25485aff-d332-427d-a082-8d0a8c0509a7";
 import { MOCK_WALLET_PASSWORD } from "../wallet";
 import { WebStore } from "../../application/webStore"
 import { ACTION, STATECOIN_STATUS } from '../';
import { ActivityLog, ActivityLogItem } from '../activity_log';

 const NETWORK_CONFIG = require("../../network.json");
const TEST_MNEMONIC = "tilt quantum drum quantum thunder filter tuition vapor van wear struggle master"

    // describe("setter and getter functions of wrappedStore", () => {

    //   let store = new WebStore(`WALLET_STORE_1`);

    //   test("save wallet", async function () {
    //     store.set(WALLET_V_0_7_10_JSON.name, WALLET_V_0_7_10_JSON)
    //     let walletInfo = store.get(WALLET_V_0_7_10_JSON.name);
    //     expect(walletInfo).toEqual(WALLET_V_0_7_10_JSON);
    //   });

    //   test("save login", async function () {
    //     store.set("logins." + WALLET_V_0_7_10_JSON.name, MOCK_WALLET_PASSWORD);
    //     let storeLoginPwd = store.get("logins." + WALLET_V_0_7_10_JSON.name);
    //     expect(storeLoginPwd).toEqual(MOCK_WALLET_PASSWORD);
    //   });

    //   test("save account", async function () {
    //     store.set(WALLET_V_0_7_10_JSON.name + ".account", WALLET_V_0_7_10_JSON.account)
    //     let accountInfo = store.get(WALLET_V_0_7_10_JSON.name + ".account");
    //     expect(accountInfo).toEqual(WALLET_V_0_7_10_JSON.account);
    //   });

    //   test("save activity", async function () {
    //     store.set(WALLET_V_0_7_10_JSON.name + ".activity", WALLET_V_0_7_10_JSON.activity)
    //     let activityInfo = store.get(WALLET_V_0_7_10_JSON.name + ".activity");
    //     expect(activityInfo).toEqual(WALLET_V_0_7_10_JSON.activity);
    //   });

    //   test("save statecoins", async function () {
    //     let statecoinsInfo;
    //     store.set(WALLET_V_0_7_10_JSON.name + ".statecoins", WALLET_V_0_7_10_JSON.statecoins);
    //     statecoinsInfo = store.get(WALLET_V_0_7_10_JSON.name + ".statecoins");
    //     expect(statecoinsInfo).toEqual(WALLET_V_0_7_10_JSON.statecoins);
    //   });

    //   test("save statecoin object", async function() {
    //     let statecoinObjInfo;      
    //     store.set(WALLET_V_0_7_10_JSON.name + ".statecoins_obj", WALLET_V_0_7_10_JSON_2.statecoins.coins[8]);
    //     statecoinObjInfo = store.get(WALLET_V_0_7_10_JSON.name + ".statecoins_obj." + WALLET_V_0_7_10_JSON_2.statecoins.coins[8].shared_key_id);
    //     expect(statecoinObjInfo).toEqual(WALLET_V_0_7_10_JSON_2.statecoins.coins[8]);
    //   });
    // });
 
    describe("Storing and Loading wallets in Redux", () => {
     let wallet;
 
     // Mock Wallet is used to create a Redux wallet store
     let mock_wallet;
 
     beforeEach(async () => {
       // First section of this test is to load mock electron wallet so it can be stored as redux store
 
       mock_wallet = await Wallet.buildMock();
 
       let JSON_WALLET = cloneDeep(TEST_WALLET.asdfghjkl);
       let mnemonic = decryptAES( TEST_WALLET.asdfghjkl.mnemonic, "" );
       JSON_WALLET.mnemonic = mnemonic;
 
 
       // k and map values from TEST_WALLET work correctly in Electron version
       let k_1 = TEST_WALLET.asdfghjkl.account[0].k;
       let map_1 = TEST_WALLET.asdfghjkl.account[0].map;
 
       let mapLength_1 = Object.values(map_1).length;
 
       expect(k_1+1).toBe(mapLength_1);
 
       // correct the JSON_WALLET for statecoins obj store
 
       let coins = []
       let coins_obj = JSON_WALLET.statecoins_obj
 
       if (coins_obj != null) {
           coins = coins.concat(Object.values(coins_obj));
         }
         //Remove duplicates
         coins = Array.from(new Set(coins));
 
         JSON_WALLET.statecoins = new StateCoinList();
         JSON_WALLET.statecoins.coins = coins;
 
       let k_2 = JSON_WALLET.account[0].k;
       let map_2 = JSON_WALLET.account[0].map;
 
       let mapLength_2 = Object.values(map_2).length;
 
       expect(k_2+1).toBe(mapLength_2);
 
       wallet = Wallet.fromJSON(JSON_WALLET);
 
       // Before wallet stored check account functions work correctly
       wallet.account.derive(wallet.account.chains[0].addresses[0]);
       wallet.account.nextChainAddress(0);
 
       let k = wallet.account.chains[0].k;
       let map = wallet.account.chains[0].map;
 
       let mapLength = Object.values(map).length
 
 
       expect(k+1).toBe(mapLength)
     });
     test("Account stored and loaded", async function () {
 
       // let create_json_wallet = JSON.parse(JSON.stringify(wallet))
       let accountPreStore = wallet.account;
 
       mock_wallet.storage.storeWallet( wallet );
 
       let wallet_loaded = loadWalletFromStore( TEST_WALLET.asdfghjkl.name, "", mock_wallet.storage );
 
       let accountPostStore = wallet_loaded.account;
 
       // expect(accountPostStore).toBe(accountPreStore);
 
       let account1 = wallet_loaded.account.chains[0].k;
       let map1 = wallet_loaded.account.chains[0].map;
 
       expect(account1+1).toBe(Object.values(map1).length)
 
       wallet_loaded.account.derive(wallet_loaded.account.chains[0].addresses[0]);
       wallet_loaded.account.nextChainAddress(0);
 
       let account2 = wallet_loaded.account.chains[0].k;
       let map2 = wallet_loaded.account.chains[0].map;
 
       expect(account2+1).toBe(Object.values(map2).length)
 
     });

      test("load wallet with incorrect password", async function () {
        expect(async () => {
          let _ = loadWalletFromStore(TEST_WALLET.asdfghjkl.name, " ", mock_wallet.storage);
        }).rejects.toThrow("Incorrect password.");
      });

      test("load wallet with correct password", async function () {
        let loaded_wallet = loadWalletFromStore(TEST_WALLET.asdfghjkl.name, "", mock_wallet.storage);
      
        delete loaded_wallet.backupTxUpdateLimiter;
        expect(JSON.stringify(wallet.statecoins)).toEqual(JSON.stringify(loaded_wallet.statecoins))
        delete loaded_wallet.activityLogItems;
        delete wallet.activityLogItems;
        // expect(JSON.stringify(wallet.activity.getItems())).toEqual(JSON.stringify(loaded_wallet.activity.getItems()))
        delete loaded_wallet.activity;
        delete wallet.activity;
        expect(JSON.stringify(wallet)).toEqual(JSON.stringify(loaded_wallet))

        await loaded_wallet.stop()

        await loaded_wallet.save()

        loaded_wallet = loadWalletFromStore(TEST_WALLET.asdfghjkl.name, "", mock_wallet.storage);
        delete loaded_wallet.backupTxUpdateLimiter;
        expect(JSON.stringify(wallet.statecoins)).toEqual(JSON.stringify(loaded_wallet.statecoins))
        delete loaded_wallet.activityLogItems;
        delete wallet.activityLogItems;
        // expect(JSON.stringify(wallet.activity.getItems())).toEqual(JSON.stringify(loaded_wallet.activity.getItems()))
        delete loaded_wallet.activity;
        delete wallet.activity;
        expect(JSON.stringify(wallet)).toEqual(JSON.stringify(loaded_wallet))
      });

      test('load, edit network settings, save and reload', async function () {
        //Edit the network settings
        const test_state_entity_endpoint = "test SEE"
        const test_swap_conductor_endpoint = "test SCE"
        const test_block_explorer_endpoint = "test BEE"
        const test_electrum_config = {
          host: "test EC host",
          port: 123456789,
          protocol: "tcp",
          type: "test EC type"
        }
        const test_blocks = mock_wallet.config.electrum_fee_estimation_blocks + 1
  
        mock_wallet.config.state_entity_endpoint = test_state_entity_endpoint
        mock_wallet.config.swap_conductor_endpoint = test_swap_conductor_endpoint
        mock_wallet.config.block_explorer_endpoint = test_block_explorer_endpoint
        mock_wallet.config.electrum_config = test_electrum_config
        mock_wallet.config.electrum_fee_estimation_blocks = test_blocks
  
        //Stop wallet
        await mock_wallet.stop()
  
        //Confirm settings are edited
        delete mock_wallet.backupTxUpdateLimiter;
        delete mock_wallet.activityLogItems;
        delete mock_wallet.activity;
        const wallet_mod_str = JSON.stringify(mock_wallet)
        const wallet_mod_json = JSON.parse(wallet_mod_str)
        expect(wallet_mod_json.config.state_entity_endpoint).toEqual(test_state_entity_endpoint)
        expect(wallet_mod_json.config.swap_conductor_endpoint).toEqual(test_swap_conductor_endpoint)
        expect(wallet_mod_json.config.block_explorer_endpoint).toEqual(test_block_explorer_endpoint)
        expect(wallet_mod_json.config.electrum_config).toEqual(test_electrum_config)
        expect(wallet_mod_json.config.electrum_fee_estimation_blocks).toEqual(test_blocks)
  
        //Save wallet
        await mock_wallet.save()
  
        //Confirm that the reloaded wallet has the altered settings
        let loaded_wallet = loadWalletFromStore(TEST_WALLET.asdfghjkl.name, "", mock_wallet.storage);
        delete loaded_wallet.backupTxUpdateLimiter;
        delete loaded_wallet.activityLogItems;
        delete loaded_wallet.activity;
        await mock_wallet.stop();
        const loaded_wallet_str = JSON.stringify(loaded_wallet)
        const loaded_wallet_json = JSON.parse(loaded_wallet_str)
        expect(loaded_wallet_json.electrum_fee_estimation_blocks).toEqual(wallet_mod_json.electrum_fee_estimation_blocks)
        // expect(wallet_mod_str).toEqual(loaded_wallet_str)
      });

      test('create a wallet, unload and reload', async function () {
        const WALLET_NAME_1 = "mock_e4c93acf-2f49-414f-b124-65c882eea7e8";
        let wallet = await Wallet.buildMock(bitcoin.networks.bitcoin, undefined, undefined, undefined, WALLET_NAME_1);

        await wallet.save();
        await wallet.stop();
        await wallet.save();

        let loaded_wallet = loadWalletFromStore(WALLET_NAME_1, MOCK_WALLET_PASSWORD, wallet.storage);
        expect(JSON.stringify(loaded_wallet.name)).toEqual(JSON.stringify(wallet.name))
      });

      test('create a copy of wallet, unload and reload', async function () {
        let loaded_wallet = loadWalletFromStore(TEST_WALLET.asdfghjkl.name, "", mock_wallet.storage);

        await mock_wallet.stop();
        await mock_wallet.save();

        mock_wallet.storage.storeWallet(wallet);

        await mock_wallet.save();

        let new_loaded_wallet = loadWalletFromStore(TEST_WALLET.asdfghjkl.name, "", mock_wallet.storage);
        expect(JSON.stringify(new_loaded_wallet)).toEqual(JSON.stringify(loaded_wallet))
      });

      test('create a wallet, generate coin, save wallet, load wallet', async function () {
        mock_wallet.storage.clearWallet(wallet);
        mock_wallet.storage.storeWallet(wallet);

        await mock_wallet.save();

        // generate a coin
        let [coins_before_add, _total_before] = mock_wallet.getUnspentStatecoins()
        mock_wallet.initActivityLogItems(100);
        let activity_log_before_add_length = mock_wallet.getActivityLogItems().length;
        mock_wallet.addStatecoinFromValues("861d2223-7d84-44f1-ba3e-4cd7dd418560", { public: { q: "", p2: "", p1: "", paillier_pub: {}, c_key: "", }, private: "", chain_code: "" }, 0.1, "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41", 0, "03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477", ACTION.DEPOSIT)
        let [coins_after_add, _total_after] = mock_wallet.getUnspentStatecoins();
        let activity_log_after_add_length = mock_wallet.getActivityLogItems().length;
        expect(coins_before_add.length).toEqual(coins_after_add.length - 1);
        expect(activity_log_before_add_length).toEqual(activity_log_after_add_length - 1)

        await mock_wallet.save();

        let loaded_wallet = loadWalletFromStore(TEST_WALLET.asdfghjkl.name, "", mock_wallet.storage);
        expect(loaded_wallet.statecoins.coins.length).toEqual(coins_after_add.length);
      });

      // test('create a wallet, generate coin, save wallet, load wallet', async function () {
      //   const WALLET_NAME_2 = "mock_e4c93acf-2f49-414f-b124-65c882eea7e9";
      //   let new_wallet = await Wallet.buildMock(bitcoin.networks.bitcoin, undefined, undefined, undefined, WALLET_NAME_2);

      //   await new_wallet.save();

      //   // generate a coin
      //   let [coins_before_add, _total_before] = new_wallet.getUnspentStatecoins()
      //   new_wallet.initActivityLogItems(100);
      //   let activity_log_before_add_length = new_wallet.getActivityLogItems().length;
      //   new_wallet.addStatecoinFromValues("861d2223-7d84-44f1-ba3e-4cd7dd418560", { public: { q: "", p2: "", p1: "", paillier_pub: {}, c_key: "", }, private: "", chain_code: "" }, 0.1, "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41", 0, "03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477", ACTION.DEPOSIT)
        
      //   await new_wallet.save();

      //   let [coins_after_add, _total_after] = new_wallet.getUnspentStatecoins();
      //   let activity_log_after_add_length = new_wallet.getActivityLogItems().length;
      //   expect(coins_before_add.length).toEqual(coins_after_add.length - 1);
      //   expect(activity_log_before_add_length).toEqual(activity_log_after_add_length - 1)

      //   await new_wallet.save();

      //   // console.log(new_wallet.statecoins.coins)

      //   console.log(new_wallet.storage)

      //   let loaded_wallet = loadWalletFromStore(WALLET_NAME_2, MOCK_WALLET_PASSWORD, new_wallet.storage);
      //   // console.log(loaded_wallet.statecoins.coins)
      //   expect(loaded_wallet.statecoins.coins.length).toEqual(new_wallet.statecoins.coins.length);
      // });

      test('load from backup and save', async function () {
        let wallet_encrypted = mock_wallet.storage.getWallet(TEST_WALLET.asdfghjkl.name)
        let json_wallet = JSON.parse(JSON.stringify(wallet_encrypted));
        json_wallet.name = TEST_WALLET.asdfghjkl.name + "_backup"
  
        await expect(async () => {
          let _ = await Wallet.loadFromBackup(json_wallet, " ", true)
        }).rejects.toThrow("Incorrect password.");
  
  
        await expect(async () => {
          await Wallet.loadFromBackup("", "", true)
        }).rejects.toThrow("Something went wrong with backup file!");
  
  
        let loaded_wallet_from_backup = await Wallet.loadFromBackup(json_wallet, "", true);
        delete loaded_wallet_from_backup.backupTxUpdateLimiter;
        delete json_wallet.backupTxUpdateLimiter;
        delete loaded_wallet_from_backup.activityLogItems;
        delete json_wallet.activityLogItems;
        delete loaded_wallet_from_backup.activity;
        delete json_wallet.activity;
        // expect(JSON.stringify(loaded_wallet_from_backup)).toEqual(JSON.stringify(json_wallet))
      });

      test('decrypt mnemonic', async function () {
        let wallet_encrypted = await mock_wallet.storage.getWallet(TEST_WALLET.asdfghjkl.name)
        let json_wallet = JSON.parse(JSON.stringify(wallet_encrypted));
        let mnemonic = decryptAES(json_wallet.mnemonic, "")
        expect(mnemonic).toEqual(TEST_MNEMONIC)
      });

      test('save/load swapped coins', async () => {

        const WALLET_NAME_3 = "mock_e4c93acf-2f49-414f-b124-65c882eea7f0";
    
        let wallet = await Wallet.buildMock(bitcoin.networks.bitcoin, undefined, undefined, undefined, WALLET_NAME_3);
    
        // change the first statecoin status to swapped
        let statecoin = wallet.statecoins.coins[0];
        statecoin.status = STATECOIN_STATUS.SWAPPED;
    
        // expect there to be this statecoin inside statecoin.coins
        expect(wallet.statecoins.coins.filter((coin) => coin === statecoin)[0]).toBe(statecoin);
    
        // save the wallet
        await wallet.save();
    
        // reload wallet
        let loaded_wallet = loadWalletFromStore(WALLET_NAME_3, MOCK_WALLET_PASSWORD, wallet.storage);
    
        // expect there to be no swapped coin in statecoins.coins
        expect(loaded_wallet.statecoins.coins.filter((coin) => coin.status === STATECOIN_STATUS.SWAPPED)[0]).toBe(undefined);
      });

      test('save/load activity log', async () => {

        // Adding activity logs
        mock_wallet.initActivityLogItems();
        let activity_log = mock_wallet.getActivityLogItems();
        const initial_length = 3;
        expect(activity_log.length).toEqual(initial_length);    
        const sk_id = mock_wallet.statecoins.coins[0].shared_key_id;
        //Activity log item is not added for unknown shared key id
        mock_wallet.addActivityLogItem(new ActivityLogItem("unknown_sk_id", "D"));     
        expect(mock_wallet.getActivityLogItems().length).toEqual(initial_length);
        //Activity log grows for known shared key id
        for (let i = 0; i < MAX_ACTIVITY_LOG_LENGTH - initial_length; i++){
          expect(mock_wallet.getActivityLogItems().length).toEqual(i + initial_length);
          mock_wallet.addActivityLogItem(new ActivityLogItem(sk_id, "D"));            
        }
        //Length does not exceed the maximum
        expect(mock_wallet.getActivityLogItems().length).toEqual(MAX_ACTIVITY_LOG_LENGTH);
        mock_wallet.addActivityLogItem(new ActivityLogItem(sk_id,"D"));
        expect(mock_wallet.getActivityLogItems().length).toEqual(MAX_ACTIVITY_LOG_LENGTH);
        //Objects stored correctly
        for (let i = 0; i < activity_log.length; i++) {
          expect(activity_log[i]).toEqual(expect.objectContaining(
            {
              date: expect.any(Number),
              action: expect.any(String),
              value: expect.any(Number),
              funding_txid: expect.any(String)
            }))
        }

        mock_wallet.save();
        mock_wallet.stop();

        // reload wallet
        let loaded_wallet = loadWalletFromStore(TEST_WALLET.asdfghjkl.name, "", mock_wallet.storage);
        // expect(loaded_wallet.getActivityLogItems().length).toEqual(MAX_ACTIVITY_LOG_LENGTH);
      });
    })
 
 
 
 function loadWalletFromStore(name, password, store){
 
   let wallet_loaded = store.getWalletDecrypted(name, password)
 
   wallet_loaded.password = "";
   // wallet_loaded.config.network = bitcoin.networks.bitcoin;
 
 
   let kStored = wallet_loaded.account[0].k;
   let mapStored = wallet_loaded.account[0].map;
 
   let mapLengthStored = Object.values(mapStored).length
 
   expect(kStored+1).toBe(mapLengthStored)
 
   // Now wallet is correctly loaded from redux store
   wallet_loaded = Wallet.fromJSON(wallet_loaded);
   return wallet_loaded
 }