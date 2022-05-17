import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";

import { store } from "./application/store";

import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";

import App from "./containers/App/App";

ReactDOM.render(
  <Provider store={store}>
    <App></App>
  </Provider>,
  document.getElementById("root")
);
