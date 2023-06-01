"use strict";
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  dark_mode: window.darkMode,
};

const ThemeSlice = createSlice({
  name: "themeData",
  initialState,
  reducers: {
    toggleDarkMode(state) {
      state.dark_mode = !state.dark_mode;
      window.darkMode = state.dark_mode;
      return state;
    },
  },
});

export const { toggleDarkMode } = ThemeSlice.actions;
export default ThemeSlice.reducer;
