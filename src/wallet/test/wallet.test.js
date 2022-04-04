let bitcoin = require('bitcoinjs-lib')
import {
  Wallet, StateCoin, StateCoinList, ACTION,
  Config, STATECOIN_STATUS, BACKUP_STATUS,
  decryptAES
} from '../';
import {
  segwitAddr, MOCK_WALLET_PASSWORD, MOCK_WALLET_NAME, MOCK_WALLET_MNEMONIC,
  mnemonic_to_bip32_root_account, getBIP32forBtcAddress, parseBackupData,
  required_fields
} from '../wallet';
import { BIP32Interface, BIP32,  fromBase58} from 'bip32';
import { ECPair, Network, Transaction, TransactionBuilder } from 'bitcoinjs-lib';
import { txWithdrawBuild, txBackupBuild, pubKeyTobtcAddr } from '../util';
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
import { assert } from 'console';
import { callGetArgsHasTestnet } from '../../features/WalletDataSlice';
import { argsHasTestnet } from '../config'
import { SWAP_STATUS } from '../swap/swap_utils';
import { ActivityLog, ActivityLogItem, LegacyActivityLog } from '../activity_log';

let log = require('electron-log');
let cloneDeep = require('lodash.clonedeep');
let bip32 = require('bip32')
let bip39 = require('bip39');

const NETWORK_CONFIG = require('../../network.json');
const SHARED_KEY_DUMMY = {public:{q: "",p2: "",p1: "",paillier_pub: {},c_key: "",},private: "",chain_code: ""};

// electrum mock
let electrum_mock = new MockElectrumClient;
const MOCK_WALLET_NAME_BACKUP = MOCK_WALLET_NAME+"_backup"

describe('Wallet', function () {
  let wallet
  beforeEach(async () => {
    wallet = await Wallet.buildMock(bitcoin.networks.bitcoin);
    wallet.storage.clearWallet(MOCK_WALLET_NAME)
    wallet.storage.clearWallet(MOCK_WALLET_NAME_BACKUP)
    wallet = await Wallet.buildMock(bitcoin.networks.bitcoin);
    wallet.save()
  })


  test('genBtcAddress', async function () {
    let addr1 = await wallet.genBtcAddress();
    let addr2 = await wallet.genBtcAddress();
    expect(addr1).not.toEqual(addr2)
    expect(wallet.account.containsAddress(addr1))
    expect(wallet.account.containsAddress(addr2))
  });

  test('genProofKey', async function () {
    let proof_key_bip32 = await wallet.genProofKey();
    let bip32 = wallet.getBIP32forProofKeyPubKey(proof_key_bip32.publicKey.toString("hex"))
    // Ensure BIP32 is correclty returned
    expect(proof_key_bip32.privateKey).toEqual(bip32.privateKey)
    let addr_unknown = 'bc1qglel9v4uqxdzw05s3l0mdn9vdh6rdlv7pfnlfu'
    //Check that an error is thrown for an unknown address
    expect(() => { wallet.getBIP32forBtcAddress(addr_unknown) }).
      toThrowError(`getBIP32forBtcAddress - did not find address ${addr_unknown} in wallet.account`)
  });

  test('getActivityLogItems', function () {
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

  test('getActivityLogItems', function () {
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

  test('addStatecoin', function () {
    let [coins_before_add, total_before] = wallet.getUnspentStatecoins()
    let activity_log_before_add = wallet.getActivityLogItems(100)
    wallet.addStatecoinFromValues("861d2223-7d84-44f1-ba3e-4cd7dd418560", { public: { q: "", p2: "", p1: "", paillier_pub: {}, c_key: "", }, private: "", chain_code: "" }, 0.1, "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41", 0, "03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477", ACTION.DEPOSIT)
    let [coins_after_add, total_after] = wallet.getUnspentStatecoins()
    let activity_log_after_add = wallet.getActivityLogItems(100)
    expect(coins_before_add.length).toEqual(coins_after_add.length - 1)
    expect(activity_log_before_add.length).toEqual(activity_log_after_add.length - 1)
  });

  test('Set confirmed', async function () {
    let statecoin = new StateCoin("001d2223-7d84-44f1-ba3e-4cd7dd418560", "003ad45a-00b9-449c-a804-aab5530efc90");
    statecoin.proof_key = "aaaaaaaad651cd921fc490a6691f0dd1dcbf725510f1fbd80d7bf7abdfef7fea0e";
    statecoin.block = 10;
    statecoin.tx_backup = new Transaction();
    let list = [statecoin];
    wallet.block_height = 20;
    wallet.statecoins.addCoin(statecoin);
    wallet.checkUnconfirmedCoinsStatus(list);

    expect(wallet.statecoins.coins[0].status).toBe(STATECOIN_STATUS.AVAILABLE)
  });

  describe('Storage 1', function() {
    test('save/load', async function() {
      expect(() => {
        wallet.storage.clearWallet(MOCK_WALLET_NAME)
        let _ = Wallet.load(MOCK_WALLET_NAME, MOCK_WALLET_PASSWORD, true)
      }).toThrow("No wallet called mock_e4c93acf-2f49-414f-b124-65c882eea7e7 stored.");
    
      await wallet.save()

      expect(() => {
        let _ = Wallet.load(MOCK_WALLET_NAME, MOCK_WALLET_PASSWORD+" ", true);
      }).toThrow("Incorrect password.");
    
      expect(() => {
        let _ = Wallet.load(MOCK_WALLET_NAME, "", true);
      }).toThrow("Incorrect password.");

      let loaded_wallet = await Wallet.load(MOCK_WALLET_NAME, MOCK_WALLET_PASSWORD, true)
      expect(JSON.stringify(wallet)).toEqual(JSON.stringify(loaded_wallet))
    });
  
    test('load, edit network settings, save and reload', async function () {
      //Check we are in mainnet mode
      expect(callGetArgsHasTestnet()).toEqual(true)
      expect(argsHasTestnet()).toEqual(true)

      //Check the default network settings
      expect(wallet.config.state_entity_endpoint).toEqual(NETWORK_CONFIG.testnet_state_entity_endpoint)
      expect(wallet.config.swap_conductor_endpoint).toEqual(NETWORK_CONFIG.testnet_swap_conductor_endpoint)
      expect(wallet.config.block_explorer_endpoint).toEqual(NETWORK_CONFIG.testnet_block_explorer_endpoint)
      expect(wallet.config.electrum_config).toEqual(NETWORK_CONFIG.testnet_electrum_config)

      //Edit the network settings
      const test_state_entity_endpoint = "test SEE"
      const test_swap_conductor_endpoint = "test SCE"
      const test_block_explorer_endpoint = "test BEE"
      const test_electrum_config = {
        host: "test EC host",
        port: 123456789,
        protocol: "test EC protocol",
        type: "test EC type"
      }
      const test_blocks = wallet.config.electrum_fee_estimation_blocks + 1

      wallet.config.state_entity_endpoint = test_state_entity_endpoint
      wallet.config.swap_conductor_endpoint = test_swap_conductor_endpoint
      wallet.config.block_explorer_endpoint = test_block_explorer_endpoint
      wallet.config.electrum_config = test_electrum_config
      wallet.config.electrum_fee_estimation_blocks = test_blocks

      //Confirm settings are edited
      const wallet_mod_str = JSON.stringify(wallet)
      const wallet_mod_json = JSON.parse(wallet_mod_str)
      expect(wallet_mod_json.config.state_entity_endpoint).toEqual(test_state_entity_endpoint)
      expect(wallet_mod_json.config.swap_conductor_endpoint).toEqual(test_swap_conductor_endpoint)
      expect(wallet_mod_json.config.block_explorer_endpoint).toEqual(test_block_explorer_endpoint)
      expect(wallet_mod_json.config.electrum_config).toEqual(test_electrum_config)
      expect(wallet_mod_json.config.electrum_fee_estimation_blocks).toEqual(test_blocks)

      await wallet.save()

      //Confirm that the reloaded wallet has the altered settings
      let loaded_wallet = await Wallet.load(MOCK_WALLET_NAME, MOCK_WALLET_PASSWORD, true)
      const loaded_wallet_str = JSON.stringify(loaded_wallet)
      const loaded_wallet_json = JSON.parse(loaded_wallet_str)
      expect(loaded_wallet_json.electrum_fee_estimation_blocks).toEqual(wallet_mod_json.electrum_fee_estimation_blocks)
      expect(wallet_mod_str).toEqual(loaded_wallet_str)
    });

    test('load, edit network settings, unload and reload', async function () {
      //Check we are in mainnet mode
      expect(callGetArgsHasTestnet()).toEqual(true)
      expect(argsHasTestnet()).toEqual(true)

      //Check the default network settings
      expect(wallet.config.state_entity_endpoint).toEqual(NETWORK_CONFIG.testnet_state_entity_endpoint)
      expect(wallet.config.swap_conductor_endpoint).toEqual(NETWORK_CONFIG.testnet_swap_conductor_endpoint)
      expect(wallet.config.block_explorer_endpoint).toEqual(NETWORK_CONFIG.testnet_block_explorer_endpoint)
      expect(wallet.config.electrum_config).toEqual(NETWORK_CONFIG.testnet_electrum_config)

      //Edit the network settings
      const test_state_entity_endpoint = "test SEE"
      const test_swap_conductor_endpoint = "test SCE"
      const test_block_explorer_endpoint = "test BEE"
      const test_electrum_config = {
        host: "test EC host",
        port: 123456789,
        protocol: "test EC protocol",
        type: "test EC type"
      }
      const test_blocks = wallet.config.electrum_fee_estimation_blocks + 1

      wallet.config.state_entity_endpoint = test_state_entity_endpoint
      wallet.config.swap_conductor_endpoint = test_swap_conductor_endpoint
      wallet.config.block_explorer_endpoint = test_block_explorer_endpoint
      wallet.config.electrum_config = test_electrum_config
      wallet.config.electrum_fee_estimation_blocks = test_blocks

      //Confirm settings are edited
      const wallet_mod_str = JSON.stringify(wallet)
      const wallet_mod_json = JSON.parse(wallet_mod_str)
      expect(wallet_mod_json.config.state_entity_endpoint).toEqual(test_state_entity_endpoint)
      expect(wallet_mod_json.config.swap_conductor_endpoint).toEqual(test_swap_conductor_endpoint)
      expect(wallet_mod_json.config.block_explorer_endpoint).toEqual(test_block_explorer_endpoint)
      expect(wallet_mod_json.config.electrum_config).toEqual(test_electrum_config)
      expect(wallet_mod_json.config.electrum_fee_estimation_blocks).toEqual(test_blocks)

      await wallet.unload()

      //Confirm that the reloaded wallet has the altered settings
      let loaded_wallet = await Wallet.load(MOCK_WALLET_NAME, MOCK_WALLET_PASSWORD, true)
      const loaded_wallet_str = JSON.stringify(loaded_wallet)
      const loaded_wallet_json = JSON.parse(loaded_wallet_str)
      expect(loaded_wallet_json.electrum_fee_estimation_blocks).toEqual(wallet_mod_json.electrum_fee_estimation_blocks)
      expect(wallet_mod_str).toEqual(loaded_wallet_str)
    });
  
  });

  describe('segwitAddr', function () {
    let publicKeyStr = "027d73eafd92135741e28ce14e240ec2c5fdeb3ae8c123eafad774af277372bb5f"
    let addr_expected = 'bc1qglel9v4uqxdzw05s3l0mdn9vdh6rdlv7pfnlfu'
    let publicKey = Buffer.from(publicKeyStr, "hex")
    let network = bitcoin.networks.bitcoin
    let node1 = { publicKey: publicKey, network: network }
    let node2 = { network: network }
    let node3 = { publicKey: publicKey }

    test('node and network 1', function () {
      expect(`${segwitAddr(node3, network)}`).toEqual(addr_expected)
    })

    test('node and network 2', function () {
      expect(`${segwitAddr(node1, network)}`).toEqual(addr_expected)
    })

    test('node only. node includes network', function () {
      expect(`${segwitAddr(node1)}`).toEqual(addr_expected)
    })

    test('node only. pubkey undefined', function () {
      expect(() => { segwitAddr(node2) }).toThrow(Error(`wallet::segwitAddr: node.publicKey is ${undefined}`))
    })

    test('node only. network undefined', function () {
      expect(`${segwitAddr(node3)}`).toEqual(addr_expected)
    });
  
  })

  describe('bitcoin.address.fromOutputScript', function () {
    const http_mock = jest.genMockFromModule('../mocks/mock_http_client');
    const tx_backup = bitcoin.Transaction.fromHex(http_mock.TRANSFER_MSG3.tx_backup_psm.tx_hex);
    const addr_expected = "bc1qpdkj645a5zdpyq069n2syexkfwhuj5xda665q8"
    
    let network = bitcoin.networks.bitcoin
    test('Address from output script in bitcoin network', function () {
      let result = bitcoin.address.fromOutputScript(tx_backup.outs[0].script, network);
      expect(`${result}`).toEqual(addr_expected)
    })

    test('Address from output script for undefined network defaults to bitcoin network', function () {
      let result = bitcoin.address.fromOutputScript(tx_backup.outs[0].script, undefined);
      expect(`${result}`).toEqual(addr_expected)
    })

    test('Address from output script for undefined network does not default to testnet network', function () {
      let result = bitcoin.address.fromOutputScript(tx_backup.outs[0].script, undefined);
      let result_testnet = bitcoin.address.fromOutputScript(tx_backup.outs[0].script, bitcoin.networks.testnet);
      expect(`${result}`).not.toEqual(`${result_testnet}`)
    })

  })

  describe('bitcoin.ECPair.fromWIF', function () {
    const key_wif_mainnet = "5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ"
    const key_wif_testnet = "cTeNuT47BPk9P27coXveNQr4XyC4WMePhjAaazj4DbM14oyknYfB"
    let ecpair_mainnet = bitcoin.ECPair.fromWIF(key_wif_mainnet, bitcoin.networks.bitcoin)
    let ecpair_undefined = bitcoin.ECPair.fromWIF(key_wif_mainnet, undefined)
    let ecpair_testnet = bitcoin.ECPair.fromWIF(key_wif_testnet, bitcoin.networks.testnet)

    test('ECPair from WIF for undefined network', function () {
      expect(ecpair_mainnet).toEqual(ecpair_undefined)
    })

    test('ECPair from WIF for testnet network', function () {
      expect(ecpair_testnet).not.toEqual(ecpair_undefined)
    })
  })

  describe('TransactionBuilder', function () {
    test('TransactionBuilder for undefined network', function () {
      expect(new TransactionBuilder(bitcoin.networks.bitcoin))
        .toEqual(new TransactionBuilder(undefined))
    })

    test('TransactionBuilder for testnet network', function () {
      expect(new TransactionBuilder(bitcoin.networks.testnet))
        .not.toEqual(new TransactionBuilder(undefined))
    })
  })
  
  describe('addr_p2pkh', function () {
    let publicKeyStr = "027d73eafd92135741e28ce14e240ec2c5fdeb3ae8c123eafad774af277372bb5f"
    let publicKey = Buffer.from(publicKeyStr, "hex")
    let addr_expected = "17ZTDRm8sfy4zcemX8F8nB5TJCvVD6JcJT"
    
    test('addr_p2pkh for bitcoin network', function () {
      console.log(`p2pkh_addr_expected = ${addr_expected}`)
      expect(bitcoin.payments.p2pkh({
        pubkey: publicKey,
        network: bitcoin.networks.network
      }).address).toEqual(addr_expected)
    })

    test('addr_p2pkh for undefined network', function () {
      expect(bitcoin.networks.bitcoin).not.toEqual(undefined)
      console.log(`p2pkh_addr_expected = ${addr_expected}`)
      expect(bitcoin.payments.p2pkh({
        pubkey: publicKey,
        network: undefined
      }).address).toEqual(addr_expected)
    })
  })
  
  describe('bip32 from mnemonic', function () {
    const seed = bip39.mnemonicToSeedSync(MOCK_WALLET_MNEMONIC);
    const root = bip32.fromSeed(seed, bitcoin.networks.bitcoin);
    const root_undef = bip32.fromSeed(seed, undefined);
    const root_testnet = bip32.fromSeed(seed, bitcoin.networks.testnet);

    test('bip32 root for undefined network', function () {
      expect(root_undef).toEqual(root)
    })

    test('bip32 root for testnet network', function () {
      expect(root_testnet).not.toEqual(root)
    })
  })

  describe('pubKeyToBtcAddr', function () {
    let publicKeyStr = "027d73eafd92135741e28ce14e240ec2c5fdeb3ae8c123eafad774af277372bb5f"
    let addr_expected = 'bc1qglel9v4uqxdzw05s3l0mdn9vdh6rdlv7pfnlfu'
  
    test('Address from pubKeyToBtcAddr for bitcoin network', function () {
      expect(`${pubKeyTobtcAddr(publicKeyStr, bitcoin.networks.bitcoin)}`)
        .toEqual(addr_expected)
    })

    test('Address from pubKeyToBtcAddr for undefined network', function () {
      expect(bitcoin.networks['bitcoin']).toEqual(bitcoin.networks.bitcoin)
      expect(bitcoin.networks['bitcoin']).not.toEqual(undefined)
      expect(`${pubKeyTobtcAddr(publicKeyStr, undefined)}`)
        .toEqual(addr_expected)
    })
  })


  describe('Storage 2', function () {
    let wallet
    beforeEach(async () => {
        wallet = await Wallet.buildMock(bitcoin.networks.bitcoin);
        wallet.storage.clearWallet(MOCK_WALLET_NAME)
        wallet.storage.clearWallet(MOCK_WALLET_NAME_BACKUP)
        wallet = await Wallet.buildMock(bitcoin.networks.bitcoin);
        await wallet.save();      
    })
    
    test('toJSON', function () {
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

  
    test('saveName', async function () {
      let name_store = new Storage("wallets/wallet_names");
      name_store.clearWallet(MOCK_WALLET_NAME)
      name_store.clearWallet(MOCK_WALLET_NAME_BACKUP)

      let wallet_names = name_store.getWalletNames();
      if (wallet_names.filter(w => w.name === wallet.name).length !== 0) {
        throw Error("Do not expect wallet name to be in wallet_names until saveName() is called")
      }
      await wallet.saveName();
      wallet_names = name_store.getWalletNames();
      if (wallet_names.filter(w => w.name === wallet.name).length !== 1) {
        throw Error("Expect wallet name to be in wallet_names after saveName() is called")
      }
      await wallet.saveName();
      wallet_names = name_store.getWalletNames();
      if (wallet_names.filter(w => w.name === wallet.name).length !== 1) {
        throw Error("Do not expect duplicates in wallet_names after saveName() is called for a second time")
      }
    })
  
    describe('parseBackupData', function () {
      let json_wallet
      beforeAll(async () => {
        let wallet = await Wallet.buildMock(bitcoin.networks.bitcoin);
        wallet.storage.clearWallet(MOCK_WALLET_NAME)
        wallet.storage.clearWallet(MOCK_WALLET_NAME_BACKUP)
        wallet = await Wallet.buildMock(bitcoin.networks.bitcoin);
        await wallet.save()
        let store = new Storage(`wallets/${MOCK_WALLET_NAME}/config`);
        let wallet_encrypted = store.getWallet(MOCK_WALLET_NAME)
        json_wallet = JSON.stringify(wallet_encrypted)
      })

      required_fields.forEach((field) => {
        test(`missing required field ${field} results in an error`, () => {
          let wallet = JSON.parse(json_wallet);
          delete wallet[field]
          expect(wallet[field]).toEqual(undefined)
          expect(() => { parseBackupData(JSON.stringify(wallet)) }).
            toThrowError(`parsing wallet backup data: invalid: missing field \"${field}\"`)
        })
      })

      test(`incorrect wallet format results in an error`, () => {
        expect(() => { parseBackupData("*") }).
          toThrowError(`parsing wallet backup data: Unexpected token * in JSON at position 0`)
      })
    })

    test('load from backup and save', async function () {
      let store = new Storage(`wallets/${MOCK_WALLET_NAME}/config`);
      let wallet_encrypted = store.getWallet(MOCK_WALLET_NAME)
      let json_wallet = JSON.parse(JSON.stringify(wallet_encrypted));
      json_wallet.name = MOCK_WALLET_NAME_BACKUP

      expect(() => {
        let _ = Wallet.loadFromBackup(json_wallet, MOCK_WALLET_PASSWORD + " ", true)
      }).toThrow("Incorrect password.");

      expect(() => {
        let _ = Wallet.loadFromBackup(json_wallet, "", true)
      }).toThrow("Incorrect password.");

    
      expect(() => {
        Wallet.loadFromBackup("", "", true)
      }).toThrow("Something went wrong with backup file!");


      let loaded_wallet_from_backup = await Wallet.loadFromBackup(json_wallet, MOCK_WALLET_PASSWORD, true);

      await loaded_wallet_from_backup.save();

      let loaded_wallet_mod = await Wallet.load(MOCK_WALLET_NAME, MOCK_WALLET_PASSWORD, true);
      expect(JSON.stringify(wallet)).toEqual(JSON.stringify(loaded_wallet_mod))

      let loaded_wallet_backup = await Wallet.load(MOCK_WALLET_NAME_BACKUP, MOCK_WALLET_PASSWORD, true);
      //The mock and mock_backup wallets should be the same except for name and storage
      loaded_wallet_mod.name = MOCK_WALLET_NAME_BACKUP;
      loaded_wallet_mod.storage = loaded_wallet_backup.storage
      expect(JSON.stringify(loaded_wallet_mod)).toEqual(JSON.stringify(loaded_wallet_backup));
    });

    test('decrypt mnemonic', async function () {
      let store = new Storage(`wallets/${MOCK_WALLET_NAME}/config`);
      let wallet_encrypted = store.getWallet(MOCK_WALLET_NAME)
      let json_wallet = JSON.parse(JSON.stringify(wallet_encrypted));
      console.log(`json wallet: ${JSON.stringify(json_wallet)}`)
      let mnemonic = decryptAES(json_wallet.mnemonic, MOCK_WALLET_PASSWORD)
      expect(mnemonic).toEqual(MOCK_WALLET_MNEMONIC)
    });

    test('save coins list', async function () {
      let num_coins_before = wallet.statecoins.coins.length;

      // new coin
      wallet.addStatecoinFromValues("103d2223-7d84-44f1-ba3e-4cd7dd418560", SHARED_KEY_DUMMY, 0.1, "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41", 0, "03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477", ACTION.DEPOSIT)
      await wallet.saveStateCoinsList();

      let loaded_wallet = await Wallet.load(MOCK_WALLET_NAME, MOCK_WALLET_PASSWORD, true);
      let num_coins_after = loaded_wallet.statecoins.coins.length;
      expect(num_coins_after).toEqual(num_coins_before + 1)
      expect(JSON.stringify(wallet)).toEqual(JSON.stringify(loaded_wallet))
    });
  });
  
  
});
  
describe("getCoinBackupTxData", () => {
  it('shared_key_id doesnt exist', async () => {
      let wallet = await Wallet.buildMock(bitcoin.networks.bitcoin);
      expect(() => {
        wallet.getCoinBackupTxData("StateCoin does not exist.");
      }).toThrowError("does not exist");
    });
})

describe('createBackupTxCPFP', function () {
  let wallet
  let cpfp_data
  let cpfp_data_bad_address
  let cpfp_data_bad_coin
  let cpfp_data_bad_fee
  let tx_backup
  beforeAll(async () => {
    wallet = await Wallet.buildMock(bitcoin.networks.bitcoin);
    cpfp_data = {selected_coin: wallet.statecoins.coins[0].shared_key_id, cpfp_addr: await wallet.genBtcAddress(), fee_rate: 3};
    cpfp_data_bad_address = {selected_coin: wallet.statecoins.coins[0].shared_key_id, cpfp_addr: "tc1aaldkjqoeihj87yuih", fee_rate: 3};
    cpfp_data_bad_coin = {selected_coin: "c93ad45a-00b9-449c-a804-aab5530efc90", cpfp_addr: await wallet.genBtcAddress(), fee_rate: 3};
    cpfp_data_bad_fee = {selected_coin: wallet.statecoins.coins[0].shared_key_id, cpfp_addr: await wallet.genBtcAddress(), fee_rate: "three"};  
    tx_backup = txWithdrawBuild(bitcoin.networks.bitcoin, "86396620a21680f464142f9743caa14111dadfb512f0eb6b7c89be507b049f42", 0, await wallet.genBtcAddress(), 10000, await wallet.genBtcAddress(), 10, 1)
    wallet.statecoins.coins[0].tx_backup = tx_backup.buildIncomplete();  
  })
    
    test('Throw on invalid value', async function() {
      await expect(wallet.createBackupTxCPFP(cpfp_data_bad_address)).
        rejects.toThrowError('Invalid Bitcoin address entered.');
      await expect(wallet.createBackupTxCPFP(cpfp_data_bad_coin)).
        rejects.toThrowError('No coin found with id c93ad45a-00b9-449c-a804-aab5530efc90');
      await expect(wallet.createBackupTxCPFP(cpfp_data_bad_fee)).
        rejects.toThrowError('Fee rate not an integer');
    });
    
  test('createdBackupTxCPFP valid', async function () {
      const tx_cpfp_expected = "{\"version\":2,\"locktime\":0,\"ins\":[{\"hash\":{\"type\":\"Buffer\",\"data\":[107,245,5,137,241,80,23,28,183,252,131,220,83,180,180,95,165,245,238,183,114,192,141,211,50,46,35,131,211,5,156,74]},\"index\":0,\"script\":{\"type\":\"Buffer\",\"data\":[]},\"sequence\":4294967295,\"witness\":[{\"type\":\"Buffer\",\"data\":[48,69,2,33,0,157,63,93,156,188,198,179,60,185,242,248,163,35,202,173,37,23,138,126,145,195,29,58,94,101,237,138,250,240,107,14,247,2,32,52,31,26,192,111,251,159,117,192,140,105,104,85,156,163,103,154,90,49,209,68,125,90,146,56,65,232,90,229,119,39,101,1]},{\"type\":\"Buffer\",\"data\":[3,214,96,240,27,83,235,26,229,172,212,94,11,164,20,16,104,4,44,105,22,118,111,177,140,62,233,71,15,87,226,220,153]}]}],\"outs\":[{\"script\":{\"type\":\"Buffer\",\"data\":[0,20,209,156,183,190,243,118,6,191,242,108,152,143,199,152,107,105,153,65,44,222]},\"value\":9155}]}"
      await expect(wallet.createBackupTxCPFP(cpfp_data)).resolves.toBe(true);
      expect(wallet.statecoins.coins[0].tx_cpfp.outs.length).toBe(1);
      expect(JSON.stringify(wallet.statecoins.coins[0].tx_cpfp)).toEqual(tx_cpfp_expected);      
    })
});
  
describe('updateBackupTxStatus', function () {

  let wallet
  beforeAll(async () => {
    wallet = await Wallet.buildMock(bitcoin.networks.bitcoin);
  })
    
  test('Swaplimit', async function () {
    // locktime = 1000, height = 100 SWAPLIMIT triggered
    let tx_backup = txBackupBuild(bitcoin.networks.bitcoin, "86396620a21680f464142f9743caa14111dadfb512f0eb6b7c89be507b049f42", 0, await wallet.genBtcAddress(), 10000, await wallet.genBtcAddress(), 10, 1000);
    wallet.statecoins.coins[0].tx_backup = tx_backup.buildIncomplete();
    wallet.block_height = 100;
    wallet.updateBackupTxStatus();
    expect(wallet.statecoins.coins[0].status).toBe(STATECOIN_STATUS.SWAPLIMIT);
  })

  test('Expired', async function () {
    // locktime = 1000, height = 1000, EXPIRED triggered
    let tx_backup = txBackupBuild(bitcoin.networks.bitcoin, "86396620a21680f464142f9743caa14111dadfb512f0eb6b7c89be507b049f42", 0, await wallet.genBtcAddress(), 10000, await wallet.genBtcAddress(), 10, 1000);
    wallet.statecoins.coins[1].tx_backup = tx_backup.buildIncomplete();
    wallet.block_height = 1000;
    wallet.updateBackupTxStatus();
    expect(wallet.statecoins.coins[1].status).toBe(STATECOIN_STATUS.EXPIRED);
    // verify tx in mempool
    expect(wallet.statecoins.coins[1].backup_status).toBe(BACKUP_STATUS.IN_MEMPOOL);
  })

  test('Confirmed', async function () {
    // blockheight 1001, backup tx confirmed, coin WITHDRAWN
    let tx_backup = txBackupBuild(bitcoin.networks.bitcoin, "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41", 0, await wallet.genBtcAddress(), 10000, await wallet.genBtcAddress(), 10, 1000);
    wallet.statecoins.coins[1].tx_backup = tx_backup.buildIncomplete();
    wallet.block_height = 1001;
    wallet.updateBackupTxStatus();
    expect(wallet.statecoins.coins[1].status).toBe(STATECOIN_STATUS.WITHDRAWN);
    // verify tx confirmed
    expect(wallet.statecoins.coins[1].backup_status).toBe(BACKUP_STATUS.CONFIRMED);
  })

  test('Double spend', async function () {
    // blockheight 1001, backup tx double-spend, coin EXPIRED
    let tx_backup = txBackupBuild(bitcoin.networks.bitcoin, "01f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41", 0, await wallet.genBtcAddress(), 10000, await wallet.genBtcAddress(), 10, 1000);
    wallet.statecoins.coins[0].tx_backup = tx_backup.buildIncomplete();
    wallet.block_height = 1001;
    wallet.updateBackupTxStatus();
    expect(wallet.statecoins.coins[0].status).toBe(STATECOIN_STATUS.EXPIRED);
    // verify tx confirmed
    expect(wallet.statecoins.coins[0].backup_status).toBe(BACKUP_STATUS.TAKEN);
  })
})

describe("Statecoins/Coin", () => {
  let statecoins
  beforeAll(async () => {
    statecoins = (await Wallet.buildMock()).statecoins;
  })

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

  

  test('expect update invalid value to log a warning', () => {
    const logWarnSpy = jest.spyOn(log, 'warn')
    config.update({invalid: ""});
    expect(logWarnSpy).toHaveBeenCalled()
  })

  test('expect update of non-connection values to return \'false\'', () => {
    let update = config.getConfig()
    update.testing_mode = !config.testing_mode
    update.jest_testing_mode = !config.jest_testing_mode
    update.required_confirmations = config.required_confirmations + 1
    update.electrum_fee_estimation_blocks = config.electrum_fee_estimation_blocks + 1
    update.min_anon_set = config.min_anon_set + 1
    update.notifications = !config.notifications
    update.singleSwapMode = !config.singleSwapMode
    update.tutorials = !config.tutorials
    update.swapLimit = config.swapLimit + 1
    expect(config.update(update)).toEqual(false)
  })
    
  test('expect update of connection values to return \'true\'', () => {
    let update = config.getConfig()
    update.electrum_config.type = `${config.type}_edited`
    expect(config.update(update)).toEqual(true)
  })

})



describe("Recovery", () => {
  // client side's mock
  let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
  // server side's mock
  let http_mock = jest.genMockFromModule('../mocks/mock_http_client');
  let wallet
  beforeAll(async () => {
    wallet = await Wallet.buildMock(bitcoin.networks.bitcoin, http_mock, wasm_mock);
    wallet.statecoins.coins = [];
    await wallet.genProofKey();
    await wallet.genProofKey();    
  })

  

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
  let wallet
  beforeAll(async () => {
    wallet = await Wallet.buildMock(bitcoin.networks.bitcoin, http_mock, wasm_mock, MNEMONIC);
    wallet.statecoins.coins = [];
    await wallet.genProofKey();
    await wallet.genProofKey();
    for(let i=0; i<50; i++){
      wallet.account.nextChainAddress(0);
    }
  })
    
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

describe("bip32", () => {
  const MNEMONIC = "similar leader virus polar vague grunt talk flavor kitten order call blood"
  const addresses = ["bc1qmn8ce5fcmkj58df76r7tvey6hgq3w0xzm3awe8",
    "bc1qqjv602v04glax49h2s46jwp5jhqta4pe8w3k8a",
    "bc1qs0l8u9xnk4rdr20wvjdwsd5jjrgj7lxhptw6u0"]
  let account
 
  beforeEach(() => {
    account = mnemonic_to_bip32_root_account(MNEMONIC, bitcoin.networks.bitcoin)
  })

  test('find generated addresses', async () => {
    for (let i = 0; i < addresses.length; i++) {
      account.nextChainAddress(0)
      expect(account.containsAddress(addresses[i])).toBe(true)
    }
  })

  test('do not find ungenerated addresses', async () => {
    for (let i = 0; i < addresses.length; i++) {
      expect(account.containsAddress(addresses[i])).toBe(false)
    }
  })

  test('find generated nodes using getBIP32forBtcAddress', async () => {
    for (let i = 0; i < addresses.length; i++) {
      account.nextChainAddress(0)
      expect(() => { getBIP32forBtcAddress(addresses[i], account) }).not.toThrowError()
    }
  })

  test('fail to ungenerated node using getBIP32forBtcAddress', async () => {
    expect(() => { getBIP32forBtcAddress(addresses[addresses.length - 1], account) }).toThrowError()
  })

  test('finding a node using getBIP32forBtcAddress leaves account unaltered', async () => {
    account.nextChainAddress(0)
    let account_orig = cloneDeep(account)
    getBIP32forBtcAddress(addresses[0], account)
    expect(account_orig).toEqual(account)
  })

  test('failing to find a node using getBIP32forBtcAddress leaves account unaltered', async () => {
    let account_orig = cloneDeep(account)
    expect(() => { getBIP32forBtcAddress(addresses[0], account) }).toThrowError()
    expect(account_orig).toEqual(account)
  })
})

describe("Post-swap functions", () => {
  const MNEMONIC = "similar leader virus polar vague grunt talk flavor kitten order call blood"
  // client side's mock
  let wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
  // server side's mock
  let http_mock = jest.genMockFromModule('../mocks/mock_http_client');
  let wallet
  const CHAIN_LENGTH = 5
  //Fatal swap error
  const swap_error = Error("Exiting swap.")
  let statecoin
  let account_init
  let setCoinSpentSpy

  beforeEach(async () => {
    wallet = await Wallet.buildMock(bitcoin.networks.bitcoin, http_mock, wasm_mock, MNEMONIC);
    setCoinSpentSpy = jest.spyOn(wallet.statecoins, 'setCoinSpent')
    wallet.statecoins.coins = [];
    wallet.addStatecoinFromValues("861d2223-7d84-44f1-ba3e-4cd7dd418560", { public: { q: "", p2: "", p1: "", paillier_pub: {}, c_key: "", }, private: "", chain_code: "" }, 0.1, "58f2978e5c2cf407970d7213f2b428990193b2fe3ef6aca531316cdcf347cc41", 0, "03ffac3c7d7db6308816e8589af9d6e9e724eb0ca81a44456fef02c79cba984477", ACTION.DEPOSIT)
    statecoin = wallet.statecoins.coins[0]
    statecoin.swap_status = SWAP_STATUS.Init
    for (let i = 0; i < CHAIN_LENGTH; i++) {
      wallet.account.nextChainAddress(0);
    }
    account_init = cloneDeep(wallet.account)
    wallet.handleSwapError(swap_error, statecoin)
    statecoin.status = STATECOIN_STATUS.SWAPPED
    wallet.doPostSwap(statecoin, null)
  })

  test("Post-swap and swap error handling functions do not alter wallet bip32 account", () => {
    expect(wallet.account).toEqual(account_init)
  })

  test("Confirm that setStateCoinSpent was not called if there is not a new statecoin", () => {
    expect(setCoinSpentSpy).not.toHaveBeenCalled()
  })

  test("Confirm that setStateCoinSpent was called is there is a new statecoin", () => {
    let new_statecoin = cloneDeep(statecoin)
    new_statecoin.status = STATECOIN_STATUS.AVAILABLE
    wallet.doPostSwap(statecoin, new_statecoin)
    expect(setCoinSpentSpy).toHaveBeenCalled()
  })
})

describe('ActivityLog', function () {
  let log = new ActivityLog()
  let legacy_log = new Object()
  beforeAll(() => {
    legacy_log.items = []
    Object.values(ACTION).forEach((action, i) => {
      log.addItem(`shared_key_id_${i}`, action)
      let lli = cloneDeep(log.items.slice(-1)[0])
      //Rename shared_key_id field to statecoin_id in legacy log
      delete Object.assign(lli, { statecoin_id: lli.shared_key_id })['shared_key_id'];
      legacy_log.items.push(lli)
    })
  })

  test('legacy log has statecoin_id field', () => {
    expect(legacy_log.items[0]?.statecoin_id).not.toEqual(undefined)
  })

  test('legacy log does not have shared_key_id field', () => {
    expect(legacy_log.items[0]?.shared_key_id).toEqual(undefined)
  })

  test('log has shared_key_id field', () => {
    expect(log.items[0]?.shared_key_id).not.toEqual(undefined)
  })

  test('log does not have statecoin_id field', () => {
    expect(log.items[0]?.statecoin_id).toEqual(undefined)
  })
  
  test('fromJSON constructs the activity log', () => {
    let result = ActivityLog.fromJSON(log)
    expect(result).toEqual(log)
  })

  test('fromJSON from LegacyActivityLog constructs the same log', () => {
    let result = ActivityLog.fromJSON(legacy_log)
    expect(result).toEqual(log)
  })

  describe('display', () => {
    let alog
    let wallet
    let expected_date_merged
    const http_mock = jest.genMockFromModule('../mocks/mock_http_client');
    const wasm_mock = jest.genMockFromModule('../mocks/mock_wasm');
    beforeEach(async () => {
      alog = ActivityLog.fromJSON({
          "items": [
            {
              "shared_key_id": "b00a5e15-65d1-4602-bb99-8908ea8dd3dc",
              "action": "D",
              "date": 1647256708087
            },
            {
              "shared_key_id": "b00a5e15-65d1-4602-bb99-8908ea8dd3dc",
              "action": "I",
              "date": 1647256645325
            },
            {
              "shared_key_id": "d45e683f-dfbd-4df2-96dc-ac9ae3a5a0dd",
              "action": "G",
              "date": 1647017677534
            },
            {
              "shared_key_id": "d45e683f-dfbd-4df2-96dc-ac9ae3a5a0dd",
              "action": "R",
              "date": 1647017656778
            },
            {
              "shared_key_id": "10ff60ed-4a91-4260-9f73-95e7011bfcb6",
              "action": "T",
              "date": 1647017641542
            },
            {
              "shared_key_id": "10ff60ed-4a91-4260-9f73-95e7011bfcb6",
              "action": "D",
              "date": 1647017616483
            },
            {
              "shared_key_id": "10ff60ed-4a91-4260-9f73-95e7011bfcb6",
              "action": "I",
              "date": 1647012970643
            },
            {
              "shared_key_id": "86e693ca-997e-4e15-badf-2e0a2861dacf",
              "action": "G",
              "date": 1647007584756
            },
            {
              "shared_key_id": "f3c3a565-9e10-4c9f-9358-998715977fe5",
              "action": "S",
              "date": 1647007539901
            },
            {
              "shared_key_id": "90c24e32-ad14-4b8e-978a-6f6ab1f6ff9b",
              "action": "S",
              "date": 1647007456423
            },
            {
              "shared_key_id": "90c24e32-ad14-4b8e-978a-6f6ab1f6ff9b",
              "action": "R",
              "date": 1647007210579
            },
            {
              "shared_key_id": "cb75d755-7a10-4b9c-a1fa-27e6d0d9927e",
              "action": "T",
              "date": 1647007194893
            },
            {
              "shared_key_id": "cb75d755-7a10-4b9c-a1fa-27e6d0d9927e",
              "action": "R",
              "date": 1647006777365
            },
            {
              "shared_key_id": "30443084-bbce-4bd3-bd58-30565b595243",
              "action": "T",
              "date": 1647006754866
            },
            {
              "shared_key_id": "30443084-bbce-4bd3-bd58-30565b595243",
              "action": "D",
              "date": 1647006314736
            },
            {
              "shared_key_id": "30443084-bbce-4bd3-bd58-30565b595243",
              "action": "I",
              "date": 1647006282213
            }
          ]
      })
      
     
      wallet = await Wallet.buildMock(bitcoin.networks.bitcoin, http_mock, wasm_mock);
      expected_date_merged= [[{ "shared_key_id": "b00a5e15-65d1-4602-bb99-8908ea8dd3dc", "action": "D", "date": 1647256708087 }, { "shared_key_id": "b00a5e15-65d1-4602-bb99-8908ea8dd3dc", "action": "I", "date": 1647256645325 }], [{ "shared_key_id": "d45e683f-dfbd-4df2-96dc-ac9ae3a5a0dd", "action": "G", "date": 1647017677534 }, { "shared_key_id": "d45e683f-dfbd-4df2-96dc-ac9ae3a5a0dd", "action": "R", "date": 1647017656778 }, { "shared_key_id": "10ff60ed-4a91-4260-9f73-95e7011bfcb6", "action": "T", "date": 1647017641542 }, { "shared_key_id": "10ff60ed-4a91-4260-9f73-95e7011bfcb6", "action": "D", "date": 1647017616483 }, { "shared_key_id": "10ff60ed-4a91-4260-9f73-95e7011bfcb6", "action": "I", "date": 1647012970643 }, { "shared_key_id": "86e693ca-997e-4e15-badf-2e0a2861dacf", "action": "G", "date": 1647007584756 }, { "shared_key_id": "f3c3a565-9e10-4c9f-9358-998715977fe5", "action": "S", "date": 1647007539901 }, { "shared_key_id": "90c24e32-ad14-4b8e-978a-6f6ab1f6ff9b", "action": "S", "date": 1647007456423 }, { "shared_key_id": "90c24e32-ad14-4b8e-978a-6f6ab1f6ff9b", "action": "R", "date": 1647007210579 }, { "shared_key_id": "cb75d755-7a10-4b9c-a1fa-27e6d0d9927e", "action": "T", "date": 1647007194893 }, { "shared_key_id": "cb75d755-7a10-4b9c-a1fa-27e6d0d9927e", "action": "R", "date": 1647006777365 }, { "shared_key_id": "30443084-bbce-4bd3-bd58-30565b595243", "action": "T", "date": 1647006754866 }, { "shared_key_id": "30443084-bbce-4bd3-bd58-30565b595243", "action": "D", "date": 1647006314736 }, { "shared_key_id": "30443084-bbce-4bd3-bd58-30565b595243", "action": "I", "date": 1647006282213 }]]

    })

    test('getActivityLogItems returns all activity log items', () => {
      wallet.activity = cloneDeep(alog)
      expect(wallet.activity).toEqual(alog)
      console.log(JSON.stringify(alog))
      let result = wallet.getActivityLogItems(alog.length)
      expect(result.length).toEqual(alog.items.length)
    })

    test('getActivityLogItems(5) returns 5 activity log items', () => {
      wallet.activity = cloneDeep(alog)
      expect(wallet.activity).toEqual(alog)
      console.log(JSON.stringify(alog))
      let result = wallet.getActivityLogItems(5)
      expect(result.length).toEqual(5)
    })

    test('ActivityLog.mergeActivityByDate returns the expected value', () => {
      let result = ActivityLog.mergeActivityByDate(cloneDeep(alog.getItems(alog.items.length)))
      expect(result).toEqual(expected_date_merged)
    })

    test('ActivityLog.filterDuplicates removes duplicates', () => {
      let alog_dupes = ActivityLog.fromJSON({ items: [cloneDeep(alog.items[0])] })
      alog_dupes.items.push(...alog.items)
      expect(alog_dupes.items.length).toEqual(alog.items.length + 1)
      alog_dupes.items = ActivityLog.filterDuplicates(alog_dupes.items)
      expect(alog_dupes.items.length).toEqual(alog.items.length)
      expect(alog_dupes).toEqual(alog)
    })

  })
})
