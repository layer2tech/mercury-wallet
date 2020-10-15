import { combineReducers } from 'redux'
import storedDataReducer from '../features/StoredDataSlice'

export default combineReducers({
  storedData: storedDataReducer,
})
