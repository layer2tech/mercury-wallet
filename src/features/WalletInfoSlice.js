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

      console.log("key---------->", key);
      console.log("value--------->", value);

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
      return {
        ...state,
        loginInfo: [...state.loginInfo, action.payload.value],
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
      console.log("SAVE STATECOIN OBJECT !!!!!!!");
      // check which account this belongs to with its key-value pair
      const { key, value } = action.payload;
      // ensure no .statecoins is within the key string
      var realKey = key.split(".")[0];
      var currentWallet = state.wallets[realKey];
      var newWallet = {
        ...currentWallet,
        statecoins_obj: { ...currentWallet.statecoins_obj, ...value },
      };

      return {
        ...state,
        wallets: {
          ...state.wallets,
          [realKey]: newWallet,
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
      // does nothing with the state for now
      return {
        ...state,
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
