import { combineReducers } from 'redux'
import coinDataReducer from '../features/CoinDataSlice'

export default combineReducers({
  coinData: coinDataReducer,
})
