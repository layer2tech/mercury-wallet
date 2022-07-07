import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { getDefaultMiddleware } from "@reduxjs/toolkit";

import App from "./containers/App/App";
import rootReducer from "./reducers";
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";

const SuppressWarnings = require("suppress-warnings");

SuppressWarnings([
  (warning, name, ctor) =>
    name === "DeprecationWarning" &&
    warning.toString() ===
      "TransactionBuilder will be removed in the future. (v6.x.x or later) Please use the Psbt class instead.Examples of usage are available in the transactions - psbt.js integration test file on our Github.A high level explanation is available in the psbt.ts and psbt.js files as well.",
]);

// Store is the global wallet GUI data structure.
// Non-state data shared between components is stored here.
// State is accessed and modified via reducers, which are defined in /src/features/
const store = configureStore({
  reducer: rootReducer,
  middleware: getDefaultMiddleware({
    serializableCheck: false,
  }),
});

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById("root")
);
