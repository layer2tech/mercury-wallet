import { createSlice } from '@reduxjs/toolkit'

const initialState = [
  { id: "1", amount: "0.1", time_left: "11.5", funding_txid: "18b822772c74e2e1024aac3d840fbad3cf76843a5d0fe0d3d0f3d73c0662c9b3", time_left: "11" }
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
