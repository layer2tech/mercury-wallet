import { combineReducers } from "redux";
import walletDataReducer from "../features/WalletDataSlice";
import themeDataReducer from "../features/ThemeSlice";

export default combineReducers({
  walletData: walletDataReducer,
  themeData: themeDataReducer,
});
