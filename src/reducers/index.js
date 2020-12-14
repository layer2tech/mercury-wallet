import { combineReducers } from 'redux'
import coinDataReducer from '../features/CoinDataSlice'
import walletDataReducer from '../features/WalletDataSlice'

export default combineReducers({
  coinData: coinDataReducer,
  walletData: walletDataReducer
})
