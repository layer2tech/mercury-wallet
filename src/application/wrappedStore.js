import { store } from "./reduxStore";
import {
  save_wallet,
  save_login,
  save_statecoins,
  delete_statecoins,
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
    let walletVar = undefined;
    let walletObject = undefined;
    let walletAttribute = undefined;

    let walletInfo = store.getState().walletInfo;
    let wallets = walletInfo.wallets;
    let loginInfo = walletInfo.loginInfo;

    console.log("WalletInfo ->", walletInfo);
    console.log("LoginInfo ->", loginInfo);
    console.log("Value ->", value);

    if (value !== undefined && value.includes(".")) {
      // get from login store
      if (value.includes("logins.")) {
        console.log("Logins...");
        return loginInfo[value];
      }

      walletVar = value.split("."); // array of for e.g. wallet.name into ["wallet", "name"]

      walletObject = walletVar[0] + ""; // key to whole object {}
      walletAttribute = walletVar[1] + ""; // variable {}.variable

      // wallets : { test123:{}, wallet2:{}, wallet3: {}}
      // wallets.walletName.walletAttribute
      let getWalletAttribute = wallets[walletObject][walletAttribute];

      if (walletAttribute.includes("statecoins")) {
        if (getWalletAttribute === {}) {
          return undefined;
        }
      }
      return getWalletAttribute;
    } else {
      if (value === undefined) {
        console.log("value !=== undefined?");
        const hasKeys = !!Object.keys(wallets).length;
        if (!hasKeys) {
          console.log("there is no keys here...");
          return null;
        } else {
          console.log("return the wallets object");
          return wallets;
        }
      }
      else if (wallets[value] !== undefined) {
        console.log("wallets[value] !== undefined");
        return wallets[value];
      } else {
        console.log(wallets["12345"].name);
        console.log("wallets is equal to:", wallets);
        console.log("looking for value ", value);
      }
    }

    console.log("found nothing.. returning false...");
    return undefined;
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

  delete(key, value) {
    if (key.includes(".statecoins")) {
      store.dispatch(delete_statecoins({ key, value }));
    }
  }
}
