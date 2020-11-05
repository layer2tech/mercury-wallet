import { combineReducers } from 'redux'
import storedDataReducer from '../features/StoredDataSlice'
import coinDataReducer from '../features/CoinDataSlice'

export default combineReducers({
  coinData: coinDataReducer,
})
