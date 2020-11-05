import { createSlice } from '@reduxjs/toolkit'
import { nanoid } from '@reduxjs/toolkit'

// A slice is a section of store data. Here we define its reducers functions.
// Actions are auto-generated and exported here.

const initialState = [
  { id: "1", amount: "0.005", time_left: "11.5 months", address: "bc5f...1lp4" }
]


const CoinSlice = createSlice({
  name: 'coinData',
  initialState,
  reducers: {
    addCoin(state, action) {
      state.push(action.payload)
    },
    removeCoin(state) {
      state.pop()
    }
  }
})

export const { addCoin, removeCoin } = CoinSlice.actions
export default CoinSlice.reducer
