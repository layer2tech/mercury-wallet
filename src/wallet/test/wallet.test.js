let bitcoin = require('bitcoinjs-lib')
import { Wallet, StateCoinList, ACTION, Config, STATECOIN_STATUS, BACKUP_STATUS, decryptAES } from '../';
import { segwitAddr, MOCK_WALLET_PASSWORD, MOCK_WALLET_NAME, MOCK_WALLET_MNEMONIC } from '../wallet';
import { BIP32Interface, BIP32,  fromBase58} from 'bip32';
import { ECPair, Network, Transaction } from 'bitcoinjs-lib';
import { txWithdrawBuild, txBackupBuild } from '../util';
import { addRestoredCoinDataToWallet } from '../recovery';
import { RECOVERY_DATA, RECOVERY_DATA_C_KEY_CONVERTED } from './test_data';
import  { RECOVERY_DATA_MSG_UNFINALIZED, RECOVERY_TRANSFER_FINALIZE_DATA_API,
  RECOVERY_STATECHAIN_DATA, TRANSFER_FINALIZE_DATA_FOR_RECOVERY,  
  RECOVERY_KEY_GEN_FIRST, RECOVERY_KG_PARTY_ONE_2ND_MESSAGE,
   RECOVERY_MASTER_KEY, RECOVERY_KEY_GEN_2ND_MESSAGE, 
   RECOVERY_CLIENT_RESP_KG_FIRST
} from '../mocks/mock_http_client';
import { MockElectrumClient } from "../mocks/mock_electrum";
import { Storage } from '../../store';
import { getFinalizeDataForRecovery } from '../recovery';

let cloneDeep = require('lodash.clonedeep');
let bip32 = require('bip32')

const SHARED_KEY_DUMMY = {public:{q: "",p2: "",p1: "",paillier_pub: {},c_key: "",},private: "",chain_code: ""};

// electrum mock
let electrum_mock = new MockElectrumClient;
const MOCK_WALLET_NAME_BACKUP = MOCK_WALLET_NAME+"_backup"

describe('Wallet', function() {
  let wallet = Wallet.buildMock(bitcoin.networks.bitcoin);
  wallet.storage.clearWallet(MOCK_WALLET_NAME)
  wallet.storage.clearWallet(MOCK_WALLET_NAME_BACKUP)
  wallet = Wallet.buildMock(bitcoin.networks.bitcoin);  

  describe('Storage 1', function() {
    test('save/load', async function() {
      expect(() => {
        wallet.storage.clearWallet(MOCK_WALLET_NAME)
        let _ = Wallet.load(MOCK_WALLET_NAME, MOCK_WALLET_PASSWORD, true)
      }).toThrow("No wallet called mock_e4c93acf-2f49-414f-b124-65c882eea7e7 stored.");
    
      wallet.save()

      expect(() => {
        let _ = Wallet.load(MOCK_WALLET_NAME, MOCK_WALLET_PASSWORD+" ", true);
      }).toThrow("Incorrect password.");
    
      expect(() => {
        let _ = Wallet.load(MOCK_WALLET_NAME, "", true);
      }).toThrow("Incorrect password.");

      let loaded_wallet = await Wallet.load(MOCK_WALLET_NAME, MOCK_WALLET_PASSWORD, true)
      expect(JSON.stringify(wallet)).toEqual(JSON.stringify(loaded_wallet))
    });
  });

describe('Storage 2', function() {
  test('toJSON', function() {
    let json_wallet = JSON.parse(JSON.stringify(wallet));
    let invalid_json_wallet = JSON.parse("{}");

    expect(() => {
      Wallet.fromJSON(invalid_json_wallet, true)
    }).toThrow("Cannot read property 'network' of undefined");
      
    json_wallet.password = MOCK_WALLET_PASSWORD
    // redefine password as hashing passwords is one-way
    let from_json = Wallet.fromJSON(json_wallet, true);
    // check wallets serialize to same values (since deep equal on recursive objects is messy)

    expect(JSON.stringify(from_json)).toEqual(JSON.stringify(wallet));
  });

  
  test('saveName', async function() {
    let name_store = new Storage("wallets/wallet_names");
    name_store.clearWallet(MOCK_WALLET_NAME)
    name_store.clearWallet(MOCK_WALLET_NAME_BACKUP)

    let wallet_names = name_store.getWalletNames();
    if (wallet_names.filter(w => w.name === wallet.name).length !== 0) {
      throw Error("Do not expect wallet name to be in wallet_names until saveName() is called")
    }
    wallet.saveName();
    wallet_names = name_store.getWalletNames();
    if (wallet_names.filter(w => w.name === wallet.name).length !== 1) {
      throw Error("Expect wallet name to be in wallet_names after saveName() is called")
    }
    wallet.saveName();
    wallet_names = name_store.getWalletNames();
    if (wallet_names.filter(w => w.name === wallet.name).length !== 1) {
      throw Error("Do not expect duplicates in wallet_names after saveName() is called for a second time")
    }
  })
  

  test('load from backup and save', async function() {
    let store = new Storage(`wallets/${MOCK_WALLET_NAME}/config`);
    let wallet_encrypted = store.getWallet(MOCK_WALLET_NAME)
    let json_wallet = JSON.parse(JSON.stringify(wallet_encrypted));
    json_wallet.name = MOCK_WALLET_NAME_BACKUP

    let invalid_json_wallet = JSON.parse("{}");

    
    expect(() => {
      let _ = Wallet.loadFromBackup(json_wallet, MOCK_WALLET_PASSWORD+" ", true)
    }).toThrow(Error("Incorrect password."));
    
    expect(() => {
      let _ = Wallet.loadFromBackup(json_wallet, "", true)
    }).toThrow(Error("Incorrect password."));
   
    expect(() => {
      let _ = Wallet.loadFromBackup(invalid_json_wallet, "", true)
    }).toThrow(Error("Incorrect password.")); 
    
    expect(() => {
      Wallet.loadFromBackup("", "", true)
    }).toThrow(Error("Something went wrong with backup file!")); 


    let loaded_wallet_from_backup = await Wallet.loadFromBackup(json_wallet, MOCK_WALLET_PASSWORD, true);

    loaded_wallet_from_backup.save();

    let loaded_wallet_mod = await Wallet.load(MOCK_WALLET_NAME, MOCK_WALLET_PASSWORD, true);
    expect(JSON.stringify(wallet)).toEqual(JSON.stringify(loaded_wallet_mod))

    let loaded_wallet_backup = await Wallet.load(MOCK_WALLET_NAME_BACKUP, MOCK_WALLET_PASSWORD, true);
    //The mock and mock_backup wallets should be the same except for name and storage
    loaded_wallet_mod.name=MOCK_WALLET_NAME_BACKUP;
    loaded_wallet_mod.storage=loaded_wallet_backup.storage
    expect(JSON.stringify(loaded_wallet_mod)).toEqual(JSON.stringify(loaded_wallet_backup));
    
  });

  test('decrypt mnemonic', async function() {
    let store = new Storage(`wallets/${MOCK_WALLET_NAME}/config`);
    let wallet_encrypted = store.getWallet(MOCK_WALLET_NAME)
    let json_wallet = JSON.parse(JSON.stringify(wallet_encrypted));
    let mnemonic = decryptAES(json_wallet.mnemonic, MOCK_WALLET_PASSWORD)
    expect(mnemonic).toEqual(MOCK_WALLET_MNEMONIC)
  });

  test('save coins list', async function() {
    wallet.save();
    let num_coins_before = wallet.statecoins.coins.length;

    // new coin
    wallet.addStatecoinFromValues("103d2223-7d84-44f1-ba3e-4cd7dd418560", SHARED_KEY_DUMMY, 0.1, "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41", 0, "03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477", ACTION.DEPOSIT)
    wallet.saveStateCoinsList();

    let loaded_wallet = await Wallet.load(MOCK_WALLET_NAME, MOCK_WALLET_PASSWORD, true);
    let num_coins_after = loaded_wallet.statecoins.coins.length;
    expect(num_coins_after).toEqual(num_coins_before+1)
    expect(JSON.stringify(wallet)).toEqual(JSON.stringify(loaded_wallet))
  });
});
});


  let wallet = Wallet.buildMock(bitcoin.networks.bitcoin);
  
  test('genBtcAddress', function() {
    let addr1 = wallet.genBtcAddress();
    let addr2 = wallet.genBtcAddress();
    expect(addr1).not.toEqual(addr2)
    expect(wallet.account.containsAddress(addr1))
    expect(wallet.account.containsAddress(addr2))
  });

  test('genProofKey', function() {
    let proof_key_bip32 = wallet.genProofKey();
    let bip32 = wallet.getBIP32forProofKeyPubKey(proof_key_bip32.publicKey.toString("hex"))
    // Ensure BIP32 is correclty returned
    expect(proof_key_bip32.privateKey).toEqual(bip32.privateKey)
  });

  test('getActivityLogItems', function() {
    let activity_log = wallet.getActivityLogItems(0);
    expect(activity_log.length).toBe(0)
    activity_log = wallet.getActivityLogItems(2);
    expect(activity_log.length).toBe(2)
    activity_log = wallet.getActivityLogItems(10);
    expect(activity_log.length).toBeLessThan(10)
    for (let i = 0; i < activity_log.length; i++) {
      expect(activity_log[i]).toEqual(expect.objectContaining(
        {
          date: expect.any(Number),
          action: expect.any(String),
          value: expect.any(Number),
          funding_txid: expect.any(String)
        }))
    }
  });

  test('addStatecoin', function() {
    let [coins_before_add, total_before] = wallet.getUnspentStatecoins()
    let activity_log_before_add = wallet.getActivityLogItems(100)
    wallet.addStatecoinFromValues("861d2223-7d84-44f1-ba3e-4cd7dd418560", {public:{q: "",p2: "",p1: "",paillier_pub: {},c_key: "",},private: "",chain_code: ""}, 0.1, "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41", 0, "03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477", ACTION.DEPOSIT)
    let [coins_after_add, total_after] = wallet.getUnspentStatecoins()
    let activity_log_after_add = wallet.getActivityLogItems(100)
    expect(coins_before_add.length).toEqual(coins_after_add.length - 1)
    expect(activity_log_before_add.length).toEqual(activity_log_after_add.length - 1)
  });

  describe("getCoinBackupTxData", () => {
    it('shared_key_id doesnt exist', () => {
      expect(() => {
        wallet.getCoinBackupTxData("StateCoin does not exist.");
      }).toThrowError("does not exist");
    });
  })

  describe('createBackupTxCPFP', function() {
    let cpfp_data = {selected_coin: wallet.statecoins.coins[0].shared_key_id, cpfp_addr: wallet.genBtcAddress(), fee_rate: 3};
    let cpfp_data_bad_address = {selected_coin: wallet.statecoins.coins[0].shared_key_id, cpfp_addr: "tc1aaldkjqoeihj87yuih", fee_rate: 3};
    let cpfp_data_bad_coin = {selected_coin: "c93ad45a-00b9-449c-a804-aab5530efc90", cpfp_addr: wallet.genBtcAddress(), fee_rate: 3};
    let cpfp_data_bad_fee = {selected_coin: wallet.statecoins.coins[0].shared_key_id, cpfp_addr: wallet.genBtcAddress(), fee_rate: "three"};

    let tx_backup = txWithdrawBuild(bitcoin.networks.bitcoin, "86396620a21680f464142f9743caa14111dadfb512f0eb6b7c89be507b049f42", 0, wallet.genBtcAddress(), 10000, wallet.genBtcAddress(), 10, 1)

    wallet.statecoins.coins[0].tx_backup = tx_backup.buildIncomplete();

    test('Throw on invalid value', async function() {
      expect(() => {
        wallet.createBackupTxCPFP(cpfp_data_bad_address);
      }).toThrowError('Invalid Bitcoin address entered.');
      expect(() => {
        wallet.createBackupTxCPFP(cpfp_data_bad_coin);
      }).toThrowError('No coin found with id c93ad45a-00b9-449c-a804-aab5530efc90');
      expect(() => {
        wallet.createBackupTxCPFP(cpfp_data_bad_fee);
      }).toThrowError('Fee rate not an integer');
    });

    expect(wallet.createBackupTxCPFP(cpfp_data)).toBe(true);
    expect(wallet.statecoins.coins[0].tx_cpfp.outs.length).toBe(1);
  });


describe('updateBackupTxStatus', function() {

  let wallet = Wallet.buildMock(bitcoin.networks.bitcoin);

    test('Swaplimit', async function() {
      // locktime = 1000, height = 100 SWAPLIMIT triggered
      let tx_backup = txBackupBuild(bitcoin.networks.bitcoin, "86396620a21680f464142f9743caa14111dadfb512f0eb6b7c89be507b049f42", 0, wallet.genBtcAddress(), 10000, wallet.genBtcAddress(), 10, 1000);
      wallet.statecoins.coins[0].tx_backup = tx_backup.buildIncomplete();
      wallet.block_height = 100;
      wallet.updateBackupTxStatus();
      expect(wallet.statecoins.coins[0].status).toBe(STATECOIN_STATUS.SWAPLIMIT);
    })

    test('Expired', async function() {
      // locktime = 1000, height = 1000, EXPIRED triggered
      let tx_backup = txBackupBuild(bitcoin.networks.bitcoin, "86396620a21680f464142f9743caa14111dadfb512f0eb6b7c89be507b049f42", 0, wallet.genBtcAddress(), 10000, wallet.genBtcAddress(), 10, 1000);
      wallet.statecoins.coins[1].tx_backup = tx_backup.buildIncomplete();
      wallet.block_height = 1000;
      wallet.updateBackupTxStatus();
      expect(wallet.statecoins.coins[1].status).toBe(STATECOIN_STATUS.EXPIRED);
      // verify tx in mempool
      expect(wallet.statecoins.coins[1].backup_status).toBe(BACKUP_STATUS.IN_MEMPOOL);      
    })

    test('Confirmed', async function() {
      // blockheight 1001, backup tx confirmed, coin WITHDRAWN
      let tx_backup = txBackupBuild(bitcoin.networks.bitcoin, "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41", 0, wallet.genBtcAddress(), 10000, wallet.genBtcAddress(), 10, 1000);
      wallet.statecoins.coins[1].tx_backup = tx_backup.buildIncomplete();
      wallet.block_height = 1001;
      wallet.updateBackupTxStatus();
      expect(wallet.statecoins.coins[1].status).toBe(STATECOIN_STATUS.WITHDRAWING);
      // verify tx confirmed
      expect(wallet.statecoins.coins[1].backup_status).toBe(BACKUP_STATUS.CONFIRMED); 
    })    

    test('Double spend', async function() {
      // blockheight 1001, backup tx double-spend, coin EXPIRED
      let tx_backup = txBackupBuild(bitcoin.networks.bitcoin, "01f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41", 0, wallet.genBtcAddress(), 10000, wallet.genBtcAddress(), 10, 1000);
      wallet.statecoins.coins[0].tx_backup = tx_backup.buildIncomplete();
      wallet.block_height = 1001;
      wallet.updateBackupTxStatus();
      expect(wallet.statecoins.coins[0].status).toBe(STATECOIN_STATUS.EXPIRED);
      // verify tx confirmed
      expect(wallet.statecoins.coins[0].backup_status).toBe(BACKUP_STATUS.TAKEN); 
    })    
})

describe("Statecoins/Coin", () => {
  var statecoins = Wallet.buildMock().statecoins;

  test('to/from JSON', () => {
    var json = JSON.parse(JSON.stringify(statecoins))
    let from_json = StateCoinList.fromJSON(json)
    expect(statecoins).toEqual(from_json)
  });

  test('get/remove coin', () => {
    var json = JSON.parse(JSON.stringify(statecoins))
    statecoins = StateCoinList.fromJSON(json)
    let new_shared_key_id = "861d2223-7d84-44f1-ba3e-4cd7dd418560";

    // Check new_shared_key_id not already in coins list
    expect(statecoins.coins.filter(item =>
      {if (item.shared_key_id==new_shared_key_id){return item}}).length
    ).toEqual(0)

    // Add new coin to list
    statecoins.addNewCoin(new_shared_key_id, SHARED_KEY_DUMMY);
    expect(statecoins.coins.filter(item =>
      {if (item.shared_key_id==new_shared_key_id){return item}}).length
    ).toEqual(1)

    // Remove coin from list
    statecoins.removeCoin(new_shared_key_id, false);
    expect(statecoins.coins.filter(item =>
      {if (item.shared_key_id==new_shared_key_id){return item}}).length
    ).toEqual(0)
  });

  test('try remove confirmed coin', () => {
    var json = JSON.parse(JSON.stringify(statecoins))
    statecoins = StateCoinList.fromJSON(json)
    let new_shared_key_id = "861d2223-7d84-44f1-ba3e-4cd7dd418560";
    statecoins.addNewCoin(new_shared_key_id, SHARED_KEY_DUMMY);
    let coin = statecoins.getCoin(new_shared_key_id);
    coin.setInMempool();

    // Attempt to remove coin from list
    expect(() => {
      statecoins.removeCoin(new_shared_key_id, false)
    }).toThrowError("Should not remove coin whose funding transaction has been broadcast.")
  });

  describe("getAllCoins", () => {
    it('Returns coins with correct data', () => {
      let coins = statecoins.getAllCoins();
      expect(coins.length).toBe(statecoins.coins.length)
      for (let i = 0; i < coins.length; i++) {
        expect(coins[i]).toEqual(expect.objectContaining(
          {
            shared_key_id: expect.any(String),
            value: expect.any(Number),
            funding_txid: expect.any(String),
            funding_vout: expect.any(Number),
            timestamp: expect.any(Number),
            swap_rounds: expect.any(Number),
          }))
      }
    });
  })

  describe("getUnspentCoins", () => {
    it('Returns only unspent coins with correct data', () => {
      let coins = statecoins.getAllCoins();
      let num_coins = coins.length;
      statecoins.setCoinSpent(coins[0].shared_key_id, "W") // set one spent
      expect(statecoins.getUnspentCoins().length).toBe(num_coins-1)
      expect(coins.length).toBe(statecoins.coins.length)
    });
  });

  describe("getUnconfirmedCoinsData", () => {
    it('Returns only unconfirmed coins with correct data', () => {
      let coins = statecoins.getAllCoins();
      let num_coins = coins.length;
      let coin = statecoins.getCoin(coins[0].shared_key_id);
      coin.status="UNCONFIRMED";                 // set one unconfirmed
      statecoins.setCoinFinalized(coin);
      expect(statecoins.getUnconfirmedCoins().length).toBe(num_coins-1);
      expect(coins.length).toBe(statecoins.coins.length);
    });
  });

  describe("calcExpiryDate", () => {
    it('Calculate expiry', () => {
      let coin = cloneDeep(statecoins.coins[0]);
      let tx_backup = new Transaction();
      let locktime = 24*6*30; // month locktime
      tx_backup.locktime = locktime;
      coin.tx_backup = tx_backup;
      expect(coin.getExpiryData(locktime-1)).toEqual({blocks: 1, days: 0, months: 0, confirmations:4321});            // < 1 day to go
      expect(coin.getExpiryData(locktime+1)).toEqual({blocks: 0, days: 0, months: 0, confirmations:0});          // locktime passed
      expect(coin.getExpiryData(locktime-(24*6)+1)).toEqual({blocks: (24*6)-1, days: 0, months: 0, confirmations:4179});  // 1 block from 1 day
      expect(coin.getExpiryData(locktime-(24*6))).toEqual({blocks: 24*6, days: 1, months: 0, confirmations:4178});    // 1 day
      expect(coin.getExpiryData(locktime-(2*24*6))).toEqual({blocks: 2*24*6, days: 2, months: 0, confirmations:4034});  // 2 days
      expect(coin.getExpiryData(locktime-(29*24*6))).toEqual({blocks: 29*24*6, days: 29, months: 0, confirmations:146});  // 29 days = 0 months
      expect(coin.getExpiryData(locktime-(30*24*6))).toEqual({blocks: 30*24*6, days: 30, months: 1, confirmations:2});  // 1 month
    });
    it('no backup tx', () => {
      let coin = statecoins.coins[0];
      coin.tx_backup = null
      let expiry_data = coin.getExpiryData(999);
      expect(expiry_data.blocks).toBe(-1);
    });
  });
});


describe("Config", () => {
  var config = new Config(bitcoin.networks.bitcoin, true);
  let update = {min_anon_set: 20}

  test('update', () => {
    expect(config.min_anon_set).not.toBe(20)
    config.update(update)
    expect(config.min_anon_set).toBe(20)
  });

  test('fail update invalid value', () => {
    expect(() => {  // not enough value
      config.update({invalid: ""});
    }).toThrowError("does not exist");
  })
})



describe("Recovery", () => {
  // client side's mock
  let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
  // server side's mock
  let http_mock = jest.genMockFromModule('../mocks/mock_http_client');
  let wallet = Wallet.buildMock(bitcoin.networks.bitcoin, http_mock, wasm_mock);
  wallet.statecoins.coins = [];
  wallet.genProofKey();
  wallet.genProofKey();
  

  test('run recovery', async () => {
    http_mock.post = jest.fn().mockReset()
      .mockReturnValueOnce(RECOVERY_DATA)
      .mockReturnValue([]);
    wasm_mock.convert_bigint_to_client_curv_version = jest.fn(() => RECOVERY_DATA_C_KEY_CONVERTED);

    expect(wallet.statecoins.coins.length).toBe(0);

    await addRestoredCoinDataToWallet(wallet, wasm_mock, RECOVERY_DATA);

    expect(wallet.statecoins.coins.length).toBe(1);
    expect(wallet.statecoins.coins[0].status).toBe(STATECOIN_STATUS.AVAILABLE);
    expect(wallet.statecoins.coins[0].amount).toBe(RECOVERY_DATA.amount);
  });
})

describe("Recovery unfinalized", () => {
    const MNEMONIC ="similar leader virus polar vague grunt talk flavor kitten order call blood"
    // client side's mock
    let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
    // server side's mock
    let http_mock = jest.genMockFromModule('../mocks/mock_http_client');
    let wallet = Wallet.buildMock(bitcoin.networks.bitcoin, http_mock, wasm_mock, MNEMONIC);
    wallet.statecoins.coins = [];
    wallet.genProofKey();
    wallet.genProofKey();
    for(let i=0; i<50; i++){
      wallet.account.nextChainAddress(0);
    }
    
    test('recover finalize data', async () => {
      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(RECOVERY_TRANSFER_FINALIZE_DATA_API)
        .mockReturnValueOnce(RECOVERY_STATECHAIN_DATA)
      

      expect(wallet.statecoins.coins.length).toBe(0);

      let rec = RECOVERY_DATA_MSG_UNFINALIZED

 

      let data = await getFinalizeDataForRecovery(wallet, wasm_mock, rec);

      expect(data).toEqual(TRANSFER_FINALIZE_DATA_FOR_RECOVERY)

    });

    test('recover unfinalized', async () => {
      http_mock.get = jest.fn().mockReset()
        .mockReturnValueOnce(RECOVERY_TRANSFER_FINALIZE_DATA_API)
        .mockReturnValueOnce(RECOVERY_STATECHAIN_DATA)
        
      http_mock.post = jest.fn().mockReset()
        .mockReturnValueOnce(RECOVERY_KEY_GEN_FIRST)
        .mockReturnValueOnce(RECOVERY_KG_PARTY_ONE_2ND_MESSAGE);
        
      wasm_mock.KeyGen.first_message = jest.fn(() => JSON.stringify(RECOVERY_CLIENT_RESP_KG_FIRST));
      wasm_mock.KeyGen.second_message = jest.fn(() => JSON.stringify(RECOVERY_KEY_GEN_2ND_MESSAGE));
      wasm_mock.KeyGen.set_master_key = jest.fn(() => JSON.stringify(RECOVERY_MASTER_KEY));
        
      expect(wallet.statecoins.coins.length).toBe(0);

      let rec = RECOVERY_DATA_MSG_UNFINALIZED

      await addRestoredCoinDataToWallet(wallet, wasm_mock, [rec]);
      expect(wallet.statecoins.coins.length).toBe(1);
      expect(wallet.statecoins.coins[0].status).toBe(STATECOIN_STATUS.AVAILABLE);
      expect(wallet.statecoins.coins[0].amount).toBe(RECOVERY_DATA.amount);
      
    });
})
