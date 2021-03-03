import { ActivityLog, StateCoinList } from "./wallet";

declare const window: any;
let Store: any;
try {
  Store = window.require('electron-store');
} catch (e) {
  Store = require('electron-store');
}

// TODO: Write explicit schema


// {
// logins: {
//   wallet_name: string,
//   password: string
// },
// wallets: {
//   wallet_name: {
//     ...wallet
//   }
// }
// }

export class Storage {
  store: any;
  constructor() {
    this.store = new Store();
  }

  getWalletNames() {
    return Object.keys(this.store.get('wallets'))
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



  // Wallet storage
  storeWallet(wallet_json: any) {
    this.store.set('wallets.'+wallet_json.name, wallet_json);
  }

  getWallet(wallet_name: string) {
    return this.store.get('wallets.'+wallet_name)
  }

  storeWalletStateCoinsList(wallet_name: string, statecoins: StateCoinList, activity: ActivityLog) {
    this.store.set('wallets.'+wallet_name+'.statecoins', statecoins);
    this.store.set('wallets.'+wallet_name+'.activity', activity);
  };

  storeWalletKeys(wallet_name: string, account: Account) {
    this.store.set('wallets.'+wallet_name+'.account', account);
  };

  clearWallet(wallet_name: string) {
    this.store.delete('wallets.'+wallet_name, {});
  }
}
