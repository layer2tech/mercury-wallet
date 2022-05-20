import { store } from "./reduxStore";
import {
  save_wallet,
  save_login,
  save_statecoins,
  save_activity,
  save_account,
} from "../features/WalletInfoSlice";

// class the wraps in-built redux store
export class WrappedStore {
  object;

  constructor(name) {
    this.object = { name };
  }

  get(value = undefined) {
    let walletInfo;
    walletInfo = store.getState().walletInfo;
    let wallets = walletInfo.wallets;
    let loginInfo = walletInfo.loginInfo;
    if (value === undefined) {
      const hasKeys = !!Object.keys(wallets).length;
      if (!hasKeys) {
        return null;
      } else {
        return wallets;
      }
    }
    // get from login store
    else if (value.includes("logins.")) {
      return loginInfo[value];
    } else if (wallets[value] !== undefined) {
      return wallets[value];
    }
    return false;
  }

  set(key, value) {
    // set for login
    if (key.includes("logins.")) {
      console.log("set login. of account");
      store.dispatch(save_login({ key, value }));
    }
    // set for account
    else if (key.includes(".account")) {
      store.dispatch(save_account({ key, value }));
    }
    // set for activity
    else if (key.includes(".activity")) {
      store.dispatch(save_activity({ key, value }));
    }
    // set for statecoins
    else if (key.includes(".statecoins")) {
      store.dispatch(save_statecoins({ key, value }));
    } else {
      // must be saving wallet only
      store.dispatch(save_wallet({ key, value }));
    }
  }
}
