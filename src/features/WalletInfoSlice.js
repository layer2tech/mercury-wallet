import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const initialState = {
  wallets: {},
  loginInfo: [],
};

// stores all the wallet info into redux
export const WalletInfoSlice = createSlice({
  name: "walletInfo",
  initialState,
  reducers: {
    save_wallet: (state, action) => {
      const { key, value } = action.payload;

      // debugging
      console.group("save_wallet");
      console.log("key---------->", key);
      console.log("value--------->", value);
      console.groupEnd();

      var keySplit = key.split(".");
      // assume key looks like this -> walletName.property -> v123.password
      // value is the object {}
      var walletName = keySplit[0];
      var walletProperty = keySplit[1];
      // this replaces the update instead of 'updating' it
      return {
        ...state,
        wallets: {
          ...state.wallets,
          [walletName]: {
            ...state.wallets[walletName],
            [walletProperty]: value,
          },
        },
      };
    },
    save_login: (state, action) => {
      const { key, value } = action.payload;
      var realKey = key.split(".")[1];
      
      return {
        ...state,
        loginInfo: {
          ...state.loginInfo,
          [realKey]: value,
        }
      };
    },
    save_account: (state, action) => {
      // check which account this belongs to with its key-value pair
      const { key, value } = action.payload;
      // ensure no .statecoins is within the key string
      var realKey = key.split(".")[0];
      var currentWallet = state.wallets[realKey];
      var newWallet = { ...currentWallet, account: value };
      return {
        ...state,
        wallets: {
          ...state.wallets,
          [realKey]: newWallet,
        },
      };
    },
    save_statecoinObj: (state, action) => {
      // check which account this belongs to with its key-value pair
      const { key, value } = action.payload;
      // ensure no .statecoins is within the key string
      var realKey = key.split(".")[0];
      var currentWallet = state.wallets[realKey];

      console.group("save_statecoinObj");
      console.log("key->", key);
      console.log("value->", value);
      console.log("key name->", value.shared_key_id);
      console.groupEnd();

      // do nothing if shared_key_id is undefined.
      if (value.shared_key_id === undefined) {
        return {
          ...state,
        };
      }

      var new_statecoinObj = {
        ...currentWallet,
        statecoins_obj: {
          ...currentWallet.statecoins_obj,
          [value.shared_key_id]: value,
        },
      };

      return {
        ...state,
        wallets: {
          ...state.wallets,
          [realKey]: new_statecoinObj,
        },
      };
    },
    save_statecoins: (state, action) => {
      // check which account this belongs to with its key-value pair
      const { key, value } = action.payload;
      // ensure no .statecoins is within the key string
      var realKey = key.split(".")[0];
      var currentWallet = state.wallets[realKey];
      var newWallet = { ...currentWallet, statecoins: value };

      // check if this was a 'delete' by removing it from accounts map
      return {
        ...state,
        wallets: {
          ...state.wallets,
          [realKey]: newWallet,
        },
      };
    },
    delete_statecoins: (state, action) => {
      const { key, value } = action.payload;

      // key -> v3.statecoins_obj.ea925418-9dca-4a16-bb00-5a0b730d4212
      var propertySplitter = key.split(".");
      var walletName = propertySplitter[0];
      var object_property = propertySplitter[1];
      var object_id = propertySplitter[2];

      var currentWallet = state.wallets[walletName];

      console.group("delete_statecoins");
      console.log("delete key->", key);
      console.log("delete value->", value);
      console.log("current statecoin objects ->", currentWallet);
      console.groupEnd();

      if (object_property === "statecoins") {
        if (object_id === "swapped_coins") {
          // remove all swapped_coin values
          let modifiedWallet = {
            ...currentWallet,
            swapped_coins: [],
          };
          return {
            ...state,
            wallets: {
              ...state.wallets,
              [walletName]: modifiedWallet,
            },
          };
        }
      } else if (object_property === "statecoins_obj") {
        // check to see if this object exists
        if (currentWallet.statecoins_obj[object_id] !== undefined) {
          const modifiedWallet = { ...currentWallet };
          // remove this object
          delete modifiedWallet.statecoins_obj[object_id];
          return {
            ...state,
            wallets: {
              ...state.wallets,
              // copy over the modified wallet
              [walletName]: modifiedWallet,
            },
          };
        }
      }

      // does nothing with the state for now
      return {
        ...state,
        wallets: {
          ...state.wallets,
        },
      };
    },
    save_activity: (state, action) => {
      // check which account this belongs to with its key-value pair
      const { key, value } = action.payload;
      // ensure no .activity is within the key string
      var realKey = key.split(".")[0];
      var currentWallet = state.wallets[realKey];
      var newWallet = { ...currentWallet, activity: value };
      return {
        ...state,
        wallets: {
          ...state.wallets,
          [realKey]: newWallet,
        },
      };
    },
  },
});

export const {
  save_wallet,
  save_login,
  save_statecoins,
  save_statecoinObj,
  delete_statecoins,
  save_activity,
  save_account,
} = WalletInfoSlice.actions;

export default WalletInfoSlice.reducer;
