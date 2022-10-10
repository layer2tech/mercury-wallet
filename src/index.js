"use strict";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import App from "./containers/App/App";
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";
import { store, Persistor } from "./application/reduxStore";
import { PersistGate } from "redux-persist/integration/react";

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById("root")
);
