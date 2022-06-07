import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const initialState = {
  wallets: {},
};

// stores all the wallet info into redux
export const WalletInfoSlice = createSlice({
  name: "walletInfo",
  initialState,
  reducers: {
    save_wallet: (state, action) => {
      console.group("save_wallet", "background: #222; color: #bada55");

      console.log("trying to save wallet, state:", state);
      console.log("trying to save wallet, action:", action);

      console.groupEnd();
    },
    update_wallet: (state) => {
      // update an existing wallet with new data
    },
    delete_wallet: (state) => {
      // delete a wallet from redux store
    },
  },
});

export const {
  get_wallet,
  get_all_wallets,
  save_wallet,
  update_wallet,
  delete_wallet,
} = WalletInfoSlice.actions;

export default WalletInfoSlice.reducer;
