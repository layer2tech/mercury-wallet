import { ActivityLog, decryptAES, encryptAES, StateCoinList } from "./wallet";

declare const window: any;
let Store: any;
try {
  Store = window.require('electron-store');
} catch (e : any) {
  Store = require('electron-store');
}


export class Storage {
  store: any;
  name:string;
  constructor(fileName:string) {
    this.name = fileName
    this.store = new Store({name: this.name});
  }

  // return map of wallet names->passwords
  getWalletNames() {
    let wallets = this.store.get()
    
    if (wallets==null) { return [] }
    return Object.keys(wallets).map((name: string) => ({name: name, password: wallets[name].password}))
  }

  // Login info storage
  storeNewLogin(wallet_name: string, password: string) {
    this.store.set('logins.'+wallet_name, password)
  }

  // Check password for a wallet
  checkLogin(wallet_name: string, pw_attempt: string) {
    let pw = this.store.get('logins.'+wallet_name, pw_attempt);
    if (pw===undefined) throw Error("Wallet "+wallet_name+" does not exist.");
    if (pw===pw_attempt) return true;
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
    delete wallet_json.electrum_client;
    delete wallet_json.storage;

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

    this.store.set(wallet_json.name, wallet_json);
  }

  setName(wallet_name: Object){
    this.store.set(wallet_name,{name: wallet_name})
  }

  getWallet(wallet_name: string) {
    let wallet_json = this.store.get(wallet_name);
    
    if (wallet_json === undefined) throw Error("No wallet called " + wallet_name + " stored.");
    //Wallet is active on startup
    wallet_json.active = true
    return wallet_json
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


  storeWalletStateCoinsList(wallet_name: string, statecoins: StateCoinList, activity: ActivityLog) {
    this.store.set(wallet_name+'.statecoins', statecoins);
    this.store.set(wallet_name+'.activity', activity);
  };

  storeWalletKeys(wallet_name: string, account: any) {
    // remove root keys
    let account_to_store = this.accountToAddrMap(account)
    this.store.set(wallet_name+'.account', account_to_store);
  };

  clearWallet(wallet_name: string) {
    this.store.delete(wallet_name, {});
  }

}
