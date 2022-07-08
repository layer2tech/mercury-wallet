'use strict';
import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  dark_mode: localStorage.getItem('dark_mode') != null ? localStorage.getItem('dark_mode') : null
}

const calculateDarkmode = (state) => {
  if (state.dark_mode === '1') {
    localStorage.removeItem('dark_mode')
    window.darkMode.off()
    return '0'
  } else {
    localStorage.setItem('dark_mode', '1')
    window.darkMode.on()
    return '1'
  }
}

const ThemeSlice = createSlice({
  name: 'themdData',
  initialState,
  reducers: {
    toggleDarkMode(state) {
      return {
        ...state,
        dark_mode: calculateDarkmode(state)
      }
    },
  },
})

export const { toggleDarkMode } = ThemeSlice.actions
export default ThemeSlice.reducer
