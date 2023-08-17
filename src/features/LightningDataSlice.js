"use strict";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const initialState = {
  invoices: [],
};

export const LightningDataSlice = createSlice({
  name: "lightning",
  initialState,
  reducers: {
    addInvoice: (state, action) => {
      const invoice = action.payload;
      const newState = {
        ...state,
        invoices: [...state.invoices, invoice],
      };
      return newState;
    },
    removeInvoice: (state, action) => {
      const invoiceAddr = action.payload;
      const newState = {
        ...state,
        invoices: state.invoices.filter(
          (invoice) => invoice.addr !== invoiceAddr
        ),
      };
      return newState;
    },
  },
});

export const { addInvoice, removeInvoice } = LightningDataSlice.actions;

export default LightningDataSlice.reducer;
