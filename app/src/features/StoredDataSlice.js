import { createSlice } from '@reduxjs/toolkit'
import { nanoid } from '@reduxjs/toolkit'

// A slice is a section of store data. Here we define its reducers functions.
// Actions are auto-generated and exported here.

const initialState = [
  { id: '1', data: 'Data!' },
  { id: '2', data: 'Data2!!' },
]

const storedDataSlice = createSlice({
  name: 'storedData',
  initialState,
  reducers: {
    addItem(state, action) {
      console.log(action);
      state.push(action.payload)
    },
    addDefault(state, action) {
      console.log(action);
      state.push(
        {
          id: nanoid(),
          data: "Default"
        }
      )
    }
  }
})

export const { addItem, addDefault } = storedDataSlice.actions
export default storedDataSlice.reducer
