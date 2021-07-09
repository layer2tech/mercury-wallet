import {createSlice} from '@reduxjs/toolkit'

const initialState = {
  dark_mode: 0 //localStorage.getItem('dark_mode')
}

const ThemeSlice = createSlice({
  name: 'themdData',
  initialState,
  reducers: {
    toggleDarkMode(state) {
      return {
        ...state,
        dark_mode: state.dark_mode === '1' ? '0' : '1'
      }
    },
  },
})

export const { toggleDarkMode } = ThemeSlice.actions
export default ThemeSlice.reducer
