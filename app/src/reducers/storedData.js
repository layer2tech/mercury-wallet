import { createSlice } from '@reduxjs/toolkit'

const initialState = [
  { id: '1', data: 'Data!' },
  { id: '2', data: 'Data2!!' },
]

const storedDataSlice = createSlice({
  name: 'storedData',
  initialState,
  reducers: {
    addItem(state, action) {
      state.push(action.payload)
    }
    // addDefault(state, action) {
    //   state.push({ data: "Default" })
    // }
  }
})

export const { addItem, addDefault } = storedDataSlice.actions

export default storedDataSlice.reducer
