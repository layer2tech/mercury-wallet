"use strict";
import { combineReducers } from "redux";
import walletDataReducer from "../features/WalletDataSlice";
import themeDataReducer from "../features/ThemeSlice";
import walletWebDataReducer from "../features/WalletWebDataSlice";

export default combineReducers({
  walletData: walletDataReducer,
  themeData: themeDataReducer,
  walletWebData: walletWebDataReducer,
});
