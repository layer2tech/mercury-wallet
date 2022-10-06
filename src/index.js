"use strict";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import App from "./containers/App/App";
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";
import { store } from "./application/reduxStore";

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById("root")
);
