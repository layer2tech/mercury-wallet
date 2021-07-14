import {createSlice} from '@reduxjs/toolkit'

// reset dark mode
localStorage.removeItem("dark_mode");

const initialState = {
  dark_mode: 0
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
