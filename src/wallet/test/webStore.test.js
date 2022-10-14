/**
 * @jest-environment jsdom
 */


 import { decryptAES, encryptAES } from '../util';
 import TEST_WALLET from './data/test_config.json';
 const bitcoin = require("bitcoinjs-lib");
 let cloneDeep = require("lodash.clonedeep");
 import { json_wallet_to_bip32_root_account, Wallet } from '../wallet';
 import { StateCoinList } from '../statecoin';

 
    describe("Account Breaks - Storing and Loading wallets in Redux", () => {
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


      mock_wallet.storage.storeWallet( wallet );

      let wallet_loaded = loadWalletFromStore( TEST_WALLET.asdfghjkl.name, mock_wallet.storage );

      let account1 = wallet_loaded.account.chains[0].k;
      let map1 = wallet_loaded.account.chains[0].map;

      expect(account1+1).toBe(Object.values(map1).length)

      wallet_loaded.account.derive(wallet_loaded.account.chains[0].addresses[0]);
      wallet_loaded.account.nextChainAddress(0);

      let account2 = wallet_loaded.account.chains[0].k;
      let map2 = wallet_loaded.account.chains[0].map;

      expect(account2+1).toBe(Object.values(map2).length)
 
     });
    })
 
 
 
 function loadWalletFromStore(name, store){
 
   let wallet_loaded = store.getWalletDecrypted(name, "")
 
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