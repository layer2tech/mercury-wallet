'use strict';
import { ActivityLog, decryptAES, encryptAES, StateCoin, StateCoinList, STATECOIN_STATUS } from "./wallet";
import { SWAP_STATUS } from "./wallet/swap/swap_utils";
let cloneDeep = require('lodash.clonedeep');

declare const window: any;
let Store: any;
try {
  Store = window.require('electron-store');
} catch (e : any) {
  Store = require('electron-store');
}

// Logger import.
// Node friendly importing required for Jest tests.
let log: any;
try {
  log = window.require('electron-log');
} catch (e: any) {
  log = require('electron-log');
}


export class Storage {
  store: any;
  name: string;
  constructor(fileName: string) {
    this.name = fileName
    this.store = new Store({ name: this.name });
  }

  // return map of wallet names->passwords
  getWalletNames() {
    let wallets = this.store.get()
    
    if (wallets == null) { return [] }
    return Object.keys(wallets).map((name: string) => ({ name: name, password: wallets[name].password }))
  }

  // Login info storage
  storeNewLogin(wallet_name: string, password: string) {
    this.store.set('logins.' + wallet_name, password)
  }

  // Check password for a wallet
  checkLogin(wallet_name: string, pw_attempt: string) {
    let pw = this.store.get('logins.' + wallet_name, pw_attempt);
    if (pw === undefined) throw Error("Wallet " + wallet_name + " does not exist.");
    if (pw === pw_attempt) return true;
    return false
  }

  accountToAddrMap(account_json: any) {
    return [{
      k: account_json.chains[0].k,
      map: account_json.chains[0].map
    },
    {
      k: account_json.chains[1].k,
      map: account_json.chains[1].map
    }]
  }

  // Wallet storage
  storeWallet(wallet_json: any) {
    if (wallet_json != null) {
      delete wallet_json.electrum_client;
      delete wallet_json.storage;
      delete wallet_json.saveMutex;

      // encrypt mnemonic
      wallet_json.mnemonic = encryptAES(wallet_json.mnemonic, wallet_json.password);
      // remove password and root keys
      wallet_json.password = ""
      wallet_json.account = this.accountToAddrMap(wallet_json.account);
      // remove testing_mode config
      delete wallet_json.config.testing_mode;
      delete wallet_json.config.jest_testing_mode;
      // remove active status flag
      delete wallet_json.active

      // Store statecoins individually by key
      const statecoins = wallet_json.statecoins;
      delete wallet_json.statecoins;
      log.debug(`saving wallet: ${this.name}`)
      this.store.set(wallet_json.name, wallet_json);
      if (statecoins != null) {
        log.debug(`saving statecoins for wallet ${wallet_json.name}`)
        this.storeWalletStateCoinsList(wallet_json.name, statecoins)
      }
    }
  }

  setName(wallet_name: Object) {
    this.store.set(wallet_name, { name: wallet_name })
  }

  getWallet(wallet_name: string) {
    let wallet_json: any = { name: this.store.get(`${wallet_name}.name`)};    
    if (wallet_json.name === undefined) throw Error("No wallet called " + wallet_name + " stored.");

    let wallet_keys = ['password', 'config',
      'version', 'mnemonic', 'account', 'activity',
      'http_client', 'block_height', 'current_sce_addr',
      'saveMutex'
    ];

    wallet_keys.forEach((key: string) => {
      wallet_json[key] = this.store.get(`${wallet_name}.${key}`);
    })

    //Read the statecoin data saved in previous versions of the wallet
    const saved_coins: StateCoin[] | undefined = this.store.get(`${wallet_name}.statecoins.coins`);
    let coins: StateCoin[] = saved_coins === undefined ? [] : saved_coins;

    //Move any existing coins from the arrays to the objects
    if (coins.length > 0) {
      this.storeWalletStateCoinsArray(wallet_name, coins)
      this.store.delete(`${wallet_name}.statecoins.coins`)
    }
    
    //Read the statecoin data stored in objects
    let coins_obj: any = this.store.get(`${wallet_name}.statecoins_obj`);
    Object.values(coins_obj).forEach((coin: any) => {
      coins.push(coin)
    })

    wallet_json.statecoins = new StateCoinList();
    wallet_json.statecoins.coins = coins;

    //Wallet is active on startup
    wallet_json.active = true
    return wallet_json
  }

  getSwappedCoins(wallet_name: string) {
    // An error is thrown if an old wallet is loaded i.e. v0.7.10 & 
    // it has no swapped coins
    let sc: any = this.store.get(`${wallet_name}.swapped_statecoins_obj`) 
    if (sc === undefined) throw Error("No wallet called " + wallet_name + " stored.");
    log.debug(`swapped_coins: ${JSON.stringify(sc)}`)
    let sc_array: StateCoin[] = []
    Object.values(sc).forEach((coin: any) => {
      sc_array.push(coin)
    })
    return sc_array;
  }

  getWalletDecrypted(wallet_name: string, password: string) {
    let wallet_json_encrypted = this.getWallet(wallet_name);
    let wallet_json_decrypted = wallet_json_encrypted;
    // Decrypt mnemonic
    try {
      wallet_json_decrypted.mnemonic = decryptAES(wallet_json_decrypted.mnemonic, password);
    } catch (_e: any) {
      throw Error("Incorrect password.")
    }
    return wallet_json_decrypted
  }

  storeWalletStateCoinsList(wallet_name: string, statecoins: StateCoinList) {
    this.storeWalletStateCoinsArray(wallet_name, statecoins.coins);
  };

  storeWalletStateCoinsArray(wallet_name: string, statecoins: StateCoin[]) {
    statecoins.forEach((coin: StateCoin) => {
      this.storeWalletStateCoin(wallet_name, coin)
    })
  }

  storeWalletActivityLog(wallet_name: string, activity_log: ActivityLog) {
    this.store.set(wallet_name + '.activity', activity_log);
  }
  
  storeWalletStateCoin(wallet_name: string, statecoin: StateCoin) {
    if (statecoin.status == STATECOIN_STATUS.SWAPPED) {
      this.store.set(`${wallet_name}.swapped_statecoins_obj.${statecoin.shared_key_id}`, statecoin)
      // Delete the coin from the statecoins map if it has been swapped.
      this.store.delete(`${wallet_name}.statecoins_obj.${statecoin.shared_key_id}`)
    } else {
      this.store.set(`${wallet_name}.statecoins_obj.${statecoin.shared_key_id}`, statecoin)
    }
  }

  deleteWalletStateCoin(wallet_name: string, shared_key_id: string) {
    this.store.delete(`${wallet_name}.statecoins_obj.${shared_key_id}`)
  }

  storeWalletKeys(wallet_name: string, account: any) {
    // remove root keys
    let account_to_store = this.accountToAddrMap(account)
    this.store.set(wallet_name + '.account', account_to_store);
  };

  clearWallet(wallet_name: string) {
    this.store.delete(wallet_name, {});
  }
}
