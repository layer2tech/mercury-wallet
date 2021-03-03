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

  storeWallet(wallet_json: any) {
    this.store.set('wallets.'+wallet_json.name, wallet_json);
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
