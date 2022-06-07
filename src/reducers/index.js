import { combineReducers } from "redux";
import walletDataReducer from "../features/WalletDataSlice";
import themeDataReducer from "../features/ThemeSlice";
import walletInfoReducer from "../features/WalletInfoSlice";

export default combineReducers({
  walletData: walletDataReducer,
  themeData: themeDataReducer,
  walletInfo: walletInfoReducer,
});
