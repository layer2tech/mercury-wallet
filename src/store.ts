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
import WrappedLogger from "./wrapped_logger";
import { WebStore } from "./application/webStore";

let isElectron = require("is-electron");
const TestingWithJest = () => {
  return process.env.JEST_WORKER_ID !== undefined;
};
// required on ELECTRON  ////////////////////////// -> must be changed to detect if browser or electrion
declare const window: any;
let Store: any;
if (isElectron() || TestingWithJest()) {
  try {
    Store = window.require("electron-store");
  } catch (e: any) {
    Store = require("electron-store");
  }
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
    if (isElectron()) {
      this.store = new Store({ name: this.name });
    } else {
      this.store = new WebStore(this.name);
    }
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
      delete wallet_json.swappedStatecoinsFundingOutpointMap;

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

      Object.keys(wallet_json).forEach((key) => {
        console.log("saving key->", key);

        //Functions cannot be stored.
        if (typeof wallet_json[key] !== "function") {
          this.saveKey(wallet_json, key);
        }
      });

      // Store statecoins individually by key
      if (wallet_json.statecoins != null) {
        this.storeWalletStateCoinsList(
          wallet_json.name,
          wallet_json.statecoins
        );
      }
    }
  }

  //For testing
  storeWalletVersion10(wallet_json: any) {
    if (wallet_json != null) {
      delete wallet_json.electrum_client;
      delete wallet_json.storage;
      delete wallet_json.saveMutex;
      delete wallet_json.activityLogItems;
      delete wallet_json.swappedStatecoinsFundingOutpointMap;

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

  saveKey(wallet_json: any, key: string) {
    this.store.set(`${wallet_json.name}.${key}`, wallet_json[key]);
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

    this.loadStatecoins(wallet_json, load_all);

    //Wallet is active on startup
    wallet_json.active = true;
    return wallet_json;
  }

  loadStatecoins(wallet: any, load_all: boolean = false) {
    const wallet_name = wallet.name;
    //Read the statecoin data saved in previous versions of the wallet
    const saved_coins: StateCoin[] | undefined = this.store.get(
      `${wallet_name}.statecoins.coins`
    );
    const saved_swapped_coins: StateCoin[] | undefined = this.store.get(
      `${wallet_name}.statecoins.swapped_coins`
    );

    let coins: StateCoin[] = saved_coins === undefined ? [] : saved_coins;
    let coins_swapped: StateCoin[] =
      saved_swapped_coins === undefined ? [] : saved_swapped_coins;
    let coins_all = coins.concat(coins_swapped);

    //Move any existing coins from the arrays to the objects
    if (coins_all.length > 0) {
      this.storeWalletStateCoinsArray(wallet_name, coins_all);
    }

    //Keep statecoins.coins for backwards compatibility
    this.store.delete(`${wallet_name}.statecoins.swapped_coins`);

    //Read the statecoin data stored in objects
    const coins_obj = this.store.get(`${wallet_name}.statecoins_obj`);
    
    console.log('Coins Obj: ', coins_obj);

    if (load_all) {
      wallet.statecoins_obj = coins_obj;
      let swapped_statecoins_obj = this.store.get(
        `${wallet_name}.swapped_statecoins_obj`
      );
      wallet.swapped_statecoins_obj = swapped_statecoins_obj;
      if (swapped_statecoins_obj != null) {
        coins = coins.concat(Object.values(swapped_statecoins_obj));
      }
      wallet.swapped_ids = this.store.get(`${wallet_name}.swapped_ids`);
    }

    let coins_from_obj: StateCoin[] = [];
    if (coins_obj != null) {
      coins_from_obj = Object.values(coins_obj);
    }
    console.log('coins from obj: ',coins_from_obj)
    coins = coins_from_obj;

    //Remove duplicates
    coins = Array.from(new Set(coins));
    wallet.statecoins = StateCoinList.fromCoinsArray(coins);
  }

  getSwappedCoins(wallet_name: string): StateCoin[] {
    let wallet: any = this.store.get(wallet_name);
    if (wallet === undefined) {
      log.debug(`wallet ${wallet} not found in storage.`);
      return [];
    }

    const source_coins = `${wallet_name}.statecoins_obj`;
    let sc_coins: any = this.store.get(source_coins);
    if (sc_coins === undefined) {
      log.debug(`coins ${sc_coins} not found in storage.`);
      return [];
    }

    const source = `${wallet_name}.swapped_statecoins_obj`;
    let sc: any = this.store.get(source);
    if (sc === undefined) {
      log.debug(`${source} not found in storage.`);
      return [];
    }

    let sc_list = StateCoinList.fromCoinsArray(Object.values(sc));

    return sc_list.coins;
  }

  getSwappedCoin(wallet_name: String, shared_key_id: String): StateCoin {
    const source = `${wallet_name}.swapped_statecoins_obj.${shared_key_id}`;
    let sc = this.store.get(source);
    if (sc === undefined)
      throw Error(
        "No swapped statecoin with shared key ID " + shared_key_id + " stored."
      );
    return StateCoin.fromJSON(sc);
  }

  getWalletDecrypted(
    wallet_name: string,
    password: string,
    load_all: boolean = false
  ) {
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

  // storeWalletStateCoinsArray(wallet_name: string, statecoins: StateCoin[]) {
  //   statecoins.forEach((coin: StateCoin) => {
  //     this.storeWalletStateCoin(wallet_name, coin);
  //   });
  // }


  storeWalletStateCoinsArray(wallet_name: string, statecoins: StateCoin[]) {
    let swapped_sc_map = new Map<string, StateCoin>();
    let sc_map = new Map<string, StateCoin>();

    statecoins.forEach((coin: StateCoin) => {
      if (coin.status === "SWAPPED") {
        swapped_sc_map.set(coin.shared_key_id, coin);
      } else {
        sc_map.set(coin.shared_key_id, coin);
      }
    });

    const sc_dest = `${wallet_name}.statecoins_obj`;
    let stored_sc_obj = this.store.get(sc_dest);
    if (stored_sc_obj == null) {
      stored_sc_obj = {};
    }

    console.log('enter entries: ',Object.keys(Object.fromEntries(sc_map)))
    let entries_sc_map = Object.fromEntries(sc_map);

    Object.keys(entries_sc_map).map( key => {
      stored_sc_obj = {...stored_sc_obj, [key]: entries_sc_map[key]}
    })
    // Object.assign(stored_sc_obj, Object.fromEntries(sc_map));

    const swapped_sc_dest = `${wallet_name}.swapped_statecoins_obj`;
    let stored_swapped_sc_obj = this.store.get(swapped_sc_dest);
    if (stored_swapped_sc_obj == null) {
      stored_swapped_sc_obj = {};
    }

    const swapped_sc_obj = Object.fromEntries(swapped_sc_map);
    Object.keys(swapped_sc_obj).map( key => {
      stored_swapped_sc_obj = {...stored_swapped_sc_obj, [key]: entries_sc_map[key]}
    })
    // Object.assign(stored_swapped_sc_obj, swapped_sc_obj);

    const swapped_ids_dest = `${wallet_name}.swapped_ids`;
    let stored_swapped_ids = this.store.get(swapped_ids_dest);
    if (stored_swapped_ids == null) {
      stored_swapped_ids = {};
    }

    Object.entries(swapped_sc_obj).forEach((key_value) => {
      const sc = key_value[1];
      const funding_outpoint = { txid: sc.funding_txid, vout: sc.funding_vout };
      const funding_outpoint_str = `${funding_outpoint.txid}:${funding_outpoint.vout}`;
      let swapped_ids = stored_swapped_ids[funding_outpoint_str];
      //Remove duplicates
      let swapped_ids_set;
      if (swapped_ids == null) {
        swapped_ids_set = new Set();
      } else {
        swapped_ids_set = new Set(swapped_ids);
      }
      swapped_ids_set.add(sc.shared_key_id);
      swapped_ids = Array.from(swapped_ids_set);
      stored_swapped_ids[funding_outpoint_str] = swapped_ids;
      // Delete the coin from the statecoins map if it has been swapped.
      delete stored_sc_obj[sc.shared_key_id];
    });

    //Store the update objects
    this.store.set(sc_dest, stored_sc_obj);
    this.store.set(swapped_sc_dest, stored_swapped_sc_obj);
    this.store.set(swapped_ids_dest, stored_swapped_ids);
  }

  storeWalletActivityLog(wallet_name: string, activity_log: ActivityLog) {
    this.store.set(wallet_name + ".activity", activity_log);
  }

  storeWalletStateCoin(wallet_name: string, statecoin: StateCoin) {
    if (statecoin.status == STATECOIN_STATUS.SWAPPED) {
      const dest = `${wallet_name}.swapped_statecoins_obj.${statecoin.shared_key_id}`;
      this.store.set(dest, statecoin);

      let funding_outpoint = {
        txid: statecoin.funding_txid,
        vout: statecoin.funding_vout,
      };
      let swapped_ids = this.getSwappedIds(wallet_name, funding_outpoint);
      //Remove duplicates
      let swapped_ids_set;
      if (swapped_ids == null) {
        swapped_ids_set = new Set();
      } else {
        swapped_ids_set = new Set(swapped_ids);
      }
      swapped_ids_set.add(statecoin.shared_key_id);
      swapped_ids = Array.from(swapped_ids_set);
      this.store.set(
        `${wallet_name}.swapped_ids.${funding_outpoint.txid}:${funding_outpoint.vout}`,
        swapped_ids
      );
      // Delete the coin from the statecoins map if it has been swapped.
      this.store.delete(
        `${wallet_name}.statecoins_obj.${statecoin.shared_key_id}`
      );
    } else {
      const dest = `${wallet_name}.statecoins_obj.${statecoin.shared_key_id}`;
      this.store.set(dest, statecoin);
    }
  }

  getSwappedIds(wallet_name: string, outpoint: OutPoint) {
    let loc_str = `${wallet_name}.swapped_ids.${outpoint.txid}:${outpoint.vout}`;
    return this.store.get(loc_str);
  }

  getSwappedCoinsByOutPoint(
    wallet_name: string,
    depth: number,
    outpoint: OutPoint
  ) {
    let swapped_ids = this.getSwappedIds(wallet_name, outpoint);

    if (swapped_ids) {
      swapped_ids = swapped_ids.slice(-depth);
    }

    let result = [];
    for (let i in swapped_ids) {
      const swappedCoin = this.getSwappedCoin(wallet_name, swapped_ids[i]);
      result.push(swappedCoin);
    }
    return result;
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
