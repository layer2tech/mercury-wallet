import { ActivityLog, encryptAES, StateCoinList } from "./wallet";

declare const window: any;
let Store: any;
try {
  Store = window.require('electron-store');
} catch (e) {
  Store = require('electron-store');
}


export class Storage {
  store: any;
  constructor() {
    this.store = new Store();
  }

  // return map of wallet names->passwords
  getWalletNamePasswordMap() {
    let wallets = this.store.get('wallets')
    if (wallets==null) { return [] }
    return Object.keys(wallets).map((name: string) => ({name: name, password: wallets[name].password}))
  }

  // Login info storage
  storeNewLogin(wallet_name: string, password: string) {
    this.store.set('logins.'+wallet_name, password)
  }

  // Check password for a wallet
  checkLogin(wallet_name: string, pw_attempt: string) {
    let pw = this.store.get('logins.'+wallet_name, pw_attempt)
    if (pw==undefined) throw Error("Wallet "+wallet_name+" does not exist.")
    if (pw==pw_attempt) return true;
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
    wallet_json.electrum_client = ""
    wallet_json.storage = ""
    // encrypt mnemonic
    wallet_json.mnemonic = encryptAES(wallet_json.mnemonic, wallet_json.password)
    // remove password and root keys
    wallet_json.password = ""
    wallet_json.account = this.accountToAddrMap(wallet_json.account)

    this.store.set('wallets.'+wallet_json.name, wallet_json);
  }

  getWallet(wallet_name: string) {
    return this.store.get('wallets.'+wallet_name)
  }

  storeWalletStateCoinsList(wallet_name: string, statecoins: StateCoinList, activity: ActivityLog) {
    this.store.set('wallets.'+wallet_name+'.statecoins', statecoins);
    this.store.set('wallets.'+wallet_name+'.activity', activity);
  };

  storeWalletKeys(wallet_name: string, account: any) {
    // remove root keys
    let account_to_store = this.accountToAddrMap(account)
    this.store.set('wallets.'+wallet_name+'.account', account_to_store);
  };

  clearWallet(wallet_name: string) {
    this.store.delete('wallets.'+wallet_name, {});
  }
}
