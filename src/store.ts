"use strict";
import {
  ActivityLog,
  decryptAES,
  encryptAES,
  StateCoin,
  StateCoinList,
  STATECOIN_STATUS,
} from "./wallet";
import { OutPoint } from "./wallet/mercury/info_api";
import { SWAP_STATUS } from "./wallet/swap/swap_utils";
import WrappedLogger from "./wrapped_logger";
let cloneDeep = require("lodash.clonedeep");

declare const window: any;
let Store: any;
try {
  Store = window.require("electron-store");
} catch (e: any) {
  Store = require("electron-store");
}

// Logger import.
// Node friendly importing required for Jest tests.
let log: any;
log = new WrappedLogger();

export class Storage {
  store: any;
  name: string;
  constructor(fileName: string) {
    this.name = fileName;
    this.store = new Store({ name: this.name });
  }

  // return map of wallet names->passwords
  getWalletNames() {
    let wallets = this.store.get();

    if (wallets == null) {
      return [];
    }
    return Object.keys(wallets).map((name: string) => ({
      name: name,
      password: wallets[name].password,
    }));
  }

  // Login info storage
  storeNewLogin(wallet_name: string, password: string) {
    this.store.set("logins." + wallet_name, password);
  }

  // Check password for a wallet
  checkLogin(wallet_name: string, pw_attempt: string) {
    let pw = this.store.get("logins." + wallet_name, pw_attempt);
    if (pw === undefined)
      throw Error("Wallet " + wallet_name + " does not exist.");
    if (pw === pw_attempt) return true;
    return false;
  }

  accountToAddrMap(account_json: any) {
    return [
      {
        k: account_json.chains[0].k,
        map: account_json.chains[0].map,
      },
      {
        k: account_json.chains[1].k,
        map: account_json.chains[1].map,
      },
    ];
  }

  // Wallet storage
  storeWallet(wallet_json: any) {
    if (wallet_json != null) {
      delete wallet_json.electrum_client;
      delete wallet_json.storage;
      delete wallet_json.saveMutex;
      delete wallet_json.activityLogItems;

      // encrypt mnemonic
      wallet_json.mnemonic = encryptAES(
        wallet_json.mnemonic,
        wallet_json.password
      );
      // remove password and root keys
      wallet_json.password = "";
      wallet_json.account = this.accountToAddrMap(wallet_json.account);
      // remove testing_mode config
      delete wallet_json.config.testing_mode;
      delete wallet_json.config.jest_testing_mode;
      // remove active status flag
      delete wallet_json.active;


      // Store statecoins individually by key
      const statecoins = wallet_json.statecoins;
      wallet_json.statecoins = new StateCoinList();
      this.store.set(wallet_json.name, wallet_json);
      if (statecoins != null) {
        this.storeWalletStateCoinsList(wallet_json.name, statecoins);
      }
    }
  }

  //For testing
  storeWalletVersion10(wallet_json: any) {
    if (wallet_json != null) {
      delete wallet_json.electrum_client;
      delete wallet_json.storage;
      delete wallet_json.saveMutex;

      // encrypt mnemonic
      wallet_json.mnemonic = encryptAES(
        wallet_json.mnemonic,
        wallet_json.password
      );
      // remove password and root keys
      wallet_json.password = "";
      //wallet_json.account = this.accountToAddrMap(wallet_json.account);
      // remove testing_mode config
      delete wallet_json.config.testing_mode;
      delete wallet_json.config.jest_testing_mode;
      // remove active status flag
      delete wallet_json.active;

      // Store statecoins individually by key
      log.debug(`saving wallet: ${this.name}`);
      this.store.set(wallet_json.name, wallet_json);
    }
  }


  setName(wallet_name: Object) {
    this.store.set(wallet_name, { name: wallet_name });
  }

  getWallet(wallet_name: string, load_all: boolean = false) {
    let wallet_json: any = { name: this.store.get(`${wallet_name}.name`) };
    if (wallet_json.name === undefined)
      throw Error("No wallet called " + wallet_name + " stored.");

    //Wallet is initally inactive
    wallet_json.active = false;

    let wallet_keys = [
      "password",
      "config",
      "version",
      "mnemonic",
      "account",
      "activity",
      "http_client",
      "block_height",
      "current_sce_addr",
      "saveMutex",
    ];

    wallet_keys.forEach((key: string) => {
      wallet_json[key] = this.store.get(`${wallet_name}.${key}`);
    });

    //Read the statecoin data saved in previous versions of the wallet
    const saved_coins: StateCoin[] | undefined = this.store.get(
      `${wallet_name}.statecoins.coins`
    );
    const saved_swapped_coins: StateCoin[] | undefined = this.store.get(
      `${wallet_name}.statecoins.swapped_coins`
    );

    let coins: StateCoin[] = saved_coins === undefined ? [] : saved_coins;
    let coins_swapped: StateCoin[] = saved_swapped_coins === undefined ? [] : saved_swapped_coins;
    let coins_all = coins.concat(coins_swapped)


    //Move any existing coins from the arrays to the objects
    if (coins_all.length > 0) {
      this.storeWalletStateCoinsArray(wallet_name, coins_all);
    }

    this.store.delete(`${wallet_name}.statecoins.coins`);
    this.store.delete(`${wallet_name}.statecoins.swapped_coins`);

    //Read the statecoin data stored in objects
    const coins_obj = this.store.get(`${wallet_name}.statecoins_obj`);
    if (load_all) {
      wallet_json.statecoins_obj = coins_obj;
      let swapped_statecoins_obj = this.store.get(`${wallet_name}.swapped_statecoins_obj`)
      wallet_json.swapped_statecoins_obj = swapped_statecoins_obj;
      if (swapped_statecoins_obj != null) {
        coins = coins.concat(Object.values(swapped_statecoins_obj))
      }
      wallet_json.swapped_ids = this.store.get(`${wallet_name}.swapped_ids`);
    }

    if (coins_obj != null) {
      coins = coins.concat(Object.values(coins_obj))
    }
    //Remove duplicates
    coins = Array.from(new Set(coins))

    wallet_json.statecoins = new StateCoinList();
    wallet_json.statecoins.coins = coins;

    //Wallet is active on startup
    wallet_json.active = true;
    return wallet_json;
  }

  // Wallet state coins list with most of the swapped coins removed.
  getPrunedWalletStateCoinsList(wallet_name: string): StateCoinList {
    let coins: StateCoin[] = [];
    //Read the statecoin data stored in objects
    const coins_obj = this.store.get(`${wallet_name}.statecoins_obj`);
    if (coins_obj != null) {
      coins = coins.concat(Object.values(coins_obj))
    }
    //Remove duplicates
    coins = Array.from(new Set(coins))
    let state_coin_list = new StateCoinList();
    state_coin_list.coins = coins;
    return state_coin_list;
  }

  getSwappedCoins(wallet_name: string): StateCoin[] {
    const source = `${wallet_name}.swapped_statecoins_obj`;
    let sc: any = this.store.get(source);
    if (sc === undefined) return []
    return Object.values(sc);
  }

  getSwappedCoin(wallet_name: String, shared_key_id: String): StateCoin {
    const source = `${wallet_name}.swapped_statecoins_obj.${shared_key_id}`;
    let sc = this.store.get(source)
    if (sc === undefined) throw Error("No swapped statecoin with shared key ID " + shared_key_id + " stored.");
    return sc
  }

  getWalletDecrypted(wallet_name: string, password: string, load_all: boolean = false) {
    let wallet_json_encrypted = this.getWallet(wallet_name, load_all);
    let wallet_json_decrypted = wallet_json_encrypted;
    // Decrypt mnemonic
    try {
      wallet_json_decrypted.mnemonic = decryptAES(
        wallet_json_decrypted.mnemonic,
        password
      );
    } catch (e: any) {
      throw Error(`Incorrect password.`);
    }
    return wallet_json_decrypted;
  }

  storeWalletStateCoinsList(wallet_name: string, statecoins: StateCoinList) {
    this.storeWalletStateCoinsArray(wallet_name, statecoins.coins);
  }

  storeWalletStateCoinsArray(wallet_name: string, statecoins: StateCoin[]) {
    statecoins.forEach((coin: StateCoin) => {
      this.storeWalletStateCoin(wallet_name, coin);
    });
  }

  storeWalletActivityLog(wallet_name: string, activity_log: ActivityLog) {
    this.store.set(wallet_name + ".activity", activity_log);
  }

  storeWalletStateCoin(wallet_name: string, statecoin: StateCoin) {
    if (statecoin.status == STATECOIN_STATUS.SWAPPED) {
      const dest = `${wallet_name}.swapped_statecoins_obj.${statecoin.shared_key_id}`
      this.store.set(dest, statecoin)
      let funding_outpoint = { txid: statecoin.funding_txid, vout: statecoin.funding_vout }
      let swapped_ids = this.getSwappedIds(wallet_name, funding_outpoint)
      if (swapped_ids == null) {
        swapped_ids = []
      }
      swapped_ids.push(statecoin.shared_key_id)
      this.store.set(`${wallet_name}.swapped_ids.${funding_outpoint.txid}:${funding_outpoint.vout}`, swapped_ids)
      // Delete the coin from the statecoins map if it has been swapped.
      this.store.delete(
        `${wallet_name}.statecoins_obj.${statecoin.shared_key_id}`
      );
    } else {
      this.store.set(
        `${wallet_name}.statecoins_obj.${statecoin.shared_key_id}`,
        statecoin
      );
    }
  }

  getSwappedIds(wallet_name: string, outpoint: OutPoint) {
    let loc_str = `${wallet_name}.swapped_ids.${outpoint.txid}:${outpoint.vout}`
    return this.store.get(loc_str)
  }

  getSwappedCoinsByOutPoint(wallet_name: string, depth: number, outpoint: OutPoint) {
    let swapped_ids = this.getSwappedIds(wallet_name, outpoint);

    if (swapped_ids) {
      swapped_ids = swapped_ids.slice(-depth);

    }
    let result = [];
    for (let i in swapped_ids) {
      const swappedCoin = this.getSwappedCoin(wallet_name, swapped_ids[i]);
      result.push(swappedCoin);
    }
    return result
  }

  deleteWalletStateCoin(wallet_name: string, shared_key_id: string) {
    this.store.delete(`${wallet_name}.statecoins_obj.${shared_key_id}`);
  }

  storeWalletKeys(wallet_name: string, account: any) {
    // remove root keys
    let account_to_store = this.accountToAddrMap(account);
    this.store.set(wallet_name + ".account", account_to_store);
  }

  clearWallet(wallet_name: string) {
    this.store.delete(wallet_name, {});
  }
}
