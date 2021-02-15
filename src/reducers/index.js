import { combineReducers } from 'redux'
import walletDataReducer from '../features/WalletDataSlice'

export default combineReducers({
  walletData: walletDataReducer
})
