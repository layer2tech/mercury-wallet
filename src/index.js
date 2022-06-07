"use strict";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { store, Persistor } from "./application/reduxStore";
import { PersistGate } from "redux-persist/integration/react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";

import App from "./containers/App/App";

ReactDOM.render(
  <Provider store={store}>
    <PersistGate Loading={null} persistor={Persistor}>
      <App></App>
    </PersistGate>
  </Provider>,
  document.getElementById("root")
);
